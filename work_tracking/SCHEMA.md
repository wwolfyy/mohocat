# Work registry — schema

> **`schema.sql` is normative; this file explains it.** Where the two disagree, the DDL wins and
> this document is the bug. Read it alongside
> [`work-tracking-restructure-20260808.md`](./work-tracking-restructure-20260808.md) §3–§4, which
> records _why_ the model is shaped this way and which alternatives were rejected.

---

## 1. What the store is

Every unit of work in this repo — a task, a bug fixed, a change made, a decision reached, a
question waiting on the owner — is **one record** in a single store. There is no second file to
keep in sync, because a single row with a status column cannot desync from itself.

Two files hold the store, and one directory holds its prose:

| File                | Role                                                                      |
| ------------------- | ------------------------------------------------------------------------- |
| `registry.ndjson`   | **The source of truth.** One JSON object per line, append-only.           |
| `registry.md`       | **Generated and committed.** The current state, for humans and PR review. |
| `registry.db`       | **Generated and gitignored.** A SQLite view, for browsing and ad-hoc SQL. |
| `records/R-0142.md` | The long prose for one record — rationale, detail, investigation notes.   |

⚠️ **`registry.db` is a view, never an input** (owner, 2026-08-09, amending restructure §4 —
recorded as `R-0404`). It is rebuilt from `registry.ndjson` by `build.js` and by `db.js`, and
deleting it at any time is safe. **Nothing in the tooling may read it back**: the moment a script
does, the store has two sources of truth and the append-only design stops meaning anything.

`schema.sql` is loaded into an **in-memory** SQLite database on every script run. No `.db` file
is ever written to disk or committed. The database is rebuilt from `registry.ndjson` each time,
which is what makes staleness structurally impossible and re-validates the whole store on every
invocation.

### The two jobs the schema does

1. **Index.** `checkout` queries it to find the records related to the work at hand.
2. **Validator.** `checkin` inserts the edited records into a fresh database, rolls the
   transaction back, and appends to `registry.ndjson` only if every constraint passed.

---

## 2. Nothing is ever edited

**Updating a record appends a new line with the same `id` and the next `rev`.** Readers keep the
highest `rev` per `id`; every earlier row is history. A correction does not erase the mistake, it
supersedes it.

This is not a stylistic preference. Every merge strategy that was tested broke as soon as an
existing line was edited, and pure appends were the only shape that merged cleanly. So:

- ⚠️ **`stale` is never stored.** It is derived from `rev` by the `records_with_stale` view.
  Storing it would mean rewriting old lines every time a record changed.
- ⚠️ **A parent never stores a list of its children.** Children point at the parent; the list is
  derived by query. Storing both directions is the same desync risk in a different coat.

The primary key `(id, rev)` is therefore also the **collision detector**. If two sessions both
check out `R-0142` at `rev 2` and both write `rev 3`, the insert fails instead of producing two
rows that each claim to be current.

---

## 3. The workflow

```
checkout  →  edit work.json  →  checkin  →  build
```

1. **`checkout`** builds the in-memory database from `registry.ndjson`, runs your query, and
   writes the matching **current** revisions to `work.json`.
2. **You edit `work.json`** — change statuses, add records, write relationships.
3. **`checkin`** dry-run inserts the result, rolls back, and only then appends the **changed**
   records to `registry.ndjson` at `rev + 1`. Unmodified records are dropped.
4. **`build`** regenerates `registry.md` from the store.

```bash
node work_tracking/scripts/checkout.js --id R-0142
node work_tracking/scripts/checkout.js --query "status = 'open' AND plan = '§10'"
node work_tracking/scripts/checkout.js --new          # adding records only
node work_tracking/scripts/checkin.js
node work_tracking/scripts/build.js
node work_tracking/scripts/build.js --check           # the CI gate
node work_tracking/scripts/db.js                      # refresh registry.db only
node work_tracking/tests/run.js
```

### Looking things up

`registry.md` answers "what is open?" at a glance. For anything else, query the store:

```bash
node work_tracking/scripts/checkout.js --query "type = 'decision' AND outcome = 'rejected'"
```

Or open **`registry.db`** in a SQLite browser and query the **`current_records`** view, which has
already folded the log down to one row per record:

