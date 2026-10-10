/**
 * Stilize 3B fırlatıcılar — yalnızca Three.js primitifleri.
 * İleri yön +Z (burun), egzoz −Z. Ölçek sahne biriminde ~1,6 gövde boyu.
 */

import * as THREE from 'three'

function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.45,
    roughness: 0.4,
    ...extra,
  })
}

function cyl(rTop, rBot, h, material, y) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 14), material)
  m.position.y = y
  return m
}

/** Modeller +Y boyunca “ayakta” kurulur, sonra +Z burnuna çevrilir. */
function uprightToForward(group) {
  group.rotation.x = Math.PI / 2
}

function addFlame(group, z, scale = 1) {
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.08 * scale, 0.42 * scale, 8),
    new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.85 }),
  )
  flame.rotation.x = -Math.PI / 2
  flame.position.z = z
  flame.name = 'flame'
  flame.visible = false
  group.add(flame)
  const light = new THREE.PointLight(0xffaa55, 1.6, 10)
  light.position.z = z + 0.1
  light.name = 'engineLight'
  light.visible = false
  group.add(light)
  group.userData.flame = flame
  group.userData.engineLight = light
}

function addFins(parent, y, color = 0x334155) {
  for (let i = 0; i < 4; i += 1) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.03), mat(color))
    const a = (i / 4) * Math.PI * 2
    fin.position.set(Math.cos(a) * 0.2, y, Math.sin(a) * 0.2)
    fin.lookAt(0, y, 0)
    parent.add(fin)
  }
}

function wrap(builder) {
  const inner = new THREE.Group()
  builder(inner)
  const root = new THREE.Group()
  uprightToForward(inner)
  root.add(inner)
  root.userData.stack = inner
  return root
}

function makeV2() {
  return wrap((g) => {
    g.add(cyl(0.02, 0.16, 0.45, mat(0xc4b8a8), 0.7))
    g.add(cyl(0.16, 0.16, 0.7, mat(0x6b7280), 0.12))
    addFins(g, -0.28, 0x374151)
    g.add(cyl(0.12, 0.14, 0.16, mat(0x1f2937), -0.48))
  })
}

function makeSaturnV() {
  return wrap((g) => {
    const white = mat(0xf4f1ea)
    const black = mat(0x1a1a1a)
    g.add(cyl(0.05, 0.18, 0.35, white, 1.05))
    g.add(cyl(0.18, 0.18, 0.4, black, 0.68))
    g.add(cyl(0.2, 0.2, 0.55, white, 0.2))
    const s1 = cyl(0.22, 0.22, 0.7, black, -0.4)
    s1.name = 'stage-0'
    g.add(s1)
    g.userData.drop = [s1]
  })
}

function makeShuttle() {
  return wrap((g) => {
    const tank = cyl(0.14, 0.16, 1.35, mat(0xf97316), 0.1)
    g.add(tank)
    const orb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.12), mat(0xe5e7eb))
    orb.position.set(0.16, 0.05, 0)
    g.add(orb)
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.02), mat(0xd1d5db))
    wing.position.set(0.22, -0.15, 0)
    g.add(wing)
    for (const x of [-0.2, 0.2]) {
      const srb = cyl(0.07, 0.07, 1.1, mat(0xe7e5e4), 0.0)
      srb.position.x = x
      srb.position.z = -0.02
      g.add(srb)
    }
  })
}

function makeSoyuz() {
  return wrap((g) => {
    g.add(cyl(0.08, 0.14, 0.35, mat(0xd6d3d1), 0.7))
    g.add(cyl(0.14, 0.14, 0.55, mat(0xe7e5e4), 0.25))
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2 + 0.4
      const b = cyl(0.07, 0.09, 0.55, mat(0xf8fafc), -0.15)
      b.position.set(Math.cos(a) * 0.18, -0.05, Math.sin(a) * 0.18)
      b.rotation.z = Math.cos(a) * 0.15
      b.name = 'booster'
      g.add(b)
    }
    g.add(cyl(0.12, 0.14, 0.2, mat(0x1f2937), -0.45))
  })
}

