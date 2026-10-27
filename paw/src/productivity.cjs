const crypto = require("node:crypto");
function sanitizeTasks(input = []) {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, 100)
    .filter((t) => t && typeof t.text === "string")
    .map((t) => ({
      id: typeof t.id === "string" ? t.id.slice(0, 80) : crypto.randomUUID(),
      text: t.text.trim().slice(0, 1000),
      due: Number.isFinite(t.due) && t.due > 0 ? t.due : null,
      done: !!t.done,
      notified: !!t.notified,
    }))
    .filter((t) => t.text);
}
function dueTasks(tasks, now) {
  return tasks.filter(
    (t) => !t.done && !t.notified && t.due !== null && t.due <= now,
  );
}
module.exports = { sanitizeTasks, dueTasks };
