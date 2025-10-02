# Tasks: FitFlow Pro - Evidence-Based Training Application

**Input**: Design documents from `/home/asigator/fitness/specs/001-specify-build-fitflow/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md
**Tech Stack**: React Native (Expo SDK 54+), Fastify 4.26+, SQLite, TypeScript 5.3+
**Project Structure**: `mobile/` (React Native app) + `backend/` (Fastify server)
**Last Updated**: 2025-10-02 (Post-analysis remediation)

## Execution Flow (main)
```
1. Setup projects (mobile + backend)
2. Write failing contract tests (TDD Phase 1)
3. Implement database schemas
4. Implement authentication & core services
5. Implement workout logging & sync
6. Implement analytics & UI
7. Integration tests & performance validation
8. Execute quickstart.md scenarios
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Tasks numbered T001-T092
- File paths use absolute paths where critical

---

## Phase 3.1: Project Setup (T001-T010)

### Mobile App Setup
- [X] **T001** Create mobile project structure: `npx create-expo-app mobile --template expo-template-blank-typescript`
- [X] **T002** [P] Configure mobile dependencies in `mobile/package.json`:
  - React Native Paper 5.12+, Zustand 4.5+, TanStack Query 5.28+, expo-sqlite, expo-av, Axios 1.6+
- [X] **T003** [P] Configure ESLint + Prettier in `mobile/.eslintrc.js` and `mobile/.prettierrc`:
  - Add complexity rule: `complexity: ["error", 10]` (Constitutional requirement)
- [X] **T004** [P] Setup Vitest for mobile tests in `mobile/vitest.config.ts`
- [X] **T005** [P] Create TypeScript config `mobile/tsconfig.json` with strict mode

### Backend Setup
- [X] **T006** Create backend project structure: `npm init -y` in `backend/` with TypeScript
- [X] **T007** [P] Configure backend dependencies in `backend/package.json`:
  - Fastify 4.26+, better-sqlite3 11.0+, @fastify/jwt 8.0+, bcrypt 5.1+, @types/* packages
- [X] **T008** [P] Configure ESLint + Prettier in `backend/.eslintrc.js` and `backend/.prettierrc`:
  - Add complexity rule: `complexity: ["error", 10]` (Constitutional requirement)
- [X] **T009** [P] Setup Tap for backend tests in `backend/package.json`
- [X] **T010** [P] Create TypeScript config `backend/tsconfig.json` with strict mode

**Dependencies**: None (all can run after initial directory creation)

---

## Phase 3.2: Tests First - Contract Tests (T011-T020)
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Backend Contract Tests (API Schema Validation)
- [X] **T011** [P] Contract test POST /api/auth/register in `backend/tests/contract/auth.test.ts`
  - Assert request schema: username (email), password (≥8 chars), age, weight_kg, experience_level
  - Assert response schema: user_id, token (JWT)
  - Assert 400 validation errors, 409 conflict (duplicate username)

- [X] **T012** [P] Contract test POST /api/auth/login in `backend/tests/contract/auth.test.ts`
  - Assert request schema: username, password
  - Assert response schema: token, user object
  - Assert 401 invalid credentials

- [X] **T013** [P] Contract test POST /api/workouts in `backend/tests/contract/workouts.test.ts`
  - Assert request schema: program_day_id, date
  - Assert response schema: Workout object with status, timestamps
  - Assert 401 unauthorized without JWT

- [X] **T014** [P] Contract test GET /api/workouts in `backend/tests/contract/workouts.test.ts`
  - Assert query params: start_date, end_date (optional)
  - Assert response schema: Array of Workout objects
  - Assert 401 unauthorized

- [X] **T015** [P] Contract test POST /api/sets in `backend/tests/contract/sets.test.ts`
  - Assert request schema: workout_id, exercise_id, set_number, weight_kg (0-500), reps (1-50), rir (0-4), timestamp, localId
  - Assert response schema: id, localId, synced
  - Assert 400 validation errors (weight > 500, rir > 4)

- [X] **T016** [P] Contract test POST /api/recovery-assessments in `backend/tests/contract/recovery.test.ts`
  - Assert request schema: date, sleep_quality (1-5), muscle_soreness (1-5), mental_motivation (1-5)
  - Assert response schema: total_score (3-15), volume_adjustment enum
  - Assert auto-regulation logic: score 8 → reduce_2_sets (per FR-009 remediation)

- [X] **T017** [P] Contract test GET /api/analytics/1rm-progression in `backend/tests/contract/analytics.test.ts`
  - Assert query params: exercise_id, start_date, end_date
  - Assert response schema: Array of {date, estimated_1rm}

- [X] **T018** [P] Contract test GET /api/analytics/volume-trends in `backend/tests/contract/analytics.test.ts`
  - Assert query params: muscle_group, start_date, end_date
  - Assert response schema: Array of {week, total_sets, mev, mav, mrv}

- [X] **T019** [P] Contract test GET /api/analytics/consistency in `backend/tests/contract/analytics.test.ts`
  - Assert response schema: adherence_rate, avg_session_duration, total_workouts

- [X] **T020** Run all contract tests and verify they FAIL (no implementation exists yet)
  - `cd backend && npm run test:contract` → Expected: All tests fail with 404 or connection errors

**Dependencies**: T006-T010 (backend setup complete)

---

## Phase 3.3: Database Schemas (T021-T025)

### Mobile SQLite Schema
- [X] **T021** [P] Create mobile schema in `mobile/src/database/schema.ts`:
  - Users, exercises, programs, program_days, program_exercises tables
  - Workouts, sets, recovery_assessments, vo2max_sessions, active_sessions tables
  - All indices from data-model.md (idx_sets_workout, idx_workouts_user_date, etc.)
  - Enable WAL mode: `PRAGMA journal_mode=WAL`

- [X] **T022** [P] Create mobile database initialization in `mobile/src/database/db.ts`:
  - Open SQLite database with expo-sqlite
  - Run schema.sql on first launch
  - Export typed query functions

### Backend SQLite Schema
- [X] **T023** [P] Create backend schema in `backend/src/database/schema.sql`:
  - Identical schema to mobile (users, exercises, programs, etc.)
  - All indices from data-model.md
  - Enable WAL mode, cache_size, mmap_size optimizations
  - Add audit_logs table for T056 requirement

- [X] **T024** [P] Create backend database initialization in `backend/src/database/db.ts`:
  - Initialize better-sqlite3 with WAL mode
  - Apply performance optimizations (cache_size=-64000, mmap_size=268435456)
  - Export prepared statements for common queries
  - Create database file at `backend/data/fitflow.db`

### Seed Data
- [X] **T025** [P] Create exercise library seed data in `backend/src/database/seeds/exercises.sql`:
  - 100+ exercises with muscle_groups, equipment, defaults
  - Examples: Barbell Bench Press, Romanian Deadlift, Overhead Press, Cable Flyes
  - Run seed on backend initialization

**Dependencies**: T006-T010 (project setup)

---

## Phase 3.4: Authentication (T026-T031)

### Backend Authentication Service
- [x] **T026** Implement authentication service in `backend/src/services/authService.ts`:
  - `registerUser(username, password, age, weight_kg, experience_level)`: bcrypt hash (cost=12), insert user, return JWT
  - `loginUser(username, password)`: verify bcrypt hash, return JWT
  - JWT payload: {userId, username}, expiration: 30 days (per justified constitutional violation)
  - Tests: T011, T012 should now PASS

- [x] **T027** Implement JWT middleware in `backend/src/middleware/auth.ts`:
  - Verify JWT from Authorization header
  - Attach `req.user = {userId}` for authenticated routes
  - Return 401 if token invalid/expired

### Backend Authentication Routes
- [X] **T028** Implement POST /api/auth/register in `backend/src/routes/auth.ts`:
  - Validate request body (JSON Schema)
  - Call authService.registerUser()
  - Return 201 with {user_id, token} or 400/409 errors

- [X] **T029** Implement POST /api/auth/login in `backend/src/routes/auth.ts`:
  - Validate request body
  - Call authService.loginUser()
  - Return 200 with {token, user} or 401 error

- [X] **T030** Implement DELETE /api/users/:id endpoint in `backend/src/routes/auth.ts`:
  - Auth middleware required (user can only delete own account)
  - Cascade delete: workouts → sets, recovery_assessments, vo2max_sessions, programs
  - Irreversible operation (no soft delete per FR-038)
  - Return 204 No Content on success
  - Contract test: Assert 401 unauthorized, 204 success, cascade deletion verified

### Mobile Authentication
- [X] **T031** [P] Implement auth API client in `mobile/src/services/api/authApi.ts`:
  - `register()`, `login()`, `deleteAccount()` functions using Axios
  - Store JWT token in AsyncStorage (`@fitflow/auth_token`)
  - Export authenticated API client with JWT header injection

**Dependencies**: T023-T024 (backend DB schema), T020 (contract tests exist)

---

## Phase 3.5: Workout & Set Logging (T032-T041)

### Backend Workout Service
- [X] **T032** Implement workout service in `backend/src/services/workoutService.ts`:
  - `createWorkout(userId, programDayId, date)`: Insert workout with status=not_started
  - `listWorkouts(userId, startDate?, endDate?)`: Query workouts with date filter
  - `updateWorkoutStatus(workoutId, status, totalVolumeKg?, averageRir?)`: Update workout

- [X] **T033** Implement set logging service in `backend/src/services/setService.ts`:
  - `logSet(workoutId, exerciseId, setNumber, weightKg, reps, rir, timestamp, localId)`: Insert set
  - Deduplication check: if localId exists, return existing set (idempotent sync)
  - Calculate 1RM: `weight * (1 + (reps - rir) / 30)` (Epley formula per FR-005 remediation)

### Backend Workout Routes
- [X] **T034** Implement POST /api/workouts in `backend/src/routes/workouts.ts`:
  - Auth middleware required
  - Call workoutService.createWorkout()
  - Return 201 with Workout object
  - Tests: T013 should PASS

- [X] **T035** Implement GET /api/workouts in `backend/src/routes/workouts.ts`:
  - Auth middleware required
  - Call workoutService.listWorkouts() with query filters
  - Return 200 with Workout array
  - Tests: T014 should PASS

- [X] **T036** Implement POST /api/sets in `backend/src/routes/sets.ts`:
  - Auth middleware required
  - Validate request body (weight 0-500, reps 1-50, rir 0-4 per contracts)
  - Call setService.logSet()
  - Return 201 with {id, localId, synced: true}
  - Tests: T015 should PASS

### Mobile Workout Logging
- [X] **T037** [P] Implement workout database service in `mobile/src/services/database/workoutDb.ts`:
  - `createWorkout()`, `getWorkouts()`, `updateWorkoutStatus()`
  - `logSet(workout_id, exercise_id, ...)`: Insert set with synced=0
  - Target: < 5ms writes (FR-040 remediation: 100ms total UI response, < 5ms SQLite)

- [X] **T038** [P] Implement workout store in `mobile/src/stores/workoutStore.ts` (Zustand):
  - State: currentWorkout, exerciseIndex, completedSets, totalVolumeKg
  - Actions: startWorkout(), logSet(), completeWorkout(), cancelWorkout()
  - Optimistic updates: update state immediately, queue sync in background

### Mobile Sync Queue
- [X] **T039** Implement sync queue in `mobile/src/services/sync/syncQueue.ts`:
  - Queue structure: {id, type, data, localId, retries, createdAt}
  - Persist queue in AsyncStorage (`@fitflow/sync_queue`)
  - Process queue: exponential backoff (1s, 2s, 4s, 8s, 16s), max 5 retries
  - On success: mark local record as synced=1

- [X] **T040** Implement sync service in `mobile/src/services/sync/syncService.ts`:
  - `syncSets()`: POST /api/sets with localId for deduplication
  - `syncWorkouts()`: POST/PATCH /api/workouts
  - `syncRecoveryAssessments()`: POST /api/recovery-assessments
  - Network listener: trigger sync on reconnect

- [X] **T041** [P] Implement timer service in `mobile/src/services/timer/timerService.ts`:
  - Silent audio session: play silence.mp3 in loop (expo-av)
  - Audio config: `playsInSilentModeIOS: true, staysActiveInBackground: true`
  - Countdown timer with setInterval()
  - Local notifications at 10s remaining and 0s (completion)

**Dependencies**: T026-T031 (auth complete), T032-T036 block T039-T040

---

## Phase 3.6: Recovery Assessment & Auto-Regulation (T042-T046)

### Backend Recovery Service
- [X] **T042** Implement recovery service in `backend/src/services/recoveryService.ts`:
  - `createAssessment(userId, date, sleepQuality, muscleSoreness, mentalMotivation)`:
    - Calculate total_score = sum of 3 subscores (1-5 scale per FR-008 remediation)
    - Determine volume_adjustment per FR-009 remediation:
      - 12-15 → none
      - 9-11 → reduce_1_set
      - 6-8 → reduce_2_sets
      - 3-5 → rest_day
    - Insert recovery_assessments record

- [X] **T043** Implement POST /api/recovery-assessments in `backend/src/routes/recovery.ts`:
  - Auth middleware required
  - Validate request body (all subscores 1-5)
  - Call recoveryService.createAssessment()
  - Return 201 with {total_score, volume_adjustment}
  - Tests: T016 should PASS

### Mobile Recovery Assessment
- [X] **T044** [P] Implement recovery database service in `mobile/src/services/database/recoveryDb.ts`:
  - `createAssessment()`, `getTodayAssessment()`
  - Same auto-regulation logic as backend (for offline operation)

- [X] **T045** [P] Implement recovery store in `mobile/src/stores/recoveryStore.ts` (Zustand):
  - State: todayAssessment, volumeAdjustment
  - Actions: submitAssessment(), getTodayAssessment()
  - Apply volume adjustment to workout planner

- [X] **T046** [P] Create volume landmarks constants in `mobile/src/constants/volumeLandmarks.ts`:
  - MEV/MAV/MRV values per muscle group from research.md
  - Export as typed object: `{chest: {mev: 8, mav: 14, mrv: 22}, ...}`

**Dependencies**: T032-T036 (backend routes), T037-T038 (mobile DB)

---

## Phase 3.7: Analytics (T047-T053)

### Backend Analytics Service
- [X] **T047** Implement 1RM progression analytics in `backend/src/services/analyticsService.ts`:
  - `get1RMProgression(userId, exerciseId, startDate, endDate)`:
    - Query sets grouped by workout date
    - Calculate estimated 1RM per set: `weight * (1 + (reps - rir) / 30)` (Epley with RIR)
    - Return max 1RM per workout date

- [X] **T048** Implement volume trends analytics in `backend/src/services/analyticsService.ts`:
  - `getVolumeTrends(userId, muscleGroup, startDate, endDate)`:
    - Query sets, join exercises to filter by muscle_group
    - Group by week (ISO week number), count total sets
    - Include MEV/MAV/MRV landmarks from volumeLandmarks constant

- [X] **T049** Implement consistency analytics in `backend/src/services/analyticsService.ts`:
  - `getConsistencyMetrics(userId)`:
    - Calculate adherence_rate: completed_workouts / scheduled_workouts
    - Calculate avg_session_duration: mean(completed_at - started_at)
    - Return total_workouts count

### Backend Analytics Routes
- [X] **T050** Implement GET /api/analytics/1rm-progression in `backend/src/routes/analytics.ts`:
  - Auth middleware required
  - Query params: exercise_id, start_date, end_date
  - Call analyticsService.get1RMProgression()
  - Return 200 with array of {date, estimated_1rm}
  - Tests: T017 should PASS

- [X] **T051** Implement GET /api/analytics/volume-trends in `backend/src/routes/analytics.ts`:
  - Auth middleware required
  - Query params: muscle_group, start_date, end_date
  - Call analyticsService.getVolumeTrends()
  - Return 200 with array of {week, total_sets, mev, mav, mrv}
  - Tests: T018 should PASS

- [X] **T052** Implement GET /api/analytics/consistency in `backend/src/routes/analytics.ts`:
  - Auth middleware required
  - Call analyticsService.getConsistencyMetrics()
  - Return 200 with {adherence_rate, avg_session_duration, total_workouts}
  - Tests: T019 should PASS

### Mobile Analytics
- [X] **T053** [P] Implement analytics API client in `mobile/src/services/api/analyticsApi.ts`:
  - `get1RMProgression()`, `getVolumeTrends()`, `getConsistencyMetrics()`
  - Use TanStack Query for caching and background refresh

**Dependencies**: T047-T049 block T050-T052, T031 (auth API client)

---

## Phase 3.8: Data Export & Account Management (T054-T056)

### Mobile CSV Export (FR-032 Coverage)
- [X] **T054** [P] Implement CSV export service in `mobile/src/services/export/csvExporter.ts`:
  - Export workouts: columns (date, exercise, sets, reps, weight, rir, volume)
  - Export analytics: columns (date, lift, estimated_1rm, weekly_volume_by_muscle)
  - Export recovery: columns (date, sleep, soreness, motivation, total_score, adjustment)
  - Use built-in CSV serialization (no external library needed)
  - Export to device storage with React Native Share API
  - Tests: Verify CSV format correctness in unit tests

### Account Deletion UI (FR-038 Coverage)
- [X] **T055** [P] Implement account deletion confirmation in `mobile/src/components/common/DeleteAccountModal.tsx`:
  - Confirmation modal: "This will permanently delete all workout history. Type 'DELETE' to confirm."
  - Text input validation: user must type exactly "DELETE"
  - On confirm: call deleteAccount() API, clear AsyncStorage, navigate to AuthScreen

- [X] **T056** Add audit logging service in `backend/src/services/auditService.ts`:
  - `logAuthEvent(userId, eventType, ipAddress, timestamp)`: Authentication events
  - `logDataExport(userId, exportType, timestamp)`: Data export tracking
  - `logAccountDeletion(userId, timestamp)`: Account deletion tracking
  - Store in audit_logs table (add to schema.sql)
  - Constitutional requirement: Security First (V) - audit logging

**Dependencies**: T031 (auth API), T030 (delete endpoint)

---

## Phase 3.9: Mobile UI Components (T057-T065)

### Workout Screen
- [X] **T057** [P] Implement WorkoutScreen in `mobile/src/screens/WorkoutScreen.tsx`:
  - Display current exercise, set number, target reps/RIR
  - Set logging form: weight input (number), reps input (number), RIR selector (0-4)
  - Rest timer display with countdown
  - Progress indicator: "Set 3/4 complete"

- [X] **T058** [P] Implement SetLogCard component in `mobile/src/components/workout/SetLogCard.tsx`:
  - Input fields: weight_kg, reps (with +/- buttons for quick adjustment)
  - RIR selector: horizontal button group (0-4)
  - "Complete Set" button → logSet() → start rest timer

- [X] **T059** [P] Implement RestTimer component in `mobile/src/components/workout/RestTimer.tsx`:
  - Countdown display (MM:SS format)
  - Visual progress ring (React Native SVG)
  - Skip/add 30s buttons
  - Trigger silent audio on timer start

### Dashboard & Planner
- [X] **T060** [P] Implement DashboardScreen in `mobile/src/screens/DashboardScreen.tsx`:
  - Today's workout card with "Start Workout" button
  - Recent workout history (last 7 days)
  - Recovery assessment prompt (if not submitted today)

- [X] **T061** [P] Implement PlannerScreen in `mobile/src/screens/PlannerScreen.tsx`:
  - Display program days (Push A, Pull A, etc.)
  - Exercise list with drag-and-drop reordering (react-native-draggable-flatlist)
  - MEV/MAV/MRV volume validation overlay
  - Exercise swap search (filter by muscle group, equipment)

### Analytics UI
- [X] **T062** [P] Implement AnalyticsScreen in `mobile/src/screens/AnalyticsScreen.tsx`:
  - Tab navigation: Strength, Volume, Consistency, Cardio
  - TanStack Query for data fetching with loading states

- [X] **T063** [P] Implement 1RMProgressionChart component in `mobile/src/components/analytics/1RMProgressionChart.tsx`:
  - Line chart using react-native-svg custom implementation
  - X-axis: dates, Y-axis: estimated 1RM (kg)
  - Exercise selector dropdown

- [X] **T064** [P] Implement VolumeChart component in `mobile/src/components/analytics/VolumeChart.tsx`:
  - Bar chart: weekly volume with MEV/MAV/MRV threshold lines
  - Color coding: green (MEV-MAV), yellow (MAV-MRV), red (under MEV or over MRV)

### Authentication & Settings
- [X] **T065** [P] Implement AuthScreen in `mobile/src/screens/AuthScreen.tsx`:
  - Login form: email, password inputs
  - Register form: email, password, age, weight_kg, experience_level
  - Form validation: email format, password ≥8 chars

- [X] **T066** [P] Implement SettingsScreen in `mobile/src/screens/SettingsScreen.tsx`:
  - User profile editing (age, weight_kg)
  - CSV export button (calls T054 csvExporter)
  - Delete Account button (opens T055 DeleteAccountModal)
  - Logout button (clear AsyncStorage token)
  - Data export (download SQLite database via Share API)

**Dependencies**: T037-T041 (mobile services), T053 (analytics API), T054-T055 (export/delete)

---

## Phase 3.10: Accessibility (T067-T073)
**Constitutional Principle III - WCAG 2.1 AA Compliance**

- [X] **T067** [P] Accessibility audit: WorkoutScreen in `mobile/src/screens/WorkoutScreen.tsx`:
  - VoiceOver/TalkBack labels for weight/reps/RIR inputs
  - Screen reader announces set completion and timer start
  - Focus management: auto-focus weight input after set completion
  - Test with iOS Accessibility Inspector / Android Accessibility Scanner

- [X] **T068** [P] Accessibility audit: DashboardScreen in `mobile/src/screens/DashboardScreen.tsx`:
  - Screen reader navigation order (recovery prompt → today's workout → history)
  - Accessible touch targets (minimum 44x44pt)
  - Semantic headings for sections

- [X] **T069** [P] Accessibility audit: PlannerScreen in `mobile/src/screens/PlannerScreen.tsx`:
  - Keyboard navigation fallback for drag-drop (move up/down buttons)
  - Screen reader announces exercise swap validation results
  - Focus trap in exercise search modal

- [X] **T070** [P] Accessibility audit: AnalyticsScreen in `mobile/src/screens/AnalyticsScreen.tsx`:
  - Chart alt text descriptions (e.g., "1RM progression: 120kg to 130kg over 4 weeks")
  - Color-blind friendly palette (green/red replaced with patterns)
  - Accessible tab navigation

- [X] **T071** [P] Accessibility audit: AuthScreen in `mobile/src/screens/AuthScreen.tsx`:
  - Form field labels associated with inputs
  - Error announcements (e.g., "Invalid email format")
  - Password visibility toggle (accessible button)

- [X] **T072** [P] Accessibility audit: SettingsScreen in `mobile/src/screens/SettingsScreen.tsx`:
  - Focus trap in Delete Account confirmation modal
  - Screen reader announces irreversible deletion warning
  - Accessible touch targets for all buttons

- [X] **T073** Run accessibility validation suite:
  - iOS: `xcrun simctl spawn booted log stream --predicate 'processImagePath CONTAINS "accessibility"'`
  - Android: `adb shell settings put secure enabled_accessibility_services com.google.android.marvin.talkback`
  - Validate WCAG 2.1 AA compliance with automated tools
  - Manual testing with VoiceOver (iOS) and TalkBack (Android)
  - Compliance report generated: `/mobile/ACCESSIBILITY_COMPLIANCE_REPORT.md`

**Dependencies**: T057-T066 (all screens implemented)

---

## Phase 3.11: Integration Tests (T074-T078)
**CRITICAL: These tests validate end-to-end scenarios from quickstart.md**

- [X] **T074** [P] Integration test Scenario 1: Complete guided workout session in `mobile/tests/integration/complete-workout.test.ts`:
  - Start workout → log 8 exercises × 4 sets (32 sets total)
  - Force-close app mid-workout → reopen → verify "Resume Workout?" prompt
  - Resume → complete remaining sets → finish workout
  - Assertions: 32 sets logged, total_volume_kg calculated, average_rir correct, sync queue processed

- [X] **T075** [P] Integration test Scenario 2: Auto-regulation based on recovery in `mobile/tests/integration/auto-regulation.test.ts`:
  - Submit poor recovery assessment (total_score = 8, per FR-009 remediation)
  - Start Push A workout → verify volume reduced by 2 sets per exercise
  - Complete workout → verify total sets ~16 (vs normal 32)
  - Check analytics → verify this week's chest volume flagged as below MEV

- [X] **T076** [P] Integration test Scenario 3: Track and analyze progression in `backend/tests/integration/analytics-progression.test.ts`:
  - Seed 4 weeks of workout data (24 workouts, progressive overload)
  - Query GET /api/analytics/1rm-progression → verify 1RM increased from 120kg to 130kg
  - Query GET /api/analytics/volume-trends → verify weekly volume: 14→16→18→10 (deload)
  - Query GET /api/analytics/consistency → verify adherence_rate = 100%

- [X] **T077** [P] Integration test Scenario 4: Plan and customize training in `mobile/tests/integration/planner.test.ts`:
  - Drag "Cable Flyes" out, drop "Dumbbell Flyes" in position 3
  - Verify MEV validation: "✅ Chest volume maintained (14 sets)"
  - Remove "Barbell Bench Press" → verify warning: "⚠️ Chest volume below MEV"
  - Save valid changes → verify next workout uses new exercise list

- [X] **T078** [P] Integration test Scenario 5: Execute VO2max cardio protocol in `mobile/tests/integration/vo2max.test.ts`:
  - Start VO2max A workout → verify 4×4 timer interface
  - Tap "Start Interval 1" → verify 4-minute countdown
  - At 1 minute remaining → verify notification received
  - Complete 4 intervals → enter perceived exertion → verify session summary (duration, avg HR, estimated VO2max)

**Dependencies**: All implementation tasks T026-T073 complete

---

## Phase 3.12: Performance & Polish (T079-T084)

### Performance Testing
- [X] **T079** [P] SQLite write performance benchmark in `mobile/tests/performance/sqlite-benchmark.test.ts`:
  - Benchmark: Insert 100 sets in transaction
  - Assert: p95 < 5ms per insert, p99 < 10ms (per FR-040 remediation)
  - Test on physical iOS device (simulator not representative)

- [X] **T080** [P] API response time benchmark in `backend/tests/performance/api-benchmark.test.ts`:
  - Benchmark: POST /api/sets (100 requests)
  - Benchmark: GET /api/analytics/volume-trends (100 requests)
  - Assert: p95 < 50ms for POST, p95 < 200ms for analytics (Constitutional requirement)

- [X] **T081** [P] Mobile UI render performance in `mobile/tests/performance/ui-benchmark.test.ts`:
  - Measure: Set logging interaction (button press to UI update)
  - Measure: Analytics chart render time
  - Assert: All interactions < 100ms (60fps, per FR-040 remediation)

### Unit Tests
- [X] **T082** [P] Unit tests for 1RM calculation in `mobile/tests/unit/1rm-calculation.test.ts`:
  - Test Epley formula: calculateOneRepMax(100, 8, 2) → 120kg (per FR-005 remediation)
  - Edge cases: RIR=0 (failure), RIR=4 (warm-up)
  - Test confidence intervals

- [X] **T083** [P] Unit tests for recovery scoring in `mobile/tests/unit/recovery-scoring.test.ts`:
  - Test auto-regulation logic per FR-009 remediation:
    - total_score 8 → reduce_2_sets
    - total_score 12 → none
  - Test subscores: sleep 2 + soreness 4 + motivation 2 = 8 (1-5 scale)
  - Edge cases: all 5s, all 1s

- [X] **T084** [P] Unit tests for sync queue in `mobile/tests/unit/sync-queue.test.ts`:
  - Test exponential backoff: retry delays 1s, 2s, 4s, 8s, 16s
  - Test deduplication: same localId → skip duplicate
  - Test max retries: after 5 failures, move to failed queue

- [X] **T085** [P] Unit tests for CSV export in `mobile/tests/unit/csv-export.test.ts`:
  - Test CSV format correctness (workout, analytics, recovery exports)
  - Test special character escaping (commas, quotes)
  - Test large dataset export (10,000 sets)

### Code Quality
- [X] **T086** Run linting and fix issues:
  - `cd mobile && npm run lint -- --fix`
  - `cd backend && npm run lint -- --fix`
  - Assert: 0 ESLint errors, 0 TypeScript errors, complexity ≤ 10 enforced

- [X] **T087** Verify code coverage ≥ 80%:
  - `cd mobile && npm run test:coverage`
  - `cd backend && npm run test:coverage`
  - Critical paths (auth, sync, workout logging) must be 100%

**Dependencies**: T026-T078 (all implementation and integration tests complete)

---

## Phase 3.13: Deployment & Validation (T088-T092)

### Backend Deployment (Raspberry Pi 5)
- [X] **T088** Create Fastify server entry point in `backend/src/server.ts`:
  - Initialize Fastify with logger, trustProxy
  - Register routes: /api/auth, /api/workouts, /api/sets, /api/recovery, /api/analytics
  - Register JWT plugin, CORS middleware
  - Listen on port 3000

- [X] **T089** Create PM2 ecosystem config in `backend/ecosystem.config.js`:
  - App name: fitflow-api
  - Script: dist/server.js
  - Instances: 1 (Raspberry Pi constraint)
  - Auto-restart: true

- [X] **T090** Build and deploy backend to Raspberry Pi 5:
  - `npm run build` → compile TypeScript to dist/
  - Copy to Raspberry Pi: `rsync -avz backend/ pi@fitflow.local:/opt/fitflow-api/`
  - SSH to Pi: `pm2 start ecosystem.config.js`, `pm2 save`, `pm2 startup`
  - Documentation: `backend/DEPLOYMENT.md` (comprehensive guide)

- [X] **T091** Configure Nginx reverse proxy on Raspberry Pi:
  - Proxy `/api/*` to `localhost:3000`
  - Setup Let's Encrypt SSL: `certbot --nginx -d fitflow.yourdomain.com`
  - Enable rate limiting (100 req/min per IP)
  - Documentation: Nginx config template in `backend/DEPLOYMENT.md`

### Mobile Deployment
- [X] **T092** Build and deploy mobile app:
  - Generate silence.mp3: `ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 1 mobile/assets/silence.mp3`
  - Configure app.json: background modes `["audio"]`, permissions (notifications)
  - iOS: `eas build --platform ios` (requires Apple Developer account)
  - Android: `eas build --platform android`
  - Test on physical devices (iOS 15+, Android 10+)
  - Documentation: `mobile/DEPLOYMENT.md` (comprehensive guide)

**Dependencies**: All previous tasks (T001-T087)

---

## Phase 3.14: Final Validation (Post-Deployment)

### Quickstart Validation
Execute quickstart.md Scenario 1-5 manually on physical device and document results in `specs/001-specify-build-fitflow/validation-results.md`:

1. **Scenario 1**: Complete guided workout with resume
2. **Scenario 2**: Auto-regulation with poor recovery (score 8 → reduce 2 sets)
3. **Scenario 3**: 4-week analytics validation (1RM 120kg→130kg)
4. **Scenario 4**: Training planner customization (MEV validation)
5. **Scenario 5**: VO2max cardio protocol (Norwegian 4x4)

### Automated Test Suite
Run all automated tests in CI:
- Contract tests: `cd backend && npm run test:contract` (T011-T019)
- Integration tests: `npm run test:integration` (T074-T078)
- Unit tests: `npm run test:unit` (T082-T085)
- Performance benchmarks: `npm run test:performance` (T079-T081)
- Assert: All tests pass, coverage ≥ 80%

### Constitutional Compliance Check
Verify all constitutional principles met:
- ✅ **TDD enforced**: Contract tests (T011-T020) written before implementation
- ✅ **Code quality**: TypeScript strict, ESLint passing, complexity ≤ 10 (T003, T008, T086)
- ✅ **UX consistency**: Material Design, offline capability, < 100ms interactions (T057-T066)
- ✅ **Performance**: SQLite < 5ms (T079), API < 200ms (T080), 60fps UI (T081)
- ✅ **Security**: Bcrypt cost=12 (T026), JWT auth (T027), input validation (T011-T019), audit logging (T056)
- ✅ **Accessibility**: WCAG 2.1 AA compliance (T067-T073)
- ⚠️ **Documented violation**: JWT 30-day expiration (justified in plan.md:443 post-remediation)

---

## Dependencies Summary

**Critical Path**:
1. Setup (T001-T010) → Everything else
2. Contract Tests (T011-T020) → Implementation (T026+)
3. Database Schemas (T021-T025) → Services (T026+)
4. Authentication (T026-T031) → Protected Routes (T032+)
5. Core Services (T032-T046) → Analytics (T047-T053)
6. Backend APIs (T026-T056) → Mobile UI (T057-T066)
7. All Implementation (T026-T066) → Accessibility (T067-T073)
8. Accessibility → Integration Tests (T074-T078)
9. Integration Tests → Performance & Polish (T079-T087)
10. Everything → Deployment (T088-T092)

**Parallelizable Groups**:
- **Group 1 (Setup)**: T002-T005 (mobile config), T007-T010 (backend config)
- **Group 2 (Contract Tests)**: T011-T019 (all contract tests, different files)
- **Group 3 (Schemas)**: T021-T022 (mobile), T023-T024 (backend), T025 (seeds)
- **Group 4 (Mobile Services)**: T037-T038 (workout DB + store), T041 (timer), T044-T046 (recovery + constants)
- **Group 5 (Export & Delete)**: T054-T056 (CSV export, delete modal, audit logging)
- **Group 6 (Mobile UI)**: T057-T066 (all screens/components, different files)
- **Group 7 (Accessibility)**: T067-T073 (all screen audits, different files)
- **Group 8 (Integration Tests)**: T074-T078 (all scenarios, different files)
- **Group 9 (Performance)**: T079-T081 (SQLite, API, UI benchmarks)
- **Group 10 (Unit Tests)**: T082-T085 (1RM, recovery, sync queue, CSV)

---

## Parallel Execution Examples

### Example 1: Launch Contract Tests Together
```bash
# After T010 complete, launch all contract tests in parallel via Task tool:
Task("Contract test auth endpoints", "Write contract tests for POST /api/auth/register and /api/auth/login in backend/tests/contract/auth.test.ts. Assert request/response schemas from contracts/auth.openapi.yaml. Validate 1-5 scale recovery assessment. Tests must fail initially.", "tester")

Task("Contract test workouts endpoints", "Write contract tests for POST /api/workouts and GET /api/workouts in backend/tests/contract/workouts.test.ts. Assert request/response schemas from contracts/workouts.openapi.yaml. Tests must fail initially.", "tester")

Task("Contract test sets endpoint", "Write contract test for POST /api/sets in backend/tests/contract/sets.test.ts. Assert validation: weight 0-500, reps 1-50, rir 0-4. Test must fail initially.", "tester")

Task("Contract test recovery endpoint", "Write contract test for POST /api/recovery-assessments in backend/tests/contract/recovery.test.ts. Assert auto-regulation logic: score 8 → reduce_2_sets (per FR-009 remediation). Test must fail initially.", "tester")

Task("Contract test analytics endpoints", "Write contract tests for GET /api/analytics/* in backend/tests/contract/analytics.test.ts. Assert response schemas for 1RM progression (Epley with RIR), volume trends, consistency. Tests must fail initially.", "tester")
```

### Example 2: Launch Mobile UI Components Together
```bash
# After T053 complete, launch UI components in parallel:
Task("Build WorkoutScreen", "Implement WorkoutScreen in mobile/src/screens/WorkoutScreen.tsx. Display current exercise, set logging form, rest timer. Use workoutStore for state management. Target < 100ms UI response per FR-040.", "coder")

Task("Build DashboardScreen", "Implement DashboardScreen in mobile/src/screens/DashboardScreen.tsx. Show today's workout card, recent history, recovery prompt. Use workoutStore and recoveryStore.", "coder")

Task("Build PlannerScreen", "Implement PlannerScreen in mobile/src/screens/PlannerScreen.tsx. Drag-and-drop exercise reordering with MEV/MAV/MRV validation. Use react-native-draggable-flatlist.", "coder")

Task("Build AnalyticsScreen", "Implement AnalyticsScreen in mobile/src/screens/AnalyticsScreen.tsx with tabs (Strength, Volume, Consistency). Use TanStack Query for data fetching. Include 1RMProgressionChart and VolumeChart components.", "coder")

Task("Build AuthScreen", "Implement AuthScreen in mobile/src/screens/AuthScreen.tsx with login and register forms. Use authApi for authentication. Store JWT in AsyncStorage.", "coder")

Task("Build SettingsScreen", "Implement SettingsScreen in mobile/src/screens/SettingsScreen.tsx with profile editing, CSV export (T054), Delete Account button (T055), logout. Use Share API for data export.", "coder")
```

### Example 3: Launch Accessibility Audits Together
```bash
# After T066 complete, launch accessibility audits in parallel:
Task("Accessibility audit WorkoutScreen", "Audit WorkoutScreen for WCAG 2.1 AA compliance. Add VoiceOver labels, screen reader announcements, focus management. Test with iOS Accessibility Inspector.", "tester")

Task("Accessibility audit DashboardScreen", "Audit DashboardScreen for WCAG 2.1 AA compliance. Verify navigation order, 44pt touch targets, semantic headings. Test with TalkBack.", "tester")

Task("Accessibility audit PlannerScreen", "Audit PlannerScreen for WCAG 2.1 AA compliance. Add keyboard fallback for drag-drop, screen reader validation announcements, focus trap.", "tester")

Task("Accessibility audit AnalyticsScreen", "Audit AnalyticsScreen for WCAG 2.1 AA compliance. Add chart alt text, color-blind friendly palette, accessible tabs.", "tester")

Task("Accessibility audit AuthScreen", "Audit AuthScreen for WCAG 2.1 AA compliance. Associate labels with inputs, error announcements, password visibility toggle.", "tester")

Task("Accessibility audit SettingsScreen", "Audit SettingsScreen for WCAG 2.1 AA compliance. Focus trap in delete modal, screen reader warnings, accessible touch targets.", "tester")
```

### Example 4: Launch Integration Tests Together
```bash
# After T073 complete, launch integration tests in parallel:
Task("Integration test complete workout", "Write integration test for Scenario 1 (quickstart.md) in mobile/tests/integration/complete-workout.test.ts. Test: start workout, log 32 sets, force-close app, resume, finish. Assert: sets logged, volume calculated, sync processed.", "tester")

Task("Integration test auto-regulation", "Write integration test for Scenario 2 (quickstart.md) in mobile/tests/integration/auto-regulation.test.ts. Test: poor recovery (score 8, 1-5 scale) → volume reduced by 2 sets. Assert: 16 total sets vs normal 32.", "tester")

Task("Integration test analytics", "Write integration test for Scenario 3 (quickstart.md) in backend/tests/integration/analytics-progression.test.ts. Seed 4 weeks data, verify 1RM progression 120kg→130kg (Epley with RIR), volume trends, adherence 100%.", "tester")

Task("Integration test planner", "Write integration test for Scenario 4 (quickstart.md) in mobile/tests/integration/planner.test.ts. Test: drag-drop exercise swap, MEV validation, save changes. Assert: new exercise list applied to next workout.", "tester")

Task("Integration test VO2max", "Write integration test for Scenario 5 (quickstart.md) in mobile/tests/integration/vo2max.test.ts. Test: 4×4 interval timer, notifications, session summary. Assert: duration, avg HR, estimated VO2max calculated.", "tester")
```

---

## Notes
- **[P] tasks**: Different files, no dependencies → can run concurrently
- **Sequential tasks**: Same file or blocking dependencies → run in order
- **TDD enforcement**: Contract tests (T011-T020) MUST FAIL before implementation begins
- **Performance targets**: SQLite < 5ms, API < 200ms, UI < 100ms (constitutional requirements per FR-040 remediation)
- **Recovery scale**: 1-5 per question, 3-15 total (per FR-008/FR-009 remediation)
- **1RM formula**: Epley with RIR adjustment (per FR-005 remediation)
- **Zero data loss**: Offline operation mandatory; sync queue handles retries
- **Accessibility**: WCAG 2.1 AA compliance mandatory (Constitutional Principle III)
- **Commit strategy**: Commit after each task completion (92 total commits)

---

## Validation Checklist
*GATE: Verify before marking Phase 3 complete*

- [x] All contracts have corresponding tests (T011-T019 cover auth.openapi.yaml, workouts.openapi.yaml)
- [x] All entities have model tasks (T021-T025 create 10 entity schemas from data-model.md)
- [x] All tests come before implementation (T011-T020 before T026+)
- [x] Parallel tasks truly independent (all [P] tasks use different files)
- [x] Each task specifies exact file path (e.g., `backend/src/services/authService.ts`)
- [x] No [P] task modifies same file as another [P] task (verified)
- [x] All 5 quickstart.md scenarios have integration tests (T074-T078)
- [x] Performance benchmarks included (T079-T081)
- [x] Constitutional compliance verified (T086-T087, Final Validation)
- [x] Accessibility requirements covered (T067-T073, WCAG 2.1 AA)
- [x] Missing coverage from analysis added (T054 CSV export, T030+T055 account deletion, T056 audit logging)
- [x] Post-remediation spec changes reflected (1-5 recovery scale, Epley formula, < 100ms save time)

**Ready for execution**: 92 tasks, dependency-ordered, TDD-enforced, accessibility-compliant, immediately actionable
