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
  const args = [project, ...(process.platform === 'linux' ? ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] : [])];
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
    await page.locator('.pet-card[data-skin="dog"]').waitFor();
    const windows = await electron.evaluate(async ({ BrowserWindow }) => Promise.all(BrowserWindow.getAllWindows().map(async win => ({ transparent: (await win.capturePage()).getBitmap()[3] === 0, top: win.isAlwaysOnTop(), sandbox: win.webContents.getLastWebPreferences().sandbox }))));
    assert.equal(windows.length, 2);
    assert.ok(windows.some(w => w.transparent && w.top));
    assert.ok(windows.every(w => w.sandbox));
    assert.equal(await page.evaluate(() => typeof window.require), 'undefined');
    await page.locator('.pet-card[data-skin="croc"]').click();
    await page.locator('[data-page="wardrobe"]').click();
    await page.locator('[data-outfit="beanie"]').click();
    await page.locator('[data-tab="toy"]').click();
    await page.locator('[data-outfit="ball"]').click();
    const petPage = (await electron.windows()).find(p => p.url().endsWith('pet.html'));
    assert.ok(petPage);
    await petPage.locator('#floating-pet[data-skin=croc][data-renderer=webgl]').waitFor();
    assert.ok((await petPage.locator('#floating-pet').getAttribute('data-outfit')).includes('hat:beanie'));
    await petPage.locator('#floating-pet').click({button:'right'});
    await petPage.locator('.radial-menu.is-open .radial-item').first().waitFor();
    assert.equal(await petPage.locator('.radial-item').count(),9);
    await petPage.screenshot({path:path.join(project,'test-results','glass-menu.png'),omitBackground:true});
    await petPage.evaluate(()=>window.paw.closeMenu());
    await page.evaluate(() => window.paw.action('hunt'));
    await petPage.locator('.butterfly').waitFor();
    await page.evaluate(()=>window.paw.update({alwaysOnTop:false,language:'en',theme:'dark',scale:1.3}));
    const petFlags=await electron.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('pet.html'));return {top:w.isAlwaysOnTop(),width:w.getBounds().width}});
    assert.equal(petFlags.top,false);assert.equal(petFlags.width,559);
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
    // Regress the actual preload File path boundary with a native-backed CDP drop,
    // rather than exercising only the file chooser.
    await page.evaluate(()=>window.paw.update({feedMode:'carry'}));
    const dropped=path.join(scratch,'paw-native-drop-test.txt');await fs.writeFile(dropped,'Native-backed drop regression.');
    await petPage.evaluate(()=>{window.__dropEvents=[];for(const name of ['dragenter','dragover','drop'])document.addEventListener(name,e=>window.__dropEvents.push({type:name,names:[...e.dataTransfer.files].map(f=>f.name),types:[...e.dataTransfer.types]}),true);window.paw.onFeedResult(r=>window.__dropEvents.push({result:r}));window.paw.menu();});
    const cdp=await electron.context().newCDPSession(petPage);
    const data={items:[],files:[dropped],dragOperationsMask:1};
    for(const type of ['dragEnter','dragOver','drop'])await cdp.send('Input.dispatchDragEvent',{type,x:270,y:300,data});
    let dropState; const deadline=Date.now()+15000;
    do { dropState=await petPage.evaluate(()=>window.paw.getState()); if(dropState.feed?.name==='paw-native-drop-test.txt'&&dropState.feed.phase==='done')break; await new Promise(r=>setTimeout(r,100)); } while(Date.now()<deadline);
    if(dropState.feed?.name!=='paw-native-drop-test.txt')console.log('DROP DIAGNOSTIC',await petPage.evaluate(()=>window.__dropEvents));
    assert.equal(dropState.feed?.phase,'done',JSON.stringify(dropState.feed));assert.equal(dropState.feed?.name,'paw-native-drop-test.txt');
    await assert.rejects(fs.access(dropped),{code:'ENOENT'});await cdp.detach();
    const saved = await page.evaluate(() => window.paw.getState());
    assert.equal(saved.activity, 'excited');
    assert.equal(saved.outfit.toy, 'ball');
    await electron.close(); electron = await launch();
    page = await dashboardWindow(electron);
    await page.locator('#pat-pet[data-skin=croc][data-renderer=webgl]').waitFor();
    const restored = await page.evaluate(() => window.paw.getState());
    assert.equal(restored.skin, 'croc'); assert.equal(restored.alwaysOnTop,false);assert.equal(restored.language,'en');assert.equal(restored.theme,'dark');assert.equal(restored.scale,1.3);assert.equal(restored.feedMode,'carry');assert.equal(restored.outfit.hat, 'beanie'); assert.equal(restored.outfit.toy, 'ball');
    console.log('ELECTRON PASS: transparent always-on-top pet; isolated renderer; IPC and accessories sync; hunting; glass radial menu; size, theme, language, topmost; real picker AND native-backed drop trash without confirmation; restart persistence.');
    console.log('Synthetic test file is recoverable from test Trash:', path.join(env.XDG_DATA_HOME, 'Trash'));
  } finally { if (electron) await electron.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
