import {ACTIONS,personalityActivity,resolveActivity} from './activity-policy.js';
import { languagePicker, welcomeControls, bindWelcomeVoice } from "./onboarding.js";
import { appearance, welcome, v, petName, creatorNote } from "./v5-ui.js";
import {
  foodPanel,
  appearancePanel,
  identityPanel,
  toyDistance,
  bindV5Panels,
} from "./v5-panels.js";
import {
  studioContent,
  bindStudio,
  studioActions,
  actionLabel,
} from "./studio.js";
import { adventureContent, bindAdventure } from "./adventure.js";
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
import { FOOD } from "./v5-model-browser.js";
import { revealSection, confirmSelection } from "./ui-motion.js";

import { createPawGuide } from "./paw-guide.js";
import { desktopSettings, petAppearanceSettings, bindDesktopSettings } from "./desktop-settings.js";
registerNames(pets);
registerNames(Object.values(catalog.wardrobe).flat());
let state = await api.getState(),
  page = "home",
  wardrobeTab = "hat";
let petHost = null,
  studioController = null,
  adventureController = null;
let welcomeVoiceCleanup = null;
let petScene,
  toastTimer,
  rotation = 0,
  gesture = null,
  suppressClick = false;
let systemRequest = 0,
  weatherRequest = 0;
let renderedPage = null,
  renderedTab = null,
  renderGeneration = 0,
  saveState = "idle",
  saveTimer = null;
