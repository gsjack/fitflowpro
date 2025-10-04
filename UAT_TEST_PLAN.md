# FitFlow Pro - User Acceptance Test Plan

## Executive Summary

**Version**: 1.0
**Date**: October 4, 2025
**Status**: Ready for UAT
**Test Period**: 3-5 days
**Target Participants**: 5-10 users

FitFlow Pro has completed comprehensive visual improvements (P0 + P1 priorities). This UAT plan validates the app is ready for production launch by testing with real users across key workflows.

---

## Test Objectives

1. **Validate Visual Improvements**: Confirm P0 + P1 fixes meet user expectations
2. **Verify Intuitive UX**: Ensure app is usable without training for fitness enthusiasts
3. **Identify Pain Points**: Discover UX friction before production launch
4. **Confirm Accessibility**: Validate WCAG 2.1 AA compliance with real users
5. **Measure Satisfaction**: Quantify user satisfaction with visual design and workflows

---

## Test Participants

### Target Profile

| Category | Count | Experience Level | Platform |
|----------|-------|------------------|----------|
| Beginners | 3 | < 6 months training | 2 iOS, 1 Android |
| Intermediate | 3 | 6-24 months training | 2 iOS, 1 Android |
| Advanced | 2 | 2+ years training | 1 iOS, 1 Android |
| Accessibility | 2 | Any level, uses screen reader | 1 iOS, 1 Android |

### Recruitment Criteria

**Must Have**:
- Active gym-goer (2+ workouts/week)
- Smartphone (iOS 15+ or Android 12+)
- 30-60 minutes available for testing over 3-5 days
- Willing to provide honest feedback

**Nice to Have**:
- Familiar with Renaissance Periodization concepts
- Currently tracking workouts (notebook, app, spreadsheet)
- Experience with screen readers (for accessibility testers)

---

## Test Scenarios

### Scenario 1: First-Time User Onboarding

**Objective**: Verify new users can register and understand the app without friction

**Duration**: 15-20 minutes
**Prerequisites**: None (fresh install)

**Steps**:
1. Download FitFlow Pro from TestFlight/Google Play (internal test track)
2. Launch app for first time
3. Create account (register with email/password)
4. Explore empty states:
   - Dashboard (no workouts yet)
   - Analytics (no data)
   - Planner (no programs)
5. Navigate to Planner and create first program:
   - Choose 6-day split template OR create custom
   - Review pre-populated exercises
   - Understand volume landmarks (MEV/MAV/MRV)
6. Start first workout from Dashboard
7. Log 1 set of Bench Press

**Acceptance Criteria**:
- [ ] Registration completes in < 2 minutes
- [ ] Empty states provide clear "Get Started" or "Add Program" CTAs
- [ ] User understands what MEV/MAV/MRV mean (or finds help text/tooltips)
- [ ] User successfully logs first set without external help
- [ ] No confusion about navigation (bottom tabs are clear)

**Feedback Questions**:
1. Was the registration process clear and fast? (Yes/No)
2. Did empty states guide you to next actions? (1-5 scale)
3. What was the MOST confusing part of onboarding?
4. Did you understand what MEV/MAV/MRV mean? If not, did you find help?
5. Rate overall onboarding experience (1-5): ___
6. Would you complete onboarding on your own, or would you give up? (Complete/Give Up)

---

### Scenario 2: Workout Session

**Objective**: Verify workout logging is fast, intuitive, and works under realistic conditions

**Duration**: 20-30 minutes (simulated workout)
**Prerequisites**: Program created (from Scenario 1 or pre-seeded)

**Steps**:
1. Navigate to Dashboard
2. Tap "Start Workout" for Push Day 1
3. Log sets for 3 exercises:
   - **Bench Press**: 3 sets x 8 reps @ 100kg, RIR 2
   - **Incline Dumbbell Press**: 3 sets x 10 reps @ 35kg, RIR 2
   - **Cable Flyes**: 2 sets x 15 reps @ 20kg, RIR 1
