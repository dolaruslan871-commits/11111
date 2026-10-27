// Source strings stay readable in Russian; UI can switch without a restart.
const pairs = [
['Мой питомец','Мій улюбленець','My pet'],['Гардероб','Гардероб','Wardrobe'],['Настройки','Налаштування','Settings'],
['ВАШ ОБЩИЙ МИР','ВАШ СПІЛЬНИЙ СВІТ','YOUR LITTLE WORLD'],['МАЛЕНЬКИЙ ДРУГ. БОЛЬШЕ УЮТА.','МАЛЕНЬКИЙ ДРУГ. БІЛЬШЕ ЗАТИШКУ.','A LITTLE FRIEND. A LITTLE MORE JOY.'],
['Твой маленький компаньон','Твій маленький компаньйон','Your little companion'],['Хороший день начинается с «гав».','Гарний день починається з «гав».','A good day starts with a woof.'],['На рабочий стол','На робочий стіл','To my desktop'],
['Чуть больше тепла','Трохи більше тепла','A little more warmth'],['на твоём рабочем столе.','на твоєму робочому столі.','on your desktop.'],['Paw для тебя','Paw для тебе','Paw, for you'],
['Всё хорошо','Усе добре','Feeling good'],['Тихий час','Тиха година','Nap time'],['Маленькие радости каждый день','Маленькі радощі щодня','Little joys, every day'],['Нажми, чтобы погладить','Натисни, щоб погладити','Click for a little love'],
['Погладить','Погладити','Pet'],['Поиграть','Погратися','Play'],['Покормить','Погодувати','Feed'],['МАЛЕНЬКАЯ ЖИЗНЬ','МАЛЕНЬКЕ ЖИТТЯ','A LITTLE LIFE'],['свои планы','свої плани','has little plans'],
['Он рядом, даже когда','Він поруч, навіть коли','By your side, even when'],['ты занят своими делами.','ти зайнятий своїми справами.','you are doing your thing.'],['Погулять','Погуляти','Go for a walk'],['Изучить каждый уголок','Дослідити кожен куточок','Explore every little corner'],
['Поймать хорошее настроение','Спіймати гарний настрій','Catch a happy moment'],['Вздремнуть','Подрімати','Take a nap'],['Набраться сил для шалостей','Набратися сил для пустощів','Recharge for more mischief'],['Забота в простых вещах','Турбота в простих речах','Love in the little things'],
['Кто будет рядом?','Хто буде поруч?','Who is coming along?'],['Три характера. Один друг.','Три характери. Один друг.','Three characters. One little friend.'],['Верный хвостик','Вірний хвостик','A loyal little tail'],['Мягкие лапки','М’які лапки','Soft little paws'],['Зубастое обаяние','Зубастий шарм','A toothy little charmer'],
['Бадди','Бадді','Buddy'],['Моти','Моті','Mochi'],['Киви','Ківі','Kiwi'],['У Бадди','У Бадді','Buddy'],['У Моти','У Моті','Mochi'],['У Киви','У Ківі','Kiwi'],
['Маленький, но с характером','Маленький, але з характером','Little paws. Big feelings.'],['Нажми — и смотри','Натисни — і дивись','Tap and watch'],['Радость','Радість','Joy'],['Грусть','Сум','Sadness'],['Лапки на экран','Лапки на екран','Paws on the screen'],['Привет','Привіт','Wave'],['Потянуться','Потягнутися','Stretch'],['Охота','Полювання','Hunt'],
['Ненужным файлам — вкусное применение','Непотрібним файлам — смачне застосування','A tasty new use for unwanted files'],['Перетащи файл на питомца: он съест его и отправит в корзину без лишних вопросов.','Перетягни файл на улюбленця: він з’їсть його та відправить у кошик без зайвих запитань.','Drop a file on your pet: a little snack, straight to the system Trash.'],
['Маленькие детали. Большая индивидуальность.','Маленькі деталі. Велика індивідуальність.','Little details. Lots of personality.'],['Все вещи можно сочетать. Образ сохраняется автоматически.','Усі речі можна поєднувати. Образ зберігається автоматично.','Mix and match. Your look is saved automatically.'],
['С МАЛЕНЬКИМ ХАРАКТЕРОМ','З МАЛЕНЬКИМ ХАРАКТЕРОМ','A LITTLE PERSONALITY'],['Ему идёт быть собой','Йому личить бути собою','Made to be themselves'],['Больше 50 вещей. Собери свой любимый образ.','Понад 50 речей. Створи свій улюблений образ.','Over 50 pieces. Find your favourite look.'],
['Шапочки','Шапочки','Hats'],['Очки','Окуляри','Glasses'],['Шарфики','Шарфики','Scarves'],['Игрушки','Іграшки','Toys'],['Одежда','Одяг','Clothes'],['Аксессуары','Аксесуари','Accessories'],['Снять все аксессуары','Зняти всі аксесуари','Take everything off'],
['Косточка и мячик останутся с другом','Кісточка та м’ячик залишаться з другом','A bone or a ball stays with your friend'],['даже во время прогулки.','навіть під час прогулянки.','even on a little walk.'],
['Как дома','Як удома','Make yourself at home'],['Всё, что нужно для вашей дружбы.','Усе, що потрібно для вашої дружби.','Everything for your little friendship.'],['В своём ритме','У своєму ритмі','At your own pace'],['Пусть другу будет уютно на твоём экране.','Нехай другові буде затишно на твоєму екрані.','Make a cosy little home on your screen.'],
['Звуки питомца','Звуки улюбленця','Pet sounds'],['Тихие мультяшные голоса во время общения','Тихі мультяшні голоси під час спілкування','Gentle cartoon voices when you interact'],['Прогулки по экрану','Прогулянки екраном','Desktop walks'],['Питомец сам гуляет, играет и отдыхает','Улюбленець сам гуляє, грається та відпочиває','Your pet walks, plays and rests on its own'],
['Поверх окон','Поверх вікон','Always on top'],['Питомец остаётся видимым поверх других приложений','Улюбленця видно поверх інших програм','Keep your pet above other applications'],['Обычное окно','Звичайне вікно','Normal window'],
['Размер питомца','Розмір улюбленця','Pet size'],['От крошечного хвостика до большого друга','Від крихітного хвостика до великого друга','From a tiny tail to a bigger buddy'],['Кормление файлами','Годування файлами','File snacks'],['Сразу в системную корзину, без подтверждения.','Одразу в системний кошик, без підтвердження.','Straight to the system Trash, without confirmation.'],['Папки и ссылки питомец не ест.','Папки та посилання улюбленець не їсть.','Folders and symlinks are not snacks.'],['Включено','Увімкнено','Enabled'],
['Как отправлять файлы в корзину?','Як відправляти файли в кошик?','How should files go to the Trash?'],['🍪 Съесть','🍪 З’їсти','🍪 Eat them'],['📄 Отнести в зубах','📄 Віднести в зубах','📄 Carry them'],['Анимация — потом системная корзина. Без подтверждения.','Анімація — потім системний кошик. Без підтвердження.','A little animation, then the system Trash. No confirmation.'],
['Под лапой','Під лапкою','At your paw tips'],['Быстрый доступ — ещё и по правой кнопке на питомце.','Швидкий доступ — ще й правою кнопкою на улюбленці.','Quick controls, also a right-click away.'],['Переключение Wi-Fi зависит от разрешений macOS и Windows. Bluetooth: переключение в Windows, системные настройки на Mac.','Перемикання Wi-Fi залежить від дозволів macOS та Windows. Bluetooth: перемикач у Windows, налаштування системи на Mac.','Wi-Fi depends on system permissions. Bluetooth: toggle on Windows, system settings on Mac.'],
['Всегда рядом.','Завжди поруч.','Always close.'],['Без лишней суеты.','Без зайвого клопоту.','Without the fuss.'],['Перетаскивай друга мышкой, гладь нажатием и открывай его меню правой кнопкой.','Перетягуй друга мишкою, гладь натисканням і відкривай його меню правою кнопкою.','Drag your friend, click to pet, and right-click for the glass menu.'],['PAW · ПЕРВЫЕ ШАГИ','PAW · ПЕРШІ КРОКИ','PAW · LITTLE BEGINNINGS'],['Версия 0.2.0 · 3D','Версія 0.2.0 · 3D','Version 0.2.0 · 3D'],
['Твой друг уже рядом','Твій друг уже поруч','Your friend is right here'],['Знакомство с Paw · веб-превью','Знайомство з Paw · вебперегляд','Meet Paw · web preview'],['Сделано для маленькой дружбы','Створено для маленької дружби','Made for a little friendship'],
['Язык','Мова','Language'],['Тема','Тема','Theme'],['Светлая','Світла','Light'],['Тёмная','Темна','Dark'],['Облик домика и стеклянного меню','Вигляд домівки та скляного меню','The look of your home and glass menu'],
['Рад тебя видеть','Радий тебе бачити','Happy to see you'],['Исследует рабочий стол','Досліджує робочий стіл','Exploring the desktop'],['Сладко спит','Солодко спить','Sweet dreams'],['Хрум-хрум…','Хрум-хрум…','Munch, munch…'],['Время поиграть!','Час погратися!','Time to play!'],['На маленькой охоте','На маленькому полюванні','On a tiny adventure'],['Ещё за ушком, пожалуйста','Ще за вушком, будь ласка','A little more behind the ears, please'],['Лапками к твоему экрану','Лапками до твого екрана','Little paws on your screen'],['Привет, человек!','Привіт, людино!','Hello, human!'],['Потягу-у-ушки','Потягу-у-усі','Big little stretch'],['Побудь со мной','Побудь зі мною','Stay with me'],['Как же я рад!','Як же я радий!','So happy!'],['Несу в корзину','Несу в кошик','Taking it to the Trash'],['Отнесу в корзину!','Віднесу в кошик!','I will carry it to the Trash!'],['Ням-ням…','Ням-ням…','Nom, nom…'],
['Спать','Спати','Sleep'],['Разбудить','Розбудити','Wake up'],['Лапки','Лапки','Paws up'],['Звук вкл.','Звук увімк.','Sound on'],['Звук выкл.','Звук вимк.','Sound off'],['Играть','Грати','Play'],['Ещё','Ще','More'],['Закрыть меню','Закрити меню','Close menu'],['Спрятать','Сховати','Hide'],['Выйти из Paw','Вийти з Paw','Quit Paw'],
['Настройки','Налаштування','Settings'],['Включён','Увімкнений','On'],['Выключен','Вимкнений','Off'],['Выключить звук','Вимкнути звук','Mute'],['Включить звук','Увімкнути звук','Unmute'],['Погладить питомца','Погладити улюбленця','Pet your friend'],['Твой питомец','Твій улюбленець','Your pet'],['Виды аксессуаров','Види аксесуарів','Accessory categories'],
['Ням! Файлы теперь в корзине.','Ням! Файли тепер у кошику.','Yum! Your files are in the Trash.'],['Готово! Файлы отнесены в корзину.','Готово! Файли віднесено в кошик.','Done! Your files are in the Trash.'],
['Друг уже на рабочем столе. Правая кнопка — его меню.','Друг уже на робочому столі. Права кнопка — його меню.','Your friend is on the desktop. Right-click for the menu.'],['Чтобы выпустить друга на рабочий стол, запусти приложение Paw.','Щоб випустити друга на робочий стіл, запусти програму Paw.','Launch the Paw desktop app to let your friend out.'],['Кормление файлами работает в настольном Paw.','Годування файлами працює в настільному Paw.','File snacks work in the Paw desktop app.']
];

