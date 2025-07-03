# VeriGate Scan App

This is the mobile app for staff to scan QR codes for accreditation.

## 🚀 Features

- **Offline QR Verification**: Verify QR codes using an encrypted local SQLite database.
- **Real-time Camera Scanning**: Instant feedback with Vision Camera.
- **Role-Based Access**: Different permissions for volunteers, security, and admins.
- **Visual/Audio Feedback**: Clear green/red indicators with sounds.
- **Local Scan Logging**: All scans are logged locally and synced automatically when online.
- **Emergency Override**: Authorized personnel can grant access with reason logging.
- **Multi-Area Support**: Volunteers can be assigned to specific zones.

## 🛠️ Tech Stack

- **React Native CLI**: Framework for building native mobile apps
- **Native Camera**: Direct access to the device camera for high-performance scanning.
- **SQLite**: Local, encrypted database for offline verification.

## 📦 Scripts

- `pnpm start`: Start the Metro bundler.
- `pnpm run android`: Run the app on an Android device or emulator.
- `pnpm run ios`: Run the app on an iOS device or simulator.
