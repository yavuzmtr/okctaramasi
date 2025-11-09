import type { Receipt } from '@/types/receipt';
import * as XLSX from 'xlsx';
import { Platform } from 'react-native';

interface ExcelData {
  headers: string[];
  rows: (string | number)[][];
}

interface ExcelWorkbook {
  [sheetName: string]: ExcelData;
}

class ExcelService {
  createExcelData(receipts: Receipt[]): ExcelData {
    const headers = [
      'Fiş ID',
      'Mağaza Adı',
      'Tarih',
      'Toplam Tutar (₺)',
      'Ürün Sayısı',
      'Ürün Detayları',
      'Tarama Tarihi',
      'Notlar'
    ];

    const rows = receipts.map(receipt => [
      receipt.id,
      receipt.storeName,
      receipt.date,
      receipt.totalAmount,
      receipt.items.length,
      receipt.items.map(item => `${item.name}: ₺${item.price.toFixed(2)}`).join('; '),
      new Date(receipt.scanDate).toLocaleDateString('tr-TR'),
      receipt.notes || ''
    ]);

    return { headers, rows };
  }

  createSummaryData(receipts: Receipt[]): ExcelData {
    const totalAmount = receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0);
    const totalItems = receipts.reduce((sum, receipt) => sum + receipt.items.length, 0);
    const averageAmount = receipts.length > 0 ? totalAmount / receipts.length : 0;

    // Group by store
    const storeStats = receipts.reduce((acc, receipt) => {
      if (!acc[receipt.storeName]) {
        acc[receipt.storeName] = {
          count: 0,
          total: 0,
          items: 0
        };
      }
      acc[receipt.storeName].count++;
      acc[receipt.storeName].total += receipt.totalAmount;
      acc[receipt.storeName].items += receipt.items.length;
      return acc;
    }, {} as Record<string, { count: number; total: number; items: number }>);

    const headers = [
      'Mağaza Adı',
      'Fiş Sayısı',
      'Toplam Harcama (₺)',
      'Ortalama Harcama (₺)',
      'Toplam Ürün Sayısı'
    ];

    const rows = Object.entries(storeStats).map(([storeName, stats]) => [
      storeName,
      stats.count,
      stats.total,
      stats.total / stats.count,
      stats.items
    ]);

    // Add summary row
    rows.push([
      'TOPLAM',
      receipts.length,
      totalAmount,
      averageAmount,
      totalItems
    ]);

