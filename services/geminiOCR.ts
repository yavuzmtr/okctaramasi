/**
 * Google Gemini AI OCR Service
 * Fiş görsellerinden veri çıkarmak için Gemini 2.5 Flash kullanır
 */

import { withRateLimitRetry } from '../utils/retry';
import type { ReceiptScanResult } from '../types/receipt';

export interface GeminiConfig {
  apiKey: string;
  modelName?: string;
}

export class GeminiOCRService {
  private apiKey: string;
  private modelName: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(config: GeminiConfig) {
    this.apiKey = config.apiKey;
    this.modelName = config.modelName || 'gemini-2.0-flash-exp';
  }

  /**
   * Fiş görselinden veri çıkarır (Gemini API)
   * @param imageData - Base64 image data (data:image/jpeg;base64,... formatında)
   * @returns ReceiptScanResult
   */
  async extractReceiptData(imageData: string): Promise<ReceiptScanResult> {
    try {
      console.log('🤖 Gemini AI ile fiş analiz ediliyor...');

      // Base64 prefix'ini temizle
      const base64Data = imageData.split(',')[1] || imageData;
      const mimeType = imageData.match(/data:(image\/[^;]+)/)?.[1] || 'image/jpeg';

      const payload = {
        contents: [{
          role: "user",
          parts: [
            { text: this.buildPrompt() },
            {
              inlineData: {
                mimeType,
                data: base64Data
              }
            }
          ]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: this.getResponseSchema()
        }
      };

      // Rate limit ile retry mekanizması
      const response = await withRateLimitRetry(
        () => fetch(
          `${this.baseUrl}/${this.modelName}:generateContent?key=${this.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }
        ),
        { maxRetries: 5, baseDelay: 1000 }
      );

      const result = await response.json();
      const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!jsonText) {
        throw new Error('Gemini API\'den geçerli yanıt alınamadı');
      }

      const parsedData = JSON.parse(jsonText);
      console.log('✅ Gemini AI analiz tamamlandı:', parsedData);

      return this.convertToReceiptResult(parsedData);

    } catch (error) {
      console.error('❌ Gemini OCR hatası:', error);
      throw error;
    }
  }

  /**
   * Gemini için prompt oluşturur (Türkçe fiş analizi)
   */
  private buildPrompt(): string {
    return `Bu fişten aşağıdaki verileri Türkçe olarak JSON formatında çıkar:

1. **storeName**: Fişteki mağaza/şirket adı. Eğer bulunamazsa 'Bilinmeyen Mağaza' kullan.

2. **date**: Fiş tarihi (YYYY-MM-DD formatında, örn: 2025-01-24). Eğer tarih bulunamazsa bugünün tarihini kullan.

3. **items**: Fişdeki ürünlerin listesi. Her ürün için:
   - name: Ürün adı (string)
   - price: Ürün fiyatı (number, TL cinsinden)
   - quantity: Miktar (number, varsayılan 1)

4. **totalAmount**: Fişin KDV dahil toplam tutarı (number, TL cinsinden).

5. **confidence**: Okunan verilerin güvenilirlik skoru (0.0 - 1.0 arası).

**ÖNEMLI KURALLAR:**
- Tüm fiyatları sayısal değer olarak ver (örn: 152.75)
- Eğer bir alan bulunamazsa boş string veya 0 kullan
- Ürün listesi boşsa en az 1 boş ürün ekle
- Sadece JSON döndür, başka açıklama yapma

Örnek çıktı formatı:
{
  "storeName": "MİGROS",
  "date": "2025-01-15",
  "items": [
    {"name": "Süt", "price": 35.50, "quantity": 2},
    {"name": "Ekmek", "price": 8.00, "quantity": 1}
  ],
  "totalAmount": 79.00,
  "confidence": 0.95
}`;
  }

  /**
   * Gemini response schema tanımı
   */
  private getResponseSchema() {
    return {
      type: "OBJECT",
      properties: {
        storeName: {
          type: "STRING",
          description: "Mağaza/Şirket adı"
        },
        date: {
          type: "STRING",
          description: "Fiş tarihi (YYYY-MM-DD formatında)"
        },
        items: {
          type: "ARRAY",
          description: "Ürün listesi",
          items: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING", description: "Ürün adı" },
              price: { type: "NUMBER", description: "Ürün fiyatı (TL)" },
              quantity: { type: "NUMBER", description: "Miktar" }
            },
            required: ["name", "price", "quantity"]
          }
        },
        totalAmount: {
          type: "NUMBER",
          description: "Toplam tutar (KDV Dahil)"
        },
        confidence: {
          type: "NUMBER",
          description: "Güvenilirlik skoru (0-1)"
        }
      },
      required: ["storeName", "date", "items", "totalAmount", "confidence"]
    };
  }

  /**
   * Gemini çıktısını ReceiptScanResult formatına dönüştürür
   */
  private convertToReceiptResult(data: any): ReceiptScanResult {
    // Boş ürün listesini düzelt
    const items = data.items && data.items.length > 0
      ? data.items.map((item: any) => ({
          name: item.name || '',
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1
        }))
      : [{ name: '', price: 0, quantity: 1 }];

    return {
      storeName: data.storeName || 'Bilinmeyen Mağaza',
      date: data.date || new Date().toISOString().split('T')[0],
      items,
      totalAmount: Number(data.totalAmount) || 0,
      confidence: Number(data.confidence) || 0.5
    };
  }
}
