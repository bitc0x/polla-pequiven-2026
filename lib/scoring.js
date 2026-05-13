import { GROUP_MATCHES, GROUPS, SCORING, SPECIAL_AWARDS } from "./worldcup-data";

/**
 * Given a set of group match predictions or actual results, computes the
 * standings of each group: W/D/L, GF/GA/GD, points, ranked per FIFA tiebreakers
 * (points → goal difference → goals scored → head-to-head approximation by
 * lex order of team code as last resort).
 *
 * Returns: { [groupId]: [ { team, played, w, d, l, gf, ga, gd, pts }, ... sorted ] }
 */
export function computeGroupStandings(source) {
  const matches = source?.groupMatches || {};
  const out = {};
  for (const groupId of Object.keys(GROUPS)) {
    const teams = GROUPS[groupId];
    const stats = {};
    for (const t of teams) {
      stats[t] = { team: t, played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
    }
    const gMatches = GROUP_MATCHES.filter(m => m.group === groupId);
    for (const m of gMatches) {
      const p = matches[m.id];
      if (!p || p.home == null || p.away == null) continue;
      const h = parseInt(p.home);
      const a = parseInt(p.away);
      if (isNaN(h) || isNaN(a)) continue;
      const home = stats[m.home];
      const away = stats[m.away];
      home.played++; away.played++;
      home.gf += h; home.ga += a;
      away.gf += a; away.ga += h;
      if (h > a) { home.w++; away.l++; home.pts += 3; }
      else if (h < a) { away.w++; home.l++; away.pts += 3; }
      else { home.d++; away.d++; home.pts++; away.pts++; }
    }
    for (const t of teams) {
      stats[t].gd = stats[t].gf - stats[t].ga;
    }
    const ranked = teams.map(t => stats[t]).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.team.localeCompare(b.team);
    });
    out[groupId] = ranked;
  }
  return out;
}

/**
 * From group standings, compute the 32 teams that advance per the 2026 FIFA
 * World Cup format: top 2 from each of 12 groups (24 teams) + 8 best-ranked
 * third-place teams across all 12 groups.
 *
 * Returns an array of 32 team codes (or fewer if standings are incomplete).
 */
export function computeR32Candidates(source) {
  const standings = computeGroupStandings(source);
  const winners = [];
  const runnersUp = [];
  const thirds = [];
  for (const groupId of Object.keys(standings)) {
    const ranked = standings[groupId];
    if (ranked[0]) winners.push(ranked[0]);
    if (ranked[1]) runnersUp.push(ranked[1]);
    if (ranked[2]) thirds.push(ranked[2]);
  }
  const top24 = [...winners, ...runnersUp];
  // Best 8 third places by same tiebreakers
  const bestThirds = thirds.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.team.localeCompare(b.team);
  }).slice(0, 8);
  return [...top24, ...bestThirds].map(s => s.team);
}

export function scoreMatchPrediction(prediction, actual) {
  if (!prediction || !actual) return 0;
  if (prediction.home == null || prediction.away == null) return 0;
  if (actual.home == null || actual.away == null) return 0;

  const ph = parseInt(prediction.home);
  const pa = parseInt(prediction.away);
  const ah = parseInt(actual.home);
  const aa = parseInt(actual.away);
  if (isNaN(ph) || isNaN(pa) || isNaN(ah) || isNaN(aa)) return 0;

  if (ph === ah && pa === aa) return SCORING.exactScore;

  const predOutcome = ph > pa ? "H" : ph < pa ? "A" : "D";
  const realOutcome = ah > aa ? "H" : ah < aa ? "A" : "D";
  let pts = 0;
  if (predOutcome === realOutcome) {
    pts += SCORING.correctOutcome;
    if (predOutcome !== "D" && ph - pa === ah - aa) pts += SCORING.goalDiff;
  }
  return pts;
}

export function scoreGroupStage(predictions, results) {
  let total = 0;
  const perMatch = {};
  for (const match of GROUP_MATCHES) {
    const p = predictions?.groupMatches?.[match.id];
    const r = results?.groupMatches?.[match.id];
    if (p && r) {
      const pts = scoreMatchPrediction(p, r);
      total += pts;
      perMatch[match.id] = pts;
    }
  }
  return { total, perMatch };
}

export function scoreKnockouts(predictions, results) {
  const rounds = [
    { key: 'r32', points: SCORING.r32Team },
    { key: 'r16', points: SCORING.r16Team },
    { key: 'qf', points: SCORING.qfTeam },
    { key: 'sf', points: SCORING.sfTeam },
    { key: 'final', points: SCORING.finalTeam },
  ];
  let total = 0;
  const breakdown = {};
  for (const r of rounds) {
    const predSet = new Set((predictions?.knockouts?.[r.key] || []).filter(Boolean));
    const realSet = new Set((results?.knockouts?.[r.key] || []).filter(Boolean));
    let hits = 0;
    for (const team of predSet) if (realSet.has(team)) hits++;
    const pts = hits * r.points;
    total += pts;
    breakdown[r.key] = { hits, pts };
  }
  return { total, breakdown };
}

export function scoreSpecials(predictions, results) {
  let total = 0;
  const breakdown = {};
  for (const award of SPECIAL_AWARDS) {
    const p = predictions?.specials?.[award.id];
    const r = results?.specials?.[award.id];
    if (!p || !r) {
      breakdown[award.id] = { hit: false, pts: 0 };
      continue;
    }
    const matches = award.freeText
      ? String(p).trim().toLowerCase() === String(r).trim().toLowerCase()
      : p === r;
    const pts = matches ? award.points : 0;
    total += pts;
    breakdown[award.id] = { hit: matches, pts };
  }
  return { total, breakdown };
}

export function scorePlayer(predictions, results) {
  const group = scoreGroupStage(predictions, results);
  const knockout = scoreKnockouts(predictions, results);
  const specials = scoreSpecials(predictions, results);
  return {
    total: group.total + knockout.total + specials.total,
    group: group.total,
    knockout: knockout.total,
    specials: specials.total,
    breakdown: { group, knockout, specials },
  };
}
