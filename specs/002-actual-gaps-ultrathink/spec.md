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

## Clarifications

### Session 2025-10-03
- Q: When a user edits their program on two devices at the same time (e.g., swapping exercises on phone while removing exercises on tablet), how should conflicts be resolved? → A: Last-write-wins (LWW): Most recent change overwrites earlier changes, simpler implementation
- Q: How should the Firstbeat VO2max calculation be implemented? → A: Internal formula implementation: Implement mathematical formula ourselves based on HR, age, weight (e.g., Cooper test formula)
- Q: How long should historical data be retained in the system? → A: Unlimited retention: Keep all historical data forever (simplest, but database grows indefinitely)
- Q: Can the same exercise be added multiple times to a single program day? → A: Duplicates allowed: Same exercise can appear multiple times (supports drop sets, different rep ranges)
- Q: Should users be able to edit their programs (add/remove/swap exercises) while offline? → A: No, require online connection: Block program editing when offline, show "Connect to internet" message
- Q: Should Dashboard show muscle tracking tile with completed vs planned vs recommendation sets? → A: Yes, show all muscle groups with progress bars and MEV/MAV/MRV markers
- Q: What visual format for muscle tracking display? → A: Progress bar with markers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story

**As a strength training athlete**, I want to customize my training program by swapping exercises, track my cardiovascular fitness through VO2max sessions, progress through mesocycle phases, and monitor my weekly volume per muscle group against evidence-based recommendations, so that I can optimize my training for long-term gains while preventing overtraining, staleness, and muscle imbalances.

**Current Blocker**: The mobile app has complete UI for these features but cannot save/load data because backend endpoints are missing. Additionally, muscle volume tracking visualization is not yet implemented on Dashboard or Planner screens.

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

#### Scenario 5: Muscle Volume Tracking Visualization

**Dashboard Tile:**
1. **Given** I'm in Week 3 of MAV phase and have completed 3 workouts this week
   **When** I view Dashboard
   **Then** I see a "Muscle Volume Tracker" tile showing all muscle groups (Chest, Back, Shoulders, Quads, Hamstrings, Glutes, Biceps, Triceps, Calves, Abs)

2. **Given** I completed Chest: 8 sets, programmed for 12 sets total this week, MAV=14
   **When** I view the Chest progress bar
   **Then** I see: progress bar filled 8/12 (67%), with markers at MEV=8, MAV=14, MRV=22

3. **Given** My Back is at 14/16 sets (MAV=12, MRV=20)
   **When** I view the Back progress bar
   **Then** I see the bar is in the "optimal zone" (between MAV and MRV markers)

4. **Given** My Biceps are at 2/6 sets (MEV=6, MAV=10)
   **When** I view the Biceps progress bar
   **Then** I see a visual warning (red/yellow indicator) showing volume is below MEV threshold

**Planner Tile:**
5. **Given** I open Planner screen to review my 6-day program
   **When** I view the "Program Volume Overview" tile
   **Then** I see all muscle groups with planned weekly sets vs MEV/MAV/MRV recommendations

6. **Given** My planned program has Chest: 10 sets/week (MEV=8, MAV=14, MRV=22)
   **When** I view the Planner volume tile
   **Then** I see Chest bar at 10 sets, positioned between MEV and MAV markers (in "adequate" zone)

7. **Given** My planned Quads volume is 6 sets/week (below MEV=8)
   **When** I view the Planner volume tile
   **Then** I see a warning indicator on Quads row: "Below minimum effective volume - consider adding exercises"

8. **Given** My planned Shoulders are at 24 sets/week (above MRV=20)
   **When** I view the Planner volume tile
   **Then** I see a warning: "Exceeds maximum recoverable volume - risk of overtraining"

### Edge Cases

#### Exercise Library
- What happens when user searches for exercise that doesn't exist? → Show "No results found" message
- How does system handle custom exercises vs pre-seeded library? → Phase 2 feature (out of scope for this spec)
- What if user tries to swap to incompatible exercise (e.g., Deadlift → Bicep Curl)? → Filter swap options by primary muscle group
- Can user add same exercise twice to one program day? → Yes, duplicates allowed to support drop sets, pyramid sets, and different rep ranges (e.g., Bench Press 4×6 @ RIR 2, then Bench Press 2×12 @ RIR 1)

