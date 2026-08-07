# Member media upload on 집사톡 — narrow `upload-own-*` permissions — plan

**Created:** 2026-08-03 · **Status:** ✅ **DONE — deployed 2026-08-03, verified live 2026-08-04** ·
**Follows:** [`member-post-authoring-20260802.md`](./member-post-authoring-20260802.md) (§10n)
**Tracker:** PROJECT_PLAN §10p

> ## 🔴 §10n is LIVE in production — the "not live" note everywhere was wrong
>
> Found while dry-running the migration, and verified against production three ways:
>
> 1. **The rules are deployed.** The live Firestore ruleset (release `cloud.firestore`,
>    **2026-08-02T16:00:12Z**) is byte-identical to `config/firebase/firestore.rules`
>    ignoring comments, **except** for this plan's own `upload-own-photo` clause.
>    `authoringAsSelf`, `provenanceUnchanged`, `isReplyCountBump` and the `feeding_spots`
>    member clause are all in production.
> 2. **The live matrix already grants them.** `role_permissions/role-config` gives
>    `write-own-post-butler` + `write-own-post-feeding` to `butler-ground`, and
>    `write-own-post-butler` to `butler-internet` — the dry run reported them
>    "already held" and skipped.
> 3. **A real member has already used it.** One active `butler-ground` account exists on
>    geyang, and `posts_feeding` holds **two posts it authored on 2026-08-03**, both
>    stamped with its `authorUid`.
>
> ⚠️ **So this gap is not theoretical and not deferred.** `posts_butler` is empty today,
> which is the only reason nobody has hit it: 급식현황 uploads nothing, so that member's
> two posts were safe. **The first 집사톡 post they write with a photo attached is lost.**
>
> 📌 **How the grants got there is not established.** The seed path can be ruled out —
> `GET /api/admin/role-permissions` seeds only when the doc is absent, and it exists. That
> leaves someone saving the Permission Matrix in the admin UI (`POST` on the same route,
> reachable on the **Preview** deployment, which reads and writes **production**
> Firestore) or an unrecorded `APPLY=true` run. 🔑 **The transferable lesson: "the code
> isn't on `main`" does not mean "the change isn't in production."** Preview shares the
> production database, and rules and the permission matrix are deployed out-of-band by
> hand — so a feature can be fully live while its branch is still 80 commits from `main`.
> **Check the deployed artifact, not the branch.**

## 1. The gap this closes

§10n let butler roles write 집사톡 posts. It granted the two **post** permissions and stopped
there — but 집사톡 is the one board with **media upload**, and every upload surface is gated on
`manage-photo` / `manage-video`, which **only `admin` holds**. A member who attaches a file
does not get a degraded post; they lose the post:

| Surface                             | Gate today                        | Member result |
| ----------------------------------- | --------------------------------- | ------------- |
| `POST /api/generate-signed-url`     | `manage-photo`                    | **403**       |
| `POST /api/upload-youtube`          | `manage-video`                    | **403**       |
| `POST /api/upload-youtube/complete` | `manage-video` (independently)    | **403**       |
| `cat_images` write (client SDK)     | rules: `canWrite('manage-photo')` | **denied**    |

`useRichContentForm` catches an upload failure, alerts, and **`return`s** — so the save never
runs and everything typed is lost, behind an English string (`Image upload failed: Failed to
get signed URL: Forbidden`).

✅ **Verified before planning, not assumed** — a throwaway rules suite asserted `butler-ground`
and `butler-internet` denied on `cat_images` / `cat_videos`, **with two controls in the same
run**: admin succeeds on both collections, and butler-ground succeeds on its own `posts_butler`
post. So the denials are specific to media, not a broken fixture.

📌 **Scope is 집사톡 only.** 급식현황's `NewPostForm` uploads nothing by design (2026-07-27,
D1). 공지사항 / 입양홍보 upload but stay admin-only. Both the **create** page and the member
**edit** route render `NewButlerTalkForm`, so both are affected.

