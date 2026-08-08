'use strict';

/**
 * work_tracking/scripts/lib.js — the store's read side.
 *
 * Owns three things, and nothing else:
 *   1. The file format — parsing and serializing `registry.ndjson`.
 *   2. The in-memory index — loading `schema.sql` and inserting every record into it.
 *   3. Folding the log down to the current revision of each record.
 *
 * Writing to the store is `checkin.js`; rendering it is `build.js`. See SCHEMA.md.
 *
 * ⚠️ Never grep the store. A grep pre-filter was measured finding 643 of 1,274 matching
 * rows, because JSON serialization is not canonical. Parse it, always.
 */

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

/**
 * Where the store lives. `WORK_TRACKING_STORE` moves `registry.ndjson`, `registry.md`,
 * `work.json` and `records/` somewhere else together — for the test suite, and for
 * rehearsing a bulk import against a scratch store before touching the real one.
 * The schema is code, not data, so it always comes from beside these scripts.
 */
const WORK_TRACKING_DIR = process.env.WORK_TRACKING_STORE
  ? path.resolve(process.env.WORK_TRACKING_STORE)
  : path.resolve(__dirname, '..');
const REGISTRY_PATH = path.join(WORK_TRACKING_DIR, 'registry.ndjson');
const SCHEMA_PATH = path.resolve(__dirname, '..', 'schema.sql');

/**
 * Every column in `schema.sql`, in its declared order. This array is the canonical
 * serialization order, so a record written today and the same record written next year
 * produce byte-identical lines.
 *
 * ⚠️ Keep it in step with `schema.sql`. A column here that the table does not have fails
 * loudly on the first insert; a column the table has but this list does not would be
 * silently dropped on write, which is the failure mode this file exists to prevent.
 */
const FIELDS = [
  'id',
  'rev',
  'ts',
  'type',
  'status',
  'outcome',
  'title',
  'plan',
  'detail_ref',
  'note',
  'supersedes',
  'split_from',
  'files',
  'source_ref',
];

/** Columns holding a JSON array as TEXT. */
const JSON_FIELDS = new Set(['supersedes', 'files']);

/** Columns declared INTEGER. */
const INTEGER_FIELDS = new Set(['rev']);

/**
 * Where each record was read from, for error messages — `registry.ndjson:42`.
 * Kept beside the records rather than inside them so a record serializes back out
 * exactly as it came in.
 */
const ORIGINS = new WeakMap();

/** One logger per module, per the repo's conventions. Logs go to stderr; stdout is data. */
function createLogger(name) {
  const write = (level, message) => process.stderr.write(`[${name}] ${level} ${message}\n`);
  return {
    info: (message) => write('INFO', message),
    warn: (message) => write('WARN', message),
    error: (message) => write('ERROR', message),
  };
}

const logger = createLogger('work_tracking/lib');

/** Where a record was parsed from, or null if it was built in memory. */
function originOf(record) {
  return ORIGINS.get(record) ?? null;
}

/**
 * Structural check only — shape, not values.
 *
 * Value rules (enums, date format, id pattern, non-empty title) belong to `schema.sql` and
 * are enforced there, so they live in exactly one place. What SQLite cannot catch is a key
 * the table has never heard of: the insert names its columns, so a typo'd field would be
 * dropped without complaint. That is the silent-zero-rows failure the design tested for, so
 * it is caught here instead.
 */
function assertRecordShape(record, origin) {
  const where = origin ? ` (${origin})` : '';

  if (record === null || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error(`Record must be a JSON object${where}, got ${JSON.stringify(record)}`);
  }

  for (const key of Object.keys(record)) {
    if (!FIELDS.includes(key)) {
      throw new Error(
        `Unknown field '${key}'${where}. Known fields: ${FIELDS.join(', ')}. ` +
          `If this field is genuinely new, add it to schema.sql and to FIELDS in lib.js.`
      );
    }
  }

  for (const key of FIELDS) {
    const value = record[key];
    if (value === undefined || value === null) continue;

    if (JSON_FIELDS.has(key)) {
      if (!Array.isArray(value)) {
        throw new Error(`Field '${key}'${where} must be an array or null, got ${typeof value}`);
      }
      continue;
    }
    if (INTEGER_FIELDS.has(key)) {
      if (!Number.isInteger(value)) {
        throw new Error(`Field '${key}'${where} must be an integer, got ${JSON.stringify(value)}`);
      }
      continue;
    }
    if (typeof value !== 'string') {
      throw new Error(`Field '${key}'${where} must be a string or null, got ${typeof value}`);
    }
  }
}

/**
 * Parse NDJSON text into records. Blank lines are skipped; anything else that is not a
 * valid record throws, naming the line.
 */
