'use strict';
const https = require('https'), http = require('http'), zlib = require('zlib');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

function get(url, opts, depth) {
  opts = opts || {}; depth = depth || 0;
  return new Promise(function (resolve) {
    if (depth > 6) return resolve({ ok: false, status: 'too-many-redirects', url: url });
    let u;
    try { u = new URL(url); } catch (e) { return resolve({ ok: false, status: 'bad-url', url: url }); }
    const lib = u.protocol === 'https:' ? https : http;
    const headers = Object.assign({
      'User-Agent': UA,
      'Accept': opts.accept || 'application/rss+xml, application/xml, text/xml, text/html, */*',
      'Accept-Language': opts.lang || 'en-GB,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate'
    }, opts.headers || {});

    const req = lib.request(u, { method: opts.method || 'GET', headers: headers, timeout: opts.timeout || 20000 }, function (res) {
      const code = res.statusCode;
      if ([301, 302, 303, 307, 308].indexOf(code) >= 0 && res.headers.location) {
        res.resume();
        return get(new URL(res.headers.location, u).href, opts, depth + 1).then(resolve);
      }
      const chunks = [];
      let total = 0, settled = false, truncated = false;
      const cap = opts.maxBytes || 6 * 1024 * 1024;
      const finish = function () {
        if (settled) return; settled = true;
        let buf = Buffer.concat(chunks);
        const enc = (res.headers['content-encoding'] || '').toLowerCase();
        try {
          if (enc === 'gzip') buf = zlib.gunzipSync(buf);
          else if (enc === 'deflate') buf = zlib.inflateSync(buf);
          else if (enc === 'br') buf = zlib.brotliDecompressSync(buf);
        } catch (e) { /* serve what we have */ }
        resolve({
          ok: code >= 200 && code < 300 && !truncated,
          status: code,
          truncated: truncated,
          url: u.href,
          headers: res.headers,
          buffer: buf,
          body: opts.binary ? null : buf.toString('utf8')
        });
      };
      res.on('data', function (c) {
        total += c.length;
        if (total > cap) { truncated = true; res.destroy(); finish(); return; }
        chunks.push(c);
      });
      res.on('end', finish);
      res.on('close', finish);
      res.on('error', finish);
    });
    const deadline = setTimeout(function () {
      req.destroy();
      resolve({ ok: false, status: 'deadline', url: url });
    }, (opts.timeout || 20000) + 10000);
    deadline.unref && deadline.unref();
    const done = function (r) { clearTimeout(deadline); return r; };
    const _resolve = resolve;
    resolve = function (r) { clearTimeout(deadline); _resolve(r); };
    req.on('timeout', function () { req.destroy(); resolve({ ok: false, status: 'timeout', url: url }); });
    req.on('error', function (e) { resolve({ ok: false, status: 'ERR ' + (e.code || e.message), url: url }); });
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

// Run promise-returning tasks with bounded concurrency.
async function pool(items, limit, worker) {
  const out = new Array(items.length);
  let i = 0;
  const runners = new Array(Math.min(limit, items.length)).fill(0).map(async function () {
    while (i < items.length) {
      const idx = i++;
      try { out[idx] = await worker(items[idx], idx); }
      catch (e) { out[idx] = null; }
    }
  });
  await Promise.all(runners);
  return out;
}

module.exports = { get: get, pool: pool, UA: UA };
