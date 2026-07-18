# Complexity-Retirement Assessment — 20260716

> Source-verified deep dive into the two largest complexity hotspots in `src/`,
> produced to decide whether/how to retire duplication-driven complexity. Every
> structural claim below was grep-/read-verified against the actual files on branch
> `dev` (not inferred from docs).
>
> **Status:** 📋 **planned — no code changed.** §1–§6 are the assessment; §7–§8 add a
> sequenced, gated execution plan + task list (decisions locked 2026-07-16, §7).
> Execution starts only on explicit go-ahead.
>
> **✅ Owner deep-dive DONE (2026-07-18, later session) — the pre-execution gate is
> satisfied.** Outcomes (decisions re-locked in §7): (1) **worth it, do it now** —
> with Target A's retired-LOC projection revised down (~1,200–1,800; ~2,100–2,900
> total — §3); (2) **`MediaTaggingEditor<T>` rejected, replaced by a toolkit of
> shared hooks + presentational components** — the twins' write paths (save / batch /
> sync) are structurally different (Firestore service calls vs YouTube API
> orchestration), so a single generic would have to inject every mutation and the
> whole edit panel (§1.3a); (3) locked decisions re-examined: B-first survives,
> **`react-hook-form` dropped** (remove the unused dep — the forms' complexity is
> media-list/upload management, not field state; §2.3), behavior-preserving survives
> with the P4 `CatSelectorModal` **commit-on-done** change accepted as intentional;
> (4) priority: this track executes next, multi-tenant stays parked. A factual
> correction also landed: **§2.2 — video upload is YouTube in all four forms**; the
> strategy axis is images only. **Execution still starts only on an explicit
> go-ahead — at P0.**
>
> **Reviewed 2026-07-18:** every quantitative claim re-verified against source — all
> exact (LOC, `useState` counts, handler names/line refs, `react-hook-form` unused,
> `CatSelectorModal` consumers). The duplication counts are conservative: a
> trimmed-line multiset intersection gives **380** shared lines (Post↔ButlerTalk, vs
> 250 stated), **346** (Announcement↔Adoption, vs 193), and **989** common lines
> between the "3-identical-lines" editor twins — stricter metrics were used here, and
> the direction only strengthens the case. Amendments applied from the review: a new
> **P0 characterization-test phase** (the plan's original verification bar leaned on
> e2e coverage that doesn't exist — see §7 P0), the P6 doc-filename fix, the forms'
> own `alert()` usage noted in P6.1, the YouTube-API parity constraint named in P5,
> and P1.2 re-sequenced to P3 (lift at point of use).
>
> **Origin:** Started as a feasibility question — "refactor Next.js/React → HTMX to
> cut complexity?" The answer landed as **no** (see §0), which reframed the real work
> as an _in-place_ deduplication of two hotspots. This report is that deep dive.
>
> **Reducible surface identified:** ≈ **2,100–2,900 LOC** (revised down from
> 2,800–3,400 by the 2026-07-18 deep-dive — §3) of accidental complexity across
> **6 files**, retirable with **zero framework migration**, **no auth rewrite**,
> and **no change to the Vercel/ISR/image-optimization stack**.

**Legend:** `[ ]` todo · `[x]` done · ⚠️ watch-out

---

## 0. Why not HTMX (the question that started this)

The complexity in this app is **domain/duplication complexity that lives inside client
components**, not framework complexity. A framework swap would pay full migration cost
against ~80% irreducible complexity that comes along for the ride, and would land worst
on exactly the parts HTMX can't express:

- **Auth is client-SDK based** (Firebase Auth in the browser, `onAuthStateChanged`
  drives the UI). HTMX would force a rewrite around server-verified session cookies.
- **The Leaflet map and the admin editors are irreducibly client-side JS.** A live
  editor holding 34–41 pieces of state is precisely what HTMX documents itself as _not_
  for; it would remain hand-wired JS under any framework.
- **Next.js already gives the "HTML-first + islands" model** via Server Components +
  ISR. The public read pages are already server-rendered. HTMX would re-express the same
  client/server split in a less-integrated way while discarding `<Image>` optimization,
  ISR + on-demand `revalidatePath`, and the `git push` = deploy pipeline.

**Conclusion:** retire the complexity _in place_. The rest of this doc is the evidence
base for doing that.

---

## 1. Target A — Admin media editors (the big mass)

**Files:** `src/app/admin/tag-images/page.tsx` (1,860 LOC) ·
`src/app/admin/tag-videos/page.tsx` (2,570 LOC). **Combined ≈ 4,430 LOC in two files.**

### 1.1 They are copy-renamed twins that have since drifted

A naïve line-diff reports only **3 identical lines** shared — which _looks_ like they're
unrelated. They are not. They share **parallel, identically-named handlers**
(`handleAutomaticDateParsing`, `handleBatchTagsInputClick`, `handleCatToggleBatch`) whose
bodies are structurally identical — same control flow, same comments, same `console.log`
wording — differing only by a mechanical `image`→`video` rename on nearly every line plus
one swapped parse call:

| `tag-images` (line 340)                        | `tag-videos` (line 709)                    |
| ---------------------------------------------- | ------------------------------------------ |
| `images.filter(image => …)`                    | `videos.filter(video => …)`                |
| `parseCreatedDateFromFilename(image.fileName)` | `parseRecordingDateFromTitle(titleSource)` |
| `setProcessingImages(new Set())`               | `setProcessingVideos(new Set())`           |

The diff finds nothing identical **because** the rename touches every line. This is the
worst kind of duplication: **copy-paste that has drifted**, so fixes/features now have to
be applied twice and increasingly don't match.

### 1.2 Each is a god-component with an enormous local-state machine

- `tag-images`: **34 `useState`**, 20 handlers, 2 `useEffect`.
- `tag-videos`: **41 `useState`**, 24 handlers, 2 `useEffect`.

That state sprawl — not the framework — is what makes these files hard to reason about.

### 1.3 The shared vs. divergent split is clean

**Shared spine (both files, ~identical):**

| Concern                  | State / handlers                                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Item list + load         | `items`, `loading`, `error`, `load*()`, `loadCats()`                                                                        |
| Single-item edit         | `selected*`, `tags`, `createdTime`, `description`, `save*Metadata()`                                                        |
| Multi-select             | `selected*Set`, `toggle*Selection`, `selectAll`, `clearSelection`                                                           |
| Batch ops                | `batchTags`, `batchCreatedTime`, `showBatchActions`, `batchUpdateTags()`, `batchUpdateDate()`                               |
| Cat tagging              | `cats`, `showCatSelector`, `catSearchQuery`, `selectedCats`, `catSelectorContext`, `handleCatToggle*()`                     |
| Date auto-parse          | `parsingDates`, `processing*Set`, `handleAutomaticDateParsing()`                                                            |
| Filter / sort / paginate | `showTagged*`, `showUntagged*`, `enableDateFilter`, `dateFilter{From,To}`, `sortBy`, `sortOrder`, `currentPage`, `*PerPage` |

**Divergent (pluggable) parts:**

| Axis                  | `tag-images`              | `tag-videos`                                                                                                                                           |
| --------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Data service          | `getImageService`         | `getVideoService`                                                                                                                                      |
| Item type             | `CatImage` / `AdminImage` | `CatVideo` / `AdminVideo`                                                                                                                              |
| Source sync           | `syncWithStorage()`       | `syncWithYouTube()`                                                                                                                                    |
| Date-parse source     | filename                  | title/description                                                                                                                                      |
| **Video-only extras** | —                         | **playlist tagging** (`allPlaylists`, `showPlaylistSelector`, `selectedPlaylists`, `savePlaylistChanges()`), `formatDuration()`, `getVideoThumbnail()` |

**Implication (superseded 2026-07-18 — see §1.3a):** the original read was a textbook
**generic component over a `MediaItem` type** (`MediaTaggingEditor<T>` parameterized
by service + date-source + extra-panels slot). The deep-dive walkthrough found that
shape unsound — the shared spine above is real, but it is only the **read side**.

### 1.3a Write paths are NOT twins (deep-dive finding, 2026-07-18)

Every mutation diverges structurally, not just by rename:

| Mutation              | `tag-images`                                               | `tag-videos`                                                                                                                                                                                                                                              |
| --------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Save single           | one `imageService.updateImage()` call (~35 LOC)            | ~190-LOC orchestration: YouTube-only guard → per-field change detection → `PUT /api/update-youtube-video` → 3s propagation wait → `POST /api/refresh-video-metadata` (with `expectedRecordingDate` retry hint) → reload → 500ms `setTimeout` form re-sync |
| Batch tags / date     | one `batchUpdateImages()` service call                     | per-video loop over the YouTube API, then refresh + reload                                                                                                                                                                                                |
| Sync                  | one `syncWithStorage()` call                               | two-step: discover new videos, then refresh-metadata API                                                                                                                                                                                                  |
| Edit panel            | Firestore metadata (tags/description/createdTime) + delete | YouTube metadata (title/tags/description/recording date), no delete, + playlists                                                                                                                                                                          |
| Cat-selector contexts | 2 (`individual`/`batch`)                                   | 3 (`batch`/`youtube-individual`/`youtube-batch`)                                                                                                                                                                                                          |

A single generic would therefore have to inject every mutation, the whole edit panel,
and parts of the item card — a props-explosion layout shell (exactly the
"second god-component" risk the deep-dive was chartered to test). **Locked shape
instead (§7): a toolkit** —

- **Hooks:** `useMediaListController<T>` (items/loading/error/load, selection set +
  select-all/clear, filter/sort/pagination state and derived lists, on a shared
  `toDate()` normalizer that kills the ~8 repeated Firebase-Timestamp blobs) and
  `useDateAutoParse<T>(items, parse, applyUpdate)` (the identical
  loop/processing-set/result-report machinery).
- **Presentational components:** `MediaStatsCards`, `MediaFilterBar`,
  `BatchActionsPanel`, `MediaGrid` (card render slot), `PaginationBar`,
  `CatTagField` — plus the existing `CatSelectorModal`.
- **Pages stay page-owned** and keep their own write paths; the videos page's YouTube
  orchestration moves into a page-owned `useYouTubeVideoMutations` hook for
  readability but is **not** genericized.

### 1.4 ⚠️ Watch-outs specific to Target A

- **Both editors hand-roll cat selection** (`showCatSelector` / `selectedCats` state)
  instead of reusing the existing shared **`CatSelectorModal`** (which the content forms
  _do_ use — §2). Deduping cat-selection is a reuse win available independent of the
  larger merge.
- **Uses `alert()` / `confirm()`** for user prompts — clashes with the repo's
  shared-modal convention (CLAUDE.md: "user-facing modals use the shared `ui/Modal`").
  A refactor is the moment to converge these, but that's product-visible behavior — call
  it out before changing.
- **i18n already shared** via `@/constants/adminStrings` (748 LOC) — the string layer is
  _not_ duplicated, which lowers merge risk.
- **`tag-images` hand-rolls a full Lightbox modal** even though `ui/Lightbox` exists —
  another standalone reuse win (2026-07-18 dive; folded into P5.1).
- **`parseCreatedDateFromFilename` (~72 LOC) is defined inline in `tag-images`**, while
  `tag-videos` imports `parseRecordingDateFromTitle` from `@/utils/dateParser` — move
  the filename parser into `utils/dateParser` beside it (2026-07-18 dive; P4.4).
- No test coverage of these pages beyond the structural smoke net + the Playwright
  `admin/` suite — behavior parity after a merge needs an explicit verification plan.

---

## 2. Target B — Content forms (clean, lower-risk dedup)

**Files (5):** `NewPostForm` (697) · `NewButlerTalkForm` (539) · `NewAnnouncementForm`
(487) · `NewAdoptionForm` (410) · `SignupForm` (428). The first four are the dedup
target (**≈ 2,133 LOC**); `SignupForm` is a genuinely different multi-step auth wizard —
**leave it out of scope.**

### 2.1 Two literal-duplicate families

Unlike the admin editors, these share **verbatim** lines (dedup is more mechanical):

| Family                 | Members                                  | Identical non-trivial lines shared | Shared machinery                                                                                                          |
| ---------------------- | ---------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **A — rich content**   | `NewPostForm`, `NewButlerTalkForm`       | **250**                            | media upload + tags + playlist + `CatSelectorModal`; `getImageService` signed-URL image upload + **YouTube** video upload |
| **B — simple content** | `NewAnnouncementForm`, `NewAdoptionForm` | **193**                            | title/message + image/video upload via `getStorageService`; near-identical state vars                                     |

Family B's two members are almost the same file: identical state
(`title, message, imageFiles, videoFiles, imageUrls, videoUrls, uploading,
currentImageUrl, currentVideoUrl`) and identical handler set
(`handleImageFilesChange`, `handleVideoFilesChange`, `handleSubmit`).

### 2.2 Two upload strategies (the real axis of variation)

| Strategy                  | Used by            | Path                                                                    |
| ------------------------- | ------------------ | ----------------------------------------------------------------------- |
| **Signed-URL images**     | Family A           | `uploadImagesWithSignedUrls()`                                          |
| **Direct-storage images** | Family B           | `getStorageService().uploadFile()`                                      |
| **YouTube videos**        | **all four forms** | `POST /api/upload-youtube` (a near-identical local helper in each form) |

_(Corrected 2026-07-18 deep-dive: the original table claimed Family B uses
`getStorageService` for videos too — wrong. **Video upload is YouTube in all four
forms**; the strategy axis is images only, which simplifies P1/P3.0.)_

A shared media-upload primitive should take the **image-upload strategy as an injected
dependency** and share **one** YouTube video-upload function across all four forms.

### 2.3 ⚠️ `react-hook-form` is installed but used in ZERO files

It's a declared dependency (`package.json`), yet all five forms are hand-rolled with
10–17 `useState` each. _(Deep-dive 2026-07-18: adoption **rejected** — the forms'
complexity is media-list/upload management, which RHF doesn't address; the field state
RHF would actually manage in Family B is ~3 fields (title, message, a toggle). The
dedup payoff comes from `MediaUploadField` + a shared submit flow, not RHF. The dead
dependency gets **removed** in P2 (§7). The original "highest value-to-risk" read
overweighted field-state boilerplate.)_

### 2.4 No shared form/upload component exists yet

`src/components/ui/` has `Button`, `Field`, `Input`, `Modal`, `Lightbox`, `VideoPlayer`,
etc. — but **no** form-shell or media-upload primitive. Each form reinvents file inputs,
previews, and the upload loop. `CatSelectorModal` is the _only_ already-extracted shared
piece (used by Family A + `AlbumFilterBar`).

---

## 3. Reducible surface (quantified)

| Target                  | Files | Current LOC | Nature                                                           | Est. after refactor | Est. retired     |
| ----------------------- | ----- | ----------- | ---------------------------------------------------------------- | ------------------- | ---------------- |
| A — admin media editors | 2     | ~4,430      | read-side twins; write paths divergent (§1.3a); 34/41 `useState` | ~2,600–3,200        | **~1,200–1,800** |
| B — content forms       | 4     | ~2,133      | 2 literal-dup families; hand-rolled state                        | ~1,000–1,300        | **~900–1,100**   |
| **Total**               | **6** | **~6,560**  |                                                                  |                     | **~2,100–2,900** |

_(Revised 2026-07-18 deep-dive: Target A's original ~1,900–2,400 implicitly assumed
the write paths merge too; under the toolkit shape (§1.3a) the YouTube orchestration
(~550+ LOC) is irreducible, so the realistic retirement is the shared read-side logic
(~300–500 LOC/pair) plus the twinned JSX (~700–900 lines/pair).)_

All of it is **accidental complexity inside client components** — retirable with no
framework migration, no auth changes, no deploy-stack changes.

---

## 4. Risk & effort read (for the planning decision)

|                         | Target A (admin editors)                                                                                    | Target B (forms)                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Value**               | Highest (biggest mass; kills double-maintenance)                                                            | High (clean dup + `react-hook-form` payoff)                                              |
| **Risk**                | Medium — drifted, so a "merge" is really _re-convergence_ under one generic; product-visible admin behavior | Lower — smaller surface, verbatim dup, less critical path                                |
| **Blast radius**        | Admin CMS operators                                                                                         | Public content-creation flows                                                            |
| **Prereq**              | Behavior-parity verification plan; decision on `alert/confirm`→`Modal`                                      | Decision on `react-hook-form` (resolved 2026-07-18: **not adopted** — dep removed in P2) |
| **Natural first slice** | Extract shared cat-selection (reuse `CatSelectorModal`) before the big merge                                | Collapse Family B (Announcement+Adoption) first — most duplicated, least risky           |

**Suggested sequencing (not yet a plan):** B before A — the forms are a lower-risk warm-up
that also establishes the shared media-upload primitive Family A's editors can later lean
on; within each, start with the most-duplicated / least-critical slice (Family B; then
admin cat-selection) to de-risk before touching the god-components' core state machines.

---

## 5. Open questions to resolve before planning execution

1. **Scope appetite:** both targets, or start with one? (Recommend B first.)
2. **`react-hook-form`:** adopt it (§2.3) or keep hand-rolled `useState` and only extract
   components? Adoption is the bigger simplification but a broader change.
   **⚠️ Resolved 2026-07-18 (owner deep-dive): do NOT adopt — remove the dep.**
   The forms' complexity is media-list/upload management, which RHF doesn't address
   (§2.3); dedup comes from `MediaUploadField` + a shared submit flow.
3. **Admin `alert/confirm` → shared `Modal`:** fold this product-visible change into the
   Target A refactor, or keep the refactor behavior-preserving and treat modals separately?
4. **Verification bar:** what proves parity for the admin editors — the existing Playwright
   `admin/` suite, new tests, or manual operator sign-off? **⚠️ Resolved by the 2026-07-18
   review: the existing suite is NOT a backstop here.** No e2e spec touches `tag-images` /
   `tag-videos` (consistent with `playwright-ci-plan.md` §8 deferring YouTube-tagging
   flows), and of the four forms only `NewAnnouncementForm` has a real create-flow test
   (`posts.spec.ts`, text-only, no media path). → Answer: **new characterization tests,
   written before each migration phase** (§7 P0), plus manual sign-off for the
   YouTube-API surfaces that can't be emulated (P5).
5. **Generic-editor shape:** confirm the `MediaTaggingEditor<T>` + injected
   service/date-source/extra-panels shape (§1.3) is the direction before decomposition.
   **⚠️ Resolved 2026-07-18 (owner deep-dive): rejected — toolkit of shared hooks +
   presentational components instead (§1.3a).** P4.5 remains as a confirmation
   checkpoint on the toolkit's concrete interfaces.

---

## 6. What §1–§5 are

The **evidence base** (what's duplicated, how much, how it splits, where the risk is).
§7–§8 below turn it into an execution plan + task list. No code has changed yet.

---

## 7. Execution plan

**Decisions re-locked (2026-07-18 owner deep-dive — supersede 2026-07-16):**

- Cover **both targets, B first** (survives re-examination, reinforced — B also builds
  the shared YouTube-upload function all four forms duplicate).
- **Drop `react-hook-form`** — do not adopt; **remove the unused dependency** in P2
  (reverses 2026-07-16; rationale §2.3, §5 Q2).
- Target A uses the **toolkit shape** (shared hooks + presentational components,
  pages stay page-owned), not `MediaTaggingEditor<T>` (§1.3a, §5 Q5).
- Admin-editor refactor stays **behavior-preserving**, with one accepted intentional
  exception: the P4 `CatSelectorModal` swap moves the editors to **commit-on-done**
  tag selection (the shared modal commits on 완료 vs the hand-rolled live-toggle
  write-back; it also adds the '이름 없음' option and different clear-all semantics) —
  P0 editor specs assert the new semantics. `alert/confirm`→`Modal` remains a separate
  follow-up (§8 P6.1).
- Retired-LOC expectation revised to **~2,100–2,900** (§3).
- **Priority:** this track executes next; the multi-tenant track stays parked
  (its blocker Q1 is thinking work, parallelizable).

**Gate for every phase:** `npx tsc --noEmit` (exit 0) + `npm run test:smoke` green, and —
because these are UI-behavior changes — the affected flow verified in the browser per the
repo convention (`/chrome` on `localhost:3000`; admin flows behind `AdminAuth`). Commit
only after gates pass and with explicit go-ahead.

### Phase 0 — Characterization tests (the parity net; added 2026-07-18)

The refactor's original verification bar assumed e2e coverage that **does not exist**:
no spec touches the two admin editors, and only `NewAnnouncementForm` has a (text-only)
create-flow test. Behavior-parity claims for a re-convergence refactor need a
**repeatable** net, not one-off manual checks — write it against the **current** code
first, so every later phase migrates against a green baseline.

- Per **form** (Family B now; Family A specs may land with P3): create happy-path
  including **one image upload**, success dialog, redirect, and the created content
  visible on its public surface. Keep the `page.on('dialog')` handler — the forms fire
  `alert()` on success and the refactor is behavior-preserving.
- Per **editor**: load list, select an item, save metadata (tags + date), multi-select +
  batch-tag, run date auto-parse, tag a cat — asserted against the emulator-seeded data.
  YouTube-dependent surfaces (sync, playlists) are **out** of the automated net (P5
  handles them manually).

**Exit:** new specs green against unrefactored code — the baseline every subsequent
phase must keep green.

### Phase 1 — Shared media-upload primitive (foundation for Target B)

Extract the file-input + preview + upload machinery the four forms hand-roll into one
reusable piece, with the **upload strategy injected** (not branched internally).

- `MediaUploadField` — presentational: file inputs, previews, remove, progress. No upload
  logic of its own.
- The **direct `getStorageService`** image strategy (Family B) as an injected
  function/hook — lifted verbatim from `NewAnnouncementForm` — plus the **shared
  YouTube video-upload function** (the `/api/upload-youtube` helper that is
  near-identical in all four forms; §2.2 correction). _(The **signed-URL image**
  strategy is deliberately **not** lifted here — re-sequenced to P3, its point of use,
  so it can't drift against a live `NewPostForm` for two phases. — 2026-07-18 review)_
- Land it under `src/components/ui/` (or `src/components/forms/`) beside the existing
  primitives; reuse `Field`/`Input`/`Button`.

**Exit:** primitive exists + unit/smoke covered; no form migrated yet.

### Phase 2 — Target B, Family B first (Announcement + Adoption)

Most-duplicated, least-critical → the safe first real migration.

- Shared submit/upload flow for the simple-content family (`title, message,
imageFiles, videoFiles, imageUrls, videoUrls` — hand-rolled state, **no RHF**;
  images via the direct-storage strategy, videos via the shared YouTube function).
- Migrate `NewAnnouncementForm` and `NewAdoptionForm` onto it + `MediaUploadField`.
  Collapse the 193 duplicated lines.
- Remove `react-hook-form` from `package.json` (decision: not adopted — §7).

**Exit:** both simple forms behavior-verified; Family B state boilerplate retired.

### Phase 3 — Target B, Family A (Post + ButlerTalk)

- Lift the **signed-URL image** upload strategy out of `NewPostForm`
  (`uploadImagesWithSignedUrls`) into an injectable unit — moved here from P1 (point
  of use; see P1 note). Videos reuse the shared YouTube function from P1.
- Shared submit/upload flow for the rich-content family (adds tags + playlist +
  `CatSelectorModal`; signed-URL image strategy; **no RHF**).
- Migrate `NewPostForm` (keep its Post-only feeding-spot fields as form extras) and
  `NewButlerTalkForm`. Collapse the 250 duplicated lines.
- `SignupForm` stays out of scope (different multi-step wizard).

**Exit:** all four content forms on the shared primitive + strategies; Target B done.

### Phase 4 — Target A prep: reuse cat-selection + toolkit skeleton

De-risk the god-components before touching their core.

- Replace both editors' hand-rolled cat-selection (`showCatSelector`/`selectedCats`
  state) with the existing shared **`CatSelectorModal`** (already used by the forms).
  ⚠️ Accepted intentional change (§7): tag selection becomes **commit-on-done** (완료)
  instead of live-toggle write-back, and gains the '이름 없음' option — the P0 editor
  specs assert the new semantics.
- Land the **toolkit** (§1.3a): `useMediaListController<T>` + `useDateAutoParse<T>`
  hooks and the presentational set (`MediaStatsCards`, `MediaFilterBar`,
  `BatchActionsPanel`, `MediaGrid`, `PaginationBar`, `CatTagField`), on a shared
  `toDate()` normalizer. Move `parseCreatedDateFromFilename` from `tag-images` into
  `@/utils/dateParser`.

**Exit:** cat-selection deduped; toolkit interfaces reviewed and agreed before migration.

### Phase 5 — Target A migration (re-converge the read side)

- Recompose `tag-images` on the toolkit (filename date-source; its `getImageService`
  write path stays page-owned); swap its hand-rolled Lightbox for `ui/Lightbox`.
- Recompose `tag-videos` on the toolkit (title date-source; its YouTube write
  orchestration extracted into a page-owned `useYouTubeVideoMutations` hook — **not**
  genericized; playlist panel + modal stay page-owned; keep
  `formatDuration`/`getVideoThumbnail`).
- Delete the twinned read-side/JSX duplicate bodies. **Behavior-preserving** —
  `alert/confirm` stay for now (P6 follow-up handles conversion).
- ⚠️ **YouTube-API surfaces are manual-parity by necessity** (2026-07-18 review):
  `syncWithYouTube` + playlist read/write hit the real YouTube Data API — not
  emulatable, so the P0 net cannot cover them. Their parity check is a scripted manual
  pass with real creds (sync a video, edit playlist membership, confirm in the editor
  and on YouTube) as part of operator sign-off.

**Exit:** both editors composed from the shared toolkit; ~1,200–1,800 LOC retired;
P0 editor specs still green; YouTube surfaces manually verified; operator parity
signed off.

### Phase 6 — Follow-ups & close-out

- Separate task: convert admin `alert()/confirm()` → shared `ui/Modal` (product-visible;
  own verification).
- Update `docs/codebase/admin-platform.md` + `PROJECT_PLAN.md`; add a `FEATURE_MOD_LOG.md` entry
  (intentional refactor, not a bug); flip this doc's status to executed.

---

## 8. Task list

**Legend:** `[ ]` todo · `[x]` done · ⚠️ needs a decision/verification checkpoint

### P0 — Characterization tests (added 2026-07-18 — see §7 P0) — ✅ DONE 2026-07-19

- [x] P0.1 e2e create-flow specs for Family B (`NewAnnouncementForm` upgrade to include an image upload; `NewAdoptionForm` new) — green against current code _(`tests/e2e/admin/posts.spec.ts`)_
- [x] P0.2 e2e editor specs for `tag-images` + `tag-videos` (load, single-edit save, multi-select + batch-tag, date auto-parse, cat tagging; YouTube surfaces excluded) — green against current code _(`tests/e2e/admin/tag-images.spec.ts` + `tag-videos.spec.ts`; for the video editor "save" is YouTube orchestration, so its automated net covers load/form-population/local cat-tagging/title-parse + the Firestore-only bulk 자동 날짜 인식)_
- [x] P0.3 Gate: new specs + full e2e suite green pre-refactor (the baseline) — **112 passed / 13 skipped / 0 failed** (2026-07-19, local full gate; tsc + smoke green)

_P0 execution notes (2026-07-19): (1) fixtures extended — `media.json` gained `test-img-03/04`
(untagged, no `createdTime`, date-pattern filenames) + `test-vid-02` (title vs description carry
**different** date patterns so the per-item parse and the bulk parse — which reads
`description||id`, not `title` — each pin their own source); `albums.spec.ts` updated for the
larger seed. (2) Console watchdog got one scoped allowance: `/admin/tag-videos` mounts with a
failing `/api/manage-playlists` (no YouTube creds in the emulator env) — the specs pin that the
page works without playlists. (3) Two behaviors the specs pin that differ from naive expectation:
`batchUpdateTags` does NOT clear the selection (only `batchUpdateImages` does — the panel stays
open, only the tags input resets), and cat-selection is asserted through the 완료-commit path
only, so the same assertions survive the accepted P4 commit-on-done change. (4) Selector tests
use `테스트냥이이` — `cats.spec.ts` renames `테스트냥이일` mid-run in the same project._

### P1 — Shared media-upload primitive

- [ ] P1.1 Extract `MediaUploadField` (inputs + previews + progress; presentational only)
- [ ] P1.2 Lift **direct-storage image** upload strategy out of `NewAnnouncementForm` + the **shared YouTube video-upload** function (near-identical in all four forms) into injectable units _(signed-URL image strategy re-sequenced to P3.0 — point of use)_
- [ ] P1.3 Smoke/unit coverage for the primitive + the direct-storage strategy
- [ ] P1.4 Gate: `tsc` + `test:smoke` green

### P2 — Family B (Announcement + Adoption)

- [ ] P2.1 Shared submit/upload flow for the simple-content family (hand-rolled state, **no RHF** — §7)
- [ ] P2.2 Migrate `NewAnnouncementForm` → shared flow + `MediaUploadField` (direct-storage images, shared YouTube videos)
- [ ] P2.3 Migrate `NewAdoptionForm` → same; delete the 193 duplicated lines
- [ ] P2.4 ⚠️ P0.1 specs still green + browser-verify both create flows (submit, upload, preview, validation)
- [ ] P2.5 Remove `react-hook-form` from `package.json` (not adopted — §7)
- [ ] P2.6 Gate: `tsc` + `test:smoke` green

### P3 — Family A (Post + ButlerTalk)

- [ ] P3.0 Lift **signed-URL image** upload strategy out of `NewPostForm` into an injectable unit (moved from P1 — point of use; videos reuse the shared YouTube function from P1.2); add Family A create-flow specs to the P0 net
- [ ] P3.1 Shared submit/upload flow for rich-content family (tags + playlist + `CatSelectorModal`; **no RHF**)
- [ ] P3.2 Migrate `NewPostForm` (retain Post-only feeding-spot fields as extras)
- [ ] P3.3 Migrate `NewButlerTalkForm`; delete the 250 duplicated lines
- [ ] P3.4 ⚠️ P0-net specs still green + browser-verify both create flows (incl. YouTube upload + cat/playlist tagging — YouTube path manual)
- [ ] P3.5 Gate: `tsc` + `test:smoke` green — **Target B complete**

### P4 — Target A prep

- [ ] P4.1 Swap `tag-images` hand-rolled cat-selection → shared `CatSelectorModal`
- [ ] P4.2 Swap `tag-videos` hand-rolled cat-selection → shared `CatSelectorModal`
- [ ] P4.3 ⚠️ Browser-verify cat-tagging parity (individual + batch) in both editors — asserting the accepted **commit-on-done** semantics (§7)
- [ ] P4.4 Land the toolkit skeleton (§1.3a): `useMediaListController<T>` + `useDateAutoParse<T>` + presentational set + shared `toDate()`; move `parseCreatedDateFromFilename` → `@/utils/dateParser`
- [ ] P4.5 ⚠️ Review the toolkit's concrete interfaces before migrating (checkpoint — §5 Q5, direction resolved: toolkit)

### P5 — Target A migration

- [ ] P5.1 Recompose `tag-images` on the toolkit (filename date-source); swap hand-rolled Lightbox → `ui/Lightbox`
- [ ] P5.2 Recompose `tag-videos` on the toolkit (title date-source); extract YouTube write orchestration → page-owned `useYouTubeVideoMutations`; playlist panel/modal stay page-owned
- [ ] P5.3 Delete twinned read-side/JSX duplicate bodies from both files
- [ ] P5.4 ⚠️ Operator parity verification: **P0.2 editor specs green** + scripted manual pass over the YouTube surfaces (sync + playlists, real creds) + operator sign-off (§5 Q4)
- [ ] P5.5 Gate: `tsc` + `test:smoke` green — **Target A complete**

### P6 — Follow-ups

- [ ] P6.1 (separate) Convert `alert()/confirm()` → shared `ui/Modal`. ⚠️ Scope note
      (2026-07-18): not just the admin editors — **all four content forms fire
      `alert()` too** (4–7 call sites each; `posts.spec.ts` installs a dialog handler
      to get past the success alert). Converting the forms changes public-facing
      behavior and must update the P0 specs' dialog handling in the same change.
- [ ] P6.2 Docs: refresh `docs/codebase/admin-platform.md` + `PROJECT_PLAN.md`
- [ ] P6.3 `FEATURE_MOD_LOG.md` entry (intentional refactor); flip this doc's status to ✅ executed

---

## 9. What §7–§8 are NOT

An agreed schedule or an in-flight change. The plan is sequenced and gated but **no code
has changed**; execution starts only on an explicit go-ahead — **at Phase 0** (the
characterization net comes before any refactor). §5 Q4 (verification bar) was resolved
by the 2026-07-18 review (answer: P0 characterization tests + manual YouTube pass);
§5 Q5 (editor shape) was resolved by the 2026-07-18 owner deep-dive (**toolkit** —
§1.3a), with P4.5 remaining as a confirmation checkpoint on the concrete interfaces.
**The deep-dive gate is satisfied; the explicit P0 go-ahead itself is still owed.**
