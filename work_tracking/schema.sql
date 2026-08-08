-- work_tracking/schema.sql — the NORMATIVE schema for the work registry.
--
-- Read SCHEMA.md for the prose; this file is what actually enforces the rules.
-- Loaded into an IN-MEMORY SQLite database on every script run (node:sqlite).
-- No .db file is ever written to disk or committed — see
-- work-tracking-restructure-20260808.md §4.
--
-- Two jobs:
--   1. Index    — checkout queries it to find related items.
--   2. Validator — checkin DRY-RUN inserts work.json, rolls back, and only
--                  appends to registry.ndjson if every constraint passed.
--
-- STRICT requires SQLite >= 3.37. Node 25's node:sqlite ships 3.50+.

CREATE TABLE records (
  -- identity ---------------------------------------------------------------
  id         TEXT    NOT NULL CHECK (id GLOB 'R-[0-9][0-9][0-9][0-9]'),
  rev        INTEGER NOT NULL CHECK (rev >= 1),
  ts         TEXT    NOT NULL CHECK (ts GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),

  -- classification ---------------------------------------------------------
  type       TEXT    NOT NULL CHECK (type   IN ('task','decision','bug','change')),
  status     TEXT    NOT NULL CHECK (status IN ('open','in-progress','done','abandoned')),
  outcome    TEXT             CHECK (outcome IS NULL OR
                                     outcome IN ('adopted','rejected','superseded')),

  -- content ----------------------------------------------------------------
  title      TEXT    NOT NULL CHECK (length(trim(title)) > 0),
  plan       TEXT,                      -- backlink to a PROJECT_PLAN section, e.g. '§10u'
  detail_ref TEXT,                      -- 'records/R-0142.md' — prose lives OUTSIDE the row
  note       TEXT,                      -- why THIS revision exists

  -- relationships ----------------------------------------------------------
  -- supersedes: JSON array of ids this row REPLACES (those items are dead).
  supersedes TEXT             CHECK (supersedes IS NULL OR
                                     (json_valid(supersedes) AND
                                      json_type(supersedes) = 'array')),
  -- split_from: the ONE parent this was broken out of (that item stays ALIVE).
  -- Scalar, not an array. Only the child stores the pointer; children are derived.
  split_from TEXT             CHECK (split_from IS NULL OR
                                     split_from GLOB 'R-[0-9][0-9][0-9][0-9]'),

  -- provenance -------------------------------------------------------------
  files      TEXT             CHECK (files IS NULL OR
                                     (json_valid(files) AND json_type(files) = 'array')),
  source_ref TEXT,                      -- 'BACKLOG.md#B1@4484234' — commit-pinned

  PRIMARY KEY (id, rev)
) STRICT;

-- A record is never edited; an update APPENDS a row with the next rev.
-- The PK above is therefore also the collision detector: two sessions that both
-- take R-0142 at rev 2 and both write rev 3 fail here rather than silently
-- producing two rows that each claim to be current.

CREATE INDEX idx_records_status ON records (status);
CREATE INDEX idx_records_type   ON records (type);
CREATE INDEX idx_records_plan   ON records (plan);
CREATE INDEX idx_records_parent ON records (split_from);

-- Derived staleness. `stale` is NEVER stored — writing it would mean editing an
-- existing line, which breaks every merge strategy tested (§4.3). It is computed.
CREATE VIEW records_with_stale AS
SELECT
  r.*,
  CASE WHEN r.rev = (SELECT MAX(rev) FROM records WHERE id = r.id)
       THEN 0 ELSE 1 END AS stale
FROM records r;

-- The current state of every item: one row per id, highest rev wins.
-- This is what checkout reads and what build.js renders into registry.md.
CREATE VIEW current_records AS
SELECT * FROM records r
WHERE r.rev = (SELECT MAX(rev) FROM records WHERE id = r.id);

-- Roll-up for a parent's children, for the hierarchy view in registry.md.
CREATE VIEW children_progress AS
SELECT
  p.id                                                   AS parent_id,
  COUNT(c.id)                                            AS children,
  SUM(CASE WHEN c.status = 'done' THEN 1 ELSE 0 END)     AS children_done
FROM current_records p
JOIN current_records c ON c.split_from = p.id
GROUP BY p.id;

-- NOT enforceable here, and therefore the job of checkin.js:
--   * split_from / supersedes must point at ids that EXIST and are present in
--     work.json. A SQL foreign key cannot express it: the PK is (id, rev) and
--     the reference is to id alone.
--   * A revision whose only differences are ts and rev MUST carry a note, or
--     checkin drops it as unmodified and the parent's timeline goes silent at
--     the moment it was decomposed.
