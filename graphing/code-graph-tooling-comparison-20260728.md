# Code-graph tooling comparison — Graphify vs CodeGraph vs Understand Anything

> **Status:** complete · **Run date:** 2026-07-28 · **Commit:** `300d5ff`
> **Plan:** [`code-graph-tooling-evaluation-20260728.md`](./code-graph-tooling-evaluation-20260728.md)
>
> All three tools were run over an identical corpus of this repo and scored against
> ground truth from `CLAUDE.md` and `docs/codebase/`. This is the result.

## Recommendation

**Adopt CodeGraph as the default. Keep Graphify for the one thing it does that nothing
else does. Do not adopt Understand Anything for routine use.**

The three are not really the same category of tool, and the cost spread is enormous —
roughly **six orders of magnitude** between the cheapest and most expensive run:

|                         | CodeGraph                | Graphify                             | Understand Anything      |
| ----------------------- | ------------------------ | ------------------------------------ | ------------------------ |
| Tokens for a full build | **0**                    | ~0 metered¹                          | **~1,042,000**           |
| Wall clock              | **1.2 s**                | ~3 min                               | ~20 min                  |
| Re-run determinism      | deterministic            | deterministic (AST); LLM labels vary | **non-reproducible**     |
| Visualization           | none (export built here) | `graph.html` interactive             | dashboard (not launched) |
| Semantic summaries      | none                     | community labels only                | **per-node prose**       |

¹ Graphify's `cost.json` reports 0/0, which is misleading — see _Cost accounting_ below.

**Why CodeGraph wins for default use:** it answered the two hardest probes at least as well
as either LLM-driven tool, in 1.2 seconds, for free, reproducibly. At that price there is no
reason not to keep the index warm.

**Why keep Graphify:** community detection. It is the only tool that partitioned the
codebase into 67 named communities without being told the directory structure, and the only
one that ingests non-code corpora (docs, papers, images). If the question is "what are the
natural seams in this codebase," Graphify answers it and the others don't.

**Why not UA routinely:** it produced the best _prose_ — genuinely excellent node summaries —
but at ~1M tokens per full build, non-reproducibly, with a multi-agent pipeline that silently
lost the codebase's most important architectural seam until a recovery pass rebuilt it. Its
value is one-time onboarding narrative, not a queryable index.

## Method and parity controls

Identical corpus: **`src/` + `config/`, excluding `config/firebase/`**. `scripts/` excluded
per owner decision.

| Tool      | Files indexed | Scoping mechanism                                                         |
| --------- | ------------- | ------------------------------------------------------------------------- |
| Graphify  | 208           | `.graphifyignore` — `/*` + `!/src/` + `!/config/` (allowlist by negation) |
| CodeGraph | 205           | `codegraph.json` `exclude[]` (explicit denylist)                          |
| UA        | 208           | `.understandignore` (explicit denylist)                                   |

CodeGraph's 205 vs 208 is not a scoping failure: it indexes only source languages, so
`mountains.json` / `permissions.json` never entered. Graphify counted them as code and
extracted **zero nodes**; UA modeled them as `config` nodes.

**Parity issues found and corrected during the run:**

1. **UA initially scanned 218 files**, including root-level `README.md` and **`AGENTS.md`** —
   the full architecture guide. That would have let UA answer probe questions from prose
   rather than deriving them from code. Corrected and re-scanned to 208. Root cause: an
   explicit denylist is easy to under-specify; Graphify's allowlist-by-negation could not
   make this mistake. **This is itself a finding about the scoping models.**
2. **`@/*` alias resolution.** UA's scanner read `tsconfig.json` as a resolver hint (not as
   corpus), taking imports from 94 → 607 edges. Verified this was the parity-correct choice:
   CodeGraph independently resolved 898 `src/`→`src/` import edges and Graphify 1,250, so all
   three resolved aliases.

**Security control:** `config/firebase/mountaincats-61543-7329e795c352.json` is a live
Firebase service-account private key present on disk. It was excluded explicitly in all three
configs and each run was leak-checked against its resolved file list. **All three clean** —
the key was never read.

