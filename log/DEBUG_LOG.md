# 산냥이집냥이 — Debugging Log

> A running log of bugs found and fixed, newest first. Each entry captures the
> **symptom**, the **root cause**, the **fix**, and how it was **verified** — so a
> future reader (human or agent) can understand _why_ a change was made without
> re-deriving it from the diff.
>
> This complements — it does not replace — the `docs/handoff/` narrative and
> `docs/planning/` trackers. Log a bug here when the root cause is non-obvious or
> the fix is worth remembering. Keep entries short and concrete.

---

## 2026-08-02 — An uploaded video was recorded as having been filmed the day it was uploaded

**Symptom:** owner-reported. Videos uploaded through the composers came out with a 촬영일
equal to the **upload** date rather than the day they were actually filmed.

**Root cause:** one fallback in `POST /api/upload-youtube/complete`, where the `cat_videos`
record is written:

```ts
createdTime: createdTime ? calendarDateToInstant(createdTime) : new Date(),
```

`createdTime` is 촬영일, and the composers derive it by regex-matching the **filename**
(`parseRecordingDateFromTitle`). When nothing parses they send `''`, which is falsy — so the
route substituted the current instant, i.e. the moment of upload. Android and KakaoTalk names
(`VID_20260315_101530.mp4`) parse, so the bug is invisible for roughly half of likely sources;
**iPhone names never parse** (`IMG_1234.MOV` carries no date), and those were the reports.

🔑 **Why this was worse than a cosmetic slip, and why it was hard to notice.** The same request
sends YouTube **no `recordingDate` at all** in this case — the sibling route only sets
`recordingDetails` when a date was supplied. So Firestore claimed a recording date that YouTube
did not have, and since **YouTube is the source of truth for video data** (principle adopted
2026-07-26), the next metadata sync overwrites `createdTime` with `null`
(`refresh-video-metadata`). The wrong date therefore **disappears later**, which reads as a
second, unrelated bug ("the date vanished") rather than as evidence of the first. Neither stage
logs anything: both writes succeed, and a fabricated date is indistinguishable from a real one.

🔑 **The owner's observation found a second site.** They noted the bug did **not** affect
집사톡 — which turned out to be the whole explanation. The composers split across two hooks:
집사톡 / 집사게시판 (`useRichContentForm`) have had a **촬영 날짜 field** from the start, so a
date is nearly always supplied; 공지사항 / 입양홍보 (`useSimpleContentForm`) had **none**, so
nothing was ever sent. Following that asymmetry turned up the **same fabrication in the image
path** (`uploadStrategies.ts`, `createdTime: '' → new Date()`), hit by the same two composers.
⚠️ **That one is worse:** `cat_images` has no upstream — Firestore **is** the source of truth
for photos — so unlike videos, nothing ever corrects it and the wrong date simply stays.

**Fix, three parts:**

1. **Videos** — store `null` when no recording date is known, the same value the sync writes
   for a video YouTube has no `recordingDate` for, so the upload path and the sync path now
   agree instead of fighting.
2. **Photos** — the identical change in the signed-URL image strategy.
3. **The gap underneath both** — 공지사항 / 입양홍보 gained a **촬영 날짜 field**
   (`forms/RecordingDateField.tsx`, new), auto-filled from the filename exactly as 집사톡 does,
   with videos taking precedence over images and a typed value never overwritten. Without it
   the fix alone would have left those two composers unable to record a date at all.

The UI already renders the empty case honestly (`parseDate` → `날짜 없음`), which also prompts
someone to set the date instead of hiding the gap behind a plausible-looking one.

⏸️ **Deliberately not fixed here:** that 촬영일 is guessed from the _filename_ at all, when it
should be read from the file's own metadata. That is a separate, **owner-deferred** item (see
HANDOFF open threads) — this change only stops the fabrication. ⚠️ The neighbouring
`uploadDate` / `publishedAt` fields are **correctly** `new Date()`: 게시일 genuinely is "now"
for a fresh upload, and the album sorts on it (a null there caused a crash once —
DEBUG_LOG 2026-07-26). The fix must not be over-applied to them.

**Verified.** New `tests/unit/uploadYouTubeComplete.test.ts` (5 cases) asserts directly on the
written document — null for a missing date, null for the `''` the composers actually send, UTC
midnight for a supplied calendar date (no KST shift), that `uploadDate` still stamps the upload
moment, and that the permission gate refuses before any write. Two more cases cover the image
strategy in `uploadStrategies.test.ts`. **Both were mutation-checked:** restoring each
`new Date()` fallback fails exactly the date cases and leaves the rest green, so they are not
passing incidentally. The new field is driven in a **real browser** by 3 cases in
`tests/e2e/admin/posts.spec.ts` (auto-fill from a dated filename; stays empty for
`IMG_1234.MOV`; a typed value survives a later file pick). tsc 0, smoke 34, unit 103, e2e
admin/posts 12 passed.

---

## 2026-08-01 — the 이 냥이 링크 chip did nothing at all on desktop

**Symptom:** owner-reported, within minutes of the chip shipping — clicking it on desktop does
nothing. No copy, no dialog, no error, no change to the button.

**Root cause: the capability check asked the wrong question.** The chip gated on
`typeof navigator.share === 'function'` — i.e. _"does this browser have a share sheet"_ — when
the question that matters is _"is a share sheet the right and usable affordance here"_. Desktop
Chrome answers yes to the first and no to the second. Measured in Chrome on macOS with a real
(trusted) click, wrapping both APIs to record their outcome:

| call                                 | outcome                                              |
| ------------------------------------ | ---------------------------------------------------- |
| `navigator.share({title, url})`      | **rejected — `NotAllowedError — Permission denied`** |
| `navigator.clipboard.writeText(url)` | resolved                                             |

🔑 **And the failure was engineered to be silent.** The handler deliberately swallows
`AbortError`, because on a phone that means the visitor dismissed the share sheet — a decision,
not a fault (see §10c C3). Where a desktop sheet opens and closes, the same `AbortError` arrives
and the button correctly says nothing. Combined with a `navigator.share` that refuses to run at
all, the result is a control that cannot fail _visibly_: exactly "nothing happens".

**Fix:** gate the share sheet on `(pointer: coarse)` as well as its existence — touch devices,
which is both where it works and where it earns its keep (one tap into a KakaoTalk chat instead
of copy-switch-paste). Desktop copies to the clipboard, which measurably works. The label follows
the same predicate, so it now reads 링크 복사 on desktop and 링크 공유 on a phone.

**Verified** with a real trusted click on desktop (a scripted `.click()` cannot prove this — it
grants no transient activation, which is the very thing in question): the label sequence recorded
by a MutationObserver is `🔗 링크 복사 → ✅ 복사했어요 → 🔗 링크 복사`. A new e2e case pins the
branch itself — share on a coarse pointer, clipboard otherwise — so this cannot regress quietly.

📌 **The lesson worth keeping: feature detection is not affordance detection.** An API existing
does not mean the platform will honour it, and a control whose only failure path is silent will
present as broken rather than as failed. ⚠️ **Both of my earlier verifications missed this**
because they stubbed `navigator.share` — the stub always resolved, so the real refusal never
appeared. A stub proves your code's branches; it cannot prove the platform runs them.

---

## 2026-08-01 — the new `?cat=` deep link kept erasing itself, then stopped opening at all

**Context:** building the `?cat=<id>` cat deep link (PROJECT_PLAN §10c). Two stacked traps, both
found by driving a browser — neither is visible in the diff, and the first is invisible in any
test that asserts immediately after the click.

**Symptom 1 — the URL flicked to `?cat=…` and reverted about a second later.** Sometimes the
modal closed with it. A check run 800 ms after opening passed; the same check at 2 s failed.

**Root cause 1:** the arrival path does two things — strips the param with `replaceState` (so
closing has a clean entry to fall back to), then opens the modal, whose `useModalLayer` entry
pushes the param back. Doing both **in one React commit** loses a race with Next itself:
`next/dist/client/components/app-router.js` re-asserts the router's **canonical URL** onto
history in an effect that runs _after_ the page's own effects, and the canonical it writes was
computed _before_ our push. So Next's write lands last and wipes `?cat=` off. `history.state`
loses `mohocat_modal` with it, so the modal's close path then finds no entry to pop and the URL
desyncs from what is on screen. 🔑 **Confirmed by stack trace, not inference** — wrapping
`history.replaceState` and printing the caller pointed straight at `app-router.js:105`, after
the same evidence had wrongly implicated our own strip.

**Fix 1:** defer the open by one task (`setTimeout(…, 0)`), so the router settles on the
stripped URL before the modal pushes.

**Symptom 2 — after fixing that, the deep link opened nothing at all.** The param was stripped,
then the page just sat on the full list. Twice, for two different reasons:

**Root cause 2a:** the first attempt used `requestAnimationFrame`. ⚠️ **rAF does not fire in a
background tab** — and the browser under automation was not the focused window, which is also
exactly how a real visitor opens a shared link (cmd-click, "open in new tab"). The callback was
simply never called. `setTimeout` is throttled in background tabs but still runs.

**Root cause 2b:** the scheduled open was cancelled in the effect's cleanup. The effect re-runs
whenever the router hands down a fresh `cats` array; cleanup cancelled the pending open, and the
run-once guard then swallowed the retry — so the deep link silently did nothing. The schedule is
deliberately **not** cancelled now.

**Verified:** in Chrome against a **production build** (dev alone was not enough — the two
diverged during this work): arrival opens and the param holds at 3.5 s; close clears it without
leaving the site; click sets it; back closes and clears it and releases the scroll lock. Plus
`tests/e2e/public/cat-deep-link.spec.ts`, 5 cases × desktop + mobile, all green.

📌 **The general lesson: any URL write that is not Next's own is racing Next's canonical URL.**
The patched `history.pushState` _does_ update that canonical, but asynchronously — so two URL
writes in one commit are unsafe. One write per commit is fine, which is why the ordinary
click-to-open path never showed this.

---

## 2026-08-01 — videos deleted from YouTube kept their tile in the public 영상첩

**Symptom:** owner-reported — a couple of videos were deleted on YouTube, and the public
영상첩 still showed tiles for them, filled with YouTube's grey "unavailable" placeholder.

**Root cause:** `syncVideos` (`services/media-albums.ts`) is **import-only**. It computes one
set difference and acts on it:

```js
const newVideos = youtubeVideos.filter((video) => !existingYouTubeIds.has(video.id));
```

YouTube minus Firestore → import. Nothing ever computes the other direction, so a `cat_videos`
record outlives its video indefinitely, and every surface reading that collection keeps
listing it.

🔑 **Why the obvious fix is a trap, and what this cost in design.** "Delete anything not in
the channel listing" would be wrong, because `fetchChannelVideos` reads the uploads playlist
with the **public API key** — and a video made **private** disappears from that listing
identically to a deleted one. Auto-pruning would therefore destroy the record, and with it the
cat tags, 설명 and playlist membership the tagging queue exists to produce, the moment somebody
flips a video to private — an action that destroys nothing on YouTube's side. Same shape as the
2026-07-26 "YouTube owns video data" rule, aimed at the one thing YouTube does **not** own:
our tags.

**Fix — label, then let a human decide (owner chose this over auto-prune):**

- New `POST /api/admin/video-availability` (gated `manage-video`) asks YouTube with the
  **owner's OAuth credential**, which _can_ tell the two apart: a private video comes back with
  `privacyStatus: 'private'`, a deleted one does not come back at all. It writes
  `youtubeStatus: 'available' | 'private' | 'missing'` and never deletes anything.
- 🚨 **Safety valve:** if YouTube acknowledges _zero_ of the submitted ids, that is a
  credential/scope/quota failure, not a vanished channel — the route refuses and writes
  nothing, rather than flagging every video and emptying the public album in one call.
- Public reads (`getCatVideos`, `getAllVideos`) drop `missing` and `private`. ⚠️ **Filtered in
  memory, deliberately not as a `where` clause**: records predating the check have no
  `youtubeStatus` field, and a Firestore inequality would exclude exactly those — i.e. every
  existing video. Absent = watchable, so nothing disappears until a check has judged it.
- `/admin/tag-videos` loads with `includeUnavailable: true` and grows a panel listing the
  missing ones with a 기록 삭제 button (confirm dialog spells out that tags go too). Private
  ones get a one-line note — they return on their own if re-published.
- The 동기화 flow calls the check as a third step, and a failure there is logged but never fails
  the sync, since the metadata refresh before it has already succeeded.

**Verified:** new `tests/e2e/public/video-availability.spec.ts` (a `missing` record stays out of
the public album) + `tests/e2e/admin/video-cleanup.spec.ts` (the CMS lists it and offers
deletion), on fixture `test-vid-03`. The existing `admin/tag-videos` characterization suite
passes with its count updated **2 → 3** — the CMS legitimately sees one more than the public
album now, which is the whole design. tsc 0, smoke 33/33, unit 122/122, full e2e 169 passed.

⏳ **Not covered by any test, and cannot be:** the classification itself needs real YouTube
OAuth, which the emulator harness has no credential for — the same reason P5.4 is a manual
pass. What is pinned is the half the symptom lived in: given a labelled record, who shows it.
**Owner action:** the existing records are unlabelled until 📺 YouTube와 동기화 is run once on a
deployed environment; the ghosts then appear in the new panel for deletion.

📌 **Measured while gating this, not caused by it:** `api/tenant-isolation.spec.ts`'s cats and
points cases fail under full-suite parallel load and pass in isolation — **twice**. Confirmed
pre-existing by re-running the full suite with the 2026-08-01 long-polling change temporarily
disabled: the same two failed. Add them to the known timing-sensitive set alongside the 동참
pair; do not chase them as a media regression.

---

## 2026-08-01 — 공지사항 was empty, missing, or untagged for 30 seconds: a Firestore transport probe waiting out its timeout

**Symptom:** owner-reported on Safari, three faces of one problem. (1) Opening a post showed
its tags and 설명 late or never. (2) Returning to the 공지 list said _아직 등록된 공지사항이
없어요_ when there are four posts. (3) Clicking a post sometimes showed _공지사항을 찾을 수
없습니다_. Reloading fixed all three, which made it look like data loss.

**Root cause — two independent defects, stacked.** The second is why the first was visible.

**A. Firestore waited out a 30-second timeout before every first read.** Measured on Safari
with `console.log` wrapped to stamp `performance.now()`:

