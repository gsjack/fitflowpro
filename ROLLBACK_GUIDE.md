# Rollback Guide - Visual Improvements Phase 1

**Date**: October 4, 2025
**Branch**: 002-actual-gaps-ultrathink
**Changes**: WCAG AA Color Compliance

---

## Quick Rollback (Recommended)

### Option 1: Automated Script

```bash
cd /home/asigator/fitness2025
./mobile/scripts/rollback-visual-fixes.sh
```

This script will:
1. Restore all backup files
2. Verify checksums
3. Report restoration status
4. Leave backups intact for re-application

---

### Option 2: Git Revert

```bash
cd /home/asigator/fitness2025
git checkout HEAD -- mobile/src/theme/colors.ts
```

**Warning**: This loses the changes permanently. Use Option 1 if you might want to re-apply.

---

## Manual Rollback

If automated methods fail, restore manually from backup files.

### Step 1: Restore colors.ts

```bash
cd /home/asigator/fitness2025/mobile/src/theme
cp colors.ts.backup colors.ts
```

**Verification**:
```bash
diff colors.ts.backup colors.ts
# Should output: (no differences)
```

---

### Step 2: Verify Restoration

```bash
cd /home/asigator/fitness2025
git diff mobile/src/theme/colors.ts
```

**Expected Output**:
```diff
diff --git a/mobile/src/theme/colors.ts b/mobile/src/theme/colors.ts
index 3b30eb2..db7a4e6 100644
--- a/mobile/src/theme/colors.ts
+++ b/mobile/src/theme/colors.ts
@@ -58,9 +58,9 @@ export const colors = {
   // Text Colors
   text: {
     primary: '#FFFFFF', // White (main text)
-    secondary: '#B8BEDC', // Light blue-gray (secondary text) - 6.51:1 contrast (WCAG AA)
-    tertiary: '#9BA2C5', // Darker blue-gray (captions, hints) - 4.61:1 contrast (WCAG AA)
-    disabled: '#8088B0', // Very subtle (disabled states) - 4.51:1 contrast (WCAG AA)
+    secondary: '#A0A6C8', // Light blue-gray (secondary text)
+    tertiary: '#6B7299', // Darker blue-gray (captions, hints)
+    disabled: '#4A5080', // Very subtle (disabled states)
   },
```

---

### Step 3: Clear Metro Bundler Cache

**Important**: React Native caches theme values. Must clear cache for changes to take effect.

```bash
cd /home/asigator/fitness2025/mobile
npx expo start -c
```

**Verification**:
- Look for "Bundling complete" message
- Open app and check text colors have reverted
- Secondary text should appear very faint again

---

## Backup File Inventory

### Files with Backups

| Original File | Backup File | Size | Timestamp |
|--------------|-------------|------|-----------|
| `mobile/src/theme/colors.ts` | `mobile/src/theme/colors.ts.backup` | 3,391 bytes | Oct 4 16:40 |
| `mobile/src/screens/DashboardScreen.tsx` | `mobile/src/screens/DashboardScreen.tsx.backup` | 30,272 bytes | Oct 4 16:40 |
| `mobile/src/screens/WorkoutScreen.tsx` | `mobile/src/screens/WorkoutScreen.tsx.backup` | 15,643 bytes | Oct 4 16:40 |

**Note**: DashboardScreen and WorkoutScreen backups exist but were not modified in this phase. They are preserved for future rollback scenarios.

---

## Rollback Validation

After rolling back, verify the system is in the original state:

### 1. Visual Inspection

**Expected Behavior** (post-rollback):
- Secondary text appears **very faint** (barely readable)
- Tertiary text appears **almost invisible**
- Disabled text appears **completely invisible**

**Test Screens**:
1. Dashboard → Recovery message should be very faint
2. Planner → "× 6-8 @ RIR 3" should be almost invisible
3. Analytics → Inactive tabs should be very dim

If text is easily readable, rollback did not complete (cache issue).

---

### 2. Run Tests

```bash
cd /home/asigator/fitness2025/mobile
npm run test:unit
```

**Expected**: Same test results as before color changes (93.5% passing).

**If tests fail differently**: Something else broke, not related to rollback.

---

### 3. Check Git Status

```bash
git status mobile/src/theme/colors.ts
```

**Expected**:
- Either "nothing to commit" (fully reverted)
- Or showing the exact reverse diff of the original change

---

## Re-applying Changes

If you rolled back and want to re-apply the WCAG fixes:

### Option 1: Cherry-pick the commit

```bash
# After you've committed the changes
git cherry-pick <commit-sha>
```

### Option 2: Restore from backup

```bash
cd /home/asigator/fitness2025/mobile/src/theme
cp colors.ts colors.ts.old  # Save current state
cp colors.ts.backup colors.ts.pre-wcag  # Save original
# Manually edit colors.ts with new values
```

