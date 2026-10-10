/**
 * Mekik ekranı — pilota gömülü görev bilgisayarı (MK-12).
 *
 * Yaklaştıkça kilitler açılır (tarama → özlük → yapı → tam dosya).
 * Otomatik uçuştaki sağ panelin oyun içi karşılığıdır; her karede
 * innerHTML yazılmaz, bant veya hedef değişince yenilenir.
 */

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
} from '../utils/format.js'
import { layerList, moonList, missionList, qs } from './hud.js'

function lock(text = 'TARAMA…') {
  return `<span class="scan-lock">${text}</span>`
}

function expandBtn() {
  return `<button type="button" class="cock-expand" data-cock-expand aria-label="Mekik ekranını büyüt">Ekran</button>`
}

/**
 * approach: 0 uzak, 1 varış. distScene: sahne birimi.
 */
export function renderCockpit(target, { approach = 0, distScene = 0, arrived = false, kind = 'planet' } = {}) {
  const el = qs('cockpit')
  if (!el) return
  const a = arrived ? 1 : Math.max(0, Math.min(1, approach))
  const band = arrived || a >= 0.92 ? 4 : a < 0.22 ? 0 : a < 0.45 ? 1 : a < 0.7 ? 2 : 3
  const id = target?.id || 'none'
  const sig = `${kind}|${id}|${band}|${arrived ? 1 : 0}|${Math.round(distScene)}`
  const meter = el.querySelector('.scan-meter i')
  if (el.dataset.sig === sig && meter) {
    meter.style.width = `${Math.round(a * 100)}%`
    const range = el.querySelector('.cock-range')
    if (range) {
      range.textContent = `Mesafe (sahne): ${formatNumber(distScene, 1)} · tarama %${Math.round(a * 100)}`
    }
    return
  }
  el.dataset.sig = sig

  if (!target) {
    el.innerHTML = `
      <header class="cock-head">
        <p>MEKİK BİLGİSAYARI · MK-12</p>
        ${expandBtn()}
        <h2>Hedef kilitli değil</h2>
        <p class="muted">Şeritten veya sahneden bir gezegen seç. Ok hedefi gösterir; yaklaştıkça veri açılır.</p>
      </header>`
    return
  }

  if (kind === 'star') {
    renderStarCockpit(el, target, a, arrived, distScene)
    return
  }
  if (kind === 'moon') {
    renderMoonCockpit(el, target, a, arrived, distScene, band)
    return
  }

  const body = target
  const distEarth = body.id === 'earth' ? 0 : body.earthDistanceKm || 0
  const shuttle = body.id === 'earth' ? 'Zaten Dünya’dasınız.' : shuttleTravel(distEarth)
  const light = body.id === 'earth' ? '—' : body.id === 'sun' ? lightTravel(AU_KM) : lightTravel(distEarth)

  el.innerHTML = `
    <header class="cock-head">
      <p>MEKİK BİLGİSAYARI · MK-12 · ${arrived || band >= 4 ? 'KİLİT / VARIŞ' : 'YAKLAŞMA TARAMASI'}</p>
      ${expandBtn()}
      <div class="scan-meter" aria-hidden="true"><i style="width:${Math.round(a * 100)}%"></i></div>
      <h2>${body.name}</h2>
      <p class="kicker">${body.typeLabel}</p>
      <p class="cock-range">Mesafe (sahne): ${formatNumber(distScene, 1)} · tarama %${Math.round(a * 100)}</p>
    </header>
    <dl class="facts cock-facts">
      <div><dt>Çap</dt><dd>${band >= 1 ? formatKm(body.diameterKm) : lock()}</dd></div>
      <div><dt>Kütle</dt><dd>${band >= 1 ? `${formatScientific(body.massKg)} kg` : lock()}</dd></div>
      <div><dt>Güneş’e uzaklık</dt><dd>${band >= 1 ? (body.id === 'sun' ? '—' : `${formatKm(body.distanceKm)} · ${formatAu(body.distanceAu)}`) : lock()}</dd></div>
      <div><dt>Yerçekimi</dt><dd>${band >= 2 ? `${formatNumber(body.gravityMs2, 2)} m/s² · ${formatNumber(body.gravityEarth, 2)} g` : lock()}</dd></div>
      <div><dt>Sıcaklık</dt><dd>${band >= 2 ? body.temperatureText : lock()}</dd></div>
      <div><dt>Yörünge / gün</dt><dd>${band >= 2 ? `${body.orbitalPeriodText}<br><small>${body.dayLengthText}</small>` : lock()}</dd></div>
      <div><dt>Uydu</dt><dd>${band >= 2 ? body.moons.count : lock()}</dd></div>
      <div><dt>Yolculuk (16 km/s)</dt><dd>${band >= 3 ? shuttle : lock('hesaplanıyor')}</dd></div>
    </dl>
    <section>
      <h3>Bileşim / yapı</h3>
      ${band >= 3 ? `<p>${body.composition}</p><ul class="layers">${layerList(body.structure)}</ul>` : `<p class="muted">${lock('spektrometre yetersiz')}</p>`}
    </section>
    <section>
      <h3>Uydular</h3>
      ${band >= 4 ? moonList(body.moons) : `<p class="muted">${lock('optik çözünürlük düşük')}</p>`}
    </section>
    <section class="travel">
      <h3>Dünya’dan süre</h3>
      ${band >= 4 ? `<p class="muted">Düz çizgi, ${SHUTTLE_KM_S} km/s. Gerçek görevler sapan kullanır.</p>
        <p><strong>Mekik:</strong> ${shuttle} · <strong>Işık:</strong> ${light}</p>
        ${missionList(body.missions)}` : `<p class="muted">${band >= 3 ? `Tahmini mekik süresi: <strong>${shuttle}</strong>. Tam arşiv varışta.` : lock()}</p>`}
    </section>
    <section class="didyou">
      <h3>Biliyor muydun?</h3>
      ${band >= 4 ? `<p>${body.funFact}</p>` : `<p class="muted">Yaklaş; veri paketi varışta açılır.</p>`}
    </section>
  `
}

