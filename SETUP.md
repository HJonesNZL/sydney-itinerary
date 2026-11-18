# Shared itinerary app

A buildless mobile web app. `web/` contains only safe sample content and public configuration. Private itinerary values stay in Google Sheets; access tokens live only in browser memory. No service worker caches itinerary data.

## Run locally

`npm test` then `npm run preview`; open http://127.0.0.1:4173.

## GitHub and Google setup

1. The personal account HJonesNZL is verified, including an existing signed-in GitHub Desktop session inspected19November. The CLI login remains invalid. Local source is committed, but no remote repository exists yet. Desktop's repository dialog could not be reliably operated through automation. Use that existing session to add this local repository and publish a private code repository; never add `private/`, `.wk/`, `.pw/` or `.env` files. Review audience before enabling Pages, which must contain only the generic shell.
2. Publish `web/` using GitHub Pages. A private repository does not automatically make its Pages site private. This project permits only the generic app shell to be public; actual Sheet values must remain behind Google authorization.
3. In Google Cloud, first inspect and safely reuse an existing authorized OAuth Web client. Creating new credentials is blocked under the current instructions and requires Henry’s explicit authorization. The eventual configuration needs Sheets API and a Web client with the exact GitHub Pages HTTPS origin as an authorized JavaScript origin. For testing, also allow http://127.0.0.1:4173 and add each verified Google account as an OAuth test user. An external testing consent screen may have access limits; prepare production consent before relying on it for a long trip.
4. Set the public OAuth client ID and private spreadsheet ID in `web/config.js`. Client IDs and Sheet IDs are identifiers, not credentials. Never put a client secret, service-account key, refresh token, or bearer token in a repository or frontend.
5. Keep Drive sharing Restricted. Verify Max's exact Google identity with Henry, then grant editor access without sending a notification if possible. The available share tool can notify recipients, so it was deliberately not used. Henry will send the link himself.
6. Open the HTTPS app in Safari, authorize Google Sheets read-only access using an account with Sheet access, and check it reads only `Published!A1:T1000`. This scope can read spreadsheets the user can access; tokens are short-lived and kept only in memory. No persistent offline itinerary cache is implemented.
7. On iPhone Safari use Share > Add to Home Screen. Manifest, relative scope/start URL, Apple meta tags and 180/192/512px icons are present. Real iPhone installation and Google sign-in in standalone mode require device testing.

## Publishing model

One row per item in Itinerary. Confirmed (last column T) is a native boolean checkbox: checked renders filled/Confirmed. Ordinary unchecked rows render outlined/Tentative, preserving deliberately visible ideas. A row with a private-pick: ID is excluded while unchecked and included only after confirmation. Scratch drafts is always excluded. Sheet editors can see Scratch drafts; it is private from app publication, not from other editors.

The active scheduled task is recorded in ignored private/CONTEXT.md. It snapshots the private Sheet around 23:00 Australia/Sydney, including DST. Ask for an on-demand publish to run the same operation. App Refresh reads the latest Published snapshot; it never publishes current edits.

The optional `scripts/Code.gs` and `scripts/publisher.js` provide an Apps Script alternative. Do not install its trigger while the scheduled task is active, to avoid duplicate publishers. Copy publisher.js into Publisher.gs in a bound Apps Script project, then Code.gs; authorize and run installDailyPublisher only after disabling the existing scheduled task. Script triggers run around 23:00 ±15 minutes, not exact to the minute.

Columns: Activity, Date, Start, End, Cost NZD, Location, Transport, Booking/Map Link, Notes, Original amount, Currency, Cost basis, AUD to NZD, Rate date, ID, Start zone, End zone, End date, Payment status, Confirmed. Use ISO date text and HH:mm:ss, with Pacific/Auckland or Australia/Sydney zones. For untimed items leave Start empty. Set date for visible ideas. Blank prices remain unknown. Known actual NZD overrides a conversion; otherwise snapshot conversion prefixes Cost NZD with ≈ and retains originals. Per person totals assume two travellers. Confirmed and tentative known-cost totals include both; check tentative status before treating the total as committed spending.

## Remaining verification

The first nightly private Sheet snapshot and its retained backup have been independently read back and compared with the production calculation. Rebuilt WebKit26.4 tests and native macOS Safari checks now pass as described in WEBKIT-TESTING.md. GitHub deployment, browser OAuth, authenticated Safari refresh and real iPhone installation still require verification. No published app URL exists yet. Generic web/ contains sample content; ignored private/draft contains the actual saved snapshot and is localhost-only.

## Minimal handoff after connection checks

Unlock the Mac mini first so its existing browser sessions can be inspected. The separate in-app browser is currently signed out of GitHub and Google Cloud. If native sessions are also absent, sign in yourself to the verified personal GitHub account and your Google Cloud owner account. No password or token needs to be shared in chat. Existing OAuth configuration can be inspected after sign-in; none has been found in local project sources. Do not create a new OAuth credential under the current restriction without explicit authorization. Provide Max's exact Google sharing email before any sharing step. The real Sheet and scheduled private snapshot task can continue without web hosting.

## Research selection
Use the Sheet’s Pick to itinerary tab. Copy A:S of one normalized template to an empty Itinerary row; paste values, edit dates/times/prices, and retain its unique private-pick: ID. Keep final Confirmed T unchecked while deciding. It remains excluded from the next snapshot until checked; unchecking it excludes it again on the next publish. Ordinary IDs preserve deliberately visible tentative ideas. Status U detects prior promotion; main ID validation and publisher duplicate rejection prevent duplicate promotion. No scripts or desktop-only buttons required; native mobile Sheets copy/paste is the intended path, but actual two-editor mobile testing awaits Max’s verified sharing identity.

Static assets use an explicit version query for Safari cache refresh. On code/config updates, bump the version in index.html and app.js imports together. Published snapshot requests always use no-store independently.

## Private draft review

The Mac-only review copy lives in ignored `private/draft/`. Read current Itinerary values into `private/draft-source.json` with `{sheetUrl, rows}` using the connected Sheet tool, then run `node scripts/prepare-draft.mjs`. Serve it with `python3 -m http.server 4175 --bind 127.0.0.1 --directory private/draft`. Open http://127.0.0.1:4175 on this Mac. This is a static local draft, not live Sheet sync and not a publication. It excludes unconfirmed private-pick rows and never reads Scratch drafts. Do not upload this directory. The generic deployable source remains `web/`.

OAuth requests only Sheets read-only access with include_granted_scopes=false and checks the returned grant/lifetime before keeping a token in memory. See https://developers.google.com/identity/oauth2/web/reference/js-reference . Personal GitHub Pages can host a generic shell; do not mistake repository privacy for private Pages hosting. Private Pages publishing is an Enterprise Cloud organization feature: https://docs.github.com/en/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site . Actual itinerary values must stay behind Google authorization.
