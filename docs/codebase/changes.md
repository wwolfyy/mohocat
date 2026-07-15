# Update History

## 2026-07-11T00:16:07Z — scope=repo

**Mode:** update
**Commit range:** `f835d581..HEAD` (re-based — see note)
**Audience:** Architect / tech lead

> **Base-commit note:** `log/doc_updates.log` recorded the prior first-run at
> `2026-05-09T19:26:43Z`, whose preceding commit was `b5aa50a "Test"`. That commit predates a
> large repo reorganization _and_ the creation of the `docs/codebase/` docs themselves
> (committed `f835d581`, 2026-05-25), so a `b5aa50a..HEAD` diff was dominated by doc-archival
> moves and infra deletion. The meaningful change analysis below is re-based to `f835d581`
> (when the docs were written) and scoped to `src/` + `config/`.

### Change manifest (`f835d581..HEAD`, `src/` + `config/`)

- Added: 55 (representative)
  - `src/components/LeafletMountainMap.tsx`, `Compass.tsx`, `IntroCard.tsx`, `Footer.tsx`, `NavDropdown.tsx`
  - `src/lib/server/cat-reads.ts`, `src/lib/cache-config.ts`, `src/lib/revalidate-client.ts`, `src/lib/auth/requireApiPermission.ts`, `authHeader.ts`
  - `src/components/ui/{Modal,Button,Card,Input,Field,Alert,Lightbox,VideoPlayer}.tsx`, `useModalLayer.ts`
  - `src/components/album/{MediaTile,AlbumFilterBar,AlbumStates}.tsx`
  - `src/components/admin/cat-grid/{CatGrid,selectColumn}.tsx`, `ContactManagement.tsx`, `PointMapPicker.tsx`
  - `src/services/adoption-service.ts`; `src/app/api/{account/delete,contact,revalidate}/route.ts`
  - `src/app/pages/{adoption,cats,privacy,terms}/…`; `src/constants/{strings,adminStrings}.ts`
  - hooks: `useIdleTimeout`, `useIsMobile`, `useIsPhoneLandscape`, `useMediaFilter`, `useMediaLinks`; utils: `cat-filters`, `mapClustering`, `mapLabels`, `parse-date`
  - …and more
- Deleted: 25 (representative)
  - `src/components/admin/PermissionDebug.tsx`, `PermissionManager.tsx`, `RoleManagementDirect.tsx`
  - `src/components/admin/{ImageEdit,ImageList,VideoEdit,VideoList}.tsx`, `RandomCatThumbnail.tsx`
  - `src/app/api/admin/get-all-user-permissions-{final,fixed,live,real,simple,working}/route.ts`, `get-all-users`, `update-static-data`, `api/health`
  - `src/lib/{cats-static-data.json,feeding-spots-static-data.json,admin/dataProvider.ts,admin/sampleData.ts}`
  - `src/services/MIGRATION_EXAMPLE.ts`, `src/utils/cat-migration-helper.ts`, `config/firebase/firebase.json` (moved)
- Modified: 94 (representative)
  - `src/app/page.tsx` (ISR + baked cats), `src/app/layout.tsx` (Footer)
  - most `src/components/auth/*`, `src/services/*` (auth, cat, contact, post, permission, role-assignment, index, interfaces)
  - `src/components/{MountainViewer,PhotoAlbum,VideoAlbum,Navigation,…}.tsx`, admin pages, `config/mountains/mountains.json`, `config/firebase/firestore.rules`
  - …and more

> Note: the repo-wide diff (outside `src/`/`config/`) also removed `Dockerfile`,
> `docker-compose.yml`, and the Cloud Run / home-server / Firebase-Hosting GitHub workflows, and
> moved Terraform to `_infra/_terraform/` — the basis for the deployment-doc rewrite.

### Area classification

- **Continuing (changed):** all ten — deployment-and-build, admin-platform, community-pages,
  authentication, permissions-and-roles, api-routes, media-and-youtube, mountain-map-and-cats,
  services-layer, multi-tenant-config.
- **Continuing (unchanged):** none.
- **New:** none (all churn mapped into existing areas).
- **Removed:** none.

### User selections

- **Regenerated:** CODEBASE_OVERVIEW + all 10 deep-dive docs (full refresh).
- **Deleted docs:** none.
- **Execution mode:** Sequential.
- **Context:** kept core purpose + "Architect / tech lead" audience; corrected deployment facts
  to Vercel-only + live Firestore per current code and `CLAUDE.md`.

### Files written

- `CODEBASE_OVERVIEW.md` (regenerated)
- `mountain-map-and-cats.md` (regenerated)
- `authentication.md` (regenerated)
- `permissions-and-roles.md` (regenerated)
- `services-layer.md` (regenerated)
- `api-routes.md` (regenerated)
- `admin-platform.md` (regenerated)
- `community-pages.md` (regenerated)
- `media-and-youtube.md` (regenerated)
- `multi-tenant-config.md` (regenerated)
- `deployment-and-build.md` (regenerated)
  </content>
