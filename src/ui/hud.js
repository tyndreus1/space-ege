/**
 * Türkçe arayüz: gezegen rıhtımı, bilgi paneli, ölçek ve yıldızlararası düğmeler.
 * HTML iskeleti index.html'dedir; bu modül onu doldurur ve olayları bağlar.
 */

import { bodies } from '../data/bodies.js'
import { nearbyStars, INTERSTELLAR_SPEEDS } from '../data/stars.js'
import {
  formatKm,
  formatAu,
  formatNumber,
  formatScientific,
  formatDuration,
  shuttleTravel,
  lightTravel,
  AU_KM,
  LY_KM,
  SHUTTLE_KM_S,
  formatSimRate,
  sliderToDays,
  daysToSlider,
  TIME_DEFAULT_DAYS,
} from '../utils/format.js'

export function qs(id) {
  return document.getElementById(id)
}

export function buildPlanetDock() {
  const dock = qs('planet-dock')
  dock.innerHTML = ''
  for (const b of bodies) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = `planet-chip type-${b.type}`
    btn.dataset.id = b.id
    btn.innerHTML = `<i style="background:${b.visual.hue}"></i><span>${b.name}</span>`
    btn.setAttribute('aria-label', `${b.name} — ${b.typeLabel}`)
    dock.appendChild(btn)
  }
}

export function setActiveChip(id) {
  document.querySelectorAll('.planet-chip').forEach((el) => {
    el.classList.toggle('active', el.dataset.id === id)
  })
}

export function setFlightProgress(p) {
  const bar = qs('flight-bar')
  const label = qs('flight-status')
  if (!bar) return
  bar.style.width = `${Math.round(p * 100)}%`
  if (label) {
    label.textContent = p >= 1 ? 'Varış' : p <= 0 ? 'Hazır' : `Uçuş %${Math.round(p * 100)}`
  }
}

export function layerList(layers) {
  return layers
    .map((l) => `<li><strong>${l.name}</strong> — ${l.detail}</li>`)
    .join('')
}

export function moonList(moons) {
  if (!moons || moons.count === 0) {
    return `<p class="muted">${moons?.summary ?? 'Bilinen uydusu yoktur.'}</p>`
  }
  const notable = (moons.notable || [])
    .map((m) => `<li><strong>${m.name}</strong> (${formatNumber(m.diameterKm, 0)} km) — ${m.note}</li>`)
    .join('')
  return `
    <p>Toplam <strong>${moons.count}</strong> uydu. ${moons.summary}</p>
    ${notable ? `<ul class="notable">${notable}</ul>` : ''}
  `
}

export function missionList(missions) {
  if (!missions?.length) return ''
  return `<ul class="missions">${missions.map((m) => `<li><strong>${m.name}</strong> — ${m.note}</li>`).join('')}</ul>`
}

