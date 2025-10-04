# Visual Fixes - Quick Reference Card
**Print this and keep at your desk** 📌

---

## 🚀 Quick Start (2 minutes)

```bash
cd /home/asigator/fitness2025/mobile
bash scripts/fix-visual-p0.sh
bash scripts/test-visual-improvements.sh
npm run dev
```

**Rollback if needed:**
```bash
bash scripts/rollback-visual-fixes.sh
```

---

## 🎨 Color Values (WCAG AA Compliant)

### Before → After (Contrast Ratio)

| Element | Old Color | New Color | Contrast |
|---------|-----------|-----------|----------|
| **text.secondary** | #A0A6C8 | #B8BEDC | 6.51:1 ✅ |
| **text.tertiary** | #6B7299 | #9BA2C5 | 4.61:1 ✅ |
| **text.disabled** | #4A5080 | #8088B0 | 4.51:1 ✅ |

### Usage Guide

```typescript
// Form labels, captions, metadata
color: colors.text.secondary  // #B8BEDC (bright enough to read)

// Hints, placeholders, secondary info
color: colors.text.tertiary   // #9BA2C5 (readable but subtle)

// Disabled state only
color: colors.text.disabled   // #8088B0 (clearly disabled but readable)
```

---

## 📏 Typography Scale (Material Design 3)

### Workout-Optimized Sizes

| Variant | Size | Weight | Use For | File/Line |
|---------|------|--------|---------|-----------|
| `headlineMedium` | 28px | 400 | **Set progress** "Set 3 of 5" | WorkoutScreen:127 |
| `bodyLarge` | 16px | 400 | **Target info** "8-12 @ RIR 2" | WorkoutScreen:142 |
| `bodyMedium` | 14px | 400 | **Rep info** "× 6-8 reps" | PlannerScreen:420 |
| `displayLarge` | 57px | 400 | **Weight display** "90kg" | SetLogCard |

### Before/After

| Element | Before | After | Improvement |
|---------|--------|-------|-------------|
| Workout progress | 16px titleSmall | 28px headlineMedium | **+75%** |
| Target reps/RIR | 14px bodySmall | 16px bodyLarge | **+14%** |
| Planner rep info | 12px bodySmall | 14px bodyMedium | **+16%** |

---

## 👆 Touch Targets (WCAG 2.5.5)

### Minimum Sizes

| Size | Standard | Use |
|------|----------|-----|
| **56px** | Comfortable | Primary actions (Start Workout, Log Set) |
| **48px** | Recommended | Secondary actions (Set adjusters, buttons) |
| **44px** | WCAG Minimum | All interactive elements |

### Common Fixes

```typescript
// ❌ FAILS (32px)
<SegmentedButtons density="small" />

// ✅ PASSES (48px)
<SegmentedButtons />  // Remove density prop

// ✅ PASSES with hitSlop
<IconButton
  size={24}
  style={{ minWidth: 48, minHeight: 48 }}
  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
/>
```

---

## 🎯 Haptic Feedback Map

| Event | Haptic Type | Code |
|-------|-------------|------|
| **Button tap** | Light | `Haptics.impactAsync(ImpactFeedbackStyle.Light)` |
| **Set logged** | Success | `Haptics.notificationAsync(NotificationFeedbackType.Success)` |
| **Exercise done** | Medium | `Haptics.impactAsync(ImpactFeedbackStyle.Medium)` |
| **Timer warning** | Medium | `Haptics.impactAsync(ImpactFeedbackStyle.Medium)` |
| **Timer done** | Success + 2x Light | See RestTimer.tsx |
| **Error** | Error | `Haptics.notificationAsync(NotificationFeedbackType.Error)` |

### Quick Implementation

```typescript
import * as Haptics from 'expo-haptics';

// Success action
await Haptics.notificationAsync(
  Haptics.NotificationFeedbackType.Success
);

// Important tap
await Haptics.impactAsync(
  Haptics.ImpactFeedbackStyle.Medium
);
```

---

## 🦴 Skeleton Screen Pattern

