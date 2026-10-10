/**
 * Keşif Yörüngesi — giriş noktası.
 *
 * Hangar → geri sayım → öğrenci pilotu (mekik ekranı) veya otomatik Bezier uçuş.
 * Gezegen fiziği solarSystem.js / kepler.js içindedir; bu dosya kamera, seçim
 * ve görev döngüsünü bağlar.
 */

import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js'
import { bodies, bodyById } from './data/bodies.js'
import { nearbyStars } from './data/stars.js'
import { rocketById } from './data/rockets.js'
import { missions, missionById } from './data/missions.js'
import { createTextureAtlas } from './scene/textures.js'
import { createStarfield } from './scene/starfield.js'
import { createSolarSystem } from './scene/solarSystem.js'
import { createInterstellar } from './scene/interstellar.js'
import { createSpaceship, makeFlightCurve, parkingOffset } from './scene/spaceship.js'
import { createRocket, createExhaust } from './scene/rocketModels.js'
import { createHangarPreview } from './scene/hangarPreview.js'
import {
  bindHud,
  showPlanetInfo,
  showStarInfo,
  setActiveChip,
  setFlightProgress,
  setScaleBanner,
  setModeButtons,
  showWelcome,
  showHelp,
  hidePanel,
  qs,
} from './ui/hud.js'
import { renderCockpit, setCockpitOpen, bindCockpit } from './ui/cockpit.js'
import {
  bindGameUi,
  renderHangar,
  setHangarOpen,
  setFlightHud,
  updateFlightHud,
  placeGuide,
  showFail,
  showSuccess,
  showBadgeToast,
  showCountdown,
  setAutoFlightUi,
  setFuelUi,
  setMissionsOpen,
  renderMissionBoard,
  setCockpitCam,
} from './ui/gameUi.js'
import {
  createPilot,
  resetPilot,
  updatePilot,
  engineWorldPos,
  engineBack,
  guidanceNdc,
  nearBody,
  collideBody,
  bumpThrottle,
  SAFE_LAND_SPEED,
} from './game/pilot.js'
import { landingKind, landingCopy, tickLanding, startLanding } from './game/landing.js'
import { loadProgress, saveProgress, resetProgress, markVisited, markMoon, evaluateMissions } from './game/progress.js'
import { TIME_DEFAULT_DAYS, daysToSlider } from './utils/format.js'

const canvas = document.getElementById('scene')
const labelHost = document.getElementById('labels')

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05

const labelRenderer = new CSS2DRenderer()
labelRenderer.setSize(window.innerWidth, window.innerHeight)
labelRenderer.domElement.style.position = 'absolute'
labelRenderer.domElement.style.inset = '0'
labelRenderer.domElement.style.pointerEvents = 'none'
labelHost.appendChild(labelRenderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050814)
scene.fog = new THREE.FogExp2(0x050814, 0.0016)

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.05, 4000)
camera.position.set(6, 38, 72)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.minDistance = 2
controls.maxDistance = 2200
controls.enablePan = true
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }
controls.target.set(0, 0, 0)

scene.add(createStarfield())
const textures = createTextureAtlas()
const solar = createSolarSystem(textures)
const interstellar = createInterstellar()
scene.add(solar.root)
scene.add(interstellar.root)
solar.update(0, 0)

const ship = createSpaceship()
scene.add(ship)

const exhaust = createExhaust()
scene.add(exhaust.points)

const hangarPreview = createHangarPreview(qs('hangar-view'))

const clock = new THREE.Clock()
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const scratch = new THREE.Vector3()
const lookAhead = new THREE.Vector3()
const earthPos = new THREE.Vector3()
const targetPos = new THREE.Vector3()
const engineP = new THREE.Vector3()
const engineB = new THREE.Vector3()
const camPos = new THREE.Vector3()
const keys = new Set()

const KEY_BODIES = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']

let progress = loadProgress()
let rocket = null
let pilot = null

const input = {
  thrust: false,
  boost: false,
  brake: false,
  yaw: 0,
  pitch: 0,
  stickYaw: 0,
  stickPitch: 0,
}

const state = {
  mode: 'solar', // 'solar' | 'stars'
  phase: 'hangar', // hangar | countdown | ignite | pilot | landing | landed | auto | fail
  scale: 'visual',
  cockpitCam: false,
  landing: null,
  paused: false,
  daysPerSecond: TIME_DEFAULT_DAYS,
  savedDaysPerSecond: TIME_DEFAULT_DAYS,
  currentBody: 'earth',
  help: false,
  welcome: true,
  flight: null,
  parkedAt: 'earth',
  rocketId: progress.rocketId || 'falcon9',
  autoFlight: !!progress.autoFlight,
  fuelMode: !!progress.fuelMode,
  targetId: null,
  targetKind: 'planet',
  lockDist: 40,
  arrived: false,
  countdown: 0,
  igniteLeft: 0,
  missionsOpen: false,
}

function craft() {
  if (rocket && (state.phase === 'pilot' || state.phase === 'countdown' || state.phase === 'ignite' || rocket.visible)) {
    return rocket
  }
  return ship
}

function placeShipNear(id) {
  const rec = solar.getRecord(id)
  if (!rec) return
  rec.mesh.getWorldPosition(scratch)
  const offset = parkingOffset(rec.mesh, camera)
  ship.position.copy(scratch).add(offset)
  ship.lookAt(scratch)
  state.parkedAt = id
}

placeShipNear('earth')

function framingForScale() {
  if (state.mode === 'stars') {
    camera.position.set(0, 28, 72)
    controls.target.set(0, 0, 0)
    controls.minDistance = 8
    controls.maxDistance = 220
    return
  }
  if (state.scale === 'visual') {
    camera.position.set(6, 38, 72)
    controls.target.set(0, 0, 0)
    controls.minDistance = 8
    controls.maxDistance = 220
  } else {
    camera.position.set(12, 40, 90)
    controls.target.set(0, 0, 0)
    controls.minDistance = 0.4
    controls.maxDistance = 2200
  }
  controls.update()
}

