# FitFlow Pro Mobile App Deployment Guide

## Platform Requirements

- **iOS**: iOS 15.0+ (iPhone 8 and newer)
- **Android**: Android 10+ (API level 29+)
- **Expo SDK**: 54+
- **React Native**: Via Expo managed workflow

## Prerequisites

### Development Machine Setup

1. **Node.js 20.x LTS**:
   ```bash
   node --version  # Should be v20.x
   npm --version   # Should be 10.x
   ```

2. **Expo CLI**:
   ```bash
   npm install -g expo-cli eas-cli
   ```

3. **Expo Account**:
   - Sign up at https://expo.dev
   - Login: `expo login`

4. **Apple Developer Account** (iOS):
   - Enroll at https://developer.apple.com
   - Cost: $99/year

5. **Google Play Console Account** (Android):
   - Sign up at https://play.google.com/console
   - One-time fee: $25

## Pre-Build Configuration

### 1. Generate Silent Audio File

The app requires a 1-second silent audio file for iOS background timer functionality:

```bash
cd /home/asigator/fitness2025/mobile

# Create assets directory if needed
mkdir -p assets

# Option 1: Using ffmpeg (recommended)
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 1 -q:a 9 -acodec libmp3lame assets/silence.mp3

# Option 2: Using sox (alternative)
sox -n -r 44100 -c 1 assets/silence.mp3 trim 0.0 1.0

# Option 3: Download pre-generated file
curl -o assets/silence.mp3 https://raw.githubusercontent.com/anars/blank-audio/master/1-second-of-silence.mp3

# Verify file created
ls -lh assets/silence.mp3
# Should be ~1-2 KB
```

**Technical Details**:
- **Purpose**: Keeps app alive in iOS background during 3-5 minute rest timers
- **Implementation**: Loop silent audio with `expo-av` Audio API
- **Configuration**: `staysActiveInBackground: true`, `playsInSilentModeIOS: true`
- **Location**: Loaded in `/mobile/src/services/timer/timerService.ts`

### 2. Configure app.json

Update `/home/asigator/fitness2025/mobile/app.json`:

```json
{
  "expo": {
    "name": "FitFlow Pro",
    "slug": "fitflow-pro",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.fitflowpro",
      "buildNumber": "1",
      "infoPlist": {
        "UIBackgroundModes": ["audio"],
        "NSPhotoLibraryUsageDescription": "Allow FitFlow to save workout data exports to your photo library.",
        "NSMicrophoneUsageDescription": "This app does not use the microphone."
      }
    },
    "android": {
      "package": "com.yourcompany.fitflowpro",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": [
        "android.permission.FOREGROUND_SERVICE"
      ],
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      [
        "expo-av",
        {
          "microphonePermission": false
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "sounds": ["./assets/notification.wav"]
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "YOUR_EAS_PROJECT_ID"
      }
    }
  }
}
```

**Background Modes Explanation**:
- `"audio"`: Required for silent audio playback during rest timers
- Allows app to continue running in background for 3-5 minute rest periods
- Critical for hypertrophy training (compound lifts require long rest)

### 3. Create eas.json (Build Configuration)

Create `/home/asigator/fitness2025/mobile/eas.json`:

```json
{
  "cli": {
    "version": ">= 5.9.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true,
      "ios": {
        "simulator": false,
        "bundleIdentifier": "com.yourcompany.fitflowpro"
      },
      "android": {
        "buildType": "aab"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "YOUR_ASC_APP_ID",
        "appleTeamId": "YOUR_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json",
        "track": "production"
      }
    }
  }
}
```

### 4. Environment Configuration

Create `/home/asigator/fitness2025/mobile/.env.production`:

```bash
# Backend API URL (replace with your Raspberry Pi domain)
API_BASE_URL=https://fitflow.yourdomain.com

# App Configuration
APP_ENV=production
ENABLE_DEV_TOOLS=false

# Analytics (optional)
ANALYTICS_ENABLED=false
```

Update code to load environment variables:
```typescript
// mobile/src/config/env.ts
export const ENV = {
  API_BASE_URL: process.env.API_BASE_URL || 'https://fitflow.yourdomain.com',
  IS_PRODUCTION: process.env.APP_ENV === 'production',
  ENABLE_DEV_TOOLS: process.env.ENABLE_DEV_TOOLS === 'true',
};
```

## Build Process

### iOS Build

#### 1. Local Development Build