```sql
SELECT id, title, note FROM current_records WHERE status = 'open';
SELECT id, title FROM current_records WHERE type = 'decision' AND outcome = 'rejected';
```

`build.js` writes that file as part of a normal build; **`db.js` regenerates only it**, which is
what you want after a `git pull` — it leaves `registry.md` alone, so refreshing your view does not
leave a generated file dirty in `git status`. Because it rebuilds from scratch, a successful run
is also proof the whole store still loads clean.

📌 **Never `grep` the store** (§3, above). Both paths here parse it.

**Check out everything you intend to reference.** Check-in rejects a `split_from` or
`supersedes` aimed at a record that is not in `work.json` — §7 explains why that is deliberate.

**`rev` is computed by `checkin`, not read from `work.json`.** Whatever number sits in the file
is ignored; the next revision is derived from the store as it stands at check-in.

### `work.json` and its stamp

⚠️ **`work.json` is gitignored and must stay that way.** It was committed once during testing; a
branch merge filled it with conflict markers and destroyed the file the recovery procedure below
depends on.

`checkin` does not delete the file — it adds a `checked_in` date to it. That stamp is what lets
`checkout` tell a finished checkout (safe to replace) from an unfinished one (replacing it would
lose edits that were never recorded anywhere), which keeps `--force` a rare, deliberate act
rather than a habit.

### Recovering from a merge conflict

Two branches that both revise the same record both append the same `rev`, and git reports a
conflict in `registry.ndjson`. **That conflict is the safety mechanism** — it is the reason there
is no `merge=union` driver, which would accept both lines silently instead.

To recover, **do not hand-edit the conflicted lines**:

1. Take the incoming `registry.ndjson` wholesale.
2. Re-run `checkin`. `work.json` still holds your intent, and `rev` is recomputed against the
   file you just accepted, so your revision lands cleanly above theirs.
3. Re-run `build`.

📌 **Never `grep` the store.** A grep pre-filter was measured finding 643 of 1,274 matching rows,
because JSON serialization is not canonical. Parse it, always.

---

## 4. The fields

### Identity

| Field | Type         | Required | Meaning                                                        |
| ----- | ------------ | -------- | -------------------------------------------------------------- |
| `id`  | `R-NNNN`     | yes      | Stable key for the item. Never reused, never renumbered.       |
| `rev` | integer      | yes      | Revision of this item, starting at `1` and counting up per id. |
| `ts`  | `YYYY-MM-DD` | yes      | The date **this revision** was written.                        |

`rev` is per-`id`, not global. A new item starts at `rev: 1` regardless of what else is in the
store, and a parent going to `rev: 4` says nothing about its children.

### Classification

| Field     | Values                                                     | Required |
| --------- | ---------------------------------------------------------- | -------- |
| `type`    | `task` · `decision` · `bug` · `change` · `question`        | yes      |
| `status`  | `open` · `in-progress` · `deferred` · `done` · `abandoned` | yes      |
| `outcome` | `adopted` · `rejected` · `superseded`                      | no       |

**`type` is the field that closes the gap this whole restructure exists for.** A decision is not
a task: a task is work you intended, a decision is a conclusion you reached. "Renaming the
Firestore database was investigated and dropped" filed as an abandoned task misreports it — it
was never attempted work, it was an answer. The same applies to `question`: `BACKLOG.md`'s own
heading says open questions are "not tasks until answered", so they get their own type.

- **`task`** — work intended or done.
- **`bug`** — something was broken; this record is the fix. (The old `DEBUG_LOG.md`.)
- **`change`** — an intentional product change, chosen rather than forced. (The old
  `FEATURE_MOD_LOG.md`.)
- **`decision`** — a conclusion reached, including approaches considered and rejected. Carries an
  `outcome` and a rationale in `records/`.
- **`question`** — an owner decision that has not been answered yet. It becomes something else
  once it is.

**The statuses, and the line between them:**

| status        | means                                                  | `note`       |
| ------------- | ------------------------------------------------------ | ------------ |
| `open`        | nothing is stopping this; it can be started now        | —            |
| `in-progress` | someone is on it                                       | —            |
| `deferred`    | we still want it, but something must change first      | **required** |
| `done`        | finished                                               | —            |
| `abandoned`   | we decided not to do it — a conclusion, not a schedule | —            |

