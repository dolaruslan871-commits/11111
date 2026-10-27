import {resolveActivity,personalityActivity} from './activity-policy.js';
import { buildHome } from "./home-model-browser.js";
import * as V5 from "./v5-model-browser.js";
import { createGameEngine } from "./game-engine-browser.js";
import * as lifeAPI from "./life-browser.js";
const initial = {
  behavior: lifeAPI.sanitizeBehavior(),
  companion: null,
  autostart: false,
  life: null,
  season: lifeAPI.season(new Date()),
  version: "0.7.1",
  graphicsQuality: "high",
  skin: "dog",
  muted: false,
  roaming: true,
  activity: "idle",
  direction: 1,
  scale: 1,
  feedMode: "eat",
  alwaysOnTop: true,
  language: "ru",
  theme: "light",
  menuOpen: false,
  shortcut: null,
  weatherCity: "",
  outfit: {
    hat: "none",
    glasses: "none",
    scarf: "none",
    toy: "none",
    clothing: "none",
    accessory: "none",
  },
  desktop: false,
};
let value = initial;
try {
  value = {
    ...initial,
    ...JSON.parse(localStorage.getItem("paw-preview") || "{}"),
    desktop: false,
  };
} catch {}
let previewLife = lifeAPI.createLife(value.life);
previewLife.inventory = V5.stock(value.life?.inventory);
previewLife.garden = value.life?.garden || [];
value = { ...value, ...V5.extraSettings(value) };
value.graphicsQuality = ["low", "medium", "high", "ultra"].includes(value.graphicsQuality)
  ? value.graphicsQuality
  : "high";
