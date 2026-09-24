# Above the Line

A live front page for the advertising trade press: global and European campaign news in the
main column, the year's most talked-about work and Cannes Lions 2026 case films in the right
rail, and a self-cycling archive of the last 90 days on the left.

Double-click **`start.command`**, or from a terminal:

```bash
node server.js
```

Either way it opens at **http://localhost:4173**. The server pulls every feed on start (if the cache is
stale) and again every 8 minutes, so the front page keeps moving on its own.

```bash
PORT=8080 REFRESH_MINUTES=15 node server.js   # both are configurable
node refresh.js                               # one manual pull
node refresh.js --no-img                      # skip thumbnail resolution (fast)
node check-links.js                           # verify every hand-curated link still resolves
```

## Running it online (no Mac needed)

The site is really just static output: `refresh.js` writes `data/live.json`, `page.html` reads
it. So it can be built and published by CI with no machine of yours involved.

`.github/workflows/refresh.yml` pulls the feeds and republishes every ~15 minutes
(GitHub queues scheduled jobs, so treat that as *about* 15-20 minutes). To set it up:

1. Create an empty repo on github.com.
2. `git remote add origin <your repo url>` then `git push -u origin main`.
3. In the repo: **Settings → Pages → Source → GitHub Actions**.
4. **Actions → Refresh and publish → Run workflow** to publish immediately rather than
   waiting for the next scheduled run.

The site then lives at `https://<you>.github.io/<repo>/`.

**Hosted mode ships no images.** `node refresh.js --hosted` keeps the publishers' own image
URLs instead of caching copies, so nothing of theirs is re-hosted on your domain and the
deploy is ~100KB rather than 7.5MB. Where a publisher blocks hotlinking, the page falls back
to its generated tile. Locally the cached copies are still used, so the site works offline.

The page knows which mode it is in — it reads `mode` from `live.json` and says "Wire updated"
for a CI-refreshed site versus "Snapshot taken" for a frozen copy, rather than implying the
feeds are live when they aren't.

A GitHub Pages site is public. Nothing personal is in the published files (no name, email,
paths or credentials), and the headlines and summaries come from publishers' own RSS. If you
want it restricted to you, host the same `dist/` on Cloudflare Pages and put Cloudflare Access
in front of it.

### Starting automatically on your Mac

`~/Library/LaunchAgents/com.abovetheline.server.plist` starts the local server at login and
restarts it if it exits. Logs go to `~/Library/Logs/abovetheline/server.log`.

```bash
launchctl bootout  gui/$(id -u)/com.abovetheline.server   # stop and disable
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.abovetheline.server.plist
launchctl kickstart -k gui/$(id -u)/com.abovetheline.server   # restart after a code change
```

This only helps on the Mac itself. It sleeps when the Mac sleeps — which is the reason to host
it if you want it from work.

## If it stops working

**`ERR_CONNECTION_REFUSED` / "localhost refused to connect"** means nothing is serving the
site. This is the normal state — the page is static HTML plus a local Node server, and that
server only runs while `start.command` is open. It does not survive a reboot, and closing its
Terminal window stops it. Double-click `start.command` again.

Other things it now handles by itself:

- **Port already taken** — the server steps to the next free port (4174, 4175…) instead of
  crashing, and prints the one it landed on. `start.command` opens that port, not a guess.
- **Already running** — `start.command` notices an instance is up and just opens the browser
  rather than starting a second one.
- **A failed feed pull** — the last good wire stays on screen and the reason is logged. The
  feed file is written to a temp file and renamed, so a crash mid-write can't leave a
  half-written page behind.

The running port is recorded in `.port`; it's removed on a clean stop, and a stale one is
detected and cleared.

## Where the stories come from

Twenty-one sources, pulled server-side:

| Adapter | Sources |
|---|---|
| Publisher RSS | Adweek, Muse by Clio, Marketing Dive, Digiday, AdExchanger, Adland, Branding in Asia, WERSM, Creative Review, Marketing Week, More About Advertising, Resumé, Dagens Media, Dagens Analys |
| Article scrape | Creative Salon |
| Bing News RSS | Ad Age, The Drum, LBBOnline, Campaign UK, shots, plus Finnish and Swedish market searches |

