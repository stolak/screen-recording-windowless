import { contextBridge, ipcRenderer } from 'electron';

// Type definitions for the electronAPI
export interface ElectronAPI {
  // Recording controls
  onStartRecording: (callback: (event: any, options: any) => void) => void;
  onStopRecording: (callback: () => void) => void;
  sendRecordingStopped: (data: { duration: number }) => void;
  
  // Desktop sources
  getDesktopSources: () => Promise<any[]>;
  
  // File operations
  saveRecording: (options: { arrayBuffer: ArrayBuffer; filename: string; savePath?: string }) => Promise<string | null>;
  sendSavedPath: (path: string) => void;
  
  // Authentication
  setToken: (token: string) => Promise<boolean>;
  getLoginUrl: () => Promise<string>;
  
  // Settings
  setUrl: (url: string) => Promise<boolean>;
  setSetting: (setting: any) => Promise<boolean>;
  
  // Recording database
  addRecording: (recording: Recording) => Promise<boolean>;
  getRecordingById: (id: string) => Promise<Recording | undefined>;
  deleteRecordingById: (id: string) => Promise<boolean>;
  getAllRecordings: () => Promise<Recording[]>;
  
  // Store operations
  getStoreValue: (key: string) => Promise<any>;
  setStoreValue: (key: string, value: any) => Promise<boolean>;
}

export interface Recording {
  id: string;
  filename: string;
  path: string;
  date: string;
  duration: number;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  onStartRecording: (callback: (event: any, options: any) => void) => 
    ipcRenderer.on('start-recording', callback),
  onStopRecording: (callback: () => void) => 
    ipcRenderer.on('stop-recording', callback),
  sendRecordingStopped: (data: { duration: number }) => 
    ipcRenderer.send('recording-stopped', data),
  
  getDesktopSources: () => 
    ipcRenderer.invoke('electron:get-desktop-sources'),
  
  saveRecording: (options: { arrayBuffer: ArrayBuffer; filename: string; savePath?: string }) => 
    ipcRenderer.invoke('electron:save-recording', options),
  sendSavedPath: (path: string) => 
    ipcRenderer.send('recording-saved', path),
  
  setToken: (token: string) => 
    ipcRenderer.invoke('electron:set-token', token),
  getLoginUrl: () => 
    ipcRenderer.invoke('electron:get-login-url'),
  
  setUrl: (url: string) => 
    ipcRenderer.invoke('electron:set-url', url),
  setSetting: (setting: any) => 
    ipcRenderer.invoke('electron:set-setting', setting),
  
  addRecording: (recording: Recording) => 
    ipcRenderer.invoke('electron:add-recording', recording),
  getRecordingById: (id: string) => 
    ipcRenderer.invoke('electron:get-recording-by-id', id),
  deleteRecordingById: (id: string) => 
    ipcRenderer.invoke('electron:delete-recording-by-id', id),
  getAllRecordings: () => 
    ipcRenderer.invoke('electron:get-all-recordings'),
  
  getStoreValue: (key: string) => 
    ipcRenderer.invoke('electron:get-store-value', key),
  setStoreValue: (key: string, value: any) => 
    ipcRenderer.invoke('electron:set-store-value', key, value),
} as ElectronAPI);

// Type declaration for the global window object
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
