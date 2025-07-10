const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onStartRecording: (callback) => ipcRenderer.on('start-recording', callback),
  onStopRecording: (callback) => ipcRenderer.on('stop-recording', callback),
  sendSavedPath: (path) => ipcRenderer.send('recording-saved', path),
  getDesktopSources: () => {
    return ipcRenderer.invoke('electron:get-desktop-sources');
  },
  saveRecording: (saveOptions) => {
    return ipcRenderer.invoke('electron:save-recording', saveOptions);
  },
  setToken: (token) => ipcRenderer.invoke('electron:set-token', token),
  setUrl: (url) => ipcRenderer.invoke('electron:set-url', url),
  sendRecordingStopped: (data) => ipcRenderer.send('recording-stopped', data),
});