Ad Age, The Drum, LBBOnline and Campaign UK all return `403` to non-browser clients on their
own feeds, so those come through Bing News RSS, which carries the real publisher URL inside
the wrapper — `lib/parse.js` unwraps it. Nothing links to an aggregator; every headline goes
straight to the publisher.

Finnish trade press is the one genuine gap: *Markkinointi & Mainonta*, *Markkinointiuutiset*
and *Kauppalehti* publish no reachable feed, so Finland arrives through Finnish-language news
searches plus the hand-checked list under **Landmark work**.

## Design system

**The masthead.** "Above the line" is the industry's own term for bought media, the work
everybody sees. So the mark says it: the wordmark sits above a solid orange rule. It is set in
Syne Bold, used *only* for the masthead so it never competes with the headlines. The front-page
masthead scrolls away; the sticky bar below it carries the abbreviation, ATL, which is what
the industry actually says out loud.

**The masthead.** No band and no edge: the masthead background is the page background, so
there is nothing to see the end of. Two faint warm glow layers wander behind the wordmark on
different clocks, 41 and 29 seconds, each following a multi-stop path rather than a two-point
ping-pong, so their overlap never repeats the same way and the top of the page is never quite
still. The second layer carries a fine grain at `soft-light`, so the glow reads as textured
light rather than a flat wash. Both are pseudo-elements moved with `transform`, costing a
compositor layer and no JavaScript, and both hold still under `prefers-reduced-motion`.

**Light on the gradient.** Anything filled with the accent gradient - the active view tab, the
lead badge, top-award ribbons, the campaign-work chip, the masthead rule - carries a warm
inset highlight along its top edge and a darker one beneath, so it reads as a solid object
catching a light rather than a flat fill.

**The rule and the mark are one shape.** Seven arms of identical weight radiate from a centre
near the right edge, and the arm pointing left is simply run out to x=0 - that is the line
across the page. One gradient fills the whole thing, so the line arrives at the mark already
red. Nothing sits on top of anything.

It is drawn in CSS pixel units with the viewBox set to the measured size, because stretching a
fixed viewBox across a variable width would shear the arms out of round. Redrawn on resize and
once the webfont settles.

**Type.** Syne Bold for the masthead, Schibsted Grotesk for everything else. Schibsted Grotesk
is the face a Nordic news group commissioned for its own papers, so hierarchy comes from
weight and size rather than from switching families.

**Colour.** Warm-grey paper rather than cream, a single accent (`#FF4D0F`, `#FF6B33` on dark),
and neutrals biased warm throughout so nothing reads as a stock grey ramp. One accent, used
identically in every view. Shadows carry the paper's hue instead of being black at low opacity.

**Shape.** One radius scale applied by role, not per component:

| Token | Used for |
|---|---|
| `--r-xs` 3px | tags, award chips, badges |
| `--r-sm` 6px | thumbnails and small media |
| `--r-md` 10px | cards, figures, panels |
| `--r-pill` | anything you press |

Circles stay circles (status dot, carousel pips, the round arrow buttons). Layers come from
named `--z-*` tokens so nothing invents a `9999`.

**Depth.** A fixed grain plate over the page at 3.5% (5.5% on dark), `position: fixed` and
`pointer-events: none` so it never repaints while scrolling.

**Grid rhythm.** The first card in each card feed spans two columns with a 16:9 figure and a
larger headline. A wall of identical rectangles is the difference between a gallery and a
contact sheet. Headlines clamp to three lines (two on the feature) and the metadata block is
pinned to the bottom of each card, so source lines and award tags form clean rows across a row
of cards whatever the headline lengths above them.

**No em-dashes.** Not in copy, labels, tags or headlines. Publisher headlines are normalised
*typographically only* in `lib/parse.js` - the dash glyph is swapped, never the words, because
rewriting someone's headline to suit a house style would misrepresent their story.

