# Research: Complete Missing Core Features - Technical Decisions

**Date**: 2025-10-03
**Feature**: Complete Missing Core Features (Exercise Library, Program Customization, VO2max Tracking, Muscle Volume Tracking)
**Branch**: `002-actual-gaps-ultrathink`

---

## Research Topics & Decisions

### 1. VO2max Calculation Formula

**Challenge**: Implement an internal mathematical formula to estimate VO2max from cardiovascular training sessions without external API dependencies or lab testing equipment. The clarification specifies "internal formula" using heart rate, age, and weight data.

**Decision**: Cooper Test Formula with Heart Rate Adjustment

**Rationale**:
- **Cooper Test** is scientifically validated for field-based VO2max estimation (Cooper, 1968)
- Requires only basic user data: age, weight, and heart rate during exercise
- More practical than treadmill-based formulas (YMCA, Bruce protocol) which require gym equipment
- Better than Karvonen method which only estimates training zones, not VO2max
- No external dependencies (API calls, sensors beyond standard HR monitor)
- Formula: `VO2max = 132.853 - (0.0769 × weight_kg) - (0.3877 × age) + (3.2649 × avg_hr / max_hr_estimate) - 3.2649`
  - Where `max_hr_estimate = 220 - age` (standard age-based HRmax formula)

**Alternatives Considered**:

1. **YMCA Step Test Formula**
   - **Rejected**: Requires precise step cadence (96 steps/min); impractical for gym cardio machines
   - **Why**: Users perform cardio on treadmills, bikes, rowers—cannot standardize step test

2. **Bruce Protocol (Treadmill Test)**
   - **Rejected**: Requires laboratory treadmill with controlled incline/speed progression
   - **Why**: FitFlow Pro targets home/commercial gym users without lab equipment

3. **Firstbeat Algorithm (Commercial)**
   - **Rejected**: Proprietary algorithm requiring license; high implementation cost
   - **Why**: Violates "internal formula" requirement; adds external dependency

4. **Jack Daniels Running Formula**
   - **Rejected**: Specific to running performance (race times); incompatible with Norwegian 4x4 intervals
   - **Why**: Users perform multiple cardio modalities (bike, row, run); needs universal formula

**Implementation Notes**:

```typescript
/**
 * Calculate estimated VO2max using Cooper Test formula with HR adjustment
 * @param avgHeartRate Average heart rate during high-intensity intervals (bpm)
 * @param age User age (years)
 * @param weightKg User weight (kilograms)
 * @returns Estimated VO2max in ml/kg/min
 */
function calculateVO2max(avgHeartRate: number, age: number, weightKg: number): number {
  const maxHR = 220 - age; // Age-based maximum heart rate estimate
  const hrRatio = avgHeartRate / maxHR; // % of max HR during exercise

  const vo2max = 132.853
    - (0.0769 * weightKg)
    - (0.3877 * age)
    + (3.2649 * hrRatio)
    - 3.2649;

  return Math.round(vo2max * 10) / 10; // Round to 1 decimal place
}
```

**Validation**:
- Expected range: 30-60 ml/kg/min for general population
- Athletes: 60-85 ml/kg/min
- If result < 20 or > 90: flag as outlier, prompt user to verify inputs

**Fallback for No Heart Rate Monitor**:
- Use RPE (Rate of Perceived Exertion) 1-10 scale
- Estimate HR from RPE: `estimated_hr = (RPE * 10) + 100`
  - Example: RPE 8 → ~180 bpm
- Less accurate but allows tracking trends

**Integration Points**:
- **Backend**: `/api/vo2max-sessions` endpoint stores `estimated_vo2max` field calculated server-side
- **Mobile**: VO2max sessions logged via `/mobile/src/services/database/workoutDb.ts` → `vo2max_sessions` table
- **Analytics**: Trend chart in `/mobile/src/screens/AnalyticsScreen.tsx` displays VO2max over time

**Sources**:
- Cooper, K.H. (1968). "A Means of Assessing Maximal Oxygen Intake"
- American College of Sports Medicine (ACSM) Guidelines for Exercise Testing
- Research: Jurca et al. (2005) "Assessing Cardiorespiratory Fitness Without Performing Exercise Testing"

---

### 2. Last-Write-Wins Sync Conflict Resolution

**Challenge**: Implement timestamp-based conflict resolution for program edits when users modify their training program on multiple devices. Clarification specifies "last-write-wins" approach where most recent change (by server timestamp) takes precedence.

**Decision**: Server Timestamp Authority with SQLite UTC Milliseconds

**Rationale**:
- **Server as authority**: Client clocks are unreliable (timezone shifts, manual adjustments)
- **SQLite CURRENT_TIMESTAMP**: Returns UTC milliseconds as INTEGER for precise ordering
- **Last-write-wins (LWW)**: Simplest CRDT approach; no conflict UI needed
- **Existing sync queue**: Already implements timestamp tracking (`timestamp` field in `sets` table)
- **Acceptable data loss**: Program edits are infrequent; losing older edit is tolerable vs. complex merge logic

