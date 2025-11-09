import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Download, X, Smartphone, Zap, Shield, HardDrive } from 'lucide-react-native';
import { pwaService } from '@/services/pwaService';

interface PWAInstallPromptProps {
  visible: boolean;
  onClose: () => void;
}

export function PWAInstallPrompt({ visible, onClose }: PWAInstallPromptProps) {
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = async () => {
    setIsInstalling(true);
    
    try {
      const accepted = await pwaService.showInstallPrompt();
      
      if (accepted) {
        Alert.alert(
          '🎉 Kurulum Başarılı!',
          'Fiş Tarayıcı başarıyla ana ekranınıza eklendi. Artık normal bir uygulama gibi kullanabilirsiniz.',
          [{ text: 'Harika!', onPress: onClose }]
        );
      } else {
        onClose();
      }
    } catch (error) {
      Alert.alert(
        'Kurulum Hatası',
        'Uygulama kurulurken bir hata oluştu. Lütfen tarayıcınızın ayarlarından manuel olarak kurulum yapın.',
        [{ text: 'Tamam', onPress: onClose }]
      );
    } finally {
      setIsInstalling(false);
    }
  };

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="overFullScreen"
      transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={['#3B82F6', '#1D4ED8']}
            style={styles.gradient}>
            
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <Smartphone size={48} color="white" />
              </View>
              
              <Text style={styles.title}>Uygulamayı Kurun</Text>
              <Text style={styles.subtitle}>
                Fiş Tarayıcı'yı ana ekranınıza ekleyin ve daha hızlı erişim sağlayın
              </Text>

              {/* Features */}
              <View style={styles.features}>
                <View style={styles.feature}>
                  <Zap size={20} color="#FCD34D" />
                  <Text style={styles.featureText}>Anında açılış</Text>
                </View>
                
                <View style={styles.feature}>
                  <Shield size={20} color="#34D399" />
                  <Text style={styles.featureText}>Çevrimdışı çalışma</Text>
                </View>
                
                <View style={styles.feature}>
                  <HardDrive size={20} color="#A78BFA" />
                  <Text style={styles.featureText}>Yerel veri saklama</Text>
                </View>
              </View>

              {/* Benefits */}
              <View style={styles.benefits}>
                <Text style={styles.benefitsTitle}>Avantajlar:</Text>
                <Text style={styles.benefitItem}>• Ana ekrandan tek dokunuşla açılır</Text>
                <Text style={styles.benefitItem}>• İnternet olmadan da çalışır</Text>
                <Text style={styles.benefitItem}>• Daha hızlı ve akıcı deneyim</Text>
                <Text style={styles.benefitItem}>• Güvenli ve özel veri saklama</Text>
              </View>

              {/* Install Button */}
              <TouchableOpacity
                style={[styles.installButton, isInstalling && styles.installButtonDisabled]}
                onPress={handleInstall}
                disabled={isInstalling}>
                <LinearGradient
                  colors={isInstalling ? ['#9CA3AF', '#6B7280'] : ['#10B981', '#059669']}
                  style={styles.installButtonGradient}>
                  <Download size={24} color="white" />
                  <Text style={styles.installButtonText}>
                    {isInstalling ? 'Kuruluyor...' : 'Ana Ekrana Ekle'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Skip Button */}
              <TouchableOpacity style={styles.skipButton} onPress={onClose}>
                <Text style={styles.skipButtonText}>Şimdi Değil</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

export function usePWAInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const unsubscribe = pwaService.onInstallPromptReady((canInstall) => {
      setCanInstall(canInstall);
    });

    return unsubscribe;
  }, []);

  const showInstallPrompt = () => {
    if (canInstall && !pwaService.isAppInstalled()) {
      setShowPrompt(true);
    }
  };

  const hidePrompt = () => {
    setShowPrompt(false);
  };

  return {
    canInstall: canInstall && !pwaService.isAppInstalled(),
    showInstallPrompt,
    promptVisible: showPrompt,
    hidePrompt
  };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  gradient: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 30,
  },
  feature: {
    alignItems: 'center',
    flex: 1,
  },
  featureText: {
    fontSize: 12,
    color: 'white',
    marginTop: 8,
    textAlign: 'center',
  },
  benefits: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 30,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
  },
  benefitItem: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 6,
    lineHeight: 20,
  },
  installButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  installButtonDisabled: {
    opacity: 0.7,
  },
  installButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 12,
  },
  installButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipButtonText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
});