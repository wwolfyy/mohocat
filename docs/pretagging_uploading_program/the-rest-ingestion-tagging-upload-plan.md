# Media Pre-Tagging — "The Rest" (Ingestion / Inference / Tagging / Upload) Plan

> **Status:** ✅ Implemented (2026-07-07) as `pretagger/` in the sibling repo
> [`mohocat-ml`](../../../mohocat-ml) (local: `~/github/mohocat-ml`). The design text below is
> kept as written; see **Implementation status** directly below for what was built and where
> the build deviates.

## Implementation status (2026-07-07)

Built as a FastAPI + React (Korean UI, 해요체) app, Dockerized for the Intel Mac and verified
end-to-end (ingest → detect → per-crop identity + tags → review → dry-run commit → dataset
export). Default models: YOLOX-S ONNX detector (COCO `cat` class), DINOv2 ViT-S/14 ONNX +
gallery k-NN with location/temporal priors, Florence-2-base zero-shot tagger — all behind
pluggable, config-driven loaders, fetched by script (never committed).

How the open questions of §9 were resolved:

- **Ingestion:** local folder (+ optional Storage scan); hash- and Firestore-dedup
  (`storagePath` / `youtubeId` → enrich, never duplicate).
- **Review location:** this app's own review UI (queue, per-cat identity confirm, bulk
  accept, responsive lightbox) — not the CMS.
- **Staging shape:** suggestions live in a **local SQLite DB + on-disk files**; Firestore is
  touched **only on confirm**, always merge-safe. A `dry_run: true` default logs intended
  writes instead of performing them.
- **Thresholds:** configurable in `config.yaml` (pre-check thresholds for bulk accept).
- **Video:** selectable per batch/video — 태그만 (default, manual YouTube upload) or
  태그+업로드 (OAuth API upload, quota/private-until-audit surfaced).
- **Model seam (§4):** no `/tag` HTTP call — models load **in-process** from artifact
  bundles per `mohocat-ml/contracts/model_artifact.md`; confirmed data exports per
  `contracts/dataset_export.md` (versioned `export_vN/` with manifest).

> Original status note: Draft / design (2026-07-07). Decisions below were the owner's lean at
> design time.
> **Scope:** This document covers **"the rest"** — everything except model training: media
> **ingestion**, **inference** (running the trained models on CPU), **pre-tagging**, a
> **human review** step, writing metadata to **Firestore**, and **uploading** media to the
> right place (Firebase Storage for images, the YouTube channel for videos). Model
> training/tuning/export is the _separate_ provisioning part —
> see `media-pretagging-model-provisioning-plan.md`. The two meet at the `/tag` contract.

---

## 1. Context & scope

The original goal: a **containerized app with a browser UI** to tag images and videos and upload
them to the right locations, using a model to **pre-tag** so the operator confirms/corrects in
review instead of tagging everything by hand. That whole app — minus model training — is "the
rest."

It reuses what the main Next.js app already has: the media schema (`src/types/media.ts`), the
Firestore collections and Storage folders (`src/services/media-albums.ts`), and the YouTube
upload path (`src/services/youtube.ts`, `/api/upload-youtube`). It must **not** re-invent or
diverge from those.

### Runtime topology — infer on the Mac (CPU)

- **Runs on the 2019 Intel Core i9 MacBook Pro, 32 GB RAM, CPU-only** (no CUDA, no PyTorch MPS).
  Containerized, browser-based UI.
- **Loads the CPU-deployable artifacts exported by provisioning** (OpenVINO / ONNX / int8; GGUF
  for the VLM fallbacks) and runs the **`/tag` endpoint locally** here — the GPU box trains, this
  machine infers.
- Pre-tagging is a **batch / offline** job, so CPU throughput (not latency) governs; a backlog can
  run overnight. 32 GB RAM is ample for these model sizes.

## 2. What "the rest" does — end-to-end pipeline

```
 source media ──► ingest ──► preprocess ──► infer (/tag) ──► suggestions ──► REVIEW (human)
 (folder or                  (crop, frame                    (tags +          │
  Storage scan)               sample for video)               cat candidates) │
                                                                               ▼
                                        commit on confirm ──►  upload (if needed) + write Firestore
                                                                (images → Storage; videos → YouTube)
                                                                        │
                                                                        ▼
                                        confirmed (crop,label) pairs ──►  feed provisioning's
                                                                          next training round
```

Principle throughout: **suggest, never auto-commit.** The model proposes; a human confirms in the
review UI before anything is written to the live records or uploaded.

## 3. Two media paths (image vs video differ)

