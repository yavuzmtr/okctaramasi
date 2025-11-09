# Yazarkasa Fiş Tarayıcısı - Test Rehberi

Bu rehber, yazarkasa fişlerini tarayıp Excel raporu oluşturan PWA uygulamasının test edilmesi için hazırlanmıştır.

## 🚀 Hızlı Başlangıç

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev
```

## ✅ Test Edilecek Özellikler

### 1. 📷 Kamera ve Fiş Tarama

**Web Tarayıcısında:**
- [ ] Kamera izni istenir
- [ ] Video önizleme çalışır
- [ ] Fotoğraf çekme butonu çalışır
- [ ] Dosya yükleme alternatifi çalışır
- [ ] OCR işlemi gerçekleşir (Tesseract.js)
- [ ] Sonuç doğru şekilde ayrıştırılır

**Mobil Cihazda:**
- [ ] Expo Camera açılır
- [ ] Ön/arka kamera değişimi çalışır
- [ ] Fotoğraf çekme çalışır
- [ ] OCR simülasyonu çalışır

### 2. 📊 OCR ve Veri Ayrıştırma

**Test Senaryoları:**
- [ ] Türkçe mağaza adları tanınır (MİGROS, BİM, A101, vs.)
- [ ] Tarih formatları ayrıştırılır (dd/mm/yyyy, dd.mm.yyyy)
- [ ] Ürün adları ve fiyatları çıkarılır
- [ ] Toplam tutar hesaplanır
- [ ] Güven skoru hesaplanır

**Test Fişleri:**
```
MİGROS BEYOĞLU
21/10/2025 14:30

EKMEK                    5.50
SÜT 1LT                 12.75
YOĞURT 500G              8.90
PEYNİR BEYAZ            25.80
DOMATES 1KG             15.60

