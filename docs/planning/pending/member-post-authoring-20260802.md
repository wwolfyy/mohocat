# Member authoring on 집사톡 + 급식현황 — plan

**Status:** P1–P6 built and green (full e2e **220 / 13 / 0**, up from 214 — six new member
specs), **plus the direct rules suite** (`tests/rules/posts.rules.test.ts`, 43 tests,
`npm run test:rules` = **54 passed** with `users.rules.test.ts`; §6).

> 🔴 **CORRECTION 2026-08-03 — this is LIVE in production; the "not live" line below was
> wrong.** The deployed ruleset (release **2026-08-02T16:00:12Z**) matches
> `config/firebase/firestore.rules` ignoring comments, `role_permissions/role-config`
> already grants `write-own-post-*` to both butler roles (the dry run skipped them as
> "already held"), and **one active `butler-ground` member has authored two 급식현황
> posts** on 2026-08-03. 🔑 **"Not on `main`" is not "not in production"** — Preview runs
> `dev` against the **production** database, and rules + the matrix deploy by hand, out of
> band. ⚠️ **Consequence:** the §10p media gap this shipped with is live too, not
> theoretical — see
> [`member-media-upload-permissions-20260803.md`](./member-media-upload-permissions-20260803.md).

~~⚠️ **Not live:** the rules are not deployed and both prod migrations are dry-run only.~~

🔬 **Three things the suite caught that review had not:**

1. **The gates locked admins out.** `manage-posts` and `write-own-*` are different
   permissions, and an admin holds only the former — so a single-permission gate on the
   composer denied the very people who could already post. Every member-facing gate now
   admits `manage-posts` alongside the member grant. (`admin/butler-create.spec`, 7 failures.)
2. **A spec renamed a fixture another spec reads by title** — the member edit test rewrote
   `test-butler-01`, which `post-detail.spec` looks up as '집사수다 1'. Exactly the
   `admin/cats.spec` bug from 2026-08-02, repeated. The mutating test now owns
   `test-butler-member-edit-01`, which nothing else reads.
3. **A Next build error, not a runtime one:** `/pages/posts/[postType]/[postId]/edit`
   cannot coexist with the sibling detail route `[postType]/[id]` — Next refuses two slug
   names at one path position.

**Owner ask:** _"allow the author of 집사톡 and 급식현황 posts to edit the post"_, refined to:
**members may view, create and edit their own** posts on **those two boards only**, and **may
not delete**.

---

## 1. The premise the ask rested on, corrected

**Members cannot use these boards at all today**, so "let the author edit" could not have
applied to anyone but an admin — and an admin can already edit everything.

| Step                           | Gate today                                    | Who passes  |
| ------------------------------ | --------------------------------------------- | ----------- |
| See the 집사톡 / 급식현황 list | `page.tsx` → `checkIsAdmin(user, mountainId)` | admins only |
| Create a post                  | client SDK → rule `canWrite('manage-posts')`  | admins only |
| Edit a post                    | `/admin/posts/edit/[postType]/[postId]`       | admins only |

Verified against the **live** `role_permissions/role-config` in Firestore (what the rules
actually resolve), not only `config/permissions.json`: `manage-posts` belongs to `admin` alone.

🔑 **The model already anticipated this and nothing used it.** `view-post-butler` and
`view-post-feeding` exist in the live matrix and **are granted** to `butler-ground` /
`butler-internet` — but the pages check `isAdmin`, so those grants confer nothing. The code
says as much (`butler_talk/page.tsx:24`): _"we allow both admin and butler roles / You can
customize this logic"_, immediately above `setHasPermission(isAdmin)`.

📌 `butler-internet` holds `view-post-butler` but **not** `view-post-feeding`. That asymmetry
is deliberate and this plan preserves it: per-board capability, not one "member" flag.

---

## 2. Decisions

**D1 — Two new permissions, not a reuse of the `view-post-*` grants.** Read and write are
different authorities; deriving "may post" from "may look" would mean any future read grant
silently hands out write. Adding:

| Permission               | Board    | Granted to                         |
| ------------------------ | -------- | ---------------------------------- |
| `write-own-post-butler`  | 집사톡   | `butler-ground`, `butler-internet` |
| `write-own-post-feeding` | 급식현황 | `butler-ground`                    |

