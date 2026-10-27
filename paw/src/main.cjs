const { widgetLayout } = require("./widget-layout.cjs");
const desktopMotion = require("./desktop-motion.cjs");
const { buildHome } = require("./home-model.cjs");
const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  screen,
  dialog,
  shell,
  Tray,
  nativeImage,
  desktopCapturer,
  powerMonitor,
} = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const {
  sanitizeSettings,
  clampPosition,
  petWindowSize,
  STATES,
} = require("./model.cjs");
const { createSystemControls } = require("./system-controls.cjs");
const { createFeeder } = require("./feeding.cjs");
const { createWeather } = require("./weather.cjs");
const weather = createWeather();
const V5 = require("./v5-model.cjs");
const { registerV5, createDesktopShortcut } = require("./v5-services.cjs");
const gameEngine = require("./game-engine.cjs").createGameEngine();
let menuAnchor = null, menuArea = null, menuDialogDepth = 0, menuSession = 0;
let menuWindow = null,
  houseWindow = null,
  toyWindow = null,
  visualRect = { x: 85, y: 130, width: 260, height: 240 },
  bodyRect = { x: 85, y: 130, width: 260, height: 240 },
  restState = {},
  meal = null,
  mealFinish = null,
  toyAnchor = null,
  widgetRects = [{ x: 0, y: 0, width: 320, height: 560 }];
function petArea(b) {
  const k = preferences?.scale || 1;
  return screen.getDisplayNearestPoint({
    x: Math.round(b.x + (visualRect.x + visualRect.width / 2) * k),
    y: Math.round(b.y + (visualRect.y + visualRect.height / 2) * k),
  }).workArea;
}
function petClamp(position, area) {
  const k = preferences?.scale || 1;
  return V5.clampVisiblePosition(position, area, {
    x: bodyRect.x * k,
    y: bodyRect.y * k,
    width: bodyRect.width * k,
    height: bodyRect.height * k,
  });
}
function nativeAppearance(win) {
  if (!win || win.isDestroyed()) return;
  try {
    if (process.platform === "darwin") {
      win.setVibrancy(win !== menuWindow && preferences.glass ? "under-window" : null);
      win.setOpacity(preferences.windowOpacity);
    } else if (process.platform === "win32") {
      win.setBackgroundMaterial(win !== menuWindow && preferences.glass ? "acrylic" : "none");
      win.setOpacity(preferences.windowOpacity);
    }
  } catch {}
}
function openWidget() {
  if (!petWindow || petWindow.isDestroyed()) return;
  const b = petWindow.getBounds(),
    area = petArea(b),
    k = preferences.scale;
  const width = Math.min(320, area.width), height = Math.min(620, area.height);
  const pos = clampPosition({
    x: b.x + (visualRect.x + visualRect.width) * k + 12,
    y: b.y + visualRect.y * k - height + 40,
  }, area, {width,height});
  menuAnchor = pos; menuArea = area;
  widgetRects = [{x:5,y:5,width:300,height:height-10}];
  if (!menuWindow || menuWindow.isDestroyed()) {
    menuWindow = new BrowserWindow({
      ...pos,
      width,
      height,
      frame: false,
      transparent: true,
      backgroundColor: "#00000000",
      show: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      webPreferences,
    });
    secureWindow(menuWindow);
    const win = menuWindow;
    win.once("ready-to-show", () => {
      if (menuOpen && !quitting && menuWindow === win) void showWindowAnimated(win, { focus: true });
    });
    win.on("blur", () => {
      if (menuOpen && !menuDialogDepth && menuWindow === win) closeMenu();
    });
    menuWindow.loadFile(path.join(__dirname, "widget.html"));
    menuWindow.on("closed", () => {
      menuWindow = null;
      if (menuOpen) {
        menuOpen = false;
        broadcast();
      }
    });
  } else {
    menuWindow.setBounds({ ...pos, width, height });
    void showWindowAnimated(menuWindow, { focus: true });
  }
  nativeAppearance(menuWindow);
  if (menuWindow.isVisible()) menuWindow.focus();
}
function habitatWindow(kind) {
  const area = screen.getPrimaryDisplay().workArea,
    size =
      kind === "house"
        ? { width: 280, height: 240 }
        : { width: 200, height: 140 };
  const pos = clampPosition(
    kind === "house"
      ? {
          x: area.x + area.width - size.width - 10,
          y: area.y + area.height - size.height - 8,
        }
      : toyAnchor || {
          x: area.x + area.width - size.width - 280,
          y: area.y + area.height - size.height,
        },
    area,
    size,
  );
  const win = new BrowserWindow({
    ...pos,
    ...size,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    resizable: false,
    alwaysOnTop: preferences.alwaysOnTop,
    skipTaskbar: true,
    focusable: false,
    webPreferences,
  });
  win.setIgnoreMouseEvents(true);
  secureWindow(win);
  win.loadFile(path.join(__dirname, "habitat.html"), { query: { kind } });
  return win;
}
function syncHabitat() {
  if (!life || quitting) return;
  const show = preferences.showHouse && life.house >= 10;
  if (show) {
    if (!houseWindow || houseWindow.isDestroyed())
      houseWindow = habitatWindow("house");
    if (!houseWindow.isVisible()) houseWindow.showInactive();
  } else houseWindow?.hide();
  const rests = [
      "sit",
      "groom",
      "yawn",
      "curl",
      "sleep",
      "home",
      "play",
      "eat",
      "grateful",
    ].includes(activity),
    hasToy = preferences.outfit.toy && preferences.outfit.toy !== "none";
  if (rests && hasToy) {
    if (!toyAnchor && petWindow) {
      const b = petWindow.getBounds();
      toyAnchor = {
        x:
          b.x +
          (visualRect.x + visualRect.width) * preferences.scale +
          preferences.toyDistance -
          80,
        y: b.y + (visualRect.y + visualRect.height) * preferences.scale - 100,
      };
    }
    if (!toyWindow || toyWindow.isDestroyed()) toyWindow = habitatWindow("toy");
    toyWindow.showInactive();
  } else toyWindow?.hide();
}

const lifeAPI = require("./life.cjs");
const { sanitizeTasks, dueTasks } = require("./productivity.cjs");
const tools = require("./desktop-tools.cjs").createDesktopTools();
const catalog = require("./catalog.json");
let life,
  tasks = [],
  timer = null,
  game = null,
  progressPath,
  lastProgressSave = 0,
  lastIdle = 0,
  weatherValue = null,
  batteryValue = { supported: false },
  foregroundValue = { supported: false },
  lastContext = 0,
  lastBattery = 0;
let gaze = { x: 0, y: 0 },
  lastGaze = 0;
let notice = null,
  progressQueue = Promise.resolve(),
  screenshotSession = null;
