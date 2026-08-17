const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  openExternal: (url) => {
    ipcRenderer.send('open-external-url', url);
  },
  onAuthToken: (callback) => {
    const subscription = (event, token) => callback(token);
    ipcRenderer.on('desktop-auth-token', subscription);
    return () => ipcRenderer.removeListener('desktop-auth-token', subscription);
  },
  ipcRenderer: {
    send: (channel, ...args) => {
      // Lista de canales permitidos para evitar inyecciones
      let validChannels = ['open-secondary-window', 'close-main-window'];
      if (validChannels.includes(channel)) {
          ipcRenderer.send(channel, ...args);
      }
    }
  }
});
