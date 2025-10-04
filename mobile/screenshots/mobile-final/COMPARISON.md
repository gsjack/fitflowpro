# Screenshot Quality Comparison

## ✅ CLEAN (Production Ready)

**File**: `clean-01-auth-login.png` (12KB)
- No keyboard overlay
- No emoji/GIF picker
- All UI elements clearly visible
- Suitable for app stores, documentation, marketing

---

## ❌ DIRTY (Rejected)

### Example 1: Keyboard Overlay
**File**: `02-auth-register.png` (30KB)
- Keyboard covering bottom half of screen
- Form inputs partially obscured
- Unprofessional appearance

### Example 2: Emoji Picker Overlay
**Files**: `04-analytics.png`, `05-analytics-scrolled.png` (73KB each)
- Emoji picker popup covering screen content
- Analytics data not visible
- Completely unusable for documentation

### Example 3: GIF Picker Overlay
**Files**: `06-planner.png`, `07-planner-drag-handles.png` (160KB+ each)
- GIF search interface covering entire screen
- No app content visible
- Largest file sizes (indicates complex overlay)

---

## File Size as Quality Indicator

| Size Range | Likely Content | Usability |
|------------|----------------|-----------|
| 10-15KB | Clean UI only | ✅ Production ready |
| 25-40KB | Keyboard overlay | ❌ Reject |
| 70-80KB | Emoji picker | ❌ Reject |
| 150KB+ | GIF picker | ❌ Reject |

**Rule of Thumb**: Screenshots over 20KB for 320×640 resolution likely have overlays.

---

## How the Clean Screenshot Was Achieved

1. **App Restart**: Force-stop and relaunch via Expo Dev Launcher
2. **Wait for Settle**: `sleep 3` to ensure UI is fully rendered
3. **No Interaction**: Capture immediately without tapping input fields
4. **Verify Size**: Check file size - should be ~12KB for clean 320×640 PNG

**Key Lesson**: Don't tap text input fields before capturing - this triggers keyboards/pickers!
