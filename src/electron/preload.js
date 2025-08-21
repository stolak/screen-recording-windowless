const { contextBridge, ipcRenderer } = require('electron');

// Internal recording state for background window (independent of UI)
let mediaRecorder;
let recordedChunks = [];
let recordingOptions = {};
let recordingStartTime = null;

ipcRenderer.on('start-recording', async (_event, options) => {
  try {
    recordingOptions = options || {};

    const sources = await ipcRenderer.invoke('electron:get-desktop-sources');
    if (!sources || sources.length === 0) {
      console.error('No desktop sources found.');
      return;
    }

    // Get video stream (desktop)
    const videoStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sources[0].id,
        },
      },
    });

    // Try to get microphone audio, fallback to video-only
    let combinedStream;
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const audioTrack = audioStream.getAudioTracks()[0];
      const videoTrack = videoStream.getVideoTracks()[0];
      combinedStream = new MediaStream([videoTrack, audioTrack]);
    } catch (e) {
      console.warn('Could not get audio stream, proceeding with video only.', e);
      combinedStream = videoStream;
    }

    recordedChunks = [];
    mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm; codecs=vp9' });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      try {
        // Compute duration first and notify main
        let duration = null;
        if (recordingStartTime) {
          duration = Math.floor((Date.now() - recordingStartTime) / 1000);
          ipcRenderer.send('recording-stopped', { duration });
        }

        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const arrayBuffer = await blob.arrayBuffer();
        const filePath = await ipcRenderer.invoke('electron:save-recording', {
          arrayBuffer,
          filename: recordingOptions.filename,
          savePath: recordingOptions.savePath,
        });

        if (filePath) {
          // Add to DB
          const id = (globalThis.crypto && globalThis.crypto.randomUUID) ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const filename = recordingOptions.filename || (filePath.split(/[\\/]/).pop() || 'recording.webm');
          const record = {
            id,
            filename,
            path: filePath,
            date: new Date().toISOString(),
            duration: duration || 0,
          };
          try {
            await ipcRenderer.invoke('electron:add-recording', record);
          } catch (e) {
            console.warn('Failed to add recording to DB:', e);
          }

          ipcRenderer.send('recording-saved', filePath);
        } else {
          console.error('Failed to save recording.');
        }
      } catch (err) {
        console.error('Error finalizing recording:', err);
      }
    };

    recordingStartTime = Date.now();
    mediaRecorder.start();
  } catch (err) {
    console.error('Error starting recording (preload):', err);
  }
});

ipcRenderer.on('stop-recording', () => {
  try {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
  } catch (err) {
    console.error('Error stopping recording (preload):', err);
  }
});

contextBridge.exposeInMainWorld('electronAPI', {
  // Recording controls
  onStartRecording: (callback) => ipcRenderer.on('start-recording', callback),
  onStopRecording: (callback) => ipcRenderer.on('stop-recording', callback),
  sendRecordingStopped: (data) => ipcRenderer.send('recording-stopped', data),

  // Desktop sources
  getDesktopSources: () => ipcRenderer.invoke('electron:get-desktop-sources'),

  // File operations
  saveRecording: (options) => ipcRenderer.invoke('electron:save-recording', options),
  sendSavedPath: (path) => ipcRenderer.send('recording-saved', path),

  // Authentication
  setToken: (token) => ipcRenderer.invoke('electron:set-token', token),
  getLoginUrl: () => ipcRenderer.invoke('electron:get-login-url'),

  // Settings
  setUrl: (url) => ipcRenderer.invoke('electron:set-url', url),
  setSetting: (setting) => ipcRenderer.invoke('electron:set-setting', setting),

  // Recording database
  addRecording: (recording) => ipcRenderer.invoke('electron:add-recording', recording),
  getRecordingById: (id) => ipcRenderer.invoke('electron:get-recording-by-id', id),
  deleteRecordingById: (id) => ipcRenderer.invoke('electron:delete-recording-by-id', id),
  getAllRecordings: () => ipcRenderer.invoke('electron:get-all-recordings'),

  // Store operations
  getStoreValue: (key) => ipcRenderer.invoke('electron:get-store-value', key),
  setStoreValue: (key, value) => ipcRenderer.invoke('electron:set-store-value', key, value),
});