TOPLAM                  68.55
```

### 3. 💾 Veri Saklama ve Yönetim

**IndexedDB (Birincil):**
- [ ] Veritabanı başlatılır
- [ ] Fişler kaydedilir
- [ ] Arama çalışır
- [ ] Tarih filtreleme çalışır
- [ ] Güncelleme ve silme çalışır

**localStorage (Yedek):**
- [ ] IndexedDB başarısız olursa localStorage devreye girer
- [ ] Veriler localStorage'den IndexedDB'ye migrate edilir
- [ ] Yedekleme ve geri yükleme çalışır

### 4. 📋 Fiş Geçmişi

- [ ] Tüm fişler listelenir
- [ ] Arama çalışır (mağaza adı, ürün adı)
- [ ] Fiş düzenleme modal'ı açılır
- [ ] Fiş güncelleme çalışır
- [ ] Fiş silme çalışır
- [ ] Boş durum mesajı gösterilir

### 5. 📈 Excel Export

**XLSX Formatı:**
- [ ] Excel dosyası oluşturulur
- [ ] 4 sayfa oluşturulur:
  - Tüm Fişler
  - Mağaza Özeti  
  - Aylık Analiz
  - Ürün Analizi
- [ ] Kolon genişlikleri otomatik ayarlanır
- [ ] Header'lar biçimlendirilir
- [ ] Dosya indirilir

**CSV Yedek:**
- [ ] XLSX başarısız olursa CSV formatı devreye girer
- [ ] CSV dosyası doğru formatlanır
- [ ] Türkçe karakterler korunur

### 6. 🌐 PWA Özellikleri

**Kurulum:**
- [ ] PWA kurulum promptu gösterilir
- [ ] Ana ekrana ekleme çalışır
- [ ] Standalone modda açılır
- [ ] Manifest.json doğru yüklenir

**Offline Çalışma:**
- [ ] Service Worker kaydedilir
- [ ] Statik dosyalar cache'lenir
- [ ] Offline durumda uygulama çalışır
- [ ] Offline sayfası gösterilir
- [ ] Cache stratejileri çalışır

**Bildirimler:**
- [ ] Bildirim izni istenir
- [ ] Push notification gösterilir
- [ ] Güncelleme bildirimi çalışır

## 🧪 Test Adımları

### 1. Temel İşlev Testi

1. **Uygulama Açılışı:**
   ```bash
   npm run dev
   # http://localhost:8081 adresine git
   ```

2. **Kamera Testi:**
   - Kamera sekmesine git
   - İzin ver butonuna tıkla
   - Kamera açıldığını kontrol et
   - Test fişi fotoğrafı çek
   - OCR sonucunu kontrol et

3. **Veri Saklama Testi:**
   - Tarama sonrası fiş kaydedildiğini kontrol et
   - Geçmiş sekmesinde fişin göründüğünü kontrol et
   - Developer Tools > Application > IndexedDB kontrol et

4. **Excel Export Testi:**
   - Dışa Aktar sekmesine git
   - "Excel'e Aktar" butonuna tıkla
   - Dosyanın indirildiğini kontrol et
   - Excel dosyasını aç ve içeriği kontrol et

### 2. PWA Testi

1. **Kurulum Testi:**
   - PWA kurulum prompt'unun çıktığını kontrol et
   - "Ana Ekrana Ekle" tıkla
   - Masaüstü/ana ekran ikonunu kontrol et

2. **Offline Testi:**
   - Developer Tools > Network > Offline
   - Sayfayı yenile
   - Offline sayfa gösterildiğini kontrol et
   - Online ol
   - Uygulama normal çalıştığını kontrol et

### 3. Stres Testi

1. **Çoklu Fiş Testi:**
   - 50+ fiş ekle
   - Performansı kontrol et
   - Arama hızını test et
   - Export süresini ölç

2. **Storage Testi:**
   - Storage limit'e yaklaş
   - Hata handling'i kontrol et
   - Backup/restore test et

## 🐛 Bilinen Sorunlar ve Çözümler

### OCR Sorunları:
- **Problem:** Tesseract.js yavaş yükleniyor
- **Çözüm:** Loading indicator eklendi, CDN'den yükleniyor

### Kamera Sorunları:
- **Problem:** HTTPS gereksinimi
- **Çözüm:** localhost'ta çalışır, production'da HTTPS gerekli

### Storage Sorunları:
- **Problem:** Safari'de IndexedDB sınırlamaları
- **Çözüm:** localStorage fallback eklendi

## 📱 Mobil Test

### iOS (Safari):
- [ ] PWA kurulumu çalışır
- [ ] Kamera erişimi çalışır
- [ ] Dosya paylaşımı çalışır
- [ ] Offline mod çalışır

### Android (Chrome):
- [ ] PWA kurulumu çalışır
- [ ] Kamera erişimi çalışır
- [ ] Dosya indirme çalışır
- [ ] Background sync çalışır

## 🎯 Performans Metrikleri

- **İlk Yüklenme:** < 3 saniye
- **OCR İşlemi:** < 10 saniye
- **Excel Export:** < 5 saniye
- **PWA Kurulum:** < 30 saniye
- **Offline Yükleme:** < 1 saniye

## 🔧 Debug Araçları

```javascript
// Console'da debug bilgileri
console.log('OCR Service Status:', ocrService);
console.log('Storage Info:', await webStorage.getStorageInfo());
console.log('PWA Status:', pwaService.isAppInstalled());

// Service Worker debug
navigator.serviceWorker.getRegistrations().then(console.log);

// IndexedDB debug
// Developer Tools > Application > Storage > IndexedDB
```

## 📝 Test Raporu Şablonu

```
Yazarkasa Fiş Tarayıcısı Test Raporu
Tarih: [TARİH]
Test Eden: [İSİM]
Platform: [WEB/ANDROID/iOS]
Tarayıcı: [CHROME/SAFARI/FIREFOX]

✅ BAŞARILI TESTLER:
- [ ] Kamera açılışı
- [ ] OCR işlemi
- [ ] Veri saklama
- [ ] Excel export
- [ ] PWA kurulum
- [ ] Offline çalışma

❌ BAŞARISIZ TESTLER:
- [ ] [TEST ADI] - [SORUN AÇIKLAMASI]

🐛 BULUNAN HATALAR:
1. [HATA AÇIKLAMASI]
2. [ÇOĞALTMA ADÍMLARI]
3. [BEKLENEN SONUÇ]
4. [GERÇEK SONUÇ]

📊 PERFORMANS:
- İlk yüklenme: [SÜRE]
- OCR süresi: [SÜRE] 
- Export süresi: [SÜRE]

💡 ÖNERİLER:
- [İYİLEŞTİRME ÖNERİSİ 1]
- [İYİLEŞTİRME ÖNERİSİ 2]
```