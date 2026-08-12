---
name: handoff
description: Close a session by bringing work_tracking/HANDOFF.md back to true — check the records in first, regenerate every figure that rots, delete what has become history, and run the gates. Use when the owner says /handoff, "close the session", "update the handoff", or "write up where we got to".
---

# Skill: handoff

Bring `work_tracking/HANDOFF.md` back to true at the end of a session.

⚠️ **This skill does not decide what happened — the records do.** The hand-off is a _view_ over
the store plus the few facts the store cannot hold (which branch, what is unpushed, what needs the
owner). If the work of the session is not in the registry yet, **you are not ready to run this
skill**; go and write the records first. See "Step 1".

📌 **What the file is for is already written down and is not repeated here.** Read
`work_tracking/HANDOFF.md`'s own closing section, "How this file works now", before editing it.
The one-line version: it holds **what is in flight, what needs a person, and where things
stand — nothing else**, and it changes only when the answer to _"what is in flight?"_ changes.

---

## The failure this exists to prevent

The previous hand-off reached **3,396 lines and ~268 KB** because every session appended to it. It
stopped being readable in one sitting, which is the failure the whole work-tracking restructure was
opened to fix (`R-0417`, `R-0424`).

🔑 **So the default action on every figure in this file is _regenerate_, and on every paragraph is
_delete_ — not "add today's news at the bottom".** A session that ends with the hand-off shorter
than it started is a good outcome, not a suspicious one.

---

## Step 1 — Refuse to start if the records are not in

**The record for the work goes in the same change as the work, once the gates are green** —
`AGENTS.md` §A. The hand-off is written _after_ that, from the store.

```bash
git status -sb
node work_tracking/scripts/checkout.js --query "status IN ('open','in-progress')" --out /tmp/o.json
```

⚠️ **If this session finished, decided, or abandoned something that has no record, stop and write
it first.** A diff records what changed, never what you decided not to do — the approach you
abandoned and the premise that turned out false leave no artifact, and those are exactly the
entries that stop the next session re-walking a dead end.

📌 **Summarising the session into the hand-off instead of into records is the specific mistake this
step blocks.** It is how the file grew to 3,396 lines: each session's narrative was true, and each
one belonged in a record.

---

## Step 2 — Regenerate every figure; never edit one in place

Each of these appears in the file with a warning attached, because each one rots. Run the command,
use the output, and **do not trust the number already written there** — including one you wrote
yourself earlier in the same session.

| Figure in the file               | Regenerate with                                                                                                                    |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Open work, and its by-type split | `checkout.js --query "status IN ('open','in-progress')" --out /tmp/o.json`, then tally `type`                                      |
| Branch and how far ahead         | `git status -sb` · `git rev-list --count origin/dev..dev` · `git rev-list --count origin/main..dev`                                |
| Store test assertions            | `node work_tracking/tests/run.js`                                                                                                  |
| Room left in the budgets         | `node work_tracking/scripts/size-check.js --report`                                                                                |
| Application gate numbers         | `npx tsc --noEmit` · `npm run test:smoke` · `npm test` — plus `test:e2e`, `test:rules`, `test:scripts` if those areas were touched |

⚠️ **Measure against `origin/main`, never the local `main` ref** — it is stranded at `26b1879`
(2026-03-16) and will report a wildly wrong count.

⚠️ **A line cannot count the commit that writes it.** Never write "N commits this session" as a
fact; write the command that answers it. The file already does this deliberately in two places, and
that phrasing is the pattern to copy.

📌 **Do not `grep` `registry.ndjson` for any of this.** It is append-only and JSON-escaped, so grep
over-counts superseded revisions and misses escaped text — wrong in both directions, silently.
`WORKFLOW.md` §5 demonstrates both.

---

## Step 3 — Rewrite the sections that changed, and only those

The file's sections, and what each is allowed to hold:

- **▶️ In flight** — the current workstream and what un-blocks it. Rewrite when the workstream
  changes; otherwise leave it alone.
- **🔴 Start here** — the resume point, so the next session does not have to derive it. This is
  the highest-value section and the one most worth spending words on.
- **What needs a person, by record** — items wanting the owner rather than an agent. ⚠️ The file
  itself calls this "the thing most likely to rot": name records, and say the query is
  authoritative rather than the list.
- **Where things stand** — branch, unpushed work, gate results.
- **Where the deep detail lives** — pointers. Stable; rarely needs touching.
- **How this file works now** — the contract. **Do not edit it as part of a routine hand-off.**

🔑 **When a chunk of work finishes, the record changes and this file usually does not.** A closed
record that was never named here needs no entry here. Only mention a closed record if the next
session would otherwise wonder where it went — for instance, because the file named it as blocking.

---

## Step 4 — The deletion pass

Read the file top to bottom and ask of each paragraph: **would a fresh session with no memory of
today act differently without this?** If not, delete it.

Things that have become history and should go:

- A blocker that is now resolved, once nothing points at it.
- A "we are about to do X" note where X has shipped.
- Any narrative that has a record — the record is the durable copy. Link it, do not summarise it.
- Warnings about a structure that no longer exists.

📌 **Precedent, from the file's own budget note:** two sections were cut on 2026-08-09 — a note
about three stale imports, and a duplicate of the record workflow that `AGENTS.md` §A already
carried. **Both were true; neither was still load-bearing for a fresh session.** True is not the
test. Load-bearing is.

---

## Step 5 — Size, and when to archive

```bash
node work_tracking/scripts/size-check.js --report
```

**Budget: 250 lines, CI-enforced.** Getting close is a signal to delete, **not** to raise the
number. Raising a budget is allowed and is a visible act in a diff — doing it to make room for a
session's narrative is the thing the ratchet exists to stop.

If the file genuinely needs to be cut and started over, the remedy in `size-policy.json` is the
procedure: **archive it to `docs/handoff/archive/<date>-*.md` and cut a fresh one.** ⚠️ Archiving
is a real change with its own record — `R-0417` is what one looks like. It is not a step to take
silently inside a routine session close.

---

## Step 6 — Gates, then stop

```bash
node work_tracking/tests/run.js
node work_tracking/scripts/build.js --check
node work_tracking/scripts/size-check.js
node work_tracking/scripts/link-check.js
```

Add `npx tsc --noEmit` and `npm run test:smoke` if application code was touched. ⚠️ **`npm test`
excludes `test:e2e`, `test:rules` and `test:scripts`** — they need the emulator and are separate CI
jobs, so a regression in one is caught nowhere else. `test:e2e` needs
`export PATH=/usr/local/opt/openjdk/bin:$PATH` first; the bare macOS `java` is a runtime-less shim.

⚠️ **`registry.md` is generated** — if a record changed, run `node work_tracking/scripts/build.js`
and commit the regenerated file. Never hand-edit it; `--check` fails if it does not equal
`build(registry.ndjson)`.

🔴 **Then stop and summarise what is staged. Do not commit or push without a go-ahead** — the
owner's standing instruction, and the owner is the one who pushes.

⚠️ **`work.json` is gitignored — never commit it**, and do not delete it after a check-in; it is
the merge-conflict recovery file.

---

## Checklist

- [ ] Every finished, decided, or abandoned thing from this session has a record, checked in.
- [ ] Every figure in the file was regenerated by a command, not edited by hand.
- [ ] Branch state measured against `origin/main` and `origin/dev`.
- [ ] Sections that did not change were left alone.
- [ ] A deletion pass happened, and something was actually deleted or it was confirmed nothing had aged out.
- [ ] The file is within budget without the budget being raised.
- [ ] The four work-tracking gates pass; `registry.md` rebuilt if records changed.
- [ ] Staged and summarised; **not** committed.
