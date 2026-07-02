import { useEffect, useRef } from 'react';

// User interactions that count as "activity" and keep the session alive.
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousedown',
  'mousemove',
  'keydown',
  'touchstart',
  'scroll',
  'wheel',
];

// mousemove/scroll fire rapidly — only record activity at most this often.
const ACTIVITY_THROTTLE_MS = 1000;
// How often to check whether the idle window has elapsed. With a multi-hour
// timeout, a 1-minute check granularity is plenty and keeps the loop cheap.
const CHECK_INTERVAL_MS = 60 * 1000;

interface UseIdleTimeoutOptions {
  /** Idle duration, in ms, after which `onTimeout` fires. */
  timeoutMs: number;
  /** Called once when the user has been idle for `timeoutMs`. */
  onTimeout: () => void;
  /** When false, no listeners/timers run (e.g. before sign-in). Defaults to true. */
  enabled?: boolean;
  /**
   * When set, last-activity is shared across tabs via this localStorage key, so
   * a background/idle tab won't time out while another tab of the same origin
   * is active. Without it, each tab tracks activity independently — which, with
   * a cross-tab-synced sign-out, lets an idle background tab log the user out of
   * their active tab. Pass a stable, app-namespaced key.
   */
  storageKey?: string;
}

/**
 * Fires `onTimeout` after `timeoutMs` of no user interaction. Activity is
 * tracked via a throttled timestamp and polled on an interval (rather than
 * resetting a timer on every event), so rapid events like mousemove stay cheap.
 * `onTimeout` fires at most once per idle window; further activity re-arms it.
 *
 * With `storageKey`, activity is shared across tabs: any tab's activity keeps
 * every tab alive, and `onTimeout` only fires once *all* tabs are idle.
 */
export function useIdleTimeout({
  timeoutMs,
  onTimeout,
  enabled = true,
  storageKey,
}: UseIdleTimeoutOptions): void {
  const lastActivityRef = useRef<number>(Date.now());
  const onTimeoutRef = useRef(onTimeout);
  const firedRef = useRef(false);

  // Keep the latest callback without re-subscribing the activity listeners.
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!enabled) return;

    // Cross-tab activity, shared via localStorage. The try/catch degrades
    // gracefully to per-tab behavior when storage is unavailable (private mode,
    // quota, disabled) — a broken read must not break the idle timer.
    const readSharedActivity = (): number => {
      if (!storageKey) return 0;
      try {
        const raw = window.localStorage.getItem(storageKey);
        const parsed = raw ? parseInt(raw, 10) : 0;
        return Number.isFinite(parsed) ? parsed : 0;
      } catch {
        return 0;
      }
    };
    const writeSharedActivity = (ts: number): void => {
      if (!storageKey) return;
      try {
        window.localStorage.setItem(storageKey, String(ts));
      } catch {
        // Ignore: fall back to this tab's own timer.
      }
    };

    const now = Date.now();
    lastActivityRef.current = now;
    firedRef.current = false;
    writeSharedActivity(now);

    let lastWrite = 0;
    const markActivity = () => {
      const ts = Date.now();
      if (ts - lastWrite >= ACTIVITY_THROTTLE_MS) {
        lastWrite = ts;
        lastActivityRef.current = ts;
        writeSharedActivity(ts);
      }
    };

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, markActivity, { passive: true }));

    const interval = window.setInterval(() => {
      if (firedRef.current) return;
      // Idle only if THIS tab and every other tab have been idle past the window.
      const lastActivity = Math.max(lastActivityRef.current, readSharedActivity());
      if (Date.now() - lastActivity >= timeoutMs) {
        firedRef.current = true;
        onTimeoutRef.current();
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, markActivity));
      window.clearInterval(interval);
    };
  }, [enabled, timeoutMs, storageKey]);
}
