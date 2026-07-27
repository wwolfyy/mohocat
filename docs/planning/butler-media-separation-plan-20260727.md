# 집사게시판 미디어 분리 · 집사톡 작성기 개선 · 마운틴별 재생목록 — Plan — 20260727

> Three related changes to the member-facing post composers, decided by the owner on
> 2026-07-27. The spine is a **separation-of-concerns call**: 집사게시판(butler_stream) is a
> 급식소 check-in log and should stop being a second media composer, because 집사톡
> (butler_talk) already does that job. The media work that was going to land on
> 집사게시판 moves to 집사톡 instead, and the shared YouTube channel gains a
> **per-mountain playlist** so uploads are attributable to one mountain on the YouTube
> side (they are already attributable on the Firestore side) — plus one **cross-mountain
> 입양홍보 playlist**, since adoption promotion is platform-wide by nature.
>
> **Status:** 🚧 **IN PROGRESS — B1 done, B2/B3/B4 open.** Every current-state
> claim below was verified against `dev` @ `d7999e2` on 2026-07-27; §1.1's description of
> 집사게시판 is now **history** — B1 removed it.
>
> **B1 gates (2026-07-27):** tsc 0 · smoke 30/30 · unit 80/80 · **full e2e 150 passed / 13
> skipped / 0 failed** (+2 = the new 취소 specs) · browser pass on the rebuilt form.
>
> **Companion docs:** [`multi-mountain-refactor-plan-20260719.md`](./multi-mountain-refactor-plan-20260719.md)
> (§6 deferred items — the `syncVideos` hazard this plan deliberately does **not** close) ·
> [`complexity-retirement-assessment-20260716.md`](./complexity-retirement-assessment-20260716.md)
> (§8 P3 — where `useRichContentForm` came from) ·
> [`media-and-youtube.md`](../codebase/media-and-youtube.md) (image/video serving model).

**Legend:** `[ ]` todo · `[x]` done · ⚠️ watch-out · 🔑 owner-owed (only the owner can do it)

---

## §0 Decisions locked (owner, 2026-07-27)

| #   | Decision                                                                                                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **집사게시판 loses media upload entirely** — it does one job (급식소 check-in). Scope = **compose UI only**: legacy posts keep rendering, admin URL editing untouched. |
| D2  | **The per-file media rework moves to 집사톡** — one file per picker, each with its own 제목/설명, sections appearing progressively.                                    |
| D3  | **Cancel button on both** 집사게시판 and 집사톡 composers.                                                                                                             |
| D4  | **One YouTube playlist per mountain** on the shared channel — the ownership/attribution handle, replacing the content-type axis for filing purposes.                   |
| D5  | **Playlist ID lives in `mountains.json`**, beside `social.youtubeChannelId` — replacing today's match-by-title lookup.                                                 |
| D6  | **The `syncVideos` cross-tenant hazard stays deferred** to real-mountain-#2 provisioning. Not touched here.                                                            |
| D7  | **입양홍보 files into one cross-mountain playlist** (`산냥이집냥이 - 입양홍보`), held in a **`_shared` platform block** in `mountains.json` — not a per-mountain knob. |
| D8  | **An 입양홍보 video joins both playlists** — the shared 입양홍보 one _and_ its own mountain's — so "mountain playlist = everything that mountain owns" stays true.     |

---

## §1 Current state (verified on `dev` @ `d7999e2`)

### 1.1 집사게시판 — `src/components/NewPostForm.tsx` (367 lines)

Renders, in order: 제목 · 급식소 checklist + 방문 시간 · **동영상 업로드** (`multiple`) ·
**YouTube 동영상 설정** (등장하는 고양이 / 촬영 날짜 / locked 재생목록, shown only when a video is
picked) · **사진 업로드** (`multiple`) · image 등장하는 고양이 · 내용 · 작성 완료 · two
`CatSelectorModal`s. Submit/upload comes from `useRichContentForm`.