const games = new Set(["fish", "butterflies", "ball", "hide"]);
function progress() {
  return {
    ...lifeAPI.snapshot(life),
    inventory: V5.stock(life.inventory),
    garden: life.garden || [],
    adventure: gameEngine.view(life).session,
    tasks,
    timer,
    game: game
      ? {
          id: game.id,
          type: game.type,
          score: game.score,
          ends: game.ends,
          target: game.target,
          targetAt: game.targetAt,
          ready: game.ready,
        }
      : null,
  };
}
function saveProgress() {
  if (!progressPath) return Promise.resolve();
  const text = JSON.stringify({ life, tasks, timer });
  progressQueue = progressQueue
    .then(async () => {
      await fs.mkdir(path.dirname(progressPath), { recursive: true });
      await fs.writeFile(progressPath + ".tmp", text);
      await fs.rename(progressPath + ".tmp", progressPath);
    })
    .catch((e) => console.error("Progress save:", e.message));
  return progressQueue;
}
function announce(kind, text = "") {
  notice = { kind, text, at: Date.now() };
  broadcast();
}
async function refreshEnvironment() {
  if (preferences.weatherCity)
    weatherValue = await weather.get(
      preferences.weatherCity,
      preferences.language,
    );
  batteryValue = await tools.battery();
  broadcast();
}

// Keep the same settings location for npm and packaged builds, including 0.1.
app.setName("paw-desktop-pet");
const testProfile = process.argv
  .find((x) => x.startsWith("--paw-test-profile="))
  ?.slice("--paw-test-profile=".length);
if (!app.isPackaged && testProfile && path.isAbsolute(testProfile)) {
  require("node:fs").mkdirSync(testProfile, { recursive: true });
  app.setPath("userData", testProfile);
}

if (!app.requestSingleInstanceLock()) app.exit(0);
app.on("second-instance", () => {
  openDashboard();
  showPet();
});
if (process.platform === "win32") app.setAppUserModelId("app.paw.desktop");

let dashboard, petWindow, preferences, savePath, tray;
let activity = "idle",
  activityUntil = Date.now() + 10000,
  direction = 1,
  dragging = null,
  feeding = false;
let menuOpen = false,
  feedState = null,
  carryMotion = null,
  ignoringMouse = false;
let motion = desktopMotion.newMotion(), motionTimer = null, lastMotionFrame = 0,
  lastMotionBroadcast = 0, lastWindowInterest = 0, lastMotionSnapshot = 0,
  lastSupportedWindows = 0;
let transport = null, transportTimer = null;
let saveQueue = Promise.resolve();
const system = createSystemControls();
const isSmoke = process.argv.includes("--smoke-test");
const nativeText = (key) =>
  ({
    ru: {
      home: "Домик и гардероб",
      show: "Показать питомца",
      quit: "Выйти из Paw",
      feed: "Отправить в корзину",
    },
    uk: {
      home: "Домівка та гардероб",
      show: "Показати улюбленця",
      quit: "Вийти з Paw",
      feed: "Надіслати до кошика",
    },
    en: {
      home: "Home & wardrobe",
      show: "Show my pet",
      quit: "Quit Paw",
      feed: "Move to Trash",
    },
  })[preferences?.language || "ru"][key];