function parseRegistry(text, source = 'registry.ndjson') {
  const records = [];
  const lines = text.split('\n');

  lines.forEach((line, index) => {
    if (line.trim() === '') return;
    const origin = `${source}:${index + 1}`;

    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      logger.error(`Malformed JSON at ${origin}`);
      throw new Error(`Malformed JSON at ${origin}: ${error.message}`, { cause: error });
    }

    try {
      assertRecordShape(parsed, origin);
    } catch (error) {
      logger.error(`Invalid record at ${origin}`);
      throw error;
    }

    ORIGINS.set(parsed, origin);
    records.push(parsed);
  });

  return records;
}

/**
 * Read the store from disk.
 *
 * `allowMissing` is for the callers that legitimately run against an empty store — a build
 * before the first import, a checkout on a fresh clone. Everywhere else a missing registry
 * is a real error and stays one.
 */
function loadRegistry({ registryPath = REGISTRY_PATH, allowMissing = false } = {}) {
  let text;
  try {
    text = fs.readFileSync(registryPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT' && allowMissing) {
      logger.info(`No registry at ${registryPath} — treating the store as empty.`);
      return [];
    }
    logger.error(`Cannot read the registry at ${registryPath}`);
    throw error;
  }
  return parseRegistry(text, path.basename(registryPath));
}

/** A record as a row: JSON arrays serialized, absent fields explicitly null. */
function toRow(record) {
  const row = {};
  for (const key of FIELDS) {
    const value = record[key];
    if (value === undefined || value === null) {
      row[key] = null;
    } else if (JSON_FIELDS.has(key)) {
      row[key] = JSON.stringify(value);
    } else {
      row[key] = value;
    }
  }
  return row;
}

/** A row back to a record, in canonical field order. */
function fromRow(row) {
  const record = {};
  for (const key of FIELDS) {
    const value = row[key] ?? null;
    record[key] = value !== null && JSON_FIELDS.has(key) ? JSON.parse(value) : value;
  }
  return record;
}

/** One record as one NDJSON line, canonical field order, no trailing newline. */
function serializeRecord(record) {
  assertRecordShape(record, originOf(record));
  const canonical = {};
  for (const key of FIELDS) {
    canonical[key] = record[key] ?? null;
  }
  return JSON.stringify(canonical);
}

/** An empty in-memory database with `schema.sql` applied. Nothing is written to disk. */
function createDatabase({ schemaPath = SCHEMA_PATH } = {}) {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(fs.readFileSync(schemaPath, 'utf8'));
  } catch (error) {
    logger.error(`Cannot apply the schema from ${schemaPath}`);
    db.close();
    throw error;
  }
  return db;
}

/**
 * Insert records into an open database. This is where the schema does its validating job:
 * a bad enum value, a malformed id, a duplicate `(id, rev)` — all surface here, named by the
 * line they came from.
 */
function insertRecords(db, records) {
  const columns = FIELDS.join(', ');
  const placeholders = FIELDS.map((field) => `$${field}`).join(', ');
  const insert = db.prepare(`INSERT INTO records (${columns}) VALUES (${placeholders})`);

  for (const record of records) {
    try {
      insert.run(toRow(record));
    } catch (error) {
      const where = originOf(record) ?? `${record.id ?? '?'} rev ${record.rev ?? '?'}`;
      logger.error(`Record rejected by the schema (${where}): ${error.message}`);
      throw new Error(`Record rejected by the schema (${where}): ${error.message}`, {
        cause: error,
      });
    }
  }
}

/**
 * The whole store, indexed and ready to query.
 *
 * The index is rebuilt from `registry.ndjson` on every run, which costs ~11 ms at today's
 * size and is what makes staleness structurally impossible: there is no persisted index that
 * can drift from the log. It also re-validates every record on every invocation, so a bad row
 * anywhere fails loudly and immediately.
 *
 * The caller owns the returned database and must `close()` it.
 */
function openStore({
  registryPath = REGISTRY_PATH,
  schemaPath = SCHEMA_PATH,
  allowMissing = false,
} = {}) {
  const records = loadRegistry({ registryPath, allowMissing });
  const db = createDatabase({ schemaPath });
  try {
    insertRecords(db, records);
  } catch (error) {
    db.close();
    throw error;
  }
  return { db, records };
}

/**
 * The current revision of every record — the fold the whole design rests on. One row per
 * `id`, highest `rev` wins, ordered by `id` so output is deterministic.
 */
function currentRecords(db) {
  return db.prepare('SELECT * FROM current_records ORDER BY id').all().map(fromRow);
}

/** Every revision of one record, oldest first — its timeline. */
function revisionsOf(db, id) {
  return db.prepare('SELECT * FROM records WHERE id = ? ORDER BY rev').all(id).map(fromRow);
}

module.exports = {
  FIELDS,
  JSON_FIELDS,
  INTEGER_FIELDS,
  REGISTRY_PATH,
  SCHEMA_PATH,
  WORK_TRACKING_DIR,
  createLogger,
  originOf,
  parseRegistry,
  loadRegistry,
  toRow,
  fromRow,
  serializeRecord,
  createDatabase,
  insertRecords,
  openStore,
  currentRecords,
  revisionsOf,
};