export function showPlanetInfo(body, { flying = false, progress = 0 } = {}) {
  const panel = qs('info-panel')
  panel.classList.remove('hidden', 'star-mode')
  const distEarth = body.id === 'earth' ? 0 : body.earthDistanceKm
  const shuttle = body.id === 'earth' ? 'Zaten Dünya’dasınız.' : shuttleTravel(distEarth)
  const light = body.id === 'earth' ? '—' : body.id === 'sun' ? lightTravel(AU_KM) : lightTravel(distEarth)

  panel.innerHTML = `
    <button type="button" class="panel-close" id="panel-close" aria-label="Paneli kapat">×</button>
    <p class="kicker">${body.typeLabel}</p>
    <h2>${body.name}</h2>
    <div class="flight-row">
      <span id="flight-status">${flying ? 'Uçuş başladı' : 'Keşif aracı hazır'}</span>
      <div class="track"><i id="flight-bar" style="width:${Math.round(progress * 100)}%"></i></div>
    </div>
    <dl class="facts">
      <div><dt>Çap</dt><dd>${formatKm(body.diameterKm)}</dd></div>
      <div><dt>Kütle</dt><dd>${formatScientific(body.massKg)} kg<br><small>${formatNumber(body.massEarth, body.massEarth >= 10 ? 0 : 3)} Dünya kütlesi</small></dd></div>
      <div><dt>Güneş’e uzaklık</dt><dd>${body.id === 'sun' ? '—' : `${formatKm(body.distanceKm)} · ${formatAu(body.distanceAu)}`}</dd></div>
      <div><dt>Yörünge dönemi</dt><dd>${body.orbitalPeriodText}</dd></div>
      <div><dt>Bir günün süresi</dt><dd>${body.dayLengthText}</dd></div>
      <div><dt>Sıcaklık</dt><dd>${body.temperatureText}</dd></div>
      <div><dt>Yerçekimi</dt><dd>${formatNumber(body.gravityMs2, 2)} m/s²<br><small>${formatNumber(body.gravityEarth, 2)} g</small></dd></div>
      <div><dt>Uydu sayısı</dt><dd>${body.moons.count}</dd></div>
    </dl>
    <section>
      <h3>Bileşim ve yapı</h3>
      <p>${body.composition}</p>
      <ul class="layers">${layerList(body.structure)}</ul>
    </section>
    <section>
      <h3>Uydular</h3>
      ${moonList(body.moons)}
    </section>
    <section class="travel">
      <h3>Dünya’dan yolculuk</h3>
      <p class="muted">Düz çizgi, sabit ${SHUTTLE_KM_S} km/s (New Horizons mertebesi). Gerçek görevler kütleçekim sapanı kullanır; süreler bu yüzden farklıdır.</p>
      <p><strong>Mekik (basit hesap):</strong> ${shuttle}</p>
      <p><strong>Işık hızı:</strong> ${light}</p>
      ${body.closestEarthKm && body.id !== 'earth' && body.id !== 'sun' ? `<p><small>En yakın yaklaşma ≈ ${formatKm(body.closestEarthKm)}; ortalama yörünge farkı ≈ ${formatKm(distEarth)}.</small></p>` : ''}
      ${missionList(body.missions)}
    </section>
    <section class="didyou">
      <h3>Biliyor muydun?</h3>
      <p>${body.funFact}</p>
    </section>
  `
  qs('panel-close').addEventListener('click', () => hidePanel())
  setFlightProgress(progress)
}

export function showStarInfo(star) {
  const panel = qs('info-panel')
  panel.classList.remove('hidden')
  panel.classList.add('star-mode')
  const rows = INTERSTELLAR_SPEEDS.map((s) => {
    const seconds = star.ly === 0 ? 0 : (star.ly * LY_KM) / s.kmS
    return `<tr><th>${s.label}</th><td>${star.ly === 0 ? '—' : formatDuration(seconds)}</td></tr>`
  }).join('')

  panel.innerHTML = `
    <button type="button" class="panel-close" id="panel-close" aria-label="Paneli kapat">×</button>
    <p class="kicker">${star.designation}</p>
    <h2>${star.name}</h2>
    <dl class="facts">
      <div><dt>Uzaklık</dt><dd>${star.ly === 0 ? '0 (buradayız)' : `${formatNumber(star.ly, 2)} ışık yılı`}</dd></div>
      <div><dt>Tayf sınıfı</dt><dd>${star.spectral}</dd></div>
      <div><dt>Kütle</dt><dd>${formatNumber(star.massSun, 2)} Güneş kütlesi</dd></div>
      <div><dt>Yarıçap</dt><dd>${formatNumber(star.radiusSun, 2)} Güneş yarıçapı</dd></div>
      <div><dt>Yüzey sıcaklığı</dt><dd>${formatNumber(star.tempK, 0)} K</dd></div>
      <div><dt>Gezegenler</dt><dd>${star.planets}</dd></div>
    </dl>
    <p>${star.note}</p>
    <section class="travel">
      <h3>Yolculuk karşılaştırması</h3>
      <p class="muted">Işık yılı = ışığın bir yılda aldığı yol (~9,46 trilyon km). Voyager 1 hâlâ Güneş Sistemi’nden ~17 km/s ile uzaklaşıyor.</p>
      <table class="speed-table">${rows}</table>
    </section>
    <section class="didyou">
      <h3>Biliyor muydun?</h3>
      <p>${star.fact}</p>
    </section>
  `
  qs('panel-close').addEventListener('click', () => hidePanel())
}

export function hidePanel() {
  qs('info-panel').classList.add('hidden')
}

