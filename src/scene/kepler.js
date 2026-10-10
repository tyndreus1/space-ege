/**
 * Kepler yörünge matematiği.
 *
 * Güneş, Güneş Sistemi kütlesinin ~%99,8'ini taşır. Bu yüzden gezegenlerin
 * hareketi, pratikte "sabit Güneş etrafında iki cisim problemi" olarak
 * modellenebilir. Bu dosya o yaklaşımı uygular.
 *
 * Kepler denklemi:  M = E − e · sin(E)
 *   M : ortalama anomali (zamanla düzgün artan açı)
 *   E : eksantrik anomali (çözülmesi gereken)
 *   e : dışmerkezlik (0 = daire, 1'e yaklaştıkça daha basık elips)
 *
 * Newton yinelemesi 5–8 adımda yeterince yakınsar; e < 0,3 için çok kararlıdır.
 */

export function wrapAngle(rad) {
  const tau = Math.PI * 2
  return ((rad % tau) + tau) % tau
}

export function eccentricAnomaly(meanAnomaly, eccentricity) {
  const M = wrapAngle(meanAnomaly)
  let E = eccentricity < 0.8 ? M : Math.PI
  for (let i = 0; i < 10; i += 1) {
    const dE = (E - eccentricity * Math.sin(E) - M) / (1 - eccentricity * Math.cos(E))
    E -= dE
    if (Math.abs(dE) < 1e-8) break
  }
  return E
}

export function trueAnomaly(E, eccentricity) {
  const sqrt1e = Math.sqrt(1 - eccentricity)
  const sqrt1p = Math.sqrt(1 + eccentricity)
  return 2 * Math.atan2(sqrt1p * Math.sin(E / 2), sqrt1e * Math.cos(E / 2))
}

/**
 * Odak noktasındaki (Güneş) yarıçap: r = a (1 − e²) / (1 + e cos ν)
 */
export function orbitRadius(semiMajor, eccentricity, trueAnom) {
  return (semiMajor * (1 - eccentricity * eccentricity)) / (1 + eccentricity * Math.cos(trueAnom))
}

export function keplerPosition(semiMajor, eccentricity, inclination, perihelion, meanAnomaly) {
  const E = eccentricAnomaly(meanAnomaly, eccentricity)
  const nu = trueAnomaly(E, eccentricity)
  const r = orbitRadius(semiMajor, eccentricity, nu)
  const x = r * Math.cos(nu)
  const z = r * Math.sin(nu)
  const c = Math.cos(perihelion)
  const s = Math.sin(perihelion)
  const xEcl = x * c - z * s
  const zEcl = x * s + z * c
  const ci = Math.cos(inclination)
  const si = Math.sin(inclination)
  return {
    x: xEcl,
    y: zEcl * si,
    z: zEcl * ci,
    nu,
    r,
  }
}
