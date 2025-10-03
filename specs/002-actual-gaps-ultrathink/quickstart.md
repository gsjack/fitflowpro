# Quickstart: Complete Missing Core Features - Integration Test Scenarios

**Date**: 2025-10-03
**Purpose**: Executable integration test procedures for the 5 missing core features in FitFlow Pro
**Feature Branch**: `001-specify-build-fitflow`

---

## Prerequisites

### Environment Setup
- **Backend Server**: Running on `http://localhost:3000` (or Raspberry Pi 5 at configured IP)
- **Mobile App**: React Native app running in Expo (iOS simulator or Android emulator)
- **Database**: SQLite database seeded with:
  - Exercise library (100+ exercises from `/backend/src/database/seed-exercises.sql`)
  - 6-day RP program for test user (from `/backend/data/seed_6day_program.sql`)
- **Test Tools**:
  - HTTP client (curl, Postman, or Insomnia) for API testing
  - Mobile simulator with Expo Go installed

### Test User Credentials
```bash
# Create test user via API
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser@fitflow.com",
    "password": "Test123!",
    "age": 28,
    "weight_kg": 82,
    "experience_level": "intermediate"
  }'

# Login to get JWT token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser@fitflow.com",
    "password": "Test123!"
  }'

# Save the returned token as AUTH_TOKEN for subsequent requests
# Example response: {"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
```

### Database Verification
```bash
# Verify exercise library is seeded
sqlite3 backend/data/fitflow.db "SELECT COUNT(*) FROM exercises;"
# Expected: 100+ exercises

# Verify 6-day program exists for user ID 1
sqlite3 backend/data/fitflow.db "SELECT * FROM programs WHERE user_id = 1;"
# Expected: 1 row with name "Renaissance Periodization 6-Day Split"

# Verify program days
sqlite3 backend/data/fitflow.db "SELECT id, day_name, day_type FROM program_days WHERE program_id = 1;"
# Expected: 6 rows (Push A, Pull A, VO2max A, Push B, Pull B, VO2max B)
```

---

## Scenario 1: Exercise Swap in Program Planner

**Objective**: Verify users can swap exercises in the training planner while maintaining volume targets for muscle groups.

### Prerequisites
- Test user authenticated with valid JWT token
- User has default 6-day RP program assigned (program_id = 1)
- Exercise library contains alternative chest exercises

### Test Steps

#### Step 1: [API] Get Current Program Day Structure
```bash
# Get Push A workout (program_day_id = 1)
curl -X GET "http://localhost:3000/api/program-days/recommended?day=1" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
```

**Expected Response** (200 OK):
```json
{
  "id": 1,
  "program_id": 1,
  "day_of_week": 1,
  "day_name": "Push A (Chest-Focused)",
  "day_type": "strength",
  "exercises": [
    {
      "id": 1,
      "program_day_id": 1,
      "exercise_id": 25,
      "order_index": 1,
      "sets": 3,
      "reps": "6-8",
      "rir": 3,
      "exercise_name": "Barbell Back Squat",
      "muscle_groups": "[\"quads\",\"glutes\",\"hamstrings\"]",
      "equipment": "barbell"
    },
    {
      "id": 2,
      "program_day_id": 1,
      "exercise_id": 1,
      "order_index": 2,
      "sets": 4,
      "reps": "6-8",
      "rir": 3,
      "exercise_name": "Barbell Bench Press",
      "muscle_groups": "[\"chest\",\"front_delts\",\"triceps\"]",
      "equipment": "barbell"
    }
    // ... remaining 4 exercises
  ]
}
```

**Validation**:
- [ ] Response status is 200
- [ ] `exercises` array contains 6 items
- [ ] Exercise at `order_index: 2` is "Barbell Bench Press" (exercise_id = 1)
- [ ] `sets` = 4, `reps` = "6-8", `rir` = 3

---

#### Step 2: [API] Get Alternative Chest Exercises
```bash
# Search exercises by muscle group
curl -X GET "http://localhost:3000/api/exercises?muscle_group=chest&equipment=dumbbell" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
```

**Expected Response** (200 OK):
```json
{
  "exercises": [
    {
      "id": 3,
      "name": "Dumbbell Bench Press",
      "muscle_groups": "[\"chest\",\"front_delts\",\"triceps\"]",
      "equipment": "dumbbell",
      "difficulty": "intermediate",
      "default_sets": 4,
      "default_reps": "8-10",
      "default_rir": 2
    },
    {
      "id": 5,
      "name": "Incline Dumbbell Press",
      "muscle_groups": "[\"chest\",\"front_delts\",\"triceps\"]",
      "equipment": "dumbbell",
      "difficulty": "intermediate",
      "default_sets": 4,
      "default_reps": "8-10",
      "default_rir": 2
    }
    // ... more dumbbell chest exercises
  ],
  "total": 4
}
```

**Validation**:
- [ ] Response status is 200
- [ ] At least 2 dumbbell chest exercises returned
- [ ] "Dumbbell Bench Press" (exercise_id = 3) exists in results
- [ ] All exercises contain "chest" in `muscle_groups` array

---

#### Step 3: [Mobile] Open Planner Screen
**Action**: Navigate to Planner tab → Select "Push A" day

**Expected UI State**:
- [ ] Screen title: "Push A (Chest-Focused)"
- [ ] Exercise list displays 6 exercises in order
- [ ] Each exercise card shows: name, sets × reps @ RIR, muscle tags
- [ ] "Barbell Bench Press" card has "Swap Exercise" button visible
- [ ] Drag handles visible on each card (except first leg exercise - locked)

---

#### Step 4: [Mobile] Tap "Swap Exercise" on Barbell Bench Press
**Action**: Tap "Swap Exercise" button on "Barbell Bench Press" card

**Expected UI State**:
- [ ] Exercise selection modal appears
- [ ] Search bar with placeholder "Search exercises..."
- [ ] Filter chips: "Chest", "All Equipment", "All Difficulty"
- [ ] Exercise list shows filtered chest exercises
- [ ] "Dumbbell Bench Press" appears in list with metadata:
  - Muscle groups: Chest, Front Delts, Triceps
  - Equipment: Dumbbell
  - Default: 4 sets × 8-10 reps @ RIR 2

---

#### Step 5: [Mobile] Select "Dumbbell Bench Press"
**Action**: Tap "Dumbbell Bench Press" in exercise selection modal

**Expected UI State**:
- [ ] Modal closes
- [ ] Exercise at order_index 2 now shows "Dumbbell Bench Press"
- [ ] Sets/reps/RIR transferred from original exercise (4 sets × 6-8 reps @ RIR 3)
- [ ] Real-time validation banner appears:
  - "✅ Chest: 14 sets/week (within MAV range)"
  - "✅ Program validated - all muscle groups meet MEV targets"
