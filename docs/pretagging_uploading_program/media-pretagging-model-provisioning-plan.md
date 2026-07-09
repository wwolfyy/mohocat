# Media Pre-Tagging — Model Provisioning Plan

> **Status:** ✅ Implemented (2026-07-07) as `provisioning/` in the sibling repo
> [`mohocat-ml`](../../../mohocat-ml) (local: `~/github/mohocat-ml`). The design text below is
> kept as written; see **Implementation status** directly below for what was built and where
> the build deviates.

## Implementation status (2026-07-07)

Built as a FastAPI + React (Korean UI) app with the pluggable `ModelPlugin` architecture:
`dinov2-metric-head`, `florence2-lora`, and `cat-detector` (pretrained-export or fine-tune)
are functional; `moondream2` / `qwen2-vl-2b` are registered as greyed-out placeholders.
Training runs are isolated subprocesses with live SSE monitoring, stop/resume via
checkpoints, eval-vs-baseline metrics, and a versioned registry. Verified end-to-end on CPU
with tiny runs (all three plugins: train → eval → export → self-check).

Deviations from this plan:

- **The `/tag` endpoint (§6) was not built.** The seam became two _file contracts_ instead
  (`mohocat-ml/contracts/`): provisioning exports **model artifact bundles**
  (`model_artifact.md`) that the consuming app loads **in-process** via pluggable model
  interfaces, and consumes **dataset exports** (`dataset_export.md`) for training data. No
  inference HTTP service exists; swapping a model = pointing config at a new bundle dir.
- **Export format is ONNX Runtime** (+ int8 where it passes an export self-check that
  compares against fp32 — the int8 variant is dropped from the bundle otherwise). OpenVINO
  and GGUF were not used; the VLM fallbacks remain placeholders. Florence-2 exports as a
  merged transformers bundle.
- **Runs natively** on the Ubuntu 22 / 2080 Ti box via venv + pinned cu118 requirements;
  Docker (NVIDIA runtime) is provided but optional.

> Original status note: Draft / design (2026-07-07). Decisions below were the owner's lean at
> design time. Open inputs of §8 were resolved during the build (annotated there).
> **Scope:** This document covers **model provisioning only** — training/tuning, zero-shot
> setup, evaluation, and serving the inference endpoint. The consuming application ("the
> rest" — folder/Storage ingestion, calling the endpoint, writing suggestions to Firestore,
> the review UI, uploads) is a **separate part** and is out of scope here except for the API
> seam in §6.

---

## 1. Context & scope

We want to **pre-tag** images and videos with a model so the operator confirms/corrects tags in
the existing `/admin` CMS instead of tagging everything by hand. The CMS already has the upload
paths and tag editing, and the media schema already carries an `autoTagged` flag
(`src/types/media.ts`: `CatImage`, `CatVideo`).

The system is split into two parts:

- **Model provisioning (this doc):** owns training/tuning, evaluation, a model registry
  (versions), and **exporting a CPU-deployable inference artifact**. Gradient work runs on the
  **RTX 2080 Ti Linux box**.
- **The rest (separate):** reads folders / Firebase Storage, runs inference via the `/tag`
  endpoint, writes **suggested** tags to Firestore for human review, and (optionally) handles
  uploads. Runs on the **2019 Intel Core i9 MacBook Pro (32 GB RAM, CPU-only)**.

The seam between them is a stable **inference API** (§6), so the model can be swapped
(zero-shot ↔ tuned ↔ heavier fallback) without touching the consuming app.

### Runtime topology — train on the GPU box, infer on the Mac

This is a deliberate two-machine split:

- **Training / tuning → Linux box with RTX 2080 Ti (CUDA).** All gradient work — metric-head
  training, Florence-2 LoRA, any QLoRA fallback — happens here (see §4). The output is a
  versioned model artifact, not a live service.
