# Tasks: Complete Missing Core Features

**Input**: Design documents from `/specs/002-actual-gaps-ultrathink/`
**Branch**: `002-actual-gaps-ultrathink`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow
```
1. Setup backend and mobile dependencies
2. Write contract tests (MUST FAIL before implementation)
3. Write integration tests
4. Create database migrations
5. Implement backend services
6. Implement backend routes
7. Create mobile API clients
8. Build mobile UI components
9. Integrate components into screens
10. Validate against quickstart.md scenarios
```

## Tech Stack
- **Backend**: Fastify 4.26+, better-sqlite3, TypeScript 5.3, Node.js 20 LTS
- **Mobile**: React Native (Expo SDK 54+), Zustand, TanStack Query, React Native Paper
- **Testing**: Vitest (backend), React Native Testing Library (mobile), Tap (contract tests)
- **Database**: SQLite with WAL mode (backend only, NO mobile SQLite)

## Path Conventions
- Backend: `/home/asigator/fitness2025/backend/`
- Mobile: `/home/asigator/fitness2025/mobile/`

---

## Phase 1: Setup & Dependencies

- [x] **T001** Verify backend dependencies (Fastify, better-sqlite3, Vitest already installed)
- [x] **T002** [P] Install mobile dependencies if missing (react-native-paper, date-fns, @tanstack/react-query)
- [x] **T003** [P] Create backend contract test config at `/backend/vitest.contract.config.ts`

---

## Phase 2: Contract Tests (TDD - MUST FAIL FIRST) ⚠️

**CRITICAL**: All contract tests MUST be written and MUST FAIL before ANY implementation in Phase 4+

### Exercise Library Contracts
- [x] **T004** [P] Contract test GET /api/exercises with filtering in `/backend/tests/contract/exercises.test.ts`
- [x] **T005** [P] Contract test GET /api/exercises/:id in `/backend/tests/contract/exercises.test.ts`

### Program Management Contracts
- [x] **T006** [P] Contract test GET /api/programs in `/backend/tests/contract/programs.test.ts`
- [x] **T007** [P] Contract test PATCH /api/programs/:id/advance-phase in `/backend/tests/contract/programs.test.ts`
- [x] **T008** [P] Contract test GET /api/programs/:id/volume in `/backend/tests/contract/programs.test.ts`

### Program Exercise Editor Contracts
- [x] **T009** [P] Contract test POST /api/program-exercises in `/backend/tests/contract/program-exercises.test.ts`
- [x] **T010** [P] Contract test PATCH /api/program-exercises/:id in `/backend/tests/contract/program-exercises.test.ts`
- [x] **T011** [P] Contract test DELETE /api/program-exercises/:id in `/backend/tests/contract/program-exercises.test.ts`
- [x] **T012** [P] Contract test PUT /api/program-exercises/:id/swap in `/backend/tests/contract/program-exercises.test.ts`
- [x] **T013** [P] Contract test PATCH /api/program-exercises/batch-reorder in `/backend/tests/contract/program-exercises.test.ts`

### VO2max Tracking Contracts
- [x] **T014** [P] Contract test POST /api/vo2max-sessions in `/backend/tests/contract/vo2max.test.ts`
- [x] **T015** [P] Contract test GET /api/vo2max-sessions in `/backend/tests/contract/vo2max.test.ts`
- [x] **T016** [P] Contract test GET /api/vo2max-sessions/:id in `/backend/tests/contract/vo2max.test.ts`

### Volume Analytics Contracts
- [x] **T017** [P] Contract test GET /api/analytics/volume-current-week in `/backend/tests/contract/analytics-volume.test.ts`
- [x] **T018** [P] Contract test GET /api/analytics/volume-trends in `/backend/tests/contract/analytics-volume.test.ts`
- [x] **T019** [P] Contract test GET /api/analytics/program-volume-analysis in `/backend/tests/contract/analytics-volume.test.ts`

**GATE**: Run `npm run test:contract` - All tests MUST FAIL before proceeding to Phase 4

