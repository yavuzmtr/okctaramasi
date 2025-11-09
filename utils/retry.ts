/**
 * Exponential Backoff ile Retry Mekanizması
 * API çağrılarında rate limit ve geçici hatalar için kullanılır
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

/**
 * Verilen fonksiyonu exponential backoff stratejisiyle tekrar dener
 * @param fn - Çalıştırılacak async fonksiyon
 * @param options - Retry ayarları
 * @returns Promise<T>
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 5,
    baseDelay = 1000,
    maxDelay = 32000
  } = options;

  let retries = 0;
  let lastError: Error;

  while (retries < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Son deneme ise hatayı fırlat
      if (retries === maxRetries - 1) {
        console.error(`❌ Maximum retry limit reached (${maxRetries}):`, lastError.message);
        throw lastError;
      }

      // Exponential backoff hesaplama: 2^retries * baseDelay + jitter
      const exponentialDelay = Math.pow(2, retries) * baseDelay;
      const jitter = Math.random() * 1000; // Rastgele 0-1000ms gecikme
      const delay = Math.min(exponentialDelay + jitter, maxDelay);

      console.warn(
        `⚠️ Retry attempt ${retries + 1}/${maxRetries} after ${Math.round(delay / 1000)}s delay...`,
        lastError.message
      );

      await new Promise(resolve => setTimeout(resolve, delay));
      retries++;
    }
  }

  // TypeScript için (normalde yukarıdaki throw'a ulaşır)
  throw lastError!;
}

/**
 * Rate limit (429) hatalarını özel olarak yönetir
 * @param fn - API çağrısı fonksiyonu
 * @param options - Retry ayarları
 */
export async function withRateLimitRetry<T>(
  fn: () => Promise<Response>,
  options: RetryOptions = {}
): Promise<Response> {
  return withRetry(async () => {
    const response = await fn();
    
    if (response.status === 429) {
      throw new Error(`Rate limit exceeded (429). Retrying...`);
    }
    
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorBody}`);
    }
    
    return response;
  }, options);
}
