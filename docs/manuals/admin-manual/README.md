# 산냥이집냥이 — Admin Manual (Operations & Configuration)

> **Audience:** whoever operates the site through the `/admin` CMS (owner + trusted
> volunteers), and agents assisting them. This is a **how-to / operations** manual —
> "what do I click and type to make the site do X." It is deliberately separate from
> the developer deep-dives in [`docs/codebase/`](../../codebase/) (how the code is built)
> and the status trackers in [`docs/planning/`](../../planning/).
>
> Written in English with the Korean UI labels inline (the admin UI is Korean). Ping
> the owner if a fully-Korean volunteer edition is wanted.
>
> **Keep this current:** when an operator-facing behavior changes (a new content
> token, a new field, a moved tab), update the relevant section here in the same
> change. Sections marked _⚠️ expand_ are known-thin and want more detail from
> someone who has operated that area.

---

## 1. Getting in & who can do what

- **URL:** `/admin` (e.g. `https://<site>/admin`). Everything under `/admin/**` is
  gated by the `AdminAuth` layout — non-admins are bounced to the login screen.
- **Sign in:** email/password or **카카오톡으로 로그인** (Kakao). You must already have
  an account with an admin-capable role.
- **Left nav sections:** 대쉬보드 (dashboard) · 앱관리 (app management) · 고양이 관리
  (cats) · 급식소 관리 (feeding stations / map pins) · 사진 관리 (photos) · 동영상 관리
  (videos) · 게시물 관리 (posts) · 사용자 관리 (members). 겨울집 관리 is still a **disabled
  placeholder** (feature not built).

### Roles & permissions

Access is permission-based, managed in **사용자 관리** (`/admin/members`). A user has a
role; a role grants permissions. The permission a given action needs:

| Permission       | Lets you…                                                         |
| ---------------- | ----------------------------------------------------------------- |
| `manage-cat`     | create / edit / delete cats (`/admin/cats`)                       |
| `manage-canteen` | create / edit / delete feeding-station map pins (`/admin/points`) |
| `manage-posts`   | create / edit / delete posts incl. 공지사항 & 입양홍보            |
| `manage-photo`   | manage & tag photos (`/admin/tag-images`)                         |
| `manage-video`   | manage & tag videos, YouTube auth (`/admin/tag-videos`)           |
| `manage-app`     | edit About-page content (`/admin/app-management`)                 |
| `manage-users`   | view/assign roles, view 동참 submissions (`/admin/members`)       |

> The role→permission matrix itself is edited in 사용자 관리. Changing it takes effect
> immediately (permissions are resolved from the role at runtime, not copied per user).

---

## 2. Rich text & links (the important one)

Several content fields run their text through a shared link processor, so you can embed
interactive links by typing simple tokens. **Type them exactly as shown.**

### The tokens

| You type                 | Result                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `[catmodal:이름]`        | Clickable name that **opens that cat's detail modal**. Use the cat's exact **name**. **No parentheses after it.** |
| `[img:설명](이미지주소)` | Clickable "설명" that **opens the image in the in-app lightbox** (stays on the page).                             |
| `[video:설명](영상주소)` | Clickable "설명" that **plays the video in-app** (YouTube or direct video URL — auto-detected).                   |
| `[텍스트](https://…)`    | Standard markdown link — opens in a **new tab**.                                                                  |
| `https://…` (bare)       | Auto-detected and turned into a link.                                                                             |
| Enter / new line         | Preserved as a line break.                                                                                        |

**Examples**

```
성격이 좋아서 [catmodal:아들조로]와 늘 붙어다녀요.
겨울집 공사 사진이에요: [img:겨울집 공사](https://…storage…/winter.jpg)
활동 영상은 여기: [video:눈밭에서](https://youtube.com/watch?v=XXXXXXXXXXX)
자세한 안내는 [동참 페이지](https://…/pages/contact)에서 봐 주세요.
```

### Where these links actually work

They render **only** where the content is passed through the link processor:

- ✅ **Cat detail modal** — a cat's 설명, 성격, 건강상태, 특이사항, 입양정보, 작명 사유.
- ✅ **입양홍보 posts** (the public 새로운 입양 소식 feed on `/pages/adoption`).
- ✅ **About page** content (`/pages/about`).