|                         | Image                                                                         | Video                                                                 |
| ----------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Where the file goes** | Firebase **Storage** (`uploads/` or `images/`)                                | The **YouTube channel** (via the existing OAuth upload)               |
| **Metadata store**      | Firestore `CAT_IMAGES` (`CatImage`)                                           | Firestore `CAT_VIDEOS` (`CatVideo`)                                   |
| **Key fields**          | `storagePath`, `imageUrl`, `thumbnailUrl`, `tags`, `autoTagged`, `dimensions` | `videoType: 'youtube'`, `youtubeId`, `videoUrl`, `tags`, `autoTagged` |
| **Inference input**     | the image (cropped)                                                           | sampled frames (+ optional audio/transcript)                          |
| **Extra concern**       | generate sized thumbnails at ingest (see §6)                                  | YouTube quota + audit/private-lock (see §3a)                          |

### 3a. Video upload realities (decide before building)

- Uploading to YouTube via API: default quota ≈ **6 uploads/day** (`videos.insert` = 1600 of
  10,000 units), and **API-uploaded videos are locked to `private` until the project passes
  Google's audit**. _(Verify current policy.)_
- Therefore an explicit decision: **API upload** (build the OAuth flow, live with the quota/audit)
  vs **manual upload** (operator posts to YouTube; this app only records the resulting metadata +
  AI tags to Firestore). For low volumes, manual may be simpler. This plan supports either behind
  a small abstraction.

## 4. Inference integration (the model seam)

> **Superseded in implementation:** the `/tag` endpoint became in-process, pluggable model
> loaders reading artifact bundles (`mohocat-ml/contracts/model_artifact.md`). The output
> shape described here is preserved by the model interfaces.

- **Consumes the `/tag` contract** defined in the provisioning plan (§6 there): returns a crop, a
  ranked list of **cat candidates with scores** (open-set — may be "unknown"), and **general tags
  with scores**.
- **Preprocessing lives here, not in provisioning:** the **cat cropper** runs on this side (crop
  → embed/tag). Provisioning explicitly excludes preprocessing.
- **The identity gallery lives here.** Provisioning trains + exports the DINOv2 **metric head**;
  this app runs the frozen backbone + head to embed crops, maintains the **k-NN gallery** of
  confirmed cat vectors, does the nearest-neighbor match, and **appends a vector on each
  confirmation**. The gallery is "the rest's" data.
- **Priors applied here** to disambiguate look-alikes before/after visual scoring:
  - **Location prior** — a cat's `dwelling` / `prev_dwelling` narrows candidates for a photo from a
    given feeding station.
  - **Temporal prior (video)** — frames in one clip are likely the same cat; aggregate across
    frames.

## 5. Human-in-the-loop review

- A **review queue / UI**: browse pending suggestions, see the crop + candidate cats (with scores)
  - proposed general tags, and **accept / edit / reject** — individually and in bulk.
- **Confidence handling:** high-confidence suggestions may be pre-checked for fast bulk-accept;
  low-confidence / "unknown" identity is flagged for manual pick. (Thresholds TBD — §9.)
- **Nothing reaches the live `tags` field or gets uploaded until confirmed.** Suggestions live in
  a staging shape (a draft/`suggestedTags` field or a separate review collection — §9), with
  `autoTagged` marking model-origin tags.

## 6. Firestore & Storage integration (reuse + safety)

- **Reuse the existing schema and service conventions** (`CatImage` / `CatVideo`, `COLLECTIONS`,
  the `uploads/` & `images/` folders). Do not fork the shape.
- **⚠️ Merge-safety:** writes must **not** clobber app-only fields — a Firestore `set` without
  `{ merge: true }` overwrites the whole doc and wipes fields this tool doesn't know about
  (this bit the project before in the Sheets→Firestore path). Use merge/update semantics.
- **Dedup:** there is already a Storage-scan routine that creates `CAT_IMAGES` records keyed by
  `storagePath` with `autoTagged: false` (`media-albums.ts`). Ingestion here must **match against
  existing records** (by `storagePath` / `youtubeId`) rather than create duplicates, and can
  _enrich_ those existing records with suggested tags.
- **Thumbnails at ingest (egress win):** generate small/medium derivatives for each image and
  store their paths (e.g. `thumbnailUrl`), so downstream serving never fetches full-res originals
  — reduces both Vercel image-optimizer work and Firebase egress (see the image-serving note in
  §11).
- **Secrets:** this app needs its own **Firebase Admin** credentials and (if doing API upload)
  **YouTube OAuth** — the same secrets the main app uses, handled server-side, never in the
  browser. Provisioning secrets are separate.

