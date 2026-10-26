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
const effectivePetScale = () =>
  menuOpen ? Math.max(1, preferences?.scale || 1) : preferences?.scale || 1;
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
  activity,
  direction,
  menuOpen,
  feed: feedState,
  window: petWindowSize(effectivePetScale()),
  displayScale: effectivePetScale(),
  platform: process.platform,
  desktop: true,
});
const broadcast = () => {
  for (const win of [dashboard, petWindow])
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
  if (!allowShortcut && patch.shortcut !== null) delete patch.shortcut;
  const previousScale = preferences.scale;
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
    ["darwin", "win32"].includes(process.platform) &&
    patch.autostart !== undefined
  )
    app.setLoginItemSettings({ openAtLogin: preferences.autostart });
  if (patch.weatherCity !== undefined) void refreshEnvironment();
  if (preferences.scale !== previousScale) resizePet();
  if (petWindow && !petWindow.isDestroyed())
    petWindow.setAlwaysOnTop(preferences.alwaysOnTop);
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
function openDashboard(section) {
  const target = [
    "home",
    "wardrobe",
    "settings",
    "life",
    "tools",
    "games",
  ].includes(section)
    ? section
    : null;
  if (dashboard && !dashboard.isDestroyed()) {
    dashboard.show();
    dashboard.focus();
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
    webPreferences,
  });
  secureWindow(dashboard);
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
  return true;
}
function resizePet() {
  if (!petWindow || petWindow.isDestroyed()) return;
  const old = petWindow.getBounds(),
    size = petWindowSize(effectivePetScale());
  const area = screen.getDisplayMatching(old).workArea;
  const position = clampPosition(
    {
      x: old.x + (old.width - size.width) / 2,
      y: old.y + old.height - size.height,
    },
    area,
    size,
  );
  petWindow.setBounds({ ...position, ...size });
}
function createPet() {
  const area = screen.getPrimaryDisplay().workArea;
  const size = petWindowSize(preferences.scale);
  const position = clampPosition(
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
    webPreferences,
  });
  secureWindow(petWindow);
  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Keep the native drop target alive. Click-through used to make Finder drops
  // disappear before Chromium could deliver the file to our preload listener.
  petWindow.setIgnoreMouseEvents(false);
  petWindow.loadFile(path.join(__dirname, "pet.html"));
  petWindow.on("closed", () => {
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
        const bounds = petWindow.getBounds(),
          area = screen.getDisplayMatching(bounds).workArea;
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
  try {
    return await feeder.feed(requestedPaths, {
      mode: preferences.feedMode,
      owner: BrowserWindow.fromWebContents(sender),
    });
  } finally {
    feeding = false;
  }
}
function contextMenu() {
  if (feeding) return;
  menuOpen = !menuOpen;
  dragging = null;
  resizePet();
  broadcast();
}
function closeMenu() {
  if (menuOpen) {
    menuOpen = false;
    resizePet();
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
    [dashboard, petWindow, screenshotSession?.window].some(
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
    petWindow?.hide();
    return true;
  });
  handle("paw:quit", () => {
    app.quit();
    return true;
  });
  handle("paw:action", (_, value) => {
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
      lifeAPI.feedFood(life, value);
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
      if (life.coins < 20) return { ok: false, message: "Нужно 20 монет." };
      if (life.house >= 100)
        return { ok: false, message: "Домик уже построен." };
      life.coins -= 20;
      life.house = Math.min(100, life.house + 25);
      setActivity("build", 10000);
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
    if (
      !trusted(event) ||
      event.sender !== petWindow?.webContents ||
      !point ||
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y)
    )
      return;
    if (phase === "start" && !feeding && !menuOpen) {
      dragging = { point, bounds: petWindow.getBounds() };
    } else if (phase === "end") {
      dragging = null;
    } else if (phase === "move" && dragging) {
      const target = {
        x: dragging.bounds.x + point.x - dragging.point.x,
        y: dragging.bounds.y + point.y - dragging.point.y,
      };
      const area = screen.getDisplayNearestPoint(target).workArea;
      const pos = clampPosition(target, area, dragging.bounds);
      petWindow.setPosition(pos.x, pos.y);
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
  if (!petWindow || petWindow.isDestroyed()) return;
  const cursor = screen.getCursorScreenPoint(),
    bounds = petWindow.getBounds(),
    scale = effectivePetScale();
  const relative = {
    x: (cursor.x - bounds.x) / scale,
    y: (cursor.y - bounds.y) / scale,
  };
  const insidePet =
    relative.x >= 80 &&
    relative.x <= 350 &&
    relative.y >= 125 &&
    relative.y <= 385;
  const shouldIgnore = !(insidePet || menuOpen || dragging || feeding);
  if (shouldIgnore !== ignoringMouse) {
    ignoringMouse = shouldIgnore;
    petWindow.setIgnoreMouseEvents(shouldIgnore, { forward: true });
  }
  const now = Date.now(),
    idle = powerMonitor.getSystemIdleTime();
  lifeAPI.tickLife(life, { now, activity });
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
    petWindow.setPosition(
      Math.round(
        carryMotion.from.x + (carryMotion.to.x - carryMotion.from.x) * ease,
      ),
      Math.round(
        carryMotion.from.y + (carryMotion.to.y - carryMotion.from.y) * ease,
      ),
    );
    return;
  }
  if (dragging || feeding || menuOpen) return;
  const returned = lastIdle > 45 && idle < 2;
  lastIdle = idle;
  if (returned) {
    setActivity("excited", 10000);
    life.mood = Math.min(100, life.mood + 5);
  }
  if (idle > 180 && !["sleep", "home"].includes(activity) && !game)
    setActivity(life.house >= 25 ? "home" : "sleep", 60000);
  if (now > activityUntil && !game) {
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
    setActivity(next, 10000 + Math.random() * 16000);
  }
  if (preferences.roaming && petWindow.isVisible()) {
    const b = petWindow.getBounds(),
      area = screen.getDisplayMatching(b).workArea;
    let dx = 0,
      dy = 0;
    if (activity === "float") {
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
      const pos = clampPosition({ x: b.x + dx, y: b.y + dy }, area, b);
      if (pos.x === b.x && dx) {
        direction *= -1;
        broadcast();
      }
      petWindow.setPosition(pos.x, pos.y);
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
    tasks = sanitizeTasks(stored.tasks);
    if (stored.timer && Number.isFinite(stored.timer.ends))
      timer = { ends: stored.timer.ends };
  } catch {
    life = lifeAPI.createLife();
  }
  void refreshEnvironment();
  registerIpc();
  Menu.setApplicationMenu(null);
  openDashboard();
  createPet();
  createTray();
  setInterval(tick, 60).unref();
  screen.on("display-metrics-changed", () => {
    if (!petWindow) return;
    const b = petWindow.getBounds(),
      p = clampPosition(b, screen.getDisplayMatching(b).workArea, b);
    petWindow.setPosition(p.x, p.y);
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
  Promise.all([save(), saveProgress()]).finally(() => app.quit());
});
app.on("window-all-closed", () => app.quit());
app.on("activate", openDashboard);