They do **not** currently render in these — the text shows **literally** (`[catmodal:…]`
appears as-is), so don't use the tokens there yet:

- ❌ **공지사항** (announcements) body.
- ❌ **급식현황 / 집사톡** post bodies.

### Gotchas

- `[catmodal:이름]` takes **no** parentheses. `[catmodal:이름](…)` will break. The name
  must match an existing cat (looked up by name) or the click does nothing.
- `[img:…]` / `[video:…]` need a **direct media URL** in the parentheses. A YouTube watch
  URL works for video. For an image you need its storage URL — see the friction note below.
- Getting an image's URL is currently manual (there's no "copy URL" button in the photo
  library yet). Open the image, copy its address. _(Improvement candidate.)_
- The in-modal help panel in the **About editor** (앱관리 → About) lists these tokens live.

---

## 3. Cats — 고양이 관리 (`/admin/cats`)

Two views of the same data (toggle at the top):

- **카드(Card) view** — one cat at a time in a full form. Best for adding a cat or editing
  prose fields.
- **스프레드시트(Grid) view** — a spreadsheet for fast bulk edits across many cats, with
  filter / sort / select / bulk-edit and one **전체 저장** batch save.

### Fields

| Field (UI)             | Notes                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------- |
| 이름 / 별명            | Name (used by `[catmodal:이름]`) and alternate name.                                   |
| 설명                   | Free description. Supports the [link tokens](#2-rich-text--links-the-important-one).   |
| 작명 사유              | Where the name came from. Shown in the modal when set.                                 |
| 성격                   | Personality. Supports links.                                                           |
| 건강/질병 메모         | Health notes. Supports links.                                                          |
| 거주지 / 이전 거주지   | Current / previous location point. Drives "현재 거주 중" vs "예전에 거주".             |
| 출생연도 + 불확실 여부 | Birth year; mark 확실함/불확실. **Required** in the grid before a batch save.          |
| 성별 / 상태            | Sex; status (산냥이 / 쉼터냥이 / 집냥이 / 별냥이 / 행방불명 — drives the modal badge). |
| 중성화 여부            | O / X / ? — **required** in the grid before a batch save.                              |
| 부모/어미 · 자식       | Family links.                                                                          |
| 특이사항               | Notes. Supports links.                                                                 |
| 입양 가능              | ☑ shows this cat in the **입양홍보** adoptable-cats gallery + an "입양 가능" badge.    |
| 입양정보               | Adoption details. Shown in the modal (esp. for adoptable cats). Supports links.        |
| 썸네일                 | The cat's photo. A cat with no photo won't appear in the adoption gallery.             |

> **Modal order:** description → facts panel (출생연도 · 성별 · 거주지 · 중성화 · 부모/자식)
> → prose sections (입양정보 · 작명 사유 · 성격 · 건강상태 · 특이사항) → 사진/동영상 buttons.

Editing a cat re-bakes the public pages automatically (home + adoption revalidate), so
changes appear without a redeploy.

---

## 4. Feeding stations — 급식소 관리 (`/admin/points`)

The feeding-station pins on the public map. Each pin is a **point** with a title, an optional
description, a **position** on the map, and an optional per-device **label side**. Needs the
`manage-canteen` permission.

### Three ways to fix cluttered / overlapping pins

When pins (or their title labels) crowd each other on the map, there are **three** levers. Two are
**CMS edits** — per-pin, saved to Firestore, and live on the public map within ~1h with **no
redeploy**. The third is a **per-mountain config** — it affects the whole mountain and needs a
**redeploy**.

| Lever                    | Use it when…                                                            | Where                                          | Scope & freshness                          |
| ------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------ |
| **1. Label position**    | the pin sits fine, but its **title** overlaps a neighbouring pin/label. | 급식소 관리 CMS → **라벨 위치** (below).       | one pin · Firestore · **no redeploy**      |
| **2. Coordinates**       | the **pins themselves** sit on top of / too close to each other.        | 급식소 관리 CMS → **위치** (below).            | one pin · Firestore · **no redeploy**      |
| **3. Mobile clustering** | a mountain simply has **many** pins packed together on small screens.   | `mountains.json` map config — **not** the CMS. | whole mountain · baked · **redeploy** (§9) |

So: reach for **1 or 2** to fix a specific pin — you can do it live from the CMS right below. Reach
for **3** (see [§9](#9-configuration--operations-owner--developer)) when the crowding is inherent
to having lots of pins and you want them auto-grouped into tap-to-expand clusters on phones.

### Add / edit a pin

- **새 급식소 추가** (or the ✏️ on a row) opens the form.
- **제목** — the pin's title (shown on the map, e.g. 정상, 헬기장). Required.
- **설명** — optional notes.
- **위치** — set by the **map picker**: **click** anywhere on the map to drop the pin, or
  **drag** the yellow marker to fine-tune. The other pins show as grey dots for reference. You can
  also **type exact coordinates** into the 가로(%) / 세로(%) fields below the map — they and the
  marker stay in sync. Required.
- **라벨 위치 (모바일 / 데스크탑)** — which side of the pin its title sits on, **per device**:
  - **자동** (default) — the map flips the label above/below automatically near an edge. Leave it
    here unless a label overlaps a neighbouring pin.
  - **위 / 아래** — force the label above / below for that device. The mobile map is rotated, so a
    pin can need a different side on mobile vs desktop — set only the one that's crowded.
  - ⚠️ Label crowding is **screen-size dependent**, so check the result on a **real phone**
    against the live site, not just the desktop preview.

### Delete a pin

The 🗑 button asks to confirm. **A pin that cats still live at can't be deleted** — the app lists
those cats (their 거주지 / 이전 거주지 points here) and blocks the delete. Reassign those cats'
거주지 in 고양이 관리 first, then delete.

### Freshness

Saving a pin re-bakes the public map automatically (home revalidates), so changes appear without
a redeploy. _(Position/label are Firestore data — ISR-fresh. This is different from the map's
per-mountain config in `mountains.json`, which needs a redeploy — see §9.)_

> **Setup note (owner):** the very first time this feature is used, the Firestore rule for
> `points` must be deployed (`firebase deploy --only firestore:rules`) — until then, saves fail.

---

## 5. Posts — 게시물 관리 (`/admin/posts`)

Four tabs, two kinds:

| Tab      | Kind               | Who writes it                        |
| -------- | ------------------ | ------------------------------------ |
| 급식현황 | community feed     | app users (feeding check-ins)        |
| 집사톡   | community feed     | app users                            |
| 공지사항 | **admin-authored** | admins (**새 공지사항 작성** button) |
| 입양홍보 | **admin-authored** | admins (**새 입양홍보 작성** button) |

### Create (공지사항 / 입양홍보)

Click the create button → fill 제목 (title) + 내용 (body) → optionally attach images and
videos (image files upload to storage; video files upload to YouTube; you can also paste
image/YouTube URLs). Save.

- 공지사항 has a **팝업(모달) 토글** in the list — turn it on to show that announcement as a
  popup to visitors. Only one is shown (most recently updated).
- 입양홍보 posts appear in the public **새로운 입양 소식** feed on `/pages/adoption`, and
  their body supports the [link tokens](#2-rich-text--links-the-important-one).

### Edit / delete (any post type)

- **Edit** — opens an editor for 제목 / 내용 and the **media links** (add/remove image &
  video URLs). Note: uploading a brand-new media **file** during an edit is not supported
  yet — do that via the create flow; edit is for fixing text and links.
- **Delete** — removes the post (and its replies, for community posts). No undo.

---

## 6. Photos & videos — 사진/동영상 관리 (`/admin/tag-images`, `/admin/tag-videos`)

The media library. Photos and videos are **tagged with cat names**; those tags are what
populate each cat's **📸 사진 보기 / 🎬 동영상 보기** albums in the detail modal, and the
photo/video album pages.

- **사진 관리** (`/admin/tag-images`) — browse images, assign/adjust cat tags.
- **동영상 관리** (`/admin/tag-videos`) — browse videos, edit metadata, manage playlists;
  YouTube integration lives here (auth/refresh handled server-side).

_⚠️ expand: step-by-step tagging workflow, bulk-tagging, and the YouTube auth setup._

---

## 7. About page content — 앱관리 → About (`/admin/app-management`)

Edit the public **소개(About)** page sections here. The section content supports the same
[link tokens](#2-rich-text--links-the-important-one); a **💡 링크 지원** help panel in this
editor lists them.

---

## 8. 동참 (Contact) submissions

Visitor 동참 form submissions are recorded and emailed to the admin address. **View them
in 사용자 관리** (`/admin/members`) — the Contact Management panel lives on the members page.

- Each submission is written server-side (`POST /api/contact`) and also emailed to the
  `adminEmail` in `config/mountains/mountains.json`. A failed email never loses the
  recorded submission.

---

## 9. Configuration & operations (owner / developer)

Mostly one-time or infrequent setup. Details live in
[`docs/manuals/deployment/README.md`](../deployment/README.md) and the root
[`CLAUDE.md`](../../../CLAUDE.md); the essentials:

- **Environment variables** (Vercel dashboard — Production **and** Preview): Firebase
  `NEXT_PUBLIC_FIREBASE_*`, `SERVICE_ACCOUNT_KEY` (Admin SDK), Gmail SMTP
  (`SMTP_HOST/PORT/USER/PASSWORD/FROM`) for 동참 email, optional `MOUNTAIN_ID`
  (defaults to `geyang`).
- **Deploy = `git push`** (Vercel Git integration): Production ← `main`, Preview
  ("staging") ← `dev`. There is no deploy command.
- **Firestore security rules** are **not** auto-deployed. After editing
  `config/firebase/firestore.rules` (e.g. adding a new collection), the **owner** must run
  `firebase deploy --only firestore:rules`. Until then, reads/writes to the new collection
  fail against live Firestore. ⚠️ This is the most common "why doesn't the new thing work
  in production" cause.
- **Build assets:** thumbnails / about-photos are fetched from Firebase Storage at build
  time (`npm run fetch:assets`, run automatically by `npm run build`). They are **not** in
  git — a fresh dev checkout needs `npm run fetch:assets` before pages with photos render.
- **Multi-tenant:** per-mountain public config is in `config/mountains/mountains.json`;
  `MOUNTAIN_ID` selects the active one.
- **Map clustering (mobile):** the **whole-mountain** lever for cluttered pins (option 3 in
  [§4 → Three ways to fix cluttered pins](#three-ways-to-fix-cluttered--overlapping-pins); the
  other two — label position and coordinates — are per-pin CMS edits). Two per-mountain knobs in
  the `map` block of `config/mountains/mountains.json` — **not** a `/admin` CMS setting.
  - `map.clustering` (`true` / `false`) — turn clustering **on/off**. `true` (default) collapses
    nearby feeding-point markers into a tap-to-expand cluster badge; `false` shows **every** point
    as its own pin (may overlap where points are close) — good for a mountain with only a few,
    well-separated points.
  - `map.maxClusterRadius` (screen pixels) — how close points must be to group, when clustering is
    on. Larger = collapses points that are farther apart; ignored when `clustering` is `false`.

  Both are **baked at build**, so edit the file and `git push` to change them — a rebuild/redeploy
  is required (no runtime toggle). Desktop is always un-clustered. Details:
  [`deployment/README.md`](../deployment/README.md#map-clustering--per-mountain-config-values).

---

## 10. Quick reference (cheat sheet)

```
[catmodal:이름]            → open a cat's modal        (no parentheses!)
[img:설명](이미지URL)       → open image in lightbox
[video:설명](영상URL)       → play video in-app         (YouTube or direct)
[텍스트](https://…)        → normal link, new tab
https://…                 → auto-linked
Enter                     → line break
```

- Links work in: **cat modal**, **입양홍보 posts**, **About page**. Not in 공지사항 /
  급식현황 / 집사톡 (yet).
- New Firestore collection or rule change → owner runs
  `firebase deploy --only firestore:rules`.
- Publish changes → `git push` (`main` = production, `dev` = preview).
- "입양 가능" checkbox on a cat (with a photo) → shows in the 입양홍보 gallery.
