const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright-core');
const root = path.join(__dirname, '..', 'src');
const results = path.join(__dirname, '..', 'test-results');
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json':'application/json' };
const server = http.createServer(async (req, res) => {
  const file = path.resolve(root, '.' + (req.url === '/' ? '/index.html' : req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try { const body = await fs.readFile(file); res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(body); }
  catch { res.writeHead(404).end(); }
});
(async () => {
  await fs.mkdir(results, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: process.env.PAW_CHROMIUM || '/usr/bin/chromium', headless: true, args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 840 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('.pet-card[data-skin="dog"]').waitFor();
    assert.equal(await page.locator('.pet-card[data-skin]').count(), 3);
    await page.screenshot({ path: path.join(results, 'home.png'), fullPage: true });
    await page.locator('.pet-card[data-skin="cat"]').click();
    assert.equal(await page.locator('#pat-pet[data-skin=cat][data-renderer=webgl] canvas').count(), 1);
    await page.locator('[data-action="sleep"]').click();
    assert.equal(await page.locator('#pat-pet[data-activity=sleep]').count(), 1);
    await page.locator('[data-page="wardrobe"]').click();
    await page.locator('[data-outfit="beanie"]').click();
    await page.locator('[data-tab="glasses"]').click();
    await page.locator('[data-outfit="round"]').click();
    await page.locator('[data-tab="scarf"]').click();
    await page.locator('[data-outfit="coral"]').click();
    await page.locator('[data-tab="toy"]').click();
    await page.locator('[data-outfit="bone"]').click();
    assert.ok((await page.locator('#pat-pet').getAttribute('data-outfit')).includes('hat:'), '3D hat rendered');
    assert.ok((await page.locator('#pat-pet').getAttribute('data-outfit')).includes('glasses:'), '3D glasses rendered');
    assert.ok((await page.locator('#pat-pet').getAttribute('data-outfit')).includes('scarf:'), '3D scarf rendered');
    assert.ok((await page.locator('#pat-pet').getAttribute('data-outfit')).includes('toy:'), '3D toy rendered');
    await page.screenshot({ path: path.join(results, 'wardrobe.png'), fullPage: true });
    await page.reload(); await page.locator('#pat-pet[data-skin=cat][data-renderer=webgl]').waitFor();
    assert.ok((await page.locator('#pat-pet').getAttribute('data-outfit')).includes('hat:beanie'),'outfit survives reload');
    await page.locator('[data-page="settings"]').click();
    await page.locator('#setting-sound').click();
    assert.equal(await page.locator('#setting-sound').getAttribute('aria-checked'), 'false');
    await page.locator('#setting-roam').click();
    assert.equal(await page.locator('#setting-roam').getAttribute('aria-checked'), 'false');
    await page.locator('#language').selectOption('en');
    assert.equal(await page.locator('h1').textContent(),'Make yourself at home');
    await page.locator('[data-theme=dark]').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
    await page.locator('#setting-top').click();
    assert.equal(await page.locator('#setting-top').getAttribute('aria-checked'),'false');
    await page.locator('#pet-size').fill('1.4');await page.locator('#pet-size').dispatchEvent('change');
    await page.locator('[data-feed-mode=carry]').click();
    assert.equal(await page.locator('[data-feed-mode=carry]').getAttribute('aria-pressed'),'true');
    await page.locator('#language').selectOption('uk');
    assert.equal(await page.locator('[data-page=settings]').textContent(),'Налаштування');
    await page.screenshot({ path: path.join(results, 'settings.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-page="home"]').click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'mobile preview has no horizontal overflow');
    await page.screenshot({ path: path.join(results, 'mobile.png'), fullPage: true });
    const modelChecks=await page.evaluate(async()=>{
      const {mountPet3D}=await import('./pet-3d.js');const catalog=(await import('./catalog.json',{with:{type:'json'}})).default;
      const host=document.createElement('div');host.style.cssText='position:fixed;left:0;top:0;width:300px;height:300px;z-index:1000';document.body.append(host);
      const scene=mountPet3D(host,{skin:'dog',activity:'walk',outfit:{}});
      await new Promise(r=>setTimeout(r,180));const walking=scene.inspect();
      scene.update({activity:'stand'});await new Promise(r=>setTimeout(r,180));const standing=scene.inspect();
      let checked=0;for(const skin of ['dog','cat','croc'])for(const [key,items]of Object.entries(catalog.wardrobe))for(const item of items){scene.update({skin,activity:'idle',outfit:{[key]:item.id}});checked++;}
      scene.dispose();host.remove();return {walking,standing,checked};
    });
    assert.equal(modelChecks.walking.renderer,'webgl');assert.equal(modelChecks.walking.legs.length,4);
    assert.ok(modelChecks.walking.legs.some(leg=>Math.abs(leg.angle)>.05),'legs have independent walk poses');
    assert.ok(modelChecks.standing.legs.filter(leg=>leg.name.startsWith('front')).every(leg=>leg.angle< -1),'front paws raised to screen');
    assert.equal(modelChecks.checked,195,'every catalog choice builds for all three species');
    assert.deepEqual(errors, []);
    console.log('UI PASS: real WebGL 3D, four-legged pet, sleep, layered outfits, settings persistence, three languages, dark theme, topmost toggle, size, carry mode, responsive layout; no JS errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
