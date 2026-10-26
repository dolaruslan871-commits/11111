const { execFile: nativeExecFile } = require('node:child_process');

const WINDOWS_WIFI_QUERY = [
  "$ErrorActionPreference = 'Stop'",
  '$wifi = @(Get-NetAdapter -Physical | Where-Object { $_.NdisPhysicalMedium -eq 9 -or [string]$_.PhysicalMediaType -match \'802\\.11|Wireless\' })',
  '$result = @($wifi | Select-Object InterfaceIndex, @{Name="Enabled"; Expression={ $_.AdminStatus -eq "Up" -or $_.InterfaceAdminStatus -eq 1 }})',
  'ConvertTo-Json -InputObject $result -Compress',
].join('; ');

// Windows 10/11 exposes radio state through WinRT. PowerShell's WindowsRuntime
// bridge supplies the async adapter; no registry edits or elevation are used.
const WINDOWS_RADIO_BASE = [
  "$ErrorActionPreference = 'Stop'",
  'Add-Type -AssemblyName System.Runtime.WindowsRuntime',
  '[Windows.Devices.Radios.Radio,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null',
  '[Windows.Devices.Radios.RadioAccessStatus,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null',
  '[Windows.Devices.Radios.RadioState,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null',
  '$asyncMethod = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq "AsTask" -and $_.IsGenericMethodDefinition -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq \'IAsyncOperation`1\' } | Select-Object -First 1',
  'function AwaitRadio($operation, $type) { $task = $asyncMethod.MakeGenericMethod($type).Invoke($null, @($operation)); if (-not $task.Wait(8000)) { throw "Radio API timed out" }; return $task.Result }',
  '$radios = @(AwaitRadio ([Windows.Devices.Radios.Radio]::GetRadiosAsync()) ([System.Collections.Generic.IReadOnlyList[Windows.Devices.Radios.Radio]]) | Where-Object { $_.Kind -eq "Bluetooth" })',
].join('; ');

const WINDOWS_BLUETOOTH_QUERY = `${WINDOWS_RADIO_BASE}; ConvertTo-Json -InputObject @($radios | Select-Object @{Name="Enabled"; Expression={ $_.State -eq "On" }}) -Compress`;

