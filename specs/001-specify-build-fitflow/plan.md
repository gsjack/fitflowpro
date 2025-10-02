
# Implementation Plan: FitFlow Pro - Evidence-Based Training Application

**Branch**: `001-specify-build-fitflow` | **Date**: 2025-10-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/asigator/fitness/specs/001-specify-build-fitflow/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

FitFlow Pro is a mobile-first fitness training application implementing Renaissance Periodization methodology for evidence-based hypertrophy and cardiovascular training. The app provides:

**Core Capabilities**:
- Real-time workout tracking with set logging (weight, reps, RIR)
- Intelligent auto-regulation based on daily recovery assessments
- 6-day training split (Push A/Pull A/VO2max/Push B/Pull B/Zone2)
- Comprehensive analytics (1RM progression, volume tracking, VO2max improvements)
- Drag-and-drop training planner with MEV/MAV/MRV volume validation
- Mesocycle periodization with automatic phase advancement

**Technical Approach**:
- **Local-first architecture**: Mobile app functions completely offline; SQLite is single source of truth during workouts
- **Background timer solution**: Silent audio session keeps iOS timers running in background
- **Reliable sync**: Queue-based background sync with exponential backoff retry logic
- **Session locking**: Single-device workout sessions prevent sync conflicts
- **React Native + Expo** for cross-platform mobile development
- **Fastify + SQLite backend** optimized for Raspberry Pi 5 deployment

## Technical Context

**Language/Version**: TypeScript 5.3+
**Primary Dependencies**:
  - Frontend: React Native (Expo SDK 54+), Zustand 4.5+, TanStack Query 5.28+, React Native Paper 5.12+
  - Backend: Fastify 4.26+, better-sqlite3 11.0+, @fastify/jwt 8.0+, bcrypt 5.1+
**Storage**: SQLite (local expo-sqlite + server better-sqlite3)
**Testing**: Vitest (mobile unit tests), React Native Testing Library (component tests), Tap (backend tests)
**Target Platform**: iOS 15+ / Android 10+ mobile apps + Raspberry Pi 5 ARM64 server
**Project Type**: mobile (React Native app + Node.js API backend)
**Performance Goals**:
  - UI response < 100ms for all user interactions
  - SQLite writes < 5ms
  - Background sync non-blocking
  - API response < 200ms (p95)
  - Background timer functionality in iOS
**Constraints**:
  - Offline-first mandatory (gym WiFi unreliable)
  - Zero data loss tolerance during workouts
  - iOS background execution limits (~30s after backgrounding)
  - Raspberry Pi 5 hardware constraints (ARM64, limited resources)
**Scale/Scope**:
  - Single-user initially (personal fitness tracking)
  - Support 10,000+ logged sets per user
  - 100+ exercise library
  - Multi-device sync support

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Test-Driven Development (NON-NEGOTIABLE)
**Status**: ✅ PASS (with documented approach)
- TDD will be enforced: Contract tests → Integration tests → Implementation
- Phase 1 generates failing contract tests before any implementation
- Quickstart.md will document test execution validation steps

### II. Code Quality Standards
**Status**: ✅ PASS
- TypeScript strict mode enforced (no `any` types)
- ESLint configured for both mobile and backend
- Target 80% coverage minimum; critical paths (auth, data sync, workout logging) require 100%
- Function complexity ≤ 10 (enforced via ESLint complexity rules)
- Inline documentation for public APIs and complex algorithms (1RM calculations, volume tracking)

### III. User Experience Consistency
**Status**: ✅ PASS
- React Native Paper provides Material Design consistency
- Responsive design across mobile viewports (320px+)
- Offline capability is core architectural requirement
- Loading states for async operations > 200ms (network sync)
- Clear error messages (e.g., "Session locked on another device" for multi-device conflicts)

### IV. Performance Requirements
**Status**: ✅ PASS
- UI renders < 100ms (local SQLite queries < 5ms, instant UI updates)
- API < 200ms (p95) - backend endpoints optimized with better-sqlite3
- Mobile bundle size managed via Expo code splitting
- Memory < 100MB mobile, < 512MB backend (Raspberry Pi constraint)
- Database indices on workout_id, user_id, synced flag, foreign keys

### V. Security First
**Status**: ⚠️ PARTIAL (documented justification)
- **Email/password authentication** (clarified: no OAuth)
- **Bcrypt password hashing** (cost ≥ 12) - meets constitution
- **JWT tokens** with 30-day expiration (constitution requires 24-hour inactivity expiration)
  - **Justification**: Home server use case; user convenience prioritized; tokens stored securely in AsyncStorage
- **Input validation**: JSON Schema validation on all API endpoints
- **Parameterized queries**: better-sqlite3 prepared statements
- **Audit logging**: Authentication events, workout modifications logged with user ID and timestamp

