// Runtime Gemini configuration using environment variables (works on Vercel)
// Use EXPO_PUBLIC_ prefix so Expo injects the value into the web bundle

export const GEMINI_CONFIG = {
  apiKey: (process.env.EXPO_PUBLIC_GEMINI_API_KEY as string) || '',
  modelName: 'gemini-2.0-flash-exp',
  // Allow toggle via env, default true
  enabled: (process.env.EXPO_PUBLIC_GEMINI_ENABLED || 'true').toLowerCase() === 'true'
};

export function isGeminiConfigured(): boolean {
  return (
    GEMINI_CONFIG.enabled === true &&
    typeof GEMINI_CONFIG.apiKey === 'string' &&
    GEMINI_CONFIG.apiKey.length > 20
  );
}

export function getGeminiConfigError(): string {
  if (!GEMINI_CONFIG.enabled) return 'Gemini OCR devre dışı (EXPO_PUBLIC_GEMINI_ENABLED=false).';
  if (!GEMINI_CONFIG.apiKey || GEMINI_CONFIG.apiKey.length < 20)
    return 'Gemini API key eksik. Vercel env: EXPO_PUBLIC_GEMINI_API_KEY';
  return '';
}
