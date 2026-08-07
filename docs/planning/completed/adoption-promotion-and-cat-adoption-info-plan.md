# Plan — 입양홍보 posts + per-cat 입양정보

> Status: **implemented** (gates green; rule deploy + browser verify pending) · Branch: `dev` · Created 2026-07-02

## Context

The 입양홍보 (adoption promotion) area is only half-built: the public page
(`/pages/adoption`) shows a gallery of `adoptable`-flagged cats, but there's no way
to publish editorial "a new cat is up for adoption" posts, and the admin
`/admin/posts` **입양홍보 tab is a "준비 중" placeholder**. Separately, cats have no
**입양정보** field, so adoption-specific notes can't be recorded or shown.

This delivers two independent-but-related pieces, both reusing existing patterns:

- **(A) 입양홍보 posts** — a new post type modeled exactly on **공지사항 (announcements)**:
  admin-created, **publicly readable**. Admin manages them in the 입양홍보 tab
  (reusing `AdminPostList`); the public adoption page shows them (reusing `PostList`).
- **(B) per-cat 입양정보** — a new optional `Cat.adoption_info` field, editable in the
  individual cat management form and shown in the `CatInfo` detail modal when non-empty.

Decisions (confirmed with owner): (A) admin-write / public-read; create form is a
**dedicated** `NewAdoptionForm` (copy of the announcement form, no risk to the working
공지 flow); (B) 입양정보 lives in the cat **form + modal** only (no spreadsheet column).

Reference model throughout: the **announcements** feature
(`announcement-service.ts`, `AnnouncementClient.tsx`, `NewAnnouncementForm.tsx`,
`posts_announcements` rule) — public read + `manage-posts` write.

---

## Workstream A — 입양홍보 posts (collection `posts_adoption`)

**A1. Service** — `src/services/adoption-service.ts` (new): copy
`src/services/announcement-service.ts`, class `FirebaseAdoptionService implements IPostService`,
`COLLECTION_NAME = 'posts_adoption'` (no replies, same as announcements).
Register in `src/services/index.ts`: add `adoptionServiceInstance` + `getAdoptionService()`
mirroring the announcement getter.

**A2. Firestore rules** — `config/firebase/firestore.rules`: add, mirroring
`posts_announcements` (public read, admin write):

```
match /posts_adoption/{x} {
  allow read: if true;
  allow write: if request.auth != null && hasPermission(request.auth.uid, 'manage-posts');
}
```

⚠️ **Owner action:** deploy with `firebase deploy --only firestore:rules` — writes fail
against real Firestore until deployed (per CLAUDE.md, rules deploy is owner-run).

**A3. Admin tab functional** — `src/components/AdminPostList.tsx`:

- Extend `postType` union with `'adoption_promotion'`.
- Replace the 3 repeated `postType === … ? … : …` service ternaries with one local
  `serviceFor(postType)` helper that also returns `adoptionService` for adoption
  (cleaner than a 4-way nested ternary).
- Reply block guard `postType !== 'announcements'` → also exclude adoption
  (`… && postType !== 'adoption_promotion'`) — adoption has no replies.
- Add a create button for adoption (parallel to the announcements one) →
  `/admin/adoption/new`, label "새 입양홍보 작성". The 공지 modal-toggle stays
  announcements-only.
- `src/app/admin/posts/page.tsx`: replace the `adoption_promotion` "coming soon"
  placeholder (currently lines ~69–72) with `<AdminPostList postType="adoption_promotion" />`.

**A4. Admin create route + form:**

- `src/app/admin/adoption/new/page.tsx` (new): mirror `src/app/admin/announcements/new/page.tsx`,
  render `<NewAdoptionForm />`.
- `src/components/NewAdoptionForm.tsx` (new): copy `NewAnnouncementForm`, then —
  service → `getAdoptionService()`; **remove** the `showInModal` toggle + state + the
  `showInModal` field on the post payload; storage path → `adoption/images/…`; YouTube
  tag/desc + all copy/labels → 입양홍보; success redirect → `/pages/adoption`; cancel →
  `/admin/posts`.

**A5. Public post container** — `src/components/AdoptionPromotionClient.tsx` (new):
mirror `AnnouncementClient` (public, **no auth gate**): fetch `getAdoptionService().getAllPosts()`,
sort newest-first, paginate, render `<PostList posts postService={adoptionService} … />`.
No create button on the public page.

- `src/app/pages/adoption/page.tsx` (server component): render `<AdoptionPromotionClient />`
  as a new "새로운 입양 소식" section **below** the adoptable-cats gallery/empty-state block
  (posts are independent of the `adoptable` list; `PostList` shows its own empty state).

