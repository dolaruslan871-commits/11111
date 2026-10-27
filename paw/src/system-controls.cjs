const { execFile: nativeExecFile } = require("node:child_process");

// WinRT radios and the documented Core Audio endpoint interface; no registry edits.
const WINDOWS_RADIO_BASE = [
  "$ErrorActionPreference = 'Stop'",
  "Add-Type -AssemblyName System.Runtime.WindowsRuntime",
  "[Windows.Devices.Radios.Radio,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null",
  "[Windows.Devices.Radios.RadioAccessStatus,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null",
  "[Windows.Devices.Radios.RadioState,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null",
  "$asyncMethod = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq \"AsTask\" -and $_.IsGenericMethodDefinition -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1",
  'function AwaitRadio($operation, $type) { $task = $asyncMethod.MakeGenericMethod($type).Invoke($null, @($operation)); if (-not $task.Wait(6000)) { throw "Radio API timed out" }; return $task.Result }',
  '$radios = @(AwaitRadio ([Windows.Devices.Radios.Radio]::GetRadiosAsync()) ([System.Collections.Generic.IReadOnlyList[Windows.Devices.Radios.Radio]]) | Where-Object { $_.Kind -eq "Bluetooth" })',
].join("; ");
const AUDIO_CS = `using System;
using System.Runtime.InteropServices;
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumerator {}
[ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator { int EnumAudioEndpoints(int flow,int mask,out IntPtr devices); [PreserveSig] int GetDefaultAudioEndpoint(int flow,int role,out IMMDevice endpoint); }
[ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice { [PreserveSig] int Activate(ref Guid iid,int context,IntPtr activation,[MarshalAs(UnmanagedType.IUnknown)] out object instance); }
[ComImport, Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
 int RegisterControlChangeNotify(IntPtr p); int UnregisterControlChangeNotify(IntPtr p); int GetChannelCount(out uint n);
 int SetMasterVolumeLevel(float v,Guid g); int SetMasterVolumeLevelScalar(float v,Guid g); int GetMasterVolumeLevel(out float v); int GetMasterVolumeLevelScalar(out float v);
 int SetChannelVolumeLevel(uint c,float v,Guid g); int SetChannelVolumeLevelScalar(uint c,float v,Guid g); int GetChannelVolumeLevel(uint c,out float v); int GetChannelVolumeLevelScalar(uint c,out float v);
 [PreserveSig] int SetMute([MarshalAs(UnmanagedType.Bool)] bool mute,ref Guid context); [PreserveSig] int GetMute([MarshalAs(UnmanagedType.Bool)] out bool mute);
}
public static class PawAudio {
 static IAudioEndpointVolume Endpoint() { IMMDevice d; Marshal.ThrowExceptionForHR(((IMMDeviceEnumerator)new MMDeviceEnumerator()).GetDefaultAudioEndpoint(0,1,out d)); Guid id=typeof(IAudioEndpointVolume).GUID; object volume; Marshal.ThrowExceptionForHR(d.Activate(ref id,23,IntPtr.Zero,out volume)); return (IAudioEndpointVolume)volume; }
 public static bool Enabled() { bool mute; Marshal.ThrowExceptionForHR(Endpoint().GetMute(out mute)); return !mute; }
 public static void SetEnabled(bool enabled) { Guid context=Guid.Empty; Marshal.ThrowExceptionForHR(Endpoint().SetMute(!enabled,ref context)); }
}`;
const AUDIO_BASE = `Add-Type -TypeDefinition @'\n${AUDIO_CS}\n'@`;
function createSystemControls({
  platform = process.platform,
  execFile = nativeExecFile,
} = {}) {
  const powershell = (command) =>
    execute("powershell.exe", [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      command,
    ]);
  function execute(file, args) {
    return new Promise((resolve, reject) =>
      execFile(
        file,
        args,
        {
          windowsHide: true,
          timeout: 12000,
          maxBuffer: 1024 * 1024,
          encoding: "utf8",
          env: { ...process.env, LC_ALL: "C" },
        },
        (error, stdout) =>
          error ? reject(error) : resolve(String(stdout).trim()),
      ),
    );
  }
  function getSettingsUrl(kind) {
    if (!["audio", "bluetooth"].includes(kind)) return null;
    if (platform === "darwin")
      return kind === "audio"
        ? "x-apple.systempreferences:com.apple.Sound-Settings.extension"
        : "x-apple.systempreferences:com.apple.BluetoothSettings";
    if (platform === "win32")
      return kind === "audio" ? "ms-settings:sound" : "ms-settings:bluetooth";
    return null;
  }
  const unavailable = () => ({ supported: false, enabled: null });
  let blueutil;
  async function macBluetooth(args) {
    if (blueutil) return execute(blueutil, args);
    for (const file of [
      "/opt/homebrew/bin/blueutil",
      "/usr/local/bin/blueutil",
    ]) {
      try {
        const output = await execute(file, args);
        blueutil = file;
        return output;
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
      }
    }
    throw new Error(
      "Bluetooth: открой системные настройки. Для прямого переключения macOS требуется blueutil.",
    );
  }
  async function readBluetooth() {
    try {
      if (platform === "darwin") {
        const value = await macBluetooth(["--power"]);
        if (!/^[01]$/.test(value)) throw new Error("Invalid radio state");
        return { supported: true, enabled: value === "1" };
      }
      if (platform === "win32") {
        const output = await powershell(
          `${WINDOWS_RADIO_BASE}; ConvertTo-Json -InputObject @($radios | Select-Object @{Name="Enabled"; Expression={ $_.State -eq "On" }}) -Compress`,
        );
        const radios = JSON.parse(output || "[]");
        if (
          !Array.isArray(radios) ||
          radios.some((r) => typeof r.Enabled !== "boolean")
        )
          throw new Error("Invalid radios");
        return {
          supported: radios.length > 0,
          enabled: radios.length ? radios.some((r) => r.Enabled) : null,
        };
      }
    } catch {}
    return unavailable();
  }
  async function readAudio() {
    try {
      const output =
        platform === "darwin"
          ? await execute("/usr/bin/osascript", [
              "-e",
              "output muted of (get volume settings)",
            ])
          : platform === "win32"
            ? await powershell(`${AUDIO_BASE}\n[PawAudio]::Enabled()`)
            : null;
      if (output === null || !/^(true|false)$/i.test(output))
        return unavailable();
      return {
        supported: true,
        enabled:
          platform === "darwin"
            ? output.toLowerCase() === "false"
            : output.toLowerCase() === "true",
      };
    } catch {
      return unavailable();
    }
  }
  async function getStatus() {
    const [bluetooth, audio] = await Promise.all([
      readBluetooth(),
      readAudio(),
    ]);
    return { platform, bluetooth, audio };
  }
  async function setAudio(enabled) {
    if (typeof enabled !== "boolean")
      throw new TypeError("enabled must be a boolean");
    if (platform === "darwin")
      await execute("/usr/bin/osascript", [
        "-e",
        `set volume output muted ${enabled ? "false" : "true"}`,
      ]);
    else if (platform === "win32")
      await powershell(
        `${AUDIO_BASE}\n[PawAudio]::SetEnabled($${enabled ? "true" : "false"})`,
      );
    else throw new Error("Звук устройства: доступно на macOS и Windows.");
    const audio = await readAudio();
    if (audio.enabled !== enabled)
      throw new Error(
        "Система не подтвердила изменение звука. Открой настройки звука.",
      );
    return { platform, audio };
  }
  async function setBluetooth(enabled) {
    if (typeof enabled !== "boolean")
      throw new TypeError("enabled must be a boolean");
    if (platform === "darwin")
      await macBluetooth(["--power", enabled ? "1" : "0"]);
    else if (platform === "win32")
      await powershell(
        `${WINDOWS_RADIO_BASE}; if ($radios.Count -eq 0) { throw "No Bluetooth radios" }; $access = AwaitRadio ([Windows.Devices.Radios.Radio]::RequestAccessAsync()) ([Windows.Devices.Radios.RadioAccessStatus]); if ($access -ne [Windows.Devices.Radios.RadioAccessStatus]::Allowed) { throw "Radio access denied" }; foreach ($radio in $radios) { $result = AwaitRadio ($radio.SetStateAsync([Windows.Devices.Radios.RadioState]::${enabled ? "On" : "Off"})) ([Windows.Devices.Radios.RadioAccessStatus]); if ($result -ne [Windows.Devices.Radios.RadioAccessStatus]::Allowed) { throw "Radio state change denied" } }`,
      );
    else throw new Error("Bluetooth: открой системные настройки.");
    const bluetooth = await readBluetooth();
    if (bluetooth.enabled !== enabled)
      throw new Error(
        "Система не подтвердила изменение Bluetooth. Открой настройки Bluetooth.",
      );
    return { platform, bluetooth };
  }
  return { getStatus, setAudio, setBluetooth, getSettingsUrl };
}
module.exports = { createSystemControls, AUDIO_CS };
