# Quickstart: FitFlow Pro Testing & Validation

**Date**: 2025-10-02
**Purpose**: End-to-end validation scenarios for FitFlow Pro implementation

## Prerequisites

- Mobile app built and running (iOS/Android simulator or device)
- Backend server running on Raspberry Pi 5 (or localhost:3000 for development)
- Test database seeded with exercise library
- User account created for testing

---

## Scenario 1: Complete Guided Workout Session

**Objective**: Verify full workout flow from start to completion, including set logging, rest timers, and session resume.

### Test Steps

1. **Start Workout**
   - Open app, navigate to Dashboard
   - Select today's workout (e.g., "Push A")
   - Tap "Start Workout"
   - **Expected**: Workout status changes to `in_progress`, first exercise displayed

2. **Log First Set**
   - View exercise: "Barbell Bench Press - 4 sets × 6-8 reps @ RIR 2"
   - Enter: Weight = 100kg, Reps = 8, RIR = 2
   - Tap "Complete Set"
   - **Expected**: Set saved to SQLite (< 5ms), rest timer starts (3 minutes), UI shows "Set 1/4 complete"

3. **Test Background Timer**
   - Background the app (home button / swipe up)
   - Wait 10 seconds
   - **Expected**: Notification "⏱️ Almost Ready - 10 seconds remaining"
   - Wait additional 10 seconds
   - **Expected**: Notification "✅ Rest Complete! - Ready for your next set"
   - Return to app
   - **Expected**: Timer shows 0:00, "Start Next Set" button enabled

4. **Complete Exercise**
   - Log sets 2-4 with varying reps (8, 7, 6) and RIR (2, 2, 1)
   - **Expected**: Each set logs instantly, volume calculation updates, next exercise appears after set 4

5. **Test Session Resume**
   - After completing 3 exercises (12 sets total), force-close the app
   - Reopen app within 5 minutes
   - **Expected**: "Resume Workout?" prompt appears
   - Tap "Resume"
   - **Expected**: Returns to exercise 4, shows completed sets 1-12, current state restored

6. **Complete Remaining Exercises**
   - Complete exercises 4-8 (Push A: Incline Press, Cable Flyes, Overhead Press, Lateral Raises, Tricep Pushdowns)
   - **Expected**: Smooth progression through all exercises

7. **Finish Workout**
   - After final set, tap "Finish Workout"
   - **Expected**: Workout summary displayed
     - Total volume: ~3500 kg
     - Average RIR: 2.1
     - Duration: ~55 minutes
     - Estimated 1RMs for compounds
   - **Expected**: Workout status changes to `completed`, sync queue processes in background

### Validation Checks

- [ ] All 32 sets logged to SQLite with correct timestamp ordering
- [ ] Workout `total_volume_kg` matches sum of (weight × reps) across all sets
- [ ] Background timer continued during app backgrounding
- [ ] Session resume restored exact state (exercise index, completed sets)
- [ ] Sync queue processed all sets (check `synced` flag = 1 after network sync)

### Performance Assertions

- [ ] SQLite writes < 5ms (monitor with dev tools)
- [ ] UI updates instant (< 100ms perceived latency)
- [ ] Rest timer accurate to ±2 seconds

---

## Scenario 2: Auto-Regulation Based on Recovery

**Objective**: Verify recovery assessment impacts workout volume via auto-regulation.

### Test Steps

1. **Submit Poor Recovery Assessment**
   - Morning of workout day, open app
   - Complete recovery check:
     - Sleep quality: 2/5 (4 hours, poor)
     - Muscle soreness: 4/5 (very sore)
     - Mental motivation: 2/5 (low)
   - Total score: 8/15
   - **Expected**: System calculates "reduce_2_sets" adjustment
   - **Expected**: Notification: "Volume reduced by 2 sets per exercise due to poor recovery"

2. **Start Auto-Regulated Workout**
   - Start Push A workout
   - View first exercise
   - **Expected**: "Barbell Bench Press - 2 sets × 6-8 reps @ RIR 2" (reduced from 4 sets)

3. **Complete Auto-Regulated Workout**
   - Complete workout with reduced volume
   - **Expected**: All exercises show -2 sets adjustment
   - **Expected**: Total sets: ~16 (vs. normal 32)

4. **Verify Volume Tracking**
   - Navigate to Analytics → Volume Trends
   - **Expected**: This week's chest volume: ~8 sets (below MEV of 8, flagged in red)

### Validation Checks

- [ ] Recovery score correctly calculated (sum of 3 subscores)
- [ ] Volume adjustment applied to all exercises
- [ ] Volume tracking reflects reduced actual volume vs. planned volume
- [ ] User can override auto-regulation (optional test)

---

## Scenario 3: Track and Analyze Progression

**Objective**: Verify analytics dashboard shows accurate 1RM progression, volume trends, and consistency metrics after 4 weeks.

### Test Steps

1. **Seed 4 Weeks of Data**
   - Use test data generator or manual entry
   - 4 weeks × 6 workouts/week = 24 workouts
   - Progressive overload: +2.5kg or +1 rep per week on compounds