function createSystemControls({ platform = process.platform, execFile = nativeExecFile } = {}) {
  function execute(file, args) {
    return new Promise((resolve, reject) => {
      execFile(file, args, {
        windowsHide: true,
        timeout: 12000,
        maxBuffer: 1024 * 1024,
        encoding: 'utf8',
        env: { ...process.env, LC_ALL: 'C' },
      }, (error, stdout) => error ? reject(error) : resolve(String(stdout).trim()));
    });
  }

  function getSettingsUrl(kind) {
    if (!['wifi', 'bluetooth'].includes(kind)) return null;
    if (platform === 'darwin') {
      return kind === 'wifi'
        ? 'x-apple.systempreferences:com.apple.preference.network'
        : 'x-apple.systempreferences:com.apple.BluetoothSettings';
    }
    if (platform === 'win32') return kind === 'wifi' ? 'ms-settings:network-wifi' : 'ms-settings:bluetooth';
    return null;
  }

  function systemError(message, code = 'SYSTEM_CONTROL_FAILED', kind = 'wifi') {
    const error = new Error(message);
    error.code = code;
    error.settingsUrl = getSettingsUrl(kind);
    return error;
  }

  async function readWifi() {
    if (platform === 'darwin') {
      const ports = await execute('/usr/sbin/networksetup', ['-listallhardwareports']);
      const block = ports.split(/\r?\n\s*\r?\n/).find(port => /Hardware Port:\s*(?:Wi-Fi|AirPort)\s*$/im.test(port));
      const device = block?.match(/^Device:\s*(en\d+)\s*$/im)?.[1];
      if (!device) return { adapters: [], enabled: null };
      const power = await execute('/usr/sbin/networksetup', ['-getairportpower', device]);
      if (!/:\s*(On|Off)\s*$/i.test(power)) throw new Error('Unrecognized Wi-Fi power response');
      return { adapters: [device], enabled: /:\s*On\s*$/i.test(power) };
    }
    if (platform === 'win32') {
      const output = await execute('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', WINDOWS_WIFI_QUERY]);
      const parsed = JSON.parse(output || '[]');
      const adapters = Array.isArray(parsed) ? parsed : [parsed];
      if (adapters.some(adapter => !Number.isSafeInteger(adapter.InterfaceIndex) || adapter.InterfaceIndex < 1 || typeof adapter.Enabled !== 'boolean')) {
        throw new Error('Invalid physical Wi-Fi adapter response');
      }
      return { adapters: adapters.map(adapter => adapter.InterfaceIndex), enabled: adapters.length ? adapters.some(adapter => adapter.Enabled) : null };
    }
    return { adapters: [], enabled: null };
  }

  async function readBluetooth() {
    if (platform !== 'win32') return { supported: false, enabled: null, label: 'Bluetooth: настройки системы' };
    try {
      const output = await execute('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', WINDOWS_BLUETOOTH_QUERY]);
      const radios = JSON.parse(output || '[]');
      if (!Array.isArray(radios) || radios.some(radio => typeof radio.Enabled !== 'boolean')) throw new Error('Invalid Bluetooth response');
      return {
        supported: radios.length > 0,
        enabled: radios.length ? radios.some(radio => radio.Enabled) : null,
        label: radios.length ? `Bluetooth: ${radios.some(radio => radio.Enabled) ? 'включён' : 'выключен'}` : 'Bluetooth: радио не найдено',
      };
    } catch {
      return { supported: false, enabled: null, label: 'Bluetooth: не удалось прочитать состояние' };
    }
  }

  async function getStatus() {
    const result = {
      platform,
      wifi: { supported: false, enabled: null, label: 'Wi-Fi: настройки системы' },
      bluetooth: { supported: false, enabled: null, label: 'Bluetooth: настройки системы' },
    };
    if (!['darwin', 'win32'].includes(platform)) {
      result.wifi.label = 'Wi-Fi: доступно на macOS и Windows';
      result.bluetooth.label = 'Bluetooth: доступно на macOS и Windows';
      return result;
    }
    try {
      const wifi = await readWifi();
      result.wifi = {
        supported: wifi.adapters.length > 0,
        enabled: wifi.enabled,
        label: wifi.adapters.length ? `Wi-Fi: ${wifi.enabled ? 'включён' : 'выключен'}` : 'Wi-Fi: адаптер не найден',
      };
    } catch {
      result.wifi.label = 'Wi-Fi: не удалось прочитать состояние';
    }
    result.bluetooth = await readBluetooth();
    return result;
  }

  async function setWifi(enabled) {
    if (typeof enabled !== 'boolean') throw new TypeError('enabled must be a boolean');
    if (!['darwin', 'win32'].includes(platform)) {
      throw systemError('Переключение Wi-Fi доступно на macOS и Windows.', 'UNSUPPORTED_PLATFORM');
    }
    try {
      const wifi = await readWifi();
      if (!wifi.adapters.length) throw systemError('Физический Wi-Fi адаптер не найден.', 'NO_WIFI_ADAPTER');
      if (platform === 'darwin') {
        await execute('/usr/sbin/networksetup', ['-setairportpower', wifi.adapters[0], enabled ? 'on' : 'off']);
      } else {
        // Adapter indices are validated integers from Get-NetAdapter -Physical.
        // Ethernet, virtual adapters, and caller-provided adapter names never enter this command.
        const action = enabled ? 'Enable-NetAdapter' : 'Disable-NetAdapter';
        const command = `$ErrorActionPreference = 'Stop'; Get-NetAdapter -Physical | Where-Object { ($_.NdisPhysicalMedium -eq 9 -or [string]$_.PhysicalMediaType -match '802\\.11|Wireless') -and $_.InterfaceIndex -in @(${wifi.adapters.join(',')}) } | ${action} -Confirm:$false -ErrorAction Stop`;
        await execute('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command]);
      }
      const status = await getStatus();
      if (status.wifi.enabled !== enabled) {
        throw systemError('Система не подтвердила изменение Wi-Fi. Проверь настройки сети.', 'STATE_NOT_CONFIRMED');
      }
      return status;
    } catch (error) {
      if (error.code === 'NO_WIFI_ADAPTER' || error.code === 'STATE_NOT_CONFIRMED') throw error;
      throw systemError('Не удалось переключить Wi-Fi. Система может требовать права администратора — измени его в настройках сети.', 'SYSTEM_PERMISSION');
    }
  }

  async function setBluetooth(enabled) {
    if (typeof enabled !== 'boolean') throw new TypeError('enabled must be a boolean');
    if (platform !== 'win32') throw systemError('Открой системные настройки Bluetooth для переключения.', 'UNSUPPORTED_PLATFORM', 'bluetooth');
    try {
      const command = `${WINDOWS_RADIO_BASE}; if ($radios.Count -eq 0) { throw "No Bluetooth radios" }; $access = AwaitRadio ([Windows.Devices.Radios.Radio]::RequestAccessAsync()) ([Windows.Devices.Radios.RadioAccessStatus]); if ($access -ne [Windows.Devices.Radios.RadioAccessStatus]::Allowed) { throw "Radio access denied" }; foreach ($radio in $radios) { $result = AwaitRadio ($radio.SetStateAsync([Windows.Devices.Radios.RadioState]::${enabled ? 'On' : 'Off'})) ([Windows.Devices.Radios.RadioAccessStatus]); if ($result -ne [Windows.Devices.Radios.RadioAccessStatus]::Allowed) { throw "Radio state change denied" } }`;
      await execute('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command]);
      const status = await readBluetooth();
      if (status.enabled !== enabled) throw systemError('Система не подтвердила изменение Bluetooth. Проверь настройки.', 'STATE_NOT_CONFIRMED', 'bluetooth');
      return { platform, bluetooth: status };
    } catch (error) {
      if (error.code === 'STATE_NOT_CONFIRMED') throw error;
      throw systemError('Система не разрешила переключить Bluetooth. Открой настройки Bluetooth.', 'SYSTEM_PERMISSION', 'bluetooth');
    }
  }

  return { getStatus, setWifi, setBluetooth, getSettingsUrl };
}

module.exports = { createSystemControls };