function refreshChrome() {
  setScaleBanner(state.scale, state.mode === 'stars')
  setModeButtons({
    interstellar: state.mode === 'stars',
    scale: state.scale,
    paused: state.paused || state.daysPerSecond <= 0,
    daysPerSecond: state.daysPerSecond,
  })
  const hint = qs('hint')
  if (!hint) return
  if (['pilot', 'countdown', 'ignite', 'landing', 'landed'].includes(state.phase)) {
    hint.textContent = 'İtki seviyesi ve frenle yavaşla. Hedefe yumuşak in; Güneş ve yanlış cisim görevi düşürür. V: kokpit kamerası.'
  } else if (state.mode === 'stars') {
    hint.textContent = 'Bir yıldıza dokunun. Çemberler ışık yılı halkalarıdır (logaritmik).'
  } else {
    hint.textContent = state.autoFlight
      ? 'Bir gezegene dokunun: keşif aracı oraya uçar, kamera onu izler.'
      : 'Hangardan fırlat; sonra hedefe dokun. Mekik bilgisayarı taramayı başlatır.'
  }
}

function simDaysPerSecond() {
  if (state.paused || state.daysPerSecond <= 0 || state.mode === 'stars') return 0
  return state.daysPerSecond
}

function applyTimeSpeed(days) {
  if (days <= 0) {
    if (!state.paused) state.savedDaysPerSecond = state.daysPerSecond || TIME_DEFAULT_DAYS
    state.paused = true
    state.daysPerSecond = 0
  } else {
    state.paused = false
    state.daysPerSecond = days
    state.savedDaysPerSecond = days
  }
  refreshChrome()
}

function togglePause() {
  if (state.paused || state.daysPerSecond <= 0) {
    const restore = state.savedDaysPerSecond || TIME_DEFAULT_DAYS
    state.paused = false
    state.daysPerSecond = restore
    const slider = qs('time-speed')
    if (slider) slider.value = String(daysToSlider(restore))
  } else {
    state.savedDaysPerSecond = state.daysPerSecond
    state.paused = true
  }
  refreshChrome()
}

function setCssVisible(root, vis) {
  root.visible = vis
  root.traverse((o) => {
    if (o.isCSS2DObject) o.visible = vis
  })
}

function persist() {
  progress.rocketId = state.rocketId
  progress.autoFlight = state.autoFlight
  progress.fuelMode = state.fuelMode
  saveProgress(progress)
}

function setUiPhase() {
  const piloting = ['countdown', 'ignite', 'pilot', 'landing', 'landed'].includes(state.phase)
  document.body.classList.toggle('pilot-ui', piloting)
  document.body.classList.toggle('explore-ui', !piloting && state.phase !== 'hangar' && state.phase !== 'fail')
  document.body.classList.toggle('hangar-ui', state.phase === 'hangar')
  document.body.classList.toggle('fail-ui', state.phase === 'fail')
  setFlightHud(piloting)
  if (!piloting) setCockpitOpen(false)
  else setCockpitOpen(true)
  setCockpitCam(piloting && state.cockpitCam)
  camera.fov = piloting && state.cockpitCam ? 64 : 52
  camera.updateProjectionMatrix()
}

function openHangar() {
  state.phase = 'hangar'
  state.flight = null
  state.targetId = null
  state.arrived = false
  state.landing = null
  state.cockpitCam = false
  controls.enabled = true
  showCountdown('')
  showFail(false)
  showSuccess(false)
  hidePanel()
  setCockpitOpen(false)
  setFlightHud(false)
  setHangarOpen(true)
  hangarPreview.show(state.rocketId)
  hangarPreview.start()
  hangarPreview.fit()
  renderHangar(progress, state.rocketId)
  setAutoFlightUi(state.autoFlight)
  setFuelUi(state.fuelMode)
  if (rocket) rocket.visible = false
  ship.visible = !state.autoFlight ? false : true
  if (state.autoFlight) ship.visible = true
  setUiPhase()
  refreshChrome()
}

function closeHangar() {
  setHangarOpen(false)
  hangarPreview.stop()
}

function spawnRocket(id) {
  if (rocket) scene.remove(rocket)
  rocket = createRocket(id)
  scene.add(rocket)
  const stats = rocketById[id] || rocketById.falcon9
  pilot = createPilot(rocket, stats)
  rocket.userData._airtime = 0
  const drop = rocket.userData.stack?.userData?.drop
  if (drop) drop.forEach((m) => { m.visible = true })
  ship.visible = false
  rocket.visible = true
}

function padPose() {
  solar.getWorldPosition('earth', scratch)
  const rec = solar.getRecord('earth')
  const r = rec?.mesh.userData.visualRadius || 1
  const radial = scratch.clone()
  if (radial.lengthSq() < 1e-4) radial.set(0, 1, 0)
  else radial.normalize()
  const pos = scratch.clone().addScaledVector(radial, r + 1.35)
  return { pos, earth: scratch.clone() }
}

function holdOnPad() {
  if (!rocket || !pilot) return
  const { pos, earth } = padPose()
  resetPilot(pilot, pos, earth)
  rocket.position.copy(pos)
}

function getAnchor(id) {
  if (!id) return null
  if (state.mode === 'stars') {
    const rec = interstellar.getRecord(id)
    if (!rec) return null
    return { kind: 'star', mesh: rec.hit, data: rec.data, group: rec.group }
  }
  const rec = solar.getRecord(id)
  if (rec) return { kind: rec.data.id === 'sun' ? 'planet' : rec.data.type === 'dwarf' ? 'planet' : 'planet', mesh: rec.mesh, data: rec.data }
  for (const r of solar.records.values()) {
    const moon = r.moons.find((m) => m.data.id === id)
    if (moon) {
      return {
        kind: 'moon',
        mesh: moon.mesh,
        data: { ...moon.data, parentName: r.data.name, parentId: r.data.id },
      }
    }
  }
  return null
}

