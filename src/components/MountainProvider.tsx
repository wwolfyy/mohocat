'use client';

/**
 * Client-side tenant context (multi-mountain plan §2.1).
 *
 * The server resolves the mountain per-request (middleware/`[mountain]`
 * segment, M3) and seeds this provider; client components read the active
 * mountain via `useMountain()` instead of any env-baked "current mountain".
 * Until M3 wires the route segment, the provider seeds from
 * `getDefaultMountainId()` — identical to today's behavior.
 */

import { createContext, useContext, type ReactNode } from 'react';
import { getDefaultMountainId } from '@/utils/config';

const MountainContext = createContext<string | null>(null);

export function MountainProvider({
  mountainId,
  children,
}: {
  mountainId: string;
  children: ReactNode;
}) {
  return <MountainContext.Provider value={mountainId}>{children}</MountainContext.Provider>;
}

/**
 * The active mountain ID. Outside a `MountainProvider` this falls back to the
 * default tenant — that fallback disappears with M3, when the provider is
 * seeded from the `[mountain]` segment on every page.
 */
export function useMountain(): string {
  return useContext(MountainContext) ?? getDefaultMountainId();
}