- **Inference → 2019 Intel Core i9 MacBook Pro, 32 GB RAM, CPU-only.** No CUDA, and no PyTorch
  MPS (MPS is Apple-Silicon-only), so all tagging runs on the CPU. Pre-tagging is a
  **batch / offline** job, so throughput matters more than per-image latency — CPU is acceptable
  (run a backlog overnight).
  - Provisioning must therefore **export CPU-friendly artifacts**: prefer **OpenVINO** (best on
    Intel i9) or **ONNX Runtime**, with **int8 quantization**; for the VLM fallbacks, **GGUF via
    llama.cpp**.
  - **32 GB RAM is comfortable** — DINOv2 S/B + head, Florence-2 (~0.77B, int8 ≈ 1 GB), and even a
    4-bit 2B VLM (≈ 1.5–2 GB) all fit with headroom. **CPU throughput, not RAM, is the limiter.**
  - **Exception:** if a heavy fallback (moondream2 / Qwen2-VL-2B) is too slow on the Mac CPU,
    serve _that model_ from the 2080 Ti box over the same `/tag` contract instead of running it
    locally. The default stays local Mac inference for DINOv2 + Florence-2.

Consequence: the **`/tag` endpoint (§6) runs locally on the Mac** by default — loading an artifact
exported by provisioning — rather than as a remote call to the GPU box. The box trains; the Mac
infers.

## 2. Two distinct tagging problems

They need **different tools** — do not try to solve both with one model:

| Problem                                                | Nature                                                                     | Right tool                                              |
| ------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Individual cat identity** (which specific cat)       | Fine-grained **re-identification** over an _open_ set that grows over time | Embedding backbone + **metric head** + **gallery k-NN** |
| **General tags** (activity, setting, cat count, scene) | Closed/《open》 vocabulary **classification / captioning**                 | Zero-shot or tuned **VLM**                              |

No model — open or commercial — knows _our specific cats_ by name off the shelf. Identity always
requires our own labeled examples.

## 3. Model stack — decisions

**Preprocessing (benefits both problems):**

