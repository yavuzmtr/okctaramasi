import { Platform } from 'react-native';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

class PWAService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isInstalled = false;
  private installPromptCallbacks: ((canInstall: boolean) => void)[] = [];

  constructor() {
    if (Platform.OS === 'web') {
      this.initializePWA();
    }
  }

  private initializePWA() {
    // Service Worker kaydı
    this.registerServiceWorker();

    // PWA kurulum eventi dinleyicileri
    this.setupInstallPrompt();

    // Kurulum durumunu kontrol et
    this.checkInstallStatus();
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        console.log('Service Worker registered successfully:', registration.scope);

        // Service Worker güncellemelerini kontrol et
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // Yeni güncelleme mevcut
                  this.showUpdateAvailable();
                }
              }
            });
          }
        });

      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  private setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (event: Event) => {
      event.preventDefault();
      this.deferredPrompt = event as BeforeInstallPromptEvent;
      
      // Kurulum butonunu göster
      this.notifyInstallPromptReady(true);
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA successfully installed');
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.notifyInstallPromptReady(false);
    });
  }

  private checkInstallStatus() {
    // Standalone modda çalışıp çalışmadığını kontrol et
    if (window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true) {
      this.isInstalled = true;
    }
  }

  private notifyInstallPromptReady(canInstall: boolean) {
    this.installPromptCallbacks.forEach(callback => callback(canInstall));
  }

  // Public methods
  canInstall(): boolean {
    return !!this.deferredPrompt && !this.isInstalled;
  }

  isAppInstalled(): boolean {
    return this.isInstalled;
  }

  async showInstallPrompt(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    try {
      await this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      this.deferredPrompt = null;
      this.notifyInstallPromptReady(false);
      
      return outcome === 'accepted';
    } catch (error) {
      console.error('Install prompt failed:', error);
      return false;
    }
  }

  onInstallPromptReady(callback: (canInstall: boolean) => void) {
    this.installPromptCallbacks.push(callback);
    
    // Hemen mevcut durumu bildir
    callback(this.canInstall());
    
    // Cleanup fonksiyonu döndür
    return () => {
      const index = this.installPromptCallbacks.indexOf(callback);
      if (index > -1) {
        this.installPromptCallbacks.splice(index, 1);
      }
    };
  }

  private showUpdateAvailable() {
    // Güncelleme bildirimi göster
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Güncelleme Mevcut', {
        body: 'Fiş Tarayıcı uygulamasının yeni sürümü hazır. Sayfayı yenileyin.',
        icon: '/assets/images/icon-192.png',
        tag: 'app-update',
        requireInteraction: true
      });
    }
  }

  // Offline storage desteği
  async isOnline(): Promise<boolean> {
    if (!navigator.onLine) {
      return false;
    }

    // Gerçek bağlantı testi
    try {
      const response = await fetch('/manifest.json', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Push notification desteği
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async showNotification(title: string, options?: NotificationOptions) {
    if (await this.requestNotificationPermission()) {
      new Notification(title, {
        icon: '/assets/images/icon-192.png',
        badge: '/assets/images/icon-96.png',
        ...options
      });
    }
  }

  // Background sync support
  async scheduleBackgroundSync(tag: string) {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        // Background sync is not available in all browsers
        if ('sync' in registration) {
          await (registration as any).sync.register(tag);
        }
        console.log('Background sync scheduled:', tag);
      } catch (error) {
        console.error('Background sync failed:', error);
      }
    }
  }

  // Storage usage
  async getStorageEstimate(): Promise<{ used: number; available: number } | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          available: estimate.quota || 0
        };
      } catch (error) {
        console.error('Storage estimate failed:', error);
      }
    }
    return null;
  }
}

export const pwaService = new PWAService();