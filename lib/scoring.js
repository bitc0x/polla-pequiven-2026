import {
  GROUP_MATCHES, GROUPS, SCORING, SPECIAL_AWARDS,
  R32_MATCHES, R16_MATCHES, QF_MATCHES, SF_MATCHES, FINAL_MATCH,
  getKnockoutMatches,
} from "./worldcup-data";

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
 * Returns the top 8 "best third place" teams across all 12 groups, ranked
 * by FIFA tiebreakers, along with the group letter they came from.
 * Format: [{ team, group, pts, gd, gf }, ... up to 8]
 */
export function computeBestThirds(standings) {
  const thirds = [];
  for (const [groupId, ranked] of Object.entries(standings)) {
    if (ranked[2]) thirds.push({ ...ranked[2], group: groupId });
  }
  return thirds.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.team.localeCompare(b.team);
  }).slice(0, 8);
}

/**
 * Greedy assignment of 8 best-third teams to the 8 third-place slots in R32.
 * Each slot has a list of allowed source groups. We iterate R32 matches in
 * order and assign the highest-ranked available third whose group is allowed.
 * This approximates FIFA Annex C; for our friend polla, it's close enough.
 *
 * Returns: a Map<slotKey, teamCode> where slotKey is "${matchId}-${slotIdx}".
 */
export function assignThirdPlaces(bestThirds, standings) {
  const assignments = new Map();
  const available = [...bestThirds]; // top-ranked first
  // Walk R32 matches in declared order; for each third-place slot, take the
  // first available team whose group is in the allowed set.
  for (const m of R32_MATCHES) {
    for (let i = 0; i < m.slots.length; i++) {
      const slot = m.slots[i];
      if (slot.type !== 'third') continue;
      const idx = available.findIndex(t => slot.from.includes(t.group));
      if (idx === -1) continue;
      const team = available.splice(idx, 1)[0];
      assignments.set(`${m.id}-${i}`, team.team);
    }
  }
  return assignments;
}

/**
 * Resolve a slot reference to a concrete team code, given group standings.
 * - { type: 'pos', pos, group } → standings[group][pos-1].team
 * - { type: 'third', from } → use thirdAssignments map (slotKey)
 * Returns null if not resolvable yet.
 */
export function resolveSlot(slot, standings, thirdAssignments, slotKey) {
  if (slot.type === 'pos') {
    const ranked = standings?.[slot.group];
    if (!ranked || !ranked[slot.pos - 1]) return null;
    const s = ranked[slot.pos - 1];
    // Only return resolved if the team has played all matches in the group
    return s.played === 3 ? s.team : null;
  }
  if (slot.type === 'third') {
    return thirdAssignments?.get(slotKey) || null;
  }
  return null;
}

/**
 * Format a slot reference as human-readable text for display when the slot
 * isn't yet resolvable (group stage not complete).
 */
export function describeSlot(slot) {
  if (slot.type === 'pos') {
    const label = slot.pos === 1 ? '1ro' : slot.pos === 2 ? '2do' : '3ro';
    return `${label} Grupo ${slot.group}`;
  }
  if (slot.type === 'third') {
    return `Mejor 3ro de ${slot.from.join('/')}`;
  }
  return '?';
}

/**
 * Build the FULL resolved bracket from a player's group + knockout
 * predictions (or actual results). Each round's matches have:
 *   - id
 *   - teams: [code|null, code|null]   the two participants
 *   - teamsLabel: [string, string]    display label if team not resolved
 *   - winner: code|null               the user's pick (or actual winner)
 *
 * R32 teams come from group standings. R16+ teams come from previous
 * round's winner picks. Each round's winners list is read from
 * source.knockouts[roundKey], an array of team codes (index = match index).
 */
export function buildBracket(source) {
  const standings = computeGroupStandings(source);
  const bestThirds = computeBestThirds(standings);
  const thirdAssignments = assignThirdPlaces(bestThirds, standings);

  function getRoundMatches(roundKey, previousWinners) {
    const matches = getKnockoutMatches(roundKey);
    const picks = source?.knockouts?.[roundKey] || [];
    return matches.map((m, idx) => {
      let teamA = null, teamB = null, labelA = null, labelB = null;
      if (roundKey === 'r32') {
        teamA = resolveSlot(m.slots[0], standings, thirdAssignments, `${m.id}-0`);
        teamB = resolveSlot(m.slots[1], standings, thirdAssignments, `${m.id}-1`);
        labelA = describeSlot(m.slots[0]);
        labelB = describeSlot(m.slots[1]);
      } else {
        // feeders are previous round match IDs; get winner by match index
        const prevMatches = previousWinners.matches;
        const fA = m.feeders[0];
        const fB = m.feeders[1];
        const idxA = prevMatches.findIndex(pm => pm.id === fA);
        const idxB = prevMatches.findIndex(pm => pm.id === fB);
        teamA = previousWinners.winners[idxA] || null;
        teamB = previousWinners.winners[idxB] || null;
        labelA = `Ganador ${fA.replace(/^[a-z]+-/, '').toUpperCase()}`;
        labelB = `Ganador ${fB.replace(/^[a-z]+-/, '').toUpperCase()}`;
      }
      const winner = picks[idx] || null;
      return { id: m.id, teams: [teamA, teamB], teamsLabel: [labelA, labelB], winner };
    });
  }

  const r32 = getRoundMatches('r32', null);
  const r16 = getRoundMatches('r16', { matches: r32, winners: r32.map(m => m.winner) });
  const qf  = getRoundMatches('qf',  { matches: r16, winners: r16.map(m => m.winner) });
  const sf  = getRoundMatches('sf',  { matches: qf,  winners: qf.map(m => m.winner) });
  const final = getRoundMatches('final', { matches: sf, winners: sf.map(m => m.winner) });

  return {
    r32, r16, qf, sf, final,
    standings, bestThirds, thirdAssignments,
  };
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

/**
 * Match-based knockout scoring: per round, for each match index, compare
 * predicted winner to actual winner. Award round-specific points per match.
 */
export function scoreKnockouts(predictions, results) {
  const rounds = [
    { key: 'r32',   points: SCORING.r32Match },
    { key: 'r16',   points: SCORING.r16Match },
    { key: 'qf',    points: SCORING.qfMatch },
    { key: 'sf',    points: SCORING.sfMatch },
    { key: 'final', points: SCORING.finalMatch },
  ];
  let total = 0;
  const breakdown = {};
  for (const r of rounds) {
    const pred = predictions?.knockouts?.[r.key] || [];
    const real = results?.knockouts?.[r.key] || [];
    let hits = 0;
    const count = getKnockoutMatches(r.key).length;
    for (let i = 0; i < count; i++) {
      if (pred[i] && real[i] && pred[i] === real[i]) hits++;
    }
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