function renderMoonCockpit(el, moon, a, arrived, distScene, band) {
  el.innerHTML = `
    <header class="cock-head">
      <p>MEKİK BİLGİSAYARI · MK-12 · UYDU KİLİDİ</p>
      ${expandBtn()}
      <div class="scan-meter"><i style="width:${Math.round(a * 100)}%"></i></div>
      <h2>${moon.name}</h2>
      <p class="kicker">${moon.parentName} uydusu</p>
      <p class="cock-range">Mesafe (sahne): ${formatNumber(distScene, 1)} · tarama %${Math.round(a * 100)}</p>
    </header>
    <dl class="facts cock-facts">
      <div><dt>Çap</dt><dd>${band >= 1 ? formatKm(moon.diameterKm) : lock()}</dd></div>
      <div><dt>Yörünge</dt><dd>${band >= 2 ? `${formatNumber(moon.orbitDays, 2)} gün` : lock()}</dd></div>
    </dl>
    <section class="didyou">
      <h3>Biliyor muydun?</h3>
      ${band >= 4 ? `<p>${moon.note}</p>` : `<p class="muted">Yaklaş; uydu dosyası varışta açılır.</p>`}
    </section>
  `
}

function renderStarCockpit(el, star, a, arrived, distScene) {
  const band = arrived ? 4 : a < 0.4 ? 1 : a < 0.75 ? 2 : 3
  const rows = INTERSTELLAR_SPEEDS.map((s) => {
    const seconds = star.ly === 0 ? 0 : (star.ly * LY_KM) / s.kmS
    return `<tr><th>${s.label}</th><td>${star.ly === 0 ? '—' : formatDuration(seconds)}</td></tr>`
  }).join('')
  el.innerHTML = `
    <header class="cock-head">
      <p>MEKİK BİLGİSAYARI · YILDIZ KİLİDİ</p>
      ${expandBtn()}
      <div class="scan-meter"><i style="width:${Math.round((arrived ? 1 : a) * 100)}%"></i></div>
      <h2>${star.name}</h2>
      <p class="kicker">${star.designation}</p>
      <p class="cock-range">Mesafe (sahne): ${formatNumber(distScene, 1)}</p>
    </header>
    <dl class="facts cock-facts">
      <div><dt>Uzaklık</dt><dd>${band >= 1 ? (star.ly === 0 ? '0' : `${formatNumber(star.ly, 2)} IY`) : lock()}</dd></div>
      <div><dt>Tayf</dt><dd>${band >= 1 ? star.spectral : lock()}</dd></div>
      <div><dt>Kütle</dt><dd>${band >= 2 ? `${formatNumber(star.massSun, 2)} M☉` : lock()}</dd></div>
      <div><dt>Gezegenler</dt><dd>${band >= 2 ? star.planets : lock()}</dd></div>
    </dl>
    ${band >= 3 ? `<table class="speed-table">${rows}</table>` : ''}
    <section class="didyou"><h3>Biliyor muydun?</h3>
      ${band >= 4 ? `<p>${star.fact}</p>` : `<p class="muted">Yıldız sistemine girince arşiv açılır.</p>`}
    </section>
  `
}

export function setCockpitOpen(open) {
  const el = qs('cockpit')
  if (!el) return
  el.classList.toggle('hidden', !open)
  if (!open) el.classList.remove('cockpit-full')
}

export function bindCockpit() {
  const el = qs('cockpit')
  if (!el || el.dataset.bound) return
  el.dataset.bound = '1'
  el.addEventListener('click', (e) => {
    if (!e.target.closest('[data-cock-expand]')) return
    el.classList.toggle('cockpit-full')
    const btn = el.querySelector('[data-cock-expand]')
    if (btn) btn.textContent = el.classList.contains('cockpit-full') ? 'Küçült' : 'Ekran'
  })
}

export { nearbyStars }
