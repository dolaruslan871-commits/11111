const fs = require("node:fs/promises"),
  path = require("node:path");
const { spawn, execFile } = require("node:child_process");
function registerV5({
  handle,
  app,
  shell,
  dialog,
  getOwner,
  getState,
  update,
  getLife,
  saveProgress,
  setActivity,
  broadcast,
  gameEngine,
}) {
  const safe =
    (fn) =>
    async (...args) => {
      try {
        return await fn(...args);
      } catch (e) {
        return {
          ok: false,
          message: e.message || "Не удалось выполнить действие.",
        };
      }
    };
  async function validate(file) {
    if (
      typeof file !== "string" ||
      !path.isAbsolute(file) ||
      file.includes("\0")
    )
      throw new Error("Выбери приложение.");
    const info = await fs.lstat(file);
    if (
      info.isSymbolicLink() ||
      !(process.platform === "darwin"
        ? info.isDirectory() && file.endsWith(".app")
        : info.isFile() && file.toLowerCase().endsWith(".exe"))
    )
      throw new Error("Выбери приложение .app или .exe.");
    return { path: file, name: path.basename(file, path.extname(file)) };
  }
  handle(
    "paw:pick-launcher",
    safe(async (event, role = "app") => {
      if (!["app", "browser", "player"].includes(role)) return { ok: false };
      const result = await dialog.showOpenDialog(getOwner(event.sender), {
        title:
          role === "browser"
            ? "Paw · Браузер"
            : role === "player"
              ? "Paw · Плеер"
              : "Paw · Приложение",
        properties: ["openFile"],
        ...(process.platform === "darwin"
          ? { defaultPath: "/Applications" }
          : { filters: [{ name: "Application", extensions: ["exe"] }] }),
      });
      if (result.canceled) return { ok: false, canceled: true };
      const item = await validate(result.filePaths[0]),
        s = getState();
      if (role === "app") {
        const list = s.shortcuts.filter((x) => x.path !== item.path);
        if (list.length >= 24)
          throw new Error("Можно добавить до 24 приложений.");
        await update({ shortcuts: [...list, item] }, { allowShortcut: true });
      } else await update({ [role]: item }, { allowShortcut: true });
      return { ok: true };
    }),
  );
  handle(
    "paw:launch-shortcut",
    safe(async (_, index) => {
      const item = getState().shortcuts[index];
      if (!Number.isInteger(index) || !item) return { ok: false };
      const validated = await validate(item.path);
      const error = await shell.openPath(validated.path);
      if (error) throw new Error(error);
      return { ok: true };
    }),
  );
  handle(
    "paw:remove-shortcut",
    safe(async (_, index) => {
      if (!Number.isInteger(index)) return { ok: false };
      await update(
        { shortcuts: getState().shortcuts.filter((_, i) => i !== index) },
        { allowShortcut: true },
      );
      return { ok: true };
    }),
  );
  handle(
    "paw:browser-search",
    safe(async (_, query) => {
      if (typeof query !== "string" || !query.trim() || query.length > 1000)
        return { ok: false };
      const url =
          "https://www.google.com/search?q=" + encodeURIComponent(query),
        browser = getState().browser;
      if (!browser) {
        await shell.openExternal(url);
        return { ok: true };
      }
      const v = await validate(browser.path);
      await new Promise((resolve, reject) => {
        const child =
          process.platform === "darwin"
            ? spawn("/usr/bin/open", ["-a", v.path, url], { stdio: "ignore" })
            : spawn(v.path, [url], {
                stdio: "ignore",
                detached: true,
                windowsHide: false,
              });
        child.once("error", reject);
        child.once("spawn", () => {
          child.unref();
          resolve();
        });
      });
      return { ok: true };
    }),
  );
  handle(
    "paw:open-player",
    safe(async () => {
      const player = getState().player;
      if (player) {
        await validate(player.path);
        const error = await shell.openPath(player.path);
        if (error) throw new Error(error);
        return { ok: true };
      }
      if (process.platform === "win32") {
        await shell.openExternal("mswindowsmusic:");
        return { ok: true };
      }
      if (process.platform === "darwin") {
        await new Promise((resolve, reject) =>
          execFile("/usr/bin/open", ["-a", "Music"], (e) =>
            e ? reject(e) : resolve(),
          ),
        );
        return { ok: true };
      }
      throw new Error("Выбери плеер.");
    }),
  );
  handle(
    "paw:adventure",
    safe(async (_, command, arg) => {
      const life = getLife();
      let result;
      if (command === "start") result = gameEngine.start(arg, life);
      else result = gameEngine.control(command, arg, life);
      if (result.ok) {
        if (command === "leave") setActivity("idle", 5000);
        if (command === "start")
          setActivity(
            arg === "fishing" ? "fish" : arg === "garden" ? "sit" : "play",
            600000,
          );
        if (!["steer", "reel"].includes(command)) {
          await saveProgress();
          broadcast();
        }
      }
      return { ...result, adventure: gameEngine.view(life) };
    }),
  );
  handle("paw:adventure-state", () => gameEngine.view(getLife()));
  handle(
    "paw:save-studio",
    safe(async (_, data, kind) => {
      const formats = {
        png: { extension: "png", max: 100 * 1024 * 1024 },
        mp4: { extension: "mp4", max: 200 * 1024 * 1024 },
        webm: { extension: "webm", max: 200 * 1024 * 1024 },
      };
      const f = formats[kind];
      if (
        !f ||
        !data ||
        !Number.isInteger(data.byteLength) ||
        data.byteLength < 12 ||
        data.byteLength > f.max
      )
        throw new Error("Некорректный файл.");
      const bytes = Buffer.from(data);
      if (
        (kind === "png" &&
          bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") ||
        (kind === "webm" && bytes.readUInt32BE(0) !== 0x1a45dfa3) ||
        (kind === "mp4" && bytes.subarray(4, 8).toString() !== "ftyp")
      )
        throw new Error("Неверный формат файла.");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-"),
        file = path.join(
          app.getPath("desktop"),
          `Paw-${getState().skin}-${stamp}.${f.extension}`,
        );
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, bytes, { flag: "wx" });
      return { ok: true, path: file, name: path.basename(file) };
    }),
  );
  handle(
    "paw:show-export",
    safe(async (_, file) => {
      const desktop = app.getPath("desktop");
      if (
        typeof file !== "string" ||
        path.dirname(file) !== desktop ||
        !/^Paw-[\w-]+\.(png|mp4|webm)$/.test(path.basename(file))
      )
        return { ok: false };
      shell.showItemInFolder(file);
      return { ok: true };
    }),
  );
}
async function createDesktopShortcut({ app, shell }) {
  if (!app.isPackaged) return false;
  const desktop = app.getPath("desktop");
  await fs.mkdir(desktop, { recursive: true });
  if (process.platform === "win32") {
    const file = path.join(desktop, "Paw.lnk");
    try {
      await fs.access(file);
      return true;
    } catch {}
    return shell.writeShortcutLink(file, "create", {
      target: app.getPath("exe"),
      description: "Paw — desktop pet",
      icon: app.getPath("exe"),
      iconIndex: 0,
    });
  }
  if (process.platform === "darwin") {
    const appPath = app.getPath("exe").split(".app/")[0] + ".app",
      target = path.join(desktop, "Paw.app");
    try {
      const existing = await fs.lstat(target);
      if (existing.isSymbolicLink()) {
        const previous = await fs.readlink(target);
        if (previous !== appPath) {
          await fs.unlink(target);
          await fs.symlink(appPath, target);
        }
      }
      return true;
    } catch {}
    await fs.symlink(appPath, target);
    return true;
  }
  return false;
}
module.exports = { registerV5, createDesktopShortcut };
