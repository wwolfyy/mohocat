#!/usr/bin/env node
'use strict';

/**
 * work_tracking/scripts/import/handoff.js — migration importer for `docs/handoff/HANDOFF.md`.
 *
 * 🔴 **This is the file the migration plan called the hard one, and for two measured reasons.**
 *
 *   1. **Its open items have no standard markup.** They are written as a bold-wrapped,
 *      backtick-quoted box — the literal bytes are `- `, `**`, a backtick, `[ ]`, a backtick —
 *      so the box never starts a line and `grep '^- \[ \]'` returns **zero**. An extractor keyed
 *      on the usual pattern imports nothing while reporting success.
 *   2. **Its decisions exist only in prose**, scattered as sentences through three thousand
 *      lines of session narrative, with nothing to key on at all.
 *
 * 🔑 **So this script keys on nothing structural. Every record below names an `from` anchor —
 * a verbatim substring of the line it starts at — and a `to` anchor that ends it.** The `from`
 * anchor must be unique in the file and the `to` anchor must exist after it, or the script
 * throws. That is what makes a hand-built table safe: if the source moves under it, the run
 * fails instead of silently importing the wrong span.
 *
 * 🔑 **The table is a decision table, not an extraction.** The script guarantees the prose is
 * carried over verbatim, including its blockquote markers, so the stored text still matches
 * what `git show <pin>` returns. A human set every `type`, `status`, `outcome`, `ts` and `note`,
 * and **every open item was re-verified against the code on 2026-08-09 before being imported as
 * open** — which caught three stale claims and two partly-stale ones. Those are marked ⚠️ STALE
 * below and imported at their true status.
 *
 * **Deliberately not imported:**
 *   - "Deferred e2e Phase 8" (`docs/handoff/HANDOFF.md` L2463) — the same five items were
 *     already imported from `PROJECT_PLAN.md` §10 as `R-0234`…`R-0238`. Importing them again
 *     would be the cross-file duplication Phase 3 exists to resolve, in a new coat.
 *   - The `mountain-2-prerequisites.md` line items (§1.2 `syncVideos()`, §1.3 the playlist
 *     back-fill, §1.4 the members roster leak, §3.1 the CMS mountain label). The owner decided
 *     on 2026-07-28 that those live in that one document — indexed here as `R-0344` — and the
 *     hand-off should point at it rather than re-list them. Re-listing them as rows would
 *     reverse that decision by accident. ⚠️ §1.4 was verified still live on 2026-08-09
 *     (`src/app/api/admin/get-all-user-permissions-client/route.ts:23` runs an unfiltered
 *     `db.collection('users').get()`); it is recorded on the decision record that supersedes
 *     its siblings, not dropped.
 *   - **"Older carry-over: album-nav un-greying action"** (the last bullet of the open-threads
 *     section). It was imported, shown to the owner, and **dropped on their answer — they had no
 *     idea what it referred to** (2026-08-09). ⚠️ Note the ids below shifted by one when it was
 *     removed and the import re-run, so it holds no reserved id: nothing was renumbered, because
 *     nothing had been committed. The source gives one line, no date and no context, and
 *     nothing in `src/components/album/` matches it. 🔑 **A carry-over nobody can define is not
 *     an open item, it is a rumour** — keeping it would put something unstartable on the open
 *     list, which is the exact failure `status: deferred` was added to prevent. It is recorded
 *     here rather than in the store because the fact worth keeping is that it was **considered
 *     and found meaningless**, not the item itself.
 *   - Session narrative: gate counts, commit tables, and the "how it went wrong first" stories
 *     whose conclusions already exist as `bug` / `change` / plan records `R-0001`…`R-0326`.
 *     Per the owner (2026-08-09), a decision is imported when its **reasoning is recorded
 *     nowhere else in the store**.
 *
 * ⚠️ **This script no longer runs against a live source, and that is the point.** `SOURCE` was
 * cut in the same commit that added its rows — `docs/handoff/HANDOFF.md` is now a short
 * current-state page and the body this read is frozen at
 * `docs/handoff/archive/2026-08-09-handoff-living-doc.md`. It is kept as the record of *how* the
 * 57 rows were classified, not as a tool to re-run. To re-read the original bytes:
 * `git show 2e07e3e:docs/handoff/HANDOFF.md`.
 *
 * Usage: handoff.js [--dry-run]
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const lib = require('../lib');

const logger = lib.createLogger('work_tracking/import/handoff');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

/**
 * `SOURCE` is the **logical** origin — what `source_ref` records, pinned to the commit the
 * content was read from. `SOURCE_FILE` is where those bytes live **now**.
 *
 * They differ because this importer cut its own origin: `docs/handoff/HANDOFF.md` is a short
 * current-state page from 2026-08-09 onward, and the body these records were read from was
 * archived in the same commit. ⚠️ **Do not "fix" this by pointing `SOURCE` at the archive** —
 * a record's provenance is the file it came from at the commit it came from, and rewriting it
 * to the file's later resting place is how a pin stops meaning anything.
 */
const SOURCE = 'docs/handoff/HANDOFF.md';
const SOURCE_FILE = 'docs/handoff/archive/2026-08-09-handoff-living-doc.md';

/**
 * 🔑 **De-duplication, done by measurement rather than by feel (2026-08-09).**
 *
 * The owner's rule for this pass: a decision is imported when **its reasoning is recorded
 * nowhere else in the store**. Fifty-six decision-shaped passages survived the read; each was
 * then probed against all 346 existing records for a distinctive phrase of its own reasoning,
 * and the twenty below turned out to be already covered — mostly because the same person wrote
 * `DEBUG_LOG.md` and this hand-off about the same event on the same day, and the log entry is
 * the fuller of the two.
 *
 * They stay in the table rather than being deleted, so the call is auditable: the map says
 * which record won, and re-running the importer re-states the decision instead of hiding it.
 *
 * ⚠️ **These are the ones the hand-off duplicates, not the ones it uniquely holds.** Anything
 * absent from this map was probed and found nowhere else — that is why it is being imported.
 */
const COVERED_BY_EXISTING = {
  'D-colour-is-global': 'R-0322',
  'D-status-hues-stay-status-hues': 'R-0053',
  'D-leaflet-keeps-its-hex': 'R-0053',
  'D-f3-corner-radius': 'R-0050',
  'D-media-cap-is-static-config': 'R-0070',
  'D-video-autoprune-rejected': 'R-0010',
  'D-htmx-rejected': 'R-0182',
  'D-react-hook-form-dropped': 'R-0182',
  'D-media-tagging-editor-rejected': 'R-0182',
  'D-youtube-owns-video-tags': 'R-0061',
  'D-consent-modal-discarded': 'R-0074',
  'D-delete-gates-on-password-credential': 'R-0074',
  'D-smtp-from-equals-user': 'R-0052',
  'D-collections-are-not-configurable': 'R-0071',
  'D-share-chip-settled-the-link-shape': 'R-0075',
  'D-one-youtube-channel': 'R-0087',
  'D-no-firebase-media-baked': 'R-0066',
  'D-read-the-deployed-artifact': 'R-0063',
  'D-comments-on-community-types-only': 'R-0272',
  'D-playlists-per-mountain-plus-shared': 'R-0222',
};

