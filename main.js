require('dotenv').config();
const { app, BrowserWindow, ipcMain, desktopCapturer, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { startServer } = require('./server');
let Store;
let storePromise = (async () => {
  Store = (await import('electron-store')).default;
  return new Store();
})();

let mainWindow;
let lastRecordingDuration = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: true, // No UI
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: true,
    },
  });

  mainWindow.loadFile('index.html');
  startServer(mainWindow, () => lastRecordingDuration);

  // Set up menu
  const menuTemplate = [
    {
      label: 'Home',
      click: () => {
        mainWindow.loadFile('index.html');
      },
    },
    {
      label: 'Settings',
      click: async () => {
        const store = await storePromise;
        // const savedUrl = store.get('url');
        const savedSettings = store.get('setting');
        console.log('clelelelelSaved URL:', savedSettings);
        if (savedSettings) {
          console.log('Loading settings with saved URL:', savedSettings);
          mainWindow.loadFile('settings.html', { query: savedSettings });
        } else {
          mainWindow.loadFile('settings.html');
        }
      },
    },
    {
      label: 'Recordings',
      click: () => {
        mainWindow.loadFile('recordings.html');
      },
    },
    ,
  {
    label: 'Debug',
    submenu: [
      {
        label: 'Toggle Developer Tools',
        accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
        click: () => {
          mainWindow.webContents.toggleDevTools();
        },
      },
      { role: 'reload' },
    ],
  },
  ];
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
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

ipcMain.handle('electron:set-token', async (_event, token) => {
  const store = await storePromise;
  store.set('authToken', token);
  console.log('Token set:', token);
  return true;
});

ipcMain.handle('electron:set-url', async (_event, url) => {
  const store = await storePromise;
  store.set('url', url);
  console.log('URL set:', url);
  return true;
});

ipcMain.handle('electron:set-setting', async (_event, setting) => {
  const store = await storePromise;
  store.set('setting', setting);
  console.log('setting set:', setting);
  return true;
});

ipcMain.on('recording-stopped', (_event, data) => {
  console.log('Received duration:', data.duration);
  lastRecordingDuration = data.duration;
});
ipcMain.handle('electron:get-store-value', async (_event, key) => {
  const store = await storePromise;
  return store.get(key);
});

ipcMain.handle('electron:set-store-value', async (_event, key, value) => {
  const store = await storePromise;
  store.set(key, value);
  return true;
});

// --- Recording CRUD helpers ---
async function addRecording(recording) {
  const store = await storePromise;
  const recordings = store.get('recordings', []);
  recordings.push(recording);
  store.set('recordings', recordings);
}

async function getRecordingById(id) {
  const store = await storePromise;
  const recordings = store.get('recordings', []);
  return recordings.find(r => r.id === id);
}

async function deleteRecordingById(id) {
  const store = await storePromise;
  let recordings = store.get('recordings', []);
  recordings = recordings.filter(r => r.id !== id);
  store.set('recordings', recordings);
}

async function getAllRecordings() {
  const store = await storePromise;
  return store.get('recordings', []);
}

ipcMain.handle('electron:add-recording', async (_event, recording) => {
  await addRecording(recording);
  return true;
});
ipcMain.handle('electron:get-recording-by-id', async (_event, id) => {
  return await getRecordingById(id);
});
ipcMain.handle('electron:delete-recording-by-id', async (_event, id) => {
  await deleteRecordingById(id);
  return true;
});
ipcMain.handle('electron:get-all-recordings', async () => {
  return await getAllRecordings();
});

const getLoginUrl = async () => {
  const store = await storePromise;
  console.log(process.env.LOGIN_URL)
  return (
    store.get('setting')?.loginurl||
    process.env.LOGIN_URL ||
    'http://localhost:3000/api/auth/signin'
  );
};

ipcMain.handle('electron:get-login-url', async () => {
  return await getLoginUrl();
});

app.whenReady().then(() => {
  createWindow();

  // Enable auto-launch on login
  app.setLoginItemSettings({
    openAtLogin: true,
    path: app.getPath('exe'), // Only needed for Windows
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
