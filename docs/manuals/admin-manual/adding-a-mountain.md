# Adding a Mountain — Owner Checklist (work outside the codebase)

> **Audience:** the owner. Everything here is done in a **web console, a DNS registrar, or
> YouTube** — no code, no repo checkout, no deploy. If a step needs a file edited or a script
> run, it is not in this doc; it is in the developer runbook.
>
> **Companion docs — you need all three, in this order:**
>
> 1. ⛔ [`../../planning/mountain-2-prerequisites.md`](../../planning/pending/mountain-2-prerequisites.md)
>    — **the gate.** What must be fixed or decided _before_ a second mountain goes live.
>    Start there. 🚨 Its §1.1 is a security defect (signing out of one mountain leaves you
>    signed in on the others) that becomes real the day a second subdomain resolves.
> 2. 📄 [`../deployment/new-mountain-setup.md`](../deployment/new-mountain-setup.md) — **the
>    developer half**: the two config files, storage prefix, rules/indexes.
>    Someone with the repo does that part.
> 3. 📋 **This doc** — the console half, which is yours.
>
> **The model, so the steps make sense:** one Firebase project and one Vercel project serve
> every mountain. There is **no new infrastructure and no new environment variable**. A
> mountain is a config entry plus a hostname that points at the existing deployment. That is
> why this checklist is short — and why the few consoles that key on an _exact domain_ are
> the ones that will bite you.

**Legend:** 🔑 owner-only · ⚠️ gets you if skipped · ⏱️ has a waiting period

---

## Before you start

- [ ] Read the prerequisites doc and confirm its blocking items are resolved. Provisioning
      past an unresolved §1.1 or §1.2 is how a second mountain quietly damages the first.
- [ ] Agree the **mountain id** (lowercase, no spaces — e.g. `manisan`), the **display name**
      (e.g. 마니산), and the **subdomain** (`<id>.mohocats.org`). The id is used in the URL,
      in config, and on every content record; changing it later is a migration, not an edit.
- [ ] Hand the id, name, subdomain, and brand color to whoever does the developer half — the
      config entry must exist before the site can answer on the new hostname.

---

## 1. 🔑 DNS — point the subdomain at the existing deployment

In your DNS provider for `mohocats.org`:

- [ ] Add `CNAME <id>.mohocats.org → cname.vercel-dns.com` (or whatever Vercel's Domains
      screen tells you in step 2 — follow Vercel over this doc if they disagree).

⏱️ Propagation is usually minutes but can take up to a few hours. `dig +short <id>.mohocats.org`
returning nothing means it has not landed yet — that is not a bug to chase.

⚠️ **Also check geyang's own subdomain exists.** As of 2026-07-28 the site is served from the
apex `mohocats.org` and `geyangsan.mohocats.org` does not resolve. Attach geyang's subdomain
**before** the new mountain becomes visible, not at the same time — see prerequisites §1.5
for why (the mountain switcher generates the wrong kind of link until it is done).

## 2. 🔑 Vercel — attach the domain

- [ ] Vercel dashboard → the **existing** project → **Settings → Domains** → add
      `<id>.mohocats.org`.

That is the whole step. **Do not create a new project**, and do not add or copy any
environment variables — every one of them is shared across mountains. Vercel issues the TLS
certificate automatically once DNS resolves.

## 3. 🔑 Firebase Console — authorize the domain

- [ ] **Authentication → Settings → Authorized domains** → add `<id>.mohocats.org`.

⚠️ **Skip this and nobody can log in on the new mountain at all** — not by email, not by
Kakao. The failure is at sign-in, so it looks like broken auth rather than a missing setting.

## 4. ✅ Kakao Developers — nothing to do

**There is no per-mountain Kakao step.** Earlier versions of this checklist and of the
developer runbook said to add a redirect URI per subdomain; that was wrong, corrected
2026-07-28 after reading the code.

Kakao is wired as a **Firebase OIDC provider** (`oidc.kakao`) used through
`signInWithPopup` (`src/services/auth-service.ts:144,193`). The OAuth redirect therefore goes
to **Firebase's own auth handler** —
`https://<NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN>/__/auth/handler`, i.e.
`mountaincats-61543.firebaseapp.com` (`auth-service.ts:150-153`) — which is the same host for
every mountain. Kakao never sees the mountain's subdomain, so the single redirect URI already
registered covers all of them, permanently.

