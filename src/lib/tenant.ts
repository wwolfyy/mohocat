/**
 * Request-scoped tenant resolution (multi-mountain plan §2.1).
 *
 * Maps an incoming request to a mountain ID:
 *  - by Host header, via each mountain's `domains` config (production
 *    subdomains, e.g. geyangsan.mohocats.org), falling back to
 *    `getDefaultMountainId()` for unmapped hosts (localhost, Vercel previews,
 *    the e2e harness);
 *  - by URL path segment, via `resolveMountainIdOrNull` (the `[mountain]`
 *    route segment lands in M3 — unknown segments must 404, not fall back).
 *
 * Pure functions over config — no Next.js imports, so this is usable from
 * middleware, server components, API routes, and unit tests alike.
 */

import { getAllMountains, getDefaultMountainId, getMountainConfig } from '@/utils/config';

/**
 * Validate a candidate mountain ID (e.g. a `[mountain]` route param).
 * Returns the ID when it names a configured mountain, otherwise `null` —
 * callers decide how to fail (pages: `notFound()`; APIs: 400/404).
 */
export function resolveMountainIdOrNull(candidate: string | null | undefined): string | null {
  if (!candidate || candidate.startsWith('_')) {
    return null;
  }
  return getAllMountains().some((mountain) => mountain.id === candidate) ? candidate : null;
}

/**
 * Strict Host→mountain lookup via the per-mountain `domains` config —
 * `null` when no mountain claims the host. Comparison ignores port and case.
 * Distinguishes "on a mapped production subdomain" from "on an unmapped host"
 * (localhost/preview), which the selector uses to pick cross-domain links vs
 * path links.
 */
export function findMountainIdByHost(host: string | null | undefined): string | null {
  if (!host) {
    return null;
  }
  const hostname = host.split(':')[0].toLowerCase();
  const match = getAllMountains().find((mountain) =>
    getMountainConfig(mountain.id).domains.some((domain) => domain.toLowerCase() === hostname)
  );
  return match ? match.id : null;
}

/**
 * Resolve a request Host header to a mountain ID via the per-mountain
 * `domains` config. Unmapped or missing hosts resolve to the default tenant —
 * by design, so localhost, Vercel preview hosts, and the e2e harness keep
 * serving the default mountain.
 */
export function getMountainIdForHost(host: string | null | undefined): string {
  return findMountainIdByHost(host) ?? getDefaultMountainId();
}

/**
 * Resolve the tenant for an API route from its Request. Host-based, with the
 * same default-tenant fallback as `getMountainIdForHost`.
 */
export function getRequestMountainId(request: Request): string {
  return getMountainIdForHost(request.headers.get('host'));
}
