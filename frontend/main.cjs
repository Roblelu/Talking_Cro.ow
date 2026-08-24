const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');
const { autoUpdater } = require('electron-updater');

function getBackendDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend');
  }
  return path.join(__dirname, '..', 'backend');
}

function getLocalApiKey() {
  try {
    let localConfigPath;
    if (app.isPackaged) {
      localConfigPath = path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config'), 'TalkingCrow', 'local_config.json');
    } else {
      localConfigPath = path.join(__dirname, '..', 'backend', 'local_config.json');
    }
    
    if (!fs.existsSync(localConfigPath)) return "";
    const configData = JSON.parse(fs.readFileSync(localConfigPath, 'utf8'));
    return configData.api_key || "";
  } catch (error) {
    console.error("No se pudo cargar la credencial local del backend:", error);
    return "";
  }
}

let backendProcess = null;

const express = require('express');

let localServer = null;
function startLocalServer() {
  if (isDev) return; // En dev, Vite ya está levantado

  const serverApp = express();
  const distPath = path.join(__dirname, 'dist');
  
  // Habilitar CORS simple para que OBS no sufra
  serverApp.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
  });

  // Servir archivos estáticos
  serverApp.use(express.static(distPath));

  // Fallback para React Router
  serverApp.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  localServer = serverApp.listen(5173, '127.0.0.1', () => {
    console.log('Micro-servidor para OBS activo en http://localhost:5173');
  }).on('error', (err) => {
    console.error('Error al iniciar micro-servidor:', err);
  });
}

function spawnBackend() {
  if (app.isPackaged) {
    const exePath = path.join(getBackendDir(), 'app.exe');
    if (fs.existsSync(exePath)) {
      backendProcess = spawn(exePath, [], {
        cwd: getBackendDir(),
        detached: false, // We want it to be a child process
        windowsHide: true,
      });
      backendProcess.stdout.on('data', (data) => console.log(`[Backend]: ${data}`));
      backendProcess.stderr.on('data', (data) => console.error(`[Backend ERR]: ${data}`));
    } else {
      console.error("No se encontrÃ³ el ejecutable del backend en:", exePath);
    }
  }
}


let authHookRegistered = false;
let cleanupStarted = false;

function registerLocalAuthHook() {
  if (authHookRegistered) return;
  authHookRegistered = true;
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['http://127.0.0.1:8763/api/*'] },
    (details, callback) => {
      const localApiKey = getLocalApiKey();
      const isPublicAudioRead = details.method === 'GET' && details.url.includes('/api/audio/');
      if (localApiKey && !isPublicAudioRead) {
        details.requestHeaders['Authorization'] = `Bearer ${localApiKey}`;
      }
      callback({ requestHeaders: details.requestHeaders });
    }
  );
}

let mainWindow = null;

function createWindow() {
  registerLocalAuthHook();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#050505',
    title: 'Talking Cro.ow',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.removeMenu();

  if (isDev) {
    mainWindow.loadURL('http://localhost:5175');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  let isQuitting = false;
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.webContents.executeJavaScript(`
        document.body.innerHTML = "<div style='display:flex;height:100vh;background:#000;color:#ff003c;align-items:center;justify-content:center;font-family:Orbitron;font-size:2rem;text-shadow:0 0 10px #ff003c;'><style>@keyframes blink { 0% { opacity: 0.2; } 20% { opacity: 1; } 100% { opacity: 0.2; } }.dot { animation: blink 1.4s infinite both; }.dot:nth-child(2) { animation-delay: 0.2s; }.dot:nth-child(3) { animation-delay: 0.4s; }</style>Apagando Sistema<span class='dot'>.</span><span class='dot'>.</span><span class='dot'>.</span></div>";
      `);
      isQuitting = true;
      setTimeout(cleanupAndQuit, 3000);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Permitir popups para la autenticaciÃ³n de Firebase y Google
    if (url.includes('firebaseapp.com') || url.includes('accounts.google.com')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 500,
          height: 700,
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        }
      };
    }
    return { action: 'deny' };
  });
}

// EngaÃ±ar a Google para que piense que somos un navegador Edge normal y no Electron
app.userAgentFallback = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0";

function handleDeepLink(urlStr) {
  try {
    const url = new URL(urlStr);
    if (url.hostname === 'auth' || url.pathname.includes('auth')) {
      const token = url.searchParams.get('token');
      if (token && mainWindow) {
        mainWindow.webContents.send('desktop-auth-token', token);
      }
    }
  } catch(e) {
    console.error("Invalid deep link:", urlStr);
  }
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const deepLinkUrl = commandLine.find((arg) => arg.startsWith('talkingcrow://'));
    if (deepLinkUrl) handleDeepLink(deepLinkUrl);
  });
  
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('talkingcrow', process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient('talkingcrow');
  }

  app.on('open-url', (event, url) => {
    event.preventDefault();
    if (app.isReady()) {
      handleDeepLink(url);
    } else {
      app.once('ready', () => handleDeepLink(url));
    }
  });

  app.whenReady().then(() => {
    spawnBackend();
    startLocalServer();
    createWindow();
    if (app.isPackaged) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    cleanupAndQuit();
  }
});

async function cleanupAndQuit() {
  if (cleanupStarted) return;
  cleanupStarted = true;
  const localApiKey = getLocalApiKey();
  if (localApiKey) {
    try {
      await fetch('http://127.0.0.1:8763/api/shutdown', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localApiKey}` },
        signal: AbortSignal.timeout(1500)
      });
    } catch (_) {
      // El backend puede estar apagado; Electron debe poder cerrarse igualmente.
    }
  }
  
  if (localServer) localServer.close();
  if (backendProcess) {
    try {
      backendProcess.kill();
    } catch (e) {
      console.error("Error matando backendProcess:", e);
    }
  }
  app.exit(0);
}

ipcMain.on('close-main-window', (event) => {
  if (mainWindow && event.sender === mainWindow.webContents) cleanupAndQuit();
});

ipcMain.on('open-external-url', (event, url) => {
  shell.openExternal(url);
});

const allowedSecondaryRoutes = new Map([
  ['sounds', 'Efectos de Sonido'],
  ['stickers', 'Stickers']
]);
const secondaryWindows = new Map();
ipcMain.on('open-secondary-window', (event, route) => {
  if (!mainWindow || event.sender !== mainWindow.webContents || !allowedSecondaryRoutes.has(route)) return;
  const existingWindow = secondaryWindows.get(route);
  if (existingWindow && !existingWindow.isDestroyed()) {
    existingWindow.focus();
    return;
  }
  const secWindow = new BrowserWindow({
    width: 600,
    height: 700,
    backgroundColor: '#050505',
    title: allowedSecondaryRoutes.get(route),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  secondaryWindows.set(route, secWindow);
  secWindow.on('closed', () => {
    secondaryWindows.delete(route);
  });
  secWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  secWindow.removeMenu();
  if (isDev) {
    secWindow.loadURL(`http://localhost:5175/#${route}`);
  } else {
    secWindow.loadFile(path.join(__dirname, 'dist', 'index.html'), { hash: route });
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