```bash
cd /home/asigator/fitness2025/mobile

# Install dependencies
npm install

# Start Expo dev server
npm run dev

# Run on iOS Simulator (macOS only)
# Press 'i' in terminal
```

#### 2. Production Build (EAS Build)

```bash
# Login to Expo
eas login

# Configure build
eas build:configure

# Build for iOS (requires Apple Developer account)
eas build --platform ios --profile production

# Monitor build progress
# Build will be available at: https://expo.dev/accounts/[your-account]/projects/fitflow-pro/builds

# Download IPA file when complete
# Upload to App Store Connect via Transporter app
```

#### 3. TestFlight Distribution (Beta Testing)

```bash
# Build with TestFlight profile
eas build --platform ios --profile preview

# Submit to TestFlight
eas submit --platform ios --profile production

# Add testers in App Store Connect
# Testers will receive TestFlight invite
```

### Android Build

#### 1. Local Development Build

```bash
cd /home/asigator/fitness2025/mobile

# Install dependencies
npm install

# Start Expo dev server
npm run dev

# Run on Android emulator or device
# Press 'a' in terminal
```

#### 2. Production Build (EAS Build)

```bash
# Build APK for testing
eas build --platform android --profile preview

# Build AAB for Play Store
eas build --platform android --profile production

# Download APK/AAB when complete
```

#### 3. Google Play Store Submission

```bash
# Create service account key in Google Play Console
# Download JSON key file to: /home/asigator/fitness2025/mobile/google-play-service-account.json

# Submit to Google Play
eas submit --platform android --profile production

# Or manually upload AAB to Play Console:
# https://play.google.com/console/u/0/developers/[your-dev-id]/app/[app-id]/releases/overview
```

## App Store Listings

### iOS App Store Connect

**Required Assets**:
- App icon: 1024×1024 PNG (no alpha)
- Screenshots:
  - iPhone 6.7": 1290×2796 (3 required)
  - iPhone 6.5": 1284×2778
  - iPad Pro 12.9": 2048×2732
- Privacy policy URL
- Support URL
- Marketing URL (optional)

**App Information**:
- **Name**: FitFlow Pro
- **Subtitle**: Evidence-Based Training
- **Category**: Health & Fitness
- **Age Rating**: 4+
- **Description**: (See below)

### Google Play Console

**Required Assets**:
- App icon: 512×512 PNG
- Feature graphic: 1024×500 PNG
- Screenshots:
  - Phone: 1080×1920 (2 required, max 8)
  - 7" tablet: 1200×1920
  - 10" tablet: 1600×2560
- Privacy policy URL

**Store Listing**:
- **Title**: FitFlow Pro
- **Short description**: Science-based hypertrophy training (max 80 chars)
- **Full description**: (See below)
- **Category**: Health & Fitness
- **Content rating**: Everyone

### App Description Template

```
FitFlow Pro - Evidence-Based Hypertrophy Training

Built on Renaissance Periodization (RP) methodology by Dr. Mike Israetel, FitFlow Pro is the ultimate training companion for science-based muscle growth.

KEY FEATURES:

📊 Smart Auto-Regulation
- Daily recovery assessment (sleep, soreness, motivation)
- Automatic volume adjustment based on your recovery score
- Prevent overtraining while maximizing gains

💪 Progressive Overload Tracking
- Real-time 1RM estimation using Epley formula with RIR
- Track strength progression across all lifts
- Volume landmarks (MEV/MAV/MRV) per muscle group

⏱️ Intelligent Rest Timers
- Background timers work even when app is closed (iOS)
- Automatic recommendations based on exercise type
- 10-second warnings and completion notifications

📈 Advanced Analytics
- 1RM progression charts
- Weekly volume trends with MEV/MAV/MRV zones
- Training consistency metrics
- VO2max cardio tracking (Norwegian 4×4 protocol)

🔄 Offline-First Design
- Log workouts without internet connection
- Automatic background sync when online
- Zero data loss guarantee

📱 Training Programs
- Pre-built 6-day PPL split (Push/Pull/Legs × 2)
- Mesocycle phase progression (MEV → MAV → MRV → Deload)
- 100+ exercise library with muscle group targets
- Drag-and-drop exercise customization

🎯 Workout Execution
- Guided set-by-set logging
- RIR (Reps In Reserve) tracking for auto-regulation
- Resume interrupted workouts
- Session volume and average RIR summary

📤 Data Export & Privacy
- Export all data to CSV
- Local SQLite database (your data stays on your device)
- Account deletion with cascade data removal
- No ads, no tracking, no subscriptions

SCIENTIFIC FOUNDATION:

Based on Renaissance Periodization training principles:
- Volume landmarks for optimal hypertrophy
- RIR-based auto-regulation
- Progressive overload with intelligent deload phases
- Evidence-based exercise selection

Perfect for:
✓ Intermediate to advanced lifters
✓ Evidence-based training enthusiasts
✓ Anyone following RP methodology
✓ Lifters who want zero guesswork

NO SUBSCRIPTIONS. ONE-TIME PURCHASE.

Your training data belongs to you. FitFlow Pro operates offline-first with optional cloud sync to your private Raspberry Pi server.

Download FitFlow Pro and train smarter, not harder.
```