📌 **Why nothing caught it.** `tests/e2e/member/butler-authoring.spec.ts` is text-only and says
so — an exclusion inherited from `admin/butler-create.spec.ts`, where it was **harmless because
an admin holds every permission**. Carried into the member specs, it sat exactly on top of the
one thing the new role could not do. 🔑 **The rules suite missed it for the mirror-image
reason: it tested the permissions the feature added, not the ones its user journey depends on.**

## 2. Decisions

- **D1 — Two new permissions: `upload-own-photo`, `upload-own-video`.** Granted to
  **`butler-ground`** and **`butler-internet`** (both hold `write-own-post-butler`, and 집사톡
  is the only board that uploads). Not to `viewer`.
- **D2 — They authorize creating a media record attributed to yourself, and nothing else.**
  Explicitly **not**: updating or deleting any media record, the tagging tools, the album CRUD,
  YouTube sync, playlist management, or video-availability reconciliation. Those stay
  `manage-photo` / `manage-video`. **This is the whole point of the narrow grant** — a member
  who may add a photo must not thereby be able to retag or delete the album.
- **D3 — `uploadedByUid` is the identity; `uploadedBy` is display.** Mirrors §10n's
  `authorUid` decision for exactly the same reason: `uploadedBy` is a free-text string that in
  practice holds emails **and literals** (`'admin'`, `'user'`, `'system_sync'`,
  `'youtube_sync'`), so it cannot carry authorization. New field, stamped at creation, never
  rewritten. ⚠️ **No backfill** — existing records keep an empty `uploadedByUid`, which is
  correct: they were uploaded by admins, and the member clause is **create-only**, so nothing
  reads it on an existing doc.
- **D4 — `cat_images` gets a member clause; `cat_videos` does NOT.** The video record is
  written by the **Admin SDK** in `/api/upload-youtube/complete`, which bypasses rules
  entirely — its only gate is the API route. A rule clause there would be dead surface
  guarding a write path that does not exist. ⚠️ Do not "fix the asymmetry" without first
  moving the video write client-side.
- **D5 — API gates accept any-of.** `requireApiPermission` takes `string | string[]`; an array
  means **any one of**. Only the three upload routes pass an array; the other seven are
  untouched.
- **D6 — Every gate keeps admitting the admin permission.** §10n shipped this bug once already
  (its N-finding: a single-permission gate on the new grant **locked admins out**, because
  `manage-posts` and `write-own-*` are different permissions). `manage-photo` /
  `manage-video` must stay an accepted alternative everywhere.
- **D7 — create-only, and no update clause.** The composer writes 제목/설명 at creation; §10l
  already decided retained media carries no editor on a post edit. Nothing needs a member
  update path.

⚠️ **Accepted widening, stated plainly:** `generate-signed-url` mints a 15-minute **bucket
write** URL, and this moves who may call it from "admins" to "registered butlers". What bounds
it stays unchanged — the object path is **server-chosen** (`<storagePrefix>uploads/<fileName>`,
from the Host-resolved tenant), a duplicate name is refused with 409, the URL expires in 15
minutes, and `contentType` is pinned at signing. The client controls the filename, never the
prefix.

## 3. Tasks

- [ ] **M1 — the two permissions.** Add to `config/permissions.json` (both butler roles) and to
      `src/types/permissions.ts` (`Permission` union + `isValidPermission`). Extend
      `scripts/migration/add-member-post-permissions.js`'s `GRANTS` — it has **not run yet**,
      so it stays the single place that updates the live `role_permissions/role-config`.
- [ ] **M2 — `uploadedByUid`.** Add to `CatImage` / `CatVideo` in `src/types/media.ts`; stamp
      it in `uploadStrategies.uploadImagesWithSignedUrls` (from the signed-in user) and in
      `/api/upload-youtube/complete` (from `authz.uid`). For videos this is **audit only** —
      the Admin SDK bypasses rules — but it makes "who uploaded this" answerable now that
      non-admins can.
