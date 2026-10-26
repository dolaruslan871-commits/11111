import {
  featureContent,
  bindFeatures,
  refreshFeatures,
  ageLabel,
  word,
} from "./features.js";
import { pets, renderPet, renderWardrobeItem } from "./pet-art.js";
import { api } from "./bridge.js";
import { petSound, unlockPetAudio, stopPetSounds } from "./sound.js";
import { createPetInteractions } from "./pet-interactions.js";
import { icon } from "./icons.js";
import catalog from "./catalog.json" with { type: "json" };
import { mountPet3D } from "./pet-3d.js";
import { t, localize, registerNames } from "./i18n.js";

registerNames(pets);
registerNames(Object.values(catalog.wardrobe).flat());
let state = await api.getState(),
  page = "home",
  wardrobeTab = "hat";
let petHost = null;
let petScene,
  toastTimer,
  rotation = 0,
  gesture = null,
  suppressClick = false;
let systemRequest = 0,
  weatherRequest = 0;
const app = document.querySelector("#app");
let interactions = createPetInteractions(action);
const names = {
  fox: "Лисёнок",
  husky: "Хася",
  dog: "Бадди",
  cat: "Моти",
  croc: "Киви",
  kangaroo: "Кенгуру",
  dinosaur: "Динозаврик",
  owl: "Сова",
  rabbit: "Заяц",
};
const slotNames = {
  hat: "Шапочки",
  glasses: "Очки",
  scarf: "Шарфики",
  toy: "Игрушки",
  clothing: "Одежда",
  accessory: "Аксессуары",
};
const wardrobe = Object.fromEntries(
  Object.entries(catalog.wardrobe).map(([key, items]) => [
    key,
    { name: slotNames[key], items },
  ]),
);
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const preferenceKeys = [
  "skin",
  "muted",
  "roaming",
  "scale",
  "feedMode",
  "theme",
  "language",
  "alwaysOnTop",
  "weatherCity",
  "shortcut",
  "outfit",
  "behavior",
  "companion",
  "autostart",
];
const signature = (value) =>
  JSON.stringify(preferenceKeys.map((key) => value[key]));

