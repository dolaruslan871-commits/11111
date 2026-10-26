const { app, BrowserWindow, Menu, ipcMain, screen, dialog, shell, Tray, nativeImage } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { sanitizeSettings, clampPosition, STATES } = require('./model.cjs');
const { createSystemControls } = require('./system-controls.cjs');

let dashboard, petWindow, preferences, savePath, tray;
let activity = 'idle', activityUntil = Date.now() + 10000, direction = 1, dragging = null, feeding = false;
let saveQueue = Promise.resolve();
const system = createSystemControls();
const isSmoke = process.argv.includes('--smoke-test');
const state = () => ({ ...preferences, activity, direction, platform: process.platform, desktop: true });
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
  preferences = sanitizeSettings({ ...preferences, ...patch, outfit: { ...preferences.outfit, ...patch.outfit } });
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
function createPet() {
  const area = screen.getPrimaryDisplay().workArea;
  petWindow = new BrowserWindow({ width: 246, height: 250, x: area.x + area.width - 290, y: area.y + area.height - 260, frame: false, transparent: true, backgroundColor: '#00000000', resizable: false, hasShadow: false, alwaysOnTop: true, skipTaskbar: true, webPreferences });
  secureWindow(petWindow);
  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  petWindow.loadFile(path.join(__dirname, 'pet.html'));
  petWindow.on('closed', () => { petWindow = null; });
}
function createTray() {
  const image = nativeImage.createFromPath(path.join(__dirname, 'assets/tray.png')).resize({ width: 18, height: 18 });
  if (process.platform === 'darwin') image.setTemplateImage(true);
  tray = new Tray(image);
  tray.setToolTip('Paw · маленький друг');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Домик и гардероб', click: openDashboard },
    { label: 'Показать питомца', click: showPet },
    { type: 'separator' },
    { label: 'Выйти из Paw', click: () => app.quit() },
  ]));
  tray.on('click', openDashboard);
}
async function feedFiles(sender, requestedPaths) {
  if (feeding) return { ok: false, message: 'Сначала закончим предыдущее кормление.' };
  feeding = true;
  const owner = BrowserWindow.fromWebContents(sender);
  try {
    let paths = requestedPaths;
    if (paths === null) {
      const selected = await dialog.showOpenDialog(owner, { title: 'Угости питомца ненужным файлом', properties: ['openFile', 'multiSelections'] });
      if (selected.canceled) return { ok: false, canceled: true };
      paths = selected.filePaths;
    }
    if (!Array.isArray(paths) || !paths.length || paths.length > 20 || !paths.every(p => typeof p === 'string' && path.isAbsolute(p))) return { ok: false, message: 'Выбери от 1 до 20 обычных файлов.' };
    paths = [...new Set(paths)];
    for (const file of paths) if (!(await fs.lstat(file)).isFile()) return { ok: false, message: 'Пока можно кормить только файлами, без папок и ссылок.' };
    let count = 0;
    for (const file of paths) {
      try { await shell.trashItem(file); count++; }
      catch { return { ok: false, message: `В корзине: ${count} из ${paths.length}. Остальные файлы переместить не удалось.` }; }
    }
    setActivity('eat', 6000);
    return { ok: true, count, message: 'Ням! Файлы теперь в корзине.' };
  } catch { return { ok: false, message: 'Не удалось прочитать файл или открыть корзину. Файлы не удалялись безвозвратно.' }; }
  finally { feeding = false; }
}
function contextMenu() {
  const template = [
    { label: 'Paw · маленький друг', enabled: false },
    { label: 'Погладить ♡', click: () => setActivity('pet', 4500) },
    { label: 'Поиграть', click: () => setActivity('play', 10000) },
    { label: activity === 'sleep' ? 'Разбудить' : 'Уложить спать', click: () => setActivity(activity === 'sleep' ? 'idle' : 'sleep', 120000) },
    { label: 'Покормить файлом…', click: () => feedFiles(petWindow.webContents, null) },
    { type: 'separator' },
    { label: 'Выключить звук', type: 'checkbox', checked: preferences.muted, click: item => update({ muted: item.checked }) },
    { label: 'Гулять по экрану', type: 'checkbox', checked: preferences.roaming, click: item => update({ roaming: item.checked }) },
    { label: 'Wi-Fi', submenu: [
      { label: 'Включить', click: () => reportSystem(changeWifi(true)) },
      { label: 'Выключить', click: () => reportSystem(changeWifi(false)) },
      { label: 'Настройки Wi-Fi…', click: () => openSettings('wifi') },
    ] },
    { label: 'Bluetooth', submenu: [
      ...(process.platform === 'win32' ? [
        { label: 'Включить', click: () => reportSystem(changeBluetooth(true)) },
        { label: 'Выключить', click: () => reportSystem(changeBluetooth(false)) },
      ] : []),
      { label: 'Настройки Bluetooth…', click: () => reportSystem(openSettings('bluetooth')) },
    ] },
    { type: 'separator' },
    { label: 'Домик и гардероб…', click: openDashboard },
    { label: 'Спрятать питомца', click: () => petWindow.hide() },
    { label: 'Выйти из Paw', click: () => app.quit() },
  ];
  Menu.buildFromTemplate(template).popup({ window: petWindow });
}
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
  handle('paw:action', (_, value) => { if (STATES.has(value)) setActivity(value, value === 'sleep' ? 120000 : 8500); return state(); });
  handle('paw:feed', (event, paths) => feedFiles(event.sender, paths));
  handle('paw:system-status', () => system.getStatus());
  handle('paw:wifi', (_, enabled) => changeWifi(enabled));
  handle('paw:bluetooth', (_, enabled) => changeBluetooth(enabled));
  handle('paw:settings', (_, kind) => openSettings(kind));
  ipcMain.on('paw:menu', event => { if (trusted(event)) contextMenu(); });
  ipcMain.on('paw:hit', (event, value) => { if (trusted(event) && event.sender === petWindow?.webContents) petWindow.setIgnoreMouseEvents(!value, { forward: true }); });
  ipcMain.on('paw:drag', (event, phase, point) => {
    if (!trusted(event) || event.sender !== petWindow?.webContents || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    if (phase === 'start') { dragging = { point, bounds: petWindow.getBounds() }; }
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
  if (!petWindow || petWindow.isDestroyed() || dragging || feeding) return;
  if (Date.now() > activityUntil) {
    const options = preferences.roaming ? ['idle', 'idle', 'walk', 'walk', 'play', 'hunt', 'sleep'] : ['idle', 'play', 'sleep'];
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
        const result = await dashboard.webContents.executeJavaScript(`({ title: document.title, pets: document.querySelectorAll('[data-skin]').length, bridge: !!window.paw, svg: !!document.querySelector('svg.pet-art') })`);
        if (!result.bridge || !result.svg || result.pets !== 3) throw new Error(JSON.stringify(result));
        console.log('PAW ELECTRON SMOKE PASS', JSON.stringify(result)); app.exit(0);
      } catch (error) { console.error(error); app.exit(1); }
    }, 3500);
  }
});
app.on('window-all-closed', () => app.quit());
app.on('activate', openDashboard);
