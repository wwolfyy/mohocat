/**
 * Unit coverage for the 급식소 freshness ramp (2026-08-05).
 *
 * 🔑 **The contrast assertions are the point of this file.** The ramp this
 * replaced ran pure green → pure red and measured ≈1.4:1 against the white table
 * row — unreadable, and worst at the *fresh* end. Nothing caught it because the
 * colour was computed inline in the component and had no test at all. Encoding
 * WCAG AA here means a future "brighter" ramp fails the suite instead of shipping.
 *
 * 📌 The rendered table is covered separately by
 * `tests/e2e/member/feeding-spots-list.spec.ts` — `seed-emulators.mjs` seeds four
 * spots spanning the ramp as of the same change. The exact colours and the
 * contrast rule stay here, where they can be asserted per hour.
 */
import { describe, it, expect } from 'vitest';
import { freshnessColor, FRESHNESS_RAMP, FRESHNESS_SCALE_HOURS } from '@/utils/feedingFreshness';

/** Parse the `rgb(r, g, b)` string the ramp returns. */
function parseRgb(css: string): [number, number, number] {
  const m = css.match(/^rgb\((\d+), (\d+), (\d+)\)$/);
  if (!m) throw new Error(`not an rgb() string: ${css}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** WCAG 2.x relative luminance. */
function luminance([r, g, b]: [number, number, number]): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio against white — the table row's background. */
function contrastOnWhite(css: string): number {
  return 1.05 / (luminance(parseRgb(css)) + 0.05);
}

describe('freshnessColor', () => {
  it('returns null when there is no visit on record', () => {
    expect(freshnessColor(null)).toBeNull();
  });

  it('starts at the fresh endpoint and ends at the stale one', () => {
    const { fresh, stale } = FRESHNESS_RAMP;
    expect(freshnessColor(0)).toBe(`rgb(${fresh.r}, ${fresh.g}, ${fresh.b})`);
    expect(freshnessColor(FRESHNESS_SCALE_HOURS)).toBe(`rgb(${stale.r}, ${stale.g}, ${stale.b})`);
  });

  it('clamps beyond the scale instead of overshooting', () => {
    expect(freshnessColor(FRESHNESS_SCALE_HOURS * 10)).toBe(freshnessColor(FRESHNESS_SCALE_HOURS));
    expect(freshnessColor(-5)).toBe(freshnessColor(0));
  });

  it('has no discontinuity at the endpoints', () => {
    // The bug this replaced: 0h and >=60h were Tailwind classes that did not match
    // the ramp they bookended, so the scale jumped at both thresholds. One hour in
    // should be a small step from the endpoint, not a different colour family.
    const step = (a: string, b: string) => {
      const [r1, g1, b1] = parseRgb(a);
      const [r2, g2, b2] = parseRgb(b);
      return Math.max(Math.abs(r1 - r2), Math.abs(g1 - g2), Math.abs(b1 - b2));
    };
    expect(step(freshnessColor(0)!, freshnessColor(1)!)).toBeLessThan(10);
    expect(step(freshnessColor(59)!, freshnessColor(60)!)).toBeLessThan(10);
  });

  it('is blue at the fresh end and red at the stale end', () => {
    const [fr, , fb] = parseRgb(freshnessColor(0)!);
    expect(fb).toBeGreaterThan(fr); // blue dominant

    const [sr, , sb] = parseRgb(freshnessColor(FRESHNESS_SCALE_HOURS)!);
    expect(sr).toBeGreaterThan(sb); // red dominant
  });

  it('meets WCAG AA (4.5:1) on the white row at every point on the ramp', () => {
    const failures: string[] = [];
    for (let h = 0; h <= FRESHNESS_SCALE_HOURS; h++) {
      const css = freshnessColor(h)!;
      const ratio = contrastOnWhite(css);
      if (ratio < 4.5) failures.push(`${h}h → ${css} = ${ratio.toFixed(2)}:1`);
    }
    expect(failures).toEqual([]);
  });

  it('rejects the ramp this replaced, proving the contrast check has teeth', () => {
    // Pure green → pure red, the previous endpoints. If this ever passes, the
    // assertion above has stopped measuring anything.
    expect(contrastOnWhite('rgb(0, 255, 0)')).toBeLessThan(4.5);
  });
});
