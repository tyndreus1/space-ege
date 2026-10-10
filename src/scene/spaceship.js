/**
 * Keşif aracı (öğrenci mekiği) ve uçuş eğrisi.
 *
 * Gemi, Three.js primitiflerinden (koni, kutu, silindir) kuruludur —
 * dış model dosyası yoktur, böylece statik sitede her şey tek pakettedir.
 * Uçuş yolu, Güneş'ten kaçınan karesel bir Bezier'dir.
 */

import * as THREE from 'three'

export function createSpaceship() {
  const ship = new THREE.Group()
  ship.name = 'kesif-araci'

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xecf3ff,
    metalness: 0.55,
    roughness: 0.28,
    emissive: 0x1a3048,
    emissiveIntensity: 0.2,
  })
  const accent = new THREE.MeshStandardMaterial({
    color: 0xffc857,
    metalness: 0.4,
    roughness: 0.35,
    emissive: 0xffc857,
    emissiveIntensity: 0.35,
  })
  const glass = new THREE.MeshStandardMaterial({
    color: 0x7ad7f0,
    metalness: 0.2,
    roughness: 0.1,
    emissive: 0x3aa0c8,
    emissiveIntensity: 0.4,
  })

  const body = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.85, 10), bodyMat)
  body.rotation.x = Math.PI / 2
  ship.add(body)

  const cabin = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), glass)
  cabin.position.z = 0.12
  cabin.scale.set(1, 0.7, 1.1)
  ship.add(cabin)

  const wingGeo = new THREE.BoxGeometry(0.85, 0.04, 0.28)
  const wings = new THREE.Mesh(wingGeo, accent)
  wings.position.z = -0.12
  ship.add(wings)

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.18), accent)
  tail.position.set(0, 0.12, -0.28)
  ship.add(tail)

  const engine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.11, 0.16, 10),
    new THREE.MeshStandardMaterial({
      color: 0x222833,
      emissive: 0x4db8ff,
      emissiveIntensity: 0.8,
    }),
  )
  engine.rotation.x = Math.PI / 2
  engine.position.z = -0.48
  ship.add(engine)

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.09, 0.35, 8),
    new THREE.MeshBasicMaterial({ color: 0x66ddff, transparent: true, opacity: 0.75 }),
  )
  flame.rotation.x = -Math.PI / 2
  flame.position.z = -0.72
  flame.name = 'flame'
  ship.add(flame)

  const light = new THREE.PointLight(0x88e0ff, 1.4, 8)
  light.position.z = -0.6
  ship.add(light)

  ship.scale.setScalar(1)
  ship.userData.flame = flame
  return ship
}

export function makeFlightCurve(from, to) {
  const mid = from.clone().lerp(to, 0.5)
  const dist = Math.max(from.distanceTo(to), 1)
  mid.y += dist * 0.38 + 10
  const side = new THREE.Vector3().subVectors(to, from)
  const up = new THREE.Vector3(0, 1, 0)
  const lateral = new THREE.Vector3().crossVectors(side, up)
  if (lateral.lengthSq() < 1e-6) lateral.set(1, 0, 0)
  lateral.normalize().multiplyScalar(dist * 0.22)
  mid.add(lateral)
  // Güneş’in içinden geçmesin diye yolu yörünge düzleminin üstünde tut.
  if (mid.length() < 18) mid.setLength(18)
  return new THREE.QuadraticBezierCurve3(from.clone(), mid, to.clone())
}

export function parkingOffset(planetMesh, camera) {
  const radius = planetMesh.userData.visualRadius || 1
  const dir = new THREE.Vector3(1, 0.35, 0.8).normalize()
  if (camera) {
    dir.copy(camera.position).sub(planetMesh.getWorldPosition(new THREE.Vector3())).normalize()
    dir.y = Math.abs(dir.y) * 0.4 + 0.25
  }
  return dir.multiplyScalar(radius * 2.4 + 1.2)
}
