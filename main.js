const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { startServer } = require('./server');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false, // No UI
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile('index.html');
  startServer(mainWindow);
}

ipcMain.handle('electron:get-desktop-sources', async () => {
  return await desktopCapturer.getSources({ types: ['screen'] });
});

ipcMain.handle('electron:save-recording', async (_event, { arrayBuffer, filename, savePath }) => {
  const buffer = Buffer.from(arrayBuffer);
  const recordingsDir = savePath || path.join(os.homedir(), 'Desktop');

  // Ensure the directory exists
  try {
    await fs.promises.mkdir(recordingsDir, { recursive: true });
  } catch (err) {
    console.error('Failed to create directory:', err);
    return null;
  }

  const finalFilename = filename.endsWith('.webm') ? filename : `${filename}.webm`;
  const filePath = path.join(recordingsDir, finalFilename);

  try {
    await fs.promises.writeFile(filePath, buffer);
    return filePath;
  } catch (err) {
    console.error('Failed to save recording:', err);
    return null;
  }
});

app.whenReady().then(createWindow);
