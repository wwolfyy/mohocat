import type { LabelSide } from '@/types';

/** The minimal marker geometry `resolveLabelAbove` needs to place a title label. */
export interface LabelPlacement {
  x: number; // percent across the image (0–100)
  y: number; // percent down the image (0–100)
  labelSide?: { mobile?: LabelSide; desktop?: LabelSide };
}

/**
 * Decide whether a marker's title label renders **above** the avatar (vs below).
 *
 * An explicit per-Point `labelSide` for the active layout wins and is honored
 * as-is — that's the per-pin override authored on the Firestore Point, and it
 * deliberately **bypasses the edge auto-flip** so an operator can flip a label
 * that overlaps an adjacent pin.
 *
 * With no override, fall back to the deterministic bottom-edge flip: a below-
 * label needs ~52px of clearance, so a pin sitting within that band of the
 * container bottom flips above to avoid `overflow:hidden` clipping. `bottomBand`
 * is `1 - 52/containerHeight` (0 = top, 1 = bottom).
 *
 * The displayed vertical axis differs by layout: desktop (landscape) reads `y`;
 * mobile (portrait) reads `x`, because the 90°-CW rotation maps landscape-x onto
 * the portrait map's vertical axis.
 */
export function resolveLabelAbove(
  marker: LabelPlacement,
  isMobile: boolean,
  bottomBand: number
): boolean {
  const override = isMobile ? marker.labelSide?.mobile : marker.labelSide?.desktop;
  if (override) return override === 'above';

  const displayedY = (isMobile ? marker.x : marker.y) / 100;
  return displayedY > bottomBand;
}
