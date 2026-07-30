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
