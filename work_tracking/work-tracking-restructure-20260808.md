# Work tracking — restructure design — 20260808

> **Status:** ▶️ **ACTIVE — this is the next workstream (owner, 2026-08-08).** Designed, not yet
> started. Owner-initiated after a session where the cost of the current structure became
> concrete; to be implemented in a fresh session.
>
> ⚠️ **Application work is PAUSED until this lands** — feature and bug work restarts once the new
> structure is in place. Tenancy **T0** was asked for and then stood down behind this; its
> context is preserved in `HANDOFF.md` so it does not need re-deriving when it resumes.
>
> ✅ **The storage decision is SETTLED (2026-08-08) — see §4**, with the ten tests behind it and
> the rejected alternatives recorded so they are not reopened. Everything in this doc is now
> agreed.
>
> **This doc records a design, not executed work.** Nothing in the repo has changed for it. The
> five documents it describes are all still in their current form. The execution plan is
> **[`work-tracking-migration-plan-20260808.md`](./work-tracking-migration-plan-20260808.md)**.

---

## 1. The two problems, with measurements

The owner named both; the numbers were taken on `dev` at `df132d0` and they are worse than the
prose suggests.

| File                 | Lines      | Size      | Entries                 |
| -------------------- | ---------- | --------- | ----------------------- |
| `PROJECT_PLAN.md`    | 2,631      | **320K**  | 35 sections, 20 boxes   |
| `FEATURE_MOD_LOG.md` | 3,556      | 212K      | 89 entries              |
| `HANDOFF.md`         | 3,184      | 256K      | 9 open boxes            |
| `DEBUG_LOG.md`       | 2,403      | 144K      | 49 entries              |
| `BACKLOG.md`         | 195        | 12K       | 5 items                 |
| **Total**            | **11,969** | **~944K** | **138 history entries** |

🔑 **~944 KB is roughly 250k tokens.** No agent session can hold it. In the session that
prompted this, reading **one fifth** of `HANDOFF.md` cost 25k tokens, and the rest was never
read. **The documents have outgrown their reader**, which is the root of both problems below.

### P1 — the backlog is not centralized

Open items are split **5 in `BACKLOG.md` · 20 in `PROJECT_PLAN.md` · 9 in `HANDOFF.md`**.
`BACKLOG.md` — the file named for the purpose — holds **under a sixth** of the actual backlog.

📌 **This is the failure mode the repo has already documented.** `BACKLOG.md`'s own header
warns: _"Do not leave a copy in both places — a duplicated entry is how the plan audit of
2026-08-02 ended up with seven claims that had rotted."_ The warning is correct and the
structure defeats it.

### P2 — what we have done is recorded unevenly, and one category has no home at all

There **is** a record — 138 entries across the two logs. What is missing is narrower and
sharper than "no record":

1. **No keys.** 138 entries, no IDs. Nothing can reference an entry, so related work
   re-derives it.
2. **No index.** Finding the relevant entry means reading the file.
3. 🔑 **Decisions and rejected approaches have no file.** Bugs go to `DEBUG_LOG`, feature
   changes to `FEATURE_MOD_LOG`. But _"renaming the Firestore database was investigated and
   dropped"_, _"a fallback was written and rejected on review"_, _"M8 is withdrawn, not
   deferred"_ live **only in `HANDOFF.md` narrative**. ⚠️ **These are the highest-value entries
   in the repo** — they are what stops the next session re-walking a dead end — and they are in
   the least durable place.

---

## 2. What was agreed

### 2.1 One row per item, one store

**Tasks, backlog items, and history collapse into a single record store**, one row per item,
with a status column and a backlink to a plan section.

🔑 **Why this beats the alternative, and it is not the obvious reason.** The assistant first
proposed three files (`PROJECT_PLAN` + `TASKS.md` + `BACKLOG.md`) joined by four hand-maintained
ID namespaces. The owner rejected it, correctly: **hand-maintained cross-file IDs are exactly
the rot pattern the repo keeps getting burned by** (P1 above). A single row with a status column
**cannot desync from itself**. The three-file scheme solved the symptom (too many places) rather
than the cause (no single record per item).