/**
 * `key`      — stable handle for the entry; `source_ref` preserves it, so it must not change.
 * `from`/`to` — verbatim substrings. The span runs from the line containing `from` up to, but
 *               not including, the first line at-or-after it containing `to`.
 * `ts`       — the date the source itself gives the item, never the date of this import.
 */
const ITEMS = [
  // ---------------------------------------------------------------------------------------
  // Open items. The `- **`[ ]`` boxes, plus the two the fresh-session box promoted out of them.
  // ---------------------------------------------------------------------------------------
  {
    key: 'H-signout-permission-read',
    ts: '2026-08-02',
    type: 'bug',
    status: 'open',
    title:
      'Signing out issues an unauthenticated Firestore permission read, and the catch swallows it',
    note: 'verified still live 2026-08-09 — permission-service.ts:47-51 still logs and substitutes the local config, and role_permissions/role-config is still gated on request.auth != null',
    files: ['src/services/permission-service.ts', 'config/firebase/firestore.rules'],
    from: '- **`[ ]` Signing out logs a Firestore permission error, and the fallback swallows it',
    to: '- **`[ ]` Live-verify the auth changes on Preview (2026-08-02).**',
  },
  {
    key: 'H-orphan-delete-verification',
    ts: '2026-08-01',
    type: 'task',
    status: 'open',
    title: 'The orphan-delete path has never been verified in production — the last live PIPA gap',
    note: 'verified still live 2026-08-09 — LoginForm.tsx:116 still calls deleteImplicitlyCreatedAccount; only a production Firebase console can answer it, so no suite ever will',
    files: ['src/lib/auth/deleteImplicitlyCreatedAccount.ts', 'src/components/LoginForm.tsx'],
    from: '> 2. ## 🔴 THE ORPHAN-DELETE PATH IS STILL UNVERIFIED — the last live gap',
    to: '> 3. ### ✅ The other piled-up verifications are DONE (owner, 2026-08-08)',
  },
  {
    key: 'H-preview-auth-verification',
    ts: '2026-08-08',
    type: 'task',
    status: 'done',
    title:
      'Live-verify the auth changes on Preview — Kakao sign-in, its linking fallback, and the orphan delete',
    note: '⚠️ STALE AS WRITTEN. The Kakao halves were verified against production 2026-08-08 and the box was never ticked; only the orphan-delete half survives, and it is its own record',
    files: null,
    from: '- **`[ ]` Live-verify the auth changes on Preview (2026-08-02).**',
    to: '- **`[ ]` Owner call: should `설명 없음` come back on the photo modal?',
  },
  {
    key: 'H-photo-modal-filler',
    ts: '2026-08-02',
    type: 'question',
    status: 'open',
    title: 'Owner call: should the `설명 없음` filler come back on the photo modal?',
    note: 'verified still open 2026-08-09 — the filler is gone from every rendering path; the only survivor is a now-stale comment in uploadStrategies.ts:360 claiming the album still renders it',
    files: null,
    from: '- **`[ ]` Owner call: should `설명 없음` come back on the photo modal?',
    to: '- **`[ ]` Existing photo records still carry fabricated 촬영일',
  },
  {
    key: 'H-fabricated-recording-dates',
    ts: '2026-08-02',
    type: 'task',
    status: 'done',
    title: 'Existing photo records carry fabricated 촬영일 — videos self-heal, photos do not',
    note: 'the owner fixed the affected photos by hand; kept as a record of the general case, since cat_images has no upstream to correct a wrong date',
    files: null,
    from: '- **`[ ]` Existing photo records still carry fabricated 촬영일',
    to: '- **`[ ]` Tap the 이 냥이 링크 chip on a real phone (2026-08-01).**',
  },
  {
    key: 'H-share-chip-on-a-phone',
    ts: '2026-08-08',
    type: 'task',
    status: 'done',
    title: 'Tap the 이 냥이 링크 chip on a real phone — the mobile half proven only by stubs',
    note: '⚠️ STALE. Verified against production 2026-08-08 (the same file records it as to-do #3), but the box was left unticked — exactly the rot this migration exists to stop',
    files: null,
    from: '- **`[ ]` Tap the 이 냥이 링크 chip on a real phone (2026-08-01).**',
    to: '- **`[ ]` Owner call, not blocking: a GA4 `page_view` now fires per cat-modal open.**',
  },
  {
    key: 'H-ga4-page-view-per-modal',
    ts: '2026-08-01',
    type: 'question',
    status: 'open',
    title: 'Owner call: a GA4 `page_view` now fires on every cat-modal open',
    note: 'verified still open 2026-08-09 — AnalyticsTracker still fires on every searchParams change, with no `cat` exclusion anywhere',
    files: ['src/components/AnalyticsTracker.tsx'],
    from: '- **`[ ]` Owner call, not blocking: a GA4 `page_view` now fires per cat-modal open.**',
    to: '- **`[x]` Safari pass — ✅ PASSED 2026-08-08, in production**',
  },
  {
    key: 'H-safari-pass',
    ts: '2026-08-08',
    type: 'task',
    status: 'done',
    title: 'Safari pass — confirm the 30-second Firestore stall is gone in production',
    note: 'the tell changed when the fix shipped: the criterion is duration, not the absence of the 없어요 copy, which fix B made unreachable while loading',
    files: null,
    from: '- **`[x]` Safari pass — ✅ PASSED 2026-08-08, in production**',
    to: '- **`[ ]` One owner decision from 2026-08-01, not blocking:**',
  },
  {
    key: 'H-youtube-missing-panel-thumbnails',
    ts: '2026-08-01',
    type: 'question',
    status: 'open',
    title:
      'Owner call: should the CMS "YouTube에 없는 영상" panel show thumbnails instead of a title list?',
    note: "text-only is the deliberate default — a deleted video's thumbnail is YouTube's grey placeholder, so a thumbnail grid would be a row of grey boxes",
    files: null,
    from: '- **`[ ]` One owner decision from 2026-08-01, not blocking:**',
    to: '- 📌 **`youtubeStatus` is absent on any record never checked',
  },
  {
    key: 'H-video-title-twice',
    ts: '2026-07-31',
    type: 'question',
    status: 'open',
    title: "Owner call: a video's 제목 appears twice — YouTube's player overlay and our caption",
    note: 'left in because the owner explicitly asked for the title to be visible; dropping the caption title for videos is a one-line change in PostMedia',
    files: null,
    from: '- **`[ ]` Two owner decisions from 2026-07-31, neither blocking:**',
    to: '  - **An 입양홍보 popup can displace a 공지사항 one.**',
  },
  {
    key: 'H-popup-precedence',
    ts: '2026-07-31',
    type: 'question',
    status: 'open',
    title: 'Owner call: may an 입양홍보 popup displace a 공지사항 one?',
    note: 'today one popup per visit, most recently updated wins across both kinds — the pre-existing rule extended, not a new one; both alternatives are a product call',
    files: null,
    from: '  - **An 입양홍보 popup can displace a 공지사항 one.**',
    to: '- ✅ **RESOLVED 2026-08-02 — the suite is green (3× consecutive 199/13/0).**',
  },
  {
    key: 'H-env-storage-bucket',
    ts: '2026-07-29',
    type: 'task',
    status: 'open',
    title:
      'Local uploads went to the pre-migration Storage bucket, and what landed there is stranded',
    note: '⚠️ PARTLY STALE — verified 2026-08-09 that .env now names mountaincats-61543, so the misconfiguration itself is fixed; what survives is the second half, that anything uploaded from localhost before the change sits in a bucket nothing reads and nobody has looked',
    files: null,
    from: '- 🔑 **Owner-owed, local only:** `.env` still sets',
    to: '- ✅ **RESOLVED 2026-07-31 — image upload works on `dev`**',
  },
  {
    key: 'H-preview-popup-and-409',
    ts: '2026-07-31',
    type: 'task',
    status: 'open',
    title: 'Unverified on Preview: the 입양홍보 popup and the duplicate-filename 409',
    note: 'the 409 is the one path with no automated cover possible at all — getSignedUrl signs with a service-account key the credential-less harness lacks, and the Storage emulator cannot sign',
    files: null,
    from: '  - ⏳ **Still unverified on the deployed Preview:** the **입양홍보 popup**',
    to: '- ✅ **RESOLVED 2026-07-29 — no composer invents tags any more.**',
  },
  {
    key: 'H-tag-videos-unverified',
    ts: '2026-07-26',
    type: 'task',
    status: 'open',
    title: 'Four /admin/tag-videos repairs are unverified against real YouTube',
    note: 'emulator fixtures have no publish dates and no credentials, so all four are stubbed in e2e — the 게시일 repair, 메타데이터 수정 appearing, 자동 날짜 인식, and the batch playlist save',
    files: null,
    from: '  - ⏳ **Unverified against real YouTube**',
    to: '- ✅ **Batch edits never reached Firestore — FIXED 2026-07-26 (owner-reported).**',
  },
  {
    key: 'H-admin-button-spec-sheets',
    ts: '2026-07-26',
    type: 'task',
    status: 'open',
    title: 'Per-page admin button spec sheets — the owner wants one for every CMS page',
    note: 'verified still open 2026-08-09 — docs/manuals/admin-manual/ holds only tag-videos-spec.md, and it is source-derived rather than browser-verified',
    files: ['docs/manuals/admin-manual/tag-videos-spec.md'],
    from: '- 📌 **New workstream started: per-page admin button spec sheets.**',
    to: '- ⏸️ **DEFERRED — 촬영일 is guessed from the filename when it should be read from the file.**',
  },
  {
    key: 'H-recording-date-from-metadata',
    ts: '2026-07-27',
    type: 'task',
    status: 'deferred',
    title:
      "촬영일 is guessed from the filename when it should be read from the file's own metadata",
    note: 'the owner deferred this explicitly on 2026-07-27 and does not want it picked up — restart only if the owner asks for it. Recorded to explain why 촬영일 comes out empty on an iPhone upload, not to schedule the work',
    files: null,
    from: '- ⏸️ **DEFERRED — 촬영일 is guessed from the filename when it should be read from the file.**',
    to: '- 📁 **Everything gated on "before a real mountain #2" now lives in one doc:**',
  },
  {
    key: 'H-post-cutover-cleanup',
    ts: '2026-07-23',
    type: 'task',
    status: 'open',
    title:
      'M5 post-cutover cleanup — legacy role fields, the superseded about doc, and the local dumps',
    note: '⚠️ PARTLY STALE — about_content/about was already deleted by the 2026-08-02 migration. The dump half is worse than written: verified 2026-08-09 that backups/firestore/ holds SEVEN dumps, not one, each carrying an OAuth refresh token and PII',
    files: null,
    from: '  - ⏳ **Post-cutover cleanup (owner, low-priority, do once prod CMS is confirmed healthy',
    to: '  - 📝 The `manisan` stub is `hidden: true`',
  },
  {
    key: 'H-withdrawal-click-through',
    ts: '2026-07-16',
    type: 'task',
    status: 'open',
    title: 'Click through the 탈퇴 flow in production with a throwaway account',
    note: 'undated in the source — carried since this living hand-off was created on 2026-07-16, so that is the ts. It deletes irreversibly, which is why nobody has clicked it end to end in prod',
    files: null,
    from: '- **탈퇴 flow live click-through** with a **throwaway** account',
    to: '- **Compliance carry-overs** (deferred, accepted',
  },
  {
    key: 'H-compliance-carry-overs',
    ts: '2026-07-16',
    type: 'task',
    status: 'deferred',
    title:
      'Compliance carry-overs — legal review, signup consent, a PIPA audit, and Kakao scope verification',
    note: "deferred and accepted as such; the restart condition is scaling membership, and the source says to reopen them before that happens. Undated in the source, so the ts is this hand-off's creation date",
    files: null,
    from: '- **Compliance carry-overs** (deferred, accepted',
    to: '- **Branch-workflow decision (undecided):**',
  },
  {
    key: 'H-branch-workflow',
    ts: '2026-07-16',
    type: 'question',
    status: 'open',
    title: 'Owner question: keep the dev-promotion model, or move to GitHub Flow?',
    note: "both viable — merge commits fit promotion, squash fits GitHub Flow. Undated in the source, so the ts is this hand-off's creation date",
    files: null,
    from: '- **Branch-workflow decision (undecided):**',
    to: '- **Deferred e2e Phase 8** (not required for "done"):',
  },
  {
    key: 'H-admin-colour-glance',
    ts: '2026-08-06',
    type: 'task',
    status: 'open',
    title:
      'Glance at the admin screens while logged in — the only unverified part of the colour work',
    note: '/admin/* sits behind AdminAuth and no session had credentials, so those screens are proven by compiled-CSS equality rather than by looking',
    files: null,
    from: '> 1. **Glance at the admin screens while logged in**',
    to: '> 2. ## 🔴 THE ORPHAN-DELETE PATH IS STILL UNVERIFIED',
  },

  // ---------------------------------------------------------------------------------------
  // Decisions. Prose-only in the source — the entries the restructure exists to capture.
  // ---------------------------------------------------------------------------------------
  {
    key: 'D-firestore-database-rename',
    ts: '2026-08-05',
    type: 'decision',
    status: 'abandoned',
    outcome: 'rejected',
    title: 'Renaming the Firestore database was investigated and dropped',
    note: 'if the goal ever returns, the useful version is ADDING a database — additive, reversible, and it needs no write freeze',
    files: null,
    from: '> ⏸️ **Renaming the Firestore database was investigated and dropped (owner, 2026-08-05).**',
    to: '> **Do these next, in this order:**',
  },
  {
    key: 'D-type-param-fallback',
    ts: '2026-08-02',
    type: 'decision',
    status: 'abandoned',
    outcome: 'rejected',
    title: 'The `?type=` fallback for post routing was written and rejected on review',
    note: 'it protected nothing and recreated the bug silently — a param can go missing while the route still matches. The type is a path segment with no default instead',
    plan: '§10k',
    files: null,
    from: '> ⚠️ **A fallback was written, and rejected on review — read this before adding one.**',
    to: '> 🔬 **Three test-harness findings, all from refusing to re-run until green.**',
  },
  {
    key: 'D-colour-is-global',
    ts: '2026-08-06',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title:
      'A mountain may not differ in colour — the palette is global, and M8 is withdrawn, not deferred',
    note: 'recorded in design.md §Colors, which was the one document a designer reads first and the only place it was missing',
    plan: '§10u',
    files: ['docs/design/design.md', 'tailwind.config.js'],
    from: '> 🔑 **4.3 was the point of the phase, and it is done: `design.md` §Colors now carries the',
    to: '> ⚠️ **These four status hues stayed status hues on purpose.**',
  },
  {
    key: 'D-status-hues-stay-status-hues',
    ts: '2026-08-06',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title:
      'The four status hues stayed status hues — tokenizing them to `brand` was the one available regression',
    note: 'design.md keeps warning/error/success distinct from brand, so the rename would have made a caution notice adopt the brand hue',
    plan: '§10u',
    files: null,
    from: '> ⚠️ **These four status hues stayed status hues on purpose.**',
    to: '> ✅ **Gates:** `tsc` 0 · smoke **39** · unit **196**',
  },
  {
    key: 'D-leaflet-keeps-its-hex',
    ts: '2026-08-06',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: 'LeafletMountainMap keeps its raw hex deliberately — do not "finish" this one',
    note: 'Leaflet writes the polyline colour into the SVG stroke presentation attribute, which accepts neither a Tailwind class nor var(); the same treatment CatGrid already has',
    plan: '§10u',
    files: ['src/components/LeafletMountainMap.tsx'],
    from: '> ⚠️ **`LeafletMountainMap:302` keeps its `#6b7280` deliberately**',
    to: '> 🔑 **4.3 was the point of the phase',
  },
  {
    key: 'D-destructive-modals-keep-red',
    ts: '2026-08-08',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: 'Destructive modals keep a red button, so they are not on `useDialog.confirm()`',
    note: 'the obvious conformance fix would have removed the danger affordance — §Modal requires it and that API cannot render one',
    plan: '§10u',
    files: null,
    from: '>    ⚠️ **Two places the obvious fix was wrong, both worth knowing.**',
    to: '> 6. ### ✅ F3 (corner radius) resolved',
  },
  {
    key: 'D-f3-corner-radius',
    ts: '2026-08-08',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title:
      'F3 (corner radius) was resolved by a different route than the one approved — the spec was silent, not violated',
    note: 'measuring the public components first showed admin-only normalisation would have made admin DIVERGE; §Shapes gained descriptive rows and only 28 genuine buttons and cards moved',
    plan: '§10u',
    files: ['docs/design/design.md'],
    from: '> 6. ### ✅ F3 (corner radius) resolved — but by a different route than the one approved',
    to: '> 7. **Then the path-based tenancy migration (T0–T7)**',
  },
  {
    key: 'D-one-video-per-post-reversed',
    ts: '2026-07-30',
    type: 'decision',
    status: 'abandoned',
    outcome: 'rejected',
    title: '"One video per post" was reversed before it was built — do not implement a cap',
    note: 'the 2026-07-29 decision was replaced the next day: the admin composers stay unrestricted, and what those forms actually lacked was per-file upload, the opposite of a cap',
    plan: '§10d',
    files: null,
    from: '- **🔄 "One video per post" was REVERSED before it was built (owner, 2026-07-30) — do not',
    to: '  - 📌 **Not a bug — do not re-investigate.**',
  },
  {
    key: 'D-picker-not-a-bug',
    ts: '2026-07-30',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: "Not a bug: 공지사항's picker refuses videos because it is the image picker",
    note: 'the image picker sits first in 공지사항 and second in 집사톡, so muscle memory lands on the wrong one; accept="image/*" correctly disables videos. Aligning the section order is proposed, not decided',
    plan: '§10d',
    files: null,
    from: '  - 📌 **Not a bug — do not re-investigate.**',
    to: "- ✅ **RESOLVED 2026-08-01 — shareable link to one cat's modal (decided 2026-07-29).**",
  },
  {
    key: 'D-per-cat-page-declined',
    ts: '2026-07-29',
    type: 'decision',
    status: 'abandoned',
    outcome: 'rejected',
    title:
      'A per-cat page /pages/cats/[id] was declined on cost — so link previews still do not show the cat',
    note: 'the app has no generateMetadata/openGraph anywhere, so a shared cat link renders the homepage card; it matters most for 입양홍보, where the card does the persuading. Nothing about the ?cat= work forecloses revisiting it',
    plan: '§10c',
    files: null,
    from: '  - 📌 **Still true, and still the reason to revisit `/pages/cats/[id]` one day: it does not fix',
    to: '- 🔑 **Owner-owed, local only:**',
  },
  {
    key: 'D-youtube-owns-video-data',
    ts: '2026-07-26',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title:
      'YouTube is the source of truth for videos — no UI path may write video data to Firestore',
    note: 'anything written there is undone by the next sync, so such a write is broken by construction rather than merely risky. The rule, not a code guard, is what stops the next occurrence',
    files: null,
    from: '  - 🔑 **Principle adopted (owner, 2026-07-26): YouTube is the source of truth for videos; no',
    to: '  - ⏳ **Unverified against real YouTube**',
  },
  {
    key: 'D-youtube-owns-video-tags',
    ts: '2026-08-06',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: 'YouTube owns `cat_videos.tags` — finish any rename on YouTube, not in Firestore',
    note: 'refresh-video-metadata overwrites that field on every sync, so a Firestore-only fix reverts silently and the album quietly empties',
    plan: '§10s',
    files: null,
    from: '> ✅ **The YouTube half is closed too (2026-08-06).**',
    to: '> 📌 **`cats/아들조로` now holds a cat named 조로, and that is fine.**',
  },
  {
    key: 'D-cat-ids-are-not-names',
    ts: '2026-08-05',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: 'A cat doc id need not match the cat\'s name — do not "fix" it',
    note: 'Firestore ids are immutable, so changing one means create-copy-delete, which silently breaks every ?cat= link already pasted into KakaoTalk. Verified across 8 collections that nothing else references a cat id',
    plan: '§10s',
    files: null,
    from: '> 📌 **`cats/아들조로` now holds a cat named 조로, and that is fine.**',
    to: '> ### 📮 In flight with the owner (not blocking, no code pending)',
  },
  {
    key: 'D-refresh-token-firestore-only',
    ts: '2026-07-26',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: 'The YouTube refresh token lives only in Firestore — an env fallback was rejected',
    note: 'stricter than the planned env→Firestore fallback, which would not even have fixed the reported symptom: the stale env token WAS set and would still have won. A fallback keeps the same failure shape whenever the Firestore doc is missing, and earns nothing',
    files: ['src/lib/youtube/credentials.ts'],
    from: "  - 🔑 **`YOUTUBE_REFRESH_TOKEN` is gone — the token lives only in Firestore** (owner's call,",
    to: '  - **Bug 2 — `manage-playlists` POST channel ID.**',
  },
  {
    key: 'D-youtube-status-panel-gap',
    ts: '2026-07-26',
    type: 'decision',
    status: 'deferred',
    outcome: null,
    title:
      'Known gap, logged not fixed: the YouTube status panel reports healthy on a token that cannot write',
    note: 'it validates by refreshing, which succeeds regardless of scope; detecting it means probing a write endpoint, which is a product call the owner has not made. That call is the restart condition',
    files: null,
    from: '  - 📌 **Known gap, logged not fixed:** the status panel validates a token by refreshing it,',
    to: '- ✅ **Three more `/admin/tag-videos` bugs found & FIXED 2026-07-26**',
  },
  {
    key: 'D-mountain-2-prerequisites-one-home',
    ts: '2026-07-28',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title:
      'Everything gated on "before a real mountain #2" lives in one document — do not re-list it elsewhere',
    note: "it is a gate, not a backlog, and it also records the decided-and-closed items so they are not re-litigated — notably that a multi-mountain admin re-logging in when switching mountains is accepted, won't-fix",
    files: ['docs/planning/pending/mountain-2-prerequisites.md'],
    from: '- 📁 **Everything gated on "before a real mountain #2" now lives in one doc:**',
    to: '  - 🚨 **One item there is a security defect, not a rough edge',
  },
  {
    key: 'D-single-origin-kills-signout-defect',
    ts: '2026-07-28',
    type: 'decision',
    status: 'done',
    outcome: 'superseded',
    title:
      'The cross-subdomain sign-out defect became structurally impossible, so revokeRefreshTokens is optional hardening',
    note: 'the path-based decision superseded it the same day — with a single origin there is nothing to fix, and revokeRefreshTokens would now buy only multi-device sign-out. ⚠️ prerequisites §1.2, §1.3, §1.4 and §3.1 did NOT go with it; §1.4 (the roster leak) was re-verified live on 2026-08-09',
    files: null,
    from: '  - 🚨 **One item there is a security defect, not a rough edge',
    to: '- ✅ **M6 — no prod cutover needed (resolved 2026-07-25).**',
  },
  {
    key: 'D-dead-signed-url-route-deleted',
    ts: '2026-07-26',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title:
      'generate-youtube-signed-url was deleted rather than gated — it had no caller in any commit',
    note: 'git log -S over all history showed every reference outside its own folder was documentation; superseded by upload-youtube since the commit that created it',
    files: null,
    from: '  - 🗑️ **`generate-youtube-signed-url` DELETED (owner-approved 2026-07-26).**',
    to: "  - 📌 **Left as-is (owner's call 2026-07-26):**",
  },
  {
    key: 'D-butler-pages-stay-on-isauthenticated',
    ts: '2026-07-26',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: 'The butler post pages keep gating on `isAuthenticated` only — accepted',
    note: 'their writes already fail at the posts_butler rule without manage-posts, so nothing leaks; a signed-in user without it only finds out on submit, and that cost was weighed and accepted',
    files: null,
    from: "  - 📌 **Left as-is (owner's call 2026-07-26):**",
    to: '- **탈퇴 flow live click-through** with a **throwaway** account',
  },
  {
    key: 'D-video-description-verbatim',
    ts: '2026-08-05',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title:
      "A video's YouTube 설명 is taken verbatim on every composer, empty included — reversing an earlier decision",
    note: 'the code had argued for the old behaviour in a comment; that comment now records the reversal, so the old behaviour cannot be restored from it. Title inheritance is kept',
    plan: '§10t',
    files: null,
    from: "> ✅ **A video's YouTube 설명 is taken verbatim on every composer, empty included**",
    to: '> 🔑 **The lesson that generalises (again, from the other direction)',
  },
  {
    key: 'D-forced-long-polling',
    ts: '2026-08-01',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title:
      'Auto-detect long polling was discarded as a no-op; the browser is forced onto long polling instead',
    note: 'the SDK already defaults auto-detect to true, so the standard advice changed nothing. No capability was lost — transport, not feature, and the app has zero onSnapshot listeners. Revisit if listeners are ever added',
    plan: '§12',
    files: null,
    from: '> ⚠️ **Auto-detect long polling was already on** (the SDK defaults it to `true`)',
    to: "> 📌 **`PostMedia`'s default layout has now caused three defects.**",
  },
  {
    key: 'D-consent-modal-discarded',
    ts: '2026-08-02',
    type: 'decision',
    status: 'abandoned',
    outcome: 'rejected',
    title: 'The post-auth consent modal was designed on a false premise and discarded',
    note: 'the premise was that phone/Kakao users could join without consenting; they cannot — the login gate already refuses implicit signup. The real gap was smaller and different: an orphaned Auth record holding PII',
    plan: '§8',
    files: null,
    from: '> 🔴 **The premise that was wrong, because the same mistake is easy to repeat.**',
    to: '> 🔑 **Signup is phone-first — reason about every "who has an account" question from there.**',
  },
  {
    key: 'D-delete-gates-on-password-credential',
    ts: '2026-08-02',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: 'The orphan delete gates on a password credential, not on the login method',
    note: 'signup is phone-first, so a missing profile doc is usually an interrupted signup; gating on the login method would have deleted exactly the people who HAD consented, whenever they signed in by phone. The owner caught this',
    plan: '§8',
    files: null,
    from: '> 🔑 **Signup is phone-first — reason about every "who has an account" question from there.**',
    to: '> 🐛 **Two owner-reported bugs, and both had a second instance the report did not mention.**',
  },
  {
    key: 'D-no-firebase-media-baked',
    ts: '2026-08-02',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: 'No Firebase media is baked into the build any more — with an accepted cost',
    note: 'a missing about photo used to fail the build and is now a broken image on a live page; the guard only ever worked while the filename sat in config the build could read',
    plan: '§10m',
    files: null,
    from: '> ⚠️ **No Firebase media is baked into the build any more.**',
    to: '> 🔬 **The e2e suite earned its keep again, and found a harness gap.**',
  },
  {
    key: 'D-youtube-status-absent-means-watchable',
    ts: '2026-08-01',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: '`youtubeStatus` is absent on any record never checked, and absent means watchable',
    note: 'the public filter runs in memory deliberately, not as a Firestore where — an inequality would exclude exactly the unchecked records, i.e. every pre-existing video',
    plan: '§10g',
    files: null,
    from: '- 📌 **`youtubeStatus` is absent on any record never checked',
    to: '- **`[ ]` Two owner decisions from 2026-07-31, neither blocking:**',
  },
  {
    key: 'D-env-test-blanks-smtp',
    ts: '2026-08-06',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: '.env.test declares the SMTP keys blank, and blank is load-bearing',
    note: 'next start backfills any key .env.test leaves undefined from .env, which had the e2e suite sending two real emails per run to the production adminEmail. Deleting those lines silently restores live sending',
    files: ['.env.test'],
    from: '> - 🔴 **…and building that found the e2e suite SENDING REAL EMAIL to the production',
    to: '> - ⚠️ **A `.env` trap worth knowing: dotenv strips an inline `# comment`',
  },
  {
    key: 'D-smtp-from-equals-user',
    ts: '2026-08-06',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: 'SMTP_FROM must equal SMTP_USER — Gmail silently rewrites a From it does not own',
    note: 're-check the pairing after any change to either variable; an unverified alias is a no-op that still reports success, and npm run smtp:verify warns on the mismatch',
    files: null,
    from: '>   **How it went wrong first, because the shape recurs.**',
    to: '> - **🆕 `npm run smtp:verify` exists now**',
  },
  {
    key: 'D-contact-returns-success-on-send-failure',
    ts: '2026-08-06',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: '/api/contact still returns success when the notification fails — deliberately',
    note: 'the contact really is recorded, so inviting a resubmit would duplicate it. Three states, not two: undefined is unknown, not failed, because every contact predating the field would otherwise render as a failure',
    files: null,
    from: '> - **🆕 …and that silence is now closed (owner-asked, same day).**',
    to: '> - 🔴 **…and building that found the e2e suite SENDING REAL EMAIL',
  },
  {
    key: 'D-env-example-committed',
    ts: '2026-08-06',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: '.env.example is force-added to git — .gitignore had swallowed it entirely',
    note: 'CLAUDE.md pointed readers at a file that resolved to nothing in a fresh clone. It must stay secret-free; the negation was verified surgical, so .env, .env.local and .env.production are all still ignored',
    files: ['.gitignore', '.env.example'],
    from: '> - 🔴 **The `.env.example` item was described wrong, and the real defect was bigger.**',
    to: '> ⏸️ **Renaming the Firestore database was investigated and dropped',
  },
  {
    key: 'D-red-run-means-something',
    ts: '2026-08-02',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: 'The e2e "flake set" advice is retired — a red run means something again',
    note: '"passes in isolation" means interference, not slowness, and reading it as slowness is what kept three real bugs open for weeks. No timeout could have fixed any of them',
    files: null,
    from: '> The e2e failures had been filed for weeks as "timing-sensitive," with standing advice not to',
    to: '> ⚠️ **The e2e suite is a gate that this session twice proved is not optional.**',
  },
  {
    key: 'D-read-the-deployed-artifact',
    ts: '2026-08-04',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title:
      'Read the deployed artifact, not the branch — and treat the deploy order as a live hazard',
    note: "code reaches production on git push; rules and permissions do not. It caught §10n being live while three documents said it was not, and then §10q's rules NOT being live while its code was already pushed",
    files: null,
    from: '> 🔑 **The habit worth keeping: read the deployed artifact, not the branch.**',
    to: '> **Outstanding from this bundle**',
  },
  {
    key: 'D-first-client-render-rule',
    ts: '2026-08-02',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: 'Nothing the server could not have known may affect the first client render',
    note: 'localStorage, window.*, Date.now(), a restored session — read them in useEffect. Accepted cost: one tick of logged-out header per full page load',
    files: null,
    from: '> 🔴 **The product bug, and the rule it leaves behind.**',
    to: '> ### Earlier the same day (2026-08-02, first session) — the plan audit',
  },
  {
    key: 'D-media-cap-is-static-config',
    ts: '2026-08-02',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: 'The 집사톡 media cap shipped as static config, not a CMS toggle',
    note: '⚠️ this is what closes §10d D2, which the same file elsewhere still calls "not started". Verified 2026-08-09: config/media_control.json and src/utils/mediaControl.ts both exist. The Firestore design was rejected on a consequence it exposed — a global runtime setting lets any one mountain\'s admin reconfigure every other mountain\'s composer',
    plan: '§10d',
    files: ['config/media_control.json', 'src/utils/mediaControl.ts'],
    from: '> ✅ **§10d D2 is DONE (2026-08-02) — and it shipped as _static config_, not a CMS toggle.**',
    to: '> 🗑️ **A settings screen that configured nothing is gone (2026-08-02).**',
  },
  {
    key: 'D-collections-are-not-configurable',
    ts: '2026-08-02',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: 'Which collections exist is a fact about the code, not an operator choice',
    note: 'that is why the old configurability was the wrong shape. Two false precedents recorded with it: admin_config is NOT a settings store, and the old collection tab was per-browser localStorage',
    plan: '§10j',
    files: null,
    from: '- **🗑️ A settings screen that had never configured anything, deleted (2026-08-02, `1cada22`).**',
    to: '- **🧹 The project plan was audited against the code, and seven entries were wrong',
  },
  {
    key: 'D-edit-composer-decisions',
    ts: '2026-08-02',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title:
      'Four things decided inside the edit-composer change, plus 급식현황 staying on the URL editor',
    note: 'notably: post-level tags are omitted on an edit with no new files, because updatePost merges and an empty array would have ERASED them',
    plan: '§10l',
    files: null,
    from: '- **✏️ Editing 공지사항 / 입양홍보 / 집사톡 now uses their create composers (2026-08-02,',
    to: '- **✅ The e2e suite is GREEN and the "flake set" is retired (2026-08-02, `4a5da2a`).**',
  },
  {
    key: 'D-comments-on-community-types-only',
    ts: '2026-08-02',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: '댓글 stays on the community post types only',
    note: '공지사항 and 입양홍보 have never had a reply thread, and the shared detail route is where the admin CMS links',
    plan: '§10k',
    files: null,
    from: '- **🎨 …and the page it opened had never had a layout (2026-08-02, `d7c601f`).**',
    to: '- **✏️ Editing 공지사항 / 입양홍보 / 집사톡 now uses their create composers',
  },
  {
    key: 'D-share-chip-settled-the-link-shape',
    ts: '2026-08-01',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: 'The share chip settled the link-shape question by removing it',
    note: 'name-keying, a per-mountain unique-name rule and a mountain-in-the-URL were all proposed to make links hand-constructible; none is needed once the app produces them. Keyed on the cat id, so a rename cannot break a pasted link',
    plan: '§10c',
    files: null,
    from: '- **🔗 One cat is now linkable, and the modal hands you the link (2026-08-01, §10c DONE).**',
    to: '- **🐌 A 30-second Firestore timeout was making the public post pages look broken',
  },
  {
    key: 'D-video-autoprune-rejected',
    ts: '2026-08-01',
    type: 'decision',
    status: 'abandoned',
    outcome: 'rejected',
    title: 'Auto-pruning videos deleted from YouTube was rejected',
    note: 'the channel listing is read with the public API key, in which a private video disappears identically to a deleted one — pruning would destroy cat tags and 설명 on a privacy change. The availability route labels and never deletes',
    plan: '§10g',
    files: null,
    from: '- **🎞️ Videos deleted from YouTube kept their tile in the public 영상첩 — fixed (2026-08-01,',
    to: '- **🖼️ Two smaller owner-reported fixes (2026-08-01).**',
  },
  {
    key: 'D-snapshot-before-prod-writes',
    ts: '2026-07-20',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: 'Standing rule: snapshot before any script writes to prod data',
    note: "wired into the multi-tenant plan's M6 as a precondition, after M4's backfill ran against production with no backup and no PITR",
    files: null,
    from: '  **Standing rule: snapshot before any script writes to prod data**',
    // Anchored on the link TEXT, not its target: the archived body's relative links were
    // repointed one level when it moved into `archive/`, so a target-based anchor would rot.
    to: '[`admin-manual` §10](',
  },
  {
    key: 'D-gcs-export-bucket-rejected',
    ts: '2026-07-20',
    type: 'decision',
    status: 'abandoned',
    outcome: 'rejected',
    title: 'A GCS export bucket was considered and rejected',
    note: 'a second PII store to secure and disclose under PIPA, for protection PITR already provides. Recorded so it is not silently re-proposed',
    files: null,
    from: '- **GCS export bucket considered and rejected** — a second PII store to secure and',
    to: '- **Scripts** (`scripts/maintenance/`): `export-firestore.js` discovers collections',
  },
  {
    key: 'D-weekly-not-daily-backups',
    ts: '2026-07-20',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: 'Weekly, not daily, backups — deliberate',
    note: "it meshes with PITR's 7-day window, so every moment is covered by either PITR or a ≤7-day-old snapshot; dailies would add cost, not coverage",
    files: null,
    from: "- **Weekly, not daily, is deliberate** — it meshes with PITR's 7-day window, so",
    to: '- **GCS export bucket considered and rejected**',
  },
  {
    key: 'D-shared-firestore-is-benign',
    ts: '2026-07-22',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: 'The Firestore shared with a second app is benign — no action needed',
    note: "image_uploader is the owner's own upload script: Admin-SDK only, no rules entry, no mountainId. It needs action only if it ever promotes records into cat_images",
    files: null,
    from: '- **This Firestore is shared with a second app (owner-confirmed, benign).**',
    to: '- ✅ **M0 rules deploy DONE (owner, 2026-07-22).**',
  },
  {
    key: 'D-path-based-tenancy',
    ts: '2026-07-28',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title:
      'The multi-tenant URL model is path-based, and planning it found an authorization inversion',
    note: 'every /api/* route resolves the tenant from the Host header, so path-based would resolve every API call to geyang — including requireApiPermission. The fix is a validated X-Mountain-Id header, 400 on an unknown value and never a silent fallback, sequenced as T2 ahead of the link sweep',
    plan: '§9',
    files: null,
    from: '- **✅ DECIDED (owner, 2026-07-28) — the multi-tenant URL model goes PATH-BASED.**',
    to: '- **📁 Mountain-#2 readiness now has one home:**',
  },
  {
    key: 'D-cross-origin-sessions-rejected',
    ts: '2026-07-28',
    type: 'decision',
    status: 'abandoned',
    outcome: 'rejected',
    title: 'Cross-origin session propagation would multiply the sign-out defect, not fix it',
    note: 'every such design mints the second origin its own refresh token. Recorded with the two smaller unlogged finds from the same pass — the members roster leak, and production serving from the apex via the fallback rather than the Host mapping',
    files: null,
    from: '🚨 **Assembling it surfaced a security defect nobody had logged: 로그아웃 signs the user out',
    to: '📌 Also corrected: **Kakao needs no per-subdomain redirect URI**',
  },
  {
    key: 'D-kakao-needs-no-per-subdomain-uri',
    ts: '2026-07-28',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: 'Correction: Kakao needs no per-subdomain redirect URI',
    note: "it is a Firebase OIDC provider used through signInWithPopup, so its redirect URI is Firebase's fixed handler and is constant across tenants. Two documents had claimed otherwise",
    files: null,
    from: '📌 Also corrected: **Kakao needs no per-subdomain redirect URI**',
    to: '🟡 The session closed with',
  },
  {
    key: 'D-one-youtube-channel',
    ts: '2026-07-26',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: 'One YouTube channel for all mountains — per-mountain channels rejected',
    note: 'each channel would have to clear monetization thresholds alone, and N credentials means N expiring tokens. Attribution rides on cat_videos.mountainId; the resulting syncVideos() cross-tenant hazard is a mountain-#2 prerequisite',
    files: null,
    from: '(3) **Owner decision: one YouTube channel for all mountains** (per-mountain channels',
    to: '- **2026-07-26** — **P5.4 manual YouTube pass STARTED on Preview',
  },
  {
    key: 'D-butler-board-is-a-log',
    ts: '2026-07-27',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title:
      '집사게시판 lost media upload entirely — it is a 급식소 check-in log, not a second composer',
    note: 'compose-time only: legacy posts keep rendering and admins keep URL-based media editing',
    files: null,
    from: '- **2026-07-27** — **The two post composers were separated, and YouTube filing',
    to: 'Filing (`c2fc78f`) stopped',
  },
  {
    key: 'D-playlists-per-mountain-plus-shared',
    ts: '2026-07-27',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title:
      'Playlist filing reads per-mountain config plus a `_shared` block — matching by title was abandoned',
    note: 'a rename on YouTube silently stopped title matching, and with one shared channel every mountain filed into the same list. An 입양홍보 video joins both playlists, so the mountain playlist stays a complete ownership record for the deferred syncVideos fix',
    files: null,
    from: 'Filing (`c2fc78f`) stopped',
    to: '⚠️ Then a browser pass',
  },
  {
    key: 'D-supabase-set-aside',
    ts: '2026-07-18',
    type: 'decision',
    status: 'abandoned',
    outcome: 'rejected',
    title: 'Replacing Firebase with Supabase to escape vendor lock-in was set aside',
    note: 'zero onSnapshot listeners make an eventual exit easy; $25/mo/project is a per-tenant floor; and nothing about a second mountain is vendor-blocked',
    files: null,
    from: '**How this got here (2026-07-18 session):** started as "replace Firebase with Supabase',
    to: '**Done before parking — Tier 1 write migration**',
  },
  {
    key: 'D-htmx-rejected',
    ts: '2026-07-18',
    type: 'decision',
    status: 'abandoned',
    outcome: 'rejected',
    title: 'Moving Next.js/React to HTMX was answered no — retire the complexity in place instead',
    note: 'the complexity is duplication and local-state sprawl inside client components, not framework complexity, and HTMX would land worst on the parts it cannot express — client-SDK auth, the Leaflet map, the admin editors',
    plan: '§7',
    files: null,
    from: 'Started as a "should we move Next.js/React → HTMX?" feasibility question; answer is **no**',
    to: '**Reducible surface ≈ 2,800–3,400 LOC across 6 files**',
  },
  {
    key: 'D-media-tagging-editor-rejected',
    ts: '2026-07-18',
    type: 'decision',
    status: 'abandoned',
    outcome: 'rejected',
    title: 'The generic `MediaTaggingEditor<T>` was rejected in favour of a toolkit',
    note: 'every mutation diverges structurally — one Firestore service call against multi-step YouTube orchestration with propagation waits — so the generic would have been a props-explosion shell',
    plan: '§7',
    files: null,
    from: '2. **`MediaTaggingEditor<T>` rejected** — every mutation diverges structurally (one',
    to: '3. **Decisions re-locked:** B-first survives;',
  },
  {
    key: 'D-react-hook-form-dropped',
    ts: '2026-07-18',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: 'react-hook-form was dropped, reversing the 2026-07-16 decision to adopt it',
    note: "the forms' complexity is upload management, not field state; it was a declared dependency used in zero files, and the dep was removed in P2",
    plan: '§7',
    files: null,
    from: '**Decisions re-locked (2026-07-18 owner deep-dive — supersede 2026-07-16):** both',
    to: '**Reviewed 2026-07-18 — claims verified, plan amended.**',
  },
  {
    key: 'D-multi-tenant-q1-q8',
    ts: '2026-07-19',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: 'The multi-tenant architecture questions Q1–Q8 were answered',
    note: 'management-only, one Firestore with mountainId on the 12 content collections, one Vercel project with host-based selection, a visitor-facing selector, and a shared GA4 property with a mountain_id dimension',
    plan: '§9',
    files: null,
    from: '**Decisions (owner, 2026-07-19):** management-only (no custody) · **B1** one',
    to: '**Shape of the work:** M1 decoupling',
  },
  {
    key: 'D-roles-keyed-by-mountain',
    ts: '2026-07-22',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title:
      'The role model is a map keyed by mountainId — one account can hold roles on several mountains',
    note: 'the host picks which role applies, and new signups get roles: {} — no permissions until assigned, which is also what makes the self-write rule bulletproof',
    plan: '§9',
    files: null,
    from: '**M5.2 (`47d0f3d`, 2026-07-22) — per-mountain role model + mountain-aware rules.**',
    to: '⚠️ **Amended 2026-08-01:** the client still creates the doc with `roles: {}`',
  },
  {
    key: 'D-relative-links-escape-in-dev',
    ts: '2026-07-19',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title:
      'Accepted dev-only caveat: relative links escape a path-prefixed tenant back to the default',
    note: 'host-mapped production subdomains are unaffected. Recorded because the behaviour reads as a bug in dev and is not one',
    plan: '§9',
    files: null,
    from: '⚠️ **Known dev-only caveat (accepted, plan M3 notes):** browsing a _non-default_',
    to: '**Decisions (owner, 2026-07-19):**',
  },
  {
    key: 'D-commits-are-owner-gated',
    ts: '2026-07-19',
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    title: 'The same-day auto-commit grant was revoked — every commit is owner-gated again',
    note: null,
    files: null,
    from: 'recorded in the plan doc. Process: the same-day auto-commit grant was',
    to: 'session, logged in the plan: the contact-submit spec has a pre-existing',
  },
];

