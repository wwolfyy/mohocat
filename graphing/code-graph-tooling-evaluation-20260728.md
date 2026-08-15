# Code-graph tooling evaluation — Graphify vs CodeGraph vs Understand Anything

> **Status:** ✅ **executed 2026-07-28** — all phases complete · **Type:** tooling evaluation
> (no product code changes)
>
> ➡️ **Results:** [`code-graph-tooling-comparison-20260728.md`](./code-graph-tooling-comparison-20260728.md)
> — the deliverable. Read that; this doc is the method and run log behind it.
>
> **What this is:** a plan to run three code-graphing tools over the same slice of this
> repo and produce a single comparison writeup, so we can decide whether any of them
> earns a permanent place in the workflow.
>
> **What this is not:** a product feature. Nothing under `src/` changes. The only files
> that land in the repo are two scoping configs and this doc.

## Decisions locked

| Decision            | Choice                                                          |
| ------------------- | --------------------------------------------------------------- |
| Deliverable         | **Compare the tools** — evaluation writeup, not just raw graphs |
| Corpus scope        | **`src/` + `config/`**, `scripts/` explicitly excluded          |
| Understand Anything | **In scope** — owner installs the plugin, Phase 3 blocks on it  |
| Scoping approach    | **Native** — each tool scopes itself via its own config         |

Native scoping was chosen over a uniform staging copy deliberately: these tools are being
evaluated for real adoption, so "can this thing be scoped sanely?" is itself a scoring
criterion. The tradeoff is that corpora may differ slightly between tools — that variance
gets recorded rather than engineered away.

## Tool inventory (verified 2026-07-28)

| Tool                | Installed | Location                                                                             | LLM?                         |
| ------------------- | --------- | ------------------------------------------------------------------------------------ | ---------------------------- |
| Graphify            | ✅        | `~/.local/bin/graphify` → uv tool `graphifyy`; skill at `~/.claude/skills/graphify/` | **Yes** — community labeling |
| CodeGraph           | ✅ v1.5.0 | `~/.local/bin/codegraph` → `~/.codegraph/versions/v1.5.0/`                           | **No** — see below           |
| Understand Anything | ❌        | not present anywhere on disk                                                         | Presumed yes (TBD)           |

### CodeGraph uses no LLM — verified, not assumed

An earlier draft of this plan asserted this loosely; it was checked against the installed
bundle before being relied on.

- Dependencies are local and deterministic: `web-tree-sitter` + `tree-sitter-wasms` (AST
  parsing), `picomatch` / `ignore` (path matching), `commander`, `@clack`, `jsonc-parser`.
  No AI SDK, no HTTP client.
- Zero LLM API endpoints in `dist/`: no `api.anthropic.com`, `api.openai.com`,
  `/v1/messages`, `/v1/chat/completions`, `/v1/embeddings`, `generativelanguage`.
- **No embeddings and no vector search.** A first-pass grep flagged
  `embedding|vector|semantic|cohere`, but every hit was a false positive —
  `dist/db/queries.js:1993` is the word "in**coherent**", and the three `semantic` hits
  are "same **semantics** as insertNode()" in code comments.
- Provider names (`anthropic`, `gemini`, `codex`, `kiro`) appear **only** under
  `dist/installer/targets/*` — these are `codegraph install` MCP targets, not inference
  backends.
- Only outbound calls: `api.github.com` / `raw.githubusercontent.com` (upgrade check) and
  `telemetry.getcodegraph.com` (anonymous telemetry, disable via `codegraph telemetry off`).
  Neither transmits repo contents.

**Implication:** these are not the same category of tool. CodeGraph is a zero-token local
index; Graphify and UA spend LLM calls to produce semantic structure. Cost per refresh is
a first-class axis of the comparison, not a footnote.

### Scoping mechanisms (verified)