```typescript
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

{isLoading ? (
  <SkeletonPlaceholder
    backgroundColor={colors.background.tertiary}  // #252B4A
    highlightColor={colors.background.secondary}  // #1A1F3A
    speed={1200}
  >
    <View style={{ padding: 16 }}>
      {/* Heading */}
      <View style={{ width: 200, height: 28, borderRadius: 14, marginBottom: 16 }} />

      {/* Card */}
      <View style={{ width: '100%', height: 180, borderRadius: 12 }} />
    </View>
  </SkeletonPlaceholder>
) : (
  // Actual content
)}
```

**Match exact layout of real content**

---

## ✅ Testing Checklist

### Automated Tests
```bash
# Contrast validation
npm test -- contrast.test.ts

# Touch targets
npm test -- accessibility.test.ts

# Visual regression
npx playwright test
```

### Manual Checks
- [ ] iPhone SE (375px) - no text overflow
- [ ] iPad (768px) - scales correctly
- [ ] All text readable from 3 feet
- [ ] All buttons tappable one-handed
- [ ] Haptics work (physical device only)
- [ ] Loading shows skeleton (no blank screen)

### WCAG Validation
- [ ] All text contrast ≥ 4.5:1
- [ ] All touch targets ≥ 44px
- [ ] Screen reader labels present
- [ ] Focus order logical
- [ ] No color-only indicators

---

## 🐛 Common Issues & Fixes

### "Text still hard to read"
```typescript
// Check if colors.ts updated
grep "B8BEDC" src/theme/colors.ts
// Should find: secondary: '#B8BEDC'

// If not, run:
bash scripts/fix-visual-p0.sh
```

### "Buttons too small to tap"
```typescript
// Check for density="small"
grep 'density="small"' src/screens/DashboardScreen.tsx
// Should return nothing

// Fix:
sed -i '/density="small"/d' src/screens/DashboardScreen.tsx
```

### "Haptics not working"
```bash
# Must test on physical device
# Simulator doesn't support haptics
expo start
# Then scan QR with phone
```

### "Skeleton not showing"
```bash
# Check if installed
grep "react-native-skeleton-placeholder" package.json

# If missing:
npm install react-native-skeleton-placeholder
```

---

## 📊 Success Metrics

### Target Values

| Metric | Before | Target | Actual |
|--------|--------|--------|--------|
| WCAG Score | 78/100 | 95/100 | ___ |
| Contrast Violations | 18 | 0 | ___ |
| Touch Target Failures | 12 | 0 | ___ |
| Perceived Load Time | 800ms | <300ms | ___ms |
| Set Logging Time | 12s | <8s | ___s |

### How to Measure

```bash
# WCAG score
npm run test:a11y

# Perceived load time
# 1. Clear app data
# 2. Launch app
# 3. Time until Dashboard fully visible
# Target: < 300ms

# Set logging time
# 1. Start workout
# 2. Time from tap "Log Set" to next set ready
# Target: < 8s
```

---

## 🔧 File Locations (Quick Access)

### Files Modified by Automated Script

| File | Lines Changed | What Changed |
|------|--------------|--------------|
| `src/theme/colors.ts` | 60-62 | Text colors (3 values) |
| `src/screens/WorkoutScreen.tsx` | 127, 142 | Text variants (2 places) |
| `src/screens/DashboardScreen.tsx` | 301 | Removed density prop |

### Files Needing Manual Work

| File | Task | Time |
|------|------|------|
| `DashboardScreen.tsx` | Add skeleton | 3h |
| `AnalyticsScreen.tsx` | Add skeleton | 3h |
| `WorkoutScreen.tsx` | Add haptics | 2h |
| `RestTimer.tsx` | Add haptics | 2h |
| `MuscleGroupVolumeBar.tsx` | Fix progress visibility | 2h |

---

## 💾 Git Workflow

### Making Changes

```bash
# Create feature branch
git checkout -b fix/visual-improvements-p0

# Run automated fixes
bash scripts/fix-visual-p0.sh

# Test
bash scripts/test-visual-improvements.sh

# Commit
git add .
git commit -m "Fix P0 visual issues: WCAG contrast, typography, touch targets"

# Push
git push origin fix/visual-improvements-p0
```

### Commit Message Templates

