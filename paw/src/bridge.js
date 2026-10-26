import * as lifeAPI from "./life-browser.js";
const initial = {
  behavior: lifeAPI.sanitizeBehavior(),
  companion: null,
  autostart: false,
  life: null,
  season: lifeAPI.season(new Date()),
  version: "0.4.0",
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
value.life = lifeAPI.snapshot(previewLife);
const listeners = new Set();
const emit = () => {
  for (const listener of listeners) listener(value);
};
export const api = window.paw || {
  life: async (command, arg) => {
    let result = { ok: true };
    if (command === "food") {
      lifeAPI.feedFood(previewLife, arg);
      value.activity = "eat";
    } else if (command === "gift") result = lifeAPI.dailyGift(previewLife, []);
    else if (command === "build") {
      if (previewLife.coins < 20)
        return { ok: false, message: "Нужно 20 монет." };
      previewLife.coins -= 20;
      previewLife.house = Math.min(100, previewLife.house + 25);
    } else if (command === "birthday") previewLife.birthday = arg;
    else return { ok: false, message: "Доступно в настольном Paw." };
    value.life = { ...value.life, ...lifeAPI.snapshot(previewLife) };
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
    temperature: null,
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
  getState: async () => value,
  update: async (patch) => {
    value = {
      ...value,
      ...patch,
      behavior: { ...value.behavior, ...patch.behavior },
      outfit: { ...value.outfit, ...patch.outfit },
    };
    localStorage.setItem("paw-preview", JSON.stringify(value));
    emit();
    return value;
  },
  action: async (activity) => {
    value = { ...value, activity };
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
