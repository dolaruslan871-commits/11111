const test = require('node:test');
const assert = require('node:assert/strict');
const { createSystemControls } = require('../src/system-controls.cjs');

function stub(responses) {
  const calls = [];
  return {
    calls,
    execFile(file, args, options, callback) {
      calls.push({ file, args, options });
      const response = responses.shift();
      queueMicrotask(() => response instanceof Error ? callback(response) : callback(null, response));
    },
  };
}

const MAC_PORTS = 'Hardware Port: Ethernet\nDevice: en0\nEthernet Address: 00\n\nHardware Port: Wi-Fi\nDevice: en1\nEthernet Address: 01\n';

test('macOS detects the Wi-Fi device instead of assuming en0', async () => {
  const process = stub([MAC_PORTS, 'Wi-Fi Power (en1): On']);
  const controls = createSystemControls({ platform: 'darwin', execFile: process.execFile });
  const status = await controls.getStatus();
  assert.equal(status.wifi.enabled, true);
  assert.equal(status.wifi.supported, true);
  assert.deepEqual(process.calls[1].args, ['-getairportpower', 'en1']);
  assert.equal(process.calls[0].file, '/usr/sbin/networksetup');
});

test('macOS sets power on the detected device and verifies the resulting state', async () => {
  const process = stub([MAC_PORTS, 'Wi-Fi Power (en1): On', '', MAC_PORTS, 'Wi-Fi Power (en1): Off']);
  const controls = createSystemControls({ platform: 'darwin', execFile: process.execFile });
  const status = await controls.setWifi(false);
  assert.equal(status.wifi.enabled, false);
  assert.deepEqual(process.calls[2].args, ['-setairportpower', 'en1', 'off']);
});

test('macOS does not toggle ethernet when a Wi-Fi device is absent', async () => {
  const process = stub(['Hardware Port: Ethernet\nDevice: en0\n']);
  const controls = createSystemControls({ platform: 'darwin', execFile: process.execFile });
  await assert.rejects(controls.setWifi(false), { code: 'NO_WIFI_ADAPTER' });
  assert.equal(process.calls.length, 1);
});

test('Windows queries physical wireless adapters and toggles only validated indices', async () => {
  const process = stub(['[{"InterfaceIndex":7,"Enabled":true}]', '', '[{"InterfaceIndex":7,"Enabled":false}]', '[]']);
  const controls = createSystemControls({ platform: 'win32', execFile: process.execFile });
  const status = await controls.setWifi(false);
  assert.equal(status.wifi.enabled, false);
  assert.equal(process.calls[0].file, 'powershell.exe');
  assert.ok(process.calls[0].args.includes('-NonInteractive'));
  const command = process.calls[1].args.at(-1);
  assert.match(command, /Get-NetAdapter -Physical/);
  assert.match(command, /InterfaceIndex -in @\(7\)/);
  assert.match(command, /NdisPhysicalMedium -eq 9/);
  for (const call of [process.calls[0], process.calls[1]]) {
    // PowerShell single-quoted regex needs exactly one slash before the dot.
    const regex = call.args.at(-1).match(/-match '([^']+)'/)[1];
    assert.equal(regex, String.raw`802\.11|Wireless`);
    assert.equal(new RegExp(regex).test('Native 802.11'), true);
    assert.equal(new RegExp(regex).test('Ethernet 802x11'), false);
  }
  assert.match(command, /Disable-NetAdapter -Confirm:\$false/);
  assert.doesNotMatch(command, /Start-Process|Verb RunAs|ExecutionPolicy/);
});

test('Windows rejects unexpected adapter data before running a mutation', async () => {
  const process = stub(['[{"InterfaceIndex":"7; bad","Enabled":true}]']);
  const controls = createSystemControls({ platform: 'win32', execFile: process.execFile });
  await assert.rejects(controls.setWifi(false), { code: 'SYSTEM_PERMISSION' });
  assert.equal(process.calls.length, 1);
});

