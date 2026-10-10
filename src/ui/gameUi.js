/**
 * Hangar, uçuş HUD, görev kartları, yakıt ayarı, dokunmatik kol.
 */

import { rockets } from '../data/rockets.js'
import { missions } from '../data/missions.js'
import { qs } from './hud.js'
import { formatNumber } from '../utils/format.js'
import { throttleInfo, SAFE_LAND_SPEED } from '../game/pilot.js'

export function renderHangar(progress, selectedId) {
  const list = qs('hangar-list')
  list.innerHTML = rockets
    .map((r) => {
      const on = r.id === selectedId ? 'on' : ''
      const badgeN = progress.badges.length
      return `<button type="button" class="hangar-card ${on}" data-rocket="${r.id}">
        <strong>${r.name}</strong>
        <em>${r.nation}</em>
        <span>${r.role}</span>
        ${badgeN && r.id === progress.rocketId ? `<b class="mini-badge">${badgeN} rozet</b>` : ''}
      </button>`
    })
    .join('')
  renderRocketSheet(selectedId, progress)
  renderMissionBoard(progress)
}

export function renderRocketSheet(id, progress) {
  const r = rockets.find((x) => x.id === id)
  const el = qs('hangar-sheet')
  if (!r) return
  const thrust = r.thrustKN == null ? 'yayımlanmadı' : `${formatNumber(r.thrustKN, 0)} kN`
  const mass = r.massKg == null ? 'yayımlanmadı' : `${formatNumber(r.massKg, 0)} kg`
  el.innerHTML = `
    <p class="kicker">${r.nation}</p>
    <h2>${r.name}</h2>
    <p class="muted">${r.role}${r.inDevelopment ? ' · geliştirme' : ''}</p>
    <dl class="facts hangar-facts">
      <div><dt>Boy</dt><dd>${formatNumber(r.heightM, 1)} m</dd></div>
      <div><dt>İtki</dt><dd>${thrust}</dd></div>
      <div><dt>Faydalı yük</dt><dd>${formatNumber(r.payloadKg, 0)} kg</dd></div>
      <div><dt>Kademe</dt><dd>${r.stages}</dd></div>
      <div><dt>Kalkış kütlesi</dt><dd>${mass}</dd></div>
      <div><dt>İlk uçuş</dt><dd>${r.firstFlight}</dd></div>
    </dl>
    <p>${r.payloadNote}</p>
    <section class="didyou"><h3>Biliyor muydun?</h3><p>${r.fact}</p></section>
    <p class="game-feel">Sınıf fiziği: hız ${r.game.accel.toFixed(2)} · dönüş ${r.game.turn.toFixed(2)} · yakıt ${r.game.fuel}</p>
    ${renderBadges(progress)}
  `
}

function renderBadges(progress) {
  if (!progress.badges.length) return `<p class="muted">Henüz rozet yok — görev kartlarından birini bitir.</p>`
  const pills = progress.badges
    .map((id) => {
      const m = missions.find((x) => x.id === id)
      return m ? `<span class="patch" title="${m.title}">${m.icon} ${m.badge}</span>` : ''
    })
    .join('')
  return `<div class="patch-row">${pills}</div>`
}

export function renderMissionBoard(progress) {
  const html = missions
    .map((m) => {
      const done = progress.badges.includes(m.id)
      return `<button type="button" class="mission-card ${done ? 'done' : ''}" data-mission="${m.id}">
        <span class="m-icon">${m.icon}</span>
        <span>
          <strong>${m.title}</strong>
          <em>${done ? `Rozet: ${m.badge}` : m.blurb}</em>
        </span>
      </button>`
    })
    .join('')
  const board = qs('mission-board')
  const live = qs('mission-board-live')
  if (board) board.innerHTML = html
  if (live) live.innerHTML = html
}

export function setHangarOpen(open) {
  qs('hangar').classList.toggle('hidden', !open)
}

export function setFlightHud(show) {
  qs('flight-hud').classList.toggle('hidden', !show)
  qs('touch-controls').classList.toggle('hidden', !show)
  qs('guide-arrow').classList.toggle('hidden', !show)
  qs('cockpit').classList.toggle('hidden', !show)
  if (!show) {
    qs('cockpit-frame')?.classList.add('hidden')
    document.body.classList.remove('cockpit-cam')
  }
}