```
2208396ms  Fetching announcements...
2208396ms  Starting to fetch announcements   ← 0 ms: adjacent statements, no code between
2238444ms  Query snapshot size: 4            ← 30,048 ms later
2238446ms  everything else                   ← 2 ms
```

The query itself was the last **48 ms**. The 30,000 before it was the SDK's
`detectBufferingProxy` probe — it opens a connection to work out whether anything on the
network buffers its stream, and when the probe gets no answer it does not fail fast, it waits
out the transport timeout, then falls back to polling and succeeds. This SDK caps that
timeout at exactly 30s (`timeoutSeconds > 30` → _maximum allowed value is 30_), matching the
measurement to within 48 ms. ⚠️ **Auto-detect was already on** — `@firebase/firestore` 4.7.3
defaults `experimentalAutoDetectLongPolling` to `true` when unset, so "enable auto-detect",
the usual advice, was a no-op here and was proposed and discarded before shipping.

**B. Every public post surface used its failure state as its loading state.** `posts` was a
bare `any[]` and `post` a nullable value, so _없어요_ / _찾을 수 없습니다_ rendered whenever
the value was empty — including **before the first fetch**, which the SSR HTML proved:
`curl` of both pages returned the failure text in the first paint. During A's 30-second
stall, that is what a reader sat looking at. Compounding it, `getAllPosts` throws and the
caller's `catch` only logged, so `posts` stayed `[]` with nothing to set it again — hence
"only refreshing helps".

**Fix:**

- `services/firebase.ts` — `getFirestore(app)` → `initializeFirestore(app, {
experimentalForceLongPolling: true })` in the browser, skipping the probe entirely. 🔑 **No
  functionality is lost**: this is transport, not feature. `onSnapshot` still pushes live
  updates and the timeout only bounds an _idle_ connection. What it trades is streaming
  efficiency for realtime listeners, of which this app has **zero** — all ~47 read sites are
  one-shot `getDoc`/`getDocs`. ⚠️ Revisit if live listeners are ever added.
- New `hooks/useAsyncData.ts` + `components/ui/AsyncStates.tsx` (`SkeletonList`,
  `ErrorNotice`), applied to the 공지사항 list, the 공지사항 detail page and the 입양홍보 feed —
  the same defect sat in all three. `loading | ready | error` are now distinct, so the empty
  message is unreachable until a fetch really returns nothing, and a failure says
  _불러오지 못했어요_ with 다시 시도 instead of impersonating empty content.
- The detail page also moved from `window.location.pathname` to `useParams()`, and
  `useMediaDetails` gained a `loading` flag so a caption still resolving renders a placeholder
  rather than looking permanently untagged.

**Verified:** the SSR first paint no longer contains either failure string (0 occurrences,
was 1 each). New `tests/e2e/public/post-loading-states.spec.ts` — **3 pass on the fix and all
3 fail when the source is stashed back to the pre-fix state**, which is the check that
distinguishes a net from a decoration. Gates: tsc 0, smoke 32/32, unit 121/121. Browser pass
over all three surfaces against production data.

📌 **Why no error was ever logged, and why the error state is a safety net rather than the
main fix.** Firestore retries network failures internally instead of rejecting, so a broken
connection surfaces as a _hang_, never as a thrown error. That is why the owner's console
showed a clean run with 4 documents returned and nothing red — and why the e2e delays the
response rather than aborting it. The genuinely reachable error cases are permission-denied
and missing-index, not offline.

⚠️ **Still unconfirmed: whether the probe stalls for everyone or only on the owner's network.**
Whatever buffers that connection may be an ISP or proxy rather than Safari itself, so other
visitors may never have hit this. The fix is correct either way, but it wants a Safari pass on
the deployed Preview — the local dev server has no proxy in front of it to reproduce against.

---

## 2026-08-01 — an 입양홍보 post's photos rendered out of proportion with the video beside them

**Symptom:** owner-reported, with a screenshot — in an expanded 입양홍보 card, the 이미지 section
showed the photo in a small bordered box roughly **half** the card's width, floating between
white bars, while the 동영상 section below it filled the full width. Same post, same section
spacing, two completely different sizes.

**Root cause:** two independent things, both from `PostMedia`'s `compact` layout landing on a
surface that isn't a dialog:

1. **Half width** — `compact` lays images out in `md:grid-cols-2`, so a lone photo occupies one
   column while the video (which has no grid) takes the whole row. The 입양홍보 expanded card
   used `compact` only because it is `PostMedia`'s **default**; nothing chose it. The
   announcement detail page — the other full-width surface — already passes `layout="full"`.
2. **The white bars** — inside that half-width cell the `<img>` was `w-full max-h-64
object-contain`. `w-full` forces the element box to the cell width while `max-h-64` clamps
   its height, so `object-contain` letterboxes the picture **inside its own border**. The bars
   are not the layout's padding; they are empty space in the image element.

📌 This is the **third** defect on this surface traceable to the same decision: `PostMedia`'s
`compact` treatment was designed for the popup dialog, and every surface that takes the default
inherits dialog sizing. 2026-07-31 already saw its mirror image — putting `PostMedia` on the
announcement detail page carried the modal's sizing over and shrank previously full-width
photos, which is why the `layout` prop exists. **Pick the layout explicitly at every call
site.**

**Fix:** two lines. `AdoptionPromotionClient` passes `layout="full"`, so photos match the video's
width at their own natural aspect. Independently, `compact`'s image is now sized to the picture
itself (`mx-auto max-h-64 w-auto max-w-full`) instead of stretched to the cell, which removes
the pillarboxing from the popup as well — a landscape photo and a portrait one now both have a
border that hugs them.

**Verified:** in Chrome against production data on `localhost:3000`. `/pages/adoption`, post
expanded: photo and video now render at identical width, each at its own aspect, no bars,
captions unchanged. Popup re-triggered by clearing `sessionStorage.hasSeenAnnouncementModal` and
reloading: the 공지사항 popup keeps its compact two-column layout, with the bars gone. Gates:
tsc 0, smoke 32/32, unit 121/121.

⚠️ **Not changed, owner's call:** in the popup a photo is still narrower than the video beside
it — that is `compact`'s deliberate fit-in-a-dialog design, not the reported bug.

---

## 2026-07-31 — expanding an 입양홍보 post showed no image (and never could, if it had a video)

**Symptom:** owner-reported — the 입양홍보 feed folds each post to 3 lines, and expanding it
"doesn't show the image". 공지사항 showed its media fine.

**Root cause:** `AdoptionPostCard`'s expanded branch rendered **one** thumbnail, chosen with a
ternary: `videoId ? <youtube thumb> : post.thumbnailUrl`. Two separate defects fell out of that
single line:

1. **A post carrying a video never displayed its photos at all** — the video branch won and the
   image branch was unreachable. This is what was reported, because the test post had both.
2. **A post with several images showed only the first**, since it rendered `thumbnailUrl` (which
   `useSimpleContentForm` sets to `imageUrls[0]`) rather than the list.

Both were then rendered at `h-15 w-20` — and `h-15` is not a Tailwind class, so even the one
thumbnail that did appear had no height rule. The whole block was a miniature preview
masquerading as "the expanded post".

**Fix:** the media rendering was extracted from `AnnouncementModal` into a shared `PostMedia`
(every image, then every video, YouTube ones embedded as `iframe`), and the adoption card's
expanded branch now uses it. So 공지사항's popup, 입양홍보's popup and the 입양홍보 feed all
render a post the same way.

⚠️ **Why no test caught it, which is the part worth remembering.** The e2e
`creating an 입양홍보 post with an image publishes it to the adoption feed` asserted
`getByAltText('이미지')` and passed the entire time — the old markup _did_ emit that alt, but
only on the image-only path the spec happened to exercise. The broken path needed a post with
**both** kinds of media, and **no fixture in the repo had any media at all** (`posts_adoption`
was a single text-only post). The assertion was true and the feature was broken: a green test
over the one input that works is not coverage.

**Verified:** new fixture `test-adopt-02` carries two images _and_ a video — the combination
that was broken — and `public/galleries-adoption.spec.ts` asserts both images and the embedded
video appear on expand, then vanish on fold. It fails against the old code by construction.
The YouTube embed is stubbed with `page.route()` so the strict console watchdog does not see a
real network fetch. Full suite **162 passed / 13 skipped / 0 failed**. Also confirmed in the
browser against **production data**: the owner's real post now renders its photo under 이미지
and a playable embed under 동영상.

---

## 2026-07-30 — a one-header hardening silently blocked every image upload (self-inflicted, same day)

**Symptom:** owner-reported from 공지사항 on `dev.mohocats.org` — "video is uploading fine but
images are still not uploading". Video was unaffected because it goes to **YouTube**; only the
image leg touches the Storage bucket.

**Root cause:** the duplicate-filename fix shipped hours earlier signed the upload URL with
`extensionHeaders: { 'x-goog-if-generation-match': '0' }` and had the browser echo that header
on the PUT. The precondition itself was right — it makes GCS refuse an overwrite **atomically**,
closing the check-then-PUT race that a bare `exists()` lookup cannot. But the PUT is
**cross-origin to the bucket**, and `x-goog-if-generation-match` is not a CORS-safelisted
request header, so adding it converted a simple request into a **preflighted** one. The
preflight is answered from the bucket's own CORS `responseHeader` allow-list
(`config/firebase/cors_fbstorage.json`), which lists only `Content-Type` and `Authorization` —
so the browser refused to send the PUT at all. Nothing server-side logged anything: the
request never left the browser.

⚠️ **The same shape as 2026-07-29's bucket-CORS bug, one layer in.** That one was "the bucket
has no CORS"; this one is "the bucket has CORS, but not for the header we just started
sending." Both are invisible to every automated suite — e2e stubs the signed-URL legs because
the emulator cannot sign — and both fail _only_ on a real browser against a real bucket.

**Fix:** removed the header from both ends. The `exists()` → **409** duplicate check stays,
which is what the owner actually asked for ("check the name and refuse a duplicate"); the
narrow race is documented as accepted in the route. Re-adding the precondition is possible but
is a **two-step, ordered** change: add the header to `cors_fbstorage.json`, apply it live with
`APPLY=true CONFIRM_PROJECT=… npm run storage:cors`, _then_ ship the code — in that order, or
image upload breaks again.

**Verified:** a bare `OPTIONS` preflight against the live bucket host, which needs no signature
and writes nothing:

- `Access-Control-Request-Headers: content-type` → `200` **with**
  `access-control-allow-origin/methods/headers`. Browser proceeds.
- `Access-Control-Request-Headers: content-type,x-goog-if-generation-match` → `200` with
  **no `access-control-allow-*` headers at all**. Browser treats it as denied and blocks the PUT.

That asymmetry is the whole bug, and it is reproducible from a terminal in two seconds.
📌 **Probe the bucket host** (`storage.googleapis.com/<bucket>/<object>`), not our API — the
2026-07-29 lesson about verifying the wrong URL applies exactly here. New unit test pins that
the PUT carries `Content-Type` and nothing else, so a future added header fails a test rather
than a deploy.

---

## 2026-07-29 — every video upload over 4.5 MB failed: the file was POSTed through a Vercel function

**Symptom:** uploading a 48 MB video from the 집사톡 composer failed with
`Request Entity Too Large` / `FUNCTION_PAYLOAD_TOO_LARGE`. Owner-reported. The message is
**Vercel's**, not ours — no Korean dialog copy, and a Vercel request id (`icn1::…`) — because
the request never reached our handler.

**Root cause:** `uploadVideoToYouTube` sent the raw file as multipart form data to
`POST /api/upload-youtube`, which buffered it whole (`Buffer.from(await file.arrayBuffer())`)
before streaming it on to YouTube. **Vercel caps a function's request body at 4.5 MB** and
rejects anything larger at the proxy, before the handler runs — so it can be neither caught
nor configured away (no `vercel.json` setting, no plan tier, unchanged by Fluid compute).
4.5 MB is a few seconds of phone video, so in practice _no_ real video could be uploaded
through any of the four composers. Images were never affected: they already go direct to
Storage via `generate-signed-url`, where the server only mints a URL.

⚠️ **The misleading part, and why this went unnoticed for months.** The owner was certain a
much larger video had gone up through 급식현황 on the same Vercel deployment, which made the
cap look like the wrong explanation and sent the first investigation into deployment history
(the app did run on Cloud Run / a home server until 2026-03-04, neither of which caps bodies —
a true fact that explained nothing, since the upload in question postdated it). Re-running the
same upload on 급식현황 reproduced the identical error, which is what finally ruled the
premise out. **Reproducing beat reasoning here**: the code path is shared, so no amount of
reading could have distinguished the two composers — there was nothing to find.

⚠️ Vercel runtime-log retention is **1 hour** (Hobby) / **1 day** (Pro), so a next-day log
hunt would have found nothing either way. And a 413 is rejected at the proxy, so it produces
no function invocation at all — its _absence_ from the logs proves nothing.

**Fix:** the bytes no longer cross our own API. The upload is now a **resumable, direct-to-
Google** three-step flow:

1. `POST /api/upload-youtube` — the server opens a resumable session (metadata only, a few
   hundred bytes) and returns the session URI from Google's `Location` header.
2. The browser `PUT`s the file **straight to Google**. No size ceiling, and no token is
   exposed: the session URI is itself the upload capability.
3. `POST /api/upload-youtube/complete` — the server files the video into its playlists and
   writes the `cat_videos` record, exactly as the old route did after `videos.insert`.

Both routes keep the `manage-video` gate independently — the second one writes Firestore via
the Admin SDK, so it must not trust the first.

📌 **CORS was the load-bearing assumption and was verified before any code was written**, since
the whole approach dies without it. An unauthenticated `OPTIONS` preflight against
`googleapis.com/upload/youtube/v3/videos` returns `access-control-allow-origin` echoing the
caller's origin, `access-control-allow-methods: POST, GET, PUT, PATCH`, and allows
`authorization, content-type, x-upload-content-length, x-upload-content-type`. Google's docs
do not mention browser uploads at all, so this is worth keeping recorded.

