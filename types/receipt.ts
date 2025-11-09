export interface ReceiptItem {
  name: string;
  price: number;
  quantity?: number;
}

export interface Receipt {
  id: string;
  storeName: string;
  date: string;
  totalAmount: number;
  items: ReceiptItem[];
  imageUri?: string;
  scanDate: string;
  category?: string;
  notes?: string;
}

export interface ReceiptScanResult {
  storeName: string;
  date: string;
  totalAmount: number;
  items: ReceiptItem[];
  confidence: number;
}