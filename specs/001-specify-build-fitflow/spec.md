# Feature Specification: FitFlow Pro - Evidence-Based Training Application

**Feature Branch**: `001-specify-build-fitflow`
**Created**: 2025-10-02
**Status**: Draft
**Input**: User description: "Build FitFlow Pro, a mobile-first fitness training application implementing scientifically validated hypertrophy and cardiovascular training principles based on Mike Israetel's Renaissance Periodization methodology."

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-02
- Q: What authentication method(s) should FitFlow Pro support? → A: Email/password only (self-managed authentication)
- Q: How long should user workout history be retained? → A: Indefinitely (never delete unless user requests)
- Q: When the same workout is logged from two devices simultaneously, how should conflicts be resolved? → A: Lock session to single device (prevents conflicts entirely)
- Q: When a user accidentally deletes a historical workout, what recovery mechanism should be available? → A: No recovery (permanent deletion with confirmation prompt)
- Q: Can users switch training programs (e.g., 6-day split to 4-day split) in the middle of a mesocycle? → A: Allow with warning and volume recalculation

## User Scenarios & Testing

### Primary User Story

As an evidence-based lifter following Renaissance Periodization methodology, I want a mobile-first training application that guides me through scientifically validated hypertrophy and cardiovascular training programs, automatically adjusts my workouts based on my recovery status, and tracks my progress across strength, volume, and VO2max metrics, so I can optimize muscle growth and cardiovascular fitness without the guesswork of manual programming.

### Acceptance Scenarios

**Scenario 1: Complete a Guided Workout Session**
1. **Given** I am starting my Push A workout for week 2 of my mesocycle, **When** I open the workout session, **Then** I see the complete exercise list with prescribed sets, target rep ranges, and recommended RIR (Reps in Reserve)
2. **Given** I complete a set of bench press at 185lbs for 8 reps at RIR 2, **When** I log the set, **Then** the system records the weight, reps, and RIR, automatically starts the appropriate rest timer (3-5 minutes for compound movements), and displays my next set with auto-regulated load suggestions
3. **Given** my workout is interrupted after completing 3 of 8 exercises, **When** I close the app and reopen within 24 hours, **Then** I can resume exactly where I left off with all previous sets preserved

**Scenario 2: Auto-Regulation Based on Recovery**
1. **Given** it is Monday morning and I have a Push A workout scheduled, **When** I open the app, **Then** I am prompted with a 3-question recovery assessment (sleep quality, soreness level, stress)
2. **Given** I report poor sleep (4/10), high soreness (8/10), and high stress (7/10), **When** the system calculates my recovery score, **Then** my workout volume is automatically reduced by 20-30% (fewer sets or reduced intensity) with a notification explaining the adjustment
3. **Given** I consistently report good recovery scores, **When** the system detects I'm adapting well, **Then** my weekly volume trends toward MAV (Maximum Adaptive Volume) for each muscle group

**Scenario 3: Track and Analyze Progression**
1. **Given** I have completed 4 weeks of a mesocycle, **When** I view my analytics dashboard, **Then** I see graphs showing my 1RM progression for major lifts, total weekly tonnage trends, and VO2max improvements from cardio sessions
2. **Given** I am viewing my chest muscle group analytics, **When** I check the volume tracking chart, **Then** I see weekly comparisons of completed volume vs. planned volume vs. recommended ranges (MEV/MAV/MRV landmarks), with visual indicators showing if I'm under-training or approaching overreaching
3. **Given** I complete a mesocycle (typically 4-6 weeks), **When** the deload week arrives, **Then** the system automatically transitions to reduced volume programming and prompts me to begin the next accumulation phase

**Scenario 4: Plan and Customize Training Program**
1. **Given** I want to modify my Pull B workout, **When** I enter the drag-and-drop training planner, **Then** I can swap exercises (e.g., replace barbell rows with dumbbell rows), adjust set counts, and see real-time validation that my program meets minimum volume targets for each muscle group
2. **Given** I drag a lat pulldown exercise to replace pull-ups, **When** the system validates the change, **Then** it confirms that vertical pulling volume remains adequate and auto-adjusts set recommendations to maintain stimulus
3. **Given** I attempt to remove all horizontal pulling exercises from my Pull day, **When** the system validates the program, **Then** it warns me that rear delt and mid-back volume fall below MEV (Minimum Effective Volume) and suggests corrective changes