function toast(text) {
  const box = document.querySelector("#toast");
  if (!text || !box) return;
  box.textContent = t(text, state.language);
  box.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.remove("visible"), 6000);
}
function resultError(result) {
  if (result && !result.ok && !result.canceled && result.message)
    toast(result.message);
}
function accept(next) {
  const changed = signature(next) !== signature(state);
  const newlyMuted = !state.muted && next.muted;
  state = next;
  if (newlyMuted) stopPetSounds();
  if (changed) render();
  else {
    petScene?.update(state);
    refreshFeatures(app, state, api);
    document
      .querySelector("#pat-pet")
      ?.setAttribute("class", `hero-pet state-${state.activity}`);
    document
      .querySelectorAll("[data-action]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.action === state.activity),
        ),
      );
  }
}
async function change(patch) {
  // Apply appearance immediately, before native settings persistence completes.
  if (patch.theme) document.documentElement.dataset.theme = patch.theme;
  try {
    accept(await api.update(patch));
  } catch {
    document.documentElement.dataset.theme = state.theme || "light";
    toast("Не удалось сохранить настройки.");
  }
}
async function action(name) {
  unlockPetAudio();
  try {
    accept(await api.action(name));
    if (!state.desktop) petSound(state.skin, state.muted, name);
  } catch {
    toast("Не удалось выполнить действие.");
  }
}
function petStage() {
  return `<section class="pet-stage" aria-label="Твой питомец"><div class="stage-top"><span class="preview-label">360° · ${ageLabel(state.life, state.language)}</span><button type="button" class="icon-button" id="sound-stage" aria-label="${state.muted ? "Включить звук" : "Выключить звук"}" title="Звуки питомца">${icon("volume")}${state.muted ? '<span class="mute-slash"></span>' : ""}</button></div><div class="stage-floor"></div><button type="button" class="hero-pet state-${state.activity}" id="pat-pet" aria-label="Погладить питомца"></button><div class="rotation-controls"><button type="button" id="rotate-left" aria-label="Повернуть влево">↶</button><label><span>Поворот</span><input id="pet-turn" aria-label="Поворот питомца" type="range" min="0" max="360" step="1" value="${Math.round(rotation)}"></label><output id="rotation-value">${Math.round(rotation)}°</output><button type="button" id="rotate-right" aria-label="Повернуть вправо">↷</button></div></section>`;
}
function petPicker() {
  return `<div class="section-heading"><h2>Кто будет рядом?</h2><span>Выбери своего друга</span></div><div class="pet-picker">${pets.map((p) => `<button type="button" class="pet-card ${state.skin === p.id ? "selected" : ""}" data-skin="${p.id}" aria-pressed="${state.skin === p.id}"><div class="pet-thumbnail">${renderPet(p.id, "idle", {})}</div><strong>${names[p.id] || escape(p.name || p.id)}</strong><span class="selection-dot">${state.skin === p.id ? icon("check", 13) : ""}</span></button>`).join("")}</div>`;
}
function emotionPanel() {
  const emotions = [
    ["excited", "🤩", "Радость"],
    ["sad", "🥺", "Грусть"],
    ["stand", "🐾", "Лапки на экран"],
    ["wave", "👋", "Привет"],
    ["stretch", "🌤", "Потянуться"],
    ["hunt", "🦋", "Охота"],
    ["angry", "😠", "Сердится"],
    ["chase-tail", "🌀", "Поймать хвост"],
  ];
  return `<section class="emotion-panel"><div class="section-heading"><h2>Эмоции и движения</h2></div><div class="emotion-actions">${emotions.map(([id, emoji, name]) => `<button type="button" data-action="${id}" aria-pressed="${state.activity === id}"><span aria-hidden="true">${emoji}</span>${name}</button>`).join("")}</div></section>`;
}
function homeContent() {
  return `<div class="main-grid"><div class="stage-column">${petStage()}<div class="quick-actions"><button type="button" data-action="pet">${icon("heart")}<span>Погладить</span></button><button type="button" data-action="play">${icon("ball")}<span>Поиграть</span></button><button type="button" id="feed">${icon("bowl")}<span>Файл или папка</span></button></div></div><aside class="daily-card"><h2>Общение без слов</h2><ul class="gesture-guide"><li>Двойной щелчок — погладить</li><li>Частые нажатия на лапку — сердится</li><li>Нажатие на хвост — ловит хвост</li><li>Потяни мышкой — повернуть</li></ul><div class="activity-list">${[
    ["walk", "paw", "Погулять"],
    ["play", "ball", "Поиграть"],
    ["sleep", "moon", "Вздремнуть"],
  ]
    .map(
      ([id, symbol, name]) =>
        `<button type="button" data-action="${id}" class="activity-item" aria-pressed="${state.activity === id}"><span class="activity-icon">${icon(symbol)}</span><strong>${name}</strong></button>`,
    )
    .join(
      "",
    )}</div></aside></div>${emotionPanel()}${petPicker()}<div class="bottom-note"><span class="note-icon">${icon("bowl", 19)}</span><div><strong>Файлы и папки</strong><p>Перетащи ненужный файл или папку на питомца: он отправит их в системную корзину.</p></div></div>`;
}
function wardrobeContent() {
  return `<div class="wardrobe-layout"><div>${petStage()}<p class="wardrobe-caption">Все вещи можно сочетать. Образ сохраняется автоматически.</p></div><section class="wardrobe-panel"><h2>Гардероб</h2><div class="wardrobe-tabs" role="tablist" aria-label="Виды аксессуаров">${Object.entries(
    wardrobe,
  )
    .map(
      ([key, tab]) =>
        `<button type="button" role="tab" aria-selected="${wardrobeTab === key}" data-tab="${key}" class="${wardrobeTab === key ? "active" : ""}">${tab.name}</button>`,
    )
    .join(
      "",
    )}</div><div class="outfit-options" role="tabpanel">${wardrobe[wardrobeTab].items.map((item) => `<button type="button" class="outfit-option ${state.outfit[wardrobeTab] === item.id ? "selected" : ""}" data-outfit="${item.id}" aria-pressed="${state.outfit[wardrobeTab] === item.id}"><span class="outfit-preview" aria-hidden="true">${renderWardrobeItem(wardrobeTab, item.id)}</span><span>${escape(item.name)}${item.price && !state.life?.gifts?.includes(wardrobeTab + ":" + item.id) ? " · 🪙 " + item.price : ""}</span>${state.outfit[wardrobeTab] === item.id ? `<i>${icon("check", 14)}</i>` : ""}</button>`).join("")}</div><button type="button" class="text-button" id="reset-outfit">Снять все аксессуары</button><div class="wardrobe-note">${icon("ball")}<span>Игрушки рядом с питомцем. Нажми «Поиграть», чтобы начать игру.</span></div><button type="button" class="wardrobe-play" data-action="play">${icon("ball")} Поиграть</button></section></div>${petPicker()}`;
}
function toggleRow(id, title, description, checked, symbol) {
  return `<div class="setting-row"><span class="setting-icon">${icon(symbol)}</span><div><strong>${title}</strong><p>${description}</p></div><button type="button" id="${id}" role="switch" aria-checked="${checked}" aria-label="${title}" class="switch ${checked ? "on" : ""}"><i></i></button></div>`;
}
function settingsContent() {
  return `<div class="settings-layout"><section class="settings-card"><h2>Настройки питомца</h2>${toggleRow("setting-sound", "Звуки питомца", "Голоса животных во время общения", !state.muted, "volume")}${toggleRow("setting-top", "Поверх окон", "Питомец остаётся видимым поверх других приложений", state.alwaysOnTop !== false, "arrow")}${toggleRow("setting-roam", "Прогулки по экрану", "Питомец сам гуляет, играет и отдыхает", state.roaming, "paw")}<div class="appearance-settings"><label><strong>Язык</strong><select id="language" aria-label="Язык"><option value="ru" ${state.language === "ru" ? "selected" : ""}>Русский</option><option value="uk" ${state.language === "uk" ? "selected" : ""}>Українська</option><option value="en" ${state.language === "en" ? "selected" : ""}>English</option></select></label><div><strong>Тема</strong><div class="segmented"><button type="button" data-theme="light" aria-pressed="${state.theme !== "dark"}">Светлая</button><button type="button" data-theme="dark" aria-pressed="${state.theme === "dark"}">Тёмная</button></div></div></div><div class="setting-row size-setting"><span class="setting-icon">${icon("paw")}</span><div><strong>Размер питомца</strong><label class="size-slider"><input id="pet-size" aria-label="Размер питомца" type="range" min="0.6" max="1.6" step="0.1" value="${state.scale || 1}"><output id="size-value">${Math.round((state.scale || 1) * 100)}%</output></label></div></div><div class="feed-mode"><strong>Файлы и папки</strong><p>Файлы и папки перемещаются в системную корзину. Их можно восстановить.</p><div class="segmented"><button type="button" data-feed-mode="eat" aria-pressed="${state.feedMode !== "carry"}">Съесть</button><button type="button" data-feed-mode="carry" aria-pressed="${state.feedMode === "carry"}">Отнести в корзину</button></div></div><h2 class="system-title">Устройство</h2><div class="system-buttons"><button type="button" id="device-audio">${icon("volume")}<span class="system-control-name">Звук устройства</span><span id="device-audio-label">Проверка…</span></button><button type="button" id="bluetooth-settings">${icon("bluetooth")} Bluetooth <span id="bluetooth-label">Проверка…</span></button></div><p class="system-footnote">Если прямое переключение недоступно, откроются системные настройки.</p><div class="weather-settings"><h2>Погода</h2><form id="weather-form"><label for="weather-city">Город</label><div class="inline-controls"><input id="weather-city" maxlength="100" autocomplete="off" value="${escape(state.weatherCity || "")}" placeholder="Город"><button type="submit">Сохранить</button></div></form><p id="weather-status" role="status"></p><p class="weather-attribution">Open-Meteo · GeoNames · CC BY 4.0</p></div><div class="shortcut-settings"><h2>Приложение по клику</h2><p id="shortcut-name">${state.shortcut?.name ? escape(state.shortcut.name) : "Приложение не выбрано"}</p><div class="inline-controls"><button type="button" id="choose-app">Выбрать приложение</button>${state.shortcut ? '<button type="button" id="open-app">Открыть</button><button type="button" id="clear-app">Убрать</button>' : ""}</div></div></section><aside class="help-card"><div class="help-pet">${renderPet(state.skin, "sleep", state.outfit)}</div><h2>Paw</h2><p>${word("Быстрые действия", state.language)} · Paw 0.4</p><div class="help-divider"></div><p class="version">Версия 0.4.0 · 3D</p></aside></div>`;
}
function render() {
  // Preserve the active WebGL canvas across preference/language/UI changes.
  // Repeated canvas creation exhausted GPU contexts and made switching freeze.
  const retainedPet = petHost;
  retainedPet?.remove();
  document.documentElement.dataset.theme = state.theme || "light";
  document.documentElement.lang = state.language || "ru";
  const titles = {
    home: "Мой питомец",
    wardrobe: "Гардероб",
    settings: "Настройки",
    life: word("Характер", state.language),
    tools: word("Быстрые действия", state.language),
    games: word("Игры", state.language),
  };
  app.innerHTML = `<div class="app-shell"><aside class="sidebar"><a class="brand" href="#" aria-label="Paw — домой"><span class="brand-mark">${icon("paw", 28)}</span>Paw</a><nav>${[
    ["home", "home", "Мой питомец"],
    ["wardrobe", "shirt", "Гардероб"],
    ["life", "heart", word("Характер", state.language)],
    ["games", "ball", word("Игры", state.language)],
    ["tools", "sliders", word("Быстрые действия", state.language)],
    ["settings", "sliders", "Настройки"],
  ]
    .map(
      ([id, symbol, name]) =>
        `<button type="button" class="nav-item ${page === id ? "active" : ""}" data-page="${id}" ${page === id ? 'aria-current="page"' : ""}>${icon(symbol)}<span>${name}</span></button>`,
    )
    .join(
      "",
    )}</nav><div class="sidebar-bottom"><div class="tiny-paw">${icon("paw", 32)}</div><span class="sidebar-version">Paw · v0.4.0</span></div></aside><main><header class="page-header"><h1>${titles[page]}</h1><button type="button" id="show-pet" class="primary-button">${icon("paw", 18)} На рабочий стол ${icon("arrow", 16)}</button></header>${page === "home" ? homeContent() : page === "wardrobe" ? wardrobeContent() : page === "settings" ? settingsContent() : featureContent(page, state, petStage, pets)}<footer><span>Paw · 0.4.0</span></footer></main></div>`;
  const host = document.querySelector("#pat-pet");
  if (host && retainedPet) {
    host.replaceWith(retainedPet);
    retainedPet.className = `hero-pet state-${state.activity}`;
    petScene.update(state);
  } else if (host) {
    petHost = host;
    petScene = mountPet3D(host, state);
    petScene.setRotation?.((rotation * Math.PI) / 180);
  } else {
    petScene?.update(state);
  }
  bind();
  bindFeatures(app, { api, state: () => state, change, accept, toast, pets });
  localize(app, state.language);
  if (page === "settings") {
    refreshSystem();
    refreshWeather();
  }
}
function rotateTo(degrees) {
  interactions.spin(degrees - rotation);
  rotation = ((degrees % 360) + 360) % 360;
  petScene?.setRotation?.((rotation * Math.PI) / 180);
  const input = document.querySelector("#pet-turn"),
    output = document.querySelector("#rotation-value");
  if (input) input.value = String(Math.round(rotation));
  if (output) output.textContent = `${Math.round(rotation)}°`;
}
function bindPet() {
  const pet = document.querySelector("#pat-pet");
  if (!pet) return;
  pet.onpointerdown = (event) => {
    if (event.button !== 0) return;
    unlockPetAudio();
    gesture = { x: event.clientX, y: event.clientY, rotation, dragged: false };
    suppressClick = false;
    pet.setPointerCapture(event.pointerId);
  };
  pet.onpointermove = (event) => {
    if (!gesture) return;
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 6)
      gesture.dragged = true;
    if (gesture.dragged)
      rotateTo(gesture.rotation + (event.clientX - gesture.x) * 0.8);
  };
  pet.onpointerup = () => {
    suppressClick = !!gesture?.dragged;
    gesture = null;
  };
  pet.onpointercancel = () => {
    gesture = null;
    suppressClick = true;
  };
  pet.onclick = (event) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    const part = petScene?.hitTest?.(event.clientX, event.clientY) || "body";
    if (event.detail === 0) interactions.doubleTap("body");
    else interactions.tap(part);
  };
  pet.ondblclick = (event) => {
    if (suppressClick) return;
    const part = petScene?.hitTest?.(event.clientX, event.clientY) || "body";
    event.preventDefault();
    interactions.doubleTap(part);
  };
}
function bind() {
  document.querySelector(".brand").onclick = (event) => {
    event.preventDefault();
    page = "home";
    render();
  };
  document.querySelectorAll("[data-page]").forEach(
    (button) =>
      (button.onclick = () => {
        page = button.dataset.page;
        render();
      }),
  );
  document.querySelectorAll(".pet-card[data-skin]").forEach(
    (button) =>
      (button.onclick = async () => {
        interactions = createPetInteractions(action);
        await change({ skin: button.dataset.skin });
        petSound(state.skin, state.muted);
      }),
  );
  document
    .querySelectorAll("[data-action]")
    .forEach(
      (button) => (button.onclick = () => action(button.dataset.action)),
    );
  document.querySelector("#show-pet").onclick = async () => {
    if (!(await api.showPet()))
      toast("Чтобы выпустить друга на рабочий стол, запусти приложение Paw.");
  };
  document
    .querySelector("#feed")
    ?.addEventListener("click", async () => resultError(await api.feed()));
  document.querySelectorAll("[data-tab]").forEach(
    (button) =>
      (button.onclick = () => {
        wardrobeTab = button.dataset.tab;
        render();
      }),
  );
  document.querySelectorAll(".outfit-option[data-outfit]").forEach(
    (button) =>
      (button.onclick = async () => {
        const item = wardrobe[wardrobeTab].items.find(
            (i) => i.id === button.dataset.outfit,
          ),
          key = wardrobeTab + ":" + item.id;
        if (item.price && !state.life?.gifts?.includes(key)) {
          const r = await api.life("buy", key);
          if (!r.ok) {
            toast(r.message);
            return;
          }
          if (r.state) accept(r.state);
        }
        await change({ outfit: { [wardrobeTab]: button.dataset.outfit } });
      }),
  );
  document
    .querySelector("#reset-outfit")
    ?.addEventListener("click", () =>
      change({
        outfit: Object.fromEntries(
          Object.keys(wardrobe).map((key) => [key, "none"]),
        ),
      }),
    );
  for (const id of ["sound-stage", "setting-sound"])
    document
      .getElementById(id)
      ?.addEventListener("click", () => change({ muted: !state.muted }));
  document
    .querySelector("#setting-top")
    ?.addEventListener("click", () =>
      change({ alwaysOnTop: !state.alwaysOnTop }),
    );
  document
    .querySelector("#setting-roam")
    ?.addEventListener("click", () => change({ roaming: !state.roaming }));
  document
    .querySelector("#language")
    ?.addEventListener("change", (event) =>
      change({ language: event.target.value }),
    );
  app
    .querySelectorAll("button[data-theme]")
    .forEach(
      (button) =>
        (button.onclick = () => change({ theme: button.dataset.theme })),
    );
  document
    .querySelectorAll("[data-feed-mode]")
    .forEach(
      (button) =>
        (button.onclick = () => change({ feedMode: button.dataset.feedMode })),
    );
  const size = document.querySelector("#pet-size");
  if (size) {
    size.oninput = () => {
      document.querySelector("#size-value").textContent =
        `${Math.round(Number(size.value) * 100)}%`;
    };
    size.onchange = () => change({ scale: Number(size.value) });
  }
  document
    .querySelector("#pet-turn")
    ?.addEventListener("input", (event) =>
      rotateTo(Number(event.target.value)),
    );
  document
    .querySelector("#rotate-left")
    ?.addEventListener("click", () => rotateTo(rotation - 30));
  document
    .querySelector("#rotate-right")
    ?.addEventListener("click", () => rotateTo(rotation + 30));
  document
    .querySelector("#device-audio")
    ?.addEventListener("click", () => toggleSystem("audio"));
  document
    .querySelector("#bluetooth-settings")
    ?.addEventListener("click", () => toggleSystem("bluetooth"));
  document
    .querySelector("#weather-form")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const city = document.querySelector("#weather-city").value.trim();
      await change({ weatherCity: city });
      refreshWeather();
    });
  document.querySelector("#choose-app")?.addEventListener("click", async () => {
    const result = await api.chooseApp();
    resultError(result);
    if (result?.ok) accept(await api.getState());
  });
  document
    .querySelector("#open-app")
    ?.addEventListener("click", async () => resultError(await api.openApp()));
  document
    .querySelector("#clear-app")
    ?.addEventListener("click", () => change({ shortcut: null }));
  const stage = document.querySelector(".pet-stage");
  if (stage) {
    stage.ondragover = (event) => {
      event.preventDefault();
      stage.classList.add("drop-active");
    };
    stage.ondragleave = () => stage.classList.remove("drop-active");
    stage.ondrop = (event) => {
      event.preventDefault();
      stage.classList.remove("drop-active");
      if (!state.desktop) toast("Кормление файлами работает в настольном Paw.");
    };
  }
  bindPet();
}
async function refreshSystem() {
  const request = ++systemRequest;
  try {
    const status = await api.systemStatus();
    if (request !== systemRequest || page !== "settings") return;
    for (const [kind, labelId] of [
      ["audio", "device-audio-label"],
      ["bluetooth", "bluetooth-label"],
    ]) {
      const label = document.getElementById(labelId),
        value = status[kind];
      if (label)
        label.textContent = t(
          value?.supported && typeof value.enabled === "boolean"
            ? value.enabled
              ? "Включён"
              : "Выключен"
            : "Настройки",
          state.language,
        );
    }
  } catch {
    for (const id of ["device-audio-label", "bluetooth-label"]) {
      const label = document.getElementById(id);
      if (label) label.textContent = t("Настройки", state.language);
    }
  }
}
async function toggleSystem(kind) {
  const button = document.getElementById(
    kind === "audio" ? "device-audio" : "bluetooth-settings",
  );
  if (button) button.disabled = true;
  try {
    const status = await api.systemStatus(),
      value = status[kind];
    const result =
      value?.supported && typeof value.enabled === "boolean"
        ? await api[kind](!value.enabled)
        : await api.settings(kind);
    resultError(result);
    await refreshSystem();
  } catch {
    toast("Не удалось выполнить действие.");
  } finally {
    if (button?.isConnected) button.disabled = false;
  }
}
async function refreshWeather() {
  const request = ++weatherRequest,
    label = document.querySelector("#weather-status");
  if (!label) return;
  if (!state.weatherCity) {
    label.textContent = t("Укажи город для прогноза.", state.language);
    return;
  }
  label.textContent = t("Загрузка…", state.language);
  try {
    const result = await api.weather();
    if (request !== weatherRequest || !label.isConnected) return;
    label.textContent = result.ok
      ? `${result.city || state.weatherCity} · ${Math.round(result.temperature)} °C`
      : t(result.message || "Погода временно недоступна.", state.language);
  } catch {
    if (label.isConnected)
      label.textContent = t("Погода временно недоступна.", state.language);
  }
}
let noticeAt = 0;
api.onState((next) => {
  accept(next);
  if (next.notice?.at !== noticeAt && next.notice) {
    noticeAt = next.notice.at;
    if (next.notice.kind === "task") toast(next.notice.text);
    else if (next.notice.kind === "timer")
      toast(word("Таймер", state.language) + " ⏰");
  }
});
setInterval(() => refreshFeatures(app, state, api), 500);
api.onNavigate?.((section) => {
  if (
    !["home", "wardrobe", "settings", "life", "games", "tools"].includes(
      section,
    )
  )
    return;
  page = section;
  render();
  if (section === "settings") document.querySelector("#weather-city")?.focus();
});
api.onFeedResult?.(resultError);
window.addEventListener("beforeunload", () => petScene?.dispose());
render();
