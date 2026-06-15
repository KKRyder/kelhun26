import { useState, useEffect, useCallback } from 'react'
import { MATCHES, ROUNDS, COLORS } from './matches.js'
import { loadState, saveState, calcPts, calcTotalPts, getLeaderboard } from './storage.js'

// ── Helpers ──────────────────────────────────────────────────────────────────
const pColor = i => COLORS[i % COLORS.length]
const pInitials = n => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

function Avatar({ name, players, avatars, size = 34, fontSize = 12, style = {} }) {
  const i = players.indexOf(name)
  const av = avatars[name]
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, fontSize, background: pColor(i), flexShrink: 0, cursor: 'default', ...style }}
    >
      {av ? <img src={av} alt={name} /> : pInitials(name)}
    </div>
  )
}

const TABS = ['Status', 'Players', 'Predict', 'Results', 'Leaderboard', 'History', 'Share', 'Settings']

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [state, setState] = useState(() => loadState())
  const [tab, setTab] = useState('Status')
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [resultsRound, setResultsRound] = useState('Group stage')
  const [historyRound, setHistoryRound] = useState('Group stage')

  const update = useCallback(fn => {
    setState(prev => {
      const next = fn(prev)
      saveState(next)
      return next
    })
  }, [])

  // Poll for changes every 15s (simulates live sync between devices on same browser)
  useEffect(() => {
    const interval = setInterval(() => {
      const fresh = loadState()
      setState(prev => {
        // Only update if results changed (new scores entered)
        if (JSON.stringify(fresh.results) !== JSON.stringify(prev.results)) return fresh
        if (JSON.stringify(fresh.predictions) !== JSON.stringify(prev.predictions)) return fresh
        if (JSON.stringify(fresh.players) !== JSON.stringify(prev.players)) return fresh
        return prev
      })
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  const { players, avatars, groupName, predictions, results, adminPin } = state
  const scored = Object.keys(results)

  return (
    <div className="app">
      <Header groupName={groupName} onSettingsClick={() => setTab('Settings')} />
      <SyncBar scored={scored.length} />
      <div className="tabs">
        {TABS.map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: tab === 'Status' ? 'block' : 'none' }}>
        <StatusTab state={state} onSelectMatch={mid => { setSelectedMatch(mid); setTab('Predict') }} />
      </div>
      <div style={{ display: tab === 'Players' ? 'block' : 'none' }}>
        <PlayersTab state={state} update={update} />
      </div>
      <div style={{ display: tab === 'Predict' ? 'block' : 'none' }}>
        <PredictTab state={state} update={update} selectedMatch={selectedMatch} setSelectedMatch={setSelectedMatch} />
      </div>
      <div style={{ display: tab === 'Results' ? 'block' : 'none' }}>
        <ResultsTab state={state} update={update} round={resultsRound} setRound={setResultsRound} />
      </div>
      <div style={{ display: tab === 'Leaderboard' ? 'block' : 'none' }}>
        <LeaderboardTab state={state} onShare={() => setTab('Share')} />
      </div>
      <div style={{ display: tab === 'History' ? 'block' : 'none' }}>
        <HistoryTab state={state} round={historyRound} setRound={setHistoryRound} />
      </div>
      <div style={{ display: tab === 'Share' ? 'block' : 'none' }}>
        <ShareTab state={state} />
      </div>
      <div style={{ display: tab === 'Settings' ? 'block' : 'none' }}>
        <SettingsTab state={state} update={update} />
      </div>
    </div>
  )
}

// ── Header ────────────────────────────────────────────────────────────────────
function Header({ groupName, onSettingsClick }) {
  return (
    <div className="header">
      <div className="header-logo">KelHun 26</div>
      <div className="header-sub">FIFA World Cup 2026 · Prediction League</div>
      <div className="header-group" onClick={onSettingsClick}>
        ✏️ {groupName || 'Your group'}
      </div>
      <div className="legend">
        <div className="legend-item"><div className="legend-dot" style={{ background: '#C9A84C' }} />3pts exact score</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#378ADD' }} />1pt correct result</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#9FE1CB' }} />+1pt scorer bonus</div>
      </div>
    </div>
  )
}

function SyncBar({ scored }) {
  return (
    <div className="sync-bar">
      <span className="online-dot" />
      <span>Live · {scored} result{scored !== 1 ? 's' : ''} entered · data saves to this device</span>
    </div>
  )
}

// ── Status Tab ────────────────────────────────────────────────────────────────
function StatusTab({ state, onSelectMatch }) {
  const { players, avatars, predictions, results, groupName } = state
  const scored = Object.keys(results)
  const upcoming = MATCHES.filter(m => !results[m.id]).slice(0, 8)
  const recentDone = MATCHES.filter(m => results[m.id]).slice(-4).reverse()
  const lb = getLeaderboard(players, predictions, results)
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="section">
      {/* Mini leaderboard */}
      {scored.length > 0 && (
        <div className="card">
          <div className="card-title">🏆 {groupName || 'KelHun 26'} — standings</div>
          {lb.map((t, rank) => (
            <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderTop: rank === 0 ? 'none' : '0.5px solid #e2e8f0' }}>
              <span style={{ fontSize: 14, width: 22, textAlign: 'center' }}>{rank < 3 ? medals[rank] : rank + 1}</span>
              <Avatar name={t.name} players={players} avatars={avatars} size={28} fontSize={10} />
              <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{t.name}</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{t.pts}<span style={{ fontSize: 10, color: '#64748b', fontWeight: 400 }}> pts</span></div>
            </div>
          ))}
          {!lb.length && <div style={{ fontSize: 13, color: '#64748b' }}>No results yet.</div>}
        </div>
      )}

      {/* Tips tracker */}
      <div className="card">
        <div className="card-title">✅ Tips tracker — who's tipped?</div>
        {!players.length && (
          <div className="empty"><div className="empty-icon">👥</div>Add players on the Players tab first.</div>
        )}
        {players.length > 0 && upcoming.length === 0 && (
          <div style={{ fontSize: 13, color: '#64748b' }}>All upcoming matches have results entered.</div>
        )}
        {upcoming.map(m => {
          const preds = predictions[m.id] || {}
          const tipped = players.filter(p => preds[p]?.h !== undefined)
          const pending = players.filter(p => preds[p]?.h === undefined)
          const pct = players.length ? Math.round(tipped.length / players.length * 100) : 0
          const allDone = tipped.length === players.length && players.length > 0
          return (
            <div key={m.id} style={{ background: '#f8fafc', borderRadius: 9, padding: '10px 11px', marginBottom: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7, gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0 }}>
                  {m.hf} {m.h} vs {m.a} {m.af}
                </div>
                {allDone && <span style={{ fontSize: 10, background: '#dcfce7', color: '#166534', borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>All tipped!</span>}
                <span style={{ fontSize: 10, color: '#64748b', flexShrink: 0 }}>{m.aest}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {tipped.map(p => (
                  <div key={p} className="pill pill-done">
                    <Avatar name={p} players={players} avatars={avatars} size={18} fontSize={8} />
                    <span>{p}</span>
                    <span style={{ fontSize: 9 }}>✓</span>
                  </div>
                ))}
                {pending.map(p => (
                  <div key={p} className="pill pill-pending">
                    <Avatar name={p} players={players} avatars={avatars} size={18} fontSize={8} />
                    <span>{p}</span>
                    <span style={{ fontSize: 9 }}>…</span>
                  </div>
                ))}
              </div>
              {players.length > 0 && (
                <>
                  <div className="progress"><div className="progress-bar" style={{ width: `${pct}%` }} /></div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>{tipped.length} of {players.length} tipped</div>
                </>
              )}
              <button className="btn btn-navy btn-sm" style={{ marginTop: 8 }} onClick={() => onSelectMatch(m.id)}>
                Add tip →
              </button>
            </div>
          )
        })}
      </div>

      {/* Recent results */}
      {recentDone.length > 0 && (
        <div className="card">
          <div className="card-title">🕐 Recent results</div>
          {recentDone.map(m => {
            const r = results[m.id]
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderTop: '0.5px solid #e2e8f0' }}>
                <span style={{ fontSize: 15 }}>{m.hf} {m.af}</span>
                <div style={{ flex: 1, fontSize: 12 }}>{m.h} vs {m.a}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#185FA5' }}>{r.h}–{r.a}</div>
                <span style={{ fontSize: 10, background: '#dbeafe', color: '#1e40af', borderRadius: 4, padding: '1px 5px' }}>done</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Players Tab ───────────────────────────────────────────────────────────────
function PlayersTab({ state, update }) {
  const { players, avatars, predictions, results } = state
  const [newName, setNewName] = useState('')

  const addPlayer = () => {
    const name = newName.trim()
    if (!name || players.includes(name)) return
    update(s => ({ ...s, players: [...s.players, name] }))
    setNewName('')
  }

  const removePlayer = name => {
    if (!window.confirm(`Remove ${name}?`)) return
    update(s => {
      const next = { ...s, players: s.players.filter(p => p !== name), avatars: { ...s.avatars } }
      delete next.avatars[name]
      return next
    })
  }

  const loadAvatar = (e, name) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => update(s => ({ ...s, avatars: { ...s.avatars, [name]: ev.target.result } }))
    reader.readAsDataURL(file)
  }

  return (
    <div className="section">
      <div className="card">
        <div className="card-title">👥 Players</div>
        <div className="notice">Tap a player's avatar to upload their photo. Everyone plays from their own device using the same shared link.</div>
        <div style={{ display: 'flex', gap: 7, marginBottom: 10 }}>
          <input
            className="text-input"
            type="text"
            placeholder="Add a name..."
            maxLength={20}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPlayer()}
            style={{ flex: 1 }}
          />
          <button className="btn btn-navy" onClick={addPlayer}>Add</button>
        </div>
        {players.length === 0 && (
          <div className="empty"><div className="empty-icon">👥</div>No players yet.</div>
        )}
        {players.map((p, i) => {
          const tipped = Object.keys(results).filter(mid => (predictions[mid] || {})[p]?.h !== undefined).length
          const pts = calcTotalPts(p, predictions, results)
          return (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', borderRadius: 10, padding: '9px 11px', marginBottom: 6 }}>
              <label style={{ cursor: 'pointer' }}>
                <Avatar name={p} players={players} avatars={avatars} size={36} fontSize={13} style={{ cursor: 'pointer' }} />
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => loadAvatar(e, p)} />
              </label>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{p}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{tipped} tips · {pts} pts · tap avatar to upload photo</div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => removePlayer(p)}>✕</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Predict Tab ───────────────────────────────────────────────────────────────
function PredictTab({ state, update, selectedMatch, setSelectedMatch }) {
  const { players, avatars, predictions, results } = state

  const savePred = (matchId, player, field, val) => {
    update(s => {
      const preds = { ...s.predictions }
      if (!preds[matchId]) preds[matchId] = {}
      if (!preds[matchId][player]) preds[matchId][player] = {}
      if (field === 'scorer') preds[matchId][player].scorer = val
      else preds[matchId][player][field] = parseInt(val) || 0
      return { ...s, predictions: preds }
    })
  }

  if (!players.length) return (
    <div className="section">
      <div className="card"><div className="empty"><div className="empty-icon">👥</div>Add players first on the Players tab.</div></div>
    </div>
  )

  if (!selectedMatch) return (
    <div className="section">
      <div className="card">
        <div className="card-title">🎯 Pick a match to predict</div>
        <MatchList matches={MATCHES.slice(0, 24)} predictions={predictions} results={results} players={players} onSelect={setSelectedMatch} selected={selectedMatch} />
      </div>
    </div>
  )

  const m = MATCHES.find(x => x.id === selectedMatch)
  const preds = predictions[m.id] || {}
  const hasResult = results[m.id] !== undefined

  return (
    <div className="section">
      <div className="match-banner">
        <div className="match-banner-teams">{m.hf} {m.h} <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>vs</span> {m.a} {m.af}</div>
        <div className="match-banner-meta">Group {m.grp} · {m.aest} AEST</div>
      </div>
      {hasResult && <div className="notice">Result entered — predictions are locked.</div>}
      <div className="card">
        <div className="card-title">🎯 Score predictions + bonus scorer</div>
        {players.map((p, i) => {
          const pr = preds[p] || {}
          const hasPred = pr.h !== undefined && pr.a !== undefined
          return (
            <div key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#f8fafc', borderRadius: 9, padding: '8px 10px', marginBottom: 5 }}>
              <Avatar name={p} players={players} avatars={avatars} size={30} fontSize={11} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p}</div>
                {hasPred && (
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                    {pr.h}–{pr.a}{pr.scorer ? ` · ⚽ ${pr.scorer}` : ''}
                  </div>
                )}
                {!hasResult && (
                  <input
                    className="text-input"
                    type="text"
                    placeholder="Bonus: name a goal scorer (optional)"
                    defaultValue={pr.scorer || ''}
                    onBlur={e => savePred(m.id, p, 'scorer', e.target.value.trim())}
                    maxLength={30}
                    style={{ marginTop: 5, fontSize: 11, padding: '5px 8px' }}
                  />
                )}
                {hasResult && pr.scorer && (
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Scorer tip: {pr.scorer}</div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input className="score-input" type="number" min="0" max="20"
                    defaultValue={pr.h !== undefined ? pr.h : ''}
                    placeholder="0"
                    disabled={hasResult}
                    onBlur={e => savePred(m.id, p, 'h', e.target.value)}
                  />
                  <span style={{ fontSize: 12, color: '#64748b' }}>–</span>
                  <input className="score-input" type="number" min="0" max="20"
                    defaultValue={pr.a !== undefined ? pr.a : ''}
                    placeholder="0"
                    disabled={hasResult}
                    onBlur={e => savePred(m.id, p, 'a', e.target.value)}
                  />
                </div>
                {hasPred && <span style={{ fontSize: 9, background: '#dcfce7', color: '#166534', borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>saved</span>}
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        <button className="btn btn-outline btn-sm" onClick={() => setSelectedMatch(null)}>← Matches</button>
        <button className="btn btn-gold btn-sm" onClick={() => setSelectedMatch(null)}>Done ✓</button>
      </div>
    </div>
  )
}

// ── Match List ────────────────────────────────────────────────────────────────
function MatchList({ matches, predictions, results, players, onSelect, selected }) {
  const groups = [...new Set(matches.map(m => m.rd + ':' + m.grp))]
  return (
    <>
      {groups.map(g => {
        const [rd, grp] = g.split(':')
        const mms = matches.filter(m => m.rd === rd && m.grp === grp)
        return (
          <div key={g}>
            <div className="group-label">Group {grp} — {rd}</div>
            {mms.map(m => {
              const hasResult = results[m.id]
              const predCount = players.filter(p => (predictions[m.id] || {})[p]?.h !== undefined).length
              return (
                <div key={m.id} className={`match-row ${selected === m.id ? 'selected' : ''}`} onClick={() => onSelect(m.id)}>
                  <span style={{ fontSize: 17, flexShrink: 0 }}>{m.hf} {m.af}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.h} vs {m.a}</div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{m.aest}</div>
                  </div>
                  {hasResult
                    ? <span className="pts-badge pts-3" style={{ flexShrink: 0 }}>result in</span>
                    : predCount > 0
                      ? <span className="pts-badge pts-1" style={{ flexShrink: 0 }}>{predCount}/{players.length}</span>
                      : null}
                </div>
              )
            })}
          </div>
        )
      })}
    </>
  )
}

// ── Results Tab ───────────────────────────────────────────────────────────────
function ResultsTab({ state, update, round, setRound }) {
  const { results } = state
  const matches = MATCHES.filter(m => m.rd === round)

  const saveResult = (matchId, h, a, scorer) => {
    if (isNaN(h) || isNaN(a)) return
    update(s => ({ ...s, results: { ...s.results, [matchId]: { h, a, scorer } } }))
  }

  const groups = [...new Set(matches.map(m => m.grp))]

  return (
    <div className="section">
      <RoundFilter rounds={ROUNDS} current={round} onSelect={setRound} />
      <div className="card">
        <div className="card-title">⚽ Enter final scores</div>
        <div className="notice">Enter the real score after each match. This triggers point calculations for everyone automatically.</div>
        {groups.map(grp => (
          <div key={grp}>
            <div className="group-label">Group {grp}</div>
            {matches.filter(m => m.grp === grp).map(m => (
              <ResultRow key={m.id} m={m} existing={results[m.id]} onSave={saveResult} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function ResultRow({ m, existing, onSave }) {
  const [h, setH] = useState(existing?.h ?? '')
  const [a, setA] = useState(existing?.a ?? '')
  const [scorer, setScorer] = useState(existing?.scorer ?? '')

  return (
    <div style={{ background: '#f8fafc', borderRadius: 9, padding: '10px 11px', marginBottom: 6 }}>
      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.aest} AEST</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, fontWeight: 500, flex: 1, minWidth: 0 }}>{m.hf} {m.h} vs {m.a} {m.af}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <input className="score-input" style={{ width: 42, fontSize: 16 }} type="number" min="0" max="20"
            value={h} onChange={e => setH(e.target.value)} placeholder="0" />
          <span style={{ fontSize: 15, color: '#64748b' }}>–</span>
          <input className="score-input" style={{ width: 42, fontSize: 16 }} type="number" min="0" max="20"
            value={a} onChange={e => setA(e.target.value)} placeholder="0" />
        </div>
        <input className="text-input" type="text" placeholder="Scorer (bonus pt)..."
          value={scorer} onChange={e => setScorer(e.target.value)}
          style={{ flex: 1, minWidth: 110, fontSize: 11, padding: '5px 8px' }}
        />
        <button className="btn btn-gold btn-sm" onClick={() => onSave(m.id, parseInt(h), parseInt(a), scorer.trim())}>
          Save
        </button>
      </div>
      {existing !== undefined && (
        <div style={{ fontSize: 10, color: '#166534', marginTop: 4 }}>
          Saved: {existing.h}–{existing.a}{existing.scorer ? ` · ${existing.scorer}` : ''}
        </div>
      )}
    </div>
  )
}

// ── Leaderboard Tab ───────────────────────────────────────────────────────────
function LeaderboardTab({ state, onShare }) {
  const { players, avatars, predictions, results, groupName } = state
  const scored = Object.keys(results)
  const lb = getLeaderboard(players, predictions, results)
  const medals = ['🥇', '🥈', '🥉']
  const rowClass = ['gold', 'silver', 'bronze']

  if (!players.length) return (
    <div className="section"><div className="card"><div className="empty"><div className="empty-icon">🏆</div>Add players to see the leaderboard.</div></div></div>
  )
  if (!scored.length) return (
    <div className="section"><div className="card"><div className="empty"><div className="empty-icon">⏳</div>Enter match results to see points.</div></div></div>
  )

  return (
    <div className="section">
      <div className="card">
        <div className="card-title">🏆 {groupName || 'KelHun 26'}</div>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>{scored.length} match{scored.length !== 1 ? 'es' : ''} played</div>
        {lb.map((t, rank) => (
          <div key={t.name} className={`lb-row ${rank < 3 ? rowClass[rank] : ''}`}>
            <div style={{ fontSize: 14, width: 24, textAlign: 'center' }}>{rank < 3 ? medals[rank] : rank + 1}</div>
            <Avatar name={t.name} players={players} avatars={avatars} size={32} fontSize={11} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>
                {t.exact} exact · {t.correct} result · {t.bonus} scorer · {t.tipped}/{t.total} tipped
              </div>
            </div>
            <div style={{ fontSize: 11, marginRight: 4 }}>
              {t.tipped === t.total ? '✅' : t.tipped === 0 ? '😴' : '⏳'}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{t.pts}</div>
              <div style={{ fontSize: 9, color: '#64748b' }}>pts</div>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 10 }}>
          <button className="btn btn-navy btn-sm" onClick={onShare}>Share results →</button>
        </div>
      </div>
    </div>
  )
}

// ── History Tab ───────────────────────────────────────────────────────────────
function HistoryTab({ state, round, setRound }) {
  const { players, avatars, predictions, results } = state
  const scored = MATCHES.filter(m => results[m.id] && m.rd === round)

  return (
    <div className="section">
      <RoundFilter rounds={ROUNDS} current={round} onSelect={setRound} />
      {scored.length === 0 && (
        <div className="card"><div className="empty"><div className="empty-icon">📋</div>No {round} results yet.</div></div>
      )}
      {scored.map(m => {
        const r = results[m.id]
        return (
          <div key={m.id} style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 10, padding: '11px 13px', marginBottom: 7 }}>
            <div style={{ fontSize: 10, color: '#64748b', textAlign: 'center', marginBottom: 3 }}>Group {m.grp} · {m.aest}</div>
            <div style={{ fontSize: 15, fontWeight: 600, textAlign: 'center', marginBottom: 2 }}>
              {m.hf} {m.h} <span style={{ color: '#185FA5' }}>{r.h}–{r.a}</span> {m.a} {m.af}
            </div>
            {r.scorer && <div style={{ fontSize: 10, color: '#64748b', textAlign: 'center', marginBottom: 7 }}>⚽ Scorer: {r.scorer}</div>}
            {players.map((p, i) => {
              const pred = (predictions[m.id] || {})[p] || {}
              const pts = calcPts(pred, r)
              const predText = pred.h !== undefined ? `${pred.h}–${pred.a}` : '—'
              return (
                <div key={p} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', borderTop: '0.5px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Avatar name={p} players={players} avatars={avatars} size={22} fontSize={9} />
                    <span style={{ fontSize: 12 }}>{p}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 11, color: '#64748b' }}>{predText}{pred.scorer ? ` · ${pred.scorer}` : ''}</span>
                    <span className={`pts-badge pts-${Math.min(pts.total, 5)}`}>{pts.total > 0 ? '+' : ''}{pts.total}pt{pts.total !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ── Share Tab ─────────────────────────────────────────────────────────────────
function ShareTab({ state }) {
  const { players, avatars, predictions, results, groupName } = state
  const [copied, setCopied] = useState(false)
  const lb = getLeaderboard(players, predictions, results)
  const scored = Object.keys(results)
  const medals = ['🥇', '🥈', '🥉']

  const copyText = () => {
    const lines = [`${groupName || 'KelHun 26'} — Leaderboard`, `${scored.length} matches played`, '']
    lb.forEach((t, i) => lines.push(`${i < 3 ? medals[i] : (i + 1) + '.'} ${t.name} — ${t.pts} pts`))
    lines.push('', '⚽ KelHun 26 · FIFA World Cup 2026')
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }).catch(() => alert(lines.join('\n')))
  }

  const screenshotTip = () => {
    alert('📸 To screenshot:\n\n📱 iPhone: Side button + Volume Up\n📱 Android: Power + Volume Down\n💻 Mac: Cmd + Shift + 4\n💻 Windows: Win + Shift + S\n\nThe preview below is ready to capture!')
  }

  return (
    <div className="section">
      <div className="card">
        <div className="card-title">📤 Share results</div>
        <div className="notice">Copy the leaderboard as text to paste into WhatsApp, iMessage or any group chat. Or screenshot the preview below.</div>
        <div className="export-card">
          <div className="export-title">{groupName || 'KelHun 26'} · {scored.length} match{scored.length !== 1 ? 'es' : ''} played</div>
          {lb.map((t, rank) => (
            <div key={t.name} className="export-row">
              <div className="export-rank">{rank < 3 ? medals[rank] : rank + 1}</div>
              <Avatar name={t.name} players={players} avatars={avatars} size={24} fontSize={9} />
              <div className="export-name">{t.name}</div>
              <div className="export-pts">{t.pts} pts</div>
            </div>
          ))}
          {!lb.length && <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontSize: 12, padding: 10 }}>No players yet</div>}
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          <button className="btn btn-navy" onClick={copyText}>📋 Copy text</button>
          <button className="btn btn-gold" onClick={screenshotTip}>📸 Screenshot tip</button>
        </div>
        {copied && <div style={{ fontSize: 11, color: '#166534', marginTop: 7 }}>Copied to clipboard!</div>}
      </div>
    </div>
  )
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab({ state, update }) {
  return (
    <div className="section">
      <div className="card">
        <div className="card-title">⚙️ Group settings</div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#64748b', marginBottom: 5 }}>Group name</div>
        <input
          className="text-input"
          type="text"
          maxLength={30}
          defaultValue={state.groupName}
          onBlur={e => update(s => ({ ...s, groupName: e.target.value }))}
          style={{ marginBottom: 7, fontSize: 14, fontWeight: 600 }}
        />
        <div style={{ fontSize: 12, color: '#64748b' }}>Shown on the leaderboard and share screen.</div>
      </div>
      <div className="card">
        <div className="card-title">⭐ Points system</div>
        <div style={{ display: 'grid', gap: 7 }}>
          {[
            ['🥇 Exact score', '3 points', '#fef9c3', '#713f12'],
            ['✅ Correct result', '1 point', '#dbeafe', '#1e40af'],
            ['⚽ Scorer bonus', '+1 point', '#dcfce7', '#166534'],
          ].map(([label, pts, bg, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderRadius: 8, padding: '9px 12px' }}>
              <span style={{ fontSize: 13 }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, background: bg, color, borderRadius: 4, padding: '2px 8px' }}>{pts}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-title">🔴 Danger zone</div>
        <button
          className="btn btn-danger"
          onClick={() => {
            if (window.confirm('Reset ALL data? This cannot be undone.')) {
              update(() => ({ players: [], avatars: {}, groupName: 'KelHun 26', predictions: {}, results: {}, adminPin: '' }))
            }
          }}
        >
          Reset all data
        </button>
      </div>
    </div>
  )
}

// ── Round Filter ──────────────────────────────────────────────────────────────
function RoundFilter({ rounds, current, onSelect }) {
  return (
    <div className="filter-row">
      {rounds.map(r => (
        <button key={r} className={`filter-chip ${current === r ? 'active' : ''}`} onClick={() => onSelect(r)}>
          {r}
        </button>
      ))}
    </div>
  )
}
