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
| task | 4 | 0 | 1 | 0 | **5** |
| bug | 0 | 0 | 49 | 0 | **49** |
| change | 0 | 0 | 89 | 0 | **89** |
| decision | 0 | 0 | 0 | 0 | **0** |
| question | 1 | 0 | 0 | 0 | **1** |
| **total** | **5** | **0** | **139** | **0** | **144** |

## Open work

| id | type | status | outcome | plan | title | detail |
| --- | --- | --- | --- | --- | --- | --- |
| R-0139 | task | open | — | — | The about page's 대표 사진 has no upload control | [detail](./records/R-0139.md) |
| R-0140 | task | open | — | — | `view-analytics` is enforced by the rules and held by nobody | [detail](./records/R-0140.md) |
| R-0141 | task | open | — | — | `npx eslint <file>` cannot resolve the shared config, so per-file linting is broken | [detail](./records/R-0141.md) |
| R-0142 | task | open | — | — | Two live login pages, and the one members get bounced to has no 집사등록 and no tests | [detail](./records/R-0142.md) |
| R-0144 | question | open | — | — | Should the about page render `sections`? | [detail](./records/R-0144.md) |

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
| R-0050 | change | done | — | — | the admin CMS is measured against `design.md` for the first time (colour plan Phase 5) | [detail](./records/R-0050.md) |
| R-0051 | change | done | — | — | a 동참 notification that never sent is now visible to the visitor and to the operator | [detail](./records/R-0051.md) |
| R-0052 | change | done | — | — | `npm run smtp:verify`, because a broken 동참 email is invisible from every direction | [detail](./records/R-0052.md) |
| R-0053 | change | done | — | — | the last raw colour hexes leave two components, and the design reference finally says the palette is global | [detail](./records/R-0053.md) |
| R-0054 | change | done | — | — | 급식현황's freshness scale goes green→red ⇒ blue→red, and becomes readable | [detail](./records/R-0054.md) |
| R-0055 | change | done | — | — | brand yellows adopt the `brand`/`accent` tokens (Phase 2) | [detail](./records/R-0055.md) |
| R-0056 | change | done | — | — | the colour palette becomes global; per-tenant theming (M8) is withdrawn | [detail](./records/R-0056.md) |
| R-0057 | change | done | — | — | 냥이들 re-bakes on a cat edit (closes BACKLOG **B3**) | [detail](./records/R-0057.md) |
| R-0058 | change | done | — | — | a video's YouTube 설명 is taken verbatim on every composer; 공지/입양홍보 stop inheriting the post body | [detail](./records/R-0058.md) |
| R-0059 | change | done | — | — | the rename cascade reaches 엄마/애 too, found by dry-running it on real data | [detail](./records/R-0059.md) |
| R-0060 | change | done | — | — | migration scripts get an emulator-backed test suite, and `rename-cat.js` gets a guard | [detail](./records/R-0060.md) |
| R-0061 | change | done | — | — | renaming a cat is a cascade, and now there is a script for it | [detail](./records/R-0061.md) |
| R-0062 | change | done | — | — | 급식현황 publishing is gated on a confirmation that names the 급식소 it will stamp | [detail](./records/R-0062.md) |
| R-0063 | change | done | — | — | authors may delete their own posts; reply authors may edit and delete their replies | [detail](./records/R-0063.md) |
| R-0064 | change | done | — | — | 집사톡 members can attach media (narrow `upload-own-*`), and §10n turned out to be live | [detail](./records/R-0064.md) |
| R-0065 | change | done | — | — | the dead deploy targets, swept a second time | [detail](./records/R-0065.md) |
| R-0066 | change | done | — | — | the about page has one source of truth: the CMS | [detail](./records/R-0066.md) |
| R-0067 | change | done | — | — | 집사톡 is edited by its create composer too | [detail](./records/R-0067.md) |
| R-0068 | change | done | — | — | the post detail page renders in the shared post shell | [detail](./records/R-0068.md) |
| R-0069 | change | done | — | — | 공지사항 / 입양홍보 are edited by their create composer | [detail](./records/R-0069.md) |
| R-0070 | change | done | — | — | 집사톡 capped at one video + one photo, via static config | [detail](./records/R-0070.md) |
| R-0071 | change | done | — | — | 앱 관리's 게시물 컬렉션 설정 removed; the dashboard tile now counts for real | [detail](./records/R-0071.md) |
| R-0072 | change | done | — | — | The modal albums converged onto the shared MediaTile | [detail](./records/R-0072.md) |
| R-0073 | change | done | — | — | Video tiles name the clip; the mislabelled "제목 없음" filler is gone | [detail](./records/R-0073.md) |
| R-0074 | change | done | — | — | Signup consent recorded, a default role, and PII out of the auth logs | [detail](./records/R-0074.md) |
| R-0075 | change | done | — | — | 이 냥이 링크: a share chip in the cat modal | [detail](./records/R-0075.md) |
| R-0076 | change | done | — | — | one cat is now linkable: `/pages/cats?cat=<id>` | [detail](./records/R-0076.md) |
| R-0077 | change | done | — | — | the 공지사항 detail page's "중요한 안내사항" banner is gone | [detail](./records/R-0077.md) |
| R-0078 | change | done | — | — | a post's media shows its 제목/설명/태그, on every surface | [detail](./records/R-0078.md) |
| R-0079 | change | done | — | — | 입양홍보 posts can pop up on a site visit, like 공지사항 | [detail](./records/R-0079.md) |
| R-0080 | change | done | — | — | the three composers converge: per-file media, cat tagging, no name collisions | [detail](./records/R-0080.md) |
| R-0081 | change | done | — | — | video uploads no longer invent tags nobody chose | [detail](./records/R-0081.md) |
| R-0082 | change | done | — | — | video uploads show a progress bar | [detail](./records/R-0082.md) |
| R-0083 | change | done | — | — | admin CMS idle timeout raised from 2 hours to 24 | [detail](./records/R-0083.md) |
| R-0084 | change | done | — | — | 내 집사 정보 offers a 관리자 shortcut to members who have CMS access | [detail](./records/R-0084.md) |
| R-0085 | change | done | — | — | 집사게시판 stops composing media; 집사톡 becomes the media composer; playlists go per-mountain | [detail](./records/R-0085.md) |
| R-0086 | change | done | — | — | Removed: the `YOUTUBE_REFRESH_TOKEN` env var and the command-line token workflow | [detail](./records/R-0086.md) |
| R-0087 | change | done | — | — | Decision: one shared YouTube channel for all mountains (per-mountain channels rejected) | [detail](./records/R-0087.md) |
| R-0088 | change | done | — | — | Analytics: `mountain_id` becomes a GA4 default parameter (all events, not just `page_view`) | [detail](./records/R-0088.md) |
| R-0089 | change | done | — | — | Auth gate on the 7 ungated media / credential API routes (one deleted) | [detail](./records/R-0089.md) |
| R-0090 | change | done | — | — | Multi-mountain M8: per-tenant theming (minimal — primary color only) | [detail](./records/R-0090.md) |
| R-0091 | change | done | — | — | Multi-mountain M7: analytics decoupled from Firebase → gtag.js + `mountain_id` | [detail](./records/R-0091.md) |
| R-0092 | change | done | — | — | Multi-mountain M6: per-tenant upload namespacing (scope corrected mid-flight) | [detail](./records/R-0092.md) |
| R-0093 | change | done | — | — | CI: emulator-backed `rules` job (mountain-aware Firestore rules now gated) | [detail](./records/R-0093.md) |
| R-0094 | change | done | — | — | Multi-mountain M5.4b: two-tenant isolation e2e (M5 code-complete) | [detail](./records/R-0094.md) |
| R-0095 | change | done | — | — | Multi-mountain M5.4a: second stub tenant (`manisan`) + `hidden` config flag | [detail](./records/R-0095.md) |
| R-0096 | change | done | — | — | Multi-mountain M5.3 route audit: Admin-SDK routes verified tenant-safe; prod-cutover order corrected | [detail](./records/R-0096.md) |
| R-0097 | change | done | — | — | Complexity retirement executed (P0–P6): forms + admin editors on shared primitives; alerts → Modal dialogs | [detail](./records/R-0097.md) |
| R-0098 | change | done | — | — | Tier 1 write migration: role assignment → Admin-SDK route, audit log restored | [detail](./records/R-0098.md) |
| R-0099 | change | done | — | — | Playwright e2e main-plan suites complete (Phases 2–6) + Phase 7 flake audit | [detail](./records/R-0099.md) |
| R-0100 | change | done | — | — | Playwright e2e harness + CI (emulator-backed) — prerequisite plan executed | [detail](./records/R-0100.md) |
| R-0101 | change | done | — | — | Dead-code removal (≈3,200 LOC across 19 files + 2 method-level items) | [detail](./records/R-0101.md) |
| R-0102 | change | done | — | — | Compliance: 개인정보처리방침 + 이용약관 pages, footer links, consent, 국외 이전 | [detail](./records/R-0102.md) |
| R-0103 | change | done | — | — | Account withdrawal (탈퇴) / deletion flow | [detail](./records/R-0103.md) |
| R-0104 | change | done | — | — | Adoption page: enlarge 소식 heading + post title/content fonts | [detail](./records/R-0104.md) |
| R-0105 | change | done | — | — | Mobile UI polish: mypage edit rows + login/logout menu pills | [detail](./records/R-0105.md) |
| R-0106 | change | done | — | — | Converge public/auth CTAs onto the shared `<Button>` primitive | [detail](./records/R-0106.md) |
| R-0107 | change | done | — | — | Back button / swipe-back closes modal instead of navigating away | [detail](./records/R-0107.md) |
| R-0108 | change | done | — | — | Mobile lightbox: pinch-to-zoom on images | [detail](./records/R-0108.md) |
| R-0109 | change | done | — | — | Mobile nav: reduced the top bar height | [detail](./records/R-0109.md) |
| R-0110 | change | done | — | — | Mobile nav: close the hamburger menu on outside click | [detail](./records/R-0110.md) |
| R-0111 | change | done | — | — | Map: moved the click-a-pin nudge card from bottom-left to top-left | [detail](./records/R-0111.md) |
| R-0112 | change | done | — | — | Cleanup: `triggerCatRevalidate` → `triggerPublicRevalidate` | [detail](./records/R-0112.md) |
| R-0113 | change | done | — | — | Admin: 급식소 관리 (feeding-station points) CMS | [detail](./records/R-0113.md) |
| R-0114 | change | done | — | — | Map: per-Point title-label side override (`labelSide`) | [detail](./records/R-0114.md) |
| R-0115 | change | done | — | — | Map: per-mountain clustering toggle (`map.clustering` in mountains.json) | [detail](./records/R-0115.md) |
| R-0116 | change | done | — | — | Mobile: portrait-only map (landscape rotate-notice) + one-line nav in landscape | [detail](./records/R-0116.md) |
| R-0117 | change | done | — | — | Mountain selector label: 계양산 냥이들 → 계양산 | [detail](./records/R-0117.md) |
| R-0118 | change | done | — | — | Mobile nav menu: drop category headers, separate groups with hairline rules | [detail](./records/R-0118.md) |
| R-0119 | change | done | — | — | Mobile nav menu: fix mislabeled section header + prevent clip on short viewports | [detail](./records/R-0119.md) |
| R-0120 | change | done | — | — | Album search/filter bar de-emphasized on mobile | [detail](./records/R-0120.md) |
| R-0121 | change | done | — | — | Mobile map marker-clustering radius is now per-mountain config | [detail](./records/R-0121.md) |
| R-0122 | change | done | — | — | Photo gallery: translucent cat-name tags + drop album icon heroes | [detail](./records/R-0122.md) |
| R-0123 | change | done | — | — | 냥이들 thumbnails back to square + search/filter de-emphasis + 동영상앨범 rename | [detail](./records/R-0123.md) |
| R-0124 | change | done | — | — | New public page: 냥이들 (browse-all-cats) | [detail](./records/R-0124.md) |
| R-0125 | change | done | — | — | Public hand-rolled-button sweep (→ shared `<Button>` primitive) | [detail](./records/R-0125.md) |
| R-0126 | change | done | — | — | Phase C: 집사메뉴/butler brand restyle + cross-cutting button cleanup | [detail](./records/R-0126.md) |
| R-0127 | change | done | — | — | Admin post editing (all post types) | [detail](./records/R-0127.md) |
| R-0128 | change | done | — | — | 입양홍보 posts + per-cat 입양정보 | [detail](./records/R-0128.md) |
| R-0129 | change | done | — | — | Redesign video-album tiles (caption footer + cat-name tags) | [detail](./records/R-0129.md) |
| R-0130 | change | done | — | — | Enhance the cat-management grid header (color + sort affordance) | [detail](./records/R-0130.md) |
| R-0131 | change | done | — | — | Harden auth so a failed Firestore read no longer signs users out | [detail](./records/R-0131.md) |
| R-0132 | change | done | — | — | Add idle session timeout to the admin CMS (2 hours) | [detail](./records/R-0132.md) |
| R-0133 | change | done | — | — | Add show/hide password toggle to the login modal | [detail](./records/R-0133.md) |
| R-0134 | change | done | — | — | Change site (browser-tab) title to 산냥이집냥이 | [detail](./records/R-0134.md) |
| R-0135 | change | done | — | — | Add `tsc --noEmit` type-check to the pre-commit hook | [detail](./records/R-0135.md) |
| R-0136 | change | done | — | — | Emphasize capital letters in the About subtitle (MOHOCATS wordplay) | [detail](./records/R-0136.md) |
| R-0137 | change | done | — | — | Display the 부제 (subtitle) on the About/intro page | [detail](./records/R-0137.md) |
| R-0138 | change | done | — | — | Remove 문의 (contact) link from the footer | [detail](./records/R-0138.md) |
| R-0139 | task | open | — | — | The about page's 대표 사진 has no upload control | [detail](./records/R-0139.md) |
| R-0140 | task | open | — | — | `view-analytics` is enforced by the rules and held by nobody | [detail](./records/R-0140.md) |
| R-0141 | task | open | — | — | `npx eslint <file>` cannot resolve the shared config, so per-file linting is broken | [detail](./records/R-0141.md) |
| R-0142 | task | open | — | — | Two live login pages, and the one members get bounced to has no 집사등록 and no tests | [detail](./records/R-0142.md) |
| R-0143 | task | done | — | — | `/api/revalidate` never refreshes 냥이들, so cat edits take up to an hour there | [detail](./records/R-0143.md) |
| R-0144 | question | open | — | — | Should the about page render `sections`? | [detail](./records/R-0144.md) |