⚠️ The 제목 field is **prefilled with a value** (`급식소 챙기고 갑니다 (날짜)`, regenerated from
방문 시간 by an effect), and that same string becomes each video's YouTube title with
` (Part n)` appended past the first (`useRichContentForm.ts:181`). The 내용 textarea is doing
triple duty: post body, every video's YouTube description, and every photo's
`cat_images.description`.

### 1.2 집사톡 — `src/components/NewButlerTalkForm.tsx` (251 lines)

Same shared hook, no 급식소 section, `createdTimeInputType: 'datetime-local'`,
`multiPartVideoTitles: false`, post-title fallback `집사톡 글입니다`.

### 1.3 The shared hook — `src/components/forms/useRichContentForm.ts` (301 lines)

Owns: file state (`videoFiles`/`imageFiles`, whole-array replace), filename date auto-parse
(first video, else first image), the **playlist fetch**, cat-tag state per kind, the upload
pipeline (`uploadVideoToYouTube` per file → `uploadImagesWithSignedUrls`), post assembly,
dialog + redirect.

⚠️ **Playlist selection is a title match.** `useRichContentForm.ts:106` picks the playlist
whose `title === '집사게시판'` out of everything `/api/youtube-playlists` returns (`mine: true`
— the whole shared channel, not per-mountain). Rename that playlist on YouTube and filing
silently stops, with no error. Both forms hard-code the string `집사게시판` in their locked
read-only playlist input — a label that goes stale the moment D1 lands.

⚠️ **Family B files into nothing at all.** `useSimpleContentForm.ts:99` calls
`uploadVideosToYouTube` with `{title, description, tags}` and **no `playlistId`**, so every
공지사항 and 입양홍보 video is currently unfiled on the channel. D7 is therefore a **new
capability** for 입양홍보, not a re-pointing — and it pulls Family B into B2's scope.

### 1.3a `mountains.json` already has a platform-level escape hatch

The file's top level is `{_meta, geyang, manisan}`, and `getAllMountains()`
(`src/utils/config.ts:217`) filters `key.startsWith('_')` as "meta entries" — so
underscore-prefixed non-tenant blocks are an **established** mechanism, not a new one. D7's
`_shared` block rides on it. ⚠️ `scripts/maintenance/fetch-static-assets.js:393,522` iterates
`Object.entries(mountainsConfig)` **without** that filter; it already coexists with `_meta`,
so a second `_` key is safe by the same argument — but verify the build, don't assume.

### 1.4 Where a video's mountain already comes from

Better than the question assumed — **the Firestore side is solved**:

| Surface                   | How the mountain is attached                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Video record              | `upload-youtube/route.ts` writes `cat_videos` via `getVideoService(getRequestMountainId(request))` — stamped from the request Host (M4/M5) |
| Video reads               | Every query scoped `where('mountainId','==',…)` (M5.1)                                                                                     |
| Photo record              | `uploadImagesWithSignedUrls` → `getImageService(mountainId).createImage` — same stamp                                                      |
| Photo bytes               | Storage object path prefixed with the tenant's `storagePrefix` (M6)                                                                        |
| **Video bytes (YouTube)** | ❌ **nothing** — one shared channel, no per-mountain marker                                                                                |

The only real gap is that last row, and it bites in exactly one place:
**`syncVideos(mountainId)`** (`src/services/media-albums.ts:638`) fetches _every_ video on the
configured channel and imports whatever is missing from that mountain's Firestore set,
stamping it with that mountain. So it matters **only for videos uploaded directly on YouTube,
outside the app** — app uploads are already stamped. Inert today (manisan has no prod data and
is `hidden: true`); a real mountain #2 running 동기화 would claim geyang's whole back catalogue.
Per **D6** that fix stays deferred — but the per-mountain playlist this plan adds is precisely
the handle it will use.

### 1.5 Test surface that this touches

- `tests/e2e/admin/butler-create.spec.ts` — test 1 (집사게시판) picks an image file purely to
  reveal the cat-tag field and exercise `CatSelectorModal`, then clears it. That whole block
  dies with D1. Its `page.locator('textarea')` and
  `page.locator('input[type="file"][accept="image/*"]')` are also **strict-mode single-match**
  locators that D2's per-file sections will break in the 집사톡 test.
