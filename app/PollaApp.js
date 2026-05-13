'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { ref, set, onValue, remove } from 'firebase/database';
import { db, DB_ROOT } from '@/lib/firebase';
import {
  TEAMS, GROUPS, GROUP_MATCHES, GROUP_DATES,
  KO_ROUNDS, SPECIAL_AWARDS, SCORING, TOURNAMENT_START,
  BUY_IN_USD, VENMO_HANDLE,
} from '@/lib/worldcup-data';
import { scorePlayer, scoreMatchPrediction } from '@/lib/scoring';
import Avatar from '@/components/Avatar';
import ThemeToggle from '@/components/ThemeToggle';
import MusicToggle from '@/components/MusicToggle';
import { Icon } from '@/components/Icon';

const PLAYER_PASSWORD = 'marcialmaciel';
const ADMIN_PASSWORD = 'Tnslppbntso1*';

// ============ FIREBASE HELPERS ============
const dbPath = (sub) => ref(db, `${DB_ROOT}/${sub}`);
const dbSet = (sub, data) => set(dbPath(sub), data);
const dbRemove = (sub) => remove(dbPath(sub));

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
          <span>Pequiven · Petroquímica</span>
          <span className="mono">v2.0</span>
        </div>
      </div>
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

  return (
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
  );
}

