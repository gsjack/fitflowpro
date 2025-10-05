# FitFlow Pro - Mobile App

React Native mobile application for evidence-based fitness training (Renaissance Periodization methodology).

**Version**: 1.0.0
**Platform**: iOS, Android, Web
**Framework**: React Native (Expo SDK 54+)
**Navigation**: Expo Router (file-based routing)

---

## Quick Start

### Prerequisites

- Node.js 20 LTS
- npm 10+
- Expo CLI (installed automatically)

### Installation

```bash
cd mobile
npm install
```

### Environment Setup

Create `.env` file:

```env
# Backend API URL
EXPO_PUBLIC_API_URL=http://localhost:3000

# For physical device testing (replace with your local IP)
# EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

**CRITICAL**:
- Expo only loads env vars with `EXPO_PUBLIC_` prefix at runtime
- After changing `.env`, restart with cache clear: `npx expo start -c`
- Verify env var is loaded: Look for `env: export EXPO_PUBLIC_API_URL` in console output

### Running the App

```bash
# Start Expo dev server
npm run dev

# Or with cache clear (required after .env changes)
npx expo start -c
```

**Testing on Physical Devices**:
1. Set `EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:3000` in `.env`
2. Restart Expo with cache clear: `npx expo start -c`
3. Scan QR code with Expo Go app (iOS/Android)
4. Verify backend logs show requests from device IP

---

## Navigation (Expo Router)

### File-Based Routing

```
app/
├── _layout.tsx                    # Root layout (auth protection)
├── (auth)/
│   ├── _layout.tsx               # Auth stack layout
│   ├── login.tsx                 # /login route
│   └── register.tsx              # /register route
└── (tabs)/
    ├── _layout.tsx               # Bottom tab layout
    ├── index.tsx                 # / (Dashboard)
    ├── workout.tsx               # /workout
    ├── vo2max-workout.tsx        # /vo2max-workout (hidden from tabs)
    ├── analytics.tsx             # /analytics
    ├── planner.tsx               # /planner
    └── settings.tsx              # /settings
```

### Usage Patterns

**Navigate to a screen**:
```tsx
import { useRouter } from 'expo-router';

const router = useRouter();
router.push('/workout');
router.push({ pathname: '/workout', params: { workoutId: 123 } });
```

**Go back**:
```tsx
router.back();
```

**Replace route** (no back navigation):
```tsx
router.replace('/(tabs)'); // Replace with dashboard
```

**Access route params**:
```tsx
import { useLocalSearchParams } from 'expo-router';

const { workoutId } = useLocalSearchParams();
```

**Link between screens**:
```tsx
import { Link } from 'expo-router';

<Link href="/(auth)/register">
  <Text>Don't have an account? Register</Text>
</Link>
```

### Auth Protection

Root layout (`app/_layout.tsx`) automatically redirects:
- Unauthenticated users → `/login`
- Authenticated users on auth routes → `/(tabs)` (dashboard)

Auth state managed by `useAuthStore()` (Zustand).

### Web Support

**URL Routing**: File paths map directly to URLs
- `app/(tabs)/index.tsx` → `http://localhost:8081/`
- `app/(tabs)/workout.tsx` → `http://localhost:8081/workout`
- `app/(auth)/login.tsx` → `http://localhost:8081/login`

**Browser Features**:
- ✅ Back/forward buttons work
- ✅ Refresh maintains route
- ✅ Direct URL navigation
- ✅ Deep linking automatic

---

## Project Structure

```
mobile/
├── app/                        # Expo Router screens (file-based routing)
│   ├── _layout.tsx            # Root layout with auth protection
│   ├── (auth)/                # Auth screens (login, register)
│   └── (tabs)/                # Bottom tab screens (dashboard, workout, etc.)
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── analytics/         # Charts (1RM progression, volume trends)
│   │   ├── planner/           # Program management (exercise selection, phase indicator)
│   │   ├── workout/           # Set logging, rest timer
│   │   └── common/            # Shared components (buttons, cards)
│   ├── services/              # Business logic
│   │   ├── api/               # Backend API clients
│   │   ├── sync/              # Offline sync queue
│   │   └── timer/             # Rest timer, background audio
│   ├── stores/                # Zustand state management
│   │   ├── workoutStore.ts    # Active workout state
│   │   └── authStore.ts       # Authentication state
│   ├── database/              # SQLite wrapper (web fallback)
│   ├── constants/             # Volume landmarks, muscle groups
│   └── utils/                 # Helpers, calculations
├── e2e/                        # Playwright E2E tests
├── tests/                      # Vitest unit tests
└── assets/                     # Images, fonts, silence.mp3
```