const effectivePetScale = () => preferences?.scale || 1;
const state = () => ({
  ...preferences,
  version: app.getVersion(),
  life: life ? progress() : null,
  weather: weatherValue,
  battery: batteryValue,
  season: lifeAPI.season(new Date()),
  gaze,
  notice,
  foreground: foregroundValue,
  motion: desktopMotion.publicMotion(motion),
  meal,
  habitat: {
    houseVisible: preferences.showHouse && life?.house >= 10,
    nearHouse:
      !!houseWindow &&
      !houseWindow.isDestroyed() &&
      !!petWindow &&
      Math.hypot(
        houseWindow.getBounds().x - petWindow.getBounds().x,
        houseWindow.getBounds().y - petWindow.getBounds().y,
      ) < 210,
    toyAnchor,
  },
  approachingHouse:
    activity === "home" &&
    houseWindow &&
    !houseWindow.isDestroyed() &&
    petWindow &&
    Math.hypot(
      houseWindow.getBounds().x - petWindow.getBounds().x,
      houseWindow.getBounds().y - petWindow.getBounds().y,
    ) > 210,
  approachingToy:
    activity === "play" &&
    toyAnchor &&
    petWindow &&
    Math.abs(
      toyAnchor.x -
        petWindow.getBounds().x -
        visualRect.x * preferences.scale -
        visualRect.width * preferences.scale * 0.5,
    ) > 120,
  activity,
  direction,
  menuOpen,
  menuSession,
  feed: feedState,
  window: petWindowSize(effectivePetScale()),
  displayScale: effectivePetScale(),
  visibleBounds: visualRect,
  platform: process.platform,
  desktop: true,
});
const broadcast = () => {
  for (const win of [dashboard, petWindow, menuWindow, houseWindow, toyWindow])
    if (win && !win.isDestroyed()) win.webContents.send("paw:state", state());
};
function save() {
  const contents = JSON.stringify(preferences, null, 2);
  saveQueue = saveQueue
    .then(async () => {
      await fs.mkdir(path.dirname(savePath), { recursive: true });
      await fs.writeFile(`${savePath}.tmp`, contents);
      await fs.rename(`${savePath}.tmp`, savePath);
    })
    .catch((error) => console.error("Preferences save failed:", error.message));
  return saveQueue;
}
function setActivity(value, duration = 8500) {
  activity = value;
  activityUntil = Date.now() + duration;
  broadcast();
}
async function update(patch, { allowShortcut = false } = {}) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch))
    return state();
  patch = { ...patch };
  if (!allowShortcut) {
    if (patch.shortcut !== null) delete patch.shortcut;
    delete patch.shortcuts;
    delete patch.browser;
    delete patch.player;
  }
  const previousScale = preferences.scale;
  const previousToy = preferences.outfit.toy,
    previousDistance = preferences.toyDistance;
  const merged = {
    ...preferences,
    ...patch,
    behavior: { ...preferences.behavior, ...patch.behavior },
    outfit: { ...preferences.outfit, ...patch.outfit },
  };
  for (const [category, id] of Object.entries(merged.outfit)) {
    const item = catalog.wardrobe[category]?.find((x) => x.id === id);
    if (item?.price && !life.gifts.includes(category + ":" + id))
      merged.outfit[category] = preferences.outfit[category];
  }
  preferences = sanitizeSettings(merged);
  if (
    previousToy !== preferences.outfit.toy ||
    previousDistance !== preferences.toyDistance
  ) {
    toyAnchor = null;
    toyWindow?.close();
    toyWindow = null;
  }
  if (dashboard && process.platform !== "linux")
    dashboard.setOpacity(preferences.windowOpacity);
  if (menuWindow && process.platform !== "linux")
    menuWindow.setOpacity(preferences.windowOpacity);
  syncHabitat();
  nativeAppearance(dashboard);
  nativeAppearance(menuWindow);
  if (
    ["darwin", "win32"].includes(process.platform) &&
    patch.autostart !== undefined
  )
    app.setLoginItemSettings({ openAtLogin: preferences.autostart });
  if (patch.weatherCity !== undefined) void refreshEnvironment();
  if (preferences.scale !== previousScale) resizePet();
  if (patch.welcomeVersion === "0.5") showPet();
  if (petWindow && !petWindow.isDestroyed())
    petWindow.setAlwaysOnTop(preferences.alwaysOnTop);
  for (const win of [houseWindow, toyWindow])
    if (win && !win.isDestroyed()) win.setAlwaysOnTop(preferences.alwaysOnTop);
  nativeAppearance(dashboard);
  nativeAppearance(menuWindow);
  refreshTray();
  broadcast();
  await save();
  return state();
}
function secureWindow(win) {
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event) => event.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_, __, callback) =>
    callback(false),
  );
}
const webPreferences = {
  preload: path.join(__dirname, "preload.cjs"),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
};
const windowTransitions = new WeakMap();
async function rendererWindowMotion(win, phase) {
  if (!win || win.isDestroyed()) return;
  let timeout;
  try {
    await Promise.race([
      win.webContents.executeJavaScript(`window.pawWindowMotion?.(${JSON.stringify(phase)})`).catch(() => {}),
      new Promise(resolve => { timeout = setTimeout(resolve, 260); }),
    ]);
  } finally { clearTimeout(timeout); }
}
async function showWindowAnimated(win, { inactive = false, focus = false } = {}) {
  if (!win || win.isDestroyed()) return;
  const token = (windowTransitions.get(win) || 0) + 1;
  windowTransitions.set(win, token);
  if (!win.isVisible()) await rendererWindowMotion(win, "prepare-show");
  if (win.isDestroyed() || windowTransitions.get(win) !== token || quitting) return;
  inactive ? win.showInactive() : win.show();
  if (focus) win.focus();
  void rendererWindowMotion(win, "show");
}
async function hideWindowAnimated(win) {
  if (!win || win.isDestroyed()) return;
  const token = (windowTransitions.get(win) || 0) + 1;
  windowTransitions.set(win, token);
  await rendererWindowMotion(win, "hide");
  if (!win.isDestroyed() && windowTransitions.get(win) === token) win.hide();
}
function nativeWindowSnapshot() {
  const snapshot = tools.windows();
  const now = Date.now();
  if (snapshot.supported) lastSupportedWindows = now;
  const windows = snapshot.supported ? snapshot.windows.map(window => {
    let bounds = window.bounds;
    if (snapshot.coordinateSpace === "screen" && process.platform === "win32") {
      // Win32/DWM returns physical pixels; native Electron positions are DIPs.
      try { bounds = screen.screenToDipRect(null, bounds); } catch { return null; }
    }
    return { ...window, bounds };
  }).filter(Boolean) : [];
  return { ...snapshot, windows, known: snapshot.supported || now - lastSupportedWindows > 4000 };
}
function stopMotionFrames() {
  clearInterval(motionTimer); motionTimer = null;
}
function stopTransport() {
  clearInterval(transportTimer); transportTimer = null; transport = null;
}
function advanceTransport(frame = performance.now()) {
  if (!transport) return;
  if (!petWindow || petWindow.isDestroyed() || !petWindow.isVisible() ||
      motion.phase !== "grounded" || dragging || menuOpen || (feeding && !transport.allowFeeding)) { stopTransport(); return; }
  const t = Math.min(1, (frame - transport.started) / 60);
  const x = Math.round(transport.from.x + (transport.to.x - transport.from.x) * t);
  const y = Math.round(transport.from.y + (transport.to.y - transport.from.y) * t);
  const before = petWindow.getBounds();
  if (before.x !== x || before.y !== y) petWindow.setPosition(x, y);
  if (t === 1) stopTransport();
}
function movePetSmoothly(to, { allowFeeding = false } = {}) {
  advanceTransport();
  const bounds = petWindow.getBounds();
  if (bounds.x === to.x && bounds.y === to.y) return;
  transport = { from: { x: bounds.x, y: bounds.y }, to, started: performance.now(), allowFeeding };
  if (!transportTimer) { transportTimer = setInterval(advanceTransport, 16); transportTimer.unref(); }
}
function writeMotionPosition() {
  if (!petWindow || petWindow.isDestroyed()) return;
  const x = Math.round(motion.position.x), y = Math.round(motion.position.y);
  const previous = petWindow.getBounds();
  if (previous.x !== x || previous.y !== y) petWindow.setPosition(x, y);
}
function startMotionFrames() {
  if (motionTimer || ["held", "grounded"].includes(motion.phase)) return;
  stopTransport();
  lastMotionFrame = performance.now();
  motionTimer = setInterval(() => {
    if (quitting || !petWindow || petWindow.isDestroyed() || !petWindow.isVisible() || feeding) { stopMotionFrames(); return; }
    const now = Date.now(), frame = performance.now(), dt = (frame - lastMotionFrame) / 1000;
    lastMotionFrame = frame;
    const snapshot = nativeWindowSnapshot(), before = motion;
    motion = desktopMotion.step(motion, dt, {
      area: petArea(motion.position), rect: bodyRect, scale: effectivePetScale(),
      windows: snapshot.windows, windowsKnown: snapshot.known, now,
    });
    writeMotionPosition();
    const phaseChanged = motion.phase !== before.phase;
    if (phaseChanged) setActivity(motion.phase === "grounded" ? "idle" : motion.phase, motion.phase === "grounded" ? 6000 : 650000);
    else if (now - lastMotionBroadcast >= 45) { lastMotionBroadcast = now; broadcast(); }
    if (motion.phase === "grounded" || motion.phase === "held") stopMotionFrames();
    else if (motion.phase === "perch" && now - motion.perch.caughtAt > 450 && motion.canopy === 0 && Math.hypot(motion.position.x - before.position.x, motion.position.y - before.position.y) < .08) {
      lastMotionSnapshot = snapshot.observedAt;
      stopMotionFrames();
    }
  }, 16);
  motionTimer.unref();
}
function releasePet(point, { allowWindows = true } = {}) {
  if (!petWindow || petWindow.isDestroyed()) return;
  const bounds = petWindow.getBounds();
  motion.position = { x: bounds.x, y: bounds.y };
  const snapshot = nativeWindowSnapshot();
  motion = desktopMotion.release(motion, {
    area: petArea(bounds), rect: bodyRect, scale: effectivePetScale(), point,
    windows: allowWindows && preferences.behavior.windowInteraction ? snapshot.windows : [], now: Date.now(),
  });
  setActivity(motion.phase, 650000);
  startMotionFrames();
}
function resetDesktopMotion() {
  stopMotionFrames(); stopTransport(); dragging = null;
  if (petWindow && !petWindow.isDestroyed()) {
    const bounds = petWindow.getBounds();
    motion = desktopMotion.newMotion({ x: bounds.x, y: bounds.y }, Date.now());
  }
}
function openDashboard(section) {
  const target = [
    "home",
    "wardrobe",
    "settings",
    "life",
    "tools",
    "games",
    "studio",
  ].includes(section)
    ? section
    : null;
  if (dashboard && !dashboard.isDestroyed()) {
    void showWindowAnimated(dashboard, { focus: true });
    if (target) dashboard.webContents.send("paw:navigate", target);
    return;
  }
  dashboard = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 900,
    minHeight: 680,
    backgroundColor: "#f5f5ef",
    title: "Paw · маленький друг",
    icon: path.join(__dirname, "assets/icon.png"),
    autoHideMenuBar: true,
    show: false,
    webPreferences,
  });
  if (process.platform !== "linux")
    dashboard.setOpacity(preferences.windowOpacity);
  nativeAppearance(dashboard);
  secureWindow(dashboard);
  const win = dashboard;
  win.once("ready-to-show", () => void showWindowAnimated(win, { focus: true }));
  win.on("close", (event) => {
    if (quitting || win._pawAnimatedClose) return;
    event.preventDefault();
    const token = (windowTransitions.get(win) || 0) + 1;
    windowTransitions.set(win, token);
    void rendererWindowMotion(win, "hide").then(() => {
      if (!win.isDestroyed() && windowTransitions.get(win) === token) { win._pawAnimatedClose = true; win.close(); }
    });
  });
  dashboard.loadFile(path.join(__dirname, "index.html")).then(() => {
    if (target && dashboard && !dashboard.isDestroyed())
      dashboard.webContents.send("paw:navigate", target);
  });
  dashboard.on("closed", () => {
    dashboard = null;
  });
}
function showPet() {
  if (!petWindow || petWindow.isDestroyed()) return;
  petWindow.showInactive();
  petWindow.setIgnoreMouseEvents(false);
  if (motion.phase !== "grounded") startMotionFrames();
  return true;
}
function resizePet() {
  if (!petWindow || petWindow.isDestroyed()) return;
  resetDesktopMotion();
  const old = petWindow.getBounds(),
    size = petWindowSize(effectivePetScale());
  const area = petArea(old);
  const position = petClamp(
    {
      x: old.x + (old.width - size.width) / 2,
      y: old.y + old.height - size.height,
    },
    area,
    size,
  );
  petWindow.setBounds({ ...position, ...size });
  motion = desktopMotion.newMotion(position, Date.now());
}
function createPet() {
  const area = screen.getPrimaryDisplay().workArea;
  const size = petWindowSize(preferences.scale);
  const position = petClamp(
    {
      x: area.x + area.width - size.width - 30,
      y: area.y + area.height - size.height,
    },
    area,
    size,
  );
  petWindow = new BrowserWindow({
    ...size,
    ...position,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    resizable: false,
    hasShadow: false,
    alwaysOnTop: preferences.alwaysOnTop,
    skipTaskbar: true,
    show: preferences.welcomeVersion === "0.5",
    webPreferences,
  });
  motion = desktopMotion.newMotion(position, Date.now());
  secureWindow(petWindow);
  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Keep the native drop target alive. Click-through used to make Finder drops
  // disappear before Chromium could deliver the file to our preload listener.
  petWindow.setIgnoreMouseEvents(false);
  petWindow.loadFile(path.join(__dirname, "pet.html"));
  petWindow.on("closed", () => {
    stopMotionFrames(); stopTransport(); tools.trackWindows(false);
    petWindow = null;
  });
}
function createTray() {
  const image = nativeImage
    .createFromPath(path.join(__dirname, "assets/tray.png"))
    .resize({ width: 18, height: 18 });
  if (process.platform === "darwin") image.setTemplateImage(true);
  tray = new Tray(image);
  tray.setToolTip("Paw · маленький друг");
  refreshTray();
  tray.on("click", openDashboard);
}
function refreshTray() {
  if (!tray) return;
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: nativeText("home"), click: openDashboard },
      { label: nativeText("show"), click: showPet },
      { type: "separator" },
      { label: nativeText("quit"), click: () => app.quit() },
    ]),
  );
}
const feeder = createFeeder({
  realpath: (file) => fs.realpath(file),
  trash: (file) => shell.trashItem(file),
  lstat: (file) => fs.lstat(file),
  protectedPaths: [
    app.getAppPath(),
    app.getPath("userData"),
    path.dirname(app.getPath("exe")),
  ],
  chooseFiles: async (owner) => {
    const labels = {
      ru: ["Файлы", "Папки", "Отмена"],
      uk: ["Файли", "Папки", "Скасувати"],
      en: ["Files", "Folders", "Cancel"],
    }[preferences.language];
    const choice = await dialog.showMessageBox(owner, {
      type: "question",
      message: nativeText("feed"),
      buttons: labels,
      defaultId: 0,
      cancelId: 2,
      noLink: true,
    });
    if (choice.response === 2) return { canceled: true, filePaths: [] };
    return dialog.showOpenDialog(owner, {
      title: nativeText("feed"),
      properties: [
        choice.response === 1 ? "openDirectory" : "openFile",
        "multiSelections",
      ],
    });
  },
  onPhase: (value) => {
    feedState = value;
    if (value.phase === "working") {
      if (menuOpen) {
        menuOpen = false;
        resizePet();
      }
      if (value.mode === "carry" && petWindow && !petWindow.isDestroyed()) {
        resetDesktopMotion();
        const bounds = petWindow.getBounds(),
          area = petArea(bounds);
        carryMotion = {
          start: Date.now(),
          from: bounds,
          to: clampPosition(
            {
              x: area.x + area.width - bounds.width,
              y: area.y + area.height - bounds.height,
            },
            area,
            bounds,
          ),
        };
        direction = carryMotion.to.x < bounds.x ? -1 : 1;
      }
      setActivity(value.mode, 20000);
    } else {
      carryMotion = null;
      setActivity(
        value.phase === "done"
          ? value.mode === "carry"
            ? "excited"
            : "eat"
          : "sad",
        value.phase === "done" ? 6000 : 6500,
      );
    }
  },
});
async function feedFiles(sender, requestedPaths) {
  if (feeding)
    return { ok: false, message: "Сначала закончим предыдущее кормление." };
  feeding = true;
  stopMotionFrames();
  try {
    return await feeder.feed(requestedPaths, {
      mode: preferences.feedMode,
      owner: BrowserWindow.fromWebContents(sender),
    });
  } finally {
    feeding = false;
    if (motion.phase !== "grounded") startMotionFrames();
  }
}
function contextMenu() {
  if (feeding) return;
  menuOpen = !menuOpen;
  if (dragging) releasePet(screen.getCursorScreenPoint(), { allowWindows: false });
  dragging = null;
  if (menuOpen) {menuSession++;openWidget();}
  else void hideWindowAnimated(menuWindow);
  broadcast();
}
function closeMenu() {
  if (menuOpen) {
    menuOpen = false;
    void hideWindowAnimated(menuWindow);
    broadcast();
  }
}
async function openSettings(kind) {
  if (!["audio", "bluetooth"].includes(kind)) return { ok: false };
  const url = system.getSettingsUrl(kind);
  if (!url)
    return {
      ok: false,
      message:
        "Системные переключатели доступны в приложении для macOS и Windows.",
    };
  try {
    await shell.openExternal(url);
    return { ok: true };
  } catch {
    return { ok: false, message: "Открой этот раздел в системных настройках." };
  }
}
async function changeAudio(enabled) {
  if (typeof enabled !== "boolean") return { ok: false };
  try {
    return { ok: true, status: await system.setAudio(enabled) };
  } catch {
    return {
      ok: false,
      message:
        "Не удалось переключить звук устройства. Открой настройки звука.",
    };
  }
}
async function validateApp(file) {
  if (typeof file !== "string" || !path.isAbsolute(file) || file.includes("\0"))
    throw new Error("Invalid application path");
  const info = await fs.lstat(file);
  if (info.isSymbolicLink())
    throw new Error("Application links are not supported");
  const allowed =
    process.platform === "darwin"
      ? info.isDirectory() && path.extname(file).toLowerCase() === ".app"
      : process.platform === "win32"
        ? info.isFile() && path.extname(file).toLowerCase() === ".exe"
        : false;
  if (!allowed) throw new Error("Select a native application");
  return { path: file, name: path.basename(file, path.extname(file)) };
}
async function chooseApp(sender) {
  if (!["win32", "darwin"].includes(process.platform))
    return {
      ok: false,
      message: "Выбор приложения доступен на Windows и macOS.",
    };
  try {
    const selection = await dialog.showOpenDialog(
      BrowserWindow.fromWebContents(sender),
      {
        title: "Paw · приложение",
        properties: ["openFile"],
        ...(process.platform === "win32"
          ? { filters: [{ name: "Applications", extensions: ["exe"] }] }
          : { defaultPath: "/Applications" }),
      },
    );
    if (selection.canceled) return { ok: false, canceled: true };
    const shortcut = await validateApp(selection.filePaths[0]);
    await update({ shortcut }, { allowShortcut: true });
    return { ok: true, shortcut };
  } catch {
    return { ok: false, message: "Не удалось выбрать приложение." };
  }
}
async function openApp() {
  if (!preferences.shortcut)
    return { ok: false, message: "Сначала выбери приложение." };
  try {
    const shortcut = await validateApp(preferences.shortcut.path);
    const error = await shell.openPath(shortcut.path);
    if (error) throw new Error(error);
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: "Не удалось открыть приложение. Выбери его снова.",
    };
  }
}
async function changeBluetooth(enabled) {
  if (typeof enabled !== "boolean") return { ok: false };
  try {
    return { ok: true, status: await system.setBluetooth(enabled) };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}
async function reportSystem(pending) {
  const result = await pending;
  if (result && !result.ok && result.message && petWindow)
    await dialog.showMessageBox(petWindow, {
      type: "info",
      message: result.message,
      buttons: ["Понятно"],
    });
}
function registerIpc() {
  const trusted = (event) =>
    [
      dashboard,
      petWindow,
      menuWindow,
      houseWindow,
      toyWindow,
      screenshotSession?.window,
    ].some(
      (w) =>
        w &&
        !w.isDestroyed() &&
        w.webContents === event.sender &&
        event.senderFrame === event.sender.mainFrame,
    );
  const handle = (channel, callback) =>
    ipcMain.handle(channel, (event, ...args) => {
      if (!trusted(event)) throw new Error("Untrusted sender");
      return callback(event, ...args);
    });
  registerV5({
    handle,
    app,
    shell,
    dialog: {
      ...dialog,
      async showOpenDialog(...args) {
        menuDialogDepth++;
        try {return await dialog.showOpenDialog(...args);}
        finally {
          menuDialogDepth--;
          if (menuOpen && !quitting && menuWindow && !menuWindow.isDestroyed()) menuWindow.focus();
        }
      },
    },
    getOwner: (sender) => BrowserWindow.fromWebContents(sender),
    getState: state,
    update,
    getLife: () => life,
    saveProgress,
    setActivity,
    broadcast,
    gameEngine,
  });
  handle("paw:visual-bounds", (event, rect) => {
    if (motion.phase !== "grounded") return false;
    if (
      event.sender !== petWindow?.webContents ||
      !rect ||
      !["x", "y", "width", "height"].every((k) => Number.isFinite(rect[k])) ||
      rect.width < 20 ||
      rect.height < 20 ||
      rect.x < 0 ||
      rect.y < 0 ||
      rect.x + rect.width > 430 ||
      rect.y + rect.height > 390
    )
      return false;
    // Padding helps native hit-testing but is not part of the animal's feet.
    bodyRect = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    const pad = 32,
      x = Math.max(0, rect.x - pad),
      y = Math.max(0, rect.y - pad);
    visualRect = {
      x,
      y,
      width: Math.min(430 - x, rect.width + 2 * pad),
      height: Math.min(390 - y, rect.height + 2 * pad),
    };
    const b = petWindow.getBounds(),
      p = petClamp(b, petArea(b));
    if (p.x !== b.x || p.y !== b.y) petWindow.setPosition(p.x, p.y);
    return true;
  });
  handle("paw:widget-rects", (event, rects, expanded = false) => {
    if (event.sender !== menuWindow?.webContents || !Array.isArray(rects)) return false;
    widgetRects = rects.slice(0,4).filter(r =>
      ["x","y","width","height"].every(k=>Number.isFinite(r[k])) && r.width>0 && r.height>0);
    if (menuAnchor && menuArea && menuOpen) {
      const layout=widgetLayout(menuAnchor,menuArea,expanded === true), before=menuWindow.getBounds();
      const {leftPanel,...bounds}=layout;
      if (["x","y","width","height"].some(k=>bounds[k]!==before[k])) menuWindow.setBounds(bounds);
      return {leftPanel};
    }
    return {leftPanel:false};
  });
  handle("paw:get-state", () => state());
  handle("paw:update", (_, patch) => update(patch));
  handle("paw:show-pet", showPet);
  handle("paw:dashboard", (_, section) => {
    closeMenu();
    openDashboard(section);
    return true;
  });
  handle("paw:hide", () => {
    closeMenu();
    if (dragging) { dragging = null; releasePet(undefined, { allowWindows: false }); }
    stopMotionFrames(); stopTransport();
    tools.trackWindows(false);
    petWindow?.hide();
    return true;
  });
  handle("paw:quit", () => {
    app.quit();
    return true;
  });
  handle("paw:action", (_, value) => {
    if (value === "stand") return state();
    restState = {};
    if (STATES.has(value)) {
      lifeAPI.interact(life, value);
      void saveProgress();
    }
    if (!feeding && STATES.has(value)) {
      closeMenu();
      setActivity(value, value === "sleep" ? 120000 : 8500);
    }
    return state();
  });
  handle("paw:feed", (event, paths) => feedFiles(event.sender, paths));
  handle("paw:system-status", () => system.getStatus());
  handle("paw:audio", (_, enabled) => changeAudio(enabled));
  handle("paw:choose-app", (event) => chooseApp(event.sender));
  handle("paw:open-app", () => openApp());
  handle("paw:weather", () =>
    weather.get(preferences.weatherCity, preferences.language),
  );
  handle("paw:bluetooth", (_, enabled) => changeBluetooth(enabled));
  handle("paw:settings", (_, kind) => openSettings(kind));
  handle("paw:life", async (_, command, value) => {
    if (command === "food") {
      const fed = V5.feedInventory(life, preferences.skin, value);
      if (!fed.ok) return fed;
      meal = { food: value, started: Date.now(), ends: Date.now() + 6500 };
      mealFinish = meal.ends;
      setActivity("eat", 6500);
    } else if (command === "gift") {
      const result = lifeAPI.dailyGift(
        life,
        Object.entries(catalog.wardrobe).flatMap(([k, items]) =>
          items.filter((i) => i.id !== "none").map((i) => k + ":" + i.id),
        ),
      );
      if (result.ok) {
        setActivity("gift", 8000);
        announce("gift", result.item || "+" + result.coins + " 🪙");
      }
      await saveProgress();
      return { ...result, state: state() };
    } else if (command === "build") {
      life.inventory = V5.stock(life.inventory);
      const result = buildHome(life, preferences.skin, preferences.language);
      if (!result.ok) return result;
      setActivity("build", 10000);
      syncHabitat();
    } else if (command === "birthday") {
      if (
        typeof value !== "string" ||
        !/^\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(Date.parse("2000-" + value))
      )
        return { ok: false };
      life.birthday = value;
    } else if (command === "buy") {
      const [cat, id] = String(value).split(":");
      const item = catalog.wardrobe[cat]?.find((i) => i.id === id);
      if (!item?.price) return { ok: false };
      if (!life.gifts.includes(value)) {
        if (life.coins < item.price)
          return { ok: false, message: "Недостаточно монет." };
        life.coins -= item.price;
        life.gifts.push(value);
      }
    } else if (!["food", "build", "birthday", "buy"].includes(command))
      return { ok: false };
    await saveProgress();
    broadcast();
    return { ok: true, state: state() };
  });
  handle("paw:task", async (_, command, value) => {
    if (command === "add") {
      if (!value || typeof value.text !== "string") return { ok: false };
      const next = sanitizeTasks([{ text: value.text, due: value.due }]);
      if (!next.length || tasks.length >= 100) return { ok: false };
      tasks.push(next[0]);
    } else if (command === "toggle") {
      const task = tasks.find((t) => t.id === value);
      if (task) task.done = !task.done;
    } else if (command === "delete")
      tasks = tasks.filter((t) => t.id !== value);
    else return { ok: false };
    await saveProgress();
    broadcast();
    return { ok: true };
  });
  handle("paw:timer", async (_, command, seconds) => {
    if (command === "cancel") timer = null;
    else if (
      command === "start" &&
      Number.isFinite(seconds) &&
      seconds >= 1 &&
      seconds <= 604800
    )
      timer = { ends: Date.now() + Math.round(seconds) * 1000 };
    else return { ok: false };
    await saveProgress();
    broadcast();
    return { ok: true };
  });
  handle("paw:game", (_, command, value) => {
    const now = Date.now();
    if (command === "start" && games.has(value)) {
      if (game && now < game.ends) return { ok: false };
      game = {
        id: require("node:crypto").randomUUID(),
        type: value,
        score: 0,
        ends: now + 30000,
        target: Math.random(),
        targetAt: now,
        lastHit: 0,
        ready: now + 1500 + Math.random() * 2000,
      };
      setActivity(value, 30000);
      broadcast();
      return { ok: true };
    }
    if (
      command === "hit" &&
      game &&
      now < game.ends &&
      value?.id === game.id &&
      value.target === game.target
    ) {
      if (now - game.lastHit < 300) return { ok: false };
      if (
        game.type === "fish" &&
        (now < game.ready || now > game.ready + 1800)
      ) {
        game.ready = now + 1500 + Math.random() * 2000;
        broadcast();
        return { ok: false };
      }
      game.lastHit = now;
      game.score++;
      game.target = Math.random();
      game.targetAt = now;
      game.ready = now + 1500 + Math.random() * 2000;
      broadcast();
      return { ok: true };
    }
    return { ok: false };
  });
  handle("paw:metrics", () => ({ ...tools.metrics(), battery: batteryValue }));
  handle("paw:media", async (_, command) => {
    try {
      const result = await tools.media(command);
      if (command === "playpause") setActivity("dance", 12000);
      return result;
    } catch {
      return {
        ok: false,
        message:
          "Не удалось отправить медиакоманду. Проверь системные разрешения Paw.",
      };
    }
  });
  handle("paw:search", (_, query) => tools.search(query));
  handle("paw:search-open", async (_, id) => {
    const file = tools.searchPath(id);
    if (!file) return { ok: false };
    const error = await shell.openPath(file);
    return { ok: !error, message: error };
  });
  handle("paw:web-search", async (_, query) => {
    if (typeof query !== "string" || query.length > 500) return { ok: false };
    await shell.openExternal(
      "https://www.google.com/search?q=" + encodeURIComponent(query),
    );
    return { ok: true };
  });
  handle("paw:screenshot", () => captureScreen());
  handle("paw:capture-info", (event) => {
    if (
      !screenshotSession ||
      event.sender !== screenshotSession.window.webContents
    )
      return null;
    return {
      language: preferences.language,
      data: screenshotSession.image.toDataURL(),
      width: screenshotSession.image.getSize().width,
      height: screenshotSession.image.getSize().height,
    };
  });
  handle("paw:capture-save", async (event, rect) => {
    const session = screenshotSession;
    if (!session || event.sender !== session.window.webContents)
      return { ok: false };
    if (rect === null) {
      session.window.hide();
      screenshotSession = null;
      setTimeout(() => {
        if (!session.window.isDestroyed()) session.window.close();
      }, 100);
      return { ok: false, canceled: true };
    }
    const size = session.image.getSize();
    if (
      !rect ||
      !["x", "y", "width", "height"].every((k) => Number.isFinite(rect[k])) ||
      rect.x < 0 ||
      rect.y < 0 ||
      rect.width < 1 ||
      rect.height < 1 ||
      rect.x + rect.width > size.width ||
      rect.y + rect.height > size.height
    )
      return { ok: false };
    session.window.hide();
    const result = await dialog.showSaveDialog(dashboard, {
      defaultPath: path.join(
        app.getPath("pictures"),
        "Paw-" + Date.now() + ".png",
      ),
      filters: [{ name: "PNG", extensions: ["png"] }],
    });
    if (!result.canceled)
      await fs.writeFile(
        result.filePath,
        session.image
          .crop(
            Object.fromEntries(
              Object.entries(rect).map(([k, v]) => [k, Math.round(v)]),
            ),
          )
          .toPNG(),
      );
    screenshotSession = null;
    setTimeout(() => {
      if (!session.window.isDestroyed()) session.window.close();
    }, 100);
    return { ok: !result.canceled };
  });
  ipcMain.on("paw:menu", (event) => {
    if (trusted(event)) contextMenu();
  });
  ipcMain.on("paw:close-menu", (event) => {
    if (trusted(event)) closeMenu();
  });
  // Native cursor polling owns hit-testing so Finder/Explorer drags can enter
  // the pet even while Chromium is forwarding ordinary clicks through margins.
  ipcMain.on("paw:hit", () => {});
  ipcMain.on("paw:drag", (event, phase, point) => {
    if (!trusted(event) || event.sender !== petWindow?.webContents || !point ||
        !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    if (phase === "start" && !feeding && !menuOpen) {
      stopMotionFrames(); stopTransport();
      const bounds = petWindow.getBounds();
      dragging = { point: { ...point }, bounds, last: { ...point }, lastAt: performance.now() };
      motion = desktopMotion.hold({ x: bounds.x, y: bounds.y }, Date.now());
      lastWindowInterest = Date.now();
      if (preferences.behavior.windowInteraction) tools.trackWindows(true);
      petWindow.setIgnoreMouseEvents(false);
      setActivity("held", 650000);
    } else if (["end", "cancel"].includes(phase) && dragging) {
      dragging = null;
      releasePet(point, { allowWindows: phase === "end" });
    } else if (phase === "move" && dragging) {
      const target = {
        x: dragging.bounds.x + point.x - dragging.point.x,
        y: dragging.bounds.y + point.y - dragging.point.y,
      };
      const area = petArea(target), pos = petClamp(target, area);
      const frame = performance.now(), seconds = Math.max(.008, (frame - dragging.lastAt) / 1000);
      motion.position = pos;
      motion.velocity = { x: Math.max(-100, Math.min(100, (point.x - dragging.last.x) / seconds)), y: 0 };
      dragging.last = { ...point }; dragging.lastAt = frame;
      petWindow.setPosition(pos.x, pos.y);
      if (Date.now() - lastMotionBroadcast > 45) { lastMotionBroadcast = Date.now(); broadcast(); }
    }
  });
}
async function captureScreen() {
  if (screenshotSession) return { ok: false };
  try {
    const display = screen.getDisplayNearestPoint(
      screen.getCursorScreenPoint(),
    );
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: {
        width: Math.round(display.size.width * display.scaleFactor),
        height: Math.round(display.size.height * display.scaleFactor),
      },
    });
    const source =
      sources.find((s) => s.display_id === String(display.id)) || sources[0];
    if (!source || source.thumbnail.isEmpty())
      return {
        ok: false,
        message: "Разреши Paw запись экрана в настройках конфиденциальности.",
      };
    const win = new BrowserWindow({
      ...display.bounds,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences,
    });
    screenshotSession = { window: win, image: source.thumbnail };
    secureWindow(win);
    win.on("closed", () => {
      if (screenshotSession?.window === win) screenshotSession = null;
    });
    await win.loadFile(path.join(__dirname, "capture.html"));
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: "Скриншот недоступен. Проверь разрешение на запись экрана.",
    };
  }
}
function settleGame() {
  if (!game) return;
  const score = game.score;
  const coins = Math.min(50, score * 2);
  life.coins += coins;
  life.xp += score * 3;
  life.friendship = Math.min(100, life.friendship + Math.min(3, score));
  game = null;
  setActivity("excited", 7000);
  announce("game", "+" + coins + " 🪙");
  void saveProgress();
}
function tick() {
  if (quitting || !petWindow || petWindow.isDestroyed()) return;
  advanceTransport();
  const cursor = screen.getCursorScreenPoint(),
    bounds = petWindow.getBounds(),
    scale = effectivePetScale();
  const relative = {
    x: (cursor.x - bounds.x) / scale,
    y: (cursor.y - bounds.y) / scale,
  };
  const insidePet =
    relative.x >= visualRect.x - 12 &&
    relative.x <= visualRect.x + visualRect.width + 12 &&
    relative.y >= visualRect.y - 12 &&
    relative.y <= visualRect.y + visualRect.height + 12;
  if (menuWindow?.isVisible()) {
    const m = menuWindow.getBounds();
    const hit = widgetRects.some(
      (r) =>
        cursor.x >= m.x + r.x &&
        cursor.x <= m.x + r.x + r.width &&
        cursor.y >= m.y + r.y &&
        cursor.y <= m.y + r.y + r.height,
    );
    menuWindow.setIgnoreMouseEvents(!hit, { forward: true });
  }
  const shouldIgnore = !(insidePet || dragging || feeding);
  if (shouldIgnore !== ignoringMouse) {
    ignoringMouse = shouldIgnore;
    petWindow.setIgnoreMouseEvents(shouldIgnore, { forward: true });
  }
  const now = Date.now(),
    idle = powerMonitor.getSystemIdleTime();
  if (petWindow.isVisible() && (insidePet || motion.phase !== "grounded")) lastWindowInterest = now;
  const needsWindows = preferences.behavior.windowInteraction && petWindow.isVisible() && now - lastWindowInterest < 3000;
  tools.trackWindows(needsWindows);
  if (motion.phase === "perch") {
    if (!preferences.behavior.windowInteraction) releasePet(undefined, { allowWindows: false });
    else {
      const snapshot = nativeWindowSnapshot();
      if (!motionTimer && (snapshot.observedAt !== lastMotionSnapshot || (!snapshot.supported && snapshot.known))) {
        lastMotionSnapshot = snapshot.observedAt;
        startMotionFrames();
      }
    }
  }
  lifeAPI.tickLife(life, { now, activity, idle });
  gameEngine.tick(life);
  if (mealFinish && now >= mealFinish) {
    mealFinish = null;
    meal = null;
    setActivity("grateful", 5000);
  }
  if (now - lastGaze > 500) syncHabitat();
  if (now - lastProgressSave > 30000) {
    lastProgressSave = now;
    void saveProgress();
    broadcast();
  }
  if (
    now - lastContext > 15000 &&
    (preferences.behavior.windowInteraction ||
      preferences.behavior.appReactions)
  ) {
    lastContext = now;
    tools.foreground().then((value) => {
      foregroundValue = value;
    });
  }
  if (now - lastBattery > 300000) {
    lastBattery = now;
    void refreshEnvironment();
  }
  if (game && now >= game.ends) settleGame();
  if (game?.type === "fish" && now > game.ready + 1800)
    game.ready = now + 1500 + Math.random() * 2000;
  if (game?.type === "butterflies" && now - game.targetAt > 3000) {
    game.target = Math.random();
    game.targetAt = now;
  }
  if (timer && now >= timer.ends) {
    timer = null;
    announce("timer");
    setActivity("wave", 15000);
    void saveProgress();
  }
  for (const task of dueTasks(tasks, now)) {
    task.notified = true;
    announce("task", task.text);
    setActivity("attention", 15000);
    void saveProgress();
  }
  if (now - lastGaze > 500) {
    lastGaze = now;
    gaze = {
      x: Math.max(-1, Math.min(1, (relative.x - 215) / 200)),
      y: Math.max(-1, Math.min(1, (relative.y - 250) / 180)),
    };
    broadcast();
  }
  if (carryMotion && feeding) {
    const progress = Math.min(1, (Date.now() - carryMotion.start) / 1450);
    const ease = progress * progress * (3 - 2 * progress);
    movePetSmoothly({
      x: Math.round(carryMotion.from.x + (carryMotion.to.x - carryMotion.from.x) * ease),
      y: Math.round(carryMotion.from.y + (carryMotion.to.y - carryMotion.from.y) * ease),
    }, { allowFeeding: true });
    return;
  }
  if (dragging || feeding || menuOpen || motion.phase !== "grounded") return;
  const decision = lifeAPI.autonomousDecision(life, preferences.behavior, {
    now, idle, activity, activityUntil,
  });
  if (decision) setActivity(
    decision.activity === "curl" && preferences.showHouse && life.house >= 10 ? "home" : decision.activity,
    decision.duration,
  );
  if (now > activityUntil && !game && !gameEngine.view(life).session) {
    let next = lifeAPI.chooseActivity(life, preferences.behavior, {
      now,
      idle,
      weather: weatherValue,
      nearCursor:
        Math.hypot(
          cursor.x - (bounds.x + bounds.width / 2),
          cursor.y - (bounds.y + bounds.height * 0.7),
        ) < 220,
    });
    if (
      !preferences.roaming &&
      ["walk", "hunt", "skate", "scooter", "jetpack", "float"].includes(next)
    )
      next = "idle";
    if (
      preferences.behavior.appReactions &&
      foregroundValue.supported &&
      Math.random() < 0.25
    ) {
      const name = foregroundValue.name.toLowerCase();
      if (/code|studio|xcode|terminal/.test(name)) next = "read";
      else if (/steam|game|minecraft/.test(name)) next = "gamepad";
      else if (/music|spotify|vlc/.test(name)) next = "dance";
    }
    if (next === "play" && Math.random() < 0.4)
      next =
        {
          cat: "scratch",
          dog: "sniff",
          husky: "shake",
          fox: "sniff",
          rabbit: "groom",
          kangaroo: "groom",
          owl: "chirp",
          croc: "yawn",
          dinosaur: "shake",
        }[preferences.skin] || "play";
    setActivity(next, 10000 + Math.random() * 16000);
  }
  if (preferences.roaming && petWindow.isVisible()) {
    const b = petWindow.getBounds(),
      area = petArea(b);
    let dx = 0,
      dy = 0;
    if (activity === "home" && houseWindow && !houseWindow.isDestroyed()) {
      const house = houseWindow.getBounds(),
        tx =
          house.x +
          house.width * 0.4 -
          visualRect.x * preferences.scale -
          visualRect.width * preferences.scale * 0.5,
        ty =
          house.y +
          house.height * 0.8 -
          (visualRect.y + visualRect.height) * preferences.scale;
      dx = Math.abs(tx - b.x) > 3 ? Math.sign(tx - b.x) * 3 : 0;
      dy = Math.abs(ty - b.y) > 3 ? Math.sign(ty - b.y) * 3 : 0;
    } else if (activity === "play" && toyAnchor) {
      const tx =
        toyAnchor.x -
        visualRect.x * preferences.scale -
        visualRect.width * preferences.scale * 0.5;
      dx = Math.abs(tx - b.x) > 120 ? Math.sign(tx - b.x) * 2 : 0;
    } else if (activity === "float") {
      const sx = Math.floor(now / 6000) % 2 ? 1 : -1,
        sy = Math.floor(now / 7500) % 2 ? 1 : -1;
      dx = direction * 2;
      dy = sy * 2;
    } else if (
      ["walk", "hunt", "skate", "scooter", "jetpack", "hide", "stand"].includes(
        activity,
      )
    ) {
      dx =
        direction *
        (["skate", "scooter", "jetpack"].includes(activity) ? 4 : 2) *
        (0.5 + preferences.behavior.active / 100);
      if (activity === "hunt") {
        const target = cursor.x - b.width / 2;
        dx = Math.abs(target - b.x) > 25 ? Math.sign(target - b.x) * 3 : 0;
        if (dx) direction = Math.sign(dx);
      }
      if (activity === "jetpack") dy = Math.sin(now / 1500) * 2;
      if (["hide", "stand"].includes(activity)) {
        if (
          preferences.behavior.windowInteraction &&
          foregroundValue.bounds &&
          !/paw|electron/i.test(foregroundValue.name)
        ) {
          const w = foregroundValue.bounds;
          const targetX =
              activity === "hide"
                ? w.x - b.width * 0.4
                : w.x + w.width * 0.3 - b.width * 0.5,
            targetY = w.y - b.height * 0.86;
          dx =
            Math.abs(targetX - b.x) > 4
              ? Math.sign(targetX - b.x) * 3
              : activity === "stand"
                ? Math.sin(now / 2000)
                : 0;
          dy = Math.abs(targetY - b.y) > 4 ? Math.sign(targetY - b.y) * 3 : 0;
        } else {
          dx = 0;
          dy = 0;
        }
      }
    }
    if (dx || dy) {
      const pos = petClamp({ x: b.x + dx, y: b.y + dy }, area);
      if (pos.x === b.x && dx) {
        direction *= -1;
        broadcast();
      }
      movePetSmoothly(pos);
    }
  }
}
app.whenReady().then(async () => {
  savePath = path.join(app.getPath("userData"), "preferences.json");
  try {
    preferences = sanitizeSettings(
      JSON.parse(await fs.readFile(savePath, "utf8")),
    );
  } catch {
    preferences = sanitizeSettings();
  }
  progressPath = path.join(app.getPath("userData"), "progress.json");
  try {
    const stored = JSON.parse(await fs.readFile(progressPath, "utf8"));
    life = lifeAPI.createLife(stored.life);
    life.inventory = V5.stock(stored.life?.inventory);
    life.garden = stored.life?.garden || [];
    tasks = sanitizeTasks(stored.tasks);
    if (stored.timer && Number.isFinite(stored.timer.ends))
      timer = { ends: stored.timer.ends };
  } catch {
    life = lifeAPI.createLife();
  }
  life.inventory = V5.stock(life.inventory);
  gameEngine.view(life);
  void createDesktopShortcut({ app, shell }).catch(() => {});
  void refreshEnvironment();
  registerIpc();
  Menu.setApplicationMenu(null);
  openDashboard();
  createPet();
  createTray();
  syncHabitat();
  setInterval(tick, 60).unref();
  screen.on("display-metrics-changed", () => {
    if (!petWindow) return;
    const b = petWindow.getBounds(),
      p = petClamp(b, petArea(b));
    petWindow.setPosition(p.x, p.y);
    resetDesktopMotion();
    releasePet(undefined, { allowWindows: false });
  });
  if (isSmoke) {
    setTimeout(async () => {
      try {
        const result = await dashboard.webContents.executeJavaScript(
          `({ title: document.title, pets: document.querySelectorAll('.pet-card[data-skin]').length, bridge: !!window.paw, pet: !!document.querySelector('canvas.pet-3d, svg.pet-art') })`,
        );
        if (!result.bridge || !result.pet || result.pets !== 9)
          throw new Error(JSON.stringify(result));
        console.log("PAW ELECTRON SMOKE PASS", JSON.stringify(result));
        app.exit(0);
      } catch (error) {
        console.error(error);
        app.exit(1);
      }
    }, 3500);
  }
});
let quitting = false;
app.on("before-quit", (event) => {
  if (quitting || !life || !progressPath) return;
  event.preventDefault();
  quitting = true;
  Promise.all([save(), saveProgress()]).finally(() => {
    // Close auxiliary transparent windows after persistence. A renderer waiting
    // for its graphics context during beforeunload must not keep Paw running.
    for (const win of BrowserWindow.getAllWindows()) win.destroy();
    app.quit();
  });
});
app.on("window-all-closed", () => app.quit());
app.on("activate", openDashboard);

app.on("will-quit", () => { stopMotionFrames(); stopTransport(); tools.dispose(); });
