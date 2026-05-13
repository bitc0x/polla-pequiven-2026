// API route: /api/sync-results
// Fetches openfootball/worldcup.json (no API key needed) and updates
// Firebase with completed match scores + derived knockout team lists.
//
// Triggered via:
//   1. Vercel Cron (every 15 min during tournament, configured in vercel.json)
//   2. Manual button in admin panel
//
// Idempotent: writing the same result twice has no effect.

import { initializeApp as initClient, getApps as getClientApps } from 'firebase/app';
import { getDatabase as getClientDb, ref, set } from 'firebase/database';

import {
  GROUP_MATCHES, NAME_TO_CODE, TEAMS, OPENFOOTBALL_URL,
} from '@/lib/worldcup-data';

const FB_CONFIG = {
  apiKey: "AIzaSyA4y7aGvFKQWxJUpHjJBTUzOwIWJd7YOTs",
  authDomain: "fc-friendlies-tracker.firebaseapp.com",
  databaseURL: "https://fc-friendlies-tracker-default-rtdb.firebaseio.com",
  projectId: "fc-friendlies-tracker",
};

const DB_ROOT = "polla-pequiven-2026";

// Initialize a server-side Firebase client (uses public client SDK since
// security rules on this DB are permissive for the project — we just need
// connectivity). Avoid initializing twice on hot reload.
function getDb() {
  const apps = getClientApps();
  const app = apps.length ? apps[0] : initClient(FB_CONFIG);
  return getClientDb(app);
}

// Normalize team name from openfootball to our internal code
function codeFor(name) {
  if (!name) return null;
  const key = String(name).toLowerCase().trim();
  return NAME_TO_CODE[key] || null;
}

// Match a group-stage match from openfootball to our local match id by
// finding the (home, away) pair (order matters) within the same group.
function findGroupMatch(oTeam1, oTeam2, oGroup) {
  if (!oGroup) return null;
  const groupLetter = oGroup.replace(/^Group\s+/i, '').trim().toUpperCase();
  const c1 = codeFor(oTeam1);
  const c2 = codeFor(oTeam2);
  if (!c1 || !c2) return null;
  // First try exact home/away order
  const exact = GROUP_MATCHES.find(m =>
    m.group === groupLetter && m.home === c1 && m.away === c2
  );
  if (exact) return { match: exact, swapped: false };
  // Then try reversed (rare, but data sources sometimes flip order)
  const reversed = GROUP_MATCHES.find(m =>
    m.group === groupLetter && m.home === c2 && m.away === c1
  );
  if (reversed) return { match: reversed, swapped: true };
  return null;
}

// Compute knockout team lists from openfootball matches
// A team is "in round X" if they appear as team1 or team2 in a match of that round
// (whether or not the match has been played yet — but only if the team name
// is a real team name, not a placeholder like "W74" or "1A")
function deriveKnockouts(matches) {
  const rounds = {
    'Round of 32': new Set(),
    'Round of 16': new Set(),
    'Quarter-final': new Set(),
    'Semi-final': new Set(),
    'Final': new Set(),
  };
  for (const m of matches) {
    const r = m.round;
    if (!(r in rounds)) continue;
    for (const teamName of [m.team1, m.team2]) {
      const code = codeFor(teamName);
      if (code) rounds[r].add(code);
    }
  }
  return {
    r32: Array.from(rounds['Round of 32']),
    r16: Array.from(rounds['Round of 16']),
    qf: Array.from(rounds['Quarter-final']),
    sf: Array.from(rounds['Semi-final']),
    final: Array.from(rounds['Final']),
  };
}

// Compute total goals scored in tournament (tiebreaker)
function computeTotalGoals(matches) {
  let total = 0;
  for (const m of matches) {
    if (m.score && Array.isArray(m.score.ft)) {
      total += (parseInt(m.score.ft[0]) || 0) + (parseInt(m.score.ft[1]) || 0);
    }
  }
  return total;
}

export async function GET(request) {
  const url = new URL(request.url);
  const dryRun = url.searchParams.get('dryRun') === '1';

  try {
    // Fetch openfootball JSON
    const r = await fetch(OPENFOOTBALL_URL, {
      cache: 'no-store',
      next: { revalidate: 0 },
    });
    if (!r.ok) {
      return Response.json({ ok: false, error: `Upstream ${r.status}` }, { status: 502 });
    }
    const data = await r.json();
    const matches = data?.matches || [];

    const db = getDb();
    const results = {
      groupMatchesUpdated: 0,
      groupMatchesSkipped: 0,
      unmatchable: [],
      knockoutCounts: {},
      totalGoals: 0,
    };

    // 1) Group stage results
    for (const m of matches) {
      if (!m.group) continue;
      if (!m.score || !Array.isArray(m.score.ft)) {
        results.groupMatchesSkipped++;
        continue;
      }
      const found = findGroupMatch(m.team1, m.team2, m.group);
      if (!found) {
        results.unmatchable.push({ t1: m.team1, t2: m.team2, group: m.group });
        continue;
      }
      const [homeScore, awayScore] = m.score.ft;
      // If the openfootball order is swapped relative to ours, swap scores too
      const finalScore = found.swapped
        ? { home: parseInt(awayScore), away: parseInt(homeScore) }
        : { home: parseInt(homeScore), away: parseInt(awayScore) };
      if (!dryRun) {
        await set(ref(db, `${DB_ROOT}/results/groupMatches/${found.match.id}`), finalScore);
      }
      results.groupMatchesUpdated++;
    }

    // 2) Knockout team lists
    const ko = deriveKnockouts(matches);
    results.knockoutCounts = {
      r32: ko.r32.length, r16: ko.r16.length, qf: ko.qf.length,
      sf: ko.sf.length, final: ko.final.length,
    };
    if (!dryRun) {
      // Only write if there's data to avoid clobbering admin manual entries
      for (const [k, v] of Object.entries(ko)) {
        if (v.length > 0) {
          await set(ref(db, `${DB_ROOT}/results/knockouts/${k}`), v);
        }
      }
    }

    // 3) Tiebreaker: total goals
    const totalGoals = computeTotalGoals(matches);
    results.totalGoals = totalGoals;
    if (!dryRun && totalGoals > 0) {
      await set(ref(db, `${DB_ROOT}/results/tiebreaker/totalGoals`), totalGoals);
    }

    // 4) Record sync metadata
    if (!dryRun) {
      await set(ref(db, `${DB_ROOT}/syncMeta`), {
        lastSyncAt: Date.now(),
        groupMatchesUpdated: results.groupMatchesUpdated,
        knockoutCounts: results.knockoutCounts,
        totalGoals: results.totalGoals,
      });
    }

    return Response.json({ ok: true, dryRun, ...results });
  } catch (err) {
    return Response.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}

// Allow POST too (Vercel cron sometimes uses POST)
export const POST = GET;
