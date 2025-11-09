import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAHookResult {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  installPWA: () => Promise<void>;
  showInstallPrompt: boolean;
  dismissInstallPrompt: () => void;
}

export function usePWA(): PWAHookResult {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<PWAInstallPrompt | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Check if app is already installed
    const checkInstallation = () => {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
      } else if ((window.navigator as any).standalone === true) {
        setIsInstalled(true);
      }
    };

    // Check online/offline status
    const updateOnlineStatus = () => {
      setIsOffline(!navigator.onLine);
    };

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('PWA: Install prompt available');
      e.preventDefault();
      setDeferredPrompt(e as any);
      setIsInstallable(true);
      
      // Show custom install prompt after a delay
      setTimeout(() => {
        if (!isInstalled) {
          setShowInstallPrompt(true);
        }
      }, 10000); // Show after 10 seconds
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA: App installed successfully');
      setIsInstalled(true);
      setIsInstallable(false);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    // Register service worker
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          });
          
          console.log('Service Worker registered:', registration);

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New version available');
                  // Could show update notification here
                }
              });
            }
          });

        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      }
    };

    // Initialize
    checkInstallation();
    updateOnlineStatus();
    registerServiceWorker();

    // Event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [isInstalled]);

  const installPWA = async (): Promise<void> => {
    if (!deferredPrompt) {
      console.log('PWA: No install prompt available');
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('PWA: User accepted install');
      } else {
        console.log('PWA: User dismissed install');
      }
      
      setDeferredPrompt(null);
      setIsInstallable(false);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error('PWA: Install failed', error);
    }
  };

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
    // Don't show again for 7 days
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Check if install prompt was recently dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      if (dismissedTime > weekAgo) {
        setShowInstallPrompt(false);
      }
    }
  }, []);

  return {
    isInstallable,
    isInstalled,
    isOffline,
    installPWA,
    showInstallPrompt,
    dismissInstallPrompt
  };
}

// Utility function to check PWA capabilities
export const PWACapabilities = {
  hasCamera: () => 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
  hasGeolocation: () => 'geolocation' in navigator,
  hasNotifications: () => 'Notification' in window,
  hasShare: () => 'share' in navigator,
  hasBackgroundSync: () => 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
  hasPushNotifications: () => 'serviceWorker' in navigator && 'PushManager' in window,
  hasOfflineStorage: () => 'caches' in window && 'indexedDB' in window,
  hasInstallPrompt: () => 'BeforeInstallPromptEvent' in window,
};