const outfitRequests = new Map();
const pendingPurchases = new Set();
const copy = (ru, uk, en) => state.language === "en" ? en : state.language === "uk" ? uk : ru;
const app = document.querySelector("#app");
let behaviorDraft=null;
const petDisplayState=()=>behaviorDraft?{...state,behavior:{...state.behavior,...behaviorDraft},activity:resolveActivity(personalityActivity(Object.keys(behaviorDraft)[0],{...state.behavior,...behaviorDraft}),state),approachingHouse:false,approachingToy:false}:state;
let interactions = createPetInteractions(action);
const guide = createPawGuide({api, getState:()=>state, navigate:(target)=>{if(page!==target || !app.querySelector("main")){page=target; if(target==='wardrobe')wardrobeTab='accessory';render();}}, notify:toast});
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
  "names",
  "uiMode",
  "glass",
  "glassOpacity",
  "windowOpacity",
  "showHouse",
  "toyDistance",
  "shortcuts",
  "browser",
  "player",
  "welcomeVersion",
  "languageConfirmed",
  "graphicsQuality", "guideStatus", "guideStep", "guideReward", "petOpacity", "clickThrough", "parachuteEnabled", "energySaver", "smartDnd", "edgeSnap", "docked", "displayId", "hotkey", "updateNotifications", "breed", "allowedActivities", "houseScale", "houseColor", "houseAccent",
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
function foodHint() {
  const available = (FOOD[state.skin] || []).some(food => (state.life?.inventory?.[food] ?? 3) > 0);
  return available
    ? copy("Лакомство — хороший повод для маленького перерыва вместе.", "Смаколик — гарна нагода для маленької перерви разом.", "A little treat is a lovely reason to take a break together.")
    : v("Еда закончилась. Добудь её в играх.", state.language);
}
function refreshDynamicUI() {
  refreshFeatures(app, state, api);
  const hint = app.querySelector("[data-food-hint]");
  if (hint && hint.textContent !== foodHint()) hint.textContent = foodHint();
}
function accept(next) {
  const changed = signature(next) !== signature(state);
  const newlyMuted = !state.muted && next.muted;
  state = next;
  if (newlyMuted) stopPetSounds();
  if (changed) render();
  else {
    if (page === "studio") studioController?.apply();
    else petScene?.update({ ...petDisplayState(), studioQuality: false });
    refreshDynamicUI();
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
async function change(patch, options = {}) {
  if(patch.behavior)behaviorDraft=null;
  // Apply appearance immediately, before native settings persistence completes.
  if (patch.theme) document.documentElement.dataset.theme = patch.theme;
  try {
    const next = await api.update(patch);
    if (!options.isCurrent || options.isCurrent()) accept(next);
    return true;
  } catch {
    document.documentElement.dataset.theme = state.theme || "light";
    toast("Не удалось сохранить настройки.");
    return false;
  }
}

function wardrobeStatus() {
  if (saveState === "saving") return copy("Применяем образ…", "Застосовуємо образ…", "Applying your look…");
  if (saveState === "saved") return copy("Образ сохранён", "Образ збережено", "Your look is saved");
  if (saveState === "error") return copy("Не удалось сохранить образ", "Не вдалося зберегти образ", "Could not save this look");
  return copy("Образ сохраняется автоматически", "Образ зберігається автоматично", "Your look saves automatically");
}
function showWardrobeStatus(phase) {
  saveState = phase;
  clearTimeout(saveTimer);
  const box = document.querySelector(".wardrobe-save-state");
  if (box) {
    box.dataset.state = phase;
    box.textContent = wardrobeStatus();
    box.setAttribute("aria-busy", String(phase === "saving"));
    if (phase === "saved") confirmSelection(box);
  }
  if (phase === "saved") saveTimer = setTimeout(() => showWardrobeStatus("idle"), 3000);
}

function graphicsPanel() {
  const title = copy("Качество графики", "Якість графіки", "Graphics quality");
  const hints = {
    low: copy("Меньше нагрузка на GPU и батарею. Упрощённые материалы и тени.", "Менше навантаження на GPU та батарею. Спрощені матеріали й тіні.", "A lighter GPU and battery footprint, with simpler materials and shadows."),
    medium: copy("Баланс детализации и экономичности для повседневной работы.", "Баланс деталізації та економності для щоденної роботи.", "Balanced detail and efficiency for everyday use."),
    high: copy("Мягкие тени, выразительные глаза и подробные материалы.", "М’які тіні, виразні очі та деталізовані матеріали.", "Soft shadows, expressive eyes and detailed materials."),
    ultra: copy("Максимальная детализация для мощных устройств и больших экранов.", "Максимальна деталізація для потужних пристроїв і великих екранів.", "Maximum detail for capable devices and larger displays."),
  };
  const selected = ["low", "medium", "high", "ultra"].includes(state.graphicsQuality) ? state.graphicsQuality : "high";
  return `<section class="life-card graphics-settings"><div class="graphics-heading"><span class="setting-icon">${icon("spark")}</span><div><h2>${title}</h2><p>${copy("Красивый питомец в удобном для устройства режиме.", "Гарний улюбленець у комфортному для пристрою режимі.", "Beautifully rendered, at a setting that suits your device.")}</p></div></div><label class="graphics-select" for="graphics-quality"><span>${copy("Уровень детализации", "Рівень деталізації", "Detail level")}</span><select id="graphics-quality" aria-label="${title}">${["low", "medium", "high", "ultra"].map(value => `<option value="${value}" ${selected === value ? "selected" : ""}>${value[0].toUpperCase() + value.slice(1)}</option>`).join("")}</select></label><p class="quality-note" id="graphics-quality-note" role="status">${hints[selected]}</p></section>`;
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
  return `<div class="section-heading"><h2>Кто будет рядом?</h2><span>Выбери своего друга</span></div><div class="pet-picker">${pets.map((p) => `<button type="button" class="pet-card ${state.skin === p.id ? "selected" : ""}" data-skin="${p.id}" aria-pressed="${state.skin === p.id}"><div class="pet-thumbnail">${renderPet(p.id, "idle", {})}</div><strong>${escape(petName(state, p.id, names[p.id] || p.name || p.id))}</strong><span class="selection-dot">${state.skin === p.id ? icon("check", 13) : ""}</span></button>`).join("")}</div>`;
}
function emotionPanel() {
  const enabled=state.allowedActivities || ACTIONS;
  return `<section class="emotion-panel life-card"><div class="section-heading"><h2>${copy('Разрешённые действия','Дозволені дії','Allowed actions')}</h2><button id="enable-all-actions">${copy('Включить все','Увімкнути всі','Enable all')}</button></div><p class="feature-hint">${copy('Оставь одно действие, чтобы питомец сохранял эту позу. Еда и перетаскивание временно прерывают её.','Залиш одну дію, щоб улюбленець зберігав цю позу. Їжа та перетягування тимчасово переривають її.','Keep one action enabled to hold that pose. Feeding and dragging interrupt it temporarily.')}</p><div class="emotion-actions">${ACTIONS.map(id=>`<div class="action-choice"><label><input type="checkbox" data-allowed-action="${id}" ${enabled.includes(id)?'checked':''}>${escape(actionLabel(id,state.language))}</label><button type="button" data-action="${id}" ${enabled.includes(id)?'':'disabled'} aria-label="${escape(actionLabel(id,state.language))}">▶</button><button type="button" data-only-action="${id}">${copy('Только','Лише','Only')}</button></div>`).join('')}</div></section>`;
}
function petControls() {
 return `<section class="life-card"><h2>${copy('Питомец на экране','Улюбленець на екрані','Desktop pet')}</h2>${toggleRow('setting-sound',t('Звуки питомца',state.language),'',!state.muted,'volume')}${toggleRow('setting-roam',t('Прогулки по экрану',state.language),copy('Выключи, чтобы закрепить питомца без анимации ходьбы.','Вимкни, щоб закріпити улюбленця без анімації ходьби.','Turn off to keep your pet still, without a walking animation.'),state.roaming,'paw')}<label class="size-slider">${t('Размер питомца',state.language)}<input id="pet-size" type="range" min="0.6" max="1.6" step="0.1" value="${state.scale||1}"><output id="size-value">${Math.round((state.scale||1)*100)}%</output></label>${petAppearanceSettings(state)}<div class="feed-mode"><strong>${copy('Файлы и папки','Файли й папки','Files and folders')}</strong><p>${copy('Перемещаются в системную корзину. Их можно восстановить.','Переміщуються до системного кошика. Їх можна відновити.','Moved to the system trash, where they can be restored.')}</p><div class="segmented"><button data-feed-mode="eat" aria-pressed="${state.feedMode!=='carry'}">${copy('Съесть','З’їсти','Eat')}</button><button data-feed-mode="carry" aria-pressed="${state.feedMode==='carry'}">${copy('Отнести в корзину','Віднести до кошика','Carry to trash')}</button></div></div></section>`;
}
function homeContent() {
  return `<div class="main-grid"><div>${petStage()}<div class="quick-actions"><button data-action="pet">♡ ${t("Погладить", state.language)}</button><button data-action="play">⚽ ${t("Поиграть", state.language)}</button><button id="open-studio">◉ ${v("Съёмка", state.language)}</button></div></div><aside class="life-card"><h2>${escape(petName(state, state.skin, names[state.skin]))}</h2><p>${ageLabel(state.life, state.language)}</p><h3>${v("Покормить", state.language)}</h3>${foodPanel(state)}<p class="feature-hint" data-food-hint>${escape(foodHint())}</p></aside></div>${identityPanel(state, names[state.skin])}${petPicker()}${petControls()}${emotionPanel()}<p class="bottom-note">${v("Ненужные файлы можно перетаскивать на питомца: он отправит их в системную корзину.", state.language)}</p>${creatorNote(state.language)}`;
}
function wardrobeContent() {
  return `<div class="wardrobe-layout"><div>${petStage()}<p class="wardrobe-caption">${copy("Собери образ, который подходит именно твоему другу.", "Створи образ, що пасує саме твоєму другові.", "A little style, a lot of personality. Make the look their own.")}</p></div><section class="wardrobe-panel"><div class="wardrobe-panel-heading"><h2>${copy("Коллекция", "Колекція", "The collection")}</h2><span class="wardrobe-save-state" role="status" aria-live="polite" data-state="${saveState}">${wardrobeStatus()}</span></div><div class="wardrobe-tabs" role="tablist" aria-label="Виды аксессуаров">${Object.entries(
    wardrobe,
  )
    .map(
      ([key, tab]) =>
        `<button type="button" role="tab" id="wardrobe-tab-${key}" aria-controls="wardrobe-options" tabindex="${wardrobeTab === key ? 0 : -1}" aria-selected="${wardrobeTab === key}" data-tab="${key}" class="${wardrobeTab === key ? "active" : ""}">${tab.name}</button>`,
    )
    .join(
      "",
    )}</div><div class="outfit-options" id="wardrobe-options" role="tabpanel" aria-labelledby="wardrobe-tab-${wardrobeTab}">${wardrobe[wardrobeTab].items.filter(item=>!item.guideOnly || state.guideReward).map((item) => `<button type="button" class="outfit-option ${state.outfit[wardrobeTab] === item.id ? "selected" : ""}" data-outfit="${item.id}" aria-pressed="${state.outfit[wardrobeTab] === item.id}"><span class="outfit-preview" aria-hidden="true">${renderWardrobeItem(wardrobeTab, item.id)}</span><span>${escape(item.name)}${item.price && !state.life?.gifts?.includes(wardrobeTab + ":" + item.id) ? " · 🪙 " + item.price : ""}</span>${state.outfit[wardrobeTab] === item.id ? `<i>${icon("check", 14)}</i>` : ""}</button>`).join("")}</div><button type="button" class="text-button" id="reset-outfit">Снять все аксессуары</button><div class="wardrobe-note">${icon("ball")}${toyDistance(state)}</div><button type="button" class="wardrobe-play" data-action="play">${icon("ball")} Поиграть</button></section></div>${petPicker()}`;
}
function toggleRow(id, title, description, checked, symbol) {
  return `<div class="setting-row"><span class="setting-icon">${icon(symbol)}</span><div><strong>${title}</strong><p>${description}</p></div><button type="button" id="${id}" role="switch" aria-checked="${checked}" aria-label="${title}" class="switch ${checked ? "on" : ""}"><i></i></button></div>`;
}
function settingsContent() {
 return `<nav class="settings-jump" aria-label="${copy('Разделы настроек','Розділи налаштувань','Settings sections')}"><a href="#app-appearance">${copy('Оформление окон','Оформлення вікон','Window appearance')}</a><a href="#app-graphics">${copy('Графика','Графіка','Graphics')}</a><a href="#app-desktop">${copy('Приложение и система','Програма й система','App and system')}</a></nav><section class="life-card"><label>${t('Язык',state.language)}<select id="language"><option value="ru" ${state.language==='ru'?'selected':''}>Русский</option><option value="uk" ${state.language==='uk'?'selected':''}>Українська</option><option value="en" ${state.language==='en'?'selected':''}>English</option></select></label>${toggleRow('setting-top',t('Поверх окон',state.language),'',state.alwaysOnTop!==false,'arrow')}</section><div id="app-appearance">${appearancePanel(state)}</div><div id="app-graphics">${graphicsPanel()}</div><div id="app-desktop">${desktopSettings(state)}<section class="life-card"><h2>${copy('Подключения и погода','Підключення й погода','Connections and weather')}</h2><div class="system-buttons"><button id="device-audio">${icon('volume')}<span class="system-control-name">${copy('Звук устройства','Звук пристрою','Device audio')}</span><span id="device-audio-label">…</span></button><button id="bluetooth-settings">${icon('bluetooth')} Bluetooth <span id="bluetooth-label">…</span></button></div><div class="weather-settings"><form id="weather-form"><label for="weather-city">${copy('Город для прогноза','Місто для прогнозу','Weather city')}</label><div class="inline-controls"><input id="weather-city" maxlength="100" value="${escape(state.weatherCity||'')}"><button>${copy('Сохранить','Зберегти','Save')}</button></div></form><p id="weather-status" role="status"></p><p class="weather-attribution">Open-Meteo · GeoNames · CC BY 4.0</p></div></section></div><p class="version">Paw 0.7.1</p>`;
}
function render(reason = "preference") {
  const generation = ++renderGeneration;
  const oldMain = app.querySelector("main");
  const oldMainScroll = oldMain?.scrollTop || 0;
  const oldScroll = window.scrollY;
  const samePage = renderedPage === page;
  const changedCategory = samePage && page === "wardrobe" && renderedTab !== wardrobeTab;
  const focusedId = document.activeElement?.id;
  welcomeVoiceCleanup?.();
  welcomeVoiceCleanup = null;
  studioController?.dispose();
  studioController = null;
  adventureController?.dispose();
  adventureController = null;
  appearance(state);
  if (state.welcomeVersion !== "0.5") {
    petHost?.remove();
    if (!state.languageConfirmed) {
      app.innerHTML = languagePicker();
      app.querySelectorAll("[data-welcome-language]").forEach(button => {
        button.onclick = async () => {
          app.querySelectorAll("[data-welcome-language]").forEach(b => b.disabled = true);
          await change({ language: button.dataset.welcomeLanguage, languageConfirmed: true });
          app.querySelectorAll("[data-welcome-language]").forEach(b => b.disabled = false);
        };
      });
      return;
    }
    void change({ welcomeVersion: "0.5" });
    return;
  }

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
    house: copy("Домик", "Будиночок", "Home & habitat"),
    tools: word("Быстрые действия", state.language),
    games: word("Игры", state.language),
    studio: v("Съёмка", state.language),
  };
  app.innerHTML = `<div class="app-shell"><aside class="sidebar"><a class="brand" href="#" aria-label="Paw — домой"><span class="brand-mark">${icon("paw", 28)}</span>Paw</a><nav>${[
    ["home", "home", "Мой питомец"],
    ["wardrobe", "shirt", "Гардероб"],
    ["life", "heart", word("Характер", state.language)],
    ["house", "home", copy("Домик", "Будиночок", "Home & habitat")],
    ["games", "ball", word("Игры", state.language)],
    ["tools", "sliders", word("Быстрые действия", state.language)],
    ["studio", "app", v("Съёмка", state.language)],
    ["settings", "sliders", "Настройки"],
  ]
    .map(
      ([id, symbol, name]) =>
        `
${id==='home'?`<p class="nav-group-label">${copy("ПИТОМЕЦ","УЛЮБЛЕНЕЦЬ","YOUR PET")}</p>`:id==='games'?`<p class="nav-group-label">${copy("ЗАНЯТИЯ","ЗАНЯТТЯ","ACTIVITIES")}</p>`:id==='settings'?`<p class="nav-group-label">${copy("ПРИЛОЖЕНИЕ","ПРОГРАМА","APPLICATION")}</p>`:''}<button type="button" class="nav-item ${page === id ? "active" : ""}" data-page="${id}" ${page === id ? 'aria-current="page"' : ""}>${icon(symbol)}<span>${name}</span></button>`,
    )
    .join(
      "",
    )}</nav><div class="sidebar-bottom"><div class="tiny-paw">${icon("paw", 32)}</div><span class="sidebar-version">Paw · v0.7.1</span></div></aside><main><header class="page-header"><div class="header-copy"><p class="page-kicker">${copy("ТВОЙ МАЛЕНЬКИЙ МИР", "ТВІЙ МАЛЕНЬКИЙ СВІТ", "YOUR LITTLE WORLD")}</p><h1>${titles[page]}</h1></div><div class="header-actions"><button id="ui-mode" class="mode-toggle">${v(state.uiMode === "detailed" ? "Простое меню" : "Подробное меню", state.language)}</button><button type="button" id="show-pet" class="primary-button">${icon("paw", 18)} На рабочий стол ${icon("arrow", 16)}</button></div></header><div class="premium-content" data-section="${page}">${page === "home" ? homeContent() : page === "wardrobe" ? wardrobeContent() : page === "settings" ? settingsContent() : page === "games" ? adventureContent(state) : page === "studio" ? studioContent(state, petStage) : featureContent(page, state, petStage, pets)}</div><footer><span>Paw · 0.7.1</span><span>${copy("Маленький друг. Каждый день.", "Маленький друг. Щодня.", "A little friend. Every day.")}</span></footer></main></div>`;
  const host = document.querySelector("#pat-pet");
  if (host && retainedPet) {
    host.replaceWith(retainedPet);
    retainedPet.className = `hero-pet state-${state.activity}`;
    petScene.update({ ...state, studioQuality: false });
  } else if (host) {
    petHost = host;
    petScene = mountPet3D(host, state);
    petScene.setRotation?.((rotation * Math.PI) / 180);
  } else {
    if (page === "studio") studioController?.apply();
    else petScene?.update({ ...petDisplayState(), studioQuality: false });
  }
  bind();
  bindFeatures(app, { api, state: () => state, change, accept, toast, pets,
    previewBehavior(key,value) {
      behaviorDraft={[key]:value};
      const behavior={...state.behavior,[key]:value};
      const activity=resolveActivity(personalityActivity(key,behavior),state);
      petScene?.update({...state,behavior,activity,approachingHouse:false,approachingToy:false});
    }
  });
  bindV5Panels(app, { state: () => state, change });
  if (page === "studio")
    studioController = bindStudio(app, {
      scene: () => petScene,
      state: () => state,
      api,
      toast,
    });
  if (page === "games")
    adventureController = bindAdventure(app, {
      api,
      state: () => state,
      toast,
    });
  app.querySelector("#open-studio")?.addEventListener("click", () => {
    page = "studio";
    render();
  });
  bindDesktopSettings(app,{api,change,replay:()=>guide.replay(),notify:toast});
  localize(app, state.language);
  queueMicrotask(()=>guide.sync());
  const main = app.querySelector("main");
  if (main) main.scrollTop = samePage ? oldMainScroll : 0;
  if (samePage && focusedId && reason !== "category") document.getElementById(focusedId)?.focus({ preventScroll: true });
  if (!samePage) revealSection(app.querySelector(".premium-content"));
  else if (changedCategory) revealSection(app.querySelector(".outfit-options"), "category");
  renderedPage = page;
  renderedTab = wardrobeTab;
  requestAnimationFrame(() => {
    if (generation === renderGeneration) window.scrollTo({ top: samePage ? oldScroll : 0, behavior: "instant" });
  });
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
  app.querySelector('#enable-all-actions')?.addEventListener('click',()=>change({allowedActivities:[...ACTIONS]}));
  app.querySelectorAll('[data-only-action]').forEach(e=>e.onclick=()=>change({allowedActivities:[e.dataset.onlyAction]}));
  app.querySelectorAll('[data-allowed-action]').forEach(e=>e.onchange=()=>{
    const selected=[...app.querySelectorAll('[data-allowed-action]:checked')].map(e=>e.dataset.allowedAction);
    if(!selected.length){e.checked=true;return;}
    change({allowedActivities:selected});
  });
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
        render("category");
        document.getElementById("wardrobe-tab-" + wardrobeTab)?.focus({ preventScroll: true });
      }),
  );
  app.querySelector(".wardrobe-tabs")?.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const categories = Object.keys(wardrobe);
    const current = categories.indexOf(wardrobeTab);
    const next = event.key === "Home" ? 0 : event.key === "End" ? categories.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + categories.length) % categories.length;
    app.querySelector(`[data-tab="${categories[next]}"]`)?.click();
  });
  document.querySelectorAll(".outfit-option[data-outfit]").forEach(
    (button) =>
      (button.onclick = async () => {
        // Capture the category before awaiting a purchase: users may switch
        // tabs while the native save is in flight.
        const category = wardrobeTab;
        const item = wardrobe[category].items.find(
            (i) => i.id === button.dataset.outfit,
          ),
          key = category + ":" + item.id;
        if (pendingPurchases.has(key)) return;
        const request = (outfitRequests.get(category) || 0) + 1;
        outfitRequests.set(category, request);
        const isCurrent = () => outfitRequests.get(category) === request;
        pendingPurchases.add(key);
        button.disabled = true;
        button.classList.add("is-pending");
        button.setAttribute("aria-busy", "true");
        showWardrobeStatus("saving");
        try {
          if (item.price && !state.life?.gifts?.includes(key)) {
            const r = await api.life("buy", key);
            if (!r.ok) {
              toast(r.message);
              if (isCurrent()) showWardrobeStatus("error");
              return;
            }
            if (r.state) accept(r.state);
          }
          if (!isCurrent()) return;
          const saved = await change({ outfit: { [category]: item.id } }, { isCurrent });
          if (!isCurrent()) return;
          showWardrobeStatus(saved ? "saved" : "error");
          if (saved && page === "wardrobe" && wardrobeTab === category)
            confirmSelection(app.querySelector(`.outfit-option[data-outfit="${CSS.escape(item.id)}"]`));
        } catch {
          if (isCurrent()) showWardrobeStatus("error");
          toast("Не удалось сохранить настройки.");
        } finally {
          pendingPurchases.delete(key);
          if (button.isConnected) {
            button.disabled = false;
            button.classList.remove("is-pending");
            button.removeAttribute("aria-busy");
          }
        }
      }),
  );
  document.querySelector("#reset-outfit")?.addEventListener("click", async () => {
    for (const category of Object.keys(wardrobe)) outfitRequests.set(category, (outfitRequests.get(category) || 0) + 1);
    showWardrobeStatus("saving");
    const saved = await change({
      outfit: Object.fromEntries(
        Object.keys(wardrobe).map((key) => [key, "none"]),
      ),
    });
    showWardrobeStatus(saved ? "saved" : "error");
  });
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
  document.querySelector("#graphics-quality")?.addEventListener("change", async event => {
    const control = event.currentTarget;
    control.setAttribute("aria-busy", "true");
    try { await change({ graphicsQuality: control.value }); }
    finally { if (control.isConnected) control.removeAttribute("aria-busy"); }
  });
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
    if (["task","update"].includes(next.notice.kind)) toast(next.notice.text);
    else if (next.notice.kind === "timer")
      toast(word("Таймер", state.language) + " ⏰");
  }
});
setInterval(refreshDynamicUI, 500);
api.onNavigate?.((section) => {
  if (
    ![
      "home",
      "wardrobe",
      "settings",
      "life",
    "house",
      "games",
      "tools",
      "studio",
    ].includes(section)
  )
    return;
  page = section;
  render();
  if (section === "settings") document.querySelector("#weather-city")?.focus();
});
api.onFeedResult?.(resultError);
window.addEventListener("beforeunload", () => {
  clearTimeout(saveTimer);
  studioController?.dispose();
  adventureController?.dispose();
  petScene?.dispose();
});
render();
