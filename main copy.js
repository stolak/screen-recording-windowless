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
let backgroundWindow;
let lastRecordingDuration = null;

function createBackgroundWindow() {
  backgroundWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(app.getAppPath(), 'src/electron/preload.js'),
      devTools: false,
    },
  });
  
  // Load the React app in background window
  // if (process.env.NODE_ENV === 'development') {
  //   console.log('Loading background window in development mode');
  //   backgroundWindow.loadURL('http://localhost:5173');
  // } else {
  //   console.log('Loading background window in production mode');

  //   backgroundWindow.loadFile(path.join(__dirname, 'build', 'index.html'));

  // }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(app.getAppPath(), 'src/electron/preload.js'),
      devTools: true,
    },
  });
  mainWindow.loadURL('http://localhost:5173');
  // Load the React app
  // if (process.env.NODE_ENV === 'development') {
  //   mainWindow.loadURL('http://localhost:5173');
  //   // Open DevTools in development
  //   mainWindow.webContents.openDevTools();
  // } else {
  //   mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));
  // }

  startServer(mainWindow, getBackgroundWindow, () => lastRecordingDuration);

  // Set up menu
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Home',
          click: () => {
            mainWindow.loadURL(process.env.NODE_ENV === 'development' 
              ? 'http://localhost:5173/home' 
              : `file://${path.join(__dirname, 'build', 'index.html')}#/home`
            );
          },
        },
        {
          label: 'Settings',
          click: () => {
            mainWindow.loadURL(process.env.NODE_ENV === 'development' 
              ? 'http://localhost:5173/settings' 
              : `file://${path.join(__dirname, 'build', 'index.html')}#/settings`
            );
          },
        },
        {
          label: 'Recordings',
          click: () => {
            mainWindow.loadURL(process.env.NODE_ENV === 'development' 
              ? 'http://localhost:5173/recordings' 
              : `file://${path.join(__dirname, 'build', 'index.html')}#/recordings`
            );
          },
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
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

function getBackgroundWindow() {
  return backgroundWindow;
}

// IPC handlers
ipcMain.handle('electron:get-desktop-sources', async () => {
  return await desktopCapturer.getSources({ types: ['screen'] });
});

ipcMain.handle('electron:save-recording', async (_event, { arrayBuffer, filename, savePath }) => {
  const buffer = Buffer.from(arrayBuffer);
  const recordingsDir = savePath || path.join(process.cwd(), 'recorded_screen');

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

// Recording CRUD helpers
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
  const toDelete = recordings.find(r => r.id === id);
  recordings = recordings.filter(r => r.id !== id);
  store.set('recordings', recordings);
  
  // Unlink the file if it exists
  if (toDelete && toDelete.path) {
    try {
      await fs.promises.unlink(toDelete.path);
      console.log('Deleted file:', toDelete.path);
    } catch (err) {
      console.warn('Could not delete file:', toDelete.path, err.message);
    }
  }
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
  console.log(process.env.LOGIN_URL);
  return (
    store.get('setting')?.loginurl ||
    process.env.LOGIN_URL ||
    'http://localhost:3000/api/auth/signin'
  );
};

ipcMain.handle('electron:get-login-url', async () => {
  return await getLoginUrl();
});

// App lifecycle
app.whenReady().then(() => {
  console.log('App is ready');
  createBackgroundWindow();
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
  if (backgroundWindow) {
    backgroundWindow.close();
  }
  if (process.platform !== 'darwin') app.quit();
});

module.exports = { startServer, getBackgroundWindow };
