# 🤖 Gemini AI OCR Entegrasyonu

Bu proje artık **Google Gemini 2.0 Flash** ile güçlendirilmiş OCR özelliğine sahip!

## 📋 Kurulum Adımları

### 1️⃣ Google AI Studio'dan API Key Alın

1. [Google AI Studio](https://aistudio.google.com/app/apikey) adresine gidin
2. "Create API Key" butonuna tıklayın
3. API key'inizi kopyalayın (örnek: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)

### 2️⃣ API Key'i Yapılandırın

`config/gemini.config.ts` dosyasını açın ve şu değerleri güncelleyin:

```typescript
export const GEMINI_CONFIG = {
  // Buraya kendi Gemini API key'inizi yazın
  apiKey: 'AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', // 👈 BURAYA YAPIŞTIRIN
  
  // Model seçimi (varsayılan: gemini-2.0-flash-exp)
  modelName: 'gemini-2.0-flash-exp',
  
  // Gemini OCR'ı kullanmak için bu değeri true yapın
  enabled: true // 👈 BUNU true YAPIN
};
```

### 3️⃣ Uygulamayı Başlatın

```bash
npx expo start --clear
```

## 🔄 OCR Öncelik Sırası

Uygulama şu sırayla OCR yapar:

```
1️⃣ Gemini AI (Eğer yapılandırılmışsa)
   ↓ (Başarısız olursa)
2️⃣ Tesseract.js (Web platformunda)
   VEYA
   Pattern Recognition (Mobil platformda)
   ↓ (Başarısız olursa)
3️⃣ Empty Template (Manuel giriş için)
```

## 📂 Yeni Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `services/geminiOCR.ts` | Gemini AI OCR servisi |
| `utils/retry.ts` | Exponential backoff retry mekanizması |
| `config/gemini.config.ts` | API key ve ayarlar |

## 🎯 Gemini AI Özellikleri

✅ **Türkçe fiş desteği** - Türk market, restoran, eczane fişleri  
✅ **Otomatik veri çıkarma** - Mağaza adı, tarih, ürünler, toplam  
✅ **Rate limit yönetimi** - 429 hatalarında otomatik retry  
✅ **Fallback sistemi** - Gemini başarısız olursa Tesseract devreye girer  
✅ **Güvenilirlik skoru** - 0-1 arası confidence değeri  

## 📊 Gemini vs Tesseract

| Özellik | Gemini AI | Tesseract.js |
|---------|-----------|--------------|
| **Doğruluk** | ⭐⭐⭐⭐⭐ Çok yüksek | ⭐⭐⭐ Orta |
| **Hız** | ⚡ Hızlı (1-3 saniye) | 🐢 Yavaş (5-10 saniye) |
| **Türkçe** | ✅ Mükemmel | ⚠️ Orta |
| **Platform** | 📱🌐 Tüm platformlar | 🌐 Sadece web |
| **Maliyet** | 💰 API ücreti | 🆓 Ücretsiz |
| **Offline** | ❌ İnternet gerekli | ✅ Offline çalışır |

## 🔒 Güvenlik Notları

⚠️ **ÖNEMLİ**: API key'inizi asla GitHub'a push etmeyin!

### .gitignore'a ekleyin:
```
# Gemini API Configuration
config/gemini.config.ts
.env
```

### Production için .env kullanın:
```bash
# .env dosyası oluşturun
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Ardından config dosyasında:
```typescript
apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY || ''
```

## 🧪 Test Etme

1. API key'i `config/gemini.config.ts` dosyasına yapıştırın
2. `enabled: true` yapın
3. Uygulamayı başlatın
4. Bir fiş fotoğrafı çekin
5. Konsolu kontrol edin:
   ```
   🤖 Gemini AI kullanılıyor...
   🤖 Gemini AI ile fiş analiz ediliyor...
   ✅ Gemini AI analiz tamamlandı: {...}
   ✅ Gemini AI başarılı!
   ```

## ❓ Sorun Giderme

### "Gemini API key eksik veya geçersiz"
- `config/gemini.config.ts` dosyasında `apiKey` değerini kontrol edin
- API key'in en az 30 karakter olduğundan emin olun

### "Rate limit exceeded (429)"
- Retry mekanizması otomatik devreye girer
- 1s, 2s, 4s, 8s, 16s aralıklarla tekrar dener
- 5 denemeden sonra fallback'e geçer

### Gemini çalışmıyor
- İnternet bağlantınızı kontrol edin
- API key'in geçerli olduğundan emin olun
- Console loglarını inceleyin

## 📖 Daha Fazla Bilgi

- [Gemini API Dokümantasyonu](https://ai.google.dev/docs)
- [Google AI Studio](https://aistudio.google.com/)
- [Gemini Pricing](https://ai.google.dev/pricing)

## 🎉 Kullanıma Hazır!

Artık projeniz Gemini AI ile güçlendirildi. İyi taramalar! 🚀
