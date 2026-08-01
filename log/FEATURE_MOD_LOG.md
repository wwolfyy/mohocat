# 산냥이집냥이 — Feature Modification Log

> A running log of **intentional product changes** — feature **enhancements**,
> small **fixes**, and **removals** — newest first. These are changes made by
> choice, not bug investigations. Each entry captures **what changed**, the
> **rationale**, and how it was **verified**.
>
> Sibling log: [`DEBUG_LOG.md`](./DEBUG_LOG.md) — for **bugs** whose root cause
> was non-obvious (symptom → root cause → fix → verified). If a change is
> "we decided to add/change/remove X," it goes here; if it's "X was broken and
> here's why," it goes in the debug log.
>
> These entries don't need to be tracked in `docs/handoff/` or
> `docs/planning/` unless they change planned scope.

---

## 2026-08-01 — 이 냥이 링크: a share chip in the cat modal

**Area:** `src/components/CatInfo.tsx`, `src/utils/cat-link.ts` (new),
`tests/unit/catLink.test.ts` (new), `tests/e2e/public/cat-deep-link.spec.ts`.
**Type:** enhancement (PROJECT_PLAN §10c C3, owner-requested).

**What changed and why.** The `?cat=<id>` deep link shipped earlier the same day was only
usable by someone willing to look a cat's id up in Firebase. The owner's framing settled it:
the problem was never how the URL _looks_, it was how hard it is to _produce_. A third chip in
the cat modal's existing action row now hands you the link — OS **share sheet** where available
(one tap into a KakaoTalk chat, which is where these go), clipboard copy otherwise.

🔑 **This dissolved an open design question rather than answering it.** Name-keying the URL, a
per-mountain unique-name rule, and putting the mountain in the query had all been on the table
to make links hand-constructible. With a share button none of them are needed, so the param
stays keyed on the immutable id and the rename hazard never comes back.

⚠️ **The chip builds the link; it does not copy `location.href`.** `CatInfo` renders on **six**
surfaces and only 냥이들 carries `?cat=`, so copying the current URL would share a link to
`/pages/adoption`. Building it (`utils/cat-link.ts`) also means the chip works from the adoption
gallery, the map, 소개, and inline `[catmodal:이름]` mentions — wider reach than planned.

📌 **The tenant prefix is mirrored from the current path, not read from config** — because the
config answer is wrong today: geyang's `domains` says `geyangsan.mohocats.org` while production
serves from the apex via the default-tenant fallback, so a config-driven branch would emit
`/geyang/pages/cats…` and re-prefix URLs the path decision keeps clean. Full reasoning, and why
a dropped prefix would fail silently and unrecallably, in PROJECT_PLAN §10c C3.

**Verified in Chrome by stubbing each branch** (a real share sheet is an OS dialog no automated
run can dismiss): share receives the constructed URL and the cat's name; a **dismissed** sheet
(`AbortError`) logs nothing, copies nothing and leaves the label alone; a genuine share failure
logs once and falls back to copying; a refused clipboard says 복사하지 못했어요; feedback reverts
after 2 s. Round-tripped a shared link back to the open modal, and confirmed a `/geyang`-prefixed
page keeps its prefix. Plus 7 unit tests, 2 e2e cases, tsc 0 / smoke 33 / unit 129.

---

## 2026-08-01 — one cat is now linkable: `/pages/cats?cat=<id>`

**Area:** `src/app/[mountain]/pages/cats/CatsBrowser.tsx`, `src/components/ui/useModalLayer.ts`,
`src/components/ui/Modal.tsx`, `tests/e2e/public/cat-deep-link.spec.ts` (new).
**Type:** enhancement (PROJECT_PLAN §10c, decided 2026-07-29).

**What changed and why.** There was no URL that opened a specific cat — the only way to point
someone at 아롱이 was "open 냥이들 and search the name". Clicking a cat now sets `?cat=<id>`,
and arriving on such a link opens that cat's `CatInfo` modal. Closing returns to a clean
`/pages/cats`, and the browser back button closes the modal, as it already did.

🔑 **Built on the modal system's existing history entry rather than beside it.**
`useModalLayer` already pushed a synthetic history entry per overlay (that is how Android's back
gesture closes a modal) and already popped it on close. It now accepts an optional
**`historyUrl`** to hang on that entry, so the URL comes along for free and the existing
`history.back()` restores it. No second history mechanism to keep in step with the first — and
any modal worth addressing can opt in by passing `historyUrl` to `ui/Modal`.

📌 **Keyed on the cat `id`, never the name** — the `[catmodal:이름]` token matches by name, so a
rename silently breaks every link to it, and a URL people paste into KakaoTalk outlives any
rename. In production the two currently _look_ the same: legacy docs are keyed by Korean name
(the Sheets pipeline), so a real link reads `?cat=개똥이`. Cosmetic — old links survive a rename.

⚠️ **The survival mechanism is not the one you'd assume.** `cat-reads.ts` maps
`{ id: doc.id, ...doc.data() }`, and every prod cat doc carries its **own `id` field** (a
duplicate of the doc key from the Sheets import) — so the spread wins and `cat.id` is a _stored
field_, not the immutable document address. A rename survives because `CatFormData` has **no
`id` member**, so the CMS write never touches it. That is a convention, not an enforcement: add
`id` to that form and pasted links break silently. Spreading first
(`{ ...doc.data(), id: doc.id }`) would make it structural — a no-op on today's data, left
alone here because it changes a shared read path.

**Verified in Chrome against a production build** — not just dev, because the two diverged
during this work. Arrival opens the modal and holds the param (measured to 3.5 s, since the
first attempt reverted it after ~1 s); closing clears the param and stays on the page; clicking
a row sets it; back closes and clears, releasing the scroll lock. Unknown id → the plain list.
Plus 5 new e2e cases and tsc 0 / smoke 33 / unit 122.

🐛 **Two traps, both found by looking rather than reasoning** (full chain in `DEBUG_LOG.md`):
the deep-link open must be deferred one task past the strip, or Next's AppRouter re-assert wipes
`?cat=` back off; and that defer must be `setTimeout`, **not** `requestAnimationFrame`, because
shared links get opened into background tabs where rAF never fires.

🆕 **Owner decision this raises, not blocking:** the cats page now emits a GA4 `page_view` per
modal open (the URL really changes, and `AnalyticsTracker` fires on `searchParams`). Defensible
now that a cat is an address, but `/pages/cats` view counts will include modal opens. Suppressing
it means teaching `AnalyticsTracker` to ignore the `cat` param — a few lines, not done.

---

## 2026-08-01 — the 공지사항 detail page's "중요한 안내사항" banner is gone

**Area:** `src/app/[mountain]/pages/announcements/[id]/page.tsx`.
**Type:** removal (owner-requested).

**What changed and why.** Every 공지사항 detail page ended with a fixed banner — a warning
triangle and the line `이 공지사항은 중요한 안내사항입니다. 내용을 숙지해 주세요.` The owner's
call: it **reads too official and doesn't match the site's tone** (해요체, friendly). The whole
banner went, not just the sentence: the text was its only content, so keeping the box would
have left a warning icon captioning nothing.

📌 **It was static, and that was the deeper problem.** The line was hard-coded markup appended
to _every_ announcement regardless of content, so a note about a cat being fed read as gravely
as a real advisory — and calling everything important is how nothing reads as important. There
is no per-post "중요" flag behind it and none was added; if one is ever wanted, it belongs on
the post, not on the page template.

**Verified:** in Chrome against production data — `/pages/announcements/<id>` now ends cleanly
after the media block. tsc 0, smoke 32/32, unit 121/121. No test or fixture referenced the
string (grepped `숙지` across `src/`, `tests/`, `scripts/`: no other occurrence).

⚠️ **Unrelated, pre-existing, and left alone:** that page logs a React **hydration mismatch** in
dev. Confirmed pre-existing by stashing this change and reloading — the error reappeared on
untouched code. Not investigated here; noted so the next person doesn't attribute it to this
removal.

---

## 2026-07-31 — a post's media shows its 제목/설명/태그, on every surface

**Area:** `media-albums.ts` (two new lookups), new `hooks/useMediaTags.ts`, `PostMedia.tsx`.
**Type:** feature enhancement (owner-requested).

**What changed and why.** The composers let an admin tag the cats in a post's photos and
videos, and those tags reach `cat_images.tags` and YouTube — but nothing displayed them, so a
reader of a 공지사항 or 입양홍보 post had no way to know who was in the picture. Each medium now
carries a `태그: 이름, 이름` line, matching the 사진첩 lightbox's existing wording rather than
inventing a second treatment.

**Below the media, not overlaid on it.** The owner preferred tags _on_ the image if possible.
Rejected because the images render `object-contain`: a photo is letterboxed inside its box, so
an overlay would frequently sit on blank space rather than on the picture. Below also matches
the album precedent the owner cited as the acceptable alternative.

🔑 **Resolved live from the media records, not copied onto the post.** A post stores only
`imageUrls` / `videoUrls` — bare URLs — while the tags live on `cat_images` / `cat_videos`. New
`getImageTagsByUrls()` / `getVideoTagsByYoutubeIds()` resolve URL → record. Stamping the tags
onto the post at creation would have been cheaper and was **deliberately not done**: tags keep
being edited in `/admin/tag-images` and `/admin/tag-videos`, so a copy would disagree with the
album from the first retag — the same failure mode the 2026-07-26 "the tagging surfaces own
this data" rule exists to prevent. The live lookup also means **posts created before this
shipped display their tags with no migration**, which is how the owner's existing post was
verified.

