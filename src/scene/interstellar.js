/**
 * Yıldızlararası mod: yakın yıldızlar, logaritmik uzaklık.
 *
 * Gerçek ışık yılı mesafelerini doğrusal çizmek imkânsızdır (Proxima 4 ly,
 * Vega 25 ly). log(1+ly) sıkıştırması, “daha uzak = daha dışta” ilişkisini
 * korur ama tahtaya sığdırır. Gerçek sayılar bilgi panelindedir.
 */

import * as THREE from 'three'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { nearbyStars } from '../data/stars.js'

function starGlow(hex, size = 64) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.18, hex)
  g.addColorStop(0.45, `${hex}55`)
  g.addColorStop(1, '#00000000')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function visualLy(ly) {
  if (ly <= 0) return 0
  return Math.log2(1 + ly) * 18
}

export function createInterstellar() {
  const root = new THREE.Group()
  root.name = 'interstellar'
  root.visible = false

  const records = new Map()

  // Ölçek halkaları (1, 4, 10, 25, 40 ly)
  ;[1, 4.24, 10, 25, 40].forEach((ly) => {
    const r = visualLy(ly)
    const pts = []
    for (let i = 0; i <= 80; i += 1) {
      const t = (i / 80) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(t) * r, 0, Math.sin(t) * r))
    }
    const ring = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x3d5a80, transparent: true, opacity: 0.35 }),
    )
    root.add(ring)
    const tag = document.createElement('div')
    tag.className = 'world-label scale-ly'
    tag.textContent = `${ly.toString().replace('.', ',')} IY`
    const tagObj = new CSS2DObject(tag)
    tagObj.position.set(r, 0.4, 0)
    root.add(tagObj)
  })

  for (const star of nearbyStars) {
    const group = new THREE.Group()
    const r = visualLy(star.ly)
    group.position.set(
      Math.cos(star.angle) * r,
      star.elev * (8 + r * 0.12),
      Math.sin(star.angle) * r,
    )

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: starGlow(star.color),
        color: 0xffffff,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    sprite.scale.setScalar(star.size * 1.8)
    sprite.userData.bodyId = star.id
    group.add(sprite)

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 16, 12),
      new THREE.MeshBasicMaterial({ color: star.color }),
    )
    core.scale.setScalar(star.size * 0.28)
    core.userData.bodyId = star.id
    group.add(core)

    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 8, 8),
      new THREE.MeshBasicMaterial({ visible: false }),
    )
    hit.userData.bodyId = star.id
    group.add(hit)

    const el = document.createElement('div')
    el.className = `world-label star ${star.id === 'sol' ? 'home' : ''}`
    el.innerHTML = `<strong>${star.name}</strong><span>${star.ly === 0 ? '0 IY' : `${star.ly.toString().replace('.', ',')} IY`}</span>`
    const label = new CSS2DObject(el)
    label.position.y = star.size * 0.7 + 0.8
    group.add(label)

    if (star.hasPlanet) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0x88c0ff, roughness: 0.5, emissive: 0x224466 }),
      )
      p.position.set(1.1, 0.15, 0.2)
      group.add(p)
      const orbit = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(
          Array.from({ length: 40 }, (_, i) => {
            const t = (i / 40) * Math.PI * 2
            return new THREE.Vector3(Math.cos(t) * 1.15, 0.05, Math.sin(t) * 1.15)
          }),
        ),
        new THREE.LineBasicMaterial({ color: 0x88c0ff, transparent: true, opacity: 0.5 }),
      )
      group.add(orbit)
    }

    if (star.ly > 0) {
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), group.position.clone()]),
        new THREE.LineBasicMaterial({ color: 0x2a4a6a, transparent: true, opacity: 0.35 }),
      )
      line.userData.connector = true
      root.add(line)
    }

    root.add(group)
    records.set(star.id, { data: star, group, hit, sprite, core })
  }

  function getRecord(id) {
    return records.get(id)
  }

  return { root, records, getRecord }
}
