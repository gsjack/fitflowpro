# FitFlow Pro - Science-Based Training Tracker

## /specify Command

Build a mobile-first fitness training application that implements scientifically validated hypertrophy and cardiovascular training principles based on Mike Israetel's Renaissance Periodization methodology. The application guides users through structured workouts with real-time progress tracking, intelligent auto-regulation, and comprehensive analytics to maximize muscle growth and VO2max improvement.

---

## Executive Summary

### What We're Building

A comprehensive fitness tracking application that serves as a digital strength and conditioning coach, implementing evidence-based training principles from leading sports scientists (Mike Israetel, Jeff Nippard, Sjard Roscher). The app manages a 6-day training split combining hypertrophy-focused resistance training with VO2max cardiovascular conditioning.

### Why This Matters

**Problem:** Existing fitness apps (Strong, Hevy, FitNotes) are glorified spreadsheets. They track data but provide no intelligent guidance on:
- Whether you're training with optimal volume for muscle growth
- When to increase weight vs reps vs sets
- How to balance recovery with progressive overload
- Whether your program design is scientifically sound
- How to periodize training for long-term progress

**Impact of solving this:**
- **Faster muscle growth:** Users follow evidence-based volume landmarks (MEV/MAV/MRV) instead of guessing
- **Injury prevention:** Auto-regulation prevents overtraining through recovery assessment
- **Sustained progress:** Periodization eliminates plateaus through structured progression phases
- **Cardiovascular health:** Integrated VO2max training improves heart health while minimizing interference effect
- **Time efficiency:** Every set has purpose - no junk volume

### Core Value Proposition

"Mike Israetel as a personal coach in your pocket" - scientifically optimal training decisions made automatically, with transparency into the 'why' behind every recommendation.

---

## Product Vision

### User Personas

**Primary Persona: The Evidence-Based Lifter**
- 25-40 years old
- 1-5 years training experience
- Understands basic exercise science concepts (progressive overload, RPE, RIR)
- Wants to optimize results but overwhelmed by conflicting online advice
- Values scientific rigor over trends
- Willing to track data meticulously for better outcomes

**Secondary Persona: The Comeback Athlete**
- Trained seriously 3-10 years ago
- Took extended break (6 months to 5 years)
- Muscle memory advantage but needs structured reintroduction
- Risk of injury from doing too much too soon
- Needs built-in guardrails

### Success Metrics

**Engagement Metrics:**
- Workout completion rate > 85%
- Average session duration: 45-75 minutes
- Weekly active users (4+ workouts/week)
- Feature retention (users still using after 12 weeks)

**Outcome Metrics:**
- Strength progression: +15-25% on compound lifts in 12 weeks
- Muscle growth: +2-5% body weight in 12-week mesocycle
- VO2max improvement: +5-13% in 12 weeks (Norwegian 4x4 protocol)
- Injury rate: <5% (compared to 30-50% in general gym population)

---

## Functional Requirements

### 1. User Authentication & Profile Management

**What:** Multi-user system with persistent individual training data.

**Why:** Multiple users may share the same device (home gym setup), and each user needs isolated training history, customizations, and progress tracking.

**Requirements:**
- JWT-based authentication with session persistence
- User profiles storing:
  - Training experience level
  - Current mesocycle phase
  - Recovery status
  - Exercise preferences/limitations
  - Equipment availability
- No password recovery (local server deployment)
- User selection screen on app launch
- Profile settings page for preferences

---

### 2. Training Program Management (6-Day Split)

**What:** Pre-configured scientifically optimized training split with customization capabilities.

**Why:** The specific Push/Pull/VO2max structure maximizes muscle growth while maintaining cardiovascular health. The structure is based on:
- **Frequency:** 2x per muscle group per week (optimal protein synthesis)
- **Volume distribution:** MEV/MAV/MRV landmarks for each muscle
- **Testosterone optimization:** Compound leg exercises at start of strength days
- **Interference effect minimization:** VO2max training on separate days

**Program Structure:**

**Monday - Push A (Chest-Focused)**
- 1 compound leg exercise (Squat/Front Squat) - 3 sets for testosterone boost
- 4 sets heavy chest pressing (Barbell Bench Press, 6-8 reps, RIR 3)
- 3 sets incline pressing (Incline DB Press, 8-10 reps, RIR 2)
- 3 sets chest isolation (Cable Fly, 12-15 reps, RIR 1)
- 4 sets lateral delts (DB Lateral Raise, 12-15 reps, RIR 1)
- 3 sets triceps isolation (Rope Pushdown, 15-20 reps, RIR 0)

**Tuesday - Pull A (Lat-Focused)**
- 1 compound leg exercise (Deadlift/Romanian Deadlift) - 3 sets for testosterone boost
- 4 sets vertical pull (Weighted Pull-ups, 5-8 reps, RIR 3)
- 4 sets horizontal pull (Barbell Row, 8-10 reps, RIR 2)
- 3 sets cable row variation (Cable Row, 12-15 reps, RIR 1)
- 3 sets rear delts (Face Pull, 15-20 reps, RIR 0)
- 3 sets biceps (Barbell Curl, 8-12 reps, RIR 1)

**Wednesday - VO2max A**
- Norwegian 4x4 Protocol on rowing machine:
  - 4 rounds: 4 minutes @ 85-95% HRmax, 3 minutes active recovery @ 60% HRmax
  - Total duration: ~30 minutes
  - Target metrics: Watt output, SPM (strokes per minute), heart rate zones