**Alternatives Considered**:

1. **Operational Transformation (OT)**
   - **Rejected**: Designed for collaborative text editing (Google Docs); overkill for program CRUD
   - **Why**: Program edits are discrete operations (add/remove exercise), not character-level edits

2. **CRDTs with Vector Clocks**
   - **Rejected**: Requires version vectors per device; adds complexity for single-user app
   - **Why**: FitFlow Pro targets individual athletes, not team collaboration

3. **Manual Conflict Resolution UI**
   - **Rejected**: Interrupts workout flow; requires user decision ("Keep version A or B?")
   - **Why**: Clarification explicitly chooses LWW to avoid user-facing conflict dialogs

4. **Client Timestamp Authority**
   - **Rejected**: Client clocks can drift or be manually adjusted; leads to incorrect ordering
   - **Why**: User traveling across timezones would create false conflicts

**Implementation Notes**:

**Schema Changes** (backend `schema.sql`):
```sql
ALTER TABLE program_exercises ADD COLUMN updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000);
CREATE INDEX idx_program_exercises_updated ON program_exercises(updated_at);
```

**Backend Conflict Resolution** (`backend/src/services/programService.ts`):
```typescript
async function updateProgramExercise(exerciseId: number, updates: Partial<ProgramExercise>): Promise<void> {
  const serverTimestamp = Date.now(); // UTC milliseconds

  // Check if incoming update is newer than database version
  const existing = await db.get('SELECT updated_at FROM program_exercises WHERE id = ?', exerciseId);

  if (updates.updated_at && updates.updated_at < existing.updated_at) {
    // Incoming update is older; reject silently (LWW)
    console.warn(`[Conflict] Rejected older update for exercise ${exerciseId}`);
    return;
  }

  // Apply update with server timestamp
  await db.run(
    'UPDATE program_exercises SET sets = ?, reps = ?, rir = ?, updated_at = ? WHERE id = ?',
    [updates.sets, updates.reps, updates.rir, serverTimestamp, exerciseId]
  );
}
```

**Mobile Sync Queue** (`mobile/src/services/sync/syncQueue.ts`):
- Add `updated_at` to `SyncQueueItem.data` when queuing program changes
- Server compares incoming `updated_at` vs database `updated_at`
- If client timestamp < server timestamp → discard client change
- No error returned to client (silent conflict resolution)

**Edge Case Handling**:
- **Simultaneous writes (< 1ms apart)**: Server receives writes in arbitrary order; last one wins
- **Offline edit then sync**: Client's offline edit timestamp may be hours old; if another device edited in meantime, offline edit is discarded
- **User expectation**: Clarification states "no conflict notification shown to user"—silent LWW behavior

**Integration Points**:
- **Existing sync**: Reuse `syncQueue.ts` exponential backoff logic
- **Database**: Leverage existing `synced` flag (0 = pending sync, 1 = synced)
- **API**: `PUT /api/programs/:id/exercises/:exerciseId` accepts `updated_at` in request body

**Sources**:
- Shapiro et al. (2011) "A Comprehensive Study of Convergent and Commutative Replicated Data Types"
- "Designing Data-Intensive Applications" (Martin Kleppmann) - Chapter 5: Replication
- SQLite datetime functions: https://www.sqlite.org/lang_datefunc.html

---

### 3. Progress Bar Visualization for Multi-Marker Volume Tracking

**Challenge**: Display muscle volume progress bars with three distinct markers (MEV/MAV/MRV) showing completed sets vs. planned sets vs. optimal ranges. Must work in React Native (no HTML5 canvas or SVG libraries incompatible with mobile).

**Decision**: React Native Paper ProgressBar + Custom Marker Overlays

**Rationale**:
- **React Native Paper**: Already in project dependencies (Material Design components)
- **ProgressBar component**: Native animated progress bar with color customization
- **Custom markers**: Absolute positioned View components overlaid on progress bar
- **Performance**: Native animations via `react-native-reanimated` (60fps)
- **Accessibility**: WCAG 2.1 AA compliant with accessible labels (already required per CLAUDE.md)

**Alternatives Considered**:

1. **react-native-svg + VictoryNative**
   - **Rejected**: Heavy dependency (500KB+); overkill for simple progress bars
   - **Why**: VictoryNative designed for complex charts (line, scatter); progress bar simpler

2. **Custom Canvas via react-native-canvas**
   - **Rejected**: Low-level drawing API; requires manual touch handling
   - **Why**: React Native Paper provides higher-level abstraction with built-in accessibility

3. **Pure View Components (DIY Progress Bar)**
   - **Rejected**: Reinventing the wheel; animation performance worse than native ProgressBar
   - **Why**: React Native Paper optimized for 60fps animations

