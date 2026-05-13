// API route: /api/polymarket-odds
// Fetches FIFA World Cup 2026 events from Polymarket Gamma API and returns
// a clean map of { matchId: { home, draw, away, slug, polymarketUrl } } for
// all group stage matches, plus the tournament winner market and group
// winner markets for the special predictions.
//
// Gamma API: https://gamma-api.polymarket.com/events?tag_id=102232
// tag_id 102232 = FIFA World Cup
// Each match event has title "X vs. Y" with 3 markets:
//   - "Will X win on YYYY-MM-DD?" (yes price = home win prob)
//   - "Will X vs. Y end in a draw?" (yes price = draw prob)
//   - "Will Y win on YYYY-MM-DD?" (yes price = away win prob)
//
// Cached in-memory for 60s to avoid hammering the upstream.

import { GROUP_MATCHES, TEAMS, NAME_TO_CODE } from '@/lib/worldcup-data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 60;

const FIFA_WC_TAG_ID = 102232;
const GAMMA_URL = `https://gamma-api.polymarket.com/events?tag_id=${FIFA_WC_TAG_ID}&closed=false&active=true&limit=200`;

let cache = { data: null, ts: 0 };
const TTL_MS = 60_000;

function codeFor(name) {
  if (!name) return null;
  const key = String(name).toLowerCase().trim().replace(/\.$/, '');
  if (NAME_TO_CODE[key]) return NAME_TO_CODE[key];
  // Try without diacritics
  const ascii = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (NAME_TO_CODE[ascii]) return NAME_TO_CODE[ascii];
  return null;
}

function parseMatchTitle(title) {
  if (!title) return null;
  const m = title.match(/^(.+?)\s+vs\.?\s+(.+?)$/i);
  if (!m) return null;
  const home = m[1].trim();
  const away = m[2].trim();
  const homeCode = codeFor(home);
  const awayCode = codeFor(away);
  if (!homeCode || !awayCode) return null;
  return { homeCode, awayCode, homeName: home, awayName: away };
}

function findInternalMatchId(homeCode, awayCode) {
  if (!homeCode || !awayCode) return null;
  const direct = GROUP_MATCHES.find(m => m.home === homeCode && m.away === awayCode);
  if (direct) return { id: direct.id, swapped: false };
  const rev = GROUP_MATCHES.find(m => m.home === awayCode && m.away === homeCode);
  if (rev) return { id: rev.id, swapped: true };
  return null;
}

// Parse "outcomePrices" which can be a string '["0.65","0.35"]' or array
function parsePrices(raw) {
  if (!raw) return null;
  let arr = raw;
  if (typeof raw === 'string') {
    try { arr = JSON.parse(raw); } catch { return null; }
  }
  if (!Array.isArray(arr) || arr.length < 1) return null;
  const yes = parseFloat(arr[0]);
  if (isNaN(yes)) return null;
  return yes; // yes/win probability for this market
}

async function fetchEvents() {
  const r = await fetch(GAMMA_URL, { cache: 'no-store' });
  if (!r.ok) throw new Error(`Gamma ${r.status}`);
  return r.json();
}

function processEvents(events) {
  const matches = {};        // { internalMatchId: {home, draw, away, slug, url} }
  const groupWinners = {};   // { groupId: { teamCode: prob } }
  let tournamentWinner = null; // { teamCode: prob, slug, url }

  for (const e of events) {
    const title = e.title || '';
    const slug = e.slug || '';
    const url = `https://polymarket.com/event/${slug}`;

    // Match events: "X vs. Y"
    if (/ vs\.? /i.test(title) && !/who will win/i.test(title)) {
      const parsed = parseMatchTitle(title);
      if (!parsed) continue;
      const found = findInternalMatchId(parsed.homeCode, parsed.awayCode);
      if (!found) continue;

      let homeWin = null, draw = null, awayWin = null;
      for (const m of (e.markets || [])) {
        const q = (m.question || '').toLowerCase();
        const yes = parsePrices(m.outcomePrices);
        if (yes == null) continue;
        if (q.includes('end in a draw') || q.includes('draw')) {
          draw = yes;
        } else if (q.includes(parsed.homeName.toLowerCase()) && !q.includes(parsed.awayName.toLowerCase())) {
          homeWin = yes;
        } else if (q.includes(parsed.awayName.toLowerCase()) && !q.includes(parsed.homeName.toLowerCase())) {
          awayWin = yes;
        }
      }

      if (homeWin == null && awayWin == null) continue;

      // If our match's home/away order is swapped vs Polymarket's, swap odds too
      const out = found.swapped
        ? { home: awayWin, draw, away: homeWin }
        : { home: homeWin, draw, away: awayWin };

      matches[found.id] = { ...out, slug, url };
      continue;
    }

    // Group Winner events
    const gm = title.match(/Group ([A-L]) Winner/i);
    if (gm) {
      const groupId = gm[1].toUpperCase();
      const teams = {};
      for (const m of (e.markets || [])) {
        const yes = parsePrices(m.outcomePrices);
        if (yes == null) continue;
        // Question is like "Will <Team> win Group X in the 2026 FIFA World Cup?"
        const qm = (m.question || '').match(/Will (.+?) win Group/i);
        if (!qm) continue;
        const code = codeFor(qm[1].trim());
        if (code) teams[code] = yes;
      }
      groupWinners[groupId] = { teams, slug, url };
      continue;
    }

    // Tournament Winner: title like "2026 FIFA World Cup Winner" (multi-outcome)
    if (/world cup winner/i.test(title) && !/group/i.test(title)) {
      const teams = {};
      // For multi-outcome, the markets are split with each as "Will <team> win the 2026 FIFA World Cup?"
      for (const m of (e.markets || [])) {
        const yes = parsePrices(m.outcomePrices);
        if (yes == null) continue;
        const qm = (m.question || '').match(/Will (.+?) win the 2026 FIFA World Cup/i);
        if (!qm) continue;
        const code = codeFor(qm[1].trim());
        if (code) teams[code] = yes;
      }
      if (Object.keys(teams).length > 0) {
        tournamentWinner = { teams, slug, url };
      }
    }
  }

  return { matches, groupWinners, tournamentWinner };
}

async function getOdds() {
  const now = Date.now();
  if (cache.data && (now - cache.ts) < TTL_MS) {
    return cache.data;
  }
  try {
    const events = await fetchEvents();
    const data = processEvents(events);
    cache = { data, ts: now };
    return data;
  } catch (err) {
    // Return stale cache on error if we have it
    if (cache.data) return cache.data;
    return { matches: {}, groupWinners: {}, tournamentWinner: null, error: String(err?.message || err) };
  }
}

export async function GET() {
  const data = await getOdds();
  return Response.json({
    ok: !data.error,
    ...data,
    fetchedAt: Date.now(),
  });
}