**Verified:** tsc 0 · smoke 32/32 · unit 106/106 (the strategy's unit net rewritten to the
three-step shape, including a regression asserting the file body goes to the session URL and
that our own API only ever receives JSON) · `media-route-authz.spec.ts` extended to cover
`/complete`. ⏳ **Not yet verified against real YouTube** — the emulator has no credentials, so
a Preview pass with a genuinely large file is still owed.

### Follow-up the same day: the first real upload reached 100%, then failed — CORS

**Symptom:** on Preview, the progress bar ran smoothly to 100% and only then raised
`Failed to upload video: the connection to YouTube failed`. Nothing in the network was
actually wrong.

**Root cause:** **Google fixes a resumable session's `Access-Control-Allow-Origin` from the
`Origin` on the request that _opened_ the session** — and that request is ours, made
server-side, which sends no `Origin` at all. So the session was bound to no origin. The
browser then PUT every byte successfully (hence a bar that reached 100%), Google answered
201, and the browser **refused to expose the response** because it carried no matching
`Access-Control-Allow-Origin`. XHR surfaces that as `onerror` with status 0 — indistinguishable
from a dead socket, which is exactly why the message blamed the connection.

⚠️ **The earlier preflight check did not cover this and looked like it did.** It probed the
**initiation endpoint** (`/upload/youtube/v3/videos`), which happily echoes any origin. The
session URI is a different resource with its own, already-decided CORS answer. Verifying the
wrong URL is worse than not verifying: it retired the risk in the write-up while leaving it
live in the code.

⚠️ **Failures here are not clean.** The video **does** land on YouTube — public, and with no
`cat_videos` record, because `/complete` never runs. Check the channel for orphans before
retrying, or the retry silently double-posts.

**Fix:** forward the browser's `Origin` on the session-initiation call
(`upload-youtube/route.ts`), falling back to `x-forwarded-proto` + `host`, and **400 rather
than opening an origin-less session** — the failure mode is too expensive to reach silently.
The client's transport-error message no longer asserts the upload failed; it says the video
may already be up and to check the channel.

**Verified:** tsc 0 · smoke 32/32 · unit 118/118. New `tests/unit/uploadYouTubeSession.test.ts`
(7 tests) pins the forwarded `Origin`, the host fallback, and the 400 — the header is invisible
to every other layer: the e2e authz suite only proves the gate, and no automated test reaches
Google. ⏳ Still owed: the Preview re-test that this actually completes.

### Second follow-up: video upload worked, and uncovered two older bugs behind it

With the video path finally reaching the end, the next Preview attempt failed on
`Image upload failed: Failed to fetch`, and neither the video nor the photo appeared in the
albums. **Both causes predate this work** — they had simply never been reachable, because
nothing had ever completed a video upload from a deployed origin before.

**Bug A — the live Storage bucket had no CORS configuration at all, because the Seoul
migration left it behind on the old bucket.** 집사톡 images are PUT from the browser
**straight to the bucket** with a signed URL, so the bucket's own CORS list decides which
origins may upload. Every deployed origin was rejected, surfacing as a bare
`TypeError: Failed to fetch`, which names neither CORS nor the bucket.

⚠️ **There are two buckets, and only one is live** — this is the part that misled the first
two attempts at fixing it:

| Bucket                                   | CORS before the fix | Used by                                            |
| ---------------------------------------- | ------------------- | -------------------------------------------------- |
| `mountaincats-61543`                     | **`[]` — none**     | every deployment; all 30 `cat_images` URLs in prod |
| `mountaincats-61543.firebasestorage.app` | `localhost:3000`    | **nothing** — the pre-migration default bucket     |

The `us-central1` → `asia-northeast3` (Seoul) migration created the new bucket, moved the
files and rewrote the Firestore URLs — but **CORS was never applied to it**, and stayed on
the bucket being abandoned. The first fix attempt then applied the corrected list to the
_wrong_ bucket, because **local `.env` still names the old one** (so does `.env.example`,
now corrected). The console error naming the bucket in the request URL is what finally
separated them: trust the failing request's URL over any config file.

🔑 **That stale local env is also why this looked like it worked in dev.** Local uploads
succeed against the old bucket — which has localhost CORS and which nothing reads — so they
land nowhere the app will ever look. Anything uploaded from localhost since the migration is
stranded there.

It survived because the one path that hits it is invisible to every test: e2e uses the
**storage emulator** (no CORS), and 공지사항/입양홍보 images take a **different route
entirely** — the Firebase JS SDK, which doesn't consult this list. So "images work over
there" was true and meant nothing.

⚠️ **Fix is configuration, not code** — committing the JSON changes nothing on its own.
Applied with `npm run storage:cors` (dry-run by default; `APPLY=true CONFIRM_PROJECT=…` to
write), and verified by preflighting the live bucket with the exact
origin/method/header triple the browser sends. Runbook + the no-wildcards trap:
[`deployment/README.md`](../docs/manuals/deployment/README.md).

**Bug B — the `cat_videos` record was written with the client SDK from the server, and always
failed.** `/api/upload-youtube/complete` wrote through `getVideoService()`, whose
implementation is `firebase/firestore` — the **client** SDK. Server-side it carries no
authenticated user, so `firestore.rules` denied the create (`cat_videos` requires
`manage-video`); `addVideoRecord` caught it, returned `null`, and the route logged and carried
on. **Every form-uploaded video has reached YouTube unrecorded**, appearing in 영상첩 only
after somebody ran 📺 YouTube와 동기화 — which is exactly why nobody noticed. The sibling
`refresh-video-metadata` had used the Admin SDK for this collection all along.

🔑 **Rule this establishes: a server-side write must never go through the service layer.**
The service factory is client-SDK-backed; it looks identical at the call site and fails only
at the rules boundary, where the failure is a returned `null` rather than a throw. The route's
own comment claimed "Admin SDK (bypassing firestore.rules)" — it had been wrong since it was
written.

**Fix:** the route writes `cat_videos` via `@/lib/firebase-admin`, stamping `mountainId`
itself (the service used to). Kept non-fatal — the video really is public by then, and failing
would push the operator into a retry that double-posts — but it now returns `recorded: false`
instead of swallowing, since silent swallowing is precisely what hid this.

**Verified:** tsc 0 · smoke 32/32 · unit 118/118. ⏳ Both need the Preview re-test, and Bug A
needs the bucket updated first.

---

## 2026-07-27 — 촬영일 landed a day early in KST: a calendar date round-tripped through an instant

**Symptom:** picking `2026-03-15 산책.mp4` in 집사톡 filled 촬영 시간 with **2026-03-14,
3:00 PM**. Spotted in a browser pass while verifying an unrelated change — no test failed,
and nobody had reported it.

**Root cause:** a _calendar date_ (a day, with no instant and no timezone) was being carried
through a `Date`, converted **local on the way in and UTC on the way out**:

| Step    | Code                                                   | KST result              |
| ------- | ------------------------------------------------------ | ----------------------- |
| Parse   | `new Date('2026-03-15T00:00:00')` — no `Z` → **local** | 2026-03-15 00:00 +09:00 |
| Format  | `.toISOString()` → **UTC**                             | `2026-03-14T15:00Z`     |
| Display | slice of that string                                   | **2026-03-14** ❌       |

The two conversions don't cancel — they differ by the UTC offset, so the date lands a day
early east of Greenwich and a day late west of it. Then it happened **twice**: the submitted
`2026-03-14T15:00` was re-parsed by `new Date()` in `upload-youtube` (local again), so
YouTube's `recordingDate` became `2026-03-14T06:00Z`, ~33 hours before the day in the
filename.

⚠️ **The trap underneath:** `new Date('2026-03-15')` parses as **UTC** while
`new Date('2026-03-15T00:00')` parses as **local** — same function, opposite rules, and the
codebase used both forms.

⚠️ **Why nothing caught it:** at UTC the offset is zero and the round trip cancels, so the
code is correct on CI runners and wrong for every user in Korea. Reproduced both ways:
`TZ=Asia/Seoul` → `2026-03-14`, `TZ=UTC` → `2026-03-15`.

**Fix:** treat 촬영일 as a calendar date end to end, and convert exactly once at the storage
boundary.

- `formatDateForInput` builds the string from **local** components
  (`getFullYear/getMonth/getDate`), never `toISOString()`.
- New `calendarDateToInstant('YYYY-MM-DD')` encodes it as **UTC midnight** — the convention
  `/admin/tag-videos` already writes (`page.tsx`), so one Firestore field never carries two
  conventions. It also **rejects** malformed input and impossible dates: `2026-02-31` does
  _not_ produce NaN, JS rolls it to March 3, which is the same class of quietly-wrong value.
- Both write paths (`upload-youtube`, `uploadImagesWithSignedUrls`) use it instead of a bare
  `new Date(str)`.
- 집사톡's field became **date-only**; it was `datetime-local`, but under a calendar-date
  convention the typed time was silently discarded.
- `formatDateTimeForInput` deleted — no callers left.

**Verified:** new `tests/unit/dateParser.test.ts` (10 tests) **pins `TZ=Asia/Seoul`**, with a
first assertion that the timezone fixture is real (`getTimezoneOffset() === -540`) — asserting
this suite at the runner's default timezone would prove nothing. Covers every filename
pattern, year boundaries and a leap day, the full filename → input → stored → redisplayed
loop, and the rejections. Plus an e2e assertion on the field value. Gates: tsc 0, smoke 31/31,
unit 102/102, full e2e 153 passed / 13 skipped / 0 failed.

⏸️ **Related but separate, and deliberately deferred:** 촬영일 is derived from the _filename_
at all, rather than from the file's own metadata. The owner deferred that on 2026-07-27 — it is
**not queued work**; see the HANDOFF open thread for the behavior it explains.

---

## 2026-07-26 — Batch edits reached YouTube but never came back to Firestore: the sync was called with Firestore doc ids

**Symptom:** owner-reported from Preview. Batch tag / 촬영일 / playlist edits applied to
YouTube correctly, but the site's copy didn't change until 📺 YouTube와 동기화 was run by
hand. Individual edits (변경사항 저장) synced automatically, as designed — the asymmetry is
what gave it away.

**Root cause:** `/api/refresh-video-metadata` takes **YouTube video ids** — it queries the
YouTube Data API with them, then finds each Firestore doc by
`where('youtubeId','==',videoId)`. The batch mutations sent it **Firestore document ids**.
The loop iterates `Array.from(selectedIds)` (doc ids), correctly sends
`video.youtubeId || video.id` to the YouTube `PUT`, but then records the **loop variable**:

```ts
youtubeUpdateResults.push({ videoId, success: true });   // videoId = the doc id
…
body: JSON.stringify({ videoIds: successfulVideoIds })   // → 404 "No videos found"
```

`saveVideoMetadata` (individual) never had the bug because it resolves
`const videoId = selectedVideo.youtubeId || selectedVideo.id` **once** and uses that value
for both calls.

Two things kept it quiet. The caller did `if (refreshResponse.ok) console.log('✅ …')` with
no `else`, so a 404 was invisible and the completion dialog still reported 완료. And **the
e2e fixtures made it unreproducible**: neither seeded video had a `youtubeId`, so
`youtubeId || id` collapsed to the doc id and the two ids could not diverge — in production
the doc id is auto-generated and never matches.

**Fix:** both batch mutations key their results by `youtubeVideoId`. The refresh call is
extracted into `syncToFirestore()`, which **returns whether it succeeded** and logs the
status + error body when it doesn't; when it fails, the completion dialog now says the
change reached YouTube but the site copy didn't, and to press 📺 YouTube와 동기화. (The batch
playlist save added earlier the same day already used the YouTube id for both calls.)

⚠️ **Fixture change, deliberately:** `tests/e2e/fixtures/media.json` now gives each video a
`youtubeId` (`yt-vid-01/02`) distinct from its doc id, so the seed has production's shape.
Without that the new regression test would pass against the broken code.

**Verified:** new e2e test stubs both routes, runs a batch tag save and asserts the `PUT`
**and** the refresh both carry `yt-vid-02` — the old code sent `test-vid-02` to the refresh —
plus that no sync-failure warning appears when the refresh is accepted. tsc 0, smoke 30/30,
unit 80/80, full e2e 148/13/0.

---

## 2026-07-26 — Every metadata sync reset a video's 게시일 to "now", reordering the public 영상첩

**Symptom:** videos showed today's date as 게시: in 동영상 관리 and jumped to the top of the
listing after any save or sync. **Not admin-only** — the public 영상첩
(`getAllVideos`) and the per-cat video lists sort by `uploadDate` descending, so a synced
video jumped the public album too. Found while auditing the sync's write block after the
owner asked how far the "never write video data to Firestore" hazard actually reached.

**Root cause:** `refresh-video-metadata` built its Firestore payload with

```ts
uploadDate: new Date(),   // ← the moment of the sync
uploadedBy: 'admin',
lastMetadataRefresh: new Date(),
```

`uploadDate` means "when the video was published" and must never move; the refresh
overwrote it with the sync time on every call — including the per-video refresh that runs
after **every** metadata save. YouTube's real publish date was sitting right there in the
same payload as `publishedAt`, which nothing reads. Two related crossings in the same three
lines: `uploadedBy` was forced to `'admin'`, erasing `'youtube_sync'`; and the edit
timestamp was written as `lastMetadataRefresh`, a field **nothing reads**, while the field
the admin UI _does_ read for 메타데이터 수정 (and its sort), `updated`, was written by
`videoService.updateVideo`/`updateVideoTags` — both of which have had **no callers** since
the auto-parse fix, so that column and sort were dead.

**Fix:** `uploadDate` now comes from YouTube's `publishedAt` (immutable, authoritative, and
consistent with videos being YouTube-owned), falling back to the stored value; existing
mis-stamped records **self-heal on their next refresh**, so no migration is needed.
`uploadedBy` is no longer written — a refresh is not an upload. `lastMetadataRefresh` is
replaced by `updated`, which makes 메타데이터 수정 and its sort work for the first time.

⚠️ **The clobber was masking a latent crash.** `syncVideos()` never set `uploadDate` on
import; imported records only got one because the refresh stamped it moments later. Removing
the stamp alone would have left freshly imported videos with no `uploadDate`, and the album
sorts call `.getTime()` on it (`parseDate` returns `null` when absent). `syncVideos` now sets
it from `publishedAt` at import.

**Verified:** tsc 0, smoke 30/30, unit 80/80, full e2e 147/13/0. ⚠️ The repair itself is only
observable against real YouTube data — the emulator has no publish dates — so confirm on
Preview that a synced video keeps its original 게시일.

