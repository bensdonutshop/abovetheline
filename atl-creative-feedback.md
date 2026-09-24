# Above The Line: creative review (content & editorial)

Site reviewed: https://bensdonutshop.github.io/abovetheline/ (24 Sep 2026, desktop 1440px + mobile 375px)
Reviewed by five creative directors, four of whom are below. The fifth (UI/UX) is in `atl-ui-ux-feedback.md`.

> **For Claude Code:** This file is a work order. Each task has an ID, a priority (P1 = do first), the problem, the fix and "done when" criteria. Before changing anything, read `index.html` (the app is one inline script of ~46 KB) and any data or feed config it loads. Don't invent campaign facts, awards or credits. If data is missing, show an honest empty state instead of filler. Work through the P1 tasks, then the P2 tasks, and commit after each task.

---

## The panel in one paragraph

The bones are strong. The masthead has attitude, the "Last 90 days" topics are the best thing on the page, and the Cannes Lions case-film list is useful. Right now, though, it reads as a well-styled RSS reader, not a trade front page. Three things drag it down: (1) the curation doesn't decide what matters, so an M&M's news item leads and a Royal Caribbean cruise story sits in the feed; (2) the "Finland and Sweden" and "Europe" promises aren't kept, because there's no Finnish campaign news at all; (3) the awards data has visible seams, like "Titanium, titanium", placeholder tiles and missing credits. Creatives forgive a small site, but they don't forgive sloppy credits.

---

## CD 1: Network ECD (craft & ideas lens)

**What works:** The Campaigns grid with big key visuals. The one-line "idea in a sentence" blurbs are well written. "A product change, advertised." is exactly how a CD talks.

**What's missing / could be better**

- **C1 (P1): Let people watch the work on the page.** Every campaign card opens YouTube in a new tab. Add a lightbox or modal with a lite YouTube embed (load the iframe only on click) that shows the blurb, credits and awards next to the film.
  *Done when:* Clicking a card with a YouTube URL opens an in-page player. Esc closes it and focus returns to the card. Cards without video still link out.
- **C2 (P1): Add credits.** Agency and brand aren't enough. Add optional fields `ecd`, `cd`, `director`, `production_company` and `country` to the campaign data model and render them on the card and in the modal when they exist. Leave them out when they're empty. Never guess.
  *Done when:* The schema supports the fields, the UI renders them conditionally and no card shows an empty label.
- **C3 (P2): Make "why it worked" readable at a glance.** Split the blurb into three short lines, **Insight / Idea / Result**, wherever the data exists. Keep the single blurb as the fallback.
- **C4 (P2): Make the lead story editorial, not whatever came in most recently.** The desktop lead is a Marketing Dive news item about M&M's. Pick the lead with a score that weights campaign work, award-winning work and big agency moves, and let a manual override pin a "Work of the week".
  *Done when:* A `pinnedLead` config value exists and overrides the automatic pick. The automatic pick favours "Campaign work" items that have an image.

## CD 2: Nordic indie CD (local relevance lens)

**What works:** The Landmark work list (Visit Sweden, SKF, Volvo, Atria, Metsien Suomi) is a good instinct. Guldägget and Vuoden Huiput in the Awarded filters is the right call.

**What's missing / could be better**

- **C5 (P1): Finland is missing from "Finland and Sweden".** All eight "Campaign work" items are Swedish (Resumé, Dagens Media), and so is almost the whole Europe feed. Add Finnish trade sources: Marmai / Markkinointi & Mainonta, plus Kauppalehti's marketing coverage and the MTL and Grafia news pages if they have feeds (check each for RSS first, and scrape nothing that isn't allowed). If a source has no feed, list it as a manual link.
  *Done when:* The Finland and Sweden module shows FI and SE items side by side, and an FI or SE filter chip works.
- **C6 (P1): Europe should mean Europe.** The Europe feed today is mostly Swedish, plus Branding in Asia items about Australia ("Lick The Plate"). Add UK (Campaign, The Drum, Creative Review, Shots), DACH (Horizont, W&V), France (Stratégies), NL (Adformatie), DK (Bureaubiz) and NO (Kampanje). Treat all of these as candidates and check each one for a feed. Tag every source with a region so non-European items can't leak into Europe.
  *Done when:* No item from a source tagged APAC or US shows up in the Europe view, and the Europe view contains at least 4 countries.
- **C7 (P1): Filter out news that isn't about marketing.** Items in the feed now include a Dagens ETC court-reporting dispute, suspected Facebook vote-buying, Destiny 2 content vaults, Spotify's kids-music toggle, Royal Caribbean cruise routes and an Indonesia tourism expo. Add a relevance filter: a keyword blocklist plus an allowlist (campaign, agency, brand, creative, CMO, award, media agency, pitch, account, and so on) and a per-source strictness setting. General media sources like Dagens Media and WERSM need the strict setting.
  *Done when:* None of the example items above would pass. Put the list in a config array, not scattered through the code.
- **C8 (P2): Translate or summarise non-English headlines.** Keep the original Swedish or Finnish headline and add a one-line English gloss under it, from a build-time translation if the pipeline allows. Otherwise, at minimum show a language badge (SV/FI) so English readers know what they're clicking.
- **C9 (P2): Fix the Nordic data holes.** "Kuule metsä puilta" (Metsien Suomi) and "Hän" (Ministry for Foreign Affairs) have no agency. The Awarded tab says "Vuoden Huiput 2025" while Landmark links "Vuoden Huiput 2026". Ervin Latimer is listed as both brand and agency. Fill in what can be verified, leave out what can't, and make the year labels consistent.
- **C10 (P2): Add a Nordic scoreboard module.** Show which agencies in FI, SE, NO and DK won the most at Cannes, Guldägget and Vuoden Huiput this year, derived from the existing Awarded data. Agency people love this; it's the most screenshotted part of any trade site.