- [ ] "Save Changes" button at bottom of screen is enabled

---

#### Step 6: [API] Persist Exercise Swap
```bash
# Update program_exercise record
curl -X PATCH "http://localhost:3000/api/program-exercises/2" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "exercise_id": 3,
    "sets": 4,
    "reps": "6-8",
    "rir": 3
  }'
```

**Expected Response** (200 OK):
```json
{
  "id": 2,
  "program_day_id": 1,
  "exercise_id": 3,
  "order_index": 2,
  "sets": 4,
  "reps": "6-8",
  "rir": 3,
  "updated_at": 1727987654321
}
```

**Validation**:
- [ ] Response status is 200
- [ ] `exercise_id` changed from 1 to 3
- [ ] `sets`, `reps`, `rir` preserved from original
- [ ] `updated_at` timestamp is recent (within last 5 seconds)

---

#### Step 7: [API] Verify Change Persisted in Database
```bash
# Query program_exercises to confirm swap
sqlite3 backend/data/fitflow.db \
  "SELECT pe.id, pe.exercise_id, e.name, pe.sets, pe.reps, pe.rir
   FROM program_exercises pe
   JOIN exercises e ON pe.exercise_id = e.id
   WHERE pe.id = 2;"
```

**Expected Output**:
```
2|3|Dumbbell Bench Press|4|6-8|3
```

**Validation**:
- [ ] Exercise ID is 3 (Dumbbell Bench Press)
- [ ] Sets = 4, Reps = "6-8", RIR = 3
- [ ] Change is persisted in SQLite database

---

#### Step 8: [Mobile] Verify UI Updated with New Exercise
**Action**: Return to Dashboard → Navigate to today's workout (if Monday)

**Expected UI State**:
- [ ] Workout preview shows "Push A (Chest-Focused)"
- [ ] Exercise list at order_index 2 displays "Dumbbell Bench Press"
- [ ] Exercise metadata shows "4 sets × 6-8 reps @ RIR 3"
- [ ] No "Barbell Bench Press" visible in Push A workout

---

### Cleanup
```bash
# Revert exercise swap to original state
curl -X PATCH "http://localhost:3000/api/program-exercises/2" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "exercise_id": 1,
    "sets": 4,
    "reps": "6-8",
    "rir": 3
  }'
```

---

## Scenario 2: VO2max Cardio Session Execution

**Objective**: Verify Norwegian 4×4 interval protocol guidance with heart rate zone tracking and VO2max estimation.

### Prerequisites
- Test user authenticated with valid JWT token
- User's age set (for HRmax calculation: 220 - age)
- User's program includes VO2max A day (program_day_id = 3, Wednesday)

### Test Steps

#### Step 1: [API] Create VO2max Workout Session
```bash
# Create workout for VO2max A day
curl -X POST "http://localhost:3000/api/workouts" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "program_day_id": 3,
    "date": "2025-10-03"
  }'
```

**Expected Response** (201 Created):
```json
{
  "id": 42,
  "user_id": 1,
  "program_day_id": 3,
  "date": "2025-10-03",
  "started_at": 1727982000000,
  "completed_at": null,
  "status": "in_progress",
  "total_volume_kg": null,
  "average_rir": null,
  "synced": 0
}
```

**Validation**:
- [ ] Response status is 201
- [ ] Workout created with `status` = "in_progress"
- [ ] `program_day_id` = 3 (VO2max A day)
- [ ] `started_at` timestamp is present

---

#### Step 2: [Mobile] Start VO2max Workout Interface
**Action**: Tap "Start Workout" on VO2max A day

**Expected UI State**:
- [ ] Screen title: "VO2max A - Norwegian 4×4"
- [ ] Protocol description displayed:
  - "4 rounds: 4 minutes @ 90-95% HRmax, 3 minutes active recovery @ 60-70% HRmax"
  - "Total duration: ~28 minutes"
- [ ] Calculated heart rate zones shown:
  - **Work Zone** (90-95% HRmax): 172-182 bpm (for age 28: 220 - 28 = 192 max HR)
  - **Recovery Zone** (60-70% HRmax): 115-134 bpm
- [ ] Large "START INTERVAL 1" button
- [ ] Visual interval tracker: "Interval 1 of 4"

---

#### Step 3: [Mobile] Execute Work Interval 1
**Action**: Tap "START INTERVAL 1" → Begin rowing/cardio

**Expected UI State During 4-Minute Work Interval**:
- [ ] Large circular countdown timer: "4:00" → "3:59" → ... → "0:00"
- [ ] Progress ring animates (green → yellow → red as time depletes)
- [ ] Current phase label: "WORK INTERVAL 1 of 4"
- [ ] Target HR zone: "172-182 bpm" displayed prominently
- [ ] Heart rate input field (manual entry or Bluetooth HR monitor if available)
- [ ] Optional: Watt output, SPM (strokes per minute) input fields

**Audio/Visual Cues**:
- [ ] At 1:00 remaining: Audio cue "1 minute remaining" + haptic vibration
- [ ] At 0:30 remaining: Audio cue "30 seconds" + haptic vibration
- [ ] At 0:10 remaining: Audio cue "10 seconds, prepare for recovery" + strong haptic
- [ ] At 0:00: Completion tone + notification "Work interval complete! Start active recovery."

---

#### Step 4: [Mobile] Execute Recovery Interval 1
**Expected UI State After Work Interval Completes**:
- [ ] Timer automatically transitions to recovery phase
- [ ] Large countdown timer: "3:00" → "2:59" → ... → "0:00"
- [ ] Progress ring changes to blue color
- [ ] Current phase label: "RECOVERY 1 of 4"
- [ ] Target HR zone: "115-134 bpm" (Zone 2)
- [ ] Heart rate input field updates for recovery HR tracking

**Audio/Visual Cues**:
- [ ] At 0:30 remaining: Audio cue "30 seconds until next work interval"
- [ ] At 0:00: Energetic tone + notification "Recovery complete! Prepare for work interval 2."

---

#### Step 5: [Mobile] Complete All 4 Intervals
**Action**: Continue through intervals 2-4 (work + recovery cycles)

**Expected Behavior**:
- [ ] Intervals auto-advance (work → recovery → work → recovery → ...)
- [ ] Progress tracker updates: "Interval 2 of 4", "Interval 3 of 4", "Interval 4 of 4"
- [ ] Heart rate data collected for each work and recovery phase
- [ ] User can pause timer if needed (pause button visible)
- [ ] User can manually log HR after each interval

