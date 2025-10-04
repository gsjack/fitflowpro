# Iteration 4 - Wave 1 Agent Briefings

**Wave 1 Agents**: 1, 2, 3, 5, 6 (parallel execution)
**Objective**: Complete P0 visual fixes and critical feature gaps
**Timeline**: 8 hours (can run in parallel)

---

## Agent 1: Typography & Touch Target Specialist

### Mission
Fix P0-2 (typography sizes) and P0-3 (touch targets) to improve workout usability and WCAG compliance.

### Tasks
1. **Increase workout text sizes**:
   - WorkoutScreen progress text: 24px → 28px
   - SetLogCard target reps/RIR: 14px → 16px
   - Test readability at arm's length (typical workout distance)

2. **Audit touch targets**:
   - Scan all interactive elements (buttons, inputs, drag handles)
   - Identify elements < 48px
   - Increase to ≥48px minimum (iOS Human Interface Guidelines)
   - Document findings in TOUCH_TARGET_AUDIT_REPORT.md

3. **Test with accessibility tools**:
   - iOS Accessibility Inspector (if available)
   - Manual measurement verification
   - Screenshot before/after comparisons

### Files to Modify
- `/mobile/src/screens/WorkoutScreen.tsx`
- `/mobile/src/components/workout/SetLogCard.tsx`
- Potentially other components if < 48px found