📌 **Details worth keeping:** both collections are `allow read: if true`, so this works for
anonymous visitors — required, since these are public pages. The `in` clause is chunked at 30
(Firestore's cap). A lookup failure is non-fatal and logged: the media still renders, untagged.
And no composite index is needed — `mountainId ==` plus an `in` is a disjunction of equalities
served by merging single-field indexes, with the sort done in memory; adding an `orderBy` would
change that, and the emulator would not warn you.

**Extended the same day, owner-reported: "the form has 제목/설명 fields but the post shows
none of them."** The per-file video 제목 and the 설명 typed for each file had the same problem as
the tags — written to the media record, never displayed — so the lookup now returns
`{ tags, title, description }` and each medium carries a caption block.

🐛 **And it surfaced a third hand-rolled media renderer.** `/pages/announcements/[id]` (the
detail page) had its own copy: no tags, no captions, and a `videoUrl` legacy branch. It now
uses `PostMedia` like everything else, which is why the owner's screenshot showed none of this
even after the tags shipped — they were looking at a page the shared component had never
reached.

⚠️ **One regression caught before commit, worth recording.** Adopting `PostMedia` on the detail
page also adopted the modal's image sizing (two columns, capped at 16rem), shrinking photos
that had been full-width. The component took a `layout` prop — `compact` for the modal and
feed, `full` for a dedicated page — rather than letting a shared component quietly downgrade a
surface it was newly applied to.

**Verified:** tsc 0 · smoke 32/32 · unit 121/121 · full e2e green for the affected specs
(161 passed with one unrelated known flake, `member/nav-permissions`, which passes on re-run).
The e2e fixtures give each medium a **different** tag on purpose — album-01 → test-cat-01,
album-02 → test-cat-03, yt-vid-01 → test-cat-01 — so a lookup returning one answer for
everything could not pass. Browser-verified against **production data**: the owner's 공지 post
shows `태그: 아들조로, 찰리` under its photo and `태그: 예쁜이` under its video, i.e. correctly
different per medium — and on the detail page, the photo's 설명 ("나도 좀…"), the video's 제목
and 설명, and both tag lines, with the photo back at full width.

---

## 2026-07-31 — 입양홍보 posts can pop up on a site visit, like 공지사항

**Area:** new `PostMedia.tsx`, `AnnouncementModal.tsx` → `PostModal.tsx`, new
`forms/ShowInModalToggle.tsx`, `AnnouncementModalContext`, `adoption-service.ts`,
`NewAdoptionForm`, `NewAnnouncementForm`, `AdminPostList`. **Type:** feature enhancement
(owner-requested).

**What changed and why.** 공지사항 had a 모달 팝업 설정 toggle that makes a post appear as a
popup on a visitor's first page view of the session; 입양홍보 had no equivalent, even though it
is the surface where a popup is most likely to be _wanted_ (an adoptable cat is time-sensitive
in a way an announcement usually is not). The toggle now exists on the 입양홍보 composer and on
the 게시물 관리 list, backed by `getModalPost()` / `toggleModalDisplay()` on the adoption
service.

🔑 **One popup per visit, most recently updated wins.** This is the existing behaviour
extended, not a new rule: the announcement service already picked the most recent when several
carried the flag, and the session key already capped it at one. Both kinds are now queried in
parallel and the newer of the two shows. Two popups stacking on one visit would be a different
and more intrusive product decision — worth revisiting only if the owner asks. The
`hasSeenAnnouncementModal` session key is deliberately **unchanged** so sessions already open
when this shipped are not shown a second popup.

**Three extractions rather than three copies**, because every one of these had a copy-and-drift
twin waiting to happen — the failure mode this codebase spent the whole complexity-retirement
track undoing:

- `PostMedia` — the "render the whole post's media" block, lifted out of `AnnouncementModal`.
  Now serves the 공지사항 popup, the 입양홍보 popup, and the 입양홍보 feed's expanded card,
  which is also what fixes the bug logged in `DEBUG_LOG.md` for the same day.
- `PostModal` — `AnnouncementModal` generalised over a `kind` ('announcement' | 'adoption'),
  which drives only the title bar. A second modal component would have been ~140 duplicated lines.
- `ShowInModalToggle` — the ~50 lines of switch markup, previously inline in
  `NewAnnouncementForm`. Both composers now render the same control, with only the
  descriptive sentence differing.

📌 **`AdminPostList`'s toggle had to become service-aware.** It called
`announcementService.toggleModalDisplay(postId, …)` unconditionally; pointed at an adoption
post that would have written to a non-existent document in the announcements collection and
still reported success, because `updateDoc` on a missing doc rejects but the alert sat past the
await. It now picks the service from `postType`.

📌 **No Firestore index needed, and that is deliberate.** `getModalPost` filters on
`mountainId` + `showInModal` — two equality clauses, which Firestore serves by merging
single-field indexes — and sorts **in memory**. Adding `orderBy('updatedAt')` would make it an
equality+orderBy query and demand a composite index; since the emulator auto-creates indexes
and never flags a missing one, and the method swallows errors to `null`, that would have
surfaced only as "the popup silently never appears in production".

**Verified:** tsc 0 · smoke 32/32 · unit 121/121 · full e2e **162 passed / 13 skipped / 0
failed**. Browser-verified: the toggle renders on the 입양홍보 composer with its own Korean
description, and the expanded feed card shows real production media.

---

## 2026-07-30 — the three composers converge: per-file media, cat tagging, no name collisions

**Area:** `MediaItemList.tsx`, new `CatTagSelectField.tsx`, `MediaUploadField.tsx` (deleted),
`uploadStrategies.ts`, `useSimpleContentForm.ts`, `useRichContentForm.ts`,
`api/generate-signed-url/route.ts`, `NewAnnouncementForm`, `NewAdoptionForm`,
`NewButlerTalkForm`. **Type:** feature enhancement (owner-directed, one session, four asks).

**1. Per-file media in 공지사항 / 입양홍보.** Both could already _pick_ several files — the
input carried `multiple` — but every video got the **same** YouTube title (the post title)
and photos had no description at all. Both now use the same `MediaItemList` as 집사톡: one
file per section, each with its own 제목 (video) and 설명.

🔄 **This reversed the queued PROJECT_PLAN §10d decision** (2026-07-29: "cap video upload at
one per post"), replaced by the owner before any of it was built. These two are admin-only,
so admins stay **unrestricted**; what they lacked was per-file upload, not a limit. A
**CMS-controlled** toggle for multiple upload is the remaining half and is **not started**
(§10d D2 — which also records that `mountains.json` cannot host it: static import,
redeploy-only, therefore not a CMS setting).

**2. Images changed pipeline — with a visible consequence.** A per-photo 설명 needs somewhere
to persist and the old path had none: `uploadImagesToStorage` uploaded to
`<prefix>/<Date.now()>_<name>` and wrote **nothing** to Firestore. Both forms moved to
`uploadImagesWithSignedUrls`, which records a **`cat_images`** entry — so 공지사항 / 입양홍보
photos now appear in the public 사진첩 and the admin tagging queue, where before they appeared
nowhere. Owner-chosen with that consequence stated.

**3. Cat selector on both forms.** The same `CatSelectorModal` 집사톡 uses, one for video and
one for images, appearing once there is media to tag — so those new `cat_images` records and
YouTube videos can be tagged at upload instead of only later in the queue. Empty stays empty:
`needsTagging` is the signal that a photo has never been tagged, and a default would erase it
(the 2026-07-29 rule). The read-only selector field was extracted to `CatTagSelectField` and
집사톡's two hand-rolled copies now use it — three composers × two media kinds would otherwise
have been six copies. ⚠️ Deliberately **not** merged with `admin/media/CatTagField`, which is
the tagging editor's free-text variant; a composer must not be a place where a cat name is
invented by typo, because the name is what the album and `[catmodal:이름]` match on.

**4. Filename collisions are prevented, not made unlikely.** The object path is the filename
verbatim (`uploads/<name>`), so two posts uploading `IMG_001.jpg` silently overwrote each
other. 🔑 **The owner asked whether checking the name against the collection would beat adding
timestamps — and was right to reject timestamps** (they only lower the odds). But the
**bucket** is the authority, not `cat_images`: the `cat_images` write is deliberately
non-fatal, 공지사항's old uploads recorded nothing, and the owner's separate `image_uploader`
script shares the bucket — an object can exist with no record, and a record can outlive its
object. So `generate-signed-url` now does a `file.exists()` check → **409** with an actionable
Korean message. ⚠️ This applies to 집사톡 too — same shared route, same latent bug.

🔁 **Corrected within the day.** This first _also_ signed the URL with
`x-goog-if-generation-match: 0`, so GCS would refuse an overwrite **atomically** and close the
check-then-PUT race. That header made the cross-origin PUT **preflighted**, the bucket's CORS
allow-list does not contain it, and the result was that **every image upload from every
deployed origin silently failed** — owner-reported within hours. The header is gone from both
ends and the residual race is documented as accepted in the route. Re-adding it is an ordered
two-step change: widen `cors_fbstorage.json`, apply with `npm run storage:cors`, _then_ ship
the code. Full chain: `log/DEBUG_LOG.md` 2026-07-30.

**5. URL pasting removed** (owner). Both forms briefly kept an "또는 URL 입력" list beside the
picker; it is gone, so these composers now only attach media they upload.

**Kept deliberately:** a video left without its own 설명 still inherits the post body in these
two forms (`비어 있으면 글 내용이 사용돼요.`). 집사톡's rule is the opposite — empty means
empty — so `MediaItemList` took a `descriptionHelp` override rather than teach the wrong thing
in one of them. Dropping the inheritance would have silently blanked the description on every
announcement video whose author didn't type one.

**Borders (owner-requested).** With several files stacked and a 동영상 list directly above a
사진 list, it was not obvious where one file's fields ended or which section a picker belonged
to — the ambiguity behind the 2026-07-29 "the picker won't select videos" false alarm.
`MediaItemList` is now a framed section (`border-2`) with a header bar + count badge, a
numbered badge per file, and a **dashed 2px rule between files**; the trailing picker is
tinted and ruled off so it reads as "add another".

**Consolidation that fell out of it.** `uploadVideosToYouTube(files, oneSharedMeta)` became
`uploadVideoItems(items, …)`, shared by both hooks — `useRichContentForm` had been hand-rolling
the same parallel loop including the fiddly `(Part n)` numbering that must count only the
_untitled_ videos. Written once, and unit-tested at strategy level for the first time.
🗑️ Deleted with no callers left: `MediaUploadField.tsx` (159 LOC), `uploadImagesToStorage`,
and the `imagePathPrefix` config field.

**Verified:** tsc 0 · smoke 32/32 · unit 121/121 · **full e2e 160 passed / 13 skipped / 0
failed**. Browser-verified on `/admin/announcements/new` and `/pages/butler_talk/new`: framed
sections, count badges, numbered files, the dashed rule, the per-form 설명 hint, 촬영 날짜 still
auto-parsing, the cat selector committing real names (개똥이, 꽃분이) with video/image
selections independent, and no URL fields left.

**Two e2e repairs this forced, both worth knowing:**

- **`posts.spec.ts` image legs are stubbed via `page.route()` — forced, not chosen.**
  `/api/generate-signed-url` signs locally with a service-account private key; the harness
  initializes the Admin SDK **credential-less** on purpose and the Storage emulator does not
  implement signing. Verified empirically by running with the stub disabled: `Could not load
the default credentials` → 500. No emulator configuration fixes it.
- **Upload fixtures must not reuse a seeded filename.** These specs now write real `cat_images`
  records, and `fileName` is what `/admin/tag-images` keys its grid cards on — uploading
  `album-01.jpg` put three cards with that alt on the page and broke that spec's strict-mode
  locator. The specs now generate unique names. Relatedly, `tag-images` no longer asserts an
  exact 전체 사진 count of 4: its "nothing creates/deletes images" premise is now false.

⚠️ **Suite stability note.** Baseline (`HEAD`, clean tree) ran **green twice**; with these
changes the suite reached green (160/13/0) but three earlier runs each lost **1–2 unrelated,
timing-sensitive specs** — the 동참 pair (`member/contact-submit` writes, `admin/members` reads
it) most often, plus `anonymous-gating` and `nav-permissions` once each. All pass when re-run,
and none touch media forms. The likely cause is simply +2 tests of parallel load on a suite
with marginal timeouts. Worth watching in CI; the 동참 pair is the fragile spot.

## 2026-07-29 — video uploads no longer invent tags nobody chose

**Area:** `useRichContentForm.ts`, `useSimpleContentForm.ts`, `NewAnnouncementForm`,
`NewAdoptionForm`. **Type:** small fix (owner-reported, then extended on the owner's call).

**What changed and why:** uploading a video from 집사톡 with no cat selected sent
`tags: '산고양이'` instead of nothing. The record then landed with
`needsTagging: tagsArray.length === 0` → **false**, so a video that had never been tagged
was excluded from the tagging queue that exists to find exactly those. A fallback that
fills a field also erases the signal that the field is empty. Now the selection is passed
through as-is; empty stays empty, and `needsTagging` becomes true.

📌 **Photos were already correct** — the 집사톡 image path passes `selectedImageTags`
straight through, no fallback. The suspicion that it did the same was worth checking, but
`산고양이` appeared exactly once in the codebase.

**The same rule then went to 공지사항 / 입양홍보 (owner, same day).** Those composers attached
a fixed `공지사항` / `입양홍보` tag to every video via `youtubeDefaults.tags` — a category
label rather than a fallback, but with the identical downstream effect: `needsTagging` false,
so **none of those videos ever reached the tagging queue** despite none of them carrying a cat
tag. The field is **removed from the config type**, not set to `''`: neither form offers the
uploader any tag input, so "empty unless specified" means always empty here, and a lingering
empty string would only invite someone to refill it. Every video from these composers now
lands in the queue — which is correct, since they all still need cat tags.

**Verified:** tsc 0 · smoke 32/32 · unit 119/119 (one test pins that an empty selection
reaches YouTube with no `snippet.tags`, so no default can creep back in downstream). The
composers have no unit coverage — vitest runs in a `node` environment with no React harness —
so this is guarded at the route boundary and by `tsc` on the removed field.

---

## 2026-07-29 — video uploads show a progress bar

**Area:** `src/components/forms/UploadProgressBar.tsx` (new), `uploadStrategies.ts`,
both form hooks, 공지사항 / 입양홍보 / 집사톡. **Type:** enhancement (owner-requested).

**What changed and why:** the composers now show one progress bar per submit while video
bytes upload. Until the same day's upload fix (`DEBUG_LOG.md`) nothing over 4.5 MB could
be uploaded at all, so "disable the submit button" was adequate feedback. With the
resumable direct-to-Google upload there is no practical size limit, so a submit can
legitimately run for minutes — long enough to read as frozen.

- **One bar per submit, not per file.** `createUploadProgressTracker` sums each file's
  latest byte count against the batch total. Per-file tracking is required because the
  uploads run in **parallel**: a running total would count every progress event on top
  of the last and race past 100%.
- **`XMLHttpRequest` for the byte leg, deliberately.** `fetch` cannot report _request_
  upload progress — streaming request bodies are Chrome-only and need HTTP/2 plus
  `duplex: 'half'`, while `xhr.upload.onprogress` works everywhere. Only the leg that
  carries bytes uses XHR; both API legs stay on `fetch`.
- **100% is not "done"**, so the copy changes at 100% (`YouTube에서 처리 중이에요...`):
  YouTube still processes the video and `/complete` still has to file and record it. A
  full bar with the form still busy would otherwise read as stuck.
- The bar reports the full byte count on completion, because the last progress event can
  arrive before the request finishes and would leave the bar short.

**Verified:** tsc 0 · smoke 32/32 · unit 111/111 (+5, incl. the parallel-aggregation case
that would catch a running-total regression) · `next build` clean. Browser-checked on
`/pages/butler_talk/new`: the composer renders unchanged when idle (the bar returns
`null`), and the bar's markup renders correctly at 0 / 37 / 100% with `bg-primary`
resolving to geyang's `#FACC15` via the M8 CSS variable. ⏳ **Not yet seen driven by a
real upload** — that needs credentials on Preview, and comes with the P5.4 pass.

---

## 2026-07-28 — admin CMS idle timeout raised from 2 hours to 24

**Area:** `src/components/admin/AdminAuth.tsx`. **Type:** small change (owner's call).

**What changed and why:** `ADMIN_IDLE_TIMEOUT_MS` 2h → **24h**. Two hours was short
enough to interrupt real operator sessions — a CMS tab left over lunch or overnight
was signed out — for a single-operator site where the walk-away risk the timeout
guards is low. It remains an **idle** window, not an absolute one, so an active
session still never expires under anyone.

⚠️ **The duration is written in two places** and they must move together: the constant
(`AdminAuth.tsx:21`) and the Korean expiry notice on the admin login screen
(`AdminAuth.tsx:209`), which hardcodes it — "24시간 동안 활동이 없어 자동으로
로그아웃되었어요." Changing the constant alone leaves the notice lying to the operator.
No test pins that copy, so nothing fails if they drift.

📌 Still global, not per-mountain: the constant applies to `/admin` on every tenant, and
does not affect member sessions. Making it per-tenant would mean moving it into
`mountains.json`. Supersedes the 2-hour value recorded in the original session-timeout
entry below (kept as history).

**Verified:** tsc 0, smoke 31/31, unit 102/102. The timing itself is not
machine-verified — a 24h idle window isn't practical to exercise in a test, and the
hook it drives (`useIdleTimeout`) is unchanged.

---

## 2026-07-28 — 내 집사 정보 offers a 관리자 shortcut to members who have CMS access

**Area:** `src/app/[mountain]/mypage/page.tsx`, `src/constants/strings.ts`,
`tests/e2e/member/mypage.spec.ts`.

**What changed and why:** `/mypage` gained a **관리자** section with a
**관리자 페이지로 가기** link to `/admin`, rendered only for members who hold admin
access **on the active mountain**. Before this, the CMS had no entry point from the
member surface at all — an admin had to know the URL and type it.

**The gate reuses `isAdmin(user, mountainId)` from `@/lib/auth/admin`** — the very
function `AdminAuth` runs — rather than re-deriving a permission list. That is the
whole design of this change: a second, hand-written list of "admin-ish" permissions
would be free to drift from the gate, and the two failure modes it produces are both
bad (a link that dead-ends in 접근 권한이 없어요, or a hidden link for someone who
does have access). The mountain comes from `useMountain()`, so a dual-mountain admin
is offered it only on the mountain they hold a role on.

⚠️ **`isAdmin` re-raises** when the permission read fails (blocked extension / offline
/ denied) — "couldn't verify" is not "not an admin". Here the catch **logs and leaves
the link hidden**, deliberately: this is a shortcut, not the gate, and offering an
entry point we couldn't verify is worse than omitting one. `/admin` remains reachable
directly and carries its own 다시 시도 UI for exactly that state.

**Verified:** browser pass against the seeded emulator, both roles — `admin@test.local`
sees the section and the link lands on the CMS shell; `member@test.local`
(butler-ground) does not see it, page otherwise unchanged. New e2e guard in
`tests/e2e/member/mypage.spec.ts` pins both directions (the admin case overrides
`storageState`, matching `admin-auth-gate.spec.ts`), so the link and the gate can't
drift apart silently. Gates: tsc 0, smoke 31/31, unit 102/102, `member/mypage.spec.ts`
6/6.

📌 Noted, not fixed: `/mypage` logs a React hydration mismatch in dev. Confirmed
**pre-existing** by A/B-ing this change out — it is absent on untouched pages, so it
belongs to mypage's own auth-dependent render, not to this section.

---

## 2026-07-27 — 집사게시판 stops composing media; 집사톡 becomes the media composer; playlists go per-mountain

**Area:** `src/components/NewPostForm.tsx`, `NewButlerTalkForm.tsx`, `NewAdoptionForm.tsx`,
`src/components/forms/` (new `MediaItemList.tsx`; `useRichContentForm`,
`useSimpleContentForm`, `uploadStrategies`), `src/utils/config.ts`,
`config/mountains/mountains.json`, `src/app/api/upload-youtube/route.ts`. Plan:
[`butler-media-separation-plan-20260727.md`](../docs/planning/butler-media-separation-plan-20260727.md).
Four commits: `0f9190f` → `c2fc78f` → `bd7ce23` → `97b72ed`.

**What changed and why:**

1. **집사게시판 lost media upload entirely** (owner call). It was doing two jobs — a 급식소
   check-in log _and_ a second media composer — and the second was already done properly by
   집사톡. Removing it rather than improving it twice. **Compose-time only:** legacy posts
   keep rendering through `PostList`, and admins keep URL-based media editing in
   `EditPostForm`. The form dropped `useRichContentForm` for a plain submit handler.
2. **집사톡 got one-file-per-section with per-file 제목/설명.** A single `multiple` picker
   forced one title and one description onto the whole selection, which only works when every
   file is about the same thing. Videos get a 제목, photos don't — YouTube owns a real title,
   while `CatImage` has only `fileName` and `description`, and `description` is what the album
   caption and lightbox show. A photo title would be write-only data.
3. **Empty now means empty.** `upload-youtube` no longer substitutes
   `'Uploaded via Mountain Cats app'`, and each photo carries its own caption instead of
   inheriting the post body. ⚠️ Behavior change: an empty photo 설명 saves empty, where every
   photo in a post used to get the same text.
4. **취소 on both composers**, confirming only when something would be lost (picked files
   count as content).
5. **Video filing became config-driven and per-mountain.** It used to match the playlist
   _titled_ `집사게시판`, so a rename on YouTube stopped filing silently, and with one shared
   channel every mountain filed into the same list. Now `social.youtubePlaylistId` per
   mountain, plus a `_shared` platform block for the one cross-mountain 입양홍보 playlist —
   `_` prefixed because `getAllMountains()` already filters those as non-tenant entries. An
   입양홍보 video joins **both** playlists, so "mountain playlist = what that mountain owns"
   stays true for the deferred `syncVideos` fix. 공지사항 gained its mountain playlist too; it
   filed into nothing before.

**Removed as a consequence:** `youtubeDescriptionDefault` and `createdTimeInputType` config
knobs, `formatDateTimeForInput`, and `multiPartVideoTitles` — ⚠️ that last one was `false` for
집사톡, so several untitled videos would have uploaded with identical titles; fallback
numbering is now unconditional and applies **only** to videos left untitled.

📌 **Found while doing this, not caused by it:** `/api/youtube-playlists` now has **no caller
at all** (`/admin/tag-videos` uses `/api/manage-playlists`). Left in place pending the same
`git log -S` history check that retired `generate-youtube-signed-url`.

**Verified:** tsc 0, smoke 31/31, unit 102/102, **full e2e 153 passed / 13 skipped / 0
failed**, plus browser passes on both rebuilt composers. New e2e guards the boundary — the
집사게시판 spec fails if a file input ever reappears there. ⚠️ The YouTube-side behavior
(actual playlist filing, empty descriptions) is **Preview-verified only**: the emulator has no
credentials.

---

## 2026-07-26 — Removed: the `YOUTUBE_REFRESH_TOKEN` env var and the command-line token workflow

**Area:** removed — `scripts/auth/` (both scripts), the `YOUTUBE_REFRESH_TOKEN` entry in
`.env.example`, the env branch in `getYouTubeOAuthCredentials()`, and the status route's
second "environment" token row. Changed — `src/components/admin/YouTubeAuthPanelNew.tsx`
(shows the stored token's real issue date instead of the env token's placeholder),
`scripts/README.md`.

**What changed:** the YouTube refresh token now lives in exactly one place — Firestore
`admin_config/youtube_auth`, written by the admin panel's 「토큰 갱신」 button. The env var is gone, along
with `generate_youtube_refresh_token.js` / `refresh_youtube_token.js`, the command-line
"generate a token, paste it into `.env`, redeploy" workflow the admin panel replaced (the
generator script already pointed at the GUI in its own header).

**Rationale:** this rides on the same-day credential fix (`DEBUG_LOG.md` 2026-07-26), which
first kept env as a _fallback_ behind Firestore. The owner opted to remove it outright, and
that's the better line: a fallback preserves the exact failure that was just fixed for the
case where the Firestore doc goes missing — routes would quietly resume on a stale token —
while adding no capability, since obtaining a token needs only the client id/secret. The
recovery from "no token anywhere" is the same button as every other token problem. What
remains in env is client identity (`YOUTUBE_CLIENT_ID`/`_SECRET`/`_REDIRECT_URI`), which
identifies the OAuth app and effectively never rotates.

⚠️ **Sequencing:** production runs `main`, which is pre-fix and reads the token from env only.
`YOUTUBE_REFRESH_TOKEN` must stay set in Vercel **Production** until this promotes, or YouTube
stops working there. Preview can be cleared immediately — and clearing it makes the P5.4 manual
pass strictly stronger, since with nothing to fall back to, a working video edit proves the
Firestore path end to end.

**Verified:** tsc 0, smoke 30/30, unit 80/80 (the suite now asserts a leftover
`YOUTUBE_REFRESH_TOKEN` is ignored), full e2e 146/13/0.

---

## 2026-07-26 — Decision: one shared YouTube channel for all mountains (per-mountain channels rejected)

**Area:** changed — `config/mountains/mountains.json` (`manisan.social.youtubeChannelId` →
geyang's channel); documented in `docs/handoff/HANDOFF.md` (Open threads).

**What changed:** the platform commits to a **single YouTube channel serving every mountain**.
Per-mountain attribution comes from `cat_videos.mountainId` — already stamped on every upload by
`/api/upload-youtube` — rather than from channel ownership. No code change was needed: there has
only ever been one OAuth credential, and per-tenant channels existed solely as a config field
that was never populated for a second tenant.

**Rationale:** the original intent behind separate channels was to attribute videos to each
mountain's owner so they could be paid for their own mountain's content. Tracking by mountain
achieves the same attribution without the cost. Against separate channels: (a) YouTube's
monetization thresholds (1,000 subscribers + 4,000 public watch hours) apply **per channel**, so
a new mountain's channel would earn nothing for a long time while a pooled channel earns from day
one; (b) N channels means N OAuth clients and N independently expiring refresh tokens — the exact
failure mode fixed the same day (`DEBUG_LOG.md` 2026-07-26), multiplied. Accepted trade-off:
revenue lands in one AdSense account, so payouts to another mountain's owner are manual and
trust-based; making the split auditable on YouTube (per-mountain playlist or a title/description
convention) is the mitigation to design alongside a real mountain #2.

**Consequence logged, not fixed:** `syncVideos()` (`src/services/media-albums.ts`) imports every
video on the configured channel as belonging to whichever mountain ran the sync — harmless while
`manisan` is a `hidden`, data-less stub, but a **prerequisite to fix before provisioning a real
mountain #2**. Recorded as an open thread rather than fixed here: no live impact, and the right
scoping mechanism is a product decision bound up with the attribution convention above.

**Verified:** config-only; tsc 0, smoke 30/30, unit 80/80, full e2e green (the suite exercises
both tenants and is indifferent to the channel value — no test reaches YouTube).

---

## 2026-07-26 — Analytics: `mountain_id` becomes a GA4 default parameter (all events, not just `page_view`)

**Area:** changed — `src/components/AnalyticsTracker.tsx`;
`docs/manuals/admin-manual/google_analytics.md` (substantially expanded).

**What shipped:** `AnalyticsTracker` now calls `gtag('set', { mountain_id })` before emitting
its `page_view`. M7 attached `mountain_id` **per-event**, which covered only the one event the
app sends itself; GA4's automatic **Enhanced-measurement** events (scroll, outbound click, file
download, video engagement, form interaction) are emitted by gtag with no call site to pass
parameters at, so they arrived with **no tenant dimension**. `set` registers it as a default
parameter inherited by every subsequent event. It is still also passed explicitly on the
`page_view`, so that event stays self-describing.

**Rationale:** the gap became live when the owner enabled Enhanced measurement on the GA4 web
stream (2026-07-26) — until then `page_view` was the only event, so per-event was sufficient.

**Known limit (documented, not a bug):** only events sent _after_ hydration inherit the
default; `mountain_id` isn't knowable in the root layout, which sits above `MountainProvider`.
Automatic events require user interaction, so in practice they land after hydration.

**Verified:** tsc 0, unit 71/71, smoke 30/30 (no automated coverage exists for this component —
there are no gtag/AnalyticsTracker tests; the real check is GA4 DebugView after promotion).

**Doc:** `google_analytics.md` gained a ⚠️ **A0** step, an **A2** Enhanced-measurement step, and
Firebase-ID reuse guidance — see the GA4 open thread in the hand-off for the console state.

⚠️ **Sequencing trap recorded in A0:** production (`main`) is **pre-M7** — it still runs
`getAnalytics(app)` driven by `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`, and reads
`NEXT_PUBLIC_GA_MEASUREMENT_ID` nowhere. On such a build, setting the new var does nothing and
deleting the old one **turns analytics off**. Keep both until M7 is promoted and verified.

## 2026-07-26 — Auth gate on the 7 ungated media / credential API routes (one deleted)

**Area:** changed — `src/app/api/{generate-signed-url,upload-youtube,update-youtube-video,
refresh-video-metadata,manage-playlists,youtube-playlists}/route.ts`,
`src/components/forms/{uploadStrategies.ts,useRichContentForm.ts,useSimpleContentForm.ts}`,
`src/app/[mountain]/admin/tag-videos/{page.tsx,useYouTubeVideoMutations.ts}`.
Removed — `src/app/api/generate-youtube-signed-url/route.ts`.
Added — `tests/e2e/api/media-route-authz.spec.ts`.

**What shipped:** these seven routes had **no auth gate at all** — any unauthenticated
caller could mint 15-minute Firebase Storage _write_ URLs, upload to the shared YouTube
channel on the operator's OAuth credential, and write `cat_videos` through the Admin SDK
(which bypasses `firestore.rules`). Six now open with `requireApiPermission`, and every
in-app caller sends `Authorization: Bearer <idToken>` via the existing `authHeader(user)`
helper. The seventh — **`generate-youtube-signed-url` — was deleted as dead code** rather
than gated (see below).

**Permission choice — mirror the rule that already guards the resource:**
`generate-signed-url` → **`manage-photo`** (its uploads are recorded as `cat_images`,
which `firestore.rules` gates on `manage-photo`); all six YouTube routes →
**`manage-video`** (mirrors the `cat_videos` rule). This deliberately makes each route
exactly as permissive as the write it enables, so **nobody who can successfully complete
these flows today loses access**: the post/image writes they end in already require
`manage-posts`/`manage-photo` at the rules layer.

**Rationale:** surfaced by the M5.3 route audit (2026-07-23) as a **pre-existing gap,
orthogonal to multi-tenancy** — the routes predate the refactor — and logged as an open
thread at the time (owner chose log-not-fix then). This is that hardening pass.

**Client threading:** `uploadStrategies.ts` takes the signed-in `user` as an injected
option (type-only `firebase/auth` import, matching `lib/auth/authHeader.ts`) rather than
reaching into the auth SDK — the module stays a plain strategy with no Firebase coupling.
`useRichContentForm`/`useSimpleContentForm` pass `user` through; the tag-videos page and
`useYouTubeVideoMutations` route their 10 fetch sites through one `jsonAuthHeaders()`
helper.

**Verified:** new `tests/e2e/api/media-route-authz.spec.ts` (21 tests, pure HTTP) pins all
7 method/route pairs three ways — 401 unauthenticated, 403 for a seeded butler holding
neither permission, and past-the-gate for the seeded admin. Gates: tsc 0, smoke 30/30,
unit 71/71, **full e2e 146/13/0** (125 pre-existing all still green).

⚠️ **Non-obvious, pinned in the spec:** status alone can't tell a gate rejection from a
downstream failure — with no YouTube OAuth credentials (the emulator, and any
unauthorized deploy), `update-youtube-video` answers an `invalid_grant` with **its own
401** ("YouTube authentication failed…"). The spec's admin case therefore asserts on the
gate's error _messages_ ('Authentication required' / 'Invalid token' / 'Insufficient
permissions'), not on the status code. A first draft keyed on status and failed for
exactly this reason.

**`generate-youtube-signed-url` DELETED, not gated (owner-approved).** It had **no caller
anywhere** in `src/`, `tests/`, or `scripts/`, and `git log -S` over all history showed
every reference outside its own folder was **documentation** — it has had no code caller
since the commit that created it (`b901359`, the pages-router → app-router conversion),
superseded by `upload-youtube`. It also read `process.env.YOUTUBE_*` directly rather than
going through `getYouTubeOAuthConfig()`, so it would have drifted from the Firestore
refresh-token fallback the live upload path uses. **No env var is orphaned** — the same
four vars are read by `getYouTubeOAuthConfig()` in `src/utils/config.ts`. Verified by
re-running the full suite after removal.

**One adjacent finding left as-is (owner's call, 2026-07-26):** the butler post pages
(`/pages/butler_{stream,talk}/new`) gate only on `isAuthenticated`; their writes already
fail at the `posts_butler` rule without `manage-posts`, so nothing leaks, but a signed-in
user without it only discovers this on submit. Accepted.

## 2026-07-25 — Multi-mountain M8: per-tenant theming (minimal — primary color only)

**Area:** changed — `tailwind.config.js`, `src/app/globals.css`,
`src/app/[mountain]/layout.tsx`, `src/components/ui/Button.tsx`,
`src/components/Navigation.tsx`, `src/components/LeafletMountainMap.tsx`,
`src/app/[mountain]/pages/adoption/page.tsx`, `src/app/[mountain]/pages/faq/page.tsx`,
`config/mountains/mountains.json`.

**What shipped:** `config.theme` is now **live** (it was typed but read nowhere). A new
`primary` tailwind token resolves to a `--color-primary` CSS variable — default `#FACC15`
in `globals.css` (== geyang's shipped `brand.DEFAULT`). The `[mountain]` layout injects
`:root{--color-primary:<tenant primaryColor>}` per request (hex-validated, throws on a
malformed value; set on `:root` so it also covers modals that portal to `document.body`).
The signature `from-brand to-accent` CTA gradient was repointed to `from-primary` on the
**public** brand surfaces: shared `ui/Button` (primary variant), the header 입양홍보 CTA
(`Navigation`), the Leaflet cluster-count marker, and the adoption + faq page CTAs.

**Rationale (multi-mountain plan M8; PROJECT_PLAN §9):** make per-tenant theming real so a
second mountain isn't hard-locked to geyang yellow. **Scope was owner-chosen: "primary
color only" (minimal)** over the "full brand ramp via CSS vars" option — lower risk on
live geyang (`brand` is used 261×), themes the design-sanctioned CTA surface, and leaves
the ramp static. geyang's `theme.primaryColor` was **stale** (`#ffbc00` ≠ the shipped
`#FACC15`); reconciled to `#FACC15` so honoring "geyang = zero visual change" holds.

**Verified in-browser** (dev, `/` vs `/manisan`): geyang's CTA computes gradient-from
`#FACC15` (pixel-identical to today); manisan's computes `#0ea5e9` (sky-blue) — proving
differentiation. Gates: tsc 0, smoke 30/30, unit 71/71, **full e2e 125/13/0** (no
regression).

**Deliberately partial** (documented so it isn't mistaken for a bug): the `brand` 10-stop
ramp and the **admin-only** `from-brand` CTAs (content-form submit buttons, the `IntroCard`
badge) stay static — on a real second mountain those would still read yellow until a fuller
token-migration pass. That pass is out of scope for the minimal M8 theming.

## 2026-07-25 — Multi-mountain M7: analytics decoupled from Firebase → gtag.js + `mountain_id`

**Area:** changed — `src/components/AnalyticsTracker.tsx`, `src/app/layout.tsx`,
`src/services/firebase.ts`, `src/utils/config.ts`.

**What shipped:** analytics no longer runs through the Firebase SDK. A single shared
**GA4** property now loads via `gtag.js` — a `next/script` `<Script>` in the **root**
layout, gated on `NEXT_PUBLIC_GA_MEASUREMENT_ID` and configured with
`send_page_view: false`. `AnalyticsTracker` sends every `page_view` itself, on route
change, carrying `mountain_id` from `useMountain()` — so the shared property can be
segmented per tenant. `services/firebase.ts` drops the `getAnalytics` import, the
browser-only `analytics` init guard, and the `analytics` export (only `AnalyticsTracker`
consumed it); the now-dead `measurementId` was removed from `getFirebaseConfig`.

**Rationale (multi-mountain plan M7 §2.7):** decouple measurement from the single
Firebase app so a **future** per-mountain GA4 property is a config change
(`gtag('config', 'G-OTHER')`), not a rewrite — `firebase/analytics` welds measurement to
the app's one id. Doing it now, while geyang is the only analytics consumer, is cheap; it
also drops the `typeof window && !USE_EMULATORS` guard that existed only because
`getAnalytics` throws server-side / without a `measurementId`. `send_page_view: false`
additionally removes a pre-existing double-count (the SDK's auto page_view, which never
carried `mountain_id`).

**Behavior when unconfigured:** unset `NEXT_PUBLIC_GA_MEASUREMENT_ID` (local dev /
emulator / e2e / Preview-without-it) → the snippet isn't rendered, `window.gtag` is
undefined, `AnalyticsTracker` no-ops — identical to the old "analytics = null" path. No
analytics in e2e, as before.

**Owner-owed (🔑, not code):** register the GA4 property + `mountain_id` **custom
dimension** in the GA4 console **before any tenant-2 traffic** (GA4 never backfills
dimensions), and add `NEXT_PUBLIC_GA_MEASUREMENT_ID` (the `G-XXXX` id) to Vercel
**Production + Preview**. The old `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` is now unused and
can be removed.

**Verified:** tsc 0, smoke 30/30, unit 71/71, **full e2e 125 passed / 13 skipped / 0
failed** (no regression vs the M6 baseline). The dead `analytics` **rules** block was
already removed in M5.2 — only the retained `view-analytics` permission remains.

## 2026-07-25 — Multi-mountain M6: per-tenant upload namespacing (scope corrected mid-flight)

**Area:** changed — `src/components/forms/uploadStrategies.ts` +
`useSimpleContentForm.ts`, `src/app/api/generate-signed-url/route.ts` (+ a `uploadStrategies`
unit test). Also **docs** — corrected image-storage strategy across
`docs/codebase/media-and-youtube.md`, `deployment-and-build.md`, the admin/provisioning
manuals, and the archived `IMAGE_STORAGE_EXPLAINED`.

**What shipped:** image uploads now prepend the active tenant's `storagePrefix` —
`uploadImagesToStorage(files, pathPrefix, storagePrefix='')` (threaded via `useMountain()` +
`getMountainConfig()` in `useSimpleContentForm`) and the `generate-signed-url` route
(resolves the tenant per-request via `getRequestMountainId`, prefixes the object path + the
returned `publicUrl`). So a **new** mountain's album/signed-URL uploads land under
`mountains/<id>/…` and their Storage URLs are naturally isolated. Geyang's prefix is `''` →
exact no-op. `generate-youtube-signed-url` is a no-op (YouTube, no Storage path);
`storage-service.ts` stays tenant-free.

**Scope correction (the important part):** M6 was first built to also **namespace baked
thumbnails** (`public/images/thumbnails/{mountainId}/`) + migrate `cats.thumbnailUrl`.
Inspecting prod data killed that: cat thumbnails **and** album photos are served from live
Firebase **Storage URLs** (not baked local paths), so they're already tenant-scoped by the
object path — the dry-run migration found **0** changes (all 32 cats `not-baked`). The
baked-thumbnail namespacing, its migration script, the e2e-fixture edits, and the cutover
runbook were **reverted/deleted**; only the upload-prefix wiring remains. (The cat-thumbnail
baking in `fetch-static-assets.js` is legacy/dead-in-prod — used only by e2e fixtures.)

**Rationale:** the real multi-tenant gap for images is upload placement, not thumbnail
paths. Documented the whole baked-vs-Storage-URL model in
`media-and-youtube.md → Image storage & serving strategy` so this isn't re-derived.

**Verified:** tsc 0, unit green (+2 `storagePrefix` path tests), smoke 30/30, full e2e
125/13/0. **No prod migration or cutover** — the wiring is a no-op for geyang and only
affects a future tenant's uploads.

---

## 2026-07-23 — CI: emulator-backed `rules` job (mountain-aware Firestore rules now gated)

**Area:** changed — `.github/workflows/ci.yml` (added a `rules` job).

**What changed:** a dedicated CI job that runs `npm run test:rules` (the 11
mountain-aware Firestore security-rules tests) on the Firebase emulator — checkout →
setup-node → setup-java 21 → `npm ci` → Firebase-emulator cache → `npm run test:rules`,
gated `needs: checks`, running in parallel with the `e2e` job. No Playwright/browser
install (rules tests need only the Firestore emulator), so it's much lighter than `e2e`.

**Rationale:** the default `npm test` (CI's `checks` job) **excludes `tests/rules/**`**
(they require the emulator; kept out of the emulator-less run via
`vitest.rules.config.ts`), so a mountain-aware rules regression would have passed CI.
This was the one real CI gap for M5 — the M5.4 two-tenant isolation e2e needed no
wiring, since the existing `e2e`job's`npm run test:e2e`already globs all of`tests/e2e/\*\*`.

**Verified:** `ci.yml` parses as valid YAML with three jobs (`checks` → `rules` +
`e2e`); the `rules` job's step list and `needs: checks` gate confirmed. (The
`test:rules` suite itself is green at 11/11 from M5.2.)

---

## 2026-07-23 — Multi-mountain M5.4b: two-tenant isolation e2e (M5 code-complete)

**Area:** added — `tests/e2e/api/tenant-isolation.spec.ts`,
`tests/e2e/public/tenant-isolation.spec.ts`.

**What changed:** the two-tenant (geyang / manisan) isolation e2e — the enforcement
proof that closes M5. Split by layer. The **api** spec (pure Playwright request, no
browser) targets a tenant by overriding the request **Host** header (`/api/*` is
excluded from the host-rewrite middleware, so `getRequestMountainId` reads Host) and
asserts: (a/d) `GET /api/admin/cats` + `/api/points` return **only** the Host
mountain's seeded docs; (b) a **single-mountain** admin gets **403** on the other
mountain's gated route and **200** on its own (asserted both ways — a manisan-only and
a geyang-only admin); (c) the **dual** admin is **200** on both. Tokens are minted
from the Auth-emulator REST endpoint (the `api/security.spec` pattern). The **public**
spec asserts rendered-content isolation — the photo album and 공지사항 show only the
active tenant's content, geyang at `/pages/…` and manisan at `/manisan/pages/…` (the
path prefix passes through the middleware) — on desktop + mobile, using each tenant's
_exclusive_ text markers so the absence checks can't false-pass on a substring.

**Rationale:** M5's central risk is leak-by-omission (a missed tenant scope). The M5.3
route audit proved it by inspection; this spec proves it by execution and — unlike the
audit — is a **permanent regression net**. The `contacts` PII read-isolation is a
client-SDK + firestore.rules concern already covered by `tests/rules/users.rules.test.ts`,
so it is referenced rather than duplicated.

**Verified:** tsc clean; **full e2e 125 passed / 13 skipped / 0 failed** (was 116 → +9:
5 api + 4 public across the desktop and mobile projects). Confirmed en route that
Playwright's request context honors an overridden `Host` header (the mechanism the api
spec depends on). Remaining on M5 (both owner-gated, not code): the ORDER-CRITICAL
rules/index prod deploy (see `docs/manuals/deployment/m5-prod-cutover-runbook.md`) and
wiring `npm run test:rules` into CI.

---

## 2026-07-23 — Multi-mountain M5.4a: second stub tenant (`manisan`) + `hidden` config flag

**Area:** changed — `src/utils/config.ts` (added `MountainConfig.hidden` +
`getPublicMountains()`), `src/components/MountainSelector.tsx` (uses
`getPublicMountains()`), `config/mountains/mountains.json` (added `manisan`),
`scripts/test/seed-emulators.mjs` (two-tenant seed). Added —
`tests/e2e/fixtures/manisan.json`.

**What changed:** added `manisan` as a second, **preparatory stub tenant**. It is a
real routable tenant (`/manisan` resolves, `generateStaticParams` prerenders it) but
carries a new **`hidden: true`** config flag that keeps it out of the visitor-facing
`MountainSelector` — routing/`generateStaticParams`/`resolveMountainIdOrNull` keep
using `getAllMountains()`, while the selector switched to the new
`getPublicMountains()` (which filters `hidden`). The stub has distinct branding
(마니산, blue/teal theme), `storagePrefix: 'mountains/manisan/'`, and reuses geyang's
map imagery. The emulator seed was refactored so `withTenant`/`seedCollection`/
`seedDoc` take an explicit `mountainId` (the geyang pass is unchanged) plus a new
`seedManisanTenant()` pass from `manisan.json` (distinct content + a manisan-only
admin and a dual-mountain admin); `seedAuthAndUsers` now builds per-user `roles` maps
from either a single `role` or an explicit `roles[]` list.

**Rationale:** the M5.4 two-tenant isolation e2e (and the eventual M8 "geyang as one
of many") need a second tenant to exist in config + seed before the spec can assert
cross-tenant invisibility and per-mountain admin scoping. Adding it as `hidden`
avoids exposing an empty stub to real visitors in the production mountain selector
while still making it fully testable. Also resolves a pre-existing drift — `manisan`
was already listed in `config/permissions.json` but not in `mountains.json`.

**Verified:** tsc / smoke 30 / unit 39 green; **full e2e 116 passed / 13 skipped / 0
failed** — the geyang suite is unperturbed by the second seeded tenant, and the build
prerenders both `/geyang` and `/manisan` route trees. The isolation **spec** that
consumes this stub (M5.4b) and wiring `test:rules` into CI are separate follow-ups.

---

## 2026-07-23 — Multi-mountain M5.3 route audit: Admin-SDK routes verified tenant-safe; prod-cutover order corrected

**Area:** docs / verification only — no code change. Reviewed all 21
`src/app/api/**` routes. Docs — `docs/planning/multi-mountain-refactor-plan-20260719.md`
(M5.3 checked off with the per-route verdict), `docs/handoff/HANDOFF.md`,
`docs/planning/PROJECT_PLAN.md`. Added —
`docs/manuals/deployment/m5-prod-cutover-runbook.md` (+ a pointer in the deployment
README). Commit `ceda81c`.

**What changed:** completed M5.3's remaining item — the systematic audit of every
Admin-SDK API route's Firestore access against the tenant model. **Verdict: no
leak-by-omission.** Content routes are tenant-scoped (`/api/admin/cats`,
`/api/points`, `/api/contact`, `/api/admin/assign-role`, `/api/upload-youtube`'s
video record — all via the per-tenant service factory or an explicit `mountainId`
stamp); identity / central-config routes (`users`, the `role_permissions/*` matrix)
are global **by design** (only role _assignment_ is per-tenant, via
`roles[mountainId]`). The only residual cross-tenant surface is the **shared YouTube
channel** — non-Firestore, already deferred (M5.1 note b: `getYouTubeChannelId` is
per-tenant config but the OAuth credential / `admin_config/youtube_auth` is shared).
The audit also **surfaced two things**: (1) a pre-existing, tenancy-orthogonal
auth gap — 7 write/credential routes with no `requireApiPermission` gate
(`manage-playlists`, `refresh-video-metadata`, `update-youtube-video`,
`upload-youtube`, `youtube-playlists`, `generate-signed-url`,
`generate-youtube-signed-url`) — logged as an owner-owed thread, not fixed here;
(2) a **correction to the prod-cutover order** — the prior "migrate → deploy rules"
sequence would black out the CMS, because the M5.2b rules deny any `mountainId`-less
write and the stamping code (M4) is only on `dev`, so the `dev → main` promotion must
land **between** the migration and the rules deploy (and indexes must build before the
app goes live). Captured as a 6-step runbook with per-step rollback.

**Rationale:** M5's whole risk is "leak-by-omission" (a missed tenant scope). A
route-by-route audit is the enforcement-side proof that complements the coming M5.4
two-tenant isolation e2e; recording the verdict means a future reader doesn't
re-derive it. The cutover-order fix prevents a real prod outage.

**Verified:** manual source review of each route handler against
`firebase-read-access-inventory.md` + the mountain-aware `firestore.rules`
(`canWrite`/`hasPermissionFor`). No test run (docs/verification only); the commit
passed the repo gates (TruffleHog, prettier, `tsc --noEmit`). Owner-owed follow-ups
recorded in HANDOFF: the ungated-routes hardening pass, and the order-corrected prod
cutover.

---

## 2026-07-19 — Complexity retirement executed (P0–P6): forms + admin editors on shared primitives; alerts → Modal dialogs

**Area:** changed — `src/components/NewPostForm.tsx` / `NewButlerTalkForm.tsx` /
`NewAnnouncementForm.tsx` / `NewAdoptionForm.tsx`,
`src/app/admin/tag-images/page.tsx`, `src/app/admin/tag-videos/page.tsx`.
Added — `src/components/forms/` (`MediaUploadField`, `uploadStrategies`,
`useSimpleContentForm`, `useRichContentForm`), `src/components/admin/media/`
(media toolkit), `src/app/admin/tag-videos/useYouTubeVideoMutations.ts`,
`src/components/ui/useDialog.tsx`; `parseCreatedDateFromFilename` →
`@/utils/dateParser`. Removed — `react-hook-form` (unused declared dep).
Tests — P0 characterization e2e net (`admin/posts.spec`, `butler-create.spec`,
`tag-images.spec`, `tag-videos.spec`) + `tests/unit/uploadStrategies.test.ts`.

**What changed:** executed the full complexity-retirement plan
(`docs/planning/complexity-retirement-assessment-20260716.md`; commits
`6454d80`, `431c69f`, `fdba4ee`, `1d13e09`, `34c5c68`, + the P5/P6 commits).
The four content forms (2,135→859 lines) now share one submit/upload flow per
family with injectable image-upload strategies and a single YouTube upload
function. The two admin media editors (4,430→~2,650 lines incl. the colocated
YouTube hook) recompose a shared read-side toolkit — list controller, 자동 날짜
인식 loop, stats/filter/batch/grid/pagination components — on the shared
`parseDate` normalizer; write paths stay page-owned. Both editors use the
shared `CatSelectorModal` with **commit-on-done** semantics (accepted
intentional change from the old live-toggle). All ~45 native
`alert()/confirm()` prompts across the editors and forms were replaced by the
new promise-based `useDialog` primitive on `ui/Modal` (P6.1) — user prompts
now match the site's modal system.

**Rationale:** the 2026-07-16 assessment measured ≈2,100–2,900 retirable LOC of
copy-paste duplication and local-state sprawl; retiring it in place (no
framework change) kills the double-maintenance and gives forms/editors shared,
tested primitives. 집사톡's latently-broken signed-URL image upload was fixed
en route (`DEBUG_LOG.md` 2026-07-19).

**Verified:** every phase gated on the P0 characterization net — final full
e2e run green against the finished code (see assessment §8 per-phase notes for
counts), plus tsc / smoke 29 / unit 25 and screenshot browser-passes of both
editors and the selector/dialog modals. ⚠️ Still owed: the scripted manual
pass over the YouTube surfaces (sync + playlists, real creds) before the next
`dev → main` promotion.

---

## 2026-07-18 — Tier 1 write migration: role assignment → Admin-SDK route, audit log restored

**Area:** added — `src/app/api/admin/assign-role/route.ts`. Changed —
`src/components/admin/RoleManagement.tsx` (assign via the route),
`src/services/role-assignment-service.ts` + `src/services/permission-service.ts`
(client-SDK role-write methods removed), `config/firebase/firestore.rules`
(`users` admin write clause removed; comments updated). Docs —
`docs/planning/PROJECT_PLAN.md` §7,
`docs/planning/multi-tenant-architecture-decision-20260718.md` §6.

**What changed:** executed the Tier 1 migration decided 2026-06-30
(`firebase-sdk-usage-inventory.md` §D). New `POST /api/admin/assign-role`
(gated `requireApiPermission('manage-users')`) validates the role against the
live `role_permissions/role-config` matrix, then writes the `users/{userId}`
role change (history push, create-if-absent) **and** the `permission_logs`
audit entry in **one Admin-SDK transaction** — no role change without an audit
record. `assignedBy` comes from the verified ID token, never the body;
`mountainId` from `getCurrentMountainId()` (removes RoleManagement's hard-coded
`'geyang'` — one §9 item). The admin members page now calls the route (same
fetch+`authHeader` pattern as its user-list load). Removed the superseded
client write paths: `assignUserRole`/`assignSpecificRole`/`logRoleChange`
(role-assignment-service) and the caller-less
`assignRole`/`suspendRole`/`reactivateRole`/`logRoleChange`
(permission-service). Rules: the `users` `allow write: if hasPermission(...
'manage-users')` clause is removed — role writes are now impossible from the
client; the owner create/update clauses (login-time self-provision, added
2026-07-11) are **kept**, so the inventory's original "relock to
`write: if false`" became "remove the admin clause only" — the self-provision
half of Tier 1 had already been solved by those rules clauses after the
inventory's snapshot date.

**Rationale:** every role change was silently losing its audit entry
(`permission_logs` = `write: if false`; the client write was denied and the
failure swallowed) — a governance gap that becomes untenable with a second
mountain owner (multi-tenant decision doc §6 lists this as a prerequisite of
the identity split). Role writes are the escalation-sensitive crown jewels and
now sit behind a single server-enforced, transactional, audited path.

**Verified:** `npx tsc --noEmit` clean; `npm run test:smoke` 27/27 green.
⚠️ **Rules deploy pending (owner-run):** `firebase deploy --only firestore:rules`
must ship the `users` clause removal; until then the old client write clause
remains live in prod (the app no longer uses it). Live-browser verification of
the members page recommended post-deploy (assign a role → check
`permission_logs` gains an entry).

---

## 2026-07-15 — Playwright e2e main-plan suites complete (Phases 2–6) + Phase 7 flake audit

**Area:** added (test-only — no `src/` change) — `tests/e2e/{public,auth,member,admin,api}/**`
(spec files), `tests/e2e/setup/{auth-helpers,phone-otp}.ts`, member `storageState`
wiring in `tests/e2e/setup/global.setup.ts`, an anonymous `auth` Playwright project +
member/admin projects in `playwright.config.ts`, the recoverable-hydration tolerance in
`tests/e2e/setup/test.ts`. Fixture fix — `tests/e2e/fixtures/cats.json` `date_of_birth`
(epoch-millis → 4-digit year). Docs — `tests/e2e/README.md`, `docs/planning/PROJECT_PLAN.md`
(§1 + §10), `docs/planning/playwright-ci-plan.md` (§8 checklist).

**What changed:** wrote every remaining main-plan e2e suite on top of the Phase-0+1
harness — `public/` (~60 tests: anonymous surfaces, landing/mobile map, galleries,
announcements, albums, nav/gating), `api/` (route auth: unauth→401, non-admin→403),
`auth/` (email + phone-OTP login, logout, full 집사등록 signup), `member/` (mypage,
동참 contact, nav permissions, butler-access denial, account withdrawal), `admin/`
(AdminAuth gate, cats/points/members/posts CMS). New shared helpers drive the real
login UI (`auth-helpers.ts`) and read the emulator's SMS code over REST
(`phone-otp.ts`). The console watchdog now tolerates the React-recoverable hydration
mismatch (anonymous→authed nav; #418/#421/#423/#425) **only** on authed projects.

**Rationale:** completes the main plan (`playwright-ci-plan.md` Phases 2–7) — the
harness had one trivial spec; this brings real behavioral coverage across every role
and the API security surface, closing the "coverage was zero" gap for the browser tier.

**Verified:** each Playwright project green in isolation against a fresh seed (admin
3× consecutively). **Phase 7 flake audit:** full-gate `npm run test:e2e` (clean
`.next` each time) run **3× consecutively — all green, 101 passed / 13 skipped / 0
failed**, ~3.7 min/run (Playwright phase ~1.7 min), identical counts (no flake).
`npx tsc --noEmit` clean. Three test-only watch-outs handled (fixture DOB year; the
cats form's `type="url"` thumbnail vs. relative paths — spec clears the field;
hydration tolerance). Two latent app behaviors pinned by tests, not fixed:
`butler_talk`/`butler_stream` gate on `isAdmin()` (member denied), and role
assignment's `permission_logs` audit write is denied by the repo rules (non-fatal).
Committed to `dev` across `a06eda3`/`13a4667`/`67407e8`/`b4bc727` (suites) + this
doc pass; **not pushed** — owner to push/PR and watch CI reproduce the 3× green.

## 2026-07-11 — Playwright e2e harness + CI (emulator-backed) — prerequisite plan executed

**Area:** added — `.github/workflows/ci.yml`, `playwright.config.ts`, `tests/e2e/**`
(fixtures, seed data, `setup/{test,global.setup}.ts`, `public/landing.smoke.spec.ts`,
`README.md`), `scripts/test/seed-emulators.mjs`, `config/firebase/storage.rules`,
`.env.test`. Env-gated `src/` touches — `services/firebase.ts` (WP2:
`connect*Emulator` + skip `getAnalytics`), `lib/firebase-admin.ts` (WP3:
credential-less emulator init), `components/{MountainViewer,LeafletMountainMap}.tsx`
(WP7: `data-testid` readiness signals). Build-script touch —
`scripts/maintenance/fetch-static-assets.js` (WP4: emulator project-id override,
credential-less init, `file.download()` path). Config — `firebase.json` (emulators
block), `package.json` (`test:e2e`/`test:e2e:ui`/`seed:emulators` + devDeps
`@playwright/test`, `firebase-tools`, `dotenv-cli`), `.gitignore`.

**What changed:** built the whole Phase-0+1 harness from
`docs/planning/playwright-ci-prerequisite-plan.md` — a hermetic Firebase Emulator
Suite (Auth+Firestore+Storage) seeded with hand-authored, PII-free fixtures, driving
the **real prod build** (`next build` → `next start`) under Playwright, wired into a
greenfield GitHub Actions CI. All new-behaviour `src/` code is gated on an explicit
`NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true'` flag that is never set in Vercel.

**Rationale:** the repo had **no** `.github/` and no browser tests; this establishes
the deterministic, secret-free e2e foundation the main plan's suites build on.

**Verified:** full local loop green — `npm run test:e2e` runs emulators → seed → prod
build (asset fetch downloads 5 fixture thumbnails via `file.download()`, honours the
F6 no-thumbnail warning, passes the F7 about-photo gate) → 3 passing specs (desktop +
mobile landing map, admin `storageState`) in ~6s. Gates green: `npx tsc --noEmit`,
`npm run lint` (warnings only), `npm test` (40 vitest). **Production build path
verified untouched** — `npm run build` against real Firebase succeeds (32 cats, no
emulator-mode init, clean `mountains.json` diff). CI workflow authored; observing it
3× green + branch protection is an owner follow-up. Spikes S1–S3 recorded in the
prereq plan §3; S4 admin-path proven (non-admin login blocked — see today's
`DEBUG_LOG.md` entry).

## 2026-07-11 — Dead-code removal (≈3,200 LOC across 19 files + 2 method-level items)

**Area:** removed — `app/auth-test/`, `utils/{auth-integration-test,kakao-auth-test,oauth,dateParserTest,permission-utils}.ts`,
`components/{ProviderManagement,SocialLoginDemo,KakaoTalkDebug,KakaoTalkFallbackDebug,FirebaseStorageTest,PostItem,ButlerStreamTabs}.tsx`,
`services/basic-feeding-spots-service.ts`, and 5 dead API routes
(`api/{test-youtube-auth,feeding-spots-basic,fetch-playlists,manage-playlist-membership,auth/status}/`).
Trimmed — `FirebaseContactService.createContact` + `IContactService.createContact`
(contact-service.ts, interfaces.ts) and `getMountainTheme()` (config.ts). Doc touch-ups —
`docs/codebase/{api-routes,media-and-youtube}.md` route tables.

**What changed:** executed the source-verified removal plan in
`docs/planning/dead-code-removal-assessment-20260711.md` — a debug/demo auth cluster,
standalone unreferenced files, "not yet implemented"/stub API routes, and two dead symbols.
`createContact` was already superseded by `POST /api/contact` (Admin SDK) and blocked by the
`contacts` Firestore rule (`create: if false`); `getMountainTheme()` had no callers (theme
not wired through). `MountainTheme` type kept (still used by `MountainConfig.theme`).

**Rationale:** mechanical dead-code cleanup — every item was grep-verified to have zero live
callers before removal. Product-decision items (MountainSelector, 겨울집 stub, migration page)
were intentionally left alone.

**Verified:** re-ran the basename/route-path sweep to confirm zero external refs, then
`npx tsc --noEmit` (exit 0) + `npm run test:smoke` (26/26 passed).

---

## 2026-07-10 — Compliance: 개인정보처리방침 + 이용약관 pages, footer links, consent, 국외 이전

**Area:** `app/pages/privacy/page.tsx` (new), `app/pages/terms/page.tsx` (new),
`components/Footer.tsx`, `components/SignupForm.tsx`, `constants/strings.ts`.

**What changed:** stood up the two legal pages the footer had only stubbed. Both are
static prose Server Components adapted from the KISA/PIPC standard 처리방침 structure
and grounded in what the app actually collects (email/password/닉네임/phone, Kakao
profile, 동참 form). The footer's greyed "준비 중" placeholders became live `<Link>`s to
`/pages/privacy` and `/pages/terms`. Signup (email path) gained two **required** consent
checkboxes — 이용약관 + 개인정보 수집·이용 — that gate the 인증번호 받기 submit
(strings under `login.signup.consent`). The privacy policy discloses **국외 이전** (§6,
PIPA Art. 28-8) for Google LLC + Vercel Inc. (US); per the 2023 amendment this rides the
**contract-necessity + 처리방침-disclosure** basis, so overseas transfer is **not** part
of the consent checkbox.

**Rationale:** close the deferred compliance workstream (PROJECT_PLAN §8) — the operator
is a 개인정보처리자 under PIPA once it collects member PII. Decisions (owner): CPO
산냥이집냥이 운영자 / `rescuezoro@gmail.com`; under-14 allowed w/ guardian consent.

**Verified:** `tsc` clean + smoke green; server-side render confirmed (both pages, §6/§13,
consent strings on `?tab=signup`, footer links). ⚠️ Professional legal review before
scaling still owed; phone/Kakao-signup consent not yet captured. See compliance-plan.md.

## 2026-07-10 — Account withdrawal (탈퇴) / deletion flow

**Area:** `app/api/account/delete/route.ts` (new), `app/mypage/page.tsx`,
`constants/strings.ts`, `app/pages/privacy/page.tsx` (§3 retention).

**What changed:** members can now delete their own account. A low-emphasis 회원 탈퇴 link
on mypage opens a shared `ui/Modal` confirm → `POST /api/account/delete`, which verifies
the caller's Firebase ID token (uid comes from the token, never the body), then Admin-SDK
deletes the `users/{uid}` doc and the Auth account, then signs out. Works uniformly for
email/phone/Kakao (no client reauth). Immediate **hard-delete**; privacy §3 retention
reworded from a 30-day grace to "탈퇴 시 지체 없이 파기". Authored posts are retained
(content, not account PII).

**Rationale:** account withdrawal/deletion is a PIPA data-subject right (compliance-plan
task 6). Server-side because client rules forbid a user deleting their own `users` doc and
client `deleteUser()` needs recent reauth.

**Verified:** `tsc` clean + smoke 26/26; unauth `POST` → 401; policy wording confirmed
rendered. ⚠️ Live click-through with a throwaway account still owed (it irreversibly
deletes) — extension not connected here.

## 2026-07-10 — Adoption page: enlarge 소식 heading + post title/content fonts

**Area:** `app/pages/adoption/page.tsx`, `components/AdoptionPromotionClient.tsx`.

**What changed:** four Tailwind size swaps — "새로운 입양 소식" heading `text-base`→`text-xl`
(matches the 입양홍보 h1); post-card title `text-sm`→`text-base`; post content (expanded
body + collapsed 3-line preview) `text-sm`→`text-base` (matches the about-page content
size). Weights/tracking unchanged; the per-post date stays `text-sm`.

**Rationale:** owner found the adoption-post heading and body too small on desktop.

**Verified:** static class swaps; `tsc` clean + smoke green.

## 2026-07-10 — Mobile UI polish: mypage edit rows + login/logout menu pills

**Area:** `app/mypage/page.tsx`, `components/auth/NavigationBarLogin.tsx` +
`NavigationBarLogout.tsx`, `components/Navigation.tsx` · **Type:** fix (small) · **Branch:** `dev`

### Change

Two mobile presentation fixes reported by the owner:

1. **Mypage inline edit rows** (`cd3c29d`) — 닉네임 / 이메일 재인증 / 전화번호 edit rows put the
   `flex-1` input and both action buttons in **one horizontal row**, so on a narrow viewport the
   input ate the width and 취소 was squeezed off to the far right. Reworked each to a **full-width
   input** with a **right-aligned `취소` / primary-button row below** it (labels horizontal). The
   single-button steps (send-verification / verify-and-update) keep their full-width CTA.
2. **Mobile login/logout menu pills** (`3ccd414`) — in the hamburger menu the login/logout pills
   are block-level flex containers, so they filled the row with content packed **left**, leaving
   dead space on the right. Added a `mobile` prop to both `NavigationBar*` components that applies
   `w-full justify-center`, so each reads as a **balanced full-width button** matching the 입양홍보
   CTA above it. Desktop pills (content-width in the nav bar) are unchanged — only the two
   mobile-menu instances pass `mobile`.

### Verified

`tsc` clean; smoke 25/25. Login pill **browser-verified centered at 390px** (iframe harness).
Mypage rows + the logged-in logout pill share the same pure-flex mechanism but sit behind
sign-in — live confirm is device/credential-owed.

---

## 2026-07-10 — Converge public/auth CTAs onto the shared `<Button>` primitive

**Area:** `app/pages/announcements/[id]`, `app/pages/contact`, `components/AnnouncementModal`,
`CatSelectorModal`, `LoginForm`, `auth/PhoneLoginForm` + 4 auth modals · **Type:** fix (refactor) ·
**Branch:** `dev`

### Change

Swept the remaining hand-rolled `bg-gradient-to-r from-brand to-accent` buttons across the
public + auth surfaces onto `<Button variant="primary">` (PROJECT_PLAN §12.2). Covered the
announcements-detail back button, contact form submit, announcement/cat-selector modal actions,
the email + phone login submits, and the four auth modals (email-verification, password-reset,
kakao-guidance, user-not-found). Also normalized stray non-brand accents to brand tokens
(`bg-yellow-100`/`bg-blue-100` icon circles → `bg-brand-100`; login spinner `border-yellow-600`
→ `border-brand`). Navigation `<Link>` CTAs left as links (they navigate, not act). This makes
tap-target sizing / focus rings / hit-areas live in one primitive, so the mobile pass inherits
correct buttons instead of re-touching each hand-rolled one.

### Verified

`tsc` clean; smoke 25/25. Grep-confirmed no hand-rolled gradient `<button>`s remain in
public/auth code (only the two intentional `<Link>` CTAs in faq/adoption).

---

## 2026-07-08 — Back button / swipe-back closes modal instead of navigating away

**Area:** `components/ui/useModalLayer.ts` · **Type:** fix · **Branch:** `dev`

### Change

`useModalLayer` now pushes a synthetic `history.pushState({ mohocat_modal: id }, '')` entry
when each overlay opens. A module-level `popstate` listener (registered once, lazily) catches
back-button / swipe-back gestures and closes the topmost layer instead of letting the browser
navigate to the previous page. When the overlay is closed normally (X button, backdrop,
Escape), the cleanup pops the synthetic entry via `history.back()`, guarded by a
`suppressNextPopState` flag so the resulting `popstate` doesn't accidentally close the layer
beneath. All three overlay types (Modal, Lightbox, VideoPlayer) fix automatically since they
all go through `useModalLayer`.

### Rationale

On mobile the OS back gesture / hardware back button is the primary "dismiss" action.
Without a history entry the back button skipped modals entirely and navigated the user away
from the underlying page — most noticeable on Android and mobile Safari's swipe-back.

### Verified

Gates green (`tsc --noEmit`, smoke 25/25). Device-owed: the actual back-gesture feel on a
real phone.

---

## 2026-07-08 — Mobile lightbox: pinch-to-zoom on images

**Area:** `components/ui/Lightbox.tsx` · **Type:** enhancement · **Branch:** `dev`

### Change

On mobile (`useIsMobile`, <768px) the lightbox image is wrapped in
`react-zoom-pan-pinch`'s `TransformWrapper`/`TransformComponent` (new dependency, v4.0.3):
pinch-zoom 1–4×, drag-to-pan while zoomed, double-tap toggles zoom. Desktop rendering is
byte-for-byte unchanged (no wrapper is mounted). Navigating prev/next resets the zoom to fit
(`key={image.imageUrl}` remount). While un-zoomed the wrapper carries `touch-action: pan-y`
so a single-finger drag still scrolls the overlay and only two-finger pinches reach the zoom
handler; once zoomed it flips to `touch-action: none` and panning takes over.

### Rationale

Page-level pinch zoom is disabled app-wide (`viewport.maximumScale: 1` in `app/layout.tsx`)
and should stay that way — page zoom would scale the fixed lightbox chrome and fight the
Leaflet map's own pinch handling. So enlargement has to live inside the lightbox, and only on
mobile per owner direction. A battle-tested gesture library was chosen over hand-rolled
Pointer Events math deliberately — device-specific pinch edge cases are exactly where the S22
map bugs lived.

### Verified

Gates green (`tsc --noEmit`, smoke 25/25). Desktop (1456px): lightbox opens with no transform
wrapper. 390px iframe harness: wrapper mounts with `pan-y`; double-tap handler fires and
queues the zoom animation; driving the transform to 2× applies the transform, flips
`touch-action` to `none`, enables panning, and reverting to 1× restores everything;
prev/next navigation resets to 1×. The animated zoom itself can't render in the harness —
the automation tab is backgrounded so Chrome suspends `requestAnimationFrame` entirely
(verified 0 ticks/s) — so the **pinch/double-tap feel on a real phone is device-owed**.

---

## 2026-07-06 — Mobile nav: reduced the top bar height

**Area:** `app/layout.tsx` · **Type:** enhancement · **Branch:** `dev`

### Change

Trimmed the sticky header's vertical padding below `lg` (where the mobile hamburger shows):
`py-2` → `py-1 lg:py-2`. Desktop (`lg+`) is unchanged. Mobile bar height drops from ~57px to
**49px**.

### Rationale

The mobile top bar read a little thick over the map. 49px is the acceptable floor — the height
is now set by the 40px hamburger tap-target plus the 1px bottom border, so trimming further would
mean shrinking the tap-target or the 36px logo, which crosses from "thinner" into
"cramped/degraded."

### Verified

Browser-verified in the 390px iframe harness — measured header height 57px → 49px; logo, title,
계양산 selector, and hamburger stay comfortably centered.

---

## 2026-07-06 — Mobile nav: close the hamburger menu on outside click

**Area:** `components/Navigation.tsx` · **Type:** enhancement · **Branch:** `dev`

### Change

The open mobile hamburger menu now dismisses when the user taps anywhere outside the top nav bar.
A `pointerdown` document listener (active only while the menu is open) closes the menu unless the
click lands inside the surrounding `<header>`; a ref on the hamburger+menu wrapper locates that
header. Clicks on the menu, its items, or the toggle button are DOM descendants of the header, so
they're left to their own `onClick` — no double-fire, and the toggle keeps working.

### Rationale

Previously the menu only closed via the X button or by picking an item — tapping the map/page
left it hanging open. Outside-tap-to-dismiss is the expected mobile affordance. The top nav bar is
kept as a safe zone (its links navigate away, resetting state anyway).

### Verified

Browser-verified in the 390px iframe harness: open → tap map area = closes; open → tap empty nav
bar = stays open. `npx tsc --noEmit` clean.

---

## 2026-07-06 — Map: moved the click-a-pin nudge card from bottom-left to top-left

**Area:** `components/IntroCard.tsx`, `components/MountainViewer.tsx` · **Type:** fix ·
**Branch:** `dev`

### Change

The dismissible `IntroCard` nudge (`지도의 고양이 사진을 클릭해보세요`) that floats over the map
moved from the map's **bottom-left** to its **top-left** (`bottom-4 left-4 md:bottom-6 md:left-6`
→ `left-4 top-4 md:left-6 md:top-6`).

### Rationale

The map fills the viewport width and can extend below the fold on short windows, so the
bottom-left corner scrolled out of view — the nudge went invisible exactly when a first-time
visitor most needs it. The top-left corner is always above the fold, and mirrors the Compass
(N indicator) pinned top-right, so the two overlays balance instead of stacking one hidden
corner.

### Verified

`npx tsc --noEmit` clean; browser-verified on localhost:3000 (cleared the localStorage dismissal
flag to force the card visible) — card renders at the map's top-left, below the header, no
overlap with the header or Compass.

---

## 2026-07-06 — Cleanup: `triggerCatRevalidate` → `triggerPublicRevalidate`

**Area:** `lib/revalidate-client.ts`, `app/admin/cats/page.tsx`, `app/admin/points/page.tsx`,
`components/admin/cat-grid/CatGrid.tsx` · **Type:** cleanup (behavior-neutral rename) ·
**Branch:** `dev`

### Change

Renamed the on-demand revalidation helper from `triggerCatRevalidate` to
`triggerPublicRevalidate`. The helper was cat-named from when only the cat CMS used it, but the
급식소 points CMS now reuses it too, and it never was cat-specific — it POSTs `/api/revalidate`,
which revalidates the public baked surfaces (`/` + `/pages/adoption`) regardless of which
collection mutated. Updated all four call sites and the now-stale "reused from the cat CMS"
comment in the points page.

### Rationale

Recorded as optional cleanup in the off-plan #2 hand-off (§6) — the shared helper's cat name
misrepresented its (collection-neutral) purpose. Neutral name = one less thing to second-guess
when the next surface needs revalidation.

### Verified

`npx tsc --noEmit` clean; `npm run test:smoke` 25/25; no remaining `triggerCatRevalidate`
references in source. Pure identifier rename — no behavior change.

---

## 2026-07-05 — Admin: 급식소 관리 (feeding-station points) CMS

**Area:** `app/admin/points/page.tsx` (new), `components/admin/PointMapPicker.tsx` (new),
`config/firebase/firestore.rules`, `constants/adminStrings.ts`, `app/admin/layout.tsx` ·
**Type:** enhancement · **Branch:** `dev` · **Plan:**
[`feeding-station-points-admin-cms-plan.md`](../docs/planning/feeding-station-points-admin-cms-plan.md)

### Change

The 급식소 관리 admin nav item (previously a disabled `준비 중` placeholder) is now a working CMS
at `/admin/points` for the Firestore **`points`** collection — the feeding-station pins the public
map renders. Operators can create / edit / delete pins, each with **제목, 설명, position, and the
per-device `labelSide` override** (자동/위/아래 for mobile + desktop).

- **Position** is set with a **Leaflet-free visual picker** (`PointMapPicker`): the landscape map
  image with all existing pins shown as context dots; click (or drag the marker) to place, deriving
  `x`/`y` as % of the image. The coordinates are also **directly editable** as 가로/세로 number
  inputs, two-way-synced with the marker (both rounded to 0.1% so map and fields always agree).
- **Delete is blocked while referenced** — a point that any cat's `dwelling` / `prev_dwelling`
  points at can't be deleted; the modal lists the resident cats and refuses until they're reassigned
  (guards against orphaning cat→point links).
- Writes go through the existing `PointService` client-SDK CRUD (previously defined but unused) and
  reuse `triggerCatRevalidate` (which revalidates `/`) so map edits reflect immediately via ISR.
- **Firestore rule:** `points` write opened from `if false` to
  `hasPermission(request.auth.uid, 'manage-canteen')` (canteen = 급식소; admin-only), mirroring the
  cats rule.

This also unblocks authoring the `labelSide` override from the entry below — the two land together.

### Rationale

`points` had no admin write path (CRUD methods existed but were never called), so pin edits required
a Firestore-console edit. Owner chose (per plan): scope = `points` only (겨울집 stays a placeholder);
permission = `manage-canteen`; visual map picker for coordinates; block-delete-while-referenced.

> ⚠️ **Owner action:** deploy the rule with `firebase deploy --only firestore:rules` — writes fail
> against real Firestore until deployed (rules deploy is owner-run per CLAUDE.md).

### Verified

- `npx tsc --noEmit` clean; `npm run test:smoke` **25/25**; `npm test` **39/39**.
- Browser (localhost:3000, admin): 급식소 관리 nav link active; `/admin/points` lists all 8 points
  (position + 라벨); add-form opens with the picker showing context pins; **click placed a marker and
  the x/y readout updated** (가로 49.9% · 세로 53.1%); labelSide selects render; **delete on 정상
  (has resident cats) was blocked** with the cat list. No console errors.
- **Owner-owed:** an actual save/create — needs the rule deployed first.

## 2026-07-05 — Map: per-Point title-label side override (`labelSide`)

**Area:** `src/types/index.ts` (`Point.labelSide`, `LabelSide`), `src/utils/mapLabels.ts` (new),
`LeafletMountainMap.tsx`, `tests/unit/mapLabels.test.ts` (new) · **Type:** enhancement · **Branch:** `dev`

### Change

Each feeding-point pin's **title-label side** (above/below the avatar) can now be overridden
**per device**, on the Firestore Point doc:

```jsonc
// points/{id}
"labelSide": { "mobile": "above" }   // desktop unset → automatic edge-flip
```

`labelSide?: { mobile?: 'above' | 'below', desktop?: 'above' | 'below' }`. An explicit value for
the active layout is honored **as-is**, deliberately bypassing the deterministic bottom-edge
auto-flip — so an operator can flip a label that overlaps an **adjacent pin's** thumbnail/label.
An **unset** side (or no `labelSide` at all) falls back to today's automatic behavior, so every
existing point is unchanged.

The mobile map is rotated 90° CW, so a pin's displayed vertical axis differs by layout (mobile
reads `x`, desktop reads `y`) — hence the per-device shape: a pin that crowds on mobile can be
fixed without forcing the desktop side. The decision is a pure, framework-free helper
(`resolveLabelAbove` in `utils/mapLabels.ts`), threaded `Point.labelSide` → `ResolvedMarker` →
`resolveLabelAbove` → the existing `labelAbove` flag in `buildMarkerHtml` (render path unchanged).

### Rationale

Replaces the abandoned config-file-per-pin approach (see the 2026-07-05 off-plan handoff §4). The
requirement is per-pin control to de-collide crowded labels; the owner chose a per-Point Firestore
field over a config file or an in-map editor. Data lives on the Point (ISR-fresh, no redeploy),
though the `points` collection has no CMS UI, so authoring is a Firestore-console / migration edit.

> ⚠️ **Edge-pin caveat (from the abandoned attempt, still true):** the topmost pin (정상) can't be
> fully de-collided by above/below alone — `below` overlaps 헬기장's thumbnail, `above` tucks under
> the sticky header. `labelSide` gives per-pin control but doesn't add left/right, so that one
> edge case remains geometrically unsolvable with this mechanism.

### Verified

- `npx tsc --noEmit` clean; `npm test` **39/39** (6 new `resolveLabelAbove` unit tests covering
  auto-flip per layout, override-honored, and per-layout isolation).
- Browser (localhost:3000, desktop): map + all 8 pins render, labels below as before, **no console
  errors** — confirms no regression (no Firestore point has `labelSide` yet).
- **Device-owed:** rendering an actual override — collision layout is width/DPI-dependent, so
  overrides must be authored against a **real device**, not the iframe harness.

## 2026-07-05 — Map: per-mountain clustering toggle (`map.clustering` in mountains.json)

**Area:** `config/mountains/mountains.json`, `utils/config.ts` (`MountainMapConfig`),
`MountainViewer.tsx`, `LeafletMountainMap.tsx` · **Type:** enhancement (config) · **Branch:** `dev`

### Change

Mobile marker-clustering is now switchable per mountain, alongside the existing
`maxClusterRadius`, in the `map` block of `mountains.json`:

```json
"map": { "clustering": true, "maxClusterRadius": 50 }
```

`clustering: true` (default) keeps the static, tap-to-spiderfy clustering; `clustering: false`
renders **every** point as its own pin on mobile (they may overlap where points sit close) — the
same stand-alone-pin path desktop already uses. Threaded via `getMapConfig()` →
`MountainViewer` → `LeafletMountainMap` → `PointMarkersLayer`, where the un-clustered branch now
fires on `!isMobile || !clustering`. Desktop is unaffected (always un-clustered). An omitted flag
defaults to `true` via `DEFAULT_MAP_CONFIG`, so existing configs keep today's behavior.

### Rationale

Clustering suits dense mountains but is unnecessary — and adds interaction cost (an extra tap to
spiderfy) — for a mountain with only a few, well-separated feeding points. Operators can now pick
per mountain without a code change.

### Verified

`tsc --noEmit` clean + `npm run test:smoke` 25/25. Phone-width iframe harness (390px):
`clustering: false` → **8 pins, 0 clusters** (all points individual); `clustering: true` →
**4 pins + 2 clusters** (unchanged baseline). Config reverted to `true` after the check.

---

## 2026-07-05 — Mobile: portrait-only map (landscape rotate-notice) + one-line nav in landscape

**Area:** `Navigation.tsx`, `MountainViewer.tsx`, `LeafletMountainMap.tsx`, new
`hooks/useIsPhoneLandscape.ts` (removed `hooks/useIsPortrait.ts`) · **Type:** enhancement +
simplification · **Branch:** `dev`

### Change

Two paired changes so the mobile app presents a **portrait-first** experience (like a native
app), instead of adapting the whole UI to a cramped landscape:

1. **Nav stays one line in landscape.** The desktop-nav breakpoint moved `md` (768px) → `lg`
   (1024px). A phone in landscape (~780px, just over `md`) previously flipped to the full
   desktop nav, which wrapped to two lines; it now keeps the one-line hamburger. The 768–1023px
   band (small tablets / narrow windows) gets the hamburger too — accepted, consistent with the
   mobile-first direction.
2. **The map is portrait-only on phones.** A phone held in landscape is no longer given a
   sideways/ballooned map; it gets a scoped, 해요체 notice — **지도는 세로 모드에서만 볼 수
   있어요. 기기를 세로로 돌려주세요 🙂** — via the new `useIsPhoneLandscape()` hook
   (`(orientation: landscape) and (max-height: 540px)`). The notice is **map-page-only**; the
   rest of the app stays usable in landscape, and album/cat lightboxes (other pages) are
   unaffected, so wide photos/videos can still be viewed rotated.

Because the map is now portrait-only on phones, device and orientation coincide, so the map's
**orientation machinery was deleted**: `useIsPortrait` and the map's separate `portrait` prop
are gone — a single `isMobile` flag now drives the rotated-portrait image + coords, container
aspect, compass, clustering, +/− buttons, and drag-gate. The `key={portrait}` remount-on-rotate
is gone (the key is now the rotation-invariant device class).

### Rationale

The information architecture doesn't suit a horizontal phone layout, and true orientation-lock
isn't available to a browser tab (no PWA/fullscreen). The web-equivalent is a portrait-first
presentation with a rotate notice where landscape genuinely breaks (the map). Scoping the notice
to the map — rather than a general "돌려주세요" — is honest and keeps the rest of the app working
in landscape. Bonus: it removes the exact orientation code (image swap / coord rotation / remount)
that the recent S22 map bugs churned through.

### Verified

`tsc --noEmit` clean + `npm run test:smoke` 25/25. Browser-verified in the iframe harness:
**780×360** (phone landscape, home) → one-line hamburger nav (no 2-line desktop nav) + rotate
notice shown; **390×800** (phone portrait, home) → map renders with 4 pins + 2 clusters, no
notice; **900** (<1024) → hamburger; **1200** (≥1024) → full desktop nav returns. _(Real-device
rotation feel — the physical landscape⇄portrait transition on an S22/Note 9 — stays device-owed.)_

---

## 2026-07-04 — Mountain selector label: 계양산 냥이들 → 계양산

**Area:** `config/mountains/mountains.json` (`geyang.name`) · **Type:** small fix ·
**Branch:** `dev`

### Change

Shortened the geyang mountain `name` from **계양산 냥이들** to **계양산**. This value feeds the
`MountainSelector` only (button label via `getMountainName()` + dropdown list item via
`getAllMountains()` — no page titles/metadata consume it), so it changes the selector chip on
**both** desktop and mobile from one source.

### Rationale

On mobile the longer **계양산 냥이들** chip crowded the header row, pushing the site title
**산냥이집냥이** and the chip onto two lines. Dropping 냥이들 keeps the header on a single line.
(The selector's descriptive subtitle 계양산에서 살고 있는 고양이들의 이야기 still carries the
fuller context in the open dropdown.)

### Verified

`tsc --noEmit` clean + `npm run test:smoke` 25/25. Browser-verified in the iframe harness at
390: selector reads 계양산, site title 산냥이집냥이 renders on one line, whole header row no
longer wraps.

---

## 2026-07-04 — Mobile nav menu: drop category headers, separate groups with hairline rules

**Area:** `components/Navigation.tsx` (mobile hamburger menu) · **Type:** enhancement ·
**Branch:** `dev`

### Change

Reworked how the mobile menu delimits its groups. Previously each group was introduced by an
uppercase `MobileSection` header echoing the desktop top-nav category (소개 / 갤러리 / 소식 /
집사메뉴), which read cluttered on a narrow phone menu.

- **Removed** the `MobileSection` header component and all four labels.
- Groups are now separated by a **subtle grey hairline** (`border-t border-gray-200`) via a new
  `MobileDivider` helper — 소개 items · 갤러리 items · 소식 · 입양홍보 CTA · 집사메뉴 items ·
  login/logout, each delimited by a rule.
- Preserved the logged-out affordance: the greyed 집사메뉴 items now carry the
  **(먼저 로그인 하세요)** hint inline (it used to live in the removed 집사메뉴 header).

This supersedes the section-header **relabel** from the earlier same-day entry below (the
header no longer exists); the item label 산냥이와 집냥이 and the `max-h`/scroll clip fix from
that entry are unaffected.

### Rationale

Owner: the category headers didn't render cleanly on mobile. Dropping them lets the item
labels lead; hairline rules keep the grouping legible without the header noise. Grey chosen
over brand-yellow (owner call) — quieter, standard for a white dropdown.

### Verified

`tsc --noEmit` clean + `npm run test:smoke` 25/25. Browser-verified in the true-reflow iframe
harness at 390: zero uppercase headers remain, 5 hairline dividers present, panel is more
compact (522px vs 641px). Logged-out 집사메뉴 hint verified in code.

---

## 2026-07-04 — Mobile nav menu: fix mislabeled section header + prevent clip on short viewports

**Area:** `components/Navigation.tsx` (mobile hamburger menu) · **Type:** small fix ·
**Branch:** `dev`

### Change

Two fixes to the mobile (`md:hidden`) nav dropdown, found during the §4 mobile audit:

- **Mislabeled first section header** — the mobile menu's opening `MobileSection` read
  **동참** (a duplicate of one of its own child items) while grouping 소개/냥이들/동참/입양홍보.
  The other three mobile sections (갤러리/소식/집사메뉴) already mirror their desktop
  `NavDropdown` labels exactly, so this was a copy-paste slip. Fixed the header to **소개**
  and aligned its first item label 소개 → **산냥이와 집냥이** to match the desktop dropdown.
- **Panel could clip on short viewports** — the menu is an `absolute … top-full` panel
  pinned inside the `sticky` header with no height cap, so on short screens (small phones /
  landscape) its bottom rows (the logout control) fell below the fold and were unreachable
  (the pinned panel doesn't scroll with the page). Added
  `max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain` so it scrolls internally.

### Rationale

Correctness + reachability on mobile. The label was simply wrong; the clip made a real
control (logout) unreachable on shorter viewports.

### Verified

`tsc --noEmit` clean + `npm run test:smoke` 25/25. Browser-verified in a true-reflow mobile
harness (iframe at phone width — `resize_window` is broken, see handoff): at 390px the header
now reads 소개 → 산냥이와 집냥이 and the panel fits; at 360×560 the panel caps at 496px and
scrolls internally (`scrollHeight 641 > clientHeight 496`, bottom 538 ≤ 560) instead of
clipping the logout row.

---

## 2026-07-04 — Album search/filter bar de-emphasized on mobile

**Area:** `album/AlbumFilterBar.tsx` (shared by 사진첩 + 동영상 pages) · **Type:** small fix ·
**Branch:** `dev`

### Change

The shared album search input + "고양이 선택" trigger were `text-base` / `py-2`, visually
dominating the mobile album pages. Scaled them **down on mobile only** via responsive
classes, `md:` restoring the desktop sizes untouched:

- Container `mb-8` → `mb-5 md:mb-8`; grid `gap-4` → `gap-2.5 md:gap-4`.
- Search input → `text-sm py-1.5` + tighter padding/icon on mobile (`md:text-base md:py-2`).
- Cat-selector button → `text-xs py-1.5 min-h-[36px]` on mobile (`md:text-sm md:py-2
md:min-h-[42px]`); `FaCat` icon `h-3.5` → `md:h-4`.

### Rationale

Owner felt the controls were overwhelming relative to the rest of the mobile album pages.
Desktop was fine, so the reduction is mobile-scoped.

### Verified

`tsc --noEmit` clean, `npm run test:smoke` 25/25. Desktop browser-verified unchanged.
⚠️ **Mobile NOT browser-verified** — `resize_window` doesn't reflow the content viewport in
automation (the parked mobile verification-tooling gap); change is code-reasoned responsive
CSS only. Confirm on a real device during the mobile pass.

---

## 2026-07-04 — Mobile map marker-clustering radius is now per-mountain config

**Area:** `utils/config.ts` + `mountains.json` + `LeafletMountainMap` / `MountainViewer` ·
**Type:** enhancement · **Branch:** `dev`

### Change

The mobile map's marker-clustering distance (`maxClusterRadius`, the screen-pixel radius
under which nearby feeding-point markers collapse into one cluster) was a hardcoded literal
`50` inside `LeafletMountainMap`'s `PointMarkersLayer`. Made it **per-mountain config** so it
can be tuned without a code edit:

- **`config.ts`** — new `MountainMapConfig` interface (`maxClusterRadius`), added
  `map?: MountainMapConfig` to `MountainConfig`, a `getMapConfig()` getter, and a
  `DEFAULT_MAP_CONFIG` (`50`) fallback merged in so mountains omitting the `map` section
  still resolve.
- **`mountains.json`** — added `"map": { "maxClusterRadius": 50 }` to `geyang`.
- **`LeafletMountainMap`** — replaced the literal with a `maxClusterRadius` prop (threaded to
  `PointMarkersLayer`, added to the marker-layer effect deps so a change rebuilds the layer).
- **`MountainViewer`** (map host) — reads `getMapConfig()` and passes the value down, keeping
  the map component a pure renderer.

Unchanged semantics: screen-pixel radius (not metres) and **mobile-only** (desktop is
un-clustered). Documented in the admin + deployment manuals.

### Rationale

Owner wanted to tune clustering without editing component code each time. Per-mountain config
JSON is the idiomatic knob here (mirrors theme/features/social); editing it still needs a
`git push` + Vercel rebuild, but no source change.

### Verified

`tsc --noEmit` clean, `npm run test:smoke` 25/25. Browser-verified the desktop home map
still renders all markers (un-clustered path intact). ⏳ Mobile clustering behavior not
driven in automation (mobile-only; `resize_window` flaky).

---

## 2026-07-04 — Photo gallery: translucent cat-name tags + drop album icon heroes

**Area:** `album/MediaTile.tsx` + `photo-album` / `video-album` pages · **Type:**
enhancement · **Branch:** `dev`

### Change

- **Photo previews now carry cat-name tags.** The `overlay` layout (used by the photo
  gallery) renders up to **2** translucent chips in the **top-left** of each tile
  (`bg-black/45` + `backdrop-blur-sm`, white text); a `+N` overflow chip appears when a
  photo has more than 2 tags. Fed by `image.tags` (passed from `photo-album/page.tsx`). The
  video gallery's `below` layout keeps its existing footer chips — unchanged.
- **Removed the camera/film icon "hero" from both galleries.** `AlbumHero` had already lost
  its title/subtitle and was just a gradient icon chip on a white bar — pure wasted vertical
  space. Dropped its usage from both album pages and deleted the now-orphaned
  `src/components/album/AlbumHero.tsx`; the pages now open directly on the search/filter bar.

### Rationale

Photo previews looked sparse; the top-left tags fill them and add useful at-a-glance cat
identity. The icon hero was decoration that only pushed the grid down.

### Verified

`tsc --noEmit` clean. Browser-verified `/pages/photo-album` (translucent chips over light &
dark image areas, 1- and 2-tag cases) and both galleries after hero removal. ⏳ `+N` chip
not exercised by live data — no current photo has >2 tags; logic mirrors the shipped video
footer overflow pattern.

---

## 2026-07-03 — 냥이들 thumbnails back to square + search/filter de-emphasis + 동영상앨범 rename

**Area:** `/pages/cats` (`CatsBrowser.tsx`) + `VideoAlbum.tsx` · **Type:** enhancement /
small fixes · **Branch:** `dev`

### Change

- **Desktop-table thumbnails reverted circular → square-ish.** The 냥이들 entry (below)
  shipped `CatThumb` with a `circle` prop rendering `rounded-full` avatars. Reverted to the
  rectangular `rounded-lg` tile (dropped the now-dead `circle` prop). See the sibling
  `DEBUG_LOG` entry for the distortion that made the circular form look squished — the
  revert and that fix landed together.
- **Search bar + 필터 button de-emphasized.** Both were `text-base` / `py-2`, visually
  out-sizing the rest of the page (table + filter panel are `text-sm`). Search input →
  `text-sm py-1.5`; 필터 `<Button>` → `size="sm"` (`px-3 py-1.5 text-sm`).
- **Copy:** VideoAlbum modal title `…의 동영상첩` → `…의 동영상앨범`.

### Rationale

Owner preferred the even, rectangular thumbnails over the squished circular avatars, and
wanted the cats-page controls to sit quieter in the visual hierarchy. Rename is a plain
wording preference.

### Verified

`tsc --noEmit` clean, `npm run test:smoke` 25/25. Browser-verified `/pages/cats`: square
undistorted thumbnails, smaller search/filter controls.

---

## 2026-07-03 — New public page: 냥이들 (browse-all-cats)

**Area:** new public route `/pages/cats` + 소개 nav · **Type:** enhancement (feature) ·
**Branch:** `dev`

### Change

Added a public-facing "browse all cats" page — previously the only way to find a specific
cat was to open the map and click through the thumbnail pins. New files:

- **`src/app/pages/cats/page.tsx`** — server component (mirrors the 입양홍보 pattern:
  `export const revalidate = REVALIDATE_SECONDS`, reads via `getAllCatsServer()` +
  `getPointService().getAllPoints()`). Builds a `dwelling`-id → point-`title` map so the
  page shows human-readable location names (e.g. "헬기장" instead of the raw point id
  "계양산(헬기장)"). Friendly empty / error states so the nav link never 404s.
- **`src/app/pages/cats/CatsBrowser.tsx`** — client island owning the interactive layer:
  search + collapsible filter panel (성별 / 출생연도 / 중성화 / 현재 거주지 / 입양), a
  "별냥이·행방불명 냥이도 보기" toggle (those statuses hidden by default), a **responsive
  hybrid** render (2-col photo-card grid on mobile via `md:hidden`, sortable data table on
  desktop via `hidden md:block`), and the shared `CatInfo` detail modal on card/row click.
  Filtering / sorting reuse `@/utils/cat-filters` verbatim, so the predicate matches the
  admin Cat Management view. Photo-less cats get a 🐾 brand-tinted placeholder tile.
  Desktop table thumbnails are **circular avatars** (`CatThumb` `circle` prop); the mobile
  cards keep rounded-rectangle tiles. Cat **counts are intentionally hidden** — no
  "N마리 / 전체 N마리" line and no count on the 별냥이/행방불명 toggle (owner ask). Search
  placeholder is "이름으로 검색".
- **`src/components/Navigation.tsx`** — added `냥이들` (`/pages/cats`, `resourceId="cats"`)
  under the 소개 dropdown (desktop) and the 소개 mobile section. Unknown `resourceId` →
  no required permissions → public, so the link is visible to everyone.

Columns/fields shown: 사진 · 이름 · 성별 · 출생연도 · 중성화 · 현재 거주지 · 입양가능 · 건강상태
(`sickness`).

### Rationale / scope

Owner-requested feature (veered from the finalize-before-mobile task queue). Reuses the
existing server-read data path, filter util, and detail modal rather than adding new data
plumbing. The desktop table doubles as the "spreadsheet-like" scan view; the mobile card
grid is the "card view" the owner preferred — one filter bar + data source drives both.

### Verified

`npx tsc --noEmit` clean; `npm run test:smoke` 25/25. Browser-verified on desktop
(`localhost:3000/pages/cats`): live data (21 present cats + 11 별냥이/행방불명 behind the
toggle), all 8 columns, sortable headers, thumbnails, dwelling→title resolution, the filter
panel, and the `CatInfo` modal opening on row click. **Mobile card layout is markup-in-place
but visually unverified** — `resize_window` was flaky (the §4 mobile-tooling decision), so
the 2-col card render awaits that pass.

## 2026-07-03 — Public hand-rolled-button sweep (→ shared `<Button>` primitive)

**Area:** public user-facing components (replies, signup/login, mypage, video album,
nav, mountain selector, feeding-spots) · **Type:** enhancement (design) · **Branch:** `dev`

### Change

Continuation of the Phase C cross-cutting item (PROJECT_PLAN §5 "deferred public
hand-rolled-button sweep"). Converged off-brand hand-rolled buttons/links onto the shared
`<Button>` primitive + brand tokens across the **live public** surface:

- **Filled CTAs → `<Button variant="primary">`:** `ReplyForm` (댓글 작성 + 취소→secondary),
  `SignupForm` (both `bg-yellow-500` / `bg-green-500` submits), `mypage` (5 buttons:
  nickname save, email reauth/verify, phone SMS/verify — `bg-blue-500`/`bg-green-500`).
- **Brand color swaps (not buttons):** `login/page.tsx` active-tab indicator
  (`border-blue-500 text-blue-600` → brand); reply/nav/mypage text-links `text-blue-*` →
  `text-brand-700`; `ReplyButton` blue hover → brand; `MountainSelector` selected-state +
  chevron; `VideoAlbum` "파일" badge `bg-blue-600` → neutral `bg-gray-700` (next to the
  YouTube-red vendor badge); spinners (`mypage`, `FeedingSpotsList`) blue/yellow → brand.
- **Input focus rings** aligned to the canonical `focus:outline-none focus:ring-2
focus:ring-brand-300` pattern (from `ui/Input` + the shipped 동참 form) in `SignupForm`
  - the two butler forms — replaces the native blue focus outline with a brand ring.
- `ReplyForm` login notice `bg-yellow-50` → brand-tinted card + 해요체.

### Rationale / scope

Same fix-once logic as the butler pass: shared components render on both surfaces, and
tap-target sizing / focus rings now live in the `<Button>` primitive, so the §4 mobile
pass inherits them centrally. **Deliberately left as-is:** admin forms (§5 admin
workstream), `SocialLoginButton`'s Kakao `#FEE500` vendor color, semantic success/warning
states (green "sent" boxes, `⚠️` note cards, `ui/Alert` variants), and dead/test-only
components (`PostItem`, `auth-test`, `*Demo`, `*Debug`, `ProviderManagement`).

### Verified

`npx tsc --noEmit` clean; `npm run test:smoke` 25/25 (after each chunk). Browser-verified
the public `/login?tab=signup`: brand-amber active-tab indicator (was blue), brand-gradient
submit button (was flat yellow), and the native-blue focus outline replaced by the brand
ring. Reply/mypage authenticated states are login-gated (owed to the standing verification
list). _Note: Next dev HMR corrupted the `/login` route into transient 404s after rapid
edits — cleared by a clean dev restart; not a code issue (tsc/smoke green, curl 200 on a
fresh server)._

---

## 2026-07-03 — Phase C: 집사메뉴/butler brand restyle + cross-cutting button cleanup

**Area:** public 집사메뉴 (`butler_talk` / `butler_stream` + `new/`), `PostList`,
`NewPostForm`, `NewButlerTalkForm`, `globals.css` · **Type:** enhancement (design) ·
**Branch:** `dev`

### Change

Closed the last two `[ ]` items of redesign **Phase C** (per the "finalize shared surface
on desktop before the §4 mobile pass" sequencing decision — PROJECT_PLAN §12):

- **Butler pages restyled** (the one un-brand-audited public surface): `PostList`
  pagination de-gradient-ified to match the 공지 pattern (current page = solid `bg-brand`,
  dropped `border-yellow-500`; prev/next = neutral secondary + `이전`/`다음`), English
  "No posts yet." → 해요체 brand card. Both clients' "새글 작성" hand-rolled brand→accent
  gradients and both forms' submit buttons → shared `<Button variant="primary" size="lg">`.
  The two forms' `bg-yellow` "login required" notices → brand-tinted cards (`bg-brand-50
ring-brand-100`) + 해요체. All input `focus:ring-blue-500` rings → `ring-brand-300`, the
  `bg-blue-100` "모두 선택" chip → brand, the `text-blue-600` checkbox → `accent-brand-500`.
  Stripped stale `data-oid` across the 5 components + 4 butler page wrappers.
- **Cross-cutting:** removed the **dead** `@layer components` btn block (`.btn` /
  `.btn-primary { bg-blue-600 }` / `.btn-secondary`) from `globals.css` — grep-verified
  referenced by no JSX; deleting it eliminates the last legacy blue from the codebase.
  `Navigation.tsx` was already brand-clean.

### Rationale / scope

These are shared code paths that render identically on desktop + mobile; finalizing the
brand/copy/primitive here now means the §4 mobile pass only tunes responsive layout instead
of re-doing the restyle. Converting buttons to the shared `<Button>` primitive means mobile
inherits correct tap-target sizing / focus rings centrally rather than per hand-rolled button.

### Verified

`npx tsc --noEmit` clean; `npm run test:smoke` 25/25. Browser-verified the logged-out
login-notice brand card on `/pages/butler_talk/new` (brand-50 card, brand-700 heading,
해요체 body). Auth-gated states (list/pagination, authenticated form + submit, the "새글
작성" list button) not driven — no sign-in in automation; owed to the standing auth-gated
verification list.

---

## 2026-07-02 — Admin post editing (all post types)

**Area:** admin posts (`/admin/posts`, `AdminPostList`) · **Type:** enhancement ·
**Branch:** `dev`

### Change

`AdminPostList.handleEdit` was a stub (`alert('Edit functionality coming soon!')`) —
admins could only create + delete, so fixing a typo meant delete-and-recreate. Added a
real edit flow shared across all four post types (급식현황 / 집사톡 / 공지사항 / 입양홍보):

- `updatePost(postId, postData)` added to the `IPostService` interface and implemented in
  the three services that lacked it (`post-service`, `butler-talk-service`,
  `adoption-service`; `announcement-service` already had one). All use `updateDoc` +
  `updatedAt`, so the merge **preserves** untouched fields (tags, `showInModal`, username,
  date, replyCount, …).
- New shared `components/EditPostForm.tsx` (loads the post via the matching service's
  `getPostById`, edits **title / 내용 / image URLs / video URLs**, recomputes
  `thumbnailUrl`+`mediaType` on save) + route
  `app/admin/posts/edit/[postType]/[postId]/page.tsx` (gated by the `/admin` `AdminAuth`
  layout). The Edit button now routes here (`serviceFor(postType)` picks the collection).

### Rationale / scope

Top follow-up from the adoption-promotion hand-off (§5 #1). Scope is deliberately
**text + media links**, not new media _file_ uploads: the per-type create forms upload
differently (signed URLs for feeding, direct Storage for announcements/adoption, YouTube
for video), so unifying uploads in one edit form would be fragile. Adding a brand-new
media file stays in the create flow; the edit form covers the actual pain point (typos and
broken/removable media links) and works uniformly for every type.

### Verified

`npx tsc --noEmit` clean · `npm run test:smoke` 25/25. Browser verification of the live
edit round-trip is pending (admin-gated).

---

## 2026-07-02 — 입양홍보 posts + per-cat 입양정보

**Area:** adoption promotion (`/pages/adoption`, `/admin/posts`) + cat detail/management ·
**Type:** enhancement · **Branch:** `dev` ·
**Plan:** `docs/planning/adoption-promotion-and-cat-adoption-info-plan.md`

### Change

Two related pieces, both modeled on the existing **announcements** feature:

**(A) 입양홍보 posts** — a new admin-authored / publicly-read post type (collection
`posts_adoption`).

- New `FirebaseAdoptionService` (`services/adoption-service.ts`) + `getAdoptionService()`;
  new `posts_adoption` Firestore rule (read:true / write:`manage-posts`) — ⚠️ **owner must
  deploy rules**.
- Admin `/admin/posts` **입양홍보 tab is now functional** (was a "준비 중" placeholder):
  `AdminPostList` extended with the `adoption_promotion` type (via a new `serviceFor()`
  helper replacing 3 repeated service ternaries; no reply UI), plus a "새 입양홍보 작성"
  button → `/admin/adoption/new` (`NewAdoptionForm`, a copy of the announcement composer
  minus the 팝업 toggle).
- Public: a "새로운 입양 소식" section on `/pages/adoption` (`AdoptionPromotionClient`),
  live-fetched, no auth gate.

**(B) per-cat 입양정보** — new optional `Cat.adoption_info`. Shown as an 입양정보 block in
the `CatInfo` detail modal when non-empty (so it appears in the adoption gallery + map
flows), and editable via a new textarea in the individual cat management form
(`/admin/cats`), next to the 입양 가능 toggle.

### Rationale

Owner request — publish "new cat available for adoption" news and record adoption-specific
info per cat. Reused the announcements pattern end-to-end. **Deviation:** the public feed
does **not** reuse `PostList` (its detail link is hardcoded to `/pages/posts/:id`, which
resolves only the feeding collection → would 404 for adoption posts); instead it uses
self-contained inline cards like `AnnouncementClient`, with video thumbnails opening
YouTube directly. (See the plan doc's "Deviation" note.)

### Verified

- `npx tsc --noEmit` clean · smoke 25/25.
- Browser + write paths **pending**: writing posts needs the new Firestore rule deployed;
  `/admin/posts` and `/admin/cats` are admin-gated. To verify: deploy the rule, then in a
  browser create a 입양홍보 post (admin) → confirm it shows on `/pages/adoption`; set a cat's
  입양정보 → confirm the 입양정보 block in that cat's modal.

**Area:** cat status (`CatGrid.tsx`, `/admin/cats/page.tsx`, `CatInfo.tsx`) ·
**Type:** enhancement · **Branch:** `dev`

### Change

Added a new cat `status` value **쉼터냥이** for cats in temporary shelter/foster
care waiting for adoption — the transitional state between 산냥이 (mountain) and
집냥이 (home). Name follows the existing `[state]냥이` convention (쉼터 = shelter).
Inserted in journey order (산냥이 → **쉼터냥이** → 집냥이 → 별냥이 → 행방불명) at every
place statuses are enumerated:

- `CatGrid` `STATUS_OPTIONS` — selectable in the spreadsheet status column.
- `/admin/cats` legacy add/edit form `<select>`.
- `/admin/cats` status badge — **amber** chip (`bg-amber-100 text-amber-800`),
  distinct from the other statuses and from the brand "adoptable" badge.
- `CatInfo` status-emoji map — **🫶** (heart-hands / "adopt with love").

Filters pick it up automatically (`getUniqueStatuses` derives statuses from
data). No stats tile added (the `/admin/cats` stat row is a fixed 3-tile layout).

### Rationale

Owner request — a status for cats staying in shelters awaiting adoption. `status`
is stored as the literal Korean string, so existing records are unaffected (new
value only). The `쉼터냥이` name and 🫶 icon were the owner's choices.

### Verified

- `npx tsc --noEmit` clean · smoke 25/25.
- Browser check pending (admin-gated).

---

## 2026-07-02 — Redesign video-album tiles (caption footer + cat-name tags)

**Area:** album tiles (`src/components/album/MediaTile.tsx`,
`src/app/pages/video-album/page.tsx`) · **Type:** enhancement · **Branch:** `dev`

### Change

Reworked the video-album (`/pages/video-album`) tile layout, which felt clunky —
a dense grid of thumbnails with description + date/duration crammed into an
overlay on the image.

- **`MediaTile` gained an opt-in `layout` prop** (`'overlay'` default | `'below'`)
  plus `tags?: string[]`. The shared image / hover / corner-badge markup was
  refactored into one `media` fragment reused by both layouts (no duplication);
  the default overlay layout — and the **photo album** that uses it — is
  unchanged.
- **`layout="below"`** puts the caption on a **white footer shelf** under a clean
  16:9 thumbnail: up to **two** cat-name chips (brand-gold `bg-brand-100`) from
  `tags`, then a gray **`+N`** chip for the remainder (`tags.length - 2`), then
  date + duration in muted gray.
- **Video page** switched to `layout="below"` with `tags={video.tags}` and a
  roomier grid (`gap-x-4 gap-y-6`). The on-tile **description was dropped** (still
  shown in the video player) to keep the card clean.

### Rationale

Owner request — the overlay-on-image tiles read as a busy wall with no bottom
breathing room. Moving the caption to a footer declutters the thumbnail, gives a
natural shelf (the requested "margin below each tile"), and provides a clean home
for the cat-name tags. Kept as an opt-in `MediaTile` mode so the photo album is
untouched. Two-name display (owner's call — there's room for two + the `+N`).

### Verified

- `npx tsc --noEmit` clean · smoke 25/25.
- Browser check pending (Chrome extension was disconnected; note the local
  dataset has empty albums, so `localhost` may show the empty state — best seen
  against real data).

---

## 2026-07-02 — Enhance the cat-management grid header (color + sort affordance)

**Area:** admin cat grid (`src/components/admin/cat-grid/CatGrid.tsx`,
`src/constants/adminStrings.ts`) · **Type:** enhancement · **Branch:** `dev`

### Change

Two visual improvements to the `react-datasheet-grid` spreadsheet on the cat
management page (`/admin/cats`):

- **Header row color.** Tinted the whole header row **brand-100 gold**
  (`#fef9c3`) with a **2px brand-300 bottom border** (`#fde047`), via a
  `.dsg-cell-header` override in the component's existing `<style jsx global>`
  block. Reads clearly as a header (gutter included).
- **Sort affordance.** Every sortable column header now shows a persistent sort
  glyph (`react-icons/fa`): a faded gray `FaSort` (double arrows) when unsorted —
  signalling the column is clickable/sortable — and a solid brand-gold
  `FaSortUp`/`FaSortDown` on the active column showing direction. Added a
  `클릭해서 정렬` tooltip + `aria-label` per header; the label truncates so the
  right-aligned icon stays put. (Previously only the _active_ column showed an
  icon, so unsorted columns gave no hint they were sortable — replaced the old
  `FiChevronUp`/`FiChevronDown` indicator.)

New string: `adminStrings.catGrid.sortHint = '클릭해서 정렬'`.

### Rationale

Owner request — make the header legible and make the click-to-sort affordance
discoverable. Purely presentational; sort logic (`handleSort`/`sortCats`) is
unchanged.

### Verified

- `npx tsc --noEmit` clean · smoke 25/25.
- Browser check pending (page is admin-gated; owner to eyeball `/admin/cats`).

---

## 2026-07-02 — Harden auth so a failed Firestore read no longer signs users out

**Area:** auth (`permission-service.ts`, `lib/auth/admin.ts`, `LoginForm.tsx`,
`AdminAuth.tsx`, `strings.ts`) · **Type:** enhancement (defensive) · **Branch:** `dev`

### Change

`checkUserExists` and `isAdmin` used to `catch` a Firestore read error and return
`false`, making a _blocked/denied/offline_ read indistinguishable from a
_definitively absent_ user/permission. Both now **log and re-throw**. Callers
updated:

- `LoginForm.handleCheckUser` — only signs out on a definitive `false` (read
  succeeded, no user doc). A thrown read now keeps the session and shows a
  retryable error (`errors.verifyFailed`) instead of the old blanket
  "let-them-in" or a spurious sign-out.
- `AdminAuth` — a thrown admin check renders a new "권한을 확인하지 못했어요" screen
  with a 다시 시도 (retry) button, distinct from the "접근 권한이 없어요" access-denied
  (which now means the check actually ran and said no).

`butler_stream` / `butler_talk` already catch → `false`, so their behavior is
unchanged.

### Rationale

Surfaced while investigating a force-logout (see DEBUG*LOG — the \_actual* cause
was cross-tab sign-out, not this). This path was **not** the cause, but it is a
real latent fragility: a genuinely blocked/denied `users/{uid}` read on first
login could otherwise sign a valid user out. Kept as hardening (owner's call) and
aligns with the repo's log-and-reraise convention (no silent swallow).

### Verified

- `tsc --noEmit` clean · smoke 25/25.
- The blocked-read paths are environmental (extension) and not reproducible in
  automation; the change is logic-level. Happy-path login/admin unaffected.

---

## 2026-07-02 — Add idle session timeout to the admin CMS (2 hours)

**Area:** admin auth (`src/components/admin/AdminAuth.tsx`, new
`src/hooks/useIdleTimeout.ts`) · **Type:** enhancement · **Branch:** `dev`

### Change

Added an **idle** session timeout to the `/admin` CMS: after **2 hours** of no
interaction, an authenticated admin is signed out and returned to the admin login
screen with a Korean notice ("2시간 동안 활동이 없어 자동으로 로그아웃되었어요. 다시
로그인해 주세요."). Introduced a reusable `useIdleTimeout({ timeoutMs, onTimeout,
enabled })` hook that records activity via a throttled timestamp and polls once a
minute (rather than resetting a timer on every mousemove/scroll); fires at most
once per idle window and re-arms on activity.

### Rationale

Firebase Auth has no built-in session timeout — the refresh token persists
indefinitely under the default local persistence — so a walk-away admin stays
signed in forever. The admin CMS (write access to cats/media/posts + member/role
management) is the real risk surface, so the timeout is **admin-scoped** via the
hook's `enabled: !!user && isAdmin` flag — regular members and the public site are
untouched. **Idle (not absolute)** and the **2-hour** threshold were the owner's
choices (covers walk-aways without nagging active editing). Sign-out failures in
the background timer log without rethrowing, matching this file's existing
fire-and-forget `handleLogout`.

### Verified

- `npx tsc --noEmit` clean · smoke 25/25.
- **Browser (owner-assisted):** with the timeout temporarily set to 8s (and the
  hook's check interval to 1s), the owner logged into `/admin` and stayed idle;
  the CMS auto-signed them out to the login screen and rendered the timeout
  notice. Temp values restored to 2h / 60s afterward (no temp markers remain).

---

## 2026-07-02 — Add show/hide password toggle to the login modal

**Area:** `LoginForm` (`src/components/LoginForm.tsx`, `src/constants/strings.ts`) ·
**Type:** enhancement · **Branch:** `dev`

### Change

Added a show/hide toggle to the email/password field in the login modal. An eye
icon (`EyeIcon`/`EyeSlashIcon` from `@heroicons/react/24/outline`) sits inside the
input on the right; clicking it flips the input `type` between `password` and
`text` via a new `showPassword` state. The button carries Korean aria-labels
(`비밀번호 표시` / `비밀번호 숨기기`, added to `strings.login.form`) and `aria-pressed`
for accessibility. The input got `pr-10` padding so text doesn't run under the
icon. Scoped to the login modal only — `SignupForm` / `AdminAuth` / `mypage`
password fields were left unchanged.

### Rationale

Owner request; lets users confirm what they typed before submitting. Reused the
existing `@heroicons/react` dependency and the `strings` i18n table rather than
hardcoding text.

### Verified

- `npm run typecheck` (`tsc --noEmit`) clean.
- Browser verification of the toggle pending.

---

## 2026-07-02 — Change site (browser-tab) title to 산냥이집냥이

**Area:** root layout (`src/app/layout.tsx`) · **Type:** enhancement · **Branch:** `dev`

### Change

Changed `metadata.title` from the English `'Mountain Cats'` to `'산냥이집냥이'`, so
the browser-tab / SEO `<title>` matches the Korean-first brand. The header `<h1>`
already read 산냥이집냥이; this aligns the tab title with it. The `description`
metadata and `<html lang>` were left untouched (out of scope). The remaining
"Mountain Cats" strings elsewhere are YouTube channel-title / upload-description
values, not the site title, so they were left alone.

### Rationale

Korean-first platform — the tab/SEO title should not be English. Owner request.

### Verified

- `npm run typecheck` (`tsc --noEmit`) clean.

---

## 2026-07-02 — Add `tsc --noEmit` type-check to the pre-commit hook

**Area:** tooling (`.husky/pre-commit`, `package.json`) · **Type:** enhancement · **Branch:** `dev`

### Change

Added a project-wide type-check to the pre-commit gate. Previously pre-commit ran
only TruffleHog (secret scan) + `lint-staged` (ESLint `--fix` + Prettier) — no
type checking. Added a reusable `typecheck` script (`tsc --noEmit`) to
`package.json` and a final pre-commit step (`npm run typecheck`) after
`lint-staged`.

### Rationale

Type errors were only caught by the manual `npx tsc --noEmit` gate, not enforced
on commit. Run as its **own** hook step (not through `lint-staged`) because
`tsc --noEmit` needs the whole project graph — a change in one file can break
another's types, so a per-staged-file scope would give false passes. Placed
**after** `lint-staged` so formatting fixes apply first and the type-check is the
final gate.

### Verified

- `npm run typecheck` runs clean (no type errors), ~10s wall time.
- `npx tsc --noEmit` clean · smoke 25/25.

---

## 2026-07-02 — Emphasize capital letters in the About subtitle (MOHOCATS wordplay)

**Area:** `about` page (`/pages/about`) · **Type:** enhancement · **Branch:** `dev`

### Change

The 부제 embeds a wordplay — **MO**untain **HO**use **CATS** → MOHOCATS. Added a
render-time helper (`emphasizeCapitals`) that wraps runs of uppercase Latin
letters in `font-semibold text-brand-600` (brand gold), leaving lowercase/Korean
untouched, so the acronym pops. Content-agnostic: it emphasizes whatever capitals
the admin subtitle contains.

### Rationale

Owner request; makes the intentional MOHOCATS wordplay legible. Purely
presentational — splits on `[A-Z]+` runs so consecutive capitals share one span.

### Verified

- `npx tsc --noEmit` clean · smoke 25/25.
- Browser (`/pages/about`): capitals render gold + semibold ("MOuntain cats,
  HOuse CATS (MOHOCATS)"), lowercase stays muted gray.

---

## 2026-07-02 — Display the 부제 (subtitle) on the About/intro page

**Area:** `about` page (`/pages/about`) · **Type:** fix/enhancement · **Branch:** `dev`

### Change

The About page rendered only `aboutData.title`; the `subtitle` (부제) — loaded into
`aboutData` and editable in the admin About-content editor — was never displayed.
Added a subtitle `<p>` between the title and the brand accent bar, rendered only
when `aboutData.subtitle` is set (`text-lg text-gray-600`).

### Rationale

The field was already fully wired (admin editor → Firestore/JSON → `aboutData`),
so it was owner-managed content that simply had no render site. This just surfaces
existing content; no data/model change.

### Verified

- `npx tsc --noEmit` clean · smoke 25/25.
- Browser (`/pages/about`): subtitle now renders under the title, above the accent
  bar. (The subtitle text is admin-managed content, editable in the About editor.)

---

## 2026-07-02 — Remove 문의 (contact) link from the footer

**Area:** `Footer` · **Type:** removal · **Branch:** `dev`

### Change

Removed the **문의** link (→ `/pages/contact`) from the site footer at the owner's
request, along with the now-unused `next/link` import. The `/pages/contact` page
itself is untouched (still reachable elsewhere) — only the footer nav item was
removed.

### Rationale (incl. compliance check)

The only compliance-relevant "contact" is the **privacy officer (CPO) public
contact**, which belongs **inside the 개인정보처리방침 page**, not the footer 문의
link (`docs/compliance/compliance-plan.md` §CPO). So the footer 문의 is **not** a
compliance requirement and was safe to drop. The footer's two remaining items
(개인정보처리방침 / 이용약관) are still disabled placeholders pending the compliance
workstream.

### Verified

- `npx tsc --noEmit` clean · smoke 25/25.
- Browser: footer now reads "산냥이집냥이 · 비영리 커뮤니티 · 개인정보처리방침 ·
  이용약관 · © 2026" — no 문의, no `/pages/contact` link.
