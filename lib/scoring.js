import { GROUP_MATCHES, SCORING, SPECIAL_AWARDS } from "./worldcup-data";

// Match prediction scoring
export function scoreMatchPrediction(prediction, actual) {
  if (!prediction || !actual) return 0;
  if (prediction.home == null || prediction.away == null) return 0;
  if (actual.home == null || actual.away == null) return 0;

  const ph = parseInt(prediction.home);
  const pa = parseInt(prediction.away);
  const ah = parseInt(actual.home);
  const aa = parseInt(actual.away);

  if (isNaN(ph) || isNaN(pa) || isNaN(ah) || isNaN(aa)) return 0;

  let pts = 0;

  // Exact score
  if (ph === ah && pa === aa) {
    pts += SCORING.exactScore;
    return pts;
  }

  // Correct outcome (1, X, or 2)
  const predOutcome = ph > pa ? "H" : ph < pa ? "A" : "D";
  const realOutcome = ah > aa ? "H" : ah < aa ? "A" : "D";
  if (predOutcome === realOutcome) {
    pts += SCORING.correctOutcome;
  }

  // Goal difference bonus (only when outcome was right and not a draw)
  if (predOutcome === realOutcome && predOutcome !== "D") {
    if (ph - pa === ah - aa) {
      pts += SCORING.goalDiff;
    }
  }

  return pts;
}

// Score all group stage predictions for one player
export function scoreGroupStage(predictions, results) {
  let total = 0;
  const breakdown = [];
  for (const match of GROUP_MATCHES) {
    const p = predictions?.groupMatches?.[match.id];
    const r = results?.groupMatches?.[match.id];
    if (p && r) {
      const pts = scoreMatchPrediction(p, r);
      total += pts;
      if (pts > 0) breakdown.push({ matchId: match.id, pts });
    }
  }
  return { total, breakdown };
}

// Score knockout team predictions
// For each round (r32, r16, qf, sf, final), count how many teams the player predicted that actually made it
export function scoreKnockouts(predictions, results) {
  const rounds = [
    { key: "r32", points: SCORING.r32Team },
    { key: "r16", points: SCORING.r16Team },
    { key: "qf", points: SCORING.qfTeam },
    { key: "sf", points: SCORING.sfTeam },
    { key: "final", points: SCORING.finalTeam },
  ];

  let total = 0;
  const breakdown = {};

  for (const r of rounds) {
    const predSet = new Set((predictions?.knockouts?.[r.key] || []).filter(Boolean));
    const realSet = new Set((results?.knockouts?.[r.key] || []).filter(Boolean));
    let hits = 0;
    for (const team of predSet) {
      if (realSet.has(team)) hits++;
    }
    const pts = hits * r.points;
    total += pts;
    breakdown[r.key] = { hits, pts };
  }

  return { total, breakdown };
}

// Score special awards
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
    // Compare case-insensitively for free text awards
    const matches = award.freeText
      ? String(p).trim().toLowerCase() === String(r).trim().toLowerCase()
      : p === r;
    const pts = matches ? award.points : 0;
    total += pts;
    breakdown[award.id] = { hit: matches, pts };
  }
  return { total, breakdown };
}

// Total score for one player
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

// Tiebreaker comparison: closer total goals prediction wins
export function compareTiebreaker(predA, predB, results) {
  const realTotal = parseInt(results?.tiebreaker?.totalGoals);
  if (isNaN(realTotal)) return 0;
  const a = parseInt(predA?.tiebreaker?.totalGoals);
  const b = parseInt(predB?.tiebreaker?.totalGoals);
  if (isNaN(a) && isNaN(b)) return 0;
  if (isNaN(a)) return 1;
  if (isNaN(b)) return -1;
  return Math.abs(a - realTotal) - Math.abs(b - realTotal);
}
