# Work registry — the workflow

> **How to operate the store.** [`SCHEMA.md`](./SCHEMA.md) is the companion: it says what the store
> **is** — the fields, the relationships, the views, and what the schema can and cannot enforce.
> This file says what you **do**.
>
> 🔑 **The guards are in [`AGENTS.md`](../AGENTS.md) §A**, which every session loads whether or not
> anyone opens this file. What is here is the mechanism behind them; what is there is the rule. If
> the two ever disagree, `AGENTS.md` is the one a reader will actually have seen — fix this file.

---

## 1. The loop

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

**Adding something new uses the same loop.** `checkout.js --new` opens a `work.json` with an empty
`records` array and the next free id; you append your record to it and check in exactly as you
would an edit. ⚠️ **"Check out" does not mean "there must be an existing item"** — a genuinely new
record simply has nothing to check out, which is why R1 is written as _the only write path_ rather
than _the way to modify a record_.

**Check out everything you intend to reference.** Check-in rejects a `split_from` or `supersedes`
aimed at a record that is not in `work.json` — `SCHEMA.md` §7 explains why that is deliberate.
📌 **A rule the tooling enforces, so it is not in `AGENTS.md` §A.** The rejection names the missing
record and prints the command that fixes it — `checkout.js --id R-0154` — at the moment you need
it.

**`rev` is computed by `checkin`, not read from `work.json`.** Whatever number sits in the file is
ignored; the next revision is derived from the store as it stands at check-in.

---

## 2. Why the rules hold

> ⚠️ **Rules are stated in [`AGENTS.md`](../AGENTS.md) §A and are not repeated here** — this
> section is the evidence behind them, which is the part that does not fit in a file every session
> loads. Each subsection names the rule it explains, so the pair is checkable: **if a reference
> below and `AGENTS.md` §A ever disagree, one of them has been edited alone.**

### 2.1 What a hand-written line skips

> 🔁 **Explains R1** — the loop is the only write path; never hand-edit `registry.ndjson`.

Four things happen only on the `checkin.js` path:

| On the `checkin` path                             | Skipped by a hand-edit                    |
| ------------------------------------------------- | ----------------------------------------- |
| The result is dry-run inserted and rolled back    | An invalid row lands in the store         |
| `rev` is computed from the store, not trusted     | Two rows can claim the same revision      |
| `(id, rev)` catches a concurrent write            | The collision detector never runs         |
| The append stays in the shape that merges cleanly | The next merge conflicts or silently wins |

📌 **Correcting rather than editing has its own reason**, in `SCHEMA.md` §2: a correction does not
erase the mistake, it supersedes it. If rows could be edited in place, a row would only tell you
what someone believes now, and you could no longer read it as what was decided at the time it was
written.

### 2.2 Why the prose has to be finished first

> 🕐 **Explains R2** — finish the work, including the record's prose, then check in once.

A record is **two artifacts**, and only one of them is versioned:

| Artifact            | Written by                | Versioned                           |
| ------------------- | ------------------------- | ----------------------------------- |
| the row             | `checkin.js`, append-only | ✅ `(id, rev)`                      |
| `records/R-XXXX.md` | any editor                | ❌ only the git diff shows it moved |

⚠️ **R4 requires the record in the same change as the work. R2 constrains _when_ inside that
change, and this is why.** A record checked in the moment the work _looks_ done asserts figures
that have not settled — a test count, a row count, a file count. The correction then lands in the
prose file, where no revision records it: the row still reads whatever revision it was given, while
the text behind that revision has changed.

📌 **`R-0437` is the worked example.** It was checked in as `done` asserting _"`link.test.js` (17
assertions)"_; four more were then added and the figure was corrected in the prose alone. Nothing
in the store marks that the claim behind `rev 2` changed — only the git diff does.

🔑 **That is why the remedy is a new revision.** The line between a typo and a changed claim is a
judgement call, and a `note` on a revision is the only place that judgement gets written down. An
instruction to be careful with prose would leave no trace of which corrections someone had thought
substantive.

### 2.3 Why the record cannot wait until afterwards

> 📝 **Explains R4** — the record goes in the same change as the work, including work nothing asked
> for.

**A diff records what changed, never what you decided not to do.** Reconstructing a record later
can only recover what left an artifact, so the approach you abandoned, the premise that turned out
false, and the fix that was approved and then disproved are all simply gone — and those are the
entries that stop the next session re-walking a dead end.

📌 **Not a new rule.** `PROJECT_PLAN.md` §1 has said _"tick the box in the same change that does the
work"_ since the 2026-08-02 audit found seven claims that had rotted. **`R-0323` is what happens
when it is not followed:** colour Phase 5 shipped, its box was never ticked, and the migration
faithfully imported finished work as open.

