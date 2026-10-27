import { mountRadialMenu } from "./radial-menu.js";
import { appearance } from "./v5-ui.js";
const api = window.paw;
let state = await api.getState();
const menu = mountRadialMenu(
  document.querySelector("#widget"),
  api,
  () => state,
  (message) => {
    const e = document.querySelector("#widget-error");
    if (e) e.textContent = message;
  },
);
appearance(state);
menu.update();
api.onState((next) => {
  state = next;
  appearance(state);
  menu.update();
});
document.onkeydown = (e) => {
  if (e.key === "Escape") api.closeMenu();
};
window.onbeforeunload = () => menu.dispose();
