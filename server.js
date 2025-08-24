const express = require('express');
const cors = require('cors');
const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data'); // Add this for multipart upload
const { title } = require('process');
let Store;
let storePromise = (async () => {
  Store = (await import('electron-store')).default;
  return new Store();
})();

let isRecording = false;
let savedPath = null;
let stopCallback = null;
let uploadMeta = {};

function startServer(mainWindow, getBackgroundWindow, getDuration) {
  const app = express();
  app.use(cors()); 
  app.use(express.json());

  app.post('/start', (req, res) => {
    if (isRecording) return res.status(400).json({ error: 'Already recording' });

    const { filename, path: savePath } = req.body;
   

    const bgWindow = getBackgroundWindow();// can i make await here
    bgWindow.webContents.send('start-recording', { filename, savePath });
    isRecording = true;
    savedPath = null;
    res.json({ status: 'started' });
  });

  app.post('/stop', (req, res) => {
    if (!isRecording) return res.status(400).json({ error: 'Not recording' });
    if (stopCallback) return res.status(429).json({ error: 'A stop request is already in progress.' });
console.log("preparing to stop")
    // Store interactionId and token for upload
    uploadMeta = {
      interactionId: req.body.interactionId,
      token: req.body.token,
      title: req.body.title || 'Screen Recording',
      description: req.body.description || 'Screen recording uploaded from Electron app',
      url: req.body.url,
      duration: getDuration ? getDuration() : null, // add duration from main process
    };

    
    const bgWindow = getBackgroundWindow();
    bgWindow.webContents.send('stop-recording');

    const timeout = setTimeout(() => {
      if (stopCallback) {
        stopCallback.res.status(500).json({ error: 'Stopping the recording timed out.' });
        stopCallback = null;
      }
    }, 30000); // 30-second timeout

    stopCallback = { res, timeout };
  });

  app.get('/status', (_req, res) => {
    res.json({ recording: isRecording, file: savedPath });
  });

  app.get('/last-duration', (_req, res) => {
    res.json({ duration: getDuration ? getDuration() : null });
  });

  ipcMain.on('recording-saved', (_e, filePath) => {
    savedPath = filePath;
    isRecording = false;

    let durationValue = null;
    try {
      durationValue = getDuration ? getDuration() : null;
    } catch (err) {
      console.error('Error calling getDuration:', err);
    }
    uploadMeta.duration = durationValue;


    if (stopCallback) {
      clearTimeout(stopCallback.timeout);
      stopCallback.res.json({
        status: 'saved',
        file: filePath,
      });
      stopCallback = null;
    }

    // Start upload in the background
    uploadFileToServer(filePath, uploadMeta).catch(err => {
      console.error('Background upload error:', err);
    });
  });

  const PORT = 4571;
  app.listen(PORT, () => {
    console.log(`REST API running at http://localhost:${PORT}`);
  });
}

async function uploadFileToServer(filePath, meta) {
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), path.basename(filePath));
    
     
      form.append('interactionId', meta?.interactionId || '');
      form.append('title', meta?.title || 'Screen Recording');
      form.append('description', meta?.description || 'Screen recording uploaded from Electron app');
    
    // Add the recording duration if present
    if (meta.duration) {
      form.append('duration', meta.duration);
    }
    const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));
    const headers = {
      ...form.getHeaders(),
    };
    // Use authToken from store if it exists, otherwise use meta.token
    const store = await storePromise;
    const storedToken = store.get('authToken');
    const storedUrl = store.get('setting')?.videourl || meta.url;

    if (storedToken) {
      headers['Authorization'] = `Bearer ${storedToken}`;
    } else if (meta.token) {
      headers['Authorization'] = `Bearer ${meta.token}`;
    }
  
    const response = await fetch(storedUrl ? `${storedUrl}` : `${meta.url}/api/v1/upload-file`, {
      method: 'POST',
      headers,
      body: form,
    });
    if (!response.ok) {
      console.error('File upload failed:', response.statusText);
    } else {

      const responseData = await response.json();
      console.log('Upload response:', responseData);
    }
  } catch (err) {
    console.error('Error uploading file:', err);
  }
}

module.exports = { startServer };