---

## Workstream B — per-cat 입양정보

**B1. Type** — `src/types/index.ts`: add `adoption_info?: string;` to `Cat`.

**B2. Detail modal** — `src/components/CatInfo.tsx`: in the body, add (only when set),
reusing the existing `InfoBlock` + `processTextWithLinks`:
`{cat.adoption_info && <InfoBlock heading="입양정보:" html={processTextWithLinks(cat.adoption_info)} />}`
Place prominently — right after the `description` block (before the structured facts).
This automatically surfaces in every `CatInfo` usage, including the `AdoptionGallery`
modal and the map flow.

**B3. Individual cat management form** — `src/app/admin/cats/page.tsx`:

- Add `adoption_info: string` to `CatFormData`, `initialFormData`, and the `handleEdit`
  mapping (`adoption_info: cat.adoption_info || ''`).
- Add a `<textarea>` field (label 입양정보) in the form, near description/note.
- `handleSubmit` already spreads `...formData`, so `createCat`/`updateCat` pick it up —
  no service change needed.
- Add `adoptionInfo: '입양정보'` to `adminStrings.cats.form` and use it as the label.

(No CatGrid spreadsheet column — per decision.)

---

## Files touched (summary)

New: `services/adoption-service.ts`, `components/NewAdoptionForm.tsx`,
`components/AdoptionPromotionClient.tsx`, `app/admin/adoption/new/page.tsx`.
Edit: `services/index.ts`, `components/AdminPostList.tsx`, `app/admin/posts/page.tsx`,
`app/pages/adoption/page.tsx`, `config/firebase/firestore.rules`, `types/index.ts`,
`components/CatInfo.tsx`, `app/admin/cats/page.tsx`, `constants/adminStrings.ts`.

## Tasks (progress tracker)

Checked off as each lands; gates (`tsc` + smoke) run after each workstream.

**Workstream A — 입양홍보 posts**

- [x] A1. `services/adoption-service.ts` (collection `posts_adoption`) + `getAdoptionService()` in `services/index.ts`
- [x] A2. `posts_adoption` rule in `config/firebase/firestore.rules` (⚠️ owner deploys)
- [x] A3a. `AdminPostList.tsx`: union + `serviceFor()` helper + reply guard + adoption create button
- [x] A3b. `admin/posts/page.tsx`: replace placeholder with `<AdminPostList postType="adoption_promotion" />`
- [x] A4a. `components/NewAdoptionForm.tsx` (copy of announcement form, no 팝업 toggle)
- [x] A4b. `app/admin/adoption/new/page.tsx`
- [x] A5a. `components/AdoptionPromotionClient.tsx` (public) — see deviation ↓
- [x] A5b. render it in `app/pages/adoption/page.tsx` (새로운 입양 소식 section)

**Workstream B — per-cat 입양정보**

- [x] B1. `adoption_info?: string` on `Cat` (`types/index.ts`)
- [x] B2. 입양정보 `InfoBlock` in `CatInfo.tsx` (when non-empty)
- [x] B3. 입양정보 textarea in `admin/cats/page.tsx` form + `adoptionInfo` string in `adminStrings`

**Finalize**

- [x] Gates: `npx tsc --noEmit` + `npm run test:smoke` (25/25)
- [x] `log/FEATURE_MOD_LOG.md` entry

### Deviation from plan (A5a)

The plan said the public client would reuse `PostList`. During implementation I found
`PostList` hardcodes every post's detail link to `/pages/posts/:id`, and that route
resolves **only** the `posts_feeding` collection (`getPostService().getPostById`) — so
adoption posts routed there would 404. Instead, `AdoptionPromotionClient` mirrors
`AnnouncementClient`'s **self-contained inline cards** (title / message / media shown in
place; video thumbnails open the source on YouTube), which needs no adoption detail
route and produces no dead links.

## Verification

1. Gates: `npx tsc --noEmit` + `npm run test:smoke` (keep 25/25).
2. Deploy the new rule (owner), then in a browser:
   - **Admin** `/admin/posts` → 입양홍보 tab lists posts; "새 입양홍보 작성" → create a
     post (title/body/image) → it appears in the list; delete works.
   - **Public** `/pages/adoption` → the 새로운 입양 소식 section shows the post; the
     adoptable-cats gallery still renders.
   - **Cat** `/admin/cats` → edit a cat, set 입양정보, save → open that cat's modal (via
     the adoption gallery or map) → 입양정보 section shows; a cat without it shows no
     section.
3. Note: adoption posts are client-fetched live (not baked), consistent with the other
   post pages; existing cats simply lack `adoption_info` (optional field, no migration).
