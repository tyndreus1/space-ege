/**
 * Headless Chrome ile sahne görüntüleri (sınıf teslimi / README).
 * SwiftShader WebGL kullanır; GPU olmayan ortamda da çalışır.
 */
import { mkdirSync, copyFileSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const OUT = '/workspace/artifacts'
const CURSOR = '/opt/cursor/artifacts/screenshots'
mkdirSync(OUT, { recursive: true })
mkdirSync(CURSOR, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--window-size=1440,900',
    '--hide-scrollbars',
  ],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
})

async function shot(url, file, waitMs, viewport) {
  const page = await browser.newPage()
  page.setDefaultTimeout(30000)
  if (viewport) await page.setViewport(viewport)
  await page.goto(url, { waitUntil: 'networkidle0' })
  await page.waitForFunction(() => window.__kesif, { timeout: 15000 })
  await new Promise((r) => setTimeout(r, waitMs))
  const dest = `${OUT}/${file}`
  await page.screenshot({ path: dest, type: 'png' })
  copyFileSync(dest, `${CURSOR}/${file}`)
  console.log('saved', dest)
  await page.close()
}

const mobile = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }

await shot('http://127.0.0.1:47241/?shot=main', 'main-view.png', 2200)
await shot('http://127.0.0.1:47241/?shot=flight&to=saturn&freeze=0.4', 'flight-info-panel.png', 2500)
await shot('http://127.0.0.1:47241/?shot=stars&star=proxima', 'interstellar-mode.png', 2200)
await shot('http://127.0.0.1:47241/?shot=hangar', 'hangar.png', 1800)
await shot('http://127.0.0.1:47241/?shot=launch', 'launch.png', 1400)
await shot('http://127.0.0.1:47241/?shot=pilot&to=mars&approach=0.55&rocket=shuttle', 'pilot-hud.png', 2200)
await shot('http://127.0.0.1:47241/?shot=cockpit&to=jupiter&rocket=shuttle', 'cockpit-arrival.png', 2200)
await shot('http://127.0.0.1:47241/?shot=missions', 'missions-badges.png', 1800)
await shot('http://127.0.0.1:47241/?shot=fuel', 'fuel-challenge.png', 1800)
await shot(
  'http://127.0.0.1:47241/?shot=pilot&to=saturn&approach=0.7&rocket=falcon9',
  'pilot-cockpit-mobile.png',
  2200,
  mobile,
)
await shot('http://127.0.0.1:47241/?shot=cockpitcam&to=mars', 'cockpit-view.png', 2200)
await shot(
  'http://127.0.0.1:47241/?shot=cockpitcam&to=mars',
  'cockpit-view-mobile.png',
  2200,
  mobile,
)
await shot('http://127.0.0.1:47241/?shot=throttle&to=mars&approach=0.5&rocket=falcon9', 'brake-throttle-hud.png', 2000)
await shot('http://127.0.0.1:47241/?shot=landing&to=mars', 'landing.png', 3200)
await shot('http://127.0.0.1:47241/?shot=fail', 'mission-fail.png', 1600)
await shot(
  'http://127.0.0.1:47241/?shot=throttle&to=mars&approach=0.45',
  'brake-throttle-mobile.png',
  1800,
  mobile,
)

await browser.close()
console.log('done')