🔑 **The test between `deferred` and `abandoned` is whether you can name the condition that
would restart it.** If you can, it is deferred and the condition goes in the `note`. If you
cannot, it was decided against — that is `abandoned`, usually with `outcome: rejected`.

⚠️ **`deferred` requires a non-empty `note`, enforced by the schema.** A parked item whose
condition is invisible cannot be told apart from a forgotten one, which is the failure
`BACKLOG.md` named: _"a finding that lives only inside the story of the day it was found is one
nobody schedules."_ The rule binds **every** deferred revision, not only the one that parked
it, because `registry.md` renders current rows — a reason living only on the transition
revision would show there as a blank.

📌 **This does overload `note` slightly.** Its definition is "why this revision exists", which
coincides with the reason for parking on the revision that defers and then diverges. That is
deliberate: a separate `deferred_reason` column would be null on almost every row, duplicate
`note` on the rest, and go stale the moment an item un-parks.

**`status` means the item flips a state rather than disappearing.** An earlier draft had the task
list hold only open tasks, which meant finishing a task made it vanish — no progress indicator,
and the record problem restated. Note that "flips" is logical, not physical: per §2 the flip is a
new row at the next `rev`.

**`outcome` applies mainly to `decision`.** Use `superseded` on a parent whose children now cover
it entirely (see §5).

### Content

| Field        | Meaning                                                                      |
| ------------ | ---------------------------------------------------------------------------- |
| `title`      | One line, non-empty. What this record is.                                    |
| `plan`       | Backlink to a `PROJECT_PLAN.md` section, e.g. `§10u`. Optional.              |
| `detail_ref` | Path to the prose, e.g. `records/R-0142.md`. Optional.                       |
| `note`       | One line: **why this revision exists.** Optional, except per the rule below. |

🔑 **Prose lives outside the row, and that is what keeps the store legible.** Real log entries
average 2,619 bytes. A row carrying that inline is a 2.6 KB single line, and git shows a changed
line as one deletion plus one addition — you can see _which_ record changed but never _what_
changed inside it. Pointing at `records/R-0142.md` cuts the row to roughly 250 bytes and lets the
prose diff as prose.

⚠️ **`note` is mandatory on a revision whose other fields are unchanged.** `checkin` drops
unmodified records, so without a `note` such a revision is silently discarded. The case this
protects is in §5.

### Relationships

| Field        | Shape           | Meaning                                                    |
| ------------ | --------------- | ---------------------------------------------------------- |
| `supersedes` | array of ids    | Those records are **dead**; this one replaces them.        |
| `split_from` | one id, or null | The parent is **alive**; this is a piece broken out of it. |

See §5 — this is the part that is easiest to get wrong.

### Provenance

| Field        | Meaning                                                    |
| ------------ | ---------------------------------------------------------- |
| `files`      | Array of repo paths this record touched. Optional.         |
| `source_ref` | Where a migrated record came from, **pinned to a commit**. |

`source_ref` looks like `BACKLOG.md#B1@4484234`. The commit pin is not decoration: the origin
files are deleted at cut-over, so an unpinned reference stops resolving, while a pinned one stays
readable through `git show`. It is the audit trail that proves a 315-row bulk import lost
nothing.

---

## 5. The three ways records relate

| Relationship           | Expressed by            | The other record is… |
| ---------------------- | ----------------------- | -------------------- |
| Same item, later state | same `id`, higher `rev` | history              |
| Replacement            | `supersedes: [ids]`     | **dead**             |
| Break-out              | `split_from: "R-0142"`  | **alive**            |

🔑 **`split_from` exists because doing more work on an item does not always replace it.**
Breaking a large item into pieces leaves the parent standing. `supersedes` cannot say that — it
would mark the parent dead — so a second, scalar field carries it. A break-out has exactly one
origin; a replacement can absorb several records, which is why one is scalar and the other is an
array.

**A split always writes a new revision of the parent too.** Two cases, and the parent is written
in both:

