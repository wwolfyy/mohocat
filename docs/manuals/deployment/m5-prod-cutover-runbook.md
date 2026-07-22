# M5 prod cutover — runbook (owner-run)

**Goal:** get the multi-mountain M1–M5 bundle live on production **without a lockout
window**. The naïve "migrate → deploy rules" order is **not safe on its own** — the new
rules deny any content write that doesn't carry a `mountainId`, and the code that stamps
it (M4, `b83a112`) is only on `dev`. So the `dev → main` promotion (app code) has to land
_between_ the migration and the rules deploy. This runbook sequences all of it.

**Prepared:** 2026-07-23. **Target project:** `mountaincats-61543` (prod; `.firebaserc`
default). **Everything here is owner-run** (Firebase creds + Vercel promotion).

---

## Why this exact order (read once before starting)

| If you…                                                              | …this breaks                                                                                                                                                   |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deploy **rules** before the app stamps `mountainId` (M4 on prod)     | Every client-SDK content write (cats, points, about, images, videos, posts, feeding_spots) → `canWrite()` sees `mountainId = null` → **DENIED**. CMS blackout. |
| Promote the app (reads `roles[mountainId]`) before the **migration** | Prod app can't resolve any permission (users still only have `currentRole`) → admins locked out of the CMS UI.                                                 |
| Promote the app (M5.1 scoped reads) before the **indexes** exist     | Scoped `where('mountainId','==',…)` queries that need a composite index throw → the services swallow to `[]` → **silently empty albums/feeds**.                |

The migration is **purely additive** (it _adds_ `roles[mountainId]`, leaves `currentRole`
in place), so it's safe to run while prod still serves the old app. Indexes are additive
and harmless to the old app. Only the **rules** deploy is destructive if early — so it
goes **last**, after the app is live and stamping `mountainId`.

**Safe sequence:** snapshot → migrate → deploy **indexes** (wait for build) → promote
`dev → main` (Vercel deploy, verify) → deploy **rules** (verify a write) → cleanup.

---

## Preconditions

- [ ] `firebase` CLI available and logged in to the prod project
      (`npx firebase-tools login` / `npx firebase-tools use mountaincats-61543`), or use
      your globally-installed `firebase`. (It's **not** on this repo's PATH.)
- [ ] Service-account key present at
      `config/firebase/mountaincats-61543-7329e795c352.json` (used by the migration +
      backup scripts). ✅ confirmed present 2026-07-23.
- [ ] **P5.4 manual YouTube pass done** — owner-owed before _any_ `dev → main` promotion
      (HANDOFF). The promotion in step 4 carries the whole dev bundle, YouTube editors
      included.
- [ ] Decide consciously: this promotion ships M1–M5.3. **M5.4 (two-tenant isolation
      e2e) is not yet written**, and M6/M7/M8 remain — but geyang single-tenant behavior
      is preserved at every step (e2e 116/13/0 held through M5.2). Shipping now is safe
      for the live site; it just means the isolation _proof_ lands after prod. If you'd
      rather prove isolation first, stop here and do M5.4 before this runbook.
- [ ] Low-traffic window (the rules deploy in step 5 has a few-second propagation).

---

## Step 1 — Snapshot (standing rule: snapshot before any prod write)

```bash
cd /Users/jp/github/mohocat
npm run backup:firestore
```

- Writes a local dump to `backups/firestore/<timestamp>/` (git-ignored, `0700`).
- ⚠️ **The dump holds an OAuth refresh token + `contacts`/`users` PII** — keep local,
  delete when the cutover is verified.
- PITR (7-day) + the weekly schedule are also in place as backstops.

**Verify:** the command prints a per-collection doc count and exits 0; a new timestamped
dir exists under `backups/firestore/`.

---

## Step 2 — Migrate `users` + `about_content` (additive, reversible)

**2a. Dry run (no writes) — always first:**

```bash
cd /Users/jp/github/mohocat
node scripts/migration/migrate-m5-role-and-about.js
```

Read the output:

- Phase 1 lines: `users/<id>: roles.<mountain> = <role>` — one per user with a role.
  ⚠️ Confirm the **admin account** shows `(normalized 'default' → 'geyang')` — that's the
  legacy placeholder being keyed under the real mountain so the admin isn't stranded.