function pinCommit() {
  return execFileSync('git', ['log', '-1', '--format=%h', '--', SOURCE], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trim();
}

function nextIdNumber() {
  const { db } = lib.openStore({ allowMissing: true });
  try {
    const row = db.prepare('SELECT MAX(CAST(substr(id, 3) AS INTEGER)) AS n FROM records').get();
    return (row.n ?? 0) + 1;
  } finally {
    db.close();
  }
}

/**
 * Locate one entry's span.
 *
 * ⚠️ **The `from` anchor must match exactly one line in the whole file.** A hand-built table
 * over unstructured prose has one failure mode — pointing at the wrong paragraph because the
 * source repeats itself — and this file repeats itself constantly: the same event is described
 * in the fresh-session box, the TL;DR and the changelog. An ambiguous anchor is therefore a hard
 * error, not a "take the first one".
 */
function locate(lines, entry) {
  const starts = [];
  lines.forEach((line, index) => {
    if (line.includes(entry.from)) starts.push(index);
  });

  if (starts.length === 0) {
    throw new Error(`${entry.key}: 'from' anchor not found — nothing written.\n  ${entry.from}`);
  }
  if (starts.length > 1) {
    throw new Error(
      `${entry.key}: 'from' anchor matches ${starts.length} lines ` +
        `(${starts.map((n) => n + 1).join(', ')}) — it must be unique. Nothing written.\n  ${entry.from}`
    );
  }

  const start = starts[0];
  let end = null;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].includes(entry.to)) {
      end = i;
      break;
    }
  }
  if (end === null) {
    throw new Error(
      `${entry.key}: 'to' anchor not found after line ${start + 1} — nothing written.\n  ${entry.to}`
    );
  }

  return { start, end, body: trimBody(lines.slice(start, end)) };
}