**Scenario 5: Execute VO2max Cardio Protocol**
1. **Given** it is Wednesday and I have a VO2max training session scheduled, **When** I start the workout, **Then** the app guides me through the Norwegian 4x4 protocol (4 minutes at 90-95% max HR, 3 minutes active recovery, repeat 4 times) with interval timers and target heart rate zones
2. **Given** I am in the second 4-minute work interval, **When** the timer counts down, **Then** I receive audio/visual cues at 1 minute remaining, 30 seconds, and 10 seconds, plus real-time feedback if my heart rate drifts outside the target zone
3. **Given** I complete the VO2max session and log my perceived exertion, **When** the data is saved, **Then** my VO2max trend line updates and the system calculates my cardiovascular fitness improvement over the mesocycle

### Edge Cases

**Workout Session Management**
- What happens when I complete 5 sets of an exercise but the program called for 3? System should log the extra sets and flag potential over-reaching for coach review
- What happens when I pause a workout for 25 hours (exceeding the 24-hour resume window)? System should archive the incomplete session as "abandoned" and prompt me to start a fresh session
- What happens when I log an injury during a set (e.g., shoulder strain on overhead press)? System should allow me to mark the exercise as "skipped due to injury," log the incident, and suggest alternative exercises for future sessions

**Recovery and Auto-Regulation**
- What happens when I skip the recovery assessment before a workout? System should use the most recent assessment within the past 72 hours or default to "moderate" recovery assumptions
- What happens when I report poor recovery for 5+ consecutive days? System should trigger a notification suggesting an unplanned deload week or rest day
- What happens when my recovery score contradicts my performance (poor recovery reported but hitting PRs)? System should learn from actual performance data and weight recovery scores accordingly over time

**Volume and Progression**
- What happens when I consistently fail to complete prescribed sets (e.g., stopping at set 2 of 4 due to fatigue)? System should detect the pattern and recommend reducing working weights or total volume
- What happens when I exceed MRV (Maximum Recoverable Volume) for a muscle group? System should display a warning and recommend redistributing volume or scheduling a deload
- What happens when I don't progress in weight or reps for 3+ consecutive weeks? System should flag the plateau and suggest technique review, deload, or exercise variation

**Data and Synchronization**
- What happens when I lose network connectivity mid-workout? All workout data must persist locally and sync automatically when connectivity resumes
- What happens when I try to start the same workout session on a second device while it's active on another? System must display a notification that the session is locked to the first device and offer to force-transfer the session (ending it on the original device)
- What happens when I delete a historical workout by accident? System must display a confirmation prompt before deletion; once confirmed, deletion is permanent with no recovery mechanism

**Periodization and Programming**
- What happens when I want to extend a mesocycle from 4 weeks to 6 weeks? System should allow manual extension with validation that volume progression remains sustainable
- What happens when I skip an entire week of training (vacation, illness)? System should offer to repeat the previous week, skip ahead, or restart the mesocycle
- What happens when I want to switch from a 6-day split to a 4-day split mid-mesocycle? System should allow the change but display a warning that periodization continuity may be disrupted, then recalculate volume targets and tracking based on the new program structure

---

## Requirements

### Functional Requirements

**Workout Execution**
- **FR-001**: System MUST display a step-by-step workout interface showing current exercise, prescribed sets/reps/RIR, and previous session performance for comparison
- **FR-002**: System MUST allow users to log weight, reps, and RIR for each set with a maximum input time of 10 seconds per set
- **FR-003**: System MUST automatically start a rest timer after each logged set, with timer duration based on exercise type (60-90s for isolation, 2-3min for accessories, 3-5min for compounds)
- **FR-004**: System MUST persist incomplete workout sessions for 24 hours, allowing users to resume from the exact exercise and set where they stopped
- **FR-005**: System MUST calculate and display estimated 1RM based on logged sets using Epley formula with RIR adjustment (weight × (1 + (reps - rir) / 30))
- **FR-006**: System MUST provide audio/visual cues when rest timer completes
- **FR-007**: System MUST allow users to skip exercises, mark exercises as "failed" or "injured," and add notes to any set or exercise

