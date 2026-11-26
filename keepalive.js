#!/usr/bin/env node
'use strict';
/*
 * Keeps the refresh schedule from being switched off.
 *
 * GitHub disables scheduled workflows in a public repository "when no
 * repository activity has occurred in 60 days". The refresh workflow pulls
 * feeds and deploys Pages but never commits, so this repo looked completely
 * idle to GitHub and the schedule was switched off on day 60 — the site's last
 * refresh was exactly 60 days after the last commit.
 *
 * This rotates the minute offset on the refresh cron once a month. Two things
 * come out of that, and the second is the one that matters:
 *
 *   1. the commit is repository activity, and
 *   2. it is specifically a change to the cron line, which GitHub documents as
 *      the thing that brings a deactivated schedule back:
 *      "if a user with write permissions to the repository makes a commit that
 *       changes the cron schedule on the workflow, the workflow will be
 *       reactivated".
 *
 * The offset is the month number, so it genuinely differs from one run to the
 * next rather than rewriting the same value. '*\/15' and 'N-59/15' both fire
 * four times an hour; only the phase moves.
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '.github', 'workflows', 'refresh.yml');
const CRON_RE = /(-\s*cron:\s*')(?:\*|\d+-59)\/15 \* \* \* \*(')/;

function nextOffset(now) {
  // 1-12, so consecutive months never land on the same minute.
  return (now.getUTCMonth() + 1) % 15;
}

function main() {
  const before = fs.readFileSync(FILE, 'utf8');
  if (!CRON_RE.test(before)) {
    console.error('[keepalive] no 15-minute cron line found in', FILE);
    console.error('[keepalive] refusing to guess — leaving the file alone');
    process.exit(1);
  }

  const offset = nextOffset(new Date());
  const after = before.replace(CRON_RE, `$1${offset}-59/15 * * * *$2`);

  if (after === before) {
    // Same month, run twice. Nothing to commit, and nothing wrong.
    console.log('[keepalive] cron already at offset', offset, '— no change');
    process.exit(0);
  }

  fs.writeFileSync(FILE, after);
  const show = s => (s.match(CRON_RE) || [])[0].trim();
  console.log('[keepalive]', show(before), '->', show(after));
}

main();
