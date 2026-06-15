// storage.js
// Uses localStorage as the persistence layer.
// Each device syncs by reading/writing to the same localStorage key.
// For true multi-device sync, swap the load/save functions to call your API endpoint.

const KEY = 'kelhun26_v1'

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultState()
    return { ...defaultState(), ...JSON.parse(raw) }
  } catch {
    return defaultState()
  }
}

export function saveState(state) {
  try {
    // Don't persist avatar blobs — too large
    const toSave = { ...state, avatars: {} }
    localStorage.setItem(KEY, JSON.stringify(toSave))
  } catch {
    console.warn('Could not save to localStorage')
  }
}

export function defaultState() {
  return {
    players: [],
    avatars: {},
    groupName: 'KelHun 26',
    predictions: {},
    results: {},
    adminPin: '',
  }
}

export function calcPts(pred, result) {
  if (!pred || pred.h === undefined || pred.a === undefined) {
    return { score: 0, scorer: false, total: 0 }
  }
  let score = 0
  if (pred.h === result.h && pred.a === result.a) {
    score = 3
  } else {
    const pw = pred.h > pred.a ? 'h' : pred.h < pred.a ? 'a' : 'd'
    const rw = result.h > result.a ? 'h' : result.h < result.a ? 'a' : 'd'
    if (pw === rw) score = 1
  }
  const scorerBonus =
    result.scorer &&
    pred.scorer &&
    pred.scorer.length > 1 &&
    result.scorer.toLowerCase().includes(
      pred.scorer.toLowerCase().split(' ').pop()
    )
  return { score, scorer: !!scorerBonus, total: score + (scorerBonus ? 1 : 0) }
}

export function calcTotalPts(player, predictions, results) {
  return Object.keys(results).reduce((sum, mid) => {
    const pred = (predictions[mid] || {})[player]
    return sum + calcPts(pred, results[mid]).total
  }, 0)
}

export function getLeaderboard(players, predictions, results) {
  const scored = Object.keys(results)
  return players
    .map((p, i) => {
      let pts = 0, exact = 0, correct = 0, bonus = 0
      const tipped = scored.filter(mid => (predictions[mid] || {})[p]?.h !== undefined).length
      scored.forEach(mid => {
        const r = calcPts((predictions[mid] || {})[p], results[mid])
        pts += r.total
        if (r.score === 3) exact++
        else if (r.score === 1) correct++
        if (r.scorer) bonus++
      })
      return { name: p, pts, exact, correct, bonus, tipped, total: scored.length, idx: i }
    })
    .sort((a, b) => b.pts - a.pts || b.exact - a.exact || b.bonus - a.bonus)
}