- **Crop to the cat** (and optionally the cat's face) before embedding/tagging. Background is
  often the single biggest confound for identity — removing it is the cheapest accuracy win.
- Candidate croppers: a light detector (e.g. YOLO family) or **Florence-2 grounding** (we're
  already pulling Florence-2 in for tags, so it can double as the detector).

**Primary models:**

- **Cat identity → DINOv2 (frozen) + trained metric head + gallery k-NN.**
  - DINOv2 ViT-S/B backbone, **frozen** (weights never change).
  - A **metric-learning head** (ArcFace / triplet / supervised-contrastive) trained on our
    labeled pairs to make the distance metric _identity-dominated and pose/background-invariant_.
    This is where generalization comes from — raw frozen features entangle identity with
    nuisance factors (pose/lighting/background), so naive k-NN alone is not enough (see §7).
  - **Gallery k-NN** performed in the learned space: known cats stored as labeled vectors;
    a new image matches by nearest neighbor. Open-set and cheap to extend.
- **General tags → Florence-2** (Microsoft, open, ~0.23B / 0.77B).
  - Start **zero-shot** (caption / region tags against our vocabulary); add **LoRA / fine-tune**
    only if zero-shot quality is insufficient.
  - Small enough for CPU batch inference on the consuming side if we ever want to; trains
    comfortably on the 2080 Ti.

**Fallbacks (more expensive; only if DINO-head and/or Florence-2 underperform):**

- **moondream2** (~1.8B) — QLoRA-tunable on the 2080 Ti.
- **Qwen2-VL-2B** — stronger, heavier; QLoRA on the 2080 Ti but tight (see §4).

Rationale for the lean: the frozen-DINOv2 + metric-head + gallery path gives open-set identity
that self-updates from CMS confirmations with minimal training cost; Florence-2 is the smallest
genuinely _tunable_ general tagger that fits the 2080 Ti with room to spare. The 2B VLMs are held
in reserve to control cost/complexity.

## 4. Hardware & training feasibility (RTX 2080 Ti, 11 GB, Turing)

Turing caveats: **no bf16, no FlashAttention-2** (use fp16 + SDPA/xformers); **bitsandbytes 4-bit
works** (QLoRA available).

| Component                                          | Fit on 11 GB 2080 Ti                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Metric head on frozen DINOv2 (ViT-S/B)             | Trivial — only the head trains; backbone is frozen.                                  |
| DINOv2 ViT-S/B **full** fine-tune (if ever needed) | Feasible (ViT-L/g gets tight).                                                       |
| **Florence-2 (0.23B / 0.77B)**                     | LoRA comfortably; base full-FT with small batch. **Sweet spot.**                     |
| **moondream2 (~1.8B)**                             | **QLoRA (4-bit)** + grad-checkpointing + small batch + 8-bit optimizer.              |
| **Qwen2-VL-2B**                                    | **QLoRA, tight** — batch 1–2 + grad-accum, modest image resolution; slower (no FA2). |

Rule of thumb: full fine-tune of a 2B model ≈ 32–40 GB (A100-class, not this box); LoRA-fp16 of 2B
≈ 10–16 GB (borderline); QLoRA-4bit of 2B ≈ 8–12 GB (fits). So the 2080 Ti is **QLoRA territory
for 2B, comfortable for ≤ 0.8B and for frozen-backbone heads.**

## 5. Training / setup approach per model

- **Cropper:** if using a pretrained detector, likely **zero-shot** (no training). If accuracy on
  cats-in-terrain is poor, fine-tune a small detector on a handful of labeled boxes.
- **DINOv2 identity head:**
  1. Embed all labeled (confirmed) cat crops with the frozen backbone → cache vectors.
  2. Train the metric head (ArcFace/triplet) on those embeddings.
  3. Build the **gallery** from confirmed vectors in the learned space.
  4. **Ongoing:** each CMS confirmation appends a vector (no retrain needed for coverage);
     **periodically retrain the head** as the label set / cat roster grows to keep the space sharp.
- **Florence-2 tags:** zero-shot first; if needed, LoRA fine-tune on CMS-confirmed
  `(image, tags)` pairs. Keep a held-out eval set to decide zero-shot vs tuned.
- **Fallback VLMs:** QLoRA on the same confirmed data if Florence-2 is the bottleneck.

**Evaluation:** hold out a labeled test set; track identity top-1/top-k accuracy (per cat, and on
look-alike pairs) and general-tag precision/recall. A model is promoted in the registry only if it
beats the incumbent on the eval set.

## 6. The inference API seam (contract to "the rest")

> **Superseded in implementation:** no `/tag` endpoint was built. The seam is the pair of
> file contracts in `mohocat-ml/contracts/` — `model_artifact.md` (bundle layout + `meta.json`
> that the consuming app's pluggable loaders read) and `dataset_export.md` (confirmed training
> data flowing back). The response _shape_ below (crop / ranked open-set candidates /
> scored tags / model version) survives as the in-process model interfaces.

Provisioning **exports the model artifact + inference code**; the `/tag` endpoint that wraps it
runs **locally on the Mac** by default (§Runtime topology), and the consuming app depends only on
this shape (exact schema TBD):

```
POST /tag
  body: { image | video_frames, media_type, options? }
  →   {
        crop: { box, score },
        cat_candidates: [ { name, score }, ... ],   // ranked, open-set (may be empty / "unknown")
        general_tags:  [ { tag, score }, ... ],
        model_version: "..."
      }
```

Notes:

- **Open-set:** identity returns _ranked candidates with scores_, including a low-confidence /
  "unknown" outcome — never a forced pick.
- Video: the endpoint (or the caller) samples frames; per-video aggregation strategy TBD (§8).
- The caller decides thresholds and whether to write a suggestion — provisioning just scores.
- Model swaps (zero-shot ↔ tuned ↔ fallback) change only `model_version` behind this contract.

## 7. Why the metric head matters (design note)

Frozen DINOv2 embeddings encode pose, background, lighting **and** identity together; nothing makes
the cosine distance prioritize identity. So **two different cats in the same posture/background can
sit closer than the same cat in two different postures** — the known weakness of naive k-NN on
general-purpose features. The **metric head** is trained precisely to reshape the space so
same-cat-any-pose is close and different-cat-same-pose is far; **cropping** removes much of the
background confound up front.

**Ceiling & priors:** genuinely near-identical cats (e.g. two similar tabbies at the same station)
may remain unresolvable from a still image. Mitigate with domain priors _(consumed on "the rest"
side, but they shape how endpoint output is used)_:

- **Location prior** — each cat's `dwelling` / `prev_dwelling` narrows the candidate set for a
  photo taken at a given feeding station (`P(cat | location)`).
- **Temporal prior (video)** — frames in one clip are likely the same cat.
  This is why the tool must **suggest, not auto-commit** — human confirmation in the CMS is
  load-bearing and also feeds the flywheel.

## 8. Open inputs (still needed to finalize)

> **Resolved in the build:** (1) taxonomy is a configurable vocabulary in the pretagger
> config (caption→tag mapping); (2)/(3) gallery starts empty and grows from confirmations —
> no backlog assumption baked in; (4) multiple cats: detector boxes → per-crop identity +
> tags; (5) videos: frame sampling + per-clip aggregation, identity included; (6) "the rest"
> runs on the Mac in Docker, secrets mounted via config volume; (7) both YouTube modes built,
> default is tag-only (manual upload).

Carried from the requirements discussion:

1. **Taxonomy:** closed tag list or free-form? How many distinct general tags, and how many
   individual cats?
2. **Labeled backlog:** how many already-tagged images/videos exist in the CMS (training + gallery
   seed), and roughly how many per cat?
3. **Volume:** backlog size to pre-tag + ongoing rate (batch vs near-real-time).
4. **Per image:** multiple cats common? Need boxes per cat, or image-level tags enough?
5. **Video:** per-video scene tags only, or timestamped moments? Do videos need identity too?
   Frame-sampling strategy + aggregation.
6. **Where "the rest" runs** and how Firebase Admin / YouTube OAuth secrets are handled.
7. **YouTube:** default quota ≈ 6 uploads/day; API-uploaded videos are locked to _private_ until
   the project passes Google's audit — decide API-upload vs manual before building upload.

## 9. Rough provisioning task outline (phased)

> **Built:** P0–P2 and the cross-cutting items (registry/versioning with export self-check,
> eval harness with baselines, training UI) all exist in `mohocat-ml/provisioning/`. P3
> fallbacks remain placeholders, as planned.

> Not a committed checklist — sequence once §8 is answered.

- **P0 — Baseline, zero-shot:** stand up cropper + frozen DINOv2 gallery (no head) + Florence-2
  zero-shot behind the `/tag` endpoint; measure on a held-out set. Establishes the floor.
- **P1 — Identity metric head:** train ArcFace/triplet head on confirmed crops; gallery in the
  learned space; add the head-retrain loop. Re-measure vs P0.
- **P2 — General-tag tuning (if needed):** LoRA fine-tune Florence-2 on confirmed pairs; promote
  only if it beats zero-shot on eval.
- **P3 — Fallbacks (only if blocked):** QLoRA moondream2 / Qwen2-VL-2B; compare cost/quality.
- **Cross-cutting:** model registry + versioning, eval harness, and a UI to trigger/monitor
  training runs on the 2080 Ti (the "control tuning from the UI" requirement).

## 10. Related

- Media schema + `autoTagged`: `src/types/media.ts` (`CatImage`, `CatVideo`).
- Collections & Storage folders: `src/services/media-albums.ts` (`COLLECTIONS`, `SCAN_FOLDERS =
['uploads/','images/']`).
- Video → YouTube channel: `src/services/youtube.ts`, `/api/upload-youtube`.
- Image serving / egress context: `next.config.js` (`images.unoptimized: false`, 1-year TTL) —
  most images already ride the Vercel image optimizer as a CDN; raw `<img>` in `PostItem.tsx` /
  `LeafletMountainMap.tsx` fetch Firebase directly.
