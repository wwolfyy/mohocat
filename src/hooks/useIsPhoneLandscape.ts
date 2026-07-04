'use client';

import { useEffect, useState } from 'react';

/**
 * True when the device is a **phone held in landscape** — a landscape viewport
 * whose height is small enough to be a phone (not a tablet or desktop). Used to
 * gate the map's "rotate to portrait" notice: the map is portrait-only on phones
 * (see {@link MountainViewer}), so a landscape phone is shown the notice instead
 * of a cramped sideways map. `max-height: 540px` catches phones in landscape
 * (≤ ~430px tall) while excluding small tablets (≥ ~600px) and desktops.
 *
 * Starts `false` (SSR-safe, matches the desktop-first first client render to
 * avoid a hydration mismatch) and corrects in an effect after mount.
 */
export function useIsPhoneLandscape(): boolean {
  const [isPhoneLandscape, setIsPhoneLandscape] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape) and (max-height: 540px)');
    const update = () => setIsPhoneLandscape(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return isPhoneLandscape;
}
