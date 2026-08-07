# Google Analytics (GA4) — Setup & Operations Guide

> **Audience:** the **owner** (this is an infrastructure/console task, not a `/admin` CMS
> task). Part of the [Admin Manual](./README.md); the one-line version lives in
> [§9 → Analytics](./README.md#9-configuration--operations-owner--developer).
>
> **What you'll do here:** confirm the GA4 property (reuse the Firebase-linked one), fix the
> data stream's Enhanced-measurement page-view setting, register a `mountain_id` custom
> dimension, put the measurement ID in Vercel, and verify. ~15 minutes, once.

---

## Mental model (read this first)

- **One shared GA4 property serves every mountain.** Each page view is sent with a
  `mountain_id` field so you can filter/segment one property per mountain, instead of running
  a separate property per tenant. (Separate per-mountain properties can be added later without
  re-plumbing — the app uses `gtag.js`, so it's a config change.)
- **Analytics only runs when you switch it on.** The tracking script is rendered only when the
  `NEXT_PUBLIC_GA_MEASUREMENT_ID` environment variable is set. Until then **nothing loads and
  there is no error** — which is also why local dev, Preview (unless you set it there), and the
  automated tests never send analytics.
- **What is tracked today:** a `page_view` event on every route change, carrying
  `page_location`, `page_path`, `page_title`, and `mountain_id`. There are no other custom
  events yet.
- **`mountain_id` rides on every event, not just `page_view`.** `AnalyticsTracker` calls
  `gtag('set', { mountain_id })` on each route change, making it a **default parameter**, so
  GA4's automatic Enhanced-measurement events (scrolls, outbound clicks, file downloads, video
  engagement, form interactions) carry it too. _Caveat: only events sent **after** the app
  hydrates pick it up — an automatic event firing during the very first paint could miss it.
  In practice those events need user interaction, which happens later._
- **⚠️ `mountain_id` must be registered before the traffic you want to see.** GA4 only records
  a custom dimension from the moment it's registered — it **does not backfill**. So register it
  now, before a second mountain ever goes live.

---

## Part A — One-time setup (owner)

> ### ⚠️ A0. Check which analytics production is actually running
>
> **The gtag.js path only exists from multi-mountain M7 onward.** Before M7 is promoted to
> `main`, production runs the **old Firebase-SDK analytics**, driven by
> **`NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`** (`services/firebase.ts` → `getAnalytics(app)`;
> `utils/config.ts` → `measurementId`). On such a build, `NEXT_PUBLIC_GA_MEASUREMENT_ID` is
> read by **nothing**.
>
> So on a pre-M7 production: setting the new var changes nothing, and deleting the old one
> **switches analytics off**. Check first:
>
> ```bash
> git show main:src/app/layout.tsx | grep -c GA_MEASUREMENT_ID   # 0 ⇒ pre-M7
> ```
>
> **Safe order when promoting M7:**
>
> 1. Keep **both** variables set on Production — they can coexist (same GA4 property; each
>    build reads only the one its code knows).
> 2. Promote `dev → main`.
> 3. Verify per **Part B**.
> 4. **Then** delete `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (A4 step 4).
>
> Everything else in Part A (property, dimension, stream settings) is console-side and can be
> done any time — it just sits waiting until the code lands.
>
> _Expect a gap: the pre-M7 Firebase SDK sends `page_view` **without** `mountain_id`, so the
> mountain breakdown effectively begins at promotion._

### A1. Get (or confirm) the GA4 Measurement ID

> **🔑 You almost certainly already have one — reuse it.** This Firebase project has an
> auto-linked GA4 property from back when analytics ran through the Firebase SDK. Reusing its
> Measurement ID keeps the pre-M7 history and the new `gtag.js` data in **one** property.
> It is the same value the retired `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` env var held — the
> value survives, it just moves to `NEXT_PUBLIC_GA_MEASUREMENT_ID`.

**Where to find it (either route):**

- **Firebase Console** → ⚙️ **Project settings** → **General** → **Your apps** → the **Web**
  app → **SDK setup and configuration** → the `measurementId` field of the config snippet.
  _(Which GA4 property is linked: Project settings → **Integrations** → Google Analytics.)_
- **Google Analytics** → **Admin** (gear, bottom-left) → **Data streams** → click the **Web**
  stream → **Measurement ID**, top-right.

⚠️ Take the **Web** stream's ID (format **`G-XXXXXXXXXX`**). A Firebase project can also carry
iOS/Android streams; those are not usable here, and a Firebase **App ID**
(`1:...:web:...`) is a different thing entirely.

If there genuinely is no property yet: **Admin → Create property** (name e.g.
`산냥이집냥이 / mohocats`, time zone `(GMT+09:00) Seoul`, currency KRW), then **Data streams →
Web** for the production domain.

> One property, one Measurement ID, for all mountains. Do **not** create a separate property
> per mountain — the `mountain_id` dimension (A3) is how mountains are separated.

### A2. Fix the data stream's Enhanced measurement ⚠️ or page views double-count

The app deliberately sends its **own** `page_view` (so it can attach `mountain_id`) and
suppresses gtag's automatic one via `send_page_view: false`. GA4's **Enhanced measurement** has
a sub-option that fires _another_ `page_view` on client-side navigation — and that one has **no
`mountain_id`**. Left on, you get roughly double the page views, half of them unsegmentable.

1. **Admin → Data streams →** click the **Web** stream.
2. Find **Enhanced measurement**. If the whole toggle is **off**, you're already safe — skip
   the rest (nothing here is required for `page_view` tracking to work).
3. If it's **on**, click the **⚙️ gear** on that card → open **Page views** →
   **untick "Page changes based on browser history events"** → **Save**.

Notes:

- **"Page views" itself cannot be turned off** inside Enhanced measurement — only that history
  sub-option is configurable. That's fine: `send_page_view: false` already suppresses the
  load-time one.
- The other Enhanced-measurement events (Scrolls, Outbound clicks, Site search, Video
  engagement, File downloads, Form interactions) are **optional extra data, not required**.
  They **do** carry `mountain_id` (the app registers it as a default parameter — see Mental
  model), but **Form interactions** widens what's collected on the 동참/content forms — check
  it against the 개인정보처리방침 before enabling it.

### A3. Register the `mountain_id` custom dimension ⚠️ do this before any second-mountain traffic

> **Not "Create custom event."** That's a different feature (it synthesises a new event from
> existing ones). You want a **custom _dimension_**, which makes an event _parameter_ usable as
> a breakdown in reports.

1. **Admin → (Property column) → Data display → Custom definitions → Custom dimensions** tab.
   _(GA4 reshuffles this menu periodically — if "Data display" isn't there, look for **Custom
   definitions** anywhere in the Property column, then the **Custom dimensions** tab, not
   "Custom metrics".)_
2. **Create custom dimension:**
   - **Dimension name:** `mountain_id` (this is what you'll see in reports)
   - **Scope:** **Event**
   - **Event parameter:** `mountain_id` (must match exactly — this is the field the app sends)
   - Description (optional): "Which mountain/tenant the page belongs to (geyang, manisan, …)."
3. **Save.**

Without this step, page views still arrive but you **cannot break them down by mountain**, and
GA4 will not retroactively add the breakdown once you register it later. Register it once, up
front.

### A4. Set the environment variable in Vercel and redeploy

1. **Vercel dashboard → the mohocats project → Settings → Environment Variables.**
2. Add:
   - **Key:** `NEXT_PUBLIC_GA_MEASUREMENT_ID`
   - **Value:** the `G-XXXXXXXXXX` from A1
   - **Environments:** **Production only** — the standing choice (2026-07-26) is to keep the
     `dev` site out of the analytics data. Ticking **Preview** as well is supported and simply
     means `dev` traffic lands in the same property.
3. **Redeploy.** `NEXT_PUBLIC_*` variables are baked in **at build time**, so a running
   deployment won't pick up the new value until it's rebuilt — trigger a redeploy (any push to
   the branch, or Vercel → Deployments → ⋯ → Redeploy).
4. _(Cleanup)_ `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` is **dead** — nothing in `src/` reads it
   since M7. Delete it from Vercel; its value lives on as `NEXT_PUBLIC_GA_MEASUREMENT_ID`.

> **Trade-off of Production-only:** the first time gtag ever executes is on the live site, so
> there's no pre-flight rehearsal. That matters most for A3 — a wrong parameter name or scope
> isn't backfillable. If you want to rehearse, set the var on Preview for one session, verify
> per Part B, then remove it and redeploy. To keep your own visits out of the numbers
> permanently, use **Admin → Data streams → Configure tag settings → Define internal traffic**
> (by IP) plus a matching **Data filter**.

---

## Part B — Verify it's working

After the redeploy, open the production site in a normal browser and click around a few pages,
then in GA4:

- **Reports → Realtime** — you should see active users and `page_view` events within a minute.
- **Admin → DebugView** (more detail) — to see individual events with their parameters. Tip:
  install the **Google Analytics Debugger** browser extension (or append `?debug_mode=1`) so
  your own visit shows up in DebugView; expand a `page_view` event and confirm a `mountain_id`
  parameter is present with the expected value (`geyang`, etc.).

If Realtime stays empty, jump to **Troubleshooting** below.

---

## Part C — Reading data per mountain

Once `mountain_id` is registered (A3) and traffic has flowed, you can slice any report by it:

- **In a report** (e.g. Reports → Engagement → Pages and screens): use **Add filter** /
  the secondary-dimension picker and choose **`mountain_id`** to break the table down by
  mountain, or filter to a single mountain.
- **Explore** (left nav → Explore → blank exploration): drag **`mountain_id`** into **Rows** and
  a metric (e.g. Views, Active users) into **Values** to compare mountains side by side.
- **Comparisons** (top of a report): build a comparison like `mountain_id exactly matches
geyang` vs `… manisan`.

Until a second mountain is live, everything is `geyang` — the dimension is in place and will
start separating automatically when another mountain gets traffic.

---

## Privacy note

Google Analytics sets cookies and collects usage data. The site publishes a
개인정보처리방침 (`/pages/privacy`); keep GA usage consistent with what it discloses, and loop
in the compliance review before scaling. Analytics loads **only** when
`NEXT_PUBLIC_GA_MEASUREMENT_ID` is set, so leaving it unset (e.g. on Preview) is a clean way to
keep an environment analytics-free. _(A consent-gated "decline analytics" flow is not wired
today — raise it with the compliance workstream if required.)_

---

## Troubleshooting — "no data in GA4"

| Symptom                                       | Likely cause                                                                                                                                       | Fix                                                                                                                   |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Realtime shows nothing on prod                | `NEXT_PUBLIC_GA_MEASUREMENT_ID` not set, or set but **not redeployed**                                                                             | Confirm the value in Vercel (Production) and **redeploy** — `NEXT_PUBLIC_*` bakes at build.                           |
| Data appears, but can't split by mountain     | `mountain_id` custom dimension not registered (or event-parameter name mismatch)                                                                   | A3 — create it, **Scope = Event**, **Event parameter = `mountain_id`** exactly. No backfill.                          |
| Page views look ~2× too high                  | Enhanced measurement's **"Page changes based on browser history events"** is on — it emits a second, `mountain_id`-less `page_view` per navigation | A2 — untick it on the Web stream.                                                                                     |
| An early automatic event has no `mountain_id` | `gtag('set', { mountain_id })` runs when `AnalyticsTracker` hydrates; anything gtag emitted before that misses it                                  | Expected and rare — automatic events need user interaction, which comes after hydration.                              |
| No event has `mountain_id` at all             | Production is on a **pre-M7** build still using the Firebase SDK                                                                                   | A0 — promote M7. The Firebase analytics path cannot send the parameter.                                               |
| Works on prod but not on Preview / `dev`      | Env var not ticked for **Preview**                                                                                                                 | Add the var to the Preview environment too (or accept that Preview is intentionally analytics-free).                  |
| Nothing locally in `npm run dev`              | By design — the var isn't set locally, so no script loads                                                                                          | Expected. Test analytics on a real deploy, not locally.                                                               |
| Your own visits don't show in DebugView       | DebugView needs debug mode                                                                                                                         | Use the GA Debugger extension or `?debug_mode=1`.                                                                     |
| Wrong `mountain_id` value on a page           | The Host isn't mapped to the tenant (dev path vs prod subdomain)                                                                                   | Check the mountain's `domains` in `mountains.json`; see [new-mountain-setup.md](../deployment/new-mountain-setup.md). |

---

_Implementation reference (for developers): the gtag snippet lives in `src/app/layout.tsx`
(gated on `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `send_page_view:false`) and
`src/components/AnalyticsTracker.tsx` emits the per-route `page_view` — first calling
`gtag('set', { mountain_id })` so the tenant rides on **every** subsequent event, including
GA4's automatic Enhanced-measurement ones. Decoupled from the Firebase SDK in multi-mountain
plan M7; the `set` call was added 2026-07-26 when Enhanced measurement was switched on._
