'use strict';

const ENT = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '',
  hellip: '…', mdash: '—', ndash: '–', minus: '−',
  lsquo: '‘', rsquo: '’', sbquo: '‚',
  ldquo: '“', rdquo: '”', bdquo: '„',
  laquo: '«', raquo: '»', bull: '•', middot: '·',
  trade: '™', reg: '®', copy: '©', deg: '°',
  euro: '€', pound: '£', yen: '¥', cent: '¢',
  times: '×', divide: '÷', prime: '′',
  rarr: '→', larr: '←', dagger: '†',
  aring: 'å', Aring: 'Å', auml: 'ä', Auml: 'Ä',
  ouml: 'ö', Ouml: 'Ö', aelig: 'æ', AElig: 'Æ',
  oslash: 'ø', Oslash: 'Ø', eacute: 'é', Eacute: 'É',
  egrave: 'è', agrave: 'à', ccedil: 'ç', uuml: 'ü', Uuml: 'Ü',
  ntilde: 'ñ', szlig: 'ß', iacute: 'í', oacute: 'ó', uacute: 'ú',
  '#39': "'"
};

function decode(s) {
  if (!s) return '';
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, function (_, h) { try { return String.fromCodePoint(parseInt(h, 16)); } catch (e) { return ''; } })
    .replace(/&#(\d+);/g, function (_, d) { try { return String.fromCodePoint(+d); } catch (e) { return ''; } })
    .replace(/&([a-z]+|#\d+);/gi, function (m, n) { return ENT[n] !== undefined ? ENT[n] : (ENT[n.toLowerCase()] !== undefined ? ENT[n.toLowerCase()] : m); });
}

function strip(s) {
  let t = decode(String(s || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
  t = t.replace(/\s*\[\s*(?:\u2026|\.\.\.)\s*\]\s*$/, '\u2026');
  t = t.replace(/\s*The post .{0,140}? appeared first on .{0,60}?\.?\s*$/i, '');
  t = t.replace(/\s*(Continue reading|Read more|L\u00e4s mer|Lue lis\u00e4\u00e4)[\s\u2026.]*$/i, '');
  t = t.replace(/[\s.,:;\u2013\u2014-]*(Source|K\u00e4lla|L\u00e4hde)\s*$/i, '');
  // Typographic normalisation only: swap the dash glyph, never the words.
  // Publisher headlines stay verbatim otherwise.
  t = t.replace(/\s+[\u2014\u2013]\s+/g, ' - ').replace(/[\u2014\u2013]/g, '-');
  return t.trim();
}

function tag(xml, name) {
  const re = new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + name + '>', 'i');
  const m = xml.match(re);
  return m ? decode(m[1]).trim() : '';
}

function attrOf(xml, name, attr) {
  const re = new RegExp('<' + name + '\\b[^>]*\\b' + attr + '="([^"]+)"', 'i');
  const m = xml.match(re);
  return m ? decode(m[1]).trim() : '';
}

function firstImgIn(html) {
  if (!html) return '';
  const m = String(html).match(/<img\b[^>]*?\bsrc=["']([^"']+)["']/i);
  return m ? decode(m[1]) : '';
}

function pickImage(block) {
  // Order matters: explicit media tags beat images scraped out of body HTML.
  const cands = [
    attrOf(block, 'media:content', 'url'),
    attrOf(block, 'media:thumbnail', 'url'),
    attrOf(block, 'enclosure', 'url'),
    attrOf(block, 'image', 'href'),
    firstImgIn(tag(block, 'content:encoded')),
    firstImgIn(tag(block, 'description')),
    firstImgIn(tag(block, 'summary')),
    tag(block, 'image')
  ];
  for (const c of cands) {
    if (c && /^https?:\/\//i.test(c) && !/\.(svg)(\?|$)/i.test(c)) return c;
  }
  return '';
}

// RSS 2.0 and Atom
function parseFeed(xml) {
  if (!xml) return [];
  const out = [];
  const items = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || [];
  for (const b of items) {
    const link = tag(b, 'link') || attrOf(b, 'link', 'href') || tag(b, 'guid');
    out.push({
      title: strip(tag(b, 'title')),
      link: link,
      summary: strip(tag(b, 'description') || tag(b, 'content:encoded')).slice(0, 400),
      date: tag(b, 'pubDate') || tag(b, 'dc:date') || tag(b, 'published') || '',
      image: pickImage(b),
      srcName: strip(tag(b, 'source'))
    });
  }
  if (out.length) return out;

  const entries = xml.match(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi) || [];
  for (const b of entries) {
    out.push({
      title: strip(tag(b, 'title')),
      link: attrOf(b, 'link', 'href') || tag(b, 'id'),
      summary: strip(tag(b, 'summary') || tag(b, 'content')).slice(0, 400),
      date: tag(b, 'updated') || tag(b, 'published') || '',
      image: pickImage(b),
      srcName: ''
    });
  }
  return out;
}

// Bing News RSS wraps the destination in ?url=<encoded>
function unwrapBing(link) {
  try {
    const u = new URL(link);
    const real = u.searchParams.get('url');
    if (real) return real;
  } catch (e) { /* fall through */ }
  return link;
}

// Article-card scrape for sites that render <article> blocks server-side.
function parseArticles(html, cfg) {
  const out = [];
  const blocks = html.match(/<article\b[\s\S]*?<\/article>/gi) || [];
  for (const b of blocks) {
    const hrefs = [];
    const re = /href="([^"]+)"/gi; let m;
    while ((m = re.exec(b))) hrefs.push(decode(m[1]));
    let href = hrefs.find(function (h) { return !cfg.linkFilter || h.indexOf(cfg.linkFilter) >= 0; });
    if (!href) continue;
    if (href.startsWith('/')) href = (cfg.base || '') + href;

    const heading = strip((b.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i) || [])[1] || '');
    const text = strip(b);
    const title = heading || text.split(/\s{2,}/)[0] || text.slice(0, 90);
    if (!title) continue;

    let img = firstImgIn(b);
    if (img && img.startsWith('//')) img = 'https:' + img;
    if (img && img.startsWith('/')) img = (cfg.base || '') + img;

    let summary = '';
    if (heading && text.indexOf(heading) === 0) summary = text.slice(heading.length).trim();
    else summary = text.replace(title, '').trim();

    out.push({ title: title, link: href, summary: summary.slice(0, 300), date: '', image: img, srcName: '' });
  }
  return out;
}

function ogImage(html) {
  const pats = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i
  ];
  for (const p of pats) { const m = html.match(p); if (m && /^https?:\/\//i.test(m[1])) return decode(m[1]); }
  return '';
}

module.exports = { decode, strip, tag, attrOf, parseFeed, parseArticles, unwrapBing, ogImage, firstImgIn };
