# Quick Start: Screenshot Capture

## TL;DR - Run This When Build Completes

```bash
cd /home/asigator/fitness2025/mobile
./scripts/wait-and-capture.sh
```

This will automatically:
1. Wait for Android build to complete
2. Wait 10 seconds for app to launch
3. Capture all screenshots
4. Generate JSON report

## Manual Execution (If Needed)

```bash
# Check if build is done
tail /tmp/expo-build-v2.log | grep "BUILD"

# If you see "BUILD SUCCESSFUL", run:
./scripts/capture-android-screenshots.sh
```

## View Results

```bash
# List screenshots
ls -lh screenshots/mobile-final/*.png

# View JSON report
cat screenshots/mobile-final/capture-report.json
```

## Verify Key Improvements

Open each screenshot and check:
- ✅ `07-planner-drag-handles.png` - Handles are on **RIGHT** side
- ✅ Tab bar shows text labels (not just icons)
- ✅ Volume bars are dark/visible (not white-on-white)
- ✅ Text is readable (improved contrast)

## If Script Fails

Manual screenshot capture:
```bash
# Take one screenshot
adb shell screencap -p /sdcard/test.png
adb pull /sdcard/test.png screenshots/mobile-final/test.png
adb shell rm /sdcard/test.png
```

Navigate in emulator manually and repeat for each screen.

---
**Note:** Build is currently at native library compilation stage.
Estimated time to completion: ~5-10 minutes.
