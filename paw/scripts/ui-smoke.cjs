const assert = require("node:assert/strict"),
  http = require("node:http"),
  fs = require("node:fs/promises"),
  path = require("node:path");
const { chromium } = require("playwright-core");
const root = path.resolve(__dirname, "../src"),
  results = path.resolve(__dirname, "../test-results");
const types = {
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".json": "application/json",
};
const server = http.createServer(async (req, res) => {
  const f = path.resolve(
    root,
    "." + (req.url === "/" ? "/index.html" : req.url.split("?")[0]),
  );
  if (!f.startsWith(root + path.sep)) return res.writeHead(403).end();
  try {
    const body = await fs.readFile(f);
    res
      .writeHead(200, {
        "Content-Type": types[path.extname(f)] || "application/octet-stream",
      })
      .end(body);
  } catch {
    res.writeHead(404).end();
  }
});
(async () => {
  await fs.mkdir(results, { recursive: true });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({
    executablePath: process.env.PAW_CHROMIUM || "/usr/bin/chromium",
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 1280, height: 900 },
      }),
      errors = [];
    page.on("pageerror", (e) => {
      errors.push(e.message);
      console.error("BROWSER:", e.message);
    });
    await page.goto("http://127.0.0.1:" + server.address().port);
    await page.locator("#welcome-continue").waitFor();
    assert.equal(await page.locator(".welcome-parade svg").count(), 9);
    await page.screenshot({
      path: path.join(results, "welcome-v5.png"),
      fullPage: true,
    });
    await page.locator("#welcome-continue").click();
    await page.locator(".pet-card[data-skin=husky]").waitFor();
    assert.equal(await page.locator(".pet-card").count(), 9);
    await page.evaluate(
      () => (window.__canvas = document.querySelector("#pat-pet canvas")),
    );
    await page.locator("[data-skin=husky].pet-card").click();
    await page.screenshot({
      path: path.join(results, "hasya.png"),
      fullPage: true,
    });
    await page.locator("[data-page=settings]").click();
    await page.locator("button[data-theme=dark]").first().click();
    await page.locator("#setting-top").click();
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
    for (const lang of ["en", "uk", "ru", "en", "ru"])
      await page.locator("#language").selectOption(lang);
    await page.locator("[data-page=home]").click();
    assert.ok(
      await page.evaluate(
        () => window.__canvas === document.querySelector("#pat-pet canvas"),
      ),
      "settings navigation keeps the same WebGL canvas",
    );
    await page.locator("#ui-mode").click();
    await page.locator("[data-page=life]").click();
    await page.locator("[data-behavior=active]").fill("80");
    await page.locator("[data-behavior=active]").dispatchEvent("change");
    await page.locator("#companion").selectOption("rabbit");
    await page.locator("#pet-age").waitFor();
    assert.ok((await page.locator("#pet-age").textContent()).includes("0"));
    await page.locator("[data-food=kibble]").click();
    await page.locator("#daily-gift").click();
    await page.screenshot({
      path: path.join(results, "life-dark.png"),
      fullPage: true,
    });
    await page.locator("[data-page=tools]").click();
    await page.locator("#task-text").fill("<script>alert(1)</script>");
    await page.locator("#task-form button").click();
    await page.locator("#task-list li").waitFor();
    assert.ok(
      (await page.locator("#task-list").textContent()).includes("<script>"),
    );
    await page.locator("#timer-minutes").fill("5");
    await page.locator("#timer-form button").click();
    assert.notEqual(await page.locator("#timer-status").textContent(), "—");
    await page.screenshot({
      path: path.join(results, "tools-dark.png"),
      fullPage: true,
    });
    await page.locator("[data-page=wardrobe]").click();
    await page.locator("[data-outfit=beanie]").click();
    await page.locator("#pet-turn").fill("270");
    await page.locator("#pet-turn").dispatchEvent("input");
    assert.equal(await page.locator("#rotation-value").textContent(), "270°");
    await page.screenshot({
      path: path.join(results, "wardrobe-dark.png"),
      fullPage: true,
    });
    await page.locator("[data-page=games]").click();
    await page.locator("[data-adventure=fishing]").click();
    await page.waitForTimeout(350);
    await page.screenshot({
      path: path.join(results, "fishing-v5.png"),
      fullPage: true,
    });
    await page.locator("[data-adventure=wood]").click();
    await page.waitForTimeout(350);
    await page.screenshot({
      path: path.join(results, "forest-v5.png"),
      fullPage: true,
    });
    await page.locator("[data-adventure=garden]").click();
    await page.locator('[data-plot="0"]').click();
    await page.waitForTimeout(250);
    await page.locator('[data-plot="0"]').click();
    await page.screenshot({
      path: path.join(results, "garden-v5.png"),
      fullPage: true,
    });
    await page.locator("[data-page=studio]").click();
    await page.locator("#studio-action").selectOption("sit");
    await page.screenshot({
      path: path.join(results, "studio-v5.png"),
      fullPage: true,
    });
    await page.locator("[data-page=wardrobe]").click();
    const model = await page.evaluate(async () => {
      const { mountPet3D } = await import("./pet-3d.js"),
        { pets } = await import("./pet-art.js"),
        catalog = (await import("./catalog.json", { with: { type: "json" } }))
          .default;
      const host = document.createElement("div");
      host.style.cssText =
        "position:fixed;left:0;top:0;width:320px;height:320px";
      document.body.append(host);
      const scene = mountPet3D(host, {
        skin: "husky",
        activity: "walk",
        outfit: {},
      });
      await new Promise((r) => setTimeout(r, 120));
      const first = scene.inspect();
      let checked = 0;
      for (const pet of pets)
        for (const [key, items] of Object.entries(catalog.wardrobe))
          for (const item of items) {
            scene.update({ skin: pet.id, outfit: { [key]: item.id } });
            checked++;
          }
      const props = {};
      for (const activity of [
        "umbrella",
        "fan",
        "skate",
        "scooter",
        "jetpack",
        "read",
        "gamepad",
        "fish",
        "ball",
        "butterflies",
        "draw",
        "gift",
        "cake",
        "detective",
        "drink",
        "break",
        "float",
      ]) {
        scene.update({
          skin: "husky",
          activity,
          outfit: {},
          life: { growth: 0.9, houseLevel: 2 },
        });
        await new Promise((r) => setTimeout(r, 40));
        props[activity] = scene.inspect();
      }
      scene.update({ companion: "rabbit" });
      await new Promise((r) => setTimeout(r, 50));
      const companion = scene.inspect().companion;
      scene.update({
        companion: null,
        skin: "owl",
        activity: "walk",
        outfit: {},
      });
      const owl = scene.inspect();
      scene.update({ skin: "cat", activity: "curl" });
      const curled = scene.inspect();
      scene.update({ skin: "croc", activity: "walk" });
      const croc = scene.inspect();
      scene.update({ skin: "husky", activity: "sit", outfit: { toy: "ball" } });
      const toyAtRest = scene.inspect().toyVisible;
      scene.update({ activity: "walk" });
      const toyWalking = scene.inspect().toyVisible;
      scene.update({ activity: "sleep", outfit: {} });
      const autoOutfit = host.dataset.outfit;

      scene.dispose();
      host.remove();
      return {
        checked,
        first,
        props,
        companion,
        owl,
        curled,
        croc,
        toyAtRest,
        toyWalking,
        autoOutfit,
        expected: pets.length * Object.values(catalog.wardrobe).flat().length,
      };
    });
    assert.equal(model.first.renderer, "webgl");
    assert.equal(model.checked, model.expected);
    assert.ok(model.companion);
    assert.ok(
      model.owl.wings.every((a) => Math.abs(a) > 0.2),
      "owl wings flap during movement",
    );
    assert.ok(
      model.curled.bodyRotation > 0.8,
      "resting animal curls on its side",
    );
    assert.ok(model.croc.bodyY < -0.2, "crocodile crawls low");
    assert.equal(model.toyAtRest, true);
    assert.equal(model.toyWalking, false);
    assert.equal(model.autoOutfit, "");

    for (const key of [
      "umbrella",
      "fan",
      "skate",
      "scooter",
      "jetpack",
      "draw",
      "gift",
      "cake",
      "detective",
    ])
      assert.ok(model.props[key].props.includes(key), key + " prop visible");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("[data-page=home]").click();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.screenshot({
      path: path.join(results, "mobile.png"),
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "UI PASS: 9 pets; " +
        model.checked +
        " wardrobe combinations; same WebGL canvas across pages/languages; neutral dark theme; life, tasks, timer, 360 rotation, companion and activity props.",
    );
  } finally {
    await browser.close();
  }
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => server.close());
