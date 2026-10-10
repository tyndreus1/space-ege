/**
 * Güneş Sistemi sahnesi.
 *
 * İki ölçek:
 *  - görsel: sınıf tahtasında gezegenler seçilebilir, yörüngeler iç içe okunur
 *  - gerçekçi: çaplar ve AB uzaklıkları orantılıdır (gezegenler neredeyse nokta)
 *
 * Yörünge konumları Kepler denklemiyle her karede güncellenir.
 */

import * as THREE from 'three'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { bodies } from '../data/bodies.js'
import { keplerPosition } from './kepler.js'
import { makeGlowSprite } from './textures.js'

const DEG = Math.PI / 180
const AU_KM = 149_597_870.7

/** Görsel ölçek: sıkıştırılmış AB, abartılmış yarıçap. */
export function visualOrbit(au) {
  return 9.5 + au ** 0.58 * 17.4
}

export function visualRadius(diameterKm, isStar) {
  if (isStar) return 6.4
  const ratio = diameterKm / 12756
  return 0.42 + ratio ** 0.42 * 1.12
}

/**
 * Gerçekçi ölçek: 1 AB = 48 birim.
 * Güneş yarıçapı ≈ 0,00465 AB → ~0,22 birim. Gezegenler nokta kalır.
 */
export const REAL_AU = 48

export function realOrbit(au) {
  return au * REAL_AU
}

export function realRadius(diameterKm) {
  return (diameterKm / 2 / AU_KM) * REAL_AU
}

function makeLabel(text, extraClass = '') {
  const el = document.createElement('div')
  el.className = `world-label ${extraClass}`
  el.textContent = text
  const obj = new CSS2DObject(el)
  obj.userData.el = el
  return obj
}

function orbitLine(semiMajor, e, inc, peri, color, closed = true) {
  const pts = []
  const steps = 160
  for (let i = 0; i <= steps; i += 1) {
    const M = (i / steps) * Math.PI * 2
    const p = keplerPosition(semiMajor, e, inc, peri, M)
    pts.push(new THREE.Vector3(p.x, p.y, p.z))
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts)
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.28,
  })
  const line = closed ? new THREE.LineLoop(geo, mat) : new THREE.Line(geo, mat)
  line.userData.kind = 'orbit'
  return line
}

function asteroidBelt(inner, outer) {
  const count = 700
  const pos = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    const a = inner + Math.random() * (outer - inner)
    const th = Math.random() * Math.PI * 2
    const y = (Math.random() - 0.5) * 0.5
    pos[i * 3] = Math.cos(th) * a
    pos[i * 3 + 1] = y
    pos[i * 3 + 2] = Math.sin(th) * a
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: 0xbba88a, size: 0.08, transparent: true, opacity: 0.7 }),
  )
  pts.name = 'asteroid-belt'
  return pts
}