- `tests/unit/uploadStrategies.test.ts` (16 tests) — strategy-level, unaffected by D1/D2
  unless a signature changes.
- `tests/smoke/smoke.test.ts:96` — asserts `components/forms/*` paths exist; any new shared
  component should be added there.

---

## §2 Target

1. **집사게시판** = 제목 · 급식소 checklist · 방문 시간 · 내용 · 작성 완료 · **취소**. No file
   inputs, no YouTube metadata, no cat-tag modals, no upload code path at all.
2. **집사톡** = the platform's only media composer, with **per-file** 제목/설명 and one file per
   picker, plus **취소**.
3. **Every uploaded video is filed into its mountain's playlist**, resolved from config by ID.
4. **입양홍보 videos additionally join the cross-mountain `산냥이집냥이 - 입양홍보` playlist**, so
   adoption content is browsable as one collection while staying attributable to one mountain.

---

## §3 Phases

Each phase gates on `npx tsc --noEmit` + `npm run test:smoke` + `npm run test:unit` +
`npm run test:e2e` + a **browser pass** on the affected page. Commits are **owner-gated** —
stage, run gates, summarize, wait for go-ahead.

### B1 — 집사게시판 media removal + 취소 ✅ **DONE 2026-07-27**

- [x] B1.1 `NewPostForm.tsx`: delete the 동영상 업로드 input, the YouTube 동영상 설정 block,
      the 사진 업로드 input, the image 등장하는 고양이 field, both `CatSelectorModal`s, and the
      `uploading` media hint text.
- [x] B1.2 Drop `useRichContentForm` from this form; give it a local submit handler
      (~40 lines) over `useAuth` + `useDialog` + `useRouter`: assemble the post, `createPost`,
      the existing non-fatal feeding-spots `afterCreate`, reset, success dialog, redirect.
      Net LOC should fall by ~150.
- [x] B1.3 Post shape: keep writing `videoUrls: []`, `imageUrls: []`, `thumbnailUrl: ''` and
      `mediaType: null` — the exact shape a media-less post has today. ⚠️ Verified no reader
      branches on `mediaType` (only type declarations + `EditPostForm`, which already writes
      `null`), so this changes nothing downstream.
- [x] B1.4 취소 button beside 작성 완료 → `router.push('/pages/butler_stream')`, with a
      `dialog.confirm` when 제목 has been edited off its generated default, 내용 is non-empty,
      or any 급식소 is checked.
- [x] B1.5 Browser pass: create a text post, confirm it lands in the stream; open an existing
      post **that has media** and confirm it still renders (this is the D1 "compose-only"
      guarantee).

### B2 — Config-driven playlist filing (replaces the title match)

- [ ] B2.1 `config/mountains/mountains.json` — all three playlists exist and were
      **API-verified on 2026-07-27** (title + channel + item count):

      ```jsonc
      "geyang":  { "social": { "youtubePlaylistId": "PL3DBzcr-rpCGQtNw2dgC8cJcDTjIEOSxa" } },  // 산냥이집냥이 - 계양산
      "manisan": { "social": { "youtubePlaylistId": "PLVEAQ-0vlkXw" } },                        // 산냥이집냥이 - 마니산
      "_shared": { "youtube": { "adoptionPlaylistId": "PL3DBzcr-rpCG8QxBiLgcSZtgD9LoXjY58" } }  // 산냥이집냥이 - 입양홍보
      ```

      All three live on `UC1g-XZS4wwyUu7JHDEpB0jw` — the same channel as
      `social.youtubeChannelId`, confirming the shared-channel model. ⚠️ **Do not
      length-validate playlist IDs.** `PLVEAQ-0vlkXw` is 13 chars against the other two's 34
      and is perfectly valid; YouTube does not guarantee a single ID length.