## Post-Build Testing

### iOS Testing Checklist

```bash
# Install on physical device via TestFlight
# Test on iPhone 8+ (iOS 15+)

# Critical Tests:
- [ ] Background timer works (rest 3 minutes with app backgrounded)
- [ ] Silent audio plays without interrupting music
- [ ] Local notifications appear at 10s and 0s
- [ ] SQLite writes < 5ms (check console logs)
- [ ] Offline mode: log workout with airplane mode on
- [ ] Sync queue: go online, verify sets sync to backend
- [ ] Resume workout after force-close app
- [ ] VoiceOver navigation (accessibility)
- [ ] Test on iOS 15.0, iOS 17.x (latest)
```

### Android Testing Checklist

```bash
# Install APK on physical device
# Test on Android 10+ devices

# Critical Tests:
- [ ] Background timer works (rest 3 minutes with app backgrounded)
- [ ] Foreground service notification appears
- [ ] Local notifications appear
- [ ] SQLite writes < 5ms (check console logs)
- [ ] Offline mode: log workout with airplane mode on
- [ ] Sync queue: go online, verify sets sync to backend
- [ ] Resume workout after force-close app
- [ ] TalkBack navigation (accessibility)
- [ ] Test on Android 10, Android 14 (latest)
```

## Performance Validation

### Mobile App Benchmarks

```bash
cd /home/asigator/fitness2025/mobile

# Run performance tests
npm run test:performance

# Expected results (per constitutional requirements):
# - SQLite write: p95 < 5ms, p99 < 10ms
# - UI interaction: < 100ms perceived latency
# - Set logging: tap "Complete Set" to UI update < 100ms
# - Analytics chart render: < 500ms
```

### Network Performance

```bash
# Test API response times from mobile app
# Expected: p95 < 200ms for POST /api/sets
# Expected: p95 < 200ms for GET /api/analytics/*

# Monitor in mobile app dev tools
# Or use network debugging in React Native Debugger
```

## App Updates

### iOS Update Process

1. Increment version in `app.json`:
   ```json
   "version": "1.0.1",
   "ios": {
     "buildNumber": "2"
   }
   ```

2. Build new version:
   ```bash
   eas build --platform ios --profile production
   ```

3. Submit to App Store:
   ```bash
   eas submit --platform ios --profile production
   ```

4. Create release notes in App Store Connect

### Android Update Process

1. Increment version in `app.json`:
   ```json
   "version": "1.0.1",
   "android": {
     "versionCode": 2
   }
   ```

2. Build new version:
   ```bash
   eas build --platform android --profile production
   ```

3. Submit to Google Play:
   ```bash
   eas submit --platform android --profile production
   ```

4. Create release notes in Play Console

## Troubleshooting

### iOS Background Audio Not Working

**Symptom**: Timer stops after 30 seconds in background

**Solutions**:
1. Verify `UIBackgroundModes: ["audio"]` in app.json
2. Check silence.mp3 exists in assets/
3. Ensure Audio.setAudioModeAsync called with:
   ```typescript
   {
     playsInSilentModeIOS: true,
     staysActiveInBackground: true,
     shouldDuckAndroid: true,
   }
   ```
4. Test on physical device (simulators unreliable)

### Build Fails on EAS

**Common Issues**:
1. **Missing credentials**: Run `eas credentials` to configure
2. **Outdated dependencies**: Run `npm update` and rebuild
3. **Invalid app.json**: Validate JSON syntax
4. **Expo SDK mismatch**: Ensure all packages compatible with SDK 54

### SQLite Performance Issues

