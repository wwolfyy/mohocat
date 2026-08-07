# 동영상 관리 (`/admin/tag-videos`) — Button Spec Sheet

> **Audience:** whoever operates this page, and agents assisting them.
> **Companion to:** [`README.md`](./README.md) (the general admin manual). This file is the
> button-by-button reference for one page; the manual covers concepts that span pages.
>
> **Derived from source** (`src/app/[mountain]/admin/tag-videos/page.tsx`,
> `useYouTubeVideoMutations.ts`, `src/components/admin/media/*`,
> `src/constants/adminStrings.ts`), verified 2026-07-26. Labels below are exactly what the UI
> shows. If a label here stops matching the screen, the code moved — trust the screen and fix
> this file.

---

## 0. The one thing to understand first

Every video on this page lives in **two places**: the **YouTube channel** (the real video, public)
and **Firestore** (this site's copy of its metadata, which drives the 영상첩 album). Buttons differ
in which of the two they write to, and that is the difference that matters most:

| Writes to                       | Meaning                                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 🔴 **YouTube → then Firestore** | Changes the **public** video on the channel, then copies the result back here. Visible to the whole world. |
| ⚪ **Nothing (local)**          | Only changes what's on screen. Nothing is saved until you press a save button.                             |

⚠️ **A red 🔴 button is a public action.** There is no undo, and a 취소 elsewhere on the page won't
roll it back.

📌 **There is deliberately no "Firestore only" button on this page.** YouTube owns video data;
Firestore is a copy that every sync overwrites from YouTube, clearing anything YouTube doesn't
have. A Firestore-only write therefore cannot survive, so this page performs none — the only
service calls it makes are reads. See
[README §6](./README.md#️-video-data-youtube-is-the-source-of-truth--never-edit-it-in-firebase).

**Permissions.** The page is behind admin login, and every YouTube call requires the
**`manage-video`** permission. Without it the buttons still render, but the calls come back
401/403 and you'll see a failure dialog.

**Token dependency.** Every 🔴 button goes through the shared YouTube OAuth credential. When it
expires (every 7–14 days) they all fail with an authentication error. The fix is the
**🔄 토큰 갱신** button on the **대쉬보드** (`/admin`) — _not on this page_. See
[README §6](./README.md#6-photos--videos--사진동영상-관리-admintag-images-admintag-videos).

---

## 1. Top action row

Three buttons directly under the 서비스 레이어 설정 box.

### 📺 YouTube와 동기화

|              |                                                          |
| ------------ | -------------------------------------------------------- |
| **Writes**   | 🔴 YouTube → Firestore (reads YouTube, writes Firestore) |
| **Scope**    | **Every** video, not just selected ones                  |
| **Confirms** | Yes — a dialog listing what it will do                   |
| **Disabled** | While a sync is running (label → `동기화 중...`)         |

Pulls the channel's current state into this site. Three things happen in order: new videos on
YouTube that aren't in Firestore yet get imported; every YouTube video's metadata is re-read from
YouTube and written into Firestore; playlist membership is re-synced.

📌 **You do not need this after editing on this page.** Every save button already syncs itself —
변경사항 저장 and the batch saves write to YouTube, wait ~3 seconds, then re-read that video into
Firestore (that's what the numbered progress box is doing). This button is for changes this app
**didn't** make: an edit done in YouTube Studio, or a video uploaded straight to the channel.

⚠️ **This copies YouTube → here, overwriting local values.** The confirmation dialog says it
plainly: _"아직 반영되지 않은 최근 변경을 덮어쓸 수 있어요."_ If you edited something here and it
hasn't reached YouTube, this discards that edit — including every date set by
📅 자동 날짜 인식 (see below). Use it deliberately, not as a general "refresh"; that's what
🔄 동영상 새로고침 is for.

⚠️ **Slow, and no progress bar** — it walks every video on the channel.

### 🔄 동영상 새로고침

|              |                                               |
| ------------ | --------------------------------------------- |
| **Writes**   | ⚪ Nothing — re-reads Firestore into the page |
| **Disabled** | While loading (label → `불러오는 중...`)      |

Reloads the list from Firestore. Safe, instant, and the right button when you just want the page
to catch up — someone else's edit, or your own after a save. **This is not the YouTube sync**; it
never contacts YouTube.

### 📅 자동 날짜 인식

|              |                                                          |
| ------------ | -------------------------------------------------------- |
| **Writes**   | 🔴 YouTube → Firestore (one PUT per video)               |
| **Scope**    | Every video with **no** 촬영일, across the whole library |
| **Confirms** | Yes, with a count of what it found                       |
| **Disabled** | While parsing, or while the list is loading              |

Looks for a date pattern in each dateless video's **description** (falling back to its ID), writes
what it finds to that video's recording date **on YouTube**, then syncs the results back to
Firestore in one pass. Reports a per-video success/failure list when done.

⚠️ **This is a public, per-video write** — it can touch a lot of videos in one go, and takes
roughly a second per video plus a 3-second sync at the end. Read the count in the confirmation
before accepting.

⚠️ **It reads the description, not the title.** The per-video
[📅 제목에서 날짜 인식](#-제목에서-날짜-인식) button reads the **title**. Same-looking feature,
different source — one can succeed where the other fails.

_Changed 2026-07-26: this button used to write Firestore only, which meant its dates were erased
by the next sync of that video (the refresh nulls `createdTime` when YouTube has none). It now
writes YouTube first, like every other save here._

---

## 2. Filters & selection bar

### 날짜 지우기

⚪ Local. Appears only when the date filter is on **and** a date is set. Clears both date boxes;
leaves the filter itself on.

### 전체 선택

⚪ Local. Selects **every video matching the current filters** — not just the ones on this page.
Check the `N개 중 a-b 표시` counter before using it with batch actions.

### 선택 해제 (N)

⚪ Local. Appears once something is selected. Clears the selection **and** empties the batch tag
field, the batch date field, and the batch playlist selection.

---

## 3. Batch actions panel

Appears above the grid as soon as one video is selected; the heading counts the selection.
Everything here acts on **all selected videos**, one at a time, continuing past individual
failures and reporting a success/failure tally at the end.

### 태그 저장

|              |                                               |
| ------------ | --------------------------------------------- |
| **Writes**   | 🔴 YouTube → Firestore                        |
| **Disabled** | While saving, or while the tag field is empty |

Sets the tag list on every selected video. Clicking the field opens the cat selector
([§6](#6-고양이-선택-modal)); you can also type freehand, comma-separated.

⚠️ **Replaces, never appends.** Whatever is in the field becomes the video's complete tag list —
existing tags not in the field are removed. Videos whose tags already match are skipped silently.

After the YouTube writes it waits ~3 seconds for YouTube to propagate, syncs Firestore, reloads,
then clears the field.

### 날짜 저장

|              |                                                |
| ------------ | ---------------------------------------------- |
| **Writes**   | 🔴 YouTube → Firestore                         |
| **Disabled** | While saving, or while the date field is empty |

Sets 촬영일 on every selected video. The input takes a **date _and_ time**; the per-video field
takes a date only.

### ✏️ 재생목록 선택

|              |                                       |
| ------------ | ------------------------------------- |
| **Writes**   | ⚪ Nothing — opens the playlist modal |
| **Disabled** | While the playlist list is loading    |

Opens the playlist modal for the **whole selection**; saving happens in the modal
([§7](#7-재생목록-선택-modal)).

⚠️ **Set semantics, like 태그 저장.** Every selected video ends up in **exactly** the playlists you
tick — and is **removed** from any it was in that you didn't. Because a mixed selection has no
single "current" state to show, the modal opens with **nothing ticked**, and saving asks you to
confirm first. If you only want to add videos to one playlist without disturbing their others, do
it per video via [📋 재생목록 관리](#-재생목록-관리).

_Fixed 2026-07-26: this used to apply to whichever single video was open in the edit form,
ignoring the selection entirely (and doing nothing at all if none was open)._

### 취소

⚪ Local. Same as 선택 해제 — clears the selection and all batch inputs.

---

## 4. Video grid & pagination

| Control                  | Writes | Behavior                                                                                     |
| ------------------------ | ------ | -------------------------------------------------------------------------------------------- |
| **Card checkbox**        | ⚪     | Adds/removes that video from the batch selection. Does not open it for editing.              |
| **Card body (click)**    | ⚪     | Opens the video in the right-hand edit form and fills the fields from its current values.    |
| **이전 / 다음 / 1 2 3…** | ⚪     | Pagination only. **Selection survives paging** — a batch action still covers off-page picks. |

**The three dates on a card, and which is which:**

| Shown as         | Field         | Means                                                                        |
| ---------------- | ------------- | ---------------------------------------------------------------------------- |
| 게시:            | `uploadDate`  | When the video was **published on YouTube**. Fixed; never changes on a sync. |
| 촬영:            | `createdTime` | The **recording date** — what 촬영일 edits and the date parsers set.         |
| 메타데이터 수정: | `updated`     | When this site last re-read the video's metadata from YouTube.               |

_Fixed 2026-07-26: every sync used to overwrite 게시일 with the time of the sync, so edited
videos showed today's date and jumped to the top of both the admin grid and the **public**
영상첩 (which sorts by it). 메타데이터 수정 was blank for the mirror-image reason — the refresh
wrote a field nothing read. Mis-stamped videos repair themselves on their next sync._

Card badges are read-only: 태그됨/태그 없음, YouTube/Storage, and a purple overlay while
자동 날짜 인식 is working on that card.

---

## 5. Edit form (right column)

Appears when you click a card. **All fields here are YouTube-only** — a Storage video shows the
info block but no editable fields, and saving one is refused with
`YouTube 동영상만 이 화면에서 편집할 수 있어요.`

### 🐱 선택

⚪ Local. Opens the cat selector for this video's tags. The text field is also clickable, and
accepts typing.

### × (on a tag chip)

⚪ Local. Removes that one tag from the field. **Not saved** until 변경사항 저장.

### 📅 제목에서 날짜 인식

⚪ Local — fills the 촬영일 box, saves nothing. Reads the **title** (unlike bulk
자동 날짜 인식, which reads the description) and shifts the result to KST. Tells you what it found,
or that it found nothing. Still needs 변경사항 저장.

### 변경사항 저장

|              |                        |
| ------------ | ---------------------- |
| **Writes**   | 🔴 YouTube → Firestore |
| **Disabled** | While saving           |

The main save. Compares each field against the loaded video and sends **only what changed**; if
nothing changed it says `저장할 변경사항이 없어요.` and stops.

Four steps, shown live in the progress box (expect **5–10 seconds**):

1. Write the changed fields to YouTube (`PUT /api/update-youtube-video`).
2. Wait ~3 seconds for YouTube to propagate.
3. Re-read the video from YouTube into Firestore (`POST /api/refresh-video-metadata`).
4. Reload the list and re-fill the form from the saved result.

⚠️ **Don't navigate away mid-save** — you can leave YouTube updated but Firestore stale. If that
happens, 📺 YouTube와 동기화 repairs it.

⚠️ **촬영일 is saved as a date only** (time becomes 00:00 UTC), so a video can appear to shift by
a day in a different timezone.

### 📋 재생목록 관리

|              |                                                      |
| ------------ | ---------------------------------------------------- |
| **Writes**   | ⚪ Nothing — opens the playlist modal for this video |
| **Disabled** | While playlists are loading or saving                |

Opens the modal **pre-ticked with the playlists this video is already in**. This is the working
path for playlist changes (see the batch bug in §3).

### YouTube에서 보기 →

A link, not a button. Opens the video on YouTube in a new tab.

---

## 6. 고양이 선택 modal

Shared with other admin pages. Opened from the batch tag field or 🐱 선택; the title says which.

| Button              | Writes | Behavior                                                                    |
| ------------------- | ------ | --------------------------------------------------------------------------- |
| **전체 해제**       | ⚪     | Unticks every cat **inside the modal**. Doesn't touch the field until 완료. |
| **완료 (N개 선택)** | ⚪     | Writes the selection into the tag field it was opened from, and closes.     |
| **× / backdrop**    | ⚪     | Closes and **discards** the modal's changes.                                |

**Commit-on-done:** ticking cats changes nothing until 완료. Nothing here reaches YouTube — you
still need 태그 저장 (batch) or 변경사항 저장 (single).

---

## 7. 재생목록 선택 modal

The modal is opened from two places and behaves differently in each — the title tells you which
(`재생목록 선택` vs `재생목록 선택 (일괄 작업)`).

| Button                         | Writes                 | Behavior                                                                                                                                                                                                                                            |
| ------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **변경사항 저장 (N개 선택됨)** | 🔴 YouTube → Firestore | **Single:** adds/removes that video to match the ticks — no confirmation, since the modal opened pre-ticked with its real membership. **Batch:** confirms first, then sets **every selected video** to exactly the ticked playlists, one at a time. |
| **취소**                       | ⚪                     | Closes and resets the ticks (to the video's real playlists; to nothing in batch).                                                                                                                                                                   |
| **×**                          | ⚪                     | Closes without resetting — the ticks stay as you left them for the next open.                                                                                                                                                                       |

Saving diffs against each video's own current membership and applies the adds/removes
individually, then re-syncs Firestore. A partial failure still reports what succeeded; the batch
save reports a success/failure tally. Both 취소 and × are disabled while saving.

---

## 8. Quick reference — what is safe to click

| Safe anytime (⚪)          | Public, irreversible (🔴)      |
| -------------------------- | ------------------------------ |
| 🔄 동영상 새로고침         | 📺 YouTube와 동기화            |
| 전체 선택 / 선택 해제      | 📅 자동 날짜 인식              |
| 날짜 지우기                | 태그 저장 (batch)              |
| 🐱 선택 / 전체 해제 / 완료 | 날짜 저장 (batch)              |
| 📅 제목에서 날짜 인식      | 변경사항 저장                  |
| Pagination, checkboxes     | 변경사항 저장 (playlist modal) |

---

## Open issues on this page

1. 📌 **Two date-parsers with different sources** (§1, §5) — bulk reads the description, per-video
   reads the title. Easy to mistake one for the other.
2. ✅ **Batch playlist assignment — FIXED 2026-07-26** (§3). It applied to the single video open in
   the edit form, ignoring the selection. Now applies to every selected video, with set semantics
   and a confirmation.
3. ✅ **자동 날짜 인식 writing Firestore only — FIXED 2026-07-26.** It now writes YouTube first.
   The underlying hazard is unchanged, though: `refresh-video-metadata` overwrites Firestore's
   `createdTime`, `tags`, `location`, `title` and `description` from YouTube on every sync, and
   **nulls** them when YouTube has none. Any future code that writes video data straight to
   Firestore will be silently undone the same way.
