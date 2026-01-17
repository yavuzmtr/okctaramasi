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
  category: string; // Kategori: Market, Kasap, Cafe, Yemek, vb.
  date: string;
  receiptNo: string; // Fiş No
  totalAmount: number; // Toplam Tutar (KDV Dahil)
  vatRate: number; // KDV Oranı (%1, %10, %20)
  vatAmount: number; // KDV Tutarı
  netAmount: number; // Matrah (KDV hariç)
  items: ReceiptItem[]; // Opsiyonel, kullanılmayacak
  confidence: number;
}