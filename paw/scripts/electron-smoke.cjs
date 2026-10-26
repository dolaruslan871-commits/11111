const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { _electron } = require('playwright-core');
const project = path.resolve(__dirname, '..');
(async () => {
  await fs.mkdir(path.join(project, '.runtime'), { recursive: true });
  // Keep synthetic files on the home filesystem: cloud /tmp is a separate
  // internal mount where the Linux desktop deliberately refuses trashing.
  const scratch = await fs.mkdtemp(path.join(project, '.runtime', 'paw-integration-'));
  const env = { ...process.env, XDG_CONFIG_HOME: path.join(scratch, 'config'), XDG_DATA_HOME: path.join(scratch, 'data'), XDG_CACHE_HOME: path.join(scratch, 'cache') };
  for (const key of ['XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME']) await fs.mkdir(env[key], { recursive: true });
  // This sandboxed cloud host cannot provide Chromium's Linux user namespace.
  // Only this local test harness uses --no-sandbox; release/start commands do not.
  const args = [project, ...(process.platform === 'linux' ? ['--no-sandbox', '--disable-gpu'] : [])];
  const launch = () => _electron.launch({ args, env, executablePath: require('electron'), timeout: 30000 });
  async function dashboardWindow(instance) {
    await instance.firstWindow();
    await instance.evaluate(async ({ BrowserWindow }) => {
      await Promise.all(BrowserWindow.getAllWindows().map(win => win.webContents.isLoading()
        ? new Promise(resolve => win.webContents.once('did-finish-load', resolve)) : Promise.resolve()));
    });
    const page = instance.windows().find(p => p.url().endsWith('index.html'));
    assert.ok(page, 'dashboard window was created');
    return page;
  }
  let electron;
  try {
    electron = await launch();
    let page = await dashboardWindow(electron);
    await page.locator('[data-skin="dog"]').waitFor();
    const windows = await electron.evaluate(async ({ BrowserWindow }) => Promise.all(BrowserWindow.getAllWindows().map(async win => ({ transparent: (await win.capturePage()).getBitmap()[3] === 0, top: win.isAlwaysOnTop(), sandbox: win.webContents.getLastWebPreferences().sandbox }))));
    assert.equal(windows.length, 2);
    assert.ok(windows.some(w => w.transparent && w.top));
    assert.ok(windows.every(w => w.sandbox));
    assert.equal(await page.evaluate(() => typeof window.require), 'undefined');
    await page.locator('[data-skin="croc"]').click();
    await page.locator('[data-page="wardrobe"]').click();
    await page.locator('[data-outfit="beanie"]').click();
    await page.locator('[data-tab="toy"]').click();
    await page.locator('[data-outfit="ball"]').click();
    const petPage = (await electron.windows()).find(p => p.url().endsWith('pet.html'));
    assert.ok(petPage);
    await petPage.locator('.pet-croc .pet-hat').waitFor();
    await page.evaluate(() => window.paw.action('hunt'));
    await petPage.locator('.butterfly').waitFor();
    // Only our generated disposable file is fed. Keep the real trash API enabled.
    const sample = path.join(scratch, 'paw-disposable-test.txt');
    await fs.writeFile(sample, 'Synthetic Paw trash integration test.');
    await electron.evaluate(({ dialog }, sample) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [sample] });
      dialog.showMessageBox = async () => { throw new Error('Feeding must not ask for confirmation'); };
    }, sample);
    const result = await page.evaluate(() => window.paw.feed());
    assert.equal(result.ok, true, JSON.stringify(result));
    await assert.rejects(fs.access(sample), { code: 'ENOENT' });
    const trashed = await fs.readdir(path.join(env.XDG_DATA_HOME, 'Trash', 'files'));
    assert.ok(trashed.some(name => name.startsWith('paw-disposable-test')));
    const saved = await page.evaluate(() => window.paw.getState());
    assert.equal(saved.activity, 'eat');
    assert.equal(saved.outfit.toy, 'ball');
    await electron.close(); electron = await launch();
    page = await dashboardWindow(electron);
    await page.locator('#pat-pet .pet-croc').waitFor();
    const restored = await page.evaluate(() => window.paw.getState());
    assert.equal(restored.skin, 'croc'); assert.equal(restored.outfit.hat, 'beanie'); assert.equal(restored.outfit.toy, 'ball');
    console.log('ELECTRON PASS: transparent always-on-top pet; isolated renderer; IPC and accessories sync; hunting; real trash without confirmation; restart persistence.');
    console.log('Synthetic test file is recoverable from test Trash:', path.join(env.XDG_DATA_HOME, 'Trash'));
  } finally { if (electron) await electron.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