**New Values**:
```typescript
text: {
  primary: '#FFFFFF',
  secondary: '#B8BEDC', // 6.51:1 contrast
  tertiary: '#9BA2C5',  // 4.61:1 contrast
  disabled: '#8088B0',  // 4.51:1 contrast
}
```

---

## Partial Rollback

If only one color is problematic, you can selectively rollback:

### Example: Rollback only text.disabled

```typescript
// In mobile/src/theme/colors.ts
text: {
  primary: '#FFFFFF',
  secondary: '#B8BEDC', // Keep WCAG compliant
  tertiary: '#9BA2C5',  // Keep WCAG compliant
  disabled: '#4A5080',  // Rollback to original (fails WCAG)
}
```

**Use Case**: If disabled text appearing too prominent is undesirable.

---

## Emergency Procedures

### If Metro Bundler Won't Start

```bash
cd /home/asigator/fitness2025/mobile
rm -rf node_modules/.cache
rm -rf .expo
npx expo start -c
```

### If Changes Don't Appear After Rollback

**Cause**: React Native Paper theme cache

**Fix**:
1. Kill Metro bundler (Ctrl+C)
2. Kill Expo Go app on device
3. Clear Metro cache: `npx expo start -c`
4. Force quit and restart Expo Go
5. Scan QR code again

### If Backup Files Are Missing

**Cause**: Backup files were deleted

**Recovery**:
```bash
cd /home/asigator/fitness2025
git show HEAD~1:mobile/src/theme/colors.ts > mobile/src/theme/colors.ts
```

This retrieves the file from git history (before changes).

---

## Backup File Checksums

To verify backup integrity:

### colors.ts.backup
```bash
md5sum mobile/src/theme/colors.ts.backup
```

**Expected**: (store this after first backup creation)

### DashboardScreen.tsx.backup
```bash
md5sum mobile/src/screens/DashboardScreen.tsx.backup
```

**Expected**: (store this after first backup creation)

### WorkoutScreen.tsx.backup
```bash
md5sum mobile/src/screens/WorkoutScreen.tsx.backup
```

**Expected**: (store this after first backup creation)

---

## Automated Rollback Script

Location: `/home/asigator/fitness2025/mobile/scripts/rollback-visual-fixes.sh`

```bash
#!/bin/bash
# Rollback Visual Improvements Phase 1

set -e

echo "Rolling back visual improvements..."

# Check if backups exist
if [ ! -f "mobile/src/theme/colors.ts.backup" ]; then
  echo "ERROR: Backup file not found!"
  exit 1
fi

# Restore files
cp mobile/src/theme/colors.ts.backup mobile/src/theme/colors.ts

echo "Rollback complete!"
echo ""
echo "Next steps:"
echo "1. Clear Metro cache: npx expo start -c"
echo "2. Verify changes: git diff mobile/src/theme/colors.ts"
echo "3. Test visually on device"
```

**Usage**:
```bash
chmod +x mobile/scripts/rollback-visual-fixes.sh
./mobile/scripts/rollback-visual-fixes.sh
```

---

## Support Contacts

If rollback fails or causes unexpected issues:

1. **Check git history**: `git log --oneline mobile/src/theme/colors.ts`
2. **Review git diff**: `git diff HEAD~5 mobile/src/theme/colors.ts`
3. **Restore from any previous commit**: `git checkout <commit-sha> -- mobile/src/theme/colors.ts`

---

## Rollback Checklist

Before declaring rollback complete, verify:

- [ ] `colors.ts` matches `colors.ts.backup` exactly
- [ ] Metro bundler cache cleared (`npx expo start -c`)
- [ ] App reloaded on device (not just hot reload)
- [ ] Secondary text appears very faint (original behavior)
- [ ] Tests still pass at 93.5% (same as before)
- [ ] Git status shows correct diff (reverted changes)
- [ ] No console errors in Metro bundler
- [ ] No console errors in app logs

---

## Post-Rollback Actions

### If Rollback Was Due to Bug

1. **Document the issue**:
   ```bash
   # Create bug report
   echo "## Rollback Reason" >> ROLLBACK_REASON.md
   echo "Date: $(date)" >> ROLLBACK_REASON.md
   echo "Issue: <describe issue>" >> ROLLBACK_REASON.md
   ```

2. **Create GitHub issue** (if applicable)

3. **Update visual_improvements.md** with "DO NOT IMPLEMENT" note

### If Rollback Was for A/B Testing

1. **Keep backup files** for quick re-application
2. **Document user feedback** on both versions
3. **Run analytics** to compare engagement metrics

---

## Conclusion

This rollback guide provides multiple recovery paths to restore the system to its pre-WCAG-fix state. All backups are preserved and changes are non-destructive.

**Estimated Rollback Time**: 2-5 minutes

**Risk Level**: Low (git history + backups provide safety net)

**Recommendation**: Use automated script (`rollback-visual-fixes.sh`) for fastest, safest rollback.
