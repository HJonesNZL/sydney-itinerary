# WebKit audit setup

Rebuilt 19 November 2026 from the user-supplied Family Smoothies handoff. The original temporary rig was deleted; its surviving look.py and /Users/henryjones project paths are also absent on this Mac. This project retains the same Python Playwright / WebKit approach, iPhone 13 touch configuration, and freeze-all-finite-animations frame method. It is a reconstruction, not a run of the deleted scripts.

Verified environment: macOS 15.7.2, Python 3.9, Playwright 1.60.0, WebKit 26.4 (build2287). The handoff's Node/Homebrew and OS paths do not describe this machine. No system-wide package installation.

From this project directory:

```sh
/usr/bin/python3 -m venv .wk
.wk/bin/pip install -r tests/requirements-webkit.txt
PLAYWRIGHT_BROWSERS_PATH="$PWD/.pw" .wk/bin/python -m playwright install webkit
```

For the private saved snapshot review, first populate private/draft-source.json from the restricted Sheet using the existing authorized workflow, then:

```sh
node scripts/prepare-draft.mjs
python3 -m http.server 4175 --bind 127.0.0.1 --directory private/draft
```

In another terminal in this directory:

```sh
PLAYWRIGHT_BROWSERS_PATH="$PWD/.pw" .wk/bin/python tests/webkit_audit.py
PLAYWRIGHT_BROWSERS_PATH="$PWD/.pw" .wk/bin/python tests/webkit_details.py
npm test
```

Evidence is under ignored private/webkit-audit: report.json, details-report.json, viewport/full-page images, frozen 0/100/200/300ms frames and a scrolled 150ms capture. These contain private itinerary content. Never commit or publish that directory. .wk and .pw are also ignored.

Coverage: six viewport sizes320×568 through430×932 plus844×390 landscape; actual saved snapshot content and confirmation counts; horizontal overflow; three views; rapid real touch navigation; history and scroll restoration; frozen and unfrozen transitions; OS reduced motion; keyboard control activation; expanded long notes; focus rescue; resize interruption; safe outbound-link attributes. Screenshot inspection supplements assertions, which do not prove absence of every visual overlap.

Fixes from the audit: remove the sculpture's transform-overriding entrance animation; reserve more title space at320px; rescue focus when its old view is hidden; handle intentionally skipped transition ready promises. On navigation requiring a document scroll change, use a live entrance animation instead of capturing the old screen, avoiding the handoff's documented WebKit scroll-capture risk while retaining native page scrolling. Same-position navigation keeps View Transitions. Hidden documents do not start motion.

One extra harness hook initially returned an assigned function; Playwright invoked it and began an empty transition. It was corrected to a void-returning IIFE, and clean runs replaced those captures. Its initial ghost frame is not app-defect evidence.

Native macOS Safari was separately checked through its UI: nine items, local flight times, confirmation labels, budget total, view changes, browser Back, motion toggle and expanded home-screen instructions. This is not an iPhone test.

Still requires verification on a real iPhone: Safari touch/compositor behavior, standalone home-screen install, swipe-back, enlarged OS text/VoiceOver and frame-rate smoothness. Google-authenticated Sheet reads and private shareable hosting are separate unfinished setup; these local tests do not claim either.

## Reference-led redesign continuation

The schedule layout was redesigned using the supplied frosted UI and itinerary references, with the mood-journal image explicitly selected as the main palette. The audit derives expected activity titles/counts/states from the saved Published fixture. It allows horizontal scrolling only inside the date strip, while document width must still match the viewport.

Additional interaction coverage:

```sh
PLAYWRIGHT_BROWSERS_PATH="$PWD/.pw" .wk/bin/python tests/webkit_redesign.py
```

This checks fixed bottom navigation while scrolling, date jumps and history, ongoing multi-day plans, search/no-results/clear/Escape focus, flight timezones, narrow widths and larger-text stress. The larger-text check is a CSS stress test, not a VoiceOver or iPhone OS text-size certification. Reports and screenshots remain under ignored private/webkit-audit.

The generic app icon can be regenerated from its SVG source:

```sh
PLAYWRIGHT_BROWSERS_PATH="$PWD/.pw" .wk/bin/python scripts/build-icons.py
```

Palette switching has an additional suite:

```sh
PLAYWRIGHT_BROWSERS_PATH="$PWD/.pw" .wk/bin/python tests/webkit_themes.py
```

It checks Cobalt in all three views at six viewport sizes, unchanged plan titles, keyboard switching, reload persistence, the isolated preference key, blocked storage and reduced motion. Evidence lives under ignored private/webkit-audit/themes. Native macOS Safari also verifies the control and colour change.

Tactile motion coverage:

```sh
PLAYWRIGHT_BROWSERS_PATH="$PWD/.pw" .wk/bin/python tests/webkit_motion.py
```