Email/password and phone/SMS need nothing per-subdomain either.

## 5. 🔑 YouTube — create the mountain's playlist

All mountains publish to **one shared channel**; a per-mountain **playlist** is how a video
is attributed to a mountain on the YouTube side.

- [ ] Create a playlist for the mountain on the shared channel.
- [ ] Copy its **playlist ID** and give it to whoever does the developer half (it goes in the
      config entry as `social.youtubePlaylistId`).

⚠️ The playlist must exist **before** anyone uploads from the new mountain, or those uploads
are filed nowhere and the playlist stops being a complete ownership record. This matters more
than it looks: prerequisites §1.2's fix treats the playlist as the record of what a mountain
owns.

## 6. 🔑 Firebase Console — seed the first admin

A brand-new mountain has no admin, and the in-app role assignment requires an existing admin
**on that mountain** — a chicken-and-egg the CMS cannot break.

- [ ] Find the person's user document: **Firestore → `users` → their `{uid}`**. They must have
      signed in at least once, on any mountain, so the document exists.
- [ ] Add a `roles.<id>` entry:
      `{ role: "admin", permissions: [], isActive: true }`.

Leaving `permissions` empty is correct — an empty list means "use the role's permissions from
the central matrix", which is what you want.

After this, every further role on the mountain is granted normally through 사용자 관리 in the
CMS. Nothing else needs the console.

## 7. Analytics — usually nothing to do

Analytics is a **single shared GA4 property**; page views already carry a `mountain_id`, so no
new property and no new tag.

- [x] The one global prerequisite — registering `mountain_id` as a **custom dimension** — was
      done 2026-07-26. GA4 does not backfill, so it had to precede any second-mountain
      traffic; it now does. Nothing to repeat per mountain.

Full runbook if you need it: [`google_analytics.md`](./google_analytics.md).

## 8. Content — seed through the CMS

- [ ] Browse the new mountain (its subdomain once DNS is live, or `/<id>` on the existing
      site before then) and sign in as the admin you seeded in step 6.
- [ ] Add 급식소 pins, 고양이, photos, the About page, and a first 공지사항 through the normal
      CMS screens — see [`README.md`](./README.md).

Everything you create while browsing that mountain is stamped to it automatically. There is
no import step and no backfill; a new mountain simply starts empty.

---

## Verification — do these before announcing it

- [ ] `https://<id>.mohocats.org` loads and shows the new mountain's name and content.
- [ ] The mountain **switcher** in the header lists it, and switching between mountains works
      in both directions.
- [ ] **Sign-in works on the new subdomain** — email and, if offered, Kakao (this is what
      steps 3 and 4 buy you).
- [ ] `/admin` on the new subdomain lets the seeded admin in, and shows **that mountain's**
      content — not geyang's.
- [ ] A test upload from the new mountain lands in **its** YouTube playlist.
- [ ] geyang is untouched: its content, its admin, its media all behave exactly as before.

⚠️ **Expect to log in again on the new subdomain**, even if you are already signed in on
geyang. That is accepted behavior, not a fault — sessions are per-subdomain (prerequisites
§4). It is one login per subdomain per browser, not one per switch.

---

## What is _not_ here

Deliberately, because none of it is console work:

| Task                                          | Where it lives                                    |
| --------------------------------------------- | ------------------------------------------------- |
| `mountains.json` / `permissions.json` entries | developer runbook §2                              |
| Storage prefix                                | developer runbook §2a                             |
| Firestore rules & indexes                     | nothing to do — already global and mountain-aware |
| Environment variables                         | nothing to do — all shared                        |
| What must be fixed _before_ any of this       | prerequisites doc                                 |

⚠️ **One thing that _is_ yours and is easy to miss: the 소개 page.** A new mountain's
`/pages/about` reads **"아직 소개가 준비되지 않았어요."** until someone writes it in
**앱관리 → About** — there is no longer any config-file copy standing in (changed
2026-08-02). Two steps: upload the 대표 사진 to Storage under `about-photos/{mountainId}/`,
then type its exact filename into the editor along with the copy. Detail:
[`README.md` §7](./README.md#7-about-page-content--앱관리--about-adminapp-management).