function fillTargetPos(id, out = targetPos) {
  const a = getAnchor(id)
  if (!a) {
    out.set(0, 0, 0)
    return out
  }
  if (a.group) a.group.getWorldPosition(out)
  else a.mesh.getWorldPosition(out)
  return out
}

function captureRadius(anchor) {
  const r = anchor?.mesh?.userData.visualRadius || 1
  return r * 2.2 + 1.4
}

function lockTarget(id, { announce = true } = {}) {
  const anchor = getAnchor(id)
  if (!anchor) return
  state.targetId = id
  state.targetKind = anchor.kind
  state.arrived = false
  state.currentBody = id
  setActiveChip(id)
  const craftObj = craft()
  fillTargetPos(id, targetPos)
  const dist = craftObj ? craftObj.position.distanceTo(targetPos) : 40
  state.lockDist = Math.max(dist, 12)
  if (announce && (state.phase === 'pilot' || state.phase === 'countdown' || state.phase === 'ignite')) {
    refreshCockpit()
  }
}

function approachOf(dist, capture) {
  const span = Math.max(state.lockDist - capture, 4)
  return THREE.MathUtils.clamp(1 - (dist - capture) / span, 0, 1)
}

function refreshCockpit() {
  if (state.phase !== 'pilot' && state.phase !== 'countdown' && state.phase !== 'ignite') return
  const craftObj = rocket || ship
  if (!state.targetId) {
    renderCockpit(null, {})
    return
  }
  const anchor = getAnchor(state.targetId)
  fillTargetPos(state.targetId, targetPos)
  const dist = craftObj.position.distanceTo(targetPos)
  const cap = captureRadius(anchor)
  const a = state.arrived ? 1 : approachOf(dist, cap)
  renderCockpit(anchor.data, {
    approach: a,
    distScene: dist,
    arrived: state.arrived,
    kind: state.targetKind,
  })
}

function awardProgress(bodyId) {
  const badgeN = progress.badges.length
  const visN = progress.visited.length
  const moonN = progress.visitedMoons.length
  const rings = progress.ringPass
  if (bodyId) markVisited(progress, bodyId)
  if (rocket) {
    for (const rec of solar.records.values()) {
      for (const m of rec.moons) {
        if (nearBody(rocket, m.mesh, 3.5)) markMoon(progress, m.data.id)
      }
    }
    const sat = solar.getRecord('saturn')
    if (sat) {
      sat.mesh.getWorldPosition(scratch)
      const local = rocket.position.clone().sub(scratch)
      const r = sat.mesh.userData.visualRadius || 1
      const rad = Math.hypot(local.x, local.z)
      if (Math.abs(local.y) < r * 0.5 && rad > r * 1.15 && rad < r * 2.55) progress.ringPass = true
    }
  }
  const fresh = evaluateMissions(progress)
  const changed =
    fresh.length ||
    progress.visited.length !== visN ||
    progress.visitedMoons.length !== moonN ||
    progress.badges.length !== badgeN ||
    progress.ringPass !== rings
  if (!changed && !bodyId) return
  persist()
  renderMissionBoard(progress)
  for (const id of fresh) {
    const mission = missionById[id]
    if (mission) showBadgeToast(mission)
  }
}

function failMission(reason, hint) {
  state.phase = 'fail'
  state.landing = null
  if (pilot) {
    pilot.failed = true
    pilot.velocity.set(0, 0, 0)
  }
  showCountdown('')
  showSuccess(false)
  showFail(true, { reason, hint })
  setUiPhase()
}

function beginLanding(hit) {
  if (!rocket || !hit?.mesh) return
  state.phase = 'landing'
  state.arrived = true
  if (pilot) pilot.velocity.set(0, 0, 0)
  input.thrust = false
  input.boost = false
  const kind = landingKind(hit.id, hit.kind)
  state.landing = startLanding(rocket, hit.mesh, kind)
  state.landing.payload = hit
  refreshCockpit()
  setUiPhase()
}

function finishLanding() {
  const hit = state.landing?.payload
  if (!hit) {
    state.phase = 'landed'
    return
  }
  const kind = state.landing.kind
  const copy = landingCopy(kind, hit.name)
  state.arrived = true
  state.parkedAt = hit.kind === 'moon' ? hit.parentId : hit.id
  awardProgress(hit.kind === 'star' ? hit.id : state.parkedAt)
  const related = missions.filter((m) => progress.badges.includes(m.id) && (m.id === hit.id || (hit.id === 'moon' && m.id === 'moon') || (hit.id === 'jupiter' && m.id === 'jupiter-moons') || (hit.id === 'saturn' && m.id === 'saturn-rings')))
  const missionHtml = related.length
    ? related.map((m) => `<p class="patch">${m.icon} Rozet: ${m.badge} — ${m.title}</p>`).join('')
    : '<p class="muted">Bu cisim bir görev kartına bağlıysa hangarda rozetin görünür.</p>'
  showSuccess(true, { title: copy.title, detail: copy.detail, missionHtml })
  state.phase = 'landed'
  refreshCockpit()
  setUiPhase()
}

function collectHits() {
  const hits = []
  if (state.mode === 'stars') {
    for (const rec of interstellar.records.values()) {
      const col = collideBody(rocket, rec.hit, 0.55)
      if (col) hits.push({ id: rec.data.id, name: rec.data.name, kind: 'star', mesh: rec.hit, data: rec.data, ...col })
    }
    return hits
  }
  for (const rec of solar.records.values()) {
    const col = collideBody(rocket, rec.mesh)
    if (col) {
      hits.push({
        id: rec.data.id,
        name: rec.data.name,
        kind: rec.data.id === 'sun' ? 'sun' : 'planet',
        mesh: rec.mesh,
        data: rec.data,
        ...col,
      })
    }
    for (const m of rec.moons) {
      const mc = collideBody(rocket, m.mesh, 0.2)
      if (mc) {
        hits.push({
          id: m.data.id,
          name: m.data.name,
          kind: 'moon',
          parentId: rec.data.id,
          mesh: m.mesh,
          data: { ...m.data, parentName: rec.data.name, parentId: rec.data.id },
          ...mc,
        })
      }
    }
  }
  return hits
}

