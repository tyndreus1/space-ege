/**
 * Öğrenci pilotu — bağışlayıcı, yavaş, 12 yaş için.
 *
 * İtki seviyesi (1–5) tavan hızı sınırlar; fren hızı keser; yön yumuşak
 * sönümlenir. Gerçek Hohmann yoktur. Mekik otomatik Bezier bu dosyayı kullanmaz.
 */

import * as THREE from 'three'

const _fwd = new THREE.Vector3()
const _up = new THREE.Vector3()
const _right = new THREE.Vector3()
const _target = new THREE.Vector3()
const _engine = new THREE.Vector3()
const _back = new THREE.Vector3()
const _hitPos = new THREE.Vector3()

/** İtki kademeleri — HUD ve kaydırıcı aynı etiketleri kullanır. */
export const THROTTLE_LEVELS = [
  { level: 1, label: 'Yavaş', scale: 0.28 },
  { level: 2, label: 'Düşük', scale: 0.46 },
  { level: 3, label: 'Orta', scale: 0.64 },
  { level: 4, label: 'Seyir', scale: 0.82 },
  { level: 5, label: 'Tam', scale: 1 },
]

/** Sahne birimi/s — iniş için bağışlayıcı tavan (itki 2× ile orantılı). */
export const SAFE_LAND_SPEED = 2.7

export function throttleInfo(level) {
  return THROTTLE_LEVELS.find((t) => t.level === level) || THROTTLE_LEVELS[2]
}

export function createPilot(rocket, stats) {
  const g = stats.game
  return {
    rocket,
    stats,
    velocity: new THREE.Vector3(),
    fuel: g.fuel,
    fuelMax: g.fuel,
    altitude: 0,
    speed: 0,
    thrusting: false,
    boosting: false,
    braking: false,
    autopilot: false,
    cruise: false,
    launched: false,
    staged: false,
    failed: false,
    yaw: 0,
    pitch: 0,
    steerYaw: 0,
    steerPitch: 0,
    throttleLevel: 3,
  }
}

export function resetPilot(pilot, position, lookPoint) {
  pilot.rocket.position.copy(position)
  if (lookPoint) {
    const up = position.clone().sub(lookPoint).normalize()
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), up)
    pilot.rocket.quaternion.copy(q)
  }
  pilot.velocity.set(0, 0, 0)
  pilot.fuel = pilot.fuelMax
  pilot.thrusting = false
  pilot.boosting = false
  pilot.braking = false
  pilot.autopilot = false
  pilot.cruise = false
  pilot.launched = false
  pilot.staged = false
  pilot.failed = false
  pilot.yaw = 0
  pilot.pitch = 0
  pilot.steerYaw = 0
  pilot.steerPitch = 0
}

export function bumpThrottle(pilot, delta) {
  pilot.throttleLevel = THREE.MathUtils.clamp((pilot.throttleLevel || 3) + delta, 1, 5)
  return throttleInfo(pilot.throttleLevel)
}

/**
 * input: { thrust, boost, brake, yaw, pitch, autopilot, cruise, throttleLevel }
 */