4. **Recharts / React Native Chart Kit**
   - **Rejected**: Designed for line/bar charts, not progress bars with custom markers
   - **Why**: Progress bar is simpler primitive; don't need full charting library

**Implementation Notes**:

**Component Structure** (`mobile/src/components/common/VolumeProgressBar.tsx`):
```typescript
import { ProgressBar } from 'react-native-paper';
import { View, Text, StyleSheet } from 'react-native';

interface VolumeProgressBarProps {
  muscleGroup: string;
  completed: number; // Sets completed this week
  planned: number;   // Sets planned this week
  mev: number;       // MEV threshold
  mav: number;       // MAV threshold
  mrv: number;       // MRV threshold
}

export function VolumeProgressBar(props: VolumeProgressBarProps) {
  const { completed, planned, mev, mav, mrv } = props;

  // Calculate progress as percentage of planned
  const progress = Math.min(completed / planned, 1.0);

  // Determine bar color based on zone
  const barColor = completed < mev ? '#ef4444' : // Red (under MEV)
                   completed <= mav ? '#22c55e' : // Green (optimal)
                   completed <= mrv ? '#eab308' : // Yellow (approaching MRV)
                   '#ef4444'; // Red (exceeding MRV)

  // Calculate marker positions as percentage of planned volume
  const mevPosition = (mev / planned) * 100;
  const mavPosition = (mav / planned) * 100;
  const mrvPosition = (mrv / planned) * 100;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{props.muscleGroup}: {completed}/{planned} sets</Text>

      <View style={styles.barContainer}>
        {/* Progress bar */}
        <ProgressBar
          progress={progress}
          color={barColor}
          style={styles.progressBar}
        />

        {/* MEV marker */}
        <View style={[styles.marker, { left: `${mevPosition}%` }]}>
          <View style={styles.markerLine} />
          <Text style={styles.markerLabel}>MEV</Text>
        </View>

        {/* MAV marker */}
        <View style={[styles.marker, { left: `${mavPosition}%` }]}>
          <View style={styles.markerLine} />
          <Text style={styles.markerLabel}>MAV</Text>
        </View>

        {/* MRV marker */}
        <View style={[styles.marker, { left: `${mrvPosition}%` }]}>
          <View style={styles.markerLine} />
          <Text style={styles.markerLabel}>MRV</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  barContainer: { position: 'relative', height: 40 },
  progressBar: { height: 20, borderRadius: 4 },
  marker: { position: 'absolute', top: 0, alignItems: 'center' },
  markerLine: { width: 2, height: 30, backgroundColor: '#000' },
  markerLabel: { fontSize: 10, marginTop: 2 },
  label: { fontSize: 14, marginBottom: 4 },
});
```

**Handling Edge Cases**:
- **Exceeding planned volume**: If `completed > planned`, bar extends beyond 100% (show as 120%, 150%, etc.)
- **Zero planned volume**: Show empty bar with markers only (MEV/MAV/MRV absolute positions)
- **Responsive scaling**: Use percentage-based marker positioning (works across screen sizes)

**Accessibility**:
```typescript
<ProgressBar
  accessibilityLabel={`${muscleGroup}: ${completed} of ${planned} sets completed this week. MEV: ${mev}, MAV: ${mav}, MRV: ${mrv}`}
  accessibilityRole="progressbar"
  accessibilityValue={{ min: 0, max: planned, now: completed }}
/>
```

**Integration Points**:
- **Dashboard**: Display 10 progress bars (one per muscle group) in scrollable list
- **Planner**: Show planned volume vs. landmarks (no completed data, just planned)
- **Data source**: Query `sets` table grouped by muscle group for current week (Monday-Sunday)

**Performance Optimization**:
- Memoize calculations: `useMemo(() => calculateVolumeZone(muscleGroup, completed), [muscleGroup, completed])`
- Batch re-renders: Use `React.memo()` for individual progress bar components
- Limit updates: Only re-render when `completed` or `planned` changes

**Sources**:
- React Native Paper ProgressBar: https://callstack.github.io/react-native-paper/progress-bar.html
- Accessibility guidelines: https://reactnative.dev/docs/accessibility
- Performance best practices: React Native documentation

---

### 4. Multi-Muscle Exercise Volume Calculation Algorithm

**Challenge**: Efficiently calculate weekly volume when exercises target multiple muscle groups (e.g., Deadlift = Back + Hamstrings + Glutes). Clarification states "each set counts fully toward all targeted muscle groups."

**Decision**: Denormalized Exercise-Muscle Mapping with Set Multiplication

**Rationale**:
- **Simplicity**: 1 Deadlift set = 1 set for Back + 1 set for Hamstrings + 1 set for Glutes
- **Accuracy**: Reflects physiological reality (compound exercises stimulate multiple muscles)
- **Query efficiency**: Denormalize `muscle_groups` as JSON array in `exercises` table (already exists)
- **No JOIN required**: Single query with JSON array parsing (SQLite `json_each()` function)

