const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs/promises");
const { execFile } = require("node:child_process");
const { createWindowTracker } = require("./window-tracker.cjs");
function createDesktopTools({ platform = process.platform, execute, spawnProcess, selfPid = process.pid } = {}) {
  const windowTracker = createWindowTracker({ platform, selfPid, spawnProcess });
  const run =
    execute ||
    ((file, args) =>
      new Promise((resolve, reject) =>
        execFile(
          file,
          args,
          {
            timeout: 7000,
            maxBuffer: 2 * 1024 * 1024,
            windowsHide: true,
            encoding: "utf8",
          },
          (e, out) => (e ? reject(e) : resolve(out.trim())),
        ),
      ));
  const ps = (script) =>
    run("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-EncodedCommand",
      Buffer.from(script, "utf16le").toString("base64"),
    ]);
  let previous = os.cpus();
  function metrics() {
    const current = os.cpus();
    let idle = 0,
      total = 0;
    current.forEach((c, i) => {
      const p = previous[i];
      if (!p) return;
      idle += c.times.idle - p.times.idle;
      for (const k of Object.keys(c.times)) total += c.times[k] - p.times[k];
    });
    previous = current;
    return {
      cpu: total ? Math.round((1 - idle / total) * 100) : 0,
      memoryUsed: os.totalmem() - os.freemem(),
      memoryTotal: os.totalmem(),
    };
  }
  async function battery() {
    try {
      if (platform === "darwin") {
        const text = await run("/usr/bin/pmset", ["-g", "batt"]);
        const n = text.match(/(\d+)%;/);
        return n
          ? {
              supported: true,
              percent: Number(n[1]),
              charging:
                /AC Power|charging/i.test(text) && !/discharging/i.test(text),
            }
          : { supported: false };
      }
      if (platform === "win32") {
        const v = JSON.parse(
          await ps(
            "Get-CimInstance Win32_Battery | Select-Object EstimatedChargeRemaining,BatteryStatus | ConvertTo-Json -Compress",
          ),
        );
        const b = Array.isArray(v) ? v[0] : v;
        return b
          ? {
              supported: true,
              percent: Number(b.EstimatedChargeRemaining),
              charging: [2, 3, 6, 7, 8, 9].includes(b.BatteryStatus),
            }
          : { supported: false };
      }
    } catch {}
    return { supported: false };
  }
  async function media(command) {
    if (!["playpause", "next", "previous", "up", "down"].includes(command))
      throw new Error("Unknown media command");
    if (platform === "win32") {
      const key = {
        playpause: 179,
        next: 176,
        previous: 177,
        up: 175,
        down: 174,
      }[command];
      await ps(
        `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class PawKeys { [DllImport("user32.dll")] public static extern void keybd_event(byte a,byte b,uint c,UIntPtr d); }'; [PawKeys]::keybd_event(${key},0,0,[UIntPtr]::Zero); [PawKeys]::keybd_event(${key},0,2,[UIntPtr]::Zero)`,
      );
      return { ok: true };
    }
    if (platform === "darwin") {
      if (["up", "down"].includes(command)) {
        await run("/usr/bin/osascript", [
          "-e",
          `set volume output volume ((output volume of (get volume settings)) ${command === "up" ? "+" : "-"} 6)`,
        ]);
        return { ok: true };
      }
      const source = `ObjC.import('AppKit'); ObjC.import('ApplicationServices'); $.NSApplication.sharedApplication; const e=$.NSEvent.otherEventWithTypeLocationModifierFlagsTimestampWindowNumberContextSubtypeData1Data2(14,$.NSMakePoint(0,0),0,0,0,null,8,(${{ playpause: 16, next: 17, previous: 18 }[command]}<<16)|(10<<8),-1); $.NSApp; $.CGEventPost(0,e.CGEvent); const u=$.NSEvent.otherEventWithTypeLocationModifierFlagsTimestampWindowNumberContextSubtypeData1Data2(14,$.NSMakePoint(0,0),0,0,0,null,8,(${{ playpause: 16, next: 17, previous: 18 }[command]}<<16)|(11<<8),-1); $.CGEventPost(0,u.CGEvent);`;
      await run("/usr/bin/osascript", ["-l", "JavaScript", "-e", source]);
      return { ok: true };
    }
    throw new Error("Управление музыкой доступно на macOS и Windows.");
  }
  async function foreground() {
    try {
      if (platform === "darwin") {
        const script =
          'tell application "System Events"\nset p to first application process whose frontmost is true\nset n to name of p\ntry\nset xy to position of front window of p\nset wh to size of front window of p\nreturn n & "|" & item 1 of xy & "|" & item 2 of xy & "|" & item 1 of wh & "|" & item 2 of wh\non error\nreturn n\nend try\nend tell';
        const [name, x, y, width, height] = (
          await run("/usr/bin/osascript", ["-e", script])
        ).split("|");
        return {
          supported: true,
          name,
          bounds: [x, y, width, height].every((n) => Number.isFinite(Number(n)))
            ? { x: +x, y: +y, width: +width, height: +height }
            : null,
        };
      }
      if (platform === "win32") {
        const text = await ps(
          `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; using System.Diagnostics; public class PawFront { [StructLayout(LayoutKind.Sequential)] public struct Rect {public int L,T,R,B;} [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h,out Rect r); [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h,out uint p); public static string Read(){var h=GetForegroundWindow(); Rect r; GetWindowRect(h,out r); uint p; GetWindowThreadProcessId(h,out p); return Process.GetProcessById((int)p).ProcessName+"|"+r.L+"|"+r.T+"|"+(r.R-r.L)+"|"+(r.B-r.T);}}'; [PawFront]::Read()`,
        );
        const [name, x, y, width, height] = text.split("|");
        return {
          supported: true,
          name,
          bounds: { x: +x, y: +y, width: +width, height: +height },
        };
      }
    } catch {}
    return { supported: false, name: "", bounds: null };
  }
  let searchTokens = new Map();
  async function search(query) {
    if (typeof query !== "string" || query.trim().length < 2) return [];
    query = query.trim().slice(0, 150);
    let files = [];
    try {
      if (platform === "darwin") {
        const escaped = query.replace(/[\\"*?]/g, "\\$&");
        files = (
          await run("/usr/bin/mdfind", [
            "-onlyin",
            os.homedir(),
            `kMDItemFSName == "*${escaped}*"cd`,
          ])
        )
          .split("\n")
          .slice(0, 30);
      } else if (platform === "win32") {
        const encoded = Buffer.from(query).toString("base64");
        const text = await ps(
          `$q=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encoded}')); $connection=New-Object -ComObject ADODB.Connection; $connection.Open("Provider=Search.CollatorDSO;Extended Properties='Application=Windows';"); $safe=$q.Replace("'","''").Replace('%','').Replace('_',''); $rs=$connection.Execute("SELECT TOP 30 System.ItemPathDisplay FROM SYSTEMINDEX WHERE System.FileName LIKE '%"+$safe+"%'"); $items=@(); while(-not $rs.EOF){$items+= [string]$rs.Fields.Item(0).Value; $rs.MoveNext()}; $connection.Close(); ConvertTo-Json -InputObject @($items) -Compress`,
        );
        files = JSON.parse(text);
      }
    } catch {}
    // Also include locally installed apps, even when file indexing is disabled.
    const dirs =
      platform === "darwin"
        ? ["/Applications", path.join(os.homedir(), "Applications")]
        : platform === "win32"
          ? [
              process.env.ProgramFiles,
              process.env["ProgramFiles(x86)"],
              path.join(os.homedir(), "Desktop"),
            ].filter(Boolean)
          : [];
    for (const dir of dirs) {
      try {
        for (const e of await fs.readdir(dir, { withFileTypes: true }))
          if (e.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
            files.push(path.join(dir, e.name));
      } catch {}
    }
    searchTokens = new Map();
    return [...new Set(files)]
      .filter((f) => f && path.isAbsolute(f))
      .slice(0, 30)
      .map((file, i) => {
        const id = String(i);
        searchTokens.set(id, file);
        return { id, name: path.basename(file), path: file };
      });
  }
  function searchPath(id) {
    return searchTokens.get(String(id));
  }
  return { metrics, battery, media, foreground, search, searchPath,
    trackWindows: (enabled) => enabled ? windowTracker.start() : windowTracker.stop(),
    windows: () => windowTracker.snapshot(),
    dispose: () => windowTracker.stop(),
  };
}
module.exports = { createDesktopTools };
