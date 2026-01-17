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
    return `Sen bir Türk yazarkasa fiş analizcisiniz. Bu fişi Excel muhasebe raporu için analiz et.

**ÇOK ÖNEMLİ: Aşağıdaki TÜM BİLGİLERİ JSON formatında döndür:**

1. **storeName**: Mağaza/Şirket adı (ör: "HAKMAR", "ŞEN KASAP", "ARA COFFEE")

2. **category**: İşletme kategorisi. SADECE şunlardan biri:
   - "Market" (süpermarket, bakkal, market)
   - "Kasap" (et, kasap, kurban)
   - "Yemek" (restoran, lokanta, döner, kebap, lahmacun)
   - "Cafe" (kafe, kahve, coffee, pastane)
   - "Eczane" (eczane, pharmacy)
   - "Market/Tatlı" (tatlıcı, börekçi, kuruyemiş)
   - "Market/Manav" (manav, sebze, meyve)
   - "Unlu Mamül" (fırın, ekmek, unlu mamul)
   - "Diğer" (belirsiz)

3. **date**: Fiş tarihi (YYYY-MM-DD formatı, ör: "2026-01-17")

4. **receiptNo**: Fiş numarası (ör: "0007", "48"). Bulamazsan boş string.

5. **totalAmount**: TOPLAM TUTAR (KDV DAHİL) - En büyük sayı genelde bu (ör: 346.00)

6. **vatRate**: KDV ORANI - Türkiye'de sadece %1, %10 veya %20 olur. Fişte "KDV %" veya "TOPKDV" alanına bak.
   - Yemek/restoran genelde %10
   - Market/süpermarket genelde %1 veya %10
   - Diğer %20

7. **vatAmount**: KDV TUTARI - Fişte "TOPKDV", "KDV" veya benzeri alan (ör: 31.45)
   - Eğer bulamazsan: totalAmount * (vatRate / (100 + vatRate)) formülüyle hesapla

8. **netAmount**: MATRAH (KDV HARİÇ TUTAR) = totalAmount - vatAmount

9. **confidence**: Güvenilirlik (0.0-1.0). Tüm bilgiler netse 0.95, belirsizlik varsa 0.6-0.8

**ÖRNEK ÇIKTI:**
{
  "storeName": "AŞŞAN GİDA A.Ş",
  "category": "Yemek",
  "date": "2026-01-02",
  "receiptNo": "0007",
  "totalAmount": 346.00,
  "vatRate": 10,
  "vatAmount": 31.45,
  "netAmount": 314.55,
  "confidence": 0.95
}

**SADECE JSON DÖNDÜR, BAŞKA BİR ŞEY YAZMA!**`;
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
        category: {
          type: "STRING",
          description: "Kategori: Market, Kasap, Yemek, Cafe, Eczane, Market/Tatlı, Market/Manav, Unlu Mamül, Diğer"
        },
        date: {
          type: "STRING",
          description: "Fiş tarihi (YYYY-MM-DD formatında)"
        },
        receiptNo: {
          type: "STRING",
          description: "Fiş numarası"
        },
        totalAmount: {
          type: "NUMBER",
          description: "Toplam tutar (KDV Dahil)"
        },
        vatRate: {
          type: "NUMBER",
          description: "KDV oranı (%1, %10, veya %20)"
        },
        vatAmount: {
          type: "NUMBER",
          description: "KDV tutarı (TL)"
        },
        netAmount: {
          type: "NUMBER",
          description: "Matrah (KDV hariç tutar)"
        },
        confidence: {
          type: "NUMBER",
          description: "Güvenilirlik skoru (0-1)"
        }
      },
      required: ["storeName", "category", "date", "receiptNo", "totalAmount", "vatRate", "vatAmount", "netAmount", "confidence"]
    };
  }

  /**
   * Gemini çıktısını ReceiptScanResult formatına dönüştürür
   */
  private convertToReceiptResult(data: any): ReceiptScanResult {
    const totalAmount = Number(data.totalAmount) || 0;
    const vatRate = Number(data.vatRate) || 10;
    const vatAmount = Number(data.vatAmount) || (totalAmount * vatRate / (100 + vatRate));
    const netAmount = Number(data.netAmount) || (totalAmount - vatAmount);

    return {
      storeName: data.storeName || 'Bilinmeyen İşletme',
      category: data.category || 'Diğer',
      date: data.date || new Date().toISOString().split('T')[0],
      receiptNo: data.receiptNo || '',
      items: [{ name: '-', price: totalAmount, quantity: 1 }], // Dummy data
      totalAmount,
      vatRate,
      vatAmount,
      netAmount,
      confidence: Number(data.confidence) || 0.7
    };
  }
}
