const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright-core');
const root = path.join(__dirname, '..', 'src');
const results = path.join(__dirname, '..', 'test-results');
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' };
const server = http.createServer(async (req, res) => {
  const file = path.resolve(root, '.' + (req.url === '/' ? '/index.html' : req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try { const body = await fs.readFile(file); res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(body); }
  catch { res.writeHead(404).end(); }
});
(async () => {
  await fs.mkdir(results, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: process.env.PAW_CHROMIUM || '/usr/bin/chromium', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 840 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('[data-skin="dog"]').waitFor();
    assert.equal(await page.locator('[data-skin]').count(), 3);
    await page.screenshot({ path: path.join(results, 'home.png'), fullPage: true });
    await page.locator('[data-skin="cat"]').click();
    assert.equal(await page.locator('#pat-pet .pet-cat').count(), 1);
    await page.locator('[data-action="sleep"]').click();
    assert.equal(await page.locator('#pat-pet .state-sleep').count(), 1);
    await page.locator('[data-page="wardrobe"]').click();
    await page.locator('[data-outfit="beanie"]').click();
    await page.locator('[data-tab="glasses"]').click();
    await page.locator('[data-outfit="round"]').click();
    await page.locator('[data-tab="scarf"]').click();
    await page.locator('[data-outfit="coral"]').click();
    await page.locator('[data-tab="toy"]').click();
    await page.locator('[data-outfit="bone"]').click();
    assert.equal(await page.locator('#pat-pet .pet-hat').count(), 1);
    assert.equal(await page.locator('#pat-pet .pet-glasses').count(), 1);
    assert.equal(await page.locator('#pat-pet .pet-scarf').count(), 1);
    assert.equal(await page.locator('#pat-pet .pet-toy').count(), 1);
    await page.screenshot({ path: path.join(results, 'wardrobe.png'), fullPage: true });
    await page.reload(); await page.locator('#pat-pet .pet-cat').waitFor();
    assert.equal(await page.locator('#pat-pet .pet-hat').count(), 1, 'outfit survives reload');
    await page.locator('[data-page="settings"]').click();
    await page.locator('#setting-sound').click();
    assert.equal(await page.locator('#setting-sound').getAttribute('aria-checked'), 'false');
    await page.locator('#setting-roam').click();
    assert.equal(await page.locator('#setting-roam').getAttribute('aria-checked'), 'false');
    await page.screenshot({ path: path.join(results, 'settings.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-page="home"]').click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'mobile preview has no horizontal overflow');
    await page.screenshot({ path: path.join(results, 'mobile.png'), fullPage: true });
    assert.deepEqual(errors, []);
    console.log('UI PASS: three pets, sleep, four layered accessories, persistence, mute, roaming, responsive layout; no JS errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