**Violation Documented**: JWT token expiration (30 days vs. 24-hour inactivity requirement)

### Testing Standards
**Status**: ✅ PASS
- Contract tests: API endpoint schemas validated before implementation
- Integration tests: End-to-end scenarios from spec acceptance criteria
- Unit tests: Utilities (1RM calc, recovery score) tested in isolation
- Performance tests: SQLite query benchmarks, API response time assertions
- All tests deterministic, < 5 seconds execution, Given-When-Then naming

### Development Workflow
**Status**: ✅ PASS (adapted for solo development)
- Code review: Self-review using constitution checklist
- Branching: Feature branch `001-specify-build-fitflow` from master
- Deployment gates: All tests passing, coverage ≥ 80%, performance benchmarks met

### Performance Standards
**Status**: ✅ PASS
- Mobile: Core Web Vitals not applicable (native mobile app)
- Backend: Fastify + SQLite optimized for Raspberry Pi 5 (WAL mode, 64MB cache, memory-mapped I/O)
- Monitoring: PM2 for process management, health check endpoint, structured logging

## Project Structure

### Documentation (this feature)
```
specs/001-specify-build-fitflow/
├── plan.md              # This file (/plan command output)
├── spec.md              # Feature specification (complete)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── auth.openapi.yaml
│   ├── workouts.openapi.yaml
│   ├── sets.openapi.yaml
│   ├── recovery.openapi.yaml
│   └── analytics.openapi.yaml
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
mobile/
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── workout/        # Workout-specific components
│   │   ├── planner/        # Training planner components
│   │   ├── analytics/      # Charts and visualizations
│   │   └── common/         # Buttons, Cards, etc.
│   ├── screens/            # Screen components
│   │   ├── AuthScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── WorkoutScreen.tsx
│   │   ├── PlannerScreen.tsx
│   │   ├── AnalyticsScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── navigation/         # React Navigation setup
│   ├── services/           # Business logic layer
│   │   ├── database/       # SQLite operations
│   │   ├── sync/           # Background sync logic
│   │   ├── timer/          # Rest timer with background audio
│   │   └── api/            # Server API client
│   ├── stores/             # Zustand state stores
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript type definitions
│   └── constants/          # App constants
├── assets/                 # Images, fonts, silence.mp3
└── tests/
    ├── contract/           # API contract tests
    ├── integration/        # End-to-end scenario tests
    └── unit/               # Utility/function unit tests

backend/
├── src/
│   ├── routes/             # API route handlers
│   │   ├── auth.ts
│   │   ├── workouts.ts
│   │   ├── sets.ts
│   │   ├── programs.ts
│   │   ├── recovery.ts
│   │   └── analytics.ts
│   ├── services/           # Business logic
│   │   ├── authService.ts
│   │   ├── workoutService.ts
│   │   ├── syncService.ts
│   │   └── analyticsService.ts
│   ├── database/           # Database layer
│   │   ├── schema.sql
│   │   └── db.ts
│   ├── middleware/         # Fastify middleware
│   │   ├── auth.ts
│   │   └── validation.ts
│   ├── types/              # TypeScript types
│   └── server.ts           # Entry point
├── data/                   # SQLite database file
├── logs/                   # Application logs
└── tests/
    ├── contract/           # API contract tests
    ├── integration/        # API integration tests
    └── unit/               # Service unit tests
```

**Structure Decision**: Mobile + API architecture selected. React Native mobile app with TypeScript handles all user interactions and maintains local SQLite database. Node.js Fastify backend running on Raspberry Pi 5 provides backup sync and multi-device coordination. Local-first architecture ensures mobile app functions completely offline; server is optional for single-device usage.

## Phase 0: Outline & Research

### Research Topics

No NEEDS CLARIFICATION markers remain in the specification (all resolved via /clarify command). Research focuses on:

1. **Background Timer on iOS**
   - **Challenge**: iOS terminates background execution after ~30 seconds
   - **Research**: Silent audio session workaround, expo-av capabilities, notification strategies

2. **Offline-First Sync Architecture**
   - **Challenge**: Reliable sync with retry logic and conflict resolution
   - **Research**: Queue-based sync patterns, exponential backoff strategies, timestamp-based conflict resolution

3. **SQLite Performance Optimization**
   - **Challenge**: Fast writes during workouts (< 5ms target)
   - **Research**: WAL mode, indexing strategies, denormalization patterns, transaction batching

4. **Renaissance Periodization Volume Landmarks**
   - **Challenge**: Accurate MEV/MAV/MRV thresholds per muscle group
   - **Research**: RP methodology documentation, volume progression algorithms, deload protocols

