const path = require('node:path');

/** Move explicitly supplied ordinary files to the operating system Trash. */
function createFeeder({ trash, lstat, chooseFiles, onPhase = () => {}, wait = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  if (typeof trash !== 'function' || typeof lstat !== 'function') throw new TypeError('Native trash and lstat functions are required');
  let busy = false;
  const publish = value => { try { onPhase(value); } catch {} };
  const fail = (message, count = 0, total = 0, extra = {}) => {
    const result = { ok: false, count, total, message, ...extra };
    publish({ phase: 'error', ...result });
    return result;
  };
  async function feed(requestedPaths, { mode = 'eat', owner } = {}) {
    if (busy) return { ok: false, message: 'Сначала закончим предыдущее кормление.' };
    busy = true;
    let count = 0, total = 0;
    try {
      let paths = requestedPaths;
      if (paths === null) {
        if (typeof chooseFiles !== 'function') return fail('Выбор файлов недоступен. Перетащи файл из Finder или Проводника.');
        const selection = await chooseFiles(owner);
        if (!selection || selection.canceled) return { ok: false, canceled: true };
        paths = selection.filePaths;
      }
      if (!Array.isArray(paths) || !paths.length || paths.length > 20 || !paths.every(file => typeof file === 'string' && file.length && path.isAbsolute(file))) {
        return fail('Перетащи от 1 до 20 файлов из Finder или Проводника. Файл из браузера сначала нужно сохранить на компьютер.');
      }
      paths = [...new Set(paths)]; total = paths.length;
      // Validate the complete batch before moving anything. Never follow links.
      for (const file of paths) {
        const info = await lstat(file);
        if (!info.isFile() || info.isSymbolicLink?.()) return fail('Питомец принимает обычные файлы. Папки и ссылки остаются на месте.', 0, total);
      }
      mode = mode === 'carry' ? 'carry' : 'eat';
      const name = path.basename(paths[0]);
      publish({ phase: 'working', mode, name, count: 0, total, message: mode === 'carry' ? 'Отнесу в корзину!' : 'Ням-ням…' });
      await wait(mode === 'carry' ? 1500 : 800);
      for (const file of paths) {
        try {
          await trash(file);
          // Do not claim success if a resolved native operation left the file.
          try {
            await lstat(file);
            return fail(`В корзине: ${count} из ${total}. Система оставила следующий файл на месте. Проверь права на файл.`, count, total, { mode, name });
          } catch (error) {
            if (error.code !== 'ENOENT') return fail(`В корзине: ${count} из ${total}. Не удалось проверить перемещение файла.`, count, total, { mode, name });
          }
          count++;
        } catch (error) {
          const reason = ['EACCES', 'EPERM'].includes(error?.code) ? 'Нет разрешения на перемещение файла. Проверь права и доступ Paw к папке.' : 'Система не смогла переместить следующий файл. Он остался на месте.';
          return fail(`В корзине: ${count} из ${total}. ${reason}`, count, total, { mode, name });
        }
      }
      const result = { ok: true, count, total, message: mode === 'carry' ? 'Готово! Файлы отнесены в корзину.' : 'Ням! Файлы теперь в корзине.' };
      publish({ phase: 'done', mode, name, ...result });
      return result;
    } catch (error) {
      return fail(error?.code === 'ENOENT' ? 'Файл уже перемещён или больше не существует.' : 'Не удалось прочитать файл. Проверь доступ к его папке.', count, total);
    } finally { busy = false; }
  }
  return { feed, isBusy: () => busy };
}
module.exports = { createFeeder };
