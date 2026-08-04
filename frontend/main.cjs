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
        details.requestHeaders['Authorization'] = `Bearer ${localApiKey}`;
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
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
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

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

