import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useScanner } from '@/context/ScannerContext';
import { DatabaseService } from '@/services/DatabaseService';

export default function IndexScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [shouldAutoLogin, setShouldAutoLogin] = useState(false);
  const { scannerUser, setScannerUser } = useScanner();

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        // Check if scanner has recent login and remembered email
        const storedEmail = await DatabaseService.getStoredScannerEmail();
        const isRecentLogin = await DatabaseService.isScannerLoginRecent();
        
        if (storedEmail && isRecentLogin) {
          // Try to auto-login with stored credentials
          const scanner = await DatabaseService.getScannerUserByEmail(storedEmail);
          if (scanner) {
            setScannerUser(scanner);
            setShouldAutoLogin(true);
          }
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthState();
  }, [setScannerUser]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4' }}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  // Redirect based on authentication state
  if (scannerUser || shouldAutoLogin) {
    return <Redirect href="/(main)/scanner" />;
  }

  return <Redirect href="/(auth)/login" />;
}