#!/usr/bin/env node
'use strict';
/*
 * Builds data/awarded.json from lovetheworkmore.com's Cannes index, then folds
 * in the hand-researched cross-show awards (D&AD, Clio, Eurobest) from
 * data/awarded-extra.json.
 *
 * The index is laid out under level headings - GRAND PRIX / TITANIUM, GOLD,
 * SILVER, BRONZE - with entries reading "CAMPAIGN - BRAND (AGENCY CITY)", and
 * a bracketed category on the Grand Prix winners.
 *
 *   node build-awarded.js            Grand Prix + Gold + Silver
 *   node build-awarded.js --all      include Bronze too
 */
const fs = require('fs');
const path = require('path');
const { get } = require('./lib/fetch');
const P = require('./lib/parse');
const { placeOf } = require('./lib/places');

const SRC_URL = 'https://lovetheworkmore.com/2026-2/';
const LEVELS = { 'GRAND PRIX / TITANIUM': 'Grand Prix', 'GOLD': 'Gold', 'SILVER': 'Silver', 'BRONZE': 'Bronze' };
const WANT = process.argv.indexOf('--all') >= 0
  ? ['Grand Prix', 'Gold', 'Silver', 'Bronze']
  : ['Grand Prix', 'Gold', 'Silver'];

const DASH = /\s+[–—-]\s+/;   // en dash, em dash or hyphen, always spaced

