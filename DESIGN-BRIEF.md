# Trip app design brief

## Direction

Build a practical itinerary with a distinctive material language: Westman's substantial, continuous forms inside the quiet, tense visual space of *Trying Times*. Most of the screen belongs to trip information. Give each view at most one original sculptural accent. Keep the main list predictable, the labels direct, and the motion responsive to input.

This brief contains research observations and proposed design decisions, not a claim that the implementation or WebKit audit has passed.

## What the references contribute

**Gustaf Westman: form before colour.** The useful vocabulary is exaggerated thickness, soft silhouettes, repeated rounded lobes, continuous curves, and a small number of legible geometric volumes. His [Curvy Mirror](https://gustafwestman.com/products/curvy-mirror-burgundy) and [Blob Table](https://gustafwestman.com/products/blob-table-cream) use semi-matte lacquer. Their apparent weight comes from proportion and rounded edges, not indiscriminate decoration. The [official catalogue](https://gustafwestman.com/collections/objects) presents objects with space around their silhouettes. Translate these qualities into a substantial selected-navigation backing, a limited family of radii, and controlled inset rims. Avoid a different arbitrary blob on every card.

**The IKEA collection adds a more precise vocabulary.** Its rounded-square plates surround circular wells; oversized saucers establish a visible outer rim; a layered orb opens into an orbital lamp; a spiral supports a separate vessel. These are nested and repeated structures with a clear centre, not merely rounded rectangles. Use that logic for a rim around a total, a three-lobed accent, or two offset elliptical layers. Each motif should have one dominant silhouette and a simpler interior. See the [IKEA release](https://www.ikea.com/au/en/newsroom/range-news/ikea-and-gustaf-westman-set-the-table-with-a-new-collection-designed-for-celebration-pubfe4b9910/) and [eight-page lookbook](https://www.ikea.com/nl/nl/files/pdf/40/0a/400ad420/l2-vinterfint-persboekje-gustaf-westman-pr-pdf-min.pdf), particularly pages 2, 4 and 5. Create original compositions rather than copying individual products.

**James Blake's *Trying Times*: balance, negative space and restraint.** The [artwork](https://music.apple.com/us/album/trying-times/1880811313) contrasts tilted elliptical plates and thin poles with a focused human silhouette. The subdued light, olive-black atmosphere, cream highlights, dark outer frame and small edge typography create concentrated tension. In the [artist interview](https://www.pigeonsandplanes.com/read/james-blake-interview-trying-times-music-industry-2026), Blake relates the spinning plates to maintaining competing responsibilities. Translate the visual balance into a compact elliptical accent, thin rules against thick forms, and calm margins. Do not copy the figure or artwork, scatter poles through the itinerary, or make essential text tiny.

## Digital reference lessons

- [Things](https://culturedcode.com/things/features/) gives the item a clear hierarchy and reveals its secondary fields when needed. Keep date, title, time, location and status visible; disclose longer notes, transport details and booking links within the item.
- [Headspace's design interview](https://developer.apple.com/news/?id=fkfnhq8u) demonstrates playful visual character alongside understandable labels and a deliberately simplified navigation surface. The expressiveness should reside in form and feedback, not a layer of whimsical interface copy.
- [Plan My Trips](https://mytripss.lovable.app/) is useful as an anti-copy reference. Its page uses a large promise, repeated benefit sections, numbered steps and a travel-word marquee. Those belong to a marketing landing page, not this working itinerary. Retain the principle of clear labels and honest data-status disclosure; omit the promotional scaffolding.
- [Lovable OS](https://soelbavola.lovable.app/) was subsequently inspected firsthand in the parent’s in-app browser. Its welcome screen stacks a motivational eyebrow, introduction, calls to action, benefit cards, path cards and proof counters; navigation often has a second explanatory line. That density helps an educational landing page sell a journey, but would repeat obvious actions inside this itinerary. Keep one clear action label and disclose only consequential constraints.
- [NN/G's info-tip guidance](https://www.nngroup.com/articles/info-tips-bad/) argues against redundant explanations, hidden essential constraints and disruptive help overlays. Put consequential information inline: Tentative, local timezone, approximate currency, unknown price and admission exclusions. Keep optional explanations short and adjacent. Do not hide necessary price qualifications merely to reduce visible text.

## Component and layout decisions

1. **Compact header.** Aim for 140–180px on mobile, with a direct trip title and useful date range. Keep the accent around 80–110px and in its own layout area. A tall decorative hero must not push the first item below the useful opening screen.
2. **Navigation.** Use Itinerary, Budget and Notes. A thick rounded backing can compress and settle like a soft object; keep the labels themselves stable. Remove numbered tabs and decorative subtitles.
3. **Cards.** Use a consistent 24–30px base radius and regular internal alignment. Confirmed uses a filled surface; Tentative uses an outline. Both retain explicit text labels. Avoid relying on hue, shape or animation alone.
4. **One accent per view.** Suggested family: an original offset elliptical form for Itinerary; a nested rounded-square rim for Budget; a small three-lobed continuous form for Notes. These are possible compositions, not requirements to add art everywhere. Never put text over an accent.
5. **Typography.** Use a restrained display face only for the trip title or major total, with a readable system face for the working UI. Essential times, prices and statuses need comfortable mobile sizes. Use hierarchy and whitespace before adding extra headings.
6. **Material and palette.** Warm paper and olive-charcoal form the base. Muted sage surfaces, powder blue controls and a limited burgundy/red accent provide contrast. Use a restrained broad highlight or inset shadow for semi-matte depth. Keep grain out of text regions, avoid heavy filters, and do not make every surface glossy.
7. **Copy.** Remove generic narrative, eyebrow labels, subtitle fragments, duplicate legends and footer slogans. Examples to remove from the early draft include “Good days. Loose plans.”, “Days, taking shape”, “A little accounting” and “some still taking shape”. Keep functional state and privacy messages concise. The design should remain expressive with those words removed.

## Motion decisions

Treat the following values as a starting hypothesis for testing. Press feedback can take 140–220ms; a small settling spring can take 300–420ms. The nav backing may compress slightly and overshoot once while text stays unscaled. Page content should use opacity and approximately 6–10px of translation over 220–320ms. Avoid large lateral movement, continuous bobbing, and contour distortion around text.

Only one visual layer should perform the main transition. Do not replay every card entrance after switching views or refreshing data. Cancel superseded animations and let the last requested route win. Preserve scroll per view; make browser back/forward select the correct view without stale callbacks. Never require a user to wait for a transition before another action. With reduced motion, update state directly without spring, translation or scale. These choices follow [Apple's purposeful, brief and interruptible motion guidance](https://developer.apple.com/design/human-interface-guidelines/motion).

## Audit and release gate

- Test at 320, 360, 375, 390 and 430 CSS-pixel widths, plus landscape and increased text size. Check the entire scroll range for clipping, horizontal overflow, overhang, overlapping fixed elements and touch targets smaller than 44px.
- Use real private itinerary content in local-only testing: long titles, full notes, two airport timezones, missing prices, one-participant costs, detail-tab links and both confirmation states. Do not put that fixture in publicly served assets or version control.
- Run deliberate passes for steady layout; disclosure opening/closing; normal transitions; rapid alternating navigation; refresh or disclosure input mid-transition; back/forward; resize/orientation changes; and reduced motion. Inspect intermediate frames as well as settled screenshots.
- Check focus, active navigation, scroll position and visible status after each interrupted transition. Confirm that hidden views cannot receive accidental input and that stale animations cannot restore an older screen.
- Keep the existing Sheet source, private authorization, snapshot retention, and nightly/on-demand publishing behaviour intact. Visual changes must not cause sheet edits to appear immediately.
- The owner supplied the Family Smoothies Claude Code handoff on19November. Its temporary rig was deleted and its paths are absent here. The same Python Playwright/WebKit26.4 approach has been rebuilt in this project and used for iterative tests. See WEBKIT-TESTING.md for commands, results and remaining real-device limits. Private hosting and Google authorization remain separate release requirements.

## Evidence limits

The research used official Westman product pages, the IKEA release and lookbook, album artwork and the artist interview, documented digital examples, and the supplied reference screenshots. The research worker's in-app browser was unavailable. The parent later inspected the rendered Lovable OS welcome screen firsthand. The Plan My Trips text and NN/G article were readable. This document records those limits explicitly. No app code was changed by the research worker.
