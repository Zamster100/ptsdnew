import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage()
page.on('console', msg => console.log('BROWSER:', msg.type(), msg.text()))
page.on('pageerror', err => console.log('PAGE ERROR:', err.message))
await page.setViewportSize({ width: 1280, height: 900 })
await page.goto('http://localhost:3000/tickets', { waitUntil: 'domcontentloaded', timeout: 15000 })
// Wait for hydration and Fast Refresh to settle
await page.waitForTimeout(2000)
console.log('Current URL:', page.url())

// Scroll to the golden ticket section
const targetY = await page.evaluate(() => {
  const el = Array.from(document.querySelectorAll('section')).find(s =>
    s.textContent?.includes('ONLY 5 EXIST')
  )
  if (!el) return -1
  return Math.round(el.getBoundingClientRect().top + window.scrollY)
})
console.log('Target y:', targetY)
if (targetY > 0) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), targetY)
  await page.waitForTimeout(500)
  const scrollPos = await page.evaluate(() => window.scrollY)
  console.log('After scroll, scrollY:', scrollPos)
}

// Get section bounding box for clip
const sectionBox = await page.evaluate(() => {
  const el = Array.from(document.querySelectorAll('section')).find(s =>
    s.textContent?.includes('ONLY 5 EXIST')
  )
  if (!el) return null
  const rect = el.getBoundingClientRect()
  const parent = el.parentElement?.getBoundingClientRect()
  return { x: rect.left, y: rect.top, w: rect.width, h: rect.height, parentTop: parent?.top }
})
console.log('Section box:', JSON.stringify(sectionBox))

// Wait for animation to be in full swing
await page.waitForTimeout(1200)
console.log('URL at screenshot time:', page.url())
await page.screenshot({
  path: 'scripts/rain-screenshot.png',
  fullPage: true,
  clip: sectionBox ? { x: 0, y: targetY - 40, width: 1280, height: 900 } : undefined,
})

await browser.close()
console.log('Screenshot saved to scripts/rain-screenshot.png')
