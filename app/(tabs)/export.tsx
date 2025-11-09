import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Download, FileSpreadsheet, Calendar, TrendingUp, Package } from 'lucide-react-native';
import { webStorage } from '@/services/webStorage';
import { excelService } from '@/services/excelService';
import type { Receipt } from '@/types/receipt';

export default function ExportScreen() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStats, setExportStats] = useState({
    totalReceipts: 0,
    totalAmount: 0,
    totalItems: 0,
    averageAmount: 0,
  });

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    try {
      const data = await webStorage.getAllReceipts();
      setReceipts(data);
      calculateStats(data);
    } catch (error) {
      Alert.alert('Hata', 'Veriler yüklenirken hata oluştu.');
    }
  };

  const calculateStats = (receipts: Receipt[]) => {
    const totalReceipts = receipts.length;
    const totalAmount = receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0);
    const totalItems = receipts.reduce((sum, receipt) => sum + receipt.items.length, 0);
    const averageAmount = totalReceipts > 0 ? totalAmount / totalReceipts : 0;

    setExportStats({
      totalReceipts,
      totalAmount,
      totalItems,
      averageAmount,
    });
  };

  const exportToExcel = async () => {
    if (receipts.length === 0) {
      Alert.alert('Uyarı', 'Dışa aktarılacak fiş bulunamadı.');
      return;
    }

    try {
      setIsExporting(true);

      // Export to XLSX
      await excelService.exportToXLSX(receipts);
      
      // Show summary
      const summaryReport = excelService.generateSummaryReport(receipts);
      
      Alert.alert(
        '✅ Başarıyla Dışa Aktarıldı!',
        `Excel dosyası başarıyla oluşturuldu ve indirildi.\n\n${summaryReport}`,
        [
          {
            text: 'Tamam',
            style: 'default',
          }
        ]
      );
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert(
        'Hata', 
        'Excel dosyası oluşturulurken hata oluştu. Lütfen tekrar deneyin.',
        [
          {
            text: 'CSV\'ye Aktar',
            onPress: () => exportToCSV(),
          },
          {
            text: 'Tamam',
            style: 'cancel',
          }
        ]
      );
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = async () => {
    try {
      setIsExporting(true);
      
      // Create CSV content
      const csvContent = createCSVContent(receipts);
      
      if (Platform.OS === 'web') {
        // Web download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `fisler_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        Alert.alert('Başarılı!', 'Fiş verileri CSV formatında indirildi.');
      }
    } catch (error) {
      Alert.alert('Hata', 'CSV dışa aktarımında hata oluştu.');
    } finally {
      setIsExporting(false);
    }
  };

  const createCSVContent = (receipts: Receipt[]): string => {
    const headers = [
      'Fiş ID',
      'Mağaza Adı',
      'Tarih',
      'Toplam Tutar',
      'Ürün Sayısı',
      'Ürün Detayları',
      'Tarama Tarihi'
    ];

    const csvRows = [headers.join(',')];

    receipts.forEach(receipt => {
      const productDetails = receipt.items
        .map(item => `${item.name}: ₺${item.price.toFixed(2)}`)
        .join('; ');

      const row = [
        receipt.id,
        `"${receipt.storeName}"`,
        receipt.date,
        receipt.totalAmount.toFixed(2),
        receipt.items.length,
        `"${productDetails}"`,
        new Date(receipt.scanDate).toLocaleDateString('tr-TR')
      ];

      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  };

  const formatCurrency = (amount: number) => {
    return `₺${amount.toFixed(2)}`;
  };

  const StatCard = ({ icon, title, value, color }: {
    icon: React.ReactNode;
    title: string;
    value: string;
    color: string;
  }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        {React.isValidElement(icon) && React.cloneElement(icon, { 
          size: 24, 
          color: color 
        } as any)}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  return (
    <LinearGradient
      colors={['#F8FAFC', '#E2E8F0']}
      style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dışa Aktar</Text>
        <Text style={styles.headerSubtitle}>
          Fiş verilerinizi CSV formatında kaydedin
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <StatCard
          icon={<FileSpreadsheet />}
          title="Toplam Fiş"
          value={exportStats.totalReceipts.toString()}
          color="#3B82F6"
        />
        <StatCard
          icon={<TrendingUp />}
          title="Toplam Tutar"
          value={formatCurrency(exportStats.totalAmount)}
          color="#10B981"
        />
      </View>

      <View style={styles.statsContainer}>
        <StatCard
          icon={<Package />}
          title="Toplam Ürün"
          value={exportStats.totalItems.toString()}
          color="#F59E0B"
        />
        <StatCard
          icon={<Calendar />}
          title="Ortalama Tutar"
          value={formatCurrency(exportStats.averageAmount)}
          color="#8B5CF6"
        />
      </View>

      {/* Export Options */}
      <View style={styles.exportSection}>
        <Text style={styles.sectionTitle}>Dışa Aktarım Seçenekleri</Text>
        
        <TouchableOpacity
          style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
          onPress={exportToExcel}
          disabled={isExporting}>
          <LinearGradient
            colors={isExporting ? ['#9CA3AF', '#6B7280'] : ['#10B981', '#059669']}
            style={styles.exportButtonGradient}>
            <FileSpreadsheet size={24} color="white" />
            <View style={styles.exportButtonText}>
              <Text style={styles.exportButtonTitle}>
                {isExporting ? 'Excel Oluşturuluyor...' : 'Excel\'e Aktar'}
              </Text>
              <Text style={styles.exportButtonSubtitle}>
                {receipts.length} fiş Excel formatında, 4 sayfa ile indirilecek
              </Text>
            </View>
            <Download size={20} color="white" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.csvButton, isExporting && styles.exportButtonDisabled]}
          onPress={exportToCSV}
          disabled={isExporting}>
          <View style={styles.csvButtonContent}>
            <FileSpreadsheet size={20} color="#3B82F6" />
            <Text style={styles.csvButtonText}>CSV Alternatifi</Text>
            <Download size={16} color="#3B82F6" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Recent Receipts Preview */}
      <View style={styles.previewSection}>
        <Text style={styles.sectionTitle}>Son Fişler</Text>
        
        <FlatList
          data={receipts.slice(0, 5)}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.previewItem}>
              <View style={styles.previewInfo}>
                <Text style={styles.previewStore}>{item.storeName}</Text>
                <Text style={styles.previewDate}>
                  {new Date(item.date).toLocaleDateString('tr-TR')}
                </Text>
              </View>
              <Text style={styles.previewAmount}>
                {formatCurrency(item.totalAmount)}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyPreview}>
              <FileSpreadsheet size={32} color="#9CA3AF" />
              <Text style={styles.emptyPreviewText}>
                Henüz dışa aktarılacak fiş yok
              </Text>
            </View>
          }
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textAlign: 'center',
  },
  exportSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 16,
  },
  exportButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  exportButtonDisabled: {
    opacity: 0.7,
  },
  exportButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  exportButtonText: {
    flex: 1,
  },
  exportButtonTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    marginBottom: 4,
  },
  exportButtonSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.8)',
  },
  previewSection: {
    flex: 1,
    paddingHorizontal: 24,
  },
  previewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewInfo: {
    flex: 1,
  },
  previewStore: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  previewDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  previewAmount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  emptyPreview: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyPreviewText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 12,
  },
  csvButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
    marginTop: 12,
  },
  csvButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  csvButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#3B82F6',
  },
});