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

## 4. Cat-data edits (no longer a deploy-time step)

> The Google Sheets → Firestore **bulk-import path has been retired** (the
> `data_updater.js` importer and the CMS "🔄 Migrate Neutering Data" / "📅 Migrate Birth
> Dates" buttons were removed 2026-06-29). Edit cats directly in **Admin → 고양이 관리** —
> the **card editor** or the **spreadsheet grid**. Both write correct types, are
> non-destructive (per-field writes — app-only fields like `adoptable` are never wiped),
> and fire `/api/revalidate` on save. There is no bulk data operation to run before a deploy.

- [ ] If you edited cat data in the CMS, confirm each save succeeded and that the baked
      home/adoption pages refreshed (the CMS fires revalidation automatically — see §5).

## 5. Post-deploy verification

- [ ] Preview/Prod loads: home map + cat avatars, a gallery, login renders.
- [ ] If you changed cat data outside the CMS (e.g. the bulk script), remember **ISR
      revalidation is not triggered by raw writes** — baked home/adoption pages lag up to
      ~1h unless a CMS cat-edit fires `/api/revalidate` or you redeploy.
- [ ] Admin CMS smoke: can still edit a cat / announcement (write paths intact).

---

_Add project-specific items below as they come up (e.g. data migrations, third-party
config, feature-flag flips)._