## 7. Relationship to the existing admin CMS

The `/admin` CMS already uploads media and edits tags, and the schema already carries
`autoTagged`. "The rest" overlaps with it deliberately (the owner chose a standalone tool that
_includes_ uploading). To avoid divergence:

- **Reuse** the schema, collections, and — where practical — the existing upload mechanics
  (especially `/api/upload-youtube`) rather than re-implementing them.
- **Boundary:** this tool owns **bulk ingest → pre-tag → review → first write/upload**; the CMS
  remains the place for **ongoing, ad-hoc edits** of already-published media.
- **Open question (§9):** whether review/confirmation happens in _this_ app's UI or is handed to
  the CMS — affects how much review UI to build here.

## 8. The system loop back to provisioning

"The rest" is where labels are _created_, so it feeds the training side:

- Each **confirmed `(crop, cat-label)`** pair is the training data for provisioning's next
  **metric-head retrain**; each **confirmed `(image, tags)`** pair feeds Florence-2 tuning.
- The **gallery** self-updates immediately on confirmation (coverage), while the **head** is
  retrained periodically on the accumulated confirmations (separation power). This app should make
  the confirmed set exportable to provisioning in a clean, versioned form.

## 9. Open inputs (still needed to finalize)

1. **Ingestion mode:** point at a local **folder**, scan **Firebase Storage**, or both?
2. **Review location:** this app's own review UI, or feed suggestions into the existing CMS for
   confirmation? (Drives how much UI to build.)
3. **Staging shape:** suggested tags as a draft field on the live doc vs a separate review
   collection; how `autoTagged` / confirmed state is represented.
4. **Confidence thresholds** for auto-precheck vs manual, per task (identity vs general tags).
5. **Video:** API upload vs manual (see §3a); frame-sampling + per-video-vs-timestamped tagging;
   whether videos need identity too.
6. **Multiple cats per image:** _resolved_ — a detection model returns bounding boxes for one or
   more cats; identity and tagging run **per detected cat/crop**, and the reviewer confirms each
   cat separately. (Detector is pretrained by default, optionally fine-tunable in provisioning.)
7. **Secrets & deployment:** where the container runs day-to-day; how Firebase Admin / YouTube
   OAuth secrets are provisioned to it.
8. **Volume:** backlog size + ongoing rate (batch cadence).

## 10. Phased task outline (phased)

> **Built:** P0–P4 and the cross-cutting items all exist in `mohocat-ml/pretagger/`
> (7 milestones, tested; Firestore writes verified in dry-run only — no live writes yet).

> Not a committed checklist — sequence once §9 is answered.

- **P0 — Ingest + infer, read-only:** folder/Storage ingest → cropper → `/tag` → show
  suggestions in the UI. No writes, no uploads. Proves the model saves clicks.
- **P1 — Review + confirm:** review queue UI (accept/edit/reject, bulk); staging shape for
  suggestions; `autoTagged` semantics.
- **P2 — Write metadata (images):** on confirm, merge-safe write to `CAT_IMAGES`; dedup against
  existing records; generate + store thumbnails.
- **P3 — Uploads:** upload images to Storage; videos to YouTube (or record manual uploads) →
  `CAT_VIDEOS`; handle quota/audit reality.
- **P4 — Identity gallery loop:** maintain the k-NN gallery, append on confirm, apply
  location/temporal priors; export the confirmed set for provisioning's retrain.
- **Cross-cutting:** config, secrets handling, logging/error-handling, dedup, and consistency with
  the CMS.

## 11. Related

- Companion (training side): `media-pretagging-model-provisioning-plan.md`; build prompt:
  `prompt-model-provisioning-training-app.md`.
- Media schema + `autoTagged`: `src/types/media.ts` (`CatImage`, `CatVideo`).
- Collections & Storage folders + existing Storage-scan/dedup: `src/services/media-albums.ts`
  (`COLLECTIONS`, `SCAN_FOLDERS = ['uploads/','images/']`).
- Video → YouTube channel: `src/services/youtube.ts`, `/api/upload-youtube` (OAuth refresh token
  in env or `admin_config/youtube_auth`).
- Location prior source: cat `dwelling` / `prev_dwelling`.
- Image serving / egress context: `next.config.js` (`images.unoptimized: false`, 1-year TTL) —
  most images already ride the Vercel image optimizer as a CDN; raw `<img>` in `PostItem.tsx` /
  `LeafletMountainMap.tsx` fetch Firebase directly. Ingest-time thumbnails (§6) reduce both costs.