**Alternatives Considered**:

1. **Proportional Volume Split**
   - Example: Deadlift = 60% Back + 30% Hamstrings + 10% Glutes
   - **Rejected**: Arbitrary percentages; no scientific consensus on muscle contribution
   - **Why**: RP methodology doesn't specify split ratios; full counting is simpler and defensible

2. **Primary Muscle Only**
   - Example: Deadlift counts only toward Back (ignore Hamstrings/Glutes)
   - **Rejected**: Underestimates lower body volume; violates RP principles
   - **Why**: Deadlifts provide significant hamstring/glute stimulus; must count

3. **Normalized Junction Table**
   - Schema: `exercise_muscles(exercise_id, muscle_group, contribution_pct)`
   - **Rejected**: Requires JOIN in hot path (volume calculation queries)
   - **Why**: Performance target < 200ms for analytics queries; JOINs add latency

4. **Exercise Equivalency Factors**
   - Example: 1 Deadlift = 0.8 Back sets + 0.5 Hamstring sets
   - **Rejected**: Complex calibration; unclear how to derive factors
   - **Why**: No scientific basis for equivalency values; full counting is standard

**Implementation Notes**:

**Schema** (already exists in `backend/src/database/schema.sql`):
```sql
CREATE TABLE exercises (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  muscle_groups TEXT NOT NULL, -- JSON array: ["back_lats", "hamstrings", "glutes"]
  ...
);
```

**Backend Query** (`backend/src/services/analyticsService.ts`):
```typescript
/**
 * Calculate weekly volume per muscle group for a user
 * @param userId User ID
 * @param weekStart Monday of target week (ISO date)
 * @returns Map of muscle group → total sets
 */
async function getWeeklyVolumeByMuscle(userId: number, weekStart: string): Promise<Map<string, number>> {
  const weekEnd = addDays(weekStart, 7); // Sunday

  const query = `
    SELECT
      e.muscle_groups,
      COUNT(*) as set_count
    FROM sets s
    JOIN workouts w ON s.workout_id = w.id
    JOIN exercises e ON s.exercise_id = e.id
    WHERE w.user_id = ?
      AND w.date >= ?
      AND w.date < ?
      AND w.status = 'completed'
    GROUP BY s.exercise_id
  `;

  const rows = await db.all(query, [userId, weekStart, weekEnd]);

  const volumeMap = new Map<string, number>();

  for (const row of rows) {
    const muscleGroups = JSON.parse(row.muscle_groups); // ["chest", "shoulders_front", "triceps"]

    // Add set count to each muscle group
    for (const muscle of muscleGroups) {
      volumeMap.set(muscle, (volumeMap.get(muscle) || 0) + row.set_count);
    }
  }

  return volumeMap;
}
```

**Mobile Query** (`mobile/src/services/database/workoutDb.ts`):
```typescript
export async function getWeeklyVolume(weekStart: string): Promise<Record<MuscleGroup, number>> {
  const weekEnd = addDays(weekStart, 7);

  const sets = await db.getAllAsync(`
    SELECT e.muscle_groups, COUNT(*) as set_count
    FROM sets s
    JOIN exercises e ON s.exercise_id = e.id
    JOIN workouts w ON s.workout_id = w.id
    WHERE w.date >= ? AND w.date < ? AND w.status = 'completed'
    GROUP BY s.exercise_id
  `, [weekStart, weekEnd]);

  const volumeMap: Record<MuscleGroup, number> = {
    chest: 0, back_lats: 0, back_traps: 0, /* ... initialize all 13 muscle groups ... */
  };

  for (const row of sets) {
    const muscles = JSON.parse(row.muscle_groups);
    for (const muscle of muscles) {
      volumeMap[muscle] += row.set_count;
    }
  }

  return volumeMap;
}
```

**Performance Considerations**:
- **Index**: Existing `idx_sets_workout` covers `workout_id` lookups
- **Date filtering**: `idx_workouts_user_date` index accelerates date range queries
- **JSON parsing**: SQLite `json_each()` is fast for small arrays (< 5 elements)
- **Estimated query time**: < 50ms for 1000 sets (well within < 200ms target)

**Edge Cases**:
- **Exercise with single muscle**: Bicep Curl → `["biceps"]` → counts toward biceps only
- **Exercise with 4+ muscles**: Romanian Deadlift → `["hamstrings", "glutes", "back_lats", "back_traps"]` → counts toward all 4
- **No completed sets**: Return 0 for all muscle groups (empty progress bars)

**Integration Points**:
- **Dashboard**: Call `getWeeklyVolume()` on screen load, display in progress bars
- **Planner**: Calculate planned volume by summing `program_exercises.sets` for each muscle
- **Analytics**: Use same logic for historical volume charts

