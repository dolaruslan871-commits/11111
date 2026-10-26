const { contextBridge, ipcRenderer, webUtils } = require("electron");
const feedListeners = new Set();
function reportFeed(result) {
  for (const callback of feedListeners) {
    try {
      callback(result);
    } catch {}
  }
}
// Resolve native File paths in the preload realm, before contextBridge cloning.
document.addEventListener(
  "dragover",
  (event) => {
    if (event.dataTransfer?.types?.includes("Files")) {
      event.preventDefault();
      const allowed = String(event.dataTransfer.effectAllowed).toLowerCase();
      // Some native drag sources allow copy only. Forcing an unsupported move
      // causes Chromium to cancel the drop before a File is ever delivered.
      event.dataTransfer.dropEffect =
        ["all", "uninitialized"].includes(allowed) || allowed.includes("move")
          ? "move"
          : "copy";
    }
  },
  true,
);
document.addEventListener(
  "drop",
  (event) => {
    if (!event.dataTransfer?.files?.length) return;
    event.preventDefault();
    try {
      const paths = Array.from(event.dataTransfer.files, (file) =>
        webUtils.getPathForFile(file),
      );
      if (paths.some((file) => !file)) {
        reportFeed({
          ok: false,
          message:
            "Не удалось получить путь файла. Перетащи сохранённый файл из Finder или Проводника.",
        });
        return;
      }
      ipcRenderer
        .invoke("paw:feed", [...new Set(paths)])
        .then(reportFeed, () =>
          reportFeed({
            ok: false,
            message:
              "Не удалось передать файл питомцу. Попробуй кнопку «Покормить».",
          }),
        );
    } catch {
      reportFeed({
        ok: false,
        message:
          "Не удалось прочитать перетаскиваемый файл. Попробуй кнопку «Покормить».",
      });
    }
  },
  true,
);
contextBridge.exposeInMainWorld("paw", {
  life: (command, value) => ipcRenderer.invoke("paw:life", command, value),
  task: (command, value) => ipcRenderer.invoke("paw:task", command, value),
  timer: (command, value) => ipcRenderer.invoke("paw:timer", command, value),
  game: (command, value) => ipcRenderer.invoke("paw:game", command, value),
  metrics: () => ipcRenderer.invoke("paw:metrics"),
  media: (command) => ipcRenderer.invoke("paw:media", command),
  search: (query) => ipcRenderer.invoke("paw:search", query),
  searchOpen: (id) => ipcRenderer.invoke("paw:search-open", id),
  webSearch: (query) => ipcRenderer.invoke("paw:web-search", query),
  screenshot: () => ipcRenderer.invoke("paw:screenshot"),
  captureInfo: () => ipcRenderer.invoke("paw:capture-info"),
  captureSave: (rect) => ipcRenderer.invoke("paw:capture-save", rect),
  getState: () => ipcRenderer.invoke("paw:get-state"),
  update: (patch) => ipcRenderer.invoke("paw:update", patch),
  action: (name) => ipcRenderer.invoke("paw:action", name),
  menu: () => ipcRenderer.send("paw:menu"),
  closeMenu: () => ipcRenderer.send("paw:close-menu"),
  dashboard: (section) => ipcRenderer.invoke("paw:dashboard", section),
  onNavigate: (callback) => {
    const listener = (_, section) => callback(section);
    ipcRenderer.on("paw:navigate", listener);
    return () => ipcRenderer.removeListener("paw:navigate", listener);
  },
  hide: () => ipcRenderer.invoke("paw:hide"),
  quit: () => ipcRenderer.invoke("paw:quit"),
  showPet: () => ipcRenderer.invoke("paw:show-pet"),
  feed: () => ipcRenderer.invoke("paw:feed", null),
  drop: () =>
    Promise.resolve({
      ok: false,
      message:
        "Перетащи файл непосредственно на питомца или воспользуйся кнопкой «Покормить».",
    }),
  onFeedResult: (callback) => {
    feedListeners.add(callback);
    return () => feedListeners.delete(callback);
  },
  systemStatus: () => ipcRenderer.invoke("paw:system-status"),
  audio: (enabled) => ipcRenderer.invoke("paw:audio", enabled),
  chooseApp: () => ipcRenderer.invoke("paw:choose-app"),
  openApp: () => ipcRenderer.invoke("paw:open-app"),
  weather: () => ipcRenderer.invoke("paw:weather"),
  bluetooth: (enabled) => ipcRenderer.invoke("paw:bluetooth", enabled),
  settings: (kind) => ipcRenderer.invoke("paw:settings", kind),
  drag: (phase, point) => ipcRenderer.send("paw:drag", phase, point),
  hit: (value) => ipcRenderer.send("paw:hit", value),
  onState: (callback) => {
    const listener = (_, value) => callback(value);
    ipcRenderer.on("paw:state", listener);
    return () => ipcRenderer.removeListener("paw:state", listener);
  },
});
