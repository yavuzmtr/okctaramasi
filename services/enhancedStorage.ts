import type { Receipt } from '@/types/receipt';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// IndexedDB wrapper for better offline support
class IndexedDBService {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'YazarkasaDB';
  private readonly version = 1;
  private readonly storeName = 'receipts';

  async initialize(): Promise<void> {
    if (Platform.OS !== 'web') return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { 
            keyPath: 'id', 
            autoIncrement: false 
          });
          
          // Indexes for efficient querying
          store.createIndex('storeName', 'storeName', { unique: false });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('scanDate', 'scanDate', { unique: false });
          store.createIndex('totalAmount', 'totalAmount', { unique: false });
        }
      };
    });
  }

  async getAllReceipts(): Promise<Receipt[]> {
    if (!this.db) await this.initialize();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async saveReceipt(receipt: Receipt): Promise<void> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not available');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(receipt);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async deleteReceipt(id: string): Promise<void> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not available');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getReceiptById(id: string): Promise<Receipt | null> {
    if (!this.db) await this.initialize();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async searchReceipts(query: string): Promise<Receipt[]> {
    const allReceipts = await this.getAllReceipts();
    const lowercaseQuery = query.toLowerCase();
    
    return allReceipts.filter(receipt =>
      receipt.storeName.toLowerCase().includes(lowercaseQuery) ||
      receipt.items.some(item => 
        item.name.toLowerCase().includes(lowercaseQuery)
      )
    );
  }

  async getReceiptsByDateRange(startDate: Date, endDate: Date): Promise<Receipt[]> {
    if (!this.db) await this.initialize();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('date');
      
      const startKey = startDate.toISOString().split('T')[0];
      const endKey = endDate.toISOString().split('T')[0];
      
      const request = index.getAll(IDBKeyRange.bound(startKey, endKey));

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async clearAllReceipts(): Promise<void> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not available');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getStorageSize(): Promise<number> {
    try {
      const receipts = await this.getAllReceipts();
      const jsonString = JSON.stringify(receipts);
      return new Blob([jsonString]).size;
    } catch {
      return 0;
    }
  }
}

// Enhanced web storage with IndexedDB fallback
class EnhancedWebStorage {
  private indexedDB = new IndexedDBService();
  private initialized = false;

  private async ensureInitialized() {
    if (!this.initialized) {
      try {
        await this.indexedDB.initialize();
        this.initialized = true;
        
        // Migrate localStorage data to IndexedDB if exists
        await this.migrateFromLocalStorage();
      } catch (error) {
        console.warn('IndexedDB not available, falling back to localStorage', error);
      }
    }
  }

