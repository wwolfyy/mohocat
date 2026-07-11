# Dead-code Removal Assessment — 20260711

> Source-verified assessment of removable code, produced by cross-checking
> `docs/codebase/` + `PROJECT_PLAN.md` against actual `src/` references
> (every item below was grep-verified to have **zero live callers**).
>
> **Status:** assessment only — nothing removed yet. Gates to run after any
> deletion: `npx tsc --noEmit` + `npm run test:smoke`.
>
> **Scope:** ≈ **3,200 LOC across 19 files** + two method-level items.
> _(Revised up from ≈2,950/14 after a second-pass review found 5 more dead files —
> `permission-utils.ts` + 4 unreferenced API routes; see §2/§2a.)_

**Legend:** `[ ]` todo · `[x]` done

---

## 1. Dead debug / demo cluster (never linked, never imported)

Two self-contained trees rooted at unreachable files. Removing the roots makes
the leaves dead too (each leaf's only importer is another node in the tree).

| File                                        | Why dead                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/auth-test/page.tsx`                | Debug route, not in nav; nothing links to it                                                                                                                                                                                                                                                                                                            |
| `src/utils/auth-integration-test.ts`        | Imported only by `auth-test/page.tsx`                                                                                                                                                                                                                                                                                                                   |
| `src/utils/kakao-auth-test.ts`              | Zero references                                                                                                                                                                                                                                                                                                                                         |
| `src/components/ProviderManagement.tsx`     | Imported only by `auth-test` + `SocialLoginDemo` (both dead)                                                                                                                                                                                                                                                                                            |
| `src/components/SocialLoginDemo.tsx`        | Zero references                                                                                                                                                                                                                                                                                                                                         |
| `src/components/KakaoTalkDebug.tsx`         | Imported only by `SocialLoginDemo`                                                                                                                                                                                                                                                                                                                      |
| `src/components/KakaoTalkFallbackDebug.tsx` | Imported only by `KakaoTalkDebug`                                                                                                                                                                                                                                                                                                                       |
| `src/utils/oauth.ts` (159 LOC)              | None of its 9 exports (7 functions — `generateOAuthState`, `verifyOAuthState`, `handleOAuthSuccess`, `handleOAuthError`, `isOAuthSupported`, `getProviderDisplayName`, `formatOAuthError` — + 2 interfaces `OAuthState`/`OAuthError`) are imported anywhere. (`ProviderManagement.tsx` defines its own local `getProviderDisplayName` — not an import.) |
| `src/app/api/test-youtube-auth/route.ts`    | Debug API route, unreferenced                                                                                                                                                                                                                                                                                                                           |

⚠️ **Do NOT remove** `SocialLoginButton`, `LoginForm`, `SignupForm` — they are
used by the real login / `AdminAuth` paths, not just this cluster.

- [ ] Remove the cluster above.

## 2. Standalone dead files

| File                                          | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/services/basic-feeding-spots-service.ts` | `BasicFeedingSpotsService` / `getBasicFeedingSpotsService` unused. Runtime uses `getAdminFeedingSpotsService().getBasicFeedingSpots()` (`feeding-spots-admin-service.ts`) instead; the `BasicFeedingSpot` interface is redefined locally in every consumer (`feeding-spots-admin-service.ts`, `NewPostForm.tsx`, `butler_stream/new/page.tsx`). This is the dead one of the feeding-spots variants flagged in `services-layer.md`.               |
| `src/components/FirebaseStorageTest.tsx`      | Storage test component, unreferenced                                                                                                                                                                                                                                                                                                                                                                                                             |
| `src/components/PostItem.tsx`                 | Superseded by `PostList` / `AdminPostList`; unreferenced                                                                                                                                                                                                                                                                                                                                                                                         |
| `src/components/ButlerStreamTabs.tsx`         | Unreferenced                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `src/utils/dateParserTest.ts`                 | Test scaffold, unreferenced. (Both `utils/dateParser.ts` and `utils/parse-date.ts` are live — different functions — so neither is removable here.)                                                                                                                                                                                                                                                                                               |
| `src/utils/permission-utils.ts` (190 LOC)     | Zero importers. Every same-named symbol elsewhere is a **local** definition, not an import from here: `getUserRole` (own methods in `permission-service.ts` / `role-assignment-service.ts` / `lib/auth/admin.ts`), `canManageCats`/`canViewAnalytics` (locals in `usePermissions.ts`), `ALL_PERMISSIONS` (redeclared in `RolePermissionConfig.tsx` + `ResourcePermissionConfig.tsx`). _(Missed by the original sweep; added 2026-07-11 review.)_ |

- [ ] Remove the standalone dead files above.

## 2a. Dead API routes (unreferenced; added 2026-07-11 review)

Judged by the same criterion as `test-youtube-auth` in §1: no code anywhere builds a
request to these paths (repo-wide grep, incl. cross-route calls in `src/app/api`).

| Route                                             | Why dead                                                                                                                                                                                                                                                             |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/api/feeding-spots-basic/route.ts`        | Zero callers. The live path is server-side: `butler_stream` pages call `getAdminFeedingSpotsService().getBasicFeedingSpots()` directly, never via HTTP                                                                                                               |
| `src/app/api/fetch-playlists/route.ts`            | "Not yet implemented" stub returning `[]`; zero callers (live path is `/api/youtube-playlists`)                                                                                                                                                                      |
| `src/app/api/manage-playlist-membership/route.ts` | "Not yet implemented" stub; zero callers                                                                                                                                                                                                                             |
| `src/app/api/auth/status/route.ts`                | Stub health-check returning static `ok`; zero callers. (The `YouTubeAuthPanelNew` hit is `/api/admin/youtube-auth/status` — a different, live route.) Sibling of the `/api/health` route already removed in the §7 deployment cleanup — this one was overlooked then |

⚠️ Doc touch-up in the same pass: `docs/codebase/api-routes.md` and
`media-and-youtube.md` list `fetch-playlists`, `manage-playlist-membership`, and
`test-youtube-auth` in their route tables.

- [ ] Remove the dead API routes above (+ the doc touch-up).

## 3. Method-level dead code (remove the method, keep the file)

- [ ] **`FirebaseContactService.createContact`** + its `IContactService.createContact`
      interface entry (`src/services/contact-service.ts`, `src/services/interfaces.ts`).
      Superseded by `POST /api/contact` (Admin SDK); the `contacts` rule is now
      `create: if false`, so this client-SDK write would fail anyway. Keep
      `getAllContacts`.
- [ ] **`getMountainTheme()`** (`src/utils/config.ts:246`). No callers — PROJECT_PLAN
      §9 already notes "theme not wired through." Keep the `MountainTheme` type (still
      used by `MountainConfig.theme`).

---

## Stale doc claims to correct (NOT dead — leave the code alone)

- **`point-service` writes** — `services-layer.md` / PROJECT_PLAN §7a call
  `createPoint` / `updatePoint` / `deletePoint` "never called." **No longer true** —
  `src/app/admin/points/page.tsx` (the 급식소 CMS) uses all three.
- **`react-zoom-pan-pinch`** — `CODEBASE_OVERVIEW.md` labels it "legacy image-map
  interactions." It is actively used by `src/components/ui/Lightbox.tsx` for mobile
  pinch-zoom.

## Product decisions (not mechanical dead code)

- `src/components/MountainSelector.tsx` — renders in the layout but the `?mountain=`
  switch is a no-op (PROJECT_PLAN §9). Removal is a feature decision, not cleanup.
- `겨울집 관리` disabled nav stub in `src/app/admin/layout.tsx` — intentional
  placeholder for an unbuilt feature; leave until that feature lands (per §5).
- `src/app/admin/migration/page.tsx` (11 LOC + its `adminStrings.migration` block) —
  an **orphan URL**: not linked from the admin nav at all (unlike 겨울집, which is at
  least a visible disabled item). `admin-platform.md` calls it a placeholder ("data
  migration now lives in the cats page"). Removing it is a small product call, not
  mechanical cleanup — but if removed, drop the `adminStrings.migration` block too.

---

## Verification method

For each `src/**/*.{ts,tsx}` file, searched for its basename as a word across all
other files (`rg -l --glob '!<self>' '\b<basename>\b' src`); files with zero hits
are unreferenced. Method-level items were confirmed by grepping the specific symbol
(`createContact`, `getMountainTheme`, `getBasicFeedingSpotsService`, the `oauth.ts`
exports). App-Router convention files (`page.tsx` / `route.ts` / `layout.tsx`) were
judged by reachability (nav links / route wiring), not import graph.

**2026-07-11 review pass:** the basename sweep was independently re-run and every
item above re-verified. It surfaced §2 `permission-utils.ts` (missed by the original
run despite being catchable by the same method) — its exports were then symbol-checked
one by one to rule out same-named locals shadowing real imports. §2a came from a
route-reachability sweep: every `src/app/api/**/route.ts` path grepped repo-wide
(src, tests, scripts, incl. cross-route calls). Also confirmed `tests/smoke/`
references none of the deletion candidates, so the gates are unaffected.