**Sample HR Data Entry**:
| Interval | Work HR (bpm) | Recovery HR (bpm) |
|----------|---------------|-------------------|
| 1        | 178           | 128               |
| 2        | 180           | 132               |
| 3        | 182           | 135               |
| 4        | 181           | 130               |

---

#### Step 6: [Mobile] View Session Summary
**Expected UI State After Final Interval**:
- [ ] Workout completion screen appears
- [ ] Summary metrics displayed:
  - **Total Duration**: 28 minutes
  - **Intervals Completed**: 4 of 4
  - **Average Work HR**: 180 bpm
  - **Peak HR**: 182 bpm
  - **Time in Target Zone**: 92% (work intervals)
- [ ] Perceived exertion input: RPE slider (1-10 scale)
- [ ] Estimated VO2max calculation displayed (based on HR data)
  - Formula: `15.3 × (max_hr / resting_hr)` (simplified)
  - Example: If resting HR = 60, max HR = 182 → VO2max ≈ 46.4 ml/kg/min
- [ ] "FINISH WORKOUT" button

---

#### Step 7: [API] Submit VO2max Session Data
```bash
# Create vo2max_session record
curl -X POST "http://localhost:3000/api/vo2max-sessions" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "workout_id": 42,
    "protocol": "4x4",
    "duration_seconds": 1680,
    "intervals_completed": 4,
    "average_hr": 180,
    "peak_hr": 182,
    "estimated_vo2max": 46.4
  }'
```

**Expected Response** (201 Created):
```json
{
  "id": 7,
  "workout_id": 42,
  "protocol": "4x4",
  "duration_seconds": 1680,
  "intervals_completed": 4,
  "average_hr": 180,
  "peak_hr": 182,
  "estimated_vo2max": 46.4,
  "synced": 0
}
```

**Validation**:
- [ ] Response status is 201
- [ ] `protocol` = "4x4"
- [ ] `intervals_completed` = 4
- [ ] `average_hr` and `peak_hr` within physiological range (60-220 bpm)
- [ ] `estimated_vo2max` within human range (20-80 ml/kg/min)

---

#### Step 8: [API] Mark Workout as Completed
```bash
# Update workout status
curl -X PATCH "http://localhost:3000/api/workouts/42" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "completed_at": 1727983680000
  }'
```

**Expected Response** (200 OK):
```json
{
  "id": 42,
  "status": "completed",
  "completed_at": 1727983680000,
  "started_at": 1727982000000,
  "total_volume_kg": null,
  "average_rir": null
}
```

**Validation**:
- [ ] Response status is 200
- [ ] `status` changed to "completed"
- [ ] `completed_at` timestamp is later than `started_at`
- [ ] Workout duration = (completed_at - started_at) ≈ 1680 seconds (28 minutes)

---

#### Step 9: [Mobile] Navigate to Analytics Dashboard
**Action**: Navigate to Analytics tab → Select "VO2max Progress"

