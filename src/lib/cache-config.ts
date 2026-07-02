/**
 * Single source of truth for the ISR fallback `revalidate` value (N).
 *
 * This is the time-based BACKSTOP in the §7a hybrid freshness model — admin
 * cat-edits reflect instantly via on-demand revalidation (`revalidatePath`);
 * this only bounds staleness for out-of-band changes (Firebase-console edits,
 * `update:*`/migration scripts, a dropped revalidate call). Hence it is
 * deliberately long.
 *
 * Re-exported as `revalidate` from the two baked route segments
 * (`src/app/page.tsx`, `src/app/pages/adoption/page.tsx`). It is HARDCODED here,
 * not env-driven: Next requires the segment `revalidate` to be statically
 * analyzable, and an env var would still need a redeploy while hiding the value
 * from the repo. To change N: edit this literal and `git push`.
 *
 * See `docs/manuals/deployment/README.md` → "ISR revalidation".
 */
export const REVALIDATE_SECONDS = 3600; // 1 hour
