import * as fs from 'fs';
import * as path from 'path';
import { BrowserWindow } from 'electron';
import { ReportService, PeriodCheckResult } from './reportService';
import { CustomerService } from './customerService';
import { BackupService } from './backupService';
import { EmailService } from './emailService';
import { SettingsService } from './settingsService';

interface WatchedFolder {
  taxNo: string;
  fiscalYear: string;
  month: string;
  fullPath: string;
}

export class FileWatcherService {
  private sourcePath: string;
  private mainWindow: BrowserWindow;
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private running: boolean = false;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private reportService: ReportService;
  private customerService: CustomerService;
  private backupService: BackupService;
  private emailService: EmailService;
  private settingsService: SettingsService;

  constructor(sourcePath: string, mainWindow: BrowserWindow) {
    this.sourcePath = sourcePath;
    this.mainWindow = mainWindow;
    this.reportService = new ReportService();
    this.customerService = new CustomerService();
    this.backupService = new BackupService();
    this.emailService = new EmailService();
    this.settingsService = new SettingsService();
  }

  start(): boolean {
    if (this.running) {
      return true;
    }

    try {
      // Watch the source folder recursively
      this.watchFolder(this.sourcePath);
      this.running = true;
      
      this.sendToRenderer('watcher-started', { sourcePath: this.sourcePath });
      console.log('File watcher started for:', this.sourcePath);
      
      return true;
    } catch (error) {
      console.error('Failed to start file watcher:', error);
      this.sendToRenderer('error', { message: 'Klasör izleme başlatılamadı', error });
      return false;
    }
  }

  stop(): void {
    this.watchers.forEach((watcher, path) => {
      watcher.close();
    });
    this.watchers.clear();
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    this.running = false;
    
    this.sendToRenderer('watcher-stopped', {});
    console.log('File watcher stopped');
  }

  isRunning(): boolean {
    return this.running;
  }

  private watchFolder(folderPath: string): void {
    if (!fs.existsSync(folderPath)) {
      return;
    }

    // Watch the main folder
    const watcher = fs.watch(folderPath, { recursive: true }, (eventType, filename) => {
      if (filename) {
        this.handleFileChange(eventType, path.join(folderPath, filename));
      }
    });

    this.watchers.set(folderPath, watcher);
  }

  private handleFileChange(eventType: string, filePath: string): void {
    // Debounce multiple rapid changes
    const debounceKey = filePath;
    
    if (this.debounceTimers.has(debounceKey)) {
      clearTimeout(this.debounceTimers.get(debounceKey));
    }

    this.debounceTimers.set(debounceKey, setTimeout(async () => {
      this.debounceTimers.delete(debounceKey);
      await this.processFileChange(filePath);
    }, 2000)); // Wait 2 seconds for all files to be written
  }

  private async processFileChange(filePath: string): Promise<void> {
    try {
      // Parse the file path to extract information
      const parsed = this.parseFilePath(filePath);
      if (!parsed) {
        return;
      }

      const { taxNo, fiscalYear, month, fileName } = parsed;

      // Check if this is an e-defter file
      if (!this.isEDefterFile(fileName)) {
        return;
      }

      console.log('E-Defter file change detected:', { taxNo, fiscalYear, month, fileName });

      // Send notification to renderer
      this.sendToRenderer('file-change', {
        taxNo,
        fiscalYear,
        month,
        fileName,
        filePath,
        timestamp: new Date().toISOString()
      });

      // Check if the period is now complete
      const periodPath = path.join(this.sourcePath, taxNo, fiscalYear, month);
      const year = fiscalYear.split('-')[0].split('.')[2];
      const period = `${year}${month}`;

      const checkResult = await this.reportService.checkCompanyFiles(periodPath, taxNo, period);

      // Get customer info
      const customer = this.customerService.getCustomerByTaxNo(taxNo);
      if (customer) {
        checkResult.companyName = customer.companyName;
        checkResult.customerEmail = customer.email;
        checkResult.taxType = customer.taxType;
      }

      // If period is complete, trigger automation
      if (checkResult.isComplete) {
        await this.handleCompletePeriod(checkResult, periodPath);
      } else {
        this.sendToRenderer('period-incomplete', checkResult);
      }

    } catch (error) {
      console.error('Error processing file change:', error);
      this.sendToRenderer('error', { message: 'Dosya değişikliği işlenirken hata oluştu', error });
    }
  }

