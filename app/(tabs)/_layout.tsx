import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Camera, History, Download } from 'lucide-react-native';
import { PWAInstallPrompt, usePWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { Platform } from 'react-native';

export default function TabLayout() {
  const { canInstall, showInstallPrompt, promptVisible, hidePrompt } = usePWAInstallPrompt();

  // PWA kurulum promptunu otomatik göster (3 saniye sonra)
  useEffect(() => {
    if (Platform.OS === 'web' && canInstall) {
      const timer = setTimeout(() => {
        showInstallPrompt();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [canInstall, showInstallPrompt]);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingTop: 8,
          paddingBottom: 8,
          height: 88,
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: {
          fontFamily: 'Inter-Medium',
          fontSize: 12,
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tarama',
          tabBarIcon: ({ size, color }) => (
            <Camera size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Geçmiş',
          tabBarIcon: ({ size, color }) => (
            <History size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="export"
        options={{
          title: 'Dışa Aktar',
          tabBarIcon: ({ size, color }) => (
            <Download size={size} color={color} />
          ),
        }}
      />
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt visible={promptVisible} onClose={hidePrompt} />
    </Tabs>
  );
}