function scanCollisions() {
  if (!rocket || !pilot) return
  if (state.phase !== 'pilot' && state.phase !== 'ignite') return
  const air = rocket.userData._airtime || 0
  const speed = pilot.speed
  const hits = collectHits()
  for (const h of hits) {
    if (h.id === 'earth' && air < 4.2) continue
    if (h.kind === 'sun' || h.id === 'sol') {
      failMission(
        `${h.name}’e çarptın.`,
        'Güneş bir yıldızdır; fotosfer yaklaşık 5500 °C’dir. Araçlar Güneş’e inmez — Parker Solar Probe bile güvenli bir mesafeden uçar.',
      )
      return
    }
    const isTarget = !!state.targetId && h.id === state.targetId
    if (isTarget) {
      if (speed > SAFE_LAND_SPEED) {
        failMission(
          `${h.name}’e çok hızlı girdin.`,
          'İniş ve yörüngeye oturma, hız kesmeyi ister. Fren (S veya Boşluk) ve düşük itki seviyesi (Q) kullan. Kural bağışlayıcıdır ama tampon vardır.',
        )
        return
      }
      beginLanding(h)
      return
    }
    const targetName = state.targetId ? getAnchor(state.targetId)?.data?.name || state.targetId : null
    failMission(
      `Yanlış gök cismi: ${h.name}.`,
      targetName
        ? `Hedefin ${targetName} idi. Frenleyip yönel; oto-pilot (F) burnu hedefe çevirir.`
        : 'Önce alt şeritten bir hedef seç, sonra yavaşça yaklaş.',
    )
    return
  }
}

function applyPilotCamera(dt, vehicle, thrusting) {
  vehicle.getWorldDirection(lookAhead)
  if (state.cockpitCam) {
    vehicle.visible = false
    camPos.copy(vehicle.position).addScaledVector(lookAhead, 0.18).add(new THREE.Vector3(0, 0.1, 0))
    const look = vehicle.position.clone().addScaledVector(lookAhead, 16)
    camera.position.lerp(camPos, 1 - Math.exp(-9 * dt))
    controls.target.lerp(look, 0.35)
    return
  }
  vehicle.visible = true
  const chase = thrusting ? 9.5 : 8.2
  camPos.copy(vehicle.position).addScaledVector(lookAhead, -chase).add(new THREE.Vector3(0, 3.1, 0))
  const look = vehicle.position.clone().addScaledVector(lookAhead, 12)
  camera.position.lerp(camPos, 1 - Math.exp(-4.2 * dt))
  controls.target.lerp(look, 0.22)
}

function beginCountdown() {
  closeHangar()
  state.welcome = false
  showWelcome(false)
  showFail(false)
  hidePanel()
  spawnRocket(state.rocketId)
  holdOnPad()
  state.phase = 'countdown'
  state.countdown = 3.4
  state.arrived = false
  controls.enabled = false
  setUiPhase()
  if (state.targetId) refreshCockpit()
  else renderCockpit(null, {})
  refreshChrome()
}

function beginIgnite() {
  state.phase = 'ignite'
  state.igniteLeft = 1.8
  if (pilot) {
    pilot.launched = true
    if (pilot.throttleLevel > 3) pilot.throttleLevel = 3
    input.thrust = true
  }
  showCountdown('ATEŞ')
}

function beginPilot() {
  state.phase = 'pilot'
  showCountdown('')
  if (pilot) pilot.launched = true
  setUiPhase()
  refreshCockpit()
}

function launchFromHangar() {
  persist()
  if (state.autoFlight) {
    closeHangar()
    state.phase = 'auto'
    state.flight = null
    if (rocket) rocket.visible = false
    ship.visible = true
    placeShipNear('earth')
    controls.enabled = true
    setUiPhase()
    hidePanel()
    framingForScale()
    refreshChrome()
    return
  }
  beginCountdown()
}

function enterInterstellar(on) {
  state.mode = on ? 'stars' : 'solar'
  setCssVisible(solar.root, !on)
  setCssVisible(interstellar.root, on)
  if (state.phase === 'auto' || state.phase === 'hangar') {
    ship.visible = !on
    if (rocket) rocket.visible = false
  }
  if (on) {
    state.flight = null
    if (state.phase !== 'pilot' && state.phase !== 'countdown' && state.phase !== 'ignite') hidePanel()
  }
  if (state.phase !== 'pilot' && state.phase !== 'countdown' && state.phase !== 'ignite') {
    controls.enabled = true
    framingForScale()
  }
  refreshChrome()
}

function toggleScale() {
  if (state.mode === 'stars') return
  state.scale = state.scale === 'visual' ? 'realistic' : 'visual'
  solar.applyScale(state.scale)
  ship.scale.setScalar(state.scale === 'visual' ? 1 : 0.22)
  if (state.phase === 'auto') placeShipNear(state.parkedAt)
  framingForScale()
  refreshChrome()
}

function hitList() {
  if (state.mode === 'stars') {
    return [...interstellar.records.values()].map((r) => r.hit)
  }
  return [...solar.records.values()].map((r) => r.hit)
}

function pick(clientX, clientY) {
  const rect = canvas.getBoundingClientRect()
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObjects(hitList(), false)
  return hits[0]?.object.userData.bodyId ?? null
}

