/**
 * Yordamsal (procedural) gezegen dokuları.
 *
 * Üçüncü taraf görüntü lisansı yok: tüm dokular bu dosyada, tarayıcıda
 * Canvas ile üretilir. Gürültü fonksiyonu rastgele değil, tohumlu (seeded)
 * olduğu için her açılışta aynı Merkür kraterleri belirir — tekrarlanabilirlik
 * hem bilim hem yazılım için iyidir.
 */

import * as THREE from 'three'

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash2(ix, iy, seed) {
  const n = Math.sin(ix * 127.1 + iy * 311.7 + seed * 0.1) * 43758.5453
  return n - Math.floor(n)
}

function smooth(t) {
  return t * t * (3 - 2 * t)
}

function valueNoise(x, y, seed) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = smooth(x - x0)
  const fy = smooth(y - y0)
  const v00 = hash2(x0, y0, seed)
  const v10 = hash2(x0 + 1, y0, seed)
  const v01 = hash2(x0, y0 + 1, seed)
  const v11 = hash2(x0 + 1, y0 + 1, seed)
  const a = v00 + (v10 - v00) * fx
  const b = v01 + (v11 - v01) * fx
  return a + (b - a) * fy
}

function fbm(x, y, seed, octaves = 5) {
  let amp = 0.5
  let freq = 1
  let sum = 0
  for (let i = 0; i < octaves; i += 1) {
    sum += amp * valueNoise(x * freq, y * freq, seed + i * 19)
    amp *= 0.5
    freq *= 2
  }
  return sum
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function rgb(r, g, b) {
  return [r, g, b]
}

function mix(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]
}

function canvasTexture(width, height, paint) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(width, height)
  const d = img.data
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = x / width
      const v = y / height
      const [r, g, b, a = 255] = paint(u, v, x, y)
      const i = (y * width + x) * 4
      d[i] = r
      d[i + 1] = g
      d[i + 2] = b
      d[i + 3] = a
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.anisotropy = 4
  return tex
}

function lat(v) {
  return (0.5 - v) * Math.PI
}

export function makeSunTexture() {
  return canvasTexture(1024, 512, (u, v) => {
    const n = fbm(u * 8, v * 4, 7)
    const spot = fbm(u * 18, v * 10, 21)
    let c = mix(rgb(255, 170, 40), rgb(255, 230, 140), n)
    if (spot > 0.62) c = mix(c, rgb(120, 50, 10), (spot - 0.62) * 2)
    const limb = Math.pow(Math.cos(lat(v)) * 0.35 + 0.65, 0.6)
    return [c[0] * limb, c[1] * limb, c[2] * limb]
  })
}

export function makeMercuryTexture() {
  return canvasTexture(1024, 512, (u, v) => {
    const n = fbm(u * 10, v * 6, 3)
    const crater = fbm(u * 28, v * 16, 44)
    let c = mix(rgb(90, 86, 82), rgb(170, 160, 150), n)
    if (crater > 0.58) c = mix(c, rgb(50, 48, 46), (crater - 0.58) * 2.2)
    const pole = Math.abs(v - 0.5)
    if (pole > 0.42) c = mix(c, rgb(210, 210, 215), (pole - 0.42) * 3)
    return c
  })
}

export function makeVenusTexture() {
  return canvasTexture(1024, 512, (u, v) => {
    const swirl = fbm(u * 6 + v * 0.8, v * 3, 9)
    const band = 0.5 + 0.5 * Math.sin(v * 18 + swirl * 4)
    const c = mix(rgb(210, 170, 90), rgb(255, 230, 180), band * 0.7 + swirl * 0.3)
    return c
  })
}

export function makeEarthTexture() {
  return canvasTexture(1024, 512, (u, v) => {
    const n = fbm(u * 7, v * 4, 12)
    const n2 = fbm(u * 14 + 3, v * 8, 13)
    const ice = Math.abs(v - 0.5) > 0.38 + n * 0.04
    const ocean = rgb(18, 62, 130)
    const ocean2 = rgb(12, 110, 150)
    const land = mix(rgb(46, 110, 52), rgb(140, 120, 60), n2)
    const cloud = fbm(u * 9 + 2, v * 5, 77)
    let c = n > 0.47 ? land : mix(ocean, ocean2, n2)
    if (ice) c = mix(c, rgb(240, 248, 255), 0.85)
    if (cloud > 0.6 && !ice) c = mix(c, rgb(255, 255, 255), (cloud - 0.6) * 1.6)
    return c
  })
}

export function makeMarsTexture() {
  return canvasTexture(1024, 512, (u, v) => {
    const n = fbm(u * 8, v * 5, 31)
    const dark = fbm(u * 16, v * 9, 32)
    let c = mix(rgb(160, 70, 40), rgb(210, 120, 70), n)
    if (dark > 0.55) c = mix(c, rgb(90, 40, 28), (dark - 0.55) * 2)
    const pole = Math.abs(v - 0.5)
    if (pole > 0.4) c = mix(c, rgb(245, 248, 255), (pole - 0.4) * 4)
    return c
  })
}

export function makeJupiterTexture() {
  return canvasTexture(1024, 512, (u, v) => {
    const turbulence = fbm(u * 12, v * 4, 41)
    const bands = Math.sin((v + turbulence * 0.08) * Math.PI * 14)
    const paletteA = rgb(214, 168, 110)
    const paletteB = rgb(176, 112, 60)
    const paletteC = rgb(236, 214, 176)
    let c = bands > 0 ? mix(paletteA, paletteC, turbulence) : mix(paletteB, paletteA, turbulence)
    const spotR = (u - 0.72) * 6
    const spotV = (v - 0.58) * 10
    const spot = spotR * spotR + spotV * spotV
    if (spot < 1) c = mix(c, rgb(196, 70, 42), 1 - spot)
    return c
  })
}

