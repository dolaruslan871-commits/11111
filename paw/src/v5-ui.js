export const escapeHTML = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const labels = [
  ["Продолжить", "Продовжити", "Continue"],
  ["Добро пожаловать в Paw", "Ласкаво просимо до Paw", "Welcome to Paw"],
  [
    "Твой маленький друг на рабочем столе",
    "Твій маленький друг на робочому столі",
    "Your little desktop companion",
  ],
  ["Знакомься и заботься", "Знайомся й піклуйся", "Meet and care"],
  [
    "Питомцы взрослеют, отдыхают и реагируют на тебя.",
    "Улюбленці дорослішають, відпочивають і реагують на тебе.",
    "Pets grow, rest and react to you.",
  ],
  ["Играй и собирай", "Грай і збирай", "Play and gather"],
  [
    "Лови рыбу, выращивай еду и добывай материалы для домика.",
    "Лови рибу, вирощуй їжу та збирай матеріали для будиночка.",
    "Catch fish, grow food and gather materials for a home.",
  ],
  ["Одевай и снимай", "Одягай і знімай", "Dress and capture"],
  [
    "Выбирай одежду, делай фото и видео до 12 секунд.",
    "Обирай одяг, роби фото й відео до 12 секунд.",
    "Choose outfits, take photos and record videos up to 12 seconds.",
  ],
  ["Помощь рядом", "Допомога поруч", "Tools close by"],
  [
    "Правая кнопка — таймер, заметки, музыка, поиск и приложения.",
    "Права кнопка — таймер, нотатки, музика, пошук і застосунки.",
    "Right-click for timers, notes, music, search and apps.",
  ],
  [
    "Ненужные файлы можно перетаскивать на питомца: он отправит их в системную корзину.",
    "Непотрібні файли можна перетягувати на улюбленця: він надішле їх до системного кошика.",
    "Drop unwanted files or folders onto your pet to move them to the system Trash.",
  ],
  ["Музыка", "Музика", "Music"],
  ["Открыть плеер", "Відкрити плеєр", "Open player"],
  ["Выбрать плеер", "Обрати плеєр", "Choose player"],
  ["Настроить", "Налаштувати", "Configure"],
  ["Поиск Google", "Пошук Google", "Google search"],
  ["Поиск", "Пошук", "Search"],
  ["Найти", "Знайти", "Search"],
  ["Выбрать браузер", "Обрати браузер", "Choose browser"],
  [
    "Ответы откроются в Google в выбранном браузере.",
    "Відповіді відкриються в Google в обраному браузері.",
    "Results open in Google in your selected browser.",
  ],
  ["Таймер", "Таймер", "Timer"],
  ["Минуты", "Хвилини", "Minutes"],
  ["Запустить", "Запустити", "Start"],
  ["Остановить", "Зупинити", "Stop"],
  ["Заметки", "Нотатки", "Notes"],
  ["Добавить", "Додати", "Add"],
  ["Задача", "Завдання", "Task"],
  ["Готово", "Готово", "Done"],
  ["Приложения", "Застосунки", "Applications"],
  ["Добавить приложение", "Додати застосунок", "Add application"],
  ["Снять все аксессуары", "Зняти всі аксесуари", "Remove all accessories"],
  ["Основное меню", "Головне меню", "Main menu"],
  [
    "Хася — имя домашнего питомца создателя приложения.",
    "Хася — ім’я домашнього улюбленця творця застосунку.",
    "Hasya is the name of the app creator’s pet.",
  ],
  ["Имя питомца", "Ім’я улюбленця", "Pet name"],
  ["Сохранить", "Зберегти", "Save"],
  ["Съёмка", "Знімання", "Studio"],
  ["Фото", "Фото", "Photo"],
  ["Видео", "Відео", "Video"],
  ["Длительность", "Тривалість", "Duration"],
  ["Ракурс", "Ракурс", "View angle"],
  ["Высота камеры", "Висота камери", "Camera elevation"],
  ["Действие", "Дія", "Action"],
  ["Сделать фото", "Зробити фото", "Take photo"],
  ["Записать видео", "Записати відео", "Record video"],
  ["Открыть папку", "Відкрити теку", "Show in folder"],
  [
    "Сохранено на рабочий стол",
    "Збережено на робочий стіл",
    "Saved to Desktop",
  ],
  ["Запись…", "Запис…", "Recording…"],
  ["Отмена", "Скасувати", "Cancel"],
  ["Простое меню", "Просте меню", "Simple menu"],
  ["Подробное меню", "Докладне меню", "Detailed menu"],
  ["Прозрачность окон", "Прозорість вікон", "Window opacity"],
  ["Прозрачность стекла", "Прозорість скла", "Glass opacity"],
  ["Эффект стекла", "Ефект скла", "Glass effect"],
  ["Показывать домик", "Показувати будиночок", "Show home"],
  ["Расстояние до игрушки", "Відстань до іграшки", "Toy distance"],
  [
    "Домик остаётся в углу экрана.",
    "Будиночок залишається в кутку екрана.",
    "The home stays in the corner of the screen.",
  ],
  ["Покормить", "Нагодувати", "Feed"],
  [
    "Еда закончилась. Добудь её в играх.",
    "Їжа закінчилася. Здобудь її в іграх.",
    "Out of food. Gather some in games.",
  ],
  ["Рыбалка", "Риболовля", "Fishing"],
  ["Огород", "Город", "Garden"],
  ["Луг", "Луг", "Meadow"],
  ["Лес", "Ліс", "Forest"],
  ["Каменоломня", "Каменоломня", "Quarry"],
  ["Семена", "Насіння", "Seeds"],
  ["Посадить", "Посадити", "Plant"],
  ["Полить", "Полити", "Water"],
  ["Собрать", "Зібрати", "Harvest"],
  ["Забросить", "Закинути", "Cast"],
  ["Подсечь", "Підсікти", "Hook"],
  ["Тянуть", "Тягнути", "Reel"],
  ["Отпустить", "Відпустити", "Release"],
  ["Наживка", "Наживка", "Bait"],
  ["Натяжение лески", "Натяг волосіні", "Line tension"],
  ["Рыба ушла", "Риба втекла", "Fish escaped"],
  ["Улов", "Улов", "Catch"],
  ["Ждём поклёвку", "Чекаємо на клювання", "Waiting for a bite"],
  ["Клюёт!", "Клює!", "Bite!"],
  ["Удар", "Удар", "Strike"],
  [
    "Собирай в золотой зоне",
    "Збирай у золотій зоні",
    "Strike in the golden zone",
  ],
  ["Выйти из игры", "Вийти з гри", "Leave game"],
  ["Купить", "Купити", "Buy"],
  ["Материалы", "Матеріали", "Materials"],
  ["Дерево", "Дерево", "Wood"],
  ["Камень", "Камінь", "Stone"],
  ["Корм", "Корм", "Kibble"],
  ["Рыба", "Риба", "Fish"],
  ["Мясо", "М’ясо", "Meat"],
  ["Морковь", "Морква", "Carrot"],
  ["Капуста", "Капуста", "Cabbage"],
  ["Ягоды", "Ягоди", "Berries"],
  ["Зерно", "Зерно", "Grain"],
  ["Червячки", "Хробачки", "Worms"],
  [
    "Домик: 20 монет + 10 дерева + 5 камня",
    "Будиночок: 20 монет + 10 дерева + 5 каменю",
    "Home: 20 coins + 10 wood + 5 stone",
  ],
];
labels.push(
  ["Системный браузер", "Системний браузер", "Default browser"],
  ["Собачка", "Собачка", "Dog"],
  ["Котик", "Котик", "Cat"],
  ["Крокодильчик", "Крокодильчик", "Crocodile"],
  ["Кенгуру", "Кенгуру", "Kangaroo"],
  ["Динозаврик", "Динозаврик", "Dinosaur"],
  ["Сова", "Сова", "Owl"],
  ["Зайчик", "Зайчик", "Rabbit"],
  ["Лисёнок", "Лисеня", "Fox"],
);
const map = new Map(labels.map(([ru, uk, en]) => [ru, { ru, uk, en }]));
export const v = (text, lang = "ru") => map.get(text)?.[lang] || text;
export function appearance(state) {
  const root = document.documentElement;
  root.dataset.theme = state.theme || "light";
  root.dataset.glass = String(state.glass !== false);
  root.dataset.mode = state.uiMode || "simple";
  root.lang = state.language || "ru";
  root.style.setProperty("--glass-opacity", String(state.glassOpacity ?? 0.9));
}
export const petName = (state, skin, fallback) =>
  skin === "husky"
    ? state.language === "en"
      ? "Hasya"
      : "Хася"
    : state.names?.[skin] || v(fallback, state.language);
