# 🧾 Yazarkasa Fiş Tarayıcısı

Modern, akıllı yazarkasa fişlerini tarayıp Excel raporu oluşturan Progressive Web App uygulaması.

## ✨ Özellikler

### 📷 Akıllı Fiş Tarama
- **Kamera Entegrasyonu**: Web ve mobil kamera desteği
- **OCR Teknolojisi**: Tesseract.js ile Türkçe metin tanıma
- **Dosya Yükleme**: Alternatif fiş fotoğrafı yükleme
- **Görüntü Optimizasyonu**: Otomatik kontrast ve kalite artırma

### 🧠 Gelişmiş Veri İşleme
- **Akıllı Ayrıştırma**: Mağaza adı, tarih, ürün ve fiyat tanıma
- **Türkçe Destek**: Türk marketlerini tanıma (Migros, BİM, A101, vb.)
- **Hata Düzeltme**: Manuel düzenleme ve doğrulama
- **Güven Skoru**: OCR doğruluk oranı gösterimi

### 💾 Güçlü Veri Saklama
- **Çift Katman**: IndexedDB (birincil) + localStorage (yedek)
- **Offline Destek**: İnternet olmadan çalışma
- **Otomatik Backup**: Veri güvenliği ve geri yükleme
- **Hızlı Arama**: Mağaza ve ürün bazlı filtreleme

### 📊 Kapsamlı Raporlama
- **Excel Export**: Tam özellikli XLSX dosyası (4 sayfa)
- **CSV Yedek**: Uyumluluk için CSV formatı
- **Detaylı Analiz**: Mağaza, aylık ve ürün analizleri
- **Görsel Özet**: Harcama istatistikleri

### 🌐 PWA Özellikleri
- **Ana Ekrana Ekleme**: Native app deneyimi
- **Offline Çalışma**: Service Worker cache
- **Push Notification**: Güncelleme bildirimleri
- **Responsive Design**: Tüm cihazlarda mükemmel görünüm

## 🚀 Hızlı Başlangıç

### Gereksinimler
- Node.js 18+ 
- npm veya yarn
- Modern web tarayıcısı (Chrome, Safari, Firefox)

### Kurulum
```bash
# Depoyu klonla
git clone [REPO_URL]
cd yazarkasa-fis-tarayici

# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev

# Tarayıcıda aç
# http://localhost:8081
```

### Production Build
```bash
# Web için build
npm run build:web

# Build dosyalarını serve et
npx serve dist
```

## 📱 Desteklenen Platformlar

### Web Tarayıcıları
- ✅ Chrome 80+
- ✅ Safari 14+
- ✅ Firefox 78+
- ✅ Edge 80+

### Mobil Platformlar  
- ✅ iOS 14+ (Safari, Chrome)
- ✅ Android 8+ (Chrome, Samsung Internet)
- ✅ PWA olarak kurulabilir

## 🏗️ Teknik Mimari

### Frontend Stack
- **React Native + Expo**: Cross-platform framework
- **TypeScript**: Tip güvenliği
- **Expo Router**: File-based routing
- **Lucide Icons**: Modern ikonlar

### OCR ve Görüntü İşleme
- **Tesseract.js**: Client-side OCR
- **Canvas API**: Görüntü ön işleme
- **Expo Camera**: Native kamera erişimi
- **Image Manipulation**: Kalite optimizasyonu

### Veri Saklama
- **IndexedDB**: Birincil veri deposu
- **localStorage**: Yedek ve fallback
- **Service Worker**: Cache yönetimi
- **Auto Migration**: Seamless veri geçişi

### Export ve Raporlama
- **XLSX.js**: Excel dosya üretimi
- **Multi-sheet**: 4 farklı analiz sayfası
- **Auto-formatting**: Otomatik kolon genişliği
- **CSV Fallback**: Maksimum uyumluluk

## 📂 Proje Yapısı

```
yazarkasa-fis-tarayici/
├── app/                    # Ana uygulama sayfaları
│   ├── (tabs)/            # Tab navigasyon
│   │   ├── index.tsx      # Tarama ekranı
│   │   ├── history.tsx    # Geçmiş ekranı
│   │   └── export.tsx     # Dışa aktarma ekranı
│   └── _layout.tsx        # Ana layout
├── components/            # Tekrar kullanılabilir bileşenler
│   └── PWAInstallPrompt.tsx
├── services/              # İş mantığı servisleri
│   ├── ocrService.ts      # OCR işlemleri
│   ├── excelService.ts    # Excel export
│   ├── webStorage.ts      # Veri saklama
│   ├── enhancedStorage.ts # IndexedDB wrapper
│   ├── pwaService.ts      # PWA özellikleri
│   └── webCameraService.ts# Kamera yönetimi
├── types/                 # TypeScript tipleri
│   └── receipt.ts
├── public/               # Statik dosyalar
│   ├── manifest.json     # PWA manifest
│   ├── sw.js            # Service Worker
│   └── offline.html     # Offline sayfası
└── assets/              # Görseller ve fontlar
```