**Expected UI State**:
- [ ] Line chart showing VO2max trend over time
- [ ] Latest data point: 46.4 ml/kg/min (from today's session)
- [ ] Previous data points visible (if historical data exists)
- [ ] Milestone badge displayed:
  - "Average Fitness: 35-45 ml/kg/min" or
  - "Good Fitness: 45-55 ml/kg/min" (user's current range)
- [ ] Target improvement overlay: "+5-13% in 12 weeks" (based on Norwegian 4×4 research)

---

### Validation Checks
- [ ] All 4 work intervals completed with HR data logged
- [ ] Recovery intervals tracked between work phases
- [ ] VO2max session record created in database
- [ ] Estimated VO2max calculated and displayed
- [ ] Workout marked as completed with accurate duration
- [ ] Analytics dashboard updated with new VO2max data point

---

### Cleanup
```bash
# Delete test VO2max session
sqlite3 backend/data/fitflow.db "DELETE FROM vo2max_sessions WHERE id = 7;"

# Delete test workout
sqlite3 backend/data/fitflow.db "DELETE FROM workouts WHERE id = 42;"
```

---

## Scenario 3: Mesocycle Phase Progression

**Objective**: Verify automatic volume adjustment when advancing from MEV → MAV → MRV → Deload phases.

### Prerequisites
- Test user authenticated with valid JWT token
- User's program at MEV phase (mesocycle_week = 1, mesocycle_phase = 'mev')
- Program has defined exercises with baseline set counts

### Test Steps

#### Step 1: [API] Get Current Program Phase
```bash
# Get user's current program
curl -X GET "http://localhost:3000/api/programs/1" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
```

**Expected Response** (200 OK):
```json
{
  "id": 1,
  "user_id": 1,
  "name": "Renaissance Periodization 6-Day Split",
  "mesocycle_week": 1,
  "mesocycle_phase": "mev",
  "created_at": 1727900000000
}
```

**Validation**:
- [ ] Response status is 200
- [ ] `mesocycle_week` = 1
- [ ] `mesocycle_phase` = "mev" (Minimum Effective Volume)

---

#### Step 2: [API] Get Baseline Exercise Volume (MEV Phase)
```bash
# Get Push A exercises at MEV phase
curl -X GET "http://localhost:3000/api/program-days/recommended?day=1" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
```

**Expected Response Excerpt** (200 OK):
```json
{
  "exercises": [
    {
      "exercise_name": "Barbell Bench Press",
      "sets": 4,
      "reps": "6-8",
      "rir": 3
    },
    {
      "exercise_name": "Incline Dumbbell Press",
      "sets": 3,
      "reps": "8-10",
      "rir": 2
    },
    {
      "exercise_name": "Cable Flyes",
      "sets": 3,
      "reps": "12-15",
      "rir": 1
    }
    // ... remaining exercises
  ]
}
```

**Baseline Volume Calculation**:
- Chest sets: 4 + 3 + 3 = 10 sets/workout × 2 workouts/week = **20 sets/week**

**Validation**:
- [ ] Total chest sets = 10 per Push workout
- [ ] Weekly chest volume (2 Push days) = 20 sets
- [ ] Volume is at MEV baseline for intermediate lifters

---

#### Step 3: [Mobile] Open Planner → Advance Phase
**Action**: Navigate to Planner tab → Tap "Advance Mesocycle Phase" button

**Expected UI State**:
- [ ] Confirmation dialog appears:
  - Title: "Advance to MAV Phase?"
  - Message: "Week 3-4: Maximum Adaptive Volume. All exercises will increase by 20% (+1-2 sets per exercise). Are you ready?"
  - Buttons: "Cancel" | "Advance Phase"

---

#### Step 4: [Mobile] Confirm Phase Advancement
**Action**: Tap "Advance Phase" button

**Expected UI State**:
- [ ] Loading indicator appears briefly
- [ ] Success notification: "✅ Advanced to MAV Phase - Volume increased by 20%"
- [ ] Program phase indicator updates: "Week 3/8 - MAV Phase"
- [ ] Exercise list refreshes with updated set counts

---

#### Step 5: [API] Advance Program Phase
```bash
# Update program to MAV phase
curl -X PATCH "http://localhost:3000/api/programs/1/advance-phase" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "current_phase": "mev",
    "target_phase": "mav"
  }'
```

**Expected Response** (200 OK):
```json
{
  "id": 1,
  "user_id": 1,
  "name": "Renaissance Periodization 6-Day Split",
  "mesocycle_week": 3,
  "mesocycle_phase": "mav",
  "volume_adjustment": "+20%",
  "affected_exercises": 48,
  "updated_at": 1727987800000
}
```

**Validation**:
- [ ] Response status is 200
- [ ] `mesocycle_phase` changed from "mev" to "mav"
- [ ] `mesocycle_week` updated to 3 (start of MAV phase)
- [ ] `volume_adjustment` = "+20%"
- [ ] `affected_exercises` count matches total exercises in program

---

#### Step 6: [API] Verify Volume Increase in Program Exercises
```bash
# Get Push A exercises after MAV advancement
curl -X GET "http://localhost:3000/api/program-days/recommended?day=1" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
```

**Expected Response Excerpt** (200 OK):
```json
{
  "exercises": [
    {
      "exercise_name": "Barbell Bench Press",
      "sets": 5,
      "reps": "6-8",
      "rir": 3
    },
    {
      "exercise_name": "Incline Dumbbell Press",
      "sets": 4,
      "reps": "8-10",
      "rir": 2
    },
    {
      "exercise_name": "Cable Flyes",
      "sets": 4,
      "reps": "12-15",
      "rir": 1
    }
    // ... remaining exercises
  ]
}
```

**MAV Volume Calculation**:
- Chest sets: 5 + 4 + 4 = 13 sets/workout × 2 workouts/week = **26 sets/week**
- Volume increase: 26 / 20 = 1.30 = **+30% actual** (targeting 20% increase, rounding up to whole sets)

**Validation**:
- [ ] "Barbell Bench Press" sets increased from 4 → 5 (+1 set, +25%)
- [ ] "Incline Dumbbell Press" sets increased from 3 → 4 (+1 set, +33%)
- [ ] "Cable Flyes" sets increased from 3 → 4 (+1 set, +33%)
- [ ] Total weekly chest volume increased by ~20-30%
- [ ] Reps and RIR values unchanged

---

#### Step 7: [Mobile] Verify Volume Tracking Dashboard
**Action**: Navigate to Dashboard → Scroll to "Weekly Volume Tracking"

**Expected UI State**:
- [ ] Horizontal bar chart for "Chest" muscle group:
  - **Completed volume** (green bar): 0 sets (week just started)
  - **Planned volume** (blue bar): 26 sets (updated for MAV phase)
  - **Recommended range** (yellow zone): MEV=16, MAV=24, MRV=32 (intermediate lifter)
- [ ] Visual indicator: "✅ Chest: 26 sets planned (within MAV range)"
- [ ] Other muscle groups also show updated planned volumes

---

#### Step 8: [API] Advance to MRV Phase (Week 6)
```bash
# Simulate completing weeks 3-5, then advance to MRV
curl -X PATCH "http://localhost:3000/api/programs/1/advance-phase" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "current_phase": "mav",
    "target_phase": "mrv"
  }'
```

**Expected Response** (200 OK):
```json
{
  "mesocycle_week": 6,
  "mesocycle_phase": "mrv",
  "volume_adjustment": "+15%",
  "affected_exercises": 48
}
```

**MRV Volume Calculation** (from MAV baseline):
- Chest sets: 5 + 4 + 4 = 13 sets/workout → +15% = ~15 sets/workout
- Expected: 6 + 5 + 4 = 15 sets/workout × 2 = **30 sets/week**

**Validation**:
- [ ] Phase advanced to "mrv"
- [ ] Volume increased by 15% from MAV
- [ ] Weekly chest volume now at ~30 sets (approaching MRV limit of 32)

---

#### Step 9: [API] Advance to Deload Phase (Week 8)
```bash
# Advance to deload after completing week 7
curl -X PATCH "http://localhost:3000/api/programs/1/advance-phase" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "current_phase": "mrv",
    "target_phase": "deload"
  }'
```

**Expected Response** (200 OK):
```json
{
  "mesocycle_week": 8,
  "mesocycle_phase": "deload",
  "volume_adjustment": "-50%",
  "affected_exercises": 48
}
```

**Deload Volume Calculation** (50% reduction from MRV):
- Chest sets: 15 sets/workout × 0.5 = 7-8 sets/workout
- Expected: 3 + 2 + 2 = 7 sets/workout × 2 = **14 sets/week**

**Validation**:
- [ ] Phase advanced to "deload"
- [ ] Volume reduced by 50% from MRV levels
- [ ] Weekly chest volume now at ~14 sets (recovery week)
- [ ] Sets per exercise roughly halved (6→3, 5→2, 4→2)

---

#### Step 10: [Mobile] Verify Deload Week UI
**Action**: Navigate to Dashboard

**Expected UI State**:
- [ ] Program phase banner: "Week 8/8 - Deload Week 🔋"
- [ ] Message: "Recovery week - reduced volume for super-compensation"
- [ ] Volume tracking shows planned volume at ~50% of previous week
- [ ] Visual indicator: "✅ Chest: 14 sets planned (deload range)"

---

### Validation Checks
- [ ] MEV → MAV transition increases volume by ~20%
- [ ] MAV → MRV transition increases volume by ~15%
- [ ] MRV → Deload transition decreases volume by 50%
- [ ] Mesocycle week counter updates correctly (1 → 3 → 6 → 8)
- [ ] Volume tracking dashboard reflects phase-appropriate targets
- [ ] All exercises in program affected by phase progression
- [ ] Reps and RIR values remain constant across phase changes

---

### Cleanup
```bash
# Reset program to MEV phase
curl -X PATCH "http://localhost:3000/api/programs/1" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "mesocycle_week": 1,
    "mesocycle_phase": "mev"
  }'

# Restore original exercise volumes
# (This would involve batch updating program_exercises table or re-running seed script)
```

---

## Scenario 4: Program Customization with Volume Validation

**Objective**: Verify drag-and-drop program editing with real-time MEV/MAV/MRV validation warnings.

### Prerequisites
- Test user authenticated with valid JWT token
- User has default 6-day RP program assigned
- Exercise library loaded with categorized exercises

### Test Steps

#### Step 1: [API] Get Current Pull A Workout Structure
```bash
# Get Pull A workout (program_day_id = 2)
curl -X GET "http://localhost:3000/api/program-days/recommended?day=2" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
```

**Expected Response** (200 OK):
```json
{
  "id": 2,
  "program_id": 1,
  "day_of_week": 2,
  "day_name": "Pull A (Lat-Focused)",
  "day_type": "strength",
  "exercises": [
    {
      "id": 7,
      "exercise_name": "Conventional Deadlift",
      "muscle_groups": "[\"hamstrings\",\"glutes\",\"lower_back\"]",
      "sets": 3,
      "reps": "5-8",
      "rir": 3
    },
    {
      "id": 8,
      "exercise_name": "Pull-Ups",
      "muscle_groups": "[\"lats\",\"mid_back\",\"biceps\"]",
      "sets": 4,
      "reps": "5-8",
      "rir": 3
    },
    {
      "id": 9,
      "exercise_name": "Barbell Row",
      "muscle_groups": "[\"lats\",\"mid_back\",\"rear_delts\"]",
      "sets": 4,
      "reps": "8-10",
      "rir": 2
    },
    {
      "id": 10,
      "exercise_name": "Seated Cable Row",
      "muscle_groups": "[\"mid_back\",\"lats\"]",
      "sets": 3,
      "reps": "12-15",
      "rir": 1
    },
    {
      "id": 11,
      "exercise_name": "Face Pulls",
      "muscle_groups": "[\"rear_delts\",\"mid_back\"]",
      "sets": 3,
      "reps": "15-20",
      "rir": 0
    },
    {
      "id": 12,
      "exercise_name": "Barbell Curl",
      "muscle_groups": "[\"biceps\"]",
      "sets": 3,
      "reps": "8-12",
      "rir": 1
    }
  ]
}
```

**Baseline Volume**:
- Lats: 4 + 4 + 3 = 11 sets/workout × 2 workouts/week = **22 sets/week**
- Mid-back: 4 + 3 + 3 = 10 sets/workout × 2 = **20 sets/week**
- Rear delts: 3 sets/workout × 2 = **6 sets/week**

**Validation**:
- [ ] Response status is 200
- [ ] Pull A workout contains 6 exercises
- [ ] Lat-focused exercises (Pull-Ups, Barbell Row, Seated Cable Row) present
- [ ] Rear delt volume at MEV minimum (6 sets/week)

---

#### Step 2: [Mobile] Open Pull A in Planner
**Action**: Navigate to Planner → Select "Pull A" day

**Expected UI State**:
- [ ] Screen title: "Pull A (Lat-Focused)"
- [ ] 6 exercise cards displayed in order
- [ ] Each card shows drag handle, exercise name, sets × reps @ RIR
- [ ] Volume validation banner at top:
  - "✅ Lats: 22 sets/week (within MAV range 18-28)"
  - "✅ Mid-back: 20 sets/week (within MAV range 16-24)"
  - "✅ Rear delts: 6 sets/week (at MEV minimum)"

---

#### Step 3: [Mobile] Test Invalid Modification - Remove Barbell Row
**Action**: Swipe left on "Barbell Row" card → Tap "Delete Exercise"

**Expected UI State**:
- [ ] Exercise card removes from list
- [ ] Volume validation banner updates immediately:
  - "⚠️ Lats: 18 sets/week (below MAV, approaching MEV)"
  - "⚠️ Mid-back: 16 sets/week (at MEV minimum)"
- [ ] Warning message appears:
  - "Removing Barbell Row reduces lat volume below optimal range. Consider adding sets to remaining exercises or swapping instead of deleting."
- [ ] "Save Changes" button shows warning icon

**Volume After Removal**:
- Lats: (4 + 3) × 2 = 14 sets/week (below MEV of 16)
- Mid-back: (3 + 3) × 2 = 12 sets/week (below MEV of 14)

---

#### Step 4: [Mobile] Restore Barbell Row via Undo
**Action**: Tap "Undo" button or re-add Barbell Row from exercise library

**Expected UI State**:
- [ ] "Barbell Row" card reappears in original position (order_index = 3)
- [ ] Volume validation returns to green:
  - "✅ Lats: 22 sets/week (within MAV range)"
  - "✅ Mid-back: 20 sets/week (within MAV range)"
- [ ] Warning message clears

---

#### Step 5: [Mobile] Test Valid Modification - Swap Barbell Row for Dumbbell Row
**Action**:
1. Tap "Swap Exercise" on "Barbell Row" card
2. Search for "Dumbbell Row" in exercise selector
3. Select "Dumbbell Row" (exercise_id = 11)

**Expected UI State**:
- [ ] Exercise at position 3 updates to "Dumbbell Row"
- [ ] Sets/reps/RIR preserved (4 sets × 8-10 reps @ RIR 2)
- [ ] Volume validation remains green:
  - "✅ Lats: 22 sets/week (within MAV range)"
  - "✅ Mid-back: 20 sets/week (within MAV range)"
- [ ] Explanation tooltip: "Dumbbell Row targets same muscle groups as Barbell Row - volume maintained"

---

#### Step 6: [API] Persist Exercise Swap
```bash
# Update program_exercise for Barbell Row → Dumbbell Row
curl -X PATCH "http://localhost:3000/api/program-exercises/9" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "exercise_id": 11,
    "sets": 4,
    "reps": "8-10",
    "rir": 2
  }'
```

**Expected Response** (200 OK):
```json
{
  "id": 9,
  "program_day_id": 2,
  "exercise_id": 11,
  "order_index": 3,
  "sets": 4,
  "reps": "8-10",
  "rir": 2
}
```

**Validation**:
- [ ] Response status is 200
- [ ] `exercise_id` changed from 10 (Barbell Row) to 11 (Dumbbell Row)
- [ ] Volume parameters preserved

---

#### Step 7: [Mobile] Test Volume Adjustment - Reduce Face Pulls Sets
**Action**: Tap "Face Pulls" card → Tap "-" button to reduce sets from 3 → 2

**Expected UI State**:
- [ ] Face Pulls set count updates: "2 sets × 15-20 reps @ RIR 0"
- [ ] Volume validation updates:
  - "⚠️ Rear delts: 4 sets/week (below MEV of 6)"
- [ ] Warning message appears:
  - "Rear delt volume below minimum effective dose. Increase sets or add another rear delt exercise."
- [ ] "Save Changes" button shows warning icon but remains enabled (user can override)

---

#### Step 8: [Mobile] Add Sets to Face Pulls to Fix Warning
**Action**: Tap "+" button to increase sets from 2 → 4

**Expected UI State**:
- [ ] Face Pulls set count updates: "4 sets × 15-20 reps @ RIR 0"
- [ ] Volume validation clears warning:
  - "✅ Rear delts: 8 sets/week (within MAV range 6-12)"
- [ ] Warning message disappears
- [ ] "Save Changes" button returns to normal state

---

#### Step 9: [API] Update Face Pulls Set Count
```bash
# Update Face Pulls from 3 → 4 sets
curl -X PATCH "http://localhost:3000/api/program-exercises/11" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "sets": 4,
    "reps": "15-20",
    "rir": 0
  }'
```

**Expected Response** (200 OK):
```json
{
  "id": 11,
  "program_day_id": 2,
  "exercise_id": 16,
  "sets": 4,
  "reps": "15-20",
  "rir": 0
}
```

**Validation**:
- [ ] Response status is 200
- [ ] `sets` increased from 3 → 4
- [ ] Rear delt weekly volume now at 8 sets (within MAV range)

---

#### Step 10: [Mobile] Test Exercise Reordering via Drag-and-Drop
**Action**:
1. Long-press on "Barbell Curl" card (position 6)
2. Drag above "Seated Cable Row" (position 4)
3. Release to reorder

**Expected UI State**:
- [ ] Exercise order updates:
  1. Conventional Deadlift (locked, cannot move)
  2. Pull-Ups
  3. Dumbbell Row
  4. **Barbell Curl** (moved here)
  5. Seated Cable Row (shifted down)
  6. Face Pulls
- [ ] `order_index` values recalculate automatically
- [ ] Volume validation remains unchanged (order doesn't affect volume)

**Note**: First exercise (leg compound) should be locked and unmovable to preserve testosterone optimization principle.

---

#### Step 11: [API] Persist Exercise Reordering
```bash
# Batch update order_index for affected exercises
curl -X PATCH "http://localhost:3000/api/program-exercises/batch-reorder" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "program_day_id": 2,
    "exercise_orders": [
      {"program_exercise_id": 7, "order_index": 1},
      {"program_exercise_id": 8, "order_index": 2},
      {"program_exercise_id": 9, "order_index": 3},
      {"program_exercise_id": 12, "order_index": 4},
      {"program_exercise_id": 10, "order_index": 5},
      {"program_exercise_id": 11, "order_index": 6}
    ]
  }'
```

**Expected Response** (200 OK):
```json
{
  "program_day_id": 2,
  "exercises_reordered": 6,
  "updated_at": 1727988000000
}
```

**Validation**:
- [ ] Response status is 200
- [ ] All 6 exercises reordered successfully
- [ ] `order_index` values updated in database

---

### Validation Checks
- [ ] Deleting exercises triggers volume warnings when below MEV
- [ ] Swapping exercises preserves volume if muscle groups match
- [ ] Increasing/decreasing set counts updates volume validation in real-time
- [ ] Volume validation categorizes muscle groups as:
  - ✅ Green: Within MEV-MAV optimal range
  - ⚠️ Yellow: Below MEV or above MAV (approaching MRV)
  - ❌ Red: Above MRV (overtraining risk)
- [ ] First exercise (leg compound) is locked and cannot be reordered
- [ ] Drag-and-drop reordering persists to database
- [ ] "Save Changes" button disabled until modifications are made

---

### Cleanup
```bash
# Restore original Pull A configuration
# (Revert Dumbbell Row → Barbell Row, Face Pulls 4 → 3 sets, restore original order)
curl -X POST "http://localhost:3000/api/programs/1/reset-to-default" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
```

---

## Scenario 5: Muscle Volume Tracking Visualization

**Objective**: Verify weekly volume tracking dashboard displays completed vs. planned vs. recommended volume for all muscle groups.

### Prerequisites
- Test user authenticated with valid JWT token
- User has completed 2 workouts this week (Push A on Monday, Pull A on Tuesday)
- Set data logged for all exercises in those workouts

### Test Steps

#### Step 1: [API] Seed Completed Workouts for Current Week
```bash
# Create and complete Push A workout (Monday)
curl -X POST "http://localhost:3000/api/workouts" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "program_day_id": 1,
    "date": "2025-09-30",
    "status": "completed",
    "started_at": 1727687000000,
    "completed_at": 1727690600000
  }'

# Create and complete Pull A workout (Tuesday)
curl -X POST "http://localhost:3000/api/workouts" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "program_day_id": 2,
    "date": "2025-10-01",
    "status": "completed",
    "started_at": 1727773400000,
    "completed_at": 1727777000000
  }'
```

**Expected Response** (201 Created for each):
```json
{
  "id": 43,
  "status": "completed",
  "program_day_id": 1,
  "date": "2025-09-30"
}
{
  "id": 44,
  "status": "completed",
  "program_day_id": 2,
  "date": "2025-10-01"
}
```

---

#### Step 2: [API] Log Sets for Push A Workout (Chest Volume)
```bash
# Log 4 sets of Barbell Bench Press
for i in {1..4}; do
  curl -X POST "http://localhost:3000/api/sets" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"workout_id\": 43,
      \"exercise_id\": 1,
      \"set_number\": $i,
      \"weight_kg\": 100,
      \"reps\": $((9-i)),
      \"rir\": 2,
      \"timestamp\": $((1727687200000 + i*180000))
    }"
done

# Log 3 sets of Incline Dumbbell Press
for i in {1..3}; do
  curl -X POST "http://localhost:3000/api/sets" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"workout_id\": 43,
      \"exercise_id\": 5,
      \"set_number\": $i,
      \"weight_kg\": 35,
      \"reps\": $((11-i)),
      \"rir\": 2,
      \"timestamp\": $((1727688000000 + i*180000))
    }"
done

# Log 3 sets of Cable Flyes
for i in {1..3}; do
  curl -X POST "http://localhost:3000/api/sets" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"workout_id\": 43,
      \"exercise_id\": 7,
      \"set_number\": $i,
      \"weight_kg\": 20,
      \"reps\": $((15-i)),
      \"rir\": 1,
      \"timestamp\": $((1727688800000 + i*120000))
    }"
done
```

**Push A Completed Volume**:
- Chest: 4 + 3 + 3 = **10 sets**

---

#### Step 3: [API] Log Sets for Pull A Workout (Lat/Back Volume)
```bash
# Log 4 sets of Pull-Ups
for i in {1..4}; do
  curl -X POST "http://localhost:3000/api/sets" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"workout_id\": 44,
      \"exercise_id\": 14,
      \"set_number\": $i,
      \"weight_kg\": 10,
      \"reps\": $((9-i)),
      \"rir\": 3,
      \"timestamp\": $((1727773600000 + i*180000))
    }"
done

# Log 4 sets of Barbell Row
for i in {1..4}; do
  curl -X POST "http://localhost:3000/api/sets" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"workout_id\": 44,
      \"exercise_id\": 10,
      \"set_number\": $i,
      \"weight_kg\": 80,
      \"reps\": $((10-i)),
      \"rir\": 2,
      \"timestamp\": $((1727774400000 + i*180000))
    }"
done

# Log 3 sets of Seated Cable Row
for i in {1..3}; do
  curl -X POST "http://localhost:3000/api/sets" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"workout_id\": 44,
      \"exercise_id\": 13,
      \"set_number\": $i,
      \"weight_kg\": 60,
      \"reps\": $((14-i)),
      \"rir\": 1,
      \"timestamp\": $((1727775200000 + i*150000))
    }"
done

# Log 3 sets of Face Pulls
for i in {1..3}; do
  curl -X POST "http://localhost:3000/api/sets" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"workout_id\": 44,
      \"exercise_id\": 16,
      \"set_number\": $i,
      \"weight_kg\": 25,
      \"reps\": $((18-i)),
      \"rir\": 0,
      \"timestamp\": $((1727776000000 + i*120000))
    }"
done
```

**Pull A Completed Volume**:
- Lats: 4 + 4 + 3 = **11 sets**
- Mid-back: 4 + 3 + 3 = **10 sets**
- Rear delts: 3 sets

---

#### Step 4: [API] Get Weekly Volume Analytics
```bash
# Get weekly muscle group volume summary
curl -X GET "http://localhost:3000/api/analytics/volume-trends?user_id=1&week=current" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
```

**Expected Response** (200 OK):
```json
{
  "week_start": "2025-09-30",
  "week_end": "2025-10-06",
  "muscle_groups": [
    {
      "muscle_group": "chest",
      "completed_volume": 10,
      "planned_volume": 20,
      "mev": 16,
      "mav": 24,
      "mrv": 32,
      "status": "below_mev",
      "completion_percentage": 50
    },
    {
      "muscle_group": "lats",
      "completed_volume": 11,
      "planned_volume": 22,
      "mev": 16,
      "mav": 24,
      "mrv": 30,
      "status": "below_mev",
      "completion_percentage": 50
    },
    {
      "muscle_group": "mid_back",
      "completed_volume": 10,
      "planned_volume": 20,
      "mev": 14,
      "mav": 22,
      "mrv": 28,
      "status": "below_mev",
      "completion_percentage": 50
    },
    {
      "muscle_group": "rear_delts",
      "completed_volume": 3,
      "planned_volume": 6,
      "mev": 6,
      "mav": 12,
      "mrv": 18,
      "status": "below_mev",
      "completion_percentage": 50
    }
    // ... other muscle groups with 0 completed volume this week
  ]
}
```

**Validation**:
- [ ] Response status is 200
- [ ] `completed_volume` matches logged sets (chest=10, lats=11, etc.)
- [ ] `planned_volume` = 2× single workout volume (assumes 2 workouts/week per muscle)
- [ ] `completion_percentage` = 50% (2 out of 6 workouts completed this week)
- [ ] `status` = "below_mev" (week in progress, hasn't hit MEV yet)

---

#### Step 5: [Mobile] Navigate to Dashboard
**Action**: Open app → Navigate to Dashboard tab

**Expected UI State - Weekly Volume Tracking Section**:
- [ ] Section header: "Weekly Volume Tracking - Week 40/2025"
- [ ] Horizontal bar charts for each muscle group:

**Chest Chart**:
```
Chest            ████████░░░░░░░░░░  10/20 sets (50%)
                 ├─MEV─┤──MAV──┤─MRV─┤
                 16    24      32
```
- [ ] Green bar (completed): 10 sets (fills to 50% of planned)
- [ ] Blue outline (planned): 20 sets total
- [ ] Yellow zone markers: MEV=16, MAV=24, MRV=32
- [ ] Status indicator: "⚠️ Below MEV - 2 more workouts scheduled this week"

**Lats Chart**:
```
Lats             █████████░░░░░░░░░░ 11/22 sets (50%)
                 ├─MEV─┤──MAV──┤─MRV─┤
                 16    24      30
```
- [ ] Green bar: 11 sets
- [ ] Blue outline: 22 sets
- [ ] Status: "⚠️ Below MEV - 2 more workouts scheduled"

**Rear Delts Chart**:
```
Rear Delts       █████░░░░░░░░░░░░░░  3/6 sets (50%)
                 ├MEV┤──MAV──┤─MRV─┤
                 6   12      18
```
- [ ] Green bar: 3 sets
- [ ] Blue outline: 6 sets
- [ ] Status: "⚠️ Below MEV - 1 more workout scheduled"

---

#### Step 6: [Mobile] Complete Remaining Workouts (Simulate Full Week)
**Action**:
1. Complete VO2max A workout (Wednesday)
2. Complete Push B workout (Thursday)
3. Complete Pull B workout (Friday)
4. Complete VO2max B workout (Saturday)

**After All Workouts Completed**:

**Expected UI State**:
- [ ] Weekly completion indicator: "✅ 6/6 workouts completed this week"

**Chest Chart (Updated)**:
```
Chest            ████████████████████ 20/20 sets (100%)
                 ├─MEV─┤──MAV──┤─MRV─┤
                 16    24      32
```
- [ ] Green bar: 20 sets (100% of planned)
- [ ] Status: "✅ Within MAV range (optimal hypertrophy stimulus)"

**Lats Chart (Updated)**:
```
Lats             ████████████████████ 22/22 sets (100%)
                 ├─MEV─┤──MAV──┤─MRV─┤
                 16    24      30
```
- [ ] Green bar: 22 sets
- [ ] Status: "✅ Within MAV range"

**Rear Delts Chart (Updated)**:
```
Rear Delts       ████████████░░░░░░░░  6/6 sets (100%)
                 ├MEV┤──MAV──┤─MRV─┤
                 6   12      18
```
- [ ] Green bar: 6 sets
- [ ] Status: "✅ At MEV minimum (adequate for maintenance)"

---

#### Step 7: [API] Verify Volume Calculation Accuracy
```bash
# Get aggregated set counts per muscle group for current week
sqlite3 backend/data/fitflow.db <<EOF
SELECT
  e.muscle_groups,
  COUNT(*) as total_sets
FROM sets s
JOIN workouts w ON s.workout_id = w.id
JOIN exercises e ON s.exercise_id = e.id
WHERE w.user_id = 1
  AND w.date >= '2025-09-30'
  AND w.date <= '2025-10-06'
  AND w.status = 'completed'
GROUP BY e.muscle_groups;
EOF
```

**Expected Output** (aggregated by muscle group):
```
["chest","front_delts","triceps"]|20
["lats","mid_back","biceps"]|22
["rear_delts","mid_back"]|6
...
```

**Validation**:
- [ ] Chest volume = 20 sets (4+3+3 from Push A + 4+3+3 from Push B)
- [ ] Lat volume = 22 sets (4+4+3 from Pull A + 4+4+3 from Pull B)
- [ ] Rear delt volume = 6 sets (3 from Pull A + 3 from Pull B)
- [ ] Database counts match dashboard visualizations

---

#### Step 8: [Mobile] Test Volume Tracking for Over-Reaching Scenario
**Action**:
1. Manually add 2 extra sets of Bench Press to Push A workout
2. Log those sets via mobile app

**Expected UI State**:
- [ ] Chest completed volume updates: 22 sets (20 + 2 extra)
- [ ] Chart shifts:
  - Green bar extends beyond planned blue outline
  - Status changes to: "⚠️ Above planned volume - watch for fatigue"
- [ ] If volume exceeds MAV (24 sets):
  - Status: "⚠️ Approaching MRV - consider deload if fatigue increases"
- [ ] If volume exceeds MRV (32 sets):
  - Status: "❌ Above MRV - overtraining risk, reduce volume immediately"

---

### Validation Checks
- [ ] Completed volume accurately aggregates sets from all workouts
- [ ] Planned volume = 2× single workout volume (for 2 Push/Pull days per week)
- [ ] MEV/MAV/MRV landmarks displayed for each muscle group
- [ ] Visual indicators change based on volume status:
  - Red: Below MEV or above MRV
  - Yellow: Approaching MEV or MAV boundaries
  - Green: Within optimal MEV-MAV range
- [ ] Completion percentage accurate (sets completed / sets planned)
- [ ] Charts update in real-time as workouts are logged
- [ ] Volume tracking spans all major muscle groups:
  - Chest, Front Delts, Side Delts, Rear Delts
  - Lats, Mid-back, Lower Back
  - Biceps, Triceps
  - Quads, Hamstrings, Glutes

---

### Cleanup
```bash
# Delete test workouts and sets
sqlite3 backend/data/fitflow.db "DELETE FROM sets WHERE workout_id IN (43, 44);"
sqlite3 backend/data/fitflow.db "DELETE FROM workouts WHERE id IN (43, 44);"
```

---

## Performance Benchmarks

Run these benchmarks after completing all scenarios to verify constitutional performance requirements.

### Backend API Response Times

```bash
# POST /api/sets (set logging - critical path)
for i in {1..100}; do
  curl -w "%{time_total}\n" -o /dev/null -s -X POST "http://localhost:3000/api/sets" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"workout_id":1,"exercise_id":1,"set_number":1,"weight_kg":100,"reps":8,"rir":2,"timestamp":1727900000000}'
done | awk '{sum+=$1; if($1>max) max=$1} END {print "Avg: " sum/NR*1000 "ms, Max: " max*1000 "ms"}'
```

**Expected**: p95 < 50ms, p99 < 100ms

---

### SQLite Write Performance

```bash
# Measure SQLite insert latency
sqlite3 backend/data/fitflow.db <<EOF
.timer on
INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, synced)
VALUES (1, 1, 1, 100, 8, 2, strftime('%s', 'now') * 1000, 0);
DELETE FROM sets WHERE id = last_insert_rowid();
EOF
```

**Expected**: < 5ms (p95), < 10ms (p99)

---

### Mobile UI Render Performance

**Test in Expo Dev Tools**:
1. Open Performance Monitor in simulator
2. Navigate between Dashboard → Planner → Analytics screens
3. Log 10 sets in rapid succession (tap "Complete Set" 10 times)

**Expected**:
- [ ] Screen transitions: < 16ms (60 FPS)
- [ ] Set logging interaction: < 100ms perceived latency
- [ ] Analytics chart render: < 200ms

---

## Success Criteria

All 5 scenarios must pass with the following results:

- [x] **Scenario 1** (Exercise Swap): Exercise swapped successfully, volume validation accurate, changes persisted
- [x] **Scenario 2** (VO2max Session): All 4 intervals completed, HR zones tracked, VO2max estimated and displayed
- [x] **Scenario 3** (Mesocycle Progression): MEV → MAV → MRV → Deload transitions update volume correctly
- [x] **Scenario 4** (Program Customization): Drag-and-drop works, volume warnings trigger correctly, changes saved
- [x] **Scenario 5** (Volume Tracking): Charts display completed vs. planned vs. recommended volume accurately

### Additional Requirements

- [ ] All API endpoints return correct HTTP status codes (200, 201, 400, 404)
- [ ] Database integrity maintained (no orphaned records, foreign keys enforced)
- [ ] Performance benchmarks meet constitutional requirements (< 5ms SQLite, < 200ms API)
- [ ] Mobile UI responsive (no frame drops during interactions)
- [ ] Offline functionality works (sets logged locally, synced when online)
- [ ] Background timers function correctly (rest timer continues when app backgrounded)

---

## Appendix: API Endpoints Reference

### Missing Endpoints (Need to be Implemented)

**Exercise Library**:
- `GET /api/exercises?muscle_group={group}&equipment={type}` - Search exercises
- `GET /api/exercises/:id` - Get single exercise details

**Program Management**:
- `GET /api/programs/:id` - Get program details
- `PATCH /api/programs/:id/advance-phase` - Advance mesocycle phase
- `PATCH /api/program-exercises/:id` - Update exercise in program
- `PATCH /api/program-exercises/batch-reorder` - Reorder exercises

**VO2max Sessions**:
- `POST /api/vo2max-sessions` - Create VO2max session record
- `GET /api/vo2max-sessions/:userId/history` - Get VO2max progression

**Volume Analytics**:
- `GET /api/analytics/volume-trends?user_id={id}&week={current|YYYY-Www}` - Weekly volume summary

---

## Test Data Seed Scripts

### Create Complete Test User with 4 Weeks of History

```bash
# Run this script to seed a test user with realistic workout history
bash /home/asigator/fitness2025/backend/scripts/seed-test-user-4weeks.sh
```

**Script should create**:
- Test user account (testuser@fitflow.com)
- Default 6-day RP program
- 24 completed workouts (4 weeks × 6 days)
- ~960 logged sets (24 workouts × 40 sets average)
- 8 recovery assessments (2 per week)
- 8 VO2max sessions (2 per week)
- Progressive overload data (weight increases over 4 weeks)

---

**END OF QUICKSTART - COMPLETE MISSING CORE FEATURES**
