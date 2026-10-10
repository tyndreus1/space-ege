/**
 * Hangar önizlemesi — küçük WebGL sahnesi, seçilen fırlatıcıyı döndürür.
 * Ana sahne ile ayrı bağlamsızdır; hangar kapanınca döngü durur.
 */

import * as THREE from 'three'
import { createRocket } from './rocketModels.js'

export function createHangarPreview(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x050814, 1)
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40)
  camera.position.set(2.4, 0.4, 3.4)
  camera.lookAt(0, 0, 0)

  scene.add(new THREE.AmbientLight(0xc5d4ea, 0.85))
  scene.add(new THREE.HemisphereLight(0x9ecbff, 0x1a2436, 0.7))
  const key = new THREE.DirectionalLight(0xfff1d6, 2.1)
  key.position.set(3, 5, 4)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0x66d0ff, 1.1)
  rim.position.set(-4, 1, -2)
  scene.add(rim)

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(2.4, 32),
    new THREE.MeshBasicMaterial({ color: 0x122033, transparent: true, opacity: 0.7 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.95
  scene.add(floor)

  let rocket = null
  let running = false
  let raf = 0
  let spin = 0

  function fit() {
    const w = Math.max(1, canvas.clientWidth)
    const h = Math.max(1, canvas.clientHeight)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }

  function show(id) {
    if (rocket) scene.remove(rocket)
    rocket = createRocket(id)
    rocket.scale.setScalar(1.15)
    rocket.position.set(0, -0.15, 0)
    scene.add(rocket)
    const flame = rocket.userData.flame
    if (flame) flame.visible = true
  }

  function tick() {
    if (!running) return
    spin += 0.008
    if (rocket) {
      rocket.rotation.set(-0.42, spin, 0.12)
      const flame = rocket.userData.flame
      if (flame) flame.scale.setScalar(0.9 + Math.sin(spin * 12) * 0.12)
    }
    renderer.render(scene, camera)
    raf = requestAnimationFrame(tick)
  }

  function start() {
    if (running) return
    running = true
    fit()
    tick()
  }

  function stop() {
    running = false
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }

  return { show, start, stop, fit }
}
