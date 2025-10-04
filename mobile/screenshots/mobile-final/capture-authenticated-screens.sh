#!/bin/bash
# FitFlow Pro - Capture Authenticated Screens
# This script captures clean screenshots of all authenticated app screens
# Prerequisites: API connectivity fixed (EXPO_PUBLIC_API_URL=http://10.0.2.2:3000)

set -e  # Exit on error

echo "🎬 FitFlow Pro - Authenticated Screenshot Capture"
echo "=================================================="
echo ""

# Configuration
DEMO_EMAIL="demo@test.com"
DEMO_PASS="Demo1234"
OUTPUT_DIR="."

# Function to capture and verify screenshot
capture_screenshot() {
    local name=$1
    local description=$2

    echo "📸 Capturing: $description"
    sleep 2  # Wait for UI to settle
    adb shell input keyevent KEYCODE_BACK 2>/dev/null  # Dismiss any keyboard
    sleep 0.5
    adb exec-out screencap -p > "$OUTPUT_DIR/clean-$name.png"

    local size=$(stat -f%z "$OUTPUT_DIR/clean-$name.png" 2>/dev/null || stat -c%s "$OUTPUT_DIR/clean-$name.png" 2>/dev/null)
    local size_kb=$((size / 1024))

    if [ $size_kb -lt 25 ]; then
        echo "   ✅ Success: ${size_kb}KB (clean)"
    else
        echo "   ⚠️  Warning: ${size_kb}KB (possible overlay)"
    fi
    echo ""
}

# Step 1: Verify prerequisites
echo "🔍 Step 1: Verifying prerequisites..."
echo "   Checking backend..."
if ! curl -s http://localhost:3000/health >/dev/null 2>&1; then
    echo "   ❌ Backend not running on localhost:3000"
    echo "   → Start backend: cd /home/asigator/fitness2025/backend && npm run dev"
    exit 1
fi
echo "   ✅ Backend healthy"

echo "   Checking emulator..."
if ! adb devices | grep -q "emulator-5554"; then
    echo "   ❌ Emulator not connected"
    echo "   → Start emulator first"
    exit 1
fi
echo "   ✅ Emulator connected"

echo "   Checking test account..."
if ! curl -s -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$DEMO_EMAIL\",\"password\":\"$DEMO_PASS\"}" | grep -q "token"; then
    echo "   ⚠️  Test account not found, creating..."
    curl -s -X POST http://localhost:3000/api/auth/register \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$DEMO_EMAIL\",\"password\":\"$DEMO_PASS\",\"age\":30}" >/dev/null
    echo "   ✅ Test account created"
else
    echo "   ✅ Test account exists"
fi
echo ""

# Step 2: Launch app
echo "🚀 Step 2: Launching app..."
adb shell am force-stop com.fitflow.pro
sleep 1
adb shell am start -n com.fitflow.pro/expo.modules.devlauncher.launcher.DevLauncherActivity >/dev/null 2>&1
sleep 2
echo "   Selecting mobile app in Dev Launcher..."
adb shell input tap 160 385  # Tap "mobile" app
sleep 4
echo "   ✅ App launched"
echo ""

# Step 3: Login
echo "🔐 Step 3: Logging in..."
echo "   Entering credentials..."
adb shell input tap 160 81  # Email field
sleep 0.5
adb shell input text "$DEMO_EMAIL"
sleep 0.3
adb shell input tap 160 142  # Password field
sleep 0.3
adb shell input text "$DEMO_PASS"
sleep 0.3
adb shell input keyevent KEYCODE_BACK  # Dismiss keyboard
sleep 1
adb shell input tap 160 420  # Login button
sleep 4

# Check if login succeeded (dashboard should appear)
echo "   Verifying login..."
if adb shell dumpsys window | grep -q "Dashboard\|Home"; then
    echo "   ✅ Login successful"
else
    echo "   ⚠️  Login may have failed, capturing current screen for debug..."
    adb exec-out screencap -p > "$OUTPUT_DIR/debug-login-failed.png"
    echo "   → Check debug-login-failed.png"
fi
echo ""

# Step 4: Capture Dashboard
echo "📱 Step 4: Capturing main screens..."
capture_screenshot "03-dashboard" "Dashboard"

# Step 5: Navigate to Analytics
echo "   Navigating to Analytics..."
adb shell input tap 107 605  # Analytics tab
sleep 2
capture_screenshot "04-analytics" "Analytics"

# Step 6: Navigate to Planner
echo "   Navigating to Planner..."
adb shell input tap 213 605  # Planner tab
sleep 2
capture_screenshot "05-planner" "Planner"

# Optional: Scroll to see drag handles
echo "   Scrolling to show drag handles..."
adb shell input swipe 160 400 160 250
sleep 1
capture_screenshot "05b-planner-drag-handles" "Planner (Drag Handles)"

# Step 7: Navigate to Settings
echo "   Navigating to Settings..."
adb shell input tap 280 605  # Settings tab
sleep 2
capture_screenshot "06-settings" "Settings"

# Step 8: Navigate back to Dashboard for feature screens
echo "   Returning to Dashboard..."
adb shell input tap 53 605  # Home tab
sleep 2

# Note: Workout and VO2max screens require additional navigation
# These need to be captured manually or with user interaction
echo ""
echo "📝 Note: Workout and VO2max screens require:"
echo "   - Workout: Tap 'Start Workout' button on Dashboard"
echo "   - VO2max: Tap 'Cardio Day' button on Dashboard"
echo "   These should be captured manually for best results."
echo ""

# Step 9: Summary
echo "✅ Screenshot Capture Complete!"
echo "================================"
echo ""
echo "Captured screenshots:"
ls -lh "$OUTPUT_DIR"/clean-*.png 2>/dev/null | awk '{print "   " $9 " (" $5 ")"}'
echo ""
echo "Next steps:"
echo "   1. Review screenshots visually"
echo "   2. Check file sizes (should be <25KB for clean screens)"
echo "   3. Manually capture Workout and VO2max screens if needed"
echo "   4. Update documentation with new screenshots"
echo ""
echo "📄 See INDEX.md for full documentation"
