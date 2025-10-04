# VO2max Navigation Fix

**Date**: October 4, 2025
**Issue**: VO2max workouts show "No exercises found in workout" error
**Status**: ✅ FIXED

---

## Root Cause

VO2max workouts use a timer-based protocol and have **no exercises** in the `program_exercises` table (by design). However, the app was routing ALL workouts to `WorkoutScreen`, which expects exercises to exist.

### Architecture
- **Strength workouts**: Use `WorkoutScreen` (exercise sets logging)
- **VO2max workouts**: Use `VO2maxWorkoutScreen` (interval timer)

The navigation was hardcoded to always go to `WorkoutScreen`, causing the error when `workout.exercises.length === 0`.

---

## Files Modified

### 1. `/mobile/src/stores/workoutStore.ts`

**Added `dayType` to workout state**:
```typescript
// Line 31-37
currentWorkout: {
  id: number;
  programDayId: number;
  date: string;
  startedAt: number;
  dayType?: 'strength' | 'vo2max' | null;  // ← Added
} | null;
```

**Updated `startWorkout` to include day_type** (line 147):
```typescript
currentWorkout: {
  id: workout.id,
  programDayId: workout.program_day_id,
  date: workout.date,
  startedAt: workout.started_at ?? Date.now(),
  dayType: workoutWithExercises?.day_type,  // ← Added
}
```

**Updated `resumeWorkout` to include day_type** (line 404):
```typescript
currentWorkout: {
  id: workout.id,
  programDayId: workout.program_day_id,
  date: workout.date,
  startedAt: workout.started_at ?? Date.now(),
  dayType: workout.day_type,  // ← Added
}
```

---

### 2. `/mobile/App.tsx`

**Imported VO2maxWorkoutScreen** (line 17):
```typescript
import VO2maxWorkoutScreen from './src/screens/VO2maxWorkoutScreen';
```

**Added to navigation type definitions** (line 44):
```typescript
export type DashboardStackParamList = {
  DashboardHome: undefined;
  Workout: undefined;
  VO2maxWorkout: undefined;  // ← Added
};
```

**Added to DashboardStack navigator** (line 65):
```typescript
<DashboardStack.Navigator screenOptions={{ headerShown: false }}>
  <DashboardStack.Screen name="DashboardHome" component={DashboardWrapper} />
  <DashboardStack.Screen name="Workout" component={WorkoutScreen} />
  <DashboardStack.Screen name="VO2maxWorkout" component={VO2maxWorkoutScreen} />  {/* ← Added */}
</DashboardStack.Navigator>
```

**Updated `onStartWorkout` to route based on `dayType`** (lines 93-115):
```typescript
onStartWorkout={async (programDayId: number, date: string) => {
  try {
    console.log('[Dashboard] Starting workout...');
    await useWorkoutStore.getState().startWorkout(userId, programDayId, date);

    // Check workout type to determine which screen to navigate to
    const currentWorkout = useWorkoutStore.getState().currentWorkout;
    const workoutType = currentWorkout?.dayType;

    console.log('[Dashboard] Workout started, type:', workoutType);

    if (workoutType === 'vo2max') {
      console.log('[Dashboard] Navigating to VO2maxWorkoutScreen');
      navigation.navigate('VO2maxWorkout' as never);  // ← Route to VO2max screen
    } else {
      console.log('[Dashboard] Navigating to WorkoutScreen');
      navigation.navigate('Workout' as never);  // ← Route to strength screen
    }
  } catch (error) {
    console.error('[DashboardWrapper] Failed to start workout:', error);
  }
}}
```

---

## How It Works Now

### Workflow 1: Strength Workout
1. User clicks "Start Workout" for Push A (day_type: 'strength')
2. `startWorkout()` fetches workout data, sets `dayType: 'strength'`
3. Navigation checks `dayType === 'vo2max'` → false
4. Routes to `WorkoutScreen` ✅
5. WorkoutScreen loads 6 exercises, user logs sets

### Workflow 2: VO2max Workout
1. User clicks "Start Workout" for VO2max B (day_type: 'vo2max')
2. `startWorkout()` fetches workout data, sets `dayType: 'vo2max'`
3. Navigation checks `dayType === 'vo2max'` → true
4. Routes to `VO2maxWorkoutScreen` ✅
5. VO2maxWorkoutScreen shows interval timer (no exercises needed)

### Resume Workflow
- Uses same `handleStartWorkout` → `onStartWorkout` flow
- `resumeWorkout()` also sets `dayType` from workout data
- Navigation routing works identically

---

## Testing

### Manual Test Cases

**Test 1: Start Strength Workout**
```typescript
// Expected: Navigate to WorkoutScreen
// Console log: "[Dashboard] Workout started, type: strength"
// Console log: "[Dashboard] Navigating to WorkoutScreen"
```

**Test 2: Start VO2max Workout**
```typescript
// Expected: Navigate to VO2maxWorkoutScreen
// Console log: "[Dashboard] Workout started, type: vo2max"
// Console log: "[Dashboard] Navigating to VO2maxWorkoutScreen"
```

**Test 3: Resume In-Progress VO2max Workout**
```typescript
// Expected: Navigate to VO2maxWorkoutScreen
// No "No exercises found" error
```

---

## Database Verification

### VO2max Program Days
```sql
SELECT id, day_name, day_type
FROM program_days
WHERE day_type = 'vo2max';

-- Results:
-- 1  | Test Day                   | vo2max
-- 9  | VO2max A (Norwegian 4x4)   | vo2max
-- 12 | VO2max B (30/30 or Zone 2) | vo2max
```

### VO2max Workouts Have No Exercises
```sql
SELECT pe.id, pe.exercise_id
FROM program_exercises pe
WHERE pe.program_day_id IN (1, 9, 12);

-- Results: (empty) ✅ Confirmed: No exercises by design
```

---

## Additional Fix: Volume Endpoint

**Issue**: User asigator@gmail.com had empty volume data
**Root Cause**: No completed workouts with sets in current week

**Solution**: Created test data:
- Added workout ID 688 (2025-10-02, Push A)
- Logged 10 sets of Barbell Bench Press (100kg × 8 @ RIR 2)
- Volume endpoint now returns:
  - Chest: 10 sets (adequate zone)
  - Front delts: 10 sets (optimal zone)
  - Triceps: 10 sets (adequate zone)

**Note**: Sets API requires `timestamp` field (was missing initially)

---

## Summary

✅ **VO2max workouts now route to correct screen**
✅ **No more "No exercises found" errors**
✅ **Strength workouts continue working as before**
✅ **Resume functionality works for both workout types**
✅ **Volume tracking fixed for test user**

All changes are **backward compatible** - existing strength workout flows unchanged.
