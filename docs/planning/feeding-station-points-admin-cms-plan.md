# Plan — 급식소 관리 (feeding-station points) admin CMS

> Status: **implemented** (gates green; browser-verified; ⚠️ rule deploy owner-owed) · Branch: `dev` · Created 2026-07-05
> Companion to [`PROJECT_PLAN.md` §4](./PROJECT_PLAN.md) (Mobile UX / map) and the off-plan
> handoff [`2026-07-05-offplan-bugfixes-and-map-config.md`](../handoff/2026-07-05-offplan-bugfixes-and-map-config.md)
> §4 (the pin-label rework this unblocks).

**Legend:** `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` deferred/out of scope

## Context

The admin nav has a **급식소 관리** item that is a disabled `준비 중` placeholder
(`admin/layout.tsx`, a `<span>` pointing at `/admin/points`). The objects it manages are the
Firestore **`points`** collection — the feeding-station pins the public map renders. Today
`points` is `write: if false` in the rules and has **no admin write path** (`PointService`
CRUD methods exist but are never called), so pin position/title/label edits require a
Firestore-console edit.

This builds the missing CMS so an operator can create / edit / delete feeding-station pins,
**including the per-pin `labelSide` override** added in the off-plan handoff §4 (currently
authorable only via the Firestore console). That off-plan pin-label change is **held
uncommitted** and lands together with this CMS as one swing.

The map data path is ISR: the home page `/` reads points server-side with
`revalidate = 3600`, and admin cat mutations already POST `/api/revalidate` (which revalidates
`/`). A points mutation reuses that same path so edits reflect immediately, not just on the
≤1h backstop.

Reference model throughout: the **cats** CMS (`admin/cats/page.tsx`, client-SDK writes gated on
a management permission + `triggerCatRevalidate`) and the **adoption** plan's rules pattern.

## Locked decisions (settled with owner 2026-07-05)

1. **Scope = `points` (급식소) only.** The 겨울집 (`winter-houses` / `manage-shelter`)
   placeholder stays disabled — out of scope here.
2. **Permission = `manage-canteen`** (already defined, admin-only in `permissions.json`;
   canteen = 급식소). Rules open `points` write to it, mirroring the cats rule.
3. **Coordinate editing = visual map picker.** Render the landscape map image with all existing
   pins shown; click (or drag the edited pin) to place it, deriving `x`/`y` as % of the image.
   Desktop/landscape image is the authoring surface. (labelSide collisions are width/DPI-
   dependent, so their final check is on a **real device** against the live site — the picker
   sets position, not a pixel-perfect label-collision preview.)
4. **Delete safety = block while referenced.** A point referenced by any cat's `dwelling` /
   `prev_dwelling` cannot be deleted; the CMS lists the referencing cats and refuses until they
   are reassigned.
5. **`labelSide` editing lives in this form** — per-device (mobile / desktop) select of
   `auto` / `above` / `below`; `auto` (or both unset) stores no override and keeps the automatic
   edge-flip. Shape: `{ mobile?: 'above'|'below', desktop?: 'above'|'below' }` (already on
   `Point`).

---

## Workstream — points CMS

**P1. Firestore rules** — `config/firebase/firestore.rules`: change the `points` block from
`allow write: if false` to admin-gated, mirroring cats, and update the stale comment:

```
match /points/{x} {
  allow read: if true;
  allow write: if request.auth != null && hasPermission(request.auth.uid, 'manage-canteen');
}
```

⚠️ **Owner action:** deploy with `firebase deploy --only firestore:rules` — writes fail against
real Firestore until deployed (per CLAUDE.md, rules deploy is owner-run).

**P2. Service** — no change. `FirebasePointService` already implements
`getAllPoints` / `getPointById` / `createPoint` / `updatePoint` / `deletePoint`
(`services/point-service.ts`), and `...doc.data()` carries `labelSide` through. Confirm
`getPointService()` is exported from `services/index.ts` (it is).

**P3. Strings** — `constants/adminStrings.ts`: add a `points:` block (Korean 해요체) —
page title, add/edit/delete labels, field labels (제목/설명/위치/라벨 위치), the per-device
label-side option labels (자동/위/아래), the delete-blocked message
(`이 급식소에 사는 고양이가 있어 삭제할 수 없어요…`), and error strings mirroring
`adminStrings.cats.errors`.

**P4. Map picker component** — `components/admin/PointMapPicker.tsx` (new): a self-contained,
**Leaflet-free** picker.

- Renders the landscape map image (`/images/screenshot_mt_geyang_50.png`) responsively.
- Overlays every existing point as a small dot + title (context), and the **edited** point as a
  highlighted marker.