```
# Color fixes
Fix WCAG contrast violations in colors.ts

- text.secondary: #A0A6C8 → #B8BEDC (6.51:1)
- text.tertiary: #6B7299 → #9BA2C5 (4.61:1)
- text.disabled: #4A5080 → #8088B0 (4.51:1)

All text now meets WCAG AA (4.5:1 minimum)

# Typography fixes
Increase workout text sizes for glanceability

- Set progress: 16px → 28px (titleSmall → headlineMedium)
- Target info: 14px → 16px (bodySmall → bodyLarge)

Readable from 3ft distance during workouts

# Touch targets
Fix WCAG touch target compliance (44px minimum)

- Recovery buttons: Remove density="small" (32px → 48px)
- Set adjusters: Increase to 48px
- Drag handles: Add hitSlop for 48px effective area
```

---

## 🆘 Emergency Contacts

**If automated script fails:**
1. Run rollback: `bash scripts/rollback-visual-fixes.sh`
2. Check error logs in terminal
3. Verify file paths exist
4. Try manual fixes (see VISUAL_IMPROVEMENTS_ENHANCED.md)

**If tests fail:**
1. Check which test failed: `bash scripts/test-visual-improvements.sh`
2. Re-run automated fixes: `bash scripts/fix-visual-p0.sh`
3. Verify colors.ts changes applied
4. Check for merge conflicts

**If app won't start:**
1. Clear cache: `npx expo start -c`
2. Reinstall deps: `rm -rf node_modules && npm install`
3. Check for TypeScript errors: `npx tsc --noEmit`
4. Rollback if needed

---

## 📱 Device Testing Matrix

| Device | Screen | Resolution | Priority | Notes |
|--------|--------|------------|----------|-------|
| iPhone SE | 4.7" | 375×667 | **P0** | Smallest iOS device |
| iPhone 12 | 6.1" | 390×844 | **P0** | Most common |
| iPhone 14 Pro Max | 6.7" | 430×932 | P1 | Largest iPhone |
| Pixel 5 | 6.0" | 393×851 | **P0** | Android reference |
| Samsung S22 | 6.1" | 360×800 | P1 | Common Android |
| iPad Air | 10.9" | 820×1180 | P2 | Tablet |

**Test on at least:**
- ✅ 1 small phone (iPhone SE or Pixel 4a)
- ✅ 1 large phone (iPhone 14 Pro or Pixel 6)
- ✅ 1 tablet (iPad or Android tablet)

---

## 🎯 One-Page Implementation Workflow

```
┌─────────────────────────────────────────────────────────────┐
│              VISUAL IMPROVEMENTS - P0 WORKFLOW               │
└─────────────────────────────────────────────────────────────┘

1. RUN AUTOMATED FIXES (2 min)
   cd /home/asigator/fitness2025/mobile
   bash scripts/fix-visual-p0.sh
   ↓

2. VALIDATE AUTOMATED CHANGES (2 min)
   bash scripts/test-visual-improvements.sh
   ↓

3. ADD SKELETON SCREENS (12h)
   ├─ DashboardScreen.tsx (3h)
   ├─ AnalyticsScreen.tsx (3h)
   ├─ WorkoutScreen.tsx (2h)
   ├─ PlannerScreen.tsx (2h)
   └─ SettingsScreen.tsx (2h)
   ↓

4. ADD HAPTIC FEEDBACK (6h)
   ├─ WorkoutScreen set logging (2h)
   ├─ RestTimer events (2h)
   ├─ DashboardScreen recovery (1h)
   └─ Testing (1h)
   ↓

5. VISUAL REGRESSION TESTS (6h)
   ├─ Playwright setup (2h)
   ├─ Screenshot baselines (2h)
   └─ Automation (2h)
   ↓

6. ACCESSIBILITY AUDIT (4h)
   ├─ Run axe-core (1h)
   ├─ Fix violations (2h)
   └─ Verify WCAG ≥95/100 (1h)
   ↓

7. USER TESTING (2h)
   ├─ 5 participants
   ├─ Collect feedback
   └─ Make adjustments
   ↓

8. FINAL VALIDATION (2h)
   ├─ All tests pass
   ├─ Manual verification
   ├─ Code review
   └─ Sign-off

TOTAL: 36 hours (excluding automated 2 min)
```

---

**Print Date:** _____________
**Developer:** _____________
**Phase:** P0 Critical Fixes
**Estimated Completion:** 2 weeks

---

*Keep this reference card visible while implementing fixes*
*Update completion checkboxes as you go*
*Cross-reference with VISUAL_IMPROVEMENTS_ENHANCED.md for details*