- [ ] **M3 — rules.** `cat_images` keeps `allow write: if canWrite('manage-photo')` and gains
      `allow create: if canWrite('upload-own-photo') && uploadingAsSelf()`. New helper
      `uploadingAsSelf()`, mirroring `authoringAsSelf()`.
- [ ] **M4 — API gates.** `requireApiPermission` accepts `string | string[]` (any-of);
      `generate-signed-url` → `['manage-photo','upload-own-photo']`, both YouTube halves →
      `['manage-video','upload-own-video']`.
- [ ] **M5 — tests.** New `tests/rules/media.rules.test.ts`: a member may create a
      `cat_images` record **as themselves**, and is refused when attributing it to someone
      else, when updating or deleting **any** record (including their own), and on another
      mountain; `cat_videos` stays admin-only from the client; admin controls throughout.
      Plus unit coverage for the any-of gate. ⚠️ **Mutation-test it** — the §10n suite passed
      first try and still had a hole.
- [ ] **M6 — docs.** Admin manual roles table, `docs/codebase/permissions-and-roles.md` +
      `api-routes.md`, PROJECT_PLAN §10p, HANDOFF, `log/FEATURE_MOD_LOG.md`.

## 4. Deploy order — ✅ COMPLETE

> ✅ **Done 2026-08-03 (owner), verified against production 2026-08-04.** The deployed
> ruleset (release **2026-08-03T12:03:36Z**) carries the `cat_images` create clause and
> `uploadingAsSelf`, and the live `role_permissions/role-config` grants `upload-own-photo`
>
> - `upload-own-video` to **both** butler roles. 🔑 Verified by reading the deployed
>   artifact, not by trusting the branch — the §10n lesson, and the check that caught §10q
>   still being undeployed.
>
> ✅ **Moved to `completed/` 2026-08-04**, when §10q shipped on the same rules file.

📌 **§10n's steps 1 and 2 are already done** (see the box at the top) — these are the
remaining ones, for this change only:

1. `firebase deploy --only firestore:rules` — adds the `cat_images` create clause. Inert
   until step 2, since no role holds `upload-own-photo` yet.
2. `APPLY=true node scripts/migration/add-member-post-permissions.js` — the dry run
   reports **`{added: 4, alreadyHeld: 3}`**: the four new `upload-own-*` grants, with
   §10n's three correctly skipped. Snapshot first (`npm run backup:firestore`).
3. Push the code.

⚠️ **The one ordering that breaks things is 2 before 1** — granting `upload-own-photo`
while the deployed rules still say `cat_images` needs `manage-photo`. Then the API gate
passes, the photo reaches Storage, and the `cat_images` write is **denied and swallowed**
(it is non-fatal by design), so the post saves with a photo that never appears in the
사진첩 or the tagging queue — a **silent** half-failure, and the hardest state to notice.
Rules first closes it.

📌 Every other partial state is safe and simply changes nothing: 1 alone is inert (no
role holds the permission), 3 alone still 403s at the API (same as today), and 1+2
without 3 still 403s because the old route asks for `manage-photo` only. **Only 2-before-1
is harmful.**

## 5. Risks

- **The narrow grant is only as narrow as the routes honour.** `upload-own-photo` is worth
  having only because no other surface accepts it; if a later route adds it to a gate for
  convenience, the distinction from `manage-photo` quietly disappears. M5's tests pin the
  refusals, not just the grants.
- **`addImageRecord` swallows its error** (`media-albums.ts` — logs and returns `null`), and
  `uploadImagesWithSignedUrls` treats the `cat_images` write as non-fatal by design. That is
  why the current denial is **silent**: the photo reaches Storage and the post saves while the
  record never lands. Left as-is (pre-existing, deliberate), but it means **M3 cannot be
  verified by clicking** — a missing record looks identical to a successful upload. Test it at
  the rules layer.