## Raw results

|                      | Graphify                     | CodeGraph                                  | UA                              |
| -------------------- | ---------------------------- | ------------------------------------------ | ------------------------------- |
| Nodes                | 1,085                        | 1,979                                      | 546                             |
| Edges                | 2,738                        | 4,037                                      | 1,536                           |
| Communities / layers | 67 communities               | —                                          | 10 layers                       |
| Extra artifacts      | `GRAPH_REPORT.md`, god-nodes | `impact`/`callers`/`affected`              | 14-step tour, per-node prose    |
| Integrity disclosure | 314 dangling, 38 collapsed   | 8,044 unresolved refs, 201 heuristic edges | 27 dropped edges (23 recovered) |

Node counts are not comparable as a quality measure — they count different things. CodeGraph
models every import as a node (878 of its 1,979); UA models only files, functions, classes,
and configs.

## Probe results

Five questions with ground truth from `CLAUDE.md` / `docs/codebase/`.

### Probe 1 — Unmapped-host tenant fallback

**Ground truth:** `middleware.ts` → `getMountainIdForHost` → falls back to
`getDefaultMountainId()` (`geyang`); separately `resolveMountainIdOrNull` returns null so a
bad `[mountain]` path segment 404s instead of falling back. The _distinction_ is the answer.

| Tool          | Verdict                                                                                                                                                                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UA**        | ✅ **Best.** Captured the distinction explicitly in node summaries: "fallback to the default tenant for localhost, previews, and the e2e harness" vs "returning null so callers can 404 rather than silently falling back." Full call chain present. |
| **CodeGraph** | ✅ Strong. `explore` located the file, returned verbatim source (whose docstring states the fallback), plus blast radius with caller counts and a "no covering tests found" flag. Correct answer, but the reader must extract it from source.        |
| **Graphify**  | ⚠️ Weak. BFS found the right entry points but fanned to 420 nodes, truncated to 32, and returned a node list mixing in `CatGrid`, `tag-videos`, `LeafletMountainMap`. No answer, just neighborhood.                                                  |

### Probe 2 — Service-factory indirection

**Ground truth:** `src/services/index.ts` getters front the Firebase implementations behind
`src/services/interfaces.ts`.

All three connected it, but UA needed rescuing — see _Failure modes_. Final state: UA 39
inbound `calls` (after recovery), CodeGraph ranks `src/services/index.ts` 4th by degree (70),
Graphify surfaces `IPostService` and `getCatService` as god-nodes.

### Probe 3 — Blast radius of `getMountainConfig()`

| Tool          | Result                                                                                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CodeGraph** | ✅ **Best — 50 affected symbols**, grouped by file with line numbers, including the 8 sibling accessors inside `config.ts` that wrap it.                         |
| **Graphify**  | ✅ Good — 22 affected nodes with relation type and source location.                                                                                              |
| **UA**        | ❌ **Weakest — 5 direct callers.** Its `calls` edges are conservative by design (analyzers only emit calls they can confirm), so the transitive picture is thin. |

This is the clearest separation in the whole evaluation, and it is the query you would
actually run before a refactor.

### Probe 4 — Architectural hubs

**Three independent methods, converging answer** — strong evidence these really are the hubs:

| Graphify (betweenness)      | CodeGraph (degree)        | UA (fan-in/out)           |
| --------------------------- | ------------------------- | ------------------------- |
| `useMountain()` 87          | `cn` 119                  | `services/index.ts` 45/44 |
| `cn()` 71                   | `useMountain` 87          | `cn.ts` 34                |
| `useAuth()` 61              | `Cat` 73                  | `ui/Button.tsx` 33        |
| `Cat` 41                    | `services/index.ts` 70    | `adminStrings.ts` 18      |
| `Button()` 35               | `useAuth` 60              | `ui/Modal.tsx` 17         |
| `requireApiPermission()` 32 | `requireApiPermission` 32 | —                         |

### Probe 5 — Config→code edge (`mountains.json` → `--color-primary` → `[mountain]` layout)

**Designed as the discriminator, and it discriminated.**

