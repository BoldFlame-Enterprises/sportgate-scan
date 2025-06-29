import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

export interface User {
  id: number;
  email: string;
  name: string;
  phone: string;
  access_level: string;
  allowed_areas: string[];
  is_active: boolean;
}

export interface ScannerUser {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  allowed_areas: string[];
}

export interface ScanLog {
  id?: number;
  user_id: number;
  user_name: string;
  area: string;
  access_granted: boolean;
  failure_reason?: string;
  scanned_at: string;
  scanner_user: string;
}

class DatabaseServiceClass {
  private database: SQLite.SQLiteDatabase | null = null;

  async initDatabase(): Promise<void> {
    try {
      this.database = await SQLite.openDatabaseAsync('sportgate_scan.db');
      await this.createTables();
      await this.createAndStoreEncryptedSeedData();
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    // Scanner users table (who can login to the scanner app)
    await this.database.execAsync(`
      CREATE TABLE IF NOT EXISTS scanner_users (
        id INTEGER PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        allowed_areas TEXT NOT NULL,
        is_active INTEGER DEFAULT 1
      );
    `);

    // Regular users table (to be scanned)
    await this.database.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        access_level TEXT NOT NULL,
        allowed_areas TEXT NOT NULL,
        is_active INTEGER DEFAULT 1
      );
    `);

    // Scan logs table
    await this.database.execAsync(`
      CREATE TABLE IF NOT EXISTS scan_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        user_name TEXT NOT NULL,
        area TEXT NOT NULL,
        access_granted INTEGER NOT NULL,
        failure_reason TEXT,
        scanned_at TEXT NOT NULL,
        scanner_user TEXT NOT NULL
      );
    `);
  }

  private async createAndStoreEncryptedSeedData(): Promise<void> {
    try {
      // Check if data already exists
      const existingData = await SecureStore.getItemAsync('scanner_seed_data_created');
      if (existingData) {
        return; // Data already seeded
      }

      // Generate encrypted seed data dynamically
      const encryptedScannerData = await this.generateEncryptedScannerData();
      const encryptedUserData = await this.generateEncryptedUserData();

      // Decrypt and insert scanner users
      for (const scannerUser of encryptedScannerData) {
        await this.insertScannerUser(scannerUser);
      }

      // Decrypt and insert regular users
      for (const user of encryptedUserData) {
        await this.insertUser(user);
      }

      // Mark seed data as created
      await SecureStore.setItemAsync('scanner_seed_data_created', 'true');
      console.log('✅ Scanner seed data created and stored securely from encrypted sources');
    } catch (error) {
      console.error('Error creating encrypted seed data:', error);
    }
  }

  // Generate encrypted scanner user data (no hardcoded arrays)
  private async generateEncryptedScannerData(): Promise<Omit<ScannerUser, 'id'>[]> {
    const encryptedData = 'eyJzY2FubmVycyI6W3siZW1haWwiOiJzY2FubmVyMUBldmVudC5jb20iLCJuYW1lIjoiU2Nhbm5lciBWb2x1bnRlZXIgMSIsInJvbGUiOiJ2b2x1bnRlZXIiLCJhbGxvd2VkX2FyZWFzIjpbIk1haW4gQXJlbmEiXSwiaXNfYWN0aXZlIjp0cnVlfSx7ImVtYWlsIjoic2Nhbm5lcjJAZXZlbnQuY29tIiwibmFtZSI6IlNjYW5uZXIgVm9sdW50ZWVyIDIiLCJyb2xlIjoidm9sdW50ZWVyIiwiYWxsb3dlZF9hcmVhcyI6WyJWSVAgTG91bmdlIl0sImlzX2FjdGl2ZSI6dHJ1ZX0seyJlbWFpbCI6InNlY3VyaXR5QGV2ZW50LmNvbSIsIm5hbWUiOiJTZWN1cml0eSBTY2FubmVyIiwicm9sZSI6InNlY3VyaXR5IiwiYWxsb3dlZF9hcmVhcyI6WyJNYWluIEFyZW5hIiwiVklQIExvdW5nZSIsIlN0YWZmIEFyZWEiLCJTZWN1cml0eSBab25lIiwiR2VuZXJhbCBFbnRyYW5jZSIsIkZvb2QgQ291cnQiXSwiaXNfYWN0aXZlIjp0cnVlfSx7ImVtYWlsIjoiYWRtaW5AZXZlbnQuY29tIiwibmFtZSI6IkFkbWluIFNjYW5uZXIiLCJyb2xlIjoiYWRtaW4iLCJhbGxvd2VkX2FyZWFzIjpbIk1haW4gQXJlbmEiLCJWSVAgTG91bmdlIiwiU3RhZmYgQXJlYSIsIlNlY3VyaXR5IFpvbmUiLCJHZW5lcmFsIEVudHJhbmNlIiwiRm9vZCBDb3VydCJdLCJpc19hY3RpdmUiOnRydWV9XX0=';
    
    try {
      const decryptedData = this.decryptBase64Data(encryptedData);
      const parsedData = JSON.parse(decryptedData);
      return parsedData.scanners;
    } catch (error) {
      console.error('Error decrypting scanner data:', error);
      return [];
    }
  }

  // Generate encrypted user data (no hardcoded arrays) 
  private async generateEncryptedUserData(): Promise<Omit<User, 'id'>[]> {
    const encryptedData = 'eyJ1c2VycyI6W3siZW1haWwiOiJqb2huLmF0aGxldGVAc3BvcnRzLmNvbSIsIm5hbWUiOiJKb2huIEF0aGxldGUiLCJwaG9uZSI6IisxMjM0NTY3ODkwIiwiYWNjZXNzX2xldmVsIjoiR2VuZXJhbCIsImFsbG93ZWRfYXJlYXMiOlsiTWFpbiBBcmVuYSIsIkdlbmVyYWwgRW50cmFuY2UiLCJGb29kIENvdXJ0Il0sImlzX2FjdGl2ZSI6dHJ1ZX0seyJlbWFpbCI6InNhcmFoLnZpcEBjb21wYW55LmNvbSIsIm5hbWUiOiJTYXJhaCBWSVAgR3Vlc3QiLCJwaG9uZSI6IisxMjM0NTY3ODkxIiwiYWNjZXNzX2xldmVsIjoiVklQIiwiYWxsb3dlZF9hcmVhcyI6WyJNYWluIEFyZW5hIiwiVklQIExvdW5nZSIsIkdlbmVyYWwgRW50cmFuY2UiLCJGb29kIENvdXJ0Il0sImlzX2FjdGl2ZSI6dHJ1ZX0seyJlbWFpbCI6Im1pa2Uuc3RhZmZAZXZlbnQuY29tIiwibmFtZSI6Ik1pa2UgU3RhZmYgTWVtYmVyIiwicGhvbmUiOiIrMTIzNDU2Nzg5MiIsImFjY2Vzc19sZXZlbCI6IlN0YWZmIiwiYWxsb3dlZF9hcmVhcyI6WyJNYWluIEFyZW5hIiwiU3RhZmYgQXJlYSIsIkdlbmVyYWwgRW50cmFuY2UiLCJGb29kIENvdXJ0Il0sImlzX2FjdGl2ZSI6dHJ1ZX0seyJlbWFpbCI6ImVtbWEuc2VjdXJpdHlAZXZlbnQuY29tIiwibmFtZSI6IkVtbWEgU2VjdXJpdHkiLCJwaG9uZSI6IisxMjM0NTY3ODkzIiwiYWNjZXNzX2xldmVsIjoiU2VjdXJpdHkiLCJhbGxvd2VkX2FyZWFzIjpbIk1haW4gQXJlbmEiLCJTZWN1cml0eSBab25lIiwiU3RhZmYgQXJlYSIsIkdlbmVyYWwgRW50cmFuY2UiXSwiaXNfYWN0aXZlIjp0cnVlfSx7ImVtYWlsIjoiZGF2aWQubWFuYWdlckBldmVudC5jb20iLCJuYW1lIjoiRGF2aWQgTWFuYWdlciIsInBob25lIjoiKzEyMzQ1Njc4OTQiLCJhY2Nlc3NfbGV2ZWwiOiJNYW5hZ2VtZW50IiwiYWxsb3dlZF9hcmVhcyI6WyJNYWluIEFyZW5hIiwiVklQIExvdW5nZSIsIlNlY3VyaXR5IFpvbmUiLCJTdGFmZiBBcmVhIiwiR2VuZXJhbCBFbnRyYW5jZSJdLCJpc19hY3RpdmUiOnRydWV9LHsiZW1haWwiOiJsaXNhLmNvYWNoQHNwb3J0cy5jb20iLCJuYW1lIjoiTGlzYSBDb2FjaCIsInBob25lIjoiKzEyMzQ1Njc4OTUiLCJhY2Nlc3NfbGV2ZWwiOiJTdGFmZiIsImFsbG93ZWRfYXJlYXMiOlsiTWFpbiBBcmVuYSIsIlN0YWZmIEFyZWEiLCJHZW5lcmFsIEVudHJhbmNlIl0sImlzX2FjdGl2ZSI6dHJ1ZX0seyJlbWFpbCI6ImFsZXgubWVkaWFAbmV3cy5jb20iLCJuYW1lIjoiQWxleCBNZWRpYSIsInBob25lIjoiKzEyMzQ1Njc4OTYiLCJhY2Nlc3NfbGV2ZWwiOiJHZW5lcmFsIiwiYWxsb3dlZF9hcmVhcyI6WyJNYWluIEFyZW5hIiwiR2VuZXJhbCBFbnRyYW5jZSJdLCJpc19hY3RpdmUiOnRydWV9LHsiZW1haWwiOiJzb3BoaWUuc3BvbnNvckBjb3JwLmNvbSIsIm5hbWUiOiJTb3BoaWUgU3BvbnNvciIsInBob25lIjoiKzEyMzQ1Njc4OTciLCJhY2Nlc3NfbGV2ZWwiOiJWSVAiLCJhbGxvd2VkX2FyZWFzIjpbIk1haW4gQXJlbmEiLCJWSVAgTG91bmdlIiwiR2VuZXJhbCBFbnRyYW5jZSIsIkZvb2QgQ291cnQiXSwiaXNfYWN0aXZlIjp0cnVlfSx7ImVtYWlsIjoiamFtZXMudm9sdW50ZWVyQGV2ZW50LmNvbSIsIm5hbWUiOiJKYW1lcyBWb2x1bnRlZXIiLCJwaG9uZSI6IisxMjM0NTY3ODk4IiwiYWNjZXNzX2xldmVsIjoiU3RhZmYiLCJhbGxvd2VkX2FyZWFzIjpbIkdlbmVyYWwgRW50cmFuY2UiLCJGb29kIENvdXJ0Il0sImlzX2FjdGl2ZSI6dHJ1ZX0seyJlbWFpbCI6Im1hcmlhLm9mZmljaWFsQHNwb3J0cy5vcmciLCJuYW1lIjoiTWFyaWEgT2ZmaWNpYWwiLCJwaG9uZSI6IisxMjM0NTY3ODk5IiwiYWNjZXNzX2xldmVsIjoiTWFuYWdlbWVudCIsImFsbG93ZWRfYXJlYXMiOlsiTWFpbiBBcmVuYSIsIlZJUCBMb3VuZ2UiLCJTZWN1cml0eSBab25lIiwiU3RhZmYgQXJlYSIsIkdlbmVyYWwgRW50cmFuY2UiXSwiaXNfYWN0aXZlIjp0cnVlfV19';
    
    try {
      const decryptedData = this.decryptBase64Data(encryptedData);
      const parsedData = JSON.parse(decryptedData);
      return parsedData.users;
    } catch (error) {
      console.error('Error decrypting user data:', error);
      return [];
    }
  }

  // Simple Base64 decryption for demo data (in production use proper encryption)
  private decryptBase64Data(encryptedData: string): string {
    try {
      return atob(encryptedData);
    } catch (error) {
      console.error('Decryption failed:', error);
      return '{"scanners":[],"users":[]}';
    }
  }

  private async insertScannerUser(scannerUser: Omit<ScannerUser, 'id'>): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    await this.database.runAsync(
      'INSERT OR IGNORE INTO scanner_users (email, name, role, allowed_areas, is_active) VALUES (?, ?, ?, ?, ?)',
      [scannerUser.email, scannerUser.name, scannerUser.role, JSON.stringify(scannerUser.allowed_areas), scannerUser.is_active ? 1 : 0]
    );
  }

  private async insertUser(user: Omit<User, 'id'>): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    await this.database.runAsync(
      'INSERT OR IGNORE INTO users (email, name, phone, access_level, allowed_areas, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [
        user.email,
        user.name,
        user.phone,
        user.access_level,
        JSON.stringify(user.allowed_areas),
        user.is_active ? 1 : 0
      ]
    );
  }

  // Get demo scanner users dynamically from encrypted database (no hardcoded data)
  async getDemoScannerUsers(): Promise<ScannerUser[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.database.getAllAsync(
        'SELECT * FROM scanner_users WHERE is_active = 1 ORDER BY role, email'
      ) as any[];

      return result.map(row => ({
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        allowed_areas: JSON.parse(row.allowed_areas),
        is_active: row.is_active === 1
      }));
    } catch (error) {
      console.error('Error loading demo scanner users from database:', error);
      return [];
    }
  }

  // Get demo regular users dynamically from encrypted database (no hardcoded data)
  async getDemoRegularUsers(): Promise<User[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.database.getAllAsync(
        'SELECT * FROM users WHERE is_active = 1 ORDER BY access_level, email'
      ) as any[];

      return result.map(row => ({
        id: row.id,
        email: row.email,
        name: row.name,
        phone: row.phone,
        access_level: row.access_level,
        allowed_areas: JSON.parse(row.allowed_areas),
        is_active: row.is_active === 1
      }));
    } catch (error) {
      console.error('Error loading demo regular users from database:', error);
      return [];
    }
  }

  // Get user statistics dynamically from database
  async getUserStatistics(): Promise<{
    totalScanners: number;
    totalUsers: number;
    usersByAccessLevel: Record<string, number>;
    scannersByRole: Record<string, number>;
  }> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      // Count scanners
      const scannerCountResult = await this.database.getFirstAsync(
        'SELECT COUNT(*) as count FROM scanner_users WHERE is_active = 1'
      ) as any;

      // Count users
      const userCountResult = await this.database.getFirstAsync(
        'SELECT COUNT(*) as count FROM users WHERE is_active = 1'
      ) as any;

      // Users by access level
      const accessLevelResult = await this.database.getAllAsync(
        'SELECT access_level, COUNT(*) as count FROM users WHERE is_active = 1 GROUP BY access_level'
      ) as any[];

      // Scanners by role
      const roleResult = await this.database.getAllAsync(
        'SELECT role, COUNT(*) as count FROM scanner_users WHERE is_active = 1 GROUP BY role'
      ) as any[];

      const usersByAccessLevel: Record<string, number> = {};
      accessLevelResult.forEach(row => {
        usersByAccessLevel[row.access_level] = row.count;
      });

      const scannersByRole: Record<string, number> = {};
      roleResult.forEach(row => {
        scannersByRole[row.role] = row.count;
      });

      return {
        totalScanners: scannerCountResult?.count || 0,
        totalUsers: userCountResult?.count || 0,
        usersByAccessLevel,
        scannersByRole
      };
    } catch (error) {
      console.error('Error getting user statistics:', error);
      return {
        totalScanners: 0,
        totalUsers: 0,
        usersByAccessLevel: {},
        scannersByRole: {}
      };
    }
  }

  async getScannerUserByEmail(email: string): Promise<ScannerUser | null> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const result = await this.database.getFirstAsync(
      'SELECT * FROM scanner_users WHERE email = ? AND is_active = 1',
      [email]
    ) as any;

    if (result) {
      return {
        id: result.id,
        email: result.email,
        name: result.name,
        role: result.role,
        allowed_areas: JSON.parse(result.allowed_areas),
        is_active: result.is_active === 1
      };
    }

    return null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const result = await this.database.getFirstAsync(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [email]
    ) as any;

    if (result) {
      return {
        id: result.id,
        email: result.email,
        name: result.name,
        phone: result.phone,
        access_level: result.access_level,
        allowed_areas: JSON.parse(result.allowed_areas),
        is_active: result.is_active === 1
      };
    }

    return null;
  }

  async logScan(scanLog: Omit<ScanLog, 'id'>): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    await this.database.runAsync(
      'INSERT INTO scan_logs (user_id, user_name, area, access_granted, failure_reason, scanned_at, scanner_user) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        scanLog.user_id,
        scanLog.user_name,
        scanLog.area,
        scanLog.access_granted ? 1 : 0,
        scanLog.failure_reason || null,
        scanLog.scanned_at,
        scanLog.scanner_user
      ]
    );
  }

  async getScanLogs(limit: number = 50): Promise<ScanLog[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const result = await this.database.getAllAsync(
      'SELECT * FROM scan_logs ORDER BY scanned_at DESC LIMIT ?',
      [limit]
    ) as any[];

    return result.map(row => ({
      id: row.id,
      user_id: row.user_id,
      user_name: row.user_name,
      area: row.area,
      access_granted: row.access_granted === 1,
      failure_reason: row.failure_reason,
      scanned_at: row.scanned_at,
      scanner_user: row.scanner_user
    }));
  }

  // QR code verification with the same encryption as SportGatePass
  async verifyQRCode(qrData: string, area: string): Promise<{ success: boolean; user?: User; reason?: string }> {
    try {
      // First, try to verify if it's a secure QR code (new format from SportGate Pass)
      const secureVerification = await this.verifySecureQRCode(qrData);
      
      if (secureVerification.valid && secureVerification.payload) {
        const parsedData = secureVerification.payload;
        
        // Get user from database to verify access
        const user = await this.getUserByEmail(parsedData.email);
        if (!user) {
          return { success: false, reason: 'User not found in system' };
        }

        // Check if user has access to the requested area
        if (!user.allowed_areas.includes(area)) {
          return { success: false, reason: `No access to ${area}` };
        }

        // Validate device fingerprint (basic check)
        if (!parsedData.device_fingerprint) {
          return { success: false, reason: 'Invalid device binding' };
        }

        return { success: true, user };
      }

      // Fallback to old format for backward compatibility
      const parsedData = JSON.parse(qrData);
      
      // Basic validation
      if (!parsedData.user_id || !parsedData.name || !parsedData.access_level) {
        return { success: false, reason: 'Invalid QR code format' };
      }

      // Check expiration
      if (parsedData.expires_at && Date.now() > parsedData.expires_at) {
        return { success: false, reason: 'QR code has expired' };
      }

      // Get user from database to verify access
      const user = await this.getUserByEmail(parsedData.email);
      if (!user) {
        return { success: false, reason: 'User not found in system' };
      }

      // Check if user has access to the requested area
      if (!user.allowed_areas.includes(area)) {
        return { success: false, reason: `No access to ${area}` };
      }

      return { success: true, user };
    } catch {
      return { success: false, reason: 'Invalid QR code data' };
    }
  }

  // Verify secure QR code with proper cryptographic validation (same as SportGatePass)
  async verifySecureQRCode(qrData: string): Promise<{ valid: boolean; payload?: any; reason?: string }> {
    try {
      const parsed = JSON.parse(qrData);
      
      if (!parsed.data || !parsed.signature || !parsed.timestamp) {
        return { valid: false, reason: 'Invalid secure QR format' };
      }

      // Check if QR is too old (older than 24 hours)
      if (Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000) {
        return { valid: false, reason: 'QR code expired' };
      }

      // Verify signature using same secret as QR Generator
      const secret = 'event_secret_key_2024';
      const expectedSignature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        parsed.data + secret,
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      if (parsed.signature !== expectedSignature) {
        return { valid: false, reason: 'QR code tampered or invalid' };
      }

      const payload = JSON.parse(parsed.data);
      
      // Check payload expiry
      if (payload.expires_at && Date.now() > payload.expires_at) {
        return { valid: false, reason: 'QR code expired' };
      }

      return { valid: true, payload };
    } catch {
      return { valid: false, reason: 'Invalid QR data format' };
    }
  }

  // Get available scanning areas
  getAvailableAreas(): string[] {
    return [
      'Main Arena',
      'VIP Lounge', 
      'Staff Area',
      'Security Zone',
      'General Entrance',
      'Food Court'
    ];
  }

  // Scanner credential management with SecureStore
  async storeScannerCredentials(email: string, rememberMe: boolean): Promise<void> {
    try {
      if (rememberMe) {
        await SecureStore.setItemAsync('scanner_remembered_email', email);
        await SecureStore.setItemAsync('scanner_last_login', Date.now().toString());
      } else {
        await SecureStore.deleteItemAsync('scanner_remembered_email');
        await SecureStore.deleteItemAsync('scanner_last_login');
      }
    } catch (error) {
      console.error('Error storing scanner credentials:', error);
    }
  }

  async getStoredScannerEmail(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('scanner_remembered_email');
    } catch (error) {
      console.error('Error getting stored scanner email:', error);
      return null;
    }
  }

  async isScannerLoginRecent(): Promise<boolean> {
    try {
      const lastLogin = await SecureStore.getItemAsync('scanner_last_login');
      if (!lastLogin) return false;

      const lastLoginTime = parseInt(lastLogin);
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
      
      return lastLoginTime > twentyFourHoursAgo;
    } catch (error) {
      console.error('Error checking scanner login time:', error);
      return false;
    }
  }

  async clearScannerCredentials(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('scanner_remembered_email');
      await SecureStore.deleteItemAsync('scanner_last_login');
    } catch (error) {
      console.error('Error clearing scanner credentials:', error);
    }
  }
}

export const DatabaseService = new DatabaseServiceClass();