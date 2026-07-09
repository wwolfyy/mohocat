# Prompt — "The Rest" (ingestion / inference / tagging / upload app)

> **Status:** ✅ Executed (2026-07-07) — the resulting app lives at
> [`mohocat-ml/pretagger/`](../../../mohocat-ml/pretagger/); see its README for setup.
> Kept for the record; the plan doc carries the implementation-status notes.
>
> One of two build prompts for the media pre-tagging / uploading program:
>
> - **(Companion)** — the _model provisioning_ part: `prompt-model-provisioning-training-app.md`.
> - **This file** — _"the rest"_: ingest media, run the trained models for pre-tagging, human
>   review, then upload + write metadata. Design: `the-rest-ingestion-tagging-upload-plan.md`.
>
> Copy the block below verbatim into a SOTA model to generate the application. Product/UX and
> parameter specifics are intentionally left for the generating model to determine; project-
> specific names, paths, and credentials must be configuration, not hardcoded.

---

```
Build a containerized, browser-based application for INGESTING, PRE-TAGGING, REVIEWING, and
UPLOADING cat media (images and videos). This is "the rest" of a media pre-tagging system: it
loads already-trained models to SUGGEST tags, lets a human confirm them, and then uploads the
media and writes its metadata. Model TRAINING is a separate application and is out of scope —
this app only loads and runs already-exported models.

## Runtime environment
- Runs on a 2019 Intel Core i9 MacBook Pro, 32 GB RAM, CPU-ONLY (no GPU/CUDA; no PyTorch MPS).
  All inference is CPU-based. Pre-tagging is a batch/offline job where throughput matters more
  than per-item latency (a backlog may run overnight).
- Delivered as a Docker container with a browser-based UI.
- Use Python where inference is involved; you may choose the web stack. The app loads the
  CPU-optimized model artifacts (CAT DETECTOR, identity, and tagging models — e.g. ONNX /
  OpenVINO / quantized / GGUF) produced by the separate training app. The model-loading layer
  must be PLUGGABLE/config-driven so exported models can be swapped without code changes.

## External systems it integrates with (all configurable, never hardcoded)
This app writes into an EXISTING Firebase project used by a separate website and must conform to
that project's data model, supplied via configuration:
- Firebase STORAGE — destination for image files (under configurable folders).
- Firebase FIRESTORE — one collection for image metadata, one for video metadata. Documents
  include (functionally): storage path and public URL, one or more thumbnail/derivative URLs, an
  array of tags, a boolean marking tags as auto/model-generated, image dimensions, upload
  metadata; and for videos: the hosting type and the YouTube video id/URL.
- YOUTUBE — the channel that hosts video clips (OAuth).
Requirement: treat all project-specific collection names, bucket, folder paths, and credentials as
configuration; the code must not assume them.

## Core pipeline
1. INGEST media from a user-specified local folder (and, optionally, by scanning the existing
   Firebase Storage). De-duplicate against records that already exist (match on storage
   path / YouTube id) — ENRICH existing records rather than create duplicates.
2. DETECT & CROP: run a cat DETECTION model that returns BOUNDING BOXES for one or more cats in
   each image (and in sampled video frames), then crop each detected cat. Detection benefits both
   tagging and identification (it focuses on the animal and removes background) and enables images
   that contain MULTIPLE cats — identity and tagging then run PER detected cat/crop. The detector
   is a pluggable/config-driven model (pretrained by default; may be a dedicated detector or a
   grounding-capable model). Handle "no cat detected" gracefully (e.g. fall back to the whole
   image and/or flag for manual review).
3. INFER via the loaded models to produce:
   - GENERAL TAGS with confidence scores (per image; may be informed by the detected crops).
   - For EACH detected cat, INDIVIDUAL CAT-IDENTITY candidates, ranked with scores, as an OPEN set
     (may return "unknown"). Identity is done by nearest-neighbor matching against a GALLERY of
     confirmed known-cat examples that THIS app maintains; the gallery GROWS as the user confirms
     identities. Apply available priors to disambiguate look-alikes: a cat's known location (to
     narrow candidates for media from a given place) and, for video, temporal consistency across
     frames of the same clip.
4. REVIEW (human-in-the-loop) — NOTHING is uploaded or written until a human confirms. A browser
   review UI shows each item with its DETECTED cat(s), suggested tags, and PER-CAT ranked identity
   candidates, and lets the operator ACCEPT / EDIT / REJECT, both individually and in bulk;
   high-confidence suggestions may be pre-selected for fast bulk-accept. When an image has multiple
   detected cats, the operator can confirm each cat's identity separately. Model-origin tags are
   marked with the auto/model-generated flag. Confidence thresholds are configurable.
   - The review UI should visualize the detected bounding boxes / crops.
   - Images MUST be viewable in a RESPONSIVE LIGHTBOX in the review UI that works well on BOTH
     desktop and mobile (full-screen, crisp on high-DPI displays).
5. COMMIT on confirmation:
   - IMAGES → upload the file to Firebase Storage and write/merge metadata to the images
     collection.
   - VIDEOS → follow the selectable video mode below.
6. FEED-BACK: each confirmed (cropped image, cat label) becomes labeled data the separate training
   app can consume later; make the confirmed set exportable in a clean, versioned form.

## Image ingestion & derivatives (reduce byte size WITHOUT losing lightbox quality)
- At ingestion, REDUCE image byte size by generating optimized derivatives in modern formats,
  instead of serving full-resolution originals.
- Produce at least: a small THUMBNAIL for grids/lists, and a larger LIGHTBOX-QUALITY image. The
  lightbox image MUST remain visibly crisp when shown full-screen in a lightbox on BOTH large
  desktop screens AND high-DPI mobile screens — do NOT over-compress it. Store the derivative
  URLs/paths in the metadata (matching the existing schema's thumbnail/derivative fields).
  Retaining the original is configurable.

## Video mode — SELECTABLE, because of YouTube API upload restrictions
Uploading to YouTube via the API is constrained (a low daily quota, and API-uploaded videos may be
forced to PRIVATE until the project passes Google's audit). The app must therefore offer a
SELECTABLE MODE for videos:
- TAG ONLY — the operator uploads the clip to YouTube manually (outside this app); this app
  records/links the resulting video and writes its metadata + confirmed tags to Firestore. No API
  upload.
- TAG + UPLOAD — this app uploads the clip to the YouTube channel via the API (OAuth), then writes
  metadata + tags. It must surface quota/upload errors clearly and handle the
  private-until-audited reality gracefully.
The mode must be selectable (DEFAULT to the safer "tag only"), settable at least per batch and
ideally per video. Video inference: sample frames (and optionally audio) to produce general tags;
individual identity for video is optional/configurable.

## Data-write safety
- All Firestore writes must be MERGE-SAFE: never overwrite fields the app does not manage (use
  merge/update semantics), so existing app-only fields are preserved.
- Ingestion must not create duplicate records for media that already exists.

## Secrets
- Needs server-side Firebase Admin credentials and (for Tag + upload) YouTube OAuth credentials.
  Keep all secrets server-side / in configuration; never expose them to the browser.

## Architecture & non-functional requirements
- Modular, service-oriented, config-driven (all project names/paths/credentials/thresholds/model
  paths configurable). Pluggable model-loading so exported models swap without code changes.
- Robust logging and error handling: long-running batch jobs must surface failures clearly and
  never silently drop or mis-write data.
- Clean separation of concerns; maintainable, reproducible; efficient CPU batch processing.

## Deliverables
- Application source code, Dockerfile (+ compose if useful), and a README covering configuration
  (Firebase / YouTube / model artifact paths) and how to run on the described Mac.

## Out of scope (do NOT build)
- Model training / tuning / export (a separate application). This app only loads and runs exported
  CPU model artifacts.
```