- Click anywhere → set `{x,y}` as % from the image's bounding rect; the edited marker is also
  **draggable** (pointer events) for fine adjustment.
- Props: `points: Point[]` (context), `value: {x,y} | null`, `editingId?: string`,
  `onChange(next: {x,y})`. No service calls — pure controlled input.

**P5. Admin page** — `app/admin/points/page.tsx` (new), modeled on the cats page conventions
(loading/error/saving state, delete-confirm), simpler:

- Load points via `getPointService().getAllPoints()`; load cats via `getCatService().getAllCats()`
  once, to compute a `pointId → referencing cats` map for the delete guard.
- **List**: title, x/y, a labelSide summary (e.g. `모바일: 위`), edit + delete buttons.
- **Form** (add / edit): 제목 (text, required), 설명 (textarea), **위치** via `PointMapPicker`
  (click/drag on the map **and** editable 가로/세로 number inputs, two-way-synced, rounded to
  0.1%), **라벨 위치** two selects (모바일 / 데스크탑 → 자동/위/아래).
- **Save**: build the payload (omit a `labelSide` key when its select is `자동`; omit `labelSide`
  entirely when both are auto), call `createPoint`/`updatePoint`, then `triggerCatRevalidate(user)`
  (reused — it revalidates `/`, which is the map page; note the cat-specific name in a comment).
- **Delete**: if the point is referenced by any cat, block and show the referencing cat names;
  otherwise `deletePoint` + revalidate.

**P6. Nav** — `app/admin/layout.tsx`: replace the disabled 급식소 관리 `<span>` (+ its
`handleDisabledClick`) with an `<a href="/admin/points">` using the existing
`getNavItemClasses('/admin/points')`. Leave 겨울집 as the disabled placeholder.

---

## Files touched (summary)

New: `app/admin/points/page.tsx`, `components/admin/PointMapPicker.tsx`.
Edit: `config/firebase/firestore.rules`, `constants/adminStrings.ts`, `app/admin/layout.tsx`.
No change: `services/point-service.ts`, `services/index.ts`, `types/index.ts` (`labelSide`
already added), `lib/revalidate-client.ts` (reused).

## Tasks (progress tracker)

Checked off as each lands; gates (`tsc` + smoke) run at the end (and `npm test` for the
already-landed label unit tests).

- [x] P1. `points` write rule → `manage-canteen` in `firestore.rules` (⚠️ owner deploys) + comment fix
- [x] P2. Confirm `PointService` CRUD + `getPointService()` export (no code change needed)
- [x] P3. `adminStrings.points` block (Korean)
- [x] P4. `components/admin/PointMapPicker.tsx` — Leaflet-free click/drag picker
- [x] P5a. `app/admin/points/page.tsx` — load points + cats, list view
- [x] P5b. add/edit form (title, description, picker, labelSide selects) + save + revalidate
- [x] P5c. delete guard (block while referenced by cat dwelling/prev_dwelling)
- [x] P6. `admin/layout.tsx` — enable the 급식소 관리 nav link
- [x] Fold in the held pin-label rework (types/mapLabels/LeafletMountainMap/tests + its FEATURE_MOD_LOG/PLAN entries — already in the working tree, uncommitted)
- [x] Gates: `npx tsc --noEmit` + `npm run test:smoke` (25/25) + `npm test` (39/39)
- [x] Browser-verify (localhost:3000) — list, add-form + click-to-place picker, delete-guard (blocked w/ cat list), no console errors. _(Actual save owner-owed — needs the rule deployed.)_
- [x] `log/FEATURE_MOD_LOG.md` entry + admin-manual note + PROJECT_PLAN §4 update

## Verification

1. Gates: `npx tsc --noEmit` + `npm run test:smoke` (25/25) + `npm test` (39/39).
2. Deploy the rule (owner), then in a browser (localhost:3000, signed in as admin):
   - **Nav** `/admin` → 급식소 관리 is now an active link.
   - **List** `/admin/points` lists the existing points with position + labelSide.
   - **Create** a point via the map picker (click to place) → it appears in the list and on the
     public map `/`.
   - **Edit** a point's position (drag) and set 라벨 위치 모바일 = 위 → save → the public map
     reflects it (labelSide side flips on mobile; verify final collision on a **real device**).
   - **Delete**: a point with resident cats is **blocked** (lists the cats); a point with none
     deletes and disappears from the map.
3. Note: `points` is ISR-fresh (revalidate on save via `/api/revalidate` → `/`), not baked —
   no redeploy needed for point data. The `labelSide` field is optional; existing points lack it
   and keep the automatic edge-flip (no migration).