**States.** Press feedback on every control, skeleton cards while the first pull lands, a real
message when the wire fails to load, and empty states that say what to do next. Cards rise in
sequence on entry rather than all at once. Everything collapses under
`prefers-reduced-motion`, including smooth scrolling.

**Access.** A skip link to the stories, visible focus rings, a branded favicon, and both
themes designed rather than inverted.

## Three views

`News` · `Campaigns` · `Awarded`, switched in the masthead, with Global/Europe alongside —
both rows stay put whichever view you are in. On News, Global and Europe are two different
wires; on the card views, Global means everything and Europe narrows to work made there.

The active tab is marked by a single pill that slides between positions rather than each tab
lighting up, and the panel replays a short enter animation on every switch.

**News** is the three-column front page: cycling 90-day archive on the left, ranked wire in
the middle, campaign and Cannes rails on the right.

**Campaigns** is a card feed of campaign work only, sorted so the work with pictures leads,
filterable by industry and channel. Built from the live wire — it is whatever the trade press
is showing today.

**Awarded** is a card feed of ~200 cases that won at Cannes Lions, D&AD, Clio and Eurobest.
Each card carries ribbons for the shows that recognised it and tags for the level and
category, so it is obvious why a case is there. Ordered by how many *shows* recognised it,
then how many statues, then how high — which puts genuinely cross-show work like AXA's
*Three Words* (Cannes Grand Prix, D&AD Black Pencil, Grand Clio) at the top.

`node build-awarded.js` regenerates it: it walks lovetheworkmore.com's Cannes index, which
is laid out under `GRAND PRIX / TITANIUM` · `GOLD` · `SILVER` · `BRONZE` headings with entries
reading `CAMPAIGN - BRAND (AGENCY CITY)`, then merges in the hand-researched D&AD, Clio and
Eurobest recognition from `data/awarded-extra.json` by campaign name. `--all` includes Bronze.

The agency's city gives each case a country and region (`lib/places.js`), so Global/Europe
filters the award cards as well as the news. Brand and agency keep the index's original caps,
because the cards render that line uppercase anyway and title-casing turns SKF into "Skf".

Case thumbnails come from the video hosts themselves: YouTube exposes one per video id, and
Vimeo answers oEmbed. Neither needs a key. `node enrich-curated.js data/awarded.json`
resolves them.

**Verify the case links** with the YouTube oEmbed endpoint rather than fetching the watch
page — a watch URL returns `200` even for a video that no longer exists, while oEmbed returns
`404`. That is how a bad link was caught before it shipped.

## Filters