### 2.2 A `type` discriminator, so decisions are not flattened into tasks

⚠️ **A task store alone does not close P2.3.** "Renaming the Firestore database was dropped" was
never a task — a task is work you intended; a decision is a conclusion you reached. Filing it as
an abandoned task misrepresents it.

Fixed by a `type` field: **`task` | `decision` | `bug` | `change` | `question`**, plus `outcome`
(`adopted` | `rejected` | `superseded`) and a rationale. With that, merging history into the
task store is genuinely better than a separate journal, because it removes the "record it
twice" problem entirely.

### 2.3 Status replaces the disappearing-task hole

An earlier draft had the task list hold "every **open** task", which meant a completed task
**vanished** — no progress indicator, and P2 restated. **A task completing flips a state; it
does not disappear.** `status`: `open` | `in-progress` | `done` | `abandoned`, which also gives
`PROJECT_PLAN` a generated `12/17 done` per workstream.

⚠️ **"Flips a state" is a logical description, not a physical one.** Per §4.1 the row is never
edited: completing a task **appends a new row** with the same `id` and the next `rev`. The
projection shows one row per item, so it reads as a flip; the log keeps both.

### 2.4 The plan stays markdown

`PROJECT_PLAN.md` keeps prose workstreams and status. It is the document a human reads to
understand _what we are doing_; the store answers _which items and where they stand_.

### 2.5 `HANDOFF.md` shrinks drastically

Once state lives in the store, the hand-off becomes **current state + what is in flight +
pointers by key** — realistically ~150 lines against today's 3,184. 📌 Both parties agreed this
is the single biggest practical win of the restructure.

---

## 3. Shape (settled — see §4 for the decision and the evidence)

🔑 **Everything work-tracking lives in a new root `work_tracking/` folder** (owner, 2026-08-08),
including its scripts — deliberately **not** under the root `scripts/`, which serves the
application.

```
work_tracking/
  SCHEMA.md          ← schema prose + the CREATE TABLE that enforces it
  schema.sql         ← the normative DDL (STRICT + CHECK constraints)
  registry.ndjson    ← the single store — append-only, source of truth
  registry.md        ← GENERATED + committed: current rows only, the human/PR view
  records/R-0142.md  ← long prose per record (rationale, detail)
  PROJECT_PLAN.md    ← workstreams + generated progress per section
  HANDOFF.md         ← current state + what is in flight (~150 lines, per §2.5)
  scripts/           ← checkout.js · checkin.js · build.js · lib.js
  work.json          ← transient checkout file, GITIGNORED
```

✅ `PROJECT_PLAN.md` and `HANDOFF.md` move here too (owner-confirmed, 2026-08-08).

📌 The current `docs/planning/`, `docs/handoff/`, and `log/` artifacts are being moved to
`docs/archive/` **by the owner, by hand** — the migration does not relocate them.

One row, illustratively — note `detail` is a **pointer**, not inline prose, and there is no
`stale` field because staleness is derived from `rev`:

```json
{
  "id": "R-0142",
  "rev": 3,
  "ts": "2026-08-08",
  "type": "task",
  "status": "done",
  "plan": "§10u",
  "title": "Admin type tier",
  "detail_ref": "records/R-0142.md",
  "outcome": "adopted",
  "supersedes": ["R-0031"],
  "split_from": null,
  "note": "closed out — fully covered by R-0200 and R-0201",
  "source_ref": "BACKLOG.md#B1@4484234",
  "files": ["docs/design/design.md"]
}
```

