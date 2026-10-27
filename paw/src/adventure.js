import { renderPet } from "./pet-art.js";
import { v, escapeHTML as esc } from "./v5-ui.js";
const icons = {
  fish: "🐟",
  carrot: "🥕",
  cabbage: "🥬",
  berries: "🫐",
  grain: "🌾",
  worms: "🪱",
  seed: "🌱",
  wood: "🪵",
  stone: "🪨",
  kibble: "🥣",
  meat: "🥩",
};
export function adventureContent(state) {
  const w = (t) => esc(v(t, state.language));
  return `<section class="adventure"><div class="adventure-tabs">${[
    ["fishing", "🎣", "Рыбалка"],
    ["garden", "🌱", "Огород"],
    ["forage", "🌾", "Луг"],
    ["wood", "🪓", "Лес"],
    ["stone", "⛏", "Каменоломня"],
  ]
    .map(([id, g, t]) => `<button data-adventure="${id}">${g} ${w(t)}</button>`)
    .join(
      "",
    )}</div><div class="adventure-scene"><canvas id="adventure-canvas" width="1200" height="600"></canvas><div id="garden-plots"></div><div id="adventure-caption" role="status"></div></div><div class="adventure-controls"><select id="garden-crop"><option value="carrot">🥕 ${w("Морковь")}</option><option value="cabbage">🥬 ${w("Капуста")}</option><option value="berries">🫐 ${w("Ягоды")}</option></select><button id="adventure-primary">${w("Запустить")}</button><button id="adventure-reel">${w("Тянуть")}</button><button id="adventure-leave">${w("Выйти из игры")}</button></div><div id="adventure-bars"></div><div id="inventory" class="inventory"></div><div class="adventure-shop">${[
    ["seed", "Семена", 1],
    ["worms", "Наживка", 1],
    ["kibble", "Корм", 3],
    ["meat", "Мясо", 4],
  ]
    .map(
      ([id, text, price]) =>
        `<button data-buy="${id}">${w("Купить")} ${icons[id]} ${w(text)} · ${price} 🪙</button>`,
    )
    .join("")}</div><p class="feature-hint" id="adventure-help"></p></section>`;
}
export function bindAdventure(root, { api, state, toast }) {
  let disposed = false,
    model = null,
    raf,
    lastPoll = 0,
    request = false,
    held = false,
    pointer = 0.5;
  const q = (s) => root.querySelector(s),
    canvas = q("#adventure-canvas"),
    ctx = canvas.getContext("2d"),
    w = (t) => v(t, state().language);
  const avatar = new Image();
  avatar.src =
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(renderPet(state().skin, "idle", state().outfit));
  canvas.tabIndex = 0;
  canvas.onkeydown = (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (model?.session?.phase === "fight") reel(true);
      else primary();
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      api.adventure("steer", e.key === "ArrowLeft" ? -1 : 1);
    }
  };
  canvas.onkeyup = (e) => {
    if (e.code === "Space") reel(false);
  };
  const send = async (command, value) => {
    try {
      const r = await api.adventure(command, value);
      if (r.adventure) model = r.adventure;
      if (!r.ok && r.message) toast(r.message);
      return r;
    } catch (e) {
      toast(e.message);
    }
  };
  root.querySelectorAll("[data-adventure]").forEach(
    (e) =>
      (e.onclick = async () => {
        await send("start", e.dataset.adventure);
        paintControls();
      }),
  );
  root
    .querySelectorAll("[data-buy]")
    .forEach((e) => (e.onclick = () => send("buy", e.dataset.buy)));
  q("#adventure-leave").onclick = () => send("leave");
  q("#adventure-primary").onclick = () => primary();
  function primary() {
    const g = model?.session;
    if (!g) return send("start", "fishing");
    if (g.type === "fishing")
      return send(g.phase === "bite" ? "hook" : "cast", pointer);
    if (["forage", "wood", "stone"].includes(g.type)) return send("strike");
  }
  function reel(value) {
    held = value;
    if (model?.session?.type === "fishing") send("reel", value);
  }
  q("#adventure-reel").onpointerdown = (e) => {
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    reel(true);
  };
  q("#adventure-reel").onpointerup = q("#adventure-reel").onpointercancel =
    () => reel(false);
  canvas.onpointerdown = (e) => {
    pointer =
      (e.clientX - canvas.getBoundingClientRect().left) /
      canvas.getBoundingClientRect().width;
    canvas.setPointerCapture(e.pointerId);
    if (model?.session?.phase === "fight") reel(true);
    else primary();
  };
  canvas.onpointermove = (e) => {
    pointer = Math.max(
      0,
      Math.min(
        1,
        (e.clientX - canvas.getBoundingClientRect().left) /
          canvas.getBoundingClientRect().width,
      ),
    );
    if (model?.session?.phase === "fight")
      api.adventure("steer", (pointer - 0.5) * 2);
  };
  canvas.onpointerup = canvas.onpointercancel = () => {
    if (held) reel(false);
  };
  function paintControls() {
    if (disposed || !q("#adventure-primary")) return;
    const g = model?.session,
      type = g?.type;
    root
      .querySelectorAll("[data-adventure]")
      .forEach((e) =>
        e.setAttribute("aria-pressed", String(e.dataset.adventure === type)),
      );
    q("#garden-crop").hidden = type !== "garden";
    q("#adventure-primary").hidden =
      type === "garden" || (type === "fishing" && g.phase === "fight");
    q("#adventure-primary").disabled =
      type === "fishing" && g.phase === "waiting";
    q("#adventure-reel").hidden = type !== "fishing" || g.phase !== "fight";
    q("#adventure-primary").textContent =
      type === "fishing"
        ? w(g.phase === "bite" ? "Подсечь" : "Забросить")
        : type
          ? w("Удар")
          : w("Запустить");
    q("#inventory").innerHTML =
      Object.entries(model?.inventory || {})
        .map(
          ([key, count]) => `<span>${icons[key] || key} <b>${count}</b></span>`,
        )
        .join("") + `<span>🪙 <b>${model?.coins || 0}</b></span>`;
    q("#adventure-bars").innerHTML =
      type === "fishing" && g.phase === "fight"
        ? `<label>${w("Натяжение лески")} ${Math.round(g.tension)}%<meter min="0" max="100" value="${g.tension}"></meter></label><label>${w("Улов")} ${Math.round(g.progress)}%<meter min="0" max="100" value="${g.progress}"></meter></label>`
        : "";
    const help = {
      fishing:
        state().language === "en"
          ? "Click water to cast. Hook when the bobber dips. Hold Reel, release to reduce tension, and move opposite the fish."
          : state().language === "uk"
            ? "Клацни по воді, підсікай під час клювання. Тримай «Тягнути», відпускай для зниження натягу й веди вудку проти руху риби."
            : "Кликни по воде, подсекай при поклёвке. Удерживай «Тянуть», отпускай для снижения натяжения и веди удочку против движения рыбы.",
      garden:
        state().language === "en"
          ? "Plant seeds, water each plot, then harvest after growth. Crops keep growing after you leave."
          : "Посади семена, полей каждую грядку и дождись урожая. Растения продолжают расти после выхода.",
      forage: w("Собирай в золотой зоне"),
      wood: w("Собирай в золотой зоне"),
      stone: w("Собирай в золотой зоне"),
    };
    q("#adventure-help").textContent = help[type] || "";
    const plots = q("#garden-plots");
    plots.hidden = type !== "garden";
    if (type === "garden") {
      if (plots.children.length !== 9)
        plots.innerHTML = Array.from(
          { length: 9 },
          (_, i) => `<button data-plot="${i}"></button>`,
        ).join("");
      plots.querySelectorAll("[data-plot]").forEach((button) => {
        const index = Number(button.dataset.plot),
          p = model.garden[index],
          ready = p?.watered && Date.now() >= p.readyAt;
        button.innerHTML = !p
          ? `🌱<small>${w("Посадить")}</small>`
          : !p.watered
            ? `🌱💧<small>${w("Полить")}</small>`
            : ready
              ? `${icons[p.crop]}<small>${w("Собрать")}</small>`
              : `🌿<small>${Math.max(0, Math.ceil((p.readyAt - Date.now()) / 1000))} s</small>`;
        button.onclick = () =>
          send(!p ? "plant" : !p.watered ? "water" : "harvest", {
            plot: index,
            crop: q("#garden-crop").value,
          });
      });
    }
  }
  const ellipse = (x, y, rx, ry, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  const text = (s, x, y, size = 40) => {
    ctx.font = size + "px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(s, x, y);
  };
  function draw(now) {
    if (disposed) return;
    raf = requestAnimationFrame(draw);
    if (now - lastPoll > 200 && !request) {
      lastPoll = now;
      request = true;
      api
        .adventureState()
        .then((data) => {
          if (!disposed) {
            model = data;
            paintControls();
          }
        })
        .finally(() => (request = false));
    }
    const t = now / 1000,
      W = canvas.width,
      H = canvas.height,
      g = model?.session,
      type = g?.type || "fishing";
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#a7d0e3");
    sky.addColorStop(1, "#f4e4b9");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ellipse(1010, 90, 42, 42, "#fff1ac");
    for (let i = 0; i < 4; i++) {
      ellipse(
        120 + i * 280 + Math.sin(t * 0.07 + i) * 10,
        75 + (i % 2) * 40,
        70,
        18,
        "#ffffff80",
      );
    }
    if (type === "fishing") {
      ctx.fillStyle = "#7fa69c";
      ctx.beginPath();
      ctx.moveTo(0, 230);
      ctx.quadraticCurveTo(250, 100, 500, 230);
      ctx.quadraticCurveTo(850, 130, 1200, 250);
      ctx.lineTo(1200, 600);
      ctx.lineTo(0, 600);
      ctx.fill();
      const water = ctx.createLinearGradient(0, 250, 0, H);
      water.addColorStop(0, "#73b6cb");
      water.addColorStop(1, "#285971");
      ctx.fillStyle = water;
      ctx.fillRect(0, 280, W, H - 280);
      for (let j = 0; j < 10; j++) {
        ctx.strokeStyle = "#ffffff25";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 16) {
          const y = 300 + j * 30 + Math.sin(x / 60 + t * 1.5 + j) * 4;
          if (!x) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ellipse(90, 520, 170, 90, "#a48f68");
      if (avatar.complete && avatar.naturalWidth)
        ctx.drawImage(avatar, 5, 330, 205, 190);
      ctx.strokeStyle = "#7b6656";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(137, 431);
      ctx.quadraticCurveTo(183, 322, 241, 252);
      ctx.stroke();
      ctx.strokeStyle = "#f5e0ad";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(137, 431);
      ctx.lineTo(241, 252);
      ctx.stroke();
      const bx = 180 + (g?.castX || 0.5) * 850,
        by =
          g?.phase === "bite"
            ? 365 + Math.sin(t * 20) * 12
            : 350 + Math.sin(t * 3) * 3;
      ctx.strokeStyle =
        g?.phase === "fight" && g.tension > 80 ? "#e77565" : "#e8e1cf";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(241, 252);
      ctx.quadraticCurveTo(320, 250, bx, by);
      ctx.stroke();
      ellipse(bx, by, 6, 14, "#e97871");
      ellipse(bx, by + 12, 18 + Math.sin(t * 4) * 3, 3, "#d9f6f099");
      if (g?.phase === "fight") {
        const fx = 650 + g.fishDirection * 260,
          fy = 450 + Math.sin(t * 5) * 22;
        ellipse(fx, fy, 42, 16, "#c3d8c277");
        ctx.fillStyle = "#9bc7c7aa";
        ctx.beginPath();
        ctx.moveTo(fx - 30, fy);
        ctx.lineTo(fx - 61, fy - 23);
        ctx.lineTo(fx - 61, fy + 23);
        ctx.closePath();
        ctx.fill();
        ellipse(fx, fy, 42, 16, "#a7cfca99");
        ellipse(fx + 24, fy - 3, 4, 4, "#24465788");
      }
      const titles = {
        ready: w("Забросить"),
        waiting: w("Ждём поклёвку"),
        bite: w("Клюёт!"),
        fight: w("Натяжение лески"),
        escaped: w("Рыба ушла"),
        caught: w("Улов") + " 🐟 " + (g?.weight || "") + " kg",
      };
      q("#adventure-caption").textContent = titles[g?.phase || "ready"];
    } else {
      ctx.fillStyle = type === "stone" ? "#a7a0a2" : "#8cac79";
      ctx.fillRect(0, 280, W, 320);
      for (let i = 0; i < 14; i++) {
        const x = i * 93;
        ctx.fillStyle = type === "stone" ? "#6d737f" : "#4f8269";
        ctx.beginPath();
        ctx.moveTo(x - 60, 340);
        ctx.lineTo(x, 140 + (i % 3) * 35);
        ctx.lineTo(x + 80, 340);
        ctx.fill();
      }
      if (type === "garden") {
        ellipse(600, 470, 480, 150, "#937757");
        q("#adventure-caption").textContent = w("Огород");
      } else {
        const impact = Math.max(
            0,
            1 - (Date.now() - (g?.lastInput || 0)) / 220,
          ),
          shake = Math.sin(t * 50) * impact * 6;
        if (type === "wood") {
          const trunk = ctx.createLinearGradient(565, 0, 650, 0);
          trunk.addColorStop(0, "#86684b");
          trunk.addColorStop(0.5, "#b79769");
          trunk.addColorStop(1, "#725b46");
          ctx.fillStyle = trunk;
          ctx.beginPath();
          ctx.moveTo(575 + shake, 470);
          ctx.lineTo(586 + shake, 245);
          ctx.lineTo(642 + shake, 245);
          ctx.lineTo(660 + shake, 470);
          ctx.closePath();
          ctx.fill();
          for (let i = 0; i < 7; i++) {
            const a = i * 2.4;
            ellipse(
              610 + Math.sin(a) * 78 + shake,
              230 + Math.cos(a) * 62,
              85,
              72,
              i % 2 ? "#719b69" : "#527f61",
            );
          }
          ellipse(585 + shake, 185, 55, 38, "#8fb378");
          ctx.strokeStyle = "#66513f";
          ctx.lineWidth = 4;
          for (let i = 0; i < (g?.hits || 0); i++) {
            ctx.beginPath();
            ctx.moveTo(585 + shake, 380 + i * 8);
            ctx.lineTo(627 + shake, 388 + i * 7);
            ctx.stroke();
          }
        } else if (type === "stone") {
          const rock = ctx.createLinearGradient(0, 230, 0, 500);
          rock.addColorStop(0, "#b9c2c4");
          rock.addColorStop(1, "#7d8b95");
          ctx.fillStyle = rock;
          ctx.beginPath();
          ctx.moveTo(470, 455);
          ctx.lineTo(490, 335);
          ctx.lineTo(550, 264);
          ctx.lineTo(663, 250);
          ctx.lineTo(731, 342);
          ctx.lineTo(745, 448);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#d2d9d6";
          ctx.beginPath();
          ctx.moveTo(490, 335);
          ctx.lineTo(550, 264);
          ctx.lineTo(663, 250);
          ctx.lineTo(631, 352);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#667984";
          ctx.beginPath();
          ctx.moveTo(631, 352);
          ctx.lineTo(663, 250);
          ctx.lineTo(731, 342);
          ctx.lineTo(745, 448);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#4d6471";
          ctx.lineWidth = 3;
          for (let i = 0; i < (g?.hits || 0); i++) {
            ctx.beginPath();
            ctx.moveTo(620 + i * 9, 340);
            ctx.lineTo(595 + i * 8, 375);
            ctx.lineTo(611 + i * 6, 416);
            ctx.stroke();
          }
        } else {
          for (let i = 0; i < 9; i++) {
            const x = 470 + i * 34,
              height = 150 + Math.sin(i * 3) * 25;
            ctx.strokeStyle = "#758d55";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(x, 470);
            ctx.quadraticCurveTo(
              x + 12,
              390,
              x + Math.sin(t + i) * 5,
              470 - height,
            );
            ctx.stroke();
            for (let j = 0; j < 6; j++) {
              ellipse(x - 7, 470 - height + j * 12, 13, 5, "#e7c77c");
              ellipse(x + 7, 475 - height + j * 12, 13, 5, "#d8b96d");
            }
          }
        }
        if (impact > 0)
          for (let i = 0; i < 7; i++) {
            const p = 1 - impact;
            ellipse(
              620 + Math.sin(i * 2.4) * p * 130,
              390 + Math.cos(i * 2.4) * p * 80 + p * p * 35,
              3 + impact * 3,
              3 + impact * 3,
              type === "wood"
                ? "#d6bd8d"
                : type === "stone"
                  ? "#c2ccd0"
                  : "#efcf82",
            );
          }
        const phase = g ? ((Date.now() - g.started) / 1400) % 1 : 0,
          marker = 170 + phase * 860,
          target = 170 + (g?.target || 0.5) * 860;
        ctx.fillStyle = "#334c4f";
        ctx.fillRect(160, 520, 880, 30);
        ctx.fillStyle = "#efcc76";
        ctx.fillRect(target - 90, 520, 180, 30);
        ctx.fillStyle = "#faf5e6";
        ctx.fillRect(marker - 5, 512, 10, 46);
        q("#adventure-caption").textContent =
          w("Собирай в золотой зоне") + " · " + (g?.score || 0);
        ctx.save();
        ctx.translate(805, 412);
        ctx.rotate(-0.7 + impact * 0.8);
        ctx.fillStyle = "#a5845f";
        ctx.fillRect(-7, -10, 14, 120);
        ctx.fillStyle = type === "stone" ? "#8197a4" : "#bbc8c5";
        ctx.beginPath();
        ctx.moveTo(-42, -20);
        ctx.quadraticCurveTo(0, -50, 52, -20);
        ctx.lineTo(35, 20);
        ctx.lineTo(-32, 12);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }
  raf = requestAnimationFrame(draw);
  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      if (held) api.adventure("reel", false);
    },
  };
}
