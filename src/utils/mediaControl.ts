/**
 * Media-upload rules — `config/media_control.json`.
 *
 * **Deployment-wide, not per-mountain** (owner, 2026-08-02). Every mountain gets
 * the same rules, so this deliberately does *not* live in
 * `config/mountains/mountains.json` and no accessor takes a `mountainId`.
 *
 * ⚠️ **Static, so changing it needs a redeploy.** That is the point rather than a
 * limitation: the alternative considered was a Firestore-backed CMS toggle, which
 * would have made any one mountain's admin able to silently reconfigure every
 * other mountain's composer. A static file moves that authority to whoever can
 * deploy. Recorded in `docs/planning/PROJECT_PLAN.md` §10d (D2) so the Firestore
 * design is not re-derived later.
 *
 * **Scope: 집사톡 only.** 공지사항 and 입양홍보 are admin-only surfaces and stay
 * unrestricted by decision (PROJECT_PLAN §10d, owner 2026-07-30) — do not extend
 * these flags to them without a new decision.
 *
 * ⚠️ JSON has no type checking at the edit site, so a mistyped key would read as
 * `undefined`. `getButlerTalkMediaRules()` validates and **throws** rather than
 * letting a typo silently pick a behaviour.
 */

import mediaControlConfig from '../../config/media_control.json';

export interface ButlerTalkMediaRules {
  /** `false` → 집사톡 accepts one video per post. */
  allowMultipleVideos: boolean;
  /** `false` → 집사톡 accepts one photo per post. */
  allowMultipleImages: boolean;
}

/**
 * The 집사톡 composer's media rules.
 *
 * @throws if `config/media_control.json` is missing either flag or holds a
 * non-boolean — a malformed config must fail loudly at the call site rather than
 * degrade to an accidental default.
 */
export function getButlerTalkMediaRules(): ButlerTalkMediaRules {
  const rules = mediaControlConfig.butlerTalk;

  if (!rules || typeof rules !== 'object') {
    throw new Error('media_control.json: missing the "butlerTalk" section');
  }

  for (const key of ['allowMultipleVideos', 'allowMultipleImages'] as const) {
    if (typeof rules[key] !== 'boolean') {
      throw new Error(`media_control.json: butlerTalk.${key} must be a boolean`);
    }
  }

  return {
    allowMultipleVideos: rules.allowMultipleVideos,
    allowMultipleImages: rules.allowMultipleImages,
  };
}
