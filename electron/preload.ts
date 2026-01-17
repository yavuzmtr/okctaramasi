import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),

  // Folder/File selection
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectFile: (filters?: any) => ipcRenderer.invoke('select-file', filters),

  // Customer operations
  loadCustomers: (filePath: string) => ipcRenderer.invoke('load-customers', filePath),
  getCustomers: () => ipcRenderer.invoke('get-customers'),

  // Scan operations
  scanSourceFolder: (sourcePath: string) => ipcRenderer.invoke('scan-source-folder', sourcePath),
  checkCompanyFiles: (companyPath: string, taxNo: string, period: string) => 
    ipcRenderer.invoke('check-company-files', companyPath, taxNo, period),

  // Report operations
  generateReport: (scanResults: any, outputPath: string) => 
    ipcRenderer.invoke('generate-report', scanResults, outputPath),

  // Backup operations
  backupFolder: (sourcePath: string, destPath: string) => 
    ipcRenderer.invoke('backup-folder', sourcePath, destPath),
  createZip: (sourcePath: string, outputPath: string) => 
    ipcRenderer.invoke('create-zip', sourcePath, outputPath),

  // Email operations
  sendEmail: (options: any) => ipcRenderer.invoke('send-email', options),
  testEmailConnection: () => ipcRenderer.invoke('test-email-connection'),

  // Deadline tracking
  getDeadlines: (customers: any) => ipcRenderer.invoke('get-deadlines', customers),
  getCompletionStatus: (scanResults: any, customers: any) => 
    ipcRenderer.invoke('get-completion-status', scanResults, customers),

  // File watcher
  startWatcher: (sourcePath: string) => ipcRenderer.invoke('start-watcher', sourcePath),
  stopWatcher: () => ipcRenderer.invoke('stop-watcher'),
  getWatcherStatus: () => ipcRenderer.invoke('get-watcher-status'),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),

  // Event listeners
  onStartScan: (callback: () => void) => {
    ipcRenderer.on('start-scan', callback);
    return () => ipcRenderer.removeListener('start-scan', callback);
  },
  onFileChange: (callback: (data: any) => void) => {
    ipcRenderer.on('file-change', (_, data) => callback(data));
    return () => ipcRenderer.removeListener('file-change', callback);
  },
  onScanComplete: (callback: (data: any) => void) => {
    ipcRenderer.on('scan-complete', (_, data) => callback(data));
    return () => ipcRenderer.removeListener('scan-complete', callback);
  },
  onBackupComplete: (callback: (data: any) => void) => {
    ipcRenderer.on('backup-complete', (_, data) => callback(data));
    return () => ipcRenderer.removeListener('backup-complete', callback);
  },
  onEmailSent: (callback: (data: any) => void) => {
    ipcRenderer.on('email-sent', (_, data) => callback(data));
    return () => ipcRenderer.removeListener('email-sent', callback);
  },
  onError: (callback: (error: any) => void) => {
    ipcRenderer.on('error', (_, error) => callback(error));
    return () => ipcRenderer.removeListener('error', callback);
  },
  onProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('progress', (_, progress) => callback(progress));
    return () => ipcRenderer.removeListener('progress', callback);
  }
});

// Type definitions for the exposed API
export interface ElectronAPI {
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<boolean>;
  selectFolder: () => Promise<string | null>;
  selectFile: (filters?: any) => Promise<string | null>;
  loadCustomers: (filePath: string) => Promise<any[]>;
  getCustomers: () => Promise<any[]>;
  scanSourceFolder: (sourcePath: string) => Promise<any>;
  checkCompanyFiles: (companyPath: string, taxNo: string, period: string) => Promise<any>;
  generateReport: (scanResults: any, outputPath: string) => Promise<string>;
  backupFolder: (sourcePath: string, destPath: string) => Promise<boolean>;
  createZip: (sourcePath: string, outputPath: string) => Promise<string>;
  sendEmail: (options: any) => Promise<boolean>;
  testEmailConnection: () => Promise<boolean>;
  getDeadlines: (customers: any) => Promise<any>;
  getCompletionStatus: (scanResults: any, customers: any) => Promise<any>;
  startWatcher: (sourcePath: string) => Promise<boolean>;
  stopWatcher: () => Promise<boolean>;
  getWatcherStatus: () => Promise<boolean>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  onStartScan: (callback: () => void) => () => void;
  onFileChange: (callback: (data: any) => void) => () => void;
  onScanComplete: (callback: (data: any) => void) => () => void;
  onBackupComplete: (callback: (data: any) => void) => () => void;
  onEmailSent: (callback: (data: any) => void) => () => void;
  onError: (callback: (error: any) => void) => () => void;
  onProgress: (callback: (progress: any) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