export function setScaleBanner(mode, interstellar = false) {
  const el = qs('scale-banner')
  if (interstellar) {
    el.innerHTML = `<strong>Yıldızlararası görünüm.</strong> Çemberler ışık yılı halkalarıdır; uzaklık log₂(1+IY) ile sıkıştırılmıştır. Gerçek süreler sağdaki tablodadır.`
    return
  }
  if (mode === 'visual') {
    el.innerHTML = `<strong>Görsel ölçek.</strong> Gezegenler okunabilsin diye çaplar abartıldı, uzaklıklar sıkıştırıldı. Gerçekte Neptün, Merkür’den ~78 kat uzaktır ve Güneş’in yanında Dünya bir nohut tanesidir.`
  } else {
    el.innerHTML = `<strong>Gerçekçi ölçek.</strong> 1 AB = 48 sahne birimi; çaplar orantılı. Güneş küçük bir top, gezegenler neredeyse nokta — uzayın asıl dersi boşluktur. Yakınlaştırmak için iki parmak veya tekerlek kullanın.`
  }
}

export function setModeButtons({ interstellar, scale, paused, daysPerSecond }) {
  qs('btn-stars').classList.toggle('on', interstellar)
  qs('btn-stars').textContent = interstellar ? 'Güneş Sistemi' : 'Yıldızlararası'
  qs('btn-scale').classList.toggle('on', scale === 'realistic')
  qs('btn-scale').textContent = scale === 'realistic' ? 'Görsel ölçek' : 'Gerçekçi ölçek'
  qs('btn-pause').classList.toggle('on', paused)
  qs('btn-pause').textContent = paused ? 'Sürdür' : 'Duraklat'
  qs('btn-scale').disabled = interstellar
  qs('planet-dock').classList.toggle('hidden', interstellar)
  qs('star-dock').classList.toggle('hidden', !interstellar)
  qs('hint').classList.toggle('hidden', false)
  qs('hint').textContent = interstellar
    ? 'Bir yıldıza dokunun. Çemberler ışık yılı halkalarıdır (logaritmik).'
    : 'Bir gezegene dokunun: keşif aracı oraya uçar, kamera onu izler.'
  updateTimeReadout(daysPerSecond, paused)
}

export function updateTimeReadout(daysPerSecond, paused) {
  const out = qs('time-readout')
  const slider = qs('time-speed')
  if (!out || !slider) return
  out.textContent = formatSimRate(daysPerSecond, { paused })
  slider.setAttribute('aria-valuenow', slider.value)
  slider.setAttribute(
    'aria-valuetext',
    formatSimRate(paused ? 0 : daysPerSecond, { paused: paused || daysPerSecond <= 0 }),
  )
}

export function buildStarDock() {
  const dock = qs('star-dock')
  dock.innerHTML = ''
  for (const s of nearbyStars) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'planet-chip type-star'
    btn.dataset.id = s.id
    btn.innerHTML = `<i style="background:${s.color}"></i><span>${s.name}</span>`
    dock.appendChild(btn)
  }
}

export function bindHud(handlers) {
  buildPlanetDock()
  buildStarDock()
  qs('planet-dock').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-id]')
    if (btn) handlers.onSelectBody(btn.dataset.id)
  })
  qs('star-dock').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-id]')
    if (btn) handlers.onSelectStar(btn.dataset.id)
  })
  qs('btn-stars').addEventListener('click', () => handlers.onToggleInterstellar())
  qs('btn-scale').addEventListener('click', () => handlers.onToggleScale())
  qs('btn-pause').addEventListener('click', () => handlers.onTogglePause())
  qs('btn-help').addEventListener('click', () => handlers.onToggleHelp())
  qs('help-close').addEventListener('click', () => handlers.onToggleHelp(false))
  qs('welcome-go').addEventListener('click', () => handlers.onDismissWelcome())

  const slider = qs('time-speed')
  slider.value = String(daysToSlider(TIME_DEFAULT_DAYS))
  const applySlider = () => handlers.onTimeSpeed(sliderToDays(slider.value))
  slider.addEventListener('input', applySlider)
  slider.addEventListener('change', applySlider)
  // Kaydırıcı dokunuşu sahneye (yörünge kamerası) gitmesin.
  qs('time-control').addEventListener('pointerdown', (e) => e.stopPropagation())
}

export function showWelcome(show) {
  qs('welcome').classList.toggle('hidden', !show)
}

export function showHelp(show) {
  qs('help-card').classList.toggle('hidden', !show)
}