- [ ] B2.2 `src/utils/config.ts`: `getYouTubePlaylistId(mountainId)` beside
      `getYouTubeChannelId`, plus `getAdoptionPlaylistId()` (**no `mountainId` argument** —
      the missing parameter is what documents it as platform-scoped, exactly like the
      env-sourced deployment secrets in the same file).

      🔑 **Missing key ≠ empty value — this is the whole contract:**

      | Config state                | Meaning                      | Behavior                                                        |
      | --------------------------- | ---------------------------- | --------------------------------------------------------------- |
      | Key **absent** or misspelled | Config error                 | **Throw** (M1 map-imagery convention) — a typo must never be quiet |
      | Key present, value `""`      | "No playlist yet", on purpose | Return `null`; caller **skips filing** and logs that it did       |
      | Key present, value `PL…`     | Configured                   | File into it                                                      |

      ⚠️ This is *not* a silent fallback: the empty case is an explicit, reviewable statement
      in config, and the skip is logged at upload time. 📌 **As of B2.1 all three IDs are
      populated, so the empty path is defensive only** — it exists for the next mountain, which
      will be provisioned before its playlist is created. Keep it anyway: blanket fail-loud
      would make "add a mountain" and "make its playlist" a single atomic chore.

- [ ] B2.3 `useRichContentForm`: delete the `/api/youtube-playlists` fetch, the `playlists` /
      `loadingPlaylists` / `selectedPlaylist` state, and the title match; take the playlist ID
      from config via `useMountain()`. This removes a gated network call and its 403
      warn-and-continue path from the form.
- [ ] B2.4 `NewButlerTalkForm`: the locked 재생목록 input shows the **mountain's display name**
      (from config), not the hard-coded `집사게시판`; helper text updated to say the video is
      filed under that mountain. ⚠️ If the ID is ever blank it must **say so** — _재생목록이
      아직 없어요. 동영상은 재생목록에 추가되지 않아요_ — never a mountain name that implies filing
      that won't happen. (Not reachable today; both mountains are configured.)
- [ ] B2.5 **`/api/upload-youtube` takes a list of playlists.** It reads a single
      `formData.get('playlistId')` and does one `playlistItems.insert` today; accept repeated
      `playlistId` fields (`formData.getAll`) and insert into each. ⚠️ Keep the existing
      **non-fatal** per-insert behavior (a failed filing warns, the upload still succeeds) —
      but log _which_ playlist failed, since with two of them "the video uploaded but isn't in
      a playlist" is now ambiguous.
- [ ] B2.6 `uploadStrategies.uploadVideo(s)ToYouTube`: `playlistId?: string` →
      `playlistIds?: string[]`, appending one field per ID. Update
      `tests/unit/uploadStrategies.test.ts` (it pins the current single-field encoding).
- [ ] B2.7 **Family B wiring** — `useSimpleContentForm` gains a playlist list in its config;
      `NewAdoptionForm` passes `[mountainPlaylistId, adoptionPlaylistId]` (D8),
      `NewAnnouncementForm` passes nothing (§4.5). This is the part D7 adds to the original
      scope.
- [ ] B2.8 `cat_videos.playlist` is a **single string** (`upload-youtube` writes
      `playlist: playlistId || ''`). Write the **mountain** playlist there — it is the
      ownership handle — and leave the adoption membership to YouTube. ⚠️ Do not widen this
      field: nothing reads it for behavior, and the video record's mountain already lives in
      `mountainId`.
- [ ] B2.9 Unit tests: `getYouTubePlaylistId` (present / missing / unknown mountain),
      `getAdoptionPlaylistId` (present / missing), and that the `_shared` key is invisible to
      `getAllMountains()` / `getPublicMountains()` / `resolveMountainIdOrNull` — the
      regression guard for the `_`-prefix mechanism.
- [ ] B2.10 ⚠️ Check whether `/api/youtube-playlists` still has callers after B2.3. If the
      admin editor is its only remaining consumer, say so in the commit message; **do not
      delete it** in this change (`/admin/tag-videos` playlist panel uses it).

### B3 — 집사톡 per-file media sections

- [ ] B3.1 New shared component `src/components/forms/MediaItemList.tsx`: renders an ordered
      list of media items, each = single-file picker (`multiple` **removed**) + 제목 (video
      only) + 설명 + 삭제. A fresh empty section is appended as soon as the last one has a
      file. `kind: 'image' | 'video'` selects the label set, as `MediaUploadField` does today.
