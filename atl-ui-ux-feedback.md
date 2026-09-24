# Above The Line: UI/UX review

Site reviewed: https://bensdonutshop.github.io/abovetheline/ (24 Sep 2026)
Reviewer: CD 5, the UI/UX specialist on the panel. The findings come from checking the live page in a browser at 1440×900 and 375×812, inspecting the DOM and running an automated contrast check.

> **For Claude Code:** Each task has an ID, a priority, evidence from the live page, the fix and "done when" criteria. The app is `index.html` with one inline script (~46 KB) and Google Fonts (Schibsted Grotesk, Syne). Keep the visual identity (dark UI, orange gradient, Syne masthead); these are fixes, not a redesign. After each P1 task, check the result at 375px and 1440px.

---

## Verdict

The visual direction is good: confident type, a tight palette and a clear three-column newspaper grid on desktop. The problems are in the details. One global typography setting puts a visible gap before every comma and full stop across the site. A stray UI element sits over the content. The app keeps no state in the URL. On mobile, the sticky header takes up a fifth of the screen. Fix the P1 items and the site will feel much more finished.

---

## P1: Visible bugs

- **UX-1: Gaps before punctuation across the whole site.**
  *Evidence:* Text renders as "film , TV tropes", "last year ." and "Thursday , September 24 , 2026". The underlying text is correct. The cause is `font-feature-settings: "ss01", "tnum"` applied to all text, because `tnum` gives commas and full stops the width of a figure in Schibsted Grotesk.
  *Fix:* Remove `"tnum"` from the global rule. Apply `font-variant-numeric: tabular-nums` only to numeric UI: counts in chips, the "02/10" pager, rank numbers "01–10", "110 of 110 stories" and timestamps. Check `ss01` on its own; keep it only if it doesn't cause the same spacing.
  *Done when:* Headlines and body copy have no space before `,` `.` `:` and the chip counts still line up.

- **UX-2: An empty toast sits over the content.**
  *Evidence:* `#toast` is empty but has `opacity: 1` and a light background (`rgb(233,236,242)`). It shows as a white pill (36×20px) fixed at the bottom centre over the content on every view, and it overlaps headlines on mobile.
  *Fix:* Hide it by default (`opacity: 0; pointer-events: none; visibility: hidden`) and show it only while it has text. Add `role="status"` and `aria-live="polite"`.

- **UX-3: The page has two `<h1>` elements.**
  *Evidence:* The masthead "Above the Line" and the lead story headline are both `<h1>`.
  *Fix:* Keep the masthead as the only `h1`, make the lead story an `h2` (keep its size with a class) and make feed items `h3`. The heading order should be h1 → h2 (section) → h3 (item).

- **UX-4: Views and filters aren't kept in the URL.**
  *Evidence:* Switching News, Campaigns or Awarded, or Global and Europe, or any filter chip, leaves the URL unchanged. People can't share "Awarded › Guldägget", and the back button leaves the site.
  *Fix:* Sync state to the query string (`?view=awarded&show=guldagget&region=europe&cat=campaign`) with `history.replaceState` for filters and `pushState` for view changes. Read the state on load and handle `popstate`.
  *Done when:* Reloading or sharing a URL restores the exact view, and Back returns to the previous view.

- **UX-5: The "Last 90 days" carousel isn't accessible.**
  *Evidence:* The card is a `<section data-href=… style="cursor:pointer">`, not a link, so keyboard and screen-reader users can't open it. It also rotates automatically with a progress bar and no pause control.
  *Fix:* Wrap the card's headline in a real `<a href>`. Add a Pause/Play button. Pause on hover, on focus-within and when the tab is hidden. Turn autoplay off under `prefers-reduced-motion: reduce`. The previous and next buttons already have aria-labels, which is good.

- **UX-6: Muted text fails the contrast check.**
  *Evidence:* The meta grey `#6B7484` on the background `#0B0E14` measures **4.10:1**, and on the card surface `#141924` it measures **3.73:1**. The text is 11.5–13px (timestamps, "Show", "Today", "10 topics", "Metered", source names). WCAG AA needs 4.5:1 for text this size.
  *Fix:* Lighten the muted token to about `#8B93A3` (check it passes 4.5:1 on both surfaces) and keep the hierarchy by size and weight instead.

## P1: Mobile

