import { NextRequest, NextResponse } from 'next/server';
import { getMountainIdForHost, resolveMountainIdOrNull } from '@/lib/tenant';

/**
 * Host-based tenant routing (multi-mountain plan §2.1 / M3).
 *
 * Visitors see clean paths; the app tree lives under `/[mountain]/…`. This
 * middleware bridges the two:
 *  1. a path that already starts with a configured mountain id passes through
 *     (dev/preview direct path access, e.g. `/geyang/pages/cats`);
 *  2. otherwise the Host header picks the mountain via each mountain's
 *     `domains` config, falling back to the default tenant (`MOUNTAIN_ID` env)
 *     for unmapped hosts — localhost, Vercel previews, the e2e harness — and
 *     the request is REWRITTEN (URL unchanged in the browser) onto the segment.
 *
 * `/api`, Next internals, and static files are excluded by the matcher.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const firstSegment = pathname.split('/')[1];
  if (resolveMountainIdOrNull(firstSegment)) {
    return NextResponse.next();
  }

  const mountainId = getMountainIdForHost(request.headers.get('host'));
  const url = request.nextUrl.clone();
  url.pathname = `/${mountainId}${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Everything except API routes, Next internals, and files with an extension
  // (public/ assets like /images/…). favicon.ico is covered by the dot rule.
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