---

## Features

### Screens

1. **Dashboard** (`app/(tabs)/index.tsx`):
   - Today's workout preview
   - Recovery assessment prompt
   - Quick stats (1RM PRs, volume completion)

2. **Workout** (`app/(tabs)/workout.tsx`):
   - Exercise list with target sets/reps/RIR
   - Set logging (weight, reps, RIR)
   - Rest timer (3-5 min for compound lifts)
   - 1RM estimation (Epley formula + RIR)

3. **VO2max Workout** (`app/(tabs)/vo2max-workout.tsx`):
   - Norwegian 4x4 timer (4 intervals × 4min work + 3min recovery)
   - Heart rate zone indicators
   - Interval progress tracking

4. **Analytics** (`app/(tabs)/analytics.tsx`):
   - 1RM progression charts (12-week trends)
   - Volume trends (8-week trends by muscle group)
   - VO2max progression (Cooper formula estimation)

5. **Planner** (`app/(tabs)/planner.tsx`):
   - Program overview (6-day split)
   - Exercise management (add, swap, reorder)
   - Phase progression (MEV → MAV → MRV → Deload)
   - Volume warnings (MEV/MAV/MRV compliance)

6. **Settings** (`app/(tabs)/settings.tsx`):
   - User profile (age, weight, experience level)
   - Unit preferences (kg/lbs)
   - Theme toggle (light/dark mode)

### Key Components

**Workout Logging**:
- `SetLogCard.tsx`: Weight, reps, RIR input with 1RM display
- `RestTimer.tsx`: Countdown timer with 10s warning, background audio

**VO2max Tracking**:
- `Norwegian4x4Timer.tsx`: 4x4 interval timer with visual progress
- `VO2maxSessionCard.tsx`: Session summary (duration, HR, estimated VO2max)
- `VO2maxProgressionChart.tsx`: 12-week VO2max trends

**Program Management**:
- `ExerciseSelectionModal.tsx`: Exercise library (filter by muscle, equipment)
- `PhaseProgressIndicator.tsx`: Current phase (MEV/MAV/MRV/Deload) with week counter
- `VolumeWarningBadge.tsx`: Real-time MEV/MAV/MRV warnings
- `AlternativeExerciseSuggestions.tsx`: Exercise swap recommendations

**Analytics**:
- `OneRMProgressionChart.tsx`: 12-week strength gains per exercise
- `VolumeTrendsChart.tsx`: 8-week volume by muscle group
- `MuscleGroupVolumeBar.tsx`: Current week volume with zone classification

---

## State Management

### Zustand Stores

**Auth Store** (`src/stores/authStore.ts`):
```typescript
const useAuthStore = create((set) => ({
  isAuthenticated: false,
  user: null,
  token: null,
  login: (user, token) => set({ isAuthenticated: true, user, token }),
  logout: () => set({ isAuthenticated: false, user: null, token: null }),
}));
```

**Workout Store** (`src/stores/workoutStore.ts`):
```typescript
const useWorkoutStore = create((set) => ({
  activeWorkout: null,
  sets: [],
  startWorkout: (workout) => set({ activeWorkout: workout, sets: [] }),
  logSet: (set) => set((state) => ({ sets: [...state.sets, set] })),
  finishWorkout: () => set({ activeWorkout: null, sets: [] }),
}));
```

### TanStack Query (Server State)

```typescript
// Fetch exercises
const { data: exercises } = useQuery({
  queryKey: ['exercises', { muscle_group: 'chest' }],
  queryFn: () => exerciseApi.getExercises({ muscle_group: 'chest' }),
});

// Create workout
const { mutate: createWorkout } = useMutation({
  mutationFn: workoutApi.createWorkout,
  onSuccess: () => queryClient.invalidateQueries(['workouts']),
});
```

---

## API Integration

### API Clients (`src/services/api/`)

**Authentication**:
```typescript
import { authApi } from '@/services/api/authApi';

// Register
const { user_id, token } = await authApi.register({
  username: 'user@example.com',
  password: 'SecurePass123!',
  age: 28,
  weight_kg: 75,
  experience_level: 'intermediate'
});

// Login
const { user_id, token } = await authApi.login({
  username: 'user@example.com',
  password: 'SecurePass123!'
});
```

**Workout Logging**:
```typescript
import { workoutApi, setApi } from '@/services/api/';

// Create workout
const { workout_id } = await workoutApi.createWorkout({
  program_day_id: 1,
  date: '2025-10-04'
});

// Log set
const { set_id, estimated_1rm } = await setApi.createSet({
  workout_id: 42,
  exercise_id: 1,
  weight_kg: 100,
  reps: 8,
  rir: 2
});
```

**VO2max Tracking**:
```typescript
import { vo2maxApi } from '@/services/api/vo2maxApi';

// Create session
const { id, vo2max_estimated } = await vo2maxApi.createSession({
  workout_id: 42,
  protocol: 'norwegian_4x4',
  duration_minutes: 28,
  average_hr: 165,
  max_hr: 185,
  intervals_completed: 4
});
```

### Environment Variables

**Base URL Configuration**:
```typescript
// src/services/api/config.ts
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

**Token Injection**:
```typescript
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## Offline Sync

### Background Sync Queue (`src/services/sync/syncQueue.ts`)

**How it works**:
1. Mobile SQLite is source of truth during workouts
2. All writes tagged with `synced = 0` flag
3. Background sync queue retries with exponential backoff (1s, 2s, 4s, 8s, 16s)
4. Timestamp-based conflict resolution (client wins during active workouts)

**Example**:
```typescript
// Log set locally (immediate)
await db.runAsync(
  'INSERT INTO sets (workout_id, exercise_id, weight_kg, reps, rir, synced) VALUES (?, ?, ?, ?, ?, 0)',
  [workoutId, exerciseId, weight, reps, rir]
);

// Queue for background sync (non-blocking)
syncQueue.add('set', { workout_id, exercise_id, weight_kg, reps, rir }, localSetId);
```

**CRITICAL**: Never block user interactions waiting for server responses.

---

## Testing

### Unit Tests (Vitest)

```bash
npm run test:unit
```

**Example**:
```typescript
// src/utils/__tests__/calculations.test.ts
import { calculateOneRepMax } from '../calculations';

test('calculates 1RM with RIR adjustment', () => {
  expect(calculateOneRepMax(100, 8, 2)).toBe(120);
});
```

### Integration Tests

```bash
npm run test:integration
```

**Example Scenarios**:
- Login → Create workout → Log sets → View analytics
- Recovery assessment → Auto-regulation → Adjust workout volume
- Add exercise → Check volume warnings → Advance phase

### E2E Tests (Playwright)

```bash
npm run test:e2e
```

**Test Files** (`e2e/`):
- `auth-flow.spec.ts`: Registration, login, logout
- `workout-logging.spec.ts`: Full workout session
- `vo2max-cardio.spec.ts`: Norwegian 4x4 protocol
- `program-management.spec.ts`: Exercise customization, phase progression
- `analytics.spec.ts`: Charts, trends, progression

**Coverage Requirements**: ≥80% overall, 100% for critical paths

---

## Performance

### Requirements

- **UI interactions**: < 100ms perceived latency
- **SQLite writes**: < 5ms (p95)
- **API responses**: < 200ms (p95)
- **Rest timer accuracy**: ±2 seconds

### Optimizations

**SQLite Indices**:
```sql
CREATE INDEX idx_sets_workout ON sets(workout_id);
CREATE INDEX idx_sets_synced ON sets(synced);
CREATE INDEX idx_workouts_user_date ON workouts(user_id, date);
```

**Background Timer** (iOS):
- Rest timers (3-5 min) use silent audio workaround
- Loop `silence.mp3` to keep app alive in background
- Configured via `expo-av` with `staysActiveInBackground: true`

---

## Known Issues & Workarounds

### 1. Alert.alert Compatibility (iOS)

**Problem**: `Alert.alert` from `react-native` has known issues in Expo Go and on physical iOS devices (buttons don't work, callbacks don't execute).

**Solution**: Use React Native Paper `Dialog` instead:

```typescript
// ❌ Bad: Alert.alert (unreliable on iOS)
import { Alert } from 'react-native';
Alert.alert('Confirm', 'Are you sure?', [
  { text: 'Cancel', style: 'cancel' },
  { text: 'OK', onPress: () => performAction() },
]);

// ✅ Good: React Native Paper Dialog
import { Portal, Dialog, Paragraph, Button } from 'react-native-paper';

const [dialogVisible, setDialogVisible] = useState(false);

<Portal>
  <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
    <Dialog.Title>Confirm</Dialog.Title>
    <Dialog.Content>
      <Paragraph>Are you sure?</Paragraph>
    </Dialog.Content>
    <Dialog.Actions>
      <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
      <Button onPress={confirmAction}>OK</Button>
    </Dialog.Actions>
  </Dialog>
</Portal>
```

### 2. Skeleton Components on Web

**Problem**: `react-native-skeleton-placeholder` incompatible with web.

**Solution**: `SkeletonWrapper.tsx` conditionally requires library:
- **Web**: Shows static loading indicators
- **Mobile**: Uses animated skeleton placeholder

### 3. Async Void Anti-Pattern

**Problem**: Using `void (async () => {...})()` to suppress TypeScript errors causes race conditions.

**Solution**: Make function `async` or use proper promise chaining:

```typescript
// ❌ Bad: Void async IIFE
const handleLogout = () => {
  void (async () => {
    await clearToken();
    setIsAuthenticated(false); // May not execute!
  })();
};

// ✅ Good: Proper async function
const handleLogout = async () => {
  try {
    await clearToken();
    setIsAuthenticated(false);
  } catch (error) {
    console.error('[Component] Logout failed:', error);
    setIsAuthenticated(false);
  }
};
```

---

## Build & Deployment

### iOS Build

```bash
npm run build:ios
```

**Prerequisites**:
- Apple Developer account
- Xcode installed (macOS only)
- App Store Connect configuration

### Android Build

```bash
npm run build:android
```

**Prerequisites**:
- Android SDK installed
- Keystore configured (`android/app/release.keystore`)

### Web Build

```bash
npx expo export:web
```

**Output**: `web-build/` directory (deploy to static hosting)

---

## Troubleshooting

### Network Errors from Physical Devices

**Symptoms**: Backend running, curl works, but mobile app shows "network error"

**Diagnosis**:
1. Check backend logs - if no POST requests, issue is client-side
2. Verify device can reach backend: `curl http://<YOUR_IP>:3000/health`
3. Check env var is loaded: Look for `env: export EXPO_PUBLIC_API_URL` in Expo output

**Solution**:
1. Set `EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:3000` in `.env`
2. Restart Expo with cache clear: `npx expo start -c`
3. Verify backend logs show requests from device IP (192.168.x.x)

### Buttons Don't Work on iOS

**Symptoms**: Button press has no visible effect, callbacks never execute

**Diagnosis**: Check if using `Alert.alert` or similar React Native core components

**Solution**: Use React Native Paper components instead (see "Known Issues" above)

### VO2max "Age Required" Error

**Symptoms**: Cannot create VO2max session, API returns 400 error

**Diagnosis**: Cooper formula requires user age for max heart rate calculation

**Solution**: Set age during registration or update user profile:
```typescript
await userApi.updateProfile({ age: 28 });
```

---

## License

MIT

## Status

**Production Readiness**: 88/100 - GO DECISION APPROVED
**Test Coverage**: Integration tests passing, E2E validation complete
**Platform Support**: iOS, Android, Web (all validated)

For detailed validation report, see `/specs/001-specify-build-fitflow/VALIDATION_REPORT.md`.