function flyToPlanet(id) {
  if (state.mode === 'stars') return
  const dest = bodyById[id]
  if (!dest) return
  state.currentBody = id
  setActiveChip(id)
  showPlanetInfo(dest, { flying: id !== state.parkedAt, progress: 0 })

  const from = ship.position.clone()
  solar.getWorldPosition(id, scratch)
  const rec = solar.getRecord(id)
  const offset = parkingOffset(rec.mesh, camera)
  const to = scratch.clone().add(offset)

  if (from.distanceTo(to) < 1.2) {
    setFlightProgress(1)
    state.parkedAt = id
    return
  }

  const curve = makeFlightCurve(from, to)
  const dist = from.distanceTo(to)
  const duration = THREE.MathUtils.clamp(2.0 + dist * 0.065, 2.4, 8.5)
  state.flight = { curve, t: 0, duration, toId: id, to: to.clone() }
  controls.enabled = false
}

function focusStar(id) {
  const rec = interstellar.getRecord(id)
  if (!rec) return
  setActiveChip(id)
  showStarInfo(rec.data)
  rec.group.getWorldPosition(scratch)
  controls.target.copy(scratch)
  const cam = scratch.clone().add(new THREE.Vector3(4, 3, 8))
  camera.position.lerp(cam, 0.35)
}

function onSelectBody(id) {
  if (state.welcome || state.phase === 'hangar' || state.phase === 'landing' || state.phase === 'fail') return
  if (state.phase === 'pilot' || state.phase === 'countdown' || state.phase === 'ignite' || state.phase === 'landed') {
    lockTarget(id)
    if (state.phase === 'landed') {
      state.phase = 'pilot'
      state.arrived = false
      setUiPhase()
    }
    return
  }
  flyToPlanet(id)
}

function onSelectStar(id) {
  if (state.welcome || state.phase === 'hangar') return
  if (state.phase === 'pilot' || state.phase === 'countdown' || state.phase === 'ignite') {
    lockTarget(id)
    return
  }
  focusStar(id)
}

function onPickMission(id) {
  const m = missionById[id]
  if (!m) return
  const map = {
    mars: 'mars',
    moon: 'moon',
    'jupiter-moons': 'jupiter',
    'saturn-rings': 'saturn',
    pluto: 'pluto',
    proxima: 'proxima',
    'inner-tour': 'mercury',
  }
  const target = map[id]
  if (id === 'proxima') enterInterstellar(true)
  else if (state.mode === 'stars') enterInterstellar(false)
  if (target) {
    state.targetId = target
    state.targetKind = id === 'moon' ? 'moon' : id === 'proxima' ? 'star' : 'planet'
    setActiveChip(target)
  }
}

function demoPilot({ to = 'mars', approach = 0.55, arrived = false, rocketId = 'shuttle' } = {}) {
  state.welcome = false
  showWelcome(false)
  closeHangar()
  showHelp(false)
  hidePanel()
  state.rocketId = rocketId
  spawnRocket(rocketId)
  solar.update(0, 0)
  fillTargetPos(to, targetPos)
  solar.getWorldPosition('earth', earthPos)
  const anchor = getAnchor(to)
  const cap = captureRadius(anchor)
  const far = Math.max(earthPos.distanceTo(targetPos), 24)
  const u = arrived ? 0.98 : THREE.MathUtils.clamp(approach, 0.05, 0.95)
  const dist = cap + (1 - u) * Math.max(far * 0.55, 14)
  const dir = targetPos.clone().sub(earthPos)
  if (dir.lengthSq() < 1e-4) dir.set(1, 0.2, 0.4)
  dir.normalize()
  rocket.position.copy(targetPos).addScaledVector(dir, -dist)
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir)
  rocket.quaternion.copy(q)
  if (pilot) {
    pilot.launched = true
    pilot.velocity.copy(dir).multiplyScalar(0.12)
    pilot.fuel = pilot.fuelMax * (state.fuelMode ? 0.62 : 1)
  }
  input.thrust = !arrived
  const span = Math.max(dist - cap, 4)
  state.phase = 'pilot'
  lockTarget(to, { announce: false })
  state.lockDist = cap + span / Math.max(1 - u, 0.08)
  state.arrived = !!arrived
  controls.enabled = false
  applyPilotCamera(1, rocket, true)
  setUiPhase()
  refreshCockpit()
  refreshChrome()
  if (arrived) awardProgress(to)
}

function demoCockpitCam(opts = {}) {
  demoPilot({ to: opts.to || 'mars', approach: opts.approach || 0.6, rocketId: opts.rocketId || 'shuttle' })
  state.cockpitCam = true
  setCockpitCam(true)
  camera.fov = 64
  camera.updateProjectionMatrix()
  applyPilotCamera(1, rocket, false)
}

function demoLanding({ to = 'mars', rocketId = 'shuttle' } = {}) {
  demoPilot({ to, approach: 0.94, arrived: false, rocketId })
  if (pilot) {
    pilot.velocity.set(0, 0, 0)
    pilot.throttleLevel = 1
  }
  const anchor = getAnchor(to)
  beginLanding({
    id: to,
    name: anchor?.data?.name || to,
    kind: to === 'moon' ? 'moon' : landingKind(to, anchor?.kind),
    mesh: anchor?.mesh,
    parentId: anchor?.data?.parentId,
    data: anchor?.data,
  })
  if (state.landing) state.landing.t = 0.42
}

function demoFail({ reason, hint } = {}) {
  demoPilot({ to: 'mars', approach: 0.7, rocketId: 'falcon9' })
  failMission(
    reason || 'Mars’e çok hızlı girdin.',
    hint || 'İniş için fren (S / Boşluk) ve düşük itki seviyesi kullan. Güneş veya yanlış gezegen de görevi düşürür.',
  )
}

bindHud({
  onSelectBody,
  onSelectStar,
  onToggleInterstellar: () => enterInterstellar(state.mode !== 'stars'),
  onToggleScale: toggleScale,
  onTogglePause: togglePause,
  onTimeSpeed: applyTimeSpeed,
  onToggleHelp: (force) => {
    state.help = force === undefined ? !state.help : force
    showHelp(state.help)
  },
  onDismissWelcome: () => {
    state.welcome = false
    showWelcome(false)
    openHangar()
  },
})

bindCockpit()

