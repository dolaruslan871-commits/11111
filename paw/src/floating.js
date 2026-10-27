import { mountPet3D } from "./pet-3d.js";
import { appearance } from "./v5-ui.js";
import { petSound, unlockPetAudio, stopPetSounds } from "./sound.js";
import { createPetInteractions } from "./pet-interactions.js";

const api = window.paw;
let state = await api.getState(),
  pointer = null,
  moved = false,
  noticeTimer;
document.body.innerHTML =
  '<div id="floating-world"><div id="floating-pet" class="pet-hitbox" role="button" tabindex="0" aria-label="Paw"></div><div id="pet-prey"></div><div id="pet-bubble" role="status"></div><div id="radial-host"></div><span id="trash-destination" aria-hidden="true">♻</span></div>';
const world = document.querySelector("#floating-world"),
  pet = document.querySelector("#floating-pet"),
  bubble = document.querySelector("#pet-bubble");
let noticeAt = 0;
const scene = mountPet3D(pet, { ...state, desktopPet: true });
const interactions = createPetInteractions((name) => api.action(name));
function update() {
  document.documentElement.dataset.theme = state.theme || "light";
  document.documentElement.lang = state.language || "ru";
  world.style.transform = `scale(${state.scale || 1})`;
  world.classList.toggle("menu-open", !!state.menuOpen);
  world.classList.toggle("is-carrying", state.activity === "carry");
  world.classList.toggle("is-feeding", state.feed?.phase === "working");
  scene.update(state);
  appearance(state);
  if (state.notice && state.notice.at !== noticeAt) {
    noticeAt = state.notice.at;
    bubble.textContent =
      { timer: "⏰", task: "🔔", gift: "🎁", game: "🪙" }[state.notice.kind] ||
      "";
    bubble.title = state.notice.text || "";
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => (bubble.textContent = ""), 7000);
  }
  pet.style.clipPath =
    state.activity === "hide" && state.behavior?.windowInteraction
      ? "inset(0 0 40% 0)"
      : "";
  world.querySelector(".drawing-overlay")?.remove();
  if (state.activity === "draw") {
    const ink = document.createElement("span");
    ink.className = "drawing-overlay";
    ink.textContent = "♡ ✧";
    ink.setAttribute("aria-hidden", "true");
    world.append(ink);
  }
  // Personality comes from the rig and facial animation, never speech captions.
  document.querySelector("#pet-prey").innerHTML =
    state.activity === "hunt"
      ? '<span class="butterfly" aria-hidden="true"><i></i><b></b></span>'
      : "";
}
function notify(message) {
  clearTimeout(noticeTimer);
  bubble.textContent = "⚠";
  bubble.title = message;
  bubble.setAttribute("aria-label", message);
  noticeTimer = setTimeout(() => {
    bubble.textContent = "";
    bubble.removeAttribute("title");
    bubble.removeAttribute("aria-label");
  }, 6000);
}
api.onState((next) => {
  const changed = state.activity !== next.activity;
  if (next.muted) stopPetSounds();
  state = next;
  update();
  if (
    changed &&
    [
      "pet",
      "eat",
      "play",
      "excited",
      "wave",
      "angry",
      "sad",
      "grateful",
      "groom",
      "yawn",
      "chirp",
      "shake",
    ].includes(state.activity)
  )
    petSound(state.skin, state.muted, state.activity);
});
api.onFeedResult((result) => {
  if (result && !result.ok && !result.canceled && result.message)
    notify(result.message);
});
pet.oncontextmenu = (event) => {
  event.preventDefault();
  pointer = null;
  api.drag("end", { x: event.screenX, y: event.screenY });
  api.menu();
};
pet.onpointerdown = (event) => {
  if (event.button !== 0 || state.menuOpen) return;
  unlockPetAudio();
  pointer = {
    x: event.screenX,
    y: event.screenY,
    part: scene.hitTest?.(event.clientX, event.clientY) || "body",
  };
  moved = false;
  pet.setPointerCapture(event.pointerId);
  api.drag("start", { x: event.screenX, y: event.screenY });
};
pet.onpointermove = (event) => {
  if (!pointer) return;
  if (Math.hypot(event.screenX - pointer.x, event.screenY - pointer.y) > 5)
    moved = true;
  if (moved) api.drag("move", { x: event.screenX, y: event.screenY });
};
pet.onpointerup = (event) => {
  if (!pointer) return;
  api.drag("end", { x: event.screenX, y: event.screenY });
  if (!moved) interactions.tap(pointer.part);
  pointer = null;
};
pet.ondblclick = (event) => {
  if (moved || state.menuOpen) return;
  event.preventDefault();
  interactions.doubleTap(
    scene.hitTest?.(event.clientX, event.clientY) || "body",
  );
};
pet.onpointercancel = (event) => {
  pointer = null;
  api.drag("end", { x: event.screenX, y: event.screenY });
};
pet.onkeydown = (event) => {
  unlockPetAudio();
  if (["Enter", " "].includes(event.key)) {
    event.preventDefault();
    api.action("pet");
  }
  if (event.key === "ContextMenu") {
    event.preventDefault();
    api.menu();
  }
};
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") api.closeMenu();
});
document.addEventListener("dragover", (event) => {
  if (event.dataTransfer?.types.includes("Files")) {
    event.preventDefault();
    pet.classList.add("drop-active");
  }
});
document.addEventListener("dragleave", (event) => {
  if (!event.relatedTarget) pet.classList.remove("drop-active");
});
document.addEventListener("drop", (event) => {
  event.preventDefault();
  pet.classList.remove("drop-active");
});
window.addEventListener("beforeunload", () => {
  clearTimeout(noticeTimer);
  stopPetSounds();
  scene.dispose();
});
update();

setInterval(() => {
  if (scene.measure) {
    const bounds = scene.measure();
    const k = state.scale || 1;
    api.visualBounds({
      x: bounds.x / k,
      y: bounds.y / k,
      width: bounds.width / k,
      height: bounds.height / k,
    });
  }
}, 1000);
