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
}

/**
 * Fires `onTimeout` after `timeoutMs` of no user interaction. Activity is
 * tracked via a throttled timestamp and polled on an interval (rather than
 * resetting a timer on every event), so rapid events like mousemove stay cheap.
 * `onTimeout` fires at most once per idle window; further activity re-arms it.
 */
export function useIdleTimeout({
  timeoutMs,
  onTimeout,
  enabled = true,
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

    lastActivityRef.current = Date.now();
    firedRef.current = false;

    let lastWrite = 0;
    const markActivity = () => {
      const now = Date.now();
      if (now - lastWrite >= ACTIVITY_THROTTLE_MS) {
        lastWrite = now;
        lastActivityRef.current = now;
      }
    };

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, markActivity, { passive: true }));

    const interval = window.setInterval(() => {
      if (firedRef.current) return;
      if (Date.now() - lastActivityRef.current >= timeoutMs) {
        firedRef.current = true;
        onTimeoutRef.current();
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, markActivity));
      window.clearInterval(interval);
    };
  }, [enabled, timeoutMs]);
}