5. **1RM Estimation Formulas**
   - **Challenge**: Accurate strength progression tracking
   - **Research**: Epley vs. Brzycki formulas, accuracy ranges, confidence intervals

6. **Raspberry Pi 5 Deployment**
   - **Challenge**: Resource-constrained ARM64 server
   - **Research**: Node.js ARM64 optimization, better-sqlite3 performance tuning, PM2 configuration

### Research Output

Research findings documented in `research.md` with format:
- **Decision**: Technology/approach chosen
- **Rationale**: Why this choice over alternatives
- **Alternatives Considered**: Other options evaluated
- **Implementation Notes**: Key configuration details

**Output**: /home/asigator/fitness/specs/001-specify-build-fitflow/research.md

## Phase 1: Design & Contracts

*Prerequisites: research.md complete*

### 1. Data Model Extraction

Extract entities from specification (11 key entities identified):
- **User**: Account credentials, preferences, mesocycle state
- **Exercise**: Name, muscle groups, equipment, default sets/reps/RIR
- **Training Program**: 6-day split structure, mesocycle phase
- **Program Day**: Day name (Push A/Pull A/etc.), exercise list
- **Workout Session**: Actual training session with status, volume, RIR metrics
- **Set**: Individual set performance (weight, reps, RIR, timestamp)
- **Recovery Assessment**: Daily 3-question check (sleep, soreness, stress)
- **VO2max Session**: Cardio protocol data (4x4, Zone 2)
- **Mesocycle**: Training block (4-6 weeks accumulation + deload)
- **Muscle Group Volume**: Weekly volume vs. MEV/MAV/MRV landmarks
- **Exercise Swap**: Training planner customizations

Document in `data-model.md`:
- Entity schemas with field types, validation rules, relationships
- State transitions (workout status: not_started → in_progress → completed/cancelled)
- Index strategy for performance

### 2. API Contracts Generation

From functional requirements (FR-001 through FR-042), generate REST endpoints:

**Authentication** (`/api/auth`):
- POST `/register` - Create account (email/password)
- POST `/login` - Authenticate user (returns JWT)
- POST `/logout` - Invalidate token

**Workouts** (`/api/workouts`):
- GET `/workouts` - List workouts (filtered by date range)
- GET `/workouts/:id` - Get workout details
- POST `/workouts` - Create workout session
- PATCH `/workouts/:id` - Update workout (status, volume)
- POST `/workouts/:id/resume` - Resume interrupted session

**Sets** (`/api/sets`):
- GET `/sets/:workoutId` - Get sets for workout
- POST `/sets` - Log completed set (weight, reps, RIR)
- PATCH `/sets/:id` - Update set notes

**Recovery** (`/api/recovery-assessments`):
- GET `/recovery-assessments` - Recent assessments
- POST `/recovery-assessments` - Submit daily assessment

**Analytics** (`/api/analytics`):
- GET `/analytics/1rm-progression` - Strength trends by lift
- GET `/analytics/volume-trends` - Weekly volume by muscle group
- GET `/analytics/consistency` - Adherence rate, session duration

Output OpenAPI 3.0 schemas to `/contracts/` directory.

### 3. Contract Tests Generation

One test file per endpoint group:
- `tests/contract/test_auth_contract.ts` - Authentication endpoints
- `tests/contract/test_workouts_contract.ts` - Workout CRUD
- `tests/contract/test_sets_contract.ts` - Set logging
- `tests/contract/test_recovery_contract.ts` - Recovery assessments
- `tests/contract/test_analytics_contract.ts` - Analytics queries

Tests must:
- Assert request schema validation (required fields, type constraints)
- Assert response schema structure
- **MUST FAIL** initially (no implementation exists yet)

### 4. Integration Test Scenarios

Extract from acceptance scenarios (Scenario 1-5 in spec.md):
- **Scenario 1**: Complete guided workout session (8 exercises, set logging, resume after interrupt)
- **Scenario 2**: Auto-regulation based on recovery (poor recovery → volume reduction)
- **Scenario 3**: Track and analyze progression (4-week mesocycle analytics)
- **Scenario 4**: Plan and customize training (drag-and-drop exercise swaps with validation)
- **Scenario 5**: Execute VO2max cardio protocol (Norwegian 4x4 with interval timers)

Document as test scenarios in `quickstart.md` with validation steps.

### 5. Agent Context Update

Run:
```bash
.specify/scripts/bash/update-agent-context.sh claude
```

Updates `CLAUDE.md` (if exists) or creates it with:
- Tech stack summary (React Native, Expo, Fastify, SQLite)
- Architecture patterns (local-first, background timer, sync queue)
- Recent changes (plan creation, contract generation)
- Keep under 150 lines