4. For each set:
   - Use +/- buttons to adjust weight
   - Use +/- buttons to adjust reps
   - Select RIR (0-4 scale)
   - Tap "Log Set"
5. Test long-press auto-increment on weight buttons (hold +10kg button)
6. Check rest timer between sets (automatic 3-5 min countdown)
7. Complete workout (log all sets)
8. Review workout summary (total volume, 1RM estimates)

**Acceptance Criteria**:
- [ ] Logging 1 set takes < 10 seconds (from finishing rep to tapping "Log Set")
- [ ] +/- buttons are large enough to tap with sweaty/shaky hands (44x44pt minimum)
- [ ] Long-press auto-increment is discoverable (or user finds it naturally)
- [ ] Rest timer is visible and doesn't interfere with logging next set
- [ ] Progress bar (e.g., "5/9 sets complete") clearly shows workout completion
- [ ] Workout summary is motivating and shows clear progress

**Feedback Questions**:
1. How long did it take to log ONE set? (Estimate in seconds): ___
2. Were +/- buttons easy to tap? (1-5, where 5 = very easy)
3. Did you discover long-press auto-increment? (Yes/No)
4. If yes, was it helpful? (Yes/No/Didn't use it)
5. Was the rest timer helpful or distracting? (Helpful/Neutral/Distracting)
6. Rate workout logging experience (1-5): ___
7. What would make logging sets faster or easier?

---

### Scenario 3: Recovery Assessment

**Objective**: Verify recovery tracking is intuitive and provides actionable guidance

**Duration**: 5 minutes
**Prerequisites**: At least 1 workout completed

**Steps**:
1. Navigate to Dashboard
2. Find "Daily Recovery Check-In" card or prompt
3. Complete recovery assessment:
   - **Sleep Quality** (1-5): Select emoji (😴 Bad → 😊 Great)
   - **Muscle Soreness** (1-5): Select emoji (😫 Very Sore → 💪 Fresh)
   - **Motivation** (1-5): Select emoji (😩 Low → 🔥 High)
4. Submit assessment
5. Review recovery score (3-15 scale)
6. Read volume adjustment recommendation:
   - 12-15: "No adjustment needed"
   - 9-11: "Reduce by 1 set per exercise"
   - 6-8: "Reduce by 2 sets per exercise"
   - 3-5: "Consider rest day"
7. Observe if recommendation is applied to next workout (if score < 12)

**Acceptance Criteria**:
- [ ] Emoji labels make 1-5 scale clear (no need to guess what "3" means)
- [ ] User understands what each question measures (sleep, soreness, motivation)
- [ ] Recovery score (3-15) makes sense in context
- [ ] Recommendations are actionable and not overly aggressive
- [ ] User sees value in tracking recovery (not just busywork)

**Feedback Questions**:
1. Were emoji labels helpful for rating 1-5? (Yes/No)
2. Did you understand the 1-5 scale for each question? (Yes/No)
3. Was the recovery score (3-15) clear? (Yes/No)
4. Were recommendations useful? (Very useful/Somewhat/Not useful)
5. Would you do this daily? (Yes/Maybe/No)
6. Rate recovery assessment experience (1-5): ___

---

### Scenario 4: Progress Tracking (Analytics)

**Objective**: Verify analytics are informative, motivating, and performant

**Duration**: 10-15 minutes
**Prerequisites**: 3+ workouts completed (or use pre-seeded demo data)

**Steps**:
1. Navigate to Analytics screen
2. Explore **1RM Progression Chart**:
   - Select exercise (e.g., Bench Press)
   - View last 8 weeks of estimated 1RM
   - Identify upward trend or plateaus
3. Explore **Volume Trends Chart**:
   - View weekly volume for chest
   - See MEV/MAV/MRV zones as background shading
   - Identify if current week is "optimal" or "below MEV"
4. Explore **Muscle Group Volume Bars**:
   - View current week volume vs. landmarks
   - Check if bars are clearly visible (not faint/washed out)
   - Identify which muscle groups are under-trained
5. Test chart interactivity (if implemented):
   - Tap data points for details
   - Swipe between weeks

**Acceptance Criteria**:
- [ ] Charts load in < 2 seconds (even with 3 months of data)
- [ ] Volume bars are clearly visible (sufficient contrast, not gray-on-gray)
- [ ] MEV/MAV/MRV zones are understandable (labels or tooltips explain)
- [ ] User feels motivated by seeing progress (not overwhelmed by data)
- [ ] No confusion about what each chart represents

**Feedback Questions**:
1. Were charts easy to understand? (1-5)
2. Did volume bars clearly show your progress? (Yes/No)
3. Could you identify MEV/MAV/MRV zones? (Yes/No/What are those?)
4. What additional analytics would you like to see?
5. Rate analytics experience (1-5): ___
6. Did analytics motivate you to train harder? (Yes/Neutral/No)

---

### Scenario 5: Program Customization (Planner)

**Objective**: Verify program editing is flexible and intuitive

**Duration**: 15-20 minutes
**Prerequisites**: Program created

**Steps**:
1. Navigate to Planner screen
2. Select "Push Day 1"
3. **Add new exercise**:
   - Tap "Add Exercise"
   - Search for "Dips"
   - Select "Dips (Chest Emphasis)"
   - Set 3 sets, 8-12 reps, RIR 2
   - Save
4. **Reorder exercises**:
   - Long-press drag handle (right side) on "Cable Flyes"
   - Drag to move above "Incline Dumbbell Press"
   - Release to drop
5. **Swap exercise for alternative**:
   - Tap 3-dot menu on "Bench Press"
   - Select "Swap Exercise"
   - View alternatives (e.g., "Dumbbell Bench Press", "Smith Machine Bench")
   - Select alternative
   - Confirm swap
6. **Adjust sets/reps/RIR**:
   - Tap "Incline Dumbbell Press"
   - Change from 3 sets to 4 sets
   - Change target reps from 8-12 to 10-15
   - Save
7. **Check volume warnings**:
   - Observe if adding exercises triggers "Above MRV" warning
   - Read warning message

**Acceptance Criteria**:
- [ ] Drag handles are discoverable (visible on right side, recognizable icon)
- [ ] Drag-and-drop is smooth (no lag, clear drop zones)
- [ ] Exercise swap shows clear alternatives (same muscle groups, equipment)
- [ ] Volume warnings are helpful (not alarming, explain why it matters)
- [ ] Changes save immediately (no "Save" button required unless in edit mode)

**Feedback Questions**:
1. Did you notice drag handles immediately? (Yes/No)
2. Was drag-and-drop intuitive? (1-5)
3. Were exercise swap alternatives relevant? (Yes/No)
4. Were volume warnings useful? (Very useful/Somewhat/Not useful/Didn't see any)
5. Rate program customization experience (1-5): ___
6. What was the hardest part of editing your program?

---

### Scenario 6: Accessibility Testing

**Objective**: Verify app is accessible to users with visual impairments or disabilities

**Duration**: 20-30 minutes
**Prerequisites**: None (can be done alongside other scenarios)
**Participants**: 2 users familiar with screen readers (VoiceOver/TalkBack)

**Steps**:
1. **Enable screen reader**:
   - iOS: Settings → Accessibility → VoiceOver → Enable
   - Android: Settings → Accessibility → TalkBack → Enable
2. **Navigate through app**:
   - Swipe through all tabs (Dashboard, Analytics, Planner, Settings)
   - Listen to labels (are they descriptive?)
   - Check navigation order (is it logical top-to-bottom, left-to-right?)
3. **Complete workout logging with screen reader**:
   - Start workout
   - Focus on weight field, adjust with +/- buttons
   - Focus on reps field, adjust with +/- buttons
   - Select RIR (0-4)
   - Tap "Log Set" button
4. **Test color contrast**:
   - View app in bright sunlight (or simulate with max screen brightness)
   - Check if text is readable (especially gray text on white backgrounds)
   - Check if buttons are distinguishable
5. **Test without screen reader** (visual accessibility):
   - Increase font size to maximum (iOS Dynamic Type, Android Display Size)
   - Check if layouts adapt (no text truncation)

**Acceptance Criteria**:
- [ ] All interactive elements have clear, descriptive labels (e.g., "Increase weight by 5 kilograms" not just "Plus")
- [ ] Navigation order is logical (no jumping around randomly)
- [ ] Forms are fillable with screen reader (labels announce before inputs)
- [ ] Text contrast meets WCAG AA (4.5:1 for normal text, 3:1 for large text)
- [ ] App is usable at maximum font size (no critical text truncation)

**Feedback Questions** (for screen reader users):
1. Were all elements properly labeled? (Yes/Mostly/Many missing)
2. Was navigation order intuitive? (Yes/No)
3. Any elements you couldn't access or understand? (List): ___
4. Rate accessibility (1-5): ___

**Feedback Questions** (for sighted users):
1. Is text readable in bright light? (Yes/No)
2. Are buttons clearly visible and tappable? (Yes/No)
3. At maximum font size, does the app still work? (Yes/No)

---

## Feedback Collection

### User Feedback Form

**Tool**: Google Forms
**Distribution**: Send to participants after completing all scenarios
**Estimated Completion Time**: 10 minutes

**Form Structure**:

#### Section 1: Overall Experience

1. **Overall app visual design** (1-5 scale)
   - 1 = Very poor, 5 = Excellent
2. **Ease of navigation** (1-5 scale)
   - 1 = Very confusing, 5 = Very intuitive
3. **Workout logging speed** (1-5 scale)
   - 1 = Very slow, 5 = Very fast
4. **Empty state helpfulness** (1-5 scale)
   - 1 = Not helpful, 5 = Very helpful

#### Section 2: Feature-Specific Feedback

5. **Most helpful feature** (free text)
   - Example: "Rest timer", "1RM tracking", "Volume warnings"
6. **Most frustrating issue** (free text)
   - Example: "Buttons too small", "Couldn't find how to swap exercises"
7. **What would prevent you from using this app daily?** (free text)
   - Looking for deal-breakers

#### Section 3: Net Promoter Score

8. **Would you recommend FitFlow Pro to a friend?**
   - [ ] Definitely yes (9-10)
   - [ ] Probably yes (7-8)
   - [ ] Maybe (5-6)
   - [ ] Probably not (3-4)
   - [ ] Definitely not (1-2)

#### Section 4: Comparison (if applicable)

9. **If you currently use another workout tracking app, how does FitFlow Pro compare?**
   - [ ] Much better
   - [ ] Somewhat better
   - [ ] About the same
   - [ ] Somewhat worse
   - [ ] Much worse
   - [ ] I don't use another app

#### Section 5: Open Feedback

10. **Additional comments** (free text)
    - Bugs, suggestions, praise, anything else

### Google Forms Link

**Template URL**: [Create form at forms.google.com](https://forms.google.com)

**Suggested Title**: "FitFlow Pro UAT Feedback"

**Sharing Settings**: Anyone with link can respond (no sign-in required)

---

## Bug Reporting

### Severity Levels

| Level | Definition | Example | Response Time |
|-------|------------|---------|---------------|
| **P0 (Critical)** | App crashes, data loss, cannot complete core workflow | Logging set crashes app | Fix immediately |
| **P1 (High)** | Major UX issue, workaround exists but painful | Drag-and-drop doesn't work, must delete and re-add | Fix before launch |
| **P2 (Medium)** | Minor UX issue, cosmetic bug | Button alignment off by 2px | Fix post-launch |
| **P3 (Low)** | Enhancement request, nice-to-have | "Add dark mode" | Backlog |

### Bug Report Template

**Format**: Markdown or Google Sheets

```markdown
**Title**: [Concise one-line description]

**Severity**: P0 / P1 / P2 / P3

**Device**: iPhone 14 Pro / Pixel 6 / etc.

**OS Version**: iOS 17.2 / Android 14

**App Version**: 1.0.0 (build 42)

**Steps to Reproduce**:
1. Launch app
2. Navigate to Planner
3. Tap "Add Exercise"
4. [etc.]

**Expected Result**:
Exercise selection modal appears

**Actual Result**:
App freezes for 3 seconds, then modal appears

**Screenshot/Video**:
[Attach or paste link]

**Workaround** (if any):
Close and reopen app

**Additional Context**:
Only happens after logging 5+ workouts
```

### Bug Tracking Sheet

**Tool**: Google Sheets
**Columns**:

| Bug ID | Title | Severity | Status | Reporter | Date Found | Assigned To | Date Fixed | Notes |
|--------|-------|----------|--------|----------|------------|-------------|------------|-------|
| UAT-001 | Set logging crashes on RIR 0 | P0 | Open | John D. | 2025-10-07 | Dev Team | - | iOS only |
| UAT-002 | Volume bars too faint | P1 | Fixed | Sarah M. | 2025-10-08 | Design | 2025-10-09 | Increased opacity |

**Template URL**: [Create spreadsheet at sheets.google.com](https://sheets.google.com)

---

## Success Criteria

### Quantitative Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Overall design rating | ≥ 4.0/5.0 average | Feedback form Q1 |
| Navigation ease rating | ≥ 4.0/5.0 average | Feedback form Q2 |
| Onboarding completion rate | ≥ 90% | Scenario 1 completion |
| Workout logging speed | ≥ 85% complete 1 set in < 10s | Scenario 2 observation |
| Accessibility rating | ≥ 4.0/5.0 average | Scenario 6 feedback |
| Net Promoter Score | ≥ 50% "Definitely yes" | Feedback form Q8 |

### Qualitative Success

**Pass UAT if**:
- [ ] 80%+ of users rate overall design ≥ 4/5
- [ ] 90%+ complete Scenario 1 (onboarding) without external help
- [ ] 85%+ complete Scenario 2 (workout logging) in < 10s per set
- [ ] **No P0 bugs discovered**
- [ ] ≤ 3 P1 bugs discovered (and all have fix plan)
- [ ] Accessibility score ≥ 4/5 (from screen reader users)
- [ ] No user says "I would not use this app" due to UX issues

**Defer Launch if**:
- [ ] **Any P0 bugs found** (app crashes, data loss)
- [ ] ≥ 5 P1 bugs found (indicates systemic UX issues)
- [ ] < 70% overall user satisfaction (avg rating < 3.5/5)
- [ ] Accessibility failures (screen reader users cannot complete workflows)
- [ ] > 20% of users say they would not use the app daily

---

## Timeline

### Week 1: Recruitment & Active Testing

| Day | Activity | Responsible | Deliverable |
|-----|----------|-------------|-------------|
| **Mon** | Recruit 5-10 participants | PM | Participant list confirmed |
| **Mon** | Distribute TestFlight/Play Store internal test builds | Dev | Build links sent |
| **Tue-Wed** | Onboard participants (send UAT plan, feedback form links) | PM | Participants acknowledge receipt |
| **Wed-Fri** | Active testing period (participants complete scenarios) | Participants | Feedback forms submitted |
| **Fri-Sat** | Monitor bug reports, answer participant questions | PM + Dev | Bug tracker updated |
| **Sun** | Collect final feedback, close testing window | PM | All feedback received |

### Week 2: Analysis & Fixes

| Day | Activity | Responsible | Deliverable |
|-----|----------|-------------|-------------|
| **Mon** | Analyze feedback, prioritize bugs | PM + Dev | Prioritized bug list |
| **Tue** | Create fix plan for P0/P1 bugs | Dev | Fix plan with estimates |
| **Wed-Thu** | Fix P0/P1 issues | Dev | Fixed builds |
| **Fri** | Re-test critical fixes (regression testing) | QA/PM | Regression test report |
| **Sat** | Compile UAT summary report | PM | UAT_SUMMARY_REPORT.md |
| **Sun** | Go/No-Go decision meeting | PM + Dev + Stakeholders | Launch decision |

---

## Deliverables

### 1. UAT Test Plan (This Document)
- [ ] **File**: `/home/asigator/fitness2025/UAT_TEST_PLAN.md`
- [ ] Status: ✅ Complete

### 2. User Feedback Form
- [ ] **Tool**: Google Forms
- [ ] **Status**: Template provided (needs form creation)
- [ ] **Link**: [To be created at forms.google.com]

### 3. Bug Tracking Sheet
- [ ] **Tool**: Google Sheets
- [ ] **Status**: Template provided (needs sheet creation)
- [ ] **Link**: [To be created at sheets.google.com]

### 4. UAT Summary Report (Post-Testing)
- [ ] **File**: `/home/asigator/fitness2025/UAT_SUMMARY_REPORT.md`
- [ ] **Contents**:
  - Executive summary (pass/fail decision)
  - Key findings (quantitative metrics)
  - User testimonials (qualitative feedback)
  - Bug summary (P0/P1 counts, status)
  - Recommendations (launch, defer, or iterate)
- [ ] **Status**: To be created after testing completes

### 5. Go/No-Go Recommendation
- [ ] **Format**: Email or Slack summary
- [ ] **Recipients**: Product team, dev team, stakeholders
- [ ] **Contents**:
  - Decision: LAUNCH / DEFER / ITERATE
  - Rationale: Data-driven (metrics + feedback)
  - Next steps: If defer, what needs fixing? If launch, when?
- [ ] **Status**: To be delivered end of Week 2

---

## Appendix A: Pre-Test Checklist

Before distributing builds to participants, confirm:

- [ ] Backend server is running and accessible (production or staging URL)
- [ ] Database is seeded with demo data (100+ exercises, sample programs)
- [ ] TestFlight (iOS) or Google Play internal test track (Android) builds uploaded
- [ ] Crash reporting enabled (Sentry or equivalent)
- [ ] Analytics disabled (don't track UAT participants as real users)
- [ ] Test accounts created (or participants can register freely)
- [ ] UAT plan shared with participants (this document or summary)
- [ ] Feedback form and bug tracker links prepared
- [ ] PM/Dev team availability confirmed (to answer questions during testing)

---

## Appendix B: Participant Onboarding Email Template

**Subject**: FitFlow Pro UAT - You're Invited to Test Our App!

**Body**:

Hi [Participant Name],

Thank you for agreeing to test FitFlow Pro! Your feedback will help us launch the best possible app.

**What You'll Do**:
- Install the app (TestFlight or Google Play link below)
- Complete 6 test scenarios over 3-5 days (~1-2 hours total)
- Fill out a feedback form
- Report any bugs you find

**Links**:
- **iOS TestFlight**: [Insert link]
- **Android Play Store (Internal Test)**: [Insert link]
- **UAT Test Plan**: [Link to this document]
- **Feedback Form**: [Google Forms link]
- **Bug Report Form**: [Google Sheets link]

**Timeline**:
- **Start**: October 7, 2025
- **End**: October 11, 2025
- **Feedback Due**: October 12, 2025

**Questions?**
Reply to this email or Slack me anytime.

Thanks for helping us build something great!

[Your Name]
Product Manager, FitFlow Pro

---

## Appendix C: Known Issues (Pre-UAT)

Document any known issues here to avoid duplicate bug reports:

| Issue | Severity | Status | Notes |
|-------|----------|--------|-------|
| [Example] Analytics charts slow on Android 11 | P2 | Investigating | < 1% of users on Android 11 |
| [Example] Dark mode not implemented | P3 | Backlog | Post-launch feature |

---

## Contact Information

**Product Manager**: [Your Name]
**Email**: [your-email@example.com]
**Slack**: @yourname

**Dev Team Lead**: [Dev Name]
**Email**: [dev-email@example.com]

**UAT Coordinator**: [Coordinator Name] (if different from PM)

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-04 | Initial UAT plan created | Claude (PM Agent) |

---

**End of UAT Test Plan**