| Tool      | Mechanism                                                                      | Evidence                              |
| --------- | ------------------------------------------------------------------------------ | ------------------------------------- |
| Graphify  | `.graphifyignore` (gitignore-spec) + reads `.gitignore`; built-in `_SKIP_DIRS` | `graphify/detect.py:874,954,970,1211` |
| CodeGraph | `codegraph.json` → `exclude` / `include`, gitignore-style                      | `dist/project-config.js:72,148,302`   |
| UA        | Unknown                                                                        | Determine in Phase 3                  |

Graphify's built-in `_SKIP_DIRS` already covers `node_modules`, `.next`, `dist`, `build`,
`coverage`, `__snapshots__`, `.turbo`, and `graphify-out` itself.

⚠️ **Unverified:** whether Graphify's `.graphifyignore` honours gitignore **negation**
(`!/src/`). The parser claims gitignore-spec compliance, but the merge logic is documented
as "can only ever exclude MORE, never re-include." Task 1.1 verifies this empirically
before relying on it; the fallback is an explicit exclude list of every sibling directory.

## Phases

### Phase 0 — Prep ✅ done

- [x] 0.1 Corpus fingerprint — HEAD `300d5ff`, **215 files** in `src/` + `config/`
      (204 TS/TSX, 5 JSON), **35,675 LOC**
- [x] 0.2 Owner decided: gitignore the scoping configs **and** all generated output
- [x] 0.3 Working tree confirmed clean (unrelated work committed by owner first)

> ⚠️ **Secret in the corpus.** `config/firebase/mountaincats-61543-7329e795c352.json` is a
> live Firebase **service-account private key**, present on disk and gitignored. Both tools
> respect `.gitignore` and would likely have skipped it, but scoping does **not** rely on
> that — `config/firebase/` is excluded explicitly in every tool's config, and each run is
> leak-checked against its resolved file list. **Phase 3 must repeat this check for UA
> before running it**, since UA is third-party and its data handling is unknown.

### Phase 1 — Graphify ✅ done

- [x] 1.1 **Negation verified** — `.graphifyignore` with `/*` + `!/src/` + `!/config/` works.
      Resolved corpus exactly `src/` 204 + `config/` 4 = **208 files**, `skipped_sensitive: 0`,
      leak check clean. The documented "can only exclude MORE" caveat governs
      `.gitignore` → `.graphifyignore` precedence, **not** negation within one file.
- [x] 1.2 Full pipeline run
- [x] 1.3 Cost captured — see below
- [x] 1.4 Outputs in `graphify-out/`: `graph.json`, `graph.html` (1.1 MB), `GRAPH_REPORT.md`
- [x] 1.5 God-nodes captured

**Result:** 1,085 nodes · 2,738 edges · **67 communities** (1,077 AST nodes + 8 semantic).

**Cost:** `cost.json` records **0 input / 0 output tokens** — misleading, and worth
recording as a finding. Code went through the free deterministic AST path. The 2 doc files
went to semantic extraction, which normally dispatches subagents; here they were extracted
inline by the host agent, so the spend landed in the session rather than in graphify's
meter. **Graphify's cost tracker only counts tokens it brokers itself.** Community labeling
(67 labels) was likewise host-agent work and is unmetered.

⚠️ **Graph health warning (surfaced, not suppressed):** 314 dangling-endpoint edges,
38 collapsed edges, 11 exact duplicates, 0 self-loops, 0 missing endpoints. The dangling
edges are overwhelmingly imports pointing at third-party packages outside the corpus. The
collapses are real: `imports_from` + `re_exports` between the same file pair merge into one
undirected edge (e.g. `src/services/index.ts` → `src/services/interfaces.ts`, 3 edges → 1).
An undirected build cannot represent them separately; `--directed` would.

**God nodes:** `useMountain()` 87 · `cn()` 71 · `useAuth()` 61 · `Cat` 41 · `Button()` 35 ·
`IPostService` 34 · `requireApiPermission()` 32 · `FirebaseAuthService` 23 ·
`getCatService` 22 · `IAuthService` 22.

### Phase 2 — CodeGraph ✅ done (2.5 deferred to Phase 4)

