const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, ...args) => {
      // Lista de canales permitidos para evitar inyecciones
      let validChannels = ['open-secondary-window'];
      if (validChannels.includes(channel)) {
          ipcRenderer.send(channel, ...args);
      }
    }
  }
});