- **The children cover the parent entirely** → the parent's new revision is `status: done`,
  `outcome: superseded`, with a `note` naming why.
- **The children are partial or derivative** → the parent keeps its status, and the new revision
  exists purely to record that a break-out happened, carried in `note`.

⚠️ **The partial case is exactly why `note` is mandatory on an otherwise-unchanged revision.**
With no other field different, the row is identical to the previous one, `checkin` drops it as
unmodified, and the parent's timeline goes silent at the precise moment it was decomposed.

---

## 6. The views

| View                 | What it gives you                                              |
| -------------------- | -------------------------------------------------------------- |
| `records_with_stale` | Every row, plus a derived `stale` flag (`0` = current).        |
| `current_records`    | One row per id, highest `rev` wins. **Query this by default.** |
| `children_progress`  | Per parent: how many children, how many done.                  |

`current_records` is what `checkout` reads and what `build` renders. `children_progress` is what
lets `registry.md` show `R-0142 [in-progress] … (1/2 children done)`, and what gives
`PROJECT_PLAN.md` a generated `12/17 done` per workstream instead of a hand-counted one.

---

## 7. What the schema cannot enforce

Two rules matter and neither is expressible in SQL here, so **`checkin.js` owns both**:

1. **`split_from` and `supersedes` must point at ids that exist _and are present in
   `work.json`_.** A foreign key cannot express it: the primary key is `(id, rev)` while the
   reference is to `id` alone. Scoping the check to `work.json` rather than the whole store is
   deliberate — referencing a record you did not check out means **you should have checked it
   out**. You cannot correctly reference a record whose current state you never read, and both
   relationship types require writing the target's next revision anyway.
   📌 If a purely informational `related` link is ever added, it needs an exemption from this
   rule; pointing at a closed record for context should not force a checkout.
2. **A revision whose only differences are `ts` and `rev` must carry a `note`**, per §5.

---

## 8. Changing the schema

🔑 **The schema is not frozen.** It was designed from what was known at the time, cases nobody
thought of will turn up, and when changing the schema is the best fix, change it.

⚠️ **But the two directions are not symmetric,** because the build re-validates the entire store
on every run. A tightened rule retroactively invalidates every row written under the old one.

| Safe — old rows still load        | Breaks history — old rows rejected  |
| --------------------------------- | ----------------------------------- |
| Add a nullable column             | Add `NOT NULL` with no default      |
| Add a column with a `DEFAULT`     | Remove an enum value                |
| Add an enum value                 | Tighten an existing `CHECK`         |
| Add a `CHECK` on a **new** column | Add a `CHECK` to an existing column |

⚠️ **That right-hand column is a heuristic, not the rule.** The rule is that a change breaks
history **iff some row already in the store violates it** — and there is one systematic
exception worth knowing, because the table above would otherwise talk you out of a correct
change:

🔑 **A `CHECK` conditioned on a new enum value cannot invalidate history.** No historical row
can hold a value that did not exist when it was written, so
`status <> 'deferred' OR note IS NOT NULL` is vacuously true for every row already stored. That
was measured against all 326 rows before `deferred` was added. A rule of that shape therefore
belongs in `schema.sql`, where every script enforces it — not in `checkin.js`, which a
hand-edited `registry.ndjson` would bypass.

- **Additive changes are free.** Edit `schema.sql`, rebuild, add a line to that file's CHANGELOG.
  No migration, no decision record, no ceremony.
- **Restrictive changes are a migration, not an edit.** Either put the new rule in `checkin.js`
  so it binds new writes only and history is left alone, or run a real backfill — and record
  either as a `type: decision` record. Quietly tightening a `CHECK` turns every historical row
  into a validation failure the next time anyone builds, and the failure surfaces far away from
  the change that caused it.
- 📌 If a restrictive change ever becomes unavoidable across a large history, the escape hatch is
  a `schema_version` column with version-conditional validation. It is not needed now, and adding
  it pre-emptively would be carrying cost for a problem nobody has.

The first such change has already happened: `question` was added to the `type` enum, because the
migration inventory had `BACKLOG.md`'s `Q1` importing as a task. Additive, so it cost nothing.

---

## 9. A complete record

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
