# Firebase Storage → Korea Bucket Migration

Moves all Firebase Storage files from the US bucket (`mountaincats-61543.firebasestorage.app`, `us-central1`) to a new Seoul bucket (`asia-northeast3`), then rewrites all Firestore URLs to point to the new bucket.

## Why

The US bucket adds 150–300 ms of latency for Korean users on every uncached image request. A Seoul-region bucket cuts this to near-zero.

---

## Step 1 — Create the new Seoul bucket

1. Firebase Console → Storage → three-dot menu → **Add bucket**
2. Choose **asia-northeast3 (Seoul)**
3. Note the new bucket name (e.g. `mountaincats-korea.firebasestorage.app`)
4. Apply the same Storage Rules as the existing bucket (copy from the Rules tab)
5. Apply the same CORS config (copy from the existing bucket via Cloud Console → Cloud Storage → bucket → CORS)

---

## Step 2 — Transfer files

Use the **Storage Transfer Service** in Google Cloud Console:

1. GCP Console → Storage Transfer Service → **Create Transfer Job**
2. Source: **Google Cloud Storage** → bucket `mountaincats-61543.firebasestorage.app`
3. Destination: new Seoul bucket
4. Options: **Overwrite never**, **Delete never**
5. Run immediately (one-shot)

Or via `gsutil` (faster for smaller buckets):

```bash
gsutil -m cp -r gs://mountaincats-61543.firebasestorage.app/* gs://<new-bucket>/
```

Wait for the transfer to complete before proceeding.

---

## Step 3 — Update Vercel env var

In the Vercel dashboard (Production **and** Preview):

```
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = <new-bucket-name>
```

This makes all new uploads and `fetch-static-assets.js` at next build use the Seoul bucket. **Do not redeploy yet** — wait until the Firestore URL migration (Step 4) is done so existing URLs still resolve during the transition.

---

## Step 4 — Rewrite Firestore URLs

The migration script updates every Firestore document that contains a Firebase Storage URL pointing to the old US bucket.

```bash
OLD_BUCKET=mountaincats-61543.firebasestorage.app \
NEW_BUCKET=<new-bucket-name> \
node scripts/migration/rewrite-storage-bucket-urls.js
```

**Always dry-run first:**

```bash
DRY_RUN=true \
OLD_BUCKET=mountaincats-61543.firebasestorage.app \
NEW_BUCKET=<new-bucket-name> \
node scripts/migration/rewrite-storage-bucket-urls.js
```

Collections migrated:

| Collection       | Fields                        |
| ---------------- | ----------------------------- |
| `cat_images`     | `imageUrl`, `thumbnailUrl`    |
| `cat_videos`     | `thumbnailUrl`                |
| `cats`           | `thumbnailUrl`                |
| `posts_feeding`  | `thumbnailUrl`, `imageUrls[]` |
| `posts_adoption` | `thumbnailUrl`, `imageUrls[]` |
| `posts_butler`   | `thumbnailUrl`, `imageUrls[]` |

The script is safe to re-run — it skips documents whose URLs don't match the old bucket pattern.

---

## Step 5 — Redeploy

Trigger a Vercel redeploy from the dashboard (or push any commit). This runs `fetch-static-assets.js`, which will now pull thumbnails and about-photos from the Seoul bucket.

---

## Step 6 — Verify

1. Open the app — album photos and lightbox images should load noticeably faster
2. Check the about page photo loads
3. Check cat thumbnails on the map and in the cat list
4. Upload a new photo in the admin and confirm it lands in the Seoul bucket

---

## Rollback

If anything goes wrong before redeployment, reverting the Vercel env var to the old bucket name restores full functionality — the old bucket is still intact. Run the migration script again with OLD/NEW reversed to rewrite URLs back if needed.

---

## After the migration settles

Once stable, the old US bucket can be archived or deleted via GCP Console → Cloud Storage to stop incurring storage costs on the old region. Don't delete it until all Firestore URLs have been confirmed migrated.