function makeFalcon() {
  return wrap((g) => {
    g.add(cyl(0.05, 0.13, 0.28, mat(0x111827), 0.95))
    g.add(cyl(0.13, 0.13, 0.7, mat(0xf9fafb), 0.46))
    const inter = cyl(0.13, 0.13, 0.12, mat(0x111827), 0.05)
    g.add(inter)
    const s1 = cyl(0.13, 0.13, 0.85, mat(0xf3f4f6), -0.42)
    s1.name = 'stage-0'
    g.add(s1)
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2
      const grid = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.02), mat(0x4b5563))
      grid.position.set(Math.cos(a) * 0.14, -0.15, Math.sin(a) * 0.14)
      g.add(grid)
    }
    g.userData.drop = [s1]
  })
}

function makeStarship() {
  return wrap((g) => {
    const ship = cyl(0.04, 0.2, 0.7, mat(0xd6d3d1, { metalness: 0.8, roughness: 0.25 }), 0.7)
    g.add(ship)
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.02), mat(0xa8a29e, { metalness: 0.7 }))
    flap.position.set(0, 0.55, 0.12)
    g.add(flap)
    const heavy = cyl(0.22, 0.22, 0.95, mat(0xc4c0b8, { metalness: 0.75 }), -0.2)
    heavy.name = 'stage-0'
    g.add(heavy)
    g.userData.drop = [heavy]
  })
}

function makeDeltaV() {
  return wrap((g) => {
    g.add(cyl(0.04, 0.11, 0.3, mat(0xe11d48), 0.72))
    g.add(cyl(0.11, 0.11, 0.45, mat(0xe5e7eb), 0.35))
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.005), mat(0xe30a17))
    flag.position.set(0.12, 0.4, 0)
    g.add(flag)
    const s1 = cyl(0.12, 0.13, 0.55, mat(0x1e3a5f), -0.18)
    s1.name = 'stage-0'
    g.add(s1)
    addFins(g, -0.38, 0xe11d48)
    g.userData.drop = [s1]
  })
}

const makers = {
  v2: makeV2,
  saturnv: makeSaturnV,
  shuttle: makeShuttle,
  soyuz: makeSoyuz,
  falcon9: makeFalcon,
  starship: makeStarship,
  deltav: makeDeltaV,
}

export function createRocket(id) {
  const fn = makers[id] || makeFalcon
  const rocket = fn()
  rocket.name = `rocket-${id}`
  rocket.userData.rocketId = id
  const zMin = -0.85
  addFlame(rocket, zMin, id === 'starship' || id === 'saturnv' ? 1.4 : 1)
  rocket.userData.enginePos = new THREE.Vector3(0, 0, zMin)
  return rocket
}

/**
 * Düşük maliyetli egzoz: nokta bulutu, itki açıkken burun tersine fışkırır.
 */
export function createExhaust() {
  const n = 90
  const pos = new Float32Array(n * 3)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xffc07a,
      size: 0.12,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    }),
  )
  const vel = Array.from({ length: n }, () => new THREE.Vector3())
  const life = new Float32Array(n)
  return {
    points,
    spawn(origin, back, power) {
      points.material.opacity = power > 0.05 ? 0.7 : 0
      for (let i = 0; i < n; i += 1) {
        if (life[i] > 0) continue
        if (Math.random() > power) continue
        life[i] = 0.35 + Math.random() * 0.25
        pos[i * 3] = origin.x
        pos[i * 3 + 1] = origin.y
        pos[i * 3 + 2] = origin.z
        vel[i].copy(back).multiplyScalar(4 + Math.random() * 6)
        vel[i].x += (Math.random() - 0.5) * 1.4
        vel[i].y += (Math.random() - 0.5) * 1.4
        break
      }
    },
    update(dt) {
      for (let i = 0; i < n; i += 1) {
        if (life[i] <= 0) continue
        life[i] -= dt
        pos[i * 3] += vel[i].x * dt
        pos[i * 3 + 1] += vel[i].y * dt
        pos[i * 3 + 2] += vel[i].z * dt
        if (life[i] <= 0) {
          pos[i * 3] = pos[i * 3 + 1] = pos[i * 3 + 2] = 0
        }
      }
      geo.attributes.position.needsUpdate = true
    },
  }
}