| Tool          | Result                                                                                                                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UA**        | ✅ **Only tool that saw it.** Emitted `configures` edges: `config:config/mountains/mountains.json → file:src/utils/config.ts` and `config:config/permissions.json → file:src/config/permission-config.ts`. Its tour anchors two steps on exactly these. |
| **Graphify**  | ❌ Blind. Classified both JSON files as code and extracted **zero nodes** (explicit warning).                                                                                                                                                           |
| **CodeGraph** | ❌ Blind. Never indexed them — JSON is not a supported language.                                                                                                                                                                                        |

**This matters for this repo specifically.** mohocat is config-driven multi-tenant: the file
deciding runtime behavior across every mountain is invisible to both deterministic tools.
Any refactor of `mountains.json` gets no help from CodeGraph or Graphify.

## Cost accounting

**UA: ~1,042,000 subagent tokens** across 16 dispatches (2 scans — one wasted on the parity
correction — 10 file-analyzers, assemble-reviewer, architecture-analyzer, tour-builder),
~20 min wall clock at 5-way concurrency.

**CodeGraph: 0 tokens, 1.2 s.** Verified against the installed bundle, not assumed: no LLM
API endpoints anywhere in `dist/`, no embeddings, no vector search; dependencies are
tree-sitter WASM + path matching. Its only network calls are a GitHub upgrade check and
anonymous telemetry (`codegraph telemetry off`).

**Graphify: reports 0/0, which undercounts.** Code took the free deterministic AST path, but
the 2 doc files and all 67 community labels were host-agent work its meter never saw.
Graphify's cost tracker only counts tokens it brokers itself. Real cost is small but not zero.

## Failure modes found

**UA — lost the central seam, then recovered it.** Batch 1's "significance filter" skipped the
11 per-tenant service getters in `src/services/index.ts` because they are one-line wrappers.
The merge then dropped **23 `calls` edges** pointing at them — every call into the service
factory. The `assemble-reviewer` pass caught and rebuilt it (+13 nodes, +25 edges), so the
shipped graph is correct. But the filter that discards exported one-liners is discarding
exactly the indirection seams other code calls. **Without the review phase, UA's graph would
have silently lacked the project's most important boundary.**

**UA — cross-batch ID inconsistency.** Batch 10 emitted config files as `config:` IDs while
other batches referenced them as `file:`, so 2 `imports` edges were dropped. Harmless here
(the `configures` edges carry the relationship), but it's a structural hazard of independent
agents writing into one ID space.

**Graphify — edge collapse on an undirected build.** 38 edges collapsed because
`imports_from` + `re_exports` between the same file pair merge into one undirected edge
(e.g. `services/index.ts` → `services/interfaces.ts`, 3 → 1). `--directed` would preserve them.
314 dangling edges are third-party imports outside the corpus — expected.

**Graphify — `query` is the weak surface.** The build is good; the retrieval fans out too
broadly and truncates before answering. Its `affected` command is much better than `query`.

**All three disclose integrity honestly.** None silently pretends completeness — Graphify
prints a health warning, CodeGraph records unresolved refs and marks 201 edges `heuristic`,
UA logs every dropped edge.

## Setup friction

| Tool          | Friction                                                                                                                                                                                                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CodeGraph** | None. Self-contained bundle with vendored Node.                                                                                                                                                                                                                                         |
| **Graphify**  | None. `uv tool` install, already present.                                                                                                                                                                                                                                               |
| **UA**        | **Highest.** Needed a `pnpm install` + `tsc` build of `packages/core` (pnpm absent — used `corepack` to avoid a global install), and its `merge-batch-graphs.py` uses PEP 604 syntax that **crashes on macOS system Python 3.9**; needed 3.12. Neither is documented as a prerequisite. |

UA also registers two hooks (`PostToolUse` on git commit, `SessionStart`) that instruct the
agent to rebuild the graph **without asking for confirmation**. Both are gated on
`"autoUpdate": true`; this run wrote `autoUpdate: false` deliberately. Hooks are global to the
Claude Code install, not scoped to this repo.

## What to do

