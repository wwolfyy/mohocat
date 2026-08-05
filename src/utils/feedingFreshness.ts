/**
 * 급식소 freshness ramp — "how long since this spot was last attended" as a colour.
 *
 * Renders on the 급식소 현황 table (`src/components/FeedingSpotsList.tsx`).
 *
 * 🔑 **Why the endpoints are written out here rather than read from Tailwind.**
 * The colour is interpolated per row at render time, so it cannot be a utility
 * class, and `theme()` is a build-time CSS function unavailable to TS. These two
 * constants are the one place the ramp is defined — mirroring Tailwind's
 * `blue-700` / `red-700`. If the palette moves, move them here.
 *
 * ⚠️ **Accessibility is the constraint that picked these values.** The previous
 * ramp ran pure green → pure red (`rgb(0,255,0)` … `rgb(255,0,0)`) which measured
 * ≈1.4:1 against the white table row — far under WCAG AA's 4.5:1, and worst at
 * the *fresh* end, so a recently-fed spot was the hardest row to read. Anchoring
 * on the 700 stops keeps every point on the ramp above 4.5:1; `feedingFreshness.test.ts`
 * asserts it, so a "brighter" ramp fails the suite rather than shipping.
 *
 * 📌 **Blue → red, not green → red** (owner, 2026-08-05). Green↔red is the pair
 * most likely to be indistinguishable under the common forms of colour blindness,
 * which is precisely the wrong choice for a scale whose two ends carry opposite
 * meanings. The midpoint reads purple — that is ordinary RGB interpolation
 * between the endpoints, not a bug.
 */

/** Ramp endpoints. `fresh` == Tailwind `blue-700` (#1D4ED8), `stale` == `red-700` (#B91C1C). */
export const FRESHNESS_RAMP = {
  fresh: { r: 29, g: 78, b: 216 },
  stale: { r: 185, g: 28, b: 28 },
} as const;

/** Hours at which the ramp reaches `stale`. Beyond this it stays there. */
export const FRESHNESS_SCALE_HOURS = 60;

/** Hours after which `formatHoursAgo` appends the non-colour urgency marker. */
export const FRESHNESS_URGENT_HOURS = 48;

/**
 * The colour for a spot last attended `hoursAgo` hours ago, as a CSS `rgb(...)`
 * string — or `null` when there is no visit on record, which the caller renders
 * as muted grey rather than as a point on the scale.
 *
 * The ratio is **clamped**, so 0 and ≥60 fall out of the same interpolation as
 * everything else. 🔑 That is deliberate: the previous version special-cased both
 * ends with Tailwind classes that did not match the ramp they bookended, so the
 * scale jumped at exactly the two thresholds an operator watches.
 */
export function freshnessColor(hoursAgo: number | null): string | null {
  if (hoursAgo === null) return null;

  const ratio = Math.min(Math.max(hoursAgo / FRESHNESS_SCALE_HOURS, 0), 1);
  const { fresh, stale } = FRESHNESS_RAMP;
  const mix = (from: number, to: number) => Math.round(from + (to - from) * ratio);

  return `rgb(${mix(fresh.r, stale.r)}, ${mix(fresh.g, stale.g)}, ${mix(fresh.b, stale.b)})`;
}
