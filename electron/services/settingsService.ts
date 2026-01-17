import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface AppSettings {
  // Kaynak klasör
  sourceFolder: string;
  
  // Yedekleme ayarları
  backupFolder: string;
  autoBackup: boolean;
  
  // E-posta ayarları
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  emailFrom: string;
  emailSubjectTemplate: string;
  emailBodyTemplate: string;
  
  // Müşteri Excel dosyası
  customerExcelPath: string;
  
  // Rapor ayarları
  reportOutputFolder: string;
  
  // Otomasyon ayarları
  autoStart: boolean;
  autoWatch: boolean;
  autoEmail: boolean;
  autoBackupOnComplete: boolean;
  
  // İzleme dönemleri
  watchPeriod: 'monthly' | 'quarterly';
  
  // Son işlem logları
  processedItems: ProcessedItem[];
}

export interface ProcessedItem {
  taxNo: string;
  period: string;
  processedAt: string;
  actions: string[];
}

const DEFAULT_SETTINGS: AppSettings = {
  sourceFolder: 'C:\\Users\\YAVUZ\\Desktop\\e-defter',
  backupFolder: '',
  autoBackup: true,
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  smtpPassword: '',
  emailFrom: '',
  emailSubjectTemplate: 'E-Defter Dosyaları - {{companyName}} - {{period}}',
  emailBodyTemplate: `Sayın {{companyName}},

{{period}} dönemine ait e-defter dosyalarınız ekte gönderilmiştir.

Dosya içeriği:
- Kebir Defteri (XML ve ZIP)
- Yevmiye Defteri (XML ve ZIP)

Saygılarımızla,
E-Defter Yönetim Sistemi`,
  customerExcelPath: '',
  reportOutputFolder: '',
  autoStart: false,
  autoWatch: true,
  autoEmail: false,
  autoBackupOnComplete: true,
  watchPeriod: 'monthly',
  processedItems: []
};

export class SettingsService {
  private settingsPath: string;
  private settings: AppSettings;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.settingsPath = path.join(userDataPath, 'settings.json');
    this.settings = this.loadSettings();
  }

  private loadSettings(): AppSettings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf-8');
        const loaded = JSON.parse(data);
        return { ...DEFAULT_SETTINGS, ...loaded };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  getSettings(): AppSettings {
    return { ...this.settings };
  }

  saveSettings(newSettings: Partial<AppSettings>): boolean {
    try {
      this.settings = { ...this.settings, ...newSettings };
      
      // Ensure directory exists
      const dir = path.dirname(this.settingsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }

  addProcessedItem(item: ProcessedItem): void {
    // Check for duplicate
    const exists = this.settings.processedItems.some(
      p => p.taxNo === item.taxNo && p.period === item.period
    );
    
    if (!exists) {
      this.settings.processedItems.push(item);
      this.saveSettings({ processedItems: this.settings.processedItems });
    }
  }

  isProcessed(taxNo: string, period: string): boolean {
    return this.settings.processedItems.some(
      p => p.taxNo === taxNo && p.period === period
    );
  }

  getProcessedItems(): ProcessedItem[] {
    return [...this.settings.processedItems];
  }

  clearProcessedItems(): void {
    this.settings.processedItems = [];
    this.saveSettings({ processedItems: [] });
  }
}
