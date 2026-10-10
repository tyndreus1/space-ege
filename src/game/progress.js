/**
 * Rozet ve ayarlar — localStorage.
 * Anahtar sürümü (v1) değişince eski kayıtlar yok sayılır; sınıf bilgisayarında
 * sıfırlamak için hangardaki “İlerlemeyi sil” yeter.
 */

const KEY = 'kesif-yorungesi-v1'

const empty = () => ({
  rocketId: 'falcon9',
  badges: [],
  visited: [],
  visitedMoons: [],
  ringPass: false,
  fuelMode: false,
  autoFlight: false,
})

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    const data = { ...empty(), ...JSON.parse(raw) }
    data.badges = Array.isArray(data.badges) ? data.badges : []
    data.visited = Array.isArray(data.visited) ? data.visited : []
    data.visitedMoons = Array.isArray(data.visitedMoons) ? data.visitedMoons : []
    return data
  } catch {
    return empty()
  }
}

export function saveProgress(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* gizli / dolu depolama */
  }
}

export function resetProgress() {
  const fresh = empty()
  saveProgress(fresh)
  return fresh
}

export function markVisited(progress, bodyId) {
  if (!progress.visited.includes(bodyId)) progress.visited.push(bodyId)
}

export function markMoon(progress, moonId) {
  if (!progress.visitedMoons.includes(moonId)) progress.visitedMoons.push(moonId)
}

const INNER = ['mercury', 'venus', 'mars']

export function evaluateMissions(progress) {
  const earned = new Set(progress.badges)
  const visit = new Set(progress.visited)
  const moons = new Set(progress.visitedMoons)
  const galilean = ['io', 'europa', 'ganymede', 'callisto']
  if (visit.has('mars')) earned.add('mars')
  if (moons.has('moon')) earned.add('moon')
  if (galilean.filter((id) => moons.has(id)).length >= 2) earned.add('jupiter-moons')
  if (progress.ringPass) earned.add('saturn-rings')
  if (visit.has('pluto')) earned.add('pluto')
  if (visit.has('proxima')) earned.add('proxima')
  if (INNER.every((id) => visit.has(id))) earned.add('inner-tour')
  const next = [...earned]
  const fresh = next.filter((id) => !progress.badges.includes(id))
  progress.badges = next
  return fresh
}