---

## 2026-07-26 — Batch playlist assignment updated one video (or none): the modal's save ignored the batch selection

**Symptom:** latent — found while writing the button spec for `/admin/tag-videos`, not from a
report. Selecting several videos, opening 재생목록 선택 from the batch panel, ticking a
playlist and saving appeared to work, but only ever changed **one** video — or silently
nothing at all.

**Root cause:** the playlist modal is opened from two places (the batch panel and the
per-video 📋 재생목록 관리), tracked by `playlistSelectorContext`. Its save handler,
`savePlaylistChanges()`, never read that context: it opened with
`if (!ytm.selectedVideo …) return;` and operated on `selectedVideo` — the video open in the
right-hand **edit form**, which has nothing to do with the batch checkboxes. So the batch
path wrote to whatever was open in the form, and short-circuited to a no-op when nothing
was. Nothing surfaced the mismatch: the panel's own hint says `✅ 모달에서 저장하기`, and the
success dialog reports the single video's result.

**Fix:** `savePlaylistChanges()` now dispatches on the context. The new
`saveBatchPlaylistChanges()` walks every selected **YouTube** video, POSTing
`batch_update_playlists` per video, then syncs the successes back with one
`refresh-video-metadata` call and reports a tally — the same shape as `batchUpdateTags`.

**Semantics chosen (worth not re-litigating): set, not merge.** Each selected video ends up
in exactly the ticked playlists and is removed from the others. That matches 태그 저장 (which
replaces the tag list) and is what the route's `batch_update_playlists` action already does
per video, since it diffs against that video's own membership. Because the removal is
destructive and a mixed selection has no meaningful "current" state to pre-tick, the batch
modal opens with **nothing ticked** and the save **confirms first**, spelling out that
unticked playlists are removed.

**Verified:** new e2e regression test — stubs both playlist routes plus the refresh, selects
two videos, **deliberately leaves the edit form empty** (the condition that made the old code
a silent no-op), and asserts one POST per selected video carrying the ticked playlist set.
The old code would produce zero POSTs. tsc 0, smoke 30/30, unit 80/80, full e2e 147/13/0.

---

## 2026-07-26 — 자동 날짜 인식's parsed dates silently vanished: it wrote Firestore, and the sync overwrites Firestore from YouTube

**Symptom:** videos kept reappearing in 동영상 관리 with no 촬영일 after the bulk
자동 날짜 인식 button had already filled them in. Found by reading the code while writing
the page's button spec, not from a report — the disappearance has no error and no log.

**Root cause:** `/admin/tag-videos`'s auto-parse wrote the parsed date **straight to
Firestore** (`videoService.updateVideo(id, { createdTime })`), while every other write on
that page goes to YouTube first and then syncs back. But Firestore is a **copy** of
YouTube for videos, and `refresh-video-metadata` rebuilds it as a straight overwrite:

```ts
createdTime: youtubeRecordingDate ? new Date(youtubeRecordingDate) : null,
```

A video only has a `recordingDate` on YouTube if someone set one — so for exactly the
videos auto-parse targets (the dateless ones), YouTube returns nothing and the sync writes
**`null`** over the parsed date. It didn't need the 📺 YouTube와 동기화 button either:
saving _any_ change on that video runs the same per-video refresh, so a tag edit would
erase the date too.

**Fix:** auto-parse now `PUT`s the parsed date to `/api/update-youtube-video` per video
(mirroring `batchUpdateDate`), collects the IDs YouTube accepted, waits 3s for propagation,
and syncs those back with one `refresh-video-metadata` call. The confirmation dialog was
rewritten to say it changes YouTube irreversibly, since it now does. `videoService` on that
page is **reads only**.

