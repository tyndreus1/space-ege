/**
 * Kokpit görünümünde gezegen şeridi vs. pano örtüşmesi + tıklama.
 */
import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const OUT = '/workspace/artifacts'
mkdirSync(OUT, { recursive: true })

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

function rectsOverlap(a, b, pad = 1) {
  if (!a || !b) return false
  return a.right - pad > b.left && a.left + pad < b.right && a.bottom - pad > b.top && a.top + pad < b.bottom
}

async function measure(page) {
  return page.evaluate(() => {
    const box = (el) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return {
        top: r.top,
        left: r.left,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
        z: cs.zIndex,
        display: cs.display,
        vis: cs.visibility,
        pe: cs.pointerEvents,
      }
    }
    const chips = [...document.querySelectorAll('.planet-chip')].map((el) => ({
      label: el.textContent.trim(),
      ...box(el),
    }))
    const visibleChips = chips.filter((c) => c.width > 8 && c.height > 8 && c.bottom > 0 && c.top < innerHeight)
    const dash = box(document.querySelector('.cf-dash'))
    const frame = box(document.querySelector('.cockpit-frame'))
    const dock = box(document.getElementById('planet-dock'))
    const touch = box(document.getElementById('touch-controls'))
    const hudLand = document.getElementById('hud-land')?.textContent || ''
    const hudThr = document.getElementById('hud-throttle')?.textContent || ''
    const speed = document.getElementById('hud-speed')?.textContent || ''
    return {
      innerWidth,
      innerHeight,
      chipCount: chips.length,
      visibleChipCount: visibleChips.length,
      visibleChipLabels: visibleChips.map((c) => c.label),
      chips: visibleChips,
      dash,
      frame,
      dock,
      touch,
      hudLand,
      hudThr,
      speed,
      cockpitCam: document.body.classList.contains('cockpit-cam'),
    }
  })
}

function report(label, data) {
  const overlaps = []
  for (const chip of data.chips) {
    if (rectsOverlap(chip, data.dash)) overlaps.push(`${chip.label} ∩ dash`)
    if (data.frame && rectsOverlap(chip, data.frame)) overlaps.push(`${chip.label} ∩ frame`)
  }
  return { label, overlaps, ...data }
}

async function clickChip(page, name) {
  const handle = await page.evaluateHandle((want) => {
    return [...document.querySelectorAll('.planet-chip')].find((el) => el.textContent.includes(want))
  }, name)
  const el = handle.asElement()
  if (!el) throw new Error(`chip not found: ${name}`)
  await el.click()
  await new Promise((r) => setTimeout(r, 400))
  return page.evaluate(() => document.getElementById('hud-target')?.textContent || '')
}

async function run(name, viewport, file) {
  const page = await browser.newPage()
  page.setDefaultTimeout(30000)
  if (viewport) await page.setViewport(viewport)
  await page.goto('http://127.0.0.1:47241/?shot=cockpitcam&to=mars', { waitUntil: 'networkidle0' })
  await page.waitForFunction(() => window.__kesif, { timeout: 15000 })
  await new Promise((r) => setTimeout(r, 2200))
  const before = report(name, await measure(page))
  const dest = `${OUT}/${file}`
  await page.screenshot({ path: dest, type: 'png' })
  const target = await clickChip(page, 'Jüpiter')
  const after = await measure(page)
  await page.close()
  return { before, target, afterVisible: after.visibleChipLabels, file: dest }
}

const mobile = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const desktop = await run('desktop', null, 'cockpit-view.png')
const phone = await run('phone', mobile, 'cockpit-view-mobile.png')

const summary = { desktop, phone }
writeFileSync(`${OUT}/cockpit-layout-check.json`, JSON.stringify(summary, null, 2))
console.log(JSON.stringify(summary, null, 2))

const fail = []
for (const row of [desktop, phone]) {
  if (row.before.visibleChipCount < 4) fail.push(`${row.before.label}: too few chips (${row.before.visibleChipCount})`)
  if (row.before.overlaps.length) fail.push(`${row.before.label}: ${row.before.overlaps.join(', ')}`)
  if (!row.target.toLowerCase().includes('jüpiter') && !row.target.toLowerCase().includes('jupiter')) {
    fail.push(`${row.before.label}: click did not retarget (${row.target})`)
  }
}
if (fail.length) {
  console.error('FAIL', fail)
  process.exit(1)
}
console.log('layout ok')
await browser.close()
