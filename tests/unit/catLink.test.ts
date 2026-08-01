/**
 * Canonical cat share link (`src/utils/cat-link.ts`).
 *
 * The interesting cases are all tenancy: this link is pasted into KakaoTalk and
 * is permanent, so a link that resolves to the *wrong mountain* cannot be
 * recalled once sent. It would also fail quietly — the wrong mountain has no cat
 * with that id, so the visitor lands on a cat list with nothing open, with no
 * error to notice.
 */
import { describe, it, expect } from 'vitest';
import { buildCatLink, hasTenantPrefix } from '@/utils/cat-link';

const ORIGIN = 'https://mohocats.org';

describe('hasTenantPrefix', () => {
  it('detects a path-addressed tenant', () => {
    expect(hasTenantPrefix('/geyang/pages/cats', 'geyang')).toBe(true);
    expect(hasTenantPrefix('/geyang', 'geyang')).toBe(true);
  });

  it('reports no prefix for host-addressed tenants', () => {
    expect(hasTenantPrefix('/pages/cats', 'geyang')).toBe(false);
    expect(hasTenantPrefix('/', 'geyang')).toBe(false);
  });

  it('does not mistake a longer segment for the tenant', () => {
    // `/geyangsan/...` is not `/geyang/...`; a `startsWith` without the
    // trailing slash would say it is and emit a link to the wrong tenant.
    expect(hasTenantPrefix('/geyangsan/pages/cats', 'geyang')).toBe(false);
  });
});

describe('buildCatLink', () => {
  it('emits a prefix-free link when the tenant comes from the host', () => {
    // Production today: geyang serves from the apex via the default-tenant
    // fallback, and its URLs are deliberately prefix-free.
    expect(buildCatLink(ORIGIN, '/pages/adoption', 'geyang', '개똥이')).toBe(
      `${ORIGIN}/pages/cats?cat=%EA%B0%9C%EB%98%A5%EC%9D%B4`
    );
  });

  it('keeps the tenant prefix when the current path carries one', () => {
    // Dev/preview today, and every non-default mountain after the path-based
    // tenancy migration. Dropping the prefix here would resolve the link to the
    // DEFAULT mountain — a silently wrong link to another mountain's cat list.
    expect(buildCatLink(ORIGIN, '/manisan/pages/adoption', 'manisan', 'test-cat-01')).toBe(
      `${ORIGIN}/manisan/pages/cats?cat=test-cat-01`
    );
  });

  it('always points at 냥이들, whichever surface the modal was opened from', () => {
    // CatInfo renders on six surfaces; only 냥이들 can honour `?cat=`.
    for (const from of ['/pages/adoption', '/pages/about', '/', '/pages/posts/abc']) {
      expect(buildCatLink(ORIGIN, from, 'geyang', 'test-cat-01')).toBe(
        `${ORIGIN}/pages/cats?cat=test-cat-01`
      );
    }
  });

  it('encodes ids so Korean and reserved characters survive the round trip', () => {
    const url = buildCatLink(ORIGIN, '/pages/cats', 'geyang', '삼색이&2');
    expect(url).toContain('%26');
    expect(new URL(url).searchParams.get('cat')).toBe('삼색이&2');
  });
});