bindGameUi({
  onPickRocket: (id) => {
    state.rocketId = id
    hangarPreview.show(id)
    persist()
    renderHangar(progress, id)
  },
  onPickMission,
  onHangarLaunch: launchFromHangar,
  onOpenHangar: () => {
    state.welcome = false
    showWelcome(false)
    openHangar()
  },
  onToggleMissions: () => {
    state.missionsOpen = !state.missionsOpen
    setMissionsOpen(state.missionsOpen)
    renderMissionBoard(progress)
  },
  onToggleAutoFlight: () => {
    state.autoFlight = !state.autoFlight
    persist()
    setAutoFlightUi(state.autoFlight)
  },
  onFuelMode: (on) => {
    state.fuelMode = !!on
    persist()
    setFuelUi(state.fuelMode)
  },
  onResetProgress: () => {
    progress = resetProgress()
    state.rocketId = progress.rocketId
    state.autoFlight = false
    state.fuelMode = false
    setAutoFlightUi(false)
    setFuelUi(false)
    renderHangar(progress, state.rocketId)
    hangarPreview.show(state.rocketId)
  },
  onRetry: () => {
    showFail(false)
    openHangar()
  },
  onAutopilot: () => {
    if (pilot) pilot.autopilot = !pilot.autopilot
  },
  onCruise: () => {
    if (pilot) pilot.cruise = !pilot.cruise
  },
  onBoost: (on) => {
    input.boost = on
  },
  onThrust: (on) => {
    input.thrust = on
  },
  onBrake: (on) => {
    input.brake = on
  },
  onThrottle: (n) => {
    if (pilot) pilot.throttleLevel = n
  },
  onThrottleDelta: (d) => {
    if (pilot) bumpThrottle(pilot, d)
  },
  onCockpitCam: () => {
    state.cockpitCam = !state.cockpitCam
    setCockpitCam(state.cockpitCam)
    camera.fov = state.cockpitCam ? 64 : 52
    camera.updateProjectionMatrix()
    if (rocket) rocket.visible = !state.cockpitCam
  },
  onSuccessHangar: () => openHangar(),
  onSuccessContinue: () => {
    showSuccess(false)
    state.phase = 'pilot'
    state.landing = null
    if (rocket) rocket.visible = !state.cockpitCam
    setUiPhase()
  },
  onStick: (yaw, pitch) => {
    input.stickYaw = yaw
    input.stickPitch = pitch
  },
})

refreshChrome()
setCssVisible(interstellar.root, false)
setAutoFlightUi(state.autoFlight)
setFuelUi(state.fuelMode)
setFlightHud(false)
setCockpitOpen(false)
setHangarOpen(false)
renderHangar(progress, state.rocketId)

const params = new URLSearchParams(window.location.search)
if (params.has('shot') || params.get('demo') === '1') {
  state.welcome = false
  showWelcome(false)
}
if (params.get('shot') === 'stars' || params.get('mode') === 'stars') {
  enterInterstellar(true)
  state.phase = 'auto'
  setUiPhase()
  const focus = params.get('star') || 'proxima'
  window.setTimeout(() => focusStar(focus), 200)
}
if (params.get('shot') === 'flight') {
  state.phase = 'auto'
  state.autoFlight = true
  closeHangar()
  setUiPhase()
  ship.visible = true
  window.setTimeout(() => flyToPlanet(params.get('to') || 'saturn'), 300)
}
if (params.get('shot') === 'main') {
  state.phase = 'auto'
  closeHangar()
  hidePanel()
  setActiveChip('')
  setUiPhase()
  ship.visible = true
}
if (params.get('shot') === 'hangar' || params.get('shot') === 'missions' || params.get('shot') === 'fuel') {
  openHangar()
  if (params.get('shot') === 'fuel') {
    state.fuelMode = true
    setFuelUi(true)
  }
  if (params.get('shot') === 'missions') {
    state.missionsOpen = false
  }
}
if (params.get('shot') === 'launch') {
  beginCountdown()
  state.countdown = 2.2
}
if (params.get('shot') === 'cockpitcam') {
  demoCockpitCam({ to: params.get('to') || 'mars' })
}
if (params.get('shot') === 'landing') {
  demoLanding({ to: params.get('to') || 'mars' })
}
if (params.get('shot') === 'fail') {
  demoFail()
}
if (params.get('shot') === 'pilot' || params.get('shot') === 'cockpit' || params.get('shot') === 'throttle') {
  const to = params.get('to') || (params.get('shot') === 'cockpit' ? 'jupiter' : 'mars')
  demoPilot({
    to,
    approach: params.has('approach') ? Number(params.get('approach')) : params.get('shot') === 'cockpit' ? 1 : 0.62,
    arrived: params.get('shot') === 'cockpit' || params.get('arrived') === '1',
    rocketId: params.get('rocket') || 'shuttle',
  })
}

const freezeAt = params.has('freeze') ? Number(params.get('freeze')) : null

const pointerState = { x: 0, y: 0, moved: false, id: null }

canvas.addEventListener('pointerdown', (e) => {
  pointerState.x = e.clientX
  pointerState.y = e.clientY
  pointerState.moved = false
  pointerState.id = e.pointerId
})

canvas.addEventListener('pointermove', (e) => {
  if (pointerState.id !== e.pointerId) return
  const dx = e.clientX - pointerState.x
  const dy = e.clientY - pointerState.y
  if (dx * dx + dy * dy > 64) pointerState.moved = true
})

canvas.addEventListener('pointerup', (e) => {
  if (pointerState.id !== e.pointerId) return
  pointerState.id = null
  if (pointerState.moved || state.welcome || state.phase === 'hangar') return
  const id = pick(e.clientX, e.clientY)
  if (!id) return
  if (state.mode === 'stars') onSelectStar(id)
  else onSelectBody(id)
})

