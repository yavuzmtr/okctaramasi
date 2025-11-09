/**
 * Gemini API Konfigürasyonu - ÖRNEK DOSYA
 * 
 * KULLANIM:
 * 1. Bu dosyayı "gemini.config.ts" olarak kopyalayın
 * 2. Google AI Studio'dan API key alın: https://aistudio.google.com/app/apikey
 * 3. Aşağıdaki apiKey değerini kendi key'inizle değiştirin
 * 4. enabled değerini true yapın
 * 
 * GÜVENLİK NOTU:
 * - gemini.config.ts dosyası .gitignore'a eklenmiştir
 * - API key'iniz asla GitHub'a yüklenmeyecek
 */

export const GEMINI_CONFIG = {
  // Buraya kendi Gemini API key'inizi yazın
  apiKey: '', // ÖRNEK: 'AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
  
  // Model seçimi (varsayılan: gemini-2.0-flash-exp)
  // Diğer seçenekler: gemini-1.5-flash, gemini-1.5-pro
  modelName: 'gemini-2.0-flash-exp',
  
  // Gemini OCR'ı kullanmak için bu değeri true yapın
  enabled: false
};

/**
 * API key'in geçerli olup olmadığını kontrol eder
 */
export function isGeminiConfigured(): boolean {
  return GEMINI_CONFIG.enabled && 
         GEMINI_CONFIG.apiKey !== '' && 
         GEMINI_CONFIG.apiKey.length > 20;
}

/**
 * Hata mesajı gösterir
 */
export function getGeminiConfigError(): string {
  if (!GEMINI_CONFIG.enabled) {
    return 'Gemini OCR devre dışı. config.ts dosyasında enabled=true yapın.';
  }
  if (!GEMINI_CONFIG.apiKey || GEMINI_CONFIG.apiKey.length < 20) {
    return 'Gemini API key eksik veya geçersiz. config.ts dosyasını kontrol edin.';
  }
  return '';
}
