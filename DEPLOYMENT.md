# 🚀 GitHub ve Vercel Deployment Rehberi

## 📦 Adım 1: GitHub Repository Oluşturma

### Web Üzerinden (Önerilen)

1. **GitHub'a gidin**: https://github.com/new
2. **Repository bilgilerini girin**:
   - Repository name: `yazarkasa-fis-okuyucu` (veya istediğiniz isim)
   - Description: "Akıllı fiş tarama ve analiz uygulaması - Gemini AI OCR"
   - Visibility: **Public** (Vercel ücretsiz plan için)
   - ❌ **Initialize with README** - İŞARETLEMEYİN (zaten README var)
3. **Create repository** butonuna tıklayın

### Oluşturduktan Sonra

GitHub size şu gibi komutlar gösterecek:

```bash
git remote add origin https://github.com/KULLANICI_ADINIZ/yazarkasa-fis-okuyucu.git
git branch -M main
git push -u origin main
```

## 📤 Adım 2: Kodu GitHub'a Push Etme

Aşağıdaki komutları çalıştırın (KULLANICI_ADINIZ ve REPO_ADINIZ'i değiştirin):

```powershell
cd "c:\Users\YAVUZ\Desktop\programlar\bolt\ökc tarayıcı\project"

# Remote repository'yi ekle
git remote add origin https://github.com/KULLANICI_ADINIZ/REPO_ADINIZ.git

# Ana branch'i main olarak ayarla
git branch -M main

# Kodu GitHub'a push et
git push -u origin main
```

**İlk push'ta GitHub kullanıcı adı ve şifre/token istenecek!**

## 🔐 GitHub Authentication

### GitHub Personal Access Token Oluşturma

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token (classic)" tıklayın
3. **Note**: "Yazarkasa Deploy"
4. **Expiration**: 90 days veya No expiration
5. **Scopes**: Sadece `repo` işaretleyin
6. Generate token ve **kopyalayın** (bir daha göremezsiniz!)

### Token ile Push

```powershell
git push -u origin main

# Username: <GitHub_kullanıcı_adınız>
# Password: <token_değerini_buraya_yapıştırın>
```

## 🌐 Adım 3: Vercel'e Deploy

### 3.1 Vercel Hesabı Oluşturun

1. https://vercel.com adresine gidin
2. **"Sign Up"** tıklayın
3. **"Continue with GitHub"** seçin
4. GitHub hesabınızla bağlanın

### 3.2 Proje İmport Edin

1. Vercel Dashboard → **"Add New..." → "Project"**
2. GitHub repository listesinden **"yazarkasa-fis-okuyucu"** seçin
3. **Import** tıklayın

### 3.3 Build Ayarları

Vercel otomatik algılayacak ama kontrol edin:

```
Framework Preset: Expo
Build Command: npx expo export --platform web
Output Directory: dist
Install Command: npm install
```

### 3.4 Environment Variables

⚠️ **ÖNEMLİ**: Gemini API key'i Vercel'e ekleyin:

1. **"Environment Variables"** bölümüne gidin
2. Şunu ekleyin:
   ```
   Key: EXPO_PUBLIC_GEMINI_API_KEY
   Value: AIzaSyA7JT8jk6xhN4Hv0INCvpUVgB9vMgvJruA
   ```
3. **"Add"** tıklayın

### 3.5 Deploy Başlatın

1. **"Deploy"** butonuna tıklayın
2. 2-5 dakika bekleyin
3. ✅ Deployment tamamlandı!

### 3.6 Canlı URL'yi Alın

Deploy tamamlandıktan sonra:
```
https://yazarkasa-fis-okuyucu.vercel.app
```

## 🔄 Otomatik Deployment

Artık her GitHub push'unuzda Vercel otomatik deploy yapacak:

```powershell
# Değişiklik yap
git add .
git commit -m "feat: yeni özellik eklendi"
git push

# Vercel otomatik deploy başlatır ✅
```

## 🛠️ Production Config Güncellemesi

`config/gemini.config.ts` dosyasını production için güncelleyin:

```typescript
export const GEMINI_CONFIG = {
  // Production'da environment variable kullan
  apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
  modelName: 'gemini-2.0-flash-exp',
  enabled: true
};
```

## ✅ Kontrol Listesi

- [ ] GitHub repository oluşturuldu
- [ ] Kod GitHub'a push edildi
- [ ] Vercel hesabı açıldı
- [ ] GitHub ile Vercel bağlandı
- [ ] Proje Vercel'e import edildi
- [ ] Environment variables eklendi
- [ ] İlk deployment tamamlandı
- [ ] Canlı URL çalışıyor
- [ ] Gemini OCR test edildi

## 🎯 Test Senaryosu

Deployment sonrası test edin:

1. Vercel URL'yi açın: `https://yazarkasa-fis-okuyucu.vercel.app`
2. Kamera iznini verin
3. Bir fiş fotoğrafı çekin
4. Developer Console'u açın (F12)
5. Şu logları görmeli:
   ```
   🤖 Gemini AI kullanılıyor...
   ✅ Gemini AI başarılı!
   ```

## 🚨 Sorun Giderme

### "git push" çalışmıyor
```powershell
# Token ile manuel push
git remote set-url origin https://TOKEN@github.com/KULLANICI/REPO.git
git push
```

### Vercel build hatası
- Build logs'u kontrol edin
- `package.json` dosyasında `"build": "expo export --platform web"` olmalı

### Gemini API çalışmıyor
- Vercel → Project Settings → Environment Variables
- `EXPO_PUBLIC_GEMINI_API_KEY` değişkenini kontrol edin
- Redeploy yapın: Deployments → ... → Redeploy

## 📱 Mobil Deployment (Opsiyonel)

### iOS/Android için Expo EAS Build

```bash
# EAS CLI kur
npm install -g eas-cli

# EAS login
eas login

# Build konfigürasyonu oluştur
eas build:configure

# iOS build
eas build --platform ios

# Android build
eas build --platform android
```

## 🎉 Tamamlandı!

Projeniz artık:
- ✅ GitHub'da güvenli şekilde saklanıyor
- ✅ Vercel'de canlıda
- ✅ Her push'ta otomatik deploy
- ✅ HTTPS ile güvenli
- ✅ Gemini AI ile güçlendirilmiş

**Canlı URL**: https://yazarkasa-fis-okuyucu.vercel.app

---

Herhangi bir sorunla karşılaşırsanız:
1. GitHub Issues açın
2. Vercel Logs kontrol edin
3. Browser Console kontrol edin