export function setCockpitCam(on) {
  qs('cockpit-frame').classList.toggle('hidden', !on)
  document.body.classList.toggle('cockpit-cam', on)
  qs('btn-cockpit-cam')?.classList.toggle('on', on)
  qs('btn-hud-cam')?.classList.toggle('on', on)
  qs('btn-hud-cam').textContent = on ? 'Dış kamera' : 'Kokpit görünümü'
}

export function updateFlightHud({
  speed,
  altitude,
  fuel,
  fuelMax,
  fuelMode,
  targetName,
  dist,
  autopilot,
  cruise,
  staged,
  rocketName,
  throttleLevel,
  braking,
  approachWarn,
}) {
  qs('hud-speed').textContent = `${formatNumber(speed, 2)} birim/s`
  qs('hud-alt').textContent = `${formatNumber(altitude, 0)} km*`
  const pct = Math.round((fuel / Math.max(fuelMax, 1)) * 100)
  qs('hud-fuel-bar').style.width = `${fuelMode ? pct : 100}%`
  qs('hud-fuel-label').textContent = fuelMode ? `Yakıt %${pct}` : 'Yakıt sınırsız'
  qs('hud-target').textContent = targetName ? `${targetName} · ${formatNumber(dist, 1)} birim` : 'Hedef yok'
  qs('btn-auto').classList.toggle('on', autopilot)
  qs('btn-cruise').classList.toggle('on', cruise)
  qs('btn-brake')?.classList.toggle('on', braking)
  qs('hud-stage').textContent = staged ? 'Kademe ayrıldı' : rocketName
  qs('hud-fuel-wrap').classList.toggle('warn', fuelMode && pct < 22)
  const tInfo = throttleInfo(throttleLevel || 3)
  qs('hud-throttle').textContent = `${tInfo.label} · ${tInfo.level}/5`
  const slider = qs('throttle-level')
  if (slider && String(slider.value) !== String(tInfo.level)) slider.value = String(tInfo.level)
  const land = qs('hud-land')
  const landWrap = qs('hud-land-wrap')
  if (land) {
    const safe = speed <= SAFE_LAND_SPEED
    land.textContent = safe ? `uygun (≤ ${formatNumber(SAFE_LAND_SPEED, 1)})` : 'yavaşla — fren'
    landWrap.classList.toggle('warn', !safe && !!approachWarn)
    landWrap.classList.toggle('ok', safe)
  }
  const cfS = qs('cf-speed')
  const cfT = qs('cf-thr')
  if (cfS) cfS.textContent = `Hız ${formatNumber(speed, 2)}`
  if (cfT) cfT.textContent = `İtki ${tInfo.label}`
}

export function placeGuide(ndc) {
  const el = qs('guide-arrow')
  const x = (ndc.x * 0.5 + 0.5) * 100
  const y = (1 - (ndc.y * 0.5 + 0.5)) * 100
  el.style.left = `${x}%`
  el.style.top = `${y}%`
  el.classList.toggle('behind', ndc.behind)
}

export function showFail(show, { reason, hint } = {}) {
  qs('fail-card').classList.toggle('hidden', !show)
  if (reason) qs('fail-reason').textContent = reason
  if (hint) qs('fail-hint').textContent = hint
}

export function showSuccess(show, { title, detail, missionHtml } = {}) {
  const el = qs('success-card')
  el.classList.toggle('hidden', !show)
  if (!show) return
  qs('success-title').textContent = title || ''
  qs('success-detail').textContent = detail || ''
  qs('success-mission').innerHTML = missionHtml || ''
}

export function showBadgeToast(mission) {
  const el = qs('badge-toast')
  el.innerHTML = `<strong>Rozet kazandın: ${mission.badge}</strong><span>${mission.title}</span>`
  el.classList.remove('hidden')
  window.clearTimeout(showBadgeToast._t)
  showBadgeToast._t = window.setTimeout(() => el.classList.add('hidden'), 3800)
}

export function showCountdown(text) {
  const el = qs('countdown')
  if (!text) {
    el.classList.add('hidden')
    el.textContent = ''
    return
  }
  el.classList.remove('hidden')
  el.textContent = text
}

