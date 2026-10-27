import { mountHabitat3D } from "./habitat-3d.js";
const kind = new URLSearchParams(location.search).get("kind"),
  api = window.paw;
let state = await api.getState();
const scene = mountHabitat3D(document.querySelector("#scene"), {
  ...state,
  companion: null,
  habitatKind: kind,
  behavior: { ...state.behavior, seasons: false },
}, kind);
api.onState((next) => {
  state = next;
  scene.update({
    ...state,
    companion: null,
    habitatKind: kind,
    behavior: { ...state.behavior, seasons: false },
  });
});
window.onbeforeunload = () => scene.dispose();
