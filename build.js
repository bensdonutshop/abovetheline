#!/usr/bin/env node
'use strict';
/*
 * Builds the deployable site into dist/.
 * page.html is a fragment (so it can also be published as an artifact);
 * here it gets wrapped into a full document.
 *
 *   node build.js           bundle the local cached images too
 *   node build.js --hosted  reference publishers' own image URLs, ship no images
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const HOSTED = process.argv.indexOf('--hosted') >= 0;

const HEAD = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="A live front page for the advertising trade press - global and European campaign news, the year's most talked-about work, Cannes Lions 2026 case films and Nordic campaign heat.">
<meta name="robots" content="noindex">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
body{margin:0;font:14px system-ui,sans-serif;background:#f6f5f2}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
`;

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  let n = 0;
  for (const f of fs.readdirSync(from)) {
    const s = path.join(from, f);
    if (fs.statSync(s).isFile()) { fs.copyFileSync(s, path.join(to, f)); n++; }
  }
  return n;
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'data'), { recursive: true });

fs.writeFileSync(path.join(DIST, 'index.html'),
  HEAD + fs.readFileSync(path.join(ROOT, 'page.html'), 'utf8') + '\n</body></html>');

for (const f of ['live.json', 'curated.json', 'awarded.json']) {
  fs.copyFileSync(path.join(ROOT, 'data', f), path.join(DIST, 'data', f));
}

// The redesign ships alongside the current site at /next/ so the two can be
// compared on the same data. Its data files are copied in because the page
// resolves them relative to its own directory.
const nextSrc = path.join(ROOT, 'page-next.html');
if (fs.existsSync(nextSrc)) {
  fs.mkdirSync(path.join(DIST, 'next', 'data'), { recursive: true });
  fs.writeFileSync(path.join(DIST, 'next', 'index.html'),
    HEAD + fs.readFileSync(nextSrc, 'utf8') + '\n</body></html>');
  for (const f of ['live.json', 'curated.json', 'awarded.json']) {
    fs.copyFileSync(path.join(ROOT, 'data', f), path.join(DIST, 'next', 'data', f));
  }
  if (!HOSTED && fs.existsSync(path.join(ROOT, 'public', 'img'))) {
    copyDir(path.join(ROOT, 'public', 'img'), path.join(DIST, 'next', 'img'));
  }
}

// Stops GitHub Pages running the output through Jekyll.
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');

let imgs = 0;
if (!HOSTED && fs.existsSync(path.join(ROOT, 'public', 'img'))) {
  imgs = copyDir(path.join(ROOT, 'public', 'img'), path.join(DIST, 'img'));
}

const size = (function du(d) {
  return fs.readdirSync(d).reduce((t, f) => {
    const p = path.join(d, f), st = fs.statSync(p);
    return t + (st.isDirectory() ? du(p) : st.size);
  }, 0);
})(DIST);

console.log('[build] dist/ ready -', HOSTED ? 'hosted mode (no images bundled)' : imgs + ' images bundled',
            '-', (size / 1024).toFixed(0) + 'KB');
