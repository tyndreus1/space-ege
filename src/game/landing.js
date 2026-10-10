/**
 * İniş / yörüngeye oturma — kayaçlarda yüzey, gaz/buz devlerinde atmosfer.
 */

import * as THREE from 'three'

const GAS = new Set(['jupiter', 'saturn', 'uranus', 'neptune'])

export function landingKind(id, kind) {
  if (id === 'sun') return 'sun'
  if (kind === 'star') return 'star'
  if (kind === 'moon') return 'moon'
  if (GAS.has(id)) return 'gas'
  return 'rocky'
}

export function landingCopy(kind, name) {
  if (kind === 'gas') {
    return {
      title: `${name} yörüngesine oturdu`,
      detail:
        'Gaz ve buz devlerinin katı bir yüzeyi yoktur; gördüğünüz renkli bantlar kalın atmosferdir. Gerçek görevler (Juno, Cassini) yüksek hızla “atmosfer girişi” yapmaz, yörüngeye oturur veya kontrollü dalışla sonlanır. Sen yavaşça yörüngeye girdin.',
      verb: 'Yörüngeye oturma',
    }
  }
  if (kind === 'moon') {
    return {
      title: `${name} yüzeyine iniş`,
      detail: 'Uydu yüzeyine yumuşak dokunuş. Ay’da Apollo, diğer uydularda genelde yörünge veya uçuş (flyby) tercih edilir.',
      verb: 'Yüzey inişi',
    }
  }
  if (kind === 'star') {
    return {
      title: `${name} sistemine varış`,
      detail: 'Yıldıza inilmez; sistemin iç kenarına ulaştın. Işık yılı mesafeleri mekik ekranındaki tablodadır.',
      verb: 'Sisteme varış',
    }
  }
  return {
    title: `${name} yüzeyine iniş`,
    detail: 'Kayaç dünyalarda iniş, hızı kesip yüzeye dik yaklaşmayı ister. Sen bağışlayıcı bir eğitim inişi yaptın.',
    verb: 'Yüzey inişi',
  }
}

/**
 * 4 saniyelik otomatik iniş: hizala, yavaşla, otur.
 * rocky/moon: yüzey + küçük ofset. gas: 1,28 R yörünge. star: 2,2 R park.
 */
export function tickLanding(landing, dt) {
  landing.t += dt / landing.duration
  const u = Math.min(1, landing.t)
  const e = u * u * (3 - 2 * u)
  landing.mesh.getWorldPosition(landing.live)
  const radial = landing.start.clone().sub(landing.center0)
  // Hedef merkez hareket eder (gezegen yörüngede).
  const nowRadial = radial.lengthSq() < 1e-6 ? new THREE.Vector3(1, 0.2, 0.3) : radial.clone()
  nowRadial.normalize()
  const dest = landing.live.clone().addScaledVector(nowRadial, landing.parkRadius)
  landing.rocket.position.lerpVectors(landing.start, dest, e)
  const q = new THREE.Quaternion()
  if (landing.kind === 'gas' || landing.kind === 'star') {
    const tangent = new THREE.Vector3().crossVectors(nowRadial, new THREE.Vector3(0, 1, 0))
    if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0)
    tangent.normalize()
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent)
  } else {
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nowRadial.clone().multiplyScalar(-1))
  }
  landing.rocket.quaternion.slerp(q, 0.12 + e * 0.5)
  return u
}

export function startLanding(rocket, mesh, kind) {
  const center = mesh.getWorldPosition(new THREE.Vector3())
  const r = mesh.userData.visualRadius || 1
  const park =
    kind === 'gas' ? r * 1.32 + 0.55 : kind === 'star' ? r * 2.1 + 1.2 : r + 0.42
  return {
    t: 0,
    duration: 4.1,
    rocket,
    mesh,
    kind,
    start: rocket.position.clone(),
    center0: center.clone(),
    live: center.clone(),
    parkRadius: park,
  }
}
