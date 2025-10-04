# Iteration 2 Plan

## Planning Date: October 4, 2025
## Planned Duration: 16-20 hours
## Iteration Goals: Make app bootable and complete P0 visual improvements

---

## Context from Iteration 1

### What Was Accomplished ✅
- WCAG AA text contrast compliance (92/100 score)
- 5 skeleton loading screen components created
- 15 haptic feedback events with Platform.OS checks
- Android emulator operational with 12 screenshots
- Web crash fixed (haptics protected)
- 250+ pages of comprehensive documentation

### What Was NOT Accomplished ❌
- App navigation system (App.tsx is empty)
- Skeleton screen integration (components not wired)
- Typography size increases
- Touch target compliance
- Volume bar visibility
- Drag handle positioning
- Tab bar label visibility

### Critical Discovery 🚨
**The app does not run at all** due to missing navigation infrastructure. This is a P0 blocker that must be resolved before any visual improvements can be verified or used.

---

## Objectives

### Primary Objectives
1. **Make app bootable** - Success metric: App launches on iOS/Android simulator without crashes
2. **Complete P0 visual improvements** - Success metric: 8/8 P0 fixes verified with screenshots
3. **Verify all improvements visually** - Success metric: 12+ screenshots documenting all changes

### Secondary Objectives
1. **Fix TypeScript compilation errors** - Success metric: < 10 errors remaining
2. **Setup visual regression testing** - Success metric: Baseline screenshots captured

---

## Features to Implement

### P0 - Critical (Must Have)

#### Feature 1: App Navigation System
**User Problem**: App.tsx is empty, no way to navigate between screens
**Acceptance Criteria**:
- [ ] React Navigation library installed (@react-navigation/native, @react-navigation/bottom-tabs)
- [ ] App.tsx implements bottom tab navigator
- [ ] All 7 screens connected: Auth, Dashboard, Workout, VO2max, Analytics, Planner, Settings
- [ ] Tab bar shows icons + labels ("Home", "Analytics", "Planner", "Settings")
- [ ] Auth flow properly gates access to authenticated screens
- [ ] App launches without crashes on iOS Simulator

**Effort Estimate**: L (4-6 hours)
**Assigned To**: Agent 1 (Navigation Specialist)
**Dependencies**: None

#### Feature 2: Complete Missing P0 Visual Improvements
**User Problem**: Only 3/8 P0 visual fixes were implemented in Iteration 1
**Acceptance Criteria**:
- [ ] **Typography**: Workout progress text increased to 28px (from 16px)
- [ ] **Typography**: Target reps/RIR text increased to 16px (from 14px)
- [ ] **Touch Targets**: All interactive elements >= 48px minimum
- [ ] **Volume Bars**: Contrast increased from 1.5:1 to >= 3:1 (opacity 0.15 → 0.35)
- [ ] **Drag Handles**: Moved from left side to right side (thumb-friendly)
- [ ] **Tab Bar**: Labels visible and readable (fontSize: 12px, fontWeight: 600)

**Effort Estimate**: M (3-4 hours)
**Assigned To**: Agent 2 (Visual Polish Specialist)
**Dependencies**: Feature 1 (need navigation for tab bar)

#### Feature 3: Integrate Skeleton Loading Screens
**User Problem**: Skeleton components exist but not wired into screens (800ms blank loading)
**Acceptance Criteria**:
- [ ] DashboardScreen shows WorkoutCardSkeleton during workout list fetch
- [ ] AnalyticsScreen shows ChartSkeleton during analytics data fetch
- [ ] PlannerScreen shows ExerciseListSkeleton during exercise library fetch
- [ ] SettingsScreen shows skeleton during profile load
- [ ] All skeletons display for minimum 200ms (prevent flash)
- [ ] Smooth transition from skeleton to real content

**Effort Estimate**: M (2-3 hours)
**Assigned To**: Agent 3 (Loading States Specialist)
**Dependencies**: Feature 1 (need screens to be accessible)

