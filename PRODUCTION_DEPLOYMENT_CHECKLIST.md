# FitFlow Pro - Production Deployment Checklist

**Version**: 1.0.0
**Last Updated**: October 4, 2025
**Target Platforms**: iOS, Android, Raspberry Pi 5 Backend

---

## Pre-Deployment Validation

### Code Quality

- [ ] **TypeScript Compilation**: All TypeScript errors resolved
  - Current status: 81 errors in mobile app - MUST FIX
  - Run: `cd mobile && npm run build` (should complete with no errors)

- [ ] **ESLint Warnings**: Critical warnings addressed
  - Current status: 664 warnings - prioritize P0/P1 warnings
  - Run: `cd mobile && npm run lint` and `cd backend && npm run lint`
  - Target: < 50 warnings remaining (non-critical acceptable)

- [ ] **All Tests Passing**
  - Backend: `cd backend && npm run test` (should be 100% passing)
  - Mobile unit: `cd mobile && npm run test:unit`
  - Mobile integration: `cd mobile && npm run test:integration`
  - Current backend status: 123/136 tests passing (90.4%)

- [ ] **Code Coverage**: >= 80% overall
  - Backend: `cd backend && npm run test:coverage`
  - Current status: 78% backend coverage

- [ ] **No Debug Code in Production**
  - No `console.log` statements (use proper logging)
  - No `debugger` statements
  - No test data or fixtures in production code

- [ ] **No Hardcoded Credentials**
  - Check for hardcoded API keys, passwords, tokens
  - All secrets in environment variables
  - Run: `grep -r "password.*=" --include="*.ts" --include="*.tsx" mobile/ backend/`

- [ ] **Environment Variables Documented**
  - All required env vars listed in ENVIRONMENT_CONFIG.md
  - Example `.env.example` files present

### Visual Improvements (Post-Agent 8-10)

- [ ] **P0 Fixes Verified** (Critical UX)
  - WCAG contrast ratios >= 4.5:1 (all text elements)
  - Typography consistency (no more 20px vs 18px mismatches)
  - Touch targets >= 44×44px (all interactive elements)
  - Primary CTAs use high-contrast colors
  - No layout shifts during loading states

- [ ] **P1 Fixes Verified** (Important UX)
  - Empty states have illustrations + actionable text
  - Workout screen ergonomics improved (weight/reps controls accessible)
  - Recovery assessment UX streamlined
  - Progress bars use accurate colors (green for optimal, yellow for adequate)
  - Card spacing consistent (16px default)

- [ ] **Visual Regression Tests**
  - Screenshot comparison with baseline
  - No unintended layout changes
  - Check on multiple device sizes (iPhone SE, iPhone 14 Pro, iPad)

- [ ] **Screenshot Documentation Updated**
  - Clean screenshots in `/mobile/screenshots/mobile-final/`
  - App Store/Play Store screenshots ready
  - No test data visible in screenshots

- [ ] **Device Compatibility**
  - iPhone SE (smallest iOS target) - no layout breaks
  - iPhone 14 Pro Max (largest iOS target)
  - iPad (tablet layout if applicable)
  - Pixel 4a (smallest Android target)
  - Pixel 7 Pro (largest Android target)

### Performance

- [ ] **App Bundle Size**
  - iOS: < 50MB (excluding App Store assets)
  - Android: < 30MB (AAB format)
  - Run: `npx expo export --platform ios` and check dist size

- [ ] **Startup Time**: < 2 seconds (cold start)
  - Test on physical devices (iPhone 11+, Pixel 5+)
  - Measure with: `adb logcat | grep "displayed"` (Android)

- [ ] **Navigation Transitions**: < 200ms
  - Test all screen transitions
  - No janky animations

- [ ] **API Response Times**: < 500ms (p95)
  - Run: `cd backend && npm run test:performance`
  - Critical endpoints: /api/auth/login, /api/workouts, /api/sets

- [ ] **No Memory Leaks**: During 1-hour session
  - Test with React Native DevTools / Xcode Instruments
  - Monitor memory usage over time

- [ ] **SQLite Performance**: < 10ms (p99)
  - Run: `cd backend && npm run test:performance`
  - Check indices are in place: `sqlite3 backend/data/fitflow.db ".indexes"`

- [ ] **Background Sync Working**
  - Test offline mode (airplane mode)
  - Verify data syncs when back online
  - Check exponential backoff (1s, 2s, 4s, 8s, 16s)

### Security

- [ ] **JWT Tokens Properly Validated**
  - Signature verification working
  - Expiration checked (30-day for this app)
  - Test with expired/invalid tokens

- [ ] **Passwords Hashed with bcrypt**
  - Cost factor >= 12
  - Check: `backend/src/services/authService.ts` (bcrypt.hash calls)

- [ ] **SQL Injection Protection**
  - All queries use parameterized statements
  - No string concatenation in SQL
  - Check: `grep -r "db.run\|db.get\|db.all" backend/src/`