**Recovery Assessment and Auto-Regulation**
- **FR-008**: System MUST prompt users with a 3-question recovery assessment (sleep quality 1-5, muscle soreness 1-5, stress level 1-5) before each workout
- **FR-009**: System MUST calculate a recovery score from assessment answers (total range 3-15) and adjust workout volume based on score: 12-15 (no adjustment), 9-11 (reduce 1 set per exercise), 6-8 (reduce 2 sets per exercise), 3-5 (rest day recommended)
- **FR-010**: System MUST display a clear notification explaining any auto-regulation adjustments (e.g., "Volume reduced by 20% due to poor recovery—2 sets removed from compounds")
- **FR-011**: System MUST allow users to override auto-regulation suggestions and proceed with the original planned workout
- **FR-012**: System MUST detect patterns of consistent poor recovery (5+ consecutive days) and recommend an unplanned deload or rest day

**Volume Tracking and Periodization**
- **FR-013**: System MUST track weekly volume (total sets) per muscle group and compare against MEV/MAV/MRV landmarks defined in Renaissance Periodization methodology
- **FR-014**: System MUST display volume tracking charts showing completed vs. planned vs. recommended ranges with color-coded zones (below MEV = red, MEV-MAV = green, MAV-MRV = yellow, above MRV = red)
- **FR-015**: System MUST support mesocycle structure with accumulation phases (4-6 weeks) and automatic deload week progression
- **FR-016**: System MUST automatically advance to the next mesocycle phase after completing a deload week, with user confirmation
- **FR-017**: System MUST warn users when volume for any muscle group exceeds MRV thresholds

**Training Program Planner**
- **FR-018**: System MUST provide a drag-and-drop interface for customizing workouts within the 6-day training split (Push A/Pull A/VO2max/Push B/Pull B/Zone2)
- **FR-019**: System MUST allow users to swap exercises, adjust set counts, and modify rep ranges within the planner
- **FR-020**: System MUST validate program changes in real-time, ensuring each muscle group meets minimum MEV thresholds
- **FR-021**: System MUST display warnings when program changes violate volume principles (e.g., removing all horizontal pressing movements)
- **FR-022**: System MUST provide exercise suggestions filtered by muscle group, equipment availability, and movement pattern
- **FR-043**: System MUST allow users to switch training program structures (e.g., 6-day to 4-day split) mid-mesocycle with a warning about periodization disruption, and automatically recalculate volume targets and tracking continuity

**VO2max and Cardiovascular Training**
- **FR-023**: System MUST guide users through the Norwegian 4x4 interval protocol (4 minutes at 90-95% max HR, 3 minutes active recovery, repeated 4 times) with interval timers and target heart rate zones
- **FR-024**: System MUST provide audio/visual cues at key interval milestones (1 minute remaining, 30 seconds, 10 seconds)
- **FR-025**: System MUST allow users to log perceived exertion (RPE 1-10) after each VO2max session
- **FR-026**: System MUST track VO2max trend over time and display cardiovascular fitness improvements on the analytics dashboard
- **FR-027**: System MUST support Zone 2 cardio tracking (heart rate or RPE-based) with session duration and average intensity logging

**Analytics and Progression Tracking**
- **FR-028**: System MUST display a dashboard showing 1RM progression graphs for major compound lifts over time (bench press, squat, deadlift, overhead press, rows)
- **FR-029**: System MUST calculate and display total weekly tonnage (weight × reps × sets summed across all exercises)
- **FR-030**: System MUST show consistency metrics including adherence rate (workouts completed / workouts planned), average session duration, and deload week compliance
- **FR-031**: System MUST allow users to filter analytics by date range (last 4 weeks, last mesocycle, last 6 months, all time)
- **FR-032**: System MUST export workout history and analytics data in CSV format for external analysis