function readPilotKeys() {
  const yaw = (keys.has('KeyA') || keys.has('ArrowLeft') ? -1 : 0) + (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0)
  const pitch = (keys.has('ArrowUp') || keys.has('KeyI') ? -1 : 0) + (keys.has('ArrowDown') || keys.has('KeyK') ? 1 : 0)
  input.yaw = THREE.MathUtils.clamp(yaw + input.stickYaw, -1, 1)
  input.pitch = THREE.MathUtils.clamp(pitch + input.stickPitch, -1, 1)
  const keyThrust = keys.has('KeyW')
  const keyBrake = input.brake || keys.has('KeyS') || keys.has('KeyX') || keys.has('Space')
  return {
    thrust: (input.thrust || keyThrust || state.phase === 'ignite') && !keyBrake,
    boost: input.boost || keys.has('ShiftLeft') || keys.has('ShiftRight'),
    brake: keyBrake,
    yaw: input.yaw,
    pitch: input.pitch,
    autopilot: !!(pilot && pilot.autopilot),
    cruise: !!(pilot && pilot.cruise),
    throttleLevel: pilot?.throttleLevel || 3,
  }
}

window.addEventListener('keydown', (e) => {
  keys.add(e.code)
  if (state.welcome) {
    if (e.key === 'Enter' || e.key === ' ') document.getElementById('welcome-go').click()
    return
  }
  if (state.phase === 'hangar') return
  const piloting = ['pilot', 'countdown', 'ignite', 'landing', 'landed'].includes(state.phase)
  if (e.key === ' ' && !piloting) {
    e.preventDefault()
    togglePause()
  }
  if (piloting && (e.code === 'KeyW' || e.code === 'Space' || e.code === 'KeyS')) e.preventDefault()
  if (e.key === 'y' || e.key === 'Y') enterInterstellar(state.mode !== 'stars')
  if ((e.key === 'ö' || e.key === 'Ö') && !piloting) toggleScale()
  if ((e.key === 's' || e.key === 'S') && !piloting) toggleScale()
  if (e.key === '?' || e.key === 'h' || e.key === 'H') {
    state.help = !state.help
    showHelp(state.help)
  }
  if (e.code === 'KeyF' && piloting && pilot) {
    pilot.autopilot = !pilot.autopilot
  }
  if (e.code === 'KeyC' && piloting && pilot) {
    pilot.cruise = !pilot.cruise
  }
  if (e.code === 'KeyV' && piloting) {
    state.cockpitCam = !state.cockpitCam
    setCockpitCam(state.cockpitCam)
    camera.fov = state.cockpitCam ? 64 : 52
    camera.updateProjectionMatrix()
    if (rocket) rocket.visible = !state.cockpitCam
  }
  if (e.code === 'KeyQ' && piloting && pilot) bumpThrottle(pilot, -1)
  if (e.code === 'KeyE' && piloting && pilot) bumpThrottle(pilot, 1)
  if (e.key >= '0' && e.key <= '9') {
    const id = KEY_BODIES[Number(e.key)]
    if (!id) return
    if (state.mode === 'solar') {
      if (piloting) lockTarget(id)
      else flyToPlanet(id)
    }
  }
  if ((e.key === 'p' || e.key === 'P') && state.mode === 'solar') {
    if (piloting) lockTarget('pluto')
    else flyToPlanet('pluto')
  }
})

window.addEventListener('keyup', (e) => {
  keys.delete(e.code)
})

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  labelRenderer.setSize(window.innerWidth, window.innerHeight)
  hangarPreview.fit()
})

