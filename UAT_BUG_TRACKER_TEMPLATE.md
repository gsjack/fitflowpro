# FitFlow Pro UAT Bug Tracker Template

**Instructions**: Create this spreadsheet in Google Sheets at [sheets.google.com](https://sheets.google.com)

---

## Spreadsheet Configuration

**Title**: FitFlow Pro UAT - Bug Tracker

**Sharing Settings**:
- [ ] Anyone with link can **edit** (allow participants to report bugs directly)
- OR
- [ ] Anyone with link can **view** (PM enters bugs from email reports)

**Recommended**: Allow edit access for faster bug reporting

---

## Sheet 1: Active Bugs

### Column Headers

| Column | Header | Format | Example Value |
|--------|--------|--------|---------------|
| A | Bug ID | Text | UAT-001 |
| B | Title | Text | App crashes when logging set with RIR 0 |
| C | Severity | Dropdown | P0 |
| D | Status | Dropdown | Open |
| E | Reporter | Text | John D. |
| F | Date Found | Date | 2025-10-07 |
| G | Device | Text | iPhone 14 Pro |
| H | OS Version | Text | iOS 17.2 |
| I | App Version | Text | 1.0.0 (42) |
| J | Scenario | Text | Scenario 2 (Workout) |
| K | Steps to Reproduce | Text (long) | See details below |
| L | Expected Result | Text | Set logs successfully |
| M | Actual Result | Text | App freezes and crashes |
| N | Screenshot/Video | URL | https://... |
| O | Assigned To | Text | Dev Team |
| P | Date Fixed | Date | 2025-10-09 |
| Q | Fix Notes | Text | Fixed RIR validation bug |
| R | Re-test Status | Dropdown | Pass |

### Dropdown Values

**Severity (Column C)**:
- P0 - Critical
- P1 - High
- P2 - Medium
- P3 - Low

**Status (Column D)**:
- Open
- In Progress
- Fixed
- Closed
- Won't Fix
- Duplicate

**Re-test Status (Column R)**:
- Not Tested
- Pass
- Fail
- N/A

### Conditional Formatting

**Rule 1: Highlight P0 bugs**
- **Apply to**: Column C (Severity)
- **Condition**: Text contains "P0"
- **Format**: Background = Red, Text = White, Bold

**Rule 2: Highlight Fixed bugs**
- **Apply to**: Column D (Status)
- **Condition**: Text contains "Fixed"
- **Format**: Background = Light Green

**Rule 3: Highlight Open P1 bugs**
- **Apply to**: Entire row
- **Condition**: `AND($C2="P1 - High", $D2="Open")`
- **Format**: Background = Light Yellow

### Sample Data (Row 2)

```
UAT-001 | App crashes when logging set with RIR 0 | P0 - Critical | Fixed | John D. | 2025-10-07 | iPhone 14 Pro | iOS 17.2 | 1.0.0 (42) | Scenario 2 (Workout) | 1. Start workout\n2. Log set with weight 100kg, reps 10, RIR 0\n3. Tap "Log Set" | Set logs successfully | App freezes and crashes to home screen | https://imgur.com/abc123 | Dev Team | 2025-10-08 | Fixed null check for RIR 0 edge case | Pass
```

---

## Sheet 2: Bug Summary (Auto-calculated)

### Summary Table

| Metric | Formula | Target |
|--------|---------|--------|
| **Total Bugs** | `=COUNTA('Active Bugs'!A2:A1000)` | - |
| **P0 Bugs** | `=COUNTIF('Active Bugs'!C:C,"P0 - Critical")` | 0 |
| **P1 Bugs** | `=COUNTIF('Active Bugs'!C:C,"P1 - High")` | ≤ 3 |
| **P2 Bugs** | `=COUNTIF('Active Bugs'!C:C,"P2 - Medium")` | - |
| **P3 Bugs** | `=COUNTIF('Active Bugs'!C:C,"P3 - Low")` | - |
| **Open Bugs** | `=COUNTIF('Active Bugs'!D:D,"Open")` | - |
| **Fixed Bugs** | `=COUNTIF('Active Bugs'!D:D,"Fixed")` | - |
| **Won't Fix** | `=COUNTIF('Active Bugs'!D:D,"Won't Fix")` | - |

### Chart: Bugs by Severity

**Type**: Pie chart

**Data Range**: Summary table (P0/P1/P2/P3 counts)

**Title**: Bugs by Severity

---

## Sheet 3: Bug Report Form (for participants)

**Instructions for participants**:

```
HOW TO REPORT A BUG:

1. Go to "Active Bugs" tab
2. Add a new row at the bottom
3. Fill in these columns (in order):

   A. Bug ID: Leave blank (PM will assign)
   B. Title: Short description (e.g., "Logout button doesn't work")
   C. Severity: Choose from dropdown
      - P0 = App crash, data loss, can't complete core task
      - P1 = Major UX issue, workaround exists but painful
      - P2 = Minor UX issue, cosmetic
      - P3 = Nice-to-have enhancement
   D. Status: Leave as "Open"
   E. Reporter: Your name (or initials)
   F. Date Found: Today's date
   G. Device: Your phone model (e.g., iPhone 14 Pro)
   H. OS Version: Settings → General → About (e.g., iOS 17.2)
   I. App Version: Settings screen in app (e.g., 1.0.0)
   J. Scenario: Which test scenario? (e.g., Scenario 2)
   K. Steps to Reproduce: How to make the bug happen (numbered list)
   L. Expected Result: What SHOULD happen
   M. Actual Result: What ACTUALLY happened
   N. Screenshot/Video: Upload to Imgur/Drive and paste link (optional)
   O-R: Leave blank (PM/Dev will fill)

4. Save and move to next bug

EXAMPLE:
- Title: "Rest timer doesn't start after logging set"
- Severity: P1 - High
- Reporter: Sarah M.
- Device: Pixel 6
- OS Version: Android 14
- Steps:
  1. Start workout
  2. Log first set of Bench Press
  3. Tap "Log Set"
  Expected: Rest timer starts (3 min countdown)
  Actual: No timer appears, have to start manually
```

---

## Sheet 4: Duplicate Bugs

**Purpose**: Track bugs reported multiple times (indicates severity)

### Columns

| Original Bug ID | Duplicate Bug ID | Reporter | Date |
|-----------------|------------------|----------|------|
| UAT-001 | UAT-007 | Sarah M. | 2025-10-08 |
| UAT-001 | UAT-012 | Mike P. | 2025-10-09 |

**Note**: Mark duplicates as "Duplicate" in Active Bugs sheet, reference original bug

---

## Sheet 5: Won't Fix / Deferred

**Purpose**: Track bugs that won't be fixed before launch (with rationale)

### Columns

| Bug ID | Title | Severity | Reason Won't Fix | Alternative Solution |
|--------|-------|----------|------------------|----------------------|
| UAT-015 | Dark mode not available | P3 - Low | Post-launch feature | Use system brightness settings |
| UAT-023 | Analytics load slowly on Android 11 | P2 - Medium | < 1% of users on Android 11 | Optimize in future release |

---

## Automated Alerts (Optional - requires Google Apps Script)

**Alert Rule**: Email PM when P0 bug is added

```javascript
function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  if (sheet.getName() !== 'Active Bugs') return;

  var range = e.range;
  var col = range.getColumn();

  // Check if Severity column (C = 3) was edited
  if (col === 3) {
    var severity = range.getValue();
    if (severity === 'P0 - Critical') {
      var row = range.getRow();
      var bugTitle = sheet.getRange(row, 2).getValue(); // Column B
      var reporter = sheet.getRange(row, 5).getValue(); // Column E

      // Send email alert
      MailApp.sendEmail({
        to: 'pm-email@example.com',
        subject: '🚨 P0 BUG REPORTED - FitFlow UAT',
        body: `A critical P0 bug was just reported:\n\nTitle: ${bugTitle}\nReporter: ${reporter}\n\nView bug tracker: https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID`
      });
    }
  }
}
```

**Setup**:
1. Extensions → Apps Script
2. Paste code above
3. Replace `pm-email@example.com` with your email
4. Save and authorize

---

## Bug Triage Workflow

### Daily Triage (During UAT)

**Time**: End of each day (6 PM)

**Process**:
1. Review new bugs (Status = Open)
2. Verify severity is correct
3. Assign Bug IDs (UAT-001, UAT-002, etc.)
4. Assign to Dev Team or PM
5. Add to fix plan (if P0/P1)

### Weekly Summary (Friday)

**Report to stakeholders**:
- Total bugs: X
- P0: X (all fixed? Yes/No)
- P1: X (fix plan: ...)
- P2/P3: X (defer to backlog)
- UAT status: ON TRACK / AT RISK

---

## Export & Sharing

**Share with participants**:
1. Click "Share" in top-right
2. Change to "Anyone with link can **edit**"
3. Copy link
4. Add to UAT onboarding email

**Export for archival**:
1. File → Download → Microsoft Excel (.xlsx)
2. Save to `/home/asigator/fitness2025/uat-results/bug-tracker-YYYY-MM-DD.xlsx`

---

## Integration with UAT Summary Report

**After UAT completes**, export bug data to include in `UAT_SUMMARY_REPORT.md`:

```bash
# Export bug summary
1. Open bug tracker Google Sheet
2. Copy "Bug Summary" tab data
3. Paste into UAT_SUMMARY_REPORT.md

# Example summary:
Total Bugs: 18
- P0: 2 (both fixed)
- P1: 5 (4 fixed, 1 deferred)
- P2: 8 (2 fixed, 6 deferred)
- P3: 3 (all deferred to backlog)

Top Issues:
1. UAT-001: App crash on RIR 0 (FIXED)
2. UAT-003: Volume bars too faint (FIXED)
3. UAT-007: Drag handles not discoverable (FIXED)
```

---

## Template Link

**After creating Google Sheet**:

1. Copy shareable link
2. Update `/home/asigator/fitness2025/UAT_TEST_PLAN.md` (Appendix B)
3. Add link to participant onboarding email

**Example**: https://docs.google.com/spreadsheets/d/abc123xyz/edit

---

**End of Bug Tracker Template**
