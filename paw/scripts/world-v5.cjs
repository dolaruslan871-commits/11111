const assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path");
const { _electron } = require("playwright-core");
const root = path.resolve(__dirname, ".."),
  wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const scratch = await fs.mkdtemp(path.join(root, ".runtime", "world-v5-")),
    env = {
      ...process.env,
      XDG_CONFIG_HOME: path.join(scratch, "config"),
      XDG_DATA_HOME: path.join(scratch, "data"),
      XDG_CACHE_HOME: path.join(scratch, "cache"),
    };
  for (const p of ["XDG_CONFIG_HOME", "XDG_DATA_HOME", "XDG_CACHE_HOME"])
    await fs.mkdir(env[p], { recursive: true });
  let app;
  async function launch() {
    app = await _electron.launch({
      executablePath: require("electron"),
      args: [
        root,
        `--paw-test-profile=${path.join(scratch, "profile")}`,
        "--no-sandbox",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
      env,
    });
    await app.firstWindow();
    let page;
    for (let n = 0; n < 100; n++) {
      page = app.windows().find((p) => p.url().endsWith("index.html"));
      if (page) break;
      await wait(50);
    }
    await app.evaluate(
      ({ powerMonitor }) => (powerMonitor.getSystemIdleTime = () => 0),
    );
    return page;
  }
  try {
    let page = await launch();
    await page.locator("#welcome-continue").click();
    await page.locator(".pet-card").first().waitFor();
    await page.evaluate(() =>
      window.paw.update({ roaming: false, outfit: { toy: "ball" } }),
    );
    const userData = await app.evaluate(({ app }) => app.getPath("userData"));
    await app.close();
    const progress = JSON.parse(
      await fs.readFile(path.join(userData, "progress.json"), "utf8"),
    );
    progress.life.house = 50;
    progress.life.coins = 30;
    progress.life.inventory = {
      ...progress.life.inventory,
      wood: 10,
      stone: 5,
    };
    await fs.writeFile(
      path.join(userData, "progress.json"),
      JSON.stringify(progress),
    );
    page = await launch();
    await page.locator(".pet-card").first().waitFor();
    await page.evaluate(() => window.paw.action("sit"));
    await wait(1400);
    const original = await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()
        .filter((w) => w.webContents.getURL().includes("habitat.html"))
        .map((w) => ({
          url: w.webContents.getURL(),
          bounds: w.getBounds(),
          visible: w.isVisible(),
        })),
    );
    assert.equal(original.length, 2);
    const house = original.find((w) => w.url.includes("house")),
      toy = original.find((w) => w.url.includes("toy"));
    assert.ok(house.visible && toy.visible);
    const pet = app.windows().find((p) => p.url().endsWith("pet.html"));
    const positions = await app.evaluate(async ({ BrowserWindow, screen }) => {
      const w = BrowserWindow.getAllWindows().find((w) =>
          w.webContents.getURL().endsWith("pet.html"),
        ),
        area = screen.getDisplayMatching(w.getBounds()).workArea;
      const p = await w.webContents.executeJavaScript(`window.paw.getState()`);
      return { area, scale: p.scale };
    });
    const corners = [
      { x: -5000, y: -5000 },
      { x: 5000, y: -5000 },
      { x: 5000, y: 5000 },
      { x: -5000, y: 5000 },
    ];
    for (const point of corners) {
      await pet.evaluate((point) => {
        window.paw.drag("start", { x: 0, y: 0 });
        window.paw.drag("move", point);
        window.paw.drag("end", point);
      }, point);
      await wait(1100);
      const frame = await app.evaluate(async ({ BrowserWindow }) => {
        const p = BrowserWindow.getAllWindows().find((w) =>
            w.webContents.getURL().endsWith("pet.html"),
          ),
          bounds = p.getBounds(),
          visual = await p.webContents.executeJavaScript(
            `(()=>{const r=document.querySelector('#floating-pet canvas').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()`,
          );
        return {
          bounds,
          visual,
          house: BrowserWindow.getAllWindows()
            .find((w) => w.webContents.getURL().includes("kind=house"))
            .getBounds(),
          toy: BrowserWindow.getAllWindows()
            .find((w) => w.webContents.getURL().includes("kind=toy"))
            .getBounds(),
        };
      });
      const opaque = await app.evaluate(async ({ BrowserWindow }) => {
        const w = BrowserWindow.getAllWindows().find((w) =>
            w.webContents.getURL().endsWith("pet.html"),
          ),
          image = await w.capturePage(),
          size = image.getSize(),
          pixels = image.getBitmap(),
          bounds = w.getBounds();
        let left = size.width,
          top = size.height,
          right = -1,
          bottom = -1;
        for (let y = 0; y < size.height; y++)
          for (let x = 0; x < size.width; x++)
            if (pixels[(y * size.width + x) * 4 + 3] > 220) {
              left = Math.min(left, x);
              right = Math.max(right, x);
              top = Math.min(top, y);
              bottom = Math.max(bottom, y);
            }
        return {
          left: bounds.x + (left * bounds.width) / size.width,
          right: bounds.x + (right * bounds.width) / size.width,
          top: bounds.y + (top * bounds.height) / size.height,
          bottom: bounds.y + (bottom * bounds.height) / size.height,
        };
      });
      assert.ok(
        opaque.left >= positions.area.x - 2 &&
          opaque.right <= positions.area.x + positions.area.width + 2,
        JSON.stringify(opaque),
      );
      assert.ok(
        opaque.top >= positions.area.y - 2 &&
          opaque.bottom <= positions.area.y + positions.area.height + 2,
        JSON.stringify(opaque),
      );
      assert.deepEqual(
        frame.house,
        house.bounds,
        "house is static while pet moves",
      );
      assert.deepEqual(frame.toy, toy.bounds, "toy is static while pet moves");
      const state = await page.evaluate(() => window.paw.getState());
      assert.equal(state.activity, "sit");
    }
    await page.evaluate(() => window.paw.update({ showHouse: false }));
    assert.equal(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()
          .find((w) => w.webContents.getURL().includes("kind=house"))
          .isVisible(),
      ),
      false,
    );
    await page.evaluate(() => window.paw.update({ showHouse: true }));
    await page.evaluate(() => window.paw.life("build"));
    const st = await page.evaluate(() => window.paw.getState());
    assert.equal(st.life.house, 75);
    assert.equal(st.life.coins, 10);
    assert.equal(st.life.inventory.wood, 0);
    assert.equal(st.life.inventory.stone, 0);
    await pet.screenshot({
      path: path.join(root, "test-results", "pet-corner-v5.png"),
      omitBackground: true,
    });
    console.log(
      "V5 WORLD PASS: independent static house/toy, four corner drags, house visibility and real coin/material construction cost.",
    );
  } finally {
    if (app) await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