🔑 **Unplanned work is the ordinary case, not the exception,** which is why R4 spells it out — and
⚠️ **the agent finding it matters more than the owner raising it.** An owner's remark at least
exists in the conversation; a defect an agent notices mid-task and does not record leaves **no
trace anywhere**. The store's most valuable entries are exactly that shape: `R-0429` (57 record
files imported with empty bodies) and `R-0435` (ten records truncated mid-sentence) were both found
by reading something for an unrelated reason, and both had passed **every** gate — because a
truncated record is still a valid record. `R-0437` began as a link baseline taken to prove a file
move was safe; the baseline turned out to be the finding.

📌 **A finding you are not going to act on is still a record — `status: open`.** Writing it into
the prose of whatever you happen to be doing feels like recording it and is not: nobody greps
records for other people's asides, whereas `--query "status = 'open'"` is the first thing a session
runs. ⚠️ **This is the rule most easily satisfied in appearance only.**

---

## 3. Looking things up

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

📌 **Never `grep` the store** — see §5. Both paths here parse it.

---

## 4. `work.json` and its stamp

> 📌 **Explains the `work.json` line in [`AGENTS.md`](../AGENTS.md) §A** — gitignored, never
> committed, and not deleted after a check-in.

**Why it must stay gitignored:** it was committed once during testing, a branch merge filled it
with conflict markers, and that destroyed the very file the recovery procedure below depends on.

`checkin` does not delete the file — it adds a `checked_in` date to it. That stamp is what lets
`checkout` tell a finished checkout (safe to replace) from an unfinished one (replacing it would
lose edits that were never recorded anywhere), which keeps `--force` a rare, deliberate act
rather than a habit.

### Recovering from a merge conflict

📌 **A situational rule, so it lives here rather than in `AGENTS.md` §A** — you cannot meet it
without git putting a conflict in front of you first, and by then you are reading this.

Two branches that both revise the same record both append the same `rev`, and git reports a
conflict in `registry.ndjson`. **That conflict is the safety mechanism** — it is the reason there
is no `merge=union` driver, which would accept both lines silently instead.

To recover, **do not hand-edit the conflicted lines**:

1. Take the incoming `registry.ndjson` wholesale.
2. Re-run `checkin`. `work.json` still holds your intent, and `rev` is recomputed against the
   file you just accepted, so your revision lands cleanly above theirs.
3. Re-run `build`.

---

## 5. Why grep is wrong about the store

> 🔍 **Explains R3** — never `grep` the store; query it, and pass `--out` when only looking.

`registry.ndjson` is a **log**, not a table of the current state, and its values are
JSON-escaped. Grep is wrong about it in both directions, silently.

**It misses.** Escaping means the text you read in `registry.md` is not the text stored in
`registry.ndjson`. `R-0004`'s title displays as `Every 집사톡 post opened on "Post not found."`
and is stored as `\"Post not found.\"`:

```bash
grep -c '"Post not found."' work_tracking/registry.ndjson      # -> 0   (as a human types it)
grep -c '\\"Post not found.\\"' work_tracking/registry.ndjson  # -> 1   (as it is stored)
```

**It over-counts.** The file is append-only and holds **every revision**. Grep counts superseded
rows as though they were current; only a reader that folds to the highest `rev` per `id` does not.
📌 **Numbers deliberately not quoted here — run it, because a figure in a document is exactly
what `R-0438` is about:**

```bash
wc -l < work_tracking/registry.ndjson                                    # rows in the log
node work_tracking/scripts/checkout.js --query "1=1" --out /tmp/n.json   # records that are current
```

⚠️ **Pass `--out` whenever you are only looking.** Without it a query overwrites `work.json`, and
it will refuse outright if you have a checkout open — counting something should not disturb work
in progress.

**And a raw match cannot say which field it hit** — a hit in `note` looks exactly like a hit in
`title` or `files`.

✅ **Use `checkout.js --query`** (or the `current_records` view in `registry.db`). Both parse,
both fold to the current revision, and both let you name the field:

```bash
node work_tracking/scripts/checkout.js --query "type = 'bug' AND title LIKE '%admin%'"
```

> 📌 **This replaces an earlier statement of the same rule** which cited "a grep pre-filter found
> 643 of 1,274 matching rows on non-canonical JSON." That figure came from a pre-build experiment
> whose harness was never committed and cannot be reproduced, and its direction is wrong for the
> store as built — grep over-counts here, it does not halve. The rule stands; the evidence above
> is what actually holds. See `R-0438`.
