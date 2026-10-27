// Main-process simulation. Clients send controls; rewards never come from the client.
const { stock } = require("./v5-model.cjs");
function createGameEngine({ now = Date.now, random = Math.random } = {}) {
  let session = null;
  function prepare(life) {
    life.inventory = stock(life.inventory);
    if (!Array.isArray(life.garden))
      life.garden = Array.from({ length: 9 }, () => null);
    return life;
  }
  function start(type, life) {
    prepare(life);
    if (!["fishing", "garden", "forage", "wood", "stone"].includes(type))
      return { ok: false };
    session = {
      type,
      started: now(),
      phase: "ready",
      score: 0,
      rod: Math.min(3, 1 + Math.floor(life.xp / 250)),
      bait: "worms",
      fish: 0,
      tension: 25,
      progress: 0,
      steer: 0,
      reeling: false,
      lastTick: now(),
      lastInput: 0,
      target: random(),
      targetAt: now(),
      combo: 0,
    };
    return { ok: true };
  }
  function control(command, arg, life) {
    prepare(life);
    if (!session) return { ok: false };
    const g = session,
      t = now();
    if (command === "leave") {
      session = null;
      return { ok: true };
    }
    if (command === "buy") {
      const costs = { seed: 1, worms: 1, kibble: 3, meat: 4 };
      if (!costs[arg] || life.coins < costs[arg])
        return { ok: false, message: "Недостаточно монет." };
      life.coins -= costs[arg];
      life.inventory[arg] += arg === "seed" ? 3 : 1;
      return { ok: true };
    }
    if (g.type === "fishing") {
      if (
        command === "cast" &&
        ["ready", "caught", "escaped"].includes(g.phase)
      ) {
        if (life.inventory.worms < 1)
          return {
            ok: false,
            message: "Нужна наживка: добудь червячков на лугу или купи.",
          };
        life.inventory.worms--;
        g.phase = "waiting";
        g.castAt = t;
        g.biteAt = t + 900 + random() * 2250;
        g.castX = Math.max(0.15, Math.min(0.9, Number(arg) || 0.5));
        g.progress = 0;
        g.tension = 25;
        g.reeling = false;
        return { ok: true };
      }
      if (command === "hook" && g.phase === "bite" && t < g.biteAt + 1800) {
        g.phase = "fight";
        g.lastTick = t;
        g.fish = 1 + Math.floor(random() * 5);
        g.fishPhase = random() * 6.28;
        g.strength = 0.65 + random() * 0.7;
        return { ok: true };
      }
      if (command === "reel") {
        g.reeling = arg === true;
        return { ok: true };
      }
      if (command === "steer" && Number.isFinite(arg)) {
        g.steer = Math.max(-1, Math.min(1, arg));
        return { ok: true };
      }
    }
    if (g.type === "garden") {
      const index = Number(arg?.plot);
      if (!Number.isInteger(index) || index < 0 || index > 8)
        return { ok: false };
      const plot = life.garden[index];
      if (
        command === "plant" &&
        !plot &&
        ["carrot", "cabbage", "berries"].includes(arg.crop) &&
        life.inventory.seed > 0
      ) {
        life.inventory.seed--;
        life.garden[index] = {
          crop: arg.crop,
          planted: t,
          watered: false,
          readyAt: null,
        };
        return { ok: true };
      }
      if (command === "water" && plot && !plot.watered) {
        plot.watered = true;
        plot.readyAt = t + 45000 + (plot.crop === "berries" ? 15000 : 0);
        return { ok: true };
      }
      if (command === "harvest" && plot?.watered && t >= plot.readyAt) {
        const qty = 2 + Math.floor(random() * 3);
        life.inventory[plot.crop] += qty;
        life.inventory.seed += 1;
        life.coins += 2;
        life.xp += 5;
        life.garden[index] = null;
        g.score += qty;
        return { ok: true, harvest: qty };
      }
    }
    if (
      ["wood", "stone", "forage"].includes(g.type) &&
      command === "strike" &&
      t - g.lastInput >= 250
    ) {
      g.lastInput = t;
      const phase = ((t - g.started) / 1400) % 1,
        success = Math.abs(phase - g.target) < 0.11;
      g.combo = success ? g.combo + 1 : 0;
      g.target = 0.2 + random() * 0.6;
      g.targetAt = t;
      if (g.type === "forage") {
        if (!success)
          return { ok: false, message: "Попробуй попасть в золотую зону." };
        const item = random() < 0.55 ? "grain" : "worms";
        life.inventory[item]++;
        g.score++;
        life.xp += 2;
      } else {
        g.hits = (g.hits || 0) + (success ? 2 : 1);
        if (g.hits >= 5) {
          g.hits = 0;
          life.inventory[g.type] += 1 + (g.combo >= 3 ? 1 : 0);
          life.coins++;
          life.xp += 2;
          g.score++;
        }
      }
      return { ok: true, success };
    }
    return { ok: false };
  }
  function tick(life) {
    if (!session) return;
    prepare(life);
    const g = session,
      t = now(),
      dt = Math.min(0.2, Math.max(0, (t - g.lastTick) / 1000));
    g.lastTick = t;
    if (g.type === "fishing") {
      if (g.phase === "waiting" && t >= g.biteAt) g.phase = "bite";
      if (g.phase === "bite" && t > g.biteAt + 1800) g.phase = "escaped";
      if (g.phase === "fight") {
        g.fishDirection = Math.sin((t - g.biteAt) / 650 + g.fishPhase);
        const match = 1 - Math.abs(g.steer + g.fishDirection) / 2;
        g.tension = Math.max(
          0,
          g.tension +
            ((g.reeling ? 19 * g.strength : -12) + (1 - match) * 11) * dt,
        );
        g.progress = Math.max(
          0,
          g.progress + (g.reeling ? (16 + g.rod * 4) * match : -2) * dt,
        );
        if (g.tension > 100 || g.tension < 1) g.phase = "escaped";
        if (g.progress >= 100) {
          g.phase = "caught";
          g.score++;
          life.inventory.fish++;
          life.coins += 3 + g.fish;
          life.xp += 10;
          g.weight = Math.round((0.3 + g.fish * 0.4 + random()) * 100) / 100;
          g.reeling = false;
        }
      }
    }
  }
  function view(life) {
    prepare(life);
    return {
      session: session ? { ...session } : null,
      inventory: life.inventory,
      garden: life.garden,
      coins: life.coins,
    };
  }
  return { start, control, tick, view };
}
module.exports = { createGameEngine };
