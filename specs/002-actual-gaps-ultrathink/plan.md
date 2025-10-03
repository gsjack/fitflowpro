# Implementation Plan: Complete Missing Core Features

**Branch**: `002-actual-gaps-ultrathink` | **Date**: 2025-10-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-actual-gaps-ultrathink/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ Spec loaded with 30 functional requirements (FR-001 to FR-030)
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ All clarifications resolved via /clarify session (7 questions answered)
3. Fill the Constitution Check section
   → ✅ No constitutional violations
4. Evaluate Constitution Check
   → ✅ PASS - All requirements align with constitution
5. Execute Phase 0 → research.md
   → ✅ Complete - All 7 technical decisions documented
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → ✅ Complete - 5 contract files, data model, 5 test scenarios, agent context updated
7. Re-evaluate Constitution Check
   → ✅ PASS - Design meets all constitutional requirements
8. Plan Phase 2 → Describe task generation approach
   → ✅ Ready for /tasks command
9. STOP - Ready for /tasks command
   → ✅ Planning phase complete
```

## Summary

Complete 4 missing feature sets blocking 25% of FitFlow Pro functionality:

1. **Exercise Library API** - Browse/filter 114 exercises, enable exercise swapping
2. **Program Customization** - Add/remove/modify exercises with MEV/MAV/MRV validation
3. **VO2max Cardio Tracking** - Log Norwegian 4x4 sessions, calculate VO2max estimates
4. **Muscle Volume Tracking** - Dashboard/Planner tiles showing completed/planned/recommended sets per muscle group

**Technical Approach**: Extend existing Fastify backend with 9 new endpoints, enhance mobile app with volume tracking components, implement Cooper Test formula for VO2max calculation, use last-write-wins sync conflict resolution.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 20 LTS
**Primary Dependencies**: Fastify 4.26+, better-sqlite3, React Native (Expo SDK 54+), Zustand, TanStack Query, React Native Paper
**Storage**: SQLite with WAL mode, 114 pre-seeded exercises, unlimited data retention
**Testing**: Vitest (backend), React Native Testing Library (mobile), Tap (contract tests)
**Target Platform**: Mobile (iOS/Android via Expo), Raspberry Pi 5 ARM64 server
**Project Type**: Mobile + API (mobile/api architecture)
**Performance Goals**: SQLite writes < 5ms p95, API responses < 200ms p95, UI interactions < 100ms perceived latency
**Constraints**: Offline-first (workout logging), online-required (program editing), last-write-wins conflict resolution
**Scale/Scope**: Single user per device, 114 exercises, 10 muscle groups, unlimited history retention

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **Test-First (TDD)**: Contract tests generated before implementation (5 OpenAPI specs in /contracts/)
✅ **Performance**: All endpoints target < 200ms p95 (documented in research.md)
✅ **Security**: JWT auth, bcrypt hashing, input validation via JSON Schema
✅ **Code Quality**: TypeScript strict mode, ESLint compliance
✅ **Offline-First**: Program viewing cached locally, editing requires online connection
✅ **Local-First**: Mobile SQLite remains source of truth for workouts, sync queue for programs

**Status**: ✅ PASS - No violations

## Project Structure

### Documentation (this feature)
```
specs/002-actual-gaps-ultrathink/
├── plan.md              # This file
├── spec.md              # Feature specification with 30 FRs
├── research.md          # Phase 0 output (7 technical decisions)
├── data-model.md        # Phase 1 output (schema changes, query patterns)
├── quickstart.md        # Phase 1 output (5 integration test scenarios)
├── contracts/           # Phase 1 output (5 OpenAPI schemas)
│   ├── exercises.yaml
│   ├── programs.yaml
│   ├── program-exercises.yaml
│   ├── vo2max.yaml
│   └── analytics-volume.yaml
└── tasks.md             # Phase 2 output (NOT created yet - awaiting /tasks command)
```

### Source Code (repository root)
```
backend/
├── src/
│   ├── routes/
│   │   ├── exercises.ts          # NEW: Exercise library endpoints
│   │   ├── programs.ts            # NEW: Program CRUD endpoints
│   │   ├── program-exercises.ts   # NEW: Program exercise editor
│   │   ├── vo2max.ts              # NEW: VO2max session tracking
│   │   ├── analytics.ts           # MODIFY: Add volume tracking endpoints
│   │   └── (12 existing routes)
│   ├── services/
│   │   ├── exerciseService.ts     # NEW: Exercise filtering logic
│   │   ├── programService.ts      # MODIFY: Add phase advancement, volume calc
│   │   ├── vo2maxService.ts       # NEW: VO2max calculation (Cooper formula)
│   │   ├── volumeService.ts       # NEW: Weekly volume aggregation
│   │   └── (5 existing services)
│   └── database/
│       ├── schema.sql             # MODIFY: Add indices for muscle_groups filtering
│       └── migrations/
│           └── 002_add_indices.sql  # NEW: Migration script
└── tests/
    └── contract/
        ├── exercises.test.ts      # NEW: 12 contract tests
        ├── programs.test.ts       # NEW: 8 contract tests
        ├── program-exercises.test.ts  # NEW: 15 contract tests
        ├── vo2max.test.ts         # NEW: 10 contract tests
        └── analytics-volume.test.ts   # NEW: 8 contract tests

