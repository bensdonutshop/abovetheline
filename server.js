#!/usr/bin/env node
'use strict';
/*
 * Above The Line — local server.
 * Serves the page, the cached images and the data, and re-pulls the
 * feeds on a timer so the front page keeps moving on its own.
 *
 *   node server.js            → http://localhost:4173
 *   PORT=8080 node server.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);
const EVERY_MIN = Number(process.env.REFRESH_MINUTES || 8);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

const SHELL_HEAD = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="A live front page for the advertising trade press — global and European campaign news, the year's most talked-about work, Cannes Lions 2026 case films and Nordic campaign heat.">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
body{margin:0;font:14px system-ui,sans-serif;background:#f6f5f2}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
`;
const SHELL_FOOT = `
</body></html>`;

let refreshing = false;
let lastRun = 0;

function runRefresh(cb) {
  if (refreshing) return cb && cb(new Error('already running'));
  refreshing = true;
  const t0 = Date.now();
  console.log('[server] refreshing feeds…');
  execFile(process.execPath, [path.join(ROOT, 'refresh.js')], { cwd: ROOT, timeout: 5 * 60000 }, (err, stdout, stderr) => {
    refreshing = false;
    lastRun = Date.now();
    const tail = String(stdout || '').trim().split('\n').slice(-1)[0];
    if (err) {
      const why = err.killed ? 'timed out' : ('exit ' + (err.code === undefined ? '?' : err.code));
      console.error('[server] refresh failed (' + why + ') - keeping the last good wire');
      const detail = String(stderr || '').trim() ||
                     String(stdout || '').trim().split('\n').slice(-3).join(' | ');
      if (detail) console.error('[server]   ' + detail.slice(0, 500));
    }
    else console.log('[server]', tail, '(' + ((Date.now() - t0) / 1000).toFixed(1) + 's)');
    cb && cb(err);
  });
}

function send(res, code, body, type, extra) {
  res.writeHead(code, Object.assign({
    'Content-Type': type || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache'
  }, extra || {}));
  res.end(body);
}

function serveFile(res, file, immutable) {
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, 'Not found');
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    send(res, 200, buf, type, immutable ? { 'Cache-Control': 'public, max-age=604800' } : null);
  });
}

// Resolve a request path inside the project, refusing anything that escapes it.
function safeJoin(base, target) {
  const p = path.normalize(path.join(base, decodeURIComponent(target)));
  return p.startsWith(base) ? p : null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  if (p === '/next' || p === '/next/') {
    return fs.readFile(path.join(ROOT, 'page-next.html'), 'utf8', (err, html) => {
      if (err) return send(res, 500, 'page-next.html missing');
      send(res, 200, SHELL_HEAD + html + SHELL_FOOT, TYPES['.html']);
    });
  }

  if (p === '/' || p === '/index.html') {
    return fs.readFile(path.join(ROOT, 'page.html'), 'utf8', (err, html) => {
      if (err) return send(res, 500, 'page.html missing');
      send(res, 200, SHELL_HEAD + html + SHELL_FOOT, TYPES['.html']);
    });
  }

  if (p === '/api/refresh' && req.method === 'POST') {
    return runRefresh(err => send(res, err ? 503 : 200,
      JSON.stringify({ ok: !err, at: new Date().toISOString() }), TYPES['.json']));
  }

  if (p === '/api/status') {
    return send(res, 200, JSON.stringify({
      refreshing, lastRun: lastRun || null, everyMinutes: EVERY_MIN
    }), TYPES['.json']);
  }

  if (p.startsWith('/data/')) {
    const f = safeJoin(path.join(ROOT, 'data'), p.slice(6));
    return f ? serveFile(res, f) : send(res, 403, 'Forbidden');
  }

  if (p.startsWith('/img/')) {
    const f = safeJoin(path.join(ROOT, 'public', 'img'), p.slice(5));
    return f ? serveFile(res, f, true) : send(res, 403, 'Forbidden');
  }

  send(res, 404, 'Not found');
});

function start(port, attempt) {
  attempt = attempt || 0;
  server.listen(port);
  server.once('error', function (err) {
    if (err.code === 'EADDRINUSE' && attempt < 12) {
      console.log('[server] port ' + port + ' is busy, trying ' + (port + 1) + '…');
      server.removeAllListeners('listening');
      return start(port + 1, attempt + 1);
    }
    console.error('\n  Could not start: ' + err.message + '\n');
    process.exit(1);
  });
  server.once('listening', function () {
    const live = server.address().port;
    console.log('\n  Above the Line  →  http://localhost:' + live);
    console.log('  refreshing the wire every ' + EVERY_MIN + ' min · ctrl-c to stop\n');
    try { fs.writeFileSync(path.join(ROOT, '.port'), String(live)); } catch (e) {}
    const f = path.join(ROOT, 'data', 'live.json');
    const age = fs.existsSync(f) ? Date.now() - fs.statSync(f).mtimeMs : Infinity;
    if (age > EVERY_MIN * 60000) runRefresh();
    setInterval(runRefresh, EVERY_MIN * 60000);
  });
}

process.on('SIGINT', function () {
  try { fs.unlinkSync(path.join(ROOT, '.port')); } catch (e) {}
  console.log('\n  Stopped.\n');
  process.exit(0);
});

start(PORT);