1. **Keep CodeGraph indexed.** Effectively free. `codegraph impact <symbol>` before refactors
   is the single highest-value query found here. Consider `codegraph install` to register its
   MCP server — **deliberately skipped this run**, so CodeGraph was scored on its CLI only and
   is likely _undersold_ here.
2. **Re-run Graphify occasionally** for community structure and god-nodes — not as a query
   engine. Prefer `graphify affected` over `graphify query`. Use `--directed` next time.
3. **Treat UA's output as a one-time artifact**, not a pipeline. The 14-step tour and per-node
   prose have real onboarding value; regenerating them at ~1M tokens per commit does not.
   Leave `autoUpdate` off.
4. **No tool covers `mountains.json`.** For a config-driven multi-tenant repo that is the gap
   that matters. UA is the only one that sees it, and it's the one you least want to re-run.

## Caveats

- **CodeGraph was not evaluated on its MCP interface**, which is arguably its primary surface.
  This understates it.
- **UA is non-reproducible.** A second run would produce different summaries, possibly
  different layers, and might or might not lose the service getters again. Single-run results
  should not be treated as its stable behavior.
- Probes 2 and 4 were scored partly from build artifacts rather than live queries.
- One small parity leak: UA's `tour-builder` cited `CLAUDE.md`, which was outside the corpus.
  It affects tour narrative only, not the graph or any scored probe.

## Visualizations

All three were rendered and inspected. **Only Graphify ships a usable visual out of the box.**

| Tool          | Visual                                                                         | Ships it?                                | How to view                                                     |
| ------------- | ------------------------------------------------------------------------------ | ---------------------------------------- | --------------------------------------------------------------- |
| **Graphify**  | `graphify-out/graph.html`                                                      | ✅ **yes** — self-contained, no server   | open the file                                                   |
| **CodeGraph** | `codegraph-out/graph-dirs.svg` · `graph-files.svg` · `graph.svg` · `view.html` | ❌ **no** — all built by this evaluation | any browser                                                     |
| **UA**        | React/xyflow dashboard                                                         | ⚠️ yes, but **needs a running server**   | `node packages/viewer/bin/viewer.mjs <repo>` → `:5173/?token=…` |

**Graphify** — the best default. Force-directed, all 67 communities colour-coded with a
filterable legend, node search, click-to-inspect. Genuinely explorable, zero setup.

**CodeGraph** — nothing to view until you build it. The raw `dot` render of the 709-edge
file graph is unusable (an enormous 1:1 canvas). A **directory-level aggregation** added here
is by far the most legible artifact of the whole evaluation: 13 directories, 46 weighted
edges, showing the layering at a glance — `components → utils` (175), `components → services`
(132), `[mountain] → components` (108), `api → lib` (73). Worth keeping as a refresh command.

**UA** — the richest UI: layer cards carrying their own prose descriptions, the 14-step tour
in a sidebar, node-type filters, fuzzy/semantic search, path tracing, export. It also flagged
_"Knowledge graph has working-tree changes — 3 files not represented"_ on load, which is a
genuinely good staleness signal the other two lack. Cost: a live server and a token gate.

Rendering notes: `graphviz` is required for the CodeGraph SVGs (`brew install graphviz` — it's
a C binary, not a Python package). Chrome refuses `file://` URLs under automation, so a local
static server is needed to view the HTML/SVG artifacts in-browser.

## Artifacts

All gitignored; none are in version control.

| Path                      | Contents                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| `graphify-out/`           | `graph.json`, `graph.html`, `GRAPH_REPORT.md`, `cost.json`                                         |
| `.codegraph/codegraph.db` | SQLite index (6.6 MB)                                                                              |
| `codegraph-out/`          | `graph.json`, `graph.dot`, `graph.svg` (3.5 MB), `graph-files.dot`, `graph-files.svg`, `hubs.json` |
| `.ua/`                    | `knowledge-graph.json` (661 KB), `fingerprints.json`, `meta.json`, `.understandignore`             |

CodeGraph's visual artifacts were **built during this evaluation** (it ships no visualization);
the exporter reads its SQLite directly rather than walking the CLI.
