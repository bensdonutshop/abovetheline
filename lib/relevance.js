'use strict';
/*
 * Scores how much an item is actually about advertising/marketing work,
 * across English, Swedish and Finnish. Broad market searches (Bing FI/SE)
 * and general trade feeds (Dagens Media) both carry a lot of adjacent
 * news — sport rights, ratings, obituaries — that does not belong here.
 */

const STRONG = [
  // work & craft
  'campaign','ad campaign','advert','advertising','commercial','creative','rebrand','brand platform',
  'brand identity','logo','out-of-home','ooh','copywrit','art director','creative director','spot',
  'brand film','tvc','super bowl ad','christmas ad','media account','pitch win','account win','review win',
  // industry
  'agency','adland','cmo','chief marketing','marketer','marketing','brand','branding','media agency',
  'wpp','omnicom','publicis','havas','dentsu','interpublic','tbwa','bbdo','ogilvy','mccann','ddb',
  'vml','droga5','wieden','uncommon','accenture song','mother london','leo burnett','adam&eve',
  'cannes lions','d&ad','clio awards','effie','one show','guldägget','vuoden huiput',
  // swedish
  'kampanj','reklam','reklamfilm','reklambyrå','byrå','varumärke','annons','annonsör','marknadsföring',
  'marknadschef','kreatör','kommunikationsbyrå','mediebyrå','mediebyrån','lanserar kampanj','ny kampanj',
  // finnish
  'mainos','mainonta','mainoskampanja','mainostoimisto','kampanja','brändi','markkinointi',
  'markkinointijohtaja','viestintätoimisto','mainoselokuva','lanseeraa'
];

const WEAK = ['launch','unveil','debut','partnership','sponsorship','creator','influencer','social',
              'media','content','lanserar','samarbete','yhteistyö','kumppanuus'];

const OFF = [
  'ratings','viewership','box office','subscriber numbers','quarterly earnings','earnings call',
  'obituary','dies at','passed away','court hearing','murder','police','weather',
  'sports rights','ishockey','shl','allsvenskan','fotbollsmatch','hockeymatch','jääkiekko',
  'nude','naken','alaston','poseerasi','onlyfans','bikini',
  'vita huset','white house press','riksdag','eduskunta','regeringen','hallitus',
  'valet drunknade','valrörelse','partiledare','puoluejohtaja','kuntavaalit'
];

function lc(a) { return (a.title + ' ' + (a.summary || '')).toLowerCase(); }

const SPONSORED = [
  'created in partnership with','sponsored by','sponsored content','paid post','paid content',
  'brought to you by','promoted content','advertorial','[sponsored]','in association with',
  'annonssamarbete','sponsrat inneh','kaupallinen yhteisty','mainossis'
];

// Trade titles push partner posts down the same feed as editorial.
function isSponsored(a) {
  if (/^\s*(sponsored|partner content|advertisement)\b/i.test(a.title || '')) return true;
  const h = ((a.title || '') + ' ' + (a.summary || '')).toLowerCase();
  return SPONSORED.some(t => h.indexOf(t) >= 0);
}

function isOffTopic(a) {
  const h = lc(a);
  return OFF.some(t => h.indexOf(t) >= 0);
}

function relevance(a) {
  const h = lc(a);
  let s = 0;
  for (const t of STRONG) if (h.indexOf(t) >= 0) { s += 2; if (s >= 8) break; }
  for (const t of WEAK) if (h.indexOf(t) >= 0) { s += 0.5; if (s >= 10) break; }
  for (const t of OFF) if (h.indexOf(t) >= 0) { s -= 4; }
  return s;
}

module.exports = { relevance, isOffTopic, isSponsored };