function trimBody(bodyLines) {
  return bodyLines
    .join('\n')
    .replace(/\n+>?\s*---\s*$/, '')
    .trim();
}

// ⚠️ The body lives on the SPAN, not on the entry. Reading `entry.body` here wrote 57 record
// files whose prose was silently empty: Array.join() renders undefined as '', so the files
// looked well-formed and nothing failed. See R-0429.
function renderRecordFile(record, entry, span) {
  const classification = [record.type, record.status, record.outcome].filter(Boolean).join(' · ');
  return [
    `# ${record.id} — ${record.title}`,
    '',
    `> **${classification}** · ${record.ts}${record.plan ? ` · ${record.plan}` : ''}`,
    `> Migrated from \`${SOURCE}\` L${span.start + 1}–${span.end} (\`${record.source_ref}\`).`,
    '',
    '---',
    '',
    span.body,
    '',
  ].join('\n');
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const lines = fs.readFileSync(path.join(REPO_ROOT, SOURCE_FILE), 'utf8').split('\n');

  const keys = new Set();
  for (const entry of ITEMS) {
    if (keys.has(entry.key)) throw new Error(`Duplicate key in the table: ${entry.key}`);
    keys.add(entry.key);
  }

  // Every anchor is resolved, including the de-duplicated ones — a covered entry whose anchor
  // has rotted is still a bug in this table, and silently skipping it would hide that.
  const located = ITEMS.map((entry) => ({ entry, span: locate(lines, entry) }));

  for (const key of Object.keys(COVERED_BY_EXISTING)) {
    if (!keys.has(key)) throw new Error(`COVERED_BY_EXISTING names an unknown key: ${key}`);
  }

  const spans = located.filter(({ entry }) => {
    const covered = COVERED_BY_EXISTING[entry.key];
    if (!covered) return true;
    logger.info(`skip  ${entry.key} — already covered by ${covered}`);
    return false;
  });

  // Overlapping spans mean the same prose would land in two records — the duplication this
  // migration exists to remove. Catch it here rather than in review.
  const ordered = [...spans].sort((a, b) => a.span.start - b.span.start);
  for (let i = 1; i < ordered.length; i += 1) {
    const prev = ordered[i - 1];
    const here = ordered[i];
    if (here.span.start < prev.span.end) {
      throw new Error(
        `Overlapping spans — nothing written.\n` +
          `  ${prev.entry.key} covers L${prev.span.start + 1}–${prev.span.end}\n` +
          `  ${here.entry.key} starts at L${here.span.start + 1}`
      );
    }
  }

  const commit = pinCommit();
  let idNumber = nextIdNumber();
  const recordsDir = path.join(lib.WORK_TRACKING_DIR, 'records');
  fs.mkdirSync(recordsDir, { recursive: true });

  const records = [];
  const files = [];

  for (const { entry, span } of spans) {
    const id = `R-${String(idNumber).padStart(4, '0')}`;
    idNumber += 1;

    const record = {
      id,
      rev: 1,
      ts: entry.ts,
      type: entry.type,
      status: entry.status,
      outcome: entry.outcome ?? null,
      title: entry.title,
      plan: entry.plan ?? null,
      detail_ref: `records/${id}.md`,
      note: entry.note ?? null,
      supersedes: null,
      split_from: null,
      files: entry.files ?? null,
      source_ref: `${SOURCE}#${entry.key}@${commit}`,
    };
    records.push(record);
    files.push([path.join(recordsDir, `${id}.md`), renderRecordFile(record, entry, span)]);
    logger.info(
      `${id}  ${entry.type}/${entry.status}  L${span.start + 1}–${span.end}  ${entry.title}`
    );
  }

  const byType = records.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1;
    return acc;
  }, {});
  logger.info(`Total ${records.length}: ${JSON.stringify(byType)}`);

  if (dryRun) {
    logger.info('Dry run — nothing written.');
    return;
  }

  for (const [filePath, contents] of files) fs.writeFileSync(filePath, contents);
  const outPath = path.join(lib.WORK_TRACKING_DIR, 'work.json');
  fs.writeFileSync(
    outPath,
    `${JSON.stringify(
      {
        checked_out: new Date().toISOString().slice(0, 10),
        selector: `import ${SOURCE} @ ${commit}`,
        records,
      },
      null,
      2
    )}\n`
  );
  logger.info(`Wrote ${records.length} records to ${outPath}. Run checkin.js next.`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }
}

module.exports = { locate, ITEMS };