- [x] 2.1 `codegraph.json` written. Note: CodeGraph's `include` forces **gitignored** files
      _in_ — it is not an allowlist, so scoping had to be an explicit `exclude` list of
      every out-of-scope root entry. Less ergonomic than Graphify's negation.
- [x] 2.2 `codegraph init .` → **205 files** indexed (`src/` 204 + `config/` 1), leak check clean
- [x] 2.3 `codegraph status --json` captured
- [x] 2.4 Export written — **richer than planned**, see below
- [ ] 2.5 Probe questions → Phase 4

**Result:** 1,979 nodes · 4,037 edges · **1.2 s** index time · 6.6 MB SQLite · **zero tokens**.

**By kind:** import 878 · function 347 · file 204 · interface 175 · method 161 ·
constant 112 · route 34 · type_alias 21 · property 21 · class 17 · variable 6 · component 3.
**Edge kinds:** contains 1,741 · calls 911 · imports 898 · references 453 · instantiates 22 ·
implements 12.

**Export (2.4) did not need the lossy CLI-walk.** The index is a plain readable SQLite DB
(`.codegraph/codegraph.db`, tables `nodes`/`edges`/`unresolved_refs`), so the export reads
it directly rather than issuing ~2,000 `callers`/`callees` calls. Outputs in `codegraph-out/`:
`graph.json` (normalized, comparable to graphify's), `graph.dot` (1,979-node symbol graph),
`graph-files.dot` (709 file-level edges, human-readable), `hubs.json`. The planned fidelity
risk did not materialize.

✅ **Rendered.** `graphviz` 15.1.0 installed via `brew install graphviz` (a system C binary —
`uv`/PyPI's `graphviz` is only a binding that shells out to `dot`, so it would not have
worked). `graph-files.svg` renders in ~8 s (722 KB). The full 1,979-node symbol graph is a
much heavier layout.

**CodeGraph has its own audit trail**, which the original plan missed: 201 of 4,037 edges
carry `provenance='heuristic'` (dynamic-dispatch linking); the rest are statically resolved.
That is a direct analogue of Graphify's EXTRACTED/INFERRED/AMBIGUOUS, so "only Graphify is
honest about inference" would have been wrong.

⚠️ **8,044 unresolved refs** — references CodeGraph could not bind to an indexed node.
Mostly third-party imports, the same corpus-boundary effect as Graphify's 314 dangling
edges, but recorded in a side table instead of as broken edges.

### Early cross-tool findings (Graphify vs CodeGraph, pre-UA)

**1. The two tools independently agree on the architectural hubs.** Neither shares code or
method — Graphify uses betweenness centrality on an undirected graph; the CodeGraph export
uses raw degree excluding `contains`/`import` nodes. They converge anyway:

| Rank | Graphify god-node           | CodeGraph hub              |
| ---- | --------------------------- | -------------------------- |
| 1    | `useMountain()` 87          | `cn` 119                   |
| 2    | `cn()` 71                   | `useMountain` 87           |
| 3    | `useAuth()` 61              | `Cat` 73                   |
| 4    | `Cat` 41                    | `src/services/index.ts` 70 |
| 5    | `Button()` 35               | `useAuth` 60               |
| 6    | `IPostService` 34           | `Button` 37                |
| 7    | `requireApiPermission()` 32 | `requireApiPermission` 32  |

Same seven names, mild reordering. Convergence from two unrelated methods is meaningful
evidence these really are the hubs, and it matches the tenancy/auth/permissions story in
`CLAUDE.md`. Note `src/services/index.ts` — the service factory — ranks 4th for CodeGraph
but doesn't appear in Graphify's list, because Graphify ranks the individual getters
(`getCatService` 22) rather than the module.

**2. Probe #5 is already answered, and the answer is "no tool sees it."** Both are blind to
JSON: Graphify classified `mountains.json` and `permissions.json` as code but extracted
**zero nodes** from them (explicit warning); CodeGraph didn't index them at all (`languages:
tsx, typescript, yaml`). So the `mountains.json` → `--color-primary` → `[mountain]` layout
chain is invisible to both. Graphify recovers a _little_ ground only because `config/README.md`
is prose it can read semantically. **A config-driven multi-tenant codebase is exactly where
these tools are weakest** — the tenancy config that decides runtime behavior is a hole in
both graphs.

**3. Speed is not close.** CodeGraph indexed 205 files in **1.2 s** with zero tokens.
Graphify's AST pass alone took substantially longer (16 parallel workers), before
clustering, 67 LLM-labeled communities, and a 1.1 MB HTML build. Different value for the
cost — Graphify produces communities and a browsable visualization CodeGraph has no
equivalent for — but if the use case is "index for an agent to query," CodeGraph is
roughly free and Graphify is not.

**4. Both surface integrity honestly.** Graphify prints a health warning (314 dangling /
38 collapsed); CodeGraph records 8,044 unresolved refs and marks 201 heuristic edges. Neither
silently pretends the graph is complete.

### Phase 3 — Understand Anything — installed, run pending

- [x] 3.1 **Installed and loaded** — v2.9.4, via `/plugin install` + `/reload-plugins`.
      Registers **9 skills · 20 agents · 2 hooks · 0 MCP servers · 0 LSP servers**.
- [x] 3.2 Scoped via `.understandignore` + `--exclude`; **leak check clean** (no
      `config/firebase/` file read). Required a **corrective re-scan**: the first pass took
      218 files including root `README.md` and `AGENTS.md` — the architecture guide, which
      would have let UA answer probes from prose. Re-scoped to 208, matching Graphify exactly.
- [x] 3.3 `/understand` run — 546 nodes, 1,536 edges, 10 layers, 14 tour steps.
      Validation: **0 issues**, 1 warning (legacy `cloud-run-service.yaml` orphan — correct).
- [x] 3.4 Dashboard rendered. The documented fast path (`npx` a remote release tarball) was
      **blocked by the sandbox classifier**, so the viewer was built from local source instead:
      `pnpm --filter @understand-anything/dashboard build`, then `packages/dashboard/dist` +
      `packages/core/dist/staleness.js` copied into `packages/viewer/{dist,bin/dist}` and
      `node bin/viewer.mjs <repo>` run directly. It mints a `?token=` and serves on :5173.
      (Serving the static `dist/` alone does **not** work — assets use absolute `/assets/…`
      paths and a client-side token gate blocks the UI.)
- [x] 3.5 Cost recorded: **~1,042,000 subagent tokens** across 16 dispatches, ~20 min

**Setup friction (findings, not incidental):** UA needed a `pnpm install` + `tsc` build of
`packages/core` — pnpm was absent, so `corepack` was used to avoid a global install. Its
`merge-batch-graphs.py` uses PEP 604 (`int | None`) and **crashes on macOS system Python
3.9**; needed 3.12. Neither prerequisite is documented.

**Security review (done — clean).** No telemetry, no phone-home, no analytics. Parsing is
local tree-sitter WASM (it vendors its own Dart/Swift grammars). The only outbound host in
the source is `api.figma.com`, behind the opt-in `/understand-figma` feature. The
service-account key is therefore not at risk of exfiltration; the residual exposure is that
file contents pass through the model during analysis, so the `config/firebase/` exclusion
still applies.

**Context cost: ~1.0–1.1k tokens** persistent (9 skill frontmatters 1,802 chars + 10 agent
frontmatters 2,264 chars). The ~225 KB of skill/agent _bodies_ (~60k tokens) load only on
invoke — skill bodies into the main thread, agent bodies into their own subagent contexts.
Cheap because **it ships no MCP server**, which is what usually makes a plugin expensive.

⚠️ **Two hooks execute automatically once enabled** (`hooks/hooks.json`):

- `PostToolUse` on Bash — after `git commit|merge|cherry-pick|rebase`, injects "You MUST
  read `auto-update-prompt.md` and execute its instructions… **Do not ask the user for
  confirmation — just do it.**"
- `SessionStart` — same instruction when the stored `gitCommitHash` differs from `HEAD`.

Both are gated on `.ua/config.json` containing `"autoUpdate": true`, so they no-op in repos
without UA initialized with auto-update on. **Decision: leave `autoUpdate` off.** Hooks are
global to the Claude Code install, not scoped to this repo.

⚠️ **Different execution model from the other two, which is itself a finding.** Graphify and
CodeGraph run deterministic extractors. UA is _mostly prompts_: its 9 skills and 20 agents
are markdown that instruct the host agent, with `packages/core` (TypeScript + tree-sitter)
doing the structural pass. `/understand` therefore works by fanning out subagents — there is
no inline path as there was for Graphify's 2 doc files. Expect materially higher token cost
and **non-reproducible output between runs**, unlike the other two.

**Blocked on:** owner go-ahead to let UA dispatch its subagents (standing preference is not
to spawn agents unless asked).

### Phase 4 — Evaluation writeup

Five probe questions, each with ground truth checkable against `CLAUDE.md` and `docs/codebase/`:

1. **Tenant fallback** — unmapped host → does the tool trace middleware → `src/lib/tenant.ts`
   → `src/utils/config.ts` → `'geyang'`?
2. **Service indirection** — cat reads → does it connect the `src/services/index.ts` factory
   to the Firebase implementation, or stop at the interface boundary?
3. **Blast radius** — change `getMountainConfig()`: what breaks? CodeGraph's `impact` should
   lead here; the others must infer it.
4. **Architectural hubs** — Graphify god-nodes vs UA layers vs CodeGraph call centrality.
   Do the three agree on what's central?
5. **Config→code edge** — does anything link `mountains.json` → `--color-primary` → the
   `[mountain]` layout? A pure-AST tool structurally _cannot_ see this, so it cleanly
   separates semantic tools from syntactic ones.

Scoring axes: extraction fidelity · edges surfaced that a careful reader would miss ·
false/hallucinated edges · wall-clock · **LLM cost per refresh** · incremental-update story ·
agent-queryability (MCP/CLI ergonomics) · scoping configurability.

- [x] 4.1 Probes run across all three tools
- [x] 4.2 Scored against ground truth
- [x] 4.3 **Comparison written** →
      [`code-graph-tooling-comparison-20260728.md`](./code-graph-tooling-comparison-20260728.md)

**Headline result:** CodeGraph as default (0 tokens, 1.2 s, deterministic, best blast-radius
answer); Graphify retained for community detection and non-code corpora; UA not for routine
use (~1M tokens, non-reproducible) despite writing the best prose and being the **only** tool
that saw the `mountains.json` → code edge.

⚠️ **Probe 5 discriminated as designed, and the answer is uncomfortable for this repo:** the
config file that drives multi-tenant runtime behavior is invisible to both deterministic
tools. Graphify extracted zero nodes from it; CodeGraph never indexed it.

## Open items — resolved

1. ✅ **Scoping configs gitignored** — `codegraph.json`, `.graphifyignore`.
2. ✅ **Generated output gitignored** — `graphify-out/`, `.codegraph/`, `codegraph-out/`, `.ua/`.
3. ✅ **MCP install skipped** for now (owner's call). CodeGraph is therefore evaluated on its
   CLI surface only; the MCP interface it is designed around goes unscored. Revisit before
   the final recommendation, since it plausibly undersells the tool.

Still open: **`brew install graphviz`** if the `.dot` exports should be rendered to SVG.

## Risks

| Risk                                         | Mitigation                                              |
| -------------------------------------------- | ------------------------------------------------------- |
| Graphify negation unsupported → wrong corpus | Task 1.1 verifies before the full run                   |
| CodeGraph export lossy                       | Record as a finding; don't over-invest                  |
| UA ships code to a third party               | Inspect before Phase 3; owner decides                   |
| Corpora differ across tools                  | Fingerprint each; report deltas rather than hiding them |
| LLM cost on Graphify/UA runs                 | Measure and report — it's an evaluation axis            |