- [ ] **XSS Protection**
  - Input sanitization on API endpoints
  - React Native safe from DOM-based XSS (no dangerouslySetInnerHTML)

- [ ] **HTTPS Enforced** (Backend)
  - Nginx configured with SSL/TLS
  - Let's Encrypt certificates installed
  - HTTP redirects to HTTPS

- [ ] **Expo Security Audit Passed**
  - No expo-dev-client in production
  - No development builds pushed to stores

- [ ] **Dependency Vulnerability Scan**
  - Run: `cd backend && npm audit` (0 high/critical vulnerabilities)
  - Run: `cd mobile && npm audit`
  - Fix or acknowledge all vulnerabilities

### Accessibility

- [ ] **WCAG 2.1 AA Compliance Verified**
  - Contrast ratios >= 4.5:1 (normal text)
  - Contrast ratios >= 3:1 (large text 18px+)
  - All interactive elements labeled

- [ ] **Screen Reader Tested**
  - iOS VoiceOver: All screens navigable
  - Android TalkBack: All screens navigable
  - Semantic headings used correctly

- [ ] **All Text Contrast >= 4.5:1**
  - Use contrast checker on all text elements
  - Check primary/secondary text colors
  - Dark mode support (if applicable)

- [ ] **All Touch Targets >= 44×44px**
  - Buttons, icons, checkboxes, switches
  - Verify with visual inspector
  - Especially critical: workout screen controls

- [ ] **Focus Order Logical**
  - Tab order follows visual flow
  - No focus traps
  - Skip links for complex screens

- [ ] **Color Not Sole Indicator**
  - Success/error states use icons + color
  - Charts have patterns in addition to colors
  - Volume zones labeled with text + color

### Backend Readiness

- [ ] **Database Migrations Tested**
  - All migrations run successfully on clean DB
  - Rollback procedures tested
  - Backup before migration

- [ ] **Backup and Restore Procedures Tested**
  - SQLite backup: `sqlite3 fitflow.db ".backup fitflow.db.backup"`
  - Restore verified: `sqlite3 fitflow.db < fitflow.db.backup`
  - Automated daily backups configured

- [ ] **Server Scaled Appropriately**
  - Raspberry Pi 5 confirmed (8GB RAM recommended)
  - PM2 cluster mode enabled (if multi-core)
  - Swap file configured (2GB minimum)