const updatePairs = [
["Построить","Побудувати","Build"],["Улучшить","Поліпшити","Upgrade"],
['Быстрые действия','Швидкі дії','Quick controls'],['Указать город','Вказати місто','Choose a city'],['Недоступна','Недоступна','Unavailable'],['Добавить приложение','Додати застосунок','Add an app'],
['Кенгуру','Кенгуру','Kangaroo'],['Динозаврик','Динозаврик','Dinosaur'],['Сова','Сова','Owl'],['Заяц','Заєць','Rabbit'],
['Выбери своего друга','Обери свого друга','Choose your companion'],['Общение без слов','Спілкування без слів','A friend without words'],
['Двойной щелчок — погладить','Подвійне клацання — погладити','Double-click to pet'],['Частые нажатия на лапку — сердится','Часті натискання на лапку — сердиться','Repeated paw taps make your pet grumpy'],
['Нажатие на хвост — ловит хвост','Натискання на хвіст — ловить хвіст','Tap the tail for a tail chase'],['Потяни мышкой — повернуть','Потягни мишкою — повернути','Drag to rotate'],
['Поворот','Поворот','Rotation'],['Поворот питомца','Поворот улюбленця','Rotate your pet'],['Повернуть влево','Повернути ліворуч','Rotate left'],['Повернуть вправо','Повернути праворуч','Rotate right'],
['Файл или папка','Файл або папка','File or folder'],['Файлы и папки','Файли та папки','Files and folders'],
['Перетащи ненужный файл или папку на питомца: он отправит их в системную корзину.','Перетягни непотрібний файл або папку на улюбленця: він відправить їх у системний кошик.','Drop an unwanted file or folder on your pet to move it to the system Trash.'],
['Файлы и папки перемещаются в системную корзину. Их можно восстановить.','Файли та папки переміщуються в системний кошик. Їх можна відновити.','Files and folders go to the system Trash, where you can restore them.'],
['Эмоции и движения','Емоції та рухи','Expressions and movement'],['Сердится','Сердиться','Grumpy'],['Поймать хвост','Спіймати хвіст','Chase the tail'],
['Игрушки рядом с питомцем. Нажми «Поиграть», чтобы начать игру.','Іграшки поруч з улюбленцем. Натисни «Погратися», щоб почати гру.','Toys stay beside your pet. Choose Play to start playing.'],
['Настройки питомца','Налаштування улюбленця','Pet settings'],['Голоса животных во время общения','Голоси тварин під час спілкування','Animal voices when you interact'],
['Съесть','З’їсти','Eat'],['Отнести в корзину','Віднести в кошик','Carry to Trash'],['Устройство','Пристрій','Device'],['Звук устройства','Звук пристрою','Device audio'],
['Проверка…','Перевірка…','Checking…'],['Если прямое переключение недоступно, откроются системные настройки.','Якщо пряме перемикання недоступне, відкриються системні налаштування.','System settings open when direct control is unavailable.'],
['Погода','Погода','Weather'],['Город','Місто','City'],['Сохранить','Зберегти','Save'],['Укажи город для прогноза.','Вкажи місто для прогнозу.','Enter a city to see the weather.'],
['Загрузка…','Завантаження…','Loading…'],['Погода временно недоступна.','Погода тимчасово недоступна.','Weather is temporarily unavailable.'],
['Приложение по клику','Застосунок за клацанням','App shortcut'],['Приложение не выбрано','Застосунок не вибрано','No app selected'],['Выбрать приложение','Вибрати застосунок','Choose an app'],['Открыть','Відкрити','Open'],['Убрать','Прибрати','Remove'],
['Правая кнопка на питомце — звук устройства, Bluetooth, погода и приложение.','Права кнопка на улюбленці — звук пристрою, Bluetooth, погода та застосунок.','Right-click your pet for device audio, Bluetooth, weather and your app.'],
['Версия 0.3.0 · 3D','Версія 0.3.0 · 3D','Version 0.3.0 · 3D'],['Paw — домой','Paw — додому','Paw — home'],
['Не удалось сохранить настройки.','Не вдалося зберегти налаштування.','Settings could not be saved.'],['Не удалось выполнить действие.','Не вдалося виконати дію.','The action could not be completed.']
];
const dictionary=new Map([...pairs,...updatePairs].map(([ru,uk,en])=>[ru,{ru,uk,en}]));
export function t(text,language='ru'){if(!text||language==='ru')return text;const entry=dictionary.get(text);return entry?.[language]||text;}
// Keep original sources, so a live subtree can switch in either direction.
// Snapshot text nodes before editing; never replace nodes while walking the tree.
const textSources = new WeakMap(), attributeSources = new WeakMap();
export function localize(root, language = 'ru') {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [];
  let node;
  while ((node = walker.nextNode())) {
    if (!['SCRIPT', 'STYLE'].includes(node.parentElement?.tagName)) nodes.push(node);
  }
  for (const text of nodes) {
    const remembered = textSources.get(text);
    const source = remembered && text.data === remembered.last ? remembered.source : text.data;
    const trimmed = source.trim();
    const translated = trimmed ? source.replace(trimmed, t(trimmed, language)) : source;
    if (text.data !== translated) text.data = translated;
    textSources.set(text, { source, last: translated });
  }
  for (const element of root.querySelectorAll('[aria-label],[title],[placeholder]')) {
    const remembered = attributeSources.get(element) || new Map();
    for (const attribute of ['aria-label', 'title', 'placeholder']) {
      if (!element.hasAttribute(attribute)) continue;
      const current = element.getAttribute(attribute), previous = remembered.get(attribute);
      const source = previous && current === previous.last ? previous.source : current;
      const translated = t(source, language);
      if (current !== translated) element.setAttribute(attribute, translated);
      remembered.set(attribute, { source, last: translated });
    }
    attributeSources.set(element, remembered);
  }
}
export function registerNames(entries){for(const entry of entries)if(entry.name&&entry.names)dictionary.set(entry.name,{ru:entry.name,...entry.names});}
