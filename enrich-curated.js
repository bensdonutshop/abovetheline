#!/usr/bin/env node
'use strict';
/*
 * Resolves a thumbnail for every hand-curated entry (topics, campaigns,
 * Nordic work, awarded cases) and writes it back into the data file.
 *
 * Articles give up an og:image. Video hosts are easier: YouTube exposes a
 * thumbnail by id, and Vimeo answers oEmbed - neither needs a key.
 */
const fs = require('fs');
const path = require('path');
const { get, pool } = require('./lib/fetch');
const P = require('./lib/parse');

function youtubeId(url) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  return m ? m[1] : null;
}
function vimeoId(url) {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

async function firstWorking(urls) {
  for (const u of urls) {
    const r = await get(u, { accept: 'image/*', binary: true, timeout: 12000, maxBytes: 400 * 1024 });
    const ct = (r.headers && r.headers['content-type']) || '';
    if (r.ok && /^image\//i.test(ct) && r.buffer && r.buffer.length > 3000) return u;
  }
  return '';
}

async function thumbFor(url) {
  const yt = youtubeId(url);
  if (yt) {
    return await firstWorking([
      'https://i.ytimg.com/vi/' + yt + '/maxresdefault.jpg',
      'https://i.ytimg.com/vi/' + yt + '/hqdefault.jpg'
    ]);
  }
  const vm = vimeoId(url);
  if (vm) {
    const r = await get('https://vimeo.com/api/oembed.json?url=' + encodeURIComponent('https://vimeo.com/' + vm) +
                        '&width=1280', { accept: 'application/json', timeout: 12000 });
    if (r.ok) {
      try {
        const j = JSON.parse(r.body);
        if (j.thumbnail_url) return j.thumbnail_url.replace(/-d_\d+x\d+$/, '-d_1280x720');
      } catch (e) { /* fall through to og:image */ }
    }
  }
  const r = await get(url, { accept: 'text/html', timeout: 15000, maxBytes: 600 * 1024 });
  if (r.ok && r.body) return P.ogImage(r.body) || '';
  return '';
}

(async function main() {
  const file = process.argv[2] || 'data/curated.json';
  const d = JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));

  const targets = [];
  for (const key of ['topics', 'campaigns12m', 'cannes2026', 'nordicSeed', 'cases']) {
    if (Array.isArray(d[key])) d[key].forEach(x => targets.push(x));
  }
  const need = targets.filter(x => x.url && !x.thumb);
  console.log('[enrich] resolving', need.length, 'thumbnails');

  let got = 0;
  await pool(need, 6, async x => {
    const t = await thumbFor(x.url);
    if (t) { x.thumb = t; got++; }
  });

  fs.writeFileSync(path.join(__dirname, file), JSON.stringify(d, null, 2));
  console.log('[enrich] found', got, 'of', need.length, '->', file);
})();
