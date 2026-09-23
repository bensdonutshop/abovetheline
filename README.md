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
server.js          static server, /api/refresh, timed re-pull
refresh.js         fetch → normalise → rank → cache images → data/live.json
check-links.js     link verifier for data/curated.json
lib/fetch.js       HTTP with redirects, gzip, byte caps and hard deadlines
lib/parse.js       RSS/Atom, article-card scrape, entity decoding, Bing unwrapping
lib/relevance.js   campaign-relevance, off-topic and sponsored-post detection
data/sources.json  feed roster and filter vocabulary
data/curated.json  the hand-researched rails
data/live.json     generated — the current wire
public/img/        generated — cached thumbnails
.port              generated — the port the running server picked
```

No dependencies. Node 18+.
