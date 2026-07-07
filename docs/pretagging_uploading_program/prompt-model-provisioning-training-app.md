# Prompt — Model Provisioning (training app)

> **Status:** ✅ Executed (2026-07-07) — the resulting app lives at
> [`mohocat-ml/provisioning/`](../../../mohocat-ml/provisioning/); see its README for setup.
> Kept for the record; the plan doc carries the implementation-status notes.
>
> One of two build prompts for the media pre-tagging / uploading program:
>
> - **This file** — the _model provisioning_ part (train / evaluate / version / export the
>   DINOv2 and Florence-2 models). Companion design: `media-pretagging-model-provisioning-plan.md`.
> - **Sibling** — `prompt-the-rest-ingestion-tagging-upload-app.md` (folder/Storage ingestion,
>   running the trained models for inference, writing suggested tags to Firestore, the review
>   UI, uploads).
>
> Copy the block below verbatim into a SOTA model to generate the application. Hyperparameter
> specifics are intentionally omitted — the generating model determines the appropriate
> parameters/choices per architecture and surfaces them in the UI.

---

```
Build a containerized, browser-based application for TRAINING and PROVISIONING
computer-vision models. This app is the "model provisioning" half of a larger media
pre-tagging system; inference runs elsewhere, so this app's job is to train, evaluate,
version, and export models — not to serve predictions in production.

## Background (why these models)
The downstream system pre-tags photos of cats. Three separate ML tasks are involved:
1. Cat DETECTION (locating WHERE the cat(s) are via bounding boxes) — used downstream to crop
   each cat before identification/tagging and to handle images containing multiple cats. A
   pretrained detector is the default; OPTIONAL fine-tuning on labeled cat bounding boxes is
   supported.
2. Cat re-identification (deciding WHICH individual cat is in an image) — approached as a
   trained metric/embedding head on top of a FROZEN DINOv2 backbone.
3. General image tagging / captioning (activity, setting, scene, etc.) — approached by
   fine-tuning (including LoRA) a Florence-2 model.
These tasks need different training procedures; the app must support each.

## Runtime environment & constraints
- Runs on a single Linux machine with ONE NVIDIA RTX 2080 Ti (11 GB, Turing architecture:
  no bf16, no FlashAttention-2; bitsandbytes 4-bit/QLoRA works). CUDA available.
- Delivered as a Docker container (NVIDIA container runtime) with persistent volumes for
  datasets, model artifacts, logs, and run metadata.
- Python ML stack (PyTorch, Hugging Face Transformers/PEFT, etc.). UI is browser-based.

## Functional requirements
1. Model selection in the UI:
   - DINOv2 (frozen backbone + trainable metric/embedding head), Florence-2 (fine-tune,
     including LoRA), and a CAT DETECTOR (bounding-box detection; pretrained by default, with
     OPTIONAL fine-tuning on labeled cat boxes) are SELECTABLE and fully functional.
   - moondream2 and Qwen2-VL-2B appear as GREYED-OUT, disabled placeholders (visible but
     not selectable, e.g. labeled "coming soon"). The architecture must let these be
     enabled later behind the same interface with minimal change.
2. Data ingestion through the UI: the user supplies/registers labeled training data via the
   app (upload or point to a dataset), can inspect/manage datasets, and controls the
   train/validation split. Support the label formats appropriate to each task.
3. Training configuration through the UI: EXPOSE ALL training parameters and configuration
   choices relevant to the selected model, each with a sensible default. The set of
   parameters and choices differs per model — determine the appropriate ones for each model
   yourself; do not hardcode them out of view. The user must be able to see and adjust them
   before launching a run.
4. Training execution & control: start, stop, and (where feasible) pause/resume runs on the
   GPU, from the UI.
5. Live monitoring: real-time training progress, loss/metrics, logs, and resource usage;
   plus the ability to browse and compare past runs.
6. Evaluation: evaluate a trained model on a held-out set and report task-appropriate
   metrics, so runs/models can be compared and a best one chosen.
7. Model registry / versioning: persist each trained artifact with a version, the exact
   configuration used, a reference to the training dataset, and its evaluation metrics —
   enough to reproduce and to compare versions.
8. Export for CPU inference: export trained models to a CPU-deployable inference format
   suitable for running on an Intel-CPU Mac (the downstream inference host has no GPU). The
   specific export format(s) are your choice; optimize for CPU inference.

## Architecture & non-functional requirements
- Modular, service-oriented, config-driven. Use a PLUGGABLE model registry so each model
  type implements a shared interface for data handling, training, evaluation, and export —
  this is what makes adding the currently-greyed-out models straightforward.
- Reproducible (seeded, pinned dependencies, saved run configs).
- Robust logging and error handling: long-running training must surface failures clearly
  and never fail silently or lose run state without a logged, visible error.
- Clean separation of concerns; maintainable, well-organized code.

## Deliverables
- The application source code, Dockerfile (+ compose if useful), and a README covering
  setup and running on the described GPU machine.

## Out of scope (do NOT build)
- The inference/serving application and the tagging/upload/preprocessing PIPELINE — i.e. where
  detection and cropping are APPLIED at inference time. This app only trains, evaluates, versions,
  and EXPORTS the models that pipeline loads (including, optionally, the cat detector). Ensure
  exported artifacts are consumable by a separate CPU inference process.
```
