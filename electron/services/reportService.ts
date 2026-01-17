import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { Customer } from './customerService';

export interface FileCheckResult {
  fileName: string;
  fileType: 'KB-XML' | 'KB-ZIP' | 'YB-XML' | 'YB-ZIP' | 'OTHER';
  exists: boolean;
  filePath?: string;
  fileSize?: number;
  modifiedDate?: Date;
}

export interface PeriodCheckResult {
  taxNo: string;
  companyName: string;
  period: string;           // YYYYMM format
  periodDisplay: string;    // "Ocak 2025" format
  folderPath: string;
  folderExists: boolean;
  files: FileCheckResult[];
  isComplete: boolean;
  kebirXmlExists: boolean;
  kebirZipExists: boolean;
  yevmiyeXmlExists: boolean;
  yevmiyeZipExists: boolean;
  lastModified?: Date;
  customerEmail?: string;
  taxType?: 'gelir' | 'kurumlar';
}

export interface ScanResult {
  scanDate: Date;
  sourceFolder: string;
  totalCompanies: number;
  totalPeriods: number;
  completePeriods: number;
  incompletePeriods: number;
  companies: CompanyScanResult[];
}

export interface CompanyScanResult {
  taxNo: string;
  companyName: string;
  folderPath: string;
  fiscalYearFolders: string[];
  periods: PeriodCheckResult[];
  email?: string;
  taxType?: 'gelir' | 'kurumlar';
}

