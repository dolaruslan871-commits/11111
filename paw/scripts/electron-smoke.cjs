const assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path");
const { _electron } = require("playwright-core");
const project = path.resolve(__dirname, "..");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await fs.mkdir(path.join(project, ".runtime"), { recursive: true });
  await fs.mkdir(path.join(project, "test-results"), { recursive: true });
  const scratch = await fs.mkdtemp(path.join(project, ".runtime", "paw-v4-"));
  const env = {
    ...process.env,
    XDG_CONFIG_HOME: path.join(scratch, "config"),
    XDG_DATA_HOME: path.join(scratch, "data"),
    XDG_CACHE_HOME: path.join(scratch, "cache"),
  };
  for (const key of ["XDG_CONFIG_HOME", "XDG_DATA_HOME", "XDG_CACHE_HOME"])
    await fs.mkdir(env[key], { recursive: true });
  const args = [
    project,
    ...(process.platform === "linux"
      ? [
          "--no-sandbox",
          "--use-angle=swiftshader",
          "--enable-unsafe-swiftshader",
        ]
      : []),
  ];
  let electron;
  const launch = () =>
    _electron.launch({
      args,
      env,
      executablePath: require("electron"),
      timeout: 30000,
    });
  const dashboard = async () => {
    await electron.firstWindow();
    for (let i = 0; i < 100; i++) {
      const p = electron.windows().find((p) => p.url().endsWith("index.html"));
      if (p) {
        await p.locator(".pet-card[data-skin=husky]").waitFor();
        return p;
      }
      await wait(100);
    }
    throw new Error("No dashboard");
  };
  try {
    electron = await launch();
    let page = await dashboard();
    await electron.evaluate(({ powerMonitor }) => {
      powerMonitor.getSystemIdleTime = () => 0;
    });
    const errors = [];
    for (const p of electron.windows())
      p.on("pageerror", (e) => errors.push(e.message));
    const call = (name, ...args) =>
      page.evaluate(({ name, args }) => window.paw[name](...args), {
        name,
        args,
      });
    const state = () => call("getState");
    await call("update", {
      skin: "husky",
      theme: "dark",
      language: "ru",
      roaming: false,
      companion: "rabbit",
      behavior: { active: 81 },
    });
    const pet = electron.windows().find((p) => p.url().endsWith("pet.html"));
    await pet
      .locator("#floating-pet[data-skin=husky][data-renderer=webgl]")
      .waitFor();
    assert.equal(await page.evaluate(() => typeof window.require), "undefined");
    assert.ok(
      await electron.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().every(
          (w) => w.webContents.getLastWebPreferences().sandbox,
        ),
      ),
    );
    await call("menu");
    await pet.locator(".utility-menu.is-open").waitFor();
    assert.equal(await pet.locator("[data-system]").count(), 2);
    assert.ok((await pet.locator("[data-utility]").count()) >= 8);
    assert.ok(
      (await pet.locator(".utility-heading").textContent()).includes("0"),
    );
    await pet.screenshot({
      path: path.join(project, "test-results", "quick-menu-v4.png"),
      omitBackground: true,
    });
    await call("timer", "start", 1);
    await call("task", "add", {
      text: "Synthetic task <b>safe</b>",
      due: Date.now() + 500,
    });
    await wait(1400);
    assert.equal(
      (await state()).life.timer,
      null,
      "timer fires even while menu open",
    );
    assert.equal((await state()).life.tasks[0].notified, true);
    await call("closeMenu");
    const gift = await call("life", "gift");
    assert.equal(gift.ok, true);
    assert.equal((await call("life", "gift")).ok, false);
    await call("life", "food", "carrot");
    assert.equal((await state()).life.foods.carrot, 1);
    await call("game", "start", "ball");
    let g = (await state()).life.game;
    assert.ok(g);
    assert.equal(
      (await call("game", "hit", { id: g.id, target: g.target + 1 })).ok,
      false,
    );
    assert.equal(
      (await call("game", "hit", { id: g.id, target: g.target })).ok,
      true,
    );
    const before = (await state()).life.coins;
    await electron.evaluate(() => {
      const actual = Date.now;
      Date.now = () => actual() + 31000;
    });
    await wait(150);
    assert.equal((await state()).life.game, null);
    assert.equal((await state()).life.coins, before + 2);
    await electron.evaluate(() => {
      const actual = Date.now;
      Date.now = () => actual() - 31000;
    });
    // Native-backed File objects pass through the actual isolated preload into shell.trashItem.
    const folder = path.join(scratch, "paw-disposable-folder");
    await fs.mkdir(folder);
    await fs.writeFile(
      path.join(folder, "child.txt"),
      "Disposable folder integration fixture.",
    );
    await call("menu");
    const cdp = await electron.context().newCDPSession(pet),
      data = {
        items: [],
        files: [folder, path.join(folder, "child.txt")],
        dragOperationsMask: 1,
      };
    for (const type of ["dragEnter", "dragOver", "drop"])
      await cdp.send("Input.dispatchDragEvent", { type, x: 270, y: 300, data });
    let dropped;
    for (let i = 0; i < 120; i++) {
      dropped = await state();
      if (
        dropped.feed?.phase === "done" &&
        dropped.feed.name === "paw-disposable-folder"
      )
        break;
      await wait(100);
    }
    assert.equal(dropped.feed?.phase, "done", JSON.stringify(dropped.feed));
    assert.equal(dropped.feed.total, 1);
    await assert.rejects(fs.access(folder), { code: "ENOENT" });
    const trash = path.join(env.XDG_DATA_HOME, "Trash/files");
    const names = await fs.readdir(trash);
    const trashed = names.find((n) => n.startsWith("paw-disposable-folder"));
    assert.ok(trashed);
    assert.equal(
      await fs.readFile(path.join(trash, trashed, "child.txt"), "utf8"),
      "Disposable folder integration fixture.",
    );
    await cdp.detach();
    const png = path.join(scratch, "capture.png");
    await electron.evaluate(({ dialog }, png) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: png });
    }, png);
    const shot = await call("screenshot");
    assert.equal(shot.ok, true, shot.message);
    const capture = electron
      .windows()
      .find((p) => p.url().endsWith("capture.html"));
    assert.ok(capture);
    const info = await capture.evaluate(() => window.paw.captureInfo());
    assert.ok(info.width > 100 && info.height > 100);
    assert.equal(
      (
        await capture.evaluate(() =>
          window.paw.captureSave({ x: -1, y: 0, width: 10, height: 10 }),
        )
      ).ok,
      false,
    );
    await capture.evaluate(() =>
      window.paw.captureSave({ x: 0, y: 0, width: 100, height: 100 }),
    );
    const pngBytes = await fs.readFile(png);
    assert.equal(pngBytes.subarray(1, 4).toString(), "PNG");
    const metrics = await call("metrics");
    assert.ok(metrics.memoryTotal > 0);
    await call("task", "add", { text: "Persistent note", due: null });
    const bornAt = (await state()).life.bornAt;
    await electron.close();
    electron = await launch();
    page = await dashboard();
    const restored = await state();
    assert.equal(restored.version, "0.4.0");
    assert.equal(restored.skin, "husky");
    assert.equal(restored.companion, "rabbit");
    assert.equal(restored.theme, "dark");
    assert.equal(restored.behavior.active, 81);
    assert.equal(restored.life.bornAt, bornAt);
    assert.equal(restored.life.foods.carrot, 1);
    assert.ok(restored.life.tasks.some((t) => t.text === "Persistent note"));
    assert.equal(restored.life.lastGift, gift.state.life.lastGift);
    assert.deepEqual(errors, []);
    console.log(
      "DESKTOP PASS: sandbox, 9 species, real WebGL, expanded menu, timers/tasks during menu, daily gifts, food, validated game awards, REAL folder+child Trash drop, native PNG crop, CPU/RAM counters, settings/progress restart persistence.",
    );
    console.log("Recoverable synthetic fixture:", trash);
  } finally {
    if (electron) await electron.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