- The `→ total=… would migrate=… already=… no-role=…` summary looks sane (migrate count
  = users that have a `currentRole` and aren't already migrated).
- Phase 2: `about_content/about → about_content/geyang (N fields)`.

**2b. Apply:**

```bash
APPLY=true node scripts/migration/migrate-m5-role-and-about.js
```

- Idempotent (skips already-migrated docs) → safe to re-run.
- `currentRole` and `about_content/about` are **left in place** → reversible.

**Verify:** re-run the **dry run** (2a) — it should now report `would migrate=0`,
`already=<same count>`, and Phase 2 `target-exists`. Prod app is unaffected (still reads
`currentRole`).

**Rollback (if needed):** the migration only _added_ fields — the old app keeps working.
To fully undo, delete the `roles` field from the touched user docs and
`about_content/geyang` (or restore from the Step 1 dump / PITR). Not normally necessary.

---

## Step 3 — Deploy composite indexes (before the app goes live)

```bash
cd /Users/jp/github/mohocat
firebase deploy --only firestore:indexes --project mountaincats-61543
```

- Deploys the 6 hand-derived composite indexes from
  `config/firebase/firestore.indexes.json` (M5.1). Additive — the current prod app
  doesn't use them, so this is harmless early.
- 🔑 **Wait until every index shows `Enabled`** in the Firebase console
  (Firestore → Indexes). Index builds take minutes; the M5.1 scoped queries will error
  (→ swallowed to `[]` → empty albums) if the app goes live before they're built.

**Verify:** Firebase console → Firestore → Indexes: all 6 composite indexes `Enabled`
(not `Building`).

---

## Step 4 — Promote `dev → main` (app code live on prod Vercel)

This puts M4 (mountainId stamping) + M5 (scoped reads, roles model) on production. Follow
the existing branch model (PR #7 precedent): **merge commit**, `dev → main`.

```bash
cd /Users/jp/github/mohocat
git checkout dev && git pull
# ... open PR dev -> main, ensure the `e2e` required check is green, merge with a MERGE COMMIT ...
```

- Vercel Git integration auto-deploys `main` → production on merge.
- At this point: users have `roles` (step 2), indexes exist (step 3), the app stamps
  `mountainId` and resolves `roles[mountainId]`. **Prod rules are still the OLD ones** —
  they permit the now-stamped writes, so nothing is denied yet.

**Verify on prod (geyang) BEFORE step 5:**

- [ ] Public site loads: map with cats, photo album, video album, 공지사항 — none empty
      (proves scoped reads + indexes work).
- [ ] `/admin` loads for the admin account and the members roster renders (proves
      `roles[mountainId]` resolution).
- [ ] Console clean (no swallowed-query / permission errors).

**Rollback (if prod is wrong):** Vercel → Deployments → previous production deployment →
**Promote/Instant Rollback**. The old app reads `currentRole` (still present) and old
data, so it's fully functional. Do **not** proceed to step 5 until step 4 verifies.

---

## Step 5 — Deploy the mountain-aware rules (LAST, after the app is live)

```bash
cd /Users/jp/github/mohocat
firebase deploy --only firestore:rules --project mountaincats-61543
```

- Now writes carry `mountainId` (M4 live) and permission resolution uses `roles`
  (migrated) → `canWrite()` / `hasPermissionFor()` pass. This is the step the whole
  ordering protects.

**Verify IMMEDIATELY (a few-second propagation):**

- [ ] Edit a cat in the CMS and save → succeeds (proves `canWrite('manage-cat')` with a
      stamped `mountainId`).
- [ ] Tag a photo / create an announcement → succeeds.
- [ ] Assign a role on `/admin/members` → succeeds **and** a new `permission_logs` doc
      appears (the audit write in the same transaction).
- [ ] Load `/pages/about` → renders (reads `about_content/geyang`).
- [ ] A non-admin member can still read the community feeds but cannot write.

**Rollback (if writes break):** redeploy the previous rules from git:

```bash
cd /Users/jp/github/mohocat
git show 47d0f3d^:config/firebase/firestore.rules > /tmp/prev-firestore.rules
# review it, then swap it in and deploy (or deploy from a checkout of 47d0f3d^):
cp /tmp/prev-firestore.rules config/firebase/firestore.rules   # temporary, don't commit
firebase deploy --only firestore:rules --project mountaincats-61543
git checkout config/firebase/firestore.rules                    # restore the M5.2 rules in-tree
```

PITR (7-day) covers any data written under the wrong rules window.

---

## Step 6 — Verify & clean up (after everything is confirmed good)

The migration left the legacy fields in place on purpose (reversibility). Once steps 4–5
are verified over a day or two, you may remove them:

- [ ] Delete the legacy `currentRole` field from user docs (optional; the app no longer
      reads it after step 4).
- [ ] Delete `about_content/about` (superseded by `about_content/geyang`).
- [ ] Delete the Step 1 local dump (`backups/firestore/<timestamp>/`) — it holds secrets + PII.
- [ ] Update HANDOFF: M5 rules deploy DONE; drop the "ORDER-CRITICAL prod cutover" thread;
      note prod now carries M1–M5.3.

---

## One-glance command summary

```bash
# 0. preconditions: firebase login + prod project selected; P5.4 YouTube pass done
cd /Users/jp/github/mohocat

# 1. snapshot
npm run backup:firestore

# 2. migrate (dry run, read it, then apply, then re-dry-run to confirm idempotent)
node scripts/migration/migrate-m5-role-and-about.js
APPLY=true node scripts/migration/migrate-m5-role-and-about.js
node scripts/migration/migrate-m5-role-and-about.js   # expect would-migrate=0

# 3. indexes — then WAIT until all 6 show Enabled in the console
firebase deploy --only firestore:indexes --project mountaincats-61543

# 4. promote dev -> main (PR, e2e green, MERGE COMMIT) -> Vercel deploys prod
#    verify prod geyang public + admin before step 5

# 5. rules (LAST) — then verify a CMS write + a role-assign audit log immediately
firebase deploy --only firestore:rules --project mountaincats-61543

# 6. cleanup after a day of confidence
```
