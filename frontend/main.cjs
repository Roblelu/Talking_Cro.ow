const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');

let localApiKey = "";
try {
  const configPath = path.join(__dirname, '..', 'backend', 'config.json');
  if (fs.existsSync(configPath)) {
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    localApiKey = configData.api_key || "";
  }
} catch (error) {
  console.error("No se pudo cargar la API Key del backend:", error);
}

let mainWindow = null;

function createWindow() {
  if (localApiKey) {
    session.defaultSession.webRequest.onBeforeSendHeaders(
      { urls: ['http://127.0.0.1:8763/api/*'] },
      (details, callback) => {
        // No inyectar Authorization en la ruta de audios porque HTML5 <audio> 
        // falla si se le añaden cabeceras custom cross-origin.
        if (!details.url.includes('/api/audio/')) {
            details.requestHeaders['Authorization'] = `Bearer ${localApiKey}`;
        }
        callback({ requestHeaders: details.requestHeaders });
      }
    );
  }

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
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('open-secondary-window', (event, route, windowTitle) => {
  const secWindow = new BrowserWindow({
    width: 600,
    height: 700,
    backgroundColor: '#050505',
    title: windowTitle,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
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

