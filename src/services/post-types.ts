/**
 * The four post types and the service that backs each one.
 *
 * 🔑 **A post's address is (type, id), not id alone.** The four types live in
 * four separate Firestore collections — `posts_feeding`, `posts_butler`,
 * `posts_announcements`, `posts_adoption` — and document ids are unique only
 * *within* a collection. Anything that resolves a post from a URL therefore
 * needs the type as well, which is why `/pages/posts/[id]` carries `?type=`.
 *
 * This mapping existed in three places before (`AdminPostList`, `EditPostForm`,
 * and the post detail page) and had already drifted once: the detail page never
 * had it at all and read every type out of `posts_feeding`, so a 집사톡 post
 * always rendered "Post not found." One copy, so the next surface cannot drift.
 */

import type { IPostService } from './interfaces';
import {
  getPostService,
  getButlerTalkService,
  getAnnouncementService,
  getAdoptionService,
} from './index';

// ⚠️ Import this module directly (`@/services/post-types`), not through
// `@/services`. It depends on the factory getters in `index.ts` to keep the
// per-tenant singleton cache; re-exporting it from there would close a cycle.

/** 급식현황 · 집사톡 · 공지사항 · 입양홍보. */
export type PostType = 'butler_stream' | 'butler_talk' | 'announcements' | 'adoption_promotion';

export const POST_TYPES: readonly PostType[] = [
  'butler_stream',
  'butler_talk',
  'announcements',
  'adoption_promotion',
] as const;

/**
 * Narrows an untrusted value (a URL query param) to a `PostType`.
 *
 * Callers decide what an unrecognised value means — this deliberately does not
 * substitute a default, so a typo'd link cannot silently read the wrong
 * collection and report the post missing.
 */
export function isPostType(value: unknown): value is PostType {
  return typeof value === 'string' && (POST_TYPES as readonly string[]).includes(value);
}

/** The service backing a post type, for the given tenant. */
export function getServiceForPostType(type: PostType, mountainId: string): IPostService {
  switch (type) {
    case 'butler_stream':
      return getPostService(mountainId);
    case 'butler_talk':
      return getButlerTalkService(mountainId);
    case 'announcements':
      return getAnnouncementService(mountainId);
    case 'adoption_promotion':
      return getAdoptionService(mountainId);
  }
}

/**
 * Link target for a post's detail page.
 *
 * 🔑 **The type is a path segment, not a query param, so it cannot be dropped.**
 * `/pages/posts/{id}` simply does not match the route any more — where a
 * `?type=` could go missing and silently fall back to *some* collection, which
 * is the failure mode this whole module exists to make impossible.
 *
 * Every caller must go through this; a hand-built path is the original bug.
 */
export function postDetailPath(type: PostType, id: string): string {
  return `/pages/posts/${type}/${id}`;
}
