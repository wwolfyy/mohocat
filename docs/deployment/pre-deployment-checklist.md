# Pre-Deployment Checklist

> Run through this before promoting a release. Deploy = `git push` (Vercel git
> integration): `dev` → Preview, `main` → Production. See
> [`README.md`](./README.md) for the full deploy model.
>
> This is a **living checklist** — add items as the project grows. Not every item
> applies to every release; skip the ones that don't.

---

## 1. Code gates (every deploy)

- [ ] `npx tsc --noEmit` — clean.
- [ ] `npm run test:smoke` — green.
- [ ] `npm run build` (or trust Vercel's `vercel-build`) — builds without error.
- [ ] Branch is correct: changes on `dev` first (Preview), promote to `main` only after
      the Preview deploy looks right.

## 2. Firestore rules (only if `config/firebase/firestore.rules` changed)

- [ ] Rules are **not** deployed by Vercel. Deploy them manually:
      `firebase deploy --only firestore:rules`.
- [ ] Verify the live rules match the repo (and that gated admin/CMS paths still work).

## 3. Environment variables (only if you added/changed one)

- [ ] Set it in the **Vercel dashboard** → Settings → Environment Variables (Production +
      Preview). Env vars are **baked at build time** — add it, then **redeploy**.
- [ ] Mirror the value into local `.env` for dev.

## 4. Bulk cat-data update (only if Sheets → Firestore is part of this release)

> Manual data op, deliberately kept out of the build/deploy pipeline. For one-off edits use
> the admin Cat Management page (card editor or spreadsheet grid) — it writes correct types
> and is non-destructive. Use this bulk path only when you edited cat metadata in bulk in the
> Google Sheet.

- [ ] **Back up `cats`** (export the collection) before running anything.
- [ ] ⚠️ **The import is a destructive full overwrite.** `scripts/maintenance/data_updater.js`
      does `batch.set(cats/<id>, row)` **without `{ merge: true }`**, so each matching doc is
      fully replaced and **any field not in the sheet is deleted** — including app-only fields
      like **`adoptable`** (the 입양홍보 flag, set in the CMS, not a sheet column). Before relying
      on it, either add `{ merge: true }` to the script **or** make sure the sheet carries every
      field that must survive.
- [ ] Run `node scripts/maintenance/data_updater.js` (uses the sheet's `id` column as the
      Firestore doc ID; rows without `id` are skipped).
- [ ] **Everything imports as a string.** In **Admin → 고양이 관리**, click
      **🔄 Migrate Neutering Data** + **📅 Migrate Birth Dates** to convert the freshly imported
      **strings → boolean/number** (no-ops if there's nothing to convert).
- [ ] Spot-check a few cats in the admin table — types look right and `adoptable` etc. survived.

## 5. Post-deploy verification

- [ ] Preview/Prod loads: home map + cat avatars, a gallery, login renders.
- [ ] If you changed cat data outside the CMS (e.g. the bulk script), remember **ISR
      revalidation is not triggered by raw writes** — baked home/adoption pages lag up to
      ~1h unless a CMS cat-edit fires `/api/revalidate` or you redeploy.
- [ ] Admin CMS smoke: can still edit a cat / announcement (write paths intact).

---

_Add project-specific items below as they come up (e.g. data migrations, third-party
config, feature-flag flips)._