export function updatePilot(pilot, input, world) {
  const { dt, targetPos, earthPos, fuelMode, freeze } = world
  const g = pilot.stats.game
  const rocket = pilot.rocket
  if (input.throttleLevel) pilot.throttleLevel = input.throttleLevel
  const info = throttleInfo(pilot.throttleLevel)

  rocket.getWorldDirection(_fwd)
  _up.set(0, 1, 0)
  _right.crossVectors(_fwd, _up)
  if (_right.lengthSq() < 1e-6) _right.set(1, 0, 0)
  _right.normalize()
  _up.crossVectors(_right, _fwd).normalize()

  const smooth = 1 - Math.exp(-7 * dt)
  if (input.autopilot && targetPos) {
    _target.copy(targetPos).sub(rocket.position)
    if (_target.lengthSq() > 1e-6) {
      _target.normalize()
      const steer = 0.55 * g.turn * dt
      _fwd.lerp(_target, Math.min(1, steer)).normalize()
      rocket.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), _fwd), 0.08)
      rocket.getWorldDirection(_fwd)
    }
  } else {
    pilot.steerYaw += (input.yaw - pilot.steerYaw) * smooth
    pilot.steerPitch += (input.pitch - pilot.steerPitch) * smooth
    const turn = g.turn * 0.62 * dt
    if (pilot.steerYaw) rocket.rotateOnWorldAxis(_up, -pilot.steerYaw * turn)
    if (pilot.steerPitch) rocket.rotateOnWorldAxis(_right, pilot.steerPitch * turn)
    rocket.getWorldDirection(_fwd)
  }

  let throttle = 0
  if (input.thrust) throttle = info.scale
  if (input.boost) throttle = Math.min(1, info.scale + 0.18)
  if (input.brake) throttle = 0
  if (fuelMode && pilot.fuel <= 0) throttle = 0

  const maxSpeed = (3.1 + g.maxSpeed * 0.11) * (0.55 + 0.45 * info.scale)
  const accel = g.accel * 2.3 * throttle
  if (!freeze) {
    if (throttle > 0) pilot.velocity.addScaledVector(_fwd, accel * dt)
    // Doğal sönüm: bırakınca yavaşlar. Fren yüzde olarak aynı keser (2× hızda da etkili).
    const damp = input.brake ? Math.exp(-5.8 * dt) : Math.exp(-1.45 * dt)
    pilot.velocity.multiplyScalar(damp)
    if (input.brake && pilot.velocity.length() > 0.02) {
      const reverse = Math.min(pilot.velocity.length(), 2.6 * dt * (0.7 + g.turn))
      pilot.velocity.addScaledVector(pilot.velocity.clone().normalize(), -reverse)
    }
    if (pilot.velocity.length() > maxSpeed) pilot.velocity.setLength(maxSpeed)

    let step = dt
    if (input.cruise && targetPos) {
      _target.copy(targetPos).sub(rocket.position)
      const dist = _target.length()
      const aligned = dist > 1e-4 && _fwd.dot(_target.normalize()) > 0.45
      if (dist > 10 && aligned) step = dt * (1.35 + g.cruise * 0.35)
    }
    rocket.position.addScaledVector(pilot.velocity, step)
  }

  if (throttle > 0 && fuelMode) {
    const burn = (0.45 + (input.boost ? 0.5 : 0)) * dt * (12 / Math.max(g.fuel, 30)) * info.scale
    pilot.fuel = Math.max(0, pilot.fuel - burn * 22)
    if (pilot.fuel <= 0) {
      pilot.fuel = 0
      if (fuelMode) pilot.failed = true
    }
  }

  const drop = rocket.userData.stack?.userData?.drop || rocket.children[0]?.userData?.drop
  if (!pilot.staged && drop && fuelMode && pilot.fuel < pilot.fuelMax * 0.55) {
    drop.forEach((m) => {
      m.visible = false
    })
    pilot.staged = true
  } else if (!pilot.staged && drop && !fuelMode && pilot.launched && rocket.userData._airtime > 6) {
    drop.forEach((m) => {
      m.visible = false
    })
    pilot.staged = true
  }
  rocket.userData._airtime = (rocket.userData._airtime || 0) + dt

  const flame = rocket.userData.flame
  const light = rocket.userData.engineLight
  if (flame) {
    flame.visible = throttle > 0 && !input.brake
    flame.scale.setScalar(0.7 + throttle * 0.45 + Math.sin(performance.now() / 50) * 0.08)
  }
  if (light) light.visible = throttle > 0 && !input.brake

  if (earthPos) {
    const fromEarth = rocket.position.distanceTo(earthPos)
    pilot.altitude = Math.max(0, (fromEarth - 2) * 350)
  }
  pilot.speed = pilot.velocity.length()
  pilot.thrusting = throttle > 0
  pilot.boosting = !!input.boost && throttle > 0
  pilot.braking = !!input.brake
  return throttle
}

export function engineWorldPos(rocket, target = _engine) {
  const local = rocket.userData.enginePos || new THREE.Vector3(0, 0, -0.85)
  return rocket.localToWorld(target.copy(local))
}

export function engineBack(rocket, target = _back) {
  rocket.getWorldDirection(target)
  return target.multiplyScalar(-1)
}

export function guidanceNdc(rocket, targetPos, camera) {
  if (!targetPos) return { x: 0, y: 0.2, behind: false }
  const v = targetPos.clone().sub(rocket.position)
  v.project(camera)
  const behind = v.z > 1
  return {
    x: THREE.MathUtils.clamp(v.x, -0.92, 0.92),
    y: THREE.MathUtils.clamp(v.y, -0.72, 0.72),
    behind,
  }
}

export function nearBody(rocket, mesh, extra = 2.2) {
  if (!mesh) return false
  const r = mesh.userData.visualRadius || 1
  const p = mesh.getWorldPosition(new THREE.Vector3())
  return rocket.position.distanceTo(p) < r * extra + 1.4
}

/** Gövde yarıçapı + küçük tampon — geçiş yok. */
export function collideBody(rocket, mesh, pad = 0.32) {
  if (!mesh) return null
  const r = mesh.userData.visualRadius || 1
  mesh.getWorldPosition(_hitPos)
  const dist = rocket.position.distanceTo(_hitPos)
  const limit = r + pad
  if (dist >= limit) return null
  return { dist, radius: r, limit, pos: _hitPos.clone(), depth: limit - dist }
}

export { _hitPos }
