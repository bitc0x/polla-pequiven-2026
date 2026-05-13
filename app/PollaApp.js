'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ref, set, onValue, remove } from 'firebase/database';
import { db, DB_ROOT } from '@/lib/firebase';
import {
  TEAMS, GROUPS, GROUP_MATCHES, GROUP_DATES,
  KNOCKOUT_SLOTS, SPECIAL_AWARDS, SCORING, TOURNAMENT_START,
} from '@/lib/worldcup-data';
import { scorePlayer } from '@/lib/scoring';

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

// ============ COUNTDOWN ============
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
    if (!trimmedName) {
      setError('Necesitas un nombre para jugar');
      return;
    }
    if (trimmedName.length < 2) {
      setError('El nombre es muy corto');
      return;
    }
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
          <div className="brand-dot">P</div>
          <div className="brand-text">PEQUIVEN</div>
        </div>

        <h1 className="login-title">
          POLLA<br />
          MUNDIAL<br />
          <span className="accent">2026</span>
        </h1>

        <p className="login-subtitle">
          Canadá · México · USA. 48 selecciones. 104 partidos. Una sola polla.
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

          <button type="submit" className="btn-primary">
            Entrar
          </button>
        </form>

        <div className="login-foot">
          <span>Pequiven · Petroquímica</span>
          <span className="mono">v1.0</span>
        </div>
      </div>
    </div>
  );
}

