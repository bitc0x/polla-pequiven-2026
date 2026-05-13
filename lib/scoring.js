import { GROUP_MATCHES, SCORING, SPECIAL_AWARDS } from "./worldcup-data";

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
