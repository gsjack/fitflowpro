# Feature Specification: Complete Missing Core Features

**Feature Branch**: `002-actual-gaps-ultrathink`
**Created**: 2025-10-03
**Status**: Draft
**Input**: User description: "actual gaps ultrathink with subagents 002-feature and put it on a pr"

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature identified: Complete 3 missing API feature sets blocking 25% of app functionality
2. Extract key concepts from description
   → Actors: FitFlow Pro users (strength trainers)
   → Actions: Browse exercises, customize programs, log cardio, track progression
   → Data: Exercise library, program configurations, VO2max sessions, mesocycle phases
   → Constraints: Must integrate with existing workout logging and analytics
3. For each unclear aspect:
   → All requirements are clear from existing spec.md and validation analysis
4. Fill User Scenarios & Testing section
   → Scenario 1: User swaps exercise in program (blocked by missing exercise API)
   → Scenario 2: User logs VO2max cardio session (blocked by missing VO2max API)
   → Scenario 3: User advances mesocycle phase (blocked by missing progression logic)
5. Generate Functional Requirements
   → FR-001 to FR-018 cover exercise browsing, program editing, cardio tracking, phase progression
6. Identify Key Entities
   → Exercises, Programs, ProgramExercises, VO2maxSessions, MesocyclePhases
7. Run Review Checklist
   → No implementation details included
   → All requirements testable
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story

**As a strength training athlete**, I want to customize my training program by swapping exercises, track my cardiovascular fitness through VO2max sessions, and progress through mesocycle phases, so that I can optimize my training for long-term gains while preventing overtraining and staleness.

**Current Blocker**: The mobile app has complete UI for these features but cannot save/load data because backend endpoints are missing.

### Acceptance Scenarios

#### Scenario 1: Exercise Swap in Program Planner
1. **Given** I open the Planner screen and view my current 6-day program
   **When** I tap "Swap Exercise" on Barbell Bench Press
   **Then** I see a list of alternative chest exercises (Dumbbell Bench Press, Incline Press, etc.)

2. **Given** I select "Dumbbell Bench Press" as replacement
   **When** I confirm the swap
   **Then** my program updates to show Dumbbell Bench Press with the same set/rep scheme

3. **Given** I have 12 sets per week allocated to chest
   **When** I swap an exercise
   **Then** my total chest volume (MEV/MAV/MRV landmarks) remains unchanged

#### Scenario 2: VO2max Cardio Session
1. **Given** I complete Week 6 strength training and need cardio
   **When** I start a VO2max session in the app
   **Then** the system guides me through Norwegian 4x4 intervals (4 min high intensity, 3 min recovery × 4 rounds)

2. **Given** I complete all 4 intervals with average heart rate 165 bpm
   **When** I save the session
   **Then** my VO2max estimate updates and I see progression chart in Analytics

3. **Given** I view my cardio history over 8 weeks
   **When** I check Analytics → Cardio tab
   **Then** I see VO2max progression graph and total cardio volume

#### Scenario 3: Mesocycle Phase Progression
1. **Given** I complete Week 2 of MEV phase (adaptation)
   **When** the system detects 2 consecutive weeks of good recovery (score > 12)
   **Then** I receive a prompt to advance to MAV phase

2. **Given** I advance from MEV to MAV phase
   **When** the phase changes
   **Then** my weekly set volume increases by 20% (e.g., chest goes from 10 → 12 sets)

3. **Given** I'm in Week 7 of MRV phase (peak volume)
   **When** I advance to Deload week
   **Then** my set volume reduces by 50% and intensity (RIR) increases to 3-4

4. **Given** I complete 8-week mesocycle (MEV → MAV → MRV → Deload)
   **When** deload finishes
   **Then** system resets to MEV phase for new cycle

#### Scenario 4: Program Customization
1. **Given** I want to add isolation work to my program
   **When** I select "Add Exercise" in Planner for Leg Day
   **Then** I browse exercises filtered by muscle group (Quads, Hamstrings, Glutes)

2. **Given** I add Leg Extensions (3 sets × 12-15 reps @ RIR 2)
   **When** I save the change
   **Then** Leg Extensions appear in my next Leg Day workout

3. **Given** I have shoulder injury and cannot do Overhead Press
   **When** I remove it from my program
   **Then** my Push Day updates without Overhead Press and I can substitute it

### Edge Cases

#### Exercise Library
- What happens when user searches for exercise that doesn't exist? → Show "No results found" message
- How does system handle custom exercises vs pre-seeded library? → Phase 2 feature (out of scope for this spec)
- What if user tries to swap to incompatible exercise (e.g., Deadlift → Bicep Curl)? → Filter swap options by primary muscle group

#### VO2max Tracking
- What happens when user exits interval timer mid-session? → Save partial session as "incomplete" status
- How does system calculate VO2max without lab testing? → Use Firstbeat algorithm based on HR zones and age
- What if user has no heart rate monitor? → Allow manual RPE (Rate of Perceived Exertion) entry as fallback

#### Mesocycle Progression
- What happens if user manually edits sets after auto-progression? → Manual edits override auto-calculation until next phase
- How does system handle deload if user has poor recovery (score < 9)? → Extend deload by 1 week, show warning
- What if user wants to skip MEV and start at MAV? → Allow manual phase selection but warn about injury risk