**Symptom**: Writes slower than 5ms target

**Solutions**:
1. Verify WAL mode enabled: `PRAGMA journal_mode=WAL`
2. Use transactions for bulk inserts
3. Ensure indices exist (see schema.sql)
4. Test on physical device (not simulator)

### Sync Queue Not Processing

**Symptom**: Sets not syncing to backend

**Solutions**:
1. Check network connectivity
2. Verify API_BASE_URL in .env.production
3. Check JWT token not expired (30-day expiration)
4. Inspect sync queue logs in console
5. Verify backend API running: `curl https://fitflow.yourdomain.com/health`

## Security Considerations

### API Communication

- **HTTPS Only**: Ensure backend uses SSL (Let's Encrypt)
- **JWT Storage**: Tokens stored in AsyncStorage (encrypted on iOS)
- **Input Validation**: All inputs sanitized before API calls

### Data Privacy

- **Local-First**: All workout data stored locally in SQLite
- **Optional Sync**: Users control when/if data syncs to server
- **Account Deletion**: Cascade delete all user data (irreversible)
- **No Analytics**: App does not send telemetry or analytics

### App Store Requirements

- **Privacy Policy**: Required by both App Store and Play Store
- **Data Collection Disclosure**: Declare what data is collected
- **GDPR Compliance**: Users can export and delete all data

## Accessibility Compliance

### WCAG 2.1 AA Checklist

- [X] VoiceOver/TalkBack labels on all interactive elements
- [X] Minimum touch target size: 44×44 pt (iOS), 48×48 dp (Android)
- [X] Color contrast ratio ≥ 4.5:1 for normal text
- [X] Screen reader announces state changes (set completed, timer started)
- [X] Focus management (auto-focus weight input after set)
- [X] Keyboard navigation support (Android TV, foldables)
- [X] No information conveyed by color alone (use icons + text)

Validate using:
- iOS: Accessibility Inspector (Xcode)
- Android: Accessibility Scanner app

## App Icon and Assets

### Generate App Icons

Use a tool like https://www.appicon.co/ or:

```bash
# Install icon generator
npm install -g app-icon

# Generate from 1024×1024 source
app-icon generate -i icon-source.png
```

Required assets:
- `icon.png`: 1024×1024 (iOS App Store)
- `adaptive-icon.png`: 1024×1024 (Android)
- `splash-icon.png`: 1284×2778 (iOS splash)
- `notification-icon.png`: 96×96 (Android notification)
- `favicon.png`: 48×48 (Web)

## Release Checklist

### Pre-Release

- [ ] Silence.mp3 generated and tested
- [ ] app.json configured with correct bundle IDs
- [ ] .env.production created with production API URL
- [ ] eas.json configured with Apple/Google account info
- [ ] All assets created (icons, splash, screenshots)
- [ ] Privacy policy published at public URL
- [ ] Backend API deployed and tested on Raspberry Pi

### Build & Test

- [ ] iOS production build successful
- [ ] Android production build successful
- [ ] TestFlight beta tested (iOS)
- [ ] Internal testing track tested (Android)
- [ ] Performance benchmarks passed (SQLite < 5ms, UI < 100ms)
- [ ] Accessibility validation passed (WCAG 2.1 AA)
- [ ] Offline mode tested (airplane mode)
- [ ] Background timer tested (3-5 min rest periods)

### App Store Submission

- [ ] App Store Connect listing completed
- [ ] Google Play Console listing completed
- [ ] Screenshots uploaded (all required sizes)
- [ ] App description written
- [ ] Privacy policy linked
- [ ] Age rating completed
- [ ] Pricing set (one-time purchase or free)
- [ ] Release notes written

### Post-Release

- [ ] Monitor crash reports (Sentry/Crashlytics)
- [ ] Monitor app store reviews
- [ ] Verify analytics (if enabled)
- [ ] User feedback collection plan
- [ ] Update roadmap based on feedback

## Additional Resources

- **Expo Documentation**: https://docs.expo.dev/
- **EAS Build**: https://docs.expo.dev/build/introduction/
- **EAS Submit**: https://docs.expo.dev/submit/introduction/
- **App Store Connect**: https://appstoreconnect.apple.com/
- **Google Play Console**: https://play.google.com/console/
- **React Native Performance**: https://reactnative.dev/docs/performance
- **Expo Background Audio**: https://docs.expo.dev/versions/latest/sdk/audio/
