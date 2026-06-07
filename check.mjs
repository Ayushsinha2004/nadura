import { chromium } from 'playwright'

const URL = process.argv[2] || 'http://localhost:5173'
const browser = await chromium.launch()
const page = await browser.newPage()
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)

const kpis = await page.$$eval('.kpi', (els) =>
  els.map((e) => ({
    label: e.querySelector('.kpi-label')?.textContent?.trim(),
    value: e.querySelector('.kpi-value')?.textContent?.trim(),
  })))
const legend = await page.$$eval('.legend-row', (els) =>
  els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()))
const charts = await page.$$eval('.recharts-surface', (els) => els.length)

console.log('CONSOLE ERRORS:', errors.length ? errors : 'none')
console.log('KPI CARDS:', JSON.stringify(kpis, null, 2))
console.log('MIX LEGEND:', legend)
console.log('CHART SURFACES:', charts)
await page.screenshot({ path: 'screenshot.png', fullPage: true })
console.log('screenshot.png written')
await browser.close()
