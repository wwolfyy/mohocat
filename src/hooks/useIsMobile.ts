'use client';

import { useEffect, useState } from 'react';

// Mobile behaviours (marker clustering + the 90°-CW map rotation) switch on
// below this viewport width. 768px = Tailwind `md`, matching the app's existing
// responsive breakpoints.
export const MOBILE_BREAKPOINT = 768;

/**
 * True when the viewport is below the mobile breakpoint; re-evaluates on resize.
 * Starts `false` (SSR-safe, matches first client render to avoid hydration
 * mismatch) and corrects in an effect after mount.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return isMobile;
}
