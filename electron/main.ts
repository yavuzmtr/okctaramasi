import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { FileWatcherService } from './services/fileWatcher';
import { CustomerService } from './services/customerService';
import { ReportService } from './services/reportService';
import { BackupService } from './services/backupService';
import { EmailService } from './services/emailService';
import { SettingsService } from './services/settingsService';
import { DeadlineService } from './services/deadlineService';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let fileWatcher: FileWatcherService | null = null;

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    icon: path.join(__dirname, '../assets/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#1a1a2e'
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'E-Defter Yönetim Sistemi',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Aç',
      click: () => {
        mainWindow?.show();
      }
    },
    {
      label: 'Kontrol Başlat',
      click: () => {
        mainWindow?.webContents.send('start-scan');
      }
    },
    { type: 'separator' },
    {
      label: 'Çıkış',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('E-Defter Yönetim Sistemi');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow?.show();
  });
}

// IPC Handlers
function setupIpcHandlers() {
  const settingsService = new SettingsService();
  const customerService = new CustomerService();
  const reportService = new ReportService();
  const backupService = new BackupService();
  const emailService = new EmailService();
  const deadlineService = new DeadlineService();

  // Settings
  ipcMain.handle('get-settings', () => settingsService.getSettings());
  ipcMain.handle('save-settings', (_, settings) => settingsService.saveSettings(settings));

  // Folder selection
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory']
    });
    return result.filePaths[0] || null;
  });

  ipcMain.handle('select-file', async (_, filters) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: filters || [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }]
    });
    return result.filePaths[0] || null;
  });

  // Customer operations
  ipcMain.handle('load-customers', (_, filePath) => customerService.loadCustomers(filePath));
  ipcMain.handle('get-customers', () => customerService.getCustomers());

  // Scan operations
  ipcMain.handle('scan-source-folder', async (_, sourcePath) => {
    const customers = customerService.getCustomers();
    return await reportService.scanSourceFolder(sourcePath, customers);
  });

  ipcMain.handle('check-company-files', async (_, companyPath, taxNo, period) => {
    return await reportService.checkCompanyFiles(companyPath, taxNo, period);
  });

  // Report operations
  ipcMain.handle('generate-report', async (_, scanResults, outputPath) => {
    return await reportService.generateExcelReport(scanResults, outputPath);
  });

  // Backup operations
  ipcMain.handle('backup-folder', async (_, sourcePath, destPath) => {
    return await backupService.backupFolder(sourcePath, destPath);
  });

  ipcMain.handle('create-zip', async (_, sourcePath, outputPath) => {
    return await backupService.createZip(sourcePath, outputPath);
  });

  // Email operations
  ipcMain.handle('send-email', async (_, options) => {
    return await emailService.sendEmail(options);
  });

  ipcMain.handle('test-email-connection', async () => {
    return await emailService.testConnection();
  });

  // Deadline tracking
  ipcMain.handle('get-deadlines', (_, customers) => {
    return deadlineService.getUpcomingDeadlines(customers);
  });

  ipcMain.handle('get-completion-status', (_, scanResults, customers) => {
    return deadlineService.getCompletionStatus(scanResults, customers);
  });

  // File watcher
  ipcMain.handle('start-watcher', async (_, sourcePath) => {
    if (fileWatcher) {
      fileWatcher.stop();
    }
    fileWatcher = new FileWatcherService(sourcePath, mainWindow!);
    return fileWatcher.start();
  });

  ipcMain.handle('stop-watcher', () => {
    if (fileWatcher) {
      fileWatcher.stop();
      fileWatcher = null;
    }
    return true;
  });

  ipcMain.handle('get-watcher-status', () => {
    return fileWatcher?.isRunning() || false;
  });

  // Window controls
  ipcMain.on('minimize-window', () => mainWindow?.minimize());
  ipcMain.on('maximize-window', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('close-window', () => mainWindow?.hide());
}

// Auto-start configuration
function setupAutoStart() {
  const settings = new SettingsService().getSettings();
  
  app.setLoginItemSettings({
    openAtLogin: settings.autoStart || false,
    path: app.getPath('exe'),
    args: ['--hidden']
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  setupIpcHandlers();
  setupAutoStart();

  // Check if started with --hidden flag
  if (process.argv.includes('--hidden')) {
    mainWindow?.hide();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Don't quit, stay in tray
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (fileWatcher) {
    fileWatcher.stop();
  }
});

// Extend app interface
declare module 'electron' {
  interface App {
    isQuitting?: boolean;
  }
}