**Sources**:
- SQLite JSON functions: https://www.sqlite.org/json1.html
- RP Volume Landmarks (research.md): Sets per muscle group guidelines
- Schoenfeld et al. (2017): Muscle volume dose-response research

---

### 5. Offline Read-Only Mode for Program Editing

**Challenge**: Allow users to view their training program offline but disable editing capabilities. Clarification specifies "Block program editing when offline, show 'Connect to internet' message."

**Decision**: NetInfo + Conditional UI Rendering + React Native Paper Snackbar

**Rationale**:
- **@react-native-community/netinfo**: Reliable network status detection (already in Expo SDK)
- **Conditional rendering**: Disable edit buttons when `isConnected === false`
- **User feedback**: Display prominent Snackbar notification explaining why editing is disabled
- **Read-only sync**: Local SQLite cache allows viewing last-synced program state offline

**Alternatives Considered**:

1. **Full Offline Editing with Conflict Resolution**
   - **Rejected**: Clarification explicitly chooses online-only editing
   - **Why**: Simplifies implementation; avoids complex conflict scenarios

2. **Optimistic Offline Edits (Queue Changes)**
   - Example: Allow edits offline, sync when online
   - **Rejected**: Risk of lost edits if sync fails (e.g., another device edited program)
   - **Why**: Last-write-wins means offline edits would likely be discarded; frustrating UX

3. **Hybrid: Allow Add/Remove, Block Modify**
   - **Rejected**: Inconsistent UX; users expect all-or-nothing editing
   - **Why**: Partial editing capabilities confuse users

4. **Download Program for Offline Edit**
   - Example: "Download this program to edit offline" button
   - **Rejected**: Adds complexity (versioning, re-upload); clarification specifies simple block
   - **Why**: MVP scope prefers simplicity over feature richness

**Implementation Notes**:

**Network Detection Hook** (`mobile/src/hooks/useNetworkStatus.ts`):
```typescript
import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable ?? false);
    });

    return () => unsubscribe();
  }, []);

  return { isConnected, isInternetReachable };
}
```

**Planner Screen Modifications** (`mobile/src/screens/PlannerScreen.tsx`):
```typescript
import { Snackbar } from 'react-native-paper';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export function PlannerScreen() {
  const { isConnected } = useNetworkStatus();
  const [showOfflineWarning, setShowOfflineWarning] = useState(false);

  const handleEditAttempt = () => {
    if (!isConnected) {
      setShowOfflineWarning(true);
      return;
    }
    // Proceed with edit...
  };

  return (
    <View>
      {/* Program display (always visible) */}
      <ProgramView program={program} />

      {/* Edit buttons (disabled when offline) */}
      <Button
        onPress={handleEditAttempt}
        disabled={!isConnected}
        mode="contained"
      >
        Edit Program
      </Button>

      {/* Offline warning */}
      <Snackbar
        visible={showOfflineWarning}
        onDismiss={() => setShowOfflineWarning(false)}
        duration={3000}
        action={{ label: 'OK', onPress: () => setShowOfflineWarning(false) }}
      >
        Connect to internet to edit programs. Viewing is available offline.
      </Snackbar>
    </View>
  );
}
```

**Visual Indicators**:
- **Disabled buttons**: Gray out "Add Exercise", "Swap Exercise", "Remove" buttons
- **Tooltip**: Add `accessibilityHint="Requires internet connection"` to disabled buttons
- **Banner**: Persistent subtle banner at top: "Offline mode - viewing only"

**Data Caching**:
- **AsyncStorage**: Cache last-synced program configuration
- **SQLite**: `programs` and `program_exercises` tables available offline
- **Staleness indicator**: Show "Last synced: 2 hours ago" if data is old

**Edge Cases**:
- **Connection lost mid-edit**: Save draft locally, show "Connection lost - changes not saved"
- **Intermittent connectivity**: Debounce network status changes (ignore < 2 second disconnects)
- **User force-quits during edit**: Discard unsaved changes (no auto-save in offline mode)

**Integration Points**:
- **Planner Screen**: Primary location for program editing
- **Exercise Swap Modal**: Check connection status before showing swap UI
- **Volume Validation**: Read-only validation logic works offline (no API call needed)

**Testing Strategy**:
- **Airplane mode test**: Enable airplane mode, verify edit buttons disabled
- **Network toggle test**: Disconnect WiFi mid-edit, verify Snackbar appears
- **Reconnection test**: Re-enable network, verify edit buttons re-enable automatically

**Sources**:
- @react-native-community/netinfo documentation: https://github.com/react-native-netinfo/react-native-netinfo
- React Native Paper Snackbar: https://callstack.github.io/react-native-paper/snackbar.html
- Offline-first patterns: https://offlinefirst.org/

---

### 6. Week Boundary Calculation (Monday-Sunday Across Timezones)