#### Program Editing
- What happens when removing exercise causes volume to drop below MEV? → Show warning: "Total chest volume below MEV threshold (8 sets)"
- How does system prevent accidentally deleting entire program? → Require confirmation for "Remove All Exercises"
- What if user adds too many exercises and exceeds MRV? → Show warning: "Weekly volume exceeds MRV (22 sets) - risk of overtraining"

---

## Requirements *(mandatory)*

### Functional Requirements - Exercise Library

- **FR-001**: Users MUST be able to browse all exercises in the exercise library (114 pre-seeded exercises)
- **FR-002**: Users MUST be able to filter exercises by muscle group (Chest, Back, Shoulders, Quads, Hamstrings, Glutes, Biceps, Triceps, Calves, Abs)
- **FR-003**: Users MUST be able to filter exercises by equipment type (Barbell, Dumbbell, Cable, Machine, Bodyweight)
- **FR-004**: Users MUST be able to view exercise details including name, muscle groups, equipment, and movement pattern
- **FR-005**: System MUST return only exercises compatible with user's selected muscle group when swapping exercises

### Functional Requirements - Program Customization

- **FR-006**: Users MUST be able to view their active training program with all assigned exercises
- **FR-007**: Users MUST be able to modify exercise parameters (sets, reps, RIR targets) in their program
- **FR-008**: Users MUST be able to add new exercises to any program day with specified sets/reps/RIR
- **FR-009**: Users MUST be able to remove exercises from their program
- **FR-010**: System MUST validate that total weekly volume remains within MEV-MRV range when editing programs
- **FR-011**: System MUST persist program changes immediately and sync across all user devices

### Functional Requirements - VO2max Cardio Tracking

- **FR-012**: Users MUST be able to start a VO2max cardio session with Norwegian 4x4 protocol (4 intervals of 4 min high intensity + 3 min recovery)
- **FR-013**: Users MUST be able to log session data including duration, average heart rate, and perceived exertion
- **FR-014**: System MUST calculate estimated VO2max based on heart rate data, age, and weight using Firstbeat algorithm
- **FR-015**: Users MUST be able to view cardio session history with dates, duration, and VO2max estimates
- **FR-016**: System MUST display VO2max progression trend in Analytics screen over time
- **FR-017**: Users MUST be able to see total cardio volume (minutes per week) alongside strength training volume

### Functional Requirements - Mesocycle Progression

- **FR-018**: System MUST allow users to advance mesocycle phases (MEV → MAV → MRV → Deload) manually or automatically based on recovery scores
- **FR-019**: System MUST recalculate weekly set volumes when advancing phases (+20% MEV→MAV, +15% MAV→MRV, -50% MRV→Deload)
- **FR-020**: System MUST track current mesocycle week (1-8) and current phase (MEV/MAV/MRV/Deload)
- **FR-021**: System MUST reset to MEV phase and Week 1 after completing 8-week mesocycle
- **FR-022**: Users MUST be able to view mesocycle history showing past phase durations and performance metrics

### Key Entities *(include if feature involves data)*

- **Exercise**: Represents a strength training movement (e.g., Barbell Bench Press). Attributes: name, primary muscle group, secondary muscle groups, equipment type, movement pattern (compound/isolation)

- **Program**: Represents a user's training split configuration. Attributes: user ID, mesocycle phase (MEV/MAV/MRV/Deload), mesocycle week (1-8), program structure (6-day PPL split)

- **ProgramExercise**: Represents assignment of an exercise to a program day. Attributes: program day ID, exercise ID, target sets, target reps, target RIR, order in workout

- **VO2maxSession**: Represents a cardio training session. Attributes: user ID, session date, duration (minutes), protocol type (Norwegian 4x4), average heart rate, estimated VO2max, completion status

- **MesocyclePhase**: Represents current training phase configuration. Attributes: phase name (MEV/MAV/MRV/Deload), volume multiplier (1.0x for MEV, 1.2x for MAV, 1.38x for MRV, 0.5x for Deload), intensity target (RIR range)

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded (3 missing feature sets identified in analysis)
- [x] Dependencies and assumptions identified (integrates with existing workout/analytics features)

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted (Exercise library, Program CRUD, VO2max, Mesocycle progression)
- [x] Ambiguities marked (None - all requirements clear from existing spec.md)
- [x] User scenarios defined (4 primary scenarios covering all missing features)
- [x] Requirements generated (22 functional requirements across 4 feature areas)
- [x] Entities identified (5 key entities: Exercise, Program, ProgramExercise, VO2maxSession, MesocyclePhase)
- [x] Review checklist passed

---

## Success Criteria

This feature is complete when:

1. **Exercise Library Access**: Users can browse 114 exercises, filter by muscle group/equipment, and view exercise details
2. **Program Customization**: Users can add/remove/modify exercises in their training program with volume validation
3. **VO2max Cardio**: Users can log cardio sessions and view VO2max progression in Analytics
4. **Mesocycle Progression**: Users can advance through training phases with automatic volume recalculation
5. **Integration Testing**: All 5 quickstart.md scenarios pass (currently 3/5 pass)
6. **Quality Gates**: Zero TypeScript compilation errors, zero failing contract tests

**Impact**: Completes the remaining 25% of app functionality, enabling full program customization and periodization features promised in original spec.md.