#### VO2max Tracking
- What happens when user exits interval timer mid-session? → Save partial session as "incomplete" status
- How does system calculate VO2max without lab testing? → Use internal mathematical formula based on heart rate, age, and weight (no external API dependencies)
- What if user has no heart rate monitor? → Allow manual RPE (Rate of Perceived Exertion) entry as fallback
- How to handle displaying years of historical cardio data? → All history retained indefinitely; UI should paginate or limit initial load (e.g., show last 6 months by default with "Load More" option)

#### Mesocycle Progression
- What happens if user manually edits sets after auto-progression? → Manual edits override auto-calculation until next phase
- How does system handle deload if user has poor recovery (score < 9)? → Extend deload by 1 week, show warning
- What if user wants to skip MEV and start at MAV? → Allow manual phase selection but warn about injury risk
- How to handle displaying years of mesocycle history? → All history retained indefinitely; UI should show summary view with expandable details for each cycle

#### Program Editing
- What happens when removing exercise causes volume to drop below MEV? → Show warning: "Total chest volume below MEV threshold (8 sets)"
- How does system prevent accidentally deleting entire program? → Require confirmation for "Remove All Exercises"
- What if user adds too many exercises and exceeds MRV? → Show warning: "Weekly volume exceeds MRV (22 sets) - risk of overtraining"
- What if user edits program simultaneously on two devices? → Last-write-wins: Most recent change (by server timestamp) overwrites earlier changes; no conflict notification shown to user
- What if user tries to edit program while offline? → Show "Connect to internet to edit programs" message and disable all edit buttons; viewing programs remains available (read-only mode)
- Does program data get cached for offline viewing? → Yes, last synced program state is cached locally and viewable offline, but no modifications allowed until connection restored

#### Muscle Volume Tracking
- What happens if user completes workouts on Sunday and Monday (crosses week boundary)? → Week resets every Monday; Sunday sets count toward previous week, Monday sets start new week count
- How are compound exercises counted (e.g., Deadlift targets Back + Hamstrings + Glutes)? → Each set counts fully toward all targeted muscle groups (1 Deadlift set = 1 set for Back, 1 set for Hamstrings, 1 set for Glutes)
- What if user hasn't completed any workouts this week? → Show 0/planned for all muscles with progress bars empty; still display MEV/MAV/MRV markers
- What if user logs extra sets beyond planned volume? → Progress bar extends beyond 100%, still show MEV/MAV/MRV markers; warn if exceeding MRV
- How to handle incomplete week (e.g., viewing on Wednesday)? → Show completed/remaining split (e.g., "8 completed, 4 remaining = 12 planned total"); progress bar reflects completed portion
- What if planned program has 0 sets for a muscle group (e.g., no direct ab work)? → Show row with 0/0 sets and MEV marker; optionally suggest "Consider adding exercises"

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
- **FR-008**: Users MUST be able to add new exercises to any program day with specified sets/reps/RIR (same exercise can be added multiple times to support drop sets and varied rep ranges)
- **FR-009**: Users MUST be able to remove exercises from their program
- **FR-010**: System MUST validate that total weekly volume remains within MEV-MRV range when editing programs
- **FR-011**: System MUST persist program changes immediately and sync across all user devices using last-write-wins conflict resolution with the following mechanics:
  - Server timestamp (UTC milliseconds) determines recency
  - Older edits are silently overwritten by newer edits (no user notification)
  - Timestamp collisions (same millisecond) resolved by database write order (arbitrary but consistent)
  - Client re-fetches program after sync to confirm current state
  - Program editing requires active internet connection
- **FR-011a**: System MUST display "Connect to internet to edit programs" message when user attempts program modifications while offline; viewing programs is allowed offline (read-only mode)

### Functional Requirements - VO2max Cardio Tracking

- **FR-012**: Users MUST be able to start a VO2max cardio session with Norwegian 4x4 protocol (4 intervals of 4 min high intensity + 3 min recovery)
- **FR-013**: Users MUST be able to log session data including duration, average heart rate, and perceived exertion
- **FR-014**: System MUST calculate estimated VO2max based on heart rate data, age, and weight using internal mathematical formula (no external API dependencies)
- **FR-015**: Users MUST be able to view complete cardio session history (all historical data retained indefinitely) with dates, duration, and VO2max estimates
- **FR-016**: System MUST display VO2max progression trend in Analytics screen over time
- **FR-017**: Users MUST be able to see total cardio volume (minutes per week) alongside strength training volume