## CD 3: Strategy-led CD (context & effectiveness lens)

**What works:** "The last 90 days" is the one place the site has a point of view, and the writing is sharp ("the CMO job shrank, so the title grew"). It's also the page's strongest asset, and it's hidden in a small auto-rotating card.

**What's missing / could be better**

- **C11 (P1): Promote the 90-day topics.** Give them a proper section: a list or grid of all 10, each with a date, 2–3 source links and a line on what it means for agencies ("So what for your next pitch"). The carousel can stay as a teaser on desktop.
- **C12 (P1): Use trade sources for the topics.** "Read it at JumpFly" (a PPC agency blog) is the citation for the ChatGPT Ads topic. Cite trade press (Digiday, Adweek, Campaign, AdExchanger) and allow more than one source per topic.
- **C13 (P2): Add an effectiveness layer.** Add an optional `results` field (for example "+18% consideration", "€0 media") and render it as a badge. Add Effies, IPA and Euro Effie to the "Show" filters when the data exists. Planners filter by "did it work", not just "did it win".
- **C14 (P2): Add a "Stat of the week" strip.** Take one citable number from the feed with its source, like "58% of ad execs expect agentic buying at scale within a year – IAB Europe via Digiday". It's pitch-deck fuel.

## CD 4: Digital & social CD (platforms & new formats lens)

**What works:** The Media filter (Film / Social / Experiential) is the right idea.

**What's missing / could be better**

- **C15 (P1): Tag media for more of the work.** Only 11 of 262 campaigns have a Media tag (Film 4, Social 6, Experiential 1). Either tag the rest (Film, Social, OOH, Experiential, Digital/Product, Audio, Print, PR, Retail) or hide the Media filter until coverage is above about 80%. A filter that finds nothing tells users the site is broken.
- **C16 (P1): Fix news categories.** Many Muse by Clio items default to "Agency business" ("Ben Stiller Dressed as One of Broadway's 'Cats'", "Let's Buy a Plushie That Makes Piercing Data-Center Sounds!"), and many items have no category at all. Items with the "ad" or "campaign" keyword, or a brand name plus a verb like launches, debuts or spot, should go to Campaign work. Unclassifiable items should get "Other" rather than a wrong label.
  *Done when:* The category counts add up to the total (110), or an "Other" chip covers the rest.
- **C17 (P2): Add an "AI in the work" filter.** It's the topic every creative department is arguing about. Tag campaigns and news that use or discuss generative AI, including disclosure debates. This builds on topic 9 in the 90-day list.
- **C18 (P2): Add ways to save and share.** Add "Copy link" and "Save to shortlist" on cards. Keep the shortlist in localStorage, wrapped in try/catch, with an export as a list of links. Creatives build reference decks from exactly this kind of page.

---

## Data hygiene fixes (all panelists agreed on these)

- **D1 (P1): Remove duplicate category labels.** The Awarded tab shows "Grand Prix, grand prix", "Titanium, titanium" and "Grand Prix, titanium". When the category equals the prize name, show the prize only ("Titanium Grand Prix", "Grand Prix").
- **D2 (P1): Add the category to bare prize levels.** Entries like "Silver" (Vaseline Verified, The Kidney Pass) need the category: "Silver, Social & Creator".
- **D3 (P1): Replace the placeholder tiles.** Cards currently show initials like "UNI", "AT", "GOO", "CR", "CD" and "CLA", or empty grey boxes (Three Words, The Pub That Refused To Die). Find a real thumbnail (the YouTube `hqdefault` of the case film is usually available) or use a designed fallback; see UX-9.
- **D4 (P1): Make casing consistent.** Brand and agency names are ALL CAPS on most cards but mixed case on some (Tecate / LePub Mexico City). The Cannes list says "adam&eveDDB" while the cards say "ADAM&EVE\TBWA/LONDON". Normalise to one canonical spelling per agency and handle casing in CSS (`text-transform`), not in the data.
- **D5 (P2): Merge entries for the same campaign.** Claude and Mother London appear twice, both "Grand Prix, film". Group executions under one campaign entry.
- **D6 (P2): Say what the award count means.** In "Most talked about", Haven shows "1 award" although it's the Titanium Grand Prix winner. Either count individual awards or relabel the number as "1 show".
- **D7 (P2): Fill missing countries and blurbs.** For example, "600K Network" and "Project Genie" have no country, and roughly half the Awarded cards have no blurb.

## New modules the panel wants (P3, pick 2–3)

1. **Awards calendar:** upcoming entry deadlines and ceremonies (Eurobest, D&AD, One Show, Epica, Guldägget, Vuoden Huiput, Grafia) with a countdown.
2. **Moves and pitches ticker:** people moves (ECD hires such as "Maison BETC appoints Liam Fearn") and account wins and losses ("WPP Media vinner Wolt", "Gut holds Tim Hortons") pulled out of the feed into their own compact list.
3. **Search:** one field across news, campaigns and awards, searching by brand, agency, country or person.
4. **Weekly digest:** a "This week in 60 seconds" summary of the top 5 items, which could later become a newsletter.
