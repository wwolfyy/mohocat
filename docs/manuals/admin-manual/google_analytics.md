# Google Analytics (GA4) — Setup & Operations Guide

> **Audience:** the **owner** (this is an infrastructure/console task, not a `/admin` CMS
> task). Part of the [Admin Manual](./README.md); the one-line version lives in
> [§9 → Analytics](./README.md#9-configuration--operations-owner--developer).
>
> **What you'll do here:** create/confirm one GA4 property, register a `mountain_id` custom
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
- **⚠️ `mountain_id` must be registered before the traffic you want to see.** GA4 only records
  a custom dimension from the moment it's registered — it **does not backfill**. So register it
  now, before a second mountain ever goes live.

---

## Part A — One-time setup (owner)

### A1. Get (or confirm) the GA4 Measurement ID

1. Go to **[Google Analytics](https://analytics.google.com/)** → **Admin** (gear, bottom-left).
2. Under **Property**, pick the existing 산냥이집냥이 property, or **Create property** if there
   isn't one (name it e.g. `산냥이집냥이 / mohocats`, set the time zone to `(GMT+09:00) Seoul`
   and currency to KRW).
3. **Admin → Data streams → Web.** Create a Web stream for the site domain
   (`https://mohocats.org` / your production domain) if none exists.
4. Copy the **Measurement ID** — it looks like **`G-XXXXXXXXXX`**. This is the value you'll put
   in Vercel in A3.

> One property, one Measurement ID, for all mountains. Do **not** create a separate property
> per mountain — the `mountain_id` dimension (next step) is how mountains are separated.

### A2. Register the `mountain_id` custom dimension ⚠️ do this before any second-mountain traffic

1. **Admin → (Property column) → Custom definitions → Custom dimensions.**
2. **Create custom dimension:**
   - **Dimension name:** `mountain_id` (this is what you'll see in reports)
   - **Scope:** **Event**
   - **Event parameter:** `mountain_id` (must match exactly — this is the field the app sends)
   - Description (optional): "Which mountain/tenant the page belongs to (geyang, manisan, …)."
3. **Save.**

Without this step, page views still arrive but you **cannot break them down by mountain**, and
GA4 will not retroactively add the breakdown once you register it later. Register it once, up
front.

### A3. Set the environment variable in Vercel and redeploy

1. **Vercel dashboard → the mohocats project → Settings → Environment Variables.**
2. Add:
   - **Key:** `NEXT_PUBLIC_GA_MEASUREMENT_ID`
   - **Value:** the `G-XXXXXXXXXX` from A1
   - **Environments:** tick **Production** and **Preview** (Preview lets you sanity-check on
     `dev` deploys; leave it off if you'd rather keep Preview analytics-free).
3. **Redeploy.** `NEXT_PUBLIC_*` variables are baked in **at build time**, so a running
   deployment won't pick up the new value until it's rebuilt — trigger a redeploy (any push to
   the branch, or Vercel → Deployments → ⋯ → Redeploy).
4. _(Cleanup, optional)_ The old `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` is no longer used for
   analytics and can be removed from Vercel.

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

Once `mountain_id` is registered (A2) and traffic has flowed, you can slice any report by it:

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

| Symptom                                   | Likely cause                                                                     | Fix                                                                                                                   |
| ----------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Realtime shows nothing on prod            | `NEXT_PUBLIC_GA_MEASUREMENT_ID` not set, or set but **not redeployed**           | Confirm the value in Vercel (Production) and **redeploy** — `NEXT_PUBLIC_*` bakes at build.                           |
| Data appears, but can't split by mountain | `mountain_id` custom dimension not registered (or event-parameter name mismatch) | A2 — create it, **Scope = Event**, **Event parameter = `mountain_id`** exactly. No backfill.                          |
| Works on prod but not on Preview / `dev`  | Env var not ticked for **Preview**                                               | Add the var to the Preview environment too (or accept that Preview is intentionally analytics-free).                  |
| Nothing locally in `npm run dev`          | By design — the var isn't set locally, so no script loads                        | Expected. Test analytics on a real deploy, not locally.                                                               |
| Your own visits don't show in DebugView   | DebugView needs debug mode                                                       | Use the GA Debugger extension or `?debug_mode=1`.                                                                     |
| Wrong `mountain_id` value on a page       | The Host isn't mapped to the tenant (dev path vs prod subdomain)                 | Check the mountain's `domains` in `mountains.json`; see [new-mountain-setup.md](../deployment/new-mountain-setup.md). |

---

_Implementation reference (for developers): the gtag snippet lives in `src/app/layout.tsx`
(gated on `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `send_page_view:false`) and the per-route
`page_view` + `mountain_id` is emitted by `src/components/AnalyticsTracker.tsx`. Decoupled from
the Firebase SDK in multi-mountain plan M7._