### Functional Requirements - Mesocycle Progression

- **FR-018**: System MUST allow users to advance mesocycle phases (MEV → MAV → MRV → Deload) manually or automatically based on recovery scores
- **FR-019**: System MUST recalculate weekly set volumes when advancing phases (+20% MEV→MAV, +15% MAV→MRV, -50% MRV→Deload)
- **FR-020**: System MUST track current mesocycle week (1-8) and current phase (MEV/MAV/MRV/Deload)
- **FR-021**: System MUST reset to MEV phase and Week 1 after completing 8-week mesocycle
- **FR-022**: Users MUST be able to view complete mesocycle history (all historical data retained indefinitely) showing past phase durations and performance metrics

### Functional Requirements - Muscle Volume Tracking Visualization

- **FR-023**: Dashboard MUST display a "Muscle Volume Tracker" tile showing all 10 muscle groups (Chest, Back, Shoulders, Quads, Hamstrings, Glutes, Biceps, Triceps, Calves, Abs)
- **FR-024**: For each muscle group, system MUST display completed sets this week, planned total sets this week, and MEV/MAV/MRV recommendation markers using progress bars
- **FR-025**: Progress bars MUST visually indicate three zones: below MEV (warning/red), MEV-MAV (adequate/yellow), MAV-MRV (optimal/green), above MRV (warning/red)
- **FR-026**: System MUST calculate completed sets by aggregating all logged sets for exercises targeting each muscle group during current week (Monday-Sunday)
- **FR-027**: System MUST calculate planned sets by summing programmed sets for all exercises targeting each muscle group in remaining workouts this week
- **FR-028**: Planner screen MUST display a "Program Volume Overview" tile showing planned weekly volume per muscle group vs MEV/MAV/MRV recommendations
- **FR-029**: Planner tile MUST show warning when planned volume for any muscle group is below MEV threshold or above MRV threshold
- **FR-030**: Volume calculations MUST account for exercises targeting multiple muscle groups using full set counting: each set counts fully toward ALL targeted muscle groups (e.g., 1 set of Deadlift = 1 set counted for Back + 1 set counted for Hamstrings + 1 set counted for Glutes, not fractional counting like 0.33 sets each)

### Non-Functional Requirements

- **NFR-001**: API response times MUST be < 200ms (p95) for all endpoints
- **NFR-002**: SQLite write operations MUST be < 5ms (p95), < 10ms (p99)
- **NFR-003**: UI interactions MUST have < 100ms perceived latency (tap to visual feedback)
- **NFR-004**: Rest timer accuracy MUST be ±2 seconds over 5-minute duration
- **NFR-005**: Test coverage MUST be ≥ 80% overall, 100% for critical paths (auth, workout logging, sync queue)
- **NFR-006**: App MUST function offline for workout logging (core use case)
- **NFR-007**: Data sync MUST retry with exponential backoff (1s, 2s, 4s, 8s, 16s) on network failure

### Key Entities *(include if feature involves data)*

- **Exercise**: Represents a strength training movement (e.g., Barbell Bench Press). Attributes: name, primary muscle group, secondary muscle groups, equipment type, movement pattern (compound/isolation)

- **Program**: Represents a user's training split configuration. Attributes: user ID, mesocycle phase (MEV/MAV/MRV/Deload), mesocycle week (1-8), program structure (6-day PPL split)

- **ProgramExercise**: Represents assignment of an exercise to a program day. Attributes: program day ID, exercise ID, target sets, target reps, target RIR, order in workout. Note: Same exercise can appear multiple times per day (no uniqueness constraint on exercise_id + program_day_id)

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
5. **Muscle Volume Tracking**: Dashboard displays completed/planned/recommended sets per muscle group with progress bars and MEV/MAV/MRV markers; Planner shows planned volume vs recommendations
6. **Integration Testing**: All 5 quickstart.md scenarios pass (currently 3/5 pass) plus new Scenario 5 (muscle tracking visualization)
7. **Quality Gates**: Zero TypeScript compilation errors, zero failing contract tests

**Impact**: Completes the remaining 25% of app functionality, enabling full program customization, periodization features, and proactive volume monitoring promised in original spec.md.