#### Feature 4: Visual Verification & Screenshot Capture
**User Problem**: No visual evidence that improvements render correctly
**Acceptance Criteria**:
- [ ] Capture 12+ screenshots from iOS Simulator or Android Emulator
- [ ] Document all 8 P0 fixes with before/after evidence
- [ ] Verify WCAG text contrast in actual UI
- [ ] Verify touch targets with iOS Accessibility Inspector
- [ ] Verify skeleton screens animate smoothly
- [ ] Verify haptic feedback works on physical device

**Effort Estimate**: M (2-3 hours)
**Assigned To**: Agent 4 (QA & Documentation Specialist)
**Dependencies**: Features 1, 2, 3 (need complete app)

### P1 - Important (Should Have)

#### Feature 5: TypeScript Error Cleanup
**User Problem**: 81 TypeScript errors preventing compilation
**Acceptance Criteria**:
- [ ] Audit all 81 errors
- [ ] Fix critical type errors (< 10 remaining)
- [ ] Document remaining technical debt
- [ ] Ensure app compiles with `tsc --noEmit`

**Effort Estimate**: M (3-4 hours)
**Assigned To**: Agent 5 (TypeScript Specialist)
**Dependencies**: None (can run in parallel)

#### Feature 6: Visual Regression Test Framework
**User Problem**: No automated way to catch visual regressions
**Acceptance Criteria**:
- [ ] Playwright visual comparison configured
- [ ] Baseline screenshots captured for all 7 screens
- [ ] Test script captures screenshots and compares to baseline
- [ ] CI/CD integration documented

**Effort Estimate**: S (2 hours)
**Assigned To**: Agent 6 (Testing Specialist)
**Dependencies**: Feature 1 (need bootable app)

### P2 - Nice-to-Have (Could Have)

#### Feature 7: Physical Device Testing
**User Problem**: Simulators don't test haptics or real-world performance
**Acceptance Criteria**:
- [ ] Test on physical iPhone (iOS)
- [ ] Test on physical Android device
- [ ] Verify haptic feedback intensity feels natural
- [ ] Verify text is readable in bright sunlight
- [ ] Verify touch targets work with one-handed use

**Effort Estimate**: S (1-2 hours)
**Assigned To**: Agent 7 (Device Testing Specialist)
**Dependencies**: Features 1, 2, 3 (need complete app)

---

## Technical Improvements

### 1. React Navigation Installation
**Why**: App.tsx is empty, no navigation system exists
**Impact**: Enables basic app usage, unblocks all screens
**Effort**: M (30 min install + 4 hours implementation)

### 2. Missing P0 Implementation
**Why**: Only 37.5% of P0 fixes were completed in Iteration 1
**Impact**: Brings accessibility and UX to production-ready state
**Effort**: M (3-4 hours)

### 3. Skeleton Integration
**Why**: Components exist but provide no value if not wired up
**Impact**: -62% perceived load time (800ms → 300ms)
**Effort**: S (2-3 hours)

---

## Testing Strategy

### Manual Testing
- [ ] Test app launch on iOS Simulator
- [ ] Test app launch on Android Emulator
- [ ] Test navigation between all 7 screens
- [ ] Test skeleton loading states
- [ ] Test WCAG contrast with Color Contrast Analyzer
- [ ] Test touch targets with iOS Accessibility Inspector
- [ ] Regression test: Ensure existing features still work

### Automated Testing
- [ ] Update visual regression baselines
- [ ] Add navigation flow tests
- [ ] Add skeleton loading state tests
- [ ] Run TypeScript compiler checks

### Performance Testing
- [ ] Measure app launch time (< 3s target)
- [ ] Measure screen transition time (< 300ms target)
- [ ] Measure skeleton display duration (200ms minimum)
- [ ] Verify no memory leaks during navigation

---

## Success Criteria

**Iteration is successful if**:
- [x] App launches without crashes on iOS Simulator ✅ REQUIRED
- [x] All 7 screens accessible via navigation ✅ REQUIRED
- [x] All 8 P0 visual fixes implemented and verified ✅ REQUIRED
- [x] >= 12 screenshots captured documenting improvements ✅ REQUIRED
- [ ] TypeScript errors < 10 (nice to have)
- [ ] Visual regression tests configured (nice to have)
- [ ] Physical device testing complete (optional)