// ============ GROUP STAGE ============
function GroupStageScreen({ predictions, results, locked, onUpdate, showResults }) {
  function update(matchId, field, value) {
    if (locked) return;
    const clean = value === '' ? null : Math.max(0, Math.min(20, parseInt(value) || 0));
    onUpdate(matchId, field, clean);
  }

  return (
    <div>
      <CountdownBox locked={locked} />
      <h2 className="section-title">Fase de Grupos</h2>
      <p className="section-sub">
        {locked
          ? 'Predicciones cerradas. Solo lectura.'
          : 'Predice el marcador exacto de cada partido. Acierto exacto = 5 pts. Solo ganador = 2 pts. Diferencia de goles correcta = +1 pt bonus.'}
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
                            className="score-input"
                            value={pred.home ?? ''}
                            onChange={(e) => update(match.id, 'home', e.target.value)}
                            disabled={locked}
                            min="0" max="20"
                          />
                          <span className="score-sep">·</span>
                          <input
                            type="number"
                            className="score-input"
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
  const allTeams = Object.keys(TEAMS);

  function getSlot(roundKey, i) {
    return predictions?.knockouts?.[roundKey]?.[i] || '';
  }

  function setSlot(roundKey, i, value) {
    if (locked) return;
    const current = [...(predictions?.knockouts?.[roundKey] || [])];
    while (current.length < i + 1) current.push(null);
    current[i] = value || null;
    onUpdateKO(roundKey, current);
  }

  return (
    <div>
      <h2 className="section-title">Llaves Eliminatorias</h2>
      <p className="section-sub">
        {locked
          ? 'Llaves cerradas.'
          : 'Predice qué selecciones llegan a cada ronda. R32 = 3 pts cada acierto · Octavos = 6 · Cuartos = 12 · Semis = 25 · Final = 50.'}
      </p>

      <div className="bracket-wrap">
        <div className="bracket-tree">
          {KO_ROUNDS.map((round) => {
            const realSet = new Set(results?.knockouts?.[round.key] || []);
            return (
              <div key={round.key} className="bracket-col">
                <div className="bracket-col-head">
                  {round.label}
                  <span className="sub">{round.dates} · {round.pointsTeam}pts c/u</span>
                </div>
                {Array.from({ length: round.count }).map((_, i) => {
                  const val = getSlot(round.key, i);
                  let cls = 'bracket-slot';
                  if (!val) cls += ' empty';
                  if (showResults && val) {
                    cls += realSet.has(val) ? ' correct' : ' incorrect';
                  }
                  if (locked) {
                    return (
                      <div key={i} className={cls}>
                        {val ? (
                          <>
                            <span className="flag">{TEAMS[val]?.flag}</span>
                            <span className="nm">{TEAMS[val]?.name}</span>
                          </>
                        ) : (
                          <span className="nm">— sin predicción —</span>
                        )}
                      </div>
                    );
                  }
                  return (
                    <select
                      key={i}
                      className={cls}
                      value={val}
                      onChange={(e) => setSlot(round.key, i, e.target.value)}
                    >
                      <option value="">— #{i + 1} —</option>
                      {allTeams.map((t) => (
                        <option key={t} value={t}>{TEAMS[t].flag} {TEAMS[t].name}</option>
                      ))}
                    </select>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
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
            return (
              <div
                key={p.id}
                className={`lb-row ${canClick ? 'lb-clickable' : ''}`}
                onClick={canClick ? () => onPickClick(p.id) : undefined}
              >
                <div className="lb-rank">{idx + 1}</div>
                <Avatar name={p.name} size={36} />
                <div className="lb-name">
                  {p.name}
                  {isYou && <span className="you">TÚ</span>}
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
function MyPicksScreen({ playerId, predictions, results, locked, currentName, players, onMarkPaid }) {
  const myPreds = predictions?.[playerId] || {};
  const score = scorePlayer(myPreds, results);
  const filled = Object.values(myPreds?.groupMatches || {}).filter(m => m && m.home != null && m.away != null).length;
  const totalKO = ['r32','r16','qf','sf','final'].reduce((acc, k) => acc + (myPreds?.knockouts?.[k]?.filter(Boolean).length || 0), 0);
  const totalSp = SPECIAL_AWARDS.filter(a => myPreds?.specials?.[a.id]).length;
  const myStatus = getPaymentStatus(players?.[playerId]);
  const venmoUrl = `https://venmo.com/${VENMO_HANDLE}?txn=pay&amount=${BUY_IN_USD}&note=Polla%20Pequiven%20Mundial%202026%20-%20${encodeURIComponent(currentName)}`;

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
          <div className="val">{filled}/72</div>
          <div className="text-xs text-muted mt-2 mono">{score.group} pts</div>
        </div>
        <div className="stat-tile">
          <div className="lbl">LLAVES</div>
          <div className="val">{totalKO}/62</div>
          <div className="text-xs text-muted mt-2 mono">{score.knockout} pts</div>
        </div>
        <div className="stat-tile">
          <div className="lbl">ESPECIALES</div>
          <div className="val">{totalSp}/{SPECIAL_AWARDS.length}</div>
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

      {myStatus === 'verified' && (
        <div className="success-msg mb-6">
          <strong>Buy-in verificado.</strong> Estás dentro. Suerte.
        </div>
      )}

      {!locked ? (
        <div className="warn-msg">
          Puedes editar tus predicciones hasta el 11 de junio. Ve a Grupos, Llaves o Especiales.
        </div>
      ) : (
        <div className="success-msg">
          La polla está cerrada. Tus predicciones quedaron en piedra.
        </div>
      )}
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
        const r32List = (preds?.knockouts?.r32 || []).filter(Boolean);
        const finalList = (preds?.knockouts?.final || []).filter(Boolean);

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

            <div className="picks-subhead">FINAL (2 equipos)</div>
            <div className="text-sm">
              {finalList.length > 0
                ? finalList.map(t => `${TEAMS[t]?.flag || ''} ${TEAMS[t]?.name || t}`).join(' · ')
                : 'Sin predicción'}
            </div>

            <div className="picks-subhead">PASAN A R32 ({r32List.length}/32)</div>
            <div className="text-sm" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {r32List.length > 0
                ? r32List.map(t => (
                    <span key={t} style={{ padding: '4px 8px', background: 'var(--bg-card)', borderRadius: 4 }}>
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

  function toggleTeamInRound(roundKey, team, count) {
    const current = [...(results?.knockouts?.[roundKey] || [])];
    const idx = current.indexOf(team);
    if (idx >= 0) current.splice(idx, 1);
    else if (current.length < count) current.push(team);
    onSetKOResult(roundKey, current.filter(Boolean));
  }

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
                        type="number" className="score-input"
                        value={real.home ?? ''}
                        onChange={(e) => updateMatch(match.id, 'home', e.target.value)}
                        min="0" max="20"
                      />
                      <span className="score-sep">·</span>
                      <input
                        type="number" className="score-input"
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
      <p className="section-sub">Click para añadir/quitar equipos que avanzaron a cada ronda.</p>

      {KO_ROUNDS.map((round) => {
        const selected = new Set(results?.knockouts?.[round.key] || []);
        return (
          <div key={round.key} className="bracket-wrap" style={{ overflowX: 'visible' }}>
            <div className="knockout-meta">
              <span className="bracket-col-head" style={{ border: 0, padding: 0, margin: 0, textAlign: 'left' }}>
                {round.label}
              </span>
              <span className="text-xs text-muted mono">{selected.size} / {round.count} equipos</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
              {allTeams.map((t) => {
                const isSel = selected.has(t);
                const disabled = !isSel && selected.size >= round.count;
                return (
                  <button
                    key={t}
                    className={`bracket-slot ${isSel ? 'correct' : ''}`}
                    onClick={() => toggleTeamInRound(round.key, t, round.count)}
                    disabled={disabled}
                    style={{ opacity: disabled ? 0.25 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
                  >
                    <span className="flag">{TEAMS[t].flag}</span>
                    <span className="nm">{TEAMS[t].name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

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

  const [saveStatus, setSaveStatus] = useState(null);

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

  const showSave = useCallback((kind = 'saved') => {
    setSaveStatus('saving');
    setTimeout(() => setSaveStatus(kind), 200);
    setTimeout(() => setSaveStatus(null), 1500);
  }, []);

  function handleLogin(u) {
    setUser(u);
    try { localStorage.setItem('polla-user', JSON.stringify(u)); } catch {}
  }
  function handleLogout() {
    try { localStorage.removeItem('polla-user'); } catch {}
    setUser(null);
    setTab('grupos');
  }

  function updateGroupMatch(matchId, field, value) {
    if (!playerId || locked) return;
    const current = predictions?.[playerId]?.groupMatches?.[matchId] || {};
    showSave();
    dbSet(`predictions/${playerId}/groupMatches/${matchId}`, { ...current, [field]: value });
  }
  function updateKO(roundKey, teams) {
    if (!playerId || locked) return;
    showSave();
    dbSet(`predictions/${playerId}/knockouts/${roundKey}`, teams);
  }
  function updateSpecial(awardId, value) {
    if (!playerId || locked) return;
    showSave();
    dbSet(`predictions/${playerId}/specials/${awardId}`, value);
  }
  function updateTiebreaker(field, value) {
    if (!playerId || locked) return;
    showSave();
    const clean = value === '' ? null : Math.max(0, parseInt(value) || 0);
    dbSet(`predictions/${playerId}/tiebreaker/${field}`, clean);
  }

  function setMatchResult(matchId, val) { showSave(); dbSet(`results/groupMatches/${matchId}`, val); }
  function setKOResult(roundKey, teams) { showSave(); dbSet(`results/knockouts/${roundKey}`, teams); }
  function setSpecialResult(awardId, value) { showSave(); dbSet(`results/specials/${awardId}`, value); }
  function setTiebreakerResult(field, value) {
    showSave();
    const clean = value === '' ? null : Math.max(0, parseInt(value) || 0);
    dbSet(`results/tiebreaker/${field}`, clean);
  }
  function toggleLock() {
    showSave();
    dbSet('config', { ...config, locked: !config.locked });
  }
  function resetAll() {
    showSave();
    dbRemove('players');
    dbRemove('predictions');
    dbRemove('results');
    dbRemove('config');
    dbRemove('syncMeta');
  }
  function setPaymentStatus(pid, newStatus) {
    showSave();
    const update = { paymentStatus: newStatus };
    if (newStatus === 'pending') update.pendingSince = Date.now();
    if (newStatus === 'verified') update.verifiedAt = Date.now();
    // Patch the player's payment fields without wiping name/joinedAt
    Object.entries(update).forEach(([k, v]) => {
      dbSet(`players/${pid}/${k}`, v);
    });
    // Also clear old `paid` boolean if it's there (cleanup)
    if (newStatus !== 'verified') {
      dbSet(`players/${pid}/paid`, null);
    } else {
      dbSet(`players/${pid}/paid`, true); // keep for backward read compat
    }
  }

  // Player self-marks as pending after paying via Venmo
  function markSelfPaid() {
    if (!playerId) return;
    setPaymentStatus(playerId, 'pending');
  }

  function handlePickClick(pid) {
    setFocusPlayerId(pid);
    setTab('publicas');
  }

  if (!hydrated) return <div className="loading-page"><div className="spinner" /></div>;
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  const myPreds = playerId ? (predictions?.[playerId] || {}) : {};
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

        <div style={{ paddingBottom: 80 }}>
          {tab === 'grupos' && (
            <GroupStageScreen
              predictions={user.isAdmin ? {} : myPreds}
              results={results}
              locked={user.isAdmin || locked}
              onUpdate={updateGroupMatch}
              showResults={showResults}
            />
          )}
          {tab === 'llaves' && (
            <KnockoutScreen
              predictions={user.isAdmin ? {} : myPreds}
              results={results}
              locked={user.isAdmin || locked}
              onUpdateKO={updateKO}
              showResults={showResults}
            />
          )}
          {tab === 'especiales' && (
            <SpecialsScreen
              predictions={user.isAdmin ? {} : myPreds}
              results={results}
              locked={user.isAdmin || locked}
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
            />
          )}
          {tab === 'admin' && user.isAdmin && (
            <AdminScreen
              players={players}
              predictions={predictions}
              results={results}
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
      </div>

      {saveStatus && (
        <div className={`save-status ${saveStatus}`}>
          {saveStatus === 'saving' && <><span className="spinner" style={{ width: 12, height: 12 }} /> Guardando...</>}
          {saveStatus === 'saved' && <><Icon name="check" size={14} /> Guardado</>}
        </div>
      )}
    </>
  );
}
