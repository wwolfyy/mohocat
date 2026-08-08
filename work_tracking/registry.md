# Work registry

> ⚠️ **Generated file — do not edit.** Regenerate with `node work_tracking/scripts/build.js`.
>
> The source of truth is [`registry.ndjson`](./registry.ndjson); this is the current
> revision of every record, rendered for humans and pull-request review. To change
> anything here, run `checkout.js`, edit `work.json`, then `checkin.js`. See
> [SCHEMA.md](./SCHEMA.md).

## Summary

| type | open | in-progress | done | abandoned | total |
| --- | --- | --- | --- | --- | --- |
| task | 0 | 0 | 0 | 0 | **0** |
| bug | 0 | 0 | 49 | 0 | **49** |
| change | 0 | 0 | 0 | 0 | **0** |
| decision | 0 | 0 | 0 | 0 | **0** |
| question | 0 | 0 | 0 | 0 | **0** |
| **total** | **0** | **0** | **49** | **0** | **49** |

## Open work

_Nothing open._

## Hierarchy

_No records have been broken out into children._

## All records

| id | type | status | outcome | plan | title | detail |
| --- | --- | --- | --- | --- | --- | --- |
| R-0001 | bug | done | — | — | CI's e2e job was red on a test defect, and the retries were doomed by design | [detail](./records/R-0001.md) |
| R-0002 | bug | done | — | — | The e2e suite was sending real email to the production admin, two per run | [detail](./records/R-0002.md) |
| R-0003 | bug | done | — | — | Deleted posts stayed in the collection, and no permission could remove them | [detail](./records/R-0003.md) |
| R-0004 | bug | done | — | — | Every 집사톡 post opened on "Post not found." | [detail](./records/R-0004.md) |
| R-0005 | bug | done | — | — | Hydration mismatch wiped input a visitor had already typed | [detail](./records/R-0005.md) |
| R-0006 | bug | done | — | — | The e2e "flake set" was three real bugs, one of them in app code | [detail](./records/R-0006.md) |
| R-0007 | bug | done | — | — | An uploaded video was recorded as having been filmed the day it was uploaded | [detail](./records/R-0007.md) |
| R-0008 | bug | done | — | — | the 이 냥이 링크 chip did nothing at all on desktop | [detail](./records/R-0008.md) |
| R-0009 | bug | done | — | — | the new `?cat=` deep link kept erasing itself, then stopped opening at all | [detail](./records/R-0009.md) |
| R-0010 | bug | done | — | — | videos deleted from YouTube kept their tile in the public 영상첩 | [detail](./records/R-0010.md) |
| R-0011 | bug | done | — | — | 공지사항 was empty, missing, or untagged for 30 seconds: a Firestore transport probe waiting out its timeout | [detail](./records/R-0011.md) |
| R-0012 | bug | done | — | — | an 입양홍보 post's photos rendered out of proportion with the video beside them | [detail](./records/R-0012.md) |
| R-0013 | bug | done | — | — | expanding an 입양홍보 post showed no image (and never could, if it had a video) | [detail](./records/R-0013.md) |
| R-0014 | bug | done | — | — | a one-header hardening silently blocked every image upload (self-inflicted, same day) | [detail](./records/R-0014.md) |
| R-0015 | bug | done | — | — | every video upload over 4.5 MB failed: the file was POSTed through a Vercel function | [detail](./records/R-0015.md) |
| R-0016 | bug | done | — | — | 촬영일 landed a day early in KST: a calendar date round-tripped through an instant | [detail](./records/R-0016.md) |
| R-0017 | bug | done | — | — | Batch edits reached YouTube but never came back to Firestore: the sync was called with Firestore doc ids | [detail](./records/R-0017.md) |
| R-0018 | bug | done | — | — | Every metadata sync reset a video's 게시일 to "now", reordering the public 영상첩 | [detail](./records/R-0018.md) |
| R-0019 | bug | done | — | — | Batch playlist assignment updated one video (or none): the modal's save ignored the batch selection | [detail](./records/R-0019.md) |
| R-0020 | bug | done | — | — | 자동 날짜 인식's parsed dates silently vanished: it wrote Firestore, and the sync overwrites Firestore from YouTube | [detail](./records/R-0020.md) |
| R-0021 | bug | done | — | — | "Insufficient Permission" on video metadata edits: the admin OAuth flow asked for too few scopes | [detail](./records/R-0021.md) |
| R-0022 | bug | done | — | — | Re-authorizing YouTube fixed nothing: the button writes the token to Firestore, every route read it from env | [detail](./records/R-0022.md) |
| R-0023 | bug | done | — | — | Modal dialog conversion silently canceled the post-submit redirect (App-Router transition vs. modal-unmount re-render) | [detail](./records/R-0023.md) |
| R-0024 | bug | done | — | — | 집사톡 image upload could never have worked (signed-URL response keys drifted in the copy) | [detail](./records/R-0024.md) |
| R-0025 | bug | done | — | — | Every admin role change silently lost its audit entry (permission_logs write denied & swallowed) | [detail](./records/R-0025.md) |
| R-0026 | bug | done | — | — | Intermittent e2e build hang/"markerless bake" — a SECOND page (냥이들) read points via the client Web SDK at build | [detail](./records/R-0026.md) |
| R-0027 | bug | done | — | — | Home-map §7a "no client Firestore" spec: green per-file, red in the full gate | [detail](./records/R-0027.md) |
| R-0028 | bug | done | — | — | Album Lightbox/VideoPlayer spec fails only in the full gate — overlay-intercepted clicks + order-dependent nav | [detail](./records/R-0028.md) |
| R-0029 | bug | done | — | — | Landing map bakes markerless in the e2e harness — points read via client SDK at build (incomplete §7a) | [detail](./records/R-0029.md) |
| R-0030 | bug | done | — | — | Non-admin login fails under the repo Firestore rules (emulator) — `ensureUserExists` self-write denied | [detail](./records/R-0030.md) |
| R-0031 | bug | done | — | — | Logout on /mypage strands the page on a spinner (client redirect never commits) | [detail](./records/R-0031.md) |
| R-0032 | bug | done | — | — | Landscape rotate-notice shows a broken image (GIF filename mismatch) | [detail](./records/R-0032.md) |
| R-0033 | bug | done | — | — | Mobile logout does nothing: confirm modal opens but the button never logs out | [detail](./records/R-0033.md) |
| R-0034 | bug | done | — | — | Mobile hamburger menu stays open across login navigation / after sign-in | [detail](./records/R-0034.md) |
| R-0035 | bug | done | — | — | 급식소 CMS coordinate inputs: can't edit any digit but the last (caret jumps to end) | [detail](./records/R-0035.md) |
| R-0036 | bug | done | — | — | Mobile map pins vanishing / drawn outside the map / stuck pan — the durable fix (replaced markercluster) | [detail](./records/R-0036.md) |
| R-0037 | bug | done | — | — | Mountain-selector dropdown clipped on the left (계양산 → 양산) | [detail](./records/R-0037.md) |
| R-0038 | bug | done | — | — | Mobile map: cat-thumbnail pins vanished on S22 after a pinch-out bounce-back | [detail](./records/R-0038.md) |
| R-0039 | bug | done | — | — | Mobile map: zoom-out grey persisted on S22 (device-dependent floor clamp) + pins | [detail](./records/R-0039.md) |
| R-0040 | bug | done | — | — | Mobile map: cat-thumbnail pins vanished at default zoom (min-zoom clamp regression) | [detail](./records/R-0040.md) |
| R-0041 | bug | done | — | — | Mobile map: zoom-out grey margins, landscape wastes space, can't scroll the page | [detail](./records/R-0041.md) |
| R-0042 | bug | done | — | — | 냥이들 desktop-table thumbnails rendered as vertical ellipses (preflight max-width clamp) | [detail](./records/R-0042.md) |
| R-0043 | bug | done | — | — | `[catmodal:name]` links in posts rendered as broken `<a>` (link-converter ordering) | [detail](./records/R-0043.md) |
| R-0044 | bug | done | — | — | 입양홍보 admin tab showed 급식현황 posts (stale state on failed fetch) | [detail](./records/R-0044.md) |
| R-0045 | bug | done | — | — | Admin force-logout on localhost (cross-tab sign-out from idle background tabs) | [detail](./records/R-0045.md) |
| R-0046 | bug | done | — | — | Map doesn't re-fit on window resize (desktop fixed · mobile pending) | [detail](./records/R-0046.md) |
| R-0047 | bug | done | — | — | Kakao login failure messages shown in English | [detail](./records/R-0047.md) |
| R-0048 | bug | done | — | — | Kakao (social) login errors shown under the email login block | [detail](./records/R-0048.md) |
| R-0049 | bug | done | — | — | Media album hidden behind the cat modal (map flow only) | [detail](./records/R-0049.md) |
