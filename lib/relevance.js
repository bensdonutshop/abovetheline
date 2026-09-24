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
  'r/ga','innocean','serviceplan','grey ','saatchi','jung von matt','iris ','vcpp','vccp',
  'retail media','creator marketing','influencer marketing','brand budget','media network',
  'client management','account management','new business','appoints','joins dentsu','ad product',
  'momma-priset','guldnyckeln','100-wattaren',
  // swedish
  'kampanj','reklam','reklamfilm','reklambyrå','byrå','varumärke','annons','annonsör','marknadsföring',
  'marknadschef','kreatör','kommunikationsbyrå','mediebyrå','mediebyrån','lanserar kampanj','ny kampanj',
  // finnish
  'mainos','mainonta','mainoskampanja','mainostoimisto','kampanja','brändi','markkinointi',
  'markkinointijohtaja','viestintätoimisto','mainoselokuva','lanseeraa'
];

const WEAK = ['launch','unveil','debut','partnership','sponsorship','creator','influencer','social',
              'media','content','lanserar','samarbete','yhteistyö','kumppanuus'];

/*
 * Per-source strictness (C7). A relevance floor cannot be global: the trade
 * press writes about advertising by definition, and several of those feeds
 * carry no summary at all, so their headlines score zero and a floor would
 * delete the journalism while keeping the junk. The floor belongs on the
 * sources that mix in other beats: regional PR wires, social-media blogs and
 * general media papers.
 */
const STRICT_SOURCES = {
  'Branding in Asia': 2,   // carries tourism, cruise and hospitality PR
  'WERSM': 2,              // carries gaming and platform-product news
  'Dagens Media': 2,       // a general media paper: press law, court reporting
  'Finland': 2,            // language-scoped Bing search, not a trade feed
  'Sweden': 2
};

function strictnessFor(a) {
  return STRICT_SOURCES[a.source] || 0;
}

const OFF = [
  'ratings','viewership','box office','subscriber numbers','quarterly earnings','earnings call',
  'obituary','dies at','passed away','court hearing','murder','police','weather',
  'sports rights','ishockey','shl','allsvenskan','fotbollsmatch','hockeymatch','jääkiekko',
  'nude','naken','alaston','poseerasi','onlyfans','bikini',
  'vita huset','white house press','riksdag','eduskunta','regeringen','hallitus',
  'valet drunknade','valrörelse','partiledare','puoluejohtaja','kuntavaalit',
  // Beats the panel caught leaking in from the mixed sources.
  'cruise','itinerar','sailings','shore excursion','tourism expo','travel expo',
  'destinations with','resort opening','hotel opening','flight route','new route',
  'expansion pack','vaulted content','content vault','patch notes','season pass',
  'dlc','game update','raid returns',
  'vote-buying','vote buying','röstköp','namngav vittnen','åtalade','förundersökning'
];

function lc(a) { return (a.title + ' ' + (a.summary || '')).toLowerCase(); }

const SPONSORED = [
  'created in partnership with','sponsored by','sponsored content','paid post','paid content',
  'brought to you by','promoted content','advertorial','[sponsored]','in association with',
  'annonssamarbete','sponsrat inneh','kaupallinen yhteisty','mainossis'
];

// Publishers file commercial content under a giveaway path, which is far more
// reliable than reading the copy: digiday.com/sponsored/, forbes /brandvoice/.
const SPONSORED_PATH = /\/(sponsored|sponsor|partner-content|partnercontent|brandvoice|brand-voice|advertorial|promoted|paid-post|native)(\/|$|\?)/i;

// Section fronts, listings and event pages are not stories.
const NOT_AN_ARTICLE = /\/(tv|live|events?|awards?|webinars?|podcasts?|newsletters?|subscribe|about|contact|users?|authors?|tag|tags|category|categories|search)(\/|$|\?)/i;

function isNonArticleUrl(url) {
  try {
    const u = new URL(url);
    if (SPONSORED_PATH.test(u.pathname)) return true;
    // Only treat it as a listing when there is nothing article-shaped after it.
    if (NOT_AN_ARTICLE.test(u.pathname)) {
      const tail = u.pathname.replace(/\/+$/, '').split('/').pop() || '';
      if (tail.length < 25 && !/-.*-/.test(tail)) return true;
    }
    return false;
  } catch (e) { return false; }
}

// Trade titles push partner posts down the same feed as editorial.
function isSponsored(a) {
  if (a.url && SPONSORED_PATH.test(a.url)) return true;
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

module.exports = { relevance, isOffTopic, isSponsored, isNonArticleUrl, strictnessFor, STRICT_SOURCES };