  private async migrateFromLocalStorage() {
    try {
      let localData: string | null = null;
      
      // Try to get from appropriate storage
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localData = localStorage.getItem('receipts');
      } else {
        localData = await AsyncStorage.getItem('receipts');
      }
      
      if (localData) {
        const receipts: Receipt[] = JSON.parse(localData);
        
        // Check if already migrated
        const existingReceipts = await this.indexedDB.getAllReceipts();
        if (existingReceipts.length === 0 && receipts.length > 0) {
          // Migrate data
          for (const receipt of receipts) {
            await this.indexedDB.saveReceipt(receipt);
          }
          console.log('Migrated', receipts.length, 'receipts from storage to IndexedDB');
        }
      }
    } catch (error) {
      console.error('Migration failed:', error);
    }
  }

  async getAllReceipts(): Promise<Receipt[]> {
    await this.ensureInitialized();
    
    try {
      if (this.initialized && Platform.OS === 'web') {
        return await this.indexedDB.getAllReceipts();
      }
    } catch (error) {
      console.error('IndexedDB error, falling back to storage:', error);
    }

    // Fallback to AsyncStorage (mobile) or localStorage (web)
    try {
      let receiptsJson: string | null = null;
      
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        receiptsJson = localStorage.getItem('receipts');
      } else {
        receiptsJson = await AsyncStorage.getItem('receipts');
      }
      
      return receiptsJson ? JSON.parse(receiptsJson) : [];
    } catch (error) {
      console.error('Error loading receipts:', error);
      return [];
    }
  }

  async saveReceipt(receipt: Omit<Receipt, 'id'>): Promise<string> {
    await this.ensureInitialized();
    
    const newReceipt: Receipt = {
      ...receipt,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };

    try {
      if (this.initialized && Platform.OS === 'web') {
        await this.indexedDB.saveReceipt(newReceipt);
        
        // Also save to localStorage as backup
        if (typeof localStorage !== 'undefined') {
          const receipts = await this.getAllReceipts();
          localStorage.setItem('receipts', JSON.stringify(receipts));
        }
        
        return newReceipt.id;
      }
    } catch (error) {
      console.error('IndexedDB save error:', error);
    }

    // Fallback to AsyncStorage (mobile) or localStorage (web)
    try {
      const receipts = await this.getAllReceipts();
      receipts.push(newReceipt);
      const receiptsJson = JSON.stringify(receipts);
      
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem('receipts', receiptsJson);
      } else {
        await AsyncStorage.setItem('receipts', receiptsJson);
      }
      
      return newReceipt.id;
    } catch (error) {
      console.error('Error saving receipt:', error);
      throw error;
    }
  }

  async updateReceipt(id: string, updatedReceipt: Receipt): Promise<void> {
    await this.ensureInitialized();
    
    try {
      if (this.initialized && Platform.OS === 'web') {
        await this.indexedDB.saveReceipt(updatedReceipt);
        
        // Update localStorage backup
        if (typeof localStorage !== 'undefined') {
          const receipts = await this.getAllReceipts();
          localStorage.setItem('receipts', JSON.stringify(receipts));
        }
        return;
      }
    } catch (error) {
      console.error('IndexedDB update error:', error);
    }

    // Fallback to AsyncStorage (mobile) or localStorage (web)
    try {
      const receipts = await this.getAllReceipts();
      const index = receipts.findIndex(receipt => receipt.id === id);
      
      if (index !== -1) {
        receipts[index] = updatedReceipt;
        const receiptsJson = JSON.stringify(receipts);
        
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          localStorage.setItem('receipts', receiptsJson);
        } else {
          await AsyncStorage.setItem('receipts', receiptsJson);
        }
      } else {
        throw new Error('Receipt not found');
      }
    } catch (error) {
      console.error('Error updating receipt:', error);
      throw error;
    }
  }

  async deleteReceipt(id: string): Promise<void> {
    await this.ensureInitialized();
    
    try {
      if (this.initialized && Platform.OS === 'web') {
        await this.indexedDB.deleteReceipt(id);
        
        // Update localStorage backup
        if (typeof localStorage !== 'undefined') {
          const receipts = await this.getAllReceipts();
          localStorage.setItem('receipts', JSON.stringify(receipts));
        }
        return;
      }
    } catch (error) {
      console.error('IndexedDB delete error:', error);
    }

    // Fallback to AsyncStorage (mobile) or localStorage (web)
    try {
      const receipts = await this.getAllReceipts();
      const filteredReceipts = receipts.filter(receipt => receipt.id !== id);
      const receiptsJson = JSON.stringify(filteredReceipts);
      
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem('receipts', receiptsJson);
      } else {
        await AsyncStorage.setItem('receipts', receiptsJson);
      }
    } catch (error) {
      console.error('Error deleting receipt:', error);
      throw error;
    }
  }

  async getReceiptById(id: string): Promise<Receipt | null> {
    await this.ensureInitialized();
    
    try {
      if (this.initialized) {
        return await this.indexedDB.getReceiptById(id);
      }
    } catch (error) {
      console.error('IndexedDB get error:', error);
    }

    // Fallback to localStorage
    try {
      const receipts = await this.getAllReceipts();
      return receipts.find(receipt => receipt.id === id) || null;
    } catch (error) {
      console.error('Error getting receipt by id:', error);
      return null;
    }
  }

  async searchReceipts(query: string): Promise<Receipt[]> {
    await this.ensureInitialized();
    
    try {
      if (this.initialized) {
        return await this.indexedDB.searchReceipts(query);
      }
    } catch (error) {
      console.error('IndexedDB search error:', error);
    }

    // Fallback to localStorage
    try {
      const receipts = await this.getAllReceipts();
      const lowercaseQuery = query.toLowerCase();
      
      return receipts.filter(receipt =>
        receipt.storeName.toLowerCase().includes(lowercaseQuery) ||
        receipt.items.some(item => 
          item.name.toLowerCase().includes(lowercaseQuery)
        )
      );
    } catch (error) {
      console.error('Error searching receipts:', error);
      return [];
    }
  }

  async getReceiptsByDateRange(startDate: Date, endDate: Date): Promise<Receipt[]> {
    await this.ensureInitialized();
    
    try {
      if (this.initialized) {
        return await this.indexedDB.getReceiptsByDateRange(startDate, endDate);
      }
    } catch (error) {
      console.error('IndexedDB date range error:', error);
    }

    // Fallback to localStorage
    try {
      const receipts = await this.getAllReceipts();
      
      return receipts.filter(receipt => {
        const receiptDate = new Date(receipt.date);
        return receiptDate >= startDate && receiptDate <= endDate;
      });
    } catch (error) {
      console.error('Error getting receipts by date range:', error);
      return [];
    }
  }

  async getTotalSpending(): Promise<number> {
    try {
      const receipts = await this.getAllReceipts();
      return receipts.reduce((total, receipt) => total + receipt.totalAmount, 0);
    } catch (error) {
      console.error('Error calculating total spending:', error);
      return 0;
    }
  }

  async clearAllReceipts(): Promise<void> {
    await this.ensureInitialized();
    
    try {
      if (this.initialized && Platform.OS === 'web') {
        await this.indexedDB.clearAllReceipts();
      }
      
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.removeItem('receipts');
      } else {
        await AsyncStorage.removeItem('receipts');
      }
    } catch (error) {
      console.error('Error clearing receipts:', error);
      throw error;
    }
  }

  async getStorageInfo(): Promise<{
    totalReceipts: number;
    storageSize: number;
    lastBackup?: string;
  }> {
    try {
      const receipts = await this.getAllReceipts();
      const storageSize = this.initialized ? 
        await this.indexedDB.getStorageSize() : 
        new Blob([JSON.stringify(receipts)]).size;

      let lastBackup: string | undefined;
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        lastBackup = localStorage.getItem('lastBackup') || undefined;
      } else {
        lastBackup = (await AsyncStorage.getItem('lastBackup')) || undefined;
      }

      return {
        totalReceipts: receipts.length,
        storageSize,
        lastBackup
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { totalReceipts: 0, storageSize: 0 };
    }
  }

  async createBackup(): Promise<string> {
    try {
      const receipts = await this.getAllReceipts();
      const backup = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        receipts
      };

      const backupString = JSON.stringify(backup, null, 2);
      
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem('lastBackup', backup.timestamp);
      } else {
        await AsyncStorage.setItem('lastBackup', backup.timestamp);
      }
      
      return backupString;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  async restoreFromBackup(backupString: string): Promise<number> {
    try {
      const backup = JSON.parse(backupString);
      
      if (!backup.receipts || !Array.isArray(backup.receipts)) {
        throw new Error('Invalid backup format');
      }

      // Clear existing data
      await this.clearAllReceipts();

      // Restore receipts
      for (const receipt of backup.receipts) {
        if (receipt.id && receipt.storeName && receipt.items) {
          await this.saveReceipt(receipt);
        }
      }

      return backup.receipts.length;
    } catch (error) {
      console.error('Error restoring backup:', error);
      throw error;
    }
  }
}

export const enhancedWebStorage = new EnhancedWebStorage();