// ============ COUNTDOWN BOX ============
function CountdownBox({ locked }) {
  const c = useCountdown(TOURNAMENT_START);
  if (c.locked || locked) {
    return (
      <div className="countdown locked">
        <div className="countdown-unit">
          <div className="num">CERRADO</div>
          <div className="lbl">El torneo empezó</div>
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

// ============ GROUP STAGE SCREEN ============
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
          ? 'Las predicciones están cerradas. Solo lectura.'
          : 'Pon el marcador exacto que crees que va a quedar en cada partido. Acierto exacto = 5 pts. Solo ganador = 2 pts. Diferencia de goles correcta = +1 pt bonus.'}
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
                            min="0"
                            max="20"
                          />
                          <span className="score-sep">·</span>
                          <input
                            type="number"
                            className="score-input"
                            value={pred.away ?? ''}
                            onChange={(e) => update(match.id, 'away', e.target.value)}
                            disabled={locked}
                            min="0"
                            max="20"
                          />
                        </div>
                        <div className="team-side away">
                          <span className="team-name">{TEAMS[match.away].name}</span>
                          <span className="team-flag">{TEAMS[match.away].flag}</span>
                        </div>
                        {showResults && real && (
                          <div style={{ gridColumn: '1 / -1' }}>
                            <div className="match-result-tag">
                              Resultado real: {real.home} - {real.away}
                            </div>
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

// ============ KNOCKOUT SCREEN ============
function KnockoutScreen({ predictions, results, locked, onUpdateKO, showResults }) {
  const allTeams = Object.keys(TEAMS);

  const rounds = [
    { key: 'r32', label: 'Round of 32 (32 equipos avanzan)', count: 32, points: SCORING.r32Team },
    { key: 'r16', label: 'Octavos de Final (16 equipos)', count: 16, points: SCORING.r16Team },
    { key: 'qf', label: 'Cuartos de Final (8 equipos)', count: 8, points: SCORING.qfTeam },
    { key: 'sf', label: 'Semifinales (4 equipos)', count: 4, points: SCORING.sfTeam },
    { key: 'final', label: 'Final (2 equipos)', count: 2, points: SCORING.finalTeam },
  ];

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
          : 'Predice qué selecciones llegan a cada ronda. Acierto en Round of 32 = 3 pts cada uno; Octavos = 6; Cuartos = 12; Semis = 25; Final = 50.'}
      </p>

      {rounds.map((round) => {
        const realSet = new Set(results?.knockouts?.[round.key] || []);
        return (
          <div key={round.key} className="knockout-section">
            <div className="knockout-section-head">
              <span className="knockout-title">{round.label}</span>
              <span className="knockout-meta">{round.points} pts · acierto</span>
            </div>
            <div className="knockout-grid">
              {Array.from({ length: round.count }).map((_, i) => {
                const val = getSlot(round.key, i);
                let cls = 'team-picker';
                if (!val) cls += ' empty';
                if (showResults && val) {
                  cls += realSet.has(val) ? ' correct' : ' incorrect';
                }
                return (
                  <select
                    key={i}
                    className={cls}
                    value={val}
                    onChange={(e) => setSlot(round.key, i, e.target.value)}
                    disabled={locked}
                  >
                    <option value="">— Equipo #{i + 1} —</option>
                    {allTeams.map((t) => (
                      <option key={t} value={t}>{TEAMS[t].flag} {TEAMS[t].name}</option>
                    ))}
                  </select>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============ SPECIALS SCREEN ============
function SpecialsScreen({ predictions, results, locked, onUpdateSpecial, onUpdateTiebreaker, showResults }) {
  const allTeams = Object.keys(TEAMS);

  function getVal(id) {
    return predictions?.specials?.[id] || '';
  }

  function getRealVal(id) {
    return results?.specials?.[id] || '';
  }

  return (
    <div>
      <h2 className="section-title">Predicciones Especiales</h2>
      <p className="section-sub">
        {locked
          ? 'Predicciones cerradas.'
          : 'Las apuestas que valen más puntos. Aquí se ganan o se pierden las pollas.'}
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
              <div className="lbl">{award.id === 'champion' ? 'PRIMERA OPCIÓN' : 'AWARD'}</div>
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
                  style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-card)' }}
                >
                  <option value="">— Seleccionar —</option>
                  {allTeams.map((t) => (
                    <option key={t} value={t}>{TEAMS[t].flag} {TEAMS[t].name}</option>
                  ))}
                </select>
              )}
              {showResults && real && (
                <div className="match-result-tag" style={{ textAlign: 'left', marginTop: 8 }}>
                  Real: {award.freeText ? real : (TEAMS[real] ? `${TEAMS[real].flag} ${TEAMS[real].name}` : real)}
                  {v && (hit ? ' ✓' : ' ✗')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="tiebreaker-card">
        <div className="lbl" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--pequiven-red-bright)', textTransform: 'uppercase', marginBottom: 6 }}>
          DESEMPATE
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 12 }}>
          Total de goles del torneo
        </div>
        <p className="text-sm text-muted mb-4">
          Si dos jugadores empatan en puntos, gana el que más se acerque a esta cifra. Mundial 2022 cerró con 172 goles. Este es más grande (104 partidos vs 64).
        </p>
        <input
          type="number"
          value={predictions?.tiebreaker?.totalGoals ?? ''}
          onChange={(e) => onUpdateTiebreaker('totalGoals', e.target.value)}
          placeholder="Ej. 285"
          disabled={locked}
          style={{ width: 200, padding: '14px 16px', fontSize: 18, fontFamily: 'var(--font-mono)' }}
          min="0"
          max="999"
        />
        {showResults && results?.tiebreaker?.totalGoals && (
          <div className="match-result-tag" style={{ marginTop: 8, textAlign: 'left' }}>
            Real: {results.tiebreaker.totalGoals} goles
          </div>
        )}
      </div>
    </div>
  );
}

// ============ LEADERBOARD ============
function LeaderboardScreen({ players, predictions, results, currentName }) {
  const ranked = useMemo(() => {
    return Object.entries(players || {}).map(([id, p]) => {
      const playerPreds = predictions?.[id] || {};
      const score = scorePlayer(playerPreds, results);
      return {
        id,
        name: p.name,
        joinedAt: p.joinedAt,
        score,
        tiebreaker: parseInt(playerPreds?.tiebreaker?.totalGoals),
      };
    }).sort((a, b) => {
      if (b.score.total !== a.score.total) return b.score.total - a.score.total;
      // Tiebreaker: closer to real total goals
      const realTotal = parseInt(results?.tiebreaker?.totalGoals);
      if (!isNaN(realTotal)) {
        const aDist = isNaN(a.tiebreaker) ? Infinity : Math.abs(a.tiebreaker - realTotal);
        const bDist = isNaN(b.tiebreaker) ? Infinity : Math.abs(b.tiebreaker - realTotal);
        if (aDist !== bDist) return aDist - bDist;
      }
      return a.name.localeCompare(b.name);
    });
  }, [players, predictions, results]);

  if (ranked.length === 0) {
    return (
      <div>
        <h2 className="section-title">Tabla de Posiciones</h2>
        <div className="empty">
          Todavía no hay jugadores registrados. Sé el primero.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="section-title">Tabla de Posiciones</h2>
      <p className="section-sub">
        Puntos en tiempo real. Los puntos se actualizan a medida que el admin registra resultados.
      </p>

      <div className="leaderboard">
        <div className="lb-row header">
          <div>POS</div>
          <div>JUGADOR</div>
          <div style={{ textAlign: 'right' }}>PTS</div>
          <div style={{ textAlign: 'right' }}>DESGLOSE</div>
        </div>
        {ranked.map((p, idx) => {
          const isYou = p.name === currentName;
          return (
            <div key={p.id} className="lb-row">
              <div className="lb-rank">{idx + 1}</div>
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
    </div>
  );
}

// ============ MY PICKS (read-only summary) ============
function MyPicksScreen({ playerId, predictions, players, results, locked, currentName }) {
  const myPreds = predictions?.[playerId] || {};
  const score = scorePlayer(myPreds, results);
  const filled = Object.values(myPreds?.groupMatches || {}).filter(m => m && m.home != null && m.away != null).length;
  const totalKO = ['r32','r16','qf','sf','final'].reduce((acc, k) => acc + (myPreds?.knockouts?.[k]?.filter(Boolean).length || 0), 0);
  const totalSp = SPECIAL_AWARDS.filter(a => myPreds?.specials?.[a.id]).length;

  return (
    <div>
      <h2 className="section-title">Mis Picks</h2>
      <p className="section-sub">
        Hola {currentName}. Aquí está tu resumen.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div className="special-card">
          <div className="lbl">Tu puntaje total</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--pequiven-red-bright)' }}>
            {score.total}
          </div>
        </div>
        <div className="special-card">
          <div className="lbl">Fase de grupos</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>{filled}/72</div>
          <div className="text-xs text-muted mt-2">Partidos predichos · {score.group} pts</div>
        </div>
        <div className="special-card">
          <div className="lbl">Llaves</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>{totalKO}</div>
          <div className="text-xs text-muted mt-2">Slots llenados · {score.knockout} pts</div>
        </div>
        <div className="special-card">
          <div className="lbl">Especiales</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>{totalSp}/{SPECIAL_AWARDS.length}</div>
          <div className="text-xs text-muted mt-2">Predicciones · {score.specials} pts</div>
        </div>
      </div>

      {!locked && (
        <div className="error-msg" style={{ background: 'rgba(255, 209, 0, 0.1)', color: 'var(--gold)', borderColor: 'var(--gold)' }}>
          Aún puedes editar tus predicciones hasta el kickoff (11 jun 2026). Ve a las pestañas de Grupos, Llaves o Especiales.
        </div>
      )}
    </div>
  );
}

// ============ ADMIN SCREEN ============
function AdminScreen({ players, predictions, results, locked, onLockToggle, onSetResult, onSetKOResult, onSetSpecialResult, onSetTiebreaker, onResetAll }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const allTeams = Object.keys(TEAMS);

  function updateMatch(matchId, field, value) {
    const clean = value === '' ? null : Math.max(0, Math.min(20, parseInt(value) || 0));
    const current = results?.groupMatches?.[matchId] || {};
    onSetResult(matchId, { ...current, [field]: clean });
  }

  function setKOTeams(roundKey, teams) {
    onSetKOResult(roundKey, teams);
  }

  function toggleTeamInRound(roundKey, team, count) {
    const current = [...(results?.knockouts?.[roundKey] || [])];
    const idx = current.indexOf(team);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      if (current.length < count) current.push(team);
    }
    setKOTeams(roundKey, current.filter(Boolean));
  }

  const playerCount = Object.keys(players || {}).length;
  const koRounds = [
    { key: 'r32', label: 'Round of 32', count: 32 },
    { key: 'r16', label: 'Octavos', count: 16 },
    { key: 'qf', label: 'Cuartos', count: 8 },
    { key: 'sf', label: 'Semis', count: 4 },
    { key: 'final', label: 'Final', count: 2 },
  ];

  return (
    <div>
      <div className="admin-banner">
        <div>
          <div className="lbl">PANEL DE ADMINISTRADOR</div>
          <div className="text-xs" style={{ opacity: 0.9, marginTop: 4 }}>
            {playerCount} jugadores · Polla {locked ? 'CERRADA' : 'ABIERTA'}
          </div>
        </div>
        <div className="admin-toolbar" style={{ margin: 0 }}>
          <button className="btn-warn" onClick={onLockToggle}>
            {locked ? 'Reabrir polla' : 'Cerrar polla ahora'}
          </button>
        </div>
      </div>

      <h2 className="section-title" style={{ fontSize: 22 }}>Resultados reales — Fase de grupos</h2>
      <p className="section-sub">
        Mete aquí el marcador real de cada partido. Los puntajes se calculan en vivo.
      </p>

      <div className="groups-grid">
        {Object.keys(GROUPS).map((groupId) => (
          <div key={groupId} className="group-card">
            <div className="group-header">
              <span className="group-letter">{groupId}</span>
              <span className="group-tag">Resultados reales</span>
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
                        type="number"
                        className="score-input"
                        value={real.home ?? ''}
                        onChange={(e) => updateMatch(match.id, 'home', e.target.value)}
                        min="0" max="20"
                      />
                      <span className="score-sep">·</span>
                      <input
                        type="number"
                        className="score-input"
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

      <h2 className="section-title mt-6" style={{ fontSize: 22, marginTop: 48 }}>Resultados reales — Llaves</h2>
      <p className="section-sub">
        Marca qué selecciones realmente llegaron a cada ronda. Click para añadir/quitar.
      </p>

      {koRounds.map((round) => {
        const selected = new Set(results?.knockouts?.[round.key] || []);
        return (
          <div key={round.key} className="knockout-section">
            <div className="knockout-section-head">
              <span className="knockout-title">{round.label}</span>
              <span className="knockout-meta">{selected.size} / {round.count}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
              {allTeams.map((t) => {
                const isSel = selected.has(t);
                const disabled = !isSel && selected.size >= round.count;
                return (
                  <button
                    key={t}
                    className="team-picker"
                    onClick={() => toggleTeamInRound(round.key, t, round.count)}
                    disabled={disabled}
                    style={{
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.3 : 1,
                      borderColor: isSel ? 'var(--green)' : 'var(--border)',
                      background: isSel ? 'rgba(52, 199, 89, 0.15)' : 'var(--bg-card)',
                      textAlign: 'left',
                      padding: '8px 10px',
                    }}
                  >
                    {TEAMS[t].flag} {TEAMS[t].name}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <h2 className="section-title" style={{ fontSize: 22, marginTop: 48 }}>Resultados reales — Especiales</h2>
      <div className="specials-grid">
        {SPECIAL_AWARDS.map((award) => (
          <div key={award.id} className="special-card">
            <div className="pts-badge">{award.points} pts</div>
            <div className="lbl">Real</div>
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
                style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-card)' }}
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
        <div className="lbl" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--pequiven-red-bright)', textTransform: 'uppercase', marginBottom: 6 }}>
          DESEMPATE — VALOR REAL
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 12 }}>
          Total real de goles del torneo
        </div>
        <input
          type="number"
          value={results?.tiebreaker?.totalGoals ?? ''}
          onChange={(e) => onSetTiebreaker('totalGoals', e.target.value)}
          placeholder="Ej. 172"
          style={{ width: 200, padding: '14px 16px', fontSize: 18, fontFamily: 'var(--font-mono)' }}
          min="0" max="999"
        />
      </div>

      <h2 className="section-title" style={{ fontSize: 22, marginTop: 48 }}>Zona de peligro</h2>
      <p className="section-sub">Acciones destructivas. Confirmar antes de ejecutar.</p>
      {!confirmReset ? (
        <button className="btn-danger" onClick={() => setConfirmReset(true)}>
          Resetear todo (jugadores + predicciones + resultados)
        </button>
      ) : (
        <div className="flex gap-3 items-center">
          <span className="text-red text-sm font-bold">¿Estás 100% seguro? Esto borra TODO.</span>
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

  // DB state
  const [players, setPlayers] = useState({});
  const [predictions, setPredictions] = useState({});
  const [results, setResults] = useState({});
  const [config, setConfig] = useState({ locked: false });

  const [saveStatus, setSaveStatus] = useState(null); // 'saving' | 'saved' | null

  // Try restore session from localStorage
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

  // Firebase realtime listeners
  useEffect(() => {
    if (!user) return;
    const unsubs = [];
    unsubs.push(onValue(dbPath('players'), (snap) => setPlayers(snap.val() || {})));
    unsubs.push(onValue(dbPath('predictions'), (snap) => setPredictions(snap.val() || {})));
    unsubs.push(onValue(dbPath('results'), (snap) => setResults(snap.val() || {})));
    unsubs.push(onValue(dbPath('config'), (snap) => setConfig(snap.val() || { locked: false })));
    return () => unsubs.forEach(u => u && u());
  }, [user]);

  const playerId = user ? slug(user.name) : null;

  // Register player on login
  useEffect(() => {
    if (!user || !playerId) return;
    if (user.isAdmin) return; // Admin doesn't auto-register as player
    const existing = players?.[playerId];
    if (!existing) {
      dbSet(`players/${playerId}`, {
        name: user.name,
        joinedAt: Date.now(),
      });
    }
  }, [user, playerId, players]);

  // Auto-lock based on tournament start
  const now = Date.now();
  const autoLocked = now >= TOURNAMENT_START.getTime();
  const locked = config.locked || autoLocked;

  // Save helpers
  const showSave = useCallback(() => {
    setSaveStatus('saving');
    setTimeout(() => setSaveStatus('saved'), 200);
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

  // Prediction updates (only for non-admin)
  function updateGroupMatch(matchId, field, value) {
    if (!playerId || user.isAdmin || locked) return;
    const current = predictions?.[playerId]?.groupMatches?.[matchId] || {};
    showSave();
    dbSet(`predictions/${playerId}/groupMatches/${matchId}`, { ...current, [field]: value });
  }

  function updateKO(roundKey, teams) {
    if (!playerId || user.isAdmin || locked) return;
    showSave();
    dbSet(`predictions/${playerId}/knockouts/${roundKey}`, teams);
  }

  function updateSpecial(awardId, value) {
    if (!playerId || user.isAdmin || locked) return;
    showSave();
    dbSet(`predictions/${playerId}/specials/${awardId}`, value);
  }

  function updateTiebreaker(field, value) {
    if (!playerId || user.isAdmin || locked) return;
    showSave();
    const clean = value === '' ? null : Math.max(0, parseInt(value) || 0);
    dbSet(`predictions/${playerId}/tiebreaker/${field}`, clean);
  }

  // Admin updates
  function setMatchResult(matchId, val) {
    showSave();
    dbSet(`results/groupMatches/${matchId}`, val);
  }
  function setKOResult(roundKey, teams) {
    showSave();
    dbSet(`results/knockouts/${roundKey}`, teams);
  }
  function setSpecialResult(awardId, value) {
    showSave();
    dbSet(`results/specials/${awardId}`, value);
  }
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
  }

  if (!hydrated) return null;
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  const myPreds = playerId ? (predictions?.[playerId] || {}) : {};
  const showResults = locked; // Only show results when polla is closed

  return (
    <>
      <header className="app-header">
        <div className="page header-content">
          <div className="header-title">
            <div className="brand-dot" style={{ width: 28, height: 28, fontSize: 14 }}>P</div>
            <div>
              <h1>POLLA PEQUIVEN 2026</h1>
              <div className="sub">FIFA WORLD CUP · CAN MEX USA</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`user-pill ${user.isAdmin ? 'admin' : ''}`}>
              <span className="dot" />
              {user.isAdmin ? 'ADMIN' : user.name}
            </div>
            <button className="btn-ghost" onClick={handleLogout}>Salir</button>
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
            {!user.isAdmin && (
              <button className={`tab ${tab === 'mis-picks' ? 'active' : ''}`} onClick={() => setTab('mis-picks')}>
                Mis Picks
              </button>
            )}
            {user.isAdmin && (
              <button className={`tab ${tab === 'admin' ? 'active' : ''}`} onClick={() => setTab('admin')}>
                Admin
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
            />
          )}
          {tab === 'mis-picks' && !user.isAdmin && (
            <MyPicksScreen
              playerId={playerId}
              predictions={predictions}
              players={players}
              results={results}
              locked={locked}
              currentName={user.name}
            />
          )}
          {tab === 'admin' && user.isAdmin && (
            <AdminScreen
              players={players}
              predictions={predictions}
              results={results}
              locked={config.locked}
              onLockToggle={toggleLock}
              onSetResult={setMatchResult}
              onSetKOResult={setKOResult}
              onSetSpecialResult={setSpecialResult}
              onSetTiebreaker={setTiebreakerResult}
              onResetAll={resetAll}
            />
          )}
        </div>
      </div>

      {saveStatus && (
        <div className={`save-status ${saveStatus}`}>
          {saveStatus === 'saving' && <><span className="spinner" style={{ width: 12, height: 12 }} /> Guardando...</>}
          {saveStatus === 'saved' && <>✓ Guardado</>}
        </div>
      )}
    </>
  );
}
