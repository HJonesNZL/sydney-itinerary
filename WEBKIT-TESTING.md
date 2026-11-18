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
