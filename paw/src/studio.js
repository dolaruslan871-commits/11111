import {ACTIONS} from './activity-policy.js';
import { exportVideo } from "./video-export.js";
import { v, escapeHTML as esc } from "./v5-ui.js";
export const studioActions = [
  "idle",
  "sit",
  "groom",
  "yawn",
  "curl",
  "wake",
  "grateful",
  "pet",
  "play",
  "walk",
  "dance",
  "sniff",
  "scratch",
  "shake",
  "roll",
  "chirp",
  "skate",
  "scooter",
  "jetpack",
  "excited",
  "sad",
  "angry",
  "chase-tail",
  "hunt",
  "stretch",
  "wave",
];
const titles = {
  sleep:["Лежать и спать","Лежати й спати","Lie down & sleep"],
  "ear-scratch":["Чесать ушко","Чухати вушко","Scratch ear"],
  "nose-boop":["Фыркнуть","Пирхнути","Snort"],
  float:["Невесомость","Невагомість","Float"],
  draw:["Рисовать","Малювати","Draw"], fish:["Рыбачить","Рибалити","Fish"], butterflies:["Бабочки","Метелики","Butterflies"], ball:["Мячик","М’ячик","Ball"],
  detective:["Исследовать","Досліджувати","Explore"],gift:["Подарок","Подарунок","Gift"],build:["Строить","Будувати","Build"],home:["Отдых дома","Відпочинок удома","Rest at home"],umbrella:["Зонтик","Парасолька","Umbrella"],fan:["Веер","Віяло","Fan"],read:["Читать","Читати","Read"],gamepad:["Играть на приставке","Грати на приставці","Gamepad"],cake:["Праздновать","Святкувати","Celebrate"],attention:["Просить внимания","Просити уваги","Seek attention"],drink:["Пить","Пити","Drink"],break:["Отдыхать","Відпочивати","Take a break"],eat:["Кушать","Їсти","Eat"],carry:["Нести","Нести","Carry"],
  excited: ["Восторг", "Захват", "Excited"],
  sad: ["Грусть", "Сум", "Sad"],
  angry: ["Сердиться", "Сердитися", "Angry"],
  "chase-tail": ["Ловить хвост", "Ловити хвіст", "Chase tail"],
  hunt: ["Охотиться", "Полювати", "Hunt"],
  stretch: ["Потянуться", "Потягнутися", "Stretch"],
  wave: ["Приветствие", "Вітання", "Wave"],
  idle: ["Спокойно", "Спокійно", "Idle"],
  sit: ["Сидеть", "Сидіти", "Sit"],
  groom: ["Умываться", "Умиватися", "Groom"],
  yawn: ["Зевать", "Позіхати", "Yawn"],
  curl: ["Спать клубочком", "Спати клубочком", "Curled sleep"],
  wake: ["Потянуться", "Потягнутися", "Wake"],
  grateful: ["Благодарность", "Вдячність", "Thanks"],
  pet: ["Радоваться", "Радіти", "Love"],
  play: ["Играть", "Грати", "Play"],
  walk: ["Передвигаться", "Пересуватися", "Move"],
  dance: ["Танцевать", "Танцювати", "Dance"],
  sniff: ["Нюхать", "Нюхати", "Sniff"],
  scratch: ["Точить когти", "Точити кігті", "Scratch"],
  shake: ["Отряхнуться", "Обтруситися", "Shake"],
  roll: ["Перекат", "Перекат", "Roll"],
  chirp: ["Петь", "Співати", "Chirp"],
  skate: ["Скейт", "Скейт", "Skate"],
  scooter: ["Самокат", "Самокат", "Scooter"],
  jetpack: ["Джетпак", "Джетпак", "Jetpack"],
};
export const actionLabel = (id, lang) =>
  titles[id]?.[lang === "en" ? 2 : lang === "uk" ? 1 : 0] || id;