export function createSolarSystem(textures) {
  const root = new THREE.Group()
  root.name = 'solar-system'

  const records = new Map()
  let scaleMode = 'visual'
  let simDays = 80 // Dünya'yı güzel bir açıda başlat

  const sunData = bodies.find((b) => b.id === 'sun')
  const sunGroup = new THREE.Group()
  sunGroup.name = 'sun'
  const sunRadius = visualRadius(sunData.diameterKm, true)
  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 32),
    new THREE.MeshBasicMaterial({ map: textures.sun }),
  )
  sunMesh.scale.setScalar(sunRadius)
  sunMesh.userData.bodyId = 'sun'
  sunMesh.userData.visualRadius = sunRadius
  sunGroup.add(sunMesh)

  const corona = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeGlowSprite(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  corona.scale.setScalar(sunRadius * 5.5)
  sunGroup.add(corona)

  const sunLight = new THREE.PointLight(0xffe6b0, 2.6, 0, 0.35)
  sunGroup.add(sunLight)
  const ambient = new THREE.AmbientLight(0x6b7a99, 0.28)
  root.add(ambient)
  // Eğitim notu: gerçek uzayda gölge tarafı çok daha karanlıktır; gezegenleri
  // okuyabilmek için hafif bir ortam ışığı ekliyoruz.

  const sunLabel = makeLabel('Güneş', 'star')
  sunLabel.position.y = sunRadius + 1.2
  sunGroup.add(sunLabel)

  const sunHit = new THREE.Mesh(
    new THREE.SphereGeometry(1, 8, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  )
  sunHit.scale.setScalar(sunRadius * 1.15)
  sunHit.userData.bodyId = 'sun'
  sunGroup.add(sunHit)
  root.add(sunGroup)

  records.set('sun', {
    data: sunData,
    group: sunGroup,
    mesh: sunMesh,
    hit: sunHit,
    label: sunLabel,
    moons: [],
  })

  const belt = asteroidBelt(visualOrbit(2.2), visualOrbit(3.2))
  root.add(belt)

  for (const data of bodies) {
    if (data.id === 'sun') continue

    const group = new THREE.Group()
    group.name = data.id

    const tilt = new THREE.Group()
    tilt.rotation.z = data.axialTiltDeg * DEG
    group.add(tilt)

    const radius = visualRadius(data.diameterKm, false)
    const map = textures[data.id]
    const mat = new THREE.MeshStandardMaterial({
      map,
      roughness: data.id === 'venus' ? 0.9 : 0.55,
      metalness: 0.05,
      emissive: new THREE.Color(data.visual.hue).multiplyScalar(0.04),
    })
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), mat)
    mesh.scale.setScalar(radius)
    mesh.userData.bodyId = data.id
    mesh.userData.visualRadius = radius
    mesh.rotation.z = 0
    tilt.add(mesh)

    if (data.id === 'saturn' || data.id === 'uranus') {
      const inner = data.id === 'saturn' ? 1.25 : 1.4
      const outer = data.id === 'saturn' ? 2.35 : 1.85
      const rings = new THREE.Mesh(
        new THREE.RingGeometry(inner, outer, 64),
        new THREE.MeshBasicMaterial({
          map: textures.rings,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: data.id === 'saturn' ? 0.92 : 0.35,
          depthWrite: false,
        }),
      )
      rings.rotation.x = Math.PI / 2
      if (data.id === 'uranus') rings.rotation.y = Math.PI / 2
      rings.scale.setScalar(radius)
      tilt.add(rings)
      group.userData.rings = rings
    }

    if (data.id === 'jupiter') {
      const faint = new THREE.Mesh(
        new THREE.RingGeometry(1.5, 1.85, 48),
        new THREE.MeshBasicMaterial({
          color: 0xc8b090,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
        }),
      )
      faint.rotation.x = Math.PI / 2
      faint.scale.setScalar(radius)
      tilt.add(faint)
    }

    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(1, 8, 8),
      new THREE.MeshBasicMaterial({ visible: false }),
    )
    hit.scale.setScalar(Math.max(radius * 1.8, 1.6))
    hit.userData.bodyId = data.id
    group.add(hit)

    const label = makeLabel(data.name, data.type === 'dwarf' ? 'dwarf' : '')
    label.position.y = radius + 0.85
    group.add(label)

    const moons = []
    const notables = data.moons?.notable ?? []
    notables.forEach((moon, index) => {
      const pivot = new THREE.Group()
      const mRadius = Math.max(0.08, visualRadius(moon.diameterKm, false) * 0.45)
      const tex = textures[moon.texture] || textures.moon
      const mMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 12),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }),
      )
      mMesh.scale.setScalar(mRadius)
      mMesh.userData.moonId = moon.id
      mMesh.userData.parentId = data.id
      mMesh.userData.visualRadius = mRadius
      const dist = radius + 0.55 + index * (0.42 + mRadius) + mRadius
      mMesh.position.x = dist
      pivot.add(mMesh)
      const mLabel = makeLabel(moon.name, 'moon')
      mLabel.position.set(dist, mRadius + 0.18, 0)
      pivot.add(mLabel)
      tilt.add(pivot)
      moons.push({
        pivot,
        mesh: mMesh,
        label: mLabel,
        data: moon,
        dist,
        angle: Math.random() * Math.PI * 2,
        period: Math.abs(moon.orbitDays) || 2,
        retrograde: (moon.orbitDays || 1) < 0,
      })
    })

    const a = visualOrbit(data.distanceAu)
    const line = orbitLine(
      a,
      data.eccentricity,
      data.inclinationDeg * DEG,
      data.perihelionDeg,
      new THREE.Color(data.visual.hue).getHex(),
    )
    root.add(line)
    root.add(group)

    records.set(data.id, {
      data,
      group,
      mesh,
      tilt,
      hit,
      label,
      moons,
      orbitLine: line,
      mean0: data.perihelionDeg + data.distanceAu * 1.7,
    })
  }

  function applyScale(mode) {
    scaleMode = mode
    const isVisual = mode === 'visual'
    belt.visible = isVisual

    for (const rec of records.values()) {
      const d = rec.data
      const isStar = d.id === 'sun'
      const radius = isVisual ? visualRadius(d.diameterKm, isStar) : Math.max(realRadius(d.diameterKm), isStar ? 0.22 : 0.012)
      rec.mesh.scale.setScalar(radius)
      rec.mesh.userData.visualRadius = radius
      const hitMin = isVisual ? 1.5 : 2.4
      rec.hit.scale.setScalar(Math.max(radius * (isVisual ? 1.8 : 40), hitMin))
      rec.label.position.y = radius + (isVisual ? 0.85 : 1.6)
      if (rec.group.userData.rings) rec.group.userData.rings.scale.setScalar(radius)

      rec.moons.forEach((m, index) => {
        const mR = isVisual
          ? Math.max(0.08, visualRadius(m.data.diameterKm, false) * 0.45)
          : Math.max(0.008, realRadius(m.data.diameterKm) * 4)
        m.mesh.scale.setScalar(mR)
        m.dist = radius + (isVisual ? 0.55 + index * 0.5 : 0.08 + index * 0.05) + mR
      })

      if (isStar) continue
      const a = isVisual ? visualOrbit(d.distanceAu) : realOrbit(d.distanceAu)
      const fresh = orbitLine(
        a,
        isVisual ? d.eccentricity : d.eccentricity,
        d.inclinationDeg * DEG,
        d.perihelionDeg,
        new THREE.Color(d.visual.hue).getHex(),
      )
      rec.orbitLine.geometry.dispose()
      rec.orbitLine.geometry = fresh.geometry
      rec.orbitLine.material.opacity = isVisual ? 0.28 : 0.18
    }

    const sunRec = records.get('sun')
    const sr = sunRec.mesh.userData.visualRadius
    sunRec.group.children.forEach((ch) => {
      if (ch.isSprite) ch.scale.setScalar(sr * (isVisual ? 5.5 : 8))
    })
  }

  /**
   * Tek saat: daysPerSecond, yörünge + dönüş + uydu hareketini birlikte ölçekler.
   * 0 = duraklat. Mekik uçuşu bu değeri kullanmaz (main.js gerçek dt kullanır).
   */
  function update(dt, daysPerSecond) {
    const step = Math.max(0, daysPerSecond) * dt
    simDays += step
    const tau = Math.PI * 2

    const sunRec = records.get('sun')
    const sunDay = Math.abs(sunRec.data.rotationHours) / 24
    sunRec.mesh.rotation.y += (tau / sunDay) * step

    for (const rec of records.values()) {
      const d = rec.data
      if (d.id === 'sun') continue
      const n = tau / d.periodDays
      const M = rec.mean0 + n * simDays
      const a = scaleMode === 'visual' ? visualOrbit(d.distanceAu) : realOrbit(d.distanceAu)
      const p = keplerPosition(a, d.eccentricity, d.inclinationDeg * DEG, d.perihelionDeg, M)
      rec.group.position.set(p.x, p.y, p.z)

      const daysPerSpin = Math.abs(d.rotationHours) / 24
      const dir = d.rotationHours < 0 ? -1 : 1
      rec.mesh.rotation.y += dir * (tau / daysPerSpin) * step

      rec.moons.forEach((m) => {
        m.angle += (m.retrograde ? -1 : 1) * (tau / m.period) * step
        m.mesh.position.set(Math.cos(m.angle) * m.dist, 0, Math.sin(m.angle) * m.dist)
        if (m.label) {
          m.label.position.set(m.mesh.position.x, m.mesh.scale.x + 0.18, m.mesh.position.z)
        }
      })
    }
  }

  function getWorldPosition(id, target = new THREE.Vector3()) {
    const rec = records.get(id)
    if (!rec) return target.set(0, 0, 0)
    rec.mesh.getWorldPosition(target)
    return target
  }

  function getRecord(id) {
    return records.get(id)
  }

  applyScale('visual')

  return {
    root,
    records,
    update,
    applyScale,
    getWorldPosition,
    getRecord,
    get scaleMode() {
      return scaleMode
    },
  }
}