- [ ] **Nginx Configured with SSL**
  - SSL certificate valid (Let's Encrypt)
  - HTTPS redirect working
  - Reverse proxy to port 3000
  - CORS headers correct

- [ ] **PM2 Process Manager Configured**
  - `pm2 startup` configured for auto-restart
  - `pm2 save` executed after setup
  - Max memory restart configured
  - Log rotation enabled

- [ ] **Health Check Endpoint Responding**
  - `curl http://localhost:3000/health` returns `{"status":"ok"}`
  - Includes database connectivity check
  - Returns 200 status code

- [ ] **Monitoring/Logging Configured**
  - PM2 logs: `pm2 logs fitflow-api`
  - Nginx logs: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`
  - Log rotation configured (logrotate)
  - Alerts for errors (optional: email/Slack)

- [ ] **Rate Limiting in Place**
  - Auth endpoints: 5 requests/minute (prevent brute force)
  - API endpoints: 100 requests/minute per user
  - Check: `backend/src/server.ts` (@fastify/rate-limit)

### Mobile Builds

- [ ] **iOS Build Created**
  - Run: `cd mobile && eas build --platform ios --profile production`
  - Or: `npx expo build:ios --release-channel production`
  - Build completes with .ipa file

- [ ] **Android Build Created**
  - Run: `cd mobile && eas build --platform android --profile production`
  - Or: `npx expo build:android --release-channel production`
  - Build completes with .aab file (Android App Bundle)

- [ ] **App Store Metadata Complete** (iOS)
  - App name: "FitFlow Pro"
  - Subtitle: "Evidence-Based Training"
  - Description (4000 char limit): [Fill from marketing]
  - Keywords: fitness, training, hypertrophy, RP, workout tracker, vo2max
  - Screenshots (6.5", 5.5", 12.9"): From `/mobile/screenshots/mobile-final/`
  - App icon (1024×1024px): Optimized PNG

- [ ] **Play Store Metadata Complete** (Android)
  - Short description (80 chars): "Evidence-based hypertrophy training tracker"
  - Full description (4000 chars): [Fill from marketing]
  - Screenshots (phone + tablet): From `/mobile/screenshots/mobile-final/`
  - Feature graphic (1024×500px): Banner image
  - App icon (512×512px): Optimized PNG

- [ ] **Privacy Policy Uploaded**
  - Hosted at: `https://fitflow.pro/privacy`
  - GDPR/CCPA compliant
  - Data collection disclosed (user profiles, workout data)

- [ ] **Terms of Service Uploaded**
  - Hosted at: `https://fitflow.pro/terms`
  - Liability disclaimers (fitness advice)
  - Account termination policy

- [ ] **App Icons (All Sizes) Optimized**
  - iOS: 20px-1024px (all required sizes)
  - Android: 48dp-512dp (all densities)
  - No transparency (solid background)

### Testing Sign-Off

- [ ] **Manual QA Passed All Test Scenarios**
  - Scenario 1: Complete guided workout session
  - Scenario 2: Auto-regulation based on recovery
  - Scenario 3: Track and analyze progression
  - Scenario 4: Plan and customize training
  - Scenario 5: Execute VO2max cardio protocol

- [ ] **UAT Completed** (>= 80% satisfaction)
  - 5+ beta testers
  - Feedback documented
  - Critical issues addressed

- [ ] **All P0 Bugs Fixed**
  - Navigation system implemented
  - TypeScript errors resolved
  - App boots successfully

- [ ] **All P1 Bugs Fixed or Deferred**
  - Visual improvements complete
  - Ergonomics enhanced
  - Non-critical issues documented for v1.1

- [ ] **Beta Testing Completed** (if applicable)
  - TestFlight (iOS): 25+ testers
  - Play Console Internal Track (Android): 20+ testers
  - At least 1 week beta period

- [ ] **Stakeholder Approval Obtained**
  - Product owner sign-off
  - Engineering lead sign-off
  - Legal review (privacy policy, terms)

---

## Deployment Steps

### Pre-Deployment Preparation

**Step 0: Final Code Freeze**
```bash
# Ensure working directory is clean
cd /home/asigator/fitness2025
git status  # Should show "nothing to commit, working tree clean"

# Tag release version
git tag -a v1.0.0 -m "FitFlow Pro v1.0.0 - Production Release"
git push origin v1.0.0
```

### Backend Deployment (Raspberry Pi 5)

**Step 1: Backup Current System**
```bash
# SSH into Raspberry Pi
ssh pi@raspberrypi.local  # Or use IP: ssh pi@192.168.x.x

# Navigate to backend directory
cd /home/pi/fitflow-backend

# Stop PM2 service
pm2 stop fitflow-api

# Backup database
cd data
sqlite3 fitflow.db ".backup fitflow.db.backup-$(date +%Y%m%d-%H%M%S)"

# Backup entire backend directory
cd /home/pi
tar -czf fitflow-backup-$(date +%Y%m%d-%H%M%S).tar.gz fitflow-backend/

# Verify backup size
ls -lh fitflow-backup-*.tar.gz
```

**Step 2: Deploy New Code**
```bash
cd /home/pi/fitflow-backend

# Pull latest code (assuming git repository)
git fetch origin
git checkout v1.0.0  # Deploy tagged release

# Clean install dependencies (ensures ARM64 binaries)
rm -rf node_modules
npm ci  # Clean install from package-lock.json

# Verify environment variables
cat .env  # Should contain production values (JWT_SECRET, etc.)

# Build TypeScript
npm run build

# Verify build succeeded
ls -la dist/  # Should contain compiled .js files
```

**Step 3: Run Database Migrations** (if applicable)
```bash
cd /home/pi/fitflow-backend

# Backup before migration (safety)
sqlite3 data/fitflow.db ".backup data/fitflow.db.pre-migration-$(date +%Y%m%d)"

# Run migrations (adjust if you have migration scripts)
# Example: npm run migrate
# Or manually:
# sqlite3 data/fitflow.db < migrations/001_add_new_fields.sql

# Verify migration success
sqlite3 data/fitflow.db "SELECT * FROM schema_migrations;"  # If using migration tracking
```

**Step 4: Restart Services**
```bash
# Restart PM2 service
pm2 restart fitflow-api

# Monitor startup logs
pm2 logs fitflow-api --lines 100

# Verify process is running
pm2 status
# Expected: fitflow-api status "online", 0 restarts

# Wait 10 seconds for startup
sleep 10
```

**Step 5: Verify Backend**
```bash
# Health check (local)
curl http://localhost:3000/health
# Expected: {"status":"ok"}

# Health check (network)
curl http://192.168.x.x:3000/health  # Use Pi's IP
# Expected: {"status":"ok"}

# Test authentication endpoint
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test-deploy@example.com","password":"Test123!","age":25}'
# Expected: 201 status, user_id and token returned

# Test login endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test-deploy@example.com","password":"Test123!"}'
# Expected: 200 status, token returned

# Clean up test user (optional)
sqlite3 data/fitflow.db "DELETE FROM users WHERE username='test-deploy@example.com';"
```

**Step 6: Verify Nginx (HTTPS)**
```bash
# Test HTTPS endpoint
curl https://api.fitflow.pro/health
# Expected: {"status":"ok"}

# Verify SSL certificate
curl -vI https://api.fitflow.pro 2>&1 | grep "SSL"
# Expected: SSL certificate verify ok

# Check Nginx logs for errors
sudo tail -f /var/log/nginx/error.log
# Should be quiet (no recent errors)
```

### Mobile Deployment

#### iOS App Store

**Step 1: Create Production Build**
```bash
cd /home/asigator/fitness2025/mobile

# Ensure .env has production API URL
cat .env
# Expected: EXPO_PUBLIC_API_URL=https://api.fitflow.pro

# Build with EAS (Expo Application Services) - recommended
eas build --platform ios --profile production

# OR build with legacy Expo CLI
npx expo build:ios --release-channel production

# Wait for build to complete (10-20 minutes)
# Download .ipa file when ready
```

**Step 2: Upload to App Store Connect**

**Option A: Using Transporter (Mac)**
1. Download Transporter app from Mac App Store
2. Drag .ipa file into Transporter
3. Click "Deliver" to upload to App Store Connect

**Option B: Using Xcode**
1. Open Xcode → Window → Organizer
2. Archives tab → Distribute App
3. App Store Connect → Upload
4. Select .ipa file

**Step 3: App Store Submission**

1. **Go to App Store Connect** (appstoreconnect.apple.com)
2. **My Apps** → **FitFlow Pro** → **+ Version** (1.0.0)
3. **Fill Metadata**:
   - App Name: `FitFlow Pro`
   - Subtitle: `Evidence-Based Hypertrophy Training`
   - Description:
     ```
     FitFlow Pro implements evidence-based training principles from Renaissance
     Periodization (RP) by Dr. Mike Israetel. Track your strength training with
     scientific precision, optimize volume through mesocycle phases (MEV/MAV/MRV),
     and monitor cardiovascular fitness with VO2max protocols.

     KEY FEATURES:
     • 100+ exercise library (organized by muscle group)
     • Mesocycle phase progression (MEV → MAV → MRV → Deload)
     • Auto-regulation based on recovery assessments
     • 1RM progression tracking with Epley formula
     • VO2max cardio tracking (Norwegian 4x4 protocol)
     • Volume analytics with zone classification
     • Offline-first with background sync

     SCIENTIFIC APPROACH:
     Based on Renaissance Periodization methodology, the gold standard in
     hypertrophy training. Designed for serious lifters who want data-driven results.
     ```
   - Keywords: `fitness,training,hypertrophy,RP,workout tracker,strength,vo2max,periodization,bodybuilding,progressive overload`
   - Support URL: `https://fitflow.pro/support`
   - Marketing URL: `https://fitflow.pro`
   - Privacy Policy URL: `https://fitflow.pro/privacy`

4. **Upload Screenshots**:
   - 6.5" (iPhone 14 Pro Max): 6-10 screenshots
   - 5.5" (iPhone 8 Plus): Same screenshots resized
   - 12.9" (iPad Pro): 2-5 screenshots (if tablet support)
   - Use images from `/mobile/screenshots/mobile-final/`

5. **App Icon**: Upload 1024×1024px PNG (no alpha channel)

6. **Build**: Select uploaded .ipa build

7. **App Review Information**:
   - Demo account: `demo@fitflow.pro` / `Demo123!`
   - Notes: "Fitness tracking app. No special setup required."

8. **Version Release**: Select "Automatically release after approval"

9. **Submit for Review** → Wait 24-48 hours for review

#### Android Play Store

**Step 1: Create Production Build**
```bash
cd /home/asigator/fitness2025/mobile

# Ensure .env has production API URL
cat .env
# Expected: EXPO_PUBLIC_API_URL=https://api.fitflow.pro

# Build with EAS (recommended - creates AAB)
eas build --platform android --profile production

# OR build with legacy Expo CLI
npx expo build:android --release-channel production

# Wait for build to complete (10-20 minutes)
# Download .aab file (Android App Bundle) when ready
```

**Step 2: Upload to Play Console**

1. **Go to Play Console** (play.google.com/console)
2. **Select FitFlow Pro** app
3. **Production** → **Create new release**
4. **Upload** → Select .aab file
5. **Release name**: `1.0.0 (1)` (version name + version code)

**Step 3: Play Store Submission**

1. **Store Listing**:
   - App name: `FitFlow Pro`
   - Short description (80 chars):
     ```
     Evidence-based hypertrophy training tracker with RP methodology
     ```
   - Full description (4000 chars):
     ```
     FitFlow Pro: The Science of Hypertrophy Training

     Built on Renaissance Periodization (RP) principles by Dr. Mike Israetel,
     FitFlow Pro is the most scientifically advanced training tracker for serious
     lifters. Track strength, optimize volume, and monitor cardiovascular fitness
     with precision.

     🏋️ KEY FEATURES:

     EXERCISE LIBRARY
     • 100+ exercises organized by muscle group
     • Filter by equipment, movement pattern
     • Primary/secondary muscle targeting

     MESOCYCLE PROGRESSION
     • MEV (Minimum Effective Volume) baseline
     • MAV (Maximum Adaptive Volume) sweet spot
     • MRV (Maximum Recoverable Volume) peak
     • Deload recovery phase
     • Automatic volume adjustments (+20%, +15%, -50%)

     WORKOUT TRACKING
     • Log weight, reps, RIR (Reps in Reserve)
     • 1RM estimation (Epley formula with RIR)
     • Rest timer with background support
     • Auto-regulation based on recovery

     ANALYTICS
     • 1RM progression charts
     • Volume trends (weekly/monthly)
     • Muscle group volume analysis
     • Zone classification (below MEV, adequate, optimal, above MRV)

     VO2MAX CARDIO
     • Norwegian 4x4 interval protocol
     • Heart rate zone tracking
     • VO2max estimation (Cooper formula)
     • Progression monitoring

     RECOVERY ASSESSMENT
     • Daily 3-question check (sleep, soreness, motivation)
     • Automatic volume adjustment (reduce sets if low recovery)
     • Science-based auto-regulation

     OFFLINE-FIRST
     • Train without internet connection
     • Background sync when online
     • Local SQLite database (< 5ms writes)

     📊 SCIENTIFIC METHODOLOGY:

     FitFlow Pro implements evidence-based training principles:
     • Volume landmarks (MEV/MAV/MRV) for each muscle group
     • RIR scale (0-4) for proximity to failure
     • Progressive overload through mesocycle phases
     • Auto-regulation based on recovery status

     Designed for intermediate to advanced lifters who understand the science
     of hypertrophy and want data-driven results.

     🎯 WHO IS THIS FOR?

     • Bodybuilders optimizing muscle growth
     • Powerlifters tracking strength progression
     • CrossFit athletes monitoring volume
     • Personal trainers managing client programs
     • Anyone serious about evidence-based training

     📖 LEARN MORE:

     Based on Renaissance Periodization resources:
     • "The Renaissance Diet 2.0"
     • "Scientific Principles of Strength Training"
     • RP Hypertrophy Training Guide

     Support: support@fitflow.pro
     Privacy: https://fitflow.pro/privacy
     ```

2. **Graphics**:
   - Screenshots (phone): 4-8 screenshots from `/mobile/screenshots/mobile-final/`
   - Screenshots (tablet): 2-4 screenshots (if supported)
   - Feature graphic: 1024×500px banner
   - App icon: 512×512px PNG

3. **Categorization**:
   - App category: Health & Fitness
   - Tags: Fitness, Workout, Training
   - Content rating: Fill questionnaire (likely "Everyone")

4. **Contact Details**:
   - Email: support@fitflow.pro
   - Phone: [Optional]
   - Website: https://fitflow.pro

5. **Privacy Policy**: https://fitflow.pro/privacy

6. **Store Presence**:
   - Countries: All countries (or select specific regions)
   - Pricing: Free (or set price)

7. **Review and Publish**:
   - **Internal Testing** (recommended first): Roll out to 20-100 testers
   - After 1 week internal testing → **Production**: Roll out to 100% users

---

### Post-Deployment Verification

**Step 1: Smoke Tests (Critical Path)**

**Backend Health**:
```bash
# Public API health check
curl https://api.fitflow.pro/health
# Expected: {"status":"ok"}

# Authentication flow
curl -X POST https://api.fitflow.pro/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"prod-test@example.com","password":"Test123!","age":28}'
# Expected: 201 status, user_id and token

# Login
curl -X POST https://api.fitflow.pro/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"prod-test@example.com","password":"Test123!"}'
# Expected: 200 status, token
```

**Mobile App (iOS/Android)**:
1. Download from App Store / Play Store
2. Complete registration flow (new user)
3. Create workout session
4. Log one set (verify immediate write)
5. Check backend database for synced set
6. Verify 1RM calculation displayed
7. Test offline mode (airplane mode → log set → back online → verify sync)

**Step 2: Monitor Logs (First Hour)**

**Backend Logs**:
```bash
# SSH to Raspberry Pi
ssh pi@raspberrypi.local

# Watch PM2 logs
pm2 logs fitflow-api --lines 500

# Watch for errors
pm2 logs fitflow-api --err

# Nginx access logs
sudo tail -f /var/log/nginx/access.log | grep "POST\|GET"

# Nginx error logs (should be quiet)
sudo tail -f /var/log/nginx/error.log
```

**App Store / Play Console**:
- **Crashes**: Check crash reports (should be 0%)
- **ANRs** (Android): Application Not Responding events (should be 0%)
- **API Errors**: Monitor backend logs for 4xx/5xx responses

**Step 3: Verify Analytics**

**App Store Connect** (iOS):
- Go to App Analytics → Metrics
- Check: Impressions, Downloads, Installations
- Conversion rate: Impressions → Downloads (target: > 2%)

**Play Console** (Android):
- Go to Statistics → Installs
- Check: Store listing visitors, Installers
- Conversion rate: Visitors → Installers (target: > 5%)

**Backend Analytics** (custom):
```bash
# SSH to Pi
ssh pi@raspberrypi.local

# Check database stats
sqlite3 /home/pi/fitflow-backend/data/fitflow.db

# Total users
SELECT COUNT(*) FROM users;

# Total workouts today
SELECT COUNT(*) FROM workouts WHERE DATE(created_at) = DATE('now');

# Total sets logged today
SELECT COUNT(*) FROM sets WHERE DATE(timestamp) = DATE('now');

# Exit SQLite
.quit
```

---

## Rollback Plan

### If Critical Issues Found

**Severity Assessment**:
- **P0 (Critical)**: App crashes on launch, data loss, security breach → **ROLLBACK IMMEDIATELY**
- **P1 (High)**: Feature broken but app usable, performance degradation → **ROLLBACK within 1 hour**
- **P2 (Medium)**: Minor bugs, UI glitches → **Hotfix within 24 hours**
- **P3 (Low)**: Cosmetic issues → **Fix in next release**

### Backend Rollback Procedure

**Step 1: Stop Current Service**
```bash
ssh pi@raspberrypi.local
cd /home/pi/fitflow-backend

# Stop PM2
pm2 stop fitflow-api
```

**Step 2: Restore Code**
```bash
# Option A: Git rollback to previous tag
git checkout v0.9.0  # Previous stable version

# Option B: Restore from backup
cd /home/pi
tar -xzf fitflow-backup-20251004-120000.tar.gz
mv fitflow-backend fitflow-backend-broken
mv fitflow-backend-backup fitflow-backend
cd fitflow-backend
```

**Step 3: Restore Database (if needed)**
```bash
cd /home/pi/fitflow-backend/data

# Stop service first
pm2 stop fitflow-api

# Restore from backup
cp fitflow.db fitflow.db.broken
cp fitflow.db.backup-20251004 fitflow.db

# Verify restore
sqlite3 fitflow.db "SELECT COUNT(*) FROM users;"
# Should match expected user count
```

**Step 4: Rebuild and Restart**
```bash
cd /home/pi/fitflow-backend

# Clean rebuild
rm -rf node_modules dist
npm ci
npm run build

# Restart service
pm2 restart fitflow-api

# Verify health
sleep 5
curl http://localhost:3000/health
```

**Step 5: Notify Users** (if necessary)
```bash
# Update status page: https://status.fitflow.pro
# Post to social media: "Experiencing technical issues, rolling back to v0.9.0"
# Email active users if major data issues
```

### Mobile Rollback Procedure

**Important**: App Store and Play Store **cannot rollback** published apps. You can only:
1. Remove app from sale (temporary)
2. Submit urgent hotfix update
3. Disable features via remote config (if implemented)

**Option 1: Remove from Sale** (iOS)
1. Go to App Store Connect
2. Select FitFlow Pro → Pricing and Availability
3. Set availability: "Remove from Sale"
4. Users who installed can continue using, no new downloads

**Option 2: Remove from Sale** (Android)
1. Go to Play Console
2. Select FitFlow Pro → Production
3. Halt rollout to 0% (if gradual rollout enabled)
4. Or unpublish app (Settings → Advanced → Unpublish)

**Option 3: Emergency Hotfix**
1. Fix critical bug in code
2. Increment version: `1.0.0` → `1.0.1`
3. Submit expedited review:
   - iOS: Request expedited review (explain critical bug)
   - Android: Roll out immediately (no review delay)
4. Wait 24-48 hours (iOS) or 2-4 hours (Android)

**Option 4: Remote Feature Kill Switch** (if implemented)
```bash
# If you have remote config (Firebase Remote Config, etc.)
# Disable broken feature without app update

# Example: Disable VO2max feature
firebase remoteconfig:set vo2max_enabled false

# Users will see feature disabled on next app restart
```

---

## Post-Launch Monitoring (First 48 Hours)

### Metrics to Monitor

**Crash Reports** (Target: < 1% crash rate)
- **iOS**: Xcode Organizer → Crashes
- **Android**: Play Console → Quality → Crashes & ANRs
- **Third-party**: Sentry, Firebase Crashlytics (if integrated)

**API Error Rates** (Target: < 1% error rate)
```bash
# SSH to Pi
ssh pi@raspberrypi.local

# Count 4xx/5xx errors in last hour
grep "$(date +%Y-%m-%d\ %H)" /var/log/nginx/access.log | grep -E " (4|5)[0-9]{2} " | wc -l

# Top error endpoints
grep "$(date +%Y-%m-%d)" /var/log/nginx/access.log | grep -E " (4|5)[0-9]{2} " | awk '{print $7}' | sort | uniq -c | sort -rn | head -10
```

**User Retention** (Target: >= 50% Day 1)
- **App Store Connect**: Analytics → Retention
- **Play Console**: Statistics → Retention
- Calculate: (Users who return next day) / (Total new users) × 100

**App Reviews** (Target: >= 4.0 stars)
- **App Store**: Monitor reviews in App Store Connect
- **Play Store**: Monitor reviews in Play Console
- Respond to negative reviews within 24 hours

**Backend Resource Usage**
```bash
# SSH to Pi
ssh pi@raspberrypi.local

# CPU usage
top -b -n 1 | grep "Cpu(s)"
# Expected: < 50% CPU usage

# Memory usage
free -h
# Expected: < 4GB used (if 8GB Pi)

# Disk usage
df -h /home/pi/fitflow-backend/data
# Expected: < 80% full

# PM2 process stats
pm2 status
# Expected: 0 restarts, < 500MB memory per process
```

**Database Performance**
```bash
# SSH to Pi
ssh pi@raspberrypi.local

# Check SQLite WAL mode
sqlite3 /home/pi/fitflow-backend/data/fitflow.db "PRAGMA journal_mode;"
# Expected: wal

# Database size
ls -lh /home/pi/fitflow-backend/data/fitflow.db
# Track growth over time

# Slow query log (if enabled)
tail -f /var/log/sqlite-slow-queries.log
# Should be empty or < 10ms queries
```

### Monitoring Checklist (Every 6 Hours, First 48h)

- [ ] **Hour 0-6**: Initial launch monitoring
  - [ ] Crash rate < 1%
  - [ ] API error rate < 1%
  - [ ] No P0 bugs reported
  - [ ] Backend CPU < 50%
  - [ ] Backend memory < 4GB

- [ ] **Hour 6-12**: Early adoption monitoring
  - [ ] 10+ downloads achieved
  - [ ] No critical bugs reported
  - [ ] App store reviews >= 4.0 stars
  - [ ] Database performance stable

- [ ] **Hour 12-24**: First day complete
  - [ ] 50+ downloads (iOS + Android)
  - [ ] Day 1 retention >= 50%
  - [ ] No rollback required
  - [ ] Support tickets < 5

- [ ] **Hour 24-48**: Stabilization period
  - [ ] 100+ downloads
  - [ ] Crash rate < 0.5%
  - [ ] API uptime > 99.9%
  - [ ] All critical paths working

### Alert Thresholds

Configure alerts for:
- **Crash rate > 2%**: Immediate investigation
- **API error rate > 5%**: Check backend logs
- **Backend CPU > 80%**: Scale up or optimize
- **Backend memory > 6GB** (on 8GB Pi): Memory leak?
- **Disk > 90% full**: Expand storage or clean logs
- **Average app review < 3.5 stars**: UX issues

---

## Success Metrics

### Week 1 Goals

- [ ] **Downloads**: 100+ total (iOS + Android combined)
- [ ] **Crash Rate**: < 5% (industry standard: < 2%)
- [ ] **App Rating**: >= 4.0 stars average
- [ ] **Day 1 Retention**: >= 50% (users return next day)
- [ ] **Day 7 Retention**: >= 30% (users return after 1 week)
- [ ] **Zero P0 Bugs**: No critical crashes or data loss
- [ ] **API Uptime**: >= 99% (< 1.7 hours downtime)
- [ ] **Support Tickets**: < 10 total

### Month 1 Goals

- [ ] **Downloads**: 500+ total
- [ ] **Active Users**: 200+ MAU (Monthly Active Users)
- [ ] **Crash Rate**: < 2% (improved from Week 1)
- [ ] **App Rating**: >= 4.2 stars
- [ ] **Day 30 Retention**: >= 30% (users still active after 1 month)
- [ ] **Feature Adoption**:
  - [ ] 80%+ users complete 1 workout
  - [ ] 50%+ users log 10+ sets
  - [ ] 30%+ users use VO2max tracking
  - [ ] 40%+ users use program planner
- [ ] **Store Presence**:
  - [ ] Featured in "New Health & Fitness" (aspirational)
  - [ ] Top 100 in "Health & Fitness" category (aspirational)

### Quarter 1 Goals (3 Months)

- [ ] **Downloads**: 2,000+ total
- [ ] **Active Users**: 800+ MAU
- [ ] **Crash Rate**: < 1% (best-in-class)
- [ ] **App Rating**: >= 4.5 stars
- [ ] **Organic Growth**: 50%+ downloads from App Store search (not referrals)
- [ ] **Engagement**: Average 3 workouts/week per active user
- [ ] **Revenue** (if monetized): [Set target if applicable]

---

## Emergency Contacts

### Incident Response Team

**Engineering Lead**:
- Name: [Your Name]
- Email: engineering@fitflow.pro
- Phone: [Your Phone]
- Slack: @engineering-lead
- Responsibility: Code issues, backend problems

**QA Lead**:
- Name: [QA Name]
- Email: qa@fitflow.pro
- Phone: [QA Phone]
- Slack: @qa-lead
- Responsibility: Bug triage, testing validation

**Product Manager**:
- Name: [PM Name]
- Email: product@fitflow.pro
- Phone: [PM Phone]
- Slack: @product-manager
- Responsibility: User impact assessment, rollback decisions

**DevOps / Infrastructure**:
- Name: [DevOps Name]
- Email: devops@fitflow.pro
- Phone: [DevOps Phone]
- Slack: @devops
- Responsibility: Server issues, database problems, Raspberry Pi hardware

**On-Call Rotation** (24/7 coverage):
- **Week of Oct 7**: [Engineer Name] - Primary, [Engineer Name] - Secondary
- **Week of Oct 14**: [Engineer Name] - Primary, [Engineer Name] - Secondary
- **Week of Oct 21**: [Engineer Name] - Primary, [Engineer Name] - Secondary

### Escalation Path

**P0 - Critical** (App down, data loss, security breach):
1. Page on-call engineer immediately (PagerDuty/phone)
2. Create #incident-[number] Slack channel
3. Notify Engineering Lead + Product Manager
4. Execute rollback if needed (no approval needed for P0)
5. Post-mortem within 24 hours

**P1 - High** (Feature broken, performance degradation):
1. Notify on-call engineer (Slack)
2. Engineering Lead assesses severity
3. Decide: hotfix or rollback (within 1 hour)
4. Communicate to users if affecting > 10%

**P2 - Medium** (Minor bugs, UI issues):
1. Create Jira ticket
2. Assign to sprint backlog
3. Fix in next release (no emergency deployment)

**P3 - Low** (Cosmetic issues, suggestions):
1. Create Jira ticket
2. Triage in weekly planning
3. Fix when convenient

### External Vendors

**Hosting / Infrastructure**:
- Provider: Self-hosted (Raspberry Pi 5)
- Backup contact: [Your ISP] - [ISP Phone]

**Domain / DNS**:
- Registrar: [e.g., Namecheap, GoDaddy]
- Login: [Secure location]
- Support: [Registrar support phone]

**SSL Certificates**:
- Provider: Let's Encrypt (free)
- Renewal: Automatic via certbot
- Manual renewal: `sudo certbot renew`

**App Store / Play Store**:
- Apple Developer Support: developer.apple.com/support
- Google Play Support: support.google.com/googleplay/android-developer

---

## Sign-Off

### Pre-Deployment Checklist Completion

**Engineering Lead**:
- Name: _______________________
- Signature: ___________________
- Date: ________________________
- Confirmed:
  - [ ] All code quality checks passed
  - [ ] All tests passing
  - [ ] Performance benchmarks met
  - [ ] Security audit complete

**QA Lead**:
- Name: _______________________
- Signature: ___________________
- Date: ________________________
- Confirmed:
  - [ ] Manual QA passed all scenarios
  - [ ] Visual improvements verified
  - [ ] Accessibility compliance verified
  - [ ] Device compatibility tested

**Product Manager**:
- Name: _______________________
- Signature: ___________________
- Date: ________________________
- Confirmed:
  - [ ] Feature requirements met
  - [ ] UAT completed successfully
  - [ ] Stakeholder approval obtained
  - [ ] Marketing materials ready

**DevOps / Infrastructure**:
- Name: _______________________
- Signature: ___________________
- Date: ________________________
- Confirmed:
  - [ ] Backend deployment tested
  - [ ] Database migrations validated
  - [ ] Monitoring/alerting configured
  - [ ] Rollback procedures tested

### Deployment Authorization

**Is the application ready for production deployment?**

- [ ] **YES** - All checks passed, proceed with deployment
- [ ] **NO** - Issues identified, deployment postponed

**If YES, specify deployment details:**

**Deployment Date**: _____________________ (YYYY-MM-DD)

**Deployment Time**: _____________________ (HH:MM UTC)
*Recommended: Low-traffic window (e.g., 2:00 AM UTC / 10:00 PM ET)*

**Deployment Lead**: _____________________

**Communication Plan**:
- [ ] Internal team notified (Slack #deployments)
- [ ] Beta testers notified (email)
- [ ] Status page updated (https://status.fitflow.pro)
- [ ] Social media prepared (Twitter, LinkedIn)

**If NO, specify blockers:**

1. _______________________________________________________________
2. _______________________________________________________________
3. _______________________________________________________________

**Re-assessment Date**: ___________________

---

## Post-Deployment

### Immediate Actions (Within 1 Hour)

- [ ] Verify all smoke tests passed
- [ ] Confirm backend health endpoint responding
- [ ] Monitor logs for errors (PM2, Nginx)
- [ ] Check first downloads/installs in App Store/Play Console
- [ ] Verify no crash reports

### First 24 Hours

- [ ] Monitor crash rate (target: < 1%)
- [ ] Monitor API error rate (target: < 1%)
- [ ] Respond to app reviews
- [ ] Track retention metrics
- [ ] Check backend resource usage

### First Week

- [ ] Analyze user feedback
- [ ] Triage any P1/P2 bugs
- [ ] Plan hotfix if needed
- [ ] Write post-launch retrospective
- [ ] Celebrate success! 🎉

---

**Document Version**: 1.0.0
**Last Updated**: October 4, 2025
**Next Review**: Post-deployment (within 7 days)
