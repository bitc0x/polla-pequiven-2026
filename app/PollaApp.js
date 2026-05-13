'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { ref, set, onValue, remove } from 'firebase/database';
import { db, DB_ROOT } from '@/lib/firebase';
import {
  TEAMS, GROUPS, GROUP_MATCHES, GROUP_DATES,
  KO_ROUNDS, SPECIAL_AWARDS, SCORING, TOURNAMENT_START,
  BUY_IN_USD, VENMO_HANDLE, PRIZE_SPLIT, PRIZE_LABELS,
} from '@/lib/worldcup-data';
import { scorePlayer, scoreMatchPrediction, computeGroupStandings, buildBracket } from '@/lib/scoring';
import Avatar from '@/components/Avatar';
import ThemeToggle from '@/components/ThemeToggle';
import MusicToggle from '@/components/MusicToggle';
import { Icon } from '@/components/Icon';

const PLAYER_PASSWORD = 'marcialmaciel';
const ADMIN_PASSWORD = 'Tnslppbntso1*';

// ============ FIREBASE HELPERS ============
const dbPath = (sub) => ref(db, `${DB_ROOT}/${sub}`);
const dbSet = (sub, data) => {
  return set(dbPath(sub), data).catch((err) => {
    console.error(`[Firebase write failed at ${sub}]`, err);
    // Surface to global error handler so the UI can show a banner
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('firebase-write-error', {
        detail: { path: sub, message: err?.message || String(err) }
      }));
    }
    throw err;
  });
};
const dbRemove = (sub) => remove(dbPath(sub)).catch((err) => {
  console.error(`[Firebase remove failed at ${sub}]`, err);
  throw err;
});

const slug = (s) => String(s).toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 40);

// Payment status: 'unpaid' | 'pending' | 'verified'
// Backward compat with old paid:bool field
function getPaymentStatus(player) {
  if (!player) return 'unpaid';
  if (player.paymentStatus) return player.paymentStatus;
  return player.paid ? 'verified' : 'unpaid';
}

// ============ HELPERS ============
function useCountdown(target) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const diff = target.getTime() - now;
  const locked = diff <= 0;
  const days = Math.max(0, Math.floor(diff / 86400000));
  const hours = Math.max(0, Math.floor((diff % 86400000) / 3600000));
  const mins = Math.max(0, Math.floor((diff % 3600000) / 60000));
  const secs = Math.max(0, Math.floor((diff % 60000) / 1000));
  return { days, hours, mins, secs, locked };
}

// ============ POWERED BY POLYMARKET + TRUSTED BY ============
const TRUSTED_BY = ['Google', 'Netflix', 'BP', 'LATAM Airlines', 'Kurius', 'Bubbles', 'AvoKind', 'Alpaca Roofing', 'Fat Veggies'];

function PoweredByPolymarket() {
  return (
    <a
      href="https://polymarket.com/sports/fifa-world-cup/games"
      target="_blank"
      rel="noopener noreferrer"
      className="powered-by"
      title="Polymarket odds powering this polla"
    >
      <span className="powered-by-label">Powered by</span>
      <img src="/polymarket-logo.png" alt="Polymarket" className="powered-by-logo" />
    </a>
  );
}

function TrustedBy() {
  return (
    <div className="trusted-by">
      <div className="trusted-by-label">TRUSTED BY</div>
      <div className="trusted-by-list">
        {TRUSTED_BY.map((name) => (
          <span key={name} className="trusted-by-item">{name}</span>
        ))}
      </div>
    </div>
  );
}

// ============ LOGIN SCREEN ============
function LoginScreen({ onLogin }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e?.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) { setError('Necesitas un nombre para jugar'); return; }
    if (trimmedName.length < 2) { setError('El nombre es muy corto'); return; }
    if (password === ADMIN_PASSWORD) {
      onLogin({ name: trimmedName, isAdmin: true });
    } else if (password === PLAYER_PASSWORD) {
      onLogin({ name: trimmedName, isAdmin: false });
    } else {
      setError('Clave incorrecta');
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="brand-mark">
          <div className="brand-logo-img">
            <img src="/pequiven-logo.png" alt="Pequiven" />
          </div>
          <div>
            <div className="brand-text">PEQUIVEN</div>
            <div className="brand-text-sub">Petroquímica de Venezuela</div>
          </div>
        </div>

        <h1 className="login-title">
          POLLA<br />
          MUNDIAL<br />
          <span className="accent">2026</span>
        </h1>

        <p className="login-subtitle">
          Canadá · México · USA. 48 selecciones. 104 partidos. Buy-in ${BUY_IN_USD}. Una sola polla.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="field-label">Tu nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Marcial Maciel"
              autoFocus
              maxLength={40}
            />
          </div>
          <div className="field">
            <label className="field-label">Clave de acceso</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button type="submit" className="btn-primary">Entrar</button>
        </form>

        <div className="login-foot">
          <PoweredByPolymarket />
          <span className="mono">v2.0</span>
        </div>
      </div>

      <TrustedBy />
    </div>
  );
}

// ============ COUNTDOWN ============
function CountdownBox({ locked }) {
  const c = useCountdown(TOURNAMENT_START);
  if (c.locked || locked) {
    return (
      <div className="countdown locked">
        <div className="countdown-unit" style={{ gridColumn: '1 / -1' }}>
          <div className="num">CERRADO</div>
          <div className="lbl">El torneo comenzó · predicciones bloqueadas</div>
        </div>
      </div>
    );
  }
  return (
    <div className="countdown">
      <div className="countdown-unit">
        <div className="num">{c.days}</div>
        <div className="lbl">Días</div>
      </div>
      <div className="countdown-unit">
        <div className="num">{String(c.hours).padStart(2, '0')}</div>
        <div className="lbl">Horas</div>
      </div>
      <div className="countdown-unit">
        <div className="num">{String(c.mins).padStart(2, '0')}</div>
        <div className="lbl">Min</div>
      </div>
      <div className="countdown-unit">
        <div className="num">{String(c.secs).padStart(2, '0')}</div>
        <div className="lbl">Seg</div>
      </div>
    </div>
  );
}

