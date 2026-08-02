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

| Tab      | Kind               | Who writes it                                                                                        |
| -------- | ------------------ | ---------------------------------------------------------------------------------------------------- |
| 급식현황 | community feed     | app users (feeding check-ins)                                                                        |
| 집사톡   | community feed     | app users (**one video + one photo** per post — [§9](#9-configuration--operations-owner--developer)) |
| 공지사항 | **admin-authored** | admins (**새 공지사항 작성** button)                                                                 |
| 입양홍보 | **admin-authored** | admins (**새 입양홍보 작성** button)                                                                 |

### Create (공지사항 / 입양홍보)

Click the create button → fill 제목 (title) + 내용 (body) → optionally attach images and
videos. Each file gets its own 제목/설명, and there's a 냥이 태그 selector and a 촬영 날짜
field. Image files upload to Firebase Storage; video files upload to YouTube. Save.

_(Pasting a media **URL** is no longer offered — these composers only attach files they
upload themselves.)_

- 공지사항 has a **팝업(모달) 토글** in the list — turn it on to show that announcement as a
  popup to visitors. Only one is shown (most recently updated).
- 입양홍보 posts appear in the public **새로운 입양 소식** feed on `/pages/adoption`, and
  their body supports the [link tokens](#2-rich-text--links-the-important-one).
- **No file-count limit here.** These two admin composers accept as many videos and photos as
  you attach — the one-video/one-photo cap applies to **집사톡 only**
  ([§9](#9-configuration--operations-owner--developer)).

### Edit / delete (any post type)

- **Edit (공지사항 / 입양홍보)** — opens **the same form you wrote the post with**, prefilled.
  Everything creating has, editing has: file pickers for new photos/videos, per-file 제목/설명,
  the 냥이 태그 selector, 촬영 날짜, and the 팝업 토글. You no longer need an image's URL to
  change a picture.
  - Media already on the post is listed at the top of its section, marked **기존**, each with
    its own **삭제**. ⚠️ **삭제 only detaches it from this post** — the photo stays in the
    사진첩 and the video stays on YouTube. That's why it's safe to undo by re-attaching.
  - **기존 items have no 제목/설명 box on purpose.** That text belongs to the photo/video
    itself, not to the post — edit it in [사진 관리 / 동영상 관리](#6-photos--videos--사진동영상-관리-admintag-images-admintag-videos).
    For a video, YouTube is the source of truth, so anything typed elsewhere is overwritten by
    the next 📺 YouTube와 동기화.
  - The post keeps its **original author and 게시일**; editing does not move it to the top of
    the list or put your name on it.
- **Edit (집사톡)** — same story: opens 집사톡's own composer, prefilled, with file pickers
  and the 기존 list. ⚠️ 집사톡 is capped at **one video + one photo**
  ([§9](#9-configuration--operations-owner--developer)), and media already on the post
  **counts against that cap** — so a post that already has both shows no file picker until
  you 삭제 one.
- **Edit (급식현황)** — still the older editor: 제목 / 내용 plus add/remove media by **URL**.
  That's deliberate: the 급식현황 composer doesn't upload media at all any more, so its edit
  screen keeps the URL list — otherwise older 급식현황 posts that still carry a photo would
  have no way to change it.
- **Delete** — removes the post (and its replies, for community posts). No undo.

---

## 6. Photos & videos — 사진/동영상 관리 (`/admin/tag-images`, `/admin/tag-videos`)

The media library. Photos and videos are **tagged with cat names**; those tags are what
populate each cat's **📸 사진 보기 / 🎬 동영상 보기** albums in the detail modal, and the
photo/video album pages.

- **사진 관리** (`/admin/tag-images`) — browse images, assign/adjust cat tags.
- **동영상 관리** (`/admin/tag-videos`) — browse videos, edit metadata, manage playlists;
  YouTube integration lives here (auth/refresh handled server-side).
  📄 **Button-by-button reference: [`tag-videos-spec.md`](./tag-videos-spec.md)** — what each
  button writes to (YouTube vs Firestore vs nothing), when it's disabled, and the known traps.

### ⚠️ Video data: YouTube is the source of truth — never edit it in Firebase

**Rule: every change to a video must be made on YouTube (via this admin UI, or on YouTube
itself). Never edit a video's data directly in the Firebase console — the edit will not
survive.**

Videos live in two places. The real video and its metadata (title, description, tags, 촬영일,
playlists) belong to the **YouTube channel**. Firestore holds a **copy** that the 영상첩 album
reads, and that copy is rebuilt from YouTube every time a video is synced. The rebuild is a
straight overwrite: whatever YouTube says wins, and a field YouTube doesn't have is **cleared**.

So a value written straight into Firestore has no defence. It survives until the next sync of
that video — which happens on the 📺 YouTube와 동기화 button, and also automatically after **any**
save on that video — and is then silently replaced by YouTube's value, or by nothing.

This is why the admin UI always writes to YouTube first and then copies the result back, and why
`/admin/tag-videos` performs **no direct writes to Firestore at all**. If you're ever tempted to
"just fix it in the console", fix it on YouTube instead and press 📺 YouTube와 동기화.

_(Photos are the opposite: `cat_images` has no upstream, so Firestore **is** the source of truth
for them. The rule above is about videos.)_

**YouTube 토큰 갱신 (re-authorization).** Google's refresh token expires every **7–14 days**;
when video edits, uploads, or playlist saves start failing with an authentication error, go to
the **대쉬보드** (`/admin` — _not_ this page) and click **🔄 토큰 갱신** in the
**🎬 YouTube API 토큰 관리** panel, sign in on the Google window that opens, and let it close by
itself. That's the whole procedure — since 2026-07-26 the new token is
stored server-side and takes effect immediately for **every** YouTube function. **No
environment-variable edit and no redeploy are needed**; older instructions saying to paste
`YOUTUBE_REFRESH_TOKEN` into Vercel are obsolete — that variable no longer exists, and the
command-line token scripts that went with it were deleted. If the panel ever reports no token at
all, the fix is the same button.

📌 **"토큰 갱신" is a full re-authorization, not a silent refresh** — the name undersells it. It
opens Google's consent screen and stores whatever comes back, which is why it's also the fix when
the _permissions_ on a token are wrong (see the 2026-07-26 scope entry in `log/DEBUG_LOG.md`), not
only when it has expired.

_⚠️ expand: step-by-step tagging workflow, bulk-tagging, and the YouTube auth setup._

---

## 7. About page content — 앱관리 → About (`/admin/app-management`)

Edit the public **소개(About)** page here. The content supports the same
[link tokens](#2-rich-text--links-the-important-one); a **💡 링크 지원** help panel in this
editor lists them.

🔑 **This editor is the only place the 소개 exists (2026-08-02).** It used to share the job
with a copy in `config/mountains/mountains.json`, which quietly won for the 대표 사진 — so a
photo changed here kept showing the old one until someone redeployed. That copy is gone: what
you save here is what the page renders, with no deploy needed.

### ⚠️ Known limitation — the 대표 사진 takes a file _name_, not an upload

The 대표 사진 block is **three text boxes** (파일명 · 대체 텍스트 · 사진 설명). There is no
file picker, no upload button and no preview, so **this editor cannot put the image in
Storage** — it only records the name of one that is already there.

**To change the photo, two steps in two different tools:**

1. Upload the image to **Firebase Storage** at `about-photos/{mountainId}/` (Firebase Console).
2. Come back here and type that **exact** filename into **파일명**. Leave it blank for no photo.

⚠️ **Nothing checks the name, in either direction.** Saving always reports
**"소개 내용을 저장했어요!"** even when the file does not exist; the mistake only appears later
on the public page as **"사진을 불러오지 못했어요"**, with no hint whether the cause was a
typo, `.jpg` vs `.jpeg`, a rename in Storage, or the wrong mountain's folder. 👉 **Always open
`/pages/about` after saving a photo change** — that habit is standing in for a check the
software should be doing.

📌 **This is a known gap, not the intended end state**, and it is the same shape as the
pasted-URL post editor that was replaced on 2026-08-02: the create paths can upload, this one
can only reference. Giving it a real upload control is tracked in
[`docs/planning/BACKLOG.md`](../../planning/BACKLOG.md) → **B1**. Until then the two-step
routine above is the supported way.

📌 **섹션 is stored but not displayed.** The public page renders 제목, 부제, 대표 사진 and
본문 only — anything typed into 섹션 is saved and never shown. (Raised 2026-08-02; awaiting a
decision on whether the page should render them or the field should go.)

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

> 🏔️ **Adding a new mountain?** The owner-facing checklist is
> [`adding-a-mountain.md`](./adding-a-mountain.md) — DNS, Vercel, Firebase authorized
> domains, Kakao redirect URIs, the YouTube playlist, and seeding the first admin. ⛔ It
> starts by sending you to
> [`mountain-2-prerequisites.md`](../../planning/mountain-2-prerequisites.md), which lists
> what must be fixed **before** a second mountain goes live — including a security defect
> (§1.1) that becomes real the day a second subdomain resolves.

- **Environment variables** (Vercel dashboard — Production **and** Preview): Firebase
  `NEXT_PUBLIC_FIREBASE_*`, `SERVICE_ACCOUNT_KEY` (Admin SDK), Gmail SMTP
  (`SMTP_HOST/PORT/USER/PASSWORD/FROM`) for 동참 email, `NEXT_PUBLIC_GA_MEASUREMENT_ID`
  (GA4 analytics — see the next bullet), optional `MOUNTAIN_ID` (defaults to `geyang`).
- **Analytics (GA4 via gtag.js).** Page-view analytics run through a **single shared GA4
  property**, tagged per mountain. Setup is env-driven: set `NEXT_PUBLIC_GA_MEASUREMENT_ID`
  to the GA4 `G-XXXX` id in Vercel (Production **and** Preview). **Until it is set, no
  analytics loads at all** (no error — the tracking script simply isn't rendered), which is
  also why local dev / Preview stay analytics-free. Each page view is sent with a
  `mountain_id` field so one property can be filtered per mountain — but GA4 only records
  that field once it is registered as a **custom dimension** in the GA4 console, and GA4
  **does not backfill**, so register `mountain_id` **before** a second mountain ever gets
  traffic. _(The older `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` is no longer used for analytics
  and can be removed.)_ **Full step-by-step:**
  [`google_analytics.md`](./google_analytics.md) (create the property, register the dimension,
  set the Vercel var, verify, read per-mountain data).
- **Deploy = `git push`** (Vercel Git integration): Production ← `main`, Preview
  ("staging") ← `dev`. There is no deploy command.
- **Firestore security rules** are **not** auto-deployed. After editing
  `config/firebase/firestore.rules` (e.g. adding a new collection), the **owner** must run
  `firebase deploy --only firestore:rules`. Until then, reads/writes to the new collection
  fail against live Firestore. ⚠️ This is the most common "why doesn't the new thing work
  in production" cause.
- **Build assets:** cat thumbnails are fetched from Firebase Storage at build time
  (`npm run fetch:assets`, run automatically by `npm run build`). They are **not** in git.
  - **How images are actually served (important mental model):** **every** photo the site
    shows now rides on live Firebase **Storage** — cat **thumbnails** and **album photos**
    from URLs stored in Firestore (`cats.thumbnailUrl` / `cat_images.imageUrl`), and the
    **about-page photo** from the filename in the CMS record — all optimized by Next
    `<Image>`. **Nothing from Firebase is baked into the build any more** (2026-08-02: about
    photos were the last, and their baking is what made the CMS's photo field not work).
    The baked `thumbnails/` folder is legacy/unused in prod. Full detail:
    [`docs/codebase/media-and-youtube.md`](../../codebase/media-and-youtube.md#image-storage--serving-strategy).
  - **Per-mountain uploads (M6):** new image uploads (the signed-URL route + the form image
    upload) automatically land under the active mountain's `storagePrefix` in Storage, so a
    second mountain's photos are isolated — operators set nothing. The default mountain
    (`geyang`) has `storagePrefix: ""` (flat bucket, `uploads/`); a new tenant uses a
    non-empty prefix (e.g. `mountains/<id>/`).
- **Multi-tenant:** per-mountain public config is in `config/mountains/mountains.json`;
  `MOUNTAIN_ID` selects the active one.
  - **Per-mountain brand color (theme).** Each mountain's `theme.primaryColor` now drives
    the **primary brand color** — the signature CTA gradient (the header 입양홍보 button, the
    shared action buttons, the map cluster-count markers, and the adoption / FAQ page CTAs)
    recolors to it per tenant. `geyang` is `#FACC15` (the shipped brand yellow — unchanged).
    The value **must be a 6-digit hex** like `#0EA5E9`; a malformed value makes that
    mountain's pages fail to render (fail-loud, by design). ⚠️ Only `primaryColor` is wired
    today — `secondaryColor` / `accentColor` in the same block are **not** yet used, and the
    rest of the palette (the fixed `brand` color ramp) does **not** follow `primaryColor`, so
    a new mountain's non-CTA surfaces still read the default yellow until a fuller theming
    pass. **Baked at build** — edit the file and `git push` (no runtime toggle).
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

- **Media-upload limits — how many files a 집사톡 post may carry.** Lives in
  **`config/media_control.json`** — **not** a `/admin` CMS setting, and **not** per-mountain.

  ```json
  {
    "butlerTalk": {
      "allowMultipleVideos": false,
      "allowMultipleImages": false
    }
  }
  ```

  - **What it does.** `false` caps that medium at **one file per post**: once a file is
    attached, the picker for adding another disappears. The member can still hit **삭제** and
    pick a different file — it is a cap, not a lock. `true` restores an unlimited list. The two
    flags are **independent**, so "one video but any number of photos" is a valid setting.
  - **Currently shipped: both `false`** — 집사톡 takes **one video + one photo** per post.
  - **집사톡 only.** 공지사항 / 입양홍보 are admin-authored and stay **unrestricted by
    decision** (owner, 2026-07-30) — they ignore this file. Don't extend the flags to them
    without a new decision.
  - **Changing it needs a redeploy.** Edit the file and `git push` (`dev` = Preview,
    `main` = production). ⚠️ **That is the design, not a limitation.** The setting is
    deployment-wide by decision, so a runtime CMS toggle would let **any one mountain's admin
    silently reconfigure every other mountain's composer**; a static file moves that authority
    to whoever can deploy. Rationale recorded in
    [`PROJECT_PLAN.md`](../../planning/PROJECT_PLAN.md) §10d (D2) so the rejected Firestore
    design isn't re-derived later.
  - ⚠️ **Fail-loud:** a missing key, a typo'd key, or a non-boolean value makes the 집사톡
    composer **throw** rather than quietly pick a behaviour. Keep both keys present and keep
    the values `true`/`false` (no quotes). Validation lives in `src/utils/mediaControl.ts`.

---

## 10. Backups & recovery (owner)

> **The one habit that matters:** run `npm run backup:firestore` **before any script
> that writes to production data.** Everything else on this page is automatic; this
> is the part that needs a human to remember it.

### What protects the data today

Three layers, each covering a failure the others don't:

| Layer                          | Covers                                             | Where it lives             | Restores by                                 |
| ------------------------------ | -------------------------------------------------- | -------------------------- | ------------------------------------------- |
| **PITR** (point-in-time)       | Bad write / accidental delete noticed **≤ 7 days** | Google, rolling window     | Read or restore to any moment in the window |
| **Weekly backup schedule**     | Same, noticed **later** than 7 days                | Google, periodic snapshots | ⚠️ Creates a **new database**               |
| **`npm run backup:firestore`** | Project loss, and pre-migration insurance          | Your disk (git-ignored)    | `import-firestore.js` (verified lossless)   |

**Weekly is enough** because it meshes with PITR's 7-day window: any moment is covered
either by PITR, or by a snapshot at most 7 days old. There is no gap, so daily backups
would add cost without adding coverage. _(Enabled 2026-07-20.)_

### Checking / changing the Google-side settings

**Firebase Console → Firestore Database → Backups tab.** PITR is the toggle at the top;
the weekly schedule sits below it. Both are database-admin settings, so **the app's
service account cannot read or change them** — you must use the console (or `gcloud`)
signed in as yourself. An agent asking you to check this is not being lazy; it gets a
`403 PERMISSION_DENIED`, which is the correct scoping.

### Before any data migration — do this first

Any time a script under `scripts/migration/` is about to run against production:

```bash
npm run backup:firestore     # snapshot first
DRY_RUN=true node scripts/migration/<script>.js   # then dry-run
node scripts/migration/<script>.js                # then apply
```

The snapshot lands in `backups/firestore/<UTC-timestamp>/` — one JSON file per
collection plus a `manifest.json` with counts. Collections are **discovered**, not
hard-coded, so anything the app itself doesn't know about is still captured — this
database is shared with the separate **image-uploader** tool, whose `image_uploader`
collection appears nowhere in this codebase and would be missed by a fixed list.

_Why this habit exists:_ the 2026-07-20 `mountainId` backfill ran with no snapshot and
no PITR. It was safe only because the change was additive and exactly reversible. A
migration that transforms existing values would not have been. See
[`docs/planning/multi-mountain-refactor-plan-20260719.md`](../../planning/multi-mountain-refactor-plan-20260719.md) §3 M4.

### ⚠️ Treat the dumps like passwords

An export contains **a live OAuth refresh token** (`admin_config/youtube_auth`) and
**personal data** — 동참 submissions (name / phone / email) and member records.

- Written `0600` inside a `0700` directory; `/backups/` is git-ignored. Do not commit it.
- Copying a dump to Dropbox / email / a USB stick creates both a credential-leak path
  and a **PIPA-relevant store of personal data outside the disclosed processing**.
  Keep dumps local, and delete ones you no longer need.
- This is also why we did **not** set up a Google Cloud Storage export bucket: it would
  create a second PII store to secure and disclose, for protection PITR already gives.

### If something goes wrong

1. **Stop writing.** Don't "fix it forward" with another script — that can bury the
   original state past PITR's window.
2. **Was it within 7 days?** Almost always yes. Then PITR is the tool: read the
   pre-incident version of the affected documents and correct just those fields.
   For a bad write this beats a full restore, which is disruptive by comparison.
3. **Older than 7 days?** Restore the weekly backup — but note it creates a **new**
   database rather than overwriting `(default)`. Recovery is "stand up a parallel
   database and copy back," a procedure with downtime, not a button.
4. **Project gone entirely?** The local dumps are the fallback.

### Restoring from a local dump

```bash
# 1. Preview — the DEFAULT. Reads the dump, writes nothing.
node scripts/maintenance/import-firestore.js backups/firestore/<stamp>

# 2. Apply. Both variables are required; CONFIRM_PROJECT must match the target.
APPLY=true CONFIRM_PROJECT=mountaincats-61543 \
  node scripts/maintenance/import-firestore.js backups/firestore/<stamp>

# Restore just one collection
ONLY=cats node scripts/maintenance/import-firestore.js backups/firestore/<stamp>
```

The banner states its target — `EMULATOR at …` or `⚠️ LIVE project …` — so a preview
against production is never mistaken for one against a sandbox.

⚠️ **Two things to understand before applying:**

- **Every write is a full overwrite** (`set()` without merge). That is what restore
  means: the document ends up exactly as the dump has it, and **any field added since
  the dump is lost**. Dry-run is the default precisely because this is the same
  operation shape that once wiped app-only fields via the Sheets importer.
- **It does not delete.** Documents that exist now but aren't in the dump are left
  alone. A restore puts back what it has; removing extras stays a manual decision.

_Verified lossless_ (2026-07-20): the prod dump was imported into the emulator,
re-exported, and all 16 collection files came back **byte-identical** — timestamps
included, to nanosecond precision.

> A dry run does **not** open a connection, so it cannot tell you the target is
> reachable — it validates the dump, not connectivity. (This is how a wrong emulator
> port survived a clean-looking preview during testing.)

---

## 11. Quick reference (cheat sheet)

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
- 집사톡 = **one video + one photo** per post; 공지사항 / 입양홍보 = unlimited. Change it in
  `config/media_control.json` + redeploy ([§9](#9-configuration--operations-owner--developer)).
- "입양 가능" checkbox on a cat (with a photo) → shows in the 입양홍보 gallery.
- **Before any production data migration → `npm run backup:firestore`** ([§10](#10-backups--recovery-owner)).
