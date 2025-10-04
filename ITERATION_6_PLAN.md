# Iteration 6 Plan - User POV Quick Wins

**Date**: October 4, 2025
**Goal**: Complete remaining high-impact visual/UX improvements from P0/P1 roadmap
**Estimated Time**: 6-8 hours
**Autonomous Execution**: Yes (per user directive)

---

## Context

Iteration 5 delivered major feature gaps (body weight tracking, exercise history, skeleton screens, volume bar visibility). Iteration 6 focuses on remaining quick-win UX improvements that significantly enhance user experience with minimal implementation time.

**User POV Principle**: Users interact with the app during workouts (sweaty hands, arm's length viewing, one-handed operation). UI must accommodate these constraints.

---

## Wave 1: Typography Enhancement (2 hours)

**Problem**: Workout screen text too small to read at arm's length (40-60cm typical distance during exercise).

**Current State**:
- Progress text: 14px
- SetLogCard target reps/RIR: 12px
- Hard to read while holding phone during sets

**Target State**:
- Progress text: 24px (+71% size increase)
- SetLogCard target reps/RIR: 16px (+33% size increase)
- Readable at 50cm distance (typical workout viewing)

**Implementation**:
1. Update WorkoutScreen.tsx styles
   - Exercise name: 16px → 20px
   - Set progress (3/4 sets): 14px → 24px (bold)
   - Rest timer countdown: Keep at 64px (already large)

2. Update SetLogCard.tsx styles
   - Target reps label: 12px → 16px
   - RIR label: 12px → 16px
   - Input field font: 16px → 18px
   - Ensure WCAG AA touch targets maintained (≥44pt)

3. Test on physical device
   - Verify readability at arm's length
   - Ensure no layout breaks on small screens (iPhone SE)

**Files to Modify**:
- `/mobile/src/screens/WorkoutScreen.tsx`
- `/mobile/src/components/workout/SetLogCard.tsx`

**Success Criteria**:
- Text readable from 50cm distance
- No layout overflow on 320px width screens
- Touch targets ≥44pt maintained

---

## Wave 2: Drag Handle Repositioning (1.5 hours)

**Problem**: Drag handles on left side (hard to reach with right thumb, non-ergonomic for 90% of users who are right-handed).

**Current State**: PlannerScreen exercise cards have drag icons on left

**Target State**: Drag handles on right side (thumb-reachable zone for one-handed operation)

**Implementation**:
1. Update PlannerScreen.tsx exercise card layout
   - Move drag handle from `flex-start` to `flex-end`
   - Update row structure: `[ExerciseInfo, Menu] → [DragHandle]`
   - Adjust spacing/padding for visual balance

2. Increase drag handle size
   - Current: 24px icon
   - Target: 44x44pt touch target (may need padding)
   - Visual: 28px icon in 44px container

3. Improve drag handle contrast
   - Current: `colors.text.secondary` (#B8BEDC, ~6:1 contrast)
   - Target: `colors.text.primary` (#FFFFFF, 14.85:1 contrast) or add background
   - Add subtle grab/grabbing cursor on web (if ever supported)

**Files to Modify**:
- `/mobile/src/screens/PlannerScreen.tsx`

**Success Criteria**:
- Drag handle on right side of card
- Touch target ≥44x44pt
- Contrast ≥3:1 (WCAG AA 1.4.11)
- Visually discoverable (users notice it's draggable)

---

## Wave 3: Touch Target Audit (2 hours)

**Problem**: Some interactive elements <44pt, violating iOS Human Interface Guidelines and WCAG 2.5.5.

**Current State**: Unknown - no comprehensive audit done

**Target State**: All interactive elements ≥44x44pt

**Implementation**:
1. **Audit all screens** for touch targets:
   - AuthScreen: Input fields, buttons
   - DashboardScreen: Workout cards, recovery buttons
   - WorkoutScreen: Set log buttons, rest timer controls
   - AnalyticsScreen: Chart toggles, time range selectors
   - PlannerScreen: Exercise cards, menu buttons, drag handles
   - SettingsScreen: Toggle switches, list items
   - VO2maxWorkoutScreen: Timer controls, HR input

2. **Measure touch targets**:
   - Use React DevTools to inspect element dimensions
   - Check actual clickable area (including padding)
   - Document violations in report

3. **Fix violations** (estimate 10-15 elements):
   - Increase padding/minHeight/minWidth to reach 44pt
   - Ensure visual balance (may need layout adjustments)
   - Re-test after fixes

4. **Document findings**:
   - Create `/mobile/TOUCH_TARGET_AUDIT_REPORT.md`
   - List all violations found
   - List all fixes applied
   - Include before/after measurements

**Files to Audit/Modify**:
- All 7 screens
- All interactive components (buttons, inputs, toggles, cards)

**Success Criteria**:
- 100% of interactive elements ≥44x44pt
- WCAG 2.1 AA 2.5.5 compliance
- iOS HIG compliance
- Documented audit report

---

## Wave 4: Tab Bar Labels (2.5 hours)

**Problem**: Bottom navigation shows icons only, no labels. Low discoverability for new users.

**Current State**: App.tsx bottom tabs have:
```
- Dashboard: chart-line icon only
- Workout: dumbbell icon only
- Analytics: chart-bar icon only
- Planner: calendar icon only
- Settings: cog icon only
```

**Target State**: Icons + labels for clarity

**Implementation**:
1. **Add labels to bottom tabs**:
   - Dashboard (keep icon)
   - Workout (keep icon)
   - Analytics (keep icon)
   - Planner (keep icon)
   - Settings (keep icon)

2. **Ensure proper sizing**:
   - Icon: 24x24pt
   - Label: 10-12pt (standard iOS tab bar size)
   - Total height: ~56pt (iOS standard)
   - Active state: Tinted with primary color
   - Inactive state: text.secondary color

3. **Test on small screens**:
   - iPhone SE (375x667): Ensure labels don't wrap
   - Android small (360px): Verify fit
   - Truncate long labels if needed (max 10 characters)

**Files to Modify**:
- `/mobile/App.tsx` (bottom tab navigator configuration)

**Success Criteria**:
- All tabs show icon + label
- Labels readable at 10-12pt
- Fits on small screens without wrapping
- Active/inactive states visually clear

---

## Out of Scope (Deferred to Iteration 7)

**Micro-animations** (4 hours):
- Button press animations
- Card swipe feedback
- Transition polish
- **Reason**: Lower priority than usability fixes

**Mobile Ergonomics - Bottom Button Positioning** (3 hours):
- Move primary actions to bottom of screen
- Reduce thumb travel
- **Reason**: Requires layout refactoring, higher complexity

**Additional Charts** (6 hours):
- Volume heatmap
- Muscle balance radar
- Progressive overload trends
- **Reason**: Feature additions, not UX fixes

---

## Testing Strategy

### Manual Testing (1 hour)
1. **Physical device testing**:
   - Test on iPhone 13 Pro (user's device)
   - Test on Android emulator (representative)
   - Verify text readability at arm's length (50cm)
   - Verify drag handles reachable with thumb

2. **Accessibility testing**:
   - VoiceOver navigation (iOS)
   - TalkBack navigation (Android)
   - Touch target validation with accessibility inspector

3. **Visual regression**:
   - Screenshot comparison before/after
   - Check all 7 screens for layout breaks

### Automated Testing (30 min)
1. Run unit tests: `npm run test:unit`
2. Run integration tests: `npm run test:integration`
3. ESLint check: `npm run lint`
4. TypeScript compilation: `tsc --noEmit`

---

## Deliverables

**Code**:
- Modified WorkoutScreen.tsx (typography)
- Modified SetLogCard.tsx (typography)
- Modified PlannerScreen.tsx (drag handle)
- Modified App.tsx (tab bar labels)
- Touch target fixes across 10-15 components

**Documentation**:
- `/mobile/TOUCH_TARGET_AUDIT_REPORT.md`
- Update `/ITERATION_6_FINAL_SUMMARY.md`

**Commits**:
- `fix(ui): Increase workout screen typography for readability`
- `feat(ux): Move drag handles to thumb-reachable zone`
- `fix(a11y): Audit and fix touch target sizes (WCAG 2.5.5)`
- `feat(nav): Add labels to bottom tab bar`

---

## Success Metrics

| Metric | Before | Target | Priority |
|--------|--------|--------|----------|
| **Workout text readability** | 14px @ 50cm | 24px @ 50cm | High |
| **Drag handle reachability** | Left side | Right side | High |
| **Touch target compliance** | Unknown | 100% ≥44pt | High |
| **Tab discoverability** | Icons only | Icons + labels | Medium |
| **Time investment** | - | 6-8 hours | - |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Layout breaks on small screens | Medium | High | Test on iPhone SE (smallest supported) |
| Touch target fixes break visual design | Low | Medium | Preserve visual hierarchy with subtle padding |
| Tab labels too long | Low | Low | Truncate at 10 characters, use standard names |
| Text too large on tablets | Low | Low | Add responsive sizing if needed |

---

## Autonomous Execution Plan

1. **Wave 1**: Typography (2h) - EXECUTE
2. **Wave 2**: Drag handles (1.5h) - EXECUTE
3. **Wave 3**: Touch target audit (2h) - EXECUTE
4. **Wave 4**: Tab bar labels (2.5h) - EXECUTE
5. **Testing**: Manual + automated (1.5h) - EXECUTE
6. **Summary**: Generate final report (30min) - EXECUTE

**Total**: 8 hours autonomous execution

**No user input required** per directive: "iterate full agent mode autonomously till i interrupt"

---

**Plan Status**: ✅ READY FOR EXECUTION
**Next Step**: Spawn Iteration 6 execution agents