## 🔧 Yapılandırma

### PWA Ayarları
```json
// public/manifest.json
{
  "name": "Fiş Tarayıcı - Receipt Scanner",
  "short_name": "Fiş Tarayıcı",
  "display": "standalone",
  "theme_color": "#3B82F6",
  "background_color": "#F8FAFC"
}
```

### OCR Ayarları
```typescript
// services/ocrService.ts
const OCR_CONFIG = {
  languages: 'tur+eng',
  confidence: 0.8,
  preprocessing: true,
  fallback: true
};
```

### Cache Stratejisi
```javascript
// public/sw.js
const CACHE_STRATEGIES = {
  STATIC: 'cache-first',      // HTML, CSS, JS
  API: 'network-first',       // API çağrıları
  OCR: 'stale-while-revalidate' // OCR kütüphaneleri
};
```

## 🧪 Test Etme

### Geliştirme Testleri
```bash
# Birim testleri çalıştır
npm run test

# E2E testleri çalıştır  
npm run test:e2e

# Test coverage raporu
npm run test:coverage
```

### Manuel Test Rehberi
Detaylı test adımları için [TEST_GUIDE.md](TEST_GUIDE.md) dosyasına bakın.

### Test Fişi Örnekleri
```
MİGROS BEYOĞLU
21/10/2025 14:30

EKMEK                    5.50
SÜT 1LT                 12.75
TOPLAM                  18.25
```

## 🔒 Güvenlik ve Gizlilik

### Veri Güvenliği
- ✅ **Yerel Depolama**: Tüm veriler cihazda saklanır
- ✅ **HTTPS Zorla**: Güvenli bağlantı gereksinimi
- ✅ **No Tracking**: Kişisel veri takibi yok
- ✅ **Encryption**: Hassas bilgiler şifrelenir

### Gizlilik Politikası
- Fotoğraflar yalnızca OCR için kullanılır
- Hiçbir veri üçüncü taraflara gönderilmez
- Kullanıcı dilediğinde tüm veriyi silebilir
- Offline çalışma tam gizlilik sağlar

## 🌟 Öne Çıkan Avantajlar

### Kullanıcı Deneyimi
- **Tek Dokunuş**: Fotoğraf çek, OCR işle, kaydet
- **Hızlı Erişim**: PWA ana ekran entegrasyonu
- **Offline First**: İnternet gerektirmez
- **Modern Tasarım**: Material Design prensipleri

### Teknik Üstünlükler
- **Zero Server**: Sunucu maliyeti yok
- **Edge Computing**: Client-side OCR
- **Progressive Enhancement**: Aşamalı özellik aktifleşmesi
- **Cache Strategy**: Akıllı önbellekleme

### İş Değeri
- **Maliyet Etkin**: Ücretsiz kullanım
- **Ölçeklenebilir**: Kullanıcı başına maliyet yok
- **Güvenilir**: Offline çalışma garantisi
- **Uyumlu**: Tüm platformlarda çalışır

## 🚀 Gelecek Özellikleri

### Kısa Vadeli (v1.1)
- [ ] QR kod desteği
- [ ] Bulk fiş yükleme
- [ ] PDF export
- [ ] Dark mode

### Orta Vadeli (v1.2)
- [ ] Cloud sync (opsiyonel)
- [ ] AI-powered kategorileme
- [ ] Bütçe takip
- [ ] Grafik raporlar

### Uzun Vadeli (v2.0)
- [ ] Multi-language
- [ ] Kurumsal özellikler
- [ ] API entegrasyonları
- [ ] Advanced analytics

## 🤝 Katkıda Bulunma

### Katkı Türleri
- 🐛 Bug raporları
- 💡 Özellik önerileri  
- 📝 Dokümantasyon
- 🔧 Kod katkıları
- 🌍 Çeviriler

### Geliştirme Süreci
```bash
# Fork et ve klonla
git clone [YOUR_FORK]

# Feature branch oluştur
git checkout -b feature/yeni-ozellik

# Değişiklikleri commit et
git commit -m "feat: yeni özellik eklendi"

# Push ve Pull Request oluştur
git push origin feature/yeni-ozellik
```

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 📞 İletişim ve Destek

### Destek Kanalları
- 🐛 **Bug Reports**: GitHub Issues
- 💡 **Feature Requests**: GitHub Discussions  
- 📧 **Email**: [EMAIL]
- 💬 **Discord**: [DISCORD_LINK]

### Dokümantasyon Links
- 📚 [API Dokümantasyonu](docs/API.md)
- 🎨 [UI Component Rehberi](docs/COMPONENTS.md)
- 🔧 [Deployment Rehberi](docs/DEPLOYMENT.md)
- 🧪 [Test Rehberi](TEST_GUIDE.md)

---

**Made with ❤️ for Turkish small businesses**

*Bu uygulama Türkiye'deki küçük işletmelerin dijital dönüşümüne katkı sağlamak amacıyla geliştirilmiştir.*