mobile/
├── src/
│   ├── screens/
│   │   ├── DashboardScreen.tsx    # MODIFY: Add MuscleVolumeTracker tile
│   │   └── PlannerScreen.tsx      # MODIFY: Add ProgramVolumeOverview tile
│   ├── components/
│   │   ├── MuscleVolumeTracker.tsx    # NEW: Dashboard volume tile
│   │   ├── ProgramVolumeOverview.tsx  # NEW: Planner volume tile
│   │   ├── MuscleVolumeProgressBar.tsx # NEW: Progress bar with MEV/MAV/MRV markers
│   │   └── (10+ existing components)
│   ├── services/
│   │   ├── api/
│   │   │   ├── exercisesApi.ts    # NEW: Exercise library API client
│   │   │   ├── programsApi.ts     # NEW: Program CRUD API client
│   │   │   ├── vo2maxApi.ts       # NEW: VO2max API client
│   │   │   └── analyticsApi.ts    # MODIFY: Add volume tracking endpoints
│   │   └── volume/
│   │       └── volumeCalculator.ts  # NEW: Client-side volume aggregation
│   └── constants/
│       └── volumeLandmarks.ts     # EXISTS: MEV/MAV/MRV values (no changes needed)
└── tests/
    └── integration/
        ├── exercise-swap.test.ts  # NEW: Scenario 1 integration test
        ├── vo2max-session.test.ts # NEW: Scenario 2 integration test
        ├── mesocycle-progression.test.ts  # NEW: Scenario 3 integration test
        ├── program-customization.test.ts  # NEW: Scenario 4 integration test
        └── muscle-tracking.test.ts        # NEW: Scenario 5 integration test
