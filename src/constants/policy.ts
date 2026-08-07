/**
 * Published-policy version — the single source of truth for "which text did the
 * member actually agree to".
 *
 * Consent records (`users/{uid}.consent`) store this alongside the timestamp, so
 * a later revision of 이용약관 / 개인정보처리방침 is distinguishable from the text a
 * given member consented to. PIPA expects a controller to be able to demonstrate
 * *what* was consented to, not merely *that* consent happened.
 *
 * ⚠️ Bump `POLICY_VERSION` whenever the substance of either policy page changes,
 * and update `POLICY_EFFECTIVE_DATE_KO` to match — the two are the same fact in
 * machine and display form. The 이용약관 and 개인정보처리방침 currently share one
 * effective date; consent is recorded per-item, so they can diverge later without
 * a schema change.
 */

/** Machine-comparable policy version (ISO date of the effective date below). */
export const POLICY_VERSION = '2026-07-10';

/** Display form, rendered as 시행일 on both policy pages. */
export const POLICY_EFFECTIVE_DATE_KO = '2026년 7월 10일';
