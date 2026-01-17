import * as fs from 'fs';
import * as XLSX from 'xlsx';

export interface Customer {
  id: string;
  companyName: string;
  taxNo: string;          // Vergi No (şirketler için)
  tcNo: string;           // TC Kimlik No (şahıslar için)
  email: string;
  taxType: 'gelir' | 'kurumlar';  // Gelir Vergisi veya Kurumlar Vergisi
  uploadPeriod: 'monthly' | 'quarterly';  // Aylık veya 3 Aylık
  isActive: boolean;
  notes?: string;
}

export class CustomerService {
  private customers: Customer[] = [];
  private loadedFilePath: string = '';

  async loadCustomers(filePath: string): Promise<Customer[]> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('Dosya bulunamadı: ' + filePath);
      }

      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with header row
      const data = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
      
      if (data.length < 2) {
        throw new Error('Excel dosyası boş veya başlık satırı eksik');
      }

      // First row is header
      const headers = data[0] as string[];
      
      // Map column names (case-insensitive, Turkish support)
      const columnMap = this.mapColumns(headers);
      
      this.customers = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        if (!row || row.length === 0) continue;
        
        const customer = this.parseCustomerRow(row, columnMap, i);
        if (customer) {
          this.customers.push(customer);
        }
      }

      this.loadedFilePath = filePath;
      return this.customers;
    } catch (error) {
      console.error('Error loading customers:', error);
      throw error;
    }
  }

  private mapColumns(headers: string[]): Map<string, number> {
    const map = new Map<string, number>();
    
    const columnMappings: { [key: string]: string[] } = {
      'companyName': ['şirket adı', 'sirket adi', 'firma adı', 'firma adi', 'unvan', 'company', 'name', 'ad'],
      'taxNo': ['vergi no', 'vergi numarası', 'vergino', 'tax no', 'vkn'],
      'tcNo': ['tc kimlik', 'tc no', 'tckn', 'tc kimlik no', 'kimlik no'],
      'email': ['e-posta', 'eposta', 'email', 'mail', 'e-mail'],
      'taxType': ['mükellef tipi', 'vergi tipi', 'tip', 'type', 'mükellef türü'],
      'uploadPeriod': ['yükleme periyodu', 'dönem', 'period', 'periyot'],
      'isActive': ['aktif', 'durum', 'active', 'status'],
      'notes': ['notlar', 'not', 'notes', 'açıklama']
    };

    headers.forEach((header, index) => {
      const normalizedHeader = header?.toString().toLowerCase().trim() || '';
      
      for (const [field, aliases] of Object.entries(columnMappings)) {
        if (aliases.some(alias => normalizedHeader.includes(alias))) {
          map.set(field, index);
          break;
        }
      }
    });

    return map;
  }

  private parseCustomerRow(row: any[], columnMap: Map<string, number>, rowIndex: number): Customer | null {
    const getValue = (field: string): string => {
      const index = columnMap.get(field);
      if (index === undefined || index >= row.length) return '';
      return row[index]?.toString().trim() || '';
    };

    const companyName = getValue('companyName');
    const taxNo = getValue('taxNo');
    const tcNo = getValue('tcNo');
    const email = getValue('email');

    // Skip empty rows
    if (!companyName && !taxNo && !tcNo) {
      return null;
    }

    // Determine tax type
    let taxType: 'gelir' | 'kurumlar' = 'kurumlar';
    const taxTypeValue = getValue('taxType').toLowerCase();
    if (taxTypeValue.includes('gelir') || taxTypeValue.includes('şahıs') || taxTypeValue.includes('sahis')) {
      taxType = 'gelir';
    }

    // Determine upload period
    let uploadPeriod: 'monthly' | 'quarterly' = 'monthly';
    const periodValue = getValue('uploadPeriod').toLowerCase();
    if (periodValue.includes('3') || periodValue.includes('üç') || periodValue.includes('quarterly') || periodValue.includes('çeyrek')) {
      uploadPeriod = 'quarterly';
    }

    // Determine active status
    let isActive = true;
    const activeValue = getValue('isActive').toLowerCase();
    if (activeValue === 'hayır' || activeValue === 'false' || activeValue === '0' || activeValue === 'pasif') {
      isActive = false;
    }

    // Use taxNo or tcNo as identifier
    const identifier = taxNo || tcNo;
    if (!identifier) {
      console.warn(`Row ${rowIndex + 1}: No tax number or TC number found`);
      return null;
    }

    return {
      id: `customer-${rowIndex}`,
      companyName: companyName || `Müşteri ${rowIndex}`,
      taxNo,
      tcNo,
      email,
      taxType,
      uploadPeriod,
      isActive,
      notes: getValue('notes')
    };
  }

  getCustomers(): Customer[] {
    return [...this.customers];
  }

  getCustomerByTaxNo(taxNo: string): Customer | undefined {
    return this.customers.find(c => c.taxNo === taxNo || c.tcNo === taxNo);
  }

  getActiveCustomers(): Customer[] {
    return this.customers.filter(c => c.isActive);
  }

  getCustomersByTaxType(taxType: 'gelir' | 'kurumlar'): Customer[] {
    return this.customers.filter(c => c.taxType === taxType && c.isActive);
  }

  getLoadedFilePath(): string {
    return this.loadedFilePath;
  }

  // Create sample Excel template
  static createSampleExcel(outputPath: string): void {
    const sampleData = [
      ['Şirket Adı', 'Vergi No', 'TC Kimlik No', 'E-Posta', 'Mükellef Tipi', 'Yükleme Periyodu', 'Aktif', 'Notlar'],
      ['ABC Ticaret Ltd. Şti.', '1234567890', '', 'abc@example.com', 'Kurumlar', 'Aylık', 'Evet', ''],
      ['Mehmet Yılmaz', '', '12345678901', 'mehmet@example.com', 'Gelir', '3 Aylık', 'Evet', 'Şahıs firması'],
      ['XYZ Holding A.Ş.', '9876543210', '', 'xyz@example.com', 'Kurumlar', 'Aylık', 'Evet', '']
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(sampleData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 30 }, // Şirket Adı
      { wch: 15 }, // Vergi No
      { wch: 15 }, // TC Kimlik No
      { wch: 25 }, // E-Posta
      { wch: 15 }, // Mükellef Tipi
      { wch: 18 }, // Yükleme Periyodu
      { wch: 8 },  // Aktif
      { wch: 30 }  // Notlar
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Müşteriler');
    XLSX.writeFile(workbook, outputPath);
  }
}
