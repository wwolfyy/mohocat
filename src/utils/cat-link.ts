/**
 * Canonical shareable link to one cat's modal — `/pages/cats?cat=<id>`.
 *
 * `CatInfo` renders on six surfaces (냥이들, 입양홍보, 소개, the map gallery, and
 * the inline `[catmodal:이름]` / media-link paths) and only 냥이들 carries the
 * `?cat=` param in its address bar. So a share button must **build** this link
 * from the cat it is showing — copying `window.location.href` would hand someone
 * a link to `/pages/adoption`, which is worse than no button at all.
 */

/**
 * Whether the current path addresses its tenant by prefix (`/geyang/…`) rather
 * than by host. Exported for the tests; callers want `buildCatLink`.
 *
 * 🔑 **Derived from the current path, not from config, and deliberately so.**
 * The obvious alternative — ask `mountains.json` whether this host is mapped —
 * is wrong *today*: geyang's configured domain is `geyangsan.mohocats.org`, but
 * production actually serves from the **apex**, which is in no `domains` list
 * and resolves through the default-tenant fallback. A config-driven answer would
 * therefore emit `/geyang/pages/cats…` in production and re-prefix the very URLs
 * the path-based tenancy decision (2026-07-28) keeps prefix-free.
 *
 * Mirroring the current path is right in every case instead: apex and mapped
 * subdomains have no prefix and get none, dev/preview `/{id}` paths keep theirs,
 * and after the path migration a real mountain #2 keeps its `/manisan` without
 * this needing to change.
 */
export function hasTenantPrefix(pathname: string, mountainId: string): boolean {
  return pathname === `/${mountainId}` || pathname.startsWith(`/${mountainId}/`);
}

/**
 * Absolute URL that opens `catId`'s modal, addressed the same way the page the
 * visitor is currently on is addressed.
 *
 * @param origin   e.g. `https://mohocats.org` (`window.location.origin`)
 * @param pathname the current path (`window.location.pathname`)
 */
export function buildCatLink(
  origin: string,
  pathname: string,
  mountainId: string,
  catId: string
): string {
  const prefix = hasTenantPrefix(pathname, mountainId) ? `/${mountainId}` : '';
  // Cat ids are frequently Korean (legacy docs are keyed by name), so the param
  // must be encoded — browsers display it readably and encode it on copy.
  return `${origin}${prefix}/pages/cats?cat=${encodeURIComponent(catId)}`;
}
