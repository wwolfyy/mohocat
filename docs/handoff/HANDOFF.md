# 산냥이집냥이 — Engineering Hand-off (living / continuously updated)

**Last updated:** 2026-08-05 · **Branch:** `dev` — local `dev` = **`6618c8b`**, **97** ahead
of `origin/main`; ⚠️ **the last SIX commits are NOT pushed** (`61b1904` was held deliberately;
the five colour-workstream commits landed on top of it)
· **`main`:** promoted through PR #8 (2026-07-23 — the multi-mountain M1–M5 bundle; supersedes
PR #7)

> ### 🔜 Starting a fresh session? Read this box first.
>
> **2026-08-05 — three small owner-asked fixes, a rename that was a cascade, and then a
> colour workstream that removed a feature instead of adding one.** Nothing here needed a
> rules or permission deploy; it is all app code, one new script, and config.
>
> 🎨 **The colour half, in one paragraph** (five commits, `165df61` … `6618c8b`; detail in
> **§10u** and the [plan](../planning/pending/color-token-centralization-plan-20260805.md)).
> Asked to control colour "in one central place by a config file", the answer was that the
> repo **already designates one** — `design.md:9` names `tailwind.config.js` and `:292`
> explicitly forbids a `tokens.json` — so **nothing was created**; the existing file was
> adopted. 🔑 **The decision that shaped everything: a mountain may not differ in colour**
> (owner), which **withdraws M8** rather than extending it. Also closed BACKLOG **B3**
> (`/api/revalidate` omitted `/pages/cats`). ⚠️ **Only one user-visible change**: 급식현황's
> freshness scale is now blue→red.
>
> ✅ **급식현황 publishing is gated on a confirmation that names the 급식소 it will stamp**
> (`c515058`). 🔑 **Why a gate and not a notice:** publishing writes `last_attended` /
> `last_attended_by` onto shared `feeding_spots` docs, and a spot keeps only its **latest**
> visit. There is no correction path — `deletePost` never touches `feeding_spots`, so even
> §10q's author-delete does not put the previous stamp back, and the edit form hides the
> 급식소 section for exactly this reason. With nothing ticked the dialog says so instead of
> warning about a write that is not about to happen. 📌 **The spot list was unit-tested and not
> e2e-tested** — `seed-emulators.mjs` seeded no `feeding_spots`, so the harness only ever
> reached the empty branch. 🔄 **Fixed later the same day** (colour plan Phase 3): four spots
> are seeded and `tests/e2e/member/feeding-spots-list.spec.ts` covers the rendered table. The
> **composer's** picker is still unit-only.
>
> 🐈 **Renaming a cat is a cascade, and there is now a script for it**
> (`scripts/migration/rename-cat.js`, `350a995` + `70e2c60`). A cat's **identity is its
> document id**, so `?cat=<id>` links survive a rename untouched — but **four** things store
> the **name string** and none follows: media `tags` (the 사진첩/영상첩 go **empty**),
> `[catmodal:이름]` tokens (the link still renders and does nothing), other cats' prose, and
> `cats.parents` / `cats.offspring` (the 엄마/애 rows). ⚠️ **All four fail silently.**
>
> 🔑 **The lesson that generalises: fixtures only model the fields you already know matter.**
> `parents`/`offspring` were missing from the first cut and **no test could have caught it** —
> I wrote the fixtures. What found it was the **owner dry-running the script against
> production** and querying a line that looked wrong (`cats/엄마조로`, which was correct — its
> description links to the renamed cat — but checking it exposed `offspring: "아들조로"` one
> field away). **Dry-run destructive tooling on real data before trusting its coverage.**
>
> ⚠️⚠️ **One part of that cascade does not stick: YouTube owns video tags.**
> `/api/refresh-video-metadata` overwrites `cat_videos.tags` from `snippet.tags` on every
> 📺 YouTube와 동기화 (`// YOUTUBE-SOURCED: tags (ALWAYS OVERWRITE)`), so the Firestore re-tag
> is **reverted** by the next sync — silently, and the album empties again. The script prints
> the affected YouTube ids and the CMS step that writes through.
>
> 🧪 **A third emulator-backed test category exists now** (`de4efe2`): `tests/scripts/**` via
> `npm run test:scripts`, with its own CI job, mirroring `tests/rules/**`. 🔑 **The plumbing
> was mechanical; the real change was the script's credential path.** It could only start from
> a real service-account key, and CI is deliberately hermetic — so `rename-cat.js` now takes a
> credential-less path when `FIRESTORE_EMULATOR_HOST` is set and **refuses to run unless the
> project is `demo-*`**, and prints `TARGET: PRODUCTION …` / `TARGET: … EMULATOR …` first on
> every run. ⚠️ **That CI job has never actually run on a runner** — it is a near-copy of the
> `rules` job, but the first PR is its proof.
>
> ✅ **A video's YouTube 설명 is taken verbatim on every composer, empty included**
> (`551049f`). 공지사항/입양홍보 used `item.description || message || '공지사항 동영상'`, so a
> blank 설명 silently published the **post body**. 🔑 **This REVERSES an explicit earlier
> decision** the code argued for in a comment; the comment now records the reversal so the old
> behaviour cannot be restored from it. **Title inheritance is kept** (owner). ⚠️ The
> `descriptionHelp` override that promised the old behaviour is **deleted**, not reworded —
> both forms now show `MediaItemList`'s own string, and the prop is gone for want of callers.
>
> 🔑 **The lesson that generalises (again, from the other direction): a behaviour report is
> about the deployed artifact, not the branch.** The report named **집사톡**, and it was
> accurate — about **production**, which runs `main`, where the old shared hook still
> substitutes the post body. `dev` has taken the 설명 verbatim since the per-file refactor, so
> 집사톡 never appeared in the diff. 📌 Same lesson as §10n, inverted: there the repo looked
> behind and production was ahead; here the repo is ahead and production is behind.
>
> ### 🐈 The 아들조로 → 조로 rename is APPLIED to production
>
> Run by the owner 2026-08-05. Verified after the fact: `cats/아들조로.name = "조로"`,
> `cats/엄마조로.offspring = "조로"`, `cats/깡패.adoption_info = "[catmodal:조로]와 …"`.
>
> ⚠️ **One step is outstanding and it is time-sensitive:** two videos still carry `아들조로`
> in their **YouTube** tags, and the next 동기화 will overwrite Firestore back and empty
> 조로's 영상첩. Re-tag in /admin → 동영상 태깅 → 일괄 태그 저장:
> `HG-SA4gyVAE` (급식소 챙기고 갑니다 (2026.07.27)) · `XnIEN2chwww` (깡패 궁둥이 검사중인 조로…).
>
> 📌 **`cats/아들조로` now holds a cat named 조로, and that is fine.** Every one of the 32
> legacy cat docs is keyed by its name, but `createCat` uses `addDoc`, so **every cat added
> through the CMS already has a random id** — id ≠ name is the normal state going forward.
> **Do not "fix" it**: Firestore ids are immutable, so changing one means create-copy-delete,
> which breaks every `?cat=` link already pasted into KakaoTalk — silently (the page renders
> with no modal open). Nothing else in the database references a cat id; verified across 8
> collections.
>
> ### 📮 In flight with the owner (not blocking, no code pending)
>
> - **The outgoing SMTP address is changing.** A new Gmail account exists; the owner is
>   creating the App Password. Then: set `SMTP_USER` + `SMTP_PASSWORD` + `SMTP_FROM` in Vercel
>   **Production and Preview**, redeploy (env changes do not reach a running deployment), and
>   verify the **From header** on a real 동참 submission. ⚠️ **Set `SMTP_FROM` equal to
>   `SMTP_USER`** — Gmail silently **rewrites** a From it does not own, so an unverified alias
>   is a no-op that still reports success. 📌 `/api/contact` is the only thing that sends mail
>   and reads it all from env, so **no code change**. 📌 Not to be confused with `adminEmail`
>   in `mountains.json` — that is the **recipient**.
> - **Two doc fixes offered and not done:** `.env.example` still hardcodes
>   `mohocats.org@gmail.com` (should become a placeholder, not the new address); and the Gmail
>   App Password steps live in `vercel-terraform-walkthrough.md` §8 — inside the **parked**
>   Terraform workstream, referencing the pre-rename `infra/terraform` path — rather than
>   beside the SMTP block in `docs/manuals/deployment/README.md`.
>
> ⏸️ **Renaming the Firestore database was investigated and dropped (owner, 2026-08-05).**
> `(default)` **cannot be renamed** — ids are immutable — so it would mean create-new,
> copy every collection, repoint everything, delete the old. App-side cost is trivial (two
> handles: `src/services/firebase.ts`, `src/lib/firebase-admin.ts:52`), but **22 scripts build
> their own handle** and any left pointing at `(default)` keep working **silently against the
> stale database**; `firebase.json`'s `firestore` block must become an array or rules keep
> deploying to the old db; and the copy needs a write freeze. 🔑 **If the goal ever returns,
> the useful version is _adding_ a database** (Preview currently runs `dev` against the
> **production** database), which is additive, reversible, and needs no freeze.
>
> **Do these next, in this order:**
>
> 1. **Push the six held commits** (`61b1904` … `6618c8b`). `61b1904` was held deliberately;
>    the five colour commits sit on top of it, so pushing releases all six together.
> 2. **Re-tag those two YouTube videos** (above). Time-sensitive: any 동기화 undoes the rename
>    for 조로's 영상첩.
> 3. **Glance at the admin screens while logged in** — 게시물 / 집사들 / 앱 관리 (active-tab
>    colour, 작성 CTAs) and 냥이들' grid header. 🔑 **The only unverified part of the colour
>    work**: `/admin/*` is behind `AdminAuth` and the session that did it had no credentials, so
>    those screens are proven by compiled-CSS equality, not by looking. Everything is
>    pixel-identical by construction, so this is a confirmation, not a hunt.
> 4. **Finish the SMTP change** and verify the From header.
> 5. **Re-run the P5.4 manual YouTube pass** — still the only gate on the `dev → main`
>    promotion. 🆕 Fold in the one thing the harness cannot test: **upload a video to a
>    공지사항 with 설명 left blank** and confirm YouTube shows no description. The upload leg
>    has **no** automated cover (`generate-signed-url` needs a service-account key the harness
>    lacks; YouTube upload is manual-parity).
> 6. **The Preview verifications that piled up** — see the earlier session boxes below.
> 7. **Then the promotion.** `dev` leads `origin/main` by **97**. ⚠️ Measure against
>    `origin/main`, not the local `main` ref (stranded at `26b1879`).
>    🆕 **Add to the "changes behaviour on deploy" list:** 급식현황 now asks for confirmation
>    before publishing; 공지사항/입양홍보 videos stop inheriting the post body as their YouTube
>    description (and the help text under the field changes to match); **집사톡's
>    already-fixed verbatim 설명 finally reaches production** — that one is a fix users have
>    been waiting on without knowing it; and **급식현황's freshness scale changes colour**
>    (green→red ⇒ blue→red, deeper endpoints) — the one visible change in the colour work, and
>    the one an operator will notice.
>
> 🎨 **Picked up next session — colour plan Phases 4 and 5** (§6 of
> [the plan](../planning/pending/color-token-centralization-plan-20260805.md); **not** its §4/§5,
> which are analysis and are done). Phase 4 is three small hygiene edits —
> `YouTubeAuthPanelNew:114-127`'s raw status hexes, `LeafletMountainMap:302` + `Compass:33,35`,
> and recording in `design.md` §Colors that the palette is global. ⚠️ **4.3 is the one that
> matters:** the "no per-tenant colour" decision currently lives in `AGENTS.md`, PROJECT_PLAN
> and the plan — **but not in the design reference**, which is where a designer would look
> before proposing per-tenant theming again. Phase 5 is the audit **D5** opened and is
> deliberately **unsized**.
>
> 📌 **The tree is clean** apart from two untracked code-graph files — **different workstream,
> do not commit them.** _(The owner's `theme.secondaryColor`/`accentColor` edits noted here
> earlier were superseded: **D2 deleted those fields**, so that edit is gone rather than
> committed.)_
>
> ---
>
> ### Earlier (2026-08-03/04) — members can post, and a class of document turned out to be undeletable.
>
> Two pieces of work, both owner-asked. First: _"allow the author of 집사톡 and 급식현황 posts
> to edit the post."_ 🔑 **The premise was false** — members could not **see or create** on
> either board (the pages gated on `isAdmin()`, and the client write needs `manage-posts`,
> which only `admin` holds), so "the author" was always an admin, who could already edit
> everything. The missing piece was never editing. Second: _"deleted posts are still in the
> collection."_ That one had a single cause with a general lesson, below.
>
> 🔑 **The lesson that generalises: a correlation across the survivors is a lead; the one
> exception is the evidence.** The owner's first read was that **flat-structured** documents
> survived deletion (no `imageUrls`/`videoUrls`/`tags`) — a real pattern, since those are the
> **replies**, all written in 2025 before multi-tenancy. Then they produced a _nested_ post
> that had also survived, which broke the pattern and pointed at the actual cause. **Chase the
> counter-example, not the correlation.**
>
> 🐛 **A document with no `mountainId` can never be deleted — by anyone.** `canWrite()` reads
> the mountain off the **stored** doc on a delete (`request.resource` is null then), and
> `hasPermissionFor()` requires it to be non-null. ⚠️ **No permission grants past this**, which
> is why it never looked like a permission problem. 📌 The offender was created **one day after
> the M4 backfill ran** — a one-shot backfill cannot catch what is written later, and an
> unstamped doc behaves normally until someone tries to write it, so the gap is **silent by
> construction**. Fixed in prod (1 doc of 98); `scripts/migration/stamp-missing-mountain-id.js`
> is now the standing audit — **re-run it after any migration or bulk import**.
>
> ✅ **Rules were tested, not read.** `@firebase/rules-unit-testing` against the real
> `firestore.rules`: same admin, same document, deleted twice — **with `mountainId` ALLOWED,
> without DENIED.** 📌 **Correction to an earlier draft of this box:** the repo _does_ have a
> rules suite — `tests/rules/users.rules.test.ts` (11 tests, `npm run test:rules`, CI-gated
> since M5.2b). It did not cover the post rules; `posts.rules.test.ts` now does (see below).
>
> 🔴 **CORRECTION (2026-08-03, later): member authoring is LIVE in production. The
> "built but not live" claim below was wrong, and it was wrong in this box, in
> PROJECT_PLAN §10n and in the plan doc.** Verified three ways while dry-running the
> migration: the deployed ruleset (release **2026-08-02T16:00:12Z**) is identical to the
> repo's rules file ignoring comments; `role_permissions/role-config` **already grants**
> `write-own-post-*` to both butler roles (the dry run skipped them as "already held");
> and **one active `butler-ground` member has already authored two 급식현황 posts**
> (2026-08-03, both carrying `authorUid`). 🔑 **"The code isn't on `main`" ≠ "the change
> isn't in production."** Preview runs `dev` against the **production** database, and
> rules + the permission matrix deploy out-of-band by hand — so a feature can be fully
> live while its branch is 80 commits behind. **Check the deployed artifact, not the
> branch.** (How the grants landed is not established; the auto-seed path is ruled out —
> it only fires when the doc is absent — leaving an admin-UI save on Preview or an
> unrecorded `APPLY=true` run.)
>
> ~~🔒 **Member authoring is BUILT BUT NOT LIVE, and the order matters.** Rules are not
> deployed and `add-member-post-permissions.js` is dry-run only.~~ The remaining deploy
> steps now belong to **§10p** (media upload) — see below.
>
> 🔬 **Three defects the e2e suite caught in the member work, all worth recognising again.**
> (1) **The new gates locked admins out** — `manage-posts` and `write-own-*` are different
> permissions and an admin holds only the former, so a single-permission gate denied the people
> who could already post. (2) **A new spec renamed a fixture another spec reads by title** —
> the same `admin/cats.spec` shape as 2026-08-02, one week later. Mutating tests must own their
> fixture. (3) Next refuses **two slug names at one path position** (`[id]` vs `[postId]`) — a
> build error, not a runtime one.
>
> ✅ **The post rules are now tested directly — to-do #1 is DONE (2026-08-03).**
> `tests/rules/posts.rules.test.ts`, **43 tests**; `npm run test:rules` = **54 passed** with
> `users.rules.test.ts`, and CI's emulator-backed `rules` job picks it up with no wiring. It
> covers every refusal the UI cannot exercise: a post attributed to **someone else's**
> `authorUid`, an edit **rewriting** provenance, a `replyCount` moving by anything but **+1**
> or carrying a second field, a `feeding_spots` write outside the two allowed keys, a
> **delete** on `write-own-*`, and **butler-internet** reaching 급식현황.
>
> 🔑 **The lesson that generalises: a rules suite that passes on its first run has proved
> nothing yet.** `assertFails` passes for _any_ denial, including a typo'd collection name, so
> a green negative test and no test are indistinguishable until you make the rule wrong. Four
> holes were punched in `firestore.rules` on purpose — drop `authoringAsSelf`, drop
> `provenanceUnchanged`, `hasOnly`→`hasAny`, grant members `delete` — and **one of the four
> escaped**: the two boards carry **separate, near-identical rule blocks**, and the provenance
> cases only ran against `posts_butler`, so gutting `posts_feeding` alone was invisible. Every
> ownership case now runs against **both** collections via `describe.each`. ⚠️ **Adding a case
> for one board and not the other re-opens exactly that gap.**
>
> ✅ **§10p — DEPLOYED 2026-08-03, verified live.** Members can attach photos and videos to
> 집사톡 posts. What it fixed:
> 🔴 **members could post but not attach a photo, and it cost them the whole post.** §10n granted the two **post** permissions and stopped; 집사톡 is the one
> board that **uploads**, and every upload surface gates on `manage-photo`/`manage-video`,
> which **only `admin` holds**. `useRichContentForm` alerts and **`return`s** on an upload
> failure, so the save never runs — a member loses everything they typed, behind an
> English `Failed to get signed URL: Forbidden`. ⚠️ **Live, per the correction above** —
> `posts_butler` is empty today, which is the only reason nobody has hit it (급식현황
> uploads nothing, so that member's two posts were safe). **Fixed in the working tree**
> with narrow `upload-own-photo` / `upload-own-video` (owner's call over widening
> `manage-*`, which would also authorize retagging and deleting anyone's album).
> 📌 **Both nets missed it for mirror-image reasons:** the member e2e specs are text-only
> by an exclusion **inherited from the admin specs, where it was harmless because an admin
> holds every permission**; and my rules suite tested the permissions the feature _added_,
> not the ones its user journey _depends on_.
>
> 🖥️ **…and the admin UI could not manage any of it** (owner: _"we need to update the 권한
> tab"_). Both matrices on `/admin/members` **hardcoded their own copy** of the permission
> list — so the new grants were live in config and rules and **invisible on the screen that
> administers them**. Fixed at the root: **one exported `ALL_PERMISSIONS`**, everything else
> derived, including a **fifth** copy in `src/config/permission-config.ts` that nothing
> imported and had already drifted. The 권한 matrix also gained the missing **`cats`** row
> (냥이들 is nav-gated and had no row, so it was unconfigurable) and lost `write-own-post-*`
> — _write_ grants offered as _visibility_ gates.
>
> 🔴 **The new smoke guard found a second live gap on its first run:** `view-analytics` is
> enforced on `permission_logs` reads and held by **no role**, so the audit trail is
> readable by nobody. 🔑 **A rule requiring an undefined permission fails closed and
> silently** — no error, no log, just an empty page indistinguishable from "nothing to
> show". Catalogued so it _can_ be granted; granting it is an owner call (BACKLOG **B2**).
>
> 🗑️ **§10q — authors may now delete their own posts, and a _reply's_ author may edit and
> delete that reply (owner, 2026-08-04).** This reverses §10n's withholding of delete; the
> reason it was withheld — a post carries other people's replies — is unchanged, and the
> owner weighed it. 🔑 **A reply is a document in the same collection as the post**, so one
> rule governs both and "the author of the reply, not of the post" needed **no new permission
> and no new rule** — the existing author test already resolves to the replier, and
> `ReplyForm` has stamped `authorUid` since §10n. The ask was almost entirely a **UI** gap.
> ⚠️ **Two things did need rule changes, both non-obvious:** (1) `deletePost` **cascades** —
> it removes every reply first, so without an `isParentAuthor()` clause **an author cannot
> delete their own post the moment anyone replies**; (2) `replyCount` may now move **±1**,
> because the services _recount_ rather than increment, so a delete lands on `old − 1`.
> ✅ **"Media survives" needed no code** — verified in both services: the delete path never
> touches `cat_images` / `cat_videos` / Storage.
> ✅ **DEPLOYED 2026-08-04 and verified live.** ⚠️ It spent a few hours in the half-state the
> deploy order exists to prevent — code pushed, rules not — during which the 삭제 button
> rendered and the database refused it. Recorded because the shape recurs, not because
> anything was done wrong: the rules deploy simply predated the work.
>
> ## ✅ Everything in this bundle is now LIVE in production
>
> **Verified against production 2026-08-04, not taken on trust** — the same check that caught
> the §10n mistake, and it earned its keep twice more this session. The deployed ruleset
> (release **2026-08-03T15:55:38Z**) is now **identical to `config/firebase/firestore.rules`**
> ignoring comments, and the live matrix carries every grant:
>
> |                           | Rules                                                 | Permissions                                        | State    |
> | ------------------------- | ----------------------------------------------------- | -------------------------------------------------- | -------- |
> | **§10n** member authoring | ✅ deployed                                           | ✅ `write-own-post-*` on both butler roles         | **LIVE** |
> | **§10p** media upload     | ✅ `uploadingAsSelf` + the `cat_images` create clause | ✅ `upload-own-photo` + `upload-own-video` on both | **LIVE** |
> | **§10q** author delete    | ✅ `isParentAuthor` + `isReplyCountAdjustment`        | n/a — rides on the existing grants                 | **LIVE** |
>
> 🔑 **The habit worth keeping: read the deployed artifact, not the branch.** It caught §10n
> being live while three documents said it wasn't (2026-08-03), and then caught §10q's rules
> _not_ being live while its code was already pushed — a state in which members saw a 삭제
> button the database refused. Both were invisible from the repo. A `git log` cannot tell you
> what Firestore is enforcing; rules and the permission matrix ship through their own
> channels, and Preview runs `dev` against the **production** database.
>
> ⚠️ **So the deploy order is a live hazard, not a formality.** Code reaches production on
> `git push`; rules and permissions do not. Ship rules first, then the migration, then the
> code — and when code lands first, the gap is user-visible immediately.
>
> **Outstanding from this bundle** _(folded into the current list at the top — kept here for
> the reasoning behind each):_
>
> - **Preview verifications**, both live and neither covered by the emulator: a member
>   **attaching a photo to a 집사톡 post** (§10p — the e2e image leg is stubbed), and a member
>   **deleting a post that has someone else's 댓글 on it** (§10q — the cascade, the one path
>   that needs `isParentAuthor` and a real second account).
> - **On promoting**, this bundle changes behaviour: 집사톡 members can attach one photo + one
>   video; authors can **delete** their own posts, which **cascades to other people's 댓글**;
>   and reply authors can edit/delete their own 댓글.
>
> ---
>
> ### Earlier (2026-08-02, fourth session) — the about page got one source of truth
>
> It began as _"the `about` object in `mountains.json` looks stale now that the about content
> lives in Firestore — confirm."_ It was stale in the half you could see and **load-bearing in
> the half you could not**, which is the whole story: Firestore won for the text, but the
> **photo** came from a `localPath` baked into that config, and `useAboutPhoto` **ignored the
> filename Firestore handed it**. 🔑 **Editing the 대표 사진 in the CMS did nothing** — a live
> bug nobody had hit because both sources happened to name the same file. Removing the
> short-circuit fixed it and unblocked the deletion in one move. `about` is now gone from
> config; `about_content/{mountainId}` is the only copy.
>
> 🔑 **The lesson that generalises: "stale" is a claim about _every_ reader, and the readers
> disagreed.** Four fields were dead weight and one was authoritative, in the same object. What
> settled it was tracing each field to its consumer — `sections` was the tell (config declared
> two, Firestore held zero, the page showed none), and the same tracing found the photo going
> the other way. **Ask which reader wins, field by field, before calling a config block dead.**
>
> ⚠️ **No Firebase media is baked into the build any more.** About photos were the last;
> `fetch-static-assets.js` also loses its only reason to **write to `mountains.json`**.
> **Accepted cost:** a missing about photo used to _fail the build_ and is now a broken image on
> a live page — the guard only worked while the filename sat in config the build could read.
>
> 🔬 **The e2e suite earned its keep again, and found a harness gap.** `nav.spec` went red on a
> `next/image` **400**: `remotePatterns` allowed only `firebasestorage.googleapis.com` while the
> emulator serves from `127.0.0.1:9199`. 🔑 **The harness had no remote-image coverage at all** —
> every thumbnail/album fixture uses a local `public/` path, so the about photo was the **first**
> e2e image to go through Storage. Fixed behind the emulator flag; production still allows
> exactly one remote host.
>
> ✅ **The Firestore migration is APPLIED to prod** (snapshot
> `backups/firestore/2026-08-02T13-15-25-299Z` taken first, 118 docs / 16 collections).
> `about_content` now holds exactly **two** docs — `geyang` and a newly seeded `manisan` — both
> with `mainPhoto.localPath` stripped, and the legacy `about_content/about` is gone. A re-run is
> a clean no-op on all three phases. 📌 **manisan's seed carries an empty `mainPhoto`** — it
> never declared one, and an invented filename would render as a broken image; an operator adds
> it in the CMS.
>
> 🆕 **Both loose ends are now written down** in the new
> [`docs/planning/BACKLOG.md`](../planning/BACKLOG.md) — a standing register for known gaps
> that are real but not urgent, created because a finding recorded only in the prose of a
> hand-off reads as commentary rather than as work. **B1** = the 대표 사진 has no upload
> control (파일 이름 is free text matched against Storage; the manual's two-step routine is the
> workaround, and the entry records why reusing `generate-signed-url` is not a drop-in).
> **Q1** = the CMS's 섹션 field is stored, editable and **never rendered** — render it or drop
> it, owner's call.
>
> ---
>
> ### Earlier the same day (2026-08-02, third session) — one owner-reported bug, and everything it was hiding
>
> It began as "집사톡 posts show _Post not found._" That was a **routing** defect: a post is
> addressed by **`(type, id)`**, not `id`, and the shared detail route hard-coded one of the
> four collections. Fixing it made those posts **reachable for the first time**, which exposed
> that the page had **never had a real layout**; and the owner, now able to use the CMS on
> them, found the **edit form still took media as a pasted URL**. Six commits, all pushed;
> `origin/dev` = **`a2d21f2`**, now **71** ahead of `origin/main`. Tree clean apart from the
> `.gitignore` hunk, three untracked code-graph files (**different workstream — do not commit
> them**), and a 2-line `config/mountains/mountains.json` edit that is **not mine**.
>
> 🔑 **The lesson that generalises: a bug report names the symptom the owner could see, not
> the extent of the defect.** 집사톡 was reported; **공지사항 and 입양홍보 were broken
> identically** in the admin CMS, which links to the same route — found by tracing the code,
> not by re-reading the report. Then the same shape again: the edit-form ask named
> 공지사항/입양홍보, and 집사톡 needed the same fix but runs on a **different hook**, so the
> first pass did not reach it. **Ask what else shares the broken thing.**
>
> 🐛 **The routing bug, because the shape recurs.** Four post types, four Firestore
> collections; `/pages/posts/[id]` hard-coded `getPostService` (`posts_feeding`) while both
> list components linked **every** type there. 🔑 **A Firestore id is unique only within its
> collection**, so a route taking an id alone cannot resolve a post. 📌 It was never a
> regression — `posts_butler` arrived with the 집사톡 list months ago and this page was never
> told. It survived because **the route had no e2e coverage at all**, the one place a wrong
> collection is indistinguishable from a deleted post.
>
> ⚠️ **A fallback was written, and rejected on review — read this before adding one.** The
> first cut put the type in `?type=` with a `butler_stream` default "so old links still work."
> The owner pushed back. It protected nothing (the only type that route ever resolved is
> admin-gated) and it **recreated the bug silently**: a param can go missing while the route
> still matches, so the page must guess a collection. It is now a **path segment**
> (`/pages/posts/{postType}/{id}`) with **no default** — an incomplete link resolves nothing.
>
> 🔬 **Three test-harness findings, all from refusing to re-run until green.**
> (1) Two of my new specs edited the **same fixture**; `playwright.config` sets
> `fullyParallel`, so the later save reverted the earlier one. Each test owns its fixture now.
> (2) Adding two specs turned `auth/login-logout` red — bisected (HEAD green · HEAD+change+2
> specs red · HEAD+change with those 2 skipped **green**), so the app change was innocent and
> two more specs simply push the shared emulator past a load threshold.
> (3) 🔑 **The one worth remembering: when an `<img>` src is set by client JS, Chrome reports
> the failed-resource console message's `location.url` as the _initiating chunk_, not the
> failing URL.** So an allow-list keyed on the host silently misses exactly the cases that need
> it, and the failure reads as a bogus 404 on a `_next/static` chunk that in fact serves 200
> (verified with `curl`, which is what settled it). Replaced by a **global auto fixture** that
> routes `img.youtube.com` for every spec — the suite no longer touches the public internet.
>
> ---
>
> ### Earlier the same day (2026-08-02, second session) — one small feature, two real bugs
>
> **It began as "close §10d D2, the CMS upload toggle."** Siting the toggle meant looking at 앱 관리, which
> turned out to hold **a settings screen that had never configured anything**; and shipping the
> toggle broke an e2e spec, which meant running the full suite, which turned the long-standing
> **"flake set" into three findable bugs — one of them in app code**. Chasing the last of those
> found a **product** bug: a hydration mismatch that **erased text a visitor had already
> typed**. Four commits, all pushed; `origin/dev` = **`fa2f87b`**, now **64** ahead of
> `origin/main`. The tree is clean apart from a `.gitignore` hunk and three untracked
> code-graph files, which belong to a **different** workstream — do not sweep them into a
> commit.
>
> 🔑 **The lesson that generalises: "passes in isolation" means _interference_, not slowness.**
> The e2e failures had been filed for weeks as "timing-sensitive," with standing advice not to
> read a red run as a regression. That reading is what kept them open — **no timeout could
> have fixed any of the three**. The suite is now **green (3× consecutive 199/13/0)**, so that
> advice is retired: ⚠️ **a red run now means something.**
>
> ⚠️ **The e2e suite is a gate that this session twice proved is not optional.** Shipping the
> 집사톡 cap broke `butler-create.spec` and I did not notice, because tsc + smoke + unit were
> green and I reported them as "the gates." They are not the gates. Run `npm run test:e2e`
> before claiming a UI change is done — `export PATH=/usr/local/opt/openjdk/bin:$PATH` first.
>
> 🔬 **The three e2e bugs, because the shapes recur.** (1) `services/firebase.ts` guarded a
> **per-instance** emulator connection with a **process-global** flag, so a second
> `firebase/app` module registry produced a `db` pointed at the real backend — and an
> **offline `getDocs` resolves from the empty cache instead of throwing**, returning `200 []`.
> 📌 The tell was **two different collections reading empty at the same moment**: one
> unconnected `db`, not two missing fixtures. (2) `admin/cats.spec` renamed a fixture cat
> **six other specs read**, surviving as long as it did only because `getByRole({name})`
> matches **substrings**. (3) Three specs acted before async state resolved — which is what
> led to the hydration bug below.
>
> 🔴 **The product bug, and the rule it leaves behind.** `AuthProvider` seeded `useState` from
> `auth.currentUser` — a **browser-only** value read **during render**. The server always has
> `null`, so the header disagreed, and React's recovery is to **discard the server DOM and
> rebuild the whole root**, remounting every component and **erasing input already typed**.
> 🔑 **Nothing the server could not have known may affect the _first_ client render** —
> `localStorage`, `window.*`, `Date.now()`, a restored session. Read it in `useEffect`.
> ⚠️ It was intermittent because the restore is **async**: it only bites when the restore beats
> hydration, on a full page load, for a signed-in visitor — which is why all **12** anonymous
> `public/` specs were never affected.
>
> ---
>
> ### Earlier the same day (2026-08-02, first session) — the plan audit
>
> **It began as "what's left per the project plan?"**, and answering that honestly meant
> checking the plan against the code — which found **seven items already done but never
> ticked**, and **one whose stated premise was wrong**. That session ended at `82d0f07`.
>
> 🔑 **The lesson that generalises: a plan entry is a claim about the code, and claims rot.**
> Six unticked boxes described work finished weeks earlier (API-route auth, RBAC drift, the
> static-data seam, both config-consistency items, theme wiring), and `docs/codebase/` still
> described a **`mountain-cats-users` "central user service" project** that M2 deleted. None of
> it was load-bearing until someone acted on it. **Verify before scheduling, and tick the box in
> the same change that does the work.**
>
> 🔴 **The premise that was wrong, because the same mistake is easy to repeat.** §8 said phone and
> Kakao users could become members without consenting. They cannot: `LoginForm.handleCheckUser`
> already refuses implicit signup and bounces them to 집사등록, which gates consent. The earlier
> pass had checked that `PhoneLoginForm`/`SocialLoginButton` contain no consent code — true — and
> **stopped before tracing their host**. A post-auth consent modal was designed on that false
> premise and discarded. ⚠️ **The real gap it exposed was different and smaller:** phone/Kakao
> sign-in _mints an Auth account_ before the app decides whether to admit the person, so refusing
> them stranded an Auth record holding PII with no consent and nothing to ever remove it. That is
> now deleted on the bounce path.
>
> 🔑 **Signup is phone-first — reason about every "who has an account" question from there.**
> 집사등록 verifies the phone **first** (that call creates the Auth user) and links email/password
> onto it afterwards; there is **no email-only registration**. This is why excluding email from
> that deletion cannot rest on "the account predates the sign-in": a missing profile doc is
> usually an _interrupted signup_. The correct test is a **password credential**
> (`providerData` containing `'password'`), which proves the user reached the linking step and
> therefore consented. Gating on the login _method_ — the first cut — would have deleted exactly
> those people whenever they happened to sign in by phone. **The owner caught this.**
>
> 🐛 **Two owner-reported bugs, and both had a second instance the report did not mention.**
> (1) Uploaded media was recorded as _filmed_ on the day it was _uploaded_ — a `new Date()`
> fallback for 촬영일. The owner's observation that **집사톡 was unaffected** was the whole
> explanation: it has a 촬영 날짜 field and the other two composers had none, so nothing was ever
> sent. Following that asymmetry found **the same fabrication in the image path**, which is worse
> because `cat_images` has no upstream to correct it. (2) Video tiles carried no text label; the
> mislabelled `|| '제목 없음'` filler behind it existed in **two** places, the second under a
> player already showing the real title.
>
> 🔑 **Both of those trace to one root cause, now closed: two implementations of the same tile.**
> The album _pages_ use the shared `album/MediaTile`; the _modal_ albums hand-rolled their own and
> drifted. The modals are now converged onto `MediaTile`, so the next divergence cannot happen
> the same way.
>
> 📌 **Firestore hangs; it does not throw.** The SDK retries network failures internally, so a
> broken connection produces a _stall_, never a console error. That is why the owner's console
> showed a clean run returning 4 documents while the page said there were none — and why an
> error state is a safety net (permission-denied, missing-index) rather than the main fix.
>
> ⚠️ **Auto-detect long polling was already on** (the SDK defaults it to `true`), so the standard
> advice for the 30 s Safari stall is a **no-op here** — it was proposed and discarded before
> shipping. The browser is now forced onto long polling. **No capability was lost:** transport,
> not feature; the app has **zero** `onSnapshot` listeners. Revisit if listeners are ever added
> (PROJECT_PLAN §12).
>
> 📌 **`PostMedia`'s default layout has now caused three defects.** `compact` is the _dialog_
> treatment; any surface taking the default inherits dialog sizing. **Pick the layout explicitly
> at every call site.**
>
> ✅ **e2e runs locally — the earlier "no JDK on this machine" claim was WRONG.** OpenJDK 26 is
> at **`/usr/local/opt/openjdk/bin`** (Intel-prefix Homebrew). Bare `java` resolves to
> `/usr/bin/java`, a macOS shim with no runtime, so `java -version` and `java_home -V` both
> report nothing installed — do not conclude "no JDK" from those. Run with
> `export PATH=/usr/local/opt/openjdk/bin:$PATH` before `npm run test:e2e`.
>
> ✅ **The suite is GREEN and the "flake set" is gone — it was three real bugs (2026-08-02).**
> Full e2e is now **3× consecutive 199 passed / 13 skipped / 0 failed**, up from 196/3.
> ⚠️ **The old advice in this box — "don't read a red run as a regression, re-run the failures
> alone" — is retired. A red run now means something.**
> 🔑 **"Passes in isolation" meant _interference_, not slowness**, and reading it as slowness
> is what kept this open for weeks: (1) `services/firebase.ts` guarded a **per-instance**
> emulator connection with a **process-global** flag, so a second `firebase/app` module
> registry got a `db` pointed at the real backend — and an offline `getDocs` **resolves from
> the empty cache instead of throwing**, returning `200 []` (this is the app-code one, and the
> tell was two different collections reading empty at the same moment); (2) `admin/cats.spec`
> renamed a fixture cat **six other specs read**, surviving only because
> `getByRole({name})` matches substrings; (3) three specs acted before async state resolved.
> ✅ **And the product bug behind (3) is now fixed too.** `AuthProvider` seeded `useState`
> from `auth.currentUser` — a **browser-only** value read **during render** — so the header
> disagreed with the server, React rebuilt the entire root, and **text a visitor had already
> typed was erased**. Seeded from `null` now, with `onAuthStateChanged` updating after
> hydration. 🔑 **The rule worth keeping: nothing the server could not have known may affect
> the _first_ client render** — `localStorage`, `window.*`, `Date.now()`, a restored session.
> Read it in `useEffect`. 💡 Cost: one tick of logged-out header per full page load, which
> `NavItem` and the contact form already tolerate.
>
> **Do these next, in this order:**
>
> 1. **Re-run the P5.4 manual YouTube pass from the top.** Still the only gate on the
>    `dev → main` promotion. 📌 Running **📺 YouTube와 동기화** also exercises the video-
>    availability check, so it doubles as an early signal for that.
> 2. **The Preview verifications that piled up** — none blocking, all unreachable from the
>    emulator: the **이 냥이 링크 chip on a real phone** (its mobile half is still proven only by
>    stubs, which is exactly the weakness that shipped a dead button to desktop); a **Safari pass**
>    confirming the 30 s stall is gone; a **real Kakao sign-in and its linking fallback** (the PII
>    logging fix touched both); and the **orphan-delete path** (needs a genuinely new phone number
>    or Kakao account); plus the 2026-07-31 입양홍보 popup (needs a **fresh session** —
>    `sessionStorage`) and the duplicate-filename **409**.
>    🆕 **Add one from 2026-08-02:** edit a real 공지사항 / 집사톡 and **attach a photo**. The e2e
>    image leg is **stubbed** — `generate-signed-url` signs with a service-account key the
>    credential-less harness does not have, and the Storage emulator cannot sign either — so
>    _uploading a new file during an edit_ is the one path with no automated cover at all.
> 3. **Then the promotion itself.** `dev` now leads `origin/main` by **71** commits.
>    ⚠️ **Measure against `origin/main`, not the local `main` ref** — the local one is stranded at
>    `26b1879` (2026-03-16), four months and one PR-#8 merge behind.
>    🆕 **Things in this bundle that change behaviour on deploy — mention them when promoting:**
>    집사톡 becomes **one video + one photo** per post (the caps ship `false`, before anyone
>    touches a control); a signed-in visitor sees the **logged-out header for one tick** on a
>    full page load (the deliberate cost of the hydration fix); post detail URLs change shape to
>    **`/pages/posts/{postType}/{id}`**, so any bookmarked old link stops resolving (only
>    급식현황 ever worked, and it is admin-gated, so this should reach nobody); and the CMS
>    **edit screens for 공지사항 / 입양홍보 / 집사톡 are now their create composers** — operators
>    will see a different, better form, and 집사톡's cap applies to media already on a post.
>
> 🆕 **Owner decisions waiting, none blocking:** whether 공지사항/입양홍보 should keep the
> **`설명 없음`** filler that converging onto `MediaTile` removed from the photo modal (the shared
> tile drops empty-state fillers by design); whether a video's 제목 should keep appearing **twice**
> (YouTube's player overlay + our caption); whether an 입양홍보 popup may displace a 공지사항 one
> (today the most recently updated wins, one popup per visit); and whether the CMS's
> "YouTube에 없는 영상" panel should show thumbnails rather than titles (**text-only is
> deliberate** — a deleted video's thumbnail _is_ the grey placeholder).
>
> ✅ **§10d D2 is DONE (2026-08-02) — and it shipped as _static config_, not a CMS toggle.**
> 집사톡 now takes **one video + one photo** per post, from `config/media_control.json`
> (video/image flags separate, one setting for all mountains); 공지사항/입양홍보 stay
> unrestricted. 🔑 **The Firestore design was drafted and rejected on a consequence it
> exposed:** the setting is global by decision, so a runtime toggle would let **any one
> mountain's admin silently reconfigure every other mountain's composer**. Static config moves
> that authority to whoever can deploy; the redeploy cost is **accepted, not overlooked**
> (owner). Do not "improve" this back into a runtime setting without re-deciding who may flip
> it. ⚠️ **This changes 집사톡 for members on deploy** — the caps ship `false`, before anyone
> touches a control.
>
> 🗑️ **A settings screen that configured nothing is gone (2026-08-02).** Found while siting D2,
> not reported: 앱 관리's 게시물 컬렉션 설정 saved collection names to **`localStorage`** and the
> dashboard listed them with a hard-coded **`0`** — the headline number was _how many lines you
> typed_. 🔑 **The tell:** the shipped default named **`posts_main`**, which has never existed,
> and omitted two collections that do; it survived ~14 months because a wrong name and a right
> name both render `0`. The tile now counts the four real collections (verified live: **14** =
> 급식현황 6 + 집사톡 2 + 공지사항 4 + 입양홍보 2). 📌 **Two false precedents recorded in
> PROJECT_PLAN §10d/§10j:** `admin_config` is **not** a settings store (no rules entry at all —
> it holds the YouTube OAuth token), and that tab was per-browser, so neither was the model it
> looked like.
>
> ⏸️ **Do NOT start the path-based tenancy migration (T0–T7).** Still gated behind the P5.4 pass
> and the promotion. Decision + plan:
> [`tenancy-path-migration-plan-20260728.md`](../planning/pending/tenancy-path-migration-plan-20260728.md).
>
> **Do NOT** delete `YOUTUBE_REFRESH_TOKEN` from Vercel **Production** until the promotion
> lands — `main` is pre-fix and reads the token from env only.

> **How this doc works.** This is the **single, continuously-updated** current-state
> hand-off — read it first. It is edited **in place** (present tense = how things are
> now), not appended to. It **supersedes the discrete `handoff-NN` series** as the
> entry point; those numbered files (…26, 27, 28) stay as **frozen history** for the
> detail behind a given session. The **testing** workstream keeps its own closed
> narrative under `docs/handoff/testing/`.
>
> When you finish a chunk of work, update the relevant section here in place and add a
> one-line note to the **Changelog** at the bottom.

**Where the deep detail lives:** [`PROJECT_PLAN.md`](../planning/PROJECT_PLAN.md)
(cross-workstream status) · [`log/FEATURE_MOD_LOG.md`](../../log/FEATURE_MOD_LOG.md) +
[`log/DEBUG_LOG.md`](../../log/DEBUG_LOG.md) · the frozen
[`handoff-28`](./archive/2026-07-11-handoff-28.md) / [`-27`](./archive/2026-07-10-handoff-27.md) ·
the testing hand-off
[`testing/2026-07-12-e2e-harness-handoff.md`](./testing/2026-07-12-e2e-harness-handoff.md).

---

## Current state (TL;DR)

- **🎨 Colour now has ONE source of truth, and per-tenant theming is gone (2026-08-05,
  uncommitted).** Asked to centralize colour "in one config file", the answer was that the repo
  **already designates one** — `design.md:9` names `tailwind.config.js` and `:292` explicitly
  forbids a `tokens.json`. So nothing was created; the existing file was **adopted**. Three
  phases, all done, all gated: **P1** deleted `mountains.json`'s `theme` block, `MountainTheme`
  and the `[mountain]` layout's injection (a `dangerouslySetInnerHTML`), collapsing **three**
  hand-copied `#FACC15`s into one via `theme('colors.brand.DEFAULT')` in `globals.css`
  — **M8 is superseded**, tenants may not differ in colour (owner). **P2** migrated ~30
  `yellow`/`orange` utilities to `brand`/`accent` across 9 files, admin included. **P3** is the
  only user-visible change: 급식현황's freshness scale goes **green→red ⇒ blue→red**.
  🔑 **The classification mattered more than the renaming** — of 75 yellow-ish utilities only
  ~30 are brand; the rest are **status** (`design.md:75`: warning is _"distinct from brand"_)
  or **Kakao vendor**. ⚠️ A blanket migration would have shipped warning notices in the brand
  hue and a non-Kakao-yellow Kakao button. Plan + full reasoning:
  [`color-token-centralization-plan-20260805.md`](../planning/pending/color-token-centralization-plan-20260805.md).
  ⚠️ **Not verified in a browser: the `/admin/*` screens** — auth-gated, no credentials this
  session. Someone with admin access should glance at 게시물 / 집사들 / 앱 관리 and 냥이들' grid
  header. Phases 4–5 (hygiene; the admin-vs-`design.md` audit D5 opened) are **not started**.
- **✅ 급식현황 publishing confirms the 급식소 it will stamp (2026-08-05, `c515058`).** 작성 완료
  opens a 확인 listing every ticked 급식소 by name plus the 방문 시간; 취소 publishes nothing.
  🔑 **The write is unrecoverable and asymmetric with the rest of the composer:** a 급식소 keeps
  only its **latest** visit, and `deletePost` never touches `feeding_spots` — so unlike the post
  itself (editable, and deletable by its author since §10q) the check-in has no correction path,
  which is also why the edit form hides that section. With nothing ticked the dialog says so
  rather than warning about a write that is not about to happen. 🔄 **The "no e2e cover" caveat
  originally recorded here is resolved** — `feeding_spots` is seeded now and the table has its
  own spec (colour plan Phase 3); the composer's picker remains unit-only. Detail:
  PROJECT_PLAN **§10r**.
- **🐈 Renaming a cat is a cascade, and `scripts/migration/rename-cat.js` performs it
  (2026-08-05, `350a995` + `70e2c60`; APPLIED to prod for 아들조로 → 조로).** A cat's identity is
  its **document id**, so `?cat=<id>` links survive untouched — but **four** things store the
  **name string** and none follows: media `tags` (the albums go **empty**), `[catmodal:이름]`
  tokens (the link renders and does nothing), other cats' prose, and `cats.parents` /
  `cats.offspring`. ⚠️ **All four fail silently.** 🔑 **`parents`/`offspring` were missing from
  the first cut and no test could have caught it — I wrote the fixtures.** The owner's **dry run
  against production** found it. ⚠️⚠️ **The video half does not stick:**
  `/api/refresh-video-metadata` overwrites `cat_videos.tags` from YouTube on every 동기화, so the
  script prints the affected ids and the CMS step that writes through — **two are still
  outstanding for 조로** (see the box at the top). Detail: PROJECT_PLAN **§10s**.
- **🧪 A third emulator-backed test category, and a script that cannot be aimed at production by
  accident (2026-08-05, `de4efe2`).** `tests/scripts/**` via `npm run test:scripts`, its own CI
  job, mirroring `tests/rules/**` — and excluded from `npm test` for the same reason. 🔑 **The
  plumbing was mechanical; the real change was `rename-cat.js`'s credential path.** It could
  only start from a real service-account key, and CI is hermetic by design, so it now connects
  credential-free when `FIRESTORE_EMULATOR_HOST` is set and **refuses unless the project is
  `demo-*`**, printing its target on every run. Proven by moving the key aside and re-running.
  ⚠️ **The CI job has never run on a runner** — the first PR is its proof.
- **✅ A video's YouTube 설명 is verbatim on every composer, empty included (2026-08-05,
  `551049f`).** 공지사항/입양홍보 used `item.description || message || '공지사항 동영상'`, so a
  blank 설명 silently published the **post body**. 🔑 **This reverses an explicit earlier
  decision** the code argued for in a comment — the comment now records the reversal so the old
  behaviour cannot be restored from it. Title inheritance kept (owner). 📌 **집사톡 needed no
  change:** the report was accurate about **production** (`main`), while `dev` has been verbatim
  since the per-file refactor — **a behaviour report is about the deployed artifact, not the
  branch**. ⚠️ The upload leg has **no** automated cover; confirming it is a manual pass.
  Detail: PROJECT_PLAN **§10t**.
- **🐛 A document with no `mountainId` can never be deleted — by anyone (2026-08-03,
  `8754a3c`).** Owner-reported: posts deleted through the CMS were still in `posts_feeding` /
  `posts_butler`, while 공지사항 / 입양홍보 deleted cleanly. 🔑 `canWrite()` reads the mountain
  off the **stored** doc on a delete (`request.resource` is null then) and `hasPermissionFor()`
  requires it non-null — so **no permission grants past a missing field**, which is why it did
  not present as a permission problem. 📌 **The correlation was a decoy:** the survivors did
  share a flat shape, because those are the **replies** (all written 2025, pre-multi-tenancy) —
  but the owner's _nested_ counter-example is what identified the real cause. It was created
  **one day after the M4 backfill**, and was the only unstamped doc among **98** across 11
  collections. ⚠️ **Silent by construction:** a one-shot backfill cannot catch later writes, and
  an unstamped doc looks fine until someone writes to it.
  `scripts/migration/stamp-missing-mountain-id.js` is the standing audit — **re-run after any
  migration or bulk import**. Applied to prod (snapshot first), re-audit clean. Also fixed:
  `post-service.updateReplyCount` used `increment(1)` and `deleteReply` calls it, so deleting a
  급식현황 reply **raised** the parent's count; it recounts now, matching 집사톡's service.
  ✅ **Verified by testing the rules, not reading them** — `@firebase/rules-unit-testing`
  against the real `firestore.rules`: with `mountainId` ALLOWED, without DENIED. Detail:
  `log/DEBUG_LOG.md` 2026-08-03.
- **👥 Members can now write on 집사톡 + 급식현황, and edit their own posts (2026-08-03,
  `8334c51`).** 🔑 **The ask rested on a premise that was false:** "let the author edit"
  implied non-admin authors, but **members could not see or create on either board** — the
  pages gated on `isAdmin()`, and the client-SDK write needs `manage-posts`, which only
  `admin` holds. So the missing piece was never editing. 📌 **The model had anticipated this
  and nothing used it:** `view-post-butler` / `view-post-feeding` were already granted to the
  butler roles and already drove the **nav**, so a member saw the link and then met
  관리자 권한이 필요합니다. Two new permissions (`write-own-post-butler` /
  `write-own-post-feeding`) cover create **and** edit-own per board; `authorUid` is now
  stamped at creation and is what the rules authorize against (`username` is an email, i.e.
  display). Delete stays admin-only — a 집사톡 post carries other people's replies.
  🔴 **CORRECTED 2026-08-03 — this is LIVE, not "not live":** the rules were deployed
  2026-08-02T16:00Z, the live matrix already grants both permissions, and one
  `butler-ground` member has authored two 급식현황 posts. See the correction box at the
  top. ⚠️ **What is NOT live is §10p** — a member cannot attach a photo to a 집사톡 post
  without losing the post. Plans:
  [`member-post-authoring-20260802.md`](../planning/completed/member-post-authoring-20260802.md)
  · [`member-media-upload-permissions-20260803.md`](../planning/completed/member-media-upload-permissions-20260803.md).
- **📝 The about page has one source of truth — the CMS (2026-08-02, uncommitted).** The
  `about` object is gone from `config/mountains/mountains.json`; `about_content/{mountainId}`
  is the only copy. It was stale for `title`/`subtitle`/`mainContent`/`sections` — 📌 the tell
  was `sections`: config declared two, Firestore held **zero**, the page showed none — but
  **authoritative for the photo**, because `useAboutPhoto` short-circuited to a `localPath`
  baked into that config and **ignored the filename Firestore gave it**. 🔑 **Editing the
  대표 사진 in the CMS did nothing.** The photo now resolves live from
  `about-photos/{mountainId}/{filename}`, which fixed the bug and unblocked the deletion at
  once. ⚠️ **No Firebase media is baked into the build any more** — and a missing about photo
  that used to _fail the build_ is now a broken image on a live page (accepted; the guard only
  worked while the filename lived in config). ✅ **The Firestore migration is applied** (snapshot first):
  `about_content` holds exactly `geyang` + a seeded `manisan`, `localPath` stripped from both,
  legacy `about_content/about` deleted. Detail: PROJECT_PLAN **§10m**,
  `log/FEATURE_MOD_LOG.md` 2026-08-02.
- **🐛 집사톡 posts opened on "Post not found" — a post is addressed by `(type, id)`, not `id`
  (2026-08-02, `c4789c5`).** The four post types live in four Firestore collections, but the
  shared detail route hard-coded `getPostService` (`posts_feeding`) while both list components
  linked **every** type there. 🔑 **A Firestore id is unique only within its collection**, so a
  route taking an id alone cannot resolve a post. 📌 **The report named 집사톡; 공지사항 and
  입양홍보 were broken identically** in the admin CMS, which links to the same route — found by
  tracing, not by re-reading the report. Never a regression: `posts_butler` arrived with the
  집사톡 list months ago and this page was never told; it survived because **the route had no
  e2e coverage at all**. ⚠️ **A `?type=` fallback was written and rejected on review (owner):**
  it protected nothing and recreated the bug silently. The type is now a **path segment** with
  **no default**. Detail: PROJECT_PLAN **§10k**, `log/DEBUG_LOG.md` 2026-08-02.
- **🎨 …and the page it opened had never had a layout (2026-08-02, `d7c601f`).** Full-bleed
  images under English `Video:` / `Images:` headings, videos as a thumbnail **linking off to
  youtube.com**. Only 급식현황 ever reached this route, so nobody had seen it. It now uses the
  공지사항 detail shell + the shared `PostMedia` (`layout="full"`), so every surface renders a
  post's media identically. ⚠️ **댓글 stays on the community types only** — 공지사항 / 입양홍보
  have never had a reply thread, and this route is where the admin CMS links.
- **✏️ Editing 공지사항 / 입양홍보 / 집사톡 now uses their create composers (2026-08-02,
  `d71a101` + `219b0e5`).** The old editor took media as a **pasted URL**, so changing a photo
  meant hunting down its Storage URL. 🔑 **The stated reason was stale:** `EditPostForm` said
  "their upload paths differ", true when written and false since 2026-07-30, when all three
  composers converged on the signed-URL strategy. Editing now has file pickers, per-file
  제목/설명, the cat selector and 촬영 날짜. ⚠️ **Four things decided inside it:** `기존` media
  carries no 제목/설명 editor (that lives on the medium's record, and YouTube owns a video's);
  an edit does **not** re-stamp `username`/`date`/`time`; post-level `tags` are **omitted** on an
  edit with no new files (`updatePost` merges, so an empty array would have **erased** them);
  and **retained media counts against 집사톡's cap**. 📌 **급식현황 stays on the URL editor by
  decision** — its composer uploads nothing, so routing it there would leave legacy posts with
  media unable to change it. Detail: PROJECT_PLAN **§10l**.
- **✅ The e2e suite is GREEN and the "flake set" is retired (2026-08-02, `4a5da2a`).**
  **3× consecutive 199 passed / 13 skipped / 0 failed**, from a 196/3 baseline. _(Now
  **214/13/0** — the same day's post work added 15 specs; see the top three bullets.)_ 🔑 It was
  **three real bugs, not flake** — and **"passes in isolation" meant _interference_, not
  slowness**, which is the reading that kept them open for weeks. (1) **App code:**
  `services/firebase.ts` guarded a **per-instance** emulator connection with a
  **process-global** flag, so a second `firebase/app` module registry got a `db` on the real
  backend — and an **offline `getDocs` resolves from the empty cache instead of throwing**,
  returning `200 []` so `res.ok()` passed and only the content assertion failed. 📌 The tell:
  **two different collections empty at the same moment**. (2) `admin/cats.spec` renamed a
  fixture cat **six other specs read**, surviving only because `getByRole({name})` matches
  **substrings**; repointed at `이사한냥이`, which no spec reads. (3) Three specs acted before
  async state resolved. ⚠️ **The old advice — "don't read a red run as a regression" — is
  retired; a red run now means something.** Detail: `log/DEBUG_LOG.md` 2026-08-02.
- **🔴 A hydration mismatch was erasing text visitors had already typed — fixed (2026-08-02,
  `fa2f87b`).** `AuthProvider` seeded `useState` from `auth.currentUser`, a **browser-only**
  value read **during render**. The server always has `null`, so the header disagreed, and
  React's recovery is to **discard the server DOM and rebuild the whole root** — remounting
  every component, re-running every `useState` initializer, and wiping in-progress input.
  🔑 **The rule to keep: nothing the server could not have known may affect the _first_ client
  render** (`localStorage`, `window.*`, `Date.now()`, a restored session) — read it in
  `useEffect`. ⚠️ Intermittent because the restore is **async**: it only bites when the restore
  beats hydration, on a full page load, for a signed-in visitor — which is why all **12**
  anonymous `public/` specs never saw it, and why it surfaced as _test flake_ rather than as a
  bug report. 💡 **Accepted cost:** one tick of logged-out header per full page load;
  `NavItem` and the contact form already tolerate it. Verified gone on `/pages/contact` **and**
  `/admin/cats` (the reliable reproducer, untouched by recent work).
- **📤 집사톡 is capped at one video + one photo, from static config (2026-08-02, `faa2f38`).**
  §10d **D2** closed — but **as `config/media_control.json`, not a CMS toggle**. 🔑 The
  Firestore design was drafted and **rejected on a consequence it exposed**: the setting is
  global by decision, so a runtime toggle would let **any one mountain's admin silently
  reconfigure every other mountain's composer**. Static config moves that authority to whoever
  can deploy; the redeploy cost is **accepted, not overlooked** (owner). 공지사항/입양홍보 stay
  unrestricted, so `MediaItemList`'s `allowMultiple` **defaults to `true`** and only 집사톡
  passes it. ⚠️ **This changes 집사톡 for members on deploy** — both flags ship `false`.
  📌 Two false precedents recorded: `admin_config` is **not** a settings store (no
  `firestore.rules` entry at all — it holds the YouTube OAuth token), and 앱 관리's old
  collection tab only _looked_ like one (see below).
- **🗑️ A settings screen that had never configured anything, deleted (2026-08-02, `1cada22`).**
  앱 관리's 게시물 컬렉션 설정 saved collection names to **`localStorage`** and the dashboard
  listed them with a hard-coded **`0`** — the headline number was _how many lines you typed_.
  🔑 **The tell:** the shipped default named **`posts_main`**, which has never existed, and
  omitted two collections that do; it survived ~14 months because a wrong name and a right name
  both render `0`. The tile now counts the four real collections (verified live: **14** =
  급식현황 6 + 집사톡 2 + 공지사항 4 + 입양홍보 2). **Which collections exist is a fact about
  the code, not an operator choice** — that is why the configurability was the wrong shape.
- **🧹 The project plan was audited against the code, and seven entries were wrong
  (2026-08-02).** Six unticked boxes described work finished weeks earlier — API-route auth
  (all 10 `/api/admin/**` routes gate on `requireApiPermission`; the one exception,
  `youtube-auth/callback`, is Google's redirect and documents why), RBAC collection drift (fixed
  2026-06-28 as Bug 0 of the members chain, then rewritten mountain-aware in M5.2), the
  static-data export seam, both config-consistency items, and theme wiring (M8). One more —
  §5's "급식소 관리 is a disabled stub" — was **flagged by the owner** and had a sharper edge: the
  neighbouring §7 note claimed `points` is `write: if false` with no live writer, which would
  have sent someone chasing a phantom permission-denied on a page that works fine. All ticked
  with a note on where each actually closed. 🔑 **A plan entry is a claim about the code, and
  claims rot** — verify before scheduling, and tick the box in the change that does the work.
- **🔐 Two of §8's four deferred compliance items are closed (2026-08-02, `8a50348`) — and the
  premise of one was wrong.** §8 said phone/Kakao users could join without consenting; they
  cannot, because `LoginForm.handleCheckUser` already refuses implicit signup and sends them to
  집사등록, which gates consent. The earlier pass had confirmed those two components hold no
  consent code — true — and **stopped before tracing their host**. A post-auth consent modal was
  designed on that false premise and **discarded**. ⚠️ **The real gap was different:** phone and
  Kakao sign-in mint an Auth account _before_ the app decides whether to admit anyone, so
  refusing them stranded an Auth record holding PII (phone number, Kakao email) with no consent,
  no profile doc and nothing to remove it. Now deleted on the bounce path, reusing
  `POST /api/account/delete`. 🔑 **The test is a password credential, not the login method** —
  signup is phone-first, so a missing profile doc is usually an interrupted signup, and gating on
  method would have deleted exactly those consenting users whenever they signed in by phone
  (**owner-caught**). Alongside it: **consent is now recorded** (`users/{uid}.consent`, with a
  policy version single-sourced in `constants/policy.ts` that both policy pages render as 시행일),
  **new members get their mountain's `defaultRole`** via a new Admin-SDK route — the client
  cannot seed it, because the empty-`roles` create rule is what blocks self-escalation — and
  **PII is out of the auth logs** (3 sites; a sweep found one more than the report). Detail:
  PROJECT_PLAN **§7/§8**, `docs/codebase/authentication.md` (rewritten).
- **📅 Uploaded media was recorded as filmed on the day it was uploaded — fixed (2026-08-02,
  `6e2dc49`).** A `new Date()` fallback for 촬영일 when the filename yields no date, so every
  iPhone `IMG_1234.MOV` looked filmed on the day it was posted. 🔑 **The owner's observation that
  집사톡 was unaffected was the whole explanation** — it has a 촬영 날짜 field and the other two
  composers had none, so nothing was ever sent — and following that asymmetry found **the same
  fabrication in the image path**, which is worse because `cat_images` has no upstream to correct
  it. Both now store `null`; 공지사항/입양홍보 **gained the field** so a date can be supplied at
  all. ⚠️ Two-stage and easy to misread: for videos the wrong date **disappears later**, when the
  next sync overwrites it from YouTube, which reads as a second unrelated bug. Detail:
  `log/DEBUG_LOG.md` 2026-08-02.
- **🖼️ Video tiles now name the clip, and the two album implementations became one (2026-08-02,
  `b61216a` + `82d0f07`).** The photo grid captions its thumbnails and the video grid did not —
  not a structural difficulty, but the two grids passing **different layouts to the same shared
  tile**: videos use `MediaTile`'s `layout="below"`, whose footer shelf rendered only tags and
  meta. It gained a `title` prop. 🗑️ The mislabelled `|| '제목 없음'` filler — which announced a
  missing _title_ while rendering a _description_ — is gone from **both** places it lived, the
  second under a player already showing the real title. 🔑 **Root cause of both: the modal albums
  hand-rolled their own tiles and drifted from the shared one.** They are now converged onto
  `MediaTile`, which also gives modal tiles **tag chips** for the first time. ⚠️ Converging
  removed `PhotoAlbum`'s `설명 없음` filler as a side effect (the shared tile drops them by
  design) — owner call if that should come back.
- **🔗 One cat is now linkable, and the modal hands you the link (2026-08-01, §10c DONE).**
  Clicking a cat sets `?cat=<id>`; arriving on such a link opens that cat; closing clears it;
  back closes the modal. A **이 냥이 링크 chip** in the cat modal hands it over — OS share sheet
  on **touch** devices (one tap to KakaoTalk), **clipboard on desktop**. 🐛 That split is a
  same-day fix: the chip first gated on `navigator.share` merely existing, which desktop Chrome
  satisfies and then refuses, and since a dismissed sheet is silent by design the button did
  **nothing at all** on desktop. 🔑 **Feature detection is not affordance detection** — and both
  pre-ship passes missed it because they **stubbed** `navigator.share`. 🔑 **The chip is what made the deep link
  usable**, and it settled an open design question by removing it: name-keying, a per-mountain
  unique-name rule and a mountain-in-the-URL were all proposed to make links hand-constructible,
  and none are needed once the app produces them. ⚠️ The chip **builds** the link rather than
  copying `location.href` — `CatInfo` renders on six surfaces and only 냥이들 honours `?cat=` —
  and mirrors the tenant prefix from the current path rather than resolving it from config,
  because geyang's configured domain is not the apex it actually serves from (§10c C3).
  🔑 **Reused the modal system's existing history entry** — `useModalLayer` already pushed one
  per overlay for the Android back gesture, so it just gained an optional **`historyUrl`** and
  the `history.back()` it already issued restores the previous URL. Keyed on the cat **id**, not
  the name (a rename must not break a pasted link) — note that in prod the two _look_ identical,
  since legacy doc ids **are** Korean names; the id is nonetheless immutable, so old links hold.
  🐛 Two non-obvious traps live in `log/DEBUG_LOG.md` 2026-08-01 — an unavoidable race with
  Next's canonical-URL re-assert, and why the defer must be `setTimeout` and not `rAF`.
  ⏳ Owner call, not blocking: the page now emits a GA4 `page_view` per modal open.
- **🐌 A 30-second Firestore timeout was making the public post pages look broken — fixed
  (2026-08-01, `be36c9e`).** Reported on Safari as three bugs (tags arriving late or never, the
  공지 list saying there are no posts, a post reporting itself missing, all cured by reloading).
  Measured with `performance.now()` stamps: **30,048 ms** from issuing the query to receiving 4
  documents, of which the query was the last **48 ms**. The SDK's buffering-proxy probe gets no
  answer and waits out the transport timeout — this SDK caps it at exactly 30 s — then falls
  back to polling and succeeds. ⚠️ **Auto-detect long polling was already the default**, so the
  usual advice was a no-op; the browser is now **forced** onto long polling. 🔑 **Nothing was
  lost** — transport, not feature; the app has **zero** `onSnapshot` listeners against ~47
  one-shot reads. Underneath it, three surfaces rendered their **failure state as their loading
  state** (server-rendered into the first paint, and permanent after a failure because nothing
  set state again); they now share `useAsyncData` + `ui/AsyncStates`. Detail: PROJECT_PLAN
  **§10f**, `log/DEBUG_LOG.md` 2026-08-01.
- **🎞️ Videos deleted from YouTube kept their tile in the public 영상첩 — fixed (2026-08-01,
  `7e8aa1b`).** `syncVideos` is import-only (YouTube minus Firestore), so a record outlives its
  video forever. 🔑 **Auto-pruning was rejected:** the channel listing is read with the public
  API key, in which a **private** video disappears identically to a deleted one — pruning would
  destroy cat tags and 설명 on a privacy change. New `POST /api/admin/video-availability` asks
  with the **owner's OAuth credential** (which distinguishes them), writes
  `youtubeStatus: available|private|missing`, and **never deletes**; public reads drop
  missing/private, and `/admin/tag-videos` lists the missing ones with a 기록 삭제 button.
  Verified against prod after the owner ran 동기화: **20 videos, 18 available + 2 missing**, both
  hidden publicly and listed in the CMS panel. Detail: PROJECT_PLAN **§10g**.
- **🖼️ Two smaller owner-reported fixes (2026-08-01).** Photos in a post now render at the
  video's width (`be8eb77` — `PostMedia`'s `compact` grid gave a lone photo half the width and
  pillarboxed it inside its own border; **third defect from that default**, so pick `layout`
  explicitly at every call site), and the 공지사항 detail page's standing "중요한 안내사항" banner
  is gone (`6e55463` — static template markup that made every announcement read like an
  advisory).
- **📮 The three composers and the three post-display surfaces converged (2026-07-30/31, five
  commits `03ce4f2`…`bb181a6`, all pushed).** 공지사항 / 입양홍보 gained 집사톡's **per-file**
  media (each file its own 제목/설명), a **cat selector**, and framed sections with separators;
  their images moved to the signed-URL path so a per-photo 설명 has somewhere to live — which
  means those photos now get a **`cat_images` record** and appear in the public 사진첩 and the
  tagging queue, where the old direct-storage path recorded nothing. Pasted-URL lists removed
  (owner). Duplicate filenames are now **refused** (`exists()` → 409 in Korean) instead of
  silently overwriting. On the display side, **three hand-rolled media renderers became one**
  (`PostMedia`): the 입양홍보 expanded post shows the whole post, 입양홍보 posts can pop up on a
  site visit like 공지사항, and every medium now shows its **제목 / 설명 / 태그** — resolved
  **live** from the media records, so pre-existing posts display it with no migration.
  🗑️ Deleted with no callers left: `MediaUploadField`, `uploadImagesToStorage`,
  `imagePathPrefix`, `uploadVideosToYouTube`. Detail: PROJECT_PLAN **§10d/§10e**,
  `log/FEATURE_MOD_LOG.md` + `log/DEBUG_LOG.md` 2026-07-30/31.
- **🚨 Two self-inflicted regressions this run, both caught and both instructive.** (1) Signing
  the upload URL with `x-goog-if-generation-match` made the cross-origin PUT **preflighted** and
  **blocked every image upload from every deployed origin** — the bucket's CORS allow-list does
  not contain it, and nothing logged server-side because the request never left the browser. A
  unit test now pins that the PUT carries `Content-Type` and nothing else. (2) Putting the
  shared `PostMedia` on the announcement detail page carried the _modal's_ image sizing with it
  and shrank previously full-width photos; it took a `layout` prop. Full chains in
  `log/DEBUG_LOG.md` 2026-07-30 / 07-31.
- **✅ The 2026-07-29 upload work is confirmed working on `dev` (owner, 2026-07-31):** "media
  uploads are working fine from both 공지 and 입양홍보". The `cat_videos` Admin-SDK fix is
  corroborated too — the new tag lookup resolves a video's tags from that record, which only
  exists if the write landed. ⏳ Still unverified on the deployed Preview: the 입양홍보 popup and
  the duplicate-filename 409.
- **🚨 Video upload from the composers was broken outright and is now fixed (2026-07-29,
  three commits + uncommitted follow-ups).** The file used to be POSTed through a Vercel
  function, whose **4.5 MB request-body cap** is enforced at the proxy — so nothing bigger
  than a few seconds of phone video could be uploaded from 공지사항 / 입양홍보 / 집사톡. Now
  **resumable, direct-to-Google**: `POST /api/upload-youtube` opens the session, the browser
  PUTs the bytes to YouTube, `POST /api/upload-youtube/complete` files the playlists and
  writes `cat_videos`. Both halves gate on `manage-video` independently. Uploads also show a
  **progress bar** now (`UploadProgressBar`, one bar per submit, aggregated across files;
  `XMLHttpRequest` because `fetch` cannot report request upload progress).
  **Three older bugs were stacked behind it**, none reachable until an upload first
  completed: (1) the resumable session must be opened with the **browser's `Origin`**, or the
  browser uploads every byte and is then forbidden to read the response — 100% then a failure
  that looks like a dead socket, video public and unrecorded; (2) `cat_videos` was written
  with the **client** Firestore SDK from the server, so `firestore.rules` denied it silently —
  **every form-uploaded video has been reaching YouTube unrecorded**, appearing in 영상첩 only
  after a manual 📺 YouTube와 동기화; (3) the live Storage bucket had **no CORS at all**.
  Full chain, with the two-bucket table: [`log/DEBUG_LOG.md`](../../log/DEBUG_LOG.md)
  2026-07-29. ⏳ Image upload + the 영상첩 record are **still unverified on `dev`**.
- **🪣 There are two Storage buckets and only one is live — this misled the debugging twice.**
  `mountaincats-61543` is the real one (the Seoul/`asia-northeast3` bucket every deployment
  uses; all 30 prod `cat_images` URLs point at it). `mountaincats-61543.firebasestorage.app`
  is the **pre-migration default, still present and unused**. The Seoul migration moved the
  files and rewrote the Firestore URLs but **left the bucket CORS behind on the old bucket** —
  which is both why deployed image upload failed and why it appeared to work locally (local
  `.env` still names the old bucket). CORS is now applied to the live bucket and verified by
  preflight; `npm run storage:cors` (new, dry-run by default) reads and applies it.
- **🎉 Production `main` now runs the multi-mountain platform** — promoted via **PR #8**
  (`dev → main`, merge commit `366425c`, 2026-07-23), a 34-commit bundle: the whole
  multi-tenant **M1–M5** refactor, data protection (PITR/backups), and the CI rules gate.
  Supersedes **PR #7** (`65d2020`, 2026-07-16 — landing/admin redesign, adoption,
  compliance, mobile map, Seoul storage, e2e suite).
- **🔑 The M5 prod cutover is COMPLETE (owner-run, 2026-07-23):** snapshot → migration
  (`currentRole`→`roles` map, `'default'`→`geyang` normalized) → `firestore:indexes`
  deployed (6 composite, Enabled) → **PR #8 merge** → `firestore:rules` deployed
  (mountain-aware). So production now **stamps + scopes by `mountainId`, resolves
  `roles[mountainId]`, and enforces the mountain-aware rules**. _(Post-cutover cleanup —
  deleting the legacy `currentRole` + `about_content/about` + the local dump — is the
  only tail; see Open threads.)_
- **Testing & CI workstream is CLOSED** — main is CI-gated (+ the new emulator-backed
  `rules` job runs `test:rules`).
- **Branch model in effect:** `dev` (staging / Vercel Preview) promotes to `main`
  (production / Vercel) via a **merge commit**. After PR #8, `dev` is an ancestor of
  `main` and `main` is a merge commit ahead; fast-forward `dev` to `main`
  (`git checkout dev && git merge --ff-only main && git push`) to fully sync.
- **Complexity retirement — ✅ COMPLETE & COMMITTED (P0–P6, all on `dev`).**
  Seven commits: P0 `6454d80` → P1 `431c69f` → P2 `fdba4ee` → P3 `1d13e09` →
  P4 `34c5c68` → P5 `ea2fab4` → P6 `2584dcb`. Final gates: full e2e
  **116 passed / 13 skipped / 0 failed**, tsc / smoke 29-29 / unit 25-25. Net:
  four content forms 2,135→859 on `src/components/forms/` primitives; both admin
  editors 4,430→~2,650 on the `src/components/admin/media/` toolkit; ~45 native
  `alert()/confirm()` prompts now shared-Modal dialogs (`ui/useDialog`); 집사톡's
  broken image upload fixed; `react-hook-form` removed. ⚠️ **The one remaining
  track item is owner-owed:** the P5.4 scripted manual YouTube pass (editor
  sync/playlists + form video upload, real creds, on Preview) before the next
  `dev → main` promotion. 🐛 **STARTED 2026-07-26 and became a bug hunt — six defects found
  and fixed, all pre-existing, none reachable by the automated suites as they stood.** In
  order: (1) routes read the refresh token from env while the 「토큰 갱신」 button writes it to
  Firestore; (2) `manage-playlists` POST read a channel-ID env var set nowhere; (3) the admin
  OAuth flow requested too few **scopes**, so its tokens could never edit metadata; (4)
  `자동 날짜 인식` wrote Firestore, and the sync erased those dates; (5) batch playlist save
  ignored the batch selection; (6) every sync reset a video's 게시일 to "now", reordering the
  **public** 영상첩; (7) **owner-reported** — batch edits reached YouTube but never synced back,
  because the batch mutations handed the sync route **Firestore doc ids** where it needs
  **YouTube ids**. All ✅ fixed and pushed. **The pass must re-run from the top** — the
  credential source, the scopes, and four write paths all changed under it.
  _Exactly what a manual pass is for; the automated suites were green throughout._
- **Multi-tenant / multi-mountain refactor — ✅ M1–M5 DONE & DEPLOYED TO PROD (PR #8,
  2026-07-23; cutover complete). ✅ M6 DONE on `dev` (2026-07-25) — no prod migration needed.**
  **M6 (2026-07-25):** per-tenant **upload** namespacing — `generate-signed-url` + the form
  image strategy prepend the active tenant's `storagePrefix` (geyang `''` → exact no-op), so a
  future mountain's uploads land under `mountains/<id>/…`. **Scope was corrected mid-flight:**
  the first draft also namespaced baked thumbnails + a `cats.thumbnailUrl` migration, but
  inspecting prod showed cat thumbnails **and** album photos are served from live Firebase
  **Storage URLs** (not baked paths) — already tenant-scoped, so the migration was a 0-change
  no-op and was **reverted/deleted** (baking + fixtures back to flat). Gates: tsc 0 / unit +2 /
  smoke 30 / **e2e 125/13/0**. **No cutover.** Image-serving model now documented in
  [`media-and-youtube.md`](../codebase/media-and-youtube.md#image-storage--serving-strategy).
  **M7 (2026-07-25) — ✅ committed on `dev` (`48f7085`):** analytics decoupled from the
  Firebase SDK → shared **GA4** via `gtag.js` (root-layout `<Script>`, gated on
  `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `send_page_view:false`); `AnalyticsTracker` emits every
  `page_view` with `mountain_id` from `useMountain()`. `getAnalytics` + the `analytics`
  export gone from `services/firebase.ts`. 🔑 **Owner-owed (not code):** register the GA4
  property + `mountain_id` custom dimension **before any tenant-2 traffic**, and add
  `NEXT_PUBLIC_GA_MEASUREMENT_ID` to Vercel Prod+Preview.
  **M8 (2026-07-25) — ✅ committed on `dev` (`a237e8b`):** per-tenant
  **primary color** — a `primary` tailwind token → `--color-primary` CSS var, injected per
  tenant on `:root` by the `[mountain]` layout; public CTAs repointed `from-brand`→
  `from-primary`; geyang reconciled to zero-change (`#FACC15`), manisan verified sky-blue.
  Owner-chose the minimal "primary only" scope. Gates tsc 0 / smoke 30 / unit 71 / **e2e
  125/13/0**. M8 also rewrote the provisioning guide + finished the docs close-out — **the
  multi-tenant track (M0–M8) is complete**; only owner-gated GA4/DNS externalities remain. See
  the workstream section.
  Summary of the M5 sub-phases below.
  **M5.4a (2026-07-23):** `manisan` added as a `hidden: true` stub tenant in
  `mountains.json` (routable at `/manisan`, prerendered, but excluded from the public
  `MountainSelector`) + seeded in `seed-emulators.mjs` (distinct content + a manisan-only
  admin and a dual-mountain admin). **M5.4b (2026-07-23):** the two-tenant isolation e2e —
  `tests/e2e/api/tenant-isolation.spec.ts` (Host-scoped data reads + mountain-scoped API
  authz: single-mountain admin 403 cross-tenant, dual admin 200 on both) +
  `tests/e2e/public/tenant-isolation.spec.ts` (rendered content isolation, desktop+mobile).
  **Full e2e 125/13/0** (+9). The `contacts` PII read-isolation is covered by the rules
  suite, not duplicated. **M5.3 route audit DONE (2026-07-23):** walked all 21 `src/app/api/**`
  routes — every Firestore access path is either correctly tenant-scoped (cats/points/
  contact/assign-role/upload-youtube video record) or correctly central-by-design
  (users, `role_permissions/*` matrix). **No leak-by-omission.** The only residual
  cross-tenant surface is the **shared YouTube channel** (non-Firestore; already deferred
  = M5.1 note b — `getYouTubeChannelId` is per-tenant config but the OAuth credential /
  `admin_config/youtube_auth` is shared). Out-of-scope find logged as an open thread: 7
  ungated write/credential routes (pre-existing, orthogonal to tenancy). Q1–Q8 answered (management-only · B1 one-Firestore-
  `mountainId` · A1 one-Vercel + subdomains · visitor-facing selector); plan + live
  tracker:
  [`multi-mountain-refactor-plan-20260719.md`](../planning/completed/multi-mountain-refactor-plan-20260719.md).
  M1–M3 (`8920c66`/`092d226`/`491b832`, 2026-07-19) + **M4 (`b83a112`, 2026-07-20)**
  landed the `[mountain]` segment + host-rewrite middleware, the per-tenant service
  factory, write stamps, and the **prod backfill (99 docs stamped `mountainId=
'geyang'`, triple-verified)**. See the workstream section for M1–M4 detail.
  **M5.1 (`d4a0bb2`, 2026-07-22):** every content read scoped by `mountainId`
  (collection queries + doc-by-id tenant guards + the 2 Admin-SDK server reads);
  new `firestore.indexes.json` (6 composite indexes, **hand-derived — the emulator
  auto-creates indexes and won't flag a missing one**). **M5.2 (`47d0f3d`,
  2026-07-22):** the **role model is now a map keyed by `mountainId`** —
  `users.currentRole` → `roles: Record<mountainId, UserRole>`, so one account can
  admin several mountains and the host picks which applies (§0 sub-decision 6, owner
  2026-07-22). `hasPermissionFor(uid, perm, mountainId)` everywhere; `firestore.rules`
  rewritten mountain-aware (`canWrite` gates on the doc's own `mountainId` + blocks
  cross-mountain moves; sensitive reads scoped; `users` read self-only; dead
  `analytics` block removed); `requireApiPermission` folds in **M5.3's core**.
  **M5.2a and M5.2b were inseparable at the emulator gate** (rules + seed both key on
  the role shape). Gates: tsc, smoke 30/30, unit 39/39, **rules 11/11** (new mountain
  dimension), **full e2e 116/13/0**. ✅ **The order-critical prod cutover ran successfully
  2026-07-23** in the required sequence — snapshot → migration → indexes (Enabled) → PR #8
  merge → rules deploy — so all of M5 is now **live in production**. The 6-step runbook
  ([`m5-prod-cutover-runbook`](../manuals/deployment/m5-prod-cutover-runbook.md)) stays as
  the record of how it was done + rollbacks. **M5 is DONE & DEPLOYED; the active track
  advances to M6.**
- ✅ **CI updated for M5 (2026-07-23).** A dedicated emulator-backed `rules` job was added
  to `.github/workflows/ci.yml` (Java + Firebase-emulator cache, no browser) that runs
  `npm run test:rules` — so a mountain-aware rules regression now fails CI. The M5.4
  two-tenant isolation e2e was already covered by the existing `e2e` job (`npm run
test:e2e` globs all of `tests/e2e/**`), so it needed no wiring. **The CI thread is
  resolved.**
- **NEW — data protection now exists (2026-07-20).** Prompted by M4's backfill
  running against prod with **no backup and no PITR** (safe only because it was
  additive and exactly reversible). Now in place: **PITR enabled** (7-day
  window), a **weekly** Firebase backup schedule, and `npm run backup:firestore` /
  `import-firestore.js` for local, off-Google dumps (**round-trip verified
  lossless** — prod → emulator → re-export, 16/16 files byte-identical).
  **Standing rule: snapshot before any script writes to prod data** — wired into
  the plan's M6 as a precondition. Runbook:
  [`admin-manual` §10](../manuals/admin-manual/README.md#10-backups--recovery-owner).
  ⚠️ Dumps carry a live OAuth refresh token + `contacts`/`users` PII — local only,
  `/backups/` is git-ignored. A GCS export bucket was **considered and rejected**
  (a second PII store to secure and disclose, for protection PITR already gives).
- **This Firestore is shared with a second app (owner-confirmed, benign).**
  `image_uploader` (13 docs) is the **owner's own image-upload script** (confirmed
  2026-07-22) — a one-off 2020-photo triage queue, invisible to this codebase, no
  `firestore.rules` entry (Admin-SDK only), no `mountainId`. It also shares Storage
  (`images_thumbnail/` under the same bucket). The M5.2b rules land on this shared DB
  but don't touch `image_uploader` (default-deny, untouched). No action needed unless
  that script ever promotes records into `cat_images` (then they'd need a `mountainId`
  stamp).
- ✅ **M0 rules deploy DONE (owner, 2026-07-22).** The pending pre-M5 `firestore:rules`
  (급식소 CMS + scoped `users` self-write + Tier 1 admin-write-clause removal) were
  deployed. ⚠️ **A NEW rules deploy is now owed** for M5.2b's mountain-aware rules —
  and it must be preceded by the migration (see Open threads for the exact order).
- Also owner-owed before the next `dev → main` promotion: the P5.4 scripted manual
  YouTube pass (see the complexity-retirement section).
- **✅ DECIDED (owner, 2026-07-28) — the multi-tenant URL model goes PATH-BASED.** A mountain is
  identified by **path** (`mohocats.org/manisan`), not host; geyang keeps its prefix-free URLs at
  the apex; a second mountain's owner does **not** need their own hostname (the one argument that
  could have reversed it). Execution plan (T0–T7, 28 tasks, **not started** — gated behind the
  P5.4 pass and the promotion):
  [`tenancy-path-migration-plan-20260728.md`](../planning/pending/tenancy-path-migration-plan-20260728.md).
  🚨 **The plan re-measured the surface and found one the decision doc missed:** all `/api/*`
  routes resolve the tenant from the **Host header**, so path-based would resolve every API call
  to geyang — including `requireApiPermission`, an authorization inversion (geyang-only admin
  allowed on manisan, manisan-only admin denied on their own). Fixed by a validated
  `X-Mountain-Id` header, sequenced ahead of the link sweep. Original rationale record:
  [`tenancy-url-model-decision-20260728.md`](../planning/pending/tenancy-url-model-decision-20260728.md)
  — its case: every mountain-#2 blocker
  found that day — the 🚨 sign-out security defect, the re-login friction, the cost of fixing
  that friction (a bearer credential we'd own), the per-subdomain authorized-domain chore, the
  provisioning-order trap — is **one root cause, more than one origin**. Path-based deletes
  the class for a measured ~80 call sites across 27 files. Two facts carry it: **nothing has
  been provisioned** (the subdomains are NXDOMAIN; prod runs on the apex via the fallback), and
  **the `[mountain]` segment already exists** with the host-rewrite middleware as an adapter on
  top. ⚠️ It is **not** a silver bullet — `syncVideos`, the playlist back-fill, the roster
  leak, and the missing CMS mountain label survive either way.
- **📁 Mountain-#2 readiness now has one home:**
  [`mountain-2-prerequisites.md`](../planning/pending/mountain-2-prerequisites.md) (blocking ·
  should-fix · decided/won't-do · already-closed), with the console half carved into
  [`adding-a-mountain.md`](../manuals/admin-manual/adding-a-mountain.md). Nothing in either
  blocks the `dev → main` promotion.
- **Tree:** clean through **`a2d21f2`** (bar a `.gitignore` hunk, three untracked code-graph
  files from a different workstream, and a 2-line `config/mountains/mountains.json` edit that
  is not from this work). The whole multi-tenant epic (M0–M8)
  is committed on `dev`; `dev` leads `origin/main` by **71** commits, and `origin/main` carries
  **2** commits `dev` does not — the PR #7 (`65d2020`) and PR #8 (`366425c`) **merge commits**,
  so neither branch is an ancestor of the other and the next promotion is again a merge.
  ⚠️ **Use `origin/main` for this**: the local `main` ref is stale at `26b1879` (2026-03-16),
  which is where this doc's long-running "~274–279 commits ahead" figure came from.
  M6/M7/M8 + the GA4 guide + the 2026-07-26 → 08-01 sessions are on `dev` but **not yet
  promoted to prod** — gated on the P5.4 YouTube pass.

---

## Workstreams — current status

### Testing & CI — ✅ COMPLETE (merged to `main`)

Emulator-backed Playwright e2e harness + GitHub Actions CI, and the full main-plan
suite: `public/`, `auth/`, `member/`, `admin/`, `api/` (~140 tests). Flake audit green
(local full-gate 3× consecutive: 101 passed / 13 skipped / 0 failed; **CI** green on
PR #7 and `dev` pushes). **Branch protection enforces the `e2e` required status check
on `main`** (classic protection + the `protect-main` ruleset: `deletion`,
`non_fast_forward`, `pull_request`; review count 0; linear-history removed so
promotions can use a merge commit). Full narrative + run instructions:
[`testing/2026-07-12-e2e-harness-handoff.md`](./testing/2026-07-12-e2e-harness-handoff.md).

### Compliance / legal — ✅ SHIPPED & LIVE

개인정보처리방침 (`/pages/privacy`) + 이용약관 (`/pages/terms`), footer links, email-signup
consent gating, 국외 이전 disclosure (PIPA Art. 28-8, disclosure-based not consent), and a
member self-service **탈퇴/deletion** flow (`POST /api/account/delete`, Admin-SDK
hard-delete). Detail: [`handoff-28`](./archive/2026-07-11-handoff-28.md) §1–2 +
[`compliance-plan.md`](../compliance/compliance-plan.md). **⚠️ Draft copy — a
professional/legal review is still owed before scaling membership.**

### Public / admin redesign, adoption, mobile, storage — ✅ LIVE (via PR #7)

Landing redesign (Leaflet map), shared `<Button>`/`Modal` primitives + brand tokens,
admin CMS re-skin + Korean, 급식소 CMS, adoptable-cat + 입양홍보 features, inline
`[img]`/`[video]` link tokens, mobile map (portrait + rotate-notice + clustering
toggle), Lightbox pinch-to-zoom, Firebase Storage → Seoul bucket. Per-change detail:
[`FEATURE_MOD_LOG.md`](../../log/FEATURE_MOD_LOG.md) + PROJECT_PLAN.

### Data protection / backups — ✅ IN PLACE (2026-07-20)

Did not exist before 2026-07-20. Prompted by M4's prod backfill running with no
snapshot and no PITR — see the M4 note below for why that was survivable.

**Three layers, each covering what the others don't:**

| Layer                          | Covers                                  | Restores by                   |
| ------------------------------ | --------------------------------------- | ----------------------------- |
| **PITR** (enabled 2026-07-20)  | Bad write / delete noticed **≤ 7 days** | Any moment in the window      |
| **Weekly backup schedule**     | Same, noticed later                     | ⚠️ Creates a **new database** |
| **`npm run backup:firestore`** | Project loss + pre-migration insurance  | `import-firestore.js`         |

- **Weekly, not daily, is deliberate** — it meshes with PITR's 7-day window, so
  every moment is covered by either PITR or a ≤7-day-old snapshot. No gap; dailies
  would add cost, not coverage.
- **GCS export bucket considered and rejected** — a second PII store to secure and
  disclose under PIPA, for protection PITR already provides. Recorded so it isn't
  silently re-proposed.
- **Scripts** (`scripts/maintenance/`): `export-firestore.js` discovers collections
  via `listCollections()` (never a hard-coded list — that's how `image_uploader`
  was found), tags Firestore-native types with `__type` so they round-trip, and
  throws rather than writing a lossy dump. `import-firestore.js` is the inverse:
  **dry-run by default** (inverted vs the backfill script — this one overwrites),
  applying needs `APPLY=true` **and** `CONFIRM_PROJECT` matching the target, and
  the banner names `EMULATOR` vs `⚠️ LIVE`. Writes are full `set()` (restore
  semantics); documents absent from the dump are **not** pruned.
- **Verified by round-trip, not inspection:** prod → emulator → re-export → diff,
  16/16 files byte-identical. That test caught two real things: timestamps must
  rebuild from `seconds`+`nanoseconds` (ISO is ms-precision and would silently
  round), and **a dry run opens no connection** — a wrong emulator port survived a
  clean-looking preview.
- ⚠️ **Dumps are credentials**: live OAuth refresh token (`admin_config`) +
  `contacts`/`users` PII. `0600` in a `0700` dir, `/backups/` git-ignored, keep
  local, delete when done.
- Runbook: [`admin-manual` §10](../manuals/admin-manual/README.md#10-backups--recovery-owner).

### Multi-tenant / multi-mountain refactor — ✅ COMPLETE (M0–M8), all committed on `dev`. ✅ M1–M5 DEPLOYED TO PROD (PR #8, 2026-07-23). ✅ M6 (`d644d1b`) + M7 (`48f7085`) + M8 (`a237e8b`) + GA4 guide (`7e3c517`) on `dev`, not yet promoted. Only owner-gated externalities remain (GA4 dimension + Vercel env var; real-mountain DNS).

**M8 (2026-07-25, committed `a237e8b`) — per-tenant theming, minimal scope.**
`config.theme` is now **live** (was dead). A `primary` tailwind token → `--color-primary` CSS
var (default `#FACC15` = geyang's shipped `brand.DEFAULT`); the `[mountain]` layout injects
`:root{--color-primary:<tenant primaryColor>}` per request (hex-validated fail-loud; on
`:root` so portaled modals inherit it). The `from-brand to-accent` CTA gradient was repointed
to `from-primary` on the **public** surfaces — shared `ui/Button`, header 입양홍보 CTA
(`Navigation`), Leaflet cluster marker, adoption + faq page CTAs. geyang's stale
`theme.primaryColor` `#ffbc00` → **`#FACC15`** (zero-change). **Owner-chosen scope: "primary
color only"** over the rejected full-ramp option — the `brand` ramp + admin-only `from-brand`
CTAs stay static (a real 2nd mountain would still read yellow there; fuller pass later).
**Browser-verified** (`/` vs `/manisan`): geyang CTA `#FACC15` (unchanged), manisan `#0ea5e9`
(sky-blue). Gates: tsc 0, smoke 30/30, unit 71/71, **e2e 125/13/0**. The **provisioning guide**
(`new-mountain-setup.md`) was rewritten as a real runbook and the **docs close-out** is done
(`multi-tenant-config.md`, `services-layer.md`, AGENTS/CLAUDE.md, admin manual §9, PROJECT_PLAN
§9, decision framework → EXECUTED). **M8 complete** — only 🔑 owner-gated externalities remain
(GA4 `mountain_id` dimension + Vercel `NEXT_PUBLIC_GA_MEASUREMENT_ID`; per-mountain DNS/console
allowlists when a real mountain #2 arrives).

**M7 (2026-07-25, committed `48f7085`) — analytics decoupling.** `firebase/analytics` →
shared **GA4** via `gtag.js`. A `next/script` `<Script>` in the **root** layout
(`src/app/layout.tsx`) loads gtag gated on `NEXT_PUBLIC_GA_MEASUREMENT_ID`, configured
`send_page_view: false`; `AnalyticsTracker` sends every `page_view` with `mountain_id` (from
`useMountain()`) so the shared property segments per tenant. `services/firebase.ts` drops the
`getAnalytics` import + browser-only `analytics` guard + export; dead `measurementId` removed
from `getFirebaseConfig`. Unset env var (dev/emulator/e2e) → no script, `AnalyticsTracker`
no-ops (= old `analytics=null`). The dead `analytics` **rules** block was already removed in
M5.2 (only the `view-analytics` permission remains). Gates: tsc 0, smoke 30/30, unit 71/71,
**e2e 125/13/0**. 🔑 **Owner-owed (not code):** GA4 property + `mountain_id` custom dimension
registered **before any tenant-2 traffic**, and `NEXT_PUBLIC_GA_MEASUREMENT_ID` set in Vercel
Prod+Preview (supersedes `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`, now unused). **No prod
migration.**

**M6 (2026-07-25, committed `d644d1b`) — per-tenant upload namespacing.** Image uploads
prepend the active tenant's `storagePrefix`: `uploadStrategies.uploadImagesToStorage(…,
storagePrefix)` (threaded via `useMountain()` in `useSimpleContentForm`) + the
`generate-signed-url` route (per-request tenant, prefixes object path + `publicUrl`). Geyang
`''` → exact no-op; a new tenant's uploads land under `mountains/<id>/…`.

⚠️ **Scope was corrected mid-flight — read this so it isn't re-litigated.** The plan assumed
thumbnails serve from **baked local paths**; that's only true in e2e fixtures. In **prod**,
cat thumbnails (`cats.thumbnailUrl`) **and** album photos (`cat_images.imageUrl`) are live
Firebase **Storage URLs** (verified against the prod dump), served via Next `<Image>` — so
they're already tenant-scoped by the object path. The drafted thumbnail-namespacing +
`cats.thumbnailUrl` migration were therefore a **0-change no-op** (the dry-run confirmed:
32/32 cats `not-baked`) and were **reverted/deleted** (`fetch-static-assets.js` + `cats.json`
back to flat; `backfill-thumbnail-namespace.js` + the M6 runbook removed). The cat-thumbnail
baking is legacy/dead-in-prod (e2e-only). Full model:
[`media-and-youtube.md → Image storage & serving strategy`](../codebase/media-and-youtube.md#image-storage--serving-strategy).
Gates: tsc 0, unit +2, smoke 30/30, **e2e 125/13/0**. **No prod migration/cutover** —
about-photos stay baked + per-mountain (already handled pre-M6).

**Read-first to resume:**
[`multi-mountain-refactor-plan-20260719.md`](../planning/completed/multi-mountain-refactor-plan-20260719.md)
— the execution plan **and live tracker**: decisions locked (§0), target
architecture (§1), design specs (§2), phases **M0–M8** with per-phase gates and
in-place execution notes (§3), risks (§5), deferred items (§6). **Resume = its §3
`M5`**, where M5.1/M5.2/M5.3 are now checked off with execution notes and the
remaining item is **M5.4 two-tenant isolation e2e**. The
2026-07-18 decision framework
([`multi-tenant-architecture-decision-20260718.md`](../planning/completed/multi-tenant-architecture-decision-20260718.md))
stays as the rationale record; its §9 table carries the answers. PROJECT_PLAN
**§9** is the tracker entry.

**M5.1 (`d4a0bb2`, 2026-07-22) — scoped reads + indexes.** Every content read
carries `where('mountainId','==',…)`; doc-by-id reads got a post-read tenant guard
(a known cross-tenant id reads as "not found"). `media-albums` reads take an explicit
`mountainId` (threaded from the `image-service`/`video-service` wrappers); the two
Admin-SDK server reads (`getAllCatsServer`/`getAllPointsServer`) take it too, threaded
through the pages via the layout's `resolveMountainIdOrNull`. New
`config/firebase/firestore.indexes.json` (6 composite indexes) wired into
`firebase.json` — ⚠️ **hand-derived, because the Firestore emulator auto-creates
indexes and won't surface a missing one** (and these services swallow query errors to
`[]`, so a prod-only gap would silently empty an album).

**M5.2 (`47d0f3d`, 2026-07-22) — per-mountain role model + mountain-aware rules.**
The role model is a **map keyed by `mountainId`** (§0 sub-decision 6): `roles:
Record<mountainId, UserRole>`, one account can hold roles on several mountains, the
host picks which applies. `hasPermissionFor(uid, perm, mountainId)` threaded through
permission-service / `admin.ts` / the client hooks (via `useMountain()`) / butler
pages / AdminAuth; `assign-role` deep-merges `roles[mountainId]`; the members roster
route shows each user's role on the request mountain; **new signups get `roles: {}`**
(no permissions until assigned — which also makes the self-write rule bulletproof).
⚠️ **Amended 2026-08-01:** the client still creates the doc with `roles: {}` — the rule
and the self-escalation guarantee are **unchanged** — but signup now follows it with
`POST /api/account/default-role`, an Admin-SDK route that stamps the mountain's
configured `defaultRole` (`viewer`). It reads the role from config (never the request),
takes the uid from the verified token, and refuses if a role already exists, so it
cannot grant anything else or overwrite an admin's assignment.
`firestore.rules` rewritten mountain-aware (`hasPermissionFor` + `canWrite` gating on
the doc's own `mountainId` and blocking cross-mountain moves + sensitive-read scoping

- self-only `users` read + dead `analytics` block removed); `requireApiPermission`
  folds in **M5.3's core** (reads `roles[requestMountainId]`, returns the tenant).
  ⚠️ **M5.2a and M5.2b are inseparable at the emulator gate** — rules + seed both key
  on the role shape. Emulator **rules tests rewritten (`test:rules`, 11/11)** cover the
  mountain dimension. `scripts/migration/migrate-m5-role-and-about.js` written (dry-run
  default): Phase 1 `currentRole`→`roles[mountainId]` (⚠️ **normalizes legacy
  `'default'`→`geyang`** so the prod admin isn't stranded), Phase 2 copies
  `about_content/about`→`about_content/{mountainId}`. Gates: tsc, smoke 30/30, unit
  39/39, rules 11/11, full e2e 116/13/0. **One benign new log** — a single self-healing
  client-SDK `Listen` connection error during a member test (zero `onSnapshot` in the
  code, no test impact); noted in case it recurs.

✅ **The order-critical cutover RAN 2026-07-23 (owner) in the required sequence:**
(1) snapshot → (2) `APPLY=true` migration → (3) `firestore:indexes` deployed (6 composite,
Enabled) → (4) PR #8 `dev → main` merge (app that stamps `mountainId` + reads
`roles[mountainId]` live) → (5) `firestore:rules` deployed. All of M5 is now live in prod.
Record of the sequence + rollbacks:
[`m5-prod-cutover-runbook`](../manuals/deployment/m5-prod-cutover-runbook.md). ⏳ Only tail:
delete the legacy `currentRole` fields + `about_content/about` + the local backup dump once
the prod CMS is confirmed healthy (see Open threads).

**Executed so far (all on `dev`, 2026-07-19; every phase gated on tsc + smoke +
unit + full e2e + browser pass):**

- **M1 `8920c66` — decoupling:** `src/lib/firebase.ts` deleted (`useAboutPhoto` →
  existing `storage-service.getDownloadUrl`); `feeding-spots-admin-service` on the
  shared `@/lib/firebase-admin` init; map imagery → `map.landscapeImage/portraitImage`
  config (fail-loud).
- **M2 `092d226` — config layer:** tenant getters take a **required
  `mountainId`**; deployment secrets are env-only (Q5 — one Firebase project, no
  per-tenant secrets; `MountainSecrets` gone); `getCurrentMountainId()` →
  `getDefaultMountainId()` (fallback-only semantics); new `src/lib/tenant.ts`
  (`resolveMountainIdOrNull`, `findMountainIdByHost`, `getMountainIdForHost`,
  `getRequestMountainId`) + `MountainProvider`/`useMountain()`; API routes resolve
  tenant per-request from Host; `mountains.json` gains `domains`/`storagePrefix`,
  loses the `mountain-cats-users` scaffolding; 12 unit tests.
- **M3 `491b832` — routing:** every non-API route under `src/app/[mountain]/`;
  root layout = bare shell, tenant layout owns chrome + providers +
  `generateStaticParams` + unknown-id 404; `src/middleware.ts` host→rewrite
  (tenant-prefixed paths pass through; default-tenant fallback keeps
  localhost/preview/e2e URLs unchanged); per-mountain `/api/revalidate`;
  `MountainSelector` navigates for real (mapped host → target `domains[0]`,
  else `/{id}` path); map imagery de-module-scoped (per-tenant in-component).
  **Gate: full e2e 116/0 with zero e2e-spec rewrites** (only the smoke suite's
  structural paths moved). Dev matrix verified: `/`→200, `/geyang`→200,
  `/everest`→404, `/api/*` untouched.

⚠️ **Known dev-only caveat (accepted, plan M3 notes):** browsing a _non-default_
tenant via path prefix, in-app relative links escape back to the default tenant;
host-mapped production subdomains are unaffected. ⚠️ **Local e2e ops note:**
`npm run test:e2e` re-fetches `public/` images from the storage emulator —
run `npm run fetch:assets` before eyeballing media surfaces in dev afterwards.

**Decisions (owner, 2026-07-19):** management-only (no custody) · **B1** one
Firestore + `mountainId` on the 12 content collections · **A1** one Vercel project,
host-based selection, subdomains confirmed · selector is visitor-facing · Q5 moot
(one Firebase project serves all mountains; `mountain-cats-users` scaffolding to be
removed) · shared GA4 property + `mountain_id` dimension · preparatory only (stub
tenant + two-tenant e2e prove it; no real mountain #2 provisioned).

**Shape of the work:** M1 decoupling (retire `src/lib/firebase.ts`, path/config
hard-codings) → M2 config layer to explicit-`mountainId` getters + tenant helpers →
M3 **`[mountain]` route segment + host-rewrite middleware** (riskiest; e2e must pass
unchanged via the default-tenant fallback) → M4 stamp writes + prod backfill
(merge-only) → M5 scoped reads + mountain-aware rules/`requireApiPermission` +
two-tenant isolation e2e + rules deploy → M6 per-mountain assets/storage prefix →
M7 analytics → gtag.js with `mountain_id` → M8 stub tenant + theme wiring + real
provisioning guide + docs close-out.

**How this got here (2026-07-18 session):** started as "replace Firebase with Supabase
to escape vendor lock-in?" → **set aside** (framework §0: zero `onSnapshot` listeners
make an eventual exit easy; $25/mo/project is a per-tenant floor; nothing about a 2nd
mountain is vendor-blocked). Owner requirements locked along the way: **central
auth/user management** (2nd-mountain owner must not set up Kakao/SMS), **localized
content management**, **central analytics with a per-mountain identifier**; drop-down
mountain selection, possibly subdomains (`geyangsan.`/`manisan.mohocats.org`) — **not**
fully thought through yet (framework §2 + Q2/Q7).

**Done before parking — Tier 1 write migration** (commit `6f288d7`, the framework's §6
prerequisite; detail in `log/FEATURE_MOD_LOG.md` + `log/DEBUG_LOG.md` 2026-07-18):
role assignment → `POST /api/admin/assign-role` (Admin SDK, `manage-users`-gated),
role write + `permission_logs` **audit entry in one transaction** — the audit trail
(silently lost since forever: rule-denied client write, swallowed catch) is restored.
Client role-write methods deleted; `users` admin write clause removed from the rules
(owner self-provision clauses kept). Verified: tsc + smoke + e2e `members.spec.ts` 4/4.

**To resume:** answer the framework's §9 questions — **Q1 (custody vs management-only)
gates everything**; then Q2–Q4 pick the deployment/data axes. Everything else in its
§10 sequencing is blocked on those answers. Independent-of-decision items live in its
§8 (storage _paths_ not URLs; retire `src/lib/firebase.ts`; `next/image` prod re-test
on the media surfaces; the §9 PROJECT_PLAN gaps).

### Complexity retirement (refactor) — ✅ COMPLETE — P0–P6 all committed (`6454d80`…`2584dcb`)

Source-verified deep dive + execution plan:
[`complexity-retirement-assessment-20260716.md`](../planning/completed/complexity-retirement-assessment-20260716.md).

Started as a "should we move Next.js/React → HTMX?" feasibility question; answer is **no**
— the complexity is duplication + local-state sprawl _inside client components_, not
framework complexity, and HTMX would land worst on the parts it can't express (client-SDK
auth, Leaflet map, the admin editors). Retire it **in place** instead.

**Reducible surface ≈ 2,800–3,400 LOC across 6 files**, with no framework migration, no
auth rewrite, no deploy-stack change:

- **Target A — admin media editors** (`tag-images` 1,860 + `tag-videos` 2,570 LOC): they
  are **copy-renamed twins that have drifted** (identically-named handlers with structurally
  identical bodies differing only by an `image`→`video` rename — which is why a line-diff
  sees only 3 shared lines). 34 and 41 `useState` each. _(2026-07-18 deep-dive: the
  twin-ness holds for the **read side** only — the write paths diverge structurally
  (Firestore service calls vs YouTube API orchestration), so converge via a
  **toolkit** of shared hooks + presentational components, not the originally-planned
  generic `MediaTaggingEditor<T>`; assessment §1.3a.)_
- **Target B — content forms** (4 files, ~2,133 LOC): two literal-duplicate families —
  Post+ButlerTalk (250 identical lines) and Announcement+Adoption (193). ⚠️
  **`react-hook-form` is a declared dependency used in zero files**; all forms are
  hand-rolled `useState`.
- ⚠️ Both admin editors **hand-roll cat-selection** instead of reusing the existing shared
  `CatSelectorModal` (which the forms already use) — a reuse win available on its own.

**Decisions re-locked (2026-07-18 owner deep-dive — supersede 2026-07-16):** both
targets, **B first** (survives) · **`react-hook-form` DROPPED** — not adopted, the
unused dep is removed in P2 (reverses 2026-07-16) · Target A converges via the
**toolkit shape** (assessment §1.3a), not `MediaTaggingEditor<T>` · behavior-preserving
stays, with one accepted intentional exception: the P4 `CatSelectorModal` swap moves
the editors to **commit-on-done** tag selection (admin `alert()/confirm()` → shared
`ui/Modal` remains a separate P6 follow-up). Plan is 7 gated phases (**P0**–P6) with a
~30-item task list; every phase gates on `tsc --noEmit` + `test:smoke` + browser
verification. **Execution starts only on explicit go-ahead — at P0.**

**Reviewed 2026-07-18 — claims verified, plan amended.** Every quantitative claim
re-checked against source: all exact (duplication is if anything **understated** —
380/346 shared lines in the two form families vs 250/193 stated; 989 common lines
between the "3-identical-lines" editor twins). Amendments: new **P0 characterization-test
phase** (the original verification bar cited the Playwright `admin/` suite, but **no e2e
spec touches the two editors** and only `NewAnnouncementForm` has a text-only create
test — the parity net must be written first, against unrefactored code); YouTube-API
surfaces named as manual-parity-only (P5.4); signed-URL+YouTube strategy lift
re-sequenced P1→P3.0 (point of use); P6.1 scope note (**the four content forms fire
`alert()` too** — converting them is public-facing); `docs/codebase/admin.md` →
`admin-platform.md`; stale `P4`→`P6.1` cross-refs; `useEffect` 3→2.

**✅ Owner deep-dive DONE (2026-07-18, later session)** — a side-by-side source
walkthrough of `tag-images`/`tag-videos` + `CatSelectorModal` + the four forms'
upload paths. Verdicts on the 4 queued items (full detail in the assessment):

1. **Worth it, do it now** — with Target A's retired-LOC projection revised down:
   the write paths (~550+ LOC of YouTube orchestration) are irreducible, so realistic
   total is **~2,100–2,900** (was 2,800–3,400).
2. **`MediaTaggingEditor<T>` rejected** — every mutation diverges structurally (one
   Firestore service call vs multi-step YouTube API orchestration with propagation
   waits), so the generic would be a props-explosion shell. Replaced by a **toolkit**:
   `useMediaListController<T>` / `useDateAutoParse<T>` hooks + presentational set
   (`MediaStatsCards`, `MediaFilterBar`, `BatchActionsPanel`, `MediaGrid`,
   `PaginationBar`, `CatTagField`); pages stay page-owned (assessment §1.3a).
3. **Decisions re-locked:** B-first survives; **`react-hook-form` dropped** (dep
   removed in P2 — the forms' complexity is upload management, not field state);
   behavior-preserving survives with the `CatSelectorModal` **commit-on-done** change
   accepted as intentional. Factual fix: assessment §2.2 — **video upload is YouTube
   in all four forms**; the strategy axis is images only.
4. **Priority:** this track executes next; multi-tenant stays parked (Q1 is thinking
   work, parallelizable).

**✅ P0 DONE (2026-07-19, on explicit go-ahead).** The characterization net exists and
is green against unrefactored code: Family B create-flows now include an image upload
(`admin/posts.spec.ts` — announcement upgraded, 입양홍보 new) and both editors have
characterization specs (`admin/tag-images.spec.ts`, `admin/tag-videos.spec.ts` —
YouTube-orchestrated writes excluded per P5.4; the video editor's automated net is
load/form/local-tagging/title-parse + the Firestore-only bulk 자동 날짜 인식).
Supporting infra: `media.json` +2 images/+1 video (auto-parse targets),
`albums.spec.ts` adjusted, one scoped console-watchdog allowance for the
credential-less `/api/manage-playlists` 500 on tag-videos mount. Full-gate baseline
**112 passed / 13 skipped / 0 failed** + tsc + smoke green. Detail + pinned-behavior
notes: assessment §8 P0 (execution notes).

**✅ P1 DONE (2026-07-19).** `src/components/forms/` now holds `MediaUploadField`
(presentational hybrid file+URL section; `kind` selects the shared image/video label
set) and `uploadStrategies.ts` (`uploadImagesToStorage` verbatim from
NewAnnouncementForm with the path prefix parameterized; `uploadVideo(s)ToYouTube`
with optional Family-A fields — its stricter failure handling reconciles at P3).
Unit tests (6) + smoke structural checks; vitest gained the `@`→`src` alias.
**No form imports these yet** — zero behavior change; gates green (tsc, unit,
smoke 29/29). Detail: assessment §8 P1.

**✅ P2 DONE (2026-07-19).** Family B migrated onto `useSimpleContentForm` +
`MediaUploadField` (899→248 lines; `react-hook-form` uninstalled). Full e2e
**114/13/0** — the P0.1 create-flow specs (incl. image upload → public surface)
passed against the migrated forms, and the net gained whitespace-validation specs
for both. Detail: assessment §8 P2.

**✅ P6 DONE (2026-07-19, committed `2584dcb`) — follow-ups.** All ~45 native
`alert()/confirm()` prompts (both editors incl. `useYouTubeVideoMutations`, and the
four public forms via their shared form hooks) converted to a new promise-based
**`ui/useDialog`** primitive on the shared Modal — `await dialog.alert/confirm`
preserves the old blocking sequencing. The four e2e specs' native-dialog handlers
were replaced with role=dialog Modal assertions in the same change (as the P0 net
required). One non-obvious bug caught and fixed by the net: the dialog's unmount
re-render canceled the post-submit `router.push` transition — resolution is now
deferred until after the unmount commits (`DEBUG_LOG` 2026-07-19). Docs refreshed
(P6.2: PROJECT_PLAN §7 → executed, admin-platform + media-and-youtube toolkit
notes) and the close-out logged (P6.3: FEATURE_MOD_LOG entry; assessment status →
✅ EXECUTED). Final gates: full e2e **116/13/0**, tsc, smoke 29/29, unit 25/25.

**✅ P5 DONE (2026-07-19, committed `ea2fab4`) — Target A recomposed.** Both editors
rebuilt on the `src/components/admin/media/` toolkit: `tag-images` 1,715→821 lines
(controller + auto-parse hooks + full presentational set; hand-rolled Lightbox →
shared `ui/Lightbox`; dead `batchUpdateImages` deleted), `tag-videos` 2,450→1,261
lines + a colocated 570-line `useYouTubeVideoMutations` (YouTube orchestration
verbatim, page-owned, NOT genericized; playlist panel/modal page-owned). Drift
between the "twins" absorbed as toolkit knobs (`dateFilterExcludesUndated`,
stats/batch column counts, pagination `windowSize`); the videos **filter panel
keeps page-owned markup** (its layout drifted — unifying it is a product decision,
queueable with P6). Verified: full e2e **116/13/0** against the recomposed pages,
tsc, smoke 29/29, unit 25/25, plus full-page screenshot passes of both editors.
⚠️ P5.4's **scripted manual YouTube pass** (sync + playlists, real creds) stays
owner-owed before the next `dev → main` promotion.

**✅ P4 DONE (2026-07-19, committed `34c5c68`).** Shared-`CatSelectorModal` swap in
both editors (commit-on-done; dead `'youtube-batch'` context dropped) + the
toolkit skeleton + `parseCreatedDateFromFilename` → `@/utils/dateParser`
(converged with the title parser). Verified: full e2e 116/13/0 + screenshot pass
over all four selector contexts; toolkit interfaces owner-approved at P4.5. Detail: assessment §8 P4.

**✅ P3 DONE (2026-07-19, committed `1d13e09`).** What it contains (detail:
assessment §8 P3):

- `useRichContentForm` + `uploadImagesWithSignedUrls` (canonical
  `{signedUrl, publicUrl}` + PUT ok-check — **fixes 집사톡's broken image upload**,
  `DEBUG_LOG` 2026-07-19) + the `!result.videoUrl` guard reconciled into the shared
  YouTube strategy; `NewPostForm` 697→363 and `NewButlerTalkForm` 539→248 migrated;
  +5 unit tests (25 total); `tests/e2e/admin/butler-create.spec.ts` (Family A
  text-only creates + `CatSelectorModal` wiring — media paths are manual-parity by
  design, see the spec header).
- Gates all green (2026-07-19 re-run): full e2e **116 passed / 13 skipped / 0
  failed** (first run's single failure was the new spec's `/완료/` locator matching
  both the modal's `완료 (n개 선택)` and the page's `작성 완료` submit; fixed to
  `/완료 \(/`; the earlier "expect 117" was an off-by-one — the new spec adds 2
  tests to the 114 P2 baseline). tsc 0 / smoke 29-29 / unit 25-25.

⚠️ Before the next `dev → main` promotion, the Family A media paths (YouTube
upload, signed-URL images) owe the **scripted manual pass** on Preview.

---

## Open threads / owner-owed

- **`[ ]` Signing out logs a Firestore permission error, and the fallback swallows it
  (found 2026-08-02, NOT fixed).** On sign-out a permission read lands unauthenticated and
  `permission-service.ts:48` logs
  `Failed to load permission config from Firestore: FirebaseError: false for 'get' @ L135` —
  `firestore.rules:135` gates `role_permissions/role-config` on `request.auth != null`, and
  `AuthProvider` holds a `getPermissionService()`. Cosmetic today (the `catch` falls back to the
  local config), but it is a **real read that should never be issued**, and the catch **swallows
  and substitutes defaults** rather than re-raising — against the repo's error convention, so a
  genuine config failure would look the same. 🔑 **Deliberately not fixed in the post-layout
  change:** the guard belongs in `AuthProvider`, which carries an explicit do-not-touch warning
  after the 2026-08-02 hydration bug, and silencing it in the e2e watchdog would hide a genuine
  app behaviour. ⚠️ **Do not "fix" this by allow-listing it** — only the neighbouring
  `Could not reach Cloud Firestore backend` transport noise is allow-listed, and that one is
  provably retried-and-recovered by the SDK.
- **`[ ]` Live-verify the auth changes on Preview (2026-08-02).** ⏳ **Unreachable from the
  emulator** — it has no Kakao and no SMS, so the automated suites stay green regardless. Three
  things: a **real Kakao sign-in** and its **linking fallback** (the PII-logging fix touched both
  code paths), and the **orphan-delete path**, which needs a genuinely new phone number or Kakao
  account — sign in with one that has never registered, expect the "not found" modal, then
  confirm in the Firebase console that **no Auth account is left behind**. ⚠️ Signing in with an
  account that _has_ registered proves nothing here; the delete only runs for someone with no
  profile doc and no password credential.
- **`[ ]` Owner call: should `설명 없음` come back on the photo modal? (2026-08-02.)** Converging
  the modal albums onto `MediaTile` removed it, because the shared tile drops empty-state fillers
  by design and the two hand-rolled copies had simply never been updated. A photo with no
  description now shows only its date. One line to restore if the filler is wanted — but then the
  shared tile is the place to do it, so both grids agree.
- **`[ ]` Existing photo records still carry fabricated 촬영일 (2026-08-02).** ✅ **The owner
  fixed the affected photos by hand**, so this is recorded only for the general case: **videos
  self-heal** (the next metadata sync overwrites `createdTime` from YouTube, which has none →
  `null`), but **photos do not** — `cat_images` has no upstream, so any remaining wrong date stays
  until someone edits it in `tag-images`. A one-off script could clear dates equal to their own
  `uploadDate`, but that heuristic would also clear legitimately same-day photos; not obviously
  worth it.
- **`[ ]` Tap the 이 냥이 링크 chip on a real phone (2026-08-01).** The **mobile** half is the
  only part still proven by stubs alone, and that is precisely the gap that shipped a dead button
  to desktop: both pre-ship passes stubbed `navigator.share`, so neither could see desktop Chrome
  refusing it. Expected on a phone: the OS share sheet, carrying the cat's name and a
  `/pages/cats?cat=<id>` link. Desktop is verified by a real click (copies, says 복사했어요).
  ⚠️ If the sheet does **not** appear on iOS, suspect transient activation first — `navigator.share`
  is called synchronously in the handler for exactly that reason, and any `await` added ahead of
  it would break this without breaking anything a test can see.
- **`[ ]` Owner call, not blocking: a GA4 `page_view` now fires per cat-modal open.** The URL
  genuinely changes, and `AnalyticsTracker` fires on every `searchParams` change — standard SPA
  behaviour, and arguably right now that a cat is an address. But `/pages/cats` view counts will
  include modal opens, so the page will look busier than it did. `page_path` stays `/pages/cats`
  (only `page_location` carries the cat), so reports do not split per cat. Suppressing it means
  teaching `AnalyticsTracker` to ignore the `cat` param — a few lines, deliberately not done.
- **`[ ]` Safari pass on the deployed Preview (2026-08-01)** — confirm the 30-second stall is
  gone now that the browser is forced onto long polling. ⚠️ Whatever buffers that connection may
  be the owner's ISP or a proxy rather than Safari itself, so other visitors may never have hit
  it; the local dev server has no proxy in front of it to reproduce against. If it recurs, the
  set-aside alternative is capping the probe's wait rather than skipping it
  (`experimentalLongPollingOptions.timeoutSeconds`, minimum 5) — PROJECT_PLAN §12.
- **`[ ]` One owner decision from 2026-08-01, not blocking:** whether the CMS's new
  "YouTube에 없는 영상" panel should show thumbnails instead of a title list. **Text-only is
  deliberate** — a deleted video's thumbnail _is_ YouTube's grey placeholder, the very image that
  made these look broken, so a thumbnail grid would be a row of grey boxes.
- 📌 **`youtubeStatus` is absent on any record never checked, and absent means watchable.** The
  public filter runs **in memory, deliberately not as a Firestore `where`** — an inequality would
  exclude exactly the unchecked records, i.e. every pre-existing video. Anything that later
  queries on this field must keep that in mind.
- **`[ ]` Two owner decisions from 2026-07-31, neither blocking:**
  - **A video's 제목 now appears twice** — once in YouTube's own player overlay, once as our
    caption under the embed. Correct, arguably redundant. Dropping the caption title for videos
    is a one-line change in `PostMedia`; left in because the owner explicitly asked for the
    title to be visible.
  - **An 입양홍보 popup can displace a 공지사항 one.** Today: **one popup per visit, most
    recently updated wins** across both kinds — the pre-existing rule extended, not a new one.
    The alternatives (both show, or announcements always win) are a product call.
- ✅ **RESOLVED 2026-08-02 — the suite is green (3× consecutive 199/13/0).** What this entry
  used to call a "timing-sensitive set" was **three real bugs**, one of them in app code
  (`services/firebase.ts`), one a spec mutating a fixture six others read, one a set of specs
  acting before async state resolved. Full chain: `log/DEBUG_LOG.md` 2026-08-02.
  🔑 **The lesson worth carrying: "passes in isolation" means _interference_, not slowness.**
  This entry's own guess — that the 동참 pair had a cross-spec **data** dependency — was wrong
  (`admin/members` submits its own contact with a unique name); what they actually shared was
  the hydration race. Reading the symptom as "needs a longer timeout" is what kept it open.
- ✅ **RESOLVED 2026-08-02 — the hydration mismatch that wiped typed input.** `AuthProvider`
  seeded `useState` from `auth.currentUser` — a browser-only value read during render — so the
  header disagreed with the server and React rebuilt the whole root, remounting every
  component and erasing text already typed. Now seeded from `null`, with `onAuthStateChanged`
  updating after hydration. Verified: the console error is gone on `/pages/contact` **and** on
  `/admin/cats` (the page that reproduced it most reliably), header still resolves to the
  signed-in user, full e2e 2× 199/13/0.
  🔑 **Rule to keep:** nothing the server could not have known may affect the **first** client
  render — read it in `useEffect`. 💡 Cost: one tick of logged-out header per full page load.
- 📌 **`PostMedia` is now the single renderer for a post's media** (`AnnouncementModal` →
  `PostModal`, the 입양홍보 feed card, and `/pages/announcements/[id]`). A fourth surface should
  use it, not copy it — the three copies that existed had each drifted into different
  capabilities and different bugs, which is what produced every media defect reported on
  2026-07-31. It takes a `layout` prop (`compact` for modal/feed, `full` for a dedicated page):
  check what a surface looked like before generalising onto it.
- **🔄 "One video per post" was REVERSED before it was built (owner, 2026-07-30) — do not
  implement a cap.** The 2026-07-29 decision read "remove multiple-video upload from the
  composers"; the owner replaced it the next day: 공지사항 / 입양홍보 are admin-only, so admins
  stay **unrestricted**, and what those forms were actually missing was 집사톡's _per-file_
  upload — the opposite of a cap. That half is **done** (§10d D1). What survives is
  **`[ ]` D2 — a CMS-controlled toggle** for whether multiple upload is allowed, **not
  started**. ⚠️ "CMS-controlled" **rules out `mountains.json`**: it is a static import that only
  changes on redeploy, so a toggle there is not a CMS setting — it needs Firestore-backed config
  (the `admin_config` shape the YouTube credential already uses). Open questions for whoever
  picks it up: which forms it governs, whether video and image toggle separately, and whether it
  is per-mountain. Spec: PROJECT_PLAN **§10d**.
  - 📌 **Not a bug — do not re-investigate.** Videos looked greyed-out and unselectable in
    공지사항's picker while the same files worked in 집사톡's. The **image** picker was being
    used: it is **first** in 공지사항 but **second** in 집사톡, so muscle memory lands on the
    wrong one, and `accept="image/*"` correctly disables videos. Both components resolve
    `accept` from the same `kind` prop and both pass it correctly. The external drive was a
    red herring. Aligning the section order is **proposed, not decided** (§10d D3).
- ✅ **RESOLVED 2026-08-01 — shareable link to one cat's modal (decided 2026-07-29).** Shipped as
  `?cat=<id>` (`ba224b7`) plus the 이 냥이 링크 chip (`541ef7d`, fixed for desktop in `a96a62b`).
  Keyed on the cat **id** as required. Detail: PROJECT_PLAN **§10c**.
  - 📌 **Still true, and still the reason to revisit `/pages/cats/[id]` one day: it does not fix
    link previews.** The app has **no `generateMetadata`/`openGraph` anywhere**, so a shared cat
    link renders the same generic card as the homepage — the preview card does not show the cat.
    Now that sharing is one tap, this is the remaining half of "a good share", and it matters
    most for **입양홍보**, where the card does the persuading. The owner declined the per-cat
    page on cost (2026-07-29); nothing about the param work forecloses it.
- 🔑 **Owner-owed, local only:** `.env` still sets
  `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=mountaincats-61543.firebasestorage.app` — the
  **pre-migration** bucket. Local uploads therefore succeed into a bucket nothing reads.
  Change it to `mountaincats-61543`. (`.env.example` corrected 2026-07-29; `.env` is
  git-ignored.) ⚠️ Anything uploaded from localhost since the Seoul migration is **stranded**
  in the old bucket — worth a look before writing that bucket off.
- ✅ **RESOLVED 2026-07-31 — image upload works on `dev`** (owner: "media uploads are working
  fine from both 공지 and 입양홍보"). The Admin-SDK `cat_videos` fix is corroborated too: the new
  per-medium tag lookup reads that record, and it resolves, which it could not if the write were
  still being denied.
  - ⏳ **Still unverified on the deployed Preview:** the **입양홍보 popup** (needs a _fresh_
    session — it is `sessionStorage`-gated, so a reload will not re-show it) and the
    **duplicate-filename 409**. The 409 is the one path with **no automated coverage at all**:
    `getSignedUrl` signs with a service-account key the credential-less e2e harness does not
    have, and the Storage emulator does not implement signing — verified empirically by running
    with the stub disabled (`Could not load the default credentials` → 500). No emulator
    configuration fixes that.
- ✅ **RESOLVED 2026-07-29 — no composer invents tags any more.** 집사톡 had a `산고양이`
  fallback and 공지사항 / 입양홍보 attached a fixed `공지사항` / `입양홍보` to every video.
  Both made `needsTagging` false, hiding exactly the videos the tagging queue exists to
  surface. Both are gone (owner's call); `youtubeDefaults.tags` was **removed from the config
  type** rather than emptied, since neither Family-B composer offers a tag input at all.
  ⚠️ **Existing videos are not retroactively fixed** — anything already uploaded still carries
  the invented tag and still reads as tagged. Only new uploads land in the queue.

- ✅ **The two P5.4 YouTube bugs are FIXED (2026-07-26) — the manual pass can resume.**
  Both were surfaced by the pass's first step on Preview and neither is reachable by any
  automated test (the emulator has no YouTube credentials), so **the pass must re-run from the
  top**: the fix changes which credential every route uses.
  - **Bug 1 — split credential source.** `/api/admin/youtube-auth/callback` writes the fresh
    refresh token to **Firestore** (`admin_config/youtube_auth`), but every consuming route went
    through `getYouTubeOAuthConfig()`, which read **env only** — so a stale
    `YOUTUBE_REFRESH_TOKEN` shadowed it and re-authorizing changed nothing. Two extras found
    while fixing: `upload-youtube`'s apparent Firestore fallback was **dead code** (it needed
    the client id/secret from the very config whose absence triggered it), and the same
    all-or-nothing gate meant **`auth-url` refused to start the OAuth flow without a refresh
    token already present** — a bootstrap deadlock on a fresh deployment. Correction to the
    original write-up: **`refresh-video-metadata` was never affected** (it uses the public API
    key, not OAuth).
  - **Fix:** new `src/lib/youtube/credentials.ts` — one resolver for the single shared
    credential, splitting **client identity** (env; effectively never rotates) from **the
    refresh token** (rotates every 7–14 days). All six OAuth consumers migrated;
    `getYouTubeOAuthConfig()` deleted.
  - 🔑 **`YOUTUBE_REFRESH_TOKEN` is gone — the token lives only in Firestore** (owner's call,
    stricter than the originally-planned env → Firestore fallback, which wouldn't even have
    fixed the reported symptom: the stale env token _was_ set and would still have won). A
    fallback was rejected too — it keeps the same failure shape whenever the Firestore doc is
    missing, and earns nothing, since obtaining a token needs client identity only. Follow-ons:
    the status route reports one source instead of two (it used to show Firestore's timestamp
    against the env token); the callback page no longer prints the raw token; `scripts/auth/`
    (the command-line generate-and-paste workflow) deleted; `.env.example` updated.
    ⚠️ **Do not delete the var from Vercel _Production_ before this promotes** — `main` is
    pre-fix and env-only there, so removing it turns YouTube off. Preview can be cleared now,
    and clearing it is the sharpest version of the P5.4 test.
  - **Bug 2 — `manage-playlists` POST channel ID.** `batch_update_playlists` read
    `process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID`, set **nowhere**, so every playlist-membership
    save 500'd; the GET beside it already used `getYouTubeChannelId(authz.mountainId)`. Missed
    when M1 moved channel config out of env vars — both a live bug and a multi-tenant leak.
    Fixed with the tenant-aware getter (no env var added).
  - **Bug 3 — the admin OAuth flow asked for too few scopes** (surfaced immediately after the
    above, on the owner's retry: _"Insufficient Permission"_ on a metadata edit). That message is
    **Google's**, not our gate's ("Insufficient permissions", lowercase/plural) — the token
    lacked the **OAuth scope**. `auth-url` requested only `youtube.upload` + `youtube.readonly`,
    which cover `videos.insert` and reads but **not** `videos.update` or
    `playlistItems.insert/delete` (those need `youtube` / `youtube.force-ssl`). The retired
    `scripts/auth/generate_youtube_refresh_token.js` requested all four, so the token actually in
    use carried them — meaning **the admin panel had never once minted a token that could edit
    metadata**, and only fixing the source above put that token into play. ⚠️ **Exposed by, not
    caused by, the credential fix**: two latent bugs were stacked, the wrong source hiding the
    wrong scopes. Fixed by requesting the CLI script's four scopes. **Requires a
    re-authorization** — scopes are fixed at consent time, so an existing token can't gain them.
  - **Net:** `tests/unit/youtubeCredentials.test.ts` (9 tests) pins the precedence. Gates: tsc
    0, smoke 30/30, unit 80/80, full e2e green. Detail: `log/DEBUG_LOG.md` 2026-07-26.
  - 📌 **Operator note:** the button is **`🔄 토큰 갱신`** on 동영상 관리 — and despite the name
    it runs the **full consent flow**, not a silent refresh, which is why it's also the fix when
    a token's _scopes_ are wrong rather than expired. Click it, sign in, let the window close.
    No env edit, no redeploy, nothing else to keep in sync.
  - 📌 **Known gap, logged not fixed:** the status panel validates a token by refreshing it,
    which succeeds regardless of scope — so a scope-starved token still reports
    유효한 토큰이 있습니다. Same shape as the timestamp bug: reassuring about a credential that
    can't do the job. Detecting it means probing a write endpoint (a product call).
- ✅ **Three more `/admin/tag-videos` bugs found & FIXED 2026-07-26** (`b5f08b7`, `80ba04a`,
  `dc8391f`) — all found by **reading the page while writing its button spec**, none reported,
  none catchable by the existing suites. Full detail in `log/DEBUG_LOG.md`; per-button
  behaviour in [`tag-videos-spec.md`](../manuals/admin-manual/tag-videos-spec.md).
  - **`자동 날짜 인식` wrote Firestore, so its dates were erased.** Video data is
    YouTube-owned and `refresh-video-metadata` rebuilds Firestore from YouTube as a straight
    overwrite (`createdTime: youtubeRecordingDate ? … : null`) — so for exactly the dateless
    videos that button targets, the next sync **or any other save on that video** wrote
    `null` back over the parsed date. Now writes YouTube first, then syncs back.
  - **Batch playlist save ignored the selection.** The modal's save always acted on the video
    open in the edit form, so the batch entry point updated one video — or silently none.
    Now applies to every selected video, **set semantics** (each video ends up in exactly the
    ticked playlists), opening unticked and confirming first because that removal is
    destructive.
  - **Every sync reset 게시일 to "now".** `refresh-video-metadata` wrote
    `uploadDate: new Date()`, and since the admin grid, the **public 영상첩** and the per-cat
    lists all sort by `uploadDate` desc, any edited video jumped to the top of the public
    album with today's date. Now sourced from YouTube's `publishedAt` — so mis-stamped
    records **self-heal on their next refresh, no migration needed**. Two crossings fixed
    alongside: `uploadedBy` was forced to `'admin'` (erasing `'youtube_sync'`), and the edit
    timestamp was written as `lastMetadataRefresh` — a field nothing reads — while the field
    the UI _does_ read (`updated`) was written nowhere, leaving 메타데이터 수정 permanently
    blank. It now writes `updated`.
  - 🔑 **Principle adopted (owner, 2026-07-26): YouTube is the source of truth for videos; no
    UI path may write video data to Firestore.** Anything written there is undone by the next
    sync, so such a write is broken by construction, not merely risky. `/admin/tag-videos` now
    makes **zero** direct Firestore writes (`videoService` there is reads-only), and
    `videoService.updateVideo` has no callers left. Recorded for operators in
    [`admin-manual` §6](../manuals/admin-manual/README.md). ⚠️ The same null-overwrite applies
    to `tags`, `location`, `title`, `description` — the rule, not a code guard, is what stops
    the next occurrence.
  - ⏳ **Unverified against real YouTube** (emulator fixtures have no publish dates and no
    credentials): the 게시일 repair, 메타데이터 수정 appearing, `자동 날짜 인식`, and the batch
    playlist save. All four are stubbed in e2e — see the fresh-session box at the top.
- ✅ **Batch edits never reached Firestore — FIXED 2026-07-26 (owner-reported).** Batch tag /
  촬영일 / playlist saves applied to YouTube but the site's copy only updated after a manual
  📺 YouTube와 동기화; individual saves synced automatically. `/api/refresh-video-metadata`
  takes **YouTube video ids** (it queries the Data API, then finds the doc by
  `where('youtubeId','==',id)`), but the batch loops recorded the **Firestore doc id** from
  the selection and sent those — a 404 the caller swallowed (`if (res.ok) log(…)`, no `else`),
  so the dialog still said 완료. `saveVideoMetadata` was immune because it resolves the
  YouTube id once and reuses it. Fixed: results keyed by `youtubeVideoId`; the refresh call
  extracted into `syncToFirestore()`, which **returns** success and logs the status + body;
  on failure the dialog now says the change reached YouTube but not the site and to press
  동기화. ⚠️ **The fixtures had made this untestable** — no seeded video had a `youtubeId`, so
  `youtubeId || id` collapsed to the doc id; both now carry a distinct one
  (`yt-vid-01/02`), matching production. New regression test asserts the PUT **and** the
  refresh both carry the YouTube id.
- 📌 **New workstream started: per-page admin button spec sheets.** The first is
  [`tag-videos-spec.md`](../manuals/admin-manual/tag-videos-spec.md), organised by **what each
  button writes to** (🔴 YouTube→Firestore = public and irreversible, vs ⚪ local) — a
  distinction the UI itself doesn't show. Owner wants the same for the other CMS pages.
  ⚠️ It is **source-derived, not browser-verified** — worth a `/chrome` pass over the live
  page before cloning the format.
- ⏸️ **DEFERRED — 촬영일 is guessed from the filename when it should be read from the file.**
  Logged 2026-07-27; **the owner explicitly deferred this and does not want it picked up
  soon.** It is **not queued work** — it is recorded so that whoever wonders why 촬영일 comes
  out empty or wrong (an iPhone upload, say) finds the answer instead of re-deriving it. Do
  not start it without the owner asking. The composers derive 촬영일 by regex-matching the
  **filename** (`parseRecordingDateFromTitle`, 4 patterns: `yyyy-mm-dd hh.MM.ss`,
  `yyyymmdd_hhMMss`, `yyyy-mm-dd`, `yyyymmdd`). Nothing reads the file's own contents.
  Consequences, verified against realistic names:
  - **iPhone files never parse.** `IMG_1234.MOV` / `.HEIC` carry no date in the name, so the
    field is left empty and — unless someone types it — `createdTime` silently becomes the
    **upload** moment. Android/KakaoTalk names (`VID_20260315_101530.mp4`) parse fine, so the
    feature works for roughly half of likely sources.
  - **The last pattern is loose** — any 8 digits forming a valid date. `회원 20240101 명단.mp4`
    reads as 2024-01-01. Invalid combinations self-reject, so it is contained but can be
    confidently wrong.
  - 🔑 **The eventual fix, whenever the owner calls for it (shape agreed 2026-07-27):** read
    the **capture date from the file's metadata**,
    with timezone when the metadata carries it, and fall back to the filename only when that
    fails. Applies to **both** video and photo. Landscape: MP4/MOV `mvhd` creation_time is
    spec'd UTC but often written as local with no offset (unreliable); Apple's
    `com.apple.quicktime.creationdate` **does** carry an offset; JPEG EXIF `DateTimeOriginal`
    has no zone historically, with `OffsetTimeOriginal` added in EXIF 2.31 and unevenly
    populated. Needs a client-side binary parse (e.g. `exifr` + an MP4 box reader) before
    upload — a new dependency and a real chunk of work, hence deferred.
  - 📌 **Cheap interim option, not taken:** `File.lastModified` is already on the picked file
    for free and would beat "upload time" for the iPhone case, though it is the filesystem
    mtime rather than true capture time.
  - _Distinct from the timezone bug fixed the same day_ (`DEBUG_LOG` 2026-07-27) — that one
    was about the parsed date shifting a day; this one is about parsing the filename at all.
- 📁 **Everything gated on "before a real mountain #2" now lives in one doc:**
  [`mountain-2-prerequisites.md`](../planning/pending/mountain-2-prerequisites.md) (created
  2026-07-28). It absorbed this hand-off's `syncVideos()` thread and the 계양산 playlist
  chore, plus the same items previously scattered across the multi-mountain plan's deferred
  list, PROJECT_PLAN §9, and the 2026-07-18 decision framework. **Do not re-add them here** —
  add to that doc and leave this one pointing at it. Nothing in it is urgent (manisan is a
  hidden stub with no prod data); it is a gate, not a backlog. It also records the
  **decided-and-closed** items so they aren't re-litigated — notably that multi-mountain
  admins **re-logging in when switching mountains is accepted, won't-fix** (owner,
  2026-07-28).
  - 🚨 **One item there is a security defect, not a rough edge — prerequisites §1.1:
    `로그아웃` does not sign the user out of the other mountains.** `signOut(auth)` clears
    only the origin it runs on, so a user who logs out on one subdomain stays logged in on
    the others, indefinitely and invisibly — including, for a dual-mountain admin, a live
    CMS session. It also hollows out the admin idle timeout, which signs out the same
    per-origin way. **Zero exposure today** (production serves one origin and the subdomains
    do not resolve), which is why it is a gate rather than an incident — but it is the
    **first** thing to fix before a second subdomain goes live, ahead of everything else on
    that list. Recommended fix: server-side `revokeRefreshTokens(uid)` on sign-out.
    - ✅ **SUPERSEDED the same day by the path-based decision.** With a single origin the defect
      becomes **structurally impossible** rather than fixed, so `revokeRefreshTokens` drops from
      prerequisite to **optional hardening** — it would now buy only multi-device sign-out.
      **Nothing to implement**; prerequisites §1.1 gets deleted by the migration's T7 doc pass.
      Same for §1.5 (geyang's own subdomain), §1.6 (bare links — promoted into the migration's
      actual work) and most of §2 (ops externalities). ⚠️ Still live either way, so do not
      assume they went with it: §1.2 `syncVideos()`, §1.3 the playlist back-fill, **§1.4 the
      members roster leaking every mountain's users**, §3.1 the CMS mountain label.
- ✅ **M6 — no prod cutover needed (resolved 2026-07-25).** The upload-prefix wiring is a
  no-op for geyang and only affects a future tenant; prod thumbnails/album photos already ride
  on tenant-scoped Storage URLs, so there is nothing to migrate. (The drafted thumbnail
  migration was reverted after a dry-run found 0 changes.)
- ✅ **M7 — GA4 console setup DONE by the owner 2026-07-26** (pending post-redeploy
  verification). What was done: the **Firebase-linked GA4 property is reused** (same
  measurement ID the retired `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` held — pre-M7 history and
  new gtag data stay in one property); `mountain_id` registered as a **custom dimension**
  (scope Event); `NEXT_PUBLIC_GA_MEASUREMENT_ID` set in Vercel **Production only** —
  deliberate, to keep `dev` traffic out of the data; Enhanced measurement turned **on** with
  **"Page changes based on browser history events" off** (that sub-option would emit a second,
  `mountain_id`-less `page_view` per navigation → ~2× counts). ⏳ Verify Realtime/DebugView
  after the prod redeploy. Full runbook incl. all of the above:
  [`admin-manual/google_analytics.md`](../manuals/admin-manual/google_analytics.md).
  - ✅ **Gap closed same day:** `mountain_id` was attached per-event to `page_view` only, so
    the newly-enabled Enhanced-measurement events (scroll, outbound click, file download, video
    engagement, form interaction) carried none. `AnalyticsTracker` now calls
    `gtag('set', { mountain_id })` first, making it a **default parameter on every event**.
    Residual limit: only events after hydration inherit it (the root layout sits above
    `MountainProvider`, so it can't be set in the gtag `config` call) — automatic events need
    interaction, so they land later anyway.
  - ⚠️ **Sequencing trap — production is pre-M7.** `main` still runs `getAnalytics(app)` off
    `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` and reads `NEXT_PUBLIC_GA_MEASUREMENT_ID` **nowhere**.
    On that build the new var does nothing and deleting the old one **turns analytics off**.
    Keep **both** set on Production until M7 promotes and Part B verification passes; only then
    delete the Firebase one. Recorded as step **A0** of the GA4 guide.
  - 📌 **Form interactions** (newly enabled) widens automatic collection on the 동참/content
    forms — worth checking against the 개인정보처리방침 with the compliance carry-overs.
- ✅ **M5 prod cutover — DONE 2026-07-23 (owner-run).** Ran in the required order:
  snapshot → `APPLY=true` migration (`currentRole`→`roles`, `'default'`→`geyang`) →
  `firestore:indexes` (6 composite, Enabled) → PR #8 `dev → main` merge → `firestore:rules`.
  Multi-mountain is live in prod. Runbook kept as the record:
  [`m5-prod-cutover-runbook`](../manuals/deployment/m5-prod-cutover-runbook.md).
  - ⏳ **Post-cutover cleanup (owner, low-priority, do once prod CMS is confirmed healthy
    over a few days):** the migration left the legacy fields in place for reversibility —
    delete the old `currentRole` fields on user docs + the `about_content/about` doc
    (superseded by `about_content/geyang`), and delete the local backup dump under
    `backups/firestore/` (holds an OAuth refresh token + PII).
  - 📝 The `manisan` stub is `hidden: true`, so on prod `/manisan` is routable but has no
    content and is absent from the public selector — harmless. It has no prod data (it was
    only ever seeded in the emulator).
- ✅ **CI updated for the M5 test surface — DONE 2026-07-23 (thread resolved).** All
  three pieces closed:
  1. ✅ **`npm run test:rules` wired into CI.** A dedicated emulator-backed `rules` job in
     `.github/workflows/ci.yml` (checkout → setup-node → setup-java 21 → `npm ci` →
     Firebase-emulator cache → `npm run test:rules`), gated on `needs: checks`, running in
     parallel with `e2e`. No browser install (rules tests need only the Firestore
     emulator). This was the actual gap — the default `npm test` **excludes**
     `tests/rules/**` (they need the emulator), so CI's `checks` job never ran them.
  2. ✅ **Second stub mountain (M5.4a) + isolation e2e (M5.4b).** `manisan` in
     `mountains.json` (`hidden: true`) + seeded; `tests/e2e/api|public/tenant-isolation.spec.ts`.
     The isolation e2e is covered by the existing `e2e` job (`npm run test:e2e` globs all
     of `tests/e2e/**`), so it needed no extra wiring. Full e2e **125/13/0**.
  3. ✅ **The e2e seed/gate assumes the `roles`-map shape** (M5.2) — kept in sync (the seed
     builds per-user `roles` maps).
- ✅ **7 ungated write/credential API routes — FIXED 2026-07-26 (thread resolved).** They
  had **no auth gate at all**. Six now open with `requireApiPermission`, and every in-app
  caller sends its ID token via `authHeader(user)`; the seventh was **deleted as dead code**
  (below). Permission per route **mirrors the `firestore.rules` clause already guarding the
  resource it touches**: `generate-signed-url` → **`manage-photo`** (its uploads become
  `cat_images`); `upload-youtube`, `update-youtube-video`, `refresh-video-metadata`,
  `manage-playlists` (GET+POST), `youtube-playlists` → **`manage-video`** (mirrors
  `cat_videos`). So each route is exactly as permissive as the write it enables and **no
  working flow lost access**. New net: `tests/e2e/api/media-route-authz.spec.ts` (21 tests —
  401 unauthenticated / 403 for a butler / past-the-gate for an admin, on all 7 method+route
  pairs). Gates: tsc 0, smoke 30/30, unit 71/71, **full e2e 146/13/0**. Detail +
  the status-vs-message gotcha: `log/FEATURE_MOD_LOG.md` 2026-07-26.
  - 🗑️ **`generate-youtube-signed-url` DELETED (owner-approved 2026-07-26).** No caller
    anywhere, and `git log -S` over all history showed every reference outside its own
    folder was **documentation** — it has had no code caller since the commit that created
    it (`b901359`, pages-router → app-router), superseded by `upload-youtube`. No env var
    orphaned (`getYouTubeOAuthConfig()` reads the same four).
  - 📌 **Left as-is (owner's call 2026-07-26):** the butler post pages
    (`/pages/butler_{stream,talk}/new`) gate only on `isAuthenticated` — their writes
    already fail at the `posts_butler` rule without `manage-posts` (nothing leaks), but a
    signed-in user without it only finds out on submit. Accepted.
- **탈퇴 flow live click-through** with a **throwaway** account — it irreversibly
  deletes, so it hasn't been end-to-end clicked in prod yet.
- **Compliance carry-overs** (deferred, accepted — reopen before scaling membership):
  professional/legal review; phone-login-as-signup + Kakao social-signup consent;
  security audit vs the PIPA safety-measures standard; Kakao scope verification.
- **Branch-workflow decision (undecided):** keep the `dev`-promotion model (promote
  with **merge commits**, as PR #7 did — no drift) **or** move to **GitHub Flow**
  (delete `dev`, short-lived branches off `main`, squash-merge). Both viable;
  merge-commit fits promotion, squash fits GitHub Flow.
- **Deferred e2e Phase 8** (not required for "done"): Vercel Preview smoke, WebKit/iOS,
  visual-regression, Lighthouse/perf, YouTube-tagging flows (`playwright-ci-plan.md` §8).
- **Older carry-over:** album-nav un-greying action.

---

## Commit state & branch position (as of this update)

✅ **The working tree is clean and everything is pushed.** `origin/dev` = **`fa2f87b`**.

The only things left in the tree are **not** from this workstream and must not be swept into a
commit: a `.gitignore` hunk (it ignores the code-graph tools' generated output) and three
untracked `docs/planning/pending/code-graph-tooling-*` / `docs/.doc-mapping.json` files. They
belong together as their own change whenever the owner wants it.

**Position (measured 2026-08-02, `git rev-list`):** `dev` leads `origin/main` by **64** commits;
`origin/main` carries **2** that `dev` does not — the PR #7 and PR #8 **merge commits** — so
neither is an ancestor of the other and the next promotion is again a merge.
⚠️ **Always measure against `origin/main`.** The local `main` ref is stranded at `26b1879`
(2026-03-16), which is where this doc's long-running "~274–279 ahead" figure came from.

**Gate status at `a2d21f2`:** tsc 0 · smoke 34/34 · unit **137/137** · **full e2e 214 passed /
13 skipped / 0 failed**, ✅ **2× consecutive** (from 199/13/0 — the 2026-08-02 post work added 15
specs). The 3× flake-audit bar was met at `fa2f87b` on the 199-spec suite. ⚠️ **The previous entry's advice — "a red run isn't
necessarily a regression, re-run the failures alone" — is retired.** What it described was three
real bugs, now fixed; a red run means something again.

📌 **`npm run test:e2e` is a gate, not an optional extra.** This session shipped a UI change on
green tsc + smoke + unit and broke `butler-create.spec` without noticing. Those three are not
"the gates." Run e2e before calling a UI change done —
`export PATH=/usr/local/opt/openjdk/bin:$PATH` first (bare `java` is a macOS shim that reports
no runtime; OpenJDK 26 is at that Intel-prefix Homebrew path).

**This session (2026-08-02, second), newest first:**

| Commit    | What                                                                                    |
| --------- | --------------------------------------------------------------------------------------- |
| `fa2f87b` | **fix(auth)** — stop the hydration mismatch that erased typed input                     |
| `4a5da2a` | **fix(e2e)** — the flake set was three real bugs, one in app code (`services/firebase`) |
| `faa2f38` | **feat(butler-talk)** — cap media at one video + one photo via static config (§10d D2)  |
| `1cada22` | **refactor(admin)** — drop the localStorage collection config, count posts for real     |

**Previous session (2026-08-02, first), newest first:**

| Commit    | What                                                                                      |
| --------- | ----------------------------------------------------------------------------------------- |
| `82d0f07` | **refactor** — converge the modal albums onto the shared `MediaTile`                      |
| `b61216a` | **feat** — name the clip on video tiles; drop the mislabelled `제목 없음` filler          |
| `6e2dc49` | **fix** — stop recording uploaded media as filmed on the day it was uploaded              |
| `8a50348` | **feat** — record signup consent, grant a default role, stop logging PII in the auth path |

**Previous session (2026-08-01), newest first:**

| Commit    | What                                                                                   |
| --------- | -------------------------------------------------------------------------------------- |
| `a96a62b` | **fix** — the 이 냥이 링크 chip did nothing on desktop (share sheet → touch only)      |
| `541ef7d` | **feat** — 이 냥이 링크 chip: the modal hands you the link                             |
| `ba224b7` | **feat** — one cat is linkable with `?cat=<id>`                                        |
| `f23bced` | **docs** — session record + a long-stale branch-position figure corrected              |
| `7e8aa1b` | **fix** — hide videos deleted from YouTube; offer their records for deliberate removal |
| `be36c9e` | **fix** — end the 30 s Firestore stall, and stop the pages lying during it             |
| `6e55463` | **feat** — drop the "중요한 안내사항" banner from the 공지사항 detail page             |
| `be8eb77` | **fix** — render a post's photos at the same width as its video                        |

**Previous session (2026-07-30 → 07-31), newest first:**

| Commit    | What                                                                                       |
| --------- | ------------------------------------------------------------------------------------------ |
| `7822b87` | **docs** — 2026-07-30/31 session close-out                                                 |
| `bb181a6` | **feat** — each medium shows its 제목/설명/태그; the detail page joins the shared renderer |
| `16b5237` | **feat** — show which cats are in a post's photos and videos                               |
| `d7156a5` | **fix** — 입양홍보 expanded post shows the whole post; 팝업 toggle added                   |
| `897a8b8` | **fix** — drop the header that preflighted every image upload away                         |
| `03ce4f2` | **feat** — per-file media, cat tagging, no filename collisions                             |
| `621e275` | **docs** — queue "one video per post" (since reversed); record the picker non-bug          |

**Earlier `dev` commits:**

| Commit    | What                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------- |
| `24f355c` | **fix** — `cat_videos` written with the Admin SDK (was client SDK → silently denied); bucket CORS |
| `7e3b1ee` | **fix** — open the YouTube resumable session with the browser's `Origin` (CORS)                   |
| `e96588c` | **fix** — video bytes go straight to YouTube, not through a Vercel function; progress bar         |
| `d129b9e` | **docs** — hand-off + project-plan update                                                         |
| `f09d0e1` | **docs** — decision doc: subdomain vs path-based tenancy (recommends path-based)                  |
| `d522a67` | **docs** — mountain-#2 prerequisites consolidated + owner provisioning checklist                  |
| `d4c36a1` | **feat** — admin CMS idle timeout 2h → 24h                                                        |
| `1bd9dc1` | **feat** — 관리자 shortcut on 내 집사 정보 for members with CMS access                            |
| `7e08933` | **docs** — mark the 촬영일-from-metadata item as deferred, not queued                             |
| `97b72ed` | **fix** — 촬영일 is a calendar date, not an instant (KST off-by-one)                              |
| `bd7ce23` | **feat** — 집사톡: one file per section, each with its own 제목/설명 + 취소                       |
| `c2fc78f` | **feat** — per-mountain playlist filing from config (+ shared 입양홍보 playlist)                  |
| `0f9190f` | **refactor** — 집사게시판 drops media upload; it is a 급식소 log                                  |
| `297ca9f` | **docs** — the butler media separation + playlist plan                                            |
| `d7999e2` | **docs** — changelog entry for the batch-sync fix                                                 |
| `e948496` | **docs** — corrected commit hash for the batch-sync fix                                           |
| `c94d02e` | **fix** — batch edits sync to Firestore (YouTube ids, not doc ids) + prod-shaped fixtures         |
| `56110c6` | **docs** — 2026-07-26 session close-out (hand-off / plan / debug log)                             |
| `dc8391f` | **fix** — sync no longer resets 게시일; writes `updated` + the tag-videos spec sheet              |
| `80ba04a` | **fix** — batch playlist save applies to the selection, not one video                             |
| `b5f08b7` | **fix** — `자동 날짜 인식` writes YouTube, not Firestore                                          |
| `05fdbd9` | **fix** — admin OAuth flow requests the write scopes it was missing                               |
| `6b2b4f9` | **feat** — one shared YouTube channel for all mountains (decision + `manisan` config)             |
| `8a0c87d` | **fix** — one credential source: Firestore, not env (`lib/youtube/credentials.ts`)                |
| `e929c39` | **feat** — `mountain_id` on every GA4 event                                                       |
| `366425c` | **PR #8 merge** — multi-mountain M1–M5 promoted to `main` (2026-07-23)                            |

**Branch position:** `git rev-list --left-right --count origin/main...origin/dev` = **`2  55`**.
`dev` is **55 commits ahead**, and `origin/main` holds **2** that `dev` lacks — the PR #7 and
PR #8 **merge commits** — so neither is an ancestor of the other. ⚠️ **Always measure against
`origin/main`.** The "`0  279`" this line used to report came from the **local** `main` ref,
stranded at `26b1879` (2026-03-16); `origin/main` is `366425c`. M6 + M7 + M8 + the GA4 guide + the
2026-07-26 YouTube fixes, the 2026-07-27 butler/playlist work, and the 2026-07-28 → 08-01
sessions are all on `dev` and **not yet in prod**. Promoting them (`dev → main`)
is **gated on the owner's P5.4 scripted manual YouTube pass** — which must **restart from the
top** (see the fresh-session box at the head of this doc), all the more so now that
2026-07-30/31 changed the upload path, the tagging inputs and the post renderers underneath it,
and 2026-08-01 changed **how the browser connects to Firestore at all** (forced long polling)
plus the video sync (a new availability check runs inside 동기화).

⚠️ Untracked and intentionally so: `backups/firestore/2026-07-20T02-20-20-923Z/`
— a real dump holding an OAuth refresh token + PII. Git-ignored; delete when no
longer wanted.

---

## Changelog (living-doc audit trail — newest first)

- **2026-08-05 (latest)** — **Three owner-asked fixes, and a rename that was a cascade
  (§10r/§10s/§10t).** 급식현황 publishing now **confirms**, naming the 급식소 it will stamp — the
  one write in that composer with no correction path. `scripts/migration/rename-cat.js` carries
  a cat's name across the **four** places that store it as a string (media tags, `[catmodal:]`
  tokens, other cats' prose, `parents`/`offspring`) while `?cat=` links survive untouched,
  because identity is the **document id**. 🔑 The `parents`/`offspring` gap was invisible to my
  own fixtures and surfaced only from the owner's **dry run against production** — dry-run
  destructive tooling on real data before trusting its coverage. Landed the harness as a third
  emulator-backed suite (`tests/scripts/**`, own CI job) and gave the script a **`demo-*` guard**
  so it cannot be aimed at production by accident. Video 설명 is now **verbatim** on
  공지사항/입양홍보 too, reversing an earlier decision the code argued for; 집사톡 needed no
  change — that report was about **production**, not the branch. The **아들조로 → 조로** rename is
  applied to prod, with two YouTube re-tags still outstanding. Also decided: **do not rename the
  Firestore database** (`(default)` is immutable; the useful version would be _adding_ one).
  Gates: tsc · unit **189** · smoke **39** · rules **86** · scripts **23** · e2e **229/13/0**.
  ⚠️ `61b1904` is committed and **not pushed** (owner holding it).
  **Then closed BACKLOG B3** — `/api/revalidate` omitted `/pages/cats`, so 냥이들 served stale
  cat data for up to an hour after every edit while 홈/입양홍보 refreshed at once; all three
  `cat-reads` consumers audited, no other missing. The rename runbook now states the script's
  own bypass (Admin SDK writes fire no revalidation — save any cat in the CMS to re-bake).
  Gates: tsc · smoke **39**.
  **Then the colour workstream (Phases 1–3, §10u, five commits `165df61`…`6618c8b`).**
  Owner asked for central colour control;
  the repo already had it (`design.md:9`) and it was simply under-adopted, so **no new token
  file** was created. Per-tenant theming **removed** (M8 superseded — a tenant choosing colours
  is admin burden with no preview and no contrast check, and the config is baked so each try is
  a redeploy); ~30 brand utilities adopted `brand`/`accent`; 급식현황's freshness ramp goes
  **green→red ⇒ blue→red**, which lifted its worst contrast from **1.37:1 to 6.47:1** and
  dropped the colour-blindness-hostile pair. 🔑 **The ramp had no test because it was a closure
  inside the component** — extracting it was the precondition for the check, and the contrast
  rule is now a test with a negative control. `feeding_spots` is seeded at last, so the table
  has e2e cover for the first time. Gates: tsc · unit **196** · smoke **39** · **e2e
  233/13/0**. **Open, deferred to a fresh session:** plan **Phase 4** (hygiene — incl.
  recording the global-palette decision in `design.md` §Colors, the one place it is _not_
  written) and **Phase 5** (the unsized admin-vs-`design.md` audit D5 opened). ⚠️ Also
  outstanding: **the `/admin/*` screens were never seen rendered** — auth-gated, no
  credentials — so they are proven by compiled-CSS equality, not by looking.
- **2026-08-04** — **Author delete + reply edit/delete (§10q), and a deploy-state
  check that paid off.** Authors may now remove their own posts and reply authors their own
  댓글 — reversing §10n's withholding, on the owner's call. 🔑 A reply is a document in the
  **same collection**, so one rule governs both and "the reply's author, not the post's"
  needed **no new permission and no new rule**; the ask was almost entirely a UI gap. Two
  things did need rules: the **cascade** (`deletePost` removes every reply first, so without
  `isParentAuthor()` an author cannot delete a post anyone replied to) and **`replyCount` ±1**
  (the services recount, so a delete lands on `old − 1`). "Media survives" needed no code —
  verified in both services. Rules **86**, e2e **228/13/0**.
  ✅ **All of §10n / §10p / §10q are now LIVE and verified** — the deployed ruleset is
  identical to the repo's and the matrix carries every grant. 🔑 **Checking the deployed
  artifact rather than the branch is what made that statement worth anything**: the same
  check caught §10n being live while three docs said it wasn't, and then caught §10q's rules
  _not_ being live while its code was already pushed — members briefly saw a 삭제 button the
  database refused. ⚠️ **The deploy order is a live hazard, not a formality**: code ships on
  `git push`, rules and permissions do not.
- **2026-08-03** — **The post rules are tested directly now, before they deploy.**
  `tests/rules/posts.rules.test.ts` (43 tests; `npm run test:rules` = **54 passed** with
  `users.rules.test.ts`) asserts the §10n member-authoring rules against the real
  `firestore.rules` — the refusals a UI-driven e2e cannot reach. 🔑 It passed on the first
  run, which proves nothing on its own, so it was **mutation-tested**: four deliberate holes
  in the rules, and **one escaped** — the two boards have separate near-identical rule blocks
  and the provenance cases only ran against `posts_butler`. Every ownership case now runs
  against both via `describe.each`. Closes the plan's §6 risk; to-do #1 done, so the deploy is
  now #1.
- **2026-08-03** — **Member authoring, and a class of undeletable document.**
  Butler roles can now view / create / **edit their own** on 집사톡 + 급식현황 (`8334c51`);
  the ask's premise was false — members could not see or create at all, so "let the author
  edit" had no non-admin author to apply to. Two new per-board permissions, `authorUid` as the
  authorization identity, and rules that refuse an edit which rewrites authorship.
  ⚠️ ~~**Not live** — rules undeployed, migration dry-run only.~~ **That was wrong and was
  corrected on 2026-08-04: it was already live.** Then (`8754a3c`) the owner's
  "deleted posts are still there": a doc with **no `mountainId`** is undeletable by everyone,
  because `canWrite()` reads the field off the stored doc on a delete. One doc of 98; fixed in
  prod with a standing audit script. 🔑 The flat-structure correlation was a decoy — the
  nested counter-example found the cause. Full e2e **220/13/0**.
  Detail: PROJECT_PLAN **§10n/§10o**, `log/DEBUG_LOG.md` 2026-08-03.
- **2026-08-02** — **The about page has one source of truth: the CMS.** `about` deleted
  from `mountains.json` (plus `MountainAbout`/`getMountainAbout`); the page and the CMS editor
  read Firestore only. 🔑 The photo was the load-bearing half — `useAboutPhoto` short-circuited
  to a build-baked `localPath` and ignored the CMS's filename, so **changing the photo there did
  nothing**; it serves live from Storage now. The build-time about-photo leg is retired (**no
  Firebase media is baked any more**), and `next.config.js` allows the Storage emulator host
  behind the emulator flag — the harness had **no remote-image coverage at all** before this.
  The Firestore migration is **applied** (manisan seeded, `localPath` stripped, legacy doc
  deleted; snapshot `2026-08-02T13-15-25-299Z`). Full e2e **214/13/0**.
  Detail: PROJECT_PLAN **§10m**, `log/FEATURE_MOD_LOG.md` 2026-08-02.
- **2026-08-02** — **Post detail resolved the wrong collection; editing took pasted
  URLs. Both closed.** `(type, id)` routing via a new `services/post-types.ts` and a
  `{postType}/{id}` path segment (**no fallback** — the `?type=` default was rejected on
  review); the page moved onto the 공지사항 shell + shared `PostMedia`; and 공지사항 / 입양홍보
  / 집사톡 editing moved onto their **create composers**, with `기존` media rows, a cap that
  counts retained files, and no re-stamping of authorship. 급식현황 keeps the URL editor by
  decision. Six commits, `2368758`…`a2d21f2`. Full e2e **2× 214/13/0** (was 199/13/0).
  Detail: PROJECT_PLAN **§10k/§10l**, `log/DEBUG_LOG.md` + `log/FEATURE_MOD_LOG.md` 2026-08-02.
- **2026-08-02** — **The hydration mismatch is fixed.** `AuthProvider` seeded
  `useState` from `auth.currentUser` (browser-only, read during render), so the header
  disagreed with the server and React rebuilt the whole root — erasing input already typed.
  Now seeds from `null` and lets `onAuthStateChanged` update after hydration. Console error
  gone on `/pages/contact` and `/admin/cats`; full e2e 2× 199/13/0.
  Detail: `log/DEBUG_LOG.md` 2026-08-02.
- **2026-08-02** — **The e2e "flake set" was three real bugs; the suite is green.**
  3× consecutive **199 passed / 13 skipped / 0 failed** (from 196/3). One was **app code** —
  `services/firebase.ts` guarded a per-instance emulator connection with a process-global
  flag, and the resulting unconnected `db` returned `200 []` from an offline read rather than
  throwing. One was `admin/cats.spec` mutating a fixture six other specs read. One was three
  specs acting before async state resolved. 🔴 **Left open on purpose:** the hydration
  mismatch behind the third **wipes typed input for real visitors**, and the spec fixes hide
  it from CI (PROJECT_PLAN §12). Also fixed here: the 집사톡 cap shipped earlier this session
  broke `butler-create.spec`, which picked a second video — rewritten to pin the cap, with the
  multi-file coverage it duplicated already living on 공지사항 in `posts.spec`.
  Detail: `log/DEBUG_LOG.md` 2026-08-02.
- **2026-08-02** — **§10d D2 closed as static config, and a dead settings screen
  deleted.** 집사톡 capped at one video + one photo via `config/media_control.json` +
  `src/utils/mediaControl.ts`, with `MediaItemList` gaining `allowMultiple` (defaults `true`, so
  only 집사톡 passes it). 🔄 The **CMS-toggle premise was reversed by the owner** once the
  Firestore design exposed that a global runtime setting lets any one mountain's admin
  reconfigure every other mountain. 🗑️ Alongside it, 앱 관리's 게시물 컬렉션 설정 tab — a
  `localStorage` textarea feeding a `count: 0` stub whose default named a collection that never
  existed — removed, and the dashboard 게시물 tile now counts the four real collections.
  Browser-verified both ways; tsc 0 / smoke 34 / unit 137. Detail: PROJECT_PLAN §10d + §10j,
  `log/FEATURE_MOD_LOG.md` 2026-08-02.
- **2026-08-02** — **An audit that became four pieces of work.** Started as "what's
  left per the plan?", which required checking the plan against the code: **seven entries were
  wrong** (six done-but-unticked, one — 급식소 — flagged by the owner, whose neighbouring §7 note
  would have sent someone chasing a phantom permission-denied). 🔑 **A plan entry is a claim about
  the code, and claims rot.** Then §8's compliance items, where **the stated premise was wrong**:
  phone/Kakao users cannot join without consenting, because the login gate already refuses
  implicit signup — the earlier pass checked the two components and **stopped before tracing
  their host**. A post-auth consent modal was designed on that premise and discarded; the real
  gap was an **orphaned Auth account** holding PII, now deleted on the bounce path (`8a50348`,
  with consent recording, a default role via a new Admin-SDK route, and PII out of the auth logs
  — 3 sites, one more than reported). ⚠️ **The owner corrected the exclusion rationale**: signup
  is **phone-first**, so the test must be a password credential, not the login method — gating on
  method would have deleted consenting users who signed in by phone. Then two owner-reported
  bugs, **each with a second instance the report did not mention**: uploaded media recorded as
  filmed on its upload day (`6e2dc49` — the owner's "집사톡 was fine" observation was the whole
  explanation, and led to the same fabrication in the image path, worse there because
  `cat_images` has no upstream), and video tiles carrying no label (`b61216a` — plus the
  mislabelled `제목 없음` filler in **two** places). 🔑 **Both trace to one root cause, now
  closed:** two implementations of the same tile. The modal albums are converged onto
  `MediaTile` (`82d0f07`). Gates: tsc 0 · smoke 34 · unit 103 · full e2e 196 passed / 3 failed,
  all three green in isolation. New tests were **mutation-checked** — each guard was removed to
  confirm the test fails — and the UI changes were **screenshot-verified in a browser**, not
  taken on trust from a passing compile.

- **2026-08-01 (latest, second half)** — **One cat is now linkable, and the modal hands you the
  link.** `?cat=<id>` on `/pages/cats` (`ba224b7`): clicking a cat sets the param, arriving on
  such a link opens that cat, closing clears it, back closes the modal. 🔑 Built by giving
  `useModalLayer`'s **existing** synthetic history entry an optional `historyUrl` rather than
  adding a second history mechanism beside it — the `history.back()` it already issued on close
  restores the URL for free, and any modal worth addressing can now opt in. Keyed on the cat
  **id**; §10c records why that survives a rename and why the mechanism is _not_ the one you
  would assume (the app reads a stored `id` **field**, not the doc address). Then the **이 냥이
  링크 chip** (`541ef7d`), because a deep link nobody can produce is not a feature: share sheet on
  touch, clipboard on desktop. ⚠️ It **builds** the link rather than copying `location.href` —
  `CatInfo` renders on six surfaces and only 냥이들 honours `?cat=` — and mirrors the tenant
  prefix from the current path rather than resolving it from config, since geyang's configured
  domain is not the apex it actually serves from. 🐛 **Shipped broken on desktop and fixed the
  same day** (`a96a62b`, owner-reported): it gated on `navigator.share` merely existing, which
  desktop Chrome satisfies and then refuses (`NotAllowedError`), and a dismissed sheet is
  silent by design — so the button had no visible failure path at all. Now gated on
  `(pointer: coarse)`. 🔑 **Feature detection is not affordance detection, and both pre-ship
  passes missed it because they stubbed `navigator.share`** — a stub proves your branches, never
  that the platform runs them. Two further traps live in `DEBUG_LOG`: the deep-link open is
  deferred one `setTimeout` (Next's AppRouter re-asserts its canonical URL after our effects and
  wipes `?cat=` off), and that defer must not be `rAF` (shared links open in background tabs).
  Gates: tsc 0, smoke 33/33, unit 129/129, e2e 16/16 on the touched specs. Detail: PROJECT_PLAN
  §10c, `log/FEATURE_MOD_LOG.md` + `log/DEBUG_LOG.md` 2026-08-01.
- **2026-08-01** — **Four owner-reported bugs on the public post and video surfaces;
  the interesting one was a timeout wearing slowness as a disguise.** (1) Photos in a post now
  render at the video's width — `PostMedia`'s `compact` grid gave a lone photo half the width and
  pillarboxed it inside its own border; **third defect from that default**, so pick `layout`
  explicitly at every call site. (2) The 공지사항 detail page's standing "중요한 안내사항" banner
  is gone — static template markup that made every announcement read like an advisory. (3) 🔑 A
  **30-second** wait before every first Firestore read, measured at **30,048 ms** to receive 4
  documents of which the query was the last **48 ms**: the SDK's buffering-proxy probe gets no
  answer and waits out the transport timeout (capped at exactly 30 s) before falling back to
  polling. ⚠️ **Auto-detect long polling was already the default**, so the standard advice was a
  no-op — proposed and discarded before shipping; the browser is now **forced** onto long
  polling, which costs nothing here because the app has **zero** `onSnapshot` listeners against
  ~47 one-shot reads. Underneath it, three surfaces rendered their **failure state as their
  loading state** — server-rendered into the first paint, and permanent after a failure because
  nothing set state again — now sharing `useAsyncData` + `ui/AsyncStates`. 📌 Firestore **hangs
  rather than throwing** on network failure, which is why the console stayed clean while the page
  claimed there were no posts. (4) Videos deleted from YouTube kept their tile: `syncVideos` is
  import-only, and **auto-pruning was rejected** because the public API key cannot distinguish a
  deleted video from a private one — pruning would destroy cat tags on a privacy change. The new
  `/api/admin/video-availability` asks with the **owner's OAuth credential**, labels
  `available|private|missing`, and never deletes; the CMS lists the missing ones for a deliberate
  삭제. Verified against prod: 20 videos, 18 available + 2 missing. Gates: tsc 0, smoke 33/33,
  unit 122/122, full e2e 169 passed. 📌 `api/tenant-isolation`'s cats/points cases joined the
  known flaky set — **confirmed pre-existing** by re-running the suite with the transport change
  disabled. Detail: PROJECT_PLAN §10f/§10g, `log/DEBUG_LOG.md` + `log/FEATURE_MOD_LOG.md`
  2026-08-01. 📌 **Correction, same date:** the "`dev` leads `main` by ~274–279" figure this doc
  had carried for several sessions was measured against the **local** `main` ref, stale at
  `26b1879` (2026-03-16). Against `origin/main` (`366425c`) the real gap is **51**, and
  `origin/main` holds **2** merge commits `dev` lacks — so neither branch is an ancestor of the
  other. Both places that quoted it are fixed.
- **2026-07-31** — **The composers and the post-display surfaces converged, and two
  self-inflicted bugs got caught on the way.** 공지사항 / 입양홍보 gained 집사톡's per-file media
  (each file its own 제목/설명), a cat selector, framed sections with separators, and refusal of
  duplicate filenames; their images moved to the signed-URL path so a per-photo 설명 has
  somewhere to live — which also means those photos now reach the 사진첩 and the tagging queue.
  Pasted-URL lists removed. 🔄 **This reversed the queued "one video per post" decision before
  any of it was built** (admin composers stay unrestricted; the surviving half is a CMS toggle,
  not started — §10d D2). On the display side, **three hand-rolled media renderers became one**:
  the 입양홍보 expanded post shows the whole post (it had rendered one thumbnail chosen as
  `video ? thumb : image`, so a post with a video could never show its photos), 입양홍보 posts
  can pop up on a site visit, and every medium shows its 제목/설명/태그 — resolved **live** from
  the media records, so pre-existing posts display it with no migration. 🚨 **Self-inflicted #1:**
  signing the upload URL with `x-goog-if-generation-match` made the PUT preflighted and **blocked
  every image upload from every deployed origin**; the bucket's CORS allow-list lacks the header
  and nothing logged server-side. 🚨 **#2:** adopting the shared `PostMedia` on the detail page
  brought the modal's image sizing and shrank full-width photos — caught before commit, fixed
  with a `layout` prop. 📌 **A green test was covering a broken feature:** the adoption e2e
  asserted `getByAltText('이미지')` throughout the bug, because no fixture in the repo carried
  any media. ✅ **Correction to the record:** e2e _does_ run locally — OpenJDK 26 is at
  `/usr/local/opt/openjdk/bin`; bare `java` is a runtime-less macOS shim, which is what produced
  the earlier "no JDK" claim.
- **2026-07-29** — **"A 48 MB video won't upload" turned out to be: video upload had
  never worked on Vercel.** The composer POSTed the file through a function capped at **4.5 MB**
  by the platform, rejected at the proxy before any handler ran. Replaced with a **resumable,
  direct-to-Google** upload (`e96588c`), plus a **progress bar** now that a submit can
  legitimately run for minutes. Three older bugs sat behind it, each only reachable once the
  previous was fixed: the session must carry the **browser's `Origin`** or the response is
  unreadable after a 100% upload (`7e3b1ee`); `cat_videos` was written with the **client** SDK
  server-side and silently denied by rules, so **every form-uploaded video since forever
  reached YouTube unrecorded** (`24f355c`); and the live Storage bucket had **no CORS at all** —
  the Seoul migration left it on the **old** bucket, which is also why it looked fine locally
  (local `.env` still names that old bucket). New `npm run storage:cors` applies bucket CORS
  without a `gcloud` install, dry-run by default. Also: 집사톡 stopped inventing a `산고양이`
  tag when none was chosen — the fallback set `needsTagging: false` and hid exactly the videos
  the tagging queue exists to find. **Decided, not started:** a `?cat=<id>` deep link to one
  cat's modal (PROJECT_PLAN §10c); the owner declined the per-cat page. ⏳ Image upload and the
  영상첩 record are still unverified on `dev`. **Decided and not started:** one video per post
  (§10d) and the cat deep link (§10c). 📌 A reported "공지사항 picker won't select videos" was
  **not a bug** — the image picker was used; it sits first in 공지사항 and second in 집사톡, so
  muscle memory lands on the wrong one. Recorded so it isn't chased again.
- **2026-07-28** — **The tenancy URL model was decided — path-based — and planned.**
  The owner answered the open decision: a mountain is identified by a **path prefix**
  (`mohocats.org/manisan`), geyang keeps its prefix-free URLs at the apex, and a second
  mountain's owner does **not** need their own hostname — the one argument §4.2 said could
  reverse the recommendation. Written up as
  [`tenancy-path-migration-plan-20260728.md`](../planning/pending/tenancy-path-migration-plan-20260728.md):
  phases **T0–T7**, 28 checklist items, net-first (two navigation-retention specs that must
  **fail** before the sweep, since a spec that passes beforehand is not a net).
  🚨 **Planning it surfaced a cost the decision doc had not priced, and it is the one that
  matters.** Every `/api/*` route resolves the tenant from the **Host header** —
  `getRequestMountainId`, because `/api` is excluded from the middleware matcher and there is no
  tenant in an API URL — so with one constant Host every API call would resolve to **geyang**:
  wrong-tenant reads and writes on `points`/`admin/cats`, 동참 submissions stamped with the wrong
  `mountainId`, and — the real defect — **`requireApiPermission` gating on the wrong mountain's
  roles**, so a geyang-only admin would be allowed on manisan's surfaces and a manisan-only admin
  denied on their own. Fix is a validated `X-Mountain-Id` header with Host as fallback, **400 on
  an unknown value** (never a silent fallback to the default tenant); it is sequenced as **T2,
  ahead of the link sweep**, and the existing `api/tenant-isolation.spec.ts` authz cases are
  already its regression net. Not a weakening: the header only _selects_ the mountain, and the
  permission is still checked against it. 📐 Surface re-measured at `d129b9e`: **83 navigation
  sites / 29 files** (56 `href`, 24 `router.push/replace`, 3 `window.location` — `Navigation.tsx`
  alone is 23), **27 fetch sites / 11 files**, and **4 `usePathname()` comparison sites** the
  decision doc had not counted at all, one of which is the login redirect-back. ⏱️ **Sequencing
  decided: P5.4 pass → `dev → main` promotion → migration.** Nothing was changed in code;
  prerequisites §1.1/§1.5/§1.6/§2 are now superseded and must not be worked.
- **2026-07-28** — **A small feature, a timeout change, and then an architecture
  review that questioned the multi-tenant URL model.** 내 집사 정보 gained a **관리자
  shortcut** for members who hold CMS access on the active mountain (`1bd9dc1`) — the CMS had
  no entry point from the member surface at all. Its gate **reuses `isAdmin(user, mountainId)`,
  the same function `AdminAuth` runs**, so the link cannot drift from what the gate allows; an
  e2e guard pins both directions. The admin idle timeout went **2h → 24h** (`d4c36a1`), with
  the Korean expiry notice moved in step (the duration is hardcoded in two places).
  Then the question "what's left before mountain #2?" found no single answer — items were
  scattered across four docs — so they were consolidated into
  [`mountain-2-prerequisites.md`](../planning/pending/mountain-2-prerequisites.md) and the console work
  split into an owner-facing
  [`adding-a-mountain.md`](../manuals/admin-manual/adding-a-mountain.md) (`d522a67`).
  🚨 **Assembling it surfaced a security defect nobody had logged: 로그아웃 signs the user out
  of one origin only**, so with a second subdomain a user who logs out of one mountain stays
  logged in on the others — **members and admins alike**, since no sign-out path is role-aware,
  and the admin idle timeout signs out the same way. Zero exposure today because production
  serves a single origin. Recommended fix is server-side `revokeRefreshTokens`; ⚠️ **a
  correction worth keeping — cross-origin session propagation would _multiply_ this, not fix
  it**, since every such design mints the second origin its own refresh token. Two smaller
  finds, also unlogged: the **members roster** runs an unfiltered `users` query (every
  mountain's emails to any `manage-users` holder), and **production serves from the apex**,
  which isn't in geyang's `domains`, so it resolves via the fallback rather than the Host
  mapping. 📌 Also corrected: **Kakao needs no per-subdomain redirect URI** — it is a Firebase
  OIDC provider used through `signInWithPopup`, so its redirect URI is Firebase's fixed handler,
  constant across tenants; two docs had claimed otherwise. 🟡 The session closed with
  [`tenancy-url-model-decision-20260728.md`](../planning/pending/tenancy-url-model-decision-20260728.md),
  which observes that **every one of those blockers traces to a single root cause — more than
  one origin** — and recommends **path-based tenancy**, at a measured cost of ~80 in-app
  navigation sites across 27 files. **Open for the owner**; nothing was changed in code on its
  strength. Gates: tsc 0, smoke 31/31, unit 102/102, `member/mypage.spec.ts` 6/6.
- **2026-07-27** — **The two post composers were separated, and YouTube filing
  became per-mountain.** 집사게시판 was doing two jobs — a 급식소 check-in log _and_ a second
  media composer — while 집사톡 already did the second one properly, so it **lost media upload
  entirely** (`0f9190f`); compose-time only, since legacy posts keep rendering and admins keep
  URL-based media editing. The per-file rework then landed where it belongs: 집사톡 got
  **one file per section with its own 제목/설명** (`bd7ce23`), so two videos of different cats
  no longer share a caption, and an empty description now stays empty instead of being
  replaced by an invented default. Both composers gained **취소**. Filing (`c2fc78f`) stopped
  matching the playlist _titled_ `집사게시판` — a rename on YouTube silently stopped it, and
  with one shared channel every mountain filed into the same list — and now reads
  `social.youtubePlaylistId` per mountain, plus a **`_shared`** platform block for the one
  cross-mountain 입양홍보 playlist (an 입양홍보 video joins **both**, so the mountain playlist
  stays a complete ownership record for the deferred `syncVideos` fix). ⚠️ Then a browser pass
  caught a fourth thing (`97b72ed`): 촬영일 was **a day early in KST**, because a calendar date
  was parsed as local and serialized as UTC — arithmetic that is correct at UTC and wrong
  everywhere else, so **CI could never have caught it**. Fixed by treating 촬영일 as a calendar
  date end to end and encoding it once, as UTC midnight, matching what `/admin/tag-videos`
  already writes. ⏸️ **Deferred, not queued** (owner's explicit call): 촬영일 should come from the
  **file's own metadata** with its timezone, with the filename as fallback — today iPhone files
  parse to nothing and silently take the upload time. Recorded to explain the behavior, not to
  schedule the work. 📌 Also found: `/api/youtube-playlists` now has no
  caller at all. Gates: tsc 0, smoke 31/31, unit 102/102, **e2e 153/13/0**.
- **2026-07-26** — **Batch edits never reached Firestore — the seventh bug of the
  session, and the only one reported rather than found by reading (`c94d02e`).** Batch tag /
  촬영일 / playlist saves applied to YouTube but the site's copy only updated after a manual
  📺 YouTube와 동기화, while individual saves synced themselves — the asymmetry that localized
  it. `/api/refresh-video-metadata` takes **YouTube video ids** (Data API lookup, then
  `where('youtubeId','==',id)`), but the batch loops recorded the **Firestore doc id** from the
  selection and passed those, so the route 404'd. The caller did `if (res.ok) log(…)` with no
  `else`, so the failure was invisible and the dialog still reported 완료; `saveVideoMetadata`
  was immune because it resolves the YouTube id once and reuses it. Fixed: results keyed by
  `youtubeVideoId`; the refresh extracted into `syncToFirestore()`, which returns success and
  logs the status + body; on failure the dialog now says the change reached YouTube but not the
  site. ⚠️ **The fixtures had made this untestable** — no seeded video carried a `youtubeId`, so
  `youtubeId || id` collapsed to the doc id and the two could never diverge; both fixtures now
  have a distinct one (`yt-vid-01/02`), matching production, and the four assertions that
  referenced the old ids moved with them. **Second time this session a fixture concealed a
  production-only failure mode** (the first: emulator videos have no YouTube publish dates), so
  the hand-off's fresh-session box now carries it as a standing check and the plan proposes a
  broader fixture-realism audit. New regression test asserts the PUT **and** the refresh both
  carry the YouTube id. Gates: tsc 0, smoke 30/30, unit 80/80, **e2e 148/13/0**.
- **2026-07-26** — **Three more `/admin/tag-videos` bugs fixed (`b5f08b7`,
  `80ba04a`, `dc8391f`), a source-of-truth principle adopted, and the page's button spec sheet
  written.** All three were found by **reading the page to document it**, not from reports, and
  none was reachable by the existing suites. (1) `자동 날짜 인식` wrote its parsed dates to
  Firestore, where the next sync — or any other save on that video — overwrote them with `null`,
  because `refresh-video-metadata` rebuilds Firestore from YouTube and YouTube has no recording
  date for exactly those videos. It now writes YouTube first. The rewrite also exposed a
  timezone bug in its own fix, caught by the new test: the parser returns **local-time** Dates,
  so `.toISOString()` shifted every date back a day in KST — it now sends UTC midnight of the
  calendar date, matching `saveVideoMetadata`. (2) The batch playlist save always acted on the
  video open in the edit form, so the batch entry point updated one video or silently none; it
  now applies to the whole selection with **set semantics** and a confirmation. (3) Every sync
  wrote `uploadDate: new Date()`, resetting 게시일 to the sync time — and since the **public**
  영상첩 sorts by it, edited videos jumped to the top of the public album with today's date. It
  now comes from YouTube's `publishedAt`, so mis-stamped records **self-heal** with no
  migration; `uploadedBy` is no longer clobbered, and the refresh now writes `updated` (the
  field the UI reads for 메타데이터 수정) instead of the unread `lastMetadataRefresh`. ⚠️ That
  clobber had been **masking a latent crash** — `syncVideos()` never set `uploadDate` on import
  and the album sorts call `.getTime()` on it, so the import now sets it too. 🔑 **Principle
  adopted:** YouTube is the source of truth for videos and no UI path may write video data to
  Firestore; `/admin/tag-videos` now makes zero direct Firestore writes, and the rule is in
  `admin-manual` §6. New: `docs/manuals/admin-manual/tag-videos-spec.md`, a button-by-button
  spec sheet keyed on what each button writes to — the first of a per-CMS-page series. Gates:
  tsc 0, smoke 30/30, unit 80/80, **e2e 147/13/0**.
- **2026-07-26** — **Third YouTube bug, exposed by the second: the admin OAuth flow
  requested too few scopes.** On the owner's retry after the credential fix, a metadata edit
  failed with Google's _"Insufficient Permission"_ (not our gate's "Insufficient permissions").
  `auth-url` asked for `youtube.upload` + `youtube.readonly` only — no `videos.update`, no
  playlist writes. The retired CLI token script requested all four scopes, so the token in real
  use had them; **the admin panel had never minted a token capable of editing metadata**, and
  only routing the routes to that token revealed it. Fixed by requesting the same four scopes;
  **a re-authorization is required**, since scopes are granted at consent time. Also corrected
  throughout the docs: the button is **`🔄 토큰 갱신`**, not the "재인증" label these notes had
  invented — and it runs the full consent flow despite the name, which is why it fixes scope
  problems and not just expiry. Logged as a known gap: the status panel validates by refreshing,
  which succeeds regardless of scope, so it reports healthy on a token that cannot write.
- **2026-07-26** — **Both P5.4 YouTube bugs FIXED; and the platform commits to a
  single shared YouTube channel.** (1) New `src/lib/youtube/credentials.ts` is now the only
  place the shared OAuth credential is resolved, splitting **client identity** (env, never
  rotates) from **the refresh token** (Firestore only). This is **stricter than the plan
  recorded the day before**: env → Firestore would not have fixed the reported failure at all
  (the stale env token _was_ set and would still have won), and even Firestore-first-with-env-
  fallback was rejected — a fallback keeps the same failure shape whenever the Firestore doc
  goes missing, and buys nothing, since obtaining a token needs client identity only.
  `YOUTUBE_REFRESH_TOKEN` is gone from the code, `.env.example`, and the deleted `scripts/auth/`
  workflow; the admin "re-authorize" button is now the whole procedure, with no env edit and no
  redeploy. ⚠️ Leave the var set in Vercel **Production** until this promotes — `main` is
  pre-fix and env-only. Two further defects fell out of the same
  root cause: `upload-youtube`'s Firestore fallback was **dead code** (it required client
  credentials from the very config whose absence triggered it — so _no_ route had ever
  successfully fallen back), and `auth-url` required a refresh token in order to obtain one, a
  bootstrap deadlock on a fresh deployment. 🔑 **`YOUTUBE_REFRESH_TOKEN` was then removed
  entirely** (owner's call — an env fallback preserves the same failure whenever the Firestore
  doc goes missing, and isn't needed to bootstrap); the token now lives only in Firestore. Do
  not clear the var from Vercel **Production** until this promotes — `main` is still env-only. All six OAuth consumers migrated;
  `getYouTubeOAuthConfig()` deleted; the status panel stopped lending Firestore's timestamp to
  the env token (that display is a large part of why the split went unnoticed); the OAuth
  success page stopped printing the raw token. **Correction:** `refresh-video-metadata` was
  never affected — it uses the public API key, not OAuth. (2) `manage-playlists` POST now takes
  its channel from `getYouTubeChannelId(authz.mountainId)` instead of a
  `NEXT_PUBLIC_YOUTUBE_CHANNEL_ID` env var that is set nowhere. New net:
  `tests/unit/youtubeCredentials.test.ts` (9). Gates: tsc 0, smoke 30/30, unit 80/80, full e2e
  146/13/0. (3) **Owner decision: one YouTube channel for all mountains** (per-mountain channels
  rejected — each would have to clear monetization thresholds alone, and N credentials means N
  expiring tokens); attribution rides on `cat_videos.mountainId`. `manisan` repointed at
  geyang's channel, and the resulting `syncVideos()` cross-tenant hazard logged as a
  prerequisite for a real mountain #2. Detail: `log/DEBUG_LOG.md` 2026-07-26.
- **2026-07-26** — **P5.4 manual YouTube pass STARTED on Preview and immediately
  found two pre-existing bugs; both queued for a fresh session.** (1) **Split refresh-token
  source** — the admin "re-authorize" button writes the fresh token to Firestore
  (`admin_config/youtube_auth`), but `getYouTubeOAuthConfig()` reads **env only**; only
  `upload-youtube` falls back to Firestore, so `update-youtube-video` / `manage-playlists` /
  `youtube-playlists` / `refresh-video-metadata` keep using a stale `YOUTUBE_REFRESH_TOKEN` and
  fail `invalid_grant`, while the status panel looks healthy because it checks **both** sources.
  Fix = one shared env → Firestore credential helper across all five routes. (2)
  **`manage-playlists` POST reads `process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID`** — set nowhere,
  so playlist saves 500; the GET beside it already uses `getYouTubeChannelId(mountainId)`
  (missed in M1's config move; also a multi-tenant leak). Both are **pre-existing, not
  regressions** from the same-day auth-gating pass, and **neither is reachable by automated
  tests** — the emulator has no YouTube credentials, which is exactly why P5.4 exists as a
  manual pass. Also this session: **GA4 console setup completed** by the owner (Firebase-linked
  property reused, `mountain_id` dimension registered, Enhanced measurement on with
  history-based page views **off**, env var Production-only) and the ⚠️ **pre-M7 sequencing
  trap** recorded — `main` still runs the Firebase SDK off
  `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` and reads `NEXT_PUBLIC_GA_MEASUREMENT_ID` nowhere, so
  both vars must stay set until M7 promotes. Full runbook:
  [`admin-manual/google_analytics.md`](../manuals/admin-manual/google_analytics.md).
- **2026-07-26** — **`mountain_id` is now a GA4 default parameter (`e929c39`).**
  `AnalyticsTracker` calls `gtag('set', { mountain_id })` before its `page_view`, so the
  Enhanced-measurement events enabled the same day (scroll, outbound click, download, video,
  form) carry the tenant too — previously it was attached per-event to `page_view` alone.
  Residual limit: only post-hydration events inherit it (the root layout sits above
  `MountainProvider`).
- **2026-07-26** — **The 7 ungated write/credential API routes are now gated (one
  deleted) — the open thread is resolved.** `manage-playlists` (GET+POST),
  `refresh-video-metadata`, `update-youtube-video`, `upload-youtube`, `youtube-playlists`,
  `generate-signed-url`, and `generate-youtube-signed-url` had **no auth gate at all** — an
  unauthenticated caller could mint Storage write URLs, drive the shared YouTube channel on
  the operator's OAuth credential, and write `cat_videos` via the Admin SDK (bypassing
  `firestore.rules`). Six now
  open with `requireApiPermission`; every in-app caller sends its ID token through the
  existing `authHeader(user)` helper (`uploadStrategies` takes `user` as an **injected**
  option, so the strategy module keeps no Firebase coupling; the tag-videos page +
  `useYouTubeVideoMutations` route 10 fetch sites through one `jsonAuthHeaders()`). The
  permission per route **mirrors the rules clause already guarding the resource it touches**
  (`generate-signed-url` → `manage-photo`, everything YouTube → `manage-video`), so each route
  is exactly as permissive as the write it enables and **no working flow lost access**. New
  net: `tests/e2e/api/media-route-authz.spec.ts` — 21 pure-HTTP tests covering all 7
  method+route pairs (401 unauthenticated / 403 for a butler holding neither permission /
  past-the-gate for an admin). Gates: tsc 0, smoke 30/30, unit 71/71, **full e2e 146/13/0**
  (the 125 pre-existing tests all still green). ⚠️ **Gotcha worth keeping:** status alone
  can't distinguish a gate rejection from a downstream failure — without YouTube OAuth
  credentials `update-youtube-video` answers an `invalid_grant` with **its own 401** — so the
  admin case asserts on the gate's error _messages_, not the code. **The 7th route,
  `generate-youtube-signed-url`, was DELETED rather than gated** (owner-approved): no caller
  anywhere, and `git log -S` showed every historical reference outside its own folder was
  documentation — dead since the commit that created it, superseded by `upload-youtube`; no
  env var orphaned. The butler post pages keeping only their `isAuthenticated` gate is
  **accepted** (owner, same day).
- **2026-07-25** — **Multi-mountain M8 DONE & committed on `dev` (`a237e8b`) — theme
  wiring + provisioning proof + docs close-out; the M0–M8 track is now complete.** `config.theme`
  is now
  live (was dead): a
  `primary` tailwind token resolves to a `--color-primary` CSS var (default `#FACC15` =
  geyang's shipped `brand.DEFAULT`), and the `[mountain]` layout injects
  `:root{--color-primary:<tenant primaryColor>}` per request (hex-validated, on `:root` so
  portaled modals inherit). The `from-brand to-accent` CTA gradient was repointed to
  `from-primary` on the **public** surfaces (shared `ui/Button`, header 입양홍보 CTA, Leaflet
  cluster marker, adoption + faq CTAs); geyang's stale `theme.primaryColor` `#ffbc00` →
  `#FACC15` so geyang is pixel-identical. **Owner chose "primary color only"** over the
  full-brand-ramp option — the `brand` ramp + admin-only `from-brand` CTAs stay static
  (documented as deliberately partial). Browser-verified: geyang CTA `#FACC15` (unchanged),
  manisan `#0ea5e9` (sky-blue). Gates: tsc 0, smoke 30/30, unit 71/71, **e2e 125/13/0**. M8 also
  **rewrote the provisioning guide** (`new-mountain-setup.md` → a real one-Firebase/one-Vercel
  host-routed runbook) and **finished the docs close-out** (`multi-tenant-config.md`,
  `services-layer.md`, `AGENTS.md`/`CLAUDE.md`, admin-manual §9, PROJECT_PLAN §9, decision
  framework → EXECUTED). **Multi-tenant hardening (M0–M8) is complete** — only owner-gated
  externalities remain (GA4 `mountain_id` dimension + Vercel `NEXT_PUBLIC_GA_MEASUREMENT_ID`;
  per-mountain DNS/allowlists for a real 2nd mountain). Committed as three commits: M7
  (`48f7085`), M8 theme + docs close-out (`a237e8b`), and the standalone GA4 setup guide
  (`7e3c517`). `dev` now leads `main` by these + M6; promotion to prod is gated on the P5.4
  YouTube pass.
- **2026-07-25** — **Multi-mountain M7 DONE on `dev` (committed `48f7085`) — analytics
  decoupled from Firebase → gtag.js + `mountain_id`.** `firebase/analytics` replaced by a
  shared **GA4** property loaded via `gtag.js`: a `next/script` `<Script>` in the **root**
  layout gated on `NEXT_PUBLIC_GA_MEASUREMENT_ID` and configured `send_page_view: false`, so
  `AnalyticsTracker` emits **every** `page_view` itself (on route change) carrying
  `mountain_id` from `useMountain()` — the shared property now segments per tenant, and the
  SDK's old no-`mountain_id` auto page_view no longer double-fires. `services/firebase.ts`
  drops the `getAnalytics` import + the browser-only `analytics` init guard + the export (only
  `AnalyticsTracker` used it); dead `measurementId` removed from `getFirebaseConfig`. Unset
  env var (dev / emulator / e2e / Preview) → no script, `window.gtag` undefined,
  `AnalyticsTracker` no-ops — identical to the old `analytics=null`. The dead `analytics`
  **rules** block was already removed in M5.2 (only `view-analytics` remains). Gates: tsc 0,
  smoke 30/30, unit 71/71, **full e2e 125/13/0** (no regression). **No prod migration.** 🔑
  **Owner-owed (not code):** GA4 property + `mountain_id` custom dimension registered **before
  any tenant-2 traffic** (GA4 never backfills), and `NEXT_PUBLIC_GA_MEASUREMENT_ID` set in
  Vercel Prod+Preview (supersedes the now-unused `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`).
  **Next open phase: M8** (geyang-as-one-of-many + theme wiring + provisioning guide).
- **2026-07-25** — **Multi-mountain M6 DONE on `dev` — scope corrected to
  per-tenant upload namespacing (no prod migration).** Shipped: image uploads prepend the
  active tenant's `storagePrefix` (`generate-signed-url` route + the direct-storage form
  strategy via `useMountain()`); geyang `''` → exact no-op, a new tenant's uploads isolate
  under `mountains/<id>/…`. **Correction:** the first draft also namespaced baked thumbnails +
  a `cats.thumbnailUrl` migration, but the owner's dry-run found **0 changes** — inspecting
  prod showed cat thumbnails **and** album photos serve from live Firebase **Storage URLs**,
  not baked paths, so they're already tenant-scoped. The thumbnail namespacing +
  `backfill-thumbnail-namespace.js` + the M6 cutover runbook + the e2e-fixture edits were
  **reverted/deleted**. Documented the baked-vs-Storage-URL model across
  `docs/codebase/media-and-youtube.md` (new "Image storage & serving strategy" section),
  `deployment-and-build.md`, both manuals, and the archived `IMAGE_STORAGE_EXPLAINED` (now
  flagged superseded). Gates: tsc 0, unit +2, smoke 30/30, **full e2e 125/13/0**. **No prod
  cutover.** **Next open phase: M7** (analytics → gtag.js).
- **2026-07-23** — **🎉 Multi-mountain M5 SHIPPED TO PRODUCTION (PR #8; cutover
  complete).** The `dev → main` promotion (merge commit `366425c`, 34 commits) put the full
  M1–M5 multi-tenant refactor + data protection + CI rules gate on prod. The owner ran the
  order-critical cutover in sequence: snapshot → migration (`currentRole`→`roles` map,
  `'default'`→`geyang`) → `firestore:indexes` (6 composite, Enabled) → **PR #8 merge** →
  `firestore:rules`. Production now stamps + scopes by `mountainId`, resolves
  `roles[mountainId]`, and enforces the mountain-aware rules. Only tail: delete the legacy
  `currentRole` + `about_content/about` + the local dump once the CMS is confirmed healthy.
  **The multi-tenant track advances to M6 (assets/storage namespacing).**
- **2026-07-23** — **CI wired for the M5 test surface (thread resolved).** Added
  a dedicated emulator-backed `rules` job to `.github/workflows/ci.yml` (checkout →
  setup-node → setup-java 21 → `npm ci` → Firebase-emulator cache → `npm run test:rules`),
  gated on `needs: checks`, parallel to `e2e`, no browser install. This closed the real
  gap: the default `npm test` (CI's `checks` job) **excludes `tests/rules/**`** (they need
the emulator), so the 11 mountain-aware rules tests ran nowhere in CI. The M5.4
two-tenant isolation e2e needed no wiring — the existing `e2e`job's`npm run test:e2e`already globs all of`tests/e2e/**`. YAML validated. **All M5 code + CI is now in;
  only the owner-gated rules/index prod deploy remains\*\* (owner is running the cutover).
- **2026-07-23** — **Multi-mountain M5.4b — two-tenant isolation e2e written;
  M5 now code-complete.** Two specs: `tests/e2e/api/tenant-isolation.spec.ts` (pure HTTP —
  data reads partitioned by request Host, and mountain-scoped API authz: a single-mountain
  admin is 403 on the other mountain's gated route / 200 on its own, asserted both ways,
  and a dual admin is 200 on both) + `tests/e2e/public/tenant-isolation.spec.ts` (rendered
  photo-album + 공지사항 content isolation, geyang `/pages/…` vs manisan `/manisan/pages/…`,
  desktop+mobile). Tenant targeted by overriding the request `Host` (verified Playwright
  honors it); tokens minted from the Auth-emulator REST. The `contacts` PII read-isolation
  is left to the rules suite (`users.rules.test.ts`), not duplicated. **Full e2e 125/13/0**
  (+9). Committed `6e37c6c`. **Remaining on M5: the owner-gated rules/index prod deploy
  (cutover runbook)** — CI wiring landed same day (see the next changelog entry).
- **2026-07-23** — **Multi-mountain M5.4a — stub tenant (`manisan`) added to
  config + seed.** The M5.4 isolation e2e's config prerequisite. `manisan` added to
  `config/mountains/mountains.json` with a new **`hidden: true`** flag (routable at
  `/manisan` + prerendered, but excluded from the public `MountainSelector` via the new
  `MountainConfig.hidden` + `getPublicMountains()` — routing keeps `getAllMountains()`);
  distinct branding, `storagePrefix: 'mountains/manisan/'`, reuses geyang map imagery.
  Resolves the `permissions.json` drift (it already listed `manisan`). Seed:
  `tests/e2e/fixtures/manisan.json` (distinct points/cats/cat_images/announcements/
  contacts/about + a manisan-only admin and a dual-mountain admin `dual-admin-uid`);
  `seed-emulators.mjs` refactored to stamp an explicit `mountainId` per pass + a
  `seedManisanTenant()` pass, and `seedAuthAndUsers` now takes both single-`role` and
  `roles[]` shapes. Gates: tsc, smoke 30/30, unit 39/39, **full e2e 116/13/0** (geyang
  unperturbed; build prerenders both `/geyang` and `/manisan`). Uncommitted. **Next =
  M5.4b isolation spec + wiring `test:rules` into CI.**
- **2026-07-23** — **Multi-mountain M5.3 route audit DONE (docs-only; no code
  change).** Walked all 21 `src/app/api/**` routes, checking every Firestore access path
  against the tenant model. **Verdict: no leak-by-omission** — content routes are
  tenant-scoped (cats/points/contact/assign-role/upload-youtube video record) and the
  identity/central-config routes (`users`, `role_permissions/*` matrix) are global by
  design. Only residual cross-tenant surface = the **shared YouTube channel**
  (non-Firestore; already deferred = M5.1 note b: per-tenant `getYouTubeChannelId` config
  but a single shared OAuth credential / `admin_config/youtube_auth` doc). Surfaced a
  **pre-existing, tenancy-orthogonal** gap — **7 ungated write/credential routes** — and
  logged it as an owner-owed open thread (owner chose log-not-fix). Plan §3 M5.3 checked
  off with the full per-route verdict; M5.4 two-tenant isolation e2e is the only M5
  remainder. **Next: M5.4** (blocked on the `manisan` stub in config + seed — the
  owner-flagged fresh-session CI thread). **Also prepped the M5 prod-cutover runbook and
  CORRECTED the cutover order:** the prior "migrate → deploy rules" thread was incomplete
  — the M5.2b rules deny any `mountainId`-less write, and the stamping code (M4) is only
  on `dev`, so the `dev → main` promotion must land **between** migrate and rules, and
  indexes must build before the app goes live. Open thread rewritten to the safe 6-step
  sequence with rollbacks.
- **2026-07-22** — **Multi-mountain M5.1 + M5.2 EXECUTED & COMMITTED.**
  **M5.1 (`d4a0bb2`)**: every content read scoped by `mountainId` (collection
  `where` + doc-by-id tenant guards + the 2 Admin-SDK server reads); new
  `firestore.indexes.json` (6 composite indexes, hand-derived — the emulator won't
  flag a missing one, and these services swallow query errors to `[]`). **M5.2
  (`47d0f3d`)**: role model → **map keyed by `mountainId`** (§0 sub-decision 6, owner
  2026-07-22 — one account can admin several mountains, host picks which);
  `hasPermissionFor(uid, perm, mountainId)` everywhere; `firestore.rules` rewritten
  mountain-aware (`canWrite` on the doc's own mountain + cross-mountain-move block +
  sensitive-read scoping + self-only `users` read + dead `analytics` block removed);
  `requireApiPermission` folds in M5.3's core; new signups get `roles: {}`. **M5.2a
  and M5.2b proved inseparable at the emulator gate** (rules + seed both key on the
  role shape). Migration `migrate-m5-role-and-about.js` written (dry-run default;
  normalizes legacy `'default'`→`geyang` so the prod admin isn't stranded; + about-doc
  copy). Rules tests rewritten (`test:rules` 11/11, mountain dimension). Gates: tsc,
  smoke 30/30, unit 39/39, rules 11/11, full e2e 116/13/0. 🔑 **Two owner-gated prod
  actions remain, ORDER-CRITICAL:** run the migration, THEN deploy the rules (a
  not-yet-migrated user is fail-closed → locked out). **Owner deployed the M0 rules
  bundle 2026-07-22.** Owner flagged **CI needs updating** for the new `test:rules`
  suite (+ the coming M5.4 isolation e2e) — to be designed in a fresh session.
  **Next: M5.3 route audit + M5.4 two-tenant isolation e2e.**
- **2026-07-20** — **Data protection built, after M4's backfill exposed
  that there was none.** The prod backfill ran with **no snapshot and no PITR**;
  it was survivable only because the change was additive and exactly reversible
  (one known field, one known value), not because anything protected it. A
  transforming migration would not have been. Now in place: **PITR enabled**
  (7-day window) + a **weekly** backup schedule + `export-firestore.js` /
  `import-firestore.js` (`a8d842f`, `c8829e2`) for local off-Google dumps, with
  the runbook as **admin-manual §10** (`d04c0cd`) and a snapshot-first
  precondition wired into the plan's M6. The restore is **round-trip verified**
  (prod → emulator → re-export → diff, 16/16 byte-identical) — which caught that
  timestamps must rebuild from `seconds`+`nanoseconds` rather than the
  ms-precision ISO string, and that **a dry run opens no connection** (a wrong
  emulator port survived a clean preview). Weekly-not-daily and
  no-GCS-export-bucket are both recorded with their reasoning so they aren't
  re-litigated. **Incidental find:** `image_uploader` (13 docs) is the **owner's
  separate uploader tool** sharing this Firestore — invisible to this codebase,
  no rules entry, no `mountainId`; flagged for M5 (see TL;DR).
- **2026-07-20** — **Multi-mountain M4 EXECUTED & COMMITTED
  (`b83a112`)**: data-tenancy stamping. The service factory became **per-tenant**
  (`getCatService(mountainId)` etc. via a shared `perTenant()` instance cache;
  storage/auth/permissions stay tenant-free), every create path stamps
  `mountainId`, and ~49 call sites were threaded — `useMountain()` on the client,
  `getRequestMountainId(request)` in API routes (`/api/points` and
  `/api/admin/cats` GET gained a `request` param). `media-albums`' module
  functions take an explicit `mountainId`; `syncVideos` now resolves the channel
  per-tenant. The `aboutContentService` module singleton was retired in favor of
  the factory (⚠️ its `about_content/about` **doc id stays shared** — a per-tenant
  id is an M5 decision). Backfill script
  `scripts/migration/backfill-mountain-id.js` written (dry-run mode, `merge:true`
  only per the Sheets-wipe precedent); emulator seeding stamps the tenant in
  `seed-emulators.mjs` rather than in each fixture file. Gates: tsc, smoke 30/30,
  unit 39/39, **full e2e 116/13/0**, browser pass (map, both albums, about,
  공지사항; console clean). ⚠️ One flake en route — `admin/posts.spec.ts`
  announcement-create hit the **known P6 dialog→`router.push` race**
  (`DEBUG_LOG` 2026-07-19; its `setTimeout(…,0)` fix is load-sensitive); cleared
  by 17/17 isolated re-runs + a clean full re-run. **The 🔑 prod backfill then ran
  the same day** — 99 docs stamped, triple-verified (see the workstream section).
  **Next: M5.**
- **2026-07-19** — **Multi-mountain M1–M3 EXECUTED & COMMITTED**
  (`8920c66`, `092d226`, `491b832` after docs `5672330`): decoupling → config
  layer to explicit `mountainId` + tenant helpers → the `[mountain]` route
  segment + host-rewrite middleware. M3's gate: **full e2e 116/0 with zero
  e2e-spec rewrites**. Session closed at the M4 boundary (tree clean); M4
  resume-notes (factory parameterization lands there; 64 call sites scouted)
  recorded in the plan doc. Process: the same-day auto-commit grant was
  **revoked** — every commit is owner-gated again. Incidental finds this
  session, logged in the plan: the contact-submit spec has a pre-existing
  hydration-race flake; local `test:e2e` clobbers `public/` images with
  emulator fixtures (re-run `fetch:assets`); Java for the emulators lives at
  `/usr/local/opt/openjdk/bin` (PATH-prefix it).
- **2026-07-19** — **Multi-mountain refactor PLANNED**: owner answered
  Q1–Q8 (management-only · B1 · A1+subdomains · visitor selector); wrote the
  execution plan `multi-mountain-refactor-plan-20260719.md` (M0–M8: decoupling →
  request-time config → `[mountain]` segment + middleware → stamp/backfill →
  scoped reads + mountain-aware rules + isolation e2e → assets/storage → gtag.js
  analytics → stub tenant + provisioning guide); recorded answers in the decision
  framework + PROJECT_PLAN §9. No code changed. Execution gated on explicit
  go-ahead at M1; M0 = the pending rules deploy (owner-run, must precede the
  track's rules changes).
- **2026-07-19** — **Session close**: P6 committed (`2584dcb`) — the
  complexity-retirement track is fully executed and on `dev` as seven commits.
  TL;DR re-pointed for the next session (owner-owed P5.4 manual YouTube pass /
  rules deploy / multi-tenant Q1); PROJECT_PLAN tech-debt row notes the track
  done; e2e memory baseline updated to 116/13.
- **2026-07-19** — **Complexity retirement P6 DONE — track fully
  executed**: ~45 native `alert()/confirm()` sites (editors + the four public
  forms via their shared hooks) converted to the new promise-based `ui/useDialog`
  Modal primitive; the four specs' dialog handlers rewritten to Modal assertions.
  The P0 net caught a real regression en route — the dialog unmount re-render
  canceled the post-submit `router.push`; fixed by deferring promise resolution
  past the unmount commit (`DEBUG_LOG`). Docs + logs closed out (PROJECT_PLAN §7,
  assessment → ✅ EXECUTED, FEATURE_MOD_LOG). Final full e2e **116/13/0**. Bundle
  **uncommitted**. Owner-owed: P5.4 manual YouTube pass before promotion.
- **2026-07-19** — **Complexity retirement P5 DONE (Target A complete)**:
  both editors recomposed on the toolkit (tag-images 1,715→821 + shared
  `ui/Lightbox`; tag-videos 2,450→1,261 + page-owned 570-line
  `useYouTubeVideoMutations`), twin drift absorbed as toolkit knobs, videos filter
  panel kept page-owned (drifted layout). Full e2e **116/13/0** + tsc/smoke/unit +
  full-page screenshot passes. Bundle **uncommitted**; next: commit → P6.
  ⚠️ Manual YouTube pass still owed before promotion.
- **2026-07-19** — **Complexity retirement P4 DONE** (committed `34c5c68`; P3
  committed `1d13e09` on go-ahead earlier the same session): both editors swapped
  onto the shared `CatSelectorModal` (commit-on-done; dead `'youtube-batch'`
  context dropped), toolkit skeleton landed unused under
  `src/components/admin/media/`, filename date parser moved into
  `@/utils/dateParser` (converged with the title parser). Full e2e **116/13/0**
  against the swap + screenshot browser-pass over all four selector contexts;
  P4.5 toolkit interfaces owner-approved.
- **2026-07-19** — **Complexity retirement P3 DONE**: full-gate re-run
  green — e2e **116/13/0** (locator fix held; "expect 117" was an off-by-one — the
  Family A spec adds 2 tests to the 114 P2 baseline), tsc/smoke/unit green.
  Assessment §8 P3.4/P3.5 flipped ✅.
- **2026-07-19** — **Complexity retirement P3 code+specs done, gate re-run
  pending** (session ended mid-gate): Family A migrated onto `useRichContentForm` +
  the lifted signed-URL strategy (집사톡's broken image upload fixed — `DEBUG_LOG`);
  Family A create specs added to the net (text-only by design). First full run
  115/1 — the 1 failure a spec locator ambiguity, fixed in-tree. Bundle
  **uncommitted**; resume = re-run `test:e2e`, flip P3.4/P3.5, commit on go-ahead,
  then P4.
- **2026-07-19** — **Complexity retirement P2 DONE**: Family B migrated
  onto `useSimpleContentForm` + `MediaUploadField` (공지사항 488→153, 입양홍보
  411→95; −651 lines), `react-hook-form` uninstalled, +2 whitespace-validation
  specs. Full e2e **114/13/0** against the migrated forms. P3 scouting: butler-talk
  signed-URL upload latently broken (wrong destructured keys) — fix lands with the
  P3 convergence. Next: P3.
- **2026-07-19** — **Complexity retirement P1 DONE**: `MediaUploadField` +
  injectable upload strategies landed under `src/components/forms/` (direct-storage
  image strategy verbatim-B, shared YouTube upload with optional Family-A fields —
  failure-handling reconciliation deferred to P3), unit (6) + smoke coverage, vitest
  `@` alias. No form migrated; gates green. Next: P2 (migrate Announcement +
  Adoption, drop `react-hook-form`).
- **2026-07-19** — **Complexity retirement P0 DONE** (on explicit
  go-ahead): characterization net written against unrefactored code — Family B
  create-flow specs incl. image upload, editor specs for `tag-images`/`tag-videos`
  (YouTube surfaces excluded), fixture + watchdog infra. Full e2e baseline **112
  passed / 13 skipped / 0 failed**; tsc + smoke green. Assessment §8 P0 checked off
  with execution notes (pinned: `batchUpdateTags` keeps selection; commit-path-only
  cat-selection assertions so P4's commit-on-done lands without net rewrite).
  Next: P1.
- **2026-07-18** — **Owner deep-dive DONE** (complexity retirement): walked
  `tag-images`/`tag-videos` side-by-side — the write paths are **not** twins (Firestore
  service calls vs YouTube API orchestration), so the generic `MediaTaggingEditor<T>`
  was **replaced by a toolkit** of shared hooks + presentational components (§1.3a);
  **`react-hook-form` dropped** (dep removed in P2; §2.2 corrected — video upload is
  YouTube in all four forms, strategy axis is images only); `CatSelectorModal`
  **commit-on-done** accepted as intentional; retired-LOC revised to **~2,100–2,900**;
  priority: this track next, multi-tenant stays parked. Assessment §7 re-locked +
  plan/tasks reworded (P1–P5). **Execution awaits the explicit P0 go-ahead.**
- **2026-07-18** — Queued the **owner deep-dive into the complexity-retirement
  decision substance** as its own track (4 items: worth-it/timing, `MediaTaggingEditor<T>`
  shape, re-examine the locked decisions, priority) — execution gate moved behind it.
  TL;DR now routes to **two resumable tracks** (multi-tenant Q1, or the complexity
  deep-dive).
- **2026-07-18 (later)** — Added the **multi-tenant / second mountain** workstream and
  **parked it**: decision framework drafted
  (`multi-tenant-architecture-decision-20260718.md`, Q1–Q8 open), Tier 1 write
  migration **done & committed** (`6f288d7` — role writes → Admin-SDK transactional
  route, audit log restored, `users` admin write clause removed). Updated the rules
  deploy bullet + the Uncommitted list (PROJECT_PLAN rode along with `6f288d7`).
  Then **reviewed the complexity-retirement assessment** (side task): all quantitative
  claims verified exact against source; amendments applied — new **P0
  characterization-test phase** (no e2e touches the editors; the parity net must
  pre-exist the refactor), YouTube manual-parity constraint (P5.4), P1→P3.0
  strategy-lift re-sequencing, P6.1 forms-alert scope note, plus
  filename/cross-ref/`useEffect` fixes. Detail in the workstream section above + the
  assessment's own review note.
- **2026-07-18** — Added the **complexity retirement (refactor)** workstream (📋 planned,
  not started) + the `PROJECT_PLAN` §7 entry. Answered the "Next.js/React → HTMX?"
  feasibility question (**no** — complexity is in the client components, not the
  framework) and replaced it with an in-place plan over ~2,800–3,400 LOC across 6 files;
  decisions locked, 6 gated phases, ~27 tasks. _Doc-housekeeping note: the assessment
  file existed untracked from a 2026-07-16 session and was **overwritten** by the current
  rewrite before being read; the prior draft is unrecoverable (untracked, no editor
  history/snapshot, no surviving transcript). Today's version is source-verified against
  the code on `dev`._
- **2026-07-16** — Created this living hand-off, consolidating `handoff-28`'s
  still-current state (compliance shipped, 탈퇴 flow, mypage logout fix, map re-fit)
  with the **testing-workstream closure** and the **PR #7 `dev → main` promotion** +
  branch protection. Supersedes the discrete `handoff-NN` series as the read-first
  entry point.
