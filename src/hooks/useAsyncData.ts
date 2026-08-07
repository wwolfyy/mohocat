'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * One fetch, three honest states — `loading`, `ready`, `error`.
 *
 * 🐛 **Why this exists (2026-08-01, owner-reported).** The public post surfaces
 * kept only the fetched data, so "still loading" and "the fetch failed" were both
 * represented by the same empty value the UI renders as *아직 등록된 …이 없어요* /
 * *찾을 수 없습니다*. Three consequences, all reported as bugs: the failure message
 * was the **first paint** of every visit (server-rendered, even), a failed fetch
 * looked identical to genuinely empty content, and because nothing ever set state
 * again, only a reload could clear it.
 *
 * A caller that distinguishes the three states cannot make any of those mistakes:
 * the empty message becomes unreachable until a fetch has actually completed.
 *
 * 🔑 **The error is surfaced, not swallowed.** Services throw; this keeps the
 * error (and logs it) so the UI can offer 다시 시도 via `reload`, rather than the
 * previous `catch { console.error }` that dropped it and left the page inert.
 *
 * ⚠️ **`fetcher` must be stable** — pass a `useCallback`ed function, or one
 * defined outside the component. It is a dependency of the effect, so a function
 * rebuilt every render would refetch in a loop.
 */
export type AsyncState<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: T; error: null }
  | { status: 'error'; data: null; error: Error };

export type AsyncResult<T> = AsyncState<T> & { reload: () => void };

export function useAsyncData<T>(fetcher: () => Promise<T>): AsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({
    status: 'loading',
    data: null,
    error: null,
  });
  // Bumping this re-runs the effect; that is the whole retry mechanism.
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => {
    setState({ status: 'loading', data: null, error: null });
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const data = await fetcher();
        // The component can unmount (or the tenant change) mid-flight.
        if (!cancelled) setState({ status: 'ready', data, error: null });
      } catch (error) {
        console.error('useAsyncData: fetch failed', error);
        if (!cancelled) {
          setState({
            status: 'error',
            data: null,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [fetcher, attempt]);

  return { ...state, reload } as AsyncResult<T>;
}