The suite records real animation-frame scroll positions and landing transforms in both themes, checks bounded overshoot and completion focus, interrupts journeys with touch and desktop wheel input, changes views mid-journey, holds/releases a button, and verifies instant reduced-motion navigation. Private evidence is under private/webkit-audit/motion. Mobile WebKit does not support Playwright mouse-wheel input; wheel cancellation is therefore tested in a desktop WebKit context, while touch cancellation is tested in the iPhone context.

The latest motion pass uses live content entrances for every view change. This supersedes the earlier captured View Transition setup: frozen 100/200/300ms review exposed blank incoming content in WebKit, while the live entrance shows the destination immediately. The audit now freezes the actual live animations and asserts the new view and budget are visible. History restoration remains 950→950. Details keep stable height after a height-animation experiment shifted scroll anchoring.

## 19 November — stops, snapshot forecasts and offline storage

18 Node checks pass, including unsafe map URLs, nested branches, 20-column publication metadata, forecast missing/range/return-day cases, and the localhost origin denying private paths/unreviewed releases. Existing six-size WebKit audit and motion suites pass; redesign/themes suites pass against the updated ten-item local review. The actual-data stop review passes 320/390px, nine independent links, three explicitly labelled address fallbacks, repeated close/reopen and browser Back.

`tests/webkit_snapshot.py` uses synthetic publication data on an owned loopback fixture server. Both palettes at320/390, details/branches, normal Refresh to newer data, cache allowlist/noAPIcache, browser-process close/reopen with origin server STOPPED, saved IndexedDB data/weather/details, subsequent network-offline interactions, online recovery, Clear saved/reload and reduced motion pass. Reports/screenshots stay in ignored private/webkit-audit. Refresh waits for the IndexedDB transaction to commit before the test terminates the browser; interrupted writes are not claimed durable.

Playwright WebKit offline emulation rejected an initial service-worker navigation when set_offline(true) was applied before navigation. The successful cold-reopen test stops the origin server instead, then applies offline emulation after the cached page loads. This is not evidence that the combined initial offline-emulation case passed. Upstream primary report: https://github.com/microsoft/playwright/issues/42775 . Physical iPhone Safari/Home Screen and OS storage eviction remain unverified. Native Safari continuation was blocked because the Mac locked; no unlock/security setting was changed.

Sole-owner integration continuation:20Nodechecks now pass, including the shared buildSnapshot entrypoint retaining frozen source/weather until another explicit calculation and missing/out-of-range provider responses. WebKitSnapshot re-run passes with request tracing:Refresh/online recovery issue onlyGET/api/published; noSheetwrite/draftpublicationrequest. This is a syntheticendpoint test. Separately, a real connectedSheetread was calculated locally into10items/20cols/7stopgroups/9links and liveproviderforecast; noactualprivatePublishedwrite ornightlywiring occurred.

19Novpublicsharing/footerupdate:staticPagespackageverifiedunder/sydney-itinerary/subpathinWebKit,bothpalettesat320/390/1100,10plans/13AppleMapslinks/fullplanningnotes/footerbelowallthreeviews/nooverflow. ThreefoodbusinesscardsverifiedinAppleMapsUI(Ragazzi,ContinentalNewtown,FishMarketGlebe);KingStreetshoppingareaexplicitsearchlink. Footercontrols/statusmovedoutsideheroandafterallviewcontent.Assetversion2026111906;publicfirstloadfetchessnapshotautomatically.20Nodechecks+updatedoffline/GET-onlySnapshotfixturepass. RealdeployedURLtestingrecordedprivatelyafterrelease.

19NovPetscorner:fourthnavigationviewwithoriginalpawiconandemptygallery,matchingBlush/Cobalt,readyforuserphotos.Noassetsinvented.Petsdirecthash/reload/Back/Forward,fourbuttonnav320/390/1100,bothpalettesandfooterlayoutverified;offlinecachedshellPetsviewcheckadded.Assetversion2026111907.

19NovPlumpalette:replacedBlushwithreference#000215/#70566D/#42273B/#ADC8C0/#9EE493/#EEEEEEacross4views/dialogs/controls/Pets/appicon.NewthemePlum,legacyBlushpreferenceautomigrates,Cobaltsettledcomputedcolourscompareidenticallyacross11surfaces.Theme6sizes/keyboard/persistence/blockedstorage/reducedmotionandlegacytestpass;public6contextsPlum+Cobalt320/390/1100all4views13Maps/footer/hash/history/reloadpass;20Nodepass.Assetversion2026111908. Contrast:Whisper/ChineseViolet5.58,Whisper/DarkPurple11.42,DarkPurple/LightGreen8.82.GreenlabelsurfacesuseDarkPurple/deepergradienttoavoidlowercontrastatbrightvioletend.