export function studioContent(state, petStage) {
  const w = (s) => esc(v(s, state.language));
  return `<div class="studio-layout"><section class="studio-preview">${petStage()}<div id="recording-status" role="status"></div></section><section class="life-card studio-controls"><h2>${w("Съёмка")}</h2><label>${w("Действие")}<select id="studio-action">${studioActions.map((id) => `<option value="${id}">${esc(actionLabel(id, state.language))}</option>`).join("")}</select></label><label>${w("Высота камеры")}<input id="studio-elevation" type="range" min="0.05" max="1.2" step="0.01" value="0.35"></label><label>Zoom<input id="studio-zoom" type="range" min="0.7" max="1.4" step="0.01" value="1"></label><label>${state.language === "en" ? "Format" : "Формат"}<select id="studio-format"><option value="wide">16:9 · Desktop</option><option value="square">1:1 · Instagram</option><option value="portrait">4:5 · Instagram</option><option value="story">9:16 · Story</option></select></label><label>${state.language === "en" ? "Background" : "Фон"}<select id="studio-background"><option value="#eae6f0">Lavender</option><option value="#d8e8ef">Sky</option><option value="#f3dfcc">Peach</option><option value="#17171d">Graphite</option><option value="transparent">PNG · Transparent</option></select></label><label>${w("Длительность")} · 1–12 s<input type="number" id="studio-seconds" min="1" max="12" value="6"></label><button id="studio-photo">◉ ${w("Сделать фото")} · 4K</button><button id="studio-video">● ${w("Записать видео")} · 1080p</button><button id="studio-cancel" hidden>${w("Отмена")}</button><p id="studio-result" role="status"></p><button id="studio-folder" hidden>${w("Открыть папку")}</button></section></div>`;
}
export function bindStudio(root, { scene, state, api, toast }) {
  let disposed = false,
    recording = null,
    timeout = null,
    countdown = null,
    lastFile = null,
    action = "idle",
    exporting = false,
    abortExport = false,
    photoQuality = false,
    captureState = null;
  const q = (s) => root.querySelector(s),
    w = (t) => v(t, state().language);
  const host = q("#pat-pet"),
    originalStyle = host?.getAttribute("style");
  function fitPreview() {
    const ratio = { wide: 16 / 9, square: 1, portrait: 4 / 5, story: 9 / 16 }[
      q("#studio-format").value
    ];
    const width = Math.min(q(".pet-stage").clientWidth - 34, 365 * ratio);
    host.style.width = width + "px";
    host.style.height = width / ratio + "px";
    host.style.maxWidth = "none";
  }
  q("#studio-format").onchange = fitPreview;
  fitPreview();
  function apply() {
    scene()?.update({
      ...(exporting && captureState ? captureState : state()),
      approachingHouse: false,
      approachingToy: false,
      activity: action,
      companion: null,
      life: { ...state().life, houseLevel: 0 },
      desktopPet: false,
      studioQuality: photoQuality,
      behavior: { ...state().behavior, seasons: false },
    });
  }
  q("#studio-action").onchange = (e) => {
    action = e.target.value;
    apply();
  };
  for (const id of ["studio-elevation", "studio-zoom"])
    q("#" + id).oninput = () =>
      scene()?.setCamera({
        elevation: Number(q("#studio-elevation").value),
        zoom: Number(q("#studio-zoom").value),
      });
  q("#studio-background").onchange = () =>
    scene()?.setBackground(q("#studio-background").value);
  function lock(busy) {
    root.classList.toggle("studio-busy", busy);
    root.querySelectorAll("button,input,select").forEach((e) => {
      if (e.id !== "studio-cancel") e.disabled = busy;
    });
    q("#studio-cancel").hidden = !busy;
  }
  async function save(blob, kind) {
    if (!blob) throw new Error("Не удалось создать файл.");
    const result = await api.saveStudio(
      new Uint8Array(await blob.arrayBuffer()),
      kind,
    );
    if (!result.ok) throw new Error(result.message);
    lastFile = result.path;
    q("#studio-result").textContent =
      w("Сохранено на рабочий стол") + ": " + result.name;
    q("#studio-folder").hidden = false;
  }
  q("#studio-photo").onclick = async () => {
    lock(true);
    try {
      photoQuality = true;
      apply();
      const sizes = {
          wide: [3840, 2160],
          square: [3072, 3072],
          portrait: [2160, 2700],
          story: [2160, 3840],
        },
        size = sizes[q("#studio-format").value];
      await save(
        await scene().snapshot(...size, q("#studio-background").value),
        "png",
      );
    } catch (e) {
      toast(e.message);
    } finally {
      photoQuality = false;
      if (!disposed) {
        apply();
        lock(false);
      }
    }
  };
  q("#studio-video").onclick = async () => {
    const seconds = Math.max(
      1,
      Math.min(12, Number(q("#studio-seconds").value) || 6),
    );
    const type = [
      "video/mp4;codecs=avc1.42001E",
      "video/mp4",
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
    ].find((t) => globalThis.MediaRecorder?.isTypeSupported(t));
    if (!type) {
      toast("Запись видео не поддерживается этим устройством.");
      return;
    }
    lock(true);
    captureState = { ...state() };
    exporting = true;
    abortExport = false;
    q("#studio-cancel").onclick = () => {
      abortExport = true;
    };
    try {
      apply();
      const exportSizes = {
        wide: [1920, 1080],
        square: [1080, 1080],
        portrait: [1080, 1350],
        story: [1080, 1920],
      };
      const [width, height] = exportSizes[q("#studio-format").value];
      const video = await exportVideo(scene(), {
        seconds,
        width,
        height,
        background: q("#studio-background").value,
        cancelled: () => disposed || abortExport,
        onProgress: (p) => {
          if (!disposed)
            q("#recording-status").textContent =
              (state().language === "en"
                ? "Rendering video"
                : state().language === "uk"
                  ? "Створення відео"
                  : "Создание видео") +
              " · " +
              Math.round(p * 100) +
              "%";
        },
      });
      if (video) {
        if (!video.cancelled && !disposed) await save(video.blob, video.kind);
        if (!disposed) {
          q("#recording-status").textContent = "";
          lock(false);
        }
        exporting = false;
        return;
      }
      const bg = q("#studio-background").value;
      scene().setBackground(bg === "transparent" ? "#eae6f0" : bg);
      const sizes = {
        wide: [1920, 1080],
        square: [1080, 1080],
        portrait: [1080, 1350],
        story: [1080, 1920],
      };
      scene().setCaptureSize(...sizes[q("#studio-format").value]);
      const stream = scene().canvas.captureStream(30),
        chunks = [];
      recording = new MediaRecorder(stream, {
        mimeType: type,
        videoBitsPerSecond: 12000000,
      });
      let cancelled = false;
      recording.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      const started = performance.now();
      q("#studio-cancel").onclick = () => {
        cancelled = true;
        if (recording?.state === "recording") recording.stop();
      };
      recording.onstop = async () => {
        clearTimeout(timeout);
        clearInterval(countdown);
        stream.getTracks().forEach((t) => t.stop());
        scene()?.setCaptureSize();
        recording = null;
        exporting = false;
        if (disposed) return;
        q("#recording-status").textContent = "";
        try {
          if (!cancelled)
            await save(
              new Blob(chunks, { type }),
              type.startsWith("video/mp4") ? "mp4" : "webm",
            );
        } catch (e) {
          toast(e.message);
        } finally {
          if (!disposed) lock(false);
        }
      };
      recording.start(200);
      countdown = setInterval(() => {
        if (!disposed)
          q("#recording-status").textContent =
            w("Запись…") +
            " " +
            Math.min(seconds, (performance.now() - started) / 1000).toFixed(1) +
            " / " +
            seconds +
            " s";
      }, 100);
      timeout = setTimeout(() => {
        if (recording?.state === "recording") recording.stop();
      }, seconds * 1000);
    } catch (e) {
      exporting = false;
      scene()?.renderFrame(null);
      scene()?.setCaptureSize();
      toast(e.message);
      lock(false);
    }
  };
  q("#studio-folder").onclick = () => api.showExport(lastFile);
  apply();
  return {
    apply,
    dispose() {
      disposed = true;
      abortExport = true;
      scene()?.setCamera({ elevation: 0.35, zoom: 1 });
      if (host) {
        if (originalStyle === null) host.removeAttribute("style");
        else host.setAttribute("style", originalStyle);
      }
      clearTimeout(timeout);
      clearInterval(countdown);
      if (recording?.state === "recording") recording.stop();
    },
  };
}
