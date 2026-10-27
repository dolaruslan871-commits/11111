// Small, interruptible transitions shared by the native Paw windows.
// No timers or animation loop run while the UI is at rest.
const running = new WeakMap();
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
export const reducedMotion = () => motionPreference.matches;

export function animateUI(element, keyframes, options = {}, channel = "content") {
  if (!element || reducedMotion() || typeof element.animate !== "function")
    return Promise.resolve(false);
  let channels = running.get(element);
  if (!channels) running.set(element, channels = new Map());
  channels.get(channel)?.cancel();
  const animation = element.animate(keyframes, {
    duration: 220,
    easing: "cubic-bezier(.2,.75,.25,1)",
    ...options,
  });
  channels.set(channel, animation);
  return animation.finished.then(() => true, () => false).finally(() => {
    if (channels.get(channel) === animation) channels.delete(channel);
  });
}

export function revealSection(element, kind = "section") {
  return animateUI(element, [
    { opacity: .18, transform: kind === "category" ? "translate3d(0,6px,0)" : "translate3d(0,9px,0)" },
    { opacity: 1, transform: "translate3d(0,0,0)" },
  ], { duration: kind === "category" ? 190 : 260 }, "section");
}

export function confirmSelection(element) {
  return animateUI(element, [
    { transform: "scale(.975)" },
    { transform: "scale(1.018)", offset: .65 },
    { transform: "scale(1)" },
  ], { duration: 280 }, "selection");
}

let windowAnimation = null;
let windowGeneration = 0;
export async function pawWindowMotion(phase = "show") {
  const body = document.body;
  if (!body) return false;
  const generation = ++windowGeneration;
  const current = getComputedStyle(body);
  const from = { opacity: current.opacity, transform: current.transform };
  windowAnimation?.cancel();
  windowAnimation = null;
  if (phase === "prepare-show") {
    body.style.opacity = reducedMotion() ? "1" : "0";
    body.style.transform = reducedMotion() ? "" : "translate3d(0,7px,0)";
    return true;
  }
  const hide = phase === "hide";
  if (reducedMotion() || typeof body.animate !== "function") {
    body.style.opacity = hide ? "0" : "";
    body.style.transform = "";
    return true;
  }
  const animation = body.animate([
    from,
    { opacity: hide ? 0 : 1, transform: hide ? "translate3d(0,6px,0)" : "translate3d(0,0,0)" },
  ], { duration: hide ? 130 : 190, easing: "cubic-bezier(.2,.75,.25,1)", fill: "both" });
  windowAnimation = animation;
  try { await animation.finished; } catch { return false; }
  if (generation !== windowGeneration) return false;
  body.style.opacity = hide ? "0" : "";
  body.style.transform = hide ? "translate3d(0,6px,0)" : "";
  animation.cancel();
  windowAnimation = null;
  return true;
}
window.pawWindowMotion = pawWindowMotion;
motionPreference.addEventListener?.("change", () => {
  if (reducedMotion()) {
    windowAnimation?.finish();
    document.getAnimations().forEach(animation => {
      if (animation.effect?.target?.closest?.(".premium-content, .app-shell, .widget-window")) {
        try { animation.finish(); } catch {}
      }
    });
  }
});
