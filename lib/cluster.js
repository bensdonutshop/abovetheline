'use strict';
/*
 * The trade press covers the same news repeatedly - a WPP account win runs in
 * Ad Age, Campaign and Marketing Dive on the same morning, under different
 * headlines. Exact-title de-duplication misses that entirely.
 *
 * So group stories that are plainly the same event, and keep the version a
 * reader can actually open.
 */

const STOP = new Set(('a an the and or but of to in on for with at by from as is are was were ' +
  'be been its it this that these those new now first out up off over into after before ' +
  'och att som med för av den det en ett på ja on se ne sen').split(' '));

function tokens(title) {
  return title.toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w));
}

// Capitalised words are usually the brand and agency names - the part that
// actually identifies the story.
// Every other trade headline contains these, so they must never be what makes
// two stories count as "the same".
const GENERIC_ENT = new Set(('campaign campaigns media brand brands global agency agencies marketing ' +
  'group creative work ads advertising new first best world year super bowl awards ' +
  'report study launch launches data digital social video film review week ' +
  'kampanj reklam varumaerke mainos kampanja brandi').split(' '));

function entities(title) {
  return new Set((title.match(/\b[A-Z][\w&'À-ɏ]{2,}/g) || [])
    .map(w => w.toLowerCase())
    .filter(w => !STOP.has(w)));
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let hit = 0;
  for (const t of a) if (b.has(t)) hit++;
  return hit / (a.size + b.size - hit);
}

function sameStory(x, y) {
  const j = jaccard(x._tok, y._tok);
  if (j >= 0.62) return true;

  // Outlets word the same news very differently ("Beats taps multiple Kendall
  // Jenners" vs "Beats clones Kendall Jenner"), so word overlap alone is weak.
  // Lean on the named parties instead - but only names that actually identify
  // something. Two stories both containing "campaign" and "brand" are not the
  // same story; two both naming Beats and Kendall almost certainly are.
  const shared = [...x._ent].filter(e => y._ent.has(e));
  const named = shared.filter(e => !GENERIC_ENT.has(e));
  if (named.length >= 2 && j >= 0.2) return true;
  return j >= 0.38 && shared.length >= 2;
}

const RANK = { open: 0, metered: 1, locked: 2 };

/**
 * Collapse near-duplicate stories. Within a cluster the winner is the one a
 * reader can open; ties break on masthead weight, then on having a picture.
 * Returns the kept items, each carrying `alsoIn` (the outlets it displaced).
 */
function cluster(items) {
  for (const a of items) { a._tok = new Set(tokens(a.title)); a._ent = entities(a.title); }

  const groups = [];
  for (const a of items) {
    const g = groups.find(grp => grp.some(b => sameStory(a, b)));
    if (g) g.push(a); else groups.push([a]);
  }

  const kept = [];
  for (const g of groups) {
    g.sort((p, q) =>
      (RANK[p.access] - RANK[q.access]) ||
      (q.weight - p.weight) ||
      ((q.image ? 1 : 0) - (p.image ? 1 : 0)) ||
      ((q.ts || 0) - (p.ts || 0)));
    const win = g[0];
    win.alsoIn = g.slice(1).map(o => o.source).filter((v, i, s) => s.indexOf(v) === i);
    kept.push(win);
  }

  for (const a of items) { delete a._tok; delete a._ent; }
  return kept;
}

module.exports = { cluster, sameStory, tokens };