- [ ] B3.2 `useRichContentForm`: `videoFiles: File[]` / `imageFiles: File[]` become
      `videoItems: {file, title, description}[]` / `imageItems: {file, description}[]`. The
      upload loop passes each item's own title/description to `uploadVideoToYouTube`; the
      filename date auto-parse keys off the **first item that yields a date** (unchanged in
      spirit).
- [ ] B3.3 `uploadImagesWithSignedUrls`: accept a per-file description instead of one shared
      `context.description`. Signature change → update `tests/unit/uploadStrategies.test.ts`.
- [ ] B3.4 `/api/upload-youtube`: drop the hard-coded
      `description: description || 'Uploaded via Mountain Cats app'` default so an empty
      description reaches YouTube empty. ✅ **Verified safe for the other callers** —
      공지사항/입양홍보 always send a non-empty `youtubeDefaults.description`
      (`NewAnnouncementForm.tsx:23`, `NewAdoptionForm.tsx:21`), so this is a no-op for them.
- [ ] B3.5 Helper text under each field (Korean, 해요체): 제목 → _비어 있으면 글 제목이
      사용돼요_; 동영상 설명 → _비어 있으면 YouTube 설명 없이 올라가요_; 사진 설명 → _비어
      있으면 설명 없이 저장돼요_.
- [ ] B3.6 취소 button on 집사톡, same rules as B1.4 (dirty check includes picked files).
- [ ] B3.7 Browser pass: two videos with different titles, one with an empty title, one photo
      with a description and one without.

### B4 — Tests & docs

- [ ] B4.1 `butler-create.spec.ts` test 1: delete the image-pick / cat-tag / clear-file block;
      assert **no file inputs exist** on 집사게시판 (the regression guard for D1). Scope the
      `textarea` locator.
- [ ] B4.2 New e2e coverage on 집사톡: picking a file reveals a second empty section; per-file
      fields are independently editable; 삭제 removes the right one. ⚠️ Upload itself stays out
      of the automated net for the reasons in the spec header (YouTube + production Storage
      URLs) — per-file **metadata reaching the request** is unit-testable instead.
- [ ] B4.3 취소 covered on both forms (navigates away; confirms when dirty).
- [ ] B4.4 `log/FEATURE_MOD_LOG.md` entry — intentional product change, not a bug fix.
- [ ] B4.5 `docs/handoff/HANDOFF.md` — update in place + one changelog line.
- [ ] B4.6 `docs/planning/PROJECT_PLAN.md` tracker entry; note in
      `docs/codebase/media-and-youtube.md` that 집사게시판 is no longer an upload surface and
      that playlist filing is per-mountain and config-driven.

---

## §4 Assumptions taken (say the word to flip any of these)

1. **Photos get 설명 only, no 제목.** `CatImage` (`src/types/media.ts:3`) has no `title` field;
   `description` is what displays publicly (`PhotoAlbum.tsx:182`, `Lightbox.tsx:168`) and what
   `/admin/tag-images` edits. A photo title would be write-only data until a new field plus its
   display surfaces exist. Videos are different — YouTube owns a real title.
2. **An empty photo 설명 saves empty**, mirroring the rule given for video descriptions. ⚠️
   This is a behavior change: today the 내용 textarea is copied into every photo's caption, so
   photos always have one. The album's existing `설명 없음` placeholder covers the empty case.
3. **` (Part n)` survives only on fallback titles** — a video with its own 제목 uploads it
   verbatim; videos falling back to the post title get the suffix when more than one does, so
   YouTube never receives N identical titles.
4. **A new empty section appears as soon as the previous one has a file** — not gated on the
   title/description being filled, since both are optional and gating would trap the user.
5. **공지사항 videos stay unfiled** (no playlist), as they are today. Only 입양홍보 was named for
   the shared playlist. Giving 공지사항 its own is a one-line change if wanted later.

---

## §5 Owner-owed 🔑