const flame = ship.userData.flame
let awardAcc = 0

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05)
  solar.update(dt, simDaysPerSecond())

  if (state.phase === 'countdown' && rocket) {
    holdOnPad()
    state.countdown -= dt
    const n = Math.ceil(state.countdown)
    showCountdown(n > 0 ? String(n) : 'ATEŞ')
    applyPilotCamera(dt, rocket, false)
    if (state.countdown <= 0) beginIgnite()
  }

  if (state.phase === 'landing' && rocket && state.landing) {
    if (pilot) pilot.velocity.set(0, 0, 0)
    const u = tickLanding(state.landing, dt)
    applyPilotCamera(dt, rocket, false)
    refreshCockpit()
    const rName = rocketById[state.rocketId]?.name || state.rocketId
    fillTargetPos(state.targetId, targetPos)
    updateFlightHud({
      speed: 0.05,
      altitude: 2,
      fuel: pilot?.fuel ?? 1,
      fuelMax: pilot?.fuelMax ?? 1,
      fuelMode: state.fuelMode,
      targetName: state.landing.payload?.name,
      dist: 0,
      autopilot: true,
      cruise: false,
      staged: pilot?.staged,
      rocketName: rName,
      throttleLevel: 1,
      braking: true,
      approachWarn: false,
    })
    if (u >= 1) finishLanding()
  } else if (state.phase === 'landed' && rocket) {
    applyPilotCamera(dt, rocket, false)
    refreshCockpit()
  }

  if ((state.phase === 'ignite' || state.phase === 'pilot') && rocket && pilot) {
    if (state.phase === 'ignite') {
      state.igniteLeft -= dt
      if (state.igniteLeft <= 0) beginPilot()
    }
    solar.getWorldPosition('earth', earthPos)
    const hasTarget = !!state.targetId
    if (hasTarget) fillTargetPos(state.targetId, targetPos)
    const controlsIn = readPilotKeys()
    const throttle = updatePilot(pilot, controlsIn, {
      dt,
      targetPos: hasTarget ? targetPos : null,
      earthPos,
      fuelMode: state.fuelMode,
    })
    engineWorldPos(rocket, engineP)
    engineBack(rocket, engineB)
    exhaust.spawn(engineP, engineB, throttle)
    exhaust.update(dt)
    applyPilotCamera(dt, rocket, throttle > 0)
    qs('guide-arrow').classList.toggle('hidden', !hasTarget)
    if (hasTarget) {
      placeGuide(guidanceNdc(rocket, targetPos, camera))
    }
    const dist = hasTarget ? rocket.position.distanceTo(targetPos) : 0
    const rName = rocketById[state.rocketId]?.name || state.rocketId
    const near = hasTarget && dist < (getAnchor(state.targetId)?.mesh.userData.visualRadius || 2) * 6
    updateFlightHud({
      speed: pilot.speed,
      altitude: pilot.altitude,
      fuel: pilot.fuel,
      fuelMax: pilot.fuelMax,
      fuelMode: state.fuelMode,
      targetName: hasTarget ? (getAnchor(state.targetId)?.data?.name || state.targetId) : '',
      dist,
      autopilot: pilot.autopilot,
      cruise: pilot.cruise,
      staged: pilot.staged,
      rocketName: rName,
      throttleLevel: pilot.throttleLevel,
      braking: pilot.braking,
      approachWarn: near,
    })
    refreshCockpit()
    scanCollisions()
    awardAcc += dt
    if (awardAcc > 0.5) {
      awardAcc = 0
      awardProgress(null)
    }
    if (pilot.failed && state.phase !== 'fail') {
      failMission(
        'Yakıt bitti.',
        'Hohmann aktarımı: hedef yörüngeye teğet bir elips, sürekli itkiden daha az yakıt yakar. Kütleçekim sapanı hız ödünç alır.',
      )
    }
  } else if (state.phase !== 'landing' && state.phase !== 'landed') {
    exhaust.points.material.opacity = 0
  }

  if (state.flight) {
    solar.getWorldPosition(state.flight.toId, scratch)
    const rec = solar.getRecord(state.flight.toId)
    const liveOffset = parkingOffset(rec.mesh, camera)
    state.flight.curve.v2.copy(scratch).add(liveOffset)
    if (freezeAt === null) state.flight.t += dt / state.flight.duration
    else state.flight.t = freezeAt
    const u = Math.min(state.flight.t, 1)
    const e = u * u * (3 - 2 * u)
    state.flight.curve.getPoint(e, ship.position)
    state.flight.curve.getPoint(Math.min(e + 0.02, 1), lookAhead)
    ship.lookAt(lookAhead)
    flame.scale.set(1, 1 + Math.sin(clock.elapsedTime * 24) * 0.25, 1)
    flame.visible = true

    const fwd = new THREE.Vector3().subVectors(state.flight.curve.v2, ship.position)
    if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, 1)
    fwd.normalize()
    const worldUp = new THREE.Vector3(0, 1, 0)
    const side = new THREE.Vector3().crossVectors(fwd, worldUp)
    if (side.lengthSq() < 1e-4) side.set(1, 0, 0)
    side.normalize()
    const chase = 16 + (1 - e) * 12
    camPos
      .copy(ship.position)
      .addScaledVector(fwd, -chase)
      .addScaledVector(worldUp, 7)
      .addScaledVector(side, 6)
    const look = ship.position.clone().addScaledVector(fwd, 18)
    if (state.flight.snapped) {
      camera.position.lerp(camPos, 1 - Math.exp(-5 * dt))
      controls.target.lerp(look, 0.2)
    } else {
      camera.position.copy(camPos)
      controls.target.copy(look)
      state.flight.snapped = true
    }
    setFlightProgress(u)
    if (bodyById[state.flight.toId]) {
      const dest = bodyById[state.flight.toId]
      const statusEl = document.getElementById('flight-status')
      if (statusEl) statusEl.textContent = `${dest.name} yolunda · %${Math.round(u * 100)}`
    }

    if (u >= 1) {
      state.parkedAt = state.flight.toId
      state.flight = null
      controls.enabled = true
      solar.getWorldPosition(state.parkedAt, scratch)
      const arrived = solar.getRecord(state.parkedAt)
      const r = arrived?.mesh.userData.visualRadius || 1
      camera.position.copy(scratch).add(new THREE.Vector3(r * 4.5 + 6, r * 2.2 + 4, r * 5.5 + 7))
      controls.target.copy(scratch)
      setFlightProgress(1)
      flame.visible = false
      markVisited(progress, state.parkedAt)
      awardProgress(state.parkedAt)
    }
  } else if (state.phase === 'auto') {
    flame.visible = false
    if (state.mode === 'solar' && state.parkedAt) {
      const rec = solar.getRecord(state.parkedAt)
      if (rec) {
        rec.mesh.getWorldPosition(scratch)
        const offset = parkingOffset(rec.mesh, camera)
        ship.position.lerp(scratch.clone().add(offset), 0.12)
        ship.lookAt(scratch)
      }
    }
  }

  if (state.mode === 'solar' && ship.visible) {
    const base = state.scale === 'visual' ? (state.flight ? 1.7 : 1) : 0.22
    const wobble = state.flight ? 1 : 1 + Math.sin(clock.elapsedTime * 2.2) * 0.02
    ship.scale.setScalar(base * wobble)
  }

  if (state.mode === 'solar') {
    for (const rec of solar.records.values()) {
      rec.mesh.getWorldPosition(lookAhead)
      const near = camera.position.distanceTo(lookAhead) < 24
      rec.moons.forEach((m) => {
        if (m.label) m.label.visible = near
      })
    }
  }

  if (state.phase !== 'pilot' && state.phase !== 'countdown' && state.phase !== 'ignite') {
    controls.update()
  } else {
    controls.update()
  }

  renderer.render(scene, camera)
  labelRenderer.render(scene, camera)
  requestAnimationFrame(tick)
}

requestAnimationFrame(tick)

window.__kesif = {
  flyToPlanet,
  enterInterstellar,
  toggleScale,
  applyTimeSpeed,
  togglePause,
  openHangar,
  launchFromHangar,
  lockTarget,
  demoPilot,
  demoCockpitCam,
  demoLanding,
  demoFail,
  beginCountdown,
  state,
  solar,
  bodies,
  nearbyStars,
  missions,
  progress,
}

console.info('Keşif Yörüngesi hazır. window.__kesif ile konsoldan da uçuş tetikleyebilirsiniz.')
