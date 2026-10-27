(async () => {
  const info = await window.paw.captureInfo();
  if (!info) return;
  const labels = {
    ru: ["Выдели область", "Весь экран", "Esc · Отмена"],
    uk: ["Виділи область", "Весь екран", "Esc · Скасувати"],
    en: ["Select an area", "Full screen", "Esc · Cancel"],
  }[info.language || "ru"];
  document.querySelector("#bar span").textContent = labels[0];
  document.querySelector("#full").textContent = labels[1];
  document.querySelector("#cancel").textContent = labels[2];
  document.querySelector("#screen").src = info.data;
  const selection = document.querySelector("#selection");
  let start = null;
  const cancel = () => window.paw.captureSave(null);
  document.querySelector("#cancel").onclick = cancel;
  document.onkeydown = (e) => {
    if (e.key === "Escape") cancel();
  };
  document.querySelector("#full").onclick = () =>
    window.paw.captureSave({
      x: 0,
      y: 0,
      width: info.width,
      height: info.height,
    });
  document.onpointerdown = (e) => {
    if (e.target.closest("#bar")) return;
    start = { x: e.clientX, y: e.clientY };
  };
  document.onpointermove = (e) => {
    if (!start) return;
    Object.assign(selection.style, {
      display: "block",
      left: Math.min(start.x, e.clientX) + "px",
      top: Math.min(start.y, e.clientY) + "px",
      width: Math.abs(start.x - e.clientX) + "px",
      height: Math.abs(start.y - e.clientY) + "px",
    });
  };
  document.onpointerup = (e) => {
    if (!start) return;
    const sx = info.width / innerWidth,
      sy = info.height / innerHeight;
    const x = Math.floor(Math.max(0, Math.min(start.x, e.clientX)) * sx),
      y = Math.floor(Math.max(0, Math.min(start.y, e.clientY)) * sy),
      width = Math.floor(
        Math.min(innerWidth, Math.abs(start.x - e.clientX)) * sx,
      ),
      height = Math.floor(
        Math.min(innerHeight, Math.abs(start.y - e.clientY)) * sy,
      );
    start = null;
    if (width > 3 && height > 3)
      window.paw.captureSave({
        x,
        y,
        width: Math.min(width, info.width - x),
        height: Math.min(height, info.height - y),
      });
  };
})();