// ============ PRIZE POOL ============
function PrizePool({ players }) {
  const allPlayers = Object.values(players || {});
  const verifiedCount = allPlayers.filter(p => getPaymentStatus(p) === 'verified').length;
  const pendingCount = allPlayers.filter(p => getPaymentStatus(p) === 'pending').length;
  const totalPlayers = allPlayers.length;
  const pool = verifiedCount * BUY_IN_USD;
  const potential = totalPlayers * BUY_IN_USD;
  const venmoUrl = `https://venmo.com/${VENMO_HANDLE}?txn=pay&amount=${BUY_IN_USD}&note=Polla%20Pequiven%20Mundial%202026`;
  const splits = PRIZE_SPLIT.map(pct => Math.floor(pool * pct));

  return (
    <>
      <div className="pool-grid">
        <div className="pool-card">
          <div className="hairline mb-2">PREMIO ACUMULADO</div>
          <div className="pool-amount">
            <span className="currency">$</span>{pool}
          </div>
          <div className="pool-meta">
            <strong>{verifiedCount}</strong> de <strong>{totalPlayers}</strong> verificados · Buy-in <strong>${BUY_IN_USD}</strong>
            {pendingCount > 0 && (
              <div className="mt-2 text-xs" style={{ color: 'var(--gold)' }}>
                {pendingCount} pago{pendingCount === 1 ? '' : 's'} en revisión
              </div>
            )}
            {totalPlayers > verifiedCount + pendingCount && (
              <div className="mt-2 text-dim text-xs">
                Potencial completo: ${potential}
              </div>
            )}
          </div>
        </div>
        <a href={venmoUrl} target="_blank" rel="noopener noreferrer" className="venmo-card">
          <div>
            <div className="venmo-label">Paga tu buy-in</div>
            <div className="venmo-handle mt-2">
              <span className="at">@</span>{VENMO_HANDLE}
            </div>
          </div>
          <div className="venmo-cta">
            <Icon name="venmo" size={14} />
            Pagar ${BUY_IN_USD} en Venmo
          </div>
        </a>
      </div>

      <div className="prize-breakdown">
        <div className="hairline mb-4">REPARTICIÓN DEL POTE · 60/30/10</div>
        <div className="prize-bars">
          {PRIZE_SPLIT.map((pct, i) => (
            <div key={i} className={`prize-bar place-${i + 1}`}>
              <div className="prize-bar-medal">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
              </div>
              <div className="prize-bar-content">
                <div className="prize-bar-label">{PRIZE_LABELS[i]}</div>
                <div className="prize-bar-amount">
                  <span className="currency">$</span>{splits[i]}
                </div>
                <div className="prize-bar-pct">{Math.round(pct * 100)}% del pote</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ============ GROUP STAGE ============
function GroupStageScreen({ predictions, results, locked, onUpdate, showResults, pmOdds }) {
  function update(matchId, field, value) {
    if (locked) return;
    const clean = value === '' ? null : Math.max(0, Math.min(20, parseInt(value) || 0));
    onUpdate(matchId, field, clean);
  }

  function MatchOdds({ matchId }) {
    const odds = pmOdds?.matches?.[matchId];
    if (!odds) return null;
    const home = odds.home != null ? Math.round(odds.home * 100) : null;
    const draw = odds.draw != null ? Math.round(odds.draw * 100) : null;
    const away = odds.away != null ? Math.round(odds.away * 100) : null;
    const totalKnown = [home, draw, away].filter(v => v != null).length;
    if (totalKnown === 0) return null;

    // Determine which side is favored for visual emphasis
    const allVals = [home ?? -1, draw ?? -1, away ?? -1];
    const max = Math.max(...allVals);
    const favIdx = allVals.indexOf(max);

    return (
      <div className="pm-odds-row" style={{ gridColumn: '1 / -1' }}>
        <a href={odds.url} target="_blank" rel="noopener noreferrer" className="pm-odds-link" title="Abrir en Polymarket para tradear">
          <div className="pm-odds-bars">
            <div className={`pm-odds-cell ${favIdx === 0 ? 'fav' : ''}`} style={{ flex: home ?? 33 }}>
              <span className="pm-odds-label">1</span>
              <span className="pm-odds-pct">{home != null ? `${home}%` : '·'}</span>
            </div>
            <div className={`pm-odds-cell middle ${favIdx === 1 ? 'fav' : ''}`} style={{ flex: draw ?? 33 }}>
              <span className="pm-odds-label">X</span>
              <span className="pm-odds-pct">{draw != null ? `${draw}%` : '·'}</span>
            </div>
            <div className={`pm-odds-cell ${favIdx === 2 ? 'fav' : ''}`} style={{ flex: away ?? 33 }}>
              <span className="pm-odds-label">2</span>
              <span className="pm-odds-pct">{away != null ? `${away}%` : '·'}</span>
            </div>
          </div>
          <span className="pm-odds-source">via Polymarket</span>
        </a>
      </div>
    );
  }

  return (
    <div>
      <CountdownBox locked={locked} />
      <h2 className="section-title">Fase de Grupos</h2>
      <p className="section-sub">
        {locked
          ? 'Predicciones cerradas. Solo lectura.'
          : 'Predice el marcador exacto de cada partido. Acierto exacto = 5 pts. Solo ganador = 2 pts. Diferencia de goles correcta = +1 pt bonus.'}
        {' '}
        Las probabilidades 1X2 vienen de Polymarket en vivo. Click para tradear.
      </p>

      <div className="groups-grid">
        {Object.keys(GROUPS).map((groupId) => (
          <div key={groupId} className="group-card">
            <div className="group-header">
              <span className="group-letter">{groupId}</span>
              <span className="group-tag">Grupo {groupId}</span>
            </div>
            {[1, 2, 3].map((md) => (
              <div key={md}>
                <div className="matches-list">
                  {GROUP_MATCHES.filter(m => m.group === groupId && m.matchday === md).map((match) => {
                    const pred = predictions?.groupMatches?.[match.id] || {};
                    const real = results?.groupMatches?.[match.id];
                    const pts = (showResults && real && pred) ? scoreMatchPrediction(pred, real) : null;
                    return (
                      <div key={match.id} className={`match-row ${locked ? 'locked' : ''}`}>
                        <div className="team-side">
                          <span className="team-flag">{TEAMS[match.home].flag}</span>
                          <span className="team-name">{TEAMS[match.home].name}</span>
                        </div>
                        <div className="score-input-pair">
                          <input
                            type="number"
                            className={`score-input ${pred.home != null ? 'has-value' : ''}`}
                            value={pred.home ?? ''}
                            onChange={(e) => update(match.id, 'home', e.target.value)}
                            disabled={locked}
                            min="0" max="20"
                          />
                          <span className="score-sep">·</span>
                          <input
                            type="number"
                            className={`score-input ${pred.away != null ? 'has-value' : ''}`}
                            value={pred.away ?? ''}
                            onChange={(e) => update(match.id, 'away', e.target.value)}
                            disabled={locked}
                            min="0" max="20"
                          />
                        </div>
                        <div className="team-side away">
                          <span className="team-name">{TEAMS[match.away].name}</span>
                          <span className="team-flag">{TEAMS[match.away].flag}</span>
                        </div>
                        <MatchOdds matchId={match.id} />
                        {showResults && real && (
                          <div className={`match-result-tag ${pts > 0 ? 'correct' : 'incorrect'}`}>
                            Real: {real.home} - {real.away}
                            {pts != null && ` · ${pts} pts`}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="matchday-tag">Jornada {md} · {GROUP_DATES[md]}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ KNOCKOUT BRACKET VISUAL ============
function KnockoutScreen({ predictions, results, locked, onUpdateKO, showResults }) {
  // Build the bracket: resolve R32 matchups from group standings, then R16
  // matchups from R32 winner picks, and so on through Final.
  const bracket = useMemo(() => buildBracket(predictions), [predictions]);
  const realBracket = useMemo(() => buildBracket(results), [results]);
  const standings = bracket.standings;

  function setMatchWinner(roundKey, matchIdx, teamCode) {
    if (locked) return;
    const current = [...(predictions?.knockouts?.[roundKey] || [])];
    while (current.length < matchIdx + 1) current.push(null);
    // Toggle off if clicking the same selection again
    current[matchIdx] = (current[matchIdx] === teamCode) ? null : (teamCode || null);
    onUpdateKO(roundKey, current);
    // If this round changed, downstream picks may now be inconsistent. Clear
    // any downstream picks that no longer have a valid team (e.g. user
    // changed R32 winner so R16 has a feeder change). We don't auto-clear;
    // instead, the stale picks will be visually flagged in the next render.
  }

  const groupMatchesFilled = Object.values(predictions?.groupMatches || {}).filter(m => m && m.home != null && m.away != null).length;
  const groupStageIncomplete = groupMatchesFilled < 72;
  const allGroupsComplete = groupMatchesFilled === 72;

  // Count winners per round and whether previous round is fully picked
  function roundReady(roundKey) {
    if (roundKey === 'r32') return allGroupsComplete;
    const prev = { r16: 'r32', qf: 'r16', sf: 'qf', final: 'sf' }[roundKey];
    const prevPicks = predictions?.knockouts?.[prev] || [];
    const prevMatches = bracket[prev];
    if (!prevMatches) return false;
    return prevMatches.every((_, i) => !!prevPicks[i]);
  }

  return (
    <div>
      <h2 className="section-title">Llaves Eliminatorias</h2>
      <p className="section-sub">
        {locked
          ? 'Llaves cerradas. Solo lectura.'
          : 'Bracket determinístico FIFA 2026. R32 se llena automáticamente con tus predicciones de grupos. En cada partido, click en el equipo que crees gana.'}
      </p>

      {!locked && groupStageIncomplete && (
        <div className="warn-msg mb-6">
          <strong>Falta tu fase de grupos:</strong> R32 muestra los cruces oficiales del Mundial 2026 (Match 73: 2A vs 2B, Match 75: 1F vs 2C, etc.) pero los equipos solo aparecen cuando tengas tu fase de grupos al 100%. Llevas {groupMatchesFilled}/72.
        </div>
      )}

      {!locked && allGroupsComplete && (
        <details className="standings-preview">
          <summary>
            <span>Ver mis standings predichas de fase de grupos</span>
            <span className="hairline">Top 2 + mejores 8 terceros = 32 equipos en R32</span>
          </summary>
          <div className="standings-grid">
            {Object.entries(standings).map(([groupId, ranked]) => (
              <div key={groupId} className="standings-group">
                <div className="standings-head">Grupo {groupId}</div>
                {ranked.map((s, idx) => (
                  <div key={s.team} className={`standings-row pos-${idx + 1}`}>
                    <span className="pos">{idx + 1}</span>
                    <span className="flag">{TEAMS[s.team].flag}</span>
                    <span className="nm">{TEAMS[s.team].short || TEAMS[s.team].name}</span>
                    <span className="pts mono">{s.pts}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="bracket-legend">
        {KO_ROUNDS.map((r) => (
          <span key={r.key} className="bracket-legend-item">
            <strong>{r.label}</strong>
            <span className="dim">{r.pointsPerMatch}pts</span>
          </span>
        ))}
      </div>

      <div className="bracket-wrap">
        <div className="bracket-tree-v2">
          {KO_ROUNDS.map((round) => {
            const matches = bracket[round.key] || [];
            const realMatches = realBracket[round.key] || [];
            const picks = predictions?.knockouts?.[round.key] || [];
            const filledCount = picks.filter(Boolean).length;
            const ready = roundReady(round.key);

            return (
              <div key={round.key} className={`bracket-round col-${round.key}`}>
                <div className="bracket-round-head">
                  <div className="bracket-round-title">{round.label}</div>
                  <div className="bracket-round-meta">
                    <span className="mono">{filledCount}/{round.count}</span>
                    <span className="bracket-round-dates">{round.dates}</span>
                  </div>
                </div>

                {!ready && !locked ? (
                  <div className="bracket-empty-state">
                    {round.key === 'r32'
                      ? 'Llena los 72 partidos de fase de grupos.'
                      : `Pica todos los ganadores de ${KO_ROUNDS.find(r => r.key === ({r16: 'r32', qf: 'r16', sf: 'qf', final: 'sf'}[round.key]))?.label}.`}
                  </div>
                ) : (
                  <div className="bracket-matches">
                    {matches.map((m, idx) => {
                      const [teamA, teamB] = m.teams;
                      const [labelA, labelB] = m.teamsLabel;
                      const winner = m.winner;
                      const realWinner = realMatches[idx]?.winner;
                      const showCorrect = showResults && winner && realWinner;
                      const correct = showCorrect && winner === realWinner;
                      return (
                        <div key={m.id} className={`bracket-match ${showCorrect ? (correct ? 'correct' : 'incorrect') : ''}`}>
                          <TeamPick
                            team={teamA}
                            label={labelA}
                            selected={winner === teamA && teamA != null}
                            isReal={showResults && realWinner === teamA}
                            locked={locked || !teamA}
                            onClick={() => teamA && setMatchWinner(round.key, idx, teamA)}
                          />
                          <div className="bracket-vs">vs</div>
                          <TeamPick
                            team={teamB}
                            label={labelB}
                            selected={winner === teamB && teamB != null}
                            isReal={showResults && realWinner === teamB}
                            locked={locked || !teamB}
                            onClick={() => teamB && setMatchWinner(round.key, idx, teamB)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TeamPick({ team, label, selected, isReal, locked, onClick }) {
  const Tag = locked ? 'div' : 'button';
  let cls = 'team-pick';
  if (selected) cls += ' selected';
  if (isReal) cls += ' real';
  if (!team) cls += ' unresolved';
  return (
    <Tag
      type={locked ? undefined : 'button'}
      className={cls}
      onClick={locked ? undefined : onClick}
      disabled={locked && Tag === 'button'}
      aria-pressed={selected}
    >
      {team ? (
        <>
          <span className="team-pick-flag">{TEAMS[team]?.flag}</span>
          <span className="team-pick-name">{TEAMS[team]?.short || TEAMS[team]?.name}</span>
          {selected && <span className="team-pick-check">✓</span>}
        </>
      ) : (
        <span className="team-pick-placeholder">{label}</span>
      )}
    </Tag>
  );
}

// ============ SPECIALS ============
function SpecialsScreen({ predictions, results, locked, onUpdateSpecial, onUpdateTiebreaker, showResults }) {
  const allTeams = Object.keys(TEAMS);
  const getVal = (id) => predictions?.specials?.[id] || '';
  const getRealVal = (id) => results?.specials?.[id] || '';

  return (
    <div>
      <h2 className="section-title">Predicciones Especiales</h2>
      <p className="section-sub">
        {locked ? 'Predicciones cerradas.' : 'Las apuestas que más puntos valen. Aquí se ganan o se pierden las pollas.'}
      </p>

      <div className="specials-grid">
        {SPECIAL_AWARDS.map((award) => {
          const v = getVal(award.id);
          const real = getRealVal(award.id);
          const hit = showResults && v && real && (
            award.freeText
              ? String(v).trim().toLowerCase() === String(real).trim().toLowerCase()
              : v === real
          );
          return (
            <div key={award.id} className="special-card">
              <div className="pts-badge">{award.points} pts</div>
              <div className="lbl">PREDICCIÓN</div>
              <div className="award">{award.label}</div>
              {award.freeText ? (
                <input
                  type="text"
                  value={v}
                  onChange={(e) => onUpdateSpecial(award.id, e.target.value)}
                  placeholder="Nombre del jugador"
                  disabled={locked}
                  maxLength={60}
                />
              ) : (
                <select
                  value={v}
                  onChange={(e) => onUpdateSpecial(award.id, e.target.value)}
                  disabled={locked}
                >
                  <option value="">— Seleccionar —</option>
                  {allTeams.map((t) => (
                    <option key={t} value={t}>{TEAMS[t].flag} {TEAMS[t].name}</option>
                  ))}
                </select>
              )}
              {showResults && real && (
                <div className={`match-result-tag ${hit ? 'correct' : 'incorrect'}`} style={{ textAlign: 'left', marginTop: 8 }}>
                  Real: {award.freeText ? real : (TEAMS[real] ? `${TEAMS[real].flag} ${TEAMS[real].name}` : real)}
                  {v && (hit ? ' · acierto' : ' · falla')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="tiebreaker-card">
        <div className="hairline" style={{ color: 'var(--pequiven-red-bright)', marginBottom: 6 }}>
          DESEMPATE
        </div>
        <div style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 18, marginBottom: 12, textTransform: 'uppercase' }}>
          Total de goles del torneo
        </div>
        <p className="text-sm text-muted mb-4">
          Si dos jugadores empatan en puntos, gana quien más se acerque. Mundial 2022 cerró con 172 goles en 64 partidos. Este tiene 104 partidos.
        </p>
        <input
          type="number"
          value={predictions?.tiebreaker?.totalGoals ?? ''}
          onChange={(e) => onUpdateTiebreaker('totalGoals', e.target.value)}
          placeholder="Ej. 285"
          disabled={locked}
          style={{ width: 200, padding: '14px 16px', fontSize: 18, fontFamily: 'JetBrains Mono, monospace' }}
          min="0" max="999"
        />
        {showResults && results?.tiebreaker?.totalGoals != null && (
          <div className="match-result-tag" style={{ marginTop: 8, textAlign: 'left' }}>
            Real: {results.tiebreaker.totalGoals} goles
          </div>
        )}
      </div>
    </div>
  );
}

// ============ LEADERBOARD ============
function LeaderboardScreen({ players, predictions, results, currentName, locked, onPickClick }) {
  const { ranked, pending, unpaid } = useMemo(() => {
    const all = Object.entries(players || {}).map(([id, p]) => {
      const playerPreds = predictions?.[id] || {};
      const score = scorePlayer(playerPreds, results);
      return {
        id,
        name: p.name,
        status: getPaymentStatus(p),
        joinedAt: p.joinedAt,
        score,
        tiebreaker: parseInt(playerPreds?.tiebreaker?.totalGoals),
      };
    });

    const verified = all.filter(p => p.status === 'verified').sort((a, b) => {
      if (b.score.total !== a.score.total) return b.score.total - a.score.total;
      const realTotal = parseInt(results?.tiebreaker?.totalGoals);
      if (!isNaN(realTotal)) {
        const aDist = isNaN(a.tiebreaker) ? Infinity : Math.abs(a.tiebreaker - realTotal);
        const bDist = isNaN(b.tiebreaker) ? Infinity : Math.abs(b.tiebreaker - realTotal);
        if (aDist !== bDist) return aDist - bDist;
      }
      return a.name.localeCompare(b.name);
    });

    return {
      ranked: verified,
      pending: all.filter(p => p.status === 'pending').sort((a, b) => a.joinedAt - b.joinedAt),
      unpaid: all.filter(p => p.status === 'unpaid').sort((a, b) => a.joinedAt - b.joinedAt),
    };
  }, [players, predictions, results]);

  if (Object.keys(players || {}).length === 0) {
    return (
      <div>
        <PrizePool players={players} />
        <h2 className="section-title">Tabla de Posiciones</h2>
        <div className="empty">Todavía no hay jugadores registrados. Sé el primero.</div>
      </div>
    );
  }

  return (
    <div>
      <PrizePool players={players} />
      <h2 className="section-title">Tabla de Posiciones</h2>
      <p className="section-sub">
        Solo jugadores con buy-in verificado aparecen aquí. Los puntos se actualizan en tiempo real.
        {locked && ' Click en cualquier jugador para ver sus predicciones.'}
      </p>

      {ranked.length > 0 ? (
        <div className="leaderboard">
          <div className="lb-row header">
            <div>POS</div>
            <div></div>
            <div>JUGADOR</div>
            <div style={{ textAlign: 'right' }}>PTS</div>
            <div style={{ textAlign: 'right', minWidth: 120 }}>DESGLOSE</div>
          </div>
          {ranked.map((p, idx) => {
            const isYou = p.name === currentName;
            const canClick = locked && onPickClick;
            const placeIdx = idx < 3 ? idx : -1; // 0, 1, 2 or -1
            const prizeAmount = placeIdx >= 0
              ? Math.floor(ranked.length === 0 ? 0 : (Object.values(players || {}).filter(pl => getPaymentStatus(pl) === 'verified').length * BUY_IN_USD) * PRIZE_SPLIT[placeIdx])
              : 0;
            return (
              <div
                key={p.id}
                className={`lb-row ${canClick ? 'lb-clickable' : ''} ${placeIdx >= 0 ? `place-${placeIdx + 1}` : ''}`}
                onClick={canClick ? () => onPickClick(p.id) : undefined}
              >
                <div className="lb-rank">
                  {placeIdx === 0 ? '🥇' : placeIdx === 1 ? '🥈' : placeIdx === 2 ? '🥉' : (idx + 1)}
                </div>
                <Avatar name={p.name} size={36} />
                <div className="lb-name">
                  {p.name}
                  {isYou && <span className="you">TÚ</span>}
                  {placeIdx >= 0 && prizeAmount > 0 && (
                    <span className="lb-prize">${prizeAmount}</span>
                  )}
                </div>
                <div className="lb-points">{p.score.total}</div>
                <div className="lb-breakdown">
                  G:{p.score.group} K:{p.score.knockout} E:{p.score.specials}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          Nadie ha sido verificado todavía. Cuando el admin apruebe los buy-ins, los jugadores aparecen aquí.
        </div>
      )}

      {(pending.length > 0 || unpaid.length > 0) && (
        <div className="mt-8">
          <h3 className="hairline" style={{ fontSize: 12, marginBottom: 12 }}>SALA DE ESPERA</h3>
          <div className="leaderboard">
            {pending.map((p) => {
              const isYou = p.name === currentName;
              return (
                <div key={p.id} className="lb-row" style={{ opacity: 0.85 }}>
                  <div></div>
                  <Avatar name={p.name} size={32} />
                  <div className="lb-name">
                    {p.name}
                    {isYou && <span className="you">TÚ</span>}
                    <span className="lb-paid" style={{ background: 'rgba(212,175,55,0.12)', color: 'var(--gold)', border: '1px solid rgba(212,175,55,0.3)' }}>
                      PAGO EN REVISIÓN
                    </span>
                  </div>
                  <div></div>
                  <div></div>
                </div>
              );
            })}
            {unpaid.map((p) => {
              const isYou = p.name === currentName;
              return (
                <div key={p.id} className="lb-row" style={{ opacity: 0.6 }}>
                  <div></div>
                  <Avatar name={p.name} size={32} />
                  <div className="lb-name">
                    {p.name}
                    {isYou && <span className="you">TÚ</span>}
                    <span className="lb-paid no">SIN PAGAR</span>
                  </div>
                  <div></div>
                  <div></div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ MY PICKS ============
function MyPicksScreen({ playerId, predictions, results, locked, currentName, players, onMarkPaid, onSubmit, onUnsubmit }) {
  const myPreds = predictions?.[playerId] || {};
  const score = scorePlayer(myPreds, results);
  const filled = Object.values(myPreds?.groupMatches || {}).filter(m => m && m.home != null && m.away != null).length;
  const totalKO = ['r32','r16','qf','sf','final'].reduce((acc, k) => acc + (myPreds?.knockouts?.[k]?.filter(Boolean).length || 0), 0);
  const totalSp = SPECIAL_AWARDS.filter(a => myPreds?.specials?.[a.id]).length;
  const myPlayer = players?.[playerId];
  const myStatus = getPaymentStatus(myPlayer);
  const submittedAt = myPlayer?.submittedAt || null;
  const isSubmitted = !!submittedAt;
  const venmoUrl = `https://venmo.com/${VENMO_HANDLE}?txn=pay&amount=${BUY_IN_USD}&note=Polla%20Pequiven%20Mundial%202026%20-%20${encodeURIComponent(currentName)}`;

  const totalKOSlots = KO_ROUNDS.reduce((acc, r) => acc + r.count, 0); // 16+8+4+2+1 = 31
  const totalGroupMatches = 72;
  const totalSpecialAwards = SPECIAL_AWARDS.length;
  const allFilled = filled === totalGroupMatches && totalKO === totalKOSlots && totalSp === totalSpecialAwards;
  const completionPct = Math.round(((filled / totalGroupMatches) + (totalKO / totalKOSlots) + (totalSp / totalSpecialAwards)) / 3 * 100);

  function handleSubmit() {
    const msg = allFilled
      ? '¿Confirmas que quieres enviar tus predicciones como definitivas? Podrás revertir hasta el 11 de junio.'
      : `Tienes ${completionPct}% completado. Aún te faltan picks. ¿Quieres enviar igual? Los espacios vacíos contarán como 0 pts. Podrás revertir hasta el 11 de junio.`;
    if (window.confirm(msg)) onSubmit();
  }
  function handleUnsubmit() {
    if (window.confirm('¿Revertir tus predicciones para volver a editar? Cuando termines, recuerda enviarlas otra vez.')) onUnsubmit();
  }

  return (
    <div>
      <h2 className="section-title">Hola, {currentName}</h2>
      <p className="section-sub">Resumen de tu polla.</p>

      <div className="stat-tiles">
        <div className="stat-tile">
          <div className="lbl">PUNTAJE TOTAL</div>
          <div className="val red">{score.total}</div>
        </div>
        <div className="stat-tile">
          <div className="lbl">FASE DE GRUPOS</div>
          <div className="val">{filled}/{totalGroupMatches}</div>
          <div className="text-xs text-muted mt-2 mono">{score.group} pts</div>
        </div>
        <div className="stat-tile">
          <div className="lbl">LLAVES</div>
          <div className="val">{totalKO}/{totalKOSlots}</div>
          <div className="text-xs text-muted mt-2 mono">{score.knockout} pts</div>
        </div>
        <div className="stat-tile">
          <div className="lbl">ESPECIALES</div>
          <div className="val">{totalSp}/{totalSpecialAwards}</div>
          <div className="text-xs text-muted mt-2 mono">{score.specials} pts</div>
        </div>
      </div>

      {myStatus === 'unpaid' && (
        <div className="venmo-card mb-6" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: '1 1 220px' }}>
            <div className="venmo-label">FALTA TU BUY-IN</div>
            <div className="venmo-handle mt-2" style={{ fontSize: 18 }}>
              Paga ${BUY_IN_USD} a <span className="at">@</span>{VENMO_HANDLE}
            </div>
            <div className="text-xs mt-2" style={{ opacity: 0.85 }}>
              Sin verificación no apareces en la Tabla oficial ni compites por el premio.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href={venmoUrl} target="_blank" rel="noopener noreferrer" className="venmo-cta">
              <Icon name="venmo" size={14} />
              Pagar en Venmo
            </a>
            <button
              onClick={onMarkPaid}
              className="venmo-cta"
              style={{ background: 'white', color: '#006BD8', cursor: 'pointer' }}
              title="Marca tu pago como pendiente de aprobación del admin"
            >
              <Icon name="check" size={14} />
              Ya pagué
            </button>
          </div>
        </div>
      )}

      {myStatus === 'pending' && (
        <div className="warn-msg mb-6" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <strong>Tu pago está en revisión.</strong> El admin lo va a verificar y aparecerás en la Tabla oficial.
          </div>
        </div>
      )}

      {myStatus === 'verified' && !isSubmitted && (
        <div className="success-msg mb-6">
          <strong>Buy-in verificado.</strong> Estás dentro.
        </div>
      )}

      {/* ===== SUBMIT GATE ===== */}
      <div className="submit-card">
        <div className="submit-card-head">
          <div>
            <div className="hairline">ESTADO DE TUS PREDICCIONES</div>
            <div className="submit-status-line">
              {locked
                ? <><span className="dot dot-red" /> Polla cerrada, todo en piedra.</>
                : isSubmitted
                  ? <><span className="dot dot-green" /> Enviadas {new Date(submittedAt).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</>
                  : <><span className="dot dot-gold" /> En edición ({completionPct}% completo)</>}
            </div>
          </div>
          {!locked && (
            <div className="submit-actions">
              {isSubmitted ? (
                <button className="btn-ghost" onClick={handleUnsubmit} title="Volver a editar">
                  <Icon name="undo" size={13} /> Revertir
                </button>
              ) : (
                <button
                  className={`btn-primary ${allFilled ? '' : 'btn-soft'}`}
                  onClick={handleSubmit}
                  title={allFilled ? 'Confirmar y enviar tus predicciones definitivas' : 'Aún te faltan picks pero puedes enviar de todas formas'}
                >
                  <Icon name="check" size={14} />
                  Enviar predicciones definitivas
                </button>
              )}
            </div>
          )}
        </div>

        {!locked && (
          <>
            <div className="submit-progress">
              <div className="submit-progress-bar" style={{ width: `${completionPct}%` }} />
            </div>
            <div className="submit-detail">
              <span>Grupos <strong>{filled}/{totalGroupMatches}</strong></span>
              <span>Llaves <strong>{totalKO}/{totalKOSlots}</strong></span>
              <span>Especiales <strong>{totalSp}/{totalSpecialAwards}</strong></span>
            </div>
            <p className="submit-help">
              {isSubmitted
                ? 'Tus predicciones están bloqueadas para edición. Puedes revertir y volver a editar hasta el 11 de junio. Después de esa fecha quedan en piedra.'
                : allFilled
                  ? 'Tienes todo completo. Cuando estés listo, envía tus predicciones definitivas. Podrás revertir hasta el 11 de junio.'
                  : 'Auto-guardado activo en cada cambio. Cuando estés listo, envía tus predicciones definitivas. Puedes revertir hasta el 11 de junio.'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ============ PUBLIC PICKS (other players' picks, only after lock) ============
function PublicPicksScreen({ players, predictions, results, focusPlayerId, onClearFocus }) {
  const ranked = useMemo(() => {
    return Object.entries(players || {}).map(([id, p]) => ({
      id, name: p.name, score: scorePlayer(predictions?.[id] || {}, results),
    })).sort((a, b) => b.score.total - a.score.total);
  }, [players, predictions, results]);

  const filtered = focusPlayerId
    ? ranked.filter(p => p.id === focusPlayerId)
    : ranked;

  return (
    <div>
      <h2 className="section-title">Predicciones de Todos</h2>
      <p className="section-sub">
        Después del cierre, todos pueden ver las predicciones de todos. Compara estrategias.
        {focusPlayerId && (
          <button className="btn-ghost" style={{ marginLeft: 12 }} onClick={onClearFocus}>
            Ver todos
          </button>
        )}
      </p>

      {filtered.map((p) => {
        const preds = predictions?.[p.id] || {};
        const groupFilled = Object.values(preds?.groupMatches || {}).filter(m => m && m.home != null && m.away != null);
        const champ = preds?.specials?.champion;
        const r32Winners = (preds?.knockouts?.r32 || []).filter(Boolean);
        const finalWinners = (preds?.knockouts?.final || []).filter(Boolean);
        const sfWinners = (preds?.knockouts?.sf || []).filter(Boolean);

        return (
          <div key={p.id} className="player-picks-card">
            <div className="player-picks-head">
              <Avatar name={p.name} size={48} />
              <div>
                <div className="name">{p.name}</div>
                <div className="text-xs text-muted mono mt-2">
                  G:{p.score.group} K:{p.score.knockout} E:{p.score.specials}
                </div>
              </div>
              <div className="pts">{p.score.total} pts</div>
            </div>

            <div className="picks-subhead">CAMPEÓN</div>
            <div className="text-sm">
              {champ ? `${TEAMS[champ]?.flag || ''} ${TEAMS[champ]?.name || champ}` : 'Sin predicción'}
            </div>

            <div className="picks-subhead">FINALISTAS ({sfWinners.length}/2)</div>
            <div className="text-sm">
              {sfWinners.length > 0
                ? sfWinners.map(t => `${TEAMS[t]?.flag || ''} ${TEAMS[t]?.name || t}`).join(' · ')
                : 'Sin predicción'}
            </div>

            <div className="picks-subhead">PASAN A R16 ({r32Winners.length}/16)</div>
            <div className="text-sm" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {r32Winners.length > 0
                ? r32Winners.map((t, i) => (
                    <span key={`${t}-${i}`} style={{ padding: '4px 8px', background: 'var(--bg-card)', borderRadius: 4 }}>
                      {TEAMS[t]?.flag} {TEAMS[t]?.short}
                    </span>
                  ))
                : 'Sin predicción'}
            </div>

            <div className="picks-subhead">FASE DE GRUPOS</div>
            <div className="text-sm text-muted">
              {groupFilled.length}/72 partidos predichos · {preds?.tiebreaker?.totalGoals != null ? `desempate: ${preds.tiebreaker.totalGoals} goles` : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============ ADMIN ============
function AdminScreen({
  players, predictions, results, config, syncMeta,
  onLockToggle, onSetResult, onSetKOResult, onSetSpecialResult,
  onSetTiebreaker, onResetAll, onSetPaymentStatus, onSyncNow
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const allTeams = Object.keys(TEAMS);

  function updateMatch(matchId, field, value) {
    const clean = value === '' ? null : Math.max(0, Math.min(20, parseInt(value) || 0));
    const current = results?.groupMatches?.[matchId] || {};
    onSetResult(matchId, { ...current, [field]: clean });
  }

  function setMatchWinnerAdmin(roundKey, matchIdx, teamCode) {
    const current = [...(results?.knockouts?.[roundKey] || [])];
    while (current.length < matchIdx + 1) current.push(null);
    current[matchIdx] = (current[matchIdx] === teamCode) ? null : (teamCode || null);
    onSetKOResult(roundKey, current);
  }

  // Build real bracket from actual results so admin sees matchups properly
  const realBracket = useMemo(() => buildBracket(results), [results]);

  async function doSync() {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await fetch('/api/sync-results', { method: 'GET', cache: 'no-store' });
      const data = await res.json();
      if (data.ok) {
        setSyncMsg(`Sincronizado: ${data.groupMatchesUpdated} partidos actualizados. R32:${data.knockoutCounts?.r32 || 0} R16:${data.knockoutCounts?.r16 || 0} QF:${data.knockoutCounts?.qf || 0} SF:${data.knockoutCounts?.sf || 0} F:${data.knockoutCounts?.final || 0}. Total goles: ${data.totalGoals || 0}.`);
      } else {
        setSyncMsg(`Error: ${data.error || 'desconocido'}`);
      }
    } catch (e) {
      setSyncMsg(`Error: ${String(e?.message || e).slice(0, 200)}`);
    } finally {
      setSyncing(false);
    }
  }

  const playerCount = Object.keys(players || {}).length;
  const playersWithStatus = Object.entries(players || {}).map(([id, p]) => ({
    id, ...p, status: getPaymentStatus(p),
  }));
  const pendingList = playersWithStatus.filter(p => p.status === 'pending').sort((a, b) => (a.pendingSince || a.joinedAt || 0) - (b.pendingSince || b.joinedAt || 0));
  const verifiedList = playersWithStatus.filter(p => p.status === 'verified').sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const unpaidList = playersWithStatus.filter(p => p.status === 'unpaid').sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  const verifiedCount = verifiedList.length;
  const lockedNow = config?.locked;

  return (
    <div>
      <div className="admin-banner">
        <div>
          <div className="lbl">PANEL DE ADMIN</div>
          <div className="text-xs" style={{ opacity: 0.9, marginTop: 4 }}>
            {playerCount} registrados · {verifiedCount} verificados · {pendingList.length} pendientes · Polla {lockedNow ? 'CERRADA' : 'ABIERTA'}
          </div>
        </div>
        <div className="admin-toolbar" style={{ margin: 0 }}>
          <button className="btn-warn" onClick={onLockToggle}>
            {lockedNow ? 'Reabrir polla' : 'Cerrar polla ahora'}
          </button>
          <button className="btn-ok" onClick={doSync} disabled={syncing}>
            {syncing ? 'Sincronizando...' : 'Sync resultados ahora'}
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className={`sync-meta ${syncMsg.startsWith('Error') ? 'error' : ''}`}>
          {syncMsg}
        </div>
      )}

      {syncMeta?.lastSyncAt && (
        <div className="sync-meta">
          Último auto-sync: {new Date(syncMeta.lastSyncAt).toLocaleString('es-ES')} ·
          partidos actualizados: {syncMeta.groupMatchesUpdated || 0} ·
          total goles: {syncMeta.totalGoals || 0}
        </div>
      )}

      <h2 className="section-title" style={{ fontSize: 22, marginTop: 32 }}>Pendientes de aprobación</h2>
      <p className="section-sub">
        Jugadores que clickearon "Ya pagué" y esperan tu verificación.
        Cruza con Venmo de <strong>@{VENMO_HANDLE}</strong> y aprueba o rechaza.
      </p>

      {pendingList.length === 0 ? (
        <div className="sync-meta" style={{ marginBottom: 32 }}>Sin pendientes ahora mismo.</div>
      ) : (
        <div className="leaderboard mb-8">
          {pendingList.map((p) => (
            <div key={p.id} className="lb-row">
              <div></div>
              <Avatar name={p.name} size={32} />
              <div className="lb-name">
                {p.name}
                <span className="lb-paid" style={{ background: 'rgba(212,175,55,0.12)', color: 'var(--gold)', border: '1px solid rgba(212,175,55,0.3)' }}>
                  ESPERANDO
                </span>
              </div>
              <div></div>
              <div style={{ textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  className="btn-ok"
                  onClick={() => onSetPaymentStatus(p.id, 'verified')}
                  style={{ padding: '6px 12px', fontSize: 11 }}
                >
                  Aprobar
                </button>
                <button
                  className="btn-danger"
                  onClick={() => onSetPaymentStatus(p.id, 'unpaid')}
                  style={{ padding: '6px 12px', fontSize: 11 }}
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title" style={{ fontSize: 22 }}>Verificados ({verifiedCount})</h2>
      <p className="section-sub">
        Premio acumulado: <strong>${verifiedCount * BUY_IN_USD}</strong>. Estos jugadores aparecen en la Tabla oficial.
      </p>

      {verifiedList.length === 0 ? (
        <div className="sync-meta" style={{ marginBottom: 32 }}>Aún no hay jugadores verificados.</div>
      ) : (
        <div className="leaderboard mb-8">
          {verifiedList.map((p) => (
            <div key={p.id} className="lb-row">
              <div></div>
              <Avatar name={p.name} size={32} />
              <div className="lb-name">
                {p.name}
                <span className="lb-paid yes">PAGÓ ${BUY_IN_USD}</span>
              </div>
              <div></div>
              <div style={{ textAlign: 'right' }}>
                <button
                  className="btn-ghost"
                  onClick={() => onSetPaymentStatus(p.id, 'unpaid')}
                  style={{ padding: '5px 10px', fontSize: 10 }}
                  title="Revertir el estado del pago"
                >
                  Revertir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title" style={{ fontSize: 22 }}>Sin pagar ({unpaidList.length})</h2>
      <p className="section-sub">
        Jugadores que se registraron pero no han clickeado "Ya pagué". Puedes marcarlos directo si llegan por otro canal.
      </p>

      {unpaidList.length === 0 ? (
        <div className="sync-meta" style={{ marginBottom: 32 }}>Sin pendientes en esta categoría.</div>
      ) : (
        <div className="leaderboard mb-8">
          {unpaidList.map((p) => (
            <div key={p.id} className="lb-row" style={{ opacity: 0.7 }}>
              <div></div>
              <Avatar name={p.name} size={32} />
              <div className="lb-name">
                {p.name}
                <span className="lb-paid no">SIN PAGAR</span>
              </div>
              <div></div>
              <div style={{ textAlign: 'right' }}>
                <button
                  className="btn-ok"
                  onClick={() => onSetPaymentStatus(p.id, 'verified')}
                  style={{ padding: '6px 12px', fontSize: 11 }}
                >
                  Marcar verificado
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title" style={{ fontSize: 22 }}>Resultados reales — Fase de grupos</h2>
      <p className="section-sub">
        Los resultados se sincronizan automáticamente cada 3 minutos vía openfootball/worldcup.json. Puedes editar a mano si necesitas.
      </p>

      <div className="groups-grid">
        {Object.keys(GROUPS).map((groupId) => (
          <div key={groupId} className="group-card">
            <div className="group-header">
              <span className="group-letter">{groupId}</span>
              <span className="group-tag">Resultados</span>
            </div>
            <div className="matches-list">
              {GROUP_MATCHES.filter(m => m.group === groupId).map((match) => {
                const real = results?.groupMatches?.[match.id] || {};
                return (
                  <div key={match.id} className="match-row">
                    <div className="team-side">
                      <span className="team-flag">{TEAMS[match.home].flag}</span>
                      <span className="team-name">{TEAMS[match.home].name}</span>
                    </div>
                    <div className="score-input-pair">
                      <input
                        type="number" className={`score-input ${real.home != null ? 'has-value' : ''}`}
                        value={real.home ?? ''}
                        onChange={(e) => updateMatch(match.id, 'home', e.target.value)}
                        min="0" max="20"
                      />
                      <span className="score-sep">·</span>
                      <input
                        type="number" className={`score-input ${real.away != null ? 'has-value' : ''}`}
                        value={real.away ?? ''}
                        onChange={(e) => updateMatch(match.id, 'away', e.target.value)}
                        min="0" max="20"
                      />
                    </div>
                    <div className="team-side away">
                      <span className="team-name">{TEAMS[match.away].name}</span>
                      <span className="team-flag">{TEAMS[match.away].flag}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <h2 className="section-title" style={{ fontSize: 22, marginTop: 48 }}>Resultados — Llaves</h2>
      <p className="section-sub">Click en el ganador de cada partido. R32 muestra los cruces oficiales FIFA 2026 (basado en tus resultados de grupos). R16+ se derivan automáticamente.</p>

      <div className="bracket-wrap" style={{ overflowX: 'auto' }}>
        <div className="bracket-tree-v2">
          {KO_ROUNDS.map((round) => {
            const matches = realBracket[round.key] || [];
            const picks = results?.knockouts?.[round.key] || [];
            const filledCount = picks.filter(Boolean).length;
            return (
              <div key={round.key} className={`bracket-round col-${round.key}`}>
                <div className="bracket-round-head">
                  <div className="bracket-round-title">{round.label}</div>
                  <div className="bracket-round-meta">
                    <span className="mono">{filledCount}/{round.count}</span>
                    <span className="bracket-round-dates">{round.dates}</span>
                  </div>
                </div>
                <div className="bracket-matches">
                  {matches.map((m, idx) => {
                    const [teamA, teamB] = m.teams;
                    const [labelA, labelB] = m.teamsLabel;
                    const winner = m.winner;
                    return (
                      <div key={m.id} className="bracket-match">
                        <button
                          type="button"
                          className={`team-pick ${winner === teamA && teamA ? 'selected' : ''} ${!teamA ? 'unresolved' : ''}`}
                          onClick={() => teamA && setMatchWinnerAdmin(round.key, idx, teamA)}
                          disabled={!teamA}
                        >
                          {teamA ? (
                            <>
                              <span className="team-pick-flag">{TEAMS[teamA]?.flag}</span>
                              <span className="team-pick-name">{TEAMS[teamA]?.short || TEAMS[teamA]?.name}</span>
                              {winner === teamA && <span className="team-pick-check">✓</span>}
                            </>
                          ) : (
                            <span className="team-pick-placeholder">{labelA}</span>
                          )}
                        </button>
                        <div className="bracket-vs">vs</div>
                        <button
                          type="button"
                          className={`team-pick ${winner === teamB && teamB ? 'selected' : ''} ${!teamB ? 'unresolved' : ''}`}
                          onClick={() => teamB && setMatchWinnerAdmin(round.key, idx, teamB)}
                          disabled={!teamB}
                        >
                          {teamB ? (
                            <>
                              <span className="team-pick-flag">{TEAMS[teamB]?.flag}</span>
                              <span className="team-pick-name">{TEAMS[teamB]?.short || TEAMS[teamB]?.name}</span>
                              {winner === teamB && <span className="team-pick-check">✓</span>}
                            </>
                          ) : (
                            <span className="team-pick-placeholder">{labelB}</span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <h2 className="section-title" style={{ fontSize: 22, marginTop: 48 }}>Resultados — Especiales</h2>
      <div className="specials-grid">
        {SPECIAL_AWARDS.map((award) => (
          <div key={award.id} className="special-card">
            <div className="pts-badge">{award.points} pts</div>
            <div className="lbl">Valor real</div>
            <div className="award">{award.label}</div>
            {award.freeText ? (
              <input
                type="text"
                value={results?.specials?.[award.id] || ''}
                onChange={(e) => onSetSpecialResult(award.id, e.target.value)}
                placeholder="Nombre real"
                maxLength={60}
              />
            ) : (
              <select
                value={results?.specials?.[award.id] || ''}
                onChange={(e) => onSetSpecialResult(award.id, e.target.value)}
              >
                <option value="">— Sin definir —</option>
                {allTeams.map((t) => (
                  <option key={t} value={t}>{TEAMS[t].flag} {TEAMS[t].name}</option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      <div className="tiebreaker-card">
        <div className="hairline" style={{ color: 'var(--pequiven-red-bright)', marginBottom: 6 }}>
          DESEMPATE · VALOR REAL
        </div>
        <div style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 18, marginBottom: 12, textTransform: 'uppercase' }}>
          Total real de goles
        </div>
        <input
          type="number"
          value={results?.tiebreaker?.totalGoals ?? ''}
          onChange={(e) => onSetTiebreaker('totalGoals', e.target.value)}
          placeholder="Se autocompleta vía sync"
          style={{ width: 200, padding: '14px 16px', fontSize: 18, fontFamily: 'JetBrains Mono, monospace' }}
          min="0" max="999"
        />
      </div>

      <h2 className="section-title" style={{ fontSize: 22, marginTop: 48 }}>Zona de peligro</h2>
      <p className="section-sub">Acciones destructivas.</p>
      {!confirmReset ? (
        <button className="btn-danger" onClick={() => setConfirmReset(true)}>
          Resetear todo (jugadores + predicciones + resultados)
        </button>
      ) : (
        <div className="flex gap-3 items-center flex-wrap">
          <span className="text-red text-sm font-bold">¿100% seguro? Esto borra TODO.</span>
          <button className="btn-danger" onClick={() => { onResetAll(); setConfirmReset(false); }}>
            Sí, borrar todo
          </button>
          <button className="btn-ghost" onClick={() => setConfirmReset(false)}>Cancelar</button>
        </div>
      )}
    </div>
  );
}

// ============ MAIN APP ============
export default function PollaApp() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('grupos');
  const [hydrated, setHydrated] = useState(false);
  const [focusPlayerId, setFocusPlayerId] = useState(null);

  const [players, setPlayers] = useState({});
  const [predictions, setPredictions] = useState({});
  const [results, setResults] = useState({});
  const [config, setConfig] = useState({ locked: false });
  const [syncMeta, setSyncMeta] = useState(null);
  const [pmOdds, setPmOdds] = useState(null);
  const [writeError, setWriteError] = useState(null);

  useEffect(() => {
    function handler(e) {
      setWriteError(e.detail?.message || 'Error al guardar');
    }
    window.addEventListener('firebase-write-error', handler);
    return () => window.removeEventListener('firebase-write-error', handler);
  }, []);

  useEffect(() => {
    setHydrated(true);
    try {
      const saved = localStorage.getItem('polla-user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.name) setUser(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubs = [];
    unsubs.push(onValue(dbPath('players'), (snap) => setPlayers(snap.val() || {})));
    unsubs.push(onValue(dbPath('predictions'), (snap) => setPredictions(snap.val() || {})));
    unsubs.push(onValue(dbPath('results'), (snap) => setResults(snap.val() || {})));
    unsubs.push(onValue(dbPath('config'), (snap) => setConfig(snap.val() || { locked: false })));
    unsubs.push(onValue(dbPath('syncMeta'), (snap) => setSyncMeta(snap.val() || null)));
    return () => unsubs.forEach(u => u && u());
  }, [user]);

  const playerId = user && !user.isAdmin ? slug(user.name) : null;

  useEffect(() => {
    if (!user || user.isAdmin || !playerId) return;
    const existing = players?.[playerId];
    if (!existing) {
      dbSet(`players/${playerId}`, {
        name: user.name,
        joinedAt: Date.now(),
        paymentStatus: 'unpaid',
      });
    }
  }, [user, playerId, players]);

  const now = Date.now();
  const autoLocked = now >= TOURNAMENT_START.getTime();
  const locked = config.locked || autoLocked;

  // Auto-sync results from openfootball every 3 minutes when polla is locked
  // (i.e. tournament running). Skips when tab is hidden. Failure is silent.
  // Vercel Hobby doesn't allow sub-daily cron, so we poll from the client
  // instead. As long as anyone has the app open, data stays fresh.
  useEffect(() => {
    if (!user || !locked) return;
    let cancelled = false;
    async function trySync() {
      if (cancelled) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        await fetch('/api/sync-results', { method: 'GET', cache: 'no-store' });
      } catch {}
    }
    trySync();
    const i = setInterval(trySync, 3 * 60 * 1000);
    return () => { cancelled = true; clearInterval(i); };
  }, [user, locked]);

  // Polymarket odds polling: every 90s when user is on the app
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function loadOdds() {
      if (cancelled) return;
      try {
        const r = await fetch('/api/polymarket-odds', { cache: 'no-store' });
        const d = await r.json();
        if (!cancelled) setPmOdds(d);
      } catch {}
    }
    loadOdds();
    const i = setInterval(loadOdds, 90 * 1000);
    return () => { cancelled = true; clearInterval(i); };
  }, [user]);

  function handleLogin(u) {
    setUser(u);
    try { localStorage.setItem('polla-user', JSON.stringify(u)); } catch {}
  }
  function handleLogout() {
    try { localStorage.removeItem('polla-user'); } catch {}
    setUser(null);
    setTab('grupos');
  }

  // Optimistic update helper: writes to local state INSTANTLY so the UI
  // reflects the change without waiting for Firebase round-trip. Firebase
  // listener will eventually fire with the same value (no-op) confirming
  // persistence. If the write fails, the listener will eventually correct.
  function updatePredictionField(path, value) {
    setPredictions(prev => {
      const next = JSON.parse(JSON.stringify(prev || {}));
      const parts = path.split('.');
      let cur = next;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
        cur = cur[p];
      }
      cur[parts[parts.length - 1]] = value;
      return next;
    });
  }
  function updateResultField(path, value) {
    setResults(prev => {
      const next = JSON.parse(JSON.stringify(prev || {}));
      const parts = path.split('.');
      let cur = next;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
        cur = cur[p];
      }
      cur[parts[parts.length - 1]] = value;
      return next;
    });
  }

  function updateGroupMatch(matchId, field, value) {
    if (!playerId || locked) return;
    // Optimistic local update so the input reflects the value instantly
    updatePredictionField(`${playerId}.groupMatches.${matchId}.${field}`, value);
    const current = predictions?.[playerId]?.groupMatches?.[matchId] || {};
    dbSet(`predictions/${playerId}/groupMatches/${matchId}`, { ...current, [field]: value });
  }
  function updateKO(roundKey, teams) {
    if (!playerId || locked) return;
    updatePredictionField(`${playerId}.knockouts.${roundKey}`, teams);
    dbSet(`predictions/${playerId}/knockouts/${roundKey}`, teams);
  }
  function updateSpecial(awardId, value) {
    if (!playerId || locked) return;
    updatePredictionField(`${playerId}.specials.${awardId}`, value);
    dbSet(`predictions/${playerId}/specials/${awardId}`, value);
  }
  function updateTiebreaker(field, value) {
    if (!playerId || locked) return;
    const clean = value === '' ? null : Math.max(0, parseInt(value) || 0);
    updatePredictionField(`${playerId}.tiebreaker.${field}`, clean);
    dbSet(`predictions/${playerId}/tiebreaker/${field}`, clean);
  }

  function setMatchResult(matchId, val) {
    updateResultField(`groupMatches.${matchId}`, val);
    dbSet(`results/groupMatches/${matchId}`, val);
  }
  function setKOResult(roundKey, teams) {
    updateResultField(`knockouts.${roundKey}`, teams);
    dbSet(`results/knockouts/${roundKey}`, teams);
  }
  function setSpecialResult(awardId, value) {
    updateResultField(`specials.${awardId}`, value);
    dbSet(`results/specials/${awardId}`, value);
  }
  function setTiebreakerResult(field, value) {
    const clean = value === '' ? null : Math.max(0, parseInt(value) || 0);
    updateResultField(`tiebreaker.${field}`, clean);
    dbSet(`results/tiebreaker/${field}`, clean);
  }

  function setPaymentStatus(pid, newStatus) {
    const update = { paymentStatus: newStatus };
    if (newStatus === 'pending') update.pendingSince = Date.now();
    if (newStatus === 'verified') update.verifiedAt = Date.now();
    Object.entries(update).forEach(([k, v]) => {
      dbSet(`players/${pid}/${k}`, v);
    });
    if (newStatus !== 'verified') {
      dbSet(`players/${pid}/paid`, null);
    } else {
      dbSet(`players/${pid}/paid`, true);
    }
  }

  function markSelfPaid() {
    if (!playerId) return;
    setPaymentStatus(playerId, 'pending');
  }

  function submitPicks() {
    if (!playerId || locked) return;
    const ts = Date.now();
    // Optimistic local
    setPlayers(prev => ({
      ...prev,
      [playerId]: { ...(prev[playerId] || {}), submittedAt: ts },
    }));
    dbSet(`players/${playerId}/submittedAt`, ts);
  }
  function unsubmitPicks() {
    if (!playerId || locked) return;
    setPlayers(prev => {
      const p = { ...(prev[playerId] || {}) };
      delete p.submittedAt;
      return { ...prev, [playerId]: p };
    });
    dbSet(`players/${playerId}/submittedAt`, null);
  }
  function toggleLock() {
    dbSet('config', { ...config, locked: !config.locked });
  }
  function resetAll() {
    dbRemove('players');
    dbRemove('predictions');
    dbRemove('results');
    dbRemove('config');
    dbRemove('syncMeta');
  }

  function handlePickClick(pid) {
    setFocusPlayerId(pid);
    setTab('publicas');
  }

  if (!hydrated) return <div className="loading-page"><div className="spinner" /></div>;
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  // Predictions and results come straight from state. The update functions
  // write OPTIMISTICALLY to state (so the UI reflects the typed value
  // instantly), then persist to Firebase in the background. Firebase's
  // onValue listener confirms with the same value (no-op).
  const myPreds = playerId ? (predictions?.[playerId] || {}) : {};
  const mergedResults = results;
  // Soft lock: when a player has submitted their picks, inputs are disabled
  // for them until they revert. Hard lock (deadline passed) overrides.
  const submittedByMe = !!players?.[playerId]?.submittedAt;
  const editLocked = user.isAdmin || locked || submittedByMe;

  const showResults = locked;

  return (
    <>
      <header className="app-header">
        <div className="page header-content">
          <div className="header-title">
            <div className="header-logo-img">
              <img src="/pequiven-logo.png" alt="Pequiven" />
            </div>
            <div>
              <h1>POLLA PEQUIVEN 2026</h1>
              <div className="sub">FIFA WORLD CUP · CAN MEX USA</div>
            </div>
          </div>
          <div className="header-right">
            {!user.isAdmin && (
              <button
                className={`submit-badge ${locked ? 'locked' : (submittedByMe ? 'submitted' : 'draft')}`}
                onClick={() => setTab('mis-picks')}
                title={locked
                  ? 'Polla cerrada'
                  : (submittedByMe ? 'Picks enviados. Click para revertir.' : 'Borrador. Click para enviar definitivos.')}
              >
                <span className="submit-badge-dot" />
                <span className="submit-badge-label">
                  {locked ? 'CERRADA' : (submittedByMe ? 'ENVIADO' : 'BORRADOR')}
                </span>
              </button>
            )}
            <MusicToggle />
            <ThemeToggle />
            <div className={`user-pill ${user.isAdmin ? 'admin' : ''}`}>
              {!user.isAdmin && (
                <Avatar name={user.name} size={24} />
              )}
              {user.isAdmin && (
                <div className="pill-avatar" style={{ background: 'var(--pequiven-red)' }}>
                  <Icon name="lock" size={11} />
                </div>
              )}
              <span className="pill-name">{user.isAdmin ? 'ADMIN' : user.name}</span>
            </div>
            <button className="icon-btn" onClick={handleLogout} title="Salir">
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </header>

      {writeError && (
        <div className="error-banner">
          <div>
            <strong>Error al guardar:</strong> {writeError}. Tus cambios no están persistiendo en la base de datos. Avisa al admin.
          </div>
          <button onClick={() => setWriteError(null)} aria-label="Cerrar">×</button>
        </div>
      )}

      <div className="page">
        <div className="tabs-bar">
          <div className="tabs">
            <button className={`tab ${tab === 'grupos' ? 'active' : ''}`} onClick={() => setTab('grupos')}>
              Fase de Grupos
            </button>
            <button className={`tab ${tab === 'llaves' ? 'active' : ''}`} onClick={() => setTab('llaves')}>
              Llaves
            </button>
            <button className={`tab ${tab === 'especiales' ? 'active' : ''}`} onClick={() => setTab('especiales')}>
              Especiales
            </button>
            <button className={`tab ${tab === 'tabla' ? 'active' : ''}`} onClick={() => setTab('tabla')}>
              Tabla
            </button>
            {locked && (
              <button className={`tab ${tab === 'publicas' ? 'active' : ''}`} onClick={() => { setTab('publicas'); setFocusPlayerId(null); }}>
                Predicciones Públicas
              </button>
            )}
            {!user.isAdmin && (
              <button className={`tab ${tab === 'mis-picks' ? 'active' : ''}`} onClick={() => setTab('mis-picks')}>
                Mis Picks
              </button>
            )}
            {user.isAdmin && (
              <button className={`tab ${tab === 'admin' ? 'active' : ''}`} onClick={() => setTab('admin')}>
                Admin<span className="tab-badge">ADM</span>
              </button>
            )}
          </div>
        </div>

        <div style={{ paddingBottom: 40 }}>
          {!user.isAdmin && submittedByMe && !locked && ['grupos', 'llaves', 'especiales'].includes(tab) && (
            <div className="submitted-banner">
              <div>
                <strong>Predicciones enviadas.</strong> Para editar, ve a <em>Mis Picks</em> y presiona <em>Revertir</em>. Disponible hasta el 11 de junio.
              </div>
              <button className="btn-ghost" onClick={() => setTab('mis-picks')}>
                Ir a Mis Picks
              </button>
            </div>
          )}
          {!user.isAdmin && submittedByMe && !locked && (tab === 'grupos' || tab === 'llaves' || tab === 'especiales') && (
            <div className="submitted-banner">
              <div>
                <strong>Picks enviados.</strong> Si quieres cambiar algo, primero revierte. Tienes hasta el 11 de junio.
              </div>
              <button className="btn-ghost" onClick={() => setTab('mis-picks')}>
                Ir a Mis Picks
              </button>
            </div>
          )}
          {tab === 'grupos' && (
            <GroupStageScreen
              predictions={user.isAdmin ? {} : myPreds}
              results={results}
              locked={editLocked}
              onUpdate={updateGroupMatch}
              showResults={showResults}
              pmOdds={pmOdds}
            />
          )}
          {tab === 'llaves' && (
            <KnockoutScreen
              predictions={user.isAdmin ? {} : myPreds}
              results={results}
              locked={editLocked}
              onUpdateKO={updateKO}
              showResults={showResults}
            />
          )}
          {tab === 'especiales' && (
            <SpecialsScreen
              predictions={user.isAdmin ? {} : myPreds}
              results={results}
              locked={editLocked}
              onUpdateSpecial={updateSpecial}
              onUpdateTiebreaker={updateTiebreaker}
              showResults={showResults}
            />
          )}
          {tab === 'tabla' && (
            <LeaderboardScreen
              players={players}
              predictions={predictions}
              results={results}
              currentName={user.name}
              locked={locked}
              onPickClick={handlePickClick}
            />
          )}
          {tab === 'publicas' && locked && (
            <PublicPicksScreen
              players={players}
              predictions={predictions}
              results={results}
              focusPlayerId={focusPlayerId}
              onClearFocus={() => setFocusPlayerId(null)}
            />
          )}
          {tab === 'mis-picks' && !user.isAdmin && (
            <MyPicksScreen
              playerId={playerId}
              predictions={predictions}
              results={results}
              locked={locked}
              currentName={user.name}
              players={players}
              onMarkPaid={markSelfPaid}
              onSubmit={submitPicks}
              onUnsubmit={unsubmitPicks}
            />
          )}
          {tab === 'admin' && user.isAdmin && (
            <AdminScreen
              players={players}
              predictions={predictions}
              results={mergedResults}
              config={config}
              syncMeta={syncMeta}
              onLockToggle={toggleLock}
              onSetResult={setMatchResult}
              onSetKOResult={setKOResult}
              onSetSpecialResult={setSpecialResult}
              onSetTiebreaker={setTiebreakerResult}
              onResetAll={resetAll}
              onSetPaymentStatus={setPaymentStatus}
            />
          )}
        </div>

        <footer className="app-footer">
          <PoweredByPolymarket />
          <TrustedBy />
        </footer>
      </div>
    </>
  );
}