- **`note`** — optional, one line: _why this revision exists_. ⚠️ **Required for any revision
  whose other fields are unchanged**, because `checkin.js` drops unmodified items and would
  otherwise silently discard the row (see §3.1's partial-split case).
- **`source_ref`** — where this row came from during the bulk migration, **pinned to a commit**
  (`@4484234`) because the origin files are deleted in the cut-over and only resolve via
  `git show` afterwards.

### 3.1 The three ways records relate (owner, 2026-08-08)

| Relationship           | Expressed by            | Meaning                                                    |
| ---------------------- | ----------------------- | ---------------------------------------------------------- |
| Same item, later state | same `id`, higher `rev` | The earlier row is stale. Derived, never written.          |
| Replacement            | `supersedes: [ids]`     | Those items are **dead**; this one replaces them.          |
| **Break-out**          | `split_from: "R-0142"`  | The parent is **alive**; this is a piece broken out of it. |

🔑 **`split_from` exists because later work on an item is not always superseding it.** Splitting
a large item into pieces leaves the parent standing, which `supersedes` cannot express — it would
wrongly mark the parent dead.

Rules:

- **Scalar, not an array.** A break-out has one origin; `supersedes` is an array because a merge
  can replace several items.
- ⚠️ **Store only the child's pointer. Never a `children` list on the parent** — children are
  derived by query. Storing both directions is the same desync risk as a stored `stale` flag,
  and writing it would mean editing the parent's row, which §4.1 forbids.
- ⚠️ **A dangling `split_from` must be rejected at check-in.** SQLite foreign keys cannot enforce
  it (the primary key is `(id, rev)`; the reference is to `id` alone), so it is an explicit check
  in `checkin.js`.
- 🔑 **A split ALWAYS appends a new `rev` to the parent** (owner, 2026-08-08). Two cases, and
  the parent is written in both:
  - **The children cover the parent entirely** → parent's new rev is `status: done`,
    `outcome: superseded`, with a `note` naming why.
  - **The children are partial or derivative** → parent keeps its status; the new rev exists to
    record that a break-out happened, carried in `note`.

  ⚠️ **The partial case is why `note` is mandatory there** — with no other field changed, the
  row is identical to the previous rev and `checkin.js` would drop it as unmodified. Without a
  parent rev, the parent's timeline is silent at the exact moment it was decomposed.

  📌 **`rev` is per-`id`.** The parent goes to `rev + 1`; a child is a new `id` and starts at
  `rev: 1`. Nothing is inferred by the tooling — both rows are written explicitly at check-in.

This also lets `registry.md` render a hierarchy with roll-up progress
(`R-0142 [in-progress] … (1/2 children done)`), which is what §2.3 wants for `PROJECT_PLAN`.

🔑 **Keeping the prose out of the row is what makes the store legible.** Real log entries
average **2,619 bytes**; a row carrying that inline is a 2.6 KB single line, which git shows as
one deleted and one added blob — you can see _which_ record changed but never _what_ changed
inside it. Externalising `detail` cuts the row to ~250 bytes and lets the prose diff as prose.

📌 **`registry.md` is generated and committed**, replacing the earlier `TASKS.md` idea. It is
the file the owner and PR reviewers actually read; nobody reads `registry.ndjson` by choice.

---

## 4. ✅ DECIDED — storage medium and record model (owner + assistant, 2026-08-08)

**Decision: a single append-only NDJSON file is the source of truth. SQLite is used, but only
as an in-memory index built fresh on every script run. No `.db` file is ever written to disk or
committed.**

```
work_tracking/
  SCHEMA.md          schema prose + the CREATE TABLE that machine-enforces it
  schema.sql         the normative DDL
  registry.ndjson    single file, append-only, THE SOURCE OF TRUTH. No merge driver.
  registry.md        GENERATED + committed — the view humans and PR reviewers read
  records/R-0142.md  long prose per record (rationale, detail)
  scripts/           checkout · checkin · build (NOT under the app's root scripts/)
  work.json          transient checkout file — GITIGNORED, never committed
```

### 4.1 The record model — append-only, revisions, derived staleness

- **Nothing in the store is ever edited.** Updating an item appends a **new row with the same
  `id` and the next `rev`**. Readers keep the highest `rev` per `id`; older rows are stale.
- ⚠️ **`stale` is DERIVED, never stored.** Writing a `stale` flag means mutating an existing
  line, which is the one operation that breaks every merge strategy tested (§4.3). It is
  computed at build time and materialised into `registry.md`, so `WHERE stale = 0` still works
  — it is simply never written by hand.
- **Corrections are appended, not erased.** A wrong record is superseded by a later `rev`; the
  wrong version stays in the log. This is an audit trail, not an editable table.

### 4.2 The workflow (owner's design)

1. `checkout` — builds an in-memory SQLite db from `registry.ndjson`, queries it to find the
   related items, writes their **current revs** to `work.json`.
2. Edit `work.json`.
3. `checkin` — dry-run inserts into the schema'd db, **rolls back**, and only if that succeeded
   appends the changed rows (with `rev + 1`) to `registry.ndjson`. Unmodified items are dropped.
4. `build` — regenerates `registry.md`.

🔑 **Rebuilding the index on every run is what makes this safe.** It costs ~11 ms at today's
size and ~220 ms at 5,000 records, it makes staleness structurally impossible, and it
re-validates the entire store on every invocation — a bad row anywhere fails loudly and
immediately.

### 4.3 Why — the tests behind this

Ten scenarios were run before deciding; the results overturned several earlier positions.

| Finding                                                                         | Consequence                                       |
| ------------------------------------------------------------------------------- | ------------------------------------------------- |
| jq and SQL returned **identical results on all 8 faceted queries** + group-by   | Query power is not a differentiator. Parity.      |
| NDJSON ↔ SQLite round-trip is **byte-identical**, ~30 lines each way            | The medium choice is reversible; low stakes.      |
| grep pre-filter found **643 of 1,274** rows on non-canonical JSON               | ⚠️ Never grep the store. Always parse.            |
| Typo'd field: jq returns **0 rows silently**; SQLite **errors**                 | Validation must come from a schema, not from jq.  |
| Merging two branches' `.db` → **valid file, one branch's work gone, no error**  | 🔴 Decisive against SQLite-as-source.             |
| `merge=union` + in-place edits → **duplicate ids both claiming current**        | Decisive against a stored `stale` flag.           |
| `merge=union` + pure appends → **0 conflicts, correct fold**                    | Append-only is what makes text safe.              |
| Per-branch fragment files → 0 conflicts, but **same-item collisions go silent** | 🔴 Rejected — see §4.4.                           |
| Single file, **no** merge driver → collision **surfaces as a git conflict**     | ✅ The conflict is the safety mechanism. Keep it. |
| Dry-run insert caught **all 7** malformed-record cases                          | ✅ Schema-as-validator works.                     |

⚠️ **No `merge=union` driver, deliberately.** An earlier draft recommended one. It is wrong:
the union driver silently accepts two rows claiming the same `rev`. A plain git conflict is the
desired behaviour, and recovery needs no manual line editing — take the incoming file wholesale,
then re-run `checkin`, because `work.json` still holds the intent and the script recomputes
`rev` from the new state. This was verified end-to-end (revs 1,2,3,4; no duplicates).

### 4.4 Rejected alternatives — do not reopen

- **SQLite as the committed source of truth.** Merging two branches produces a valid database
  that has silently dropped one side's rows. The checkout workflow does **not** rescue this —
  the conflict is at the git layer, below where the workflow operates.
- **The database outside git** (central location updated by CI, or a hosted DB). Two fatal
  problems: an in-flight branch has nowhere to write, so it must journal its appends as text in
  the repo anyway — meaning the text is the real source; and it **breaks atomicity between a
  record and the code it explains**, so `git log -S`, blame, and "what did the store say at
  commit X" all stop working.
- **A stored `stale` / `current` flag.** Requires editing existing lines. Breaks under every
  merge strategy tested, even when two branches touch _different_ records.
- **Per-branch fragment files.** They make conflicts impossible — which is the problem. Removing
  the conflict removes the alarm that two people edited the same item, converting a loud failure
  into a silent one.
- **A separate committed `registry.db`.** Dropped by the owner: it can only drift from the
  ndjson and buys nothing over building in memory.

📌 The design credits: the generated-artifact idea, the append-only premise, the
checkout/check-in workflow, the schema-as-validator, and dropping the on-disk `.db` are all the
owner's. The assistant's fragment proposal was withdrawn as strictly worse.

---

### 4.5 The schema is expected to change (owner, 2026-08-09)

🔑 **This schema was designed from what we knew, and cases we have not thought of will turn up.
When modifying the schema is the best fix, modify it.** It is not frozen.

⚠️ **But the two directions are not symmetric,** because the build re-validates the **entire
store** on every run — so a tightened rule retroactively invalidates rows written under the old
one. Measured against `node:sqlite`:

| Change                            | Rows already in the store |
| --------------------------------- | ------------------------- |
| Add a nullable column             | ✅ still load             |
| Add a column with a `DEFAULT`     | ✅ still load             |
| **Add an enum value**             | ✅ still load             |
| Add a `CHECK` on a **new** column | ✅ still load             |
| Add `NOT NULL` with no default    | 🔴 **breaks history**     |
| Remove an enum value              | 🔴 **breaks history**     |
| Tighten an existing `CHECK`       | 🔴 **breaks history**     |

⚠️ **Correction (2026-08-09) — the table is a heuristic, not the rule.** A change breaks history
**iff some row already in the store violates it**, and there is a systematic exception: 🔑 **a
`CHECK` conditioned on a new enum value cannot invalidate history**, because no historical row
can hold a value that did not exist when it was written. Measured against all 326 rows when
`status: deferred` was added with its mandatory-`note` constraint. Rules of that shape belong in
`schema.sql`, not in `checkin.js` — as written, the table would have pushed the enforcement into
the one place a hand-edited `registry.ndjson` bypasses.

**The policy that follows:**

- **Additive changes are free.** Edit `schema.sql`, rebuild, note it in that file's CHANGELOG.
  No ceremony, no migration, no decision record needed.
- **Restrictive changes are a migration, not an edit.** Either put the new rule in `checkin.js`
  so it binds **new writes only** and history is left alone, or run a real backfill — and record
  either as a `type: decision` row. ⚠️ Quietly tightening a `CHECK` turns every historical row
  into a validation failure the next time anyone builds, and the failure appears far from the
  change that caused it.
- 📌 If a restrictive change ever becomes unavoidable across a large history, the escape hatch is
  a `schema_version` column with version-conditional validation. Not needed now; do not add it
  pre-emptively.

📌 **The second such change is `status: deferred` (owner, 2026-08-09).** `open` and `abandoned`
were both being used for parked work — `BACKLOG.md`'s items are "deferred on purpose, no date",
and `PROJECT_PLAN.md`'s legend has a dedicated `[-]` "deferred/out of scope" — so "what is
open?", the question the store exists to answer, returned items nobody could start. `deferred`
**requires a non-empty `note`**: the test against `abandoned` is whether you can name the
condition that would restart it, and a parked item whose condition is invisible cannot be told
apart from a forgotten one.

📌 **The first such change was already needed and is in.** `BACKLOG.md`'s own heading reads
_"Open questions (owner decisions — **not tasks until answered**)"_, but the migration inventory
had `Q1` importing as `type: task`. Filing a question as a task is the same category error §2.2
identifies for decisions. `question` was added to the `type` enum — additive, so free.

---

## 5. Migration inventory — what moves, and what needs judgment

⚠️ **Counts and markup re-verified on `dev` at `4484234` (2026-08-08). The earlier draft of this
section was wrong in two ways** — correct figures below.

**Mechanical** (a script can do it — the entries are `##`-delimited and dated):

- `DEBUG_LOG.md` — **49** entries, `## YYYY-MM-DD — title` → `type: bug`.
- `FEATURE_MOD_LOG.md` — **89** entries, same markup → `type: change`.
- `BACKLOG.md` — **5** items: `B1`, `B2`, `B4`, `B5` (`## B<n> — title`) plus `Q1` under
  _Open questions_ → `type: task`, `status: open`. (`B3` is struck through + ✅ DONE — import as
  `status: done`, not as open.)
- `PROJECT_PLAN.md` — **18** unchecked `- [ ]` boxes (not 20; two were ticked after the original
  count) against **153** checked → `type: task`, `status: open`, with their `§` as `plan`.

- 🔑 **`docs/planning/completed/` + `docs/planning/pending/` — 24 documents, ~5,400 lines**
  (16 completed, 8 pending). **Missing from the first draft of this inventory entirely.**
  **Index them, do not flatten them:** one row per document with `detail_ref` pointing at the
  file, no rewrite. **17 of the 24 already carry a `Status:` line** that maps onto `status`;
  read the other 7. `multi-mountain-refactor-plan-20260719.md` alone is 787 lines — that is a
  document, not a row. See the migration plan §2b.
  - ⚠️ The decisions _inside_ them still need lifting by hand (below) —
    `multi-tenant-architecture-decision-20260718.md` and `tenancy-url-model-decision-20260728.md`
    are named for exactly the P2.3 content this restructure targets.
  - 📌 **Ignore the `pending/` vs `completed/` split** — the owner is archiving these folders by
    hand, so the division does not need preserving in the store.

**Not mechanical, contrary to the first draft:**

- 🔴 **`HANDOFF.md` has no standard checkboxes at all.** The claim of "9 unchecked boxes" is
  markup-wrong: open items are written as **`- **`[ ]` …`** — a backtick-wrapped box inside
bold — so `grep '^- \[ \]'`returns **zero**. There are ~8 such items plus one`[x]`in
_Open threads / owner-owed_ (lines 1962–2368), and further carry-overs written as plain prose
bullets with no marker at all. ⚠️ **A script keyed on`- [ ]` will silently import nothing
  from this file\*\* — which is exactly the failure mode this restructure exists to prevent.

**Needs judgment** (do not automate):

- ⚠️ **Extracting decisions from `HANDOFF.md` prose.** These are the P2.3 entries, they have no
  markup to key on, and they are the reason the restructure is worth doing. Expect to read the
  hand-off end to end once and lift them by hand. Known examples: the Firestore-rename
  investigation, the rejected `?type=` fallback, M8's withdrawal, the decision that a mountain
  may not differ in colour, the `useDialog`-vs-red-button finding from colour Phase 5, and F3's
  abandoned first fix.
- **De-duplicating.** Several items exist in two files with different wording; the store must
  end with one row, and picking the authoritative wording is a read.
- **Deciding what is already dead.** Some open boxes describe work completed but never ticked —
  the 2026-08-02 plan audit found seven. ⚠️ **Verify against the code before importing a box as
  `open`**, or the restructure launders stale claims into a clean-looking store.

---

## 6. Adjacent findings worth fixing in the same pass

- 🔴 **`PROJECT_PLAN.md` is 320K — larger than `HANDOFF.md`** — not from having more content but
  from single table cells running to thousands of words. The multi-tenant row (line 56) is one
  cell containing the entire M1–M8 history. It is unreadable for a human and unparseable for an
  agent, and it needs breaking up regardless of what else is decided.
- **`HANDOFF.md` needs a size policy.** `docs/handoff/archive/` already holds **33** files, so
  the mechanism exists — it simply stopped being applied to the living doc, which regrew to
  3,184 lines. "Current state at top, roll sessions older than N to archive" holds it at a few
  hundred.

---

## 7. Watch-outs

- ⚠️ **Do not leave a copy in both places during the migration.** A half-migrated backlog is
  strictly worse than either end state, and is precisely how the 2026-08-02 audit produced seven
  rotted claims. Move an item and delete its origin **in the same change**.
- ⚠️ **The store must not become write-only.** Whatever the medium, a session has to be able to
  find the relevant rows cheaply, or it will keep re-deriving. Whatever is built, test it by
  asking a cold session a question the store should answer.
- 📌 **`CLAUDE.md` documents the current structure** (the `docs/` and `log/` orientation
  bullets) and must be rewritten in the same change, or agents will keep being pointed at files
  that no longer hold the answer.
- 📌 The two untracked `code-graph-tooling-*` files in `docs/planning/pending/` belong to a
  **different workstream** — do not sweep them in.
- ⚠️ **`work.json` must be gitignored before the first checkout is ever run.** Found the hard
  way while testing: when it was committed, a branch merge filled it with conflict markers and
  destroyed the very file the recovery procedure depends on (§4.3).
- ⚠️ **Do not configure a `merge=union` driver for `registry.ndjson`.** It silently accepts two
  rows claiming the same `rev`. The plain git conflict is wanted — see §4.3.
- 📌 **Never `grep` the store.** Measured: a grep pre-filter found 643 of 1,274 matching rows
  when serialization was not canonical. Parse it, always.
