# Itinerary redesign — 19 November 2026

## Current direction

This direction supersedes the earlier sculptural, olive/burgundy design. The user supplied a frosted schedule UI as the primary structural reference, glass controls and calendar references, and itinerary-specific references for day navigation, a summary and connected activity cards. The user then explicitly selected the mood-journal reference as the main colour palette for the entire app.

Use blush pink and coral as the main accents, with peach, soft yellow and pale sky blue as supporting colours. White translucent surfaces and dark charcoal text keep the plan legible. Colour should feel diffused and atmospheric rather than using hard shapes behind essential text. Do not adopt the green/lime palette of the itinerary-layout examples.

## Layout and information

- Compact trip heading with the date range derived from the loaded snapshot. Generic source retains sample content; real destinations stay in the ignored local fixture or authorized Google Sheet.
- Horizontally scrollable date chips with full accessible date labels. Dots mark days with a starting or ongoing activity. Selecting a date identifies that day and scrolls to its plans; multi-day continuations are counted and jump to their originating card; empty days are identified explicitly.
- A concise summary reports the number of plans, trip days and confirmation states. No invented weather, route lengths, durations or readiness scores.
- Group activities by day, with a connected timeline and a consistent outline icon family. Flights get paired airport/time panels, visibly retaining each airport's local timezone. Flexible multi-day plans display their end date.
- Confirmed cards use a warm filled surface and checked label. Tentative cards retain an outline and explicit label. Payment and approximate-cost qualifications remain visible.
- Native expandable details contain notes, transport and safe booking/map links. Search matches activity, place, notes and transport, with clear, no-results and keyboard Escape behavior.
- A floating glass bottom bar provides Itinerary, Budget and Notes with icons and text. It sits outside the frosted main container to avoid WebKit's fixed-position containing-block behavior. Content has enough bottom padding to scroll above it.
- Budget uses the same palette, preserves per-person versus total calculations, and prominently distinguishes known estimates from committed spending and unpriced items.

## Interaction and accessibility

Use brief, interruptible feedback. Preserve the existing navigation-version safeguards, browser history, scroll restoration, hidden-document behavior and reduced-motion control. Avoid looping decoration. Keep focus visible and rescue focus when history hides its previous view. Maintain 44px controls and readable local times. Decorative outline icons are hidden from accessibility; labels carry meaning.

The date strip intentionally scrolls within its own bounds. Overflow checks exclude its clipped descendants while still asserting no document-level overflow. Expanded notes, bottom navigation, narrow flight panels and larger text receive specific inspection.

## Privacy and publishing

The Sheet and existing nightly/on-request publisher remain unchanged by the visual redesign. Refresh reads only Published. No real itinerary is stored in tracked web assets. OAuth remains read-only, tokens remain in memory, and no offline private cache or service worker is introduced. Private review binds only to 127.0.0.1.

## Assets and verification

The icon family is original inline SVG. The generic app icon source is web/icon.svg; render 180/192/512px variants with scripts/build-icons.py using the existing project-local WebKit runtime. No copied reference screenshots or listing images are shipped.

Run unit tests, the existing six-viewport WebKit audit and details suite, and tests/webkit_redesign.py for date jumps, fixed navigation, search and larger-text stress. Inspect screenshots and native macOS Safari. Actual iPhone standalone installation, Google-authenticated browser refresh, VoiceOver and measured frame-rate smoothness remain separate verification requirements.

## Alternate Cobalt palette

The user requested a second, switchable scheme based on the supplied royal/Majorelle/cobalt, burnt-orange/apricot, obsidian and natural-ivory palette. The original Blush scheme remains the default. The header palette button switches the entire interface and identifies the current choice with text and swatches.

Cobalt uses #0d1b63 royal, #192ca3 Majorelle, #2346df cobalt, #f45608 burnt orange, #ff7d36 apricot, #302722 obsidian and #efe5d8 ivory. Confirmed cards and the budget summary use blue with ivory text; tentative cards use outlined ivory; orange highlights actions and the summary. Primary orange-button text uses a slightly deeper obsidian shade to preserve readable contrast.

Only the visual preference, itinerary-colour-theme, is persisted locally. It contains no itinerary content or authorization data. Blocked storage falls back to a working temporary selection. The preference is restored before the main app renders; browser theme colour follows it. Theme changes do not alter the selected view, plans, search or Sheet snapshot.

## Tactile interaction pass

Day navigation uses a cancellable eased journey lasting 360–620ms according to distance, with a maximum 7px scroll overshoot and a 3px settling movement at the destination. Focus moves only when the journey completes; touch, wheel, navigation keys, another control, resize, hiding the document or a view/data change cancels it. Reduced motion jumps directly and has no bounce. Re-selecting an already aligned day adds no travel delay.

Buttons compress on pointer/key down in 85ms and release with a restrained 220ms spring. The navigation animates its backing rather than its text. New presses replace old feedback. View changes update the live content immediately, then use a 240ms fade and tiny settle; no action waits for the animation. Captured View Transitions are no longer used, avoiding blank intermediate frames in WebKit. Search reveals in 160ms. Native details use a quick fade and rotating chevron; their height is not animated, preserving browser scroll anchoring and history positions.

Soft radial gradients replace large live blur filters in the ambient background. The small bottom navigation keeps its frosted treatment. Frame traces confirmed that the previous background filters were slowing the scripted scroll in the WebKit harness; no real-device frame-rate claim is made.