const MONTH_NAMES_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export class ReportService {
  
  async scanSourceFolder(sourcePath: string, customers: Customer[]): Promise<ScanResult> {
    const result: ScanResult = {
      scanDate: new Date(),
      sourceFolder: sourcePath,
      totalCompanies: 0,
      totalPeriods: 0,
      completePeriods: 0,
      incompletePeriods: 0,
      companies: []
    };

    if (!fs.existsSync(sourcePath)) {
      throw new Error('Kaynak klasör bulunamadı: ' + sourcePath);
    }

    // Get all company folders (tax number folders)
    const companyFolders = fs.readdirSync(sourcePath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const taxNo of companyFolders) {
      const companyPath = path.join(sourcePath, taxNo);
      const customer = customers.find(c => c.taxNo === taxNo || c.tcNo === taxNo);
      
      const companyResult: CompanyScanResult = {
        taxNo,
        companyName: customer?.companyName || taxNo,
        folderPath: companyPath,
        fiscalYearFolders: [],
        periods: [],
        email: customer?.email,
        taxType: customer?.taxType
      };

      // Get fiscal year folders (e.g., "01.01.2025-31.12.2025")
      const fiscalYears = fs.readdirSync(companyPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .filter(dirent => /^\d{2}\.\d{2}\.\d{4}-\d{2}\.\d{2}\.\d{4}$/.test(dirent.name))
        .map(dirent => dirent.name);

      companyResult.fiscalYearFolders = fiscalYears;

      for (const fiscalYear of fiscalYears) {
        const fiscalYearPath = path.join(companyPath, fiscalYear);
        
        // Get month folders (01, 02, ..., 12)
        const monthFolders = fs.readdirSync(fiscalYearPath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .filter(dirent => /^(0[1-9]|1[0-2])$/.test(dirent.name))
          .map(dirent => dirent.name);

        for (const month of monthFolders) {
          const monthPath = path.join(fiscalYearPath, month);
          const year = fiscalYear.split('-')[0].split('.')[2];
          const period = `${year}${month}`;
          
          const periodResult = await this.checkCompanyFiles(monthPath, taxNo, period);
          periodResult.companyName = companyResult.companyName;
          periodResult.customerEmail = customer?.email;
          periodResult.taxType = customer?.taxType;
          
          companyResult.periods.push(periodResult);
          result.totalPeriods++;
          
          if (periodResult.isComplete) {
            result.completePeriods++;
          } else {
            result.incompletePeriods++;
          }
        }
      }

      if (companyResult.fiscalYearFolders.length > 0 || companyResult.periods.length > 0) {
        result.companies.push(companyResult);
        result.totalCompanies++;
      }
    }

    return result;
  }

  async checkCompanyFiles(folderPath: string, taxNo: string, period: string): Promise<PeriodCheckResult> {
    const month = parseInt(period.slice(-2));
    const year = period.slice(0, 4);
    
    const result: PeriodCheckResult = {
      taxNo,
      companyName: '',
      period,
      periodDisplay: `${MONTH_NAMES_TR[month - 1]} ${year}`,
      folderPath,
      folderExists: fs.existsSync(folderPath),
      files: [],
      isComplete: false,
      kebirXmlExists: false,
      kebirZipExists: false,
      yevmiyeXmlExists: false,
      yevmiyeZipExists: false
    };

    if (!result.folderExists) {
      return result;
    }

    // Expected file patterns
    // GIB-[VergiNo]-YYYYMM-KB-000000.xml (Kebir Defteri XML)
    // GIB-[VergiNo]-YYYYMM-KB-000000.zip (Kebir Defteri ZIP)
    // GIB-[VergiNo]-YYYYMM-YB-000000.xml (Yevmiye Defteri XML)
    // GIB-[VergiNo]-YYYYMM-YB-000000.zip (Yevmiye Defteri ZIP)

    const files = fs.readdirSync(folderPath);
    let lastModified: Date | undefined;

    // Check for Kebir XML
    const kebirXmlPattern = new RegExp(`^GIB-${taxNo}-${period}-KB-\\d+\\.xml$`, 'i');
    const kebirXmlFile = files.find(f => kebirXmlPattern.test(f));
    if (kebirXmlFile) {
      const filePath = path.join(folderPath, kebirXmlFile);
      const stats = fs.statSync(filePath);
      result.kebirXmlExists = true;
      result.files.push({
        fileName: kebirXmlFile,
        fileType: 'KB-XML',
        exists: true,
        filePath,
        fileSize: stats.size,
        modifiedDate: stats.mtime
      });
      if (!lastModified || stats.mtime > lastModified) {
        lastModified = stats.mtime;
      }
    } else {
      result.files.push({
        fileName: `GIB-${taxNo}-${period}-KB-000000.xml`,
        fileType: 'KB-XML',
        exists: false
      });
    }

    // Check for Kebir ZIP
    const kebirZipPattern = new RegExp(`^GIB-${taxNo}-${period}-KB-\\d+\\.zip$`, 'i');
    const kebirZipFile = files.find(f => kebirZipPattern.test(f));
    if (kebirZipFile) {
      const filePath = path.join(folderPath, kebirZipFile);
      const stats = fs.statSync(filePath);
      result.kebirZipExists = true;
      result.files.push({
        fileName: kebirZipFile,
        fileType: 'KB-ZIP',
        exists: true,
        filePath,
        fileSize: stats.size,
        modifiedDate: stats.mtime
      });
      if (!lastModified || stats.mtime > lastModified) {
        lastModified = stats.mtime;
      }
    } else {
      result.files.push({
        fileName: `GIB-${taxNo}-${period}-KB-000000.zip`,
        fileType: 'KB-ZIP',
        exists: false
      });
    }

    // Check for Yevmiye XML
    const yevmiyeXmlPattern = new RegExp(`^GIB-${taxNo}-${period}-YB-\\d+\\.xml$`, 'i');
    const yevmiyeXmlFile = files.find(f => yevmiyeXmlPattern.test(f));
    if (yevmiyeXmlFile) {
      const filePath = path.join(folderPath, yevmiyeXmlFile);
      const stats = fs.statSync(filePath);
      result.yevmiyeXmlExists = true;
      result.files.push({
        fileName: yevmiyeXmlFile,
        fileType: 'YB-XML',
        exists: true,
        filePath,
        fileSize: stats.size,
        modifiedDate: stats.mtime
      });
      if (!lastModified || stats.mtime > lastModified) {
        lastModified = stats.mtime;
      }
    } else {
      result.files.push({
        fileName: `GIB-${taxNo}-${period}-YB-000000.xml`,
        fileType: 'YB-XML',
        exists: false
      });
    }

    // Check for Yevmiye ZIP
    const yevmiyeZipPattern = new RegExp(`^GIB-${taxNo}-${period}-YB-\\d+\\.zip$`, 'i');
    const yevmiyeZipFile = files.find(f => yevmiyeZipPattern.test(f));
    if (yevmiyeZipFile) {
      const filePath = path.join(folderPath, yevmiyeZipFile);
      const stats = fs.statSync(filePath);
      result.yevmiyeZipExists = true;
      result.files.push({
        fileName: yevmiyeZipFile,
        fileType: 'YB-ZIP',
        exists: true,
        filePath,
        fileSize: stats.size,
        modifiedDate: stats.mtime
      });
      if (!lastModified || stats.mtime > lastModified) {
        lastModified = stats.mtime;
      }
    } else {
      result.files.push({
        fileName: `GIB-${taxNo}-${period}-YB-000000.zip`,
        fileType: 'YB-ZIP',
        exists: false
      });
    }

    result.lastModified = lastModified;
    result.isComplete = result.kebirXmlExists && result.kebirZipExists && 
                        result.yevmiyeXmlExists && result.yevmiyeZipExists;

    return result;
  }

  async generateExcelReport(scanResult: ScanResult, outputPath: string): Promise<string> {
    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['E-Defter Kontrol Raporu'],
      [],
      ['Tarama Tarihi', scanResult.scanDate.toLocaleString('tr-TR')],
      ['Kaynak Klasör', scanResult.sourceFolder],
      [],
      ['Toplam Şirket', scanResult.totalCompanies],
      ['Toplam Dönem', scanResult.totalPeriods],
      ['Tamamlanan Dönem', scanResult.completePeriods],
      ['Eksik Dönem', scanResult.incompletePeriods],
      ['Tamamlanma Oranı', `${((scanResult.completePeriods / scanResult.totalPeriods) * 100).toFixed(1)}%`]
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 20 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Özet');

    // Detailed Report Sheet
    const detailHeaders = [
      'Şirket Adı',
      'Vergi No',
      'E-Posta',
      'Mükellef Tipi',
      'Dönem',
      'Klasör Yolu',
      'Durum',
      'Kebir XML',
      'Kebir ZIP',
      'Yevmiye XML',
      'Yevmiye ZIP',
      'Son Değişiklik'
    ];

    const detailData = [detailHeaders];

    for (const company of scanResult.companies) {
      for (const period of company.periods) {
        detailData.push([
          period.companyName || company.companyName,
          period.taxNo,
          period.customerEmail || '',
          period.taxType === 'gelir' ? 'Gelir Vergisi' : 'Kurumlar Vergisi',
          period.periodDisplay,
          period.folderPath,
          period.isComplete ? 'TAMAM' : 'EKSİK',
          period.kebirXmlExists ? '✓' : '✗',
          period.kebirZipExists ? '✓' : '✗',
          period.yevmiyeXmlExists ? '✓' : '✗',
          period.yevmiyeZipExists ? '✓' : '✗',
          period.lastModified?.toLocaleString('tr-TR') || ''
        ]);
      }
    }

    const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
    detailSheet['!cols'] = [
      { wch: 30 },  // Şirket Adı
      { wch: 15 },  // Vergi No
      { wch: 25 },  // E-Posta
      { wch: 15 },  // Mükellef Tipi
      { wch: 15 },  // Dönem
      { wch: 50 },  // Klasör Yolu
      { wch: 10 },  // Durum
      { wch: 10 },  // Kebir XML
      { wch: 10 },  // Kebir ZIP
      { wch: 12 },  // Yevmiye XML
      { wch: 12 },  // Yevmiye ZIP
      { wch: 20 }   // Son Değişiklik
    ];
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detaylı Rapor');

    // Incomplete Periods Sheet
    const incompleteHeaders = [
      'Şirket Adı',
      'Vergi No',
      'E-Posta',
      'Dönem',
      'Eksik Dosyalar'
    ];

    const incompleteData = [incompleteHeaders];

    for (const company of scanResult.companies) {
      for (const period of company.periods) {
        if (!period.isComplete) {
          const missingFiles: string[] = [];
          if (!period.kebirXmlExists) missingFiles.push('Kebir XML');
          if (!period.kebirZipExists) missingFiles.push('Kebir ZIP');
          if (!period.yevmiyeXmlExists) missingFiles.push('Yevmiye XML');
          if (!period.yevmiyeZipExists) missingFiles.push('Yevmiye ZIP');

          incompleteData.push([
            period.companyName || company.companyName,
            period.taxNo,
            period.customerEmail || '',
            period.periodDisplay,
            missingFiles.join(', ')
          ]);
        }
      }
    }

    const incompleteSheet = XLSX.utils.aoa_to_sheet(incompleteData);
    incompleteSheet['!cols'] = [
      { wch: 30 },
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 40 }
    ];
    XLSX.utils.book_append_sheet(workbook, incompleteSheet, 'Eksik Dönemler');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `E-Defter-Rapor-${timestamp}.xlsx`;
    const fullPath = path.join(outputPath, fileName);

    // Ensure directory exists
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    XLSX.writeFile(workbook, fullPath);
    return fullPath;
  }
}
