import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Edit3, Trash2, Store, Calendar, DollarSign, Package } from 'lucide-react-native';
import { webStorage } from '@/services/webStorage';
import type { Receipt } from '@/types/receipt';

export default function HistoryScreen() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    try {
      const data = await webStorage.getAllReceipts();
      setReceipts(data);
    } catch (error) {
      Alert.alert('Hata', 'Fiş geçmişi yüklenirken hata oluştu.');
    }
  };

  const filteredReceipts = receipts.filter(receipt =>
    receipt.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    receipt.items.some(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const deleteReceipt = async (id: string) => {
    Alert.alert(
      'Fişi Sil',
      'Bu fişi silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await webStorage.deleteReceipt(id);
              loadReceipts();
            } catch (error) {
              Alert.alert('Hata', 'Fiş silinirken hata oluştu.');
            }
          },
        },
      ]
    );
  };

  const editReceipt = (receipt: Receipt) => {
    setEditingReceipt({ ...receipt });
    setIsModalVisible(true);
  };

  const saveReceipt = async () => {
    if (!editingReceipt) return;

    try {
      await webStorage.updateReceipt(editingReceipt.id, editingReceipt);
      setIsModalVisible(false);
      setEditingReceipt(null);
      loadReceipts();
      Alert.alert('Başarılı', 'Fiş güncellendi.');
    } catch (error) {
      Alert.alert('Hata', 'Fiş güncellenirken hata oluştu.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
  };

  const formatCurrency = (amount: number) => {
    return `₺${amount.toFixed(2)}`;
  };

  const renderReceiptItem = ({ item }: { item: Receipt }) => (
    <View style={styles.receiptCard}>
      <View style={styles.receiptHeader}>
        <View style={styles.receiptInfo}>
          <View style={styles.receiptTitle}>
            <Store size={16} color="#3B82F6" />
            <Text style={styles.storeName}>{item.storeName}</Text>
          </View>
          <View style={styles.receiptMeta}>
            <Calendar size={14} color="#6B7280" />
            <Text style={styles.receiptDate}>{formatDate(item.date)}</Text>
          </View>
        </View>
        <View style={styles.receiptActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => editReceipt(item)}>
            <Edit3 size={16} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => deleteReceipt(item.id)}>
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.receiptDetails}>
        <View style={styles.totalAmount}>
          <DollarSign size={16} color="#10B981" />
          <Text style={styles.totalText}>{formatCurrency(item.totalAmount)}</Text>
        </View>
        <View style={styles.itemCount}>
          <Package size={14} color="#6B7280" />
          <Text style={styles.itemCountText}>
            {item.items.length} ürün
          </Text>
        </View>
      </View>

      {item.items.length > 0 && (
        <View style={styles.itemsList}>
          {item.items.slice(0, 3).map((product, index) => (
            <Text key={index} style={styles.itemText}>
              • {product.name} - {formatCurrency(product.price)}
            </Text>
          ))}
          {item.items.length > 3 && (
            <Text style={styles.moreItemsText}>
              +{item.items.length - 3} ürün daha...
            </Text>
          )}
        </View>
      )}
    </View>
  );

  return (
    <LinearGradient
      colors={['#F8FAFC', '#E2E8F0']}
      style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fiş Geçmişi</Text>
        <Text style={styles.headerSubtitle}>
          {receipts.length} fiş kaydedildi
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Mağaza veya ürün ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Receipts List */}
      <FlatList
        data={filteredReceipts}
        renderItem={renderReceiptItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Store size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Henüz fiş yok</Text>
            <Text style={styles.emptySubtitle}>
              İlk fişinizi taramak için kamera sekmesini kullanın
            </Text>
          </View>
        }
      />

      {/* Edit Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setIsModalVisible(false);
                setEditingReceipt(null);
              }}>
              <Text style={styles.modalCancel}>İptal</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Fişi Düzenle</Text>
            <TouchableOpacity onPress={saveReceipt}>
              <Text style={styles.modalSave}>Kaydet</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {editingReceipt && (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Mağaza Adı</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editingReceipt.storeName}
                    onChangeText={text =>
                      setEditingReceipt(prev => prev ? { ...prev, storeName: text } : null)
                    }
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Tarih</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editingReceipt.date}
                    onChangeText={text =>
                      setEditingReceipt(prev => prev ? { ...prev, date: text } : null)
                    }
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Toplam Tutar</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editingReceipt.totalAmount.toString()}
                    onChangeText={text =>
                      setEditingReceipt(prev => prev ? { 
                        ...prev, 
                        totalAmount: parseFloat(text) || 0 
                      } : null)
                    }
                    keyboardType="numeric"
                  />
                </View>

                <Text style={styles.formLabel}>Ürünler</Text>
                {editingReceipt.items.map((item, index) => (
                  <View key={index} style={styles.itemForm}>
                    <TextInput
                      style={[styles.formInput, styles.itemNameInput]}
                      value={item.name}
                      onChangeText={text => {
                        const newItems = [...editingReceipt.items];
                        newItems[index] = { ...item, name: text };
                        setEditingReceipt(prev => prev ? { 
                          ...prev, 
                          items: newItems 
                        } : null);
                      }}
                      placeholder="Ürün adı"
                    />
                    <TextInput
                      style={[styles.formInput, styles.itemPriceInput]}
                      value={item.price.toString()}
                      onChangeText={text => {
                        const newItems = [...editingReceipt.items];
                        newItems[index] = { ...item, price: parseFloat(text) || 0 };
                        setEditingReceipt(prev => prev ? { 
                          ...prev, 
                          items: newItems 
                        } : null);
                      }}
                      placeholder="Fiyat"
                      keyboardType="numeric"
                    />
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
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
    paddingBottom: 24,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  receiptCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  receiptInfo: {
    flex: 1,
  },
  receiptTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  storeName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginLeft: 8,
  },
  receiptMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  receiptDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginLeft: 6,
  },
  receiptActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  totalAmount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
    marginLeft: 6,
  },
  itemCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCountText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginLeft: 4,
  },
  itemsList: {
    marginTop: 8,
  },
  itemText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
    marginBottom: 4,
  },
  moreItemsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCancel: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  modalSave: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#3B82F6',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    backgroundColor: 'white',
  },
  itemForm: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  itemNameInput: {
    flex: 2,
  },
  itemPriceInput: {
    flex: 1,
  },
});