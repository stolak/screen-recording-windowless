const express = require('express');

let isRecording = false;
let savedPath = null;
let stopCallback = null;

function startServer(mainWindow) {
  const app = express();
  app.use(express.json());

  app.post('/start', (req, res) => {
    if (isRecording) return res.status(400).json({ error: 'Already recording' });

    const { filename, path: savePath } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    mainWindow.webContents.send('start-recording', { filename, savePath });
    isRecording = true;
    savedPath = null;
    res.json({ status: 'started' });
  });

  app.post('/stop', (_req, res) => {
    if (!isRecording) return res.status(400).json({ error: 'Not recording' });
    if (stopCallback) return res.status(429).json({ error: 'A stop request is already in progress.' });

    mainWindow.webContents.send('stop-recording');

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

  const { ipcMain } = require('electron');
  ipcMain.on('recording-saved', (_e, path) => {
    savedPath = path;
    isRecording = false;

    if (stopCallback) {
      clearTimeout(stopCallback.timeout);
      stopCallback.res.json({
        status: 'saved',
        file: path,
      });
      stopCallback = null;
    }
  });

  const PORT = 4571;
  app.listen(PORT, () => {
    console.log(`REST API running at http://localhost:${PORT}`);
  });
}

module.exports = { startServer };
