/**
 * Client-side helper: build the `Authorization: Bearer <idToken>` header for calls to
 * gated admin API routes (those guarded by `requireApiPermission`).
 *
 * Pass the `user` from `useAuth()`. Returns an empty object when there's no signed-in
 * user, so the request still goes out and the route replies 401 (rather than throwing
 * here). Type-only import keeps this client-safe.
 */
import type { User } from 'firebase/auth';

export async function authHeader(user: User | null): Promise<Record<string, string>> {
  const token = user ? await user.getIdToken() : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
