# Screenshot Capture Checklist

Use this checklist for future screenshot capture sessions to avoid common pitfalls.

## Pre-Capture Setup

### ✅ Environment Verification
- [ ] **Backend is running**: `curl http://localhost:3000/health` returns `{"status":"ok"}`
- [ ] **Emulator is connected**: `adb devices` shows `emulator-5554 device`
- [ ] **API URL is configured**: Check `.env` has `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000`
- [ ] **Expo cache is cleared**: Restart with `npx expo start -c` after .env changes
- [ ] **Test API from emulator**: `adb shell curl http://10.0.2.2:3000/health` succeeds

### ✅ Test Account Preparation
- [ ] **Create test account via API**:
  ```bash
  curl -X POST http://localhost:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username":"demo@test.com","password":"Demo1234","age":30}'
  ```
- [ ] **Verify login works**:
  ```bash
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"demo@test.com","password":"Demo1234"}'
  ```
- [ ] **Note credentials**: Email: `demo@test.com`, Password: `Demo1234`

---

## Capture Process

### ✅ For Each Screen

#### 1. Navigate to Screen
- [ ] **Launch app**: `adb shell am start -n com.fitflow.pro/expo.modules.devlauncher.launcher.DevLauncherActivity`
- [ ] **Select mobile app**: Tap "mobile" in Dev Launcher (coordinates: 160, 385)
- [ ] **Wait for render**: `sleep 3` to ensure UI is settled
- [ ] **Dismiss any keyboards**: `adb shell input keyevent KEYCODE_BACK` (if needed)

#### 2. Capture Screenshot
- [ ] **Capture**: `adb exec-out screencap -p > clean-[screen-name].png`
- [ ] **Check file size**: `ls -lh clean-[screen-name].png`
  - Expected: 10-20KB for clean 320×640 PNG
  - If 25KB+: Likely has keyboard/picker overlay - REJECT

#### 3. Verify Quality
- [ ] **View screenshot**: `Read clean-[screen-name].png`
- [ ] **Check for overlays**:
  - ❌ No keyboard visible
  - ❌ No emoji picker
  - ❌ No GIF picker
  - ❌ No loading spinners (if possible)
- [ ] **Verify all UI elements visible**:
  - ✅ Navigation tabs/buttons
  - ✅ Main content area
  - ✅ Action buttons
  - ✅ Status indicators

---

## Screen Checklist

### Authentication Screens
- [x] **Login Screen**: `clean-01-auth-login.png` ✅ CAPTURED
- [ ] **Register Screen**: `clean-02-auth-register.png` (tab navigation broken)

### Main App Screens (Require Auth)
- [ ] **Dashboard**: `clean-03-dashboard.png`
  - Shows: Today's workout, recovery status, quick stats
- [ ] **Analytics**: `clean-04-analytics.png`
  - Shows: 1RM progression chart, volume trends, consistency metrics
- [ ] **Planner**: `clean-05-planner.png`
  - Shows: Program overview, exercise list, drag handles
- [ ] **Settings**: `clean-06-settings.png`
  - Shows: Profile settings, preferences, logout button

### Feature Screens (Require Auth + Navigation)
- [ ] **Workout Screen**: `clean-07-workout.png`
  - Navigate: Tap "Start Workout" from Dashboard
  - Shows: Exercise list, set logging, rest timer
- [ ] **VO2max Workout**: `clean-08-vo2max-workout.png`
  - Navigate: Tap "Cardio Day" from Dashboard
  - Shows: Norwegian 4x4 timer, heart rate zones, interval progress

---

## Quality Checks

### File Size Validation
```bash
# All screenshots should be similar size for same resolution
ls -lh clean-*.png

# Expected output:
# 10-20KB for 320×640 clean PNG
# Anything over 25KB likely has overlay
```

### Visual Inspection
- [ ] **No black bars**: Full screen captured (not cropped)
- [ ] **No status bar** (optional): Can remove with Android Studio Device Frame
- [ ] **Dark theme visible**: Background gradient purple-to-dark
- [ ] **Text readable**: No blur, proper contrast
- [ ] **Buttons visible**: Primary actions clearly shown

---

## Common Issues & Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Keyboard overlay** | File size 25-40KB | Don't tap input fields before capture |
| **Emoji picker** | File size 70-80KB | Dismiss with KEYCODE_BACK before capture |
| **GIF picker** | File size 150KB+ | Force-stop app and relaunch fresh |
| **App crashes** | Shows home screen | Use Expo Dev Launcher, not direct launch |
| **Login fails** | AxiosError toast | Fix EXPO_PUBLIC_API_URL to `http://10.0.2.2:3000` |
| **Tab won't switch** | Same screen captured | Try swipe gesture or skip that screen |
| **Text input concatenates** | Wrong credentials | Restart app fresh, don't reuse fields |

---

## Post-Capture Tasks

### ✅ Documentation
- [ ] **Create manifest**: List all captured screenshots with descriptions
- [ ] **Note missing screens**: Document what wasn't captured and why
- [ ] **File size report**: Compare sizes to identify potential issues
- [ ] **Generate report**: Summary with success metrics and blockers

### ✅ Cleanup
- [ ] **Delete rejected files**: Remove screenshots with overlays
- [ ] **Rename if needed**: Ensure consistent naming convention
- [ ] **Archive debug files**: Move temporary captures to debug folder

### ✅ Delivery
- [ ] **Verify all files present**: Check against Screen Checklist
- [ ] **Create README**: Explain what each screenshot shows
- [ ] **Note improvements**: Document lessons learned for next session

---

## Success Criteria

**Minimum Acceptable**:
- ✅ At least 1 clean authentication screen
- ✅ At least 1 clean main app screen (Dashboard/Analytics/Planner)

**Full Success**:
- ✅ All 8 screens captured cleanly
- ✅ No keyboards/pickers/overlays in any screenshot
- ✅ All features clearly visible
- ✅ Suitable for app store submission

**Current Status**: 1/8 screens captured (Login only) - API connectivity blocking progress

---

## Quick Commands Reference

```bash
# 1. Restart app fresh
adb shell am force-stop com.fitflow.pro
adb shell am start -n com.fitflow.pro/expo.modules.devlauncher.launcher.DevLauncherActivity
sleep 2
adb shell input tap 160 385  # Tap mobile app
sleep 3

# 2. Dismiss keyboard
adb shell input keyevent KEYCODE_BACK

# 3. Capture screenshot
adb exec-out screencap -p > clean-screen-name.png

# 4. Verify quality
ls -lh clean-screen-name.png

# 5. View screenshot
# (Use Read tool)
```

---

## Notes

- **Emulator Resolution**: 320×640 (small, but consistent for testing)
- **Expo Dev Launcher**: Required for this app (not standard launch)
- **API Connectivity**: Critical blocker - must fix before authenticated screens
- **File Naming**: `clean-##-screen-name.png` (01, 02, 03, etc.)