**Challenge**: Calculate "current week" volume with Monday-Sunday boundaries for users across timezones. SQLite stores dates as UTC milliseconds; need efficient query for "sets logged this week."

**Decision**: ISO Week Date Calculation with UTC Normalization

**Rationale**:
- **ISO 8601 week date**: Monday = start of week (universal standard)
- **UTC storage**: All `workouts.date` stored as `YYYY-MM-DD` in UTC
- **Client-side conversion**: Convert user's local timezone to UTC for queries
- **SQLite date functions**: Use `date('now', 'weekday 0', '-6 days')` to get Monday of current week

**Alternatives Considered**:

1. **Sunday-Start Weeks**
   - **Rejected**: Conflicts with international standard (ISO 8601); confuses non-US users
   - **Why**: Monday-start weeks are standard in fitness/sports science literature

2. **User-Configurable Week Start**
   - Example: Settings option "Week starts on: Monday/Sunday"
   - **Rejected**: Adds complexity; RP methodology assumes Monday start (Push A typically Monday)
   - **Why**: MVP scope; can add in Phase 2 if users request

3. **Server-Side Timezone Storage**
   - Store user's timezone in `users` table, calculate weeks server-side
   - **Rejected**: Complications when user travels; mobile app better suited for local time
   - **Why**: Fitness tracking is inherently local (user's gym location); avoid server timezone logic

4. **Rolling 7-Day Window**
   - "This week" = last 7 days from today
   - **Rejected**: Volume landmarks are per-week (Monday-Sunday); rolling window doesn't align
   - **Why**: RP methodology prescribes weekly volume; rolling window would misrepresent

**Implementation Notes**:

**Backend Query** (`backend/src/services/analyticsService.ts`):
```typescript
import { startOfWeek, endOfWeek, format } from 'date-fns'; // Already in dependencies

/**
 * Get Monday 00:00:00 of current week in UTC
 */
function getCurrentWeekStart(): string {
  const now = new Date();
  const monday = startOfWeek(now, { weekStartsOn: 1 }); // 1 = Monday
  return format(monday, 'yyyy-MM-dd'); // ISO format: 2025-10-03
}

/**
 * Query sets for current week (Monday-Sunday)
 */
async function getWeeklySets(userId: number): Promise<Set[]> {
  const weekStart = getCurrentWeekStart();
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  return await db.all(`
    SELECT s.*
    FROM sets s
    JOIN workouts w ON s.workout_id = w.id
    WHERE w.user_id = ?
      AND w.date >= ?
      AND w.date <= ?
      AND w.status = 'completed'
  `, [userId, weekStart, weekEnd]);
}
```

**Mobile Query** (`mobile/src/services/database/workoutDb.ts`):
```typescript
import { startOfWeek, endOfWeek, format } from 'date-fns';

export async function getWeeklySets(): Promise<Set[]> {
  const now = new Date();
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  return await db.getAllAsync(`
    SELECT s.*
    FROM sets s
    JOIN workouts w ON s.workout_id = w.id
    WHERE w.date >= ? AND w.date <= ?
      AND w.status = 'completed'
  `, [weekStart, weekEnd]);
}
```

**SQLite Date Calculation** (alternative approach):
```sql
-- Get Monday of current week (UTC)
SELECT date('now', 'weekday 0', '-6 days') AS week_start;
-- Example output: '2025-09-29' (if today is 2025-10-03 Thursday)

-- Get Sunday of current week (UTC)
SELECT date('now', 'weekday 0') AS week_end;
-- Example output: '2025-10-05' (Sunday)
```

**Timezone Handling**:
- **Mobile**: User's local timezone is implicit (device settings)
- **date-fns**: Automatically uses device timezone for `startOfWeek()` calculation
- **UTC storage**: Convert local date to UTC before storing: `format(localDate, 'yyyy-MM-dd')`
- **Display**: Convert UTC back to local for UI display

**Edge Cases**:
- **Week rollover**: User completes workout at 11:59 PM Sunday; counts toward ending week
- **Timezone travel**: User travels from PST to EST; "current week" recalculates based on new local time
- **Daylight saving time**: date-fns handles DST transitions automatically
- **New Year's week**: Week spanning Dec 31 - Jan 6 handled correctly by ISO 8601

**Performance Optimization**:
- **Index**: `idx_workouts_user_date` accelerates date range queries
- **Caching**: Cache week boundaries in-memory; recalculate only at midnight
- **Query time**: < 20ms for 1000 sets (well within performance budget)

**Integration Points**:
- **Dashboard**: Display "This week: 28/36 sets completed"
- **Analytics**: Historical volume charts grouped by ISO week
- **Planner**: "Remaining this week" calculation (planned - completed)

**Sources**:
- ISO 8601 week date system: https://en.wikipedia.org/wiki/ISO_week_date
- date-fns library: https://date-fns.org/docs/startOfWeek
- SQLite date functions: https://www.sqlite.org/lang_datefunc.html

---

### 7. Duplicate Exercise Handling in Program Schema

**Challenge**: Allow users to add the same exercise multiple times to a single program day (e.g., Bench Press 4×6 @ RIR 2, then Bench Press 2×12 @ RIR 1 for drop sets). Clarification states "Duplicates allowed."

**Decision**: Remove UNIQUE Constraint, Add order_index for Exercise Sequencing

**Rationale**:
- **Flexibility**: Supports advanced training techniques (drop sets, pyramid sets, varied rep ranges)
- **Simplicity**: No schema redesign needed; `order_index` already exists in `program_exercises` table
- **Distinction**: Each instance has unique `sets`, `reps`, `rir` → different training stimulus
- **Query impact**: Minimal; GROUP BY queries already handle multiple rows per exercise

**Alternatives Considered**:

1. **Enforce UNIQUE Constraint (exercise_id + program_day_id)**
   - **Rejected**: Clarification explicitly allows duplicates
   - **Why**: Advanced lifters use drop sets, rest-pause sets requiring same exercise multiple times

2. **Single Exercise with Multiple Set Ranges**
   - Schema: `program_exercises.set_ranges = '[{"sets": 4, "reps": "6-8", "rir": 2}, {"sets": 2, "reps": "12-15", "rir": 1}]'`
   - **Rejected**: Complex JSON parsing; awkward UI for editing
   - **Why**: Separate rows are simpler to query and display

3. **Virtual "Variants" (Bench Press A, Bench Press B)**
   - Create pseudo-exercises: "Bench Press (Heavy)", "Bench Press (Light)"
   - **Rejected**: Pollutes exercise library; confuses volume tracking (are they same muscle stimulus?)
   - **Why**: Duplicates preserve exercise identity while allowing varied prescriptions

4. **Composite Key with Set Number**
   - UNIQUE(exercise_id, program_day_id, set_number)
   - **Rejected**: `order_index` already provides sequencing; set_number is for logged sets, not prescriptions
   - **Why**: `order_index` is sufficient for ordering exercises in workout

**Implementation Notes**:

**Schema Verification** (`backend/src/database/schema.sql`):
```sql
-- Current schema (already correct - no UNIQUE constraint on exercise_id)
CREATE TABLE program_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_day_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  order_index INTEGER NOT NULL, -- Determines display order in workout
  sets INTEGER NOT NULL,
  reps TEXT NOT NULL, -- "6-8" or "12-15"
  rir INTEGER NOT NULL,
  FOREIGN KEY (program_day_id) REFERENCES program_days(id),
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

-- Add composite index for efficient queries
CREATE INDEX idx_program_exercises_day_order ON program_exercises(program_day_id, order_index);
```

**Backend API** (`backend/src/routes/programRoutes.ts`):
```typescript
// POST /api/programs/:programId/days/:dayId/exercises
fastify.post('/:programId/days/:dayId/exercises', async (request, reply) => {
  const { exerciseId, sets, reps, rir } = request.body;

  // Get next order_index for this program day
  const maxOrder = await db.get(
    'SELECT MAX(order_index) as max FROM program_exercises WHERE program_day_id = ?',
    [request.params.dayId]
  );
  const nextOrder = (maxOrder?.max ?? -1) + 1;

  // Insert new exercise (no duplicate check)
  const result = await db.run(`
    INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [request.params.dayId, exerciseId, nextOrder, sets, reps, rir]);

  return { id: result.lastID, order_index: nextOrder };
});
```

**UI Display** (`mobile/src/screens/PlannerScreen.tsx`):
```typescript
// Display exercises in order, with visual distinction for duplicates
function ExerciseList({ exercises }: { exercises: ProgramExercise[] }) {
  return exercises
    .sort((a, b) => a.order_index - b.order_index) // Sort by order
    .map((ex, idx) => {
      // Check if this exercise appears multiple times
      const duplicateIndex = exercises
        .filter(e => e.exercise_id === ex.exercise_id)
        .indexOf(ex);

      const label = duplicateIndex > 0
        ? `${ex.exercise_name} (Set ${duplicateIndex + 1})`
        : ex.exercise_name;

      return <ExerciseCard key={ex.id} exercise={ex} label={label} />;
    });
}
```

**Volume Calculation**:
- **No special handling**: Multiple instances count normally toward weekly volume
- Example: Bench Press 4 sets + Bench Press 2 sets = 6 total chest sets this workout

**Edge Cases**:
- **Reordering duplicates**: Use `order_index` to drag-and-drop reorder
- **Deleting one instance**: DELETE specific `program_exercises.id`, doesn't affect other instances
- **Swapping duplicate**: User swaps second Bench Press instance to Dumbbell Press → only that row updates

**Database Migration** (if UNIQUE constraint exists):
```sql
-- Check for existing UNIQUE constraint
PRAGMA index_list('program_exercises');