```

**Structure Decision**: Mobile + API architecture. Backend extends existing Fastify routes. Mobile enhances existing React Native screens with new volume tracking components. No new projects or major architectural changes required.

## Phase 0: Outline & Research

**Status**: ✅ COMPLETE

### Research Areas Completed

1. **VO2max Calculation Formula** → Cooper Test Formula
2. **Last-Write-Wins Sync** → Server timestamp authority
3. **Progress Bar Visualization** → React Native Paper + Custom Markers
4. **Multi-Muscle Exercise Tracking** → Denormalized JSON Array
5. **Offline Read-Only Mode** → NetInfo + Conditional Rendering
6. **Week Boundary Calculation** → ISO 8601 Monday-Start (date-fns)
7. **Duplicate Exercise Handling** → No UNIQUE Constraint (order_index differentiation)

**Output**: `/specs/002-actual-gaps-ultrathink/research.md` (38KB, 7 detailed technical decisions)

## Phase 1: Design & Contracts

**Status**: ✅ COMPLETE

### Artifacts Generated

1. **Data Model** (`data-model.md`, 27KB)
   - Schema modifications: Add 3 indices for muscle_groups/equipment filtering
   - VO2max table constraints: HR 60-220 bpm, VO2max 20-80 ml/kg/min
   - Query patterns for volume aggregation (< 50ms performance target)
   - MEV/MAV/MRV storage decision: TypeScript constants (not database)

2. **API Contracts** (`contracts/`, 5 OpenAPI 3.0 files)
   - `exercises.yaml`: GET /api/exercises, GET /api/exercises/:id
   - `programs.yaml`: GET /api/programs, PATCH /api/programs/:id/advance-phase, GET /api/programs/:id/volume
   - `program-exercises.yaml`: POST/PATCH/DELETE /api/program-exercises, PUT /swap, PATCH /batch-reorder
   - `vo2max.yaml`: POST/GET /api/vo2max-sessions, GET /api/vo2max-sessions/:id
   - `analytics-volume.yaml`: GET /api/analytics/volume-current-week, GET /volume-trends, GET /program-volume-analysis

3. **Integration Test Scenarios** (`quickstart.md`, 48KB)
   - Scenario 1: Exercise Swap (8 steps, API + Mobile interactions)
   - Scenario 2: VO2max Session (9 steps, Norwegian 4x4 protocol execution)
   - Scenario 3: Mesocycle Progression (10 steps, MEV→MAV→MRV→Deload transitions)
   - Scenario 4: Program Customization (11 steps, drag-drop, volume validation)
   - Scenario 5: Muscle Volume Tracking (8 steps, Dashboard + Planner tiles)

4. **Agent Context Update** (`CLAUDE.md` updated)
   - Added database: SQLite with WAL mode
   - Preserved existing project documentation structure

**Output**: All Phase 1 artifacts generated and validated

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **Load Base Template**: `.specify/templates/tasks-template.md`

2. **Generate Backend Tasks** (from contracts):
   - For each OpenAPI endpoint → Contract test task [P]
   - For each service → Service implementation task
   - Exercise Library: 3 tasks (contract tests, service, routes)
   - Programs: 4 tasks (contract tests, service, routes, phase advancement logic)
   - Program Exercises: 5 tasks (contract tests, CRUD service, swap logic, reorder logic, routes)
   - VO2max: 4 tasks (contract tests, Cooper formula implementation, service, routes)
   - Analytics Volume: 4 tasks (contract tests, aggregation service, query optimization, routes)

3. **Generate Mobile Tasks** (from quickstart scenarios):
   - For each API client → API service implementation task [P]
   - For each component → Component implementation task [P]
   - MuscleVolumeTracker: 3 tasks (component, progress bar, integration)
   - ProgramVolumeOverview: 2 tasks (component, integration)
   - Dashboard integration: 2 tasks (tile placement, data fetching)
   - Planner integration: 2 tasks (tile placement, warnings)

4. **Generate Integration Test Tasks** (from quickstart scenarios):
   - Scenario 1 → Exercise swap integration test
   - Scenario 2 → VO2max session integration test
   - Scenario 3 → Mesocycle progression integration test
   - Scenario 4 → Program customization integration test
   - Scenario 5 → Volume tracking integration test

5. **Generate Database Migration Tasks**:
   - Create migration script: 002_add_indices.sql
   - Execute migration on dev database
   - Verify indices with EXPLAIN QUERY PLAN

**Ordering Strategy**:
- **TDD Order**: Contract tests → Integration tests → Implementation
- **Dependency Order**:
  - Phase 1: Backend contracts (all parallel [P])
  - Phase 2: Backend services (depends on contracts)
  - Phase 3: Backend routes (depends on services)
  - Phase 4: Mobile API clients (depends on backend routes) [P]
  - Phase 5: Mobile components (depends on API clients) [P]
  - Phase 6: Screen integrations (depends on components)
  - Phase 7: Integration tests (depends on all implementation)
  - Phase 8: Validation & performance testing

**Estimated Output**: 45-50 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD principles)
**Phase 5**: Validation (run quickstart.md scenarios, performance benchmarks, test coverage check)

**Estimated Implementation Time**:
- Backend (20 tasks): 12-16 hours
- Mobile (18 tasks): 10-14 hours
- Integration/Testing (12 tasks): 6-8 hours
- **Total**: 28-38 hours (3.5-4.5 days)

## Complexity Tracking

**No constitutional violations** - All design decisions align with project constitution.

Optional enhancements (out of scope for this feature):
- Custom exercise creation (marked as "Phase 2 feature" in spec)
- Exercise demo videos/images
- Social sharing of programs
- Multi-user program templates

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - approach described)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (7 clarifications in spec.md)
- [x] Complexity deviations documented (none)

**Artifacts Generated**:
- [x] research.md (38KB, 7 technical decisions)
- [x] data-model.md (27KB, schema changes, query patterns)
- [x] quickstart.md (48KB, 5 integration scenarios)
- [x] contracts/ (5 OpenAPI schemas)
- [x] CLAUDE.md updated with database context

---

**Ready for `/tasks` command** to generate task breakdown.

*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