function parseEntry(text) {
  let t = text.replace(/\s+/g, ' ').trim();
  let category = '';
  const br = t.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (br) { category = br[1].trim(); t = br[2].trim(); }

  // "CAMPAIGN - BRAND (AGENCY)" — the agency is the last parenthetical.
  let agency = '';
  const ag = t.match(/^(.*)\(([^()]*)\)\s*$/);
  if (ag) { t = ag[1].trim(); agency = ag[2].trim(); }

  const bits = t.split(DASH);
  if (bits.length < 2) return null;
  const campaign = bits[0].replace(/^[“"']|[”"']$/g, '').trim();
  const brand = bits.slice(1).join(' - ').trim();
  if (!campaign || !brand) return null;
  return { campaign, brand, agency, category };
}

// The index is written in caps. Brand and agency stay as-is - the card renders
// them uppercase anyway - but a campaign name has to read as a title, without
// turning SKF into "Skf".
const KEEP_CAPS = new Set(('ai tv pr ooh sdg b2b b2c uk us usa ny la sos pos skf bcp vml ddb bbdo ' +
  'tbwa kfc mtv bbc nhs hiv un wwf ikea lego h&m m&m mms kkk qr ar vr ux ui ceo cmo ' +
  'f1 nba nfl fifa uefa dna gps atm pc tv2 rtl sbs abc cbs nbc hbo').split(' '));

function noDash(s) {
  return String(s || '').replace(/\s+[\u2014\u2013]\s+/g, ' - ').replace(/[\u2014\u2013]/g, '-');
}

function titleCaseCampaign(s) {
  return s.split(/(\s+)/).map(function (w) {
    if (/^\s+$/.test(w)) return w;
    var bare = w.replace(/[^\w&']/g, '').toLowerCase();
    if (KEEP_CAPS.has(bare)) return w.toUpperCase();
    if (/^\d/.test(w)) return w.toUpperCase();              // 600K, 2036, 867-5309
    if (w.length <= 3 && !/[aeiouy]/i.test(bare)) return w.toUpperCase();
    return w.toLowerCase().replace(/(^|[\-\u2013/(\u201c"'])([a-z\u00e0-\u024f])/g,
      function (m, p, c) { return p + c.toUpperCase(); });
  }).join('');
}

function cleanCategory(c) {
  return c.replace(/\s*(GRAND PRIX|TITANIUM)\s*\+?\s*/gi, ' ')
          .replace(/\s{2,}/g, ' ')
          .replace(/^\W+|\W+$/g, '')
          .trim();
}

(async function main() {
  const r = await get(SRC_URL, { accept: 'text/html', timeout: 40000, maxBytes: 4e6 });
  if (!r.ok) { console.error('[awarded] could not fetch index:', r.status); process.exit(1); }

  const html = r.body.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');

  // Walk headings and links in document order so each entry inherits its level.
  const tokens = [];
  const re = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>|<(?:p|strong|b)[^>]*>\s*([A-Z][A-Z\s/]{3,30})\s*<\/(?:p|strong|b)>|<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    if (m[1] !== undefined || m[2] !== undefined) {
      const t = P.strip(m[1] !== undefined ? m[1] : m[2]).toUpperCase().trim();
      if (LEVELS[t]) tokens.push({ kind: 'level', level: LEVELS[t] });
    } else {
      tokens.push({ kind: 'link', href: P.decode(m[3]), text: P.strip(m[4]) });
    }
  }

  let level = '';
  const out = [];
  const seen = new Set();
  for (const t of tokens) {
    if (t.kind === 'level') { level = t.level; continue; }
    if (!level || WANT.indexOf(level) < 0) continue;
    if (!/^https?:/i.test(t.href)) continue;
    if (/lovetheworkmore|wp-content|mailto:/i.test(t.href)) continue;

    const e = parseEntry(t.text);
    if (!e) continue;
    const key = e.campaign.toLowerCase() + '|' + e.brand.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const place = placeOf(e.agency);
    out.push({
      campaign: noDash(titleCaseCampaign(e.campaign)),
      brand: noDash(e.brand),
      agency: noDash(e.agency),
      country: place.country,
      region: place.region,
      url: t.href.replace(/&amp;/g, '&'),
      awards: [{
        show: 'Cannes Lions',
        level: e.category && /GRAND PRIX/i.test(e.category) ? 'Grand Prix'
             : e.category && /TITANIUM/i.test(e.category) ? 'Titanium' : level,
        category: e.category ? noDash(titleCaseCampaign(cleanCategory(e.category)) || 'Titanium') : ''
      }]
    });
  }

  // Fold in the cross-show research, matched on campaign name.
  const extraPath = path.join(__dirname, 'data', 'awarded-extra.json');
  let merged = 0;
  if (fs.existsSync(extraPath)) {
    const extra = JSON.parse(fs.readFileSync(extraPath, 'utf8'));
    for (const x of extra.cases) {
      const hit = out.find(c => c.campaign.toLowerCase() === x.campaign.toLowerCase());
      if (hit) {
        x.awards.forEach(a => {
          if (a.show === 'Cannes Lions') return;           // already have it from the index
          hit.awards.push(a);
        });
        if (x.blurb) hit.blurb = x.blurb;
        merged++;
      } else {
        out.push(Object.assign({ region: placeOf(x.agency).region, country: placeOf(x.agency).country || x.country }, x));
      }
    }
  }

  const shows = [];
  out.forEach(c => c.awards.forEach(a => { if (shows.indexOf(a.show) < 0) shows.push(a.show); }));

  const doc = {
    generated: new Date().toISOString().slice(0, 10),
    note: 'Cannes Lions winners indexed by lovetheworkmore.com, with D&AD, Clio and Eurobest recognition researched separately and merged in.',
    shows,
    levels: WANT,
    cases: out
  };
  fs.writeFileSync(path.join(__dirname, 'data', 'awarded.json'), JSON.stringify(doc, null, 1));

  const byLevel = {};
  out.forEach(c => { const l = c.awards[0].level; byLevel[l] = (byLevel[l] || 0) + 1; });
  console.log('[awarded]', out.length, 'cases |', JSON.stringify(byLevel));
  console.log('[awarded] cross-show merges:', merged, '| shows:', shows.join(', '));
  console.log('[awarded] region split:', JSON.stringify(
    out.reduce((m, c) => (m[c.region] = (m[c.region] || 0) + 1, m), {})));
})();