- [x] **All three playlists created** (owner, 2026-07-27) and API-verified — IDs in B2.1.
      산냥이집냥이 - 입양홍보 is **cross-mountain by design** (D7); if a second mountain ever wants
      its own adoption playlist, that's the `_shared` → per-mountain-override evolution noted
      in §6, not a config edit.
- [ ] **Add the back catalogue to `산냥이집냥이 - 계양산`: ~9 videos.** The channel has **13**
      videos and the playlist holds **4** (API-checked 2026-07-27). ⚠️ This matters because the
      per-mountain playlist is the `syncVideos` scoping handle (§1.4) — videos left out look
      _unowned_ to the future sync. Nine manual adds on YouTube; cheapest now, archaeology
      later.
- [ ] **Decide the fate of the existing `집사게시판` playlist.** Recommendation: leave it in
      place (existing videos stay filed) and stop adding to it — the content-type axis is
      superseded by the mountain axis for filing purposes (D4).
- [ ] Verify on Preview after deploy (this change adds nothing to the P5.4 pass, but the
      playlist filing is a YouTube write, so it is only observable with real credentials).

---

## §6 Risks / watch-outs

- ⚠️ **`useRichContentForm` ends up with one consumer** (집사톡) after B1. Leave it as a hook —
  inlining it into the form would be churn, and B3 immediately grows it. Revisit only if it
  stays single-consumer after B3.
- ⚠️ **B3.3 changes a strategy signature** that the P3 refactor deliberately shared. Keep
  `uploadVideoToYouTube` itself untouched (it already takes per-call title/description) so the
  blast radius is the image strategy only.
- ⚠️ **B2.2's throw-on-missing-key is real** — B2.1 must land in the same commit as B2.2, with
  every key **present** (blank values are fine, absent ones are not). A `manisan` block without
  the key would break its composer on sight.
- ✅ **No blank window** — all three IDs landed before implementation started (2026-07-27), so
  filing is live from the first upload. The empty-value path survives as B2.2's defensive
  contract for the next mountain, not as a state this change ships in.
- ⚠️ **Playlist membership is not retroactive.** The 계양산 playlist holds **4** of the
  channel's **13** videos (API-checked 2026-07-27), so ~9 pre-existing videos sit outside it.
  Filing starts at the _next_ upload; the back catalogue needs the one-time bulk add in §5.
- ⚠️ **Dual filing has a partial-failure mode** (D8): the mountain insert can succeed while the
  adoption insert fails, or vice versa, and both are non-fatal by design. The video is then in
  one playlist and not the other, with only a server warning. Acceptable — YouTube playlist
  membership is repairable by hand — but B2.5's per-playlist logging is what makes it
  diagnosable at all.
- 📌 **`_shared` is a one-way door in one direction only.** A platform value can later grow an
  optional per-mountain override that wins when present (the third option considered at D7);
  going the other way — collapsing N drifted per-mountain copies back into one — is the
  migration this shape avoids.
- ⚠️ **The e2e net cannot see any of the YouTube-side behavior** (no credentials in the
  emulator) — playlist filing and the empty-description change are Preview-verified only. Same
  class as everything the P5.4 pass exists for.
- ⚠️ **Fixture realism** (the standing check from 2026-07-26): if a new e2e assertion depends
  on a media field, verify the seed carries a production-shaped value first. Two production-only
  failure modes hid behind unrealistic fixtures in the last session.

---

## §7 Explicitly out of scope

- The **`syncVideos` cross-tenant hazard** (D6) — still a prerequisite for provisioning a real
  mountain #2, tracked in the multi-mountain plan's deferred list.
- **공지사항 / 입양홍보 media _input_** — they keep `MediaUploadField` and its multi-file picker.
  ⚠️ Consequence: two media-input patterns coexist after B3. Acceptable for now; converging
  them is a later pass. (Their **playlist filing** is in scope — B2.7 — only their pickers are
  not.)
- **공지사항 playlist filing** — stays unfiled (§4.5).
- **`EditPostForm`** — admins keep URL-based media editing on every post type, including
  집사게시판 (D1 = compose-only).
- **Deleting media from existing 집사게시판 posts** — explicitly rejected as destructive.