export function welcome(state, pets, renderPet) {
  const w = (t) => escapeHTML(v(t, state.language));
  return `<section class="welcome"><div class="welcome-logo">Paw <span>0.6.3</span></div><h1>${w("Добро пожаловать в Paw")}</h1><p class="welcome-subtitle">${w("Твой маленький друг на рабочем столе")}</p><div class="welcome-parade">${pets.map((p, i) => `<div style="--i:${i}">${renderPet(p.id, "idle", {})}<span>${escapeHTML(petName(state, p.id, p.name))}</span></div>`).join("")}</div><div class="welcome-guide">${[
    [
      "♡",
      "Знакомься и заботься",
      "Питомцы взрослеют, отдыхают и реагируют на тебя.",
    ],
    [
      "✿",
      "Играй и собирай",
      "Лови рыбу, выращивай еду и добывай материалы для домика.",
    ],
    [
      "◉",
      "Одевай и снимай",
      "Выбирай одежду, делай фото и видео до 12 секунд.",
    ],
    [
      "☷",
      "Помощь рядом",
      "Правая кнопка — таймер, заметки, музыка, поиск и приложения.",
    ],
  ]
    .map(
      ([icon, title, text]) =>
        `<article><b>${icon}</b><h2>${w(title)}</h2><p>${w(text)}</p></article>`,
    )
    .join(
      "",
    )}</div><p class="welcome-trash">${w("Ненужные файлы можно перетаскивать на питомца: он отправит их в системную корзину.")}</p><button id="welcome-continue" class="primary-button">${w("Продолжить")} →</button></section>`;
}

export function creatorNote(language = "ru") {
  const copy = {
    ru: ["Создатель — Руслан Доля", "Пусть твой маленький друг всегда будет рядом и дарит немного тепла каждый день."],
    uk: ["Творець — Руслан Доля", "Нехай твій маленький друг завжди буде поруч і дарує трохи тепла щодня."],
    en: ["Created by Руслан Доля", "May your little friend always be close by and bring a little warmth to every day."],
  }[language] || ["Created by Руслан Доля", "May your little friend always be close by and bring a little warmth to every day."];
  return `<section class="creator-note" aria-label="${escapeHTML(copy[0])}"><span class="creator-heart" aria-hidden="true">♡</span><div><h2>${escapeHTML(copy[0])}</h2><p>${escapeHTML(copy[1])}</p></div></section>`;
}
