const { contextBridge, ipcRenderer } = require('electron');

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
