#!/usr/bin/env node
'use strict';
/*
 * Above The Line — feed refresher.
 * Pulls every configured source, normalises, ranks, resolves thumbnails,
 * caches images locally and writes data/live.json.
 *
 *   node refresh.js            full refresh
 *   node refresh.js --no-img   skip image resolution (fast)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { get, pool } = require('./lib/fetch');
const P = require('./lib/parse');
const { relevance, isOffTopic, isSponsored, isNonArticleUrl, strictnessFor } = require('./lib/relevance');
const { detectAccess, sourceAccess } = require('./lib/paywall');
const { cluster } = require('./lib/cluster');
const { kindOf, sectorOf, channelOf, SECTORS, CHANNELS } = require('./lib/classify');

const ROOT = __dirname;
const IMG_DIR = path.join(ROOT, 'public', 'img');
const SRC = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'sources.json'), 'utf8'));
const NO_IMG = process.argv.indexOf('--no-img') >= 0;
// --hosted: don't cache images locally, just reference the publishers' own URLs.
const HOSTED = process.argv.indexOf('--hosted') >= 0;

const MAX_AGE_DAYS = 21;
const PER_COLUMN = { global: 110, europe: 110 };
const INSPECT_BUDGET = 360;    // articles we open to read their picture and paywall state
// 'locked' is always dropped. Set KEEP_METERED=false to drop metered titles
// (Digiday, Marketing Week, Campaign UK) as well.
const KEEP_METERED = process.env.KEEP_METERED !== 'false';
const MAX_IMG_BYTES = 600 * 1024;

const log = (...a) => console.log('[refresh]', ...a);

/* ---------------------------------------------------------------- fetching */

function bingUrl(q) {
  return 'https://www.bing.com/news/search?q=' + encodeURIComponent(q) + '&format=RSS';
}

async function loadFeed(f) {
  const items = [];
  try {
    if (f.adapter === 'bing') {
      const queries = f.queries || [];
      const pages = await pool(queries, 3, q => get(bingUrl(q), { timeout: 20000 }));
      pages.forEach(r => {
        if (!r || !r.ok) return;
        P.parseFeed(r.body).forEach(it => {
          it.link = P.unwrapBing(it.link);
          items.push(it);
        });
      });
    } else if (f.adapter === 'html') {
      const r = await get(f.url, { accept: 'text/html,application/xhtml+xml', timeout: 25000 });
      if (r.ok) P.parseArticles(r.body, f).forEach(it => items.push(it));
    } else {
      const r = await get(f.url, { timeout: 20000 });
      if (r.ok) P.parseFeed(r.body).forEach(it => items.push(it));
    }
  } catch (e) {
    log('!', f.id, e.message);
  }
  log(String(items.length).padStart(4), 'from', f.id);
  return items.map(it => normalise(it, f)).filter(Boolean);
}

/* ------------------------------------------------------------ normalising */

function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }

function cleanTitle(t, sourceName) {
  // Aggregator feeds append " - Publisher" to headlines.
  let s = String(t || '').trim();
  if (sourceName) s = s.replace(new RegExp('\\s*[-–|]\\s*' + sourceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i'), '');
  s = s.replace(/\s*[-–|]\s*(Ad Age|Adweek|The Drum|thedrum\.com|Campaign UK|Creative Salon|LBBOnline|Little Black Book.*|shots|Marketing Week|Digiday|Resumé|Resume\.se|Dagens Media)\s*$/i, '');
  return s.trim();
}

function normalise(it, f) {
  if (!it.title || !it.link) return null;
  let url = it.link.trim();
  if (!/^https?:\/\//i.test(url)) return null;
  const host = hostOf(url);
  if (!host || host.indexOf('bing.com') >= 0 || host.indexOf('google.com') >= 0) return null;

  const title = cleanTitle(it.title, f.name);
  if (title.length < 12) return null;

  if (isNonArticleUrl(url)) return null;

  const low = title.toLowerCase();
  if ((SRC.dropTitle || []).some(w => low.indexOf(w) >= 0)) return null;

  let ts = Date.parse(it.date || '');
  if (!isFinite(ts)) ts = 0;

  return {
    title,
    url,
    host,
    source: f.name,
    sourceId: f.id,
    market: f.market || '',
    lang: f.lang || 'en',
    summary: (it.summary || '').replace(/\s+/g, ' ').trim().slice(0, 280),
    ts,
    image: it.image || '',
    region: f.region,
    weight: f.weight || 5
  };
}

/* ------------------------------------------------------- rank & de-duplicate */

const keyOf = t => t.toLowerCase().replace(/[^a-z0-9åäöæøé ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);

function score(a, now) {
  const ageH = a.ts ? (now - a.ts) / 36e5 : 96;      // undated items sink
  const recency = Math.exp(-ageH / 60);              // ~2.5 day half-life
  return a.weight * (0.35 + recency) + (a.image ? 0.6 : 0) + a.rel * 1.6;
}

// Take the best items while keeping one masthead from swamping the column.
function diversify(list, limit, cap) {
  const used = {}, first = [], rest = [];
  for (const a of list) {
    const n = (used[a.sourceId] = (used[a.sourceId] || 0) + 1);
    (n <= cap ? first : rest).push(a);
  }
  return first.concat(rest).slice(0, limit);
}

function dedupe(list) {
  const seenTitle = new Map(), seenUrl = new Set(), out = [];
  for (const a of list) {
    const bare = a.url.split('?')[0].replace(/\/$/, '');
    if (seenUrl.has(bare)) continue;
    const k = keyOf(a.title);
    const prev = seenTitle.get(k);
    if (prev) { if (a.weight > prev.weight) Object.assign(prev, a); continue; }
    seenUrl.add(bare); seenTitle.set(k, a); out.push(a);
  }
  return out;
}

const EU_RE = new RegExp('(^|[^a-z])(' +
  (SRC.europeHints || []).map(h => h.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') +
  ')([^a-z]|$)', 'i');

function classify(a) {
  if (a.region === 'europe' || a.market) return 'europe';
  if (EU_RE.test(a.title + ' ' + a.summary)) return 'both';
  return 'global';
}

/* ------------------------------------------------------------------ images */

/*
 * Open each candidate article once and take two things from it: the picture,
 * and whether a reader can actually read it. One fetch, both answers.
 */
async function inspect(items) {
  log('inspecting', items.length, 'articles for pictures and paywalls');
  let fetched = 0, blocked = 0;
  await pool(items, 8, async a => {
    const r = await get(a.url, { accept: 'text/html,application/xhtml+xml', timeout: 15000, maxBytes: 700 * 1024 });
    if (r.ok && r.body) {
      fetched++;
      if (!a.image) { const img = P.ogImage(r.body); if (img) a.image = img; }
      a.access = detectAccess(r.body) || sourceAccess(a.source);
      // A real story has prose. Section fronts and video stubs do not, and no
      // URL pattern catches all of them.
      const prose = (r.body.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
        .match(/<p[^>]*>[\s\S]*?<\/p>/g) || [])
        .join(' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      a.prose = prose.length;
      // Classify on the article's own text - a headline alone cannot tell
      // "Nike launches a film" from "Nike reviews its media account".
      const body = prose.slice(0, 6000);
      a.kind = kindOf(a.title, body) || 'other';
      a.sector = sectorOf(a.title, body);
      a.channel = channelOf(a.title, body);
    } else {
      // The publisher refused us, so fall back to what we know about them.
      blocked++;
      a.access = sourceAccess(a.source);
      a.kind = kindOf(a.title, a.summary) || 'other';
      a.sector = sectorOf(a.title, a.summary);
      a.channel = channelOf(a.title, a.summary);
    }
  });
  log('  read', fetched, 'articles;', blocked, 'refused our fetcher (used source policy)');
}

function extOf(url, ctype) {
  const m = (ctype || '').match(/image\/(jpeg|jpg|png|webp|gif|avif)/i);
  if (m) return m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
  const e = (url.split('?')[0].match(/\.(jpe?g|png|webp|gif|avif)$/i) || [])[1];
  return e ? e.toLowerCase().replace('jpeg', 'jpg') : 'jpg';
}

async function cacheImages(items) {
  fs.mkdirSync(IMG_DIR, { recursive: true });
  const onDisk = fs.readdirSync(IMG_DIR);
  const withImg = items.filter(a => a.image);
  log('caching', withImg.length, 'images');
  await pool(withImg, 6, async a => {
    const hash = crypto.createHash('sha1').update(a.image).digest('hex').slice(0, 16);
    const existing = onDisk.find(f => f.startsWith(hash + '.'));
    if (existing) { a.thumb = 'img/' + existing; return; }
    const r = await get(a.image, { accept: 'image/*', binary: true, timeout: 18000, maxBytes: MAX_IMG_BYTES });
    if (!r.ok || !r.buffer || r.buffer.length < 1200) { a.image = ''; return; }
    const ct = (r.headers && r.headers['content-type']) || '';
    if (ct && !/^image\//i.test(ct)) { a.image = ''; return; }
    const name = hash + '.' + extOf(a.image, ct);
    fs.writeFileSync(path.join(IMG_DIR, name), r.buffer);
    a.thumb = 'img/' + name;
  });
}

function pruneImages(keep) {
  if (!fs.existsSync(IMG_DIR)) return;
  const wanted = new Set(keep.map(t => path.basename(t)));
  let n = 0;
  for (const f of fs.readdirSync(IMG_DIR)) {
    if (f === '.gitkeep') continue;
    if (!wanted.has(f)) { fs.unlinkSync(path.join(IMG_DIR, f)); n++; }
  }
  if (n) log('pruned', n, 'stale images');
}

/* -------------------------------------------------------------------- main */

(async function main() {
  const t0 = Date.now();
  const now = Date.now();
  const feeds = SRC.feeds;

  const batches = await pool(feeds, 5, loadFeed);
  let all = [].concat.apply([], batches.filter(Boolean));
  log('collected', all.length, 'raw items');

  const cutoff = now - MAX_AGE_DAYS * 864e5;
  all = all.filter(a => !a.ts || a.ts > cutoff);
  all = all.filter(a => !a.ts || a.ts < now + 36e5);   // drop bad future dates
  all = dedupe(all);
  all.forEach(a => { a.rel = relevance(a); });
  // Broad market searches need a hard gate; curated trade feeds only need to not be off-topic.
  const beforeSpon = all.length;
  all = all.filter(a => !isSponsored(a));
  log('dropped', beforeSpon - all.length, 'sponsored / partner posts');
  // Off-topic copy is dropped everywhere now, not only in the Nordic column.
  all = all.filter(a => !isOffTopic(a));
  // And the mixed sources have to clear a relevance floor; the trade press does not.
  all = all.filter(a => { const min = strictnessFor(a); return !min || a.rel >= min; });
  all = all.filter(a => a.rel > -1);
  log('after dedupe + relevance', all.length);

  // Rank first, then look closely at only the plausible front-page candidates -
  // opening every one of 500 articles would be slow and rude.
  all.sort((x, y) => score(y, now) - score(x, now));
  const candidates = all.slice(0, INSPECT_BUDGET);
  await inspect(candidates);

  const thin = candidates.filter(a => a.prose !== undefined && a.prose < 600);
  if (thin.length) log('dropped', thin.length, 'pages with no article text (section fronts, video stubs)');

  const before = candidates.length;
  let pool2 = candidates.filter(a => !(a.prose !== undefined && a.prose < 600));
  pool2 = pool2.filter(a => a.access !== 'locked');
  const lockedOut = before - thin.length - pool2.length;
  if (!KEEP_METERED) pool2 = pool2.filter(a => a.access !== 'metered');
  log('dropped', lockedOut, 'paywalled articles' + (KEEP_METERED ? '' : ' (+ metered)'));

  const preCluster = pool2.length;
  pool2 = cluster(pool2);
  log('clustered', preCluster, '->', pool2.length, 'distinct stories');

  const buckets = { global: [], europe: [] };
  for (const a of pool2) {
    const c = classify(a);
    if (c === 'europe') buckets.europe.push(a);
    else if (c === 'both') { buckets.global.push(a); buckets.europe.push(a); }
    else buckets.global.push(a);
  }

  for (const k of Object.keys(buckets)) {
    buckets[k].sort((x, y) => score(y, now) - score(x, now));
    buckets[k] = diversify(buckets[k], PER_COLUMN[k], 9);
  }

  const picked = [].concat(buckets.global, buckets.europe);
  const unique = Array.from(new Set(picked));

  if (!NO_IMG && !HOSTED) await cacheImages(unique);

  // `thumb` is our local copy (used offline and in the sandboxed artifact);
  // `src` is the publisher's own URL, used when hosting, so we re-host nothing.
  const shape = a => ({
    title: a.title, url: a.url, source: a.source, host: a.host,
    summary: a.summary, ts: a.ts || null,
    thumb: HOSTED ? '' : (a.thumb || ''),
    src: a.image || '',
    access: a.access || 'open',
    alsoIn: (a.alsoIn || []).slice(0, 3),
    kind: a.kind || '', sector: a.sector || '', channel: a.channel || '',
    market: a.market || '', lang: a.lang
  });

  const out = {
    generatedAt: new Date().toISOString(),
    mode: HOSTED ? 'hosted' : 'local',
    counts: { global: buckets.global.length, europe: buckets.europe.length },
    policy: { paywalled: 'dropped', metered: KEEP_METERED ? 'kept and labelled' : 'dropped' },
    facets: { sectors: SECTORS, channels: CHANNELS },
    sources: Array.from(new Set([].concat(buckets.global, buckets.europe)
              .map(a => a.source))).sort(),
    global: buckets.global.map(shape),
    europe: buckets.europe.map(shape),
  };

  // Write via a temp file so a crash mid-write can never leave a half-parsed feed.
  const dest = path.join(ROOT, 'data', 'live.json');
  const tmp = dest + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(out, null, 1));
  fs.renameSync(tmp, dest);
  // Prune only once the new feed is safely on disk.
  if (!NO_IMG && !HOSTED) pruneImages(unique.filter(a => a.thumb).map(a => a.thumb));

  log('wrote data/live.json —', out.counts.global, 'global /', out.counts.europe, 'europe /',
      'with images:', unique.filter(a => a.thumb).length,
      '— took', ((Date.now() - t0) / 1000).toFixed(1) + 's');
})();