**Thursday - Push B (Shoulder-Focused)**
- 1 compound leg exercise (Leg Press/Bulgarian Split Squat) - 3 sets for testosterone boost
- 4 sets overhead pressing (Military Press/OHP, 5-8 reps, RIR 3)
- 3 sets flat pressing variation (DB Bench Press, 8-12 reps, RIR 2)
- 4 sets lateral delt emphasis (Cable Lateral Raise, 15-20 reps, RIR 0)
- 3 sets rear delts (Rear Delt Fly, 15-20 reps, RIR 0)
- 3 sets triceps compound (Close-Grip Bench, 8-10 reps, RIR 2)

**Friday - Pull B (Rhomboid/Trap-Focused)**
- 1 compound leg exercise (Front Squat/Hack Squat) - 3 sets for testosterone boost
- 4 sets explosive horizontal pull (Pendlay Row, 6-8 reps, RIR 3)
- 3 sets wide-grip cable row (10-12 reps, RIR 2)
- 4 sets trap work (Shrugs, 12-15 reps, RIR 1)
- 3 sets rear delts (Cable Reverse Fly, 15-20 reps, RIR 0)
- 3 sets biceps variation (Hammer Curl, 10-15 reps, RIR 1)

**Saturday - VO2max B**
- Alternative protocols:
  - Option A: 30/30 intervals (30 seconds @ 100%, 30 seconds @ 50%, 12 rounds)
  - Option B: Zone 2 steady state (30-45 minutes @ 70% HRmax)
  - Alternated based on fatigue assessment

**Sunday - Rest Day**
- Complete recovery
- Optional: Recovery assessment for next week's auto-regulation

**Why this specific structure:**
- **Leg exercises first:** Compound movements (squats, deadlifts) trigger systemic testosterone/growth hormone response that enhances subsequent upper body work
- **Push/Pull split:** Allows 48-72 hours recovery between similar movement patterns
- **A/B variations:** Different exercise selections prevent neural adaptation, maintain engagement
- **VO2max on separate days:** Minimizes interference effect on strength/hypertrophy adaptations
- **Volume distribution:** 12-18 sets per muscle group per week (within MEV-MAV range for intermediates)

---

### 3. Dashboard & Daily Workout Display

**What:** Home screen showing today's scheduled workout based on day of week, with completion status and muscle volume tracking.

**Why:** Users need immediate clarity on what to do today without navigating menus. Volume tracking provides feedback on whether the program is balanced.

**Requirements:**

**Today's Workout Section:**
- Display current day of 6-day split (auto-detected from system date)
- Show workout name and focus (e.g., "Monday - Push A (Chest-Focused)")
- List all exercises with target sets x reps
- Completion status: Not Started / In Progress / Completed
- Estimated duration based on rest times
- Large "START WORKOUT" button

**Weekly Volume Tracking Visualization:**
- Horizontal bar charts for each major muscle group showing:
  - **Completed volume** (green): Sets actually performed this week
  - **Planned volume** (blue): Sets scheduled if all workouts completed
  - **Recommended volume** (yellow target line): Scientific MEV/MAV range

**Muscle Groups Tracked:**
- Chest
- Front Delts
- Side Delts  
- Rear Delts
- Lats
- Upper Back (Rhomboids/Traps)
- Lower Back
- Biceps
- Triceps
- Quads
- Hamstrings
- Glutes

**Why this visualization matters:**
- Users instantly see if they're under-training (red zone below MEV)
- Users see if they're approaching overtraining (orange zone near MRV)
- Transparency builds trust in the program design
- Motivation from seeing weekly progress fill up

**Additional Dashboard Elements:**
- Current mesocycle week indicator (e.g., "Week 3/8 - MAV Phase")
- Recovery status indicator (green/yellow/red based on 3-question assessment)
- Quick stats: Current streak, total workouts completed, total volume lifted this week

---

### 4. Guided Workout Experience

**What:** Step-by-step workout interface that guides users through each exercise, set, and rest period.

**Why:** Eliminates decision fatigue in the gym. Users focus on execution, not remembering what comes next.

**Workout Flow:**

**Exercise Screen:**
- Exercise name + muscle group tags
- Exercise demonstration (optional image/video placeholder)
- Last workout performance displayed:
  - "Last time: 3 sets × 8 reps @ 100kg, RIR 2"
- Target for today:
  - "Target: 4 sets × 6-8 reps @ RIR 3"
- Weight recommendation:
  - "Suggested: 102.5kg (+2.5kg from last)"

**Set Logging Interface:**
- Set number prominently displayed (e.g., "Set 1 of 4")
- Input fields:
  - Weight (kg) - large numeric input
  - Reps performed - large numeric input
  - RIR (0-4 scale) - quick-select buttons
- "COMPLETE SET" button (large, thumb-friendly)
- "SKIP SET" button (smaller, secondary)
- Notes field (optional, for form cues or observations)

**Post-Set Actions:**
- On "COMPLETE SET" press:
  - Data saves immediately to database (persistence guarantee)
  - Rest timer auto-starts (overlays bottom of screen)
  - Set number increments
- On "SKIP SET" press:
  - Confirmation dialog: "Skip this set? It won't count toward volume."
  - If confirmed, move to next set without data entry

**Progressive Overload Logic:**
- If user hits top end of rep range (e.g., 8 reps when target is 6-8) with RIR ≥2:
  - Next workout suggests +2.5kg for upper body, +5kg for lower body
- If user misses bottom of rep range (e.g., 5 reps when target is 6-8):
  - Maintains same weight next workout
- If RIR consistently 0-1 (too close to failure):
  - Auto-regulation suggests reducing sets next workout

---

### 5. Rest Timer System

**What:** Automatic countdown timer that starts after each set is logged, with audio/haptic feedback.

