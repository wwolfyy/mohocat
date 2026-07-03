'use client';

import { useEffect, useState } from 'react';

/**
 * True when the viewport is in portrait orientation (taller than wide);
 * re-evaluates on rotation / resize via the `(orientation: portrait)` media
 * query. Decoupled from {@link useIsMobile} (a width threshold): the map picks
 * its image by *orientation* so the image's long axis always aligns with the
 * screen's long axis — portrait phone → rotated portrait map, the same phone in
 * landscape → landscape map — while clustering/controls stay width-driven.
 *
 * Starts `false` (SSR-safe, matches the desktop-first first client render to
 * avoid a hydration mismatch) and corrects in an effect after mount.
 */
export function useIsPortrait(): boolean {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const update = () => setIsPortrait(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return isPortrait;
}