const adventureEngine = createGameEngine();
value.life = lifeAPI.snapshot(previewLife);
const listeners = new Set();
const emit = () => {
  for (const listener of listeners) listener(value);
};
export const api = window.paw || {
  saveStudio: async () => ({
    ok: false,
    message: "Сохранение на рабочий стол доступно в установленном Paw.",
  }),
  showExport: async () => ({ ok: false }),
  pickLauncher: async () => ({
    ok: false,
    message: "Выбор приложения доступен в установленном Paw.",
  }),
  launchShortcut: async () => ({ ok: false }),
  removeShortcut: async () => ({ ok: false }),
  openPlayer: async () => ({
    ok: false,
    message: "Открытие плеера доступно в установленном Paw.",
  }),
  browserSearch: async (query) => {
    window.open(
      "https://www.google.com/search?q=" + encodeURIComponent(query),
      "_blank",
      "noopener",
    );
    return { ok: true };
  },
  adventure: async (command, arg) => {
    const r =
      command === "start"
        ? adventureEngine.start(arg, previewLife)
        : adventureEngine.control(command, arg, previewLife);
    value.life = {
      ...value.life,
      ...lifeAPI.snapshot(previewLife),
      inventory: previewLife.inventory,
    };
    localStorage.setItem("paw-preview", JSON.stringify(value));
    emit();
    return { ...r, adventure: adventureEngine.view(previewLife) };
  },
  adventureState: async () => {
    adventureEngine.tick(previewLife);
    return adventureEngine.view(previewLife);
  },
  life: async (command, arg) => {
    let result = { ok: true };
    if (command === "food") {
      const r = V5.feedInventory(previewLife, value.skin, arg);
      if (!r.ok) return r;
      value.activity = "eat"; value.meal={food:arg,started:Date.now(),ends:Date.now()+6500};
    } else if (command === "gift") result = lifeAPI.dailyGift(previewLife, []);
    else if (command === "build") {
      previewLife.inventory = V5.stock(previewLife.inventory);
      const result = buildHome(previewLife, value.skin, value.language);
      if (!result.ok) return result;
      value.activity = "build";
    } else if (command === "birthday") previewLife.birthday = arg;
    else return { ok: false, message: "Доступно в настольном Paw." };
    value.life = {
      ...value.life,
      ...lifeAPI.snapshot(previewLife),
      inventory: previewLife.inventory,
    };
    localStorage.setItem("paw-preview", JSON.stringify(value));
    emit();
    return { ...result, state: value };
  },
  task: async (command, arg) => {
    const tasks = value.life.tasks || [];
    if (command === "add")
      tasks.push({
        id: crypto.randomUUID(),
        text: arg.text,
        due: arg.due,
        done: false,
      });
    else if (command === "toggle") {
      const x = tasks.find((t) => t.id === arg);
      if (x) x.done = !x.done;
    }
    value.life.tasks =
      command === "delete" ? tasks.filter((t) => t.id !== arg) : tasks;
    emit();
    return { ok: true };
  },
  timer: async (command, seconds) => {
    value.life.timer =
      command === "start" ? { ends: Date.now() + seconds * 1000 } : null;
    emit();
    return { ok: true };
  },
  game: async () => ({
    ok: false,
    message: "Мини-игры с сохранением наград доступны в настольном Paw.",
  }),
  metrics: async () => ({
    cpu: null,
    memoryUsed: null,
    memoryTotal: null,
    battery: { supported: false },
  }),
  media: async () => ({ ok: false, message: "Доступно в настольном Paw." }),
  search: async () => [],
  searchOpen: async () => ({ ok: false }),
  webSearch: async (query) => {
    window.open(
      "https://www.google.com/search?q=" + encodeURIComponent(query),
      "_blank",
      "noopener",
    );
    return { ok: true };
  },
  screenshot: async () => ({
    ok: false,
    message: "Скриншоты доступны в настольном Paw.",
  }),
  guide: async(command)=>{
    if(command==='replay')return api.update({guideStatus:null,guideStep:0});
    if(command==='skip')return api.update({guideStatus:'skipped'});
    if(command==='complete')return api.update({guideStatus:'completed',guideStep:4,guideReward:true,outfit:{accessory:'starter-star'},activity:'excited'});
  },
  desktop: async(command)=>{if(command==='dock')return api.update({docked:!value.docked});return {ok:false,message:value.language==='en'?'Available in the desktop app.':value.language==='uk'?'Доступно в настільній програмі.':'Доступно в настольном приложении.'};},
  getState: async () => value,
  update: async (patch) => {
    value = {
      ...value,
      ...patch,
      behavior: { ...value.behavior, ...patch.behavior },
      outfit: { ...value.outfit, ...patch.outfit },
    };
    value.graphicsQuality = ["low", "medium", "high", "ultra"].includes(value.graphicsQuality)
      ? value.graphicsQuality
      : "high";
    value={...value,...V5.extraSettings(value)};
    const key=Object.keys(patch.behavior||{}).find(k=>['active','lazy','curious','walkFrequency','attentionFrequency'].includes(k));
    value.activity=resolveActivity(key?personalityActivity(key,value.behavior):value.activity,value);
    localStorage.setItem("paw-preview", JSON.stringify(value));
    emit();
    return value;
  },
  action: async (activity) => {
    value = { ...value, activity: resolveActivity(activity,value) };
    emit();
    return value;
  },
  showPet: async () => false,
  feed: async () => ({
    ok: false,
    message: "Кормление файлами работает в настольном приложении Paw.",
  }),
  drop: async () => ({
    ok: false,
    message: "Для отправки файлов в корзину запусти настольное приложение Paw.",
  }),
  systemStatus: async () => ({
    audio: { supported: false, enabled: null },
    bluetooth: { supported: false, enabled: null },
  }),
  settings: async () => ({
    ok: false,
    message: "Системные настройки доступны в настольном приложении.",
  }),
  audio: async () => ({
    ok: false,
    message: "Звук устройства доступен в настольном приложении.",
  }),
  chooseApp: async () => ({
    ok: false,
    message: "Выбор приложения доступен в настольном приложении.",
  }),
  openApp: async () => ({
    ok: false,
    message: "Запуск приложения доступен в настольном приложении.",
  }),
  weather: async () => ({
    ok: false,
    unconfigured: true,
    needsCity: true,
    message: "Погода доступна в настольном приложении.",
  }),
  bluetooth: async () => ({
    ok: false,
    message:
      "Переключатель Bluetooth доступен в приложении для Windows и macOS.",
  }),
  menu: () => {
    value = { ...value, menuOpen: !value.menuOpen };
    emit();
  },
  closeMenu: () => {
    value = { ...value, menuOpen: false };
    emit();
  },
  dashboard: async () => false,
  hide: async () => false,
  quit: async () => false,
  onFeedResult: () => () => {},
  onState: (callback) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },
};