**Production ready if**:
- [x] All success criteria met
- [x] WCAG AA compliance maintained (92/100)
- [x] No P0 bugs or blockers
- [x] Test pass rate >= 90%
- [x] Performance benchmarks met (launch < 3s, navigation < 300ms)

**Minimum viable outcome**: App boots, navigation works, 8/8 P0 fixes verified with screenshots

---

## Risk & Mitigation

### Risk 1: Navigation implementation breaks existing screens
**Impact**: HIGH
**Mitigation**: Test each screen individually after wiring navigation. Use git branches for easy rollback.

### Risk 2: TypeScript errors prevent compilation
**Impact**: HIGH
**Mitigation**: Focus on critical errors first. Use `// @ts-expect-error` with TODO comments for non-critical issues.

### Risk 3: Skeleton screens cause layout shifts
**Impact**: MEDIUM
**Mitigation**: Match skeleton dimensions exactly to real content. Use `minHeight` to reserve space.

### Risk 4: Screenshot capture fails again
**Impact**: MEDIUM
**Mitigation**: Use iOS Simulator instead of Expo Web (more reliable). Have Agent 4 test capture script early.

### Risk 5: Haptic feedback doesn't work on physical devices
**Impact**: LOW
**Mitigation**: Code is already implemented with Platform.OS checks. Physical testing is validation only.

---

## Timeline

### Day 1 - Make App Bootable (8 hours)

**Hour 0-1: Planning and agent briefing**
- ✅ Create this plan
- ⏳ Spawn Agent 1 (Navigation)

**Hour 1-5: Agent 1 - Navigation Implementation**
- Install react-navigation dependencies
- Implement bottom tab navigator in App.tsx
- Wire all 7 screens
- Test on iOS Simulator
- Fix any immediate crashes

**Hour 5-8: Agent 2 - P0 Visual Fixes**
- Typography size increases
- Touch target compliance
- Volume bar contrast
- Drag handle positioning
- Tab bar label visibility

**Hour 8: Day 1 checkpoint**
- App boots ✅
- Navigation works ✅
- 5/8 P0 fixes complete ✅

### Day 2 - Complete Improvements & Testing (8 hours)

**Hour 8-11: Agent 3 - Skeleton Integration**
- Wire skeletons into DashboardScreen
- Wire skeletons into AnalyticsScreen
- Wire skeletons into PlannerScreen
- Test loading state transitions
- Fix any layout shifts

**Hour 11-14: Agent 4 - Visual Verification**
- Capture 12+ screenshots (iOS Simulator)
- Document all 8 P0 fixes with evidence
- Test WCAG compliance
- Test touch targets with Accessibility Inspector
- Generate QA report

**Hour 14-16: Agent 5 - TypeScript Cleanup (Parallel)**
- Audit all 81 errors
- Fix critical type errors
- Document technical debt

**Hour 16: Day 2 checkpoint**
- All 8 P0 fixes verified ✅
- Screenshots captured ✅
- TypeScript errors < 10 ✅

### Day 3 - Polish & Documentation (Optional, 4 hours)

**Hour 16-18: Agent 6 - Visual Regression Tests**
- Setup Playwright visual comparison
- Capture baseline screenshots
- Document CI/CD integration

**Hour 18-20: Agent 7 - Physical Device Testing**
- Test on iPhone
- Test on Android
- Document findings

**Hour 20: Iteration 2 complete**
- Generate final summary report
- Update CLAUDE.md with new status
- Create ITERATION_2_SUMMARY.md

---

## Agent Assignments

### Phase 1: Make App Bootable (4-6 hours)
1. **Agent 1 (Navigation Specialist)**: Install React Navigation, implement bottom tab navigator, wire all screens
   - Priority: P0 CRITICAL
   - Blocking: All other agents
   - Output: Bootable app with navigation

### Phase 2: Complete Visual Improvements (3-4 hours)
2. **Agent 2 (Visual Polish Specialist)**: Typography, touch targets, volume bars, drag handles, tab bar
   - Priority: P0 CRITICAL
   - Depends on: Agent 1 (need navigation for tab bar)
   - Output: 5/8 remaining P0 fixes

