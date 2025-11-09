// Web uyumlu storage servisi
import type { Receipt } from '@/types/receipt';
import { enhancedWebStorage } from './enhancedStorage';

const STORAGE_KEY = 'receipts';

class WebStorage {
  async getAllReceipts(): Promise<Receipt[]> {
    return enhancedWebStorage.getAllReceipts();
  }

  async saveReceipt(receipt: Omit<Receipt, 'id'>): Promise<string> {
    return enhancedWebStorage.saveReceipt(receipt);
  }

  async updateReceipt(id: string, updatedReceipt: Receipt): Promise<void> {
    return enhancedWebStorage.updateReceipt(id, updatedReceipt);
  }

  async deleteReceipt(id: string): Promise<void> {
    return enhancedWebStorage.deleteReceipt(id);
  }

  async getReceiptById(id: string): Promise<Receipt | null> {
    return enhancedWebStorage.getReceiptById(id);
  }

  async searchReceipts(query: string): Promise<Receipt[]> {
    return enhancedWebStorage.searchReceipts(query);
  }

  async getReceiptsByDateRange(startDate: Date, endDate: Date): Promise<Receipt[]> {
    return enhancedWebStorage.getReceiptsByDateRange(startDate, endDate);
  }

  async getTotalSpending(): Promise<number> {
    return enhancedWebStorage.getTotalSpending();
  }

  async clearAllReceipts(): Promise<void> {
    return enhancedWebStorage.clearAllReceipts();
  }

  // Yeni özellikler
  async getStorageInfo() {
    return enhancedWebStorage.getStorageInfo();
  }

  async createBackup(): Promise<string> {
    return enhancedWebStorage.createBackup();
  }

  async restoreFromBackup(backupString: string): Promise<number> {
    return enhancedWebStorage.restoreFromBackup(backupString);
  }
}

export const webStorage = new WebStorage();