const { app, BrowserWindow, Menu, ipcMain, screen, dialog, shell, Tray, nativeImage } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { sanitizeSettings, clampPosition, petWindowSize, STATES } = require('./model.cjs');
const { createSystemControls } = require('./system-controls.cjs');
const { createFeeder } = require('./feeding.cjs');

// Keep the same settings location for npm and packaged builds, including 0.1.
app.setName('paw-desktop-pet');
if (!app.requestSingleInstanceLock()) app.exit(0);
app.on('second-instance', () => { openDashboard(); showPet(); });
if (process.platform === 'win32') app.setAppUserModelId('app.paw.desktop');

let dashboard, petWindow, preferences, savePath, tray;
let activity = 'idle', activityUntil = Date.now() + 10000, direction = 1, dragging = null, feeding = false;
let menuOpen = false, feedState = null, carryMotion = null, ignoringMouse = false;
let saveQueue = Promise.resolve();
const system = createSystemControls();
const isSmoke = process.argv.includes('--smoke-test');
const nativeText = key => ({ru:{home:'Домик и гардероб',show:'Показать питомца',quit:'Выйти из Paw',feed:'Угости питомца ненужным файлом'},uk:{home:'Домівка та гардероб',show:'Показати улюбленця',quit:'Вийти з Paw',feed:'Пригости улюбленця непотрібним файлом'},en:{home:'Home & wardrobe',show:'Show my pet',quit:'Quit Paw',feed:'Treat your pet to an unwanted file'}}[preferences?.language || 'ru'][key]);
const state = () => ({ ...preferences, version: '0.2.0', activity, direction, menuOpen, feed: feedState, window: petWindowSize(preferences?.scale), platform: process.platform, desktop: true });
const broadcast = () => {
  for (const win of [dashboard, petWindow]) if (win && !win.isDestroyed()) win.webContents.send('paw:state', state());
};
function save() {
  const contents = JSON.stringify(preferences, null, 2);
  saveQueue = saveQueue.then(async () => {
    await fs.mkdir(path.dirname(savePath), { recursive: true });
    await fs.writeFile(`${savePath}.tmp`, contents);
    await fs.rename(`${savePath}.tmp`, savePath);
  }).catch(error => console.error('Preferences save failed:', error.message));
  return saveQueue;
}
function setActivity(value, duration = 8500) {
  activity = value;
  activityUntil = Date.now() + duration;
  broadcast();
}
async function update(patch) {
  if (!patch || typeof patch !== 'object') return state();
  const previousScale = preferences.scale;
  preferences = sanitizeSettings({ ...preferences, ...patch, outfit: { ...preferences.outfit, ...patch.outfit } });
  if (preferences.scale !== previousScale) resizePet();
  if (petWindow && !petWindow.isDestroyed()) petWindow.setAlwaysOnTop(preferences.alwaysOnTop);
  refreshTray();
  await save(); broadcast(); return state();
}
function secureWindow(win) {
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_, __, callback) => callback(false));
}
const webPreferences = { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true };
function openDashboard() {
  if (dashboard && !dashboard.isDestroyed()) { dashboard.show(); dashboard.focus(); return; }
  dashboard = new BrowserWindow({ width: 1180, height: 820, minWidth: 900, minHeight: 680, backgroundColor: '#f5f5ef', title: 'Paw · маленький друг', icon: path.join(__dirname, 'assets/icon.png'), autoHideMenuBar: true, webPreferences });
  secureWindow(dashboard);
  dashboard.loadFile(path.join(__dirname, 'index.html'));
  dashboard.on('closed', () => { dashboard = null; });
}
function showPet() {
  if (!petWindow || petWindow.isDestroyed()) return;
  petWindow.showInactive();
  petWindow.setIgnoreMouseEvents(false);
  return true;
}
function resizePet() {
  if (!petWindow || petWindow.isDestroyed()) return;
  const old = petWindow.getBounds(), size = petWindowSize(preferences.scale);
  const area = screen.getDisplayMatching(old).workArea;
  const position = clampPosition({ x: old.x + (old.width - size.width) / 2, y: old.y + old.height - size.height }, area, size);
  petWindow.setBounds({ ...position, ...size });
}
function createPet() {
  const area = screen.getPrimaryDisplay().workArea;
  const size = petWindowSize(preferences.scale);
  const position = clampPosition({ x: area.x + area.width - size.width - 30, y: area.y + area.height - size.height }, area, size);
  petWindow = new BrowserWindow({ ...size, ...position, frame: false, transparent: true, backgroundColor: '#00000000', resizable: false, hasShadow: false, alwaysOnTop: preferences.alwaysOnTop, skipTaskbar: true, webPreferences });
  secureWindow(petWindow);
  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Keep the native drop target alive. Click-through used to make Finder drops
  // disappear before Chromium could deliver the file to our preload listener.
  petWindow.setIgnoreMouseEvents(false);
  petWindow.loadFile(path.join(__dirname, 'pet.html'));
  petWindow.on('closed', () => { petWindow = null; });
}
function createTray() {
  const image = nativeImage.createFromPath(path.join(__dirname, 'assets/tray.png')).resize({ width: 18, height: 18 });
  if (process.platform === 'darwin') image.setTemplateImage(true);
  tray = new Tray(image);
  tray.setToolTip('Paw · маленький друг');
  refreshTray();
  tray.on('click', openDashboard);
}
function refreshTray() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: nativeText('home'), click: openDashboard },
    { label: nativeText('show'), click: showPet },
    { type: 'separator' },
    { label: nativeText('quit'), click: () => app.quit() },
  ]));
}
const feeder = createFeeder({
  trash: file => shell.trashItem(file),
  lstat: file => fs.lstat(file),
  chooseFiles: owner => dialog.showOpenDialog(owner, { title: nativeText('feed'), properties: ['openFile', 'multiSelections'] }),
  onPhase: value => {
    feedState = value;
    if (value.phase === 'working') {
      menuOpen = false;
      if (value.mode === 'carry' && petWindow && !petWindow.isDestroyed()) {
        const bounds = petWindow.getBounds(), area = screen.getDisplayMatching(bounds).workArea;
        carryMotion = { start: Date.now(), from: bounds, to: clampPosition({ x: area.x + area.width - bounds.width, y: area.y + area.height - bounds.height }, area, bounds) };
        direction = carryMotion.to.x < bounds.x ? -1 : 1;
      }
      setActivity(value.mode, 20000);
    } else {
      carryMotion = null;
      setActivity(value.phase === 'done' ? (value.mode === 'carry' ? 'excited' : 'eat') : 'sad', value.phase === 'done' ? 6000 : 6500);
    }
  },
});
async function feedFiles(sender, requestedPaths) {
  if (feeding) return { ok: false, message: 'Сначала закончим предыдущее кормление.' };
  feeding = true;
  try { return await feeder.feed(requestedPaths, { mode: preferences.feedMode, owner: BrowserWindow.fromWebContents(sender) }); }
  finally { feeding = false; }
}
function contextMenu() {
  if (feeding) return;
  menuOpen = !menuOpen;
  dragging = null;
  broadcast();
}
function closeMenu() { if (menuOpen) { menuOpen = false; broadcast(); } }
async function openSettings(kind) {
  if (!['wifi', 'bluetooth'].includes(kind)) return { ok: false };
  const url = system.getSettingsUrl(kind);
  if (!url) return { ok: false, message: 'Системные переключатели доступны в приложении для macOS и Windows.' };
  try { await shell.openExternal(url); return { ok: true }; }
  catch { return { ok: false, message: 'Открой этот раздел в системных настройках.' }; }
}
async function changeWifi(enabled) {
  if (typeof enabled !== 'boolean') return { ok: false };
  try { return { ok: true, status: await system.setWifi(enabled) }; }
  catch (error) {
    return { ok: false, message: error.message || 'Не удалось переключить Wi-Fi.' };
  }
}
async function changeBluetooth(enabled) {
  if (typeof enabled !== 'boolean') return { ok: false };
  try { return { ok: true, status: await system.setBluetooth(enabled) }; }
  catch (error) { return { ok: false, message: error.message }; }
}
async function reportSystem(pending) {
  const result = await pending;
  if (result && !result.ok && result.message && petWindow) await dialog.showMessageBox(petWindow, { type: 'info', message: result.message, buttons: ['Понятно'] });
}
function registerIpc() {
  const trusted = event => [dashboard, petWindow].some(w => w && !w.isDestroyed() && w.webContents === event.sender && event.senderFrame === event.sender.mainFrame);
  const handle = (channel, callback) => ipcMain.handle(channel, (event, ...args) => {
    if (!trusted(event)) throw new Error('Untrusted sender');
    return callback(event, ...args);
  });
  handle('paw:get-state', () => state());
  handle('paw:update', (_, patch) => update(patch));
  handle('paw:show-pet', showPet);
  handle('paw:dashboard', () => { closeMenu(); openDashboard(); return true; });
  handle('paw:hide', () => { closeMenu(); petWindow?.hide(); return true; });
  handle('paw:quit', () => { app.quit(); return true; });
  handle('paw:action', (_, value) => { if (!feeding && STATES.has(value)) { closeMenu(); setActivity(value, value === 'sleep' ? 120000 : 8500); } return state(); });
  handle('paw:feed', (event, paths) => feedFiles(event.sender, paths));
  handle('paw:system-status', () => system.getStatus());
  handle('paw:wifi', (_, enabled) => changeWifi(enabled));
  handle('paw:bluetooth', (_, enabled) => changeBluetooth(enabled));
  handle('paw:settings', (_, kind) => openSettings(kind));
  ipcMain.on('paw:menu', event => { if (trusted(event)) contextMenu(); });
  ipcMain.on('paw:close-menu', event => { if (trusted(event)) closeMenu(); });
  // Native cursor polling owns hit-testing so Finder/Explorer drags can enter
  // the pet even while Chromium is forwarding ordinary clicks through margins.
  ipcMain.on('paw:hit', () => {});
  ipcMain.on('paw:drag', (event, phase, point) => {
    if (!trusted(event) || event.sender !== petWindow?.webContents || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    if (phase === 'start' && !feeding && !menuOpen) { dragging = { point, bounds: petWindow.getBounds() }; }
    else if (phase === 'end') { dragging = null; }
    else if (phase === 'move' && dragging) {
      const target = { x: dragging.bounds.x + point.x - dragging.point.x, y: dragging.bounds.y + point.y - dragging.point.y };
      const area = screen.getDisplayNearestPoint(target).workArea;
      const pos = clampPosition(target, area, dragging.bounds);
      petWindow.setPosition(pos.x, pos.y);
    }
  });
}
function tick() {
  if (!petWindow || petWindow.isDestroyed()) return;
  const cursor = screen.getCursorScreenPoint(), bounds = petWindow.getBounds(), scale = preferences.scale;
  const relative = { x: (cursor.x - bounds.x) / scale, y: (cursor.y - bounds.y) / scale };
  const insidePet = relative.x >= 80 && relative.x <= 350 && relative.y >= 125 && relative.y <= 385;
  const shouldIgnore = !(insidePet || menuOpen || dragging || feeding);
  if (shouldIgnore !== ignoringMouse) { ignoringMouse = shouldIgnore; petWindow.setIgnoreMouseEvents(shouldIgnore, { forward: true }); }
  if (carryMotion && feeding) {
    const progress = Math.min(1, (Date.now() - carryMotion.start) / 1450);
    const ease = progress * progress * (3 - 2 * progress);
    petWindow.setPosition(Math.round(carryMotion.from.x + (carryMotion.to.x - carryMotion.from.x) * ease), Math.round(carryMotion.from.y + (carryMotion.to.y - carryMotion.from.y) * ease));
    return;
  }
  if (dragging || feeding || menuOpen) return;
  if (Date.now() > activityUntil) {
    const options = preferences.roaming ? ['idle', 'idle', 'walk', 'walk', 'play', 'hunt', 'sleep', 'stand', 'wave', 'stretch', 'excited'] : ['idle', 'play', 'sleep', 'stand', 'wave', 'stretch'];
    setActivity(options[Math.floor(Math.random() * options.length)], 12000 + Math.random() * 16000);
  }
  if (preferences.roaming && ['walk', 'hunt'].includes(activity) && petWindow.isVisible()) {
    const b = petWindow.getBounds();
    const area = screen.getDisplayMatching(b).workArea;
    const pos = clampPosition({ x: b.x + direction * (activity === 'hunt' ? 4 : 2), y: b.y }, area, b);
    if (pos.x === b.x) { direction *= -1; broadcast(); }
    petWindow.setPosition(pos.x, pos.y);
  }
}
app.whenReady().then(async () => {
  savePath = path.join(app.getPath('userData'), 'preferences.json');
  try { preferences = sanitizeSettings(JSON.parse(await fs.readFile(savePath, 'utf8'))); }
  catch { preferences = sanitizeSettings(); }
  registerIpc(); Menu.setApplicationMenu(null); openDashboard(); createPet(); createTray();
  setInterval(tick, 60).unref();
  screen.on('display-metrics-changed', () => {
    if (!petWindow) return;
    const b = petWindow.getBounds(), p = clampPosition(b, screen.getDisplayMatching(b).workArea, b);
    petWindow.setPosition(p.x, p.y);
  });
  if (isSmoke) {
    setTimeout(async () => {
      try {
        const result = await dashboard.webContents.executeJavaScript(`({ title: document.title, pets: document.querySelectorAll('.pet-card[data-skin]').length, bridge: !!window.paw, pet: !!document.querySelector('canvas.pet-3d, svg.pet-art') })`);
        if (!result.bridge || !result.pet || result.pets !== 3) throw new Error(JSON.stringify(result));
        console.log('PAW ELECTRON SMOKE PASS', JSON.stringify(result)); app.exit(0);
      } catch (error) { console.error(error); app.exit(1); }
    }, 3500);
  }
});
app.on('window-all-closed', () => app.quit());
app.on('activate', openDashboard);