3. **Agent 3 (Loading States Specialist)**: Integrate skeleton screens into all screens
   - Priority: P0 CRITICAL
   - Depends on: Agent 1 (need bootable app)
   - Output: Wired skeleton loading states

### Phase 3: Verification (2-3 hours)
4. **Agent 4 (QA & Documentation Specialist)**: Screenshot capture, WCAG testing, touch target verification
   - Priority: P0 CRITICAL
   - Depends on: Agents 1, 2, 3 (need complete app)
   - Output: 12+ screenshots, QA report

### Phase 4: Optional Improvements (3-6 hours)
5. **Agent 5 (TypeScript Specialist)**: Fix critical type errors
   - Priority: P1 IMPORTANT
   - Depends on: None (parallel)
   - Output: < 10 TypeScript errors

6. **Agent 6 (Testing Specialist)**: Visual regression test framework
   - Priority: P1 IMPORTANT
   - Depends on: Agent 1 (need bootable app)
   - Output: Playwright baselines

7. **Agent 7 (Device Testing Specialist)**: Physical device testing
   - Priority: P2 OPTIONAL
   - Depends on: Agents 1, 2, 3 (need complete app)
   - Output: Physical device test report

8. **Agent 8 (Iteration Summary)**: Generate final summary and documentation
   - Priority: P0 CRITICAL
   - Depends on: All agents complete
   - Output: ITERATION_2_SUMMARY.md

---

## Deferred to Iteration 3

Features NOT in this iteration:

1. **Empty State Screens** - **Reason**: Not blocking user success, can be added post-launch
2. **Micro-animations** - **Reason**: Polish, not critical for MVP
3. **Form Ergonomics** (larger buttons, swipe gestures) - **Reason**: Current UX acceptable
4. **Recovery Assessment UX** (emoji labels) - **Reason**: Current form functional
5. **ESLint Warning Cleanup** (664 warnings) - **Reason**: Not blocking compilation
6. **Advanced Analytics Charts** - **Reason**: Basic charts exist and work
7. **Wearable Integration** - **Reason**: Future enhancement

---

## Notes

- **Focus on getting app bootable first** - This is the critical blocker
- **Navigation must work before visual improvements can be verified** - Order matters
- **Use iOS Simulator for screenshots** - More reliable than Expo Web
- **Test early and often** - Catch regressions immediately
- **Document everything** - Screenshots are evidence of success
- **Keep WCAG AA compliance** - Don't regress on accessibility
- **Parallel work where possible** - Agent 5 can work independently on TypeScript

---

## Validation Checklist

Before marking iteration complete:

### App Functionality
- [ ] App launches without crashes
- [ ] Navigation between all 7 screens works
- [ ] Back button works correctly
- [ ] Tab bar is visible and functional
- [ ] Auth flow gates protected screens

### P0 Visual Improvements (8/8)
- [ ] P0-1: WCAG text contrast (6.51:1, 4.61:1, 4.51:1) ✅ Already done
- [ ] P0-2: Typography sizes (28px workout text, 16px details)
- [ ] P0-3: Touch targets (>= 48px all buttons)
- [ ] P0-4: Skeleton screens integrated and animating
- [ ] P0-5: Haptic feedback works (Platform.OS checks) ✅ Already done
- [ ] P0-6: Volume bars visible (>= 3:1 contrast)
- [ ] P0-7: Drag handles on right side
- [ ] P0-8: Tab bar labels visible

### Visual Evidence
- [ ] >= 12 screenshots captured
- [ ] Screenshots show all 8 P0 fixes
- [ ] Screenshots stored in `/mobile/screenshots/iteration-2/`
- [ ] QA report documents verification

### Quality
- [ ] TypeScript errors < 10 (stretch goal)
- [ ] No new console.error in production code
- [ ] Performance benchmarks met (launch < 3s)
- [ ] WCAG AA compliance maintained (92/100)

---

**Plan Status**: ✅ APPROVED - Ready to execute
**Start Time**: October 4, 2025, 18:30
**Expected Completion**: October 5, 2025, 10:30 (16 hours elapsed)
**Critical Path**: Agent 1 (Navigation) → Agent 2 (Visual) → Agent 3 (Skeletons) → Agent 4 (QA)