### Success Criteria
- All text readable at 40cm distance (arm's length)
- All interactive elements ≥48px touch target
- WCAG 2.1 AA 2.5.5 (Target Size) compliance

### Deliverables
- Modified files (2-5 files)
- `/mobile/TOUCH_TARGET_AUDIT_REPORT.md`
- Git commit: `fix(ui): Increase typography sizes and touch targets for WCAG 2.1 AA`

### Time Estimate
3 hours

---

## Agent 2: Volume Bar & Drag Handle Specialist

### Mission
Fix P0-6 (volume bar contrast) and P0-7 (drag handles) to make volume tracking and exercise reordering functional.

### Tasks
1. **Increase volume bar contrast**:
   - Current: ~1.5:1 contrast (invisible)
   - Target: ≥3:1 contrast (WCAG 2.1 AA 1.4.11)
   - Update MuscleGroupVolumeBar.tsx colors
   - Test MEV/MAV/MRV markers visibility

2. **Improve drag handle UX**:
   - Move handles from left → right side (thumb-reachable zone)
   - Increase handle contrast to ≥3:1
   - Ensure touch area ≥48px
   - Test drag-and-drop on mobile emulator (if possible)

3. **Verify volume tracking works**:
   - Test with sample data (12 chest sets)
   - Verify zone classification (MEV/MAV/MRV)
   - Check percentage text readability

### Files to Modify
- `/mobile/src/components/analytics/MuscleGroupVolumeBar.tsx`
- `/mobile/src/screens/PlannerScreen.tsx`

### Success Criteria
- Volume bars clearly visible (≥3:1 contrast)
- Drag handles on right side, ≥3:1 contrast, ≥48px
- Volume tracking feature fully functional

### Deliverables
- Modified files (2 files)
- `/mobile/VOLUME_BAR_VERIFICATION.md`
- Git commit: `fix(ui): Improve volume bar contrast and drag handle positioning`

### Time Estimate
3 hours

---

## Agent 3: Skeleton Integration Specialist

### Mission
Wire skeleton loading screens into actual screens to eliminate blank loading states.

### Tasks
1. **Integrate WorkoutCardSkeleton**:
   - Import into DashboardScreen
   - Show during `isLoading` state from TanStack Query
   - Add fade-in transition when data loads

2. **Integrate ChartSkeleton**:
   - Import into AnalyticsScreen
   - Show during chart data fetch
   - Test with slow network (throttling)

3. **Integrate ExerciseListSkeleton**:
   - Import into PlannerScreen
   - Show during program exercises fetch
   - Ensure proper list item count (5-10 skeletons)

4. **Test perceived performance**:
   - Measure time-to-content (should feel < 500ms)
   - Verify no layout shifts during skeleton → content transition

### Files to Modify
- `/mobile/src/screens/DashboardScreen.tsx`
- `/mobile/src/screens/AnalyticsScreen.tsx`
- `/mobile/src/screens/PlannerScreen.tsx`

### Success Criteria
- No blank screens during data loading
- Smooth fade-in transitions (200ms)
- Skeletons match actual content layout

### Deliverables
- Modified files (3 files)
- Git commit: `feat(loading): Integrate skeleton screens for improved perceived performance`

### Time Estimate
2 hours

---

## Agent 5: Unit Preference Implementer

### Mission
Add kg/lbs toggle to Settings screen, addressing User POV Analysis P0-3 (US market compatibility).

### Tasks
1. **Create settings store**:
   - Zustand store for user preferences
   - Persist to AsyncStorage
   - Default: kg (current behavior)

2. **Add Settings UI**:
   - Toggle switch in SettingsScreen
   - Label: "Weight Units" with options "kg" / "lbs"
   - Test toggle persistence across app restarts

3. **Create conversion utilities**:
   - `kgToLbs(kg: number): number` → kg × 2.20462
   - `lbsToKg(lbs: number): number` → lbs / 2.20462
   - Round to 2 decimal places
   - Test edge cases (0kg, 500kg, fractions)

4. **Update weight displays**:
   - SetLogCard weight input
   - WorkoutScreen set display
   - AnalyticsScreen 1RM progression
   - All displays respect user preference

5. **Test conversion accuracy**:
   - 100kg = 220.46lbs ✓
   - 225lbs = 102.06kg ✓
   - No rounding errors on conversion cycles

### Files to Create
- `/mobile/src/stores/settingsStore.ts`
- `/mobile/src/utils/unitConversion.ts`

### Files to Modify
- `/mobile/src/screens/SettingsScreen.tsx`
- `/mobile/src/components/workout/SetLogCard.tsx`
- `/mobile/src/screens/WorkoutScreen.tsx`
- `/mobile/src/screens/AnalyticsScreen.tsx`

### Success Criteria
- US users can use app entirely in lbs
- Conversions accurate to 2 decimal places
- Preference persists across sessions

### Deliverables
- New files (2 files)
- Modified files (4 files)
- Git commit: `feat(settings): Add unit preference (kg/lbs) for US market support`

### Time Estimate
2-3 hours

---

## Agent 6: Exercise Video Links

### Mission
Add exercise video demonstrations to reduce injury risk and improve exercise form (User POV Analysis P0-2).

### Tasks
1. **Database schema update**:
   - Add `video_url TEXT` column to exercises table
   - Create migration SQL file
   - Run migration on development database

2. **Seed video links**:
   - Find YouTube links for 20 most common exercises:
     - Bench Press, Squat, Deadlift, Overhead Press, Barbell Row
     - Pull-ups, Dips, Leg Press, Romanian Deadlift, Lat Pulldown
     - Dumbbell Chest Press, Dumbbell Row, Leg Extension, Leg Curl
     - Bicep Curl, Tricep Extension, Lateral Raise, Face Pull
     - Plank, Cable Crunch
   - Create seed SQL file
   - Test links open correctly

3. **Create video modal component**:
   - ExerciseVideoModal.tsx
   - Opens YouTube link in WebView or browser
   - "How to Perform" button in WorkoutScreen
   - Test on mobile (link opens in YouTube app)

4. **Test UX flow**:
   - User starts workout
   - User taps "?" icon on exercise card
   - Modal opens with video
   - User watches demo
   - User closes modal and logs set

### Files to Create
- `/backend/src/database/migrations/add-exercise-videos.sql`
- `/backend/src/database/seed-exercise-videos.sql`
- `/mobile/src/components/workout/ExerciseVideoModal.tsx`

### Files to Modify
- `/backend/src/database/schema.sql` (add video_url column)
- `/mobile/src/screens/WorkoutScreen.tsx` (add video button)

### Success Criteria
- 20+ exercises have video links
- Modal opens and plays video
- Users can watch mid-workout without losing context

### Deliverables
- New files (3 files)
- Modified files (2 files)
- Git commit: `feat(workout): Add exercise video demonstrations for safety and form guidance`

### Time Estimate
2 hours

---

## Coordination Instructions

### Parallel Execution
All Wave 1 agents can work simultaneously. No dependencies between agents.

### Progress Tracking
Each agent must update `/home/asigator/fitness2025/ITERATION_4_PROGRESS.md`:

```markdown
| Agent X | Role | Phase | Status | Start Time | End Time | Duration |
|---------|------|-------|--------|------------|----------|----------|
| **Agent X** | ... | X | IN_PROGRESS | 19:05 | - | - |
```

Change status to `COMPLETE` when done.

### Git Workflow
1. Create feature branch: `git checkout -b iteration-4-agentX-description`
2. Make changes
3. Commit with Conventional Commits format
4. Push branch (do NOT merge yet - wait for all Wave 1 agents)
5. Document commit hash in progress file

### Handoff to Wave 2
When all Wave 1 agents complete:
- Update progress: "Wave 1: COMPLETE"
- Spawn Agent 4 (Program Creation Wizard)
- Agent 4 waits for clean codebase before starting

---

## Common Pitfalls to Avoid

### Platform Compatibility
- Always wrap expo-haptics with `Platform.OS !== 'web'`
- Test on iOS/Android, not just web

### TypeScript Errors
- Fix any type errors introduced by changes
- Use proper types, avoid `any`
- Add `@ts-expect-error` only with justification

### Performance
- Test skeleton transitions are smooth (no jank)
- Verify no layout shifts
- Check bundle size doesn't increase significantly

### Accessibility
- Maintain WCAG AA compliance in all changes
- Test with screen readers if possible
- Verify contrast ratios with WebAIM

---

**Wave 1 Kickoff**: October 4, 2025, 19:00
**Expected Completion**: October 5, 2025, 03:00 (8 hours)
**Next Wave**: Agent 4 (Program Creation Wizard) after Wave 1 complete

---

**Briefing Compiled By**: Agent Product Manager
**Status**: Ready for autonomous execution