test('permission failures offer system settings without escalating privileges', async () => {
  const process = stub([MAC_PORTS, 'Wi-Fi Power (en1): On', new Error('Operation not permitted')]);
  const controls = createSystemControls({ platform: 'darwin', execFile: process.execFile });
  await assert.rejects(controls.setWifi(false), error => {
    assert.equal(error.code, 'SYSTEM_PERMISSION');
    assert.match(error.message, /настройках сети/);
    assert.match(error.settingsUrl, /^x-apple.systempreferences:/);
    return true;
  });
  assert.equal(process.calls.length, 3);
});

test('a successful command is not reported as a successful toggle unless readback agrees', async () => {
  const process = stub([MAC_PORTS, 'Wi-Fi Power (en1): On', '', MAC_PORTS, 'Wi-Fi Power (en1): On']);
  const controls = createSystemControls({ platform: 'darwin', execFile: process.execFile });
  await assert.rejects(controls.setWifi(false), { code: 'STATE_NOT_CONFIRMED' });
});

test('Bluetooth uses settings links and unsupported Linux runs no subprocesses', async () => {
  const process = stub([]);
  const controls = createSystemControls({ platform: 'linux', execFile: process.execFile });
  const status = await controls.getStatus();
  assert.equal(status.wifi.supported, false);
  assert.equal(status.bluetooth.supported, false);
  assert.equal(controls.getSettingsUrl('wifi'), null);
  assert.equal(process.calls.length, 0);
  assert.equal(createSystemControls({ platform: 'win32' }).getSettingsUrl('bluetooth'), 'ms-settings:bluetooth');
  assert.match(createSystemControls({ platform: 'darwin' }).getSettingsUrl('bluetooth'), /BluetoothSettings/);
  assert.equal(createSystemControls({ platform: 'darwin' }).getSettingsUrl('malicious'), null);
});

test('Windows Bluetooth reads the supported WinRT Radio API', async () => {
  const process = stub(['[]', '[{"Enabled":true}]']);
  const controls = createSystemControls({ platform: 'win32', execFile: process.execFile });
  const status = await controls.getStatus();
  assert.equal(status.bluetooth.supported, true);
  assert.equal(status.bluetooth.enabled, true);
  assert.match(process.calls[1].args.at(-1), /Windows.Devices.Radios.Radio/);
  assert.match(process.calls[1].args.at(-1), /Kind -eq "Bluetooth"/);
});

test('Windows Bluetooth toggle requires API approval and verifies readback', async () => {
  const process = stub(['', '[{"Enabled":false}]']);
  const controls = createSystemControls({ platform: 'win32', execFile: process.execFile });
  const status = await controls.setBluetooth(false);
  assert.equal(status.bluetooth.enabled, false);
  const command = process.calls[0].args.at(-1);
  assert.match(command, /RequestAccessAsync/);
  assert.match(command, /RadioAccessStatus\]::Allowed/);
  assert.match(command, /SetStateAsync\(\[Windows.Devices.Radios.RadioState\]::Off\)/);
  assert.doesNotMatch(command, /Start-Process|Verb RunAs|ExecutionPolicy/);
});

test('Bluetooth refuses to claim a successful toggle without matching state', async () => {
  const process = stub(['', '[{"Enabled":true}]']);
  const controls = createSystemControls({ platform: 'win32', execFile: process.execFile });
  await assert.rejects(controls.setBluetooth(false), error => {
    assert.equal(error.code, 'STATE_NOT_CONFIRMED');
    assert.equal(error.settingsUrl, 'ms-settings:bluetooth');
    return true;
  });
});

test('Bluetooth denied access offers settings without elevation', async () => {
  const process = stub([new Error('Radio access denied')]);
  const controls = createSystemControls({ platform: 'win32', execFile: process.execFile });
  await assert.rejects(controls.setBluetooth(true), { code: 'SYSTEM_PERMISSION', settingsUrl: 'ms-settings:bluetooth' });
  assert.equal(process.calls.length, 1);
  await assert.rejects(createSystemControls({ platform: 'darwin' }).setBluetooth(true), { code: 'UNSUPPORTED_PLATFORM' });
});

test('requires an explicit boolean toggle argument', async () => {
  const process = stub([]);
  const controls = createSystemControls({ platform: 'darwin', execFile: process.execFile });
  await assert.rejects(controls.setWifi('off'), TypeError);
  assert.equal(process.calls.length, 0);
});
