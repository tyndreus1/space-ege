/**
 * Arka plan yıldız alanı.
 * Gerçek takımyıldız haritası değil: derinlik duygusu için üç katmanlı
 * rastgele yıldızlar (renk sıcaklığına göre hafif mavi/sarı).
 */

import * as THREE from 'three'

function layer(count, radius, size, seed) {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  let s = seed
  const rand = () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
  for (let i = 0; i < count; i += 1) {
    const z = rand() * 2 - 1
    const t = rand() * Math.PI * 2
    const r = Math.sqrt(1 - z * z)
    positions[i * 3] = r * Math.cos(t) * radius
    positions[i * 3 + 1] = z * radius
    positions[i * 3 + 2] = r * Math.sin(t) * radius
    const temp = rand()
    if (temp < 0.15) {
      colors.set([0.65, 0.78, 1], i * 3)
    } else if (temp > 0.85) {
      colors.set([1, 0.86, 0.62], i * 3)
    } else {
      const g = 0.88 + rand() * 0.12
      colors.set([g, g, g], i * 3)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const mat = new THREE.PointsMaterial({
    size,
    vertexColors: true,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  })
  return new THREE.Points(geo, mat)
}

export function createStarfield() {
  const group = new THREE.Group()
  group.name = 'starfield'
  group.add(layer(1800, 420, 0.55, 13))
  group.add(layer(900, 520, 0.95, 29))
  group.add(layer(80, 380, 2.1, 47))
  return group
}