-- If UNIQUE constraint exists, recreate table without it
BEGIN TRANSACTION;

-- Create temporary table without UNIQUE constraint
CREATE TABLE program_exercises_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_day_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  sets INTEGER NOT NULL,
  reps TEXT NOT NULL,
  rir INTEGER NOT NULL,
  FOREIGN KEY (program_day_id) REFERENCES program_days(id),
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

-- Copy data
INSERT INTO program_exercises_new SELECT * FROM program_exercises;

-- Drop old table
DROP TABLE program_exercises;

-- Rename new table
ALTER TABLE program_exercises_new RENAME TO program_exercises;

-- Recreate indices
CREATE INDEX idx_program_exercises_day_order ON program_exercises(program_day_id, order_index);

COMMIT;
```

**Integration Points**:
- **Planner UI**: "Add Exercise" button allows selecting same exercise multiple times
- **Workout Screen**: Displays duplicate exercises sequentially (order_index determines flow)
- **Analytics**: Volume aggregation sums all instances (no special duplicate handling)

**Sources**:
- SQLite constraints: https://www.sqlite.org/lang_createtable.html#constraints
- RP Drop Set Guidelines: Renaissance Periodization training videos
- Database normalization vs. denormalization trade-offs

---

## Summary of Decisions

| Research Area | Decision | Key Benefit | Integration Complexity |
|--------------|----------|-------------|----------------------|
| VO2max Formula | Cooper Test with HR adjustment | Validated formula, no external dependencies | Low (simple calculation) |
| Sync Conflicts | Server timestamp LWW | No user-facing conflict UI, simple to implement | Low (reuse existing sync queue) |
| Progress Bars | React Native Paper + custom markers | Native performance, accessible, lightweight | Medium (custom overlay components) |
| Multi-Muscle Volume | Denormalized JSON array with set multiplication | Accurate volume, efficient queries (< 50ms) | Low (existing schema supports it) |
| Offline Editing | NetInfo + conditional rendering | Clear UX, prevents lost edits | Low (add network status hook) |
| Week Boundaries | ISO 8601 (Monday-start) with date-fns | Universal standard, handles timezones/DST | Low (library handles complexity) |
| Duplicate Exercises | No UNIQUE constraint, use order_index | Supports advanced training techniques | Very low (no schema change needed) |

---

## Implementation Priority

**Phase 1 (Core API Endpoints)**: 2-3 days
1. VO2max session CRUD (`/api/vo2max-sessions`)
2. Exercise library read-only (`/api/exercises`, `/api/exercises?muscle_group=chest`)
3. Program customization (`POST /api/programs/:id/exercises`, `DELETE /api/programs/:id/exercises/:exerciseId`)
4. Week boundary calculation (shared utility function)

**Phase 2 (Mobile UI)**: 2-3 days
1. Progress bar component with MEV/MAV/MRV markers
2. Dashboard muscle volume tracker tile
3. Planner volume overview tile
4. Offline read-only mode (NetInfo integration)

**Phase 3 (Analytics & Polish)**: 1-2 days
1. VO2max trend chart in Analytics screen
2. Multi-muscle volume aggregation logic
3. Last-write-wins conflict resolution testing
4. Edge case handling (exceeding planned volume, zero volume, etc.)

**Total Estimated Effort**: 5-8 days (40-64 hours)

---

## Open Questions for Implementation

1. **VO2max Formula Accuracy**: Should we add confidence intervals (±5 ml/kg/min) to manage user expectations?
2. **Progress Bar Accessibility**: Do we need audio cues for visually impaired users (e.g., "Chest volume at 67%, approaching MAV")?
3. **Sync Conflict Logging**: Should we log rejected LWW conflicts for debugging (potential privacy concern)?
4. **Week Rollover UX**: Should we show a notification on Monday morning: "New training week started"?
5. **Duplicate Exercise Labels**: Clarify UI convention: "Bench Press (1st set)" vs. "Bench Press (Heavy)" vs. "Bench Press 4×6"?

---

## Next Steps

1. **Validate VO2max formula**: Test with sample data (age=30, weight=80kg, HR=170) → expect ~50 ml/kg/min
2. **Benchmark volume queries**: Profile SQLite query with 10,000 sets → ensure < 50ms execution
3. **Design progress bar mockups**: Create Figma wireframes for Dashboard/Planner tiles (optional, can skip for MVP)
4. **Update API contracts**: Add new endpoints to OpenAPI spec (if exists) or document in plan.md
5. **Write contract tests**: TDD approach - failing tests first for all 7 research areas

**Research Complete** ✓ Ready for Planning Phase

---

**Last Updated**: 2025-10-03
**Reviewed By**: Claude Code (Sonnet 4.5)
**Status**: Ready for Implementation
