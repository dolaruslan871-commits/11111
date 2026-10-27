const assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path");
const { _electron } = require("playwright-core");
const project = path.resolve(__dirname, ".."),
  wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await fs.mkdir(path.join(project, ".runtime"), { recursive: true });
  const scratch = await fs.mkdtemp(path.join(project, ".runtime", "paw-v5-"));
  const env = {
    ...process.env,
    XDG_CONFIG_HOME: path.join(scratch, "config"),
    XDG_DATA_HOME: path.join(scratch, "data"),
    XDG_CACHE_HOME: path.join(scratch, "cache"),
  };
  for (const k of ["XDG_CONFIG_HOME", "XDG_DATA_HOME", "XDG_CACHE_HOME"])
    await fs.mkdir(env[k], { recursive: true });
  const args = [
    project,
    `--paw-test-profile=${path.join(scratch, "profile")}`,
    ...(process.platform === "linux"
      ? [
          "--no-sandbox",
          "--use-angle=swiftshader",
          "--enable-unsafe-swiftshader",
        ]
      : []),
  ];
  let app;
  async function start() {
    app = await _electron.launch({
      args,
      env,
      executablePath: require("electron"),
      timeout: 30000,
    });
    await app.firstWindow();
    let page;
    for (let i = 0; i < 100; i++) {
      page = app.windows().find((p) => p.url().endsWith("index.html"));
      if (page) break;
      await wait(50);
    }
    assert.ok(page);
    await app.evaluate(
      ({ powerMonitor, app }, desktop) => {
        powerMonitor.getSystemIdleTime = () => 0;
        app.setPath("desktop", desktop);
      },
      path.join(scratch, "Desktop"),
    );
    return page;
  }
  try {
    let page = await start();
    const errors = [];
    app.on("window", (p) =>
      p.on("pageerror", (e) => {
        errors.push(e.message);
        console.log("PAGE ERROR", e.message);
      }),
    );
    await page.locator("#welcome-continue").waitFor();
    assert.equal(await page.locator(".welcome-parade svg").count(), 9);
    await page.locator("#welcome-continue").click();
    await page.locator(".pet-card[data-skin=husky]").waitFor();
    const call = (name, ...args) =>
        page.evaluate(({ name, args }) => window.paw[name](...args), {
          name,
          args,
        }),
      state = () => call("getState");
    await call("update", {
      skin: "husky",
      roaming: false,
      names: { husky: "No", cat: "Барсик" },
      theme: "ocean",
    });
    assert.equal((await state()).names.husky, undefined);
    assert.equal((await state()).names.cat, "Барсик");
    assert.equal((await state()).theme, "ocean");
    await call("update", {
      shortcuts: [{ path: "/tmp/injected.exe", name: "Blocked" }],
      browser: { path: "/tmp/injected.exe", name: "Blocked" },
    });
    assert.equal((await state()).shortcuts.length, 0);
    assert.equal((await state()).browser, null);
    assert.equal((await call("action", "stand")).activity === "stand", false);
    await call("menu");
    let widget;
    for (let i = 0; i < 100; i++) {
      widget = app.windows().find((p) => p.url().endsWith("widget.html"));
      if (widget) break;
      await wait(50);
    }
    assert.ok(widget);
    await widget.locator("[data-panel=timer]").click();
    await widget.locator("#quick-minutes").fill("1");
    await widget.locator("#quick-timer button").click();
    assert.ok((await state()).life.timer);
    await call("timer", "cancel");
    await widget.locator("[data-panel=notes]").click();
    await widget.locator("#quick-note-text").fill("Persistent V5 note");
    await widget.locator("#quick-note button").click();
    await widget.locator("#quick-note-list li").waitFor();
    await widget.locator("[data-panel=search]").click();
    await widget.locator("#quick-query").fill("desktop pet");
    assert.equal(
      await widget.locator("#quick-query").inputValue(),
      "desktop pet",
    );
    await widget.screenshot({
      path: path.join(project, "test-results", "widget-v5.png"),
      omitBackground: true,
    });
    await widget.locator("#quick-studio").click();
    await page.locator("#studio-action").waitFor();
    await call("closeMenu");
    const bounds = await app.evaluate(({ BrowserWindow, screen }) => {
      const p = BrowserWindow.getAllWindows().find((w) =>
        w.webContents.getURL().endsWith("pet.html"),
      );
      return {
        pet: p.getBounds(),
        area: screen.getDisplayMatching(p.getBounds()).workArea,
      };
    });
    assert.ok(bounds.pet.width > 0);
    assert.equal((await call("life", "food", "carrot")).ok, false);
    assert.equal((await call("life", "food", "kibble")).ok, true);
    await wait(6800);
    assert.equal((await state()).activity, "grateful");
    const inventory = (await state()).life.inventory;
    assert.equal(inventory.kibble, 2);
    await call("adventure", "start", "garden");
    assert.equal(
      (await call("adventure", "plant", { plot: 0, crop: "cabbage" })).ok,
      true,
    );
    await call("adventure", "water", { plot: 0 });
    await call("adventure", "leave");
    assert.equal((await state()).life.garden[0].crop, "cabbage");
    // Studio saves its actual high-res image and a real timed recording to the test Desktop.
    await page.locator("[data-page=studio]").click();
    await page.locator("#studio-action").selectOption("groom");
    await page.locator("#studio-format").selectOption("square");
    await page.locator("#studio-photo").click();
    await page
      .locator("#studio-result")
      .filter({ hasText: /Paw-/ })
      .waitFor({ timeout: 30000 });
    let files = await fs.readdir(path.join(scratch, "Desktop")),
      png = files.find((f) => f.endsWith(".png"));
    assert.ok(png);
    const image = await fs.readFile(path.join(scratch, "Desktop", png));
    assert.equal(image.readUInt32BE(16), 3072);
    assert.equal(image.readUInt32BE(20), 3072);
    if (process.env.PAW_VIDEO_TEST_FORMAT)
      await page
        .locator("#studio-format")
        .selectOption(process.env.PAW_VIDEO_TEST_FORMAT);
    await page
      .locator("#studio-seconds")
      .fill(process.env.PAW_VIDEO_TEST_SECONDS || "1");
    await page.locator("#studio-video").click();
    for (let i = 0; i < 600; i++) {
      files = await fs.readdir(path.join(scratch, "Desktop"));
      if (files.some((f) => /\.(webm|mp4)$/.test(f))) break;
      await wait(150);
    }
    assert.ok(
      files.some((f) => /\.(webm|mp4)$/.test(f)),
      files.join(","),
    );
    if (process.env.PAW_VALIDATE_VIDEO === "1") {
      const video = files.find((f) => f.endsWith(".mp4"));
      assert.ok(video, "H264 MP4 export");
      const parsed = JSON.parse(
        require("node:child_process").execFileSync(
          "ffprobe",
          [
            "-v",
            "error",
            "-count_frames",
            "-show_entries",
            "format=duration:stream=codec_name,width,height,avg_frame_rate,nb_read_frames",
            "-of",
            "json",
            path.join(scratch, "Desktop", video),
          ],
          { encoding: "utf8" },
        ),
      );
      const seconds = Number(process.env.PAW_VIDEO_TEST_SECONDS || 1);
      assert.equal(Number(parsed.streams[0].nb_read_frames), seconds * 30);
      assert.equal(parsed.streams[0].avg_frame_rate, "30/1");
      assert.equal(Number(parsed.format.duration), seconds);
      if (process.env.PAW_VIDEO_TEST_FORMAT === "story") {
        assert.equal(parsed.streams[0].width, 1080);
        assert.equal(parsed.streams[0].height, 1920);
      }
      console.log("VIDEO VERIFIED", JSON.stringify(parsed));
    }
    assert.equal(
      (await call("saveStudio", new Uint8Array([1, 2, 3]), "png")).ok,
      false,
    );
    // Native folder drop still traverses the isolated preload and uses real reversible Trash.
    await call("action", "idle");
    const pet = app.windows().find((p) => p.url().endsWith("pet.html"));
    const folder = path.join(scratch, "folder");
    await fs.mkdir(folder);
    await fs.writeFile(
      path.join(folder, "child.txt"),
      "V5 reversible folder fixture",
    );
    const cdp = await app.context().newCDPSession(pet),
      data = {
        items: [],
        files: [folder, path.join(folder, "child.txt")],
        dragOperationsMask: 1,
      };
    for (const type of ["dragEnter", "dragOver", "drop"])
      await cdp.send("Input.dispatchDragEvent", { type, x: 240, y: 290, data });
    let latest;
    for (let i = 0; i < 120; i++) {
      latest = await state();
      if (latest.feed?.phase === "done") break;
      await wait(100);
    }
    assert.equal(latest.feed?.phase, "done", JSON.stringify(latest.feed));
    await assert.rejects(fs.access(folder), { code: "ENOENT" });
    await cdp.detach();
    const bornAt = latest.life.bornAt;
    await app.close();
    page = await start();
    await page.locator(".pet-card").first().waitFor();
    assert.equal(await page.locator("#welcome-continue").count(), 0);
    const restored = await page.evaluate(() => window.paw.getState());
    assert.equal(restored.version, "0.5.1");
    assert.equal(restored.life.bornAt, bornAt);
    assert.equal(restored.life.inventory.kibble, 2);
    assert.equal(restored.life.garden[0].crop, "cabbage");
    assert.ok(restored.life.tasks.some((t) => t.text === "Persistent V5 note"));
    assert.equal(restored.names.cat, "Барсик");
    assert.deepEqual(errors, []);
    console.log(
      "V5 NATIVE PASS: first-run welcome, themes/names, inline widget panels, species food and gratitude, persistent garden, real 3072px PNG + timed video Desktop exports, real folder Trash drop, restart migration.",
    );
    console.log("Test Desktop:", path.join(scratch, "Desktop"));
  } finally {
    if (app) await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
