/**
 * Smoke / structural-integrity tests.
 *
 * These are deliberately fast (<1s), with **no server boot and no env/Firebase**,
 * so they run identically before and after the deployment cleanup. They guard the
 * things `tsc` can't:
 *   1. Referenced API routes exist — string `fetch('/api/...')` URLs are invisible to
 *      the type-checker, so deleting a still-referenced route would otherwise pass
 *      tsc and only break at runtime. (The main net for the dead-route cleanup.)
 *   2. The deploy-config "keepers" survive — firebase.json → Firestore rules wiring,
 *      the `contacts` rule, the mountain config + adminEmail recipient.
 *   3. Critical public pages still exist.
 *
 * The build / HTTP-200 dimension is covered by `npm run vercel-build` + a Vercel
 * preview deploy (see docs/planning/deployment-cleanup-plan.md), not here — booting
 * Next with Firebase env is slow and non-deterministic, the opposite of a smoke test.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

/** Recursively collect source files under a directory. */
function walk(dir: string, exts = ['.ts', '.tsx']): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      out.push(...walk(full, exts));
    } else if (exts.includes(extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

/** Every distinct `/api/...` path referenced as a string literal anywhere in src. */
function referencedApiPaths(): string[] {
  const re = /['"`](\/api\/[A-Za-z0-9/_-]+)/g;
  const found = new Set<string>();
  for (const file of walk(SRC)) {
    const text = readFileSync(file, 'utf8');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) found.add(m[1]);
  }
  return Array.from(found).sort();
}

describe('smoke: API route reference integrity', () => {
  const refs = referencedApiPaths();

  it('finds API route references in the source', () => {
    // Sanity: if this drops to 0 the regex/layout changed, not a real pass.
    expect(refs.length).toBeGreaterThan(0);
  });

  it.each(referencedApiPaths())('referenced route %s has a route handler file', (apiPath) => {
    const routeFile = join(SRC, 'app', apiPath, 'route.ts');
    expect(
      existsSync(routeFile),
      `Referenced ${apiPath} but ${routeFile} is missing — a needed route may have been deleted.`
    ).toBe(true);
  });
});

describe('smoke: deploy-config keepers (must survive the cleanup)', () => {
  it('firebase.json points to an existing Firestore rules file', () => {
    const fb = JSON.parse(readFileSync(join(ROOT, 'firebase.json'), 'utf8'));
    const rulesPath = fb?.firestore?.rules;
    expect(rulesPath, 'firebase.json must keep its firestore.rules entry').toBeTruthy();
    expect(existsSync(join(ROOT, rulesPath))).toBe(true);
  });

  it('Firestore rules still contain the contacts match', () => {
    const rules = readFileSync(join(ROOT, 'config/firebase/firestore.rules'), 'utf8');
    expect(rules).toMatch(/match\s+\/contacts\//);
  });

  it('mountain config parses and geyang has an adminEmail recipient', () => {
    const cfg = JSON.parse(readFileSync(join(ROOT, 'config/mountains/mountains.json'), 'utf8'));
    expect(cfg?.geyang?.adminEmail).toMatch(/.+@.+\..+/);
  });

  it('the live next.config.js exists', () => {
    expect(existsSync(join(ROOT, 'next.config.js'))).toBe(true);
  });
});

describe('smoke: content-form primitives exist (complexity-retirement P1)', () => {
  // The P2/P3 form migrations swap the hand-rolled upload sections for these;
  // behavioral coverage lives in tests/unit/uploadStrategies.test.ts + the e2e net.
  const primitives = [
    // One-file-per-section picker with per-file metadata. All three composers use
    // it since 2026-07-30; the flat `MediaUploadField` multi-file picker it
    // replaced is deleted.
    'components/forms/MediaItemList.tsx',
    // 등장하는 고양이 selector field, shared by all three composers since the
    // 2026-07-30 pass (distinct from admin/media/CatTagField, the editor's
    // free-text variant).
    'components/forms/CatTagSelectField.tsx',
    'components/forms/uploadStrategies.ts',
  ];
  it.each(primitives)('%s exists', (rel) => {
    expect(existsSync(join(SRC, rel))).toBe(true);
  });
});

describe('smoke: critical public pages exist', () => {
  // Since M3 (multi-mountain) every page lives under the [mountain] segment.
  const pages = [
    'page.tsx', // home
    'pages/adoption/page.tsx',
    'pages/contact/page.tsx',
    'pages/about/page.tsx',
    'pages/faq/page.tsx',
    'pages/announcements/page.tsx',
  ];
  it.each(pages)('%s exists', (rel) => {
    expect(existsSync(join(SRC, 'app', '[mountain]', rel))).toBe(true);
  });

  it('the tenant segment has its layout and the middleware exists', () => {
    expect(existsSync(join(SRC, 'app', '[mountain]', 'layout.tsx'))).toBe(true);
    expect(existsSync(join(SRC, 'middleware.ts'))).toBe(true);
  });
});

/**
 * The permission **vocabulary** must be single-sourced (§10p, 2026-08-03).
 *
 * 🔑 This suite exists because of a concrete failure: `upload-own-photo` /
 * `upload-own-video` were granted in `config/permissions.json` and enforced by
 * `firestore.rules`, while the admin 역할 matrix — which hardcoded its own copy of the
 * list — had never heard of them, so no operator could grant or revoke them. Four
 * copies of one list, and nothing compared them.
 *
 * These checks compare the three places a permission name can appear against the one
 * place it is defined. They are string-level on purpose: `tsc` cannot see a permission
 * name inside a `.rules` file or a `.json`.
 */
describe('smoke: the permission catalogue is single-sourced', () => {
  const permissionsTs = readFileSync(join(SRC, 'types', 'permissions.ts'), 'utf-8');

  /** The catalogue, read out of its `ALL_PERMISSIONS` literal. */
  const catalogue = (() => {
    const block = permissionsTs.match(/export const ALL_PERMISSIONS = \[([\s\S]*?)\] as const;/);
    expect(block, 'ALL_PERMISSIONS literal not found in types/permissions.ts').toBeTruthy();
    // Strip comments first — the entries are documented inline, and those comments
    // quote other permission names ("NOT 'manage-photo'"), which a naive scan counts
    // as entries and reports as duplicates.
    const code = block![1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    return Array.from(code.matchAll(/'([a-z-]+)'/g), (m) => m[1]);
  })();

  it('is non-empty and free of duplicates', () => {
    expect(catalogue.length).toBeGreaterThan(10);
    expect(new Set(catalogue).size).toBe(catalogue.length);
  });

  it('covers every permission any role is granted in config/permissions.json', () => {
    const seed = JSON.parse(readFileSync(join(ROOT, 'config', 'permissions.json'), 'utf-8')) as {
      roles: Record<string, { permissions: string[] }>;
    };
    const granted = Object.values(seed.roles).flatMap((r) => r.permissions);
    // A granted-but-uncatalogued permission is invisible in the admin matrices — the
    // exact §10p failure.
    expect(granted.filter((p) => !catalogue.includes(p))).toEqual([]);
  });

  it('covers every permission firestore.rules enforces', () => {
    const rules = readFileSync(join(ROOT, 'config', 'firebase', 'firestore.rules'), 'utf-8');
    const used = Array.from(rules.matchAll(/canWrite\('([a-z-]+)'\)/g), (m) => m[1]).concat(
      Array.from(rules.matchAll(/hasPermissionFor\([^,]+,\s*'([a-z-]+)'/g), (m) => m[1])
    );
    expect(used.length).toBeGreaterThan(0);
    // A rule can enforce a permission no operator can grant — which is a lockout, not
    // a leak, and therefore silent until someone is refused.
    expect(used.filter((p) => !catalogue.includes(p))).toEqual([]);
  });

  it('is not re-hardcoded in the admin matrices or the config module', () => {
    // Each of these had its own copy; all four are now derived. A literal list here
    // is how the drift happened, so fail on the shape rather than on the contents.
    const derived = [
      join(SRC, 'components', 'admin', 'RolePermissionConfig.tsx'),
      join(SRC, 'components', 'admin', 'ResourcePermissionConfig.tsx'),
      join(SRC, 'config', 'permission-config.ts'),
    ];
    for (const file of derived) {
      const source = readFileSync(file, 'utf-8');
      expect(source, `${file} must import the catalogue, not redefine it`).toMatch(
        /from '@\/types\/permissions'/
      );
      // 'manage-app' is the catalogue's first entry — its presence outside the source
      // of truth means someone pasted the list back in.
      expect(source.includes("'manage-app'"), `${file} re-hardcodes the list`).toBe(false);
    }
  });

  it('offers every nav-gated resourceId in the 권한 matrix', () => {
    // A nav item with no row is unconfigurable — how `cats` (냥이들) was stranded.
    const nav = readFileSync(join(SRC, 'components', 'Navigation.tsx'), 'utf-8');
    const matrix = readFileSync(
      join(SRC, 'components', 'admin', 'ResourcePermissionConfig.tsx'),
      'utf-8'
    );
    const navIds = Array.from(nav.matchAll(/resourceId="([a-z_]+)"/g), (m) => m[1]);
    const rowIds = Array.from(matrix.matchAll(/\{ id: '([a-z_]+)'/g), (m) => m[1]);
    expect(navIds.length).toBeGreaterThan(0);
    expect(navIds.filter((id) => rowIds.indexOf(id) === -1)).toEqual([]);
  });
});