**Output**:
- `/home/asigator/fitness/specs/001-specify-build-fitflow/data-model.md`
- `/home/asigator/fitness/specs/001-specify-build-fitflow/contracts/*.openapi.yaml`
- `/home/asigator/fitness/specs/001-specify-build-fitflow/quickstart.md`
- `/home/asigator/fitness/CLAUDE.md` (or repository root agent file)
- Contract test files (failing tests)

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base structure
2. Generate tasks from Phase 1 artifacts:
   - **From contracts/**: Each OpenAPI endpoint → contract test task [P] + implementation task
   - **From data-model.md**: Each entity → SQLite schema creation [P] + model service task
   - **From quickstart.md**: Each scenario → integration test task

**Example Task Breakdown**:
- **Setup Phase** (T001-T005):
  - T001: Initialize mobile app (Expo, TypeScript, ESLint, Prettier)
  - T002: Initialize backend (Fastify, TypeScript, better-sqlite3)
  - T003: [P] Configure SQLite schema (mobile)
  - T004: [P] Configure SQLite schema (backend)
  - T005: [P] Setup testing frameworks (Vitest, Tap, React Native Testing Library)

- **Contract Tests Phase** (T006-T025):
  - T006: [P] Contract test POST /api/auth/register
  - T007: [P] Contract test POST /api/auth/login
  - T008: [P] Contract test POST /api/workouts
  - ... (one test per endpoint)
  - Tests MUST FAIL (no implementation yet)

- **Core Implementation Phase** (T026-T060):
  - T026: Authentication service (bcrypt, JWT)
  - T027: Workout service (CRUD operations)
  - T028: Set logging service
  - T029: Background timer implementation (silent audio session)
  - T030: Sync queue implementation
  - ... (TDD: make contract tests pass)

- **Integration Tests Phase** (T061-T065):
  - T061: [P] Integration test: Complete guided workout session
  - T062: [P] Integration test: Auto-regulation based on recovery
  - T063: [P] Integration test: Track and analyze progression
  - T064: [P] Integration test: Plan and customize training
  - T065: [P] Integration test: Execute VO2max cardio protocol

- **Polish Phase** (T066-T070):
  - T066: Performance benchmarks (SQLite < 5ms, API < 200ms)
  - T067: Code coverage verification (≥ 80%)
  - T068: Linting and formatting enforcement
  - T069: Documentation (inline comments, API docs)
  - T070: Execute quickstart.md validation

**Ordering Strategy**:
- **TDD order**: Contract tests → Implementation → Integration tests
- **Dependency order**:
  - Database schema before services
  - Authentication before protected endpoints
  - Sync queue before background operations
- **Parallelization**: Mark [P] for independent tasks (different files, no dependencies)

**Estimated Output**: 70-80 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| JWT token 30-day expiration (vs. 24-hour inactivity requirement) | **Home server single-user deployment**: (1) Raspberry Pi 5 backend on private home network (not public cloud); (2) FR-036 requires indefinite workout history retention → users expect persistent sessions; (3) Tokens stored in secure AsyncStorage (iOS Keychain/Android Keystore); (4) Single-user fitness tracking (not multi-tenant SaaS); (5) Mitigation: Token refresh rotation planned for Phase 2 enhancement | 24-hour expiration would require daily re-authentication, disrupting morning recovery assessments (FR-008) and violating UX consistency principle (III). Alternative (refresh tokens with 7-day expiration) rejected to minimize complexity in MVP; will revisit post-launch if multi-user support added. |


## Progress Tracking

*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✓ research.md created
- [x] Phase 1: Design complete (/plan command) ✓ data-model.md, contracts/, quickstart.md, CLAUDE.md created
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✓ Approach documented
- [ ] Phase 3: Tasks generated (/tasks command) → Ready for /tasks
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (1 violation documented and justified)
- [x] Post-Design Constitution Check: PASS (no new violations introduced)
- [x] All NEEDS CLARIFICATION resolved (via /clarify command)
- [x] Complexity deviations documented (JWT expiration policy)

**Artifacts Generated**:
- ✅ `/specs/001-specify-build-fitflow/research.md` (6 research topics with decisions)
- ✅ `/specs/001-specify-build-fitflow/data-model.md` (10 entities, indices, sync strategy)
- ✅ `/specs/001-specify-build-fitflow/contracts/auth.openapi.yaml` (Authentication API)
- ✅ `/specs/001-specify-build-fitflow/contracts/workouts.openapi.yaml` (Workouts & Sets API)
- ✅ `/specs/001-specify-build-fitflow/quickstart.md` (5 test scenarios, validation checks)
- ✅ `/home/asigator/fitness/CLAUDE.md` (Agent context updated)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