2. **View 1RM Progression**
   - Navigate to Analytics → Strength
   - Select "Barbell Bench Press"
   - **Expected**: Graph showing 1RM estimate increasing from 120kg (week 1) to 130kg (week 4)
   - **Expected**: Data points for each workout (8 total over 4 weeks)

3. **View Volume Trends**
   - Navigate to Analytics → Volume
   - Select "Chest"
   - **Expected**: Weekly volume chart showing:
     - Week 1: 14 sets (MAV)
     - Week 2: 16 sets (approaching MRV)
     - Week 3: 18 sets (MRV)
     - Week 4: 10 sets (deload, green zone)

4. **View Consistency Metrics**
   - Navigate to Analytics → Overview
   - **Expected**: Adherence rate: 100% (24/24 workouts completed)
   - **Expected**: Average session duration: 52 minutes
   - **Expected**: Deload compliance: Yes (week 4 volume reduced)

### Validation Checks

- [ ] 1RM calculations accurate (Epley formula with RIR adjustment)
- [ ] Volume trends match logged sets per muscle group
- [ ] Consistency metrics calculated correctly
- [ ] Charts render smoothly (< 100ms)

---

## Scenario 4: Plan and Customize Training

**Objective**: Verify drag-and-drop training planner with MEV/MAV/MRV validation.

### Test Steps

1. **Open Training Planner**
   - Navigate to Planner tab
   - Select "Push A" day
   - **Expected**: Current exercises displayed in order with set/rep/RIR info

2. **Swap Exercise**
   - Drag "Cable Flyes" out of exercise list
   - Search for "Dumbbell Flyes"
   - Drag "Dumbbell Flyes" into position 3
   - **Expected**: Real-time validation: "✅ Chest volume maintained (14 sets)"

3. **Test Invalid Swap**
   - Remove "Barbell Bench Press" (primary chest compound)
   - **Expected**: Validation warning: "⚠️ Chest volume below MEV (8 sets required, currently 10)"
   - **Expected**: Suggestion: "Add 2 sets to remaining chest exercises"

4. **Save Custom Program**
   - Make valid swaps (e.g., replace Overhead Press with Arnold Press)
   - Tap "Save Changes"
   - **Expected**: Program updated, next workout uses new exercise list

### Validation Checks

- [ ] Exercise swaps preserve muscle group coverage
- [ ] MEV validation prevents under-training
- [ ] Drag-and-drop UI responsive (< 16ms interactions)

---

## Scenario 5: Execute VO2max Cardio Protocol

**Objective**: Verify Norwegian 4x4 interval timer and heart rate tracking.

### Test Steps

1. **Start VO2max Workout**
   - Wednesday (VO2max A day), start workout
   - **Expected**: Timer interface with 4×4 protocol instructions

2. **Execute Intervals**
   - Tap "Start Interval 1"
   - **Expected**: 4-minute timer counts down, target HR zone displayed (90-95% max HR)
   - At 1 minute remaining: **Expected**: Notification + beep
   - At 0 seconds: **Expected**: Completion sound, "Active Recovery - 3 minutes" starts

3. **Complete Protocol**
   - Finish all 4 work intervals + 3 recovery periods
   - Enter perceived exertion: 9/10
   - **Expected**: Session summary:
     - Duration: 28 minutes (4×4 + 3×3)
     - Average HR: 165 bpm
     - Peak HR: 182 bpm
     - Estimated VO2max: 48 ml/kg/min

4. **View VO2max Trends**
   - Navigate to Analytics → Cardio
   - **Expected**: VO2max trend line showing improvement over 4 weeks

### Validation Checks

- [ ] Interval timers accurate (±2 seconds)
- [ ] Audio cues fire at correct times
- [ ] VO2max estimation within physiological range (20-80 ml/kg/min)

---

## Performance Benchmarks

Run after implementation to verify constitutional compliance:

### SQLite Write Performance
```bash
# Mobile app (expo-sqlite)
# Expected: p95 < 5ms, p99 < 10ms
```

### API Response Times
```bash
# Backend (Fastify)
# POST /api/sets: p95 < 50ms
# GET /api/workouts: p95 < 100ms
# GET /api/analytics/*: p95 < 200ms
```

### UI Render Performance
- First screen paint: < 500ms
- Set logging interaction: < 100ms
- Analytics chart render: < 200ms

---

## Automated Test Execution

```bash
# Mobile tests
cd mobile
npm run test:unit          # Vitest unit tests
npm run test:integration   # Integration scenarios
npm run test:contract      # API contract tests

# Backend tests
cd backend
npm run test:unit          # Service unit tests
npm run test:contract      # Contract test validation
npm run test:integration   # API integration tests
npm run test:performance   # Benchmark assertions
```

---

## Success Criteria

- [ ] All 5 scenarios pass validation checks
- [ ] Performance benchmarks meet constitutional requirements
- [ ] Zero data loss during offline operation
- [ ] Background timer functions correctly on iOS
- [ ] Sync queue processes all pending items
- [ ] Analytics calculations match manual verification
- [ ] Code coverage ≥ 80% (unit + integration tests combined)

**Next Phase**: Execute /tasks command to generate detailed task breakdown for implementation
