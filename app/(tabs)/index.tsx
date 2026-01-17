import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera as CameraIcon, FlipHorizontal, Scan, CheckCircle, Upload, RefreshCw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { webStorage } from '@/services/webStorage';
import { webCameraService } from '@/services/webCameraService';
import { ocrService } from '@/services/ocrService';

const { width, height } = Dimensions.get('window');

export default function ScanScreen() {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') {
      requestWebCameraPermission();
    }
    
    return () => {
      if (Platform.OS === 'web') {
        webCameraService.stopCamera();
      }
    };
  }, []);

  const requestWebCameraPermission = async () => {
    try {
      const hasPermission = await webCameraService.requestPermission();
      
      if (hasPermission && videoRef.current) {
        await webCameraService.startCamera(videoRef.current);
        setCameraReady(true);
      }
    } catch (error) {
      console.error('Web camera permission error:', error);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const takePicture = async () => {
    if (isScanning) return;

    try {
      setIsScanning(true);
      
      // Kullanıcıya yükleniyor mesajı göster
      Alert.alert('İşleniyor', 'Fiş Gemini AI ile analiz ediliyor...', []);

      let imageData: string;
      
      if (Platform.OS === 'web' && cameraReady) {
        imageData = await webCameraService.capturePhoto();
      } else if (cameraRef.current) {
        // Native camera
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
          skipProcessing: false,
        });
        
        if (photo.base64) {
          imageData = `data:image/jpeg;base64,${photo.base64}`;
        } else {
          imageData = photo.uri;
        }
      } else {
        // Fallback: file upload
        return handleFileUpload();
      }

      console.log('📸 Fotoğraf çekildi, OCR başlatılıyor...');

      // Process OCR
      const extractedData = await ocrService.extractReceiptData(imageData);
      
      console.log('✅ OCR tamamlandı:', extractedData);

      // Navigate to edit screen
      router.push({
        pathname: '/edit-receipt',
        params: {
          data: JSON.stringify(extractedData),
          imageUri: imageData,
        },
      });
    } catch (error) {
      console.error('Scanning error:', error);
      Alert.alert('Hata', 'Fiş taranırken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsScanning(true);
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        
        // Process OCR
        const extractedData = await ocrService.extractReceiptData(imageData);
        
        // Navigate to edit screen
        router.push({
          pathname: '/edit-receipt',
          params: {
            data: JSON.stringify(extractedData),
            imageUri: imageData,
          },
        });
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      Alert.alert('Hata', 'Dosya yüklenirken bir hata oluştu.');
    } finally {
      setIsScanning(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Kamera izni kontrol ediliyor...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <LinearGradient
          colors={['#3B82F6', '#1D4ED8']}
          style={styles.permissionGradient}>
          <CameraIcon size={64} color="white" />
          <Text style={styles.permissionTitle}>Kamera İzni Gerekli</Text>
          <Text style={styles.permissionMessage}>
            Fişleri tarayabilmek için kamera erişimine ihtiyacımız var
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>İzin Ver</Text>
          </TouchableOpacity>
          
          <View style={styles.alternativeSection}>
            <Text style={styles.alternativeText}>veya</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleFileUpload}>
              <Upload size={20} color="#3B82F6" />
              <Text style={styles.uploadButtonText}>Dosya Yükle</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <div style={{ flex: 1, position: 'relative' }}>
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            playsInline
            muted
          />
          
          {/* Header Overlay */}
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'transparent']}
            style={styles.header}>
            <Text style={styles.headerTitle}>Fişi Tarayın</Text>
            <Text style={styles.headerSubtitle}>
              Fişi çerçeve içine yerleştirin ve tara butonuna basın
            </Text>
          </LinearGradient>

          {/* Scan Frame */}
          <View style={styles.scanFrame}>
            <View style={styles.frameCorners}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>

          {/* Bottom Controls */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.controls}>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleFileUpload}>
              <Upload size={24} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
              onPress={takePicture}
              disabled={isScanning}>
              <LinearGradient
                colors={isScanning ? ['#9CA3AF', '#6B7280'] : ['#3B82F6', '#1D4ED8']}
                style={styles.scanButtonGradient}>
                {isScanning ? (
                  <View style={styles.scanningIndicator}>
                    <RefreshCw size={32} color="white" />
                    <Text style={styles.scanningText}>İşleniyor...</Text>
                  </View>
                ) : (
                  <Scan size={32} color="white" />
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.placeholder} />
          </LinearGradient>
        </div>
      ) : permission?.granted ? (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          flash={flash ? 'on' : 'off'}>
          
          {/* Header Overlay */}
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'transparent']}
            style={styles.header}>
            <Text style={styles.headerTitle}>Fişi Tarayın</Text>
            <Text style={styles.headerSubtitle}>
              Fişi çerçeve içine yerleştirin ve tara butonuna basın
            </Text>
          </LinearGradient>

          {/* Scan Frame */}
          <View style={styles.scanFrame}>
            <View style={styles.frameCorners}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>

          {/* Bottom Controls */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.controls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={toggleCameraFacing}>
              <FlipHorizontal size={24} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
              onPress={takePicture}
              disabled={isScanning}>
              <LinearGradient
                colors={isScanning ? ['#9CA3AF', '#6B7280'] : ['#3B82F6', '#1D4ED8']}
                style={styles.scanButtonGradient}>
                {isScanning ? (
                  <View style={styles.scanningIndicator}>
                    <RefreshCw size={32} color="white" />
                    <Text style={styles.scanningText}>İşleniyor...</Text>
                  </View>
                ) : (
                  <Scan size={32} color="white" />
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleFileUpload}>
              <Upload size={24} color="white" />
            </TouchableOpacity>
          </LinearGradient>
        </CameraView>
      ) : (
        <View style={styles.fallbackContainer}>
          <CameraIcon size={64} color="#9CA3AF" />
          <Text style={styles.fallbackTitle}>Kamera Kullanılamıyor</Text>
          <Text style={styles.fallbackMessage}>
            Lütfen dosya yükleme özelliğini kullanın
          </Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleFileUpload}>
            <Upload size={20} color="#3B82F6" />
            <Text style={styles.uploadButtonText}>Fiş Fotoğrafı Yükle</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Hidden file input for web */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  permissionContainer: {
    flex: 1,
  },
  permissionGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: 'white',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionMessage: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: 'white',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  permissionButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#3B82F6',
  },
  alternativeSection: {
    alignItems: 'center',
  },
  alternativeText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 16,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'white',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 32,
  },
  fallbackTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  fallbackMessage: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.8)',
  },
  scanFrame: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -width * 0.4 }, { translateY: -height * 0.2 }],
    zIndex: 1,
  },
  frameCorners: {
    width: width * 0.8,
    height: height * 0.4,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#3B82F6',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingBottom: 50,
    paddingTop: 32,
    zIndex: 1,
  },
  scanButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  scanButtonDisabled: {
    opacity: 0.7,
  },
  scanButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningIndicator: {
    alignItems: 'center',
  },
  scanningText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'white',
    marginTop: 4,
  },
  placeholder: {
    width: 48,
  },
  camera: {
    flex: 1,
  },
  controlButton: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});