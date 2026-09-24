const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function loadMain() {
  const calls = { urls: [], spawn: null, listen: null };
  const noop = () => {};
  class Window {
    constructor() { this.webContents = { setWindowOpenHandler: noop }; }
    removeMenu() {}
    loadURL(url) { calls.urls.push(url); }
    on() {}
  }
  const app = {
    isPackaged: true, getPath: () => 'C:/test-user/AppData/Roaming',
    requestSingleInstanceLock: () => true, on: noop, setAsDefaultProtocolClient: noop,
    whenReady: () => ({ then: () => ({ catch: noop }) }),
  };
  const server = { use: noop, listen: (port, host, ready) => {
    calls.listen = { port, host, ready };
    return { once: (event, callback) => { calls.serverError = callback; } };
  } };
  const express = () => server;
  express.static = noop;
  const modules = {
    electron: { app, BrowserWindow: Window, ipcMain: { on: noop },
      session: { defaultSession: { webRequest: { onBeforeSendHeaders: noop } } }, shell: {} },
    path,
    fs: { existsSync: () => true, readFileSync: file => {
      calls.config = file;
      return JSON.stringify({ api_key: 'local-test-key' });
    } },
    child_process: { spawn: (command, args, options) => {
      calls.spawn = { command, args, options };
      return { stdout: { on: noop }, stderr: { on: noop }, on: noop };
    } },
    'electron-updater': { autoUpdater: {} }, express,
  };
  const context = vm.createContext({
    require: name => { if (!(name in modules)) throw new Error(name); return modules[name]; },
    process: { resourcesPath: 'C:/installed/resources', env: {}, platform: 'win32', argv: [] },
    __dirname: 'C:/installed/resources/app', console, setTimeout, Map, URL,
  });
  const main = fs.readFileSync(path.join(__dirname, '../main.cjs'), 'utf8');
  vm.runInContext(main + '\nthis.api = { getLocalApiKey, spawnBackend, startLocalServer, createWindow };', context);
  return { calls, api: context.api };
}

test('packaged Python and Electron use the same credential directory', () => {
  const { calls, api } = loadMain();
  api.spawnBackend();
  assert.equal(api.getLocalApiKey(), 'local-test-key');
  assert.equal(path.dirname(calls.config), calls.spawn.options.env.TALKING_CROW_DATA_DIR);
  assert.equal(calls.spawn.options.env.TALKING_CROW_PORT, '8763');
  assert.equal(calls.spawn.options.windowsHide, true);
});

test('HTTP frontend readiness is awaited and window uses the allowed origin', async () => {
  const { calls, api } = loadMain();
  let ready = false;
  const started = api.startLocalServer().then(() => { ready = true; });
  await Promise.resolve();
  assert.equal(ready, false);
  assert.equal(calls.listen.host, '127.0.0.1');
  calls.listen.ready();
  await started;
  api.createWindow();
  assert.equal(calls.urls[0], 'http://127.0.0.1:5173');
});

test('a busy frontend port rejects startup', async () => {
  const { calls, api } = loadMain();
  const started = api.startLocalServer();
  calls.serverError(new Error('EADDRINUSE'));
  await assert.rejects(started, /EADDRINUSE/);
});
