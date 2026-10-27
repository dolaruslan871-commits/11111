const path = require("node:path");
const os = require("node:os");
/** Reversible native Trash operation for explicitly supplied regular files/folders. */
function createFeeder({
  trash,
  lstat,
  chooseFiles,
  onPhase = () => {},
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  protectedPaths = [],
  realpath = async (value) => value,
  platform = process.platform,
}) {
  if (typeof trash !== "function" || typeof lstat !== "function")
    throw new TypeError("Native trash and lstat functions are required");
  let busy = false;
  const normalize = (file) =>
    platform === "win32"
      ? path.win32.resolve(file).toLowerCase()
      : path.resolve(file);
  const pathApi = platform === "win32" ? path.win32 : path;
  const systemTrees =
    platform === "win32"
      ? ["C:\\Windows", "C:\\Program Files", "C:\\Program Files (x86)"]
      : [
          "/System",
          "/Library",
          "/Applications",
          "/usr",
          "/bin",
          "/sbin",
          "/etc",
          "/lib",
          "/opt",
        ];
  const protectedTrees = systemTrees.map(normalize);
  const protectedSet = new Set(
    [
      os.homedir(),
      ...protectedPaths,
      ...(platform === "win32"
        ? ["C:\\Windows", "C:\\Program Files", "C:\\Program Files (x86)"]
        : [
            "/System",
            "/Library",
            "/Applications",
            "/Users",
            "/usr",
            "/bin",
            "/sbin",
            "/etc",
            "/var",
            "/lib",
            "/opt",
          ]),
    ].map(normalize),
  );
  const publish = (value) => {
    try {
      onPhase(value);
    } catch {}
  };
  const fail = (message, count = 0, total = 0, extra = {}) => {
    const result = { ok: false, count, total, message, ...extra };
    publish({ phase: "error", ...result });
    return result;
  };
  async function feed(requestedPaths, { mode = "eat", owner } = {}) {
    if (busy)
      return { ok: false, message: "Сначала закончим предыдущее кормление." };
    busy = true;
    let count = 0,
      total = 0;
    try {
      let paths = requestedPaths;
      if (paths === null) {
        if (typeof chooseFiles !== "function")
          return fail("Выбор файлов недоступен.");
        const selection = await chooseFiles(owner);
        if (!selection || selection.canceled)
          return { ok: false, canceled: true };
        paths = selection.filePaths;
      }
      if (
        !Array.isArray(paths) ||
        !paths.length ||
        paths.length > 20 ||
        !paths.every(
          (file) =>
            typeof file === "string" &&
            file.length &&
            pathApi.isAbsolute(file) &&
            !file.includes("\0"),
        )
      )
        return fail(
          "Перетащи от 1 до 20 файлов или папок из Finder или Проводника.",
        );
      paths = [
        ...new Map(
          paths.map((file) => [normalize(file), pathApi.resolve(file)]),
        ).values(),
      ];
      total = paths.length;
      for (const file of paths) {
        const normalized = normalize(file),
          root = normalize(pathApi.parse(file).root);
        if (
          normalized === root ||
          protectedSet.has(normalized) ||
          [...protectedSet].some((target) =>
            target.startsWith(normalized + pathApi.sep),
          ) ||
          protectedTrees.some((parent) =>
            normalized.startsWith(parent + pathApi.sep),
          )
        )
          return fail(
            "Нельзя отправить системную папку или работающее приложение в корзину.",
            0,
            total,
          );
        const info = await lstat(file);
        if (info.isSymbolicLink?.() || (!info.isFile() && !info.isDirectory()))
          return fail(
            "Питомец принимает обычные файлы и папки. Ссылки остаются на месте.",
            0,
            total,
          );
      }
      paths = [
        ...new Map(
          (await Promise.all(paths.map((file) => realpath(file)))).map(
            (file) => [normalize(file), file],
          ),
        ).values(),
      ];
      // Trash a selected parent once; descendants move with it.
      paths = paths.filter(
        (file) =>
          !paths.some(
            (parent) =>
              normalize(file) !== normalize(parent) &&
              normalize(file).startsWith(normalize(parent) + pathApi.sep),
          ),
      );
      total = paths.length;
      mode = mode === "carry" ? "carry" : "eat";
      const name = pathApi.basename(paths[0]);
      publish({ phase: "working", mode, name, count: 0, total });
      await wait(mode === "carry" ? 1500 : 800);
      for (const file of paths) {
        try {
          const info = await lstat(file);
          if (
            info.isSymbolicLink?.() ||
            (!info.isFile() && !info.isDirectory())
          )
            return fail(
              "Объект изменился перед перемещением. Попробуй ещё раз.",
              count,
              total,
              { mode, name },
            );
          await trash(file);
          try {
            await lstat(file);
            return fail(
              "Система оставила объект на месте. Проверь права доступа.",
              count,
              total,
              { mode, name },
            );
          } catch (error) {
            if (error.code !== "ENOENT")
              return fail(
                "Не удалось проверить перемещение в корзину.",
                count,
                total,
                { mode, name },
              );
          }
          count++;
        } catch (error) {
          return fail(
            ["EACCES", "EPERM"].includes(error?.code)
              ? "Нет разрешения на перемещение в корзину. Проверь права доступа."
              : "Система не смогла переместить объект в корзину.",
            count,
            total,
            { mode, name },
          );
        }
      }
      const result = { ok: true, count, total };
      publish({ phase: "done", mode, name, ...result });
      return result;
    } catch (error) {
      return fail(
        error?.code === "ENOENT"
          ? "Файл или папка больше не существует."
          : "Не удалось прочитать файл или папку.",
        count,
        total,
      );
    } finally {
      busy = false;
    }
  }
  return { feed, isBusy: () => busy };
}
module.exports = { createFeeder };
