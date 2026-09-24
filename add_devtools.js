const fs = require('fs');
fs.appendFileSync('frontend/main.cjs', `

const { ipcMain: myIpcMain } = require("electron");
myIpcMain.on("open-devtools", () => {
  const win = require("electron").BrowserWindow.getAllWindows()[0];
  if(win) win.webContents.openDevTools({mode:"detach"});
});
`);

const p = JSON.parse(fs.readFileSync('frontend/package.json'));
p.version = '1.2.8';
fs.writeFileSync('frontend/package.json', JSON.stringify(p, null, 2));