Above the feed: **Everything / Campaign work / Industry / Media**, and when you pick Campaign
work, **Industry** (the advertiser's sector) and **Media** (the channel) appear beneath it —
the Ads of the World model, applied to a news feed. Every chip carries its own count, so you
can see what a filter is worth before clicking it.

`lib/classify.js` reads the article's own text, not just the headline. That matters: a
headline cannot distinguish "Nike launches a film" from "Nike reviews its media account".
The refresher already downloads each page to check its paywall, so the body text is free.

**Coverage, measured on a real pull — not estimated:**

| | |
|---|---|
| Kind (work / industry / media) | ~66% of stories |
| Industry sector | ~54% of campaign work |
| Media channel | ~33% of campaign work |

Channel is the weak one, and honestly so: trade reporting frequently never says whether the
work ran as film, print or out-of-home.

Because of that, **nothing is ever hidden.** A story the classifier could not place is never
silently dropped from a filtered view — it is offered at the foot of the list as *"+ N more we
could not classify"*. A wrong guess costs you a click, not a story.

Classification is lexicon-based and deliberately abstains when two categories score close
together, which is why a third of stories stay unclassified rather than being confidently
mislabelled.

## Most talked about, over a window you choose

Month / 6 months / Year, ranked from the same pool the Campaigns gallery uses, so the rail
answers "what is being talked about" with the same evidence: how many outlets ran it, how many
juries recognised it, whether it made the researched list. Each entry states what earned its
place - "1 award, 2 outlets" - rather than asserting a rank.

The window filters on **when the work broke**, not when the wire happened to see it, which
needs every item dated. The wire has real timestamps. Curated campaigns carry the month they
broke. Awarded cases take the month of their earliest recognition, from the show's announcement
month and edition year - and Vuoden Huiput 2025 dates to April 2026, because that is when its
gala was.

So Month surfaces this month's wire, and 6 months brings the Cannes-era work back up.

## Story categories

Each story in the wire carries its kind: campaign work, agency business, or media and adtech.
The tag sits in the byline as metadata rather than above the headline as an eyebrow, because
it is information about the story rather than a label on the section. Around 70% of stories
carry one; the classifier abstains rather than guessing.

## Campaigns: two lenses over one deduplicated pool

Campaigns draws on three sources at once: the live wire, the award archive and the
hand-researched twelve-month list. That is roughly 280 campaigns rather than the 60-odd the
wire alone carries.

The same work appears in more than one of them, and in several outlets inside the wire, so
everything is keyed and collapsed before it reaches the grid. Two passes: first on brand plus
the strongest words of the campaign name, then on the campaign name alone, because one source
writes a brand as "Claude / Anthropic" and another as "CLAUDE". Each duplicate's signal is
folded into the survivor rather than thrown away.

Two sorts:

**Most recent work** is the wire by date, with the undated archive behind it.

**Trending this year** is scored from signals the project actually holds, not an invented
number:

| Signal | Weight | Where it comes from |
|---|---|---|
| Outlets carrying it | x3 | cross-outlet clustering in `lib/cluster.js` |
| Shows that recognised it | x4 | `data/awarded.json` |
| Individual awards | x2 | same |
| On the twelve-month list | x1.5 | `data/curated.json`, by rank |
| Recency | up to 6 | so this week is not buried by the archive |

Cards show what earned the position: "3 awards", "2 outlets".

## Nordic awards

Guldagget and Vuoden Huiput sit alongside Cannes Lions, D&AD, Clio and Eurobest.

Guldagget 2026 (the 65th, 23 April 2026) contributes its gold winners, taken from the
official winners release, jury citations and all. Vuoden Huiput 2025 (gala 23 April 2026)
contributes its Grand Prix and Kultahuippu winners from vuodenhuiput.fi and Grafia.

Two cases turn out to be cross-show: Caritas Sverige's *Vehicle of Hope* and Way Out West's
*The Kidney Pass* both won at Cannes and at Guldagget, which the ranking rewards.

Where a credit could not be verified it is left blank rather than guessed. Several Vuoden
Huiput entries carry a designer but no client, because the source does not name one.

## Industry filtering

Both card views filter by industry. `lib/classify.js` holds 18 sectors, each a list of brand
names plus the category words that describe the field, matched against the brand, campaign,
agency and article text.

| | Classified |
|---|---|
| Awarded cases | 187 of 198 (94%) |
| Campaign work from the wire | ~69% |

Awarded classifies far better because each case carries a real `brand` field. The wire has to
find the brand inside a headline, and a story about an agency hire names no brand at all.

Two rules make the matching work:

- **Brand names need a boundary in front but not behind.** `pepsi` has to match *PepsiCo* and
  `volvo` has to match *Volvo's*, while `on` must not match *online*. Terms of four characters
  or fewer need a boundary on both sides; longer ones only in front.
- **Curly apostrophes and accents are folded first.** Sources write `DE'LONGHI`, `LAY'S` and
  `L'ORÉAL` with typographic apostrophes, which would otherwise miss every brand spelled with
  a straight one.

Counts on the industry chips follow the show selection, so the number on a chip is what you
will actually get rather than a global total.

## Paywalls

Articles the publisher marks as subscriber-only never reach the page. The check is
**per article, not per masthead** — Ad Age, Adweek, Resumé and Dagens Media all publish a
mix, so banning the title outright would throw away their open journalism along with the
locked pieces.

`lib/paywall.js` reads schema.org `isAccessibleForFree`, which publishers set for Google and
is the most trustworthy signal available; it falls back to paywall markup, subscriber copy
(English, Swedish, Finnish), and only then to a per-source policy, used for the handful of
publishers that refuse our fetcher outright.

Three outcomes:

| | |
|---|---|
| `locked` | dropped before it reaches the page |
| `metered` | kept, and labelled **Metered** in the byline so you know before clicking |
| `open` | normal |

Set `KEEP_METERED=false` to drop metered titles too.

Also filtered out: sponsored and partner content — caught by URL path (`/sponsored/`,
`/brandvoice/`, `/advertorial/`) as well as by copy, because publishers file commercial
content under a giveaway path far more reliably than they label it — and pages with no
article text at all, which is how section fronts and video stubs (`thedrum.com/tv`) get in.

## The same story, from somewhere you can read it

The trade press covers the same news repeatedly: an account win runs in Ad Age, Campaign and
Marketing Dive the same morning under three different headlines. Exact-title de-duplication
misses that completely.

`lib/cluster.js` groups them by word overlap plus shared *named* parties — brands and
agencies, ignoring the generic vocabulary ("campaign", "brand", "global") that every trade
headline contains, which is what stops two unrelated stories merging just because both say
"campaign". Within a group the version you can open wins; ties break on masthead, then on
having a picture. The byline then reads "also in Ad Age".

## How stories are chosen

`refresh.js` runs each item through:

1. **Drop** — political advertising, sponsored and partner posts (`lib/relevance.js`), anything
   older than 21 days, and duplicate headlines across mastheads.
2. **Score** — masthead weight × recency (≈2.5-day half-life) + a relevance score that reads
   English, Swedish and Finnish for campaign and agency vocabulary, + a bonus for having a picture.
3. **Diversify** — at most four stories per masthead near the top, so one prolific feed can't
   take the column.
4. **Region** — the feed's own region, plus word-boundary matching on European place names, so a
   story can appear under both tabs.

Thumbnails come from the feed's own `media:content` / `enclosure` tags where they exist,
otherwise from the article's `og:image`. Images are cached into `public/img/` and referenced by
content hash; anything no longer on the front page is pruned on the next run.

## The hand-curated rails

`data/curated.json` holds the three ranked lists — most talked-about campaigns of the past 12
months, Cannes Lions 2026 case films, and Nordic landmark work — plus the ten topics the left
column cycles through. These are researched and ranked by hand, not generated.

Cannes case links are indexed by [lovetheworkmore.com](https://www.lovetheworkmore.com), the
free index of every Lion-winning campaign, which exists so the work isn't behind the Cannes
paywall. Run `node check-links.js` to confirm all 41 curated links still resolve; a `403` there
means the publisher is blocking scripted clients, not that the page is gone.

## Files

```
page.html          the whole front end — markup, styles, behaviour
build.js           wraps page.html into dist/ for deployment
server.js          static server, /api/refresh, timed re-pull
refresh.js         fetch → normalise → rank → cache images → data/live.json
check-links.js     link verifier for data/curated.json
lib/fetch.js       HTTP with redirects, gzip, byte caps and hard deadlines
lib/parse.js       RSS/Atom, article-card scrape, entity decoding, Bing unwrapping
lib/relevance.js   campaign-relevance, off-topic, sponsored and non-article detection
lib/paywall.js     per-article paywall detection, with per-source fallback
lib/cluster.js     groups the same story across outlets, prefers the readable one
lib/classify.js    kind / sector / channel classification from article text
data/sources.json  feed roster and filter vocabulary
data/curated.json  the hand-researched rails
data/awarded.json  generated — award-winning cases, tagged by show, level and category
data/awarded-extra.json  hand-researched D&AD / Clio / Eurobest recognition, merged in
build-awarded.js   scrapes the Cannes index and merges the cross-show research
lib/places.js      agency city -> country and region
enrich-curated.js  resolves thumbnails for curated entries (og:image, YouTube, Vimeo)
data/live.json     generated — the current wire
public/img/        generated — cached thumbnails
.port              generated — the port the running server picked
```

No dependencies. Node 18+.