export function bindGameUi(handlers) {
  qs('hangar-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-rocket]')
    if (btn) handlers.onPickRocket(btn.dataset.rocket)
  })
  const pickMission = (e) => {
    const btn = e.target.closest('[data-mission]')
    if (btn) handlers.onPickMission(btn.dataset.mission)
  }
  qs('mission-board').addEventListener('click', pickMission)
  qs('mission-board-live').addEventListener('click', pickMission)
  qs('hangar-launch').addEventListener('click', () => handlers.onHangarLaunch())
  qs('btn-hangar').addEventListener('click', () => handlers.onOpenHangar())
  const touchHangar = qs('btn-touch-hangar')
  if (touchHangar) touchHangar.addEventListener('click', () => handlers.onOpenHangar())
  qs('btn-missions').addEventListener('click', () => handlers.onToggleMissions())
  qs('btn-auto-mode').addEventListener('click', () => handlers.onToggleAutoFlight())
  qs('chk-fuel').addEventListener('change', (e) => handlers.onFuelMode(e.target.checked))
  qs('btn-reset-progress').addEventListener('click', () => handlers.onResetProgress())
  qs('fail-retry').addEventListener('click', () => handlers.onRetry())
  qs('success-hangar').addEventListener('click', () => handlers.onSuccessHangar())
  qs('success-continue').addEventListener('click', () => handlers.onSuccessContinue())
  qs('btn-auto').addEventListener('click', () => handlers.onAutopilot())
  qs('btn-cruise').addEventListener('click', () => handlers.onCruise())
  qs('btn-cockpit-cam').addEventListener('click', () => handlers.onCockpitCam())
  qs('btn-hud-cam').addEventListener('click', () => handlers.onCockpitCam())
  qs('btn-thr-down').addEventListener('click', () => handlers.onThrottleDelta(-1))
  qs('btn-thr-up').addEventListener('click', () => handlers.onThrottleDelta(1))
  qs('throttle-level').addEventListener('input', (e) => handlers.onThrottle(Number(e.target.value)))
  qs('throttle-level').addEventListener('pointerdown', (e) => e.stopPropagation())
  qs('btn-brake').addEventListener('pointerdown', (e) => {
    e.preventDefault()
    handlers.onBrake(true)
  })
  ;['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => {
    qs('btn-brake').addEventListener(ev, () => handlers.onBrake(false))
  })
  qs('btn-boost').addEventListener('pointerdown', (e) => {
    e.preventDefault()
    handlers.onBoost(true)
  })
  ;['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => {
    qs('btn-boost').addEventListener(ev, () => handlers.onBoost(false))
  })
  qs('btn-thrust').addEventListener('pointerdown', (e) => {
    e.preventDefault()
    handlers.onThrust(true)
  })
  ;['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => {
    qs('btn-thrust').addEventListener(ev, () => handlers.onThrust(false))
  })

  const stick = qs('stick')
  const nub = stick.querySelector('i')
  const joy = { active: false, id: null, yaw: 0, pitch: 0 }
  const setNub = (x, y) => {
    nub.style.transform = `translate(${x * 28}px, ${y * 28}px)`
  }
  stick.addEventListener('pointerdown', (e) => {
    joy.active = true
    joy.id = e.pointerId
    stick.setPointerCapture(e.pointerId)
  })
  stick.addEventListener('pointermove', (e) => {
    if (!joy.active || e.pointerId !== joy.id) return
    const r = stick.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 2 - 1
    const y = ((e.clientY - r.top) / r.height) * 2 - 1
    joy.yaw = Math.max(-1, Math.min(1, x))
    joy.pitch = Math.max(-1, Math.min(1, y))
    setNub(joy.yaw, joy.pitch)
    handlers.onStick(joy.yaw, joy.pitch)
  })
  const end = (e) => {
    if (e && e.pointerId !== joy.id) return
    joy.active = false
    joy.yaw = 0
    joy.pitch = 0
    setNub(0, 0)
    handlers.onStick(0, 0)
  }
  stick.addEventListener('pointerup', end)
  stick.addEventListener('pointercancel', end)
  qs('touch-controls').addEventListener('pointerdown', (e) => e.stopPropagation())
}

export function setAutoFlightUi(on) {
  qs('btn-auto-mode').classList.toggle('on', on)
  qs('btn-auto-mode').textContent = on ? 'Otomatik uçuş: açık' : 'Otomatik uçuş: kapalı'
}

export function setFuelUi(on) {
  qs('chk-fuel').checked = on
  qs('fuel-hint').classList.toggle('hidden', !on)
}

export function setMissionsOpen(open) {
  qs('missions-drawer').classList.toggle('hidden', !open)
}