    return { headers, rows };
  }

  createMonthlyData(receipts: Receipt[]): ExcelData {
    // Group receipts by month
    const monthlyStats = receipts.reduce((acc, receipt) => {
      const date = new Date(receipt.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });

      if (!acc[monthKey]) {
        acc[monthKey] = {
          name: monthName,
          count: 0,
          total: 0,
          items: 0
        };
      }

      acc[monthKey].count++;
      acc[monthKey].total += receipt.totalAmount;
      acc[monthKey].items += receipt.items.length;
      return acc;
    }, {} as Record<string, { name: string; count: number; total: number; items: number }>);

    const headers = [
      'Ay',
      'Fiş Sayısı',
      'Toplam Harcama (₺)',
      'Ortalama Harcama (₺)',
      'Toplam Ürün Sayısı'
    ];

    const rows = Object.values(monthlyStats)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(stats => [
        stats.name,
        stats.count,
        stats.total,
        stats.total / stats.count,
        stats.items
      ]);

    return { headers, rows };
  }

  createItemAnalysisData(receipts: Receipt[]): ExcelData {
    // Analyze most purchased items
    const itemStats = receipts.reduce((acc, receipt) => {
      receipt.items.forEach(item => {
        if (!acc[item.name]) {
          acc[item.name] = {
            count: 0,
            totalPrice: 0,
            avgPrice: 0
          };
        }
        acc[item.name].count++;
        acc[item.name].totalPrice += item.price;
        acc[item.name].avgPrice = acc[item.name].totalPrice / acc[item.name].count;
      });
      return acc;
    }, {} as Record<string, { count: number; totalPrice: number; avgPrice: number }>);

    const headers = [
      'Ürün Adı',
      'Satın Alım Sayısı',
      'Toplam Harcama (₺)',
      'Ortalama Fiyat (₺)',
      'En Pahalı (₺)',
      'En Ucuz (₺)'
    ];

    const rows = Object.entries(itemStats)
      .sort(([, a], [, b]) => b.count - a.count) // Sort by purchase count
      .slice(0, 50) // Top 50 items
      .map(([itemName, stats]) => {
        // Find min and max prices for this item
        const prices = receipts
          .flatMap(receipt => receipt.items)
          .filter(item => item.name === itemName)
          .map(item => item.price);
        
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        return [
          itemName,
          stats.count,
          stats.totalPrice,
          stats.avgPrice,
          maxPrice,
          minPrice
        ];
      });

    return { headers, rows };
  }

  formatCurrency(amount: number): string {
    return `₺${amount.toFixed(2)}`;
  }

  exportToCSV(data: ExcelData): string {
    const csvRows = [data.headers.join(',')];
    
    data.rows.forEach(row => {
      const csvRow = row.map(cell => {
        if (typeof cell === 'string' && cell.includes(',')) {
          return `"${cell}"`;
        }
        return cell.toString();
      });
      csvRows.push(csvRow.join(','));
    });

    return csvRows.join('\n');
  }

  // Method to create multiple sheets data for comprehensive export
  createCompleteExportData(receipts: Receipt[]): ExcelWorkbook {
    return {
      'Tüm Fişler': this.createExcelData(receipts),
      'Mağaza Özeti': this.createSummaryData(receipts),
      'Aylık Analiz': this.createMonthlyData(receipts),
      'Ürün Analizi': this.createItemAnalysisData(receipts)
    };
  }

  // Create and download XLSX file
  async exportToXLSX(receipts: Receipt[], filename?: string): Promise<void> {
    try {
      const workbook = XLSX.utils.book_new();
      const exportData = this.createCompleteExportData(receipts);

      // Add each sheet to workbook
      Object.entries(exportData).forEach(([sheetName, data]) => {
        const worksheet = XLSX.utils.aoa_to_sheet([
          data.headers,
          ...data.rows
        ]);

        // Auto-size columns
        const colWidths = data.headers.map((header, colIndex) => {
          const headerLength = header.length;
          const maxDataLength = Math.max(
            ...data.rows.map(row => 
              String(row[colIndex] || '').length
            )
          );
          return { wch: Math.max(headerLength, maxDataLength, 10) };
        });
        
        worksheet['!cols'] = colWidths;

        // Add styling for headers
        const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
          const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
          if (worksheet[cellRef]) {
            worksheet[cellRef].s = {
              font: { bold: true },
              fill: { fgColor: { rgb: "CCCCCC" } }
            };
          }
        }

        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      });

      // Generate filename
      const defaultFilename = `fisler_${new Date().toISOString().split('T')[0]}.xlsx`;
      const finalFilename = filename || defaultFilename;

      if (Platform.OS === 'web') {
        // Web download
        XLSX.writeFile(workbook, finalFilename);
      } else {
        // Mobile - would need expo-sharing
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
        const uri = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${wbout}`;
        
        // For now, just log the success (expo-sharing integration can be added later)
        console.log('Excel file generated:', uri.substring(0, 100) + '...');
      }
    } catch (error) {
      console.error('Excel export error:', error);
      throw new Error('Excel dosyası oluşturulurken hata oluştu');
    }
  }

  // Create summary report for quick insights
  generateSummaryReport(receipts: Receipt[]): string {
    const stats = {
      toplamFis: receipts.length,
      toplamTutar: receipts.reduce((sum, r) => sum + r.totalAmount, 0),
      ortalamaTutar: receipts.length > 0 ? receipts.reduce((sum, r) => sum + r.totalAmount, 0) / receipts.length : 0,
      toplamUrun: receipts.reduce((sum, r) => sum + r.items.length, 0),
      enCokAlinanUrun: this.getMostPurchasedItem(receipts),
      enCokZiyaretEdilenMagaza: this.getMostVisitedStore(receipts)
    };

    return `
📊 FİŞ RAPORU ÖZETİ
====================
📋 Toplam Fiş: ${stats.toplamFis}
💰 Toplam Harcama: ₺${stats.toplamTutar.toFixed(2)}
📈 Ortalama Harcama: ₺${stats.ortalamaTutar.toFixed(2)}
📦 Toplam Ürün: ${stats.toplamUrun}
🏆 En Çok Alınan: ${stats.enCokAlinanUrun}
🏪 En Çok Ziyaret: ${stats.enCokZiyaretEdilenMagaza}
    `.trim();
  }

  private getMostPurchasedItem(receipts: Receipt[]): string {
    const itemCounts: Record<string, number> = {};
    
    receipts.forEach(receipt => {
      receipt.items.forEach(item => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
      });
    });

    const sortedItems = Object.entries(itemCounts)
      .sort(([,a], [,b]) => b - a);
    
    return sortedItems.length > 0 ? 
      `${sortedItems[0][0]} (${sortedItems[0][1]} kez)` : 
      'Veri yok';
  }

  private getMostVisitedStore(receipts: Receipt[]): string {
    const storeCounts: Record<string, number> = {};
    
    receipts.forEach(receipt => {
      storeCounts[receipt.storeName] = (storeCounts[receipt.storeName] || 0) + 1;
    });

    const sortedStores = Object.entries(storeCounts)
      .sort(([,a], [,b]) => b - a);
    
    return sortedStores.length > 0 ? 
      `${sortedStores[0][0]} (${sortedStores[0][1]} fiş)` : 
      'Veri yok';
  }
}

export const excelService = new ExcelService();