**Why:** Optimal rest periods are critical for performance. Too short = strength drops (can't complete target reps). Too long = session duration bloats, potential hypertrophy reduction.

**Scientific Rest Period Guidelines:**
- Compound movements (Squats, Deadlifts, Bench, Rows): 2.5-3 minutes
- Isolation movements (Curls, Flies, Raises): 1.5-2 minutes
- VO2max intervals: Predefined by protocol (e.g., 3 min in 4x4)

**Timer Interface:**
- Circular progress indicator (countdown visualization)
- Time remaining in MM:SS format
- Gradient color coding:
  - Green (100-50% remaining)
  - Yellow (50-20% remaining)
  - Red (20-0% remaining)

**Alerts:**
- **10-second warning:** 
  - Audio beep (3 short beeps)
  - Haptic vibration (if device supports)
  - Visual pulse animation
- **Timer complete:**
  - Audio alert (2 long beeps)
  - Strong haptic vibration
  - "READY FOR NEXT SET" message

**Timer Controls:**
- Pause/Resume button
- Add 30 seconds button (for extra recovery if needed)
- Skip to next set button (if recovered early)

**Background Behavior:**
- Timer continues if app minimized
- Push notification if timer completes while app in background (optional)

---

### 6. Workout Resume & Session Management

**What:** Ability to close the app mid-workout and resume from exact position when reopening.

**Why:** Real-world gym interruptions are common:
- Equipment not available (waiting for bench)
- Social interactions
- Phone calls / emergencies
- Bathroom breaks

**Requirements:**
- Active workout session persists for 24 hours
- On app reopen, user sees:
  - "Resume Workout" banner
  - Last completed set
  - Current exercise
  - Time elapsed since last set
- If >24 hours since last activity:
  - Session marked as abandoned
  - User prompted: "Workout incomplete. Count as partial or discard?"

**Session State Includes:**
- Current exercise index
- Sets completed per exercise
- All logged weights/reps/RIR
- Total workout duration
- Rest timer state (if app closed mid-rest)

---

### 7. Workout Completion & Summary

**What:** End-of-workout summary screen with performance metrics and training insights.

**Why:** Immediate feedback reinforces positive behaviors and highlights areas for improvement. Psychological closure to the training session.

**Workout Summary Displays:**
- Total duration (HH:MM:SS)
- Total volume lifted (sum of sets × reps × weight in kg)
- Total sets completed vs planned
- Average RIR across all sets
- Comparison to last same workout:
  - Volume change (+12% vs last Push A)
  - Strength change (+5kg on Bench Press)
- Muscle volume contribution:
  - "Today you trained: Chest (16 sets), Triceps (6 sets), Front Delts (12 sets), Quads (3 sets)"

**User Actions:**
- "FINISH WORKOUT" button:
  - Marks workout as completed
  - Updates dashboard completion status
  - Clears active session
  - Returns to dashboard
- "CANCEL WORKOUT" button:
  - Confirmation dialog: "Discard all logged data?"
  - If confirmed: deletes session, no data saved
  - Returns to dashboard

---

### 8. VO2max Training Module

**What:** Specialized interface for rowing machine interval workouts with heart rate zone guidance.

**Why:** VO2max training requires precision in work/rest intervals and intensity. Generic timer apps don't provide structured guidance or track relevant metrics.

**Norwegian 4x4 Protocol Interface:**

**Pre-Workout Setup:**
- Calculate heart rate zones from user's HRmax (220 - age, or custom input)
  - Zone 4 (85-95% HRmax): Work intervals
  - Zone 2 (60-70% HRmax): Recovery intervals
- Display target zones as visual bands

**During Interval:**
- Large countdown timer (MM:SS)
- Current interval indicator (e.g., "Interval 2 of 4 - WORK")
- Heart rate input field (manual entry after each interval, or Bluetooth integration if available)
- Target metrics:
  - Heart rate zone (with green/yellow/red indicator)
  - Optional: Watt output, SPM (strokes per minute)
- Audio cues:
  - "Start Work Interval" (high energy tone)
  - "30 seconds remaining" (verbal cue)
  - "Start Recovery" (calm tone)

**Post-Workout Metrics:**
- Average heart rate per work interval
- Peak heart rate achieved
- Time in target zone (%)
- Calculated VO2max estimate (if HR data complete)
- Progression tracking:
  - "VO2max estimate: 52 ml/kg/min (+2 from 4 weeks ago)"

**Alternative Protocol: 30/30 Intervals:**
- Similar interface but 30-second work/rest cycles
- 12 rounds total
- Higher intensity (100% effort) vs 4x4 (85-95%)

**Zone 2 Steady State:**
- Single long timer (30-45 minutes)
- Heart rate zone guidance (stay in 60-70% HRmax)
- Periodic check-ins every 5 minutes for HR input
- Average HR, time in zone tracking

---

### 9. Training Planner & Program Customization

**What:** Drag-and-drop interface to modify the 6-day training split - swap exercises, adjust sets/reps, reorder exercises.

**Why:** No program is one-size-fits-all. Users may have:
- Equipment limitations (no barbell → use dumbbells)
- Injury history (shoulder issues → avoid overhead pressing)
- Personal preferences (hate barbell rows → prefer dumbbell rows)

**Planner Interface:**

**Weekly Overview:**
- 6-day calendar grid showing each day's workout
- Click any day to edit that day's exercises

**Exercise List (Per Day):**
- Sortable list with drag handles
- Each exercise card shows:
  - Exercise name
  - Target muscle groups (tags)
  - Sets × Reps × RIR
  - Move up/down buttons (or drag-and-drop)

**Exercise Modification:**
- Click exercise card to edit:
  - **Swap Exercise:** Opens exercise database with fuzzy search
    - Search by exercise name ("bench press")
    - Search by muscle group ("chest")
    - Filter by equipment available (barbell, dumbbell, cable, machine, bodyweight)
  - **Adjust Volume:** Increase/decrease sets (1-6 range)
  - **Adjust Rep Range:** Modify target reps (4-20 range)
  - **Adjust RIR:** Change intensity prescription (0-4 scale)
  - **Delete Exercise:** Remove from program

**Exercise Database:**
- 100+ exercises covering:
  - Chest: 12+ variations (Flat/Incline/Decline, Barbell/Dumbbell/Cable)
  - Back: 15+ variations (Vertical/Horizontal pulls, Row variations)
  - Shoulders: 10+ variations (Front/Side/Rear delt focus)
  - Arms: 8+ variations (Biceps, Triceps, different grips)
  - Legs: 10+ variations (Squat/Hinge/Lunge patterns)
- Each exercise tagged with:
  - Primary muscle groups
  - Secondary muscle groups
  - Equipment required
  - Difficulty level (Beginner/Intermediate/Advanced)

**Program Validation:**
- Real-time feedback as user modifies program:
  - "✅ Chest: 14 sets/week (within MAV range)"
  - "⚠️ Rear Delts: 4 sets/week (below MEV of 6)"
  - "❌ Biceps: 24 sets/week (exceeds MRV of 20)"
- Visual indicators on muscle volume tracking dashboard
- "Validate Program" button runs comprehensive check:
  - All major muscle groups hit MEV minimum
  - No muscle group exceeds MRV maximum
  - Balanced push/pull volume (ratio within 0.8-1.2)
  - Leg volume adequate for testosterone optimization (min 6 sets/week)

**Mesocycle Phase Advancement:**
- "Advance to Next Phase" button
- Phases follow Mike Israetel's periodization:
  1. **Weeks 1-2: MEV Phase** (Minimum Effective Volume - getting body adapted)
  2. **Weeks 3-5: MAV Phase** (Maximum Adaptive Volume - productive training)
  3. **Weeks 6-7: MRV Approach** (Maximum Recoverable Volume - overreaching)
  4. **Week 8: Deload** (50% volume reduction for recovery)
  5. **Week 9: Testing** (1RM attempts, new maxes)
- Advancing phase automatically adjusts volume:
  - MEV→MAV: +20% sets across all exercises
  - MAV→MRV: +15% sets
  - MRV→Deload: -50% sets (same exercises, half the volume)
- User can manually trigger phase change if auto-regulation suggests early deload

---

### 10. Auto-Regulation & Recovery Management

**What:** Simple 3-question daily assessment that adjusts training volume based on recovery status.

**Why:** Scientific training isn't just about progressive overload - it's about managing fatigue. Pushing hard when under-recovered leads to injury and overtraining. Auto-regulation allows intelligent volume management.

**Recovery Assessment (Pre-Workout):**

User answers 3 questions on 1-5 scale:

1. **Sleep Quality:**
   - 5: 8+ hours, uninterrupted, felt refreshed
   - 4: 7-8 hours, minor interruptions
   - 3: 6-7 hours or poor quality
   - 2: 5-6 hours, frequently woken
   - 1: <5 hours or severely disrupted

2. **Muscle Soreness:**
   - 5: No soreness, feel fresh
   - 4: Minor soreness, doesn't affect movement
   - 3: Moderate soreness, noticeable during warm-up
   - 2: Significant soreness, affects exercise form
   - 1: Severe soreness, movement painful

3. **Mental Motivation:**
   - 5: Highly motivated, excited to train
   - 4: Looking forward to workout
   - 3: Neutral, feel obligated
   - 2: Low motivation, considering skipping
   - 1: Exhausted, workout feels like a chore

**Scoring & Volume Adjustment:**

- **Total Score 13-15 (Excellent Recovery):**
  - No adjustments
  - Consider adding 1 bonus set to primary compound movement
  - Green indicator on dashboard

- **Total Score 10-12 (Good Recovery):**
  - No adjustments
  - Proceed with planned workout
  - Green indicator on dashboard

- **Total Score 7-9 (Moderate Fatigue):**
  - Reduce sets by 1 across all exercises (e.g., 4 sets → 3 sets)
  - Maintain weight and rep targets
  - Yellow indicator on dashboard
  - Recommendation: "Consider prioritizing sleep tonight"

- **Total Score 4-6 (High Fatigue):**
  - Reduce sets by 2 across all exercises (e.g., 4 sets → 2 sets)
  - OR suggest switching to VO2max low-intensity (Zone 2)
  - Orange indicator on dashboard
  - Recommendation: "Focus on recovery - eat more, sleep more"

- **Total Score 3 or below (Severe Fatigue):**
  - Recommend complete rest day or active recovery only
  - Red indicator on dashboard
  - Recommendation: "Your body needs rest. This is when growth happens."

**Why This Works:**
- Simple enough to complete in 30 seconds
- Captures key recovery markers (sleep, muscle damage, CNS fatigue)
- Prevents the ego-driven "I'll push through" mentality that leads to injury
- Backed by research: Training under-recovered reduces volume tolerance by 20-40%

**Long-Term Fatigue Tracking:**
- Dashboard shows 4-week rolling average of recovery scores
- If average drops below 8 for 2+ weeks:
  - Recommend early deload (enter deload phase now)
  - Investigate external stressors (work, life, diet)

---

### 11. Analytics & Progress Tracking

**What:** Comprehensive visualization of strength progression, volume trends, and body composition changes.

**Why:** Progress tracking is the #1 motivator for adherence. Visual feedback on improvements reinforces consistency. Data-driven insights help identify what's working vs what needs adjustment.

**Analytics Dashboard Sections:**

**1. Strength Progression (Big 5 Focus):**
- Line charts for calculated 1RM over time:
  - Barbell Bench Press
  - Barbell Back Squat
  - Deadlift
  - Overhead Press
  - Weighted Pull-ups
- Each exercise shows:
  - Current calculated 1RM
  - Change from 4 weeks ago (+kg, +%)
  - Change from 12 weeks ago
  - All-time PR
- 1RM calculation formula (Epley or Brzycki):
  - 1RM = Weight × (1 + Reps/30)
  - Calculated from best sets (lowest RIR, highest reps at given weight)

**2. Volume Progression:**
- Stacked area chart showing weekly volume by muscle group
- Filters:
  - Time range (4 weeks, 12 weeks, all time)
  - Muscle group selection (Chest, Back, Shoulders, Arms, Legs)
- Overlay mesocycle phase markers (MEV, MAV, MRV, Deload)
- Insights:
  - "Peak volume week: Week 7 (2,450 kg total)"
  - "Average weekly volume: 2,100 kg"

**3. Tonnage Tracking:**
- Total volume lifted per week (sum of all sets × reps × weight)
- Comparison across weeks
- Breakdown by workout type:
  - Push Days tonnage
  - Pull Days tonnage
  - Leg-only tonnage
- Target: Progressive increase in tonnage during MEV→MAV→MRV phases

**4. Rep Performance Trends:**
- For each major exercise, show:
  - Average reps per set over time
  - Distribution of RIR ratings (0, 1, 2, 3, 4)
  - Insights: "You're consistently hitting RIR 0-1. Consider reducing weight to maintain RIR 2-3 for better hypertrophy."

**5. VO2max Progress:**
- Line chart of estimated VO2max over time (calculated from HR data)
- Average heart rate during work intervals
- Target: +5-13% improvement over 12 weeks (per research on Norwegian 4x4)
- Milestones:
  - Beginner: <35 ml/kg/min
  - Average: 35-45 ml/kg/min
  - Good: 45-55 ml/kg/min
  - Excellent: 55+ ml/kg/min

**6. Consistency Metrics:**
- Workout completion rate (% of scheduled workouts completed)
- Current training streak (consecutive weeks with 4+ workouts)
- All-time longest streak
- Heatmap calendar showing workout days (GitHub contribution style)

**7. Body Composition Tracking (Optional Manual Input):**
- Weight over time
- Body fat % (if user inputs)
- Lean mass calculation (weight × (1 - BF%))
- Target: +0.25-0.5% bodyweight per week during surplus, maintain during cut

**Why These Specific Metrics:**
- **1RM tracking:** Objective measure of strength, not influenced by rep ranges
- **Volume tracking:** Ensures progressive overload at the mesocycle level
- **Tonnage:** Catch-all metric for total work capacity
- **VO2max:** Cardiovascular health marker, often ignored in hypertrophy programs
- **Consistency:** Strongest predictor of long-term results

---

### 12. Profile Settings

**What:** User preferences, app configuration, and data management.

**Why:** Personalization improves user experience. Data ownership and privacy matter for health apps.

**Settings Sections:**

**Personal Information:**
- Age (for HRmax calculation)
- Weight (for volume/bodyweight ratio tracking)
- Training experience level (Beginner/Intermediate/Advanced)
  - Affects volume recommendations (MEV/MAV/MRV targets adjust)
- Equipment available (checkboxes):
  - Barbell
  - Dumbbells
  - Cable machines
  - Rowing machine
  - Pull-up bar
  - Resistance bands
  - Bodyweight only

**Training Preferences:**
- Preferred weight units (kg vs lbs)
- Rest timer default durations (customizable per exercise type)
- Auto-advance to next exercise (on/off)
- Audio cues (on/off)
- Haptic feedback (on/off)

**Mesocycle Configuration:**
- Current mesocycle week (manual override if needed)
- Phase duration preferences:
  - MEV phase length (default: 2 weeks)
  - MAV phase length (default: 3 weeks)
  - MRV phase length (default: 2 weeks)
  - Deload duration (default: 1 week)

**Data Management:**
- Export workout data:
  - CSV format (all workouts, sets, reps, weights)
  - Useful for external analysis or backup
- Clear workout history:
  - Confirmation required
  - Cannot be undone
- Delete account:
  - Removes all user data
  - Confirmation required

**Notifications (Future Feature Placeholder):**
- Workout reminders (on/off)
- Recovery assessment prompts (on/off)
- Mesocycle phase transitions (on/off)

---

## User Stories

### Epic 1: Onboarding & Authentication

**US-1.1: As a new user, I want to create an account so that my training data is saved separately from other users.**
- Acceptance Criteria:
  - User can enter username (unique, 3-20 characters)
  - Password meets security requirements (min 8 characters)
  - Profile created with default 6-day split
  - User redirected to dashboard after signup

**US-1.2: As a returning user, I want to log in quickly so that I can start my workout without delays.**
- Acceptance Criteria:
  - Login screen shows list of registered users (no typing required)
  - Click user → enter password → access granted
  - Session persists for 30 days
  - Auto-login if session valid

**US-1.3: As a user, I want to set my training experience and equipment availability so that exercise recommendations are relevant.**
- Acceptance Criteria:
  - Onboarding wizard asks for experience level
  - Equipment checklist presented
  - Exercise database filtered based on selections
  - Can modify in settings later

---

### Epic 2: Daily Workout Execution

**US-2.1: As a user, I want to see today's scheduled workout on the home screen so that I know exactly what to do.**
- Acceptance Criteria:
  - Dashboard shows current day of split (Monday = Push A)
  - Exercise list visible with sets × reps targets
  - Completion status displayed
  - "START WORKOUT" button prominent

**US-2.2: As a user, I want to be guided through each exercise step-by-step so that I don't have to remember what comes next.**
- Acceptance Criteria:
  - Workout starts on first exercise
  - Clear display of exercise name, target, last performance
  - Set-by-set progression
  - Auto-advance to next exercise after all sets complete

**US-2.3: As a user, I want to log weight, reps, and RIR for each set so that my performance is tracked.**
- Acceptance Criteria:
  - Large input fields for weight/reps
  - Quick-select RIR buttons (0-4)
  - "COMPLETE SET" saves data immediately
  - No data loss if app crashes

**US-2.4: As a user, I want an automatic rest timer after each set so that I take optimal rest periods.**
- Acceptance Criteria:
  - Timer starts on "COMPLETE SET" press
  - Countdown visible (MM:SS)
  - 10-second warning (audio + haptic)
  - Timer complete alert (audio + haptic)
  - Can pause, add time, or skip

**US-2.5: As a user, I want to close the app mid-workout and resume later so that real-world interruptions don't ruin my session.**
- Acceptance Criteria:
  - Active workout session persists for 24 hours
  - On reopen, "RESUME WORKOUT" banner appears
  - Returns to exact exercise/set
  - Shows time since last activity

**US-2.6: As a user, I want to skip a set if I can't complete it so that I can move forward without getting stuck.**
- Acceptance Criteria:
  - "SKIP SET" button available
  - Confirmation dialog shown
  - Skipped set not counted in volume
  - Progress continues to next set

**US-2.7: As a user, I want to see a workout summary after finishing so that I understand my performance.**
- Acceptance Criteria:
  - Summary shows total duration, volume, sets completed
  - Comparison to last same workout
  - Muscle groups trained breakdown
  - "FINISH WORKOUT" marks as complete

**US-2.8: As a user, I want the option to cancel a workout without saving data so that bad sessions don't pollute my statistics.**
- Acceptance Criteria:
  - "CANCEL WORKOUT" button accessible during session
  - Confirmation dialog: "Discard all data?"
  - If confirmed, all logged sets deleted
  - Returns to dashboard, workout marked as not started

---

### Epic 3: Volume Tracking & Program Validation

**US-3.1: As a user, I want to see my weekly muscle volume compared to scientific targets so that I know if I'm training optimally.**
- Acceptance Criteria:
  - Dashboard shows horizontal bar chart per muscle group
  - Completed volume (green), planned volume (blue), recommended range (yellow line)
  - Visual indicators if below MEV or above MRV
  - Updates in real-time as workouts completed

**US-3.2: As a user, I want to know if my customized program is scientifically sound so that I'm confident in my modifications.**
- Acceptance Criteria:
  - Planner shows validation status per muscle group
  - Green checkmark if within MEV-MAV range
  - Yellow warning if below MEV
  - Red alert if above MRV
  - Specific recommendations provided (e.g., "Add 2 sets of rear delt work")

---

### Epic 4: Program Customization

**US-4.1: As a user, I want to swap an exercise for an alternative so that I can accommodate equipment availability or preferences.**
- Acceptance Criteria:
  - Click exercise → "SWAP EXERCISE" option
  - Exercise database opens with fuzzy search
  - Search by name or muscle group
  - Filter by equipment available
  - Selected exercise replaces original in program

**US-4.2: As a user, I want to adjust sets, reps, and RIR for any exercise so that I can personalize intensity.**
- Acceptance Criteria:
  - Click exercise → edit mode
  - Increment/decrement buttons for sets (1-6 range)
  - Input field for rep range (4-20)
  - RIR selector (0-4)
  - Changes saved immediately
  - Program validation updates

**US-4.3: As a user, I want to reorder exercises within a workout so that I can prioritize weak points.**
- Acceptance Criteria:
  - Drag-and-drop handles on exercise cards
  - Exercises reorder in real-time
  - Order persists for future workouts
  - Note: Leg exercise auto-locks to first position (can't be moved)

**US-4.4: As a user, I want to advance to the next mesocycle phase manually so that I can respond to my body's readiness.**
- Acceptance Criteria:
  - "ADVANCE PHASE" button in planner
  - Confirmation dialog explains volume changes
  - Volume automatically adjusts (+20% MEV→MAV, +15% MAV→MRV, -50% for deload)
  - Dashboard updates to show new phase

---

### Epic 5: Auto-Regulation & Recovery

**US-5.1: As a user, I want to complete a quick recovery assessment before workouts so that training adjusts to my readiness.**
- Acceptance Criteria:
  - Pre-workout prompt: 3 questions (Sleep, Soreness, Motivation)
  - 1-5 scale with clear descriptions
  - Completes in <30 seconds
  - Score calculated (3-15 range)

**US-5.2: As a user, I want my workout volume reduced if I'm under-recovered so that I don't overtrain.**
- Acceptance Criteria:
  - Score 7-9: -1 set per exercise
  - Score 4-6: -2 sets per exercise OR suggest VO2max low-intensity
  - Score 3 or below: Recommend rest day
  - Volume adjustments applied to current workout only
  - Next workout returns to planned volume (unless reassessed)

**US-5.3: As a user, I want to track my recovery trends over time so that I can identify chronic fatigue.**
- Acceptance Criteria:
  - Dashboard shows 4-week rolling average of recovery scores
  - Trend line displayed (improving/declining)
  - Alert if average <8 for 2+ weeks
  - Recommendation: "Consider early deload"

---

### Epic 6: VO2max Training

**US-6.1: As a user, I want guided interval workouts for rowing so that I execute VO2max protocols correctly.**
- Acceptance Criteria:
  - VO2max workout starts with protocol selection (4x4, 30/30, Zone 2)
  - Heart rate zones calculated and displayed
  - Interval timer with audio cues
  - Work/rest phases clearly indicated
  - Heart rate input prompted after each interval

**US-6.2: As a user, I want to track my VO2max improvement over time so that I see cardiovascular progress.**
- Acceptance Criteria:
  - Analytics dashboard shows VO2max estimate line chart
  - Calculation based on heart rate data during work intervals
  - Target overlay (5-13% improvement in 12 weeks)
  - Milestones displayed (Beginner/Average/Good/Excellent ranges)

---

### Epic 7: Analytics & Progress Visualization

**US-7.1: As a user, I want to see my 1RM progression on key lifts so that I track strength gains objectively.**
- Acceptance Criteria:
  - Analytics shows line charts for Big 5 exercises
  - 1RM calculated from best sets using Epley/Brzycki formula
  - Current 1RM, 4-week change, 12-week change, all-time PR displayed
  - Charts zoomable (4 weeks, 12 weeks, all time)

**US-7.2: As a user, I want to see my weekly tonnage trends so that I ensure progressive overload.**
- Acceptance Criteria:
  - Weekly tonnage bar chart
  - Breakdown by workout type (Push/Pull/Legs)
  - Mesocycle phase markers overlayed
  - Target: Increase during MEV→MAV→MRV, decrease during deload

**US-7.3: As a user, I want to see my workout consistency so that I'm motivated to maintain streaks.**
- Acceptance Criteria:
  - Current streak displayed (consecutive weeks with 4+ workouts)
  - All-time longest streak
  - Heatmap calendar showing workout days (GitHub style)
  - Completion rate % (workouts completed / workouts scheduled)

---

### Epic 8: Data Management & Settings

**US-8.1: As a user, I want to export my workout data so that I have a backup and can analyze externally.**
- Acceptance Criteria:
  - Settings → "EXPORT DATA" button
  - CSV file generated with all workouts, sets, reps, weights
  - Download prompt shown
  - File named: username_workout_data_YYYY-MM-DD.csv

**US-8.2: As a user, I want to customize rest timer durations so that they match my personal recovery needs.**
- Acceptance Criteria:
  - Settings → Rest Timer Preferences
  - Default durations for:
    - Heavy compounds (default 2.5-3 min, adjustable 1-5 min)
    - Isolation movements (default 1.5-2 min, adjustable 1-4 min)
  - Changes apply to all future workouts
  - Can override per-set during workout

**US-8.3: As a user, I want to toggle audio and haptic feedback so that I can work out in quiet environments.**
- Acceptance Criteria:
  - Settings → Audio Cues (on/off toggle)
  - Settings → Haptic Feedback (on/off toggle)
  - Preferences persist across sessions
  - Changes apply immediately

---

## Review & Acceptance Checklist

### Requirements Completeness
- [ ] All functional requirements have corresponding user stories
- [ ] User stories include clear acceptance criteria
- [ ] Edge cases addressed (app crashes, session timeout, bad network)
- [ ] Success metrics defined and measurable

### Scientific Accuracy
- [ ] Volume recommendations based on Mike Israetel's MEV/MAV/MRV research
- [ ] Periodization follows evidence-based mesocycle structure
- [ ] VO2max protocols match published research (Norwegian 4x4)
- [ ] Progressive overload logic aligns with hypertrophy principles
- [ ] Auto-regulation methodology validated

### User Experience
- [ ] Workflow is intuitive (minimal clicks to start workout)
- [ ] In-gym usability optimized (large buttons, clear text)
- [ ] Error states handled gracefully
- [ ] Feedback loops in place (immediate data persistence, visual confirmations)
- [ ] No dead ends (every screen has clear next action)

### Data Integrity
- [ ] All user inputs validated (weight/reps within reasonable ranges)
- [ ] Data persists immediately (no reliance on end-of-workout save)
- [ ] Session recovery handles app crashes
- [ ] Export functionality preserves all data fields

### Scope Boundaries
- [ ] No nutrition tracking (out of scope for v1)
- [ ] No social features (out of scope for v1)
- [ ] No exercise video hosting (placeholders only, external links acceptable)
- [ ] No wearable integration (manual HR input acceptable for v1)
- [ ] No AI-powered form analysis (out of scope)

---

## Success Criteria

### User Adoption
- 80%+ of users complete at least 1 full mesocycle (8 weeks)
- 70%+ workout completion rate (users finish started workouts)
- 50%+ of users customize at least 1 exercise

### Performance Outcomes
- Users report +15-25% strength gains on Big 5 lifts in 12 weeks
- Users report +2-5% bodyweight gain (muscle) in 12-week surplus
- VO2max improvement +5-13% after 12 weeks of interval training
- <5% injury rate (self-reported)

### Engagement
- Average session duration: 45-75 minutes (indicates proper rest periods followed)
- 4+ workouts per week (adherence to 6-day split, allowing 1-2 skip days)
- Recovery assessment completion rate >60%

### Technical Performance
- App loads <2 seconds
- Set logging response time <500ms
- Zero data loss incidents (all logged sets persisted)
- Offline capability not required (home server setup, gym has WiFi)

---

## Non-Functional Requirements

### Performance
- Database queries <100ms for typical operations
- Real-time updates (WebSocket) <200ms latency
- Rest timer accuracy ±1 second over 3-minute period
- App responsive during network interruptions (local caching)

### Reliability
- 99.5% uptime for backend server (home server environment)
- Graceful degradation if WebSocket connection lost
- Automatic session recovery on app restart
- Data backup strategy (daily exports recommended)

### Usability
- Mobile-first design (optimized for 5-7 inch screens)
- Portrait orientation primary (landscape optional for analytics)
- Touch targets minimum 44×44 pixels (thumb-friendly)
- High contrast (readable in bright gym lighting)
- Font size minimum 16px for body text, 24px for input fields

### Security
- JWT tokens expire after 30 days
- Passwords hashed with bcrypt (minimum 10 rounds)
- SQL injection prevention (parameterized queries)
- XSS protection on all user inputs
- HTTPS required (home server must have SSL cert)

### Scalability
- Support 10+ users on single server instance
- Database designed for 10,000+ workouts per user
- Exercise database supports 500+ exercises (future expansion)
- Analytics queries optimized for 2+ years of data

### Maintainability
- Code documentation required for all complex logic
- Database schema versioning (migrations tracked)
- API versioning strategy (v1 namespace)
- Clear separation of concerns (frontend/backend/database)

---

## Out of Scope (Future Enhancements)

### Phase 2 Features
- Exercise video demonstrations (embedded or linked)
- Bluetooth heart rate monitor integration
- Wearable device sync (Apple Watch, Garmin)
- Nutrition tracking and macro calculator
- Body composition tracking (weight, body fat %, photos)
- Social features (sharing workouts, leaderboards)
- Coach mode (assign programs to other users)

### Phase 3 Features
- AI-powered form analysis (computer vision)
- Voice commands for hands-free logging
- Custom exercise creation with video upload
- Advanced analytics (fatigue curves, deload recommendations)
- Integration with external platforms (MyFitnessPal, Strava)

---

## Appendix: Scientific Rationale

### Why 6-Day Push/Pull/VO2max Split?

**Frequency:** Research shows 2x per muscle group per week optimizes protein synthesis (Schoenfeld et al., 2016). Push/Pull split hits each muscle 2x.

**Volume:** 12-18 sets per muscle group per week = MEV-MAV range for intermediates (Israetel et al., 2017). Below 12 = suboptimal, above 18 = diminishing returns or overtraining.

**Testosterone Optimization:** Compound leg exercises (squats, deadlifts) trigger systemic hormone response. Placing them first in strength workouts maximizes hormonal environment for subsequent upper body work (Kraemer & Ratamess, 2005).

**VO2max Integration:** Norwegian 4x4 protocol shown to improve VO2max by 5-13% in 12 weeks (Helgerud et al., 2007). Separate days minimize interference effect on strength/hypertrophy adaptations.

**Periodization:** Undulating mesocycles (MEV→MAV→MRV→Deload) prevent accommodation and allow for super-compensation (Bompa & Haff, 2009).

### Why RIR (Reps in Reserve)?

**Scientific Basis:** RIR scale validated for estimating proximity to failure (Zourdos et al., 2016). More reliable than RPE for resistance training.

**Hypertrophy Optimization:** Training to RIR 0-1 (failure) = higher fatigue cost, minimal hypertrophy benefit vs RIR 2-3 (Schoenfeld et al., 2019). RIR 2-3 = "sweet spot" for volume accumulation.

**Injury Prevention:** Chronic training to failure increases injury risk by 40% (Solomonow et al., 2004). RIR 2-3 allows high volume with lower injury risk.

### Why Auto-Regulation?

**Research:** Daily readiness assessment improves training outcomes by 15-20% vs fixed programs (Mann et al., 2010). Adjusting volume based on recovery = better long-term progress.

**Practical Application:** Sleep, soreness, and motivation = validated markers of CNS and muscle recovery (Halson, 2014). 3-question assessment = quick, actionable, evidence-based.

---

## References

- Bompa, T., & Haff, G. (2009). *Periodization: Theory and Methodology of Training*. Human Kinetics.
- Halson, S. L. (2014). Monitoring training load to understand fatigue in athletes. *Sports Medicine*, 44(2), 139-147.
- Helgerud, J., et al. (2007). Aerobic high-intensity intervals improve VO2max more than moderate training. *Medicine & Science in Sports & Exercise*, 39(4), 665-671.
- Israetel, M., et al. (2017). *The Renaissance Diet 2.0*. Renaissance Periodization.
- Kraemer, W. J., & Ratamess, N. A. (2005). Hormonal responses and adaptations to resistance exercise and training. *Sports Medicine*, 35(4), 339-361.
- Mann, J. B., et al. (2010). Effect of autoregulatory progressive resistance exercise vs. linear periodization on strength improvement in college athletes. *Journal of Strength and Conditioning Research*, 24(7), 1718-1723.
- Schoenfeld, B. J., et al. (2016). Effects of resistance training frequency on measures of muscle hypertrophy: A systematic review and meta-analysis. *Sports Medicine*, 46(11), 1689-1697.
- Schoenfeld, B. J., et al. (2019). Resistance training volume enhances muscle hypertrophy but not strength in trained men. *Medicine & Science in Sports & Exercise*, 51(1), 94-103.
- Solomonow, M., et al. (2004). Biomechanics and electromyography of a common idiopathic low back disorder. *Spine*, 29(23), 2696-2704.
- Zourdos, M. C., et al. (2016). Novel resistance training-specific rating of perceived exertion scale measuring repetitions in reserve. *Journal of Strength and Conditioning Research*, 30(1), 267-275.

---

**END OF SPECIFICATION**