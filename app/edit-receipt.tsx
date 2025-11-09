import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Save, X, Plus, Trash2, Download } from 'lucide-react-native';
import { webStorage } from '@/services/webStorage';
import { excelService } from '@/services/excelService';
import type { ReceiptItem } from '@/types/receipt';

export default function EditReceiptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [storeName, setStoreName] = useState('');
  const [date, setDate] = useState('');
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Parse data from route params
    if (params.data) {
      try {
        const receiptData = JSON.parse(params.data as string);
        setStoreName(receiptData.storeName || '');
        setDate(receiptData.date || new Date().toISOString().split('T')[0]);
        setItems(receiptData.items || []);
      } catch (error) {
        console.error('Error parsing receipt data:', error);
      }
    }
  }, [params.data]);

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.price, 0);
  };

  const updateItem = (index: number, field: 'name' | 'price' | 'quantity', value: string | number) => {
    const newItems = [...items];
    if (field === 'name') {
      newItems[index].name = value as string;
    } else if (field === 'price') {
      newItems[index].price = typeof value === 'string' ? parseFloat(value) || 0 : value;
    } else if (field === 'quantity') {
      newItems[index].quantity = typeof value === 'string' ? parseFloat(value) || 1 : value;
    }
    setItems(newItems);
  };

  const addNewItem = () => {
    setItems([...items, { name: '', price: 0, quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleSaveAndContinue = async () => {
    if (!storeName.trim()) {
      Alert.alert('Hata', 'Lütfen mağaza adını girin');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Hata', 'En az bir ürün ekleyin');
      return;
    }

    try {
      setIsLoading(true);

      await webStorage.saveReceipt({
        storeName: storeName.trim(),
        date: date,
        totalAmount: calculateTotal(),
        items: items.filter(item => item.name.trim() !== ''),
        imageUri: params.imageUri as string || '',
        scanDate: new Date().toISOString(),
      });

      Alert.alert(
        'Başarılı!',
        'Fiş kaydedildi. Yeni tarama yapabilirsiniz.',
        [
          {
            text: 'Yeni Tarama',
            onPress: () => router.push('/'),
          },
        ]
      );
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Hata', 'Fiş kaydedilirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportToExcel = async () => {
    if (!storeName.trim() || items.length === 0) {
      Alert.alert('Hata', 'Önce fişi kaydedin');
      return;
    }

    try {
      setIsLoading(true);

      const receiptId = await webStorage.saveReceipt({
        storeName: storeName.trim(),
        date: date,
        totalAmount: calculateTotal(),
        items: items.filter(item => item.name.trim() !== ''),
        imageUri: params.imageUri as string || '',
        scanDate: new Date().toISOString(),
      });

      // Get all receipts for export
      const allReceipts = await webStorage.getAllReceipts();
      await excelService.exportToXLSX(allReceipts);

      Alert.alert(
        'Başarılı!',
        'Excel dosyası indirildi. Yeni tarama yapabilirsiniz.',
        [
          {
            text: 'Yeni Tarama',
            onPress: () => router.push('/'),
          },
        ]
      );
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Hata', 'Excel dışa aktarılırken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#3B82F6', '#1D4ED8']}
        style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}>
            <X size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fiş Düzenle</Text>
          <View style={styles.headerButton} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Store Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Mağaza Adı</Text>
          <TextInput
            style={styles.input}
            value={storeName}
            onChangeText={setStoreName}
            placeholder="Örn: MİGROS, A101, BİM"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.label}>Tarih</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="GG.AA.YYYY"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>Ürünler</Text>
            <TouchableOpacity style={styles.addButton} onPress={addNewItem}>
              <Plus size={20} color="#3B82F6" />
              <Text style={styles.addButtonText}>Ekle</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemRow}>
                <TextInput
                  style={[styles.input, styles.itemNameInput]}
                  value={item.name}
                  onChangeText={(value) => updateItem(index, 'name', value)}
                  placeholder="Ürün adı"
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => removeItem(index)}>
                  <Trash2 size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
              <View style={styles.itemDetailsRow}>
                <View style={styles.itemDetailInput}>
                  <Text style={styles.itemDetailLabel}>Adet</Text>
                  <TextInput
                    style={[styles.input, styles.smallInput]}
                    value={String(item.quantity)}
                    onChangeText={(value) => updateItem(index, 'quantity', value)}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.itemDetailInput}>
                  <Text style={styles.itemDetailLabel}>Fiyat (₺)</Text>
                  <TextInput
                    style={[styles.input, styles.smallInput]}
                    value={String(item.price)}
                    onChangeText={(value) => updateItem(index, 'price', value)}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Toplam</Text>
          <Text style={styles.totalAmount}>₺{calculateTotal().toFixed(2)}</Text>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.saveButton]}
          onPress={handleSaveAndContinue}
          disabled={isLoading}>
          <Save size={20} color="white" />
          <Text style={styles.actionButtonText}>Kaydet ve Yeni Tarama</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.excelButton]}
          onPress={handleExportToExcel}
          disabled={isLoading}>
          <Download size={20} color="#3B82F6" />
          <Text style={styles.excelButtonText}>Excel'e Aktar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: 'white',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 160,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#3B82F6',
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  itemNameInput: {
    flex: 1,
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetailsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  itemDetailInput: {
    flex: 1,
  },
  itemDetailLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 4,
  },
  smallInput: {
    paddingVertical: 8,
  },
  totalSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  totalLabel: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#374151',
  },
  totalAmount: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#3B82F6',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButton: {
    backgroundColor: '#3B82F6',
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },
  excelButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  excelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#3B82F6',
  },
});
