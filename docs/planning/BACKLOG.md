# 산냥이집냥이 — Backlog

> **What this is.** A standing register of **known gaps that are real but not urgent** — things
> found while doing something else, deliberately not fixed at the time, and worth doing when
> there is room. Newest first.
>
> **Why it exists (2026-08-02).** These used to be recorded only in the prose of a hand-off
> entry or a plan section, where they read as commentary rather than as work. A finding that
> lives only inside the story of the day it was found is one nobody schedules.
>
> ### Where a thing belongs
>
> | It is…                                               | It goes…                                       |
> | ---------------------------------------------------- | ---------------------------------------------- |
> | active or next-up work, tracked to completion        | [`PROJECT_PLAN.md`](./PROJECT_PLAN.md)         |
> | a decided-but-unexecuted plan with its own task list | [`pending/`](./pending/)                       |
> | **a known gap, deferred, no date**                   | **here**                                       |
> | a question only the owner can answer                 | here, under **Open questions** — not as a task |
> | a bug whose root cause was non-obvious               | [`log/DEBUG_LOG.md`](../../log/DEBUG_LOG.md)   |
>
> **Promoting an item:** when one gets scheduled, move it into `PROJECT_PLAN.md` (or spin a
> `pending/` plan if it needs a task list) and strike it here with a pointer, in the **same**
> change. ⚠️ Do not leave a copy in both places — a duplicated entry is how the plan audit of
> 2026-08-02 ended up with seven claims that had rotted.

---

## B1 — The about page's 대표 사진 has no upload control

**Found:** 2026-08-02, while making the CMS the sole source of the about page (PROJECT_PLAN
§10m). **Deliberately out of scope then** — the ask was scoped to the deletion plus the live
photo, and a file picker was the option explicitly not taken.

**The gap.** `AboutContentEditor`'s 대표 사진 block is three text boxes (파일명 · 대체 텍스트 ·
사진 설명). It records the **name** of an image; it cannot put one in Storage. So changing the
photo is two steps in two tools: upload to `about-photos/{mountainId}/` via the Firebase
Console, then hand-type the filename here.

🔑 **It is the same shape as the pasted-URL post editor replaced the same day** (§10l): the
create paths can upload, this one can only reference. The owner's objection there —
_"it's going to be cumbersome to find the URL of an image"_ — applies unchanged, with a shorter
opaque string.

⚠️ **The failure is silent at the point of the mistake.** Nothing validates the name on save:
the editor reports **"소개 내용을 저장했어요!"** for a file that does not exist, and the error
appears later on the public page as **"사진을 불러오지 못했어요"**, with no indication whether
the cause was a typo, an extension mismatch, a rename in Storage, or the wrong mountain's
folder. The manuals currently paper over this with a "open `/pages/about` after saving" step.

**Why it is not a drop-in reuse of the existing uploader** — this is the part that makes it
real work rather than wiring:

1. `api/generate-signed-url/route.ts` hard-codes its destination as
   `${storagePrefix}uploads/${fileName}`. About photos live under
   `about-photos/{mountainId}/` — a different convention. Either the route learns a target
   path, or about photos move under `uploads/` and the existing objects are migrated.
2. **The route's permission gate is tied to what it writes.** It requires `manage-photo`
   because its uploads become `cat_images`, which `firestore.rules` gates the same way (see
   the comment at the top of the route). The about editor gates on `manage-app`. A target-path
   parameter must not quietly let one permission mint writes the other governs.
3. **Replacement semantics need a decision**, the same one the post editor answered: when the
   photo is swapped, is the old object **detached or deleted**? About photos have no
   `cat_images`-style record, so nothing else would ever refer to the orphan.
4. The route's duplicate-name **409** (added 2026-07-30) would now apply to about photos too —
   re-uploading a corrected `about-main-geyang.jpg` would be refused rather than replacing it.

**Done looks like:** an operator changes the about photo entirely inside `/admin`, and a
filename that cannot resolve is impossible to save rather than discovered later on the public
page.

**Touches:** `src/components/admin/AboutContentEditor.tsx`,
`src/app/api/generate-signed-url/route.ts`, `src/services/storage-service.ts`,
`docs/manuals/admin-manual/README.md` §7, `docs/manuals/deployment/new-mountain-setup.md` §7.

---

## B2 — `view-analytics` is enforced by the rules and held by nobody

**Found:** 2026-08-03, by the new `tests/smoke` permission-catalogue guard **on its first
run** — which is exactly the class of drift it was written for (PROJECT_PLAN §10p).

**The gap.** `firestore.rules` gates reads of `permission_logs` on `view-analytics`:

```
allow read: if request.auth != null &&
  hasPermissionFor(request.auth.uid, 'view-analytics', resource.data.mountainId);
```

That permission appeared in **no** role, in neither `config/permissions.json` nor the live
`role_permissions/role-config`, and was not in the `Permission` union either — so it could not
be granted, and the audit trail is readable by **no one**. It is now catalogued in
`ALL_PERMISSIONS` (2026-08-03), which makes it tickable in the 역할 matrix; it is still
granted to nobody, because who may read an audit log is an owner decision.

🔑 **A rule requiring an undefined permission fails closed and silently.** There is no error
and no log — `hasPermissionFor` simply returns false, so the symptom is "the page is empty",
indistinguishable from "there is nothing to show". That is why 14 months passed unnoticed.

📌 **Nothing is visibly broken today**, which is why this is deferred rather than fixed:
`permission-service.ts`'s two client readers (`getUserPermissionLogs`,
`getAllPermissionLogs`) have **no callers**, and the writes go through the Admin SDK, which
bypasses rules. The log is being written correctly and simply never read.

**The decision it needs** is which way to close it: grant `view-analytics` to `admin` and
build (or wire up) an audit-log view, or accept that the log is write-only forensics read from
the Firebase Console and delete the two dead readers. Either is coherent; the current state —
a rule, a permission, and two functions that can never succeed — is not.

---

## Open questions (owner decisions — not tasks until answered)

- **Q1 — Should the about page render `sections`?** (2026-08-02) The CMS has a 섹션 editor that
  saves to `about_content/{id}.sections`, and the public page **never renders it** — it shows
  제목 / 부제 / 대표 사진 / 본문 only. Live `about_content/geyang` currently holds an empty
  `sections` array, so nothing is being hidden today — but the editor has been inviting input
  that goes nowhere. Either the page grows a section renderer, or the field and its editor
  come out.

  🔑 **Verified against the full history (2026-08-02): a renderer was written but never
  switched on.** JSX comments were stripped from all **16** historical versions of the about
  page and searched for a live `.sections` reference; the only uncommented ones ever are the
  fallback-object construction (`sections: jsonConfig.sections || []`). The block shipped
  **already commented out** in `b436958`, the first commit that created the page; it was
  rewritten (still commented) for the CMS move in `83db9cb`; and `4ef62cc` deleted it as dead
  code during the Phase C design pass. **Nobody has ever seen a section on this page** — so
  "restore what was there" is not the obvious answer, and neither is treating this as a
  regression. Same for the two sections the pre-2026-08-02 config block declared
  (우리의 미션 / 활동 내용): also never displayed.

  ⚠️ **The CMS advertises behaviour the page does not have — one click in.** The 섹션 block
  shows only a heading and **섹션 추가** until a section exists (the fields live inside
  `content.sections.map(...)`, and `about_content/geyang` holds `[]`), so the promise is not
  on screen at rest. Press 섹션 추가 and the content textarea appears carrying
  `adminStrings.ts` → `sectionContentPlaceholder`:
  _"섹션 내용도 [링크](https://example.com)와 URL 자동 인식을 지원해요"_ — with the
  💡 링크 지원 help panel above it. 📌 **That placement makes it worse, not better:** the
  operator meets the promise at the exact moment they have decided to write a section, then
  gets a save confirmation and no output. **Whichever way Q1 goes, that string and the field
  must move together** — leaving the promise in place is the worst of the three outcomes.

  💡 Minor, same block: each section's content field is labelled `t.fields.mainContent`
  (**본문**), reusing the page-level body label rather than having its own.

  📌 **If the answer is "render them", the deleted implementation is a starting point, not a
  patch to re-apply.** It ran `section.content` through `processTextWithLinks` (so link tokens
  were intended to work there — consistent with the placeholder above), but it coloured
  headings with `style={{ color: theme.primaryColor }}`, the old inline-theming approach. The
  current convention is the `--color-primary` CSS variable injected by the `[mountain]` layout,
  so a verbatim restore would be off-pattern.