🔑 **Owner's principle, adopted platform-wide for videos (2026-07-26): YouTube is the source
of truth; no UI path may write video data to Firestore.** Anything written there is undone
by the next sync, so a Firestore-only write is broken by construction rather than merely
risky. Documented for operators in
[`admin-manual` §6](../docs/manuals/admin-manual/README.md) ("never edit video data in
Firebase") and per-button in
[`tag-videos-spec.md`](../docs/manuals/admin-manual/tag-videos-spec.md). ⚠️ The same
overwrite-with-null applies to `tags`, `location`, `title` and `description` — any future
direct write to those fails the same silent way. _(Photos are the opposite: `cat_images` has
no upstream, so Firestore **is** their source of truth and `tag-images`' own auto-parse
correctly writes it directly.)_

**Verified:** the P0 characterization test for this flow pinned the old Firestore-only
behavior and was rewritten to the new contract — it stubs both YouTube routes, asserts the
`PUT` carries the parsed date for the right video and that the refresh follows, then asserts
**both cards stay dateless**, which is a direct regression guard on the principle (with the
sync stubbed, only an illegal direct write could produce a date). tsc 0, smoke 30/30, unit
80/80, full e2e 146/13/0 (this fix's own rewritten test included).

---

## 2026-07-26 — "Insufficient Permission" on video metadata edits: the admin OAuth flow asked for too few scopes

**Symptom:** immediately after the credential fix below, editing a video's metadata as an
admin holding every permission failed with
_"❌ 동영상 메타데이터를 업데이트하지 못했어요: Insufficient Permission"_.

**Root cause:** that message is **Google's**, not ours — our permission gate says
"Insufficient permissions" (lowercase, plural), while `Insufficient Permission` is the
YouTube Data API rejecting the access token's **OAuth scope**. `/api/admin/youtube-auth/
auth-url` requested only `youtube.upload` + `youtube.readonly`, which cover
`videos.insert` and reads but **not** `videos.update` (metadata) or
`playlistItems.insert/delete` (playlist membership) — those need `youtube` or
`youtube.force-ssl`. The retired `scripts/auth/generate_youtube_refresh_token.js`
requested all four, so the token that had actually been in use for years (pasted into
`YOUTUBE_REFRESH_TOKEN` from that script) carried the broad scopes. **The admin panel's
re-authorize button had never once produced a token that could edit metadata** — nobody
noticed because its token was never the one being used.

⚠️ **Exposed by, not caused by, the credential fix below.** Making the routes read the
panel's Firestore token — the correct behavior — is what put the narrow-scoped token into
play. Two latent bugs were stacked: the wrong token source hid the wrong scope set.

**Fix:** `auth-url` now requests the same four scopes the CLI script did (`youtube.upload`,
`youtube`, `youtube.readonly`, `youtube.force-ssl`) — the set empirically proven against
every operation this app performs. **Re-authorizing is required**: scopes are fixed at
consent time, so the already-stored token cannot gain them (`prompt: 'consent'` is already
set, so the flow returns a fresh refresh token).

📌 **Related gap, deliberately not fixed:** the token status panel calls
`refreshAccessToken()`, which succeeds regardless of scope — so a scope-starved token still
reports "유효한 토큰이 있습니다". Same class as the timestamp problem below: the panel is
reassuring about a credential that cannot do the job. Detecting it would mean probing a
write endpoint, which is a product decision, not a bug fix.

**Verified:** tsc 0, smoke 30/30, unit 80/80. ⚠️ The real proof is the **manual pass** —
no automated test can reach Google's consent screen or a scoped token.

---

## 2026-07-26 — Re-authorizing YouTube fixed nothing: the button writes the token to Firestore, every route read it from env

**Symptom:** Found on Preview during the P5.4 scripted manual YouTube pass. The
`/admin` "re-authorize" button reported success, and the token status panel showed
healthy tokens — but editing a video's metadata still failed with _"YouTube
authentication failed. The refresh token may be expired or invalid."_ Saving playlist
membership failed separately with _"Channel ID not configured."_

**Root cause — two independent bugs, both invisible to the automated suites** (the
emulator has no YouTube credentials, which is exactly why P5.4 exists as a manual pass):

1. **Split credential sources.** `/api/admin/youtube-auth/callback` stores the fresh
   refresh token in Firestore (`admin_config/youtube_auth`), but every consuming route
   went through `getYouTubeOAuthConfig()` (`utils/config.ts`), which read **env only**.
   So a stale `YOUTUBE_REFRESH_TOKEN` shadowed the token that had just been written, and
   the operator was silently expected to hand-copy it into Vercel and redeploy. Three
   things conspired to hide it: (a) the error said "expired or invalid", not "not
   configured" — so the var _was_ set, just stale; (b) the status panel checks **both**
   sources, and worse, displayed **Firestore's** `updatedAt` against the **env** token
   ("they should be the same token"), so a stale copy rendered with a fresh timestamp;
   (c) `upload-youtube` looked like it had a Firestore fallback, so uploads were assumed
   to prove the whole path worked. That fallback was **dead code**: it only ran when
   `getYouTubeOAuthConfig()` returned `undefined`, but it then needed `clientId`/
   `clientSecret` _from that same undefined config_ → always `null`. The same
   all-or-nothing gate also meant `auth-url` refused to start the OAuth flow without a
   refresh token already present — a bootstrap deadlock on any fresh deployment.
2. **`manage-playlists` POST read a retired env var for the channel ID.**
   `batch_update_playlists` did `process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID`, which is
   set nowhere (not in Vercel, not in `.env.example`) — M1 moved channel config into
   `mountains.json` and this call site was missed. The GET in the same file already did
   it right (`getYouTubeChannelId(authz.mountainId)`). Both a live 500 and a
   multi-tenant leak: a global where the request's tenant belonged.

**Fix:** new `src/lib/youtube/credentials.ts` — one resolver for the single shared
credential, splitting **client identity** (env; effectively never rotates) from **the
refresh token** (rotates every 7–14 days, and now lives **only** in Firestore).
`getYouTubeOAuthClient()` returns identity alone, so `auth-url`/`callback`/`status` no
longer need a token to obtain one. All six OAuth consumers migrated (`upload-youtube`,
`update-youtube-video`, `manage-playlists` GET+POST, `youtube-playlists`,
`admin/youtube-auth/{auth-url,callback,status}`); `getYouTubeOAuthConfig()` deleted.
Bug 2 is the one-line switch to `getYouTubeChannelId(authz.mountainId)`.

⚠️ **`YOUTUBE_REFRESH_TOKEN` was removed outright, not demoted to a fallback** (owner's
call). The first cut resolved Firestore-first with env behind it; the fallback was then
dropped because it preserves the same failure shape whenever the Firestore doc is missing
— routes would quietly resume on a stale env token. It also earns nothing: obtaining a
token needs client identity only, so a deployment with no token anywhere recovers by
clicking 「토큰 갱신」. Follow-on cleanups: the status route reports one token source instead of
two (it used to show **Firestore's** timestamp against the **env** token — much of why
the split went unnoticed); the OAuth success page no longer prints the raw token with
instructions to paste it into `.env.local`; `scripts/auth/` (the command-line
generate-and-paste workflow) deleted; `.env.example` updated.

**Verified:** `tests/unit/youtubeCredentials.test.ts` (9 tests) — the token resolves from
Firestore, a leftover `YOUTUBE_REFRESH_TOKEN` is ignored entirely, identity resolves with
no token present, and a Firestore read failure re-raises instead of degrading to
"unconfigured". tsc 0, smoke 30/30, unit 80/80, full e2e 146/13/0. ⚠️ The end-to-end proof
is still the **manual pass on Preview** — no emulator can reach YouTube.

---

## 2026-07-19 — Modal dialog conversion silently canceled the post-submit redirect (App-Router transition vs. modal-unmount re-render)

**Symptom:** After the P6.1 `alert()` → shared `ui/Modal` conversion, all four
content-form create flows stopped redirecting: the success dialog appeared, 확인
dismissed it, the post WAS created — but the page stayed on the composer. Caught by
the P0 characterization net (4 e2e failures: `posts.spec` + `butler-create.spec`
redirect polls timing out).

**Root cause:** the converted flow is `await dialog.alert(msg); router.push(path)`.
`useDialog`'s 확인 handler resolved the promise and then queued the modal-unmount
`setState(null)` — so `router.push` ran while that unmount re-render was still
pending, and the re-render canceled the in-flight App-Router transition. The Playwright
trace's network log proved the push actually started (`/pages/butler_talk?_rsc=…`
navigation fetch fired) but the URL never committed. The native `alert()` never had
this problem because it blocks the main thread: by the time `push` ran, no other
update was pending.

**Fix:** `useDialog.close()` now clears the dialog state first and resolves the
promise in a `setTimeout(…, 0)` — continuations run only after React has committed
the modal unmount, restoring the native-alert timing shape
(`src/components/ui/useDialog.tsx`).

**Verified:** the four failing specs green after the fix (plus the full e2e suite);
the redirect assertions now pass against the Modal dialogs.

---

## 2026-07-19 — 집사톡 image upload could never have worked (signed-URL response keys drifted in the copy)

**Symptom:** Latent — found by source inspection during the complexity-retirement P3
convergence, not by a user report. Any image attached to a 집사톡 (`NewButlerTalkForm`)
post would fail with the form's "Image upload failed" alert; the same flow in
집사게시판 (`NewPostForm`) worked.

**Root cause:** copy-drift in the duplicated signed-URL upload helper. The
`/api/generate-signed-url` route returns `{ signedUrl, publicUrl }`. `NewPostForm`'s
copy destructures those keys correctly; `NewButlerTalkForm`'s copy destructures
`{ uploadUrl, downloadUrl }` — both `undefined` — then `fetch(undefined, { PUT … })`
resolves against the page URL and fails its ok-check. Nobody noticed because the two
"twin" helpers were maintained separately (the exact failure mode the refactor
retires). Bonus finding in the working copy: `NewPostForm` never checked the PUT
response, so a failed Storage upload would still silently embed `publicUrl` in the
post.

**Fix:** P3.0 lifted the strategy into
`src/components/forms/uploadStrategies.ts#uploadImagesWithSignedUrls`, canonicalized
on the route's real contract (`{ signedUrl, publicUrl }`) **plus** the PUT ok-check
from the butler copy. Both forms now share it via `useRichContentForm`.

**Verified:** unit tests pin the contract (`tests/unit/uploadStrategies.test.ts` —
happy path, signed-URL failure, PUT failure, non-fatal `cat_images` entry); the full
media path stays on the scripted manual pass (YouTube + prod-host public URLs are not
emulator-testable).

---

## 2026-07-18 — Every admin role change silently lost its audit entry (permission_logs write denied & swallowed)

**Symptom:** No entries ever appeared in `permission_logs` for role assignments made
from `/admin/members`, despite the UI reporting success and the role change itself
persisting. Nothing surfaced in the UI or server logs — the only trace was a non-fatal
`console.error` in the browser console ("Failed to log role change"), which the e2e
suite had even been configured to tolerate (`members.spec.ts` used the non-watchdog
`baseTest` specifically to ignore it).

**Root cause:** two layers, each defensible alone, silently fatal together:

1. `firestore.rules` locks `permission_logs` to `write: if false` — **correct** (a
   client-writable audit log would be forgeable), on the assumption writes would come
   from a server path.
2. But the audit write lived in the **client** SDK
   (`RoleAssignmentService.logRoleChange`, called after the role write in
   `assignSpecificRole`) — and its `catch` block deliberately swallowed the failure
   ("Don't throw error for logging failure — role assignment should still work"). So
   the rule denied every audit write, and the swallow guaranteed nobody noticed.

   The gap was **known** — recorded 2026-06-30 in
   `docs/planning/firebase-sdk-usage-inventory.md` §D ("every role change currently
   loses its audit entry", verdict: migrate, "strong yes") — but sat unscheduled for
   ~3 weeks until the multi-tenant assessment resurfaced it as a governance
   prerequisite (a second mountain owner assigning roles with no audit trail).

**Fix:** Tier 1 write migration (see `log/FEATURE_MOD_LOG.md` 2026-07-18): role
assignment moved behind `POST /api/admin/assign-role` (Admin SDK, gated
`requireApiPermission('manage-users')`), where the `users/{uid}` role write and the
`permission_logs` audit entry run in **one transaction** — the audit entry can no
longer be skipped, and the Admin SDK legitimately bypasses the (kept) `write: if
false` rule. The swallowed-catch client path was deleted, not repaired: per the repo
error-handling convention, an audit write that fails must fail the operation, which
only a server-side transactional write can express.

**Verified:** e2e `members.spec.ts` 4/4 against the emulator suite (with the updated
rules loaded): assigning a role through the real members page now succeeds through the
new route. `tsc` + smoke green. Prod requires the owner-run
`firebase deploy --only firestore:rules` (the app no longer uses the removed clause
either way).

**Lesson:** a rules-denied write plus a swallowed catch is _silent_ data loss — the
rules layer can't warn you, and the catch made sure the app didn't either. When a
write is moved behind `write: if false`, grep for every client writer **and their
catch blocks** at the same time; and treat "tolerated console.error" entries in the
e2e watchdog config as a standing list of known-swallowed failures worth auditing.

---

## 2026-07-13 — Intermittent e2e build hang/"markerless bake" — a SECOND page (냥이들) read points via the client Web SDK at build

**Symptom:** The e2e gate (`npm run test:e2e`) intermittently produced failing marker
tests (landing.smoke, home-map, mobile-map) — logged in the prior entry's "Update
2026-07-12 (still open)" as a **markerless bake ~1 in 3**, blamed on a build-time
Admin-SDK read race that "returns `[]` before the emulator is ready."

**Root cause (the prior hypothesis was wrong):** two things were conflated, and the real
cause was neither an empty Admin read nor an emulator-readiness race. Reproduced and
instrumented on a fresh machine:

1. **The Admin-SDK read path is NOT the problem.** A cold, fresh-process Admin read of
   points+cats against the seeded emulator succeeded **40/40**; clean-`.next` builds baked
   points **6/6**. When a build _completes_, the home page always bakes its markers. So
   `getAllPointsServer`/`getAllCatsServer` do **not** intermittently return `[]`.
2. **The real failure is a build _hang_, misread as "markerless."** `src/app/pages/cats/
page.tsx` (냥이들) — a Server Component — read cats via the Admin SDK but still read
   **points via the client Web SDK** (`getPointService().getAllPoints()`). This is the
   exact mixed-SDK mistake the home page had (fixed for `page.tsx` in `02c412a`) — **the
   sibling page was missed.** During `next build`, the client Web SDK does **not** connect
   to the emulator, so it hits **real** Firebase: `@firebase/firestore … Listen stream …
PERMISSION_DENIED: Permission denied on resource project demo-mohocat` → it enters
   offline-retry and leaves a **dangling gRPC handle** that intermittently wedges
   `next build` at **"Collecting build traces"** (static generation had already finished
   51/51). A build killed/timed-out at that step leaves an incomplete `.next`; `next start`
   then serves a broken site and **all marker tests fail** — which looked like a
   "markerless bake." (A confounding false lead: forcing `preferRest: true` on the Admin
   Firestore made **every** build fail with "Could not load the default credentials" —
   REST transport needs real creds even against the emulator, so it is incompatible with
   the credential-less emulator init. Do **not** use `preferRest` in emulator mode.)

**Fix:** switched `src/app/pages/cats/page.tsx` from `getPointService().getAllPoints()`
(client Web SDK) to `getAllPointsServer()` (Admin SDK, `@/lib/server/point-reads`) — a
2-line change mirroring `02c412a`. Functionally identical in production (same `points`
collection, Admin SDK reads deterministically at build/server time); completes the §7a
"bake the data layer" migration the home-page fix started. No page still reads a client
service during build SSR (verified by scan).

**Verified:** `npx tsc --noEmit` clean; `npm run test:smoke` 26/26. Empirically:
10 consecutive gate-style builds (one clean `.next`, then reuse — the real gate's
condition), each hang-guarded — **10/10 baked points, 0 client real-Firebase hits, 0
hangs**, incl. build #8 (which hung in the pre-fix reproduction). Before the fix the
client `PERMISSION_DENIED` appeared in **every** build log and a hang recurred ~1 in 8.

**Lesson:** "intermittent markerless bake" was a build **hang**, not an empty read. When a
Server Component reads Firestore at build time, it must use the **Admin SDK**
(`@/lib/server/*-reads`) — the client Web SDK doesn't reach the emulator during
`next build`, hits real Firebase, and its dangling connection can hang the build
nondeterministically. Grep for `getPointService()`/`getCatService()` in any non-`'use
client'` `page.tsx`/`layout.tsx` before trusting a §7a "baked" claim.

## 2026-07-12 — Home-map §7a "no client Firestore" spec: green per-file, red in the full gate

**Symptom:** `home-map.spec.ts`'s "avatars are baked — no client Firestore request
fires" test **passed** when run per-file (`npx playwright test home-map.spec.ts`
reusing the running server) but **failed** in the full `npm run test:e2e`. The
collected calls were three `http://127.0.0.1:8088/google.firestore.v1.Firestore/Listen/channel?…`
requests — so the assertion `expect(firestoreCalls).toEqual([])` was non-empty.

**Root cause:** two things. (1) The assertion was **too broad** — it asserted the
_whole landing page_ fires zero client Firestore, but §7a only removed the
**marker-click → gallery** per-point waterfall. The landing page still makes **one
unrelated client `getDoc`** at init: there is **no `onSnapshot` anywhere in `src/`**,
but the modern Firestore Web SDK routes even one-time `getDoc`/`getDocs` reads over the
`…/Listen/channel` WebChannel, so a single init read shows up as "Listen" traffic. (2)
It only surfaced in the full run because of **timing** — under the reused-server
per-file run the assertion resolved before the init read landed; under the full clean
build + parallel load the read arrived inside the observed window (a classic
green-per-file / red-in-CI race).

**Fix (first attempt, insufficient):** scoping the assertion to the marker-click →
gallery action (clear the request buffer, then click) — this passed twice but was
**still flaky**: the unrelated init read fires at a nondeterministic time and, under the
full gate's parallel load, straggled **into** the cleared post-click window (it bit
again when the Phase-6 `api/` spec shifted timing). **Final fix:** **dropped the network
assertion entirely** — it is unfixable in principle, because the map read and the
unrelated init read are indistinguishable by URL (both are opaque `/Listen/channel`
POSTs). §7a is now asserted structurally instead: the marker's cat avatar `<img>` src is
**baked into the server HTML** (`cat_test-cat-01.jpg`) — proving no client fetch renders
it — and the marker-click → gallery → CatInfo path is covered by a separate test.

**Verified:** full `npm run test:e2e` green across the whole suite incl. the new `api/`
project. **Lesson:** don't assert "zero network calls of type X" when the page makes
unrelated calls of the same shape at nondeterministic times — assert the structural
invariant (here, server-baked DOM) instead.

## 2026-07-12 — Album Lightbox/VideoPlayer spec fails only in the full gate — overlay-intercepted clicks + order-dependent nav

**Symptom:** `albums.spec.ts` was unverifiable per-file (its spike-S3 public fixtures
only serve after a fresh build — a reused `next start` snapshots `public/` at boot), and
in the first full `npm run test:e2e` **6/6 album tests failed**. Two distinct causes,
neither visible until the clean build served the fixtures.

**Root cause:** (1) **Clicks intercepted** — `MediaTile` lays a full-size decorative
hover-overlay `<div class="absolute inset-0 …">` over the thumbnail, so Playwright's
actionability check refuses to click the `<img>` ("subtree intercepts pointer events"),
even though a real click would bubble to the tile's `onClick`. (2) **Order-dependent
nav** — the Lightbox "다음/이전" test assumed `album-01.jpg` was the first image, but
album order is service-defined; when it resolved **last**, `hasNext` was false, no
"다음 사진" button existed, and the click timed out. A separate strict-mode violation
also appeared: the grid tile caption duplicates the Lightbox description text.

**Fix:** (1) album-tile clicks use `click({ force: true })` (bypasses the decorative
overlay; the event still bubbles to the tile). (2) the nav test opens the **first grid
tile by position** (`getByRole('img', { name: /album-0/ }).first()`) and keys on
position — first image → forward-only, last → back-only — instead of filename; and all
Lightbox assertions are scoped to the Lightbox portal
(`div.fixed.inset-0` filtered by its 닫기 button) to dodge the duplicated caption text.

**Verified:** full `npm run test:e2e` green (album tests pass on both desktop + mobile).

## 2026-07-12 — Landing map bakes markerless in the e2e harness — points read via client SDK at build (incomplete §7a)

**Symptom:** The e2e landing smoke spec (`tests/e2e/public/landing.smoke.spec.ts`)
failed reproducibly (2 full `npm run test:e2e` runs, desktop + mobile): the map,
header and tiles render but **zero `.leaflet-marker-icon`** appear — the assertion
times out at 25s. Only the admin `storageState` setup passed.

**Root cause:** `src/app/page.tsx` read **cats** server-side via the Admin SDK
(`getAllCatsServer`, §7a) but still read **points** via the **client Web SDK**
(`getPointService().getAllPoints()`). During `next build`, the client SDK does **not**
reliably connect to the Firestore emulator (build log shows it reaching _real_
Firestore: `PERMISSION_DENIED on resource project demo-mohocat`), so `getAllPoints()`
returned `[]` and the home page **baked an empty point set** → `MountainViewer` got
`points=[]` → `usePointMarkers` produced no markers. Confirmed by inspection: the baked
`.next/server/app/index.html` contained the seeded **cats** (Admin read) but **no point
coords/titles** (client read); the emulator itself held all 4 points (REST); `/api/points`
at **runtime** returned all 4 (client SDK connects fine once the server is live); and a
manual rebuild against a _warm_ emulator baked points correctly — i.e. a build-time
connection race, nondeterministic. Production was never affected: there the client SDK
hits **real** Firebase, whose rules allow public point reads. Points were simply the one
data path §7a ("bake the data layer") never migrated off the client SDK.

**Fix:** added `getAllPointsServer()` (`src/lib/server/point-reads.ts`, Admin SDK) —
mirroring `getAllCatsServer` in `cat-reads.ts`, logs + re-raises on failure — and switched
`src/app/page.tsx` to `Promise.all([getAllPointsServer(), getAllCatsServer()])`. Both
map data sources now bake deterministically via the Admin SDK (which honours
`FIRESTORE_EMULATOR_HOST`). The client `getPointService` is untouched; production reads
the same `points` collection, so behaviour is functionally identical.

**Verified:** `npx tsc --noEmit` clean; `npm run test:e2e` now **3 passed** — and the
markers appear in ~2s instead of the prior 25s timeout (data is baked, not raced),
confirmed across two consecutive green runs.

**Update 2026-07-12 (still open — not fully fixed):** switching **points** to the Admin SDK
removed the _frequent_ markerless bake but did **not** make it deterministic. With the full
Phase-2 + Phase-6 suite, a markerless bake still recurs **~1 in 3** `npm run test:e2e` runs
(all marker tests fail: landing.smoke, home-map, mobile-map). Root cause is the same class —
a **build-time emulator-connection race**, now on the Admin-SDK read path: `getAllPointsServer`
/ `getAllCatsServer` occasionally read an empty set before the emulator is fully ready during
`next build`, and the page bakes empty (the read returns `[]` rather than throwing, so the
build still succeeds). CI `retries: 2` does **not** help — it's a whole-build condition, not a
per-test flake. A proper fix (await/retry emulator readiness before the Server-Component reads,
or fail-loud on an empty bake) touches the prod read path and needs owner sign-off; tracked in
plan §8 Phase 7. Until then the gate is only intermittently green.

## 2026-07-11 — Non-admin login fails under the repo Firestore rules (emulator) — `ensureUserExists` self-write denied

**Symptom:** In the e2e harness, `global.setup.ts` signs **admin** in fine but a
**member** (role `butler-ground`) login never completes — the page stays on `/login`
and setup times out waiting for the post-login redirect to `/`.

**Root cause:** every login runs `permissionService.ensureUserExists(user)`
(`src/services/permission-service.ts`), which unconditionally `updateDoc`s the
signed-in user's own `users/{uid}` doc. But the repo `config/firebase/firestore.rules`
`users/{userId}` **write** rule requires `hasPermission(uid, 'manage-users')` — it has
**no self-write allowance** (`request.auth.uid == userId`). So a non-admin's self-update
is **permission-denied**; `handleLogin` → `handleCheckUser` catches, sets the
verify-failed error, and never redirects. Admins pass only because they hold
`manage-users`. The Firestore **emulator enforces the repo rules** (prerequisite plan
F12: repo rules are the source of truth and may be ahead of prod), which is what
surfaced this — a latent divergence that would also block non-admin login anywhere the
repo rules are the deployed rules.

**Fix (applied 2026-07-13, owner chose option (a)):** added a **scoped self-write clause**
to `config/firebase/firestore.rules` → `match /users/{userId}`. A signed-in user may now
`create` + `update` their **own** doc, but **cannot set/change `currentRole`** (the only
field `hasPermission()` reads): `create` requires `currentRole.role == 'viewer'` &&
`currentRole.permissions == []`; `update` requires `request.resource.data.currentRole ==
resource.data.currentRole` (unchanged). Role assignment stays admin-only (the existing
`manage-users` clause). This also corrects a latent gap — the repo rule had **never**
allowed the self-write `ensureUserExists` performs (`if false` → `if manage-users`; git),
so the deployed prod rules must already diverge; the app has no Admin-SDK fallback for this
path. Covered by a new rules test (`tests/rules/users.rules.test.ts`, `npm run test:rules`,
6/6) asserting: self create/update ok, self-escalation blocked (create + update),
cross-user write blocked, admin cross-user write ok. (Options considered: (b) tolerate a
denied self-update — rejected: only papers over returning users, leaves real signup broken,
violates log-and-re-raise; (c) move the upsert behind an Admin-SDK route — deferred as the
cleaner long-term shape.)

**Verified:** reproduced deterministically — admin `authenticate` setup passes, member
setup fails at the redirect wait; root cause confirmed by reading the `users` write
rule vs `ensureUserExists`'s `updateDoc`. Tracked in
`docs/planning/playwright-ci-prerequisite-plan.md` §3 (S4).

## 2026-07-10 — Logout on /mypage strands the page on a spinner (client redirect never commits)

**Symptom:** Signing out while on `/mypage` doesn't redirect anywhere — the page is
left showing only its `!user` loading spinner.

**Root cause:** the client-side redirect never committed. `/mypage` gates on auth: it
shows a spinner while `loading || !user` and a `useEffect` calls `router.replace`/`push`
to leave when `!user`. On logout the auth context flips `user → null` (the spinner
proves it — `loading` only ever goes false, so a visible spinner means `user` is null),
but the App Router transition triggered from that effect **didn't commit**, so the page
just sat on the spinner. Client-router redirects fired off an auth-state change are a
known-flaky pattern.

**Dead end first:** initially blamed a double-`router.push` race (the sign-out button's
`.then(push('/'))` colliding with the guard's `push('/login')`) and de-raced it to a
single `router.replace`. Still stuck — so the race wasn't it; the `router` navigation
itself wasn't committing.

**Fix (`src/app/mypage/page.tsx`):** drive the redirect off the auth-state guard (which
fires on `user → null` via the Firebase listener, independent of whether `signOut()`'s
promise resolves) and do a **full-page** navigation — `window.location.replace(target)`
— which always commits and cleanly drops signed-in client state. Destination is chosen
by a `wasAuthedRef` (set true whenever `user` is truthy): a **logout** (was signed in)
→ landing page `'/'`; a **direct logged-out visit** (never signed in) → `'/login'`.
This routes every logout to home — in-page button, 탈퇴/withdrawal, AND the top-nav
`LogoutModal` (which can't set page-local state, but does flip the shared auth state).
`useRouter` is no longer used here and was removed.

**Verified:** `tsc --noEmit` clean + smoke 26/26. Live click-through (real session)
still owed — the browser extension isn't connected here.

## 2026-07-10 — Landscape rotate-notice shows a broken image (GIF filename mismatch)

**Area:** `components/MountainViewer.tsx` · **Branch:** `dev` · **Severity:** low (cosmetic) ·
**Status:** ✅ fixed (filename match; file exists on disk).

### Symptom

Rotating a phone to landscape on the map view shows the "지도는 세로 모드에서만…" rotate notice, but
the decorative cat GIF renders as a broken image.

### Root cause

The `<Image src>` requested `/images/chubby-cat.gif` (hyphen) while the file on disk is
`public/images/chubby_cat.gif` (**underscore**) → 404 → broken image.

### Fix

Point the reference at the real filename (`/images/chubby_cat.gif`). One-char change; grep
confirmed it's the only reference.

---

## 2026-07-10 — Mobile logout does nothing: confirm modal opens but the button never logs out

**Area:** `components/Navigation.tsx` (mobile outside-click handler) · **Branch:** `dev` ·
**Severity:** medium (mobile UX, auth) · **Status:** ✅ fixed; outside-click regression
browser-verified (390px). Live logout is credential/device-owed.

### Symptom

On mobile: open the hamburger menu → tap 로그아웃 → the logout confirm modal appears, but
tapping the red 로그아웃 button doesn't log the user out — the modal just disappears and the
session stays signed in.

### Root cause

The mobile menu's dismiss-on-outside-click handler (added in `c632f76`) listens on
**`pointerdown`** and closes the menu for any target not inside `<header>`. `LogoutModal` (the
shared `Modal`) renders through a **portal to `document.body`**, i.e. _outside_ the header. So
tapping the confirm button fires `pointerdown` first → handler runs → `setIsMobileMenuOpen(false)`
→ the menu unmounts → `NavigationBarLogout` (a child of the menu) unmounts → `LogoutModal` unmounts
**before the button's `click` fires**. `handleLogout`/`signOut()` never runs. `pointerdown`
precedes `click`, so the modal was destroyed in the gap. Mobile-only because that's where the
menu (and its outside-click handler) exists.

### Fix

In the outside-click handler, also treat taps inside an open overlay as "inside" — bail when the
`pointerdown` target is within a `[role="dialog"]` (the shared `Modal` root carries that role):

```tsx
if (target instanceof Element && target.closest('[role="dialog"]')) return;
```

The menu stays mounted while the modal is up, so the confirm button's `click` lands and logout
runs. (Composes with the sibling fix that closes the menu on `isAuthenticated` change: after
logout completes the menu closes cleanly.)

### Verified

`tsc` clean; smoke 25/25. Browser (390px harness): opened the menu, tapped the map (a genuine
outside tap) → menu still closes — the edit didn't regress the dismiss path. The logout leg
itself needs a signed-in session (credential/device-owed, per A4); root cause + fix are
mechanism-certain (pointerdown-before-click unmount).

---

## 2026-07-10 — Mobile hamburger menu stays open across login navigation / after sign-in

**Area:** `components/Navigation.tsx` · **Branch:** `dev` · **Severity:** medium (mobile UX) ·
**Status:** ✅ fixed; bug #1 browser-verified (390px harness), bug #2 mechanism-verified
(live sign-in is device/credential-owed, per A4).

### Symptom

On mobile, two related glitches during login: (1) tapping 로그인/등록 in the open hamburger
dropdown navigated to `/login` but the dropdown **stayed open** over the login page; (2) after a
successful sign-in the dropdown **still didn't disappear**.

### Root cause

`Navigation` is rendered in the **root `layout.tsx`**, so it persists across every client-side
route transition — the `isMobileMenuOpen` state was never reset. The mobile nav's regular
`NavItem`s each call `closeMobile` on click, but the login/logout links (`NavigationBarLogin/Logout`)
don't, so tapping login left the menu open (bug #1). After login, `router.push(redirect)` fires;
because the 로그인 link sets `redirect=<current path>`, the post-login route can equal the route the
user started on, so **pathname alone may not change** — nothing reset the still-open menu (bug #2).

### Fix

Added one effect in `Navigation` that closes the mobile menu whenever **`pathname` or
`isAuthenticated`** changes:

```tsx
useEffect(() => {
  setIsMobileMenuOpen(false);
}, [pathname, isAuthenticated]);
```

Pathname change covers navigating to /login (and any post-login redirect to a different route);
the `isAuthenticated` dependency covers the same-route redirect case. Root-cause fix at the
state owner rather than sprinkling `closeMobile` onto each link.

### Verified

`tsc` clean; smoke 25/25. Browser (390px iframe harness on a fresh dev server): opened the
hamburger, tapped 로그인/등록 → login page rendered with the dropdown **fully closed** (bug #1).
`<Link>` is client-side nav + the layout-level Navigation doesn't remount, so the close is the
effect firing, not a page reload. Bug #2 shares the same effect (`isAuthenticated` dep); the live
signed-in transition is credential/device-owed.

---

## 2026-07-05 — 급식소 CMS coordinate inputs: can't edit any digit but the last (caret jumps to end)

**Area:** `components/admin/PointMapPicker.tsx` (`CoordInput`) · **Branch:** `dev` ·
**Severity:** low (admin UX) · **Status:** ✅ fixed + browser-verified.

### Symptom

In the 급식소 관리 add/edit form, the 가로/세로 % number fields couldn't be edited by typing
anywhere except the last character — e.g. changing the leading digit of `86` was impossible; only
the up/down arrows worked (and those step 0.1, so re-typing a value was tedious).

### Root cause

`CoordInput` was a fully-controlled number input bound straight to the parent's **number**
(`value={value}`), and its `onChange` called the parent `onChange` on **every keystroke**. Each
keystroke re-rendered the parent, which pushed the reformatted number back into the input's `value`;
React then reset the DOM value and **snapped the caret to the end**. So any edit at a non-terminal
caret position was immediately undone and the caret bounced to the end — the arrows worked only
because they replace the whole value atomically.

### Fix

Give `CoordInput` its own draft **string** state (`text`) and bind `value={text}`, so the field
shows exactly what's typed. Still call the parent `onChange` live (marker stays in sync), but
**re-sync `text` from the prop only when the prop changes from an outside source** (map click/drag,
loading a point) — guarded by comparing the prop to the parsed text so committing a keystroke never
overwrites in-progress typing. Normalize `text` to the committed value on blur.

### Verified

`tsc` clean; browser: in the edit form set 가로 to `5`, moved the caret to the start (Home) and
typed `3` → field became `35` (insert at front), not `53` (the old caret-jump). No console errors.

## 2026-07-05 — Mobile map pins vanishing / drawn outside the map / stuck pan — the durable fix (replaced markercluster)

**Area:** `LeafletMountainMap.tsx` (`PointMarkersLayer`), new `utils/mapClustering.ts` ·
**Branch:** `dev` · **Severity:** medium (mobile UX, recurring) · **Status:** ✅ fixed in code —
**S22 device verification owed**. **Supersedes** the four min-zoom / `bounceAtZoomLimits` entries
below (all were shims for the same coupling this removes).

### Symptom

On mobile, after some zoom in/out manipulation the individual (non-consolidated) cat-thumbnail
pins **randomly disappear**; sometimes the pan also **gets stuck** showing only part of the map,
with number-cluster badges or broken-out pins **rendered outside the image**. Reproduces on a
Galaxy **S22** but **not** a Note 9 — the same device split seen across all the prior map fixes.

### Root cause (structural — why it kept coming back)

`leaflet.markercluster` is built for **tile maps with integer zoom** and `zoomSnap=1`. We ran it on
a `CRS.Simple` plane with **negative, fractional** zoom (`zoomSnap=0`) and a **hard min-zoom clamp
we mutate at runtime** (`map.setMinZoom(fillZoom)`) — outside its design envelope. Confirmed in the
library source (`leaflet.markercluster@1.5.3`): `_generateInitialClusters` caches `this._maxZoom`
**once** but the min-zoom floor is re-read **live** from `map.getMinZoom()` in **11** runtime
add/remove/zoom-animation paths (`this._minZoom =` appears **0** times). So the cluster grid — built
against our temporary `floor(fill − 4)` — and the live runtime floor `floor(fill)` **permanently
disagree**, and every reachable rounded zoom has to thread that mismatch.

Whether a device trips it depends on **where the fractional `fillZoom` lands relative to the integer
grid**, and `fillZoom = getBoundsZoom(bounds)` is a function of the **viewport's pixel size** — so
the Note 9 sits in a safe spot while the S22 straddles a boundary. A transient/interrupted pinch
nudges `Math.round(zoom)` across a level whose grid state is inconsistent → markers removed and not
re-added (**vanish**) or re-added against a stale pixel origin (**drawn outside**); the interrupted
zoom animation also desyncs Leaflet's pixel origin so `maxBounds` + `maxBoundsViscosity:1` clamps
panning wrong (**stuck / partial**). All three symptoms are the _same_ desync. Every earlier fix
(floor-vs-exact clamp, temp-lower-minZoom-by-4, `bounceAtZoomLimits=false`) patched one manifestation
of this coupling, so a new device/gesture kept reopening it.

### Fix (durable — remove the coupling, not patch it)

Replaced `leaflet.markercluster` on mobile with **static, zoom-independent clustering**
(`utils/mapClustering.ts`, pure + unit-tested). Points are projected to a fixed pixel space (the
fill/default view) and grouped **once** by pixel radius (`greedyClusterByRadius`, honoring the
per-mountain `maxClusterRadius`); the grouping **never re-runs on zoom**, so there is no cluster grid
and thus **no fractional-vs-integer boundary for a device to land on** — device-independent by
construction. Multi-point clusters show a count badge; tapping fans the members out on a ring
(`spiderfyRadius`) with leg lines, collapsing on a background tap or any zoom change (the ring is
placed in screen space at the open zoom). Stand-alone points and desktop are unchanged (plain pins).
Removed: the markercluster import + CSS, the temp-lower-minZoom-by-4 trick, and the `L.MarkerCluster`
type coupling. The exact-`fillZoom` min-zoom clamp and `bounceAtZoomLimits={false}` stay — they now
only frame the image (grey-margin hard stop), no longer propping up a zoom-coupled cluster engine.

### Verified

`tsc --noEmit` clean; `npm test` 33/33 (25 smoke + 8 new `mapClustering` unit tests). Phone-width
iframe harness (390px): renders **4 pins + 2 clusters** (unchanged baseline); tapping a cluster fans
2 members + 2 legs and hides the badge (opacity 1→0); background tap, a zoom change, and re-tapping
the badge each collapse it (pins 6→4, legs→0, badge→1); a fanned member opens the cat gallery.
**Device-owed:** the real S22 two-finger pinch in/out that used to trigger the desync (the harness
can't emulate touch/pinch/DPR). Desktop map is code-equivalent (plain pins) but not harness-rendered
(dynamic import stalls ≥768px — pre-existing).

### Follow-up

`leaflet.markercluster` is now unused (dead dependency) — safe to `npm uninstall` it in a cleanup
pass; left in `package.json` for now to keep this change focused.

---

## 2026-07-05 — Mountain-selector dropdown clipped on the left (계양산 → 양산)

**Area:** `MountainSelector.tsx` (dropdown panel) · **Branch:** `dev` · **Severity:** low
(cosmetic) · **Status:** ✅ fixed + harness-verified.

### Symptom

Opening the "계양산" dropdown in the header, the panel's **left edge was cut off** — the mountain
name rendered as "양산" (계 clipped), the description as "…양산에서 살고 있는…", and the placeholder
as "…른 산들을 위한 자리." Most visible on a phone; a smaller latent clip existed on desktop too.

### Root cause

The panel is `absolute right-0 w-72` (288px) — it opens **leftward** from a button anchored in the
header's **left** group (logo + title + selector). That button's right edge is **content-driven**
(~257px on a phone, ~273px on desktop) and essentially **independent of viewport width**, so a
288px panel pinned to it by `right-0` pushed its left edge off-screen: measured **left ≈ −31px**
on a 390px phone and **−15px** even at 1280px desktop.

### Fix

One line — `w-72` → `w-60` (240px). With `right-0` the right edge stays pinned to the button, so a
narrower panel pulls the **left edge back on-screen** (the overflow is `width − buttonRight`). 240px
still holds the mountain name + description (wraps fine). Uniform width fixes both the phone and the
latent desktop clip; no responsive rule needed since the button's right edge is ~constant.

### Verified

Phone-width iframe harness (`resize_window` is broken — see memory): panel left went
**−31 → +123px** (390px phone) and **−15 → +139px** (1280px desktop); screenshot confirms "계양산",
the full description, and the placeholder all render un-clipped. `tsc --noEmit` clean +
`npm run test:smoke` 25/25.

---

## 2026-07-04 — Mobile map: cat-thumbnail pins vanished on S22 after a pinch-out bounce-back

**Area:** `LeafletMountainMap.tsx` (`MapContainer` options) · **Branch:** `dev` · **Severity:**
medium (mobile UX) · **Status:** ✅ fixed in code — **device verification (S22) owed**.
**Follow-on to** the three min-zoom entries below (the clamp fixed the resting zoom; this fixes
the transient pinch gesture).

### Symptom

On a Galaxy **S22** (not a Note 9), after a pinch-out the map "snaps back to fit the screen,"
and when it does the **individual cat-thumbnail pins randomly disappear** — while the
consolidated **number clusters stay**. Zoom-out no longer over-shoots the resting position (the
earlier `minZoom = fillZoom` clamp fixed that); this is the marker loss on the bounce-back.

### Root cause

Leaflet's `TouchZoom._onTouchMove` only hard-clamps a pinch to the zoom limits when
`bounceAtZoomLimits` is `false`; it **defaults to `true`**, which we never overrode. So a
pinch-out let the live gesture zoom travel **below `minZoom` (= the fill zoom)** mid-pinch.
`leaflet.markercluster` reacts to that transient sub-fill zoom by **merging the standalone pins
into clusters** (coarser `Math.round(zoom)` grid level, `_mergeSplitClusters`); on touch-end the
map **bounces back to fit** and markercluster is supposed to **split** them back out. That
split-back succeeds on the Note 9 but **intermittently fails on the S22** (device-dependent
timing / fractional-zoom rounding in the merge/split state machine) — so the individual pins
stay merged-away while the number clusters (already clusters) persist.

### Fix

`bounceAtZoomLimits={false}` on the `MapContainer`. A pinch now **hard-stops at fill** instead
of overshooting and bouncing, so the sub-fill excursion never happens → no spurious merge → no
fail-split → the thumbnail pins stay put. Device-independent; complements the `minZoom → exact
fillZoom` clamp (which governs the _committed_ zoom) by governing the _transient_ gesture.
Doesn't touch desktop (no touch-zoom) or the cluster split-animation feel.

### Verified

`tsc --noEmit` clean + `npm run test:smoke` 25/25. **Device verification owed:** the trigger is a
real two-finger pinch + the S22-specific bounce/rounding, which the iframe harness can't emulate
(touch/pinch/DPR are device-owed). Owner to confirm on the S22: pinch-out hard-stops at fit and
the thumbnail pins remain after release.

---

## 2026-07-04 — Mobile map: zoom-out grey persisted on S22 (device-dependent floor clamp) + pins

**Area:** `LeafletMountainMap.tsx` (`MapViewController` + `PointMarkersLayer`) · **Branch:**
`dev` · **Severity:** medium (mobile UX) · **Status:** ✅ fixed · **Supersedes** the
`Math.floor` clamp in the entry below.

### Symptom

The zoom-out restriction worked on a Galaxy Note 9 (map hard-stops at fit) but **not on an
S22**: on the S22 a pinch-out left the map resting zoomed-out with grey margins.

### Root cause

The previous fix clamped `minZoom = Math.floor(fillZoom)`. The floor's distance below the
exact (fractional) fill zoom depends on where `fillZoom` falls between integers, which depends
on the device's viewport size. On the Note 9 `floor(fillZoom) ≈ fillZoom` (hard stop at fit);
on the S22 the floor sat ~1 zoom level below fill, so the map could rest there showing grey.
`Math.floor` was used because clamping to the _exact_ fractional fill made `leaflet.markercluster`
collapse every marker into the top cluster (no individual cat pins) — a real tension: exact
clamp = no pins, floor = device-dependent grey.

### Fix

Break the tension by decoupling the two needs:

- **Zoom limit:** clamp `minZoom` to the **exact** `fillZoom` → a true hard stop at fit on
  every device (no grey, no floor, no snap-back — a `zoomend` snap-back was tried and abandoned:
  Leaflet swallows a `setZoom` issued from within a `zoomend` handler).
- **Pins:** in `PointMarkersLayer`, **temporarily lower `minZoom` (−4) while the cluster grid
  is built** (`layer.addTo(map)` → markercluster reads `map.getMinZoom()` for its grid range),
  then restore the exact clamp. The grid then spans below fill and keeps a level at the display
  zoom, so the 4 individual pins + 2 clusters render — while the map still can't zoom out past
  fill.

### Verified

`tsc --noEmit` clean + `npm run test:smoke` 25/25. Real tab (410×776 portrait), via an exposed
map handle: `setZoom(-2)` holds at fill (−0.979), image fills (no grey); default shows 4 pins +
2 clusters; drag disabled at fill (`touch-action: pan-x pan-y`, page scrolls) and enabled when
zoomed in (`touch-action: none`, map pans). Device-independent — no Note 9 vs S22 divergence.

---

## 2026-07-04 — Mobile map: cat-thumbnail pins vanished at default zoom (min-zoom clamp regression)

**Area:** `LeafletMountainMap.tsx` (`MapViewController`) · **Branch:** `dev` · **Severity:**
medium (markers missing) · **Status:** ✅ fixed · **Follow-up to** the min-zoom clamp in the
entry below (commit `6eb1937`).

### Symptom

After the map fixes, the default portrait view showed **only clusters** — the individual
cat-thumbnail pins were gone (verified: 0 `.mohocat-pin` vs the original 4 pins + 2 clusters).

### Root cause

The Symptom-1 fix set `map.setMinZoom(getBoundsZoom(bounds))` — the **fractional** fill zoom
(e.g. −0.98). `leaflet.markercluster` builds its cluster grids at **integer** zoom levels from
`map.getMaxZoom()` down to `map.getMinZoom()`. With a fractional minZoom of −0.98 the loop stops
at level 0 (−1 < −0.98), so there is **no grid level at the display zoom** (≈−1); markercluster
falls back to the fully-merged top clusters → every marker collapses, no individual pins.
(Bisected by disabling `setMinZoom` → pins returned; the displayed zoom was identical either
way, proving it was the minZoom value, not the view.)

### Fix

Clamp minZoom to `Math.floor(fillZoom)` (an integer at/below the display zoom) so markercluster
has a grid level there → the original 4 pins + 2 clusters render again. Cost: a pinch can now
reach ~1 level below exact fill (a hair of grey) vs. exactly fill — still far better than the
pre-fix −3. The Symptom-3 drag-gate was also re-pointed from `getMinZoom()` to the exact
`fillZoom` (a closure var updated by `applyFit`), since minZoom is now floored _below_ fill and
would otherwise enable drag at the default view (re-trapping page scroll).

### Verified

`tsc --noEmit` clean + `npm run test:smoke` 25/25. Real-tab (410×776 portrait): 4 pins + 2
clusters render with cat thumbnails, drag disabled at fill (`touch-action: pan-x pan-y`, no
`leaflet-grab`), map fills with no grey at default.

---

## 2026-07-04 — Mobile map: zoom-out grey margins, landscape wastes space, can't scroll the page

**Area:** `LeafletMountainMap.tsx`, `MountainViewer.tsx`, `Compass.tsx`, new
`hooks/useIsPortrait.ts` · **Branch:** `dev` · **Severity:** medium (mobile UX) ·
**Status:** ✅ fixed (device verification of touch/pinch still owed)

Three reported symptoms on mobile (Samsung Galaxy S22), diagnosed together as they all live
in the map engine.

### Symptom 1 — grey margins when zooming out

**Symptom:** pinching to zoom out shrank the map below the screen, exposing grey borders.
**Root cause:** `MapContainer minZoom={-3}` allowed zooming ~3 levels below the fit-to-fill
zoom; the image shrank inside the container and its `bg-gray-100` showed through. `maxBounds`
constrains _panning_ but not _zoom_.
**Fix:** `MapViewController` now clamps `minZoom` to the fill zoom (`map.getBoundsZoom(bounds)`),
recomputed on resize, so fill is ~the furthest-out zoom. **(Amended — see the newer entry
above:** the clamp uses `Math.floor(fillZoom)`, not the raw fractional value, so
`leaflet.markercluster` keeps a grid level at the display zoom and individual pins still show.)

### Symptom 2 — landscape rotation crams the portrait map sideways

**Symptom:** rotating the phone to landscape left the tall portrait map jammed into the short
screen (its short side spanning the screen's long side), defeating the portrait default.
**Root cause:** the portrait-vs-landscape image was chosen by **`useIsMobile()` = viewport
width < 768px**, not orientation. A landscape phone under 768px wide kept `isMobile` true →
the 90°-rotated portrait image on a landscape screen (verified: 667×375 → map 667×1334).
**Fix:** added `useIsPortrait()` (`matchMedia('(orientation: portrait)')`). The image, coord
rotation, container aspect ratio, compass, and remount `key` now follow **orientation**;
`isMobile` (width) still gates clustering / +−-buttons / drag. Verified: every landscape
viewport (sub- and super-768) now serves the LANDSCAPE image; portrait serves the portrait.

### Symptom 3 — can't scroll the page over the map

**Symptom:** one-finger swipe couldn't scroll past the full-height map to the content below.
**Root cause:** Leaflet's one-finger touch `dragging` (default on) captured vertical swipes
and set `touch-action: none`, trapping the page; the only scroll pass-through was mouse-wheel

- ⌘/Ctrl (desktop), with no touch equivalent. At fill the map is `maxBounds`-locked, so the
  drag did nothing anyway.
  **Fix (owner-chosen model):** on mobile, keep `dragging` **disabled at fill** (restores
  `touch-action: pan-x pan-y` → the page scrolls) and enable it only on `zoomend` once zoom
  > min (fill), where there's room to pan. Pinch-zoom + 전체보기 restore still work. Verified in
  > harness: at fill the container lacks `leaflet-grab` and reports `touch-action: pan-x pan-y`.

### Verified

`tsc --noEmit` clean + `npm run test:smoke` 25/25. Browser-verified in the true-reflow iframe
harness: orientation→image mapping across 360×780 / 667×375 / 780×360, drag disabled + page
touch-action restored on mobile, map fills with no grey at default. **Still device-owed** (the
iframe can't emulate touch/pinch/true rotation): the pinch-out min-zoom clamp feel, one-finger
page scroll, and zoom-in-then-drag on a real S22. Desktop landscape couldn't be rendered in
the harness (dynamic-import stalls at wide iframe widths — pre-existing, not this change) but
its code path is unchanged for `portrait=false` / non-mobile.

---

## 2026-07-03 — 냥이들 desktop-table thumbnails rendered as vertical ellipses (preflight max-width clamp)

**Area:** `/pages/cats` (`CatsBrowser.tsx` `CatThumb`) · **Branch:** `dev` ·
**Severity:** low (cosmetic) · **Status:** ✅ fixed

### Symptom

On `/pages/cats` the desktop data-table thumbnails looked distorted — narrower
horizontally than vertically (squished vertical ellipses for photo cats; photo-less
placeholder cats looked fine).

### Root cause

Tailwind's preflight sets `img { max-width: 100% }`. The 사진 column was `w-16` (64px) with
`px-4` (32px) padding → only **32px** of content width, so the 44px `<Image>` was clamped to
32px wide while its inline `height: 44` stayed → a 32×44 render. Photo-less cats use a
`<div>` placeholder (not `img`), which preflight doesn't touch — hence only real photos
distorted, which pointed straight at the `img` rule.

### Fix

`max-w-none` on the `<Image>` (so the inline `width` is honored) + widened the photo column
`w-16` → `w-20` for breathing room. (Same change also reverted the thumbnail from circular
back to square — see the sibling `FEATURE_MOD_LOG` entry.)

### Verified

Browser-zoomed `/pages/cats`: thumbnails render as even 44×44 squares. `tsc --noEmit` clean,
`npm run test:smoke` 25/25.

---

## 2026-07-02 — `[catmodal:name]` links in posts rendered as broken `<a>` (link-converter ordering)

**Area:** text processing (`utils/text-processing.ts` / `CatLinkedText`) · **Branch:**
`dev` · **Severity:** medium (dead link instead of cat modal) · **Status:** ✅ fixed

### Symptom

A `[catmodal:깡패]` reference written in a post did not open the cat modal. When the
author wrote the paren form `[catmodal:깡패](url)`, it rendered as a normal `<a>` that
opened a new tab to a 404.

### Root cause

`processTextWithLinks` ran `convertMarkdownLinks` **before** `convertCatModalLinks`. The
generic markdown regex `\[([^\]]+)\]\(([^)]+)\)` matches `[catmodal:name](url)` first,
capturing it as a `[label](url)` link — so the specific `[catmodal:name]` converter never
saw it, and the token became a broken anchor instead of a cat-modal span.

### Fix

Reordered `processTextWithLinks` to convert cat-modal links **first**, then markdown
links, then auto-detected URLs (with a comment noting the ordering is load-bearing). The
specific pattern now wins over the generic one. `utils/text-processing.ts`. A reusable
`components/CatLinkedText.tsx` renders the processed text and opens the cat modal on
cat-link click.

### Watch-out

`[catmodal:이름]` takes **no** parentheses (per the admin help string). Any `(…)` written
right after the token still renders as literal text — the correct syntax is the bare
`[catmodal:이름]`.

---

## 2026-07-02 — 입양홍보 admin tab showed 급식현황 posts (stale state on failed fetch)

**Area:** admin posts (`AdminPostList`) · **Branch:** `dev` · **Severity:** medium
(wrong data shown) · **Status:** ✅ fixed

### Symptom

In `/admin/posts`, opening the 입양홍보 tab showed the 급식현황 (butler_stream /
`posts_feeding`) posts — data that belongs to a different tab.

### Root cause

Not a service mixup — `serviceFor('adoption_promotion')` correctly returns the
adoption service. It's **stale React state**: `AdminPostList` keeps one `posts`
state across tabs. Viewing 급식현황 first loads feeding posts into `posts`. Switching
to 입양홍보 refetches, but the adoption read **throws** (the new `posts_adoption`
Firestore rule isn't deployed yet → permission denied), and `fetchPosts`'s `catch`
only logs — it never clears `posts`. So the previous tab's feeding posts stayed on
screen. The tab-switch effect reset `currentPage` but not `posts`/`totalPages`.

### Fix

Clear the list on tab switch: the `[postType]` effect now also does
`setPosts([])` + `setTotalPages(1)`. A failed or empty fetch for the new tab can no
longer leave another tab's posts visible (adoption now correctly shows the empty
state until its rule is deployed and a post exists). `AdminPostList.tsx`.

### Note

The underlying adoption read fails only because the `posts_adoption` rule is not
yet deployed (`firebase deploy --only firestore:rules`). Once deployed, the tab
reads real adoption posts; the stale-state fix is correct regardless.

### Watch-out

`AdminPostList.fetchPosts` swallows errors without clearing `posts` — any tab whose
fetch fails would otherwise keep showing the prior tab's data. The tab-switch clear
covers the switch case; a mid-tab refetch failure still leaves stale data (minor).

---

## 2026-07-02 — Admin force-logout on localhost (cross-tab sign-out from idle background tabs)

**Area:** admin auth (`useIdleTimeout` / `AdminAuth`) · **Branch:** `dev` ·
**Severity:** medium (session dropped mid-use) · **Status:** ✅ fixed

### Symptom

On `localhost`, the admin CMS repeatedly force-logged-out right after sign-in;
never on Vercel, never in incognito. Console showed a Firestore
`net::ERR_BLOCKED_BY_CLIENT` and "Missing or insufficient permissions" — both red
herrings (see below).

### Root cause

The stack trace of the drop was **not** an app `signOut()` call — it was Firebase
Auth's own `_onStorageEvent → _updateCurrentUser(null) → notifyAuthListeners`.
Firebase's `browserLocalPersistence` **syncs auth state across all same-origin
tabs via localStorage**: when any tab clears the `firebase:authUser:*` key, every
other tab gets a `storage` event and follows it to "signed out". The Firestore
`ERR_BLOCKED_BY_CLIENT` was a _downstream symptom_ — Firebase closing the
Firestore webchannel because the credential just changed. The "Missing/insufficient
permissions" is a separate, harmless `loadConfig()` read that falls back to local
defaults (happens on both envs).

The trigger: **leftover Claude-controlled `localhost` admin tabs from an
idle-timeout smoke test** (timeout temporarily set to **8s**). Each backgrounded
tab has its **own** idle timer, receives no mouse/keyboard events, so it counted
as idle, fired `signOut()`, and broadcast the logout to the active tab. Closing
the extra tabs stopped it — confirming cross-tab propagation, not an extension.
(This also exposed a latent flaw: even at 2h, a forgotten background admin tab
would eventually sign the user out of their active tab.)

### Fix

Made `useIdleTimeout` **cross-tab aware** via an optional `storageKey`: activity
writes a shared last-activity timestamp to localStorage, and the idle check uses
`max(thisTab, sharedAcrossTabs)`. So any tab's activity keeps every tab alive, and
`onTimeout` only fires once **all** tabs are idle. `AdminAuth` passes
`ADMIN_IDLE_ACTIVITY_KEY`. (localStorage access degrades gracefully to per-tab
behavior if unavailable.)

### Verified

- `tsc --noEmit` clean · smoke 25/25.
- Owner confirmed the force-logouts stopped after closing the stale tabs; the
  fix removes the underlying cross-tab-idle race. Multi-tab timing is logic-level
  (not automated) — manual check: open admin in two tabs, keep one active, and the
  other no longer times out.

### Watch-out

Don't leave short-timeout idle-test tabs open — with cross-tab auth sync they log
out every other tab. Verify idle-timeout changes in a real browser, then close the
tabs.

---

## 2026-07-02 — Map doesn't re-fit on window resize (desktop fixed · mobile pending)

**Area:** landing map (`LeafletMountainMap` / `MapViewController`) · **Branch:**
`dev` · **Severity:** low (cosmetic; recoverable via the fit button) ·
**Status:** ✅ desktop · ⏳ mobile (tracked in PROJECT_PLAN §4)

### Symptom

Resizing the browser window left the map at its old dimensions: white margins
around it when the window grew, clipped/partial map when it shrank. Clicking the
전체 보기 (fit) control fixed it.

### Root cause

The container is `h-full w-full`, so the DIV resizes with the window, and
Leaflet's built-in `trackResize` keeps the canvas size in sync
(`invalidateSize`) — but it **preserves zoom**, so the image stays at its old
scale relative to the new viewport. Nothing re-fit the view to the new size.

### Fix

In `MapViewController`, on a debounced (150ms) window `resize`, call
`map.invalidateSize({ animate: false })` then `map.fitBounds(bounds)` — i.e. the
same `applyFit()` the 전체 보기 control runs. `invalidateSize` first so `fitBounds`
measures against the new size regardless of handler ordering. Listener cleaned up
on unmount.

**Files:** `src/components/LeafletMountainMap.tsx`.

### Verified

- `npx tsc --noEmit` clean · smoke 25/25.
- **Desktop: confirmed by the owner** in a real browser (re-fits, no margins).
- **Mobile: pending** — owner saw irregularities at mobile widths; deferred to the
  mobile UI phase (PROJECT_PLAN §4, "Map re-fit on window resize — mobile"),
  which must cover the portrait layout and the landscape↔portrait remount
  boundary (`key={isMobile}`).

### Notes / watch-outs

- **The automation could not reproduce a real window resize** for this map:
  `resize_window` didn't change the page viewport, and simulating a resize by
  poking the container height + dispatching a synthetic `resize` event gives
  **false negatives** — even the known-good fit button fails under that
  simulation, because `fitBounds` relies on Leaflet's real layout-driven size
  tracking. Verify map-resize behaviour in a real browser, not via DOM pokes.

---

## 2026-07-02 — Kakao login failure messages shown in English

**Area:** auth (`auth-service` / `AuthProvider`) · **Branch:** `dev` ·
**Severity:** low (Korean-first UI violation)

### Symptom

A failed Kakao login showed an **English** message (e.g. "Kakaotalk sign-in was
cancelled…"), breaking the Korean-first UI.

### Root cause

Not (only) relayed from Kakao/Firebase — the English was **mostly our own
code**. `auth-service.signInWithKakao()`'s catch block built the message from a
`switch (error.code)` where **every case was a hardcoded English string** (and
several were verbose developer text); the `default` relayed the raw upstream
`error.message`. Two other throws (provider-not-enabled early return; anonymous-
link fallback failure) and `AuthProvider`'s fallback (`'Failed to sign in with
Kakaotalk'`) were English too.

### Fix

Added `strings.auth.kakao.errors` (Korean: `cancelled` / `popupBlocked` /
`timeout` / `accountExists` / `generic`). The `switch` now sets a friendly
Korean `errorMessage` per code while **keeping its `console.error` diagnostics**;
config/unknown codes and the raw upstream `error.message` collapse to the generic
Korean message (upstream detail logged to console only — owner's call). The two
out-of-band throws and the `AuthProvider` fallback now use the Korean generic.
Errors surface in the shared login banner (see the entry below).

**Files:** `src/constants/strings.ts`, `src/services/auth-service.ts`,
`src/components/auth/AuthProvider.tsx`.

### Verified

- `npx tsc --noEmit` clean (needed `let errorMessage: string` — `strings` is
  `as const`, which otherwise narrowed it to the `generic` literal) · smoke
  25/25.
- Browser: drove the login flow until the real Kakao OAuth popup opened;
  couldn't cancel it from automation (popup is outside the tab group), so the
  final Korean string was not captured live. Change is a direct English→Korean
  swap; banner placement was verified in the entry below.

---

## 2026-07-01 — Kakao (social) login errors shown under the email login block

**Area:** auth UI (`LoginForm`) · **Branch:** `dev` · **Severity:** low
(cosmetic/UX — error attributed to the wrong sign-in method)

### Symptom

A failed **카카오톡으로 로그인** (Kakao) attempt surfaced its error message in the
red box **below the email/password form**, making the failure look like it
belonged to email login.

### Root cause

`LoginForm` had a single "Error Messages" block rendered **inside the email
`<form>`** that displayed _both_ the email `error` state **and** the
`kakaoSignInError` from `useAuth`. So any Kakao failure appeared under the email
inputs. (Phone login was unaffected — `PhoneLoginForm` shows its own inline
errors next to the phone fields.)

### Fix

Chose the "shared location" approach (owner's call): moved the email + Kakao
error display into **one shared banner at the top of the login form**, above all
sign-in sections, and removed the block from inside the email form. Phone login
intentionally keeps its own field-adjacent inline errors — several are
contextual validation messages ("code format invalid") that read best next to
the phone inputs, and they were never misattributed.

**Files:** `src/components/LoginForm.tsx`.

### Verified

- `npx tsc --noEmit` clean · `npm run test:smoke` 25/25.
- Browser (localhost:3000/login): triggered an email-login failure with bad
  credentials — the error now renders in the top shared banner, not under the
  email form. Kakao errors use the identical banner code path (same
  `(error || kakaoSignInError)` render), so they surface in the same place.

### Notes / watch-outs

- The empty **green** success-message container under the Kakao button
  (`t.kakaoSuccess`) still renders as an empty box even when there's no success
  message — pre-existing cosmetic nit, left as-is (out of scope).

---

## 2026-07-01 — Media album hidden behind the cat modal (map flow only)

**Area:** public overlay stacking (`Modal` / `Lightbox` / `VideoPlayer`) ·
**Branch:** `dev` · **Severity:** medium (feature unusable via one entry point)

### Symptom

From the map: click a feeding-spot marker → click a cat in the gallery → click
**사진 보기** or **동영상 보기**. The album modal opened but was rendered _behind_ the
cat-detail modal, so it was invisible/unusable. The **same** albums worked
correctly when opened from the 입양홍보 (adoption) page.

### Root cause

The public overlays used hand-maintained `z-index` values, and they were
inconsistent with the depth at which `CatInfo` gets rendered:

- `CatGallery` opened its nested cat-detail modal at `z-[60]`.
- The album modals (`PhotoAlbum` / `VideoAlbum`) inside `CatInfo` used `Modal`'s
  **default `z-50`**. Since all modals portal to `<body>`, `50 < 60` meant the
  album painted **below** the cat modal.
- From the adoption page the cat modal is the default `z-50` and the album is
  also `z-50`, but the album mounts **later**, so with equal z-index it stacked
  on top by DOM order — which is why the bug only appeared from the map.

A naive "bump the album's z-index" fix couldn't be made correct: `Lightbox` /
`VideoPlayer` were rendered **inside** the cat modal's subtree and did **not**
portal, so they were confined to the cat modal's stacking context. Elevating the
album above the cat modal would have pushed it above the lightbox/player too,
trading one stacking bug for another.

### Fix

Made overlay `z-index` **dynamic**, derived from the shared layer stack instead
of magic numbers:

- `useModalLayer` already tracked every open overlay in mount order (for
  topmost-only keyboard handling). It now **also returns a `z-index`** computed
  from the layer's depth in that stack (`50 + depth·10`) — one source of truth.
- `Modal` applies that value; its `zIndexClassName` prop and both call-site
  overrides (`CatGallery` `z-[60]`, `CatInfo` `z-[70]`) were removed.
- `Lightbox` and `VideoPlayer` now **portal to `<body>`** and use the same
  stack-derived z-index, so they escape any ancestor stacking context and always
  paint above the album that opened them — at any nesting depth.

Net effect: each overlay always sits exactly one layer above whatever is beneath
it, so the map, adoption, and nested cat-link flows are all correct by
construction.

**Files:** `src/components/ui/useModalLayer.ts`, `src/components/ui/Modal.tsx`,
`src/components/ui/Lightbox.tsx`, `src/components/ui/VideoPlayer.tsx`,
`src/components/CatGallery.tsx`, `src/components/CatInfo.tsx`.

### Verified

- `npx tsc --noEmit` clean · `npm run test:smoke` 25/25.
- Browser (localhost:3000): reproduced the bug from the map flow, applied the
  fix, confirmed the album now renders on top of the cat modal.
- **Caveat:** every cat in the local dataset has an empty album, so the
  `Lightbox` / `VideoPlayer` layers could not be exercised with real media. Their
  fix is correct by construction (same mechanism) but not yet data-verified.

### Notes / watch-outs

- The overlay stacking scheme now lives entirely in `useModalLayer`
  (`BASE_Z_INDEX` / `Z_INDEX_STEP`). Add new overlays by calling `useModalLayer`
  and applying the returned z-index — don't reintroduce hardcoded `z-[…]` on
  modal roots.
- Non-`Modal`, non-portaled transient spinners still carry a hardcoded z
  (`CatInfo` loading overlay `z-[60]`; about-page loading overlay `z-50`). They
  are brief and out of scope here; revisit if a 3-deep nesting makes one appear
  behind a modal.
- Not a Firestore read-rule bug, so the `firebase-read-access-inventory.md`
  cross-check did not apply.