Each covers **create + edit-own on that board**: they are one capability ("take part in this
board"), and splitting them would let a role create posts it then cannot correct.
⚠️ `butler-internet` gets **no** feeding permission — it cannot see that board.

**D2 — `authorUid` becomes the authorship field; `username` stays as display.** Posts carry
only `username: string` (`user?.email || 'unknown'`). Rules _can_ compare
`request.auth.token.email`, but that ties authorization to a mutable, user-controlled-ish
display field. New posts stamp `authorUid`; the email comparison survives **only** as a
fallback for pre-existing posts.

📌 Live authorship at planning time:

```
posts_butler:   admin@mtcat.com ×5,  jaesangpark@gmail.com ×1
posts_feeding:  jaesangpark@gmail.com ×3
```

⚠️ The 5 `admin@mtcat.com` posts have **no matching account** — nobody can ever be their
author, so they stay admin-only. That is correct, not a gap to close.

**D3 — Delete stays `manage-posts`** (owner). A 집사톡 post can carry a reply thread; letting
an author delete it would take other people's replies with it, and that question is not open
yet.

**D4 — An edit must not become a way to rewrite provenance.** The rules — not just the UI —
enforce that an update leaves `authorUid`, `username`, `date`, `time` and `mountainId`
unchanged. The composers already decline to re-stamp these (§10l decision 2); this makes the
guarantee hold against a hand-crafted client, which is the point of putting it in rules.

**D5 — 급식현황 edit for a member uses the composer, not `EditPostForm`.** The admin edit
screen keeps `EditPostForm` because legacy 급식현황 posts carry media only a URL editor can
change (§10l) — an admin concern. A member editing their own post gets the ordinary composer.
⚠️ Creation also writes `feeding_spots` from the checkbox list; **an edit must not re-run
that**, for the same reason an edit does not re-stamp authorship.

**D6 — A reply writes to _two_ documents, and the second one is not the replier's.** 🔑 Found
while implementing P1, not while planning: a reply is a document in the **same collection** as
its parent (`parentId` / `isReply`), and `createReply` then calls `updateReplyCount(parentId)`
— an `increment(1)` on the **parent**, which the replier usually does not own. A pure
"authors may update their own" rule denies every reply to somebody else's post, which is most
of them. So `update` needs a third path: a **`replyCount`-only bump**, by an actor who may
post on that board, constrained to exactly `+1` so it cannot be used to write anything else.
Two consequences worth stating: replies are governed by the post rules (so `ReplyForm` must
stamp `authorUid` too), and a member's reply is itself an editable-by-its-author post.

**D7 — Creating a 급식현황 post also writes `feeding_spots`, which is `manage-posts`-gated.**
The composer's checkbox list calls `updateFeedingSpots()`, stamping `last_attended` /
`last_attended_by` on each checked spot — **the whole point of the board**: logging that
someone fed a spot. That write is `manage-posts` today, so a member's post would succeed and
their check-in would silently not register (the call is deliberately non-fatal). So
`write-own-post-feeding` also permits an update to `feeding_spots` **restricted to those two
fields**. ⚠️ Unlike a post, a feeding spot is **shared state with no owner** — any holder of
the permission may stamp any spot. That is the intended real-world action, but it is a
genuinely wider grant than the post rules, and worth saying out loud.

**D8 — Rules ship before the UI.** With rules deployed first, nothing changes for anyone (no
member can reach a composer yet). Ship the UI first and members get buttons that fail at the
write. See §5.

---

## 3. Tasks

- [x] **P1 — `authorUid` on posts.** Add optional `authorUid` to `Post`; stamp it in
      `useRichContentForm` (집사톡) and `NewPostForm` (급식현황) alongside `username`, inside
      the existing create-only branch so an edit cannot set it. **Backfill script**: map
      `username` → uid for accounts that exist, leave the rest untouched (dry-run default).
- [x] **P2 — the two permissions.** Add to `config/permissions.json`; migrate the live
      `role_permissions/role-config` doc, since that is what the rules read and the JSON is
      only its seed/fallback (`api/admin/role-permissions/route.ts`).
- [x] **P3 — rules.** Split `posts_butler` / `posts_feeding` `write` into create / update /
      delete per §4. 공지사항 / 입양홍보 keep `canWrite('manage-posts')` untouched.
- [x] **P4 — board pages.** Replace `isAdmin()` on `butler_talk/page.tsx` and
      `butler_stream/page.tsx` with the matching `view-post-*` permission. Gate 새글 작성 on
      the `write-own-*` permission. ⚠️ `/pages/butler_talk/new` and `/pages/butler_stream/new`
      have **no gate of their own** today — reachable by URL by any signed-in user, harmless
      only because the write is denied. Gate them.
- [x] **P5 — member edit route.** An 수정 affordance shown only to the author, opening the
      composers in edit mode outside `/admin`. Honour D5.
- [x] **P6 — tests + docs.** e2e as a butler-ground member: sees both boards, creates, edits
      own, **denied** on another author's post, **no** delete affordance; and butler-internet
      sees 집사톡 but not 급식현황. Update the admin manual (roles table), `docs/codebase/`
      permissions doc, PROJECT_PLAN, HANDOFF.
- [x] **P7 — the rules suite (2026-08-03, added after P6).** `tests/rules/posts.rules.test.ts`
      asserts the §4 rules directly, covering the refusals a UI-driven test cannot reach, and
      was **mutation-tested** so its `assertFails` cases are known to discriminate. See §6.

---

## 4. Rules shape (P3)

```
match /posts_butler/{document} {
  allow read:   if request.auth != null;
  allow create: if canWrite('write-own-post-butler') && authoringAsSelf();
  allow update: if canWrite('manage-posts')
                || (canWrite('write-own-post-butler') && isAuthor() && provenanceUnchanged())
                || (canWrite('write-own-post-butler') && isReplyCountBump());
  allow delete: if canWrite('manage-posts');
}
```

- `authoringAsSelf()` — `request.resource.data.authorUid == request.auth.uid`. Without it a
  member could publish a post attributed to someone else.
- `isAuthor()` — `resource.data.get('authorUid', '') == request.auth.uid`, **or** the legacy
  fallback `resource.data.username == request.auth.token.email`.
- `provenanceUnchanged()` — `authorUid` / `username` / `date` / `time` identical to the
  stored doc (D4). `canWrite` already pins `mountainId`.
- `isReplyCountBump()` (D6) — the update touches **only** `replyCount` and raises it by
  exactly one: `diff(resource.data).affectedKeys().hasOnly(['replyCount'])` plus
  `request.resource.data.replyCount == resource.data.get('replyCount', 0) + 1`. Bounded this
  tightly, it cannot smuggle any other field through.
- ⚠️ **`create` keeps the admin path too** — `canWrite('manage-posts')` must remain an
  alternative on create, or admins (who hold no `write-own-*`) lose the ability to post.
  The same applies to the `replyCount` bump: an admin replying to a member's post takes the
  `manage-posts` branch.

---

## 5. Deploy order (D8)

1. **Rules first** (`firebase deploy --only firestore:rules`) — inert on its own.
2. Then the permission migration (P2) — still inert; no UI exposes the capability.
3. Then the code (`git push`).

⚠️ Reversing 1 and 3 gives members a visible composer whose save is denied. ⚠️ Rules are
**not** deployed by CI — the owner runs the command (CLAUDE.md).

---

## 6. Risks

- ~~**Rules are the security boundary here, and the post rules are not directly tested yet.**~~
  ✅ **CLOSED 2026-08-03 — `tests/rules/posts.rules.test.ts`, 43 tests, run before the deploy.**
  It asserts `firestore.rules` directly via `@firebase/rules-unit-testing`, alongside the
  existing `users.rules.test.ts`, and covers what e2e structurally cannot: a post attributed
  to someone else's `authorUid`, an edit rewriting provenance, a `replyCount` that moves by
  anything but +1 or carries a second field, a `feeding_spots` write outside the two allowed
  keys, a delete on `write-own-*`, and `butler-internet` reaching 급식현황.
  🔑 **The suite passed on the first run, which is not evidence — so it was mutation-tested:**
  four holes were punched in the rules (drop `authoringAsSelf`, drop `provenanceUnchanged`,
  `hasOnly`→`hasAny`, grant member delete) to prove the assertions fail when the rule does.
  📌 **One of the four escaped, and it is the shape this plan's §4 invites:** the two boards
  carry **separate, near-identical rule blocks**, and the provenance cases only ran against
  `posts_butler` — so removing `provenanceUnchanged()` from `posts_feeding` alone was
  invisible. Every ownership case now runs against **both** collections via `describe.each`.
  ⚠️ **Keep that property**: a case added for one board without the other re-opens the gap.
- **`isAdmin()` is looser than it reads** — it tests for `manage-cats` (no such permission;
  the real one is `manage-cat`) and `manage-settings` (does not exist), so it reduces to
  "holds `manage-posts` or `manage-users`". Not load-bearing for this plan, but do not copy it
  as a model. Worth a separate cleanup.
- **This is the first time a non-admin writes content through the client SDK.** 동참 goes
  through an Admin-SDK route instead. If the ownership rules prove awkward, the fallback shape
  is an Admin-SDK route that performs the ownership check server-side.
