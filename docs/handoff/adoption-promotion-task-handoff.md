# Task Hand-off — 입양홍보 posts + per-cat 입양정보

> **⚠️ Superseded / continued by [`handoff-21`](./2026-07-03-handoff-21.md)** — that session
> committed this work and grew it (post editing, adoption-page polish, cat-modal redesign +
> `작명 사유`, inline `[img]`/`[video]` links, the admin manual). Read handoff-21 for the
> current state; this doc is the original feature record.
>
> **Scope:** this one task only (kept separate from the numbered `handoff-NN` series).
> **Branch:** `dev` · **Date:** 2026-07-02 · **State:** implemented (now committed —
> handoff-21). Companion plan: [`docs/planning/adoption-promotion-and-cat-adoption-info-plan.md`](../planning/adoption-promotion-and-cat-adoption-info-plan.md).

## 1. What this task delivered

Two related pieces, both modeled on the existing **announcements** feature
(admin-authored, publicly read):

**(A) 입양홍보 posts** — a new post type, collection `posts_adoption`.

- `services/adoption-service.ts` (`FirebaseAdoptionService`) + `getAdoptionService()` in
  `services/index.ts`; `posts_adoption` rule in `config/firebase/firestore.rules`
  (read:true / write:`manage-posts`).
- `/admin/posts` **입양홍보 tab is now functional** (was a "준비 중" placeholder):
  `AdminPostList` extended with the `adoption_promotion` type via a new `serviceFor()`
  helper (replaced 3 duplicated service ternaries), no reply UI, plus a "새 입양홍보 작성"
  button → `/admin/adoption/new`.
- `components/NewAdoptionForm.tsx` (copy of `NewAnnouncementForm`, minus the 팝업 toggle) +
  route `app/admin/adoption/new/page.tsx`.
- Public "새로운 입양 소식" section on `/pages/adoption` via
  `components/AdoptionPromotionClient.tsx` (live-fetch, no auth gate).

**(B) per-cat 입양정보** — new optional `Cat.adoption_info`.

- Shown as an 입양정보 block in the `CatInfo` modal when non-empty (so it appears in the
  adoption gallery + map flows).
- Editable via a textarea in the `/admin/cats` form (next to 입양 가능) + `adoptionInfo`
  strings.

**Follow-on fixes made this round:**

- **Stale-tab bug** (`AdminPostList`): switching to 입양홍보 showed 급식현황 posts because a
  failed fetch left the prior tab's posts in state. Fixed by clearing `posts`/`totalPages`
  on tab switch. (See `log/DEBUG_LOG.md`.)
- **`[catmodal:name]` links in posts**: extracted a reusable `components/CatLinkedText.tsx`
  (renders processed text + opens the cat modal on cat-link click) and used it for the post
  message. Also fixed an **ordering bug** in `utils/text-processing.ts` — `convertMarkdownLinks`
  ran before `convertCatModalLinks`, so `[catmodal:name](url)` was captured as a markdown
  link and rendered as a broken `<a>` (new tab → 404). Reordered so catmodal wins.

## 2. Files

**New:** `services/adoption-service.ts`, `components/NewAdoptionForm.tsx`,
`components/AdoptionPromotionClient.tsx`, `components/CatLinkedText.tsx`,
`app/admin/adoption/new/page.tsx`, `docs/planning/…-plan.md` (+ this handoff).

**Modified:** `services/index.ts`, `components/AdminPostList.tsx`,
`app/admin/posts/page.tsx`, `app/pages/adoption/page.tsx`,
`config/firebase/firestore.rules`, `types/index.ts`, `components/CatInfo.tsx`,
`app/admin/cats/page.tsx`, `constants/adminStrings.ts`, `utils/text-processing.ts`,
`log/DEBUG_LOG.md`, `log/FEATURE_MOD_LOG.md`.

## 3. Key decisions / deviation

- **Announcements model** (admin-write / public-read), not the auth-gated butler model.
- **Dedicated** `NewAdoptionForm` (copy) rather than generalizing the working 공지 form.
- **Deviation from plan:** the public feed does **not** reuse `PostList`. `PostList`
  hardcodes every post's detail link to `/pages/posts/:id`, which resolves **only** the
  `posts_feeding` collection → adoption posts would 404. `AdoptionPromotionClient` instead
  uses self-contained inline cards like `AnnouncementClient`; video thumbnails open the
  source on YouTube (no adoption detail route needed).

## 4. Verified vs. pending

- ✅ Gates: `npx tsc --noEmit` clean · `npm run test:smoke` 25/25 (after every step).
- ✅ Owner-confirmed: creating an 입양홍보 post works; a `[catmodal:깡패]` link in a post
  opens the cat modal.
- ⏳ Not yet browser-verified (admin-gated / needs data): full list/delete in the admin
  tab, image upload via `NewAdoptionForm`, and the 입양정보 block rendering in a cat modal
  after setting it in `/admin/cats`.

## 5. Known issues / things to fix (follow-ups)

1. **No edit for adoption (or any) posts.** `AdminPostList.handleEdit` is still a stub
   (`alert('Edit functionality coming soon!')`). Admins can only **create + delete** — to
   fix a typo they must delete and recreate. Likely the top thing to address.
2. **`AdminPostList.fetchPosts` still swallows errors** without clearing `posts` or showing
   an error. The tab-switch clear (this round) covers switching, but a mid-tab refetch /
   pagination failure would still show stale data silently. Consider clearing on error +
   an error state.
3. **`[catmodal:name](…)` leftover parens.** After the ordering fix the cat link works, but
   any `(…)` written right after the token renders as literal text. The correct syntax is
   `[catmodal:이름]` with **no** parentheses (per the admin help string). Existing posts that
   used the paren form should be edited (see #1 — edit isn't available yet, so delete+recreate).
4. **Dead string** `adminStrings.posts.adoptionComingSoon` is now unused (placeholder
   removed) — remove it.
5. **`PostList` (butler_stream / butler_talk) renders `post.message` as plain text** — it
   doesn't process `[catmodal:…]` / markdown / URLs. Could reuse `CatLinkedText`. (Its detail
   link is also hardcoded to the feeding collection — a separate latent issue.)
6. **`CatLinkedText` duplicates** the click-to-open-modal handler already inlined in
   `CatInfo` and the about page. Dedup by refactoring those to use `CatLinkedText`.
7. **`posts_adoption` Firestore rule** is committed to the config file; creation working
   implies it's deployed, but confirm the live rules match (`firebase deploy --only
firestore:rules`, owner-run).
8. **Storage path** `adoption/images/` relies on existing (path-agnostic) Storage rules —
   verify image uploads land (not yet exercised).
9. **`log/DEBUG_LOG.md`** has the stale-tab entry; **add an entry for the catmodal ordering
   bug** (confirmed fixed) — not yet written.

## 6. Commit state

Nothing committed. Suggested grouping when ready:

- feat: 입양홍보 posts (service, rule, admin tab, create form, public client)
- feat: per-cat 입양정보 (type, CatInfo, cat form)
- fix: AdminPostList stale-tab + CatLinkedText / text-processing catmodal ordering

(Per repo convention, confirm before `git commit`.)