**User Account and Data Management**
- **FR-033**: System MUST allow users to create an account and securely authenticate using email/password credentials with password strength requirements (minimum 8 characters, mixed case, number)
- **FR-034**: System MUST persist all workout data, program configurations, and user preferences across devices
- **FR-035**: System MUST synchronize data across multiple devices in real-time when network is available, and queue changes for sync when offline
- **FR-044**: System MUST lock active workout sessions to a single device; attempting to open the same session on another device displays a notification and offers to force-transfer the session (ending it on the original device)
- **FR-036**: System MUST retain user workout history indefinitely unless the user explicitly deletes specific workouts or their entire account
- **FR-037**: System MUST allow users to export all personal data in a portable format (GDPR compliance)
- **FR-038**: System MUST allow users to permanently delete their account and all associated data
- **FR-045**: System MUST display a confirmation prompt before deleting any historical workout; once confirmed, deletion is permanent with no recovery mechanism

**Performance and Reliability**
- **FR-039**: System MUST function fully offline for workout logging and data viewing, syncing changes when connectivity resumes
- **FR-040**: System MUST complete workout data saves within 100ms to avoid interrupting user flow during sets (SQLite write target: < 5ms as per constitutional performance requirements)
- **FR-041**: System MUST handle network interruptions gracefully without data loss or requiring user intervention
- **FR-042**: System MUST support a minimum of 10,000 logged sets per user without performance degradation

### Key Entities

- **User**: Represents a lifter using the application; attributes include account credentials, recovery assessment history, current mesocycle phase, training preferences (equipment availability, injury restrictions)

- **Workout Session**: Represents a single training session; attributes include session date, workout type (Push A/Pull A/etc.), start time, completion status, recovery score at session start, total duration, notes

- **Exercise**: Represents a specific movement (e.g., barbell bench press, Romanian deadlift); attributes include exercise name, primary muscle groups, movement pattern, recommended rest duration, equipment required

- **Set**: Represents a single set of an exercise; attributes include weight lifted, reps completed, RIR (Reps in Reserve), estimated 1RM, timestamp, user notes; belongs to a specific exercise within a workout session

- **Training Program**: Represents the structured 6-day training split; attributes include program name, workout sequence (Push A/Pull A/VO2max/Push B/Pull B/Zone2), exercise assignments per workout, set/rep schemes, mesocycle phase (accumulation week 1-6, deload)

- **Mesocycle**: Represents a complete training block (typically 4-6 weeks of accumulation + 1 deload week); attributes include start date, end date, phase (accumulation/deload), volume progression targets, completion status

- **Muscle Group Volume**: Represents weekly training volume for a specific muscle group; attributes include muscle group name, total sets completed this week, total sets planned this week, MEV/MAV/MRV thresholds, volume status (below MEV, within optimal, approaching MRV, exceeding MRV)

- **Recovery Assessment**: Represents a single pre-workout recovery check; attributes include assessment date, sleep quality score (1-10), soreness level (1-10), stress level (1-10), calculated recovery score, auto-regulation decision applied

- **VO2max Session**: Represents a single cardiovascular training session; attributes include session date, protocol type (Norwegian 4x4 or Zone 2), interval durations, target/actual heart rate zones, perceived exertion, estimated VO2max improvement

- **Analytics Snapshot**: Represents aggregated progress metrics; attributes include time period, 1RM progression per lift, total tonnage, consistency metrics (adherence rate, average session duration), VO2max trend, volume distribution across muscle groups

- **Exercise Swap**: Represents a user customization within the training planner; attributes include original exercise, replacement exercise, rationale (injury accommodation, equipment unavailability, preference), validation status, muscle group coverage impact

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain (all 5 clarifications resolved—see Clarifications section)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

**Resolved Clarifications:**
1. **FR-033**: Authentication method → Email/password only (self-managed)
2. **FR-036**: Workout history retention → Indefinitely (unless user deletes)
3. **Edge Case - Data Sync Conflicts**: Conflict resolution → Lock session to single device
4. **Edge Case - Workout Deletion**: Recovery mechanism → Permanent deletion with confirmation
5. **Edge Case - Mid-Mesocycle Program Changes**: Support → Allow with warning and volume recalculation

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed (all 5 clarifications resolved)

---
