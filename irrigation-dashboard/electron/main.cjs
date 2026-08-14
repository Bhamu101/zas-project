const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: false,   // set to true for exhibition day
    kiosk: false,         // set to true for exhibition day — locks the window fully
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
    },
  });

  win.setMenuBarVisibility(false);

  // Development mode: load the Vite dev server.
  // Later, for a production build, this changes to win.loadFile('dist/index.html').
  win.loadURL('http://localhost:5173');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});