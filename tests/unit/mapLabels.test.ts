import { describe, it, expect } from 'vitest';
import { resolveLabelAbove, type LabelPlacement } from '../../src/utils/mapLabels';

// A container ~800px tall gives bottomBand = 1 - 52/800 = 0.935.
const BAND = 1 - 52 / 800;

describe('resolveLabelAbove — automatic edge-flip (no override)', () => {
  it('keeps an interior pin below (desktop reads y)', () => {
    const m: LabelPlacement = { x: 10, y: 50 };
    expect(resolveLabelAbove(m, false, BAND)).toBe(false);
  });

  it('flips a bottom-edge pin above (desktop reads y)', () => {
    const m: LabelPlacement = { x: 10, y: 98 };
    expect(resolveLabelAbove(m, false, BAND)).toBe(true);
  });

  it('reads x (not y) on mobile because the map is rotated 90°', () => {
    // High x, low y: below on desktop, flipped above on mobile.
    const m: LabelPlacement = { x: 98, y: 10 };
    expect(resolveLabelAbove(m, false, BAND)).toBe(false);
    expect(resolveLabelAbove(m, true, BAND)).toBe(true);
  });
});

describe('resolveLabelAbove — per-Point override', () => {
  it('honors an explicit mobile override, bypassing the edge auto-flip', () => {
    // Interior pin (auto → below), but mobile override forces above.
    const m: LabelPlacement = { x: 50, y: 50, labelSide: { mobile: 'above' } };
    expect(resolveLabelAbove(m, true, BAND)).toBe(true);
  });

  it('honors an explicit below override on a bottom-edge pin (would auto-flip above)', () => {
    const m: LabelPlacement = { x: 10, y: 98, labelSide: { desktop: 'below' } };
    expect(resolveLabelAbove(m, false, BAND)).toBe(false);
  });

  it('applies the override only to its own layout; the other falls back to auto', () => {
    const m: LabelPlacement = { x: 50, y: 98, labelSide: { mobile: 'above' } };
    // Mobile: override → above. Desktop: no override, y=98 is in the band → auto above.
    expect(resolveLabelAbove(m, true, BAND)).toBe(true);
    expect(resolveLabelAbove(m, false, BAND)).toBe(true);
    // Desktop interior pin with a mobile-only override → desktop stays auto (below).
    const m2: LabelPlacement = { x: 50, y: 50, labelSide: { mobile: 'above' } };
    expect(resolveLabelAbove(m2, false, BAND)).toBe(false);
  });
});