  private parseFilePath(filePath: string): { taxNo: string; fiscalYear: string; month: string; fileName: string } | null {
    // Expected path format: sourcePath\taxNo\fiscalYear\month\fileName
    // e.g., C:\e-defter\65761200298\01.01.2025-31.12.2025\06\GIB-65761200298-202506-KB-000000.xml

    const relativePath = path.relative(this.sourcePath, filePath);
    const parts = relativePath.split(path.sep);

    if (parts.length < 4) {
      return null;
    }

    const [taxNo, fiscalYear, month, ...fileNameParts] = parts;
    const fileName = fileNameParts.join(path.sep);

    // Validate taxNo (should be numeric)
    if (!/^\d+$/.test(taxNo)) {
      return null;
    }

    // Validate fiscalYear format
    if (!/^\d{2}\.\d{2}\.\d{4}-\d{2}\.\d{2}\.\d{4}$/.test(fiscalYear)) {
      return null;
    }

    // Validate month format
    if (!/^(0[1-9]|1[0-2])$/.test(month)) {
      return null;
    }

    return { taxNo, fiscalYear, month, fileName };
  }

  private isEDefterFile(fileName: string): boolean {
    // Check if file matches e-defter patterns
    const patterns = [
      /^GIB-\d+-\d{6}-KB-\d+\.(xml|zip)$/i,  // Kebir
      /^GIB-\d+-\d{6}-YB-\d+\.(xml|zip)$/i   // Yevmiye
    ];

    return patterns.some(pattern => pattern.test(fileName));
  }

  private async handleCompletePeriod(periodResult: PeriodCheckResult, periodPath: string): Promise<void> {
    const settings = this.settingsService.getSettings();

    // Check if already processed
    if (this.settingsService.isProcessed(periodResult.taxNo, periodResult.period)) {
      console.log('Period already processed:', periodResult.taxNo, periodResult.period);
      return;
    }

    const actions: string[] = [];

    this.sendToRenderer('period-complete', {
      ...periodResult,
      message: `${periodResult.companyName} - ${periodResult.periodDisplay} dönemi tamamlandı!`
    });

    try {
      // 1. Create backup if enabled
      if (settings.autoBackupOnComplete && settings.backupFolder) {
        const backupResult = await this.backupService.backupFolder(
          periodPath,
          path.join(settings.backupFolder, periodResult.taxNo, periodResult.period)
        );
        
        if (backupResult) {
          actions.push('backup');
          this.sendToRenderer('backup-complete', {
            taxNo: periodResult.taxNo,
            period: periodResult.period,
            backupPath: path.join(settings.backupFolder, periodResult.taxNo, periodResult.period)
          });
        }
      }

      // 2. Create ZIP and send email if enabled
      if (settings.autoEmail && periodResult.customerEmail) {
        // Create temp ZIP file
        const tempZipPath = path.join(
          require('os').tmpdir(),
          `e-defter-${periodResult.taxNo}-${periodResult.period}.zip`
        );

        const zipPath = await this.backupService.createZip(periodPath, tempZipPath);

        if (zipPath) {
          // Send email
          const emailResult = await this.emailService.sendEmail({
            to: periodResult.customerEmail,
            subject: this.formatTemplate(settings.emailSubjectTemplate, periodResult),
            body: this.formatTemplate(settings.emailBodyTemplate, periodResult),
            attachments: [{ path: zipPath }]
          });

          if (emailResult) {
            actions.push('email');
            this.sendToRenderer('email-sent', {
              taxNo: periodResult.taxNo,
              period: periodResult.period,
              email: periodResult.customerEmail
            });
          }

          // Clean up temp file
          try {
            fs.unlinkSync(tempZipPath);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      }

      // 3. Generate report
      if (settings.reportOutputFolder) {
        const customers = this.customerService.getCustomers();
        const scanResult = await this.reportService.scanSourceFolder(this.sourcePath, customers);
        const reportPath = await this.reportService.generateExcelReport(scanResult, settings.reportOutputFolder);
        
        actions.push('report');
        this.sendToRenderer('report-generated', { reportPath });
      }

      // Mark as processed
      this.settingsService.addProcessedItem({
        taxNo: periodResult.taxNo,
        period: periodResult.period,
        processedAt: new Date().toISOString(),
        actions
      });

    } catch (error) {
      console.error('Error handling complete period:', error);
      this.sendToRenderer('error', { 
        message: 'Tam otomasyon sırasında hata oluştu',
        taxNo: periodResult.taxNo,
        period: periodResult.period,
        error 
      });
    }
  }

  private formatTemplate(template: string, periodResult: PeriodCheckResult): string {
    return template
      .replace(/\{\{companyName\}\}/g, periodResult.companyName || '')
      .replace(/\{\{taxNo\}\}/g, periodResult.taxNo)
      .replace(/\{\{period\}\}/g, periodResult.periodDisplay)
      .replace(/\{\{periodCode\}\}/g, periodResult.period);
  }

  private sendToRenderer(channel: string, data: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }
}