export function makeSaturnTexture() {
  return canvasTexture(1024, 512, (u, v) => {
    const turbulence = fbm(u * 10, v * 3, 51)
    const bands = Math.sin((v + turbulence * 0.05) * Math.PI * 16)
    const a = rgb(230, 210, 160)
    const b = rgb(200, 175, 120)
    return bands > 0 ? mix(a, b, 0.4) : mix(b, a, turbulence)
  })
}

export function makeUranusTexture() {
  return canvasTexture(512, 256, (u, v) => {
    const n = fbm(u * 4, v * 3, 61)
    return mix(rgb(150, 210, 210), rgb(90, 190, 200), n)
  })
}

export function makeNeptuneTexture() {
  return canvasTexture(512, 256, (u, v) => {
    const n = fbm(u * 6, v * 4, 71)
    let c = mix(rgb(40, 70, 190), rgb(70, 140, 230), n)
    const spotR = (u - 0.35) * 8
    const spotV = (v - 0.45) * 12
    if (spotR * spotR + spotV * spotV < 1) c = mix(c, rgb(20, 30, 80), 0.55)
    return c
  })
}

export function makePlutoTexture() {
  return canvasTexture(512, 256, (u, v) => {
    const n = fbm(u * 8, v * 5, 81)
    let c = mix(rgb(160, 130, 100), rgb(210, 190, 170), n)
    const heartU = (u - 0.55) * 5
    const heartV = (v - 0.52) * 6
    if (heartU * heartU + heartV * heartV < 0.7) c = mix(c, rgb(230, 220, 210), 0.8)
    return c
  })
}

export function makeMoonTexture(seed = 90, a = rgb(90, 90, 95), b = rgb(200, 198, 190)) {
  return canvasTexture(512, 256, (u, v) => {
    const n = fbm(u * 10, v * 6, seed)
    const crater = fbm(u * 22, v * 14, seed + 5)
    let c = mix(a, b, n)
    if (crater > 0.6) c = mix(c, rgb(40, 40, 42), (crater - 0.6) * 2)
    return c
  })
}

export function makeIoTexture() {
  return canvasTexture(512, 256, (u, v) => {
    const n = fbm(u * 10, v * 6, 101)
    let c = mix(rgb(220, 200, 60), rgb(180, 80, 30), n)
    if (n > 0.62) c = mix(c, rgb(80, 40, 90), 0.5)
    return c
  })
}

export function makeEuropaTexture() {
  return canvasTexture(512, 256, (u, v) => {
    const n = fbm(u * 14, v * 8, 111)
    const line = Math.abs(Math.sin(u * 40 + n * 8))
    let c = mix(rgb(210, 220, 230), rgb(170, 190, 210), n)
    if (line > 0.85) c = rgb(90, 70, 50)
    return c
  })
}

export function makeTitanTexture() {
  return canvasTexture(512, 256, (u, v) => {
    const n = fbm(u * 6, v * 4, 121)
    return mix(rgb(180, 120, 50), rgb(220, 160, 80), n)
  })
}

export function makeRingTexture() {
  return canvasTexture(1024, 64, (u) => {
    const cassini = u > 0.62 && u < 0.7
    const gap2 = u > 0.38 && u < 0.41
    const n = fbm(u * 40, 0.5, 131, 3)
    let alpha = cassini || gap2 ? 0 : 140 + n * 90
    if (u < 0.08 || u > 0.96) alpha *= u < 0.08 ? u / 0.08 : (1 - u) / 0.04
    const col = mix(rgb(210, 190, 150), rgb(160, 140, 110), n)
    return [col[0], col[1], col[2], alpha]
  })
}

const makers = {
  sun: makeSunTexture,
  mercury: makeMercuryTexture,
  venus: makeVenusTexture,
  earth: makeEarthTexture,
  mars: makeMarsTexture,
  jupiter: makeJupiterTexture,
  saturn: makeSaturnTexture,
  uranus: makeUranusTexture,
  neptune: makeNeptuneTexture,
  pluto: makePlutoTexture,
}

export function createTextureAtlas() {
  const map = {}
  for (const [id, fn] of Object.entries(makers)) map[id] = fn()
  map.moon = makeMoonTexture(90)
  map.phobos = makeMoonTexture(140, rgb(70, 60, 50), rgb(140, 120, 100))
  map.io = makeIoTexture()
  map.europa = makeEuropaTexture()
  map.ganymede = makeMoonTexture(150, rgb(80, 75, 70), rgb(170, 160, 145))
  map.callisto = makeMoonTexture(160, rgb(50, 48, 46), rgb(120, 115, 110))
  map.titan = makeTitanTexture()
  map.enceladus = makeMoonTexture(170, rgb(200, 210, 220), rgb(240, 245, 250))
  map.icy = makeMoonTexture(180, rgb(180, 190, 200), rgb(230, 235, 240))
  map.triton = makeMoonTexture(190, rgb(160, 140, 150), rgb(220, 200, 210))
  map.charon = makeMoonTexture(200, rgb(80, 70, 75), rgb(150, 140, 145))
  map.rings = makeRingTexture()
  map.rings.wrapT = THREE.ClampToEdgeWrapping
  return map
}

export function makeGlowSprite(size = 128) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255,230,160,0.95)')
  grad.addColorStop(0.25, 'rgba(255,180,60,0.45)')
  grad.addColorStop(0.6, 'rgba(255,120,20,0.12)')
  grad.addColorStop(1, 'rgba(255,80,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export { mulberry32 }
