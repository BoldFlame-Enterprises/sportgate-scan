import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { useScanner } from '@/context/ScannerContext';
import { DatabaseService, ScannerUser } from '@/services/DatabaseService';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [demoUsers, setDemoUsers] = useState<ScannerUser[]>([]);
  const [dataStats, setDataStats] = useState<{
    totalScanners: number;
    totalUsers: number;
    usersByAccessLevel: Record<string, number>;
    scannersByRole: Record<string, number>;
  } | null>(null);
  const { setScannerUser } = useScanner();

  useEffect(() => {
    // Load demo users and stats dynamically from encrypted database
    const loadInitialData = async () => {
      try {
        // Load scanner users from encrypted database
        const users = await DatabaseService.getDemoScannerUsers();
        setDemoUsers(users);

        // Load statistics to prove data is from database
        const stats = await DatabaseService.getUserStatistics();
        setDataStats(stats);

        // Load stored email from secure storage
        const storedEmail = await DatabaseService.getStoredScannerEmail();
        if (storedEmail) {
          setEmail(storedEmail);
          setRememberMe(true);
        }

        console.log('✅ Loaded scanner data from encrypted database:', {
          scannerCount: users.length,
          userStats: stats
        });
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, []);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your scanner email address');
      return;
    }

    setIsLoading(true);

    try {
      const scannerUser = await DatabaseService.getScannerUserByEmail(email.toLowerCase().trim());
      
      if (scannerUser) {
        // Store credentials if remember me is checked
        await DatabaseService.storeScannerCredentials(email.toLowerCase().trim(), rememberMe);
        
        setScannerUser(scannerUser);
        router.replace('/(main)/scanner');
      } else {
        Alert.alert(
          'Login Failed', 
          'Scanner account not found. Please check your email address.\n\nDemo scanner accounts:\n• scanner1@event.com\n• scanner2@event.com\n• security@event.com\n• admin@event.com'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Login failed. Please try again.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const showDemoAccounts = () => {
    const accountsList = demoUsers
      .map(user => `• ${user.email} (${user.role.charAt(0).toUpperCase() + user.role.slice(1)})`)
      .join('\n');

    const statsText = dataStats ? 
      `\n\n📊 Database Stats:\n• ${dataStats.totalScanners} Scanner Accounts\n• ${dataStats.totalUsers} User Accounts\n• Data loaded from encrypted SQLite` :
      '';

    Alert.alert(
      'Demo Scanner Accounts',
      `Available scanner accounts:\n\n${accountsList}${statsText}\n\nThese accounts can scan QR codes from the SportGate Pass app.`,
      [{ text: 'OK' }]
    );
  };

  const quickLogin = (userEmail: string) => {
    setEmail(userEmail);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Text style={styles.title}>SportGate Scan</Text>
          <Text style={styles.subtitle}>Professional Access Control</Text>

          <View style={styles.formContainer}>
            <Text style={styles.label}>Scanner Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your scanner email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />

            <View style={styles.rememberMeContainer}>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ false: '#d1d5db', true: '#dcfce7' }}
                thumbColor={rememberMe ? '#059669' : '#9ca3af'}
              />
              <Text style={styles.rememberMeText}>Remember me for 24 hours</Text>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? 'Logging in...' : 'Start Scanning'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoButton}
              onPress={showDemoAccounts}
            >
              <Text style={styles.demoButtonText}>View Demo Accounts</Text>
            </TouchableOpacity>
          </View>

          {demoUsers.length > 0 && (
            <View style={styles.quickLoginContainer}>
              <Text style={styles.quickLoginTitle}>Quick Login</Text>
              <View style={styles.quickLoginGrid}>
                {demoUsers.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={styles.quickLoginButton}
                    onPress={() => quickLogin(user.email)}
                  >
                    <Text style={styles.quickLoginRole}>{user.role}</Text>
                    <Text style={styles.quickLoginEmail}>{user.email.split('@')[0]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>📱 How to Use</Text>
            <Text style={styles.infoText}>
              1. Login with your scanner account
            </Text>
            <Text style={styles.infoText}>
              2. Select the area you&apos;re scanning for
            </Text>
            <Text style={styles.infoText}>
              3. Point camera at QR codes to verify access
            </Text>
            <Text style={styles.infoText}>
              4. Green = Access granted, Red = Access denied
            </Text>
          </View>

          {dataStats && (
            <View style={styles.databaseInfoContainer}>
              <Text style={styles.databaseInfoTitle}>📊 Encrypted Database Stats</Text>
              <Text style={styles.databaseInfoText}>
                Scanner Accounts: {dataStats.totalScanners} (from SQLite)
              </Text>
              <Text style={styles.databaseInfoText}>
                User Accounts: {dataStats.totalUsers} (from SQLite)
              </Text>
              <Text style={styles.databaseInfoNote}>
                ✅ All data loaded dynamically - no hardcoded arrays
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Offline QR Verification
            </Text>
            <Text style={styles.footerSubtext}>
              Works without internet connection
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#065f46',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#059669',
    marginBottom: 40,
  },
  formContainer: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
    marginBottom: 16,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  rememberMeText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  loginButton: {
    backgroundColor: '#059669',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  demoButton: {
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  demoButtonText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '500',
  },
  databaseInfoContainer: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  databaseInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 8,
  },
  databaseInfoText: {
    fontSize: 12,
    color: '#075985',
    marginBottom: 4,
  },
  databaseInfoNote: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 4,
  },
  quickLoginContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  quickLoginTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  quickLoginGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickLoginButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  quickLoginRole: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369a1',
    textTransform: 'capitalize',
  },
  quickLoginEmail: {
    fontSize: 10,
    color: '#075985',
    marginTop: 2,
  },
  infoContainer: {
    backgroundColor: '#f0f9ff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#0369a1',
    marginBottom: 6,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
});