---

## Phase 3: Integration Tests (from quickstart.md)

**CRITICAL**: Write integration tests BEFORE implementation

- [x] **T020** [P] Integration test: Exercise swap scenario in `/mobile/tests/integration/exercise-swap.test.ts`
- [x] **T021** [P] Integration test: VO2max session scenario in `/mobile/tests/integration/vo2max-session.test.ts`
- [x] **T022** [P] Integration test: Mesocycle progression scenario in `/mobile/tests/integration/mesocycle-progression.test.ts`
- [x] **T023** [P] Integration test: Program customization scenario in `/mobile/tests/integration/program-customization.test.ts`
- [x] **T024** [P] Integration test: Muscle volume tracking scenario in `/mobile/tests/integration/muscle-tracking.test.ts`

**GATE**: Integration tests written (will fail until implementation complete)

---

## Phase 4: Database Migrations

- [x] **T025** Create migration script `/backend/src/database/migrations/002_add_indices.sql` with:
  - Index on exercises.muscle_groups (JSON filtering)
  - Index on exercises.equipment
  - Index on program_exercises.program_day_id
- [x] **T026** Add VO2max table constraints (HR 60-220 bpm, VO2max 20-80 ml/kg/min) to schema.sql
- [x] **T027** Test migration script on dev database and verify indices with EXPLAIN QUERY PLAN

---

## Phase 5: Backend Services

### Exercise Service
- [x] **T028** [P] Create `/backend/src/services/exerciseService.ts` with filtering logic (muscle_group, equipment, movement_pattern)
- [x] **T029** Unit test exerciseService filtering in `/backend/tests/unit/exerciseService.test.ts`

### Program Service Enhancements
- [x] **T030** Add phase advancement logic to `/backend/src/services/programService.ts` (MEV→MAV→MRV→Deload transitions)
- [x] **T031** Add volume calculation method to programService (aggregate sets per muscle group)
- [x] **T032** Unit test phase advancement logic (verify +20% MEV→MAV, +15% MAV→MRV, -50% Deload)
- [x] **T033** Unit test volume calculation accuracy

### Program Exercise Service
- [x] **T034** Create `/backend/src/services/programExerciseService.ts` with CRUD operations
- [x] **T035** Add exercise swap logic with muscle group compatibility check
- [x] **T036** Add batch reorder transaction logic
- [x] **T037** Add volume validation warnings (MEV/MAV/MRV checks)
- [x] **T038** Unit test swap logic and compatibility checks

### VO2max Service
- [x] **T039** [P] Create `/backend/src/services/vo2maxService.ts` with Cooper formula implementation
- [x] **T040** Unit test Cooper formula calculation (verify formula accuracy)

### Volume Analytics Service
- [x] **T041** Create `/backend/src/services/volumeService.ts` with weekly aggregation logic
- [x] **T042** Add ISO 8601 week calculation (Monday-start, date-fns)
- [x] **T043** Add multi-muscle exercise handling (denormalized JSON array parsing)
- [x] **T044** Unit test volume aggregation (verify set counting per muscle group)
- [x] **T045** Performance test volume queries (target < 50ms)

---

## Phase 6: Backend Routes

### Exercise Routes
- [x] **T046** Create `/backend/src/routes/exercises.ts` with GET /api/exercises endpoint
- [x] **T047** Add GET /api/exercises/:id endpoint
- [x] **T048** Add JSON Schema validation for query parameters
- [x] **T049** Register exercise routes in server.ts

### Program Routes
- [x] **T050** Create `/backend/src/routes/programs.ts` with GET /api/programs endpoint
- [x] **T051** Add PATCH /api/programs/:id/advance-phase endpoint
- [x] **T052** Add GET /api/programs/:id/volume endpoint
- [x] **T053** Add JWT auth middleware to program routes
- [x] **T054** Register program routes in server.ts

### Program Exercise Routes
- [x] **T055** Create `/backend/src/routes/program-exercises.ts` with POST endpoint
- [x] **T056** Add PATCH /api/program-exercises/:id endpoint
- [x] **T057** Add DELETE /api/program-exercises/:id endpoint
- [x] **T058** Add PUT /api/program-exercises/:id/swap endpoint
- [x] **T059** Add PATCH /api/program-exercises/batch-reorder endpoint
- [x] **T060** Add JSON Schema validation for request bodies
- [x] **T061** Register program-exercises routes in server.ts

### VO2max Routes
- [x] **T062** Create `/backend/src/routes/vo2max.ts` with POST /api/vo2max-sessions endpoint
- [x] **T063** Add GET /api/vo2max-sessions endpoint (with pagination)
- [x] **T064** Add GET /api/vo2max-sessions/:id endpoint
- [x] **T065** Add JSON Schema validation (HR 60-220, duration 10-120 min)
- [x] **T066** Register vo2max routes in server.ts

### Analytics Routes
- [x] **T067** Extend `/backend/src/routes/analytics.ts` with GET /api/analytics/volume-current-week endpoint
- [x] **T068** Add GET /api/analytics/volume-trends endpoint (query params: weeks, muscle_group)
- [x] **T069** Add GET /api/analytics/program-volume-analysis endpoint
- [x] **T070** Add query parameter validation (weeks max 52, muscle_group enum)

**GATE**: Run contract tests - Should now PASS

---

## Phase 7: Mobile API Clients

- [x] **T071** [P] Create `/mobile/src/services/api/exercisesApi.ts` with getExercises, getExerciseById methods
- [x] **T072** [P] Create `/mobile/src/services/api/programsApi.ts` with getPrograms, advancePhase, getProgramVolume methods
- [x] **T073** [P] Create `/mobile/src/services/api/programExercisesApi.ts` with addExercise, updateExercise, deleteExercise, swapExercise, batchReorder methods
- [x] **T074** [P] Create `/mobile/src/services/api/vo2maxApi.ts` with createSession, getSessions, getSessionById methods
- [x] **T075** [P] Extend `/mobile/src/services/api/analyticsApi.ts` with getVolumeCurrentWeek, getVolumeTrends, getProgramVolumeAnalysis methods
- [x] **T076** Add TanStack Query hooks for all new API methods (with offline caching)

---

## Phase 8: Mobile UI Components

### Volume Tracking Components
- [x] **T077** [P] Create `/mobile/src/components/MuscleVolumeTracker.tsx` (Dashboard tile with horizontal bars)
- [x] **T078** [P] Create `/mobile/src/components/MuscleVolumeProgressBar.tsx` (progress bar with MEV/MAV/MRV markers)
- [x] **T079** [P] Create `/mobile/src/components/ProgramVolumeOverview.tsx` (Planner tile with warnings)
- [x] **T080** [P] Add unit tests for progress bar marker placement (MEV/MAV/MRV positioning)

### Exercise Selection Components
- [x] **T081** [P] Create `/mobile/src/components/ExerciseSelectionModal.tsx` (filter by muscle_group, equipment)
- [x] **T082** [P] Create `/mobile/src/components/ExerciseSwapButton.tsx` (triggers modal)

### VO2max Components
- [x] **T083** [P] Create `/mobile/src/components/VO2maxIntervalTimer.tsx` (Norwegian 4x4 protocol timer)
- [x] **T084** [P] Create `/mobile/src/components/VO2maxSessionSummary.tsx` (session completion screen)
- [x] **T085** Add audio cues and haptic feedback to interval timer (1 min, 30 sec, 10 sec warnings)

### Program Editor Components
- [x] **T086** [P] Create `/mobile/src/components/ProgramExerciseDraggable.tsx` (drag-and-drop card)
- [x] **T087** [P] Create `/mobile/src/components/VolumeValidationBanner.tsx` (MEV/MAV/MRV warnings)
- [x] **T088** Add React Native Gesture Handler for drag-and-drop functionality

---

## Phase 9: Screen Integrations

### Dashboard Screen
- [x] **T089** Integrate MuscleVolumeTracker tile into `/mobile/src/screens/DashboardScreen.tsx`
- [x] **T090** Add data fetching with TanStack Query (getVolumeCurrentWeek)
- [x] **T091** Add pull-to-refresh for volume data

### Planner Screen
- [x] **T092** Integrate ProgramVolumeOverview tile into `/mobile/src/screens/PlannerScreen.tsx`
- [x] **T093** Add ExerciseSelectionModal integration (swap functionality)
- [x] **T094** Add drag-and-drop reordering with VolumeValidationBanner
- [x] **T095** Add offline detection and blocking UI for program editing (NetInfo listener + blocking overlay when offline, implements FR-011a)
- [x] **T096** Add "Advance Phase" button with confirmation dialog

### VO2max Workout Screen
- [x] **T097** Create `/mobile/src/screens/VO2maxWorkoutScreen.tsx` with interval timer
- [x] **T098** Add heart rate zone calculation based on user age (220 - age)
- [x] **T099** Add VO2maxSessionSummary screen navigation after completion

### Analytics Screen
- [x] **T100** Add VO2max progress chart to `/mobile/src/screens/AnalyticsScreen.tsx`
- [x] **T101** Add volume trends chart with muscle group filter

---

## Phase 10: Validation & Polish

### Scenario Validation (from quickstart.md)
- [x] **T102** Manually test Scenario 1: Exercise Swap (8 acceptance criteria)
- [x] **T103** Manually test Scenario 2: VO2max Session (9 acceptance criteria)
- [x] **T104** Manually test Scenario 3: Mesocycle Progression (10 acceptance criteria)
- [x] **T105** Manually test Scenario 4: Program Customization (11 acceptance criteria)
- [x] **T106** Manually test Scenario 5: Muscle Volume Tracking (8 acceptance criteria)

### Performance Testing
- [x] **T107** Run backend performance benchmarks (SQLite < 5ms, API < 200ms)
- [x] **T108** Run mobile performance tests (UI < 100ms perceived latency)

### Code Quality
- [x] **T109** [P] Run ESLint on backend and fix violations
- [x] **T110** [P] Run ESLint on mobile and fix violations
- [x] **T111** Verify TypeScript strict mode compliance (no `any` types)
- [x] **T112** Run test coverage report (target ≥ 80% overall, 100% critical paths)

### Documentation
- [x] **T113** Update CLAUDE.md with new feature context (exercise library, programs, VO2max, volume tracking)
- [x] **T114** Document API endpoints in backend README
- [x] **T115** Add mobile component usage examples

---

## Dependencies

### Critical Path
1. **Setup** (T001-T003) → Must complete before any other phase
2. **Contract Tests** (T004-T019) → GATE: Must ALL FAIL before Phase 5
3. **Integration Tests** (T020-T024) → Should be written before implementation
4. **Database Migrations** (T025-T027) → Blocks backend services
5. **Backend Services** (T028-T045) → Blocks backend routes
6. **Backend Routes** (T046-T070) → GATE: Contract tests must PASS
7. **Mobile API Clients** (T071-T076) → Blocks mobile components
8. **Mobile Components** (T077-T088) → Blocks screen integrations
9. **Screen Integrations** (T089-T101) → Blocks validation
10. **Validation** (T102-T115) → Final phase

### Parallel Execution Examples

**Phase 2 - Contract Tests (all in parallel)**:
```bash
# Launch T004-T019 together (16 contract test files):
Task: "Contract test GET /api/exercises in exercises.test.ts"
Task: "Contract test GET /api/programs in programs.test.ts"
Task: "Contract test POST /api/program-exercises in program-exercises.test.ts"
Task: "Contract test POST /api/vo2max-sessions in vo2max.test.ts"
Task: "Contract test GET /api/analytics/volume-current-week in analytics-volume.test.ts"
# ... 11 more contract tests
```

**Phase 3 - Integration Tests (all in parallel)**:
```bash
# Launch T020-T024 together (5 integration scenarios):
Task: "Integration test exercise-swap.test.ts"
Task: "Integration test vo2max-session.test.ts"
Task: "Integration test mesocycle-progression.test.ts"
Task: "Integration test program-customization.test.ts"
Task: "Integration test muscle-tracking.test.ts"
```

**Phase 5 - Backend Services (some parallel)**:
```bash
# T028-T029 can run in parallel with T039-T040:
Task: "Create exerciseService.ts with filtering"
Task: "Create vo2maxService.ts with Cooper formula"
# But T030-T033 must wait for programService to exist
```

**Phase 7 - Mobile API Clients (all in parallel)**:
```bash
# Launch T071-T075 together (5 API client files):
Task: "Create exercisesApi.ts"
Task: "Create programsApi.ts"
Task: "Create programExercisesApi.ts"
Task: "Create vo2maxApi.ts"
Task: "Extend analyticsApi.ts"
```

**Phase 8 - Mobile Components (most parallel)**:
```bash
# Launch T077-T079, T081-T082, T083-T084, T086-T087 together (9 components):
Task: "Create MuscleVolumeTracker.tsx"
Task: "Create MuscleVolumeProgressBar.tsx"
Task: "Create ProgramVolumeOverview.tsx"
Task: "Create ExerciseSelectionModal.tsx"
# ... 5 more components
```

---

## Estimated Effort

**Total Tasks**: 115 (exceeds initial estimate of 45-50 due to comprehensive TDD approach)

**Time Estimates**:
- Phase 1: Setup (1 hour)
- Phase 2: Contract Tests (8 hours) - 16 test files
- Phase 3: Integration Tests (6 hours) - 5 scenarios
- Phase 4: Database Migrations (2 hours)
- Phase 5: Backend Services (12 hours) - 5 services with unit tests
- Phase 6: Backend Routes (10 hours) - 9 endpoints across 5 route files
- Phase 7: Mobile API Clients (4 hours) - 5 API client files
- Phase 8: Mobile Components (12 hours) - 12 components with tests
- Phase 9: Screen Integrations (8 hours) - 4 screens
- Phase 10: Validation (6 hours) - Manual testing, performance, polish

**Total Estimated Time**: 69 hours (~9 days at 8 hours/day)

---

## Success Criteria

### Must Pass All Gates
- ✅ Contract tests fail initially (Phase 2 GATE)
- ✅ Contract tests pass after implementation (Phase 6 GATE)
- ✅ All 5 quickstart scenarios pass (Phase 10)
- ✅ Performance benchmarks met (SQLite < 5ms, API < 200ms)
- ✅ Test coverage ≥ 80% (100% on critical paths)
- ✅ No TypeScript errors, no ESLint violations
- ✅ Constitution compliance verified (TDD, performance, security)

### Acceptance Criteria (from spec.md)
- ✅ FR-001 to FR-030: All 30 functional requirements implemented
- ✅ 46 acceptance tests passing (from 5 quickstart scenarios)
- ✅ Volume tracking visualized on Dashboard and Planner
- ✅ Exercise library browsable with filtering
- ✅ Program customization with real-time validation
- ✅ VO2max sessions tracked with Norwegian 4x4 protocol
- ✅ Mesocycle phase advancement with automatic volume adjustment

---

## Notes

- **NO mobile SQLite**: All database operations use backend API (confirmed in architecture review)
- **Last-write-wins**: Conflict resolution based on server timestamps
- **Offline mode**: Programs cached via API responses (read-only offline)
- **Cooper formula**: VO2max calculation uses internal implementation (no external API)
- **MEV/MAV/MRV**: Volume landmarks stored in TypeScript constants, not database
- **ISO 8601 weeks**: Monday-start using date-fns library
- **Multi-muscle exercises**: Full set counting per muscle group (no fractional sets)

---

**Generated from**: `/specs/002-actual-gaps-ultrathink/plan.md`
**Task generation date**: 2025-10-03
**Ready for execution**: YES - /tasks command complete
