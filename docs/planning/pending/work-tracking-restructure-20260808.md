# Work tracking — restructure design — 20260808

> **Status:** ▶️ **ACTIVE — this is the next workstream (owner, 2026-08-08).** Designed, not yet
> started. Owner-initiated after a session where the cost of the current structure became
> concrete; to be implemented in a fresh session.
>
> ⚠️ **Application work is PAUSED until this lands** — feature and bug work restarts once the new
> structure is in place. Tenancy **T0** was asked for and then stood down behind this; its
> context is preserved in `HANDOFF.md` so it does not need re-deriving when it resumes.
>
> ⚠️ **One decision is still open and it is the first thing to settle** — §4. Everything else
> below is agreed.
>
> **This doc records a design discussion, not executed work.** Nothing in the repo has changed
> for it. The five documents it describes are all still in their current form.

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

Fixed by a `type` field: **`task` | `decision` | `bug` | `change`**, plus `outcome`
(`adopted` | `rejected` | `superseded`) and a rationale. With that, merging history into the
task store is genuinely better than a separate journal, because it removes the "record it
twice" problem entirely.

### 2.3 Status replaces the disappearing-task hole

An earlier draft had the task list hold "every **open** task", which meant a completed task
**vanished** — no progress indicator, and P2 restated. **A task completing flips a state; it
does not disappear.** `status`: `open` | `in-progress` | `done` | `abandoned`, which also gives
`PROJECT_PLAN` a generated `12/17 done` per workstream.

### 2.4 The plan stays markdown

`PROJECT_PLAN.md` keeps prose workstreams and status. It is the document a human reads to
understand _what we are doing_; the store answers _which items and where they stand_.

### 2.5 `HANDOFF.md` shrinks drastically

Once state lives in the store, the hand-off becomes **current state + what is in flight +
pointers by key** — realistically ~150 lines against today's 3,184. 📌 Both parties agreed this
is the single biggest practical win of the restructure.

---

## 3. Proposed shape

```
docs/planning/
  SCHEMA.md         ← the precise schema definition (owner asked for this explicitly)
  registry.*        ← the single store — tasks, backlog, decisions, bugs, changes
  PROJECT_PLAN.md   ← workstreams + generated progress per section
  TASKS.md          ← GENERATED open-items view, committed so humans and PRs read prose
```

One record, illustratively:

```json
{
  "id": "R-0142",
  "type": "task",
  "status": "done",
  "plan": "§10u",
  "title": "Admin type tier",
  "detail": "…",
  "created": "2026-08-08",
  "closed": "2026-08-08",
  "outcome": "adopted",
  "supersedes": ["R-0031"],
  "files": ["docs/design/design.md"]
}
```

📌 **`TASKS.md` is generated and committed.** That keeps a prose, diffable view for the owner
and for PR review while the agent queries the store.

---

## 4. 🔴 THE OPEN DECISION — storage medium

**This is unresolved and must be settled before implementation starts.** The owner proposed
**SQLite**; the assistant argued for **structured text (NDJSON)**. The owner's framing — _"I'm
proposing SQLite for the structure, not for data volume"_ — is a fair correction of the
assistant's first answer, which rebutted a volume argument that was never made.

The remaining disagreement is narrow: **does the structure require a binary format?**

| Requirement               | SQLite            | NDJSON + schema doc                        |
| ------------------------- | ----------------- | ------------------------------------------ |
| One record per item       | ✅                | ✅                                         |
| Enforced schema           | ✅                | ✅ (JSON Schema)                           |
| Query by any field        | ✅                | ✅ (`grep` / `jq`)                         |
| **Partial loading**       | ✅                | ✅ — grep matching lines, parse only those |
| Diffable in git           | ❌                | ✅                                         |
| Reviewable in a PR        | ❌                | ✅                                         |
| Mergeable across branches | ❌ irreconcilable | ✅ append-only lines merge                 |
| Readable in the editor    | ❌                | ✅                                         |
| Agent appends safely      | needs tooling     | ✅ one line                                |

**The assistant's position.** At 34 open items and 138 history entries, SQLite's real advantages
— indexes, concurrent writes, query planning — are all inactive, while its one real cost stays
active: **the record of reasoning stops being reviewable.** ⚠️ **The merge point is the sharpest
practical objection**: sessions on branches will append rows, NDJSON merges cleanly, a `.db`
conflicts with no manual resolution. A second concern is failure shape — a slightly-wrong query
returns _fewer rows_, not an error, and "queried and found nothing" is indistinguishable from
"there is nothing", which is the same silent-failure class as the offline `getDocs` returning
`200 []`, `assertFails` passing on a typo'd collection, and the rule requiring an undefined
permission.

**The owner's position.** Structure and queryability are the goal; a precise schema in markdown
makes SQLite tractable; one row carrying task + detail + state + backlink beats files joined by
identifiers.

**The bridge either way:** if the store is text, a script can build `registry.db` from it on
demand — derived, gitignored, regenerated rather than repaired. If the store is the `.db`, an
NDJSON dump should be committed alongside so history stays reviewable.

📌 **Whoever implements this should pick one and record the choice here**, with the reason, so
it is not re-litigated.

---

## 5. Migration inventory — what moves, and what needs judgment

**Mechanical** (a script can do it; the entries are already `##`-delimited and dated):

- `DEBUG_LOG.md` — 49 entries → `type: bug`.
- `FEATURE_MOD_LOG.md` — 89 entries → `type: change`.
- `BACKLOG.md` — 5 items (`B1`, `B2`, `B4`, plus open questions) → `type: task`, `status: open`.
- `PROJECT_PLAN.md` — 20 unchecked boxes → `type: task`, `status: open`, with their `§` as `plan`.
- `HANDOFF.md` — 9 unchecked boxes → same.

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
