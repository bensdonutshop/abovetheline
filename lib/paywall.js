'use strict';
/*
 * Paywall detection.
 *
 * Per-article first: publishers declare schema.org `isAccessibleForFree` for
 * Google, and it is the most trustworthy signal there is. It also matters that
 * this is per-article - Ad Age, Resume and Dagens Media all publish a mix, so
 * banning a masthead outright would throw away their open journalism.
 *
 * Source-level policy is only the fallback, for publishers that refuse our
 * fetcher entirely and leave us nothing to read.
 */

// Fallback only, used when the article itself cannot be fetched.
const SOURCE_ACCESS = {
  'Ad Age': 'locked',
  'Adweek': 'locked',
  'The Drum': 'locked',
  'Campaign UK': 'metered',
  'Digiday': 'metered',
  'Marketing Week': 'metered',
  'Contagious': 'locked',
  'LBBOnline': 'open',
  'Creative Salon': 'open',
  'Creative Review': 'open',
  'Marketing Dive': 'open',
  'AdExchanger': 'open',
  'Adland': 'open',
  'Muse by Clio': 'open',
  'shots': 'open',
  'Branding in Asia': 'open',
  'More About Advertising': 'open',
  'WERSM': 'open'
};

const FREE_TRUE  = /"isAccessibleForFree"\s*:\s*(true|"true"|"True")/i;
const FREE_FALSE = /"isAccessibleForFree"\s*:\s*(false|"false"|"False")/i;
const MARKUP     = /class="[^"]*\b(paywall|piano-|tp-modal|subscriber-only|premium-gate|meter-)/i;
const COPY = new RegExp([
  'subscribe to (continue|read)', 'already a subscriber',
  'this (content|article) is for subscribers', 'become a member to read',
  'logga in för att läsa', 'prenumerera för att läsa',
  'endast för prenumeranter', 'vain tilaajille', 'tilaajille'
].join('|'), 'i');

/**
 * Read an article's HTML and decide whether a reader can actually read it.
 * Returns 'locked' | 'metered' | 'open'.
 */
function detectAccess(html) {
  if (!html) return null;
  // An explicit declaration beats every heuristic, in both directions.
  if (FREE_FALSE.test(html)) return 'locked';
  if (FREE_TRUE.test(html)) return 'open';
  if (COPY.test(html)) return 'locked';
  if (MARKUP.test(html)) return 'metered';
  return 'open';
}

function sourceAccess(sourceName) {
  return SOURCE_ACCESS[sourceName] || 'open';
}

module.exports = { detectAccess, sourceAccess, SOURCE_ACCESS };