- **UX-7: The sticky header is too tall.**
  *Evidence:* At 375×812 the sticky header is about 160px (roughly 20% of the viewport), with the ATL mark and Refresh on one row, the view tabs on a second and the region toggle on a third.
  *Fix:* Put everything in one row of about 56px: the ATL mark, the view tabs as a horizontally scrollable segmented control, and the Region and Refresh controls moved into a small "⋯" or filter sheet. Optionally hide the header on scroll down and show it on scroll up.

- **UX-8: On mobile, the best content is 3,000px down.**
  *Evidence:* At 375px "The last 90 days" starts at about y=3050 and "Most talked about", Cannes and Nordics at about y=3500, after the whole news feed. The page is about 8,000px tall.
  *Fix:* On mobile, move a compact version of the 90-days topics (a horizontal swipe strip) directly under the lead story. Collapse the feed to about 10 items per day group with "Show all N". Add a sticky jump bar or anchor chips (News · Topics · Talked about · Cannes · Nordics).

## P2: Polish & consistency

- **UX-9: Image fallbacks look broken.** The initials tiles ("UNI", "AT", "GOO", "CLA"…) and the empty grey boxes look like failed loads. Design one fallback: the brand name set in Syne on the gradient, with the agency underneath in small caps, at the same aspect ratio as the images. Use it everywhere: cards, the "Most talked about" thumbnails and the carousel.
- **UX-10: Filter chips wrap into walls.** Awarded has 20 Industry chips over 2–3 rows plus 7 Show chips, which pushes the work below the fold. Make each filter group one horizontally scrollable row with fade edges, or show the top 6 plus a "More ▾" menu. Add an "active filters" summary with a "Clear all" link.
- **UX-11: Switching views causes a flash and a jump.** Switching to Campaigns shows the new content dimmed during a fade and jumps the scroll to about 368px. Shorten or remove the fade (keep it under 150ms and turn it off under reduced motion), and keep the view tabs in place so the switch feels like a tab change, not a page load.
- **UX-12: Refresh is manual.** The "Wire updated 5 min ago · Refresh" line exists, but new stories only appear after a click. Poll quietly (every 5–10 minutes) and show a "▲ 3 new stories" pill that the user clicks to add them at the top, so the page never jumps on its own.
- **UX-13: Links don't warn that they open a new tab.** All 149 external links use `target="_blank"` with no warning. Add a small ↗ icon and visually hidden "(opens in new tab)" text. The in-page video modal (creative task C1) will cut down on how often people leave the site.
- **UX-14: The "Metered" label is jargon.** Replace it with a small lock icon plus "Paywall", and add a toggle to hide paywalled items.
- **UX-15: Some touch targets are too small.** 12 controls are under 24px, including the carousel pager dots and the Refresh button. Give them at least a 24×24 hit area, 44×44 on touch, with padding or `::after` hit-area expansion.
- **UX-16: The masthead takes too much space on return visits.** The 108px "Above the Line" plus the rule and date push the feed about 400px down on desktop. Keep it full size on first load, and compress it to the sticky ATL bar after the first scroll or on repeat visits, using a sessionStorage flag wrapped in try/catch.
- **UX-17: Titles are mixed case.** Feed titles mix Title Case (Adweek, Muse) and sentence case (Digiday, Marketing Dive). Normalise the display to sentence case, keeping proper nouns and acronyms.
- **UX-18: No search.** There's nothing to find "Volvo" or "Nord DDB" across 110 stories and 262 campaigns. Add a `/`-triggered search overlay that filters client-side across all loaded data.

## P3: Nice to have

- A light theme toggle, since print-minded ADs will ask for one. Define colour tokens on `:root` and add `[data-theme="light"]`.
- `j`/`k` keyboard navigation through feed items.
- Open Graph image and meta tags so shared links preview well. `noindex` is set on purpose, and that's fine.
- Loading skeletons in place of the "Loading the wire…" text.

---

## Quick QA checklist for Claude Code after the fixes

- [ ] No space before punctuation anywhere (UX-1)
- [ ] No visible empty pill at the bottom of the viewport (UX-2)
- [ ] Only one `h1` on the page (UX-3)
- [ ] A URL copied from any view or filter restores that view (UX-4)
- [ ] The carousel can be paused and reached by keyboard, and doesn't autoplay with reduced motion (UX-5)
- [ ] All text of 13px or smaller passes 4.5:1 contrast (UX-6)
- [ ] The mobile header is 64px or less, and the topics are visible within 2 screen heights (UX-7, UX-8)
- [ ] No initials-only or empty grey image tiles (UX-9)
