#!/bin/bash
# Automated Android screenshot capture script
# Captures screenshots from FitFlow Pro mobile app running on Android emulator

set -e  # Exit on error

SCREENSHOT_DIR="/home/asigator/fitness2025/mobile/screenshots/mobile-final"
DEVICE="emulator-5554"  # Default Android emulator device ID
PACKAGE_NAME="com.asigator.mobile"  # FitFlow Pro package name
ACTIVITY_NAME=".MainActivity"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}FitFlow Pro - Android Screenshot Capture${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Create screenshot directory
mkdir -p "$SCREENSHOT_DIR"
echo -e "${GREEN}✓${NC} Screenshot directory: $SCREENSHOT_DIR"

# Check if emulator is connected
if ! adb devices | grep -q "$DEVICE"; then
    echo -e "${RED}✗${NC} Error: Android emulator not found ($DEVICE)"
    echo "Available devices:"
    adb devices
    exit 1
fi
echo -e "${GREEN}✓${NC} Emulator connected: $DEVICE"

# Function to capture screenshot
capture_screenshot() {
    local name="$1"
    local description="$2"
    local wait_time="${3:-2}"  # Default 2 seconds wait

    echo ""
    echo -e "${YELLOW}→${NC} Capturing: $description"

    # Wait for UI to settle
    sleep "$wait_time"

    # Capture screenshot to device
    adb -s "$DEVICE" shell screencap -p "/sdcard/$name.png"

    # Pull screenshot to host
    adb -s "$DEVICE" pull "/sdcard/$name.png" "$SCREENSHOT_DIR/$name.png" > /dev/null 2>&1

    # Delete from device
    adb -s "$DEVICE" shell rm "/sdcard/$name.png"

    # Get file size
    local size=$(du -h "$SCREENSHOT_DIR/$name.png" | cut -f1)

    echo -e "${GREEN}✓${NC} Saved: $name.png ($size)"
}

# Function to tap on screen coordinates
tap() {
    local x="$1"
    local y="$2"
    adb -s "$DEVICE" shell input tap "$x" "$y"
    sleep 0.5
}

# Function to swipe
swipe() {
    local x1="$1"
    local y1="$2"
    local x2="$3"
    local y2="$4"
    adb -s "$DEVICE" shell input swipe "$x1" "$y1" "$x2" "$y2" 300
    sleep 0.5
}

# Function to input text
input_text() {
    local text="$1"
    # Replace special characters for adb
    text=$(echo "$text" | sed 's/ /%s/g' | sed 's/@/%40/g' | sed 's/!/%21/g')
    adb -s "$DEVICE" shell input text "$text"
    sleep 0.3
}

# Check if app is running
echo ""
echo -e "${YELLOW}Checking app status...${NC}"
if adb -s "$DEVICE" shell pidof "$PACKAGE_NAME" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} App is running"
else
    echo -e "${YELLOW}!${NC} App not running, launching..."
    adb -s "$DEVICE" shell am start -n "$PACKAGE_NAME/$ACTIVITY_NAME"
    sleep 5
fi

# ============================================================
# CAPTURE SCREENSHOTS
# ============================================================

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Starting Screenshot Capture Journey${NC}"
echo -e "${GREEN}========================================${NC}"

# 1. Auth Screen - Login
capture_screenshot "01-auth-login" "Auth Screen - Login Tab" 3

# 2. Auth Screen - Register (if tab exists)
# Note: Coordinates are approximate for 320x640 display
# Register tab might be at x=250, y=200
echo ""
echo -e "${YELLOW}→${NC} Attempting to navigate to Register tab..."
tap 250 200
capture_screenshot "02-auth-register" "Auth Screen - Register Tab" 2

# 3. Return to Login and login
echo ""
echo -e "${YELLOW}→${NC} Logging in with test user..."
tap 100 200  # Login tab
sleep 1

# Clear any existing text and login
# Email field at approx y=400, password at y=500, login button at y=600
tap 160 400  # Tap email field
sleep 0.5
adb -s "$DEVICE" shell input keyevent KEYCODE_DEL  # Clear field
adb -s "$DEVICE" shell input text "visual-test@example.com"
sleep 0.5

tap 160 500  # Tap password field
sleep 0.5
adb -s "$DEVICE" shell input text "Test123!"
sleep 0.5

tap 160 600  # Tap login button
sleep 5  # Wait for login

# 4. Dashboard
capture_screenshot "03-dashboard" "Dashboard - Main View" 3

# 5. Analytics (tap Analytics tab - bottom nav bar at y=1100)
echo ""
echo -e "${YELLOW}→${NC} Navigating to Analytics..."
tap 200 1100  # Approximate Analytics tab position
capture_screenshot "04-analytics" "Analytics Screen - Charts" 3

# Scroll down to see volume analytics
swipe 160 800 160 400
capture_screenshot "05-analytics-volume" "Analytics - Volume Trends" 2

# 6. Planner
echo ""
echo -e "${YELLOW}→${NC} Navigating to Planner..."
tap 120 1100  # Approximate Planner tab position
capture_screenshot "06-planner" "Planner - Exercise List" 3

# Scroll to see drag handles
swipe 160 800 160 400
capture_screenshot "07-planner-drag-handles" "Planner - Drag Handles (Right Side)" 2

# 7. Settings
echo ""
echo -e "${YELLOW}→${NC} Navigating to Settings..."
tap 280 1100  # Approximate Settings tab position
capture_screenshot "08-settings" "Settings Screen" 2

# 8. Back to Dashboard for workout
echo ""
echo -e "${YELLOW}→${NC} Back to Dashboard for workout..."
tap 40 1100  # Dashboard tab
sleep 2

# 9. Start workout (if button exists at y=700)
echo ""
echo -e "${YELLOW}→${NC} Attempting to start workout..."
tap 160 700  # Approximate Start Workout button
sleep 3
capture_screenshot "09-workout" "Workout Screen - Set Logging" 3

# ============================================================
# GENERATE REPORT
# ============================================================

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Screenshot Capture Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Count screenshots
screenshot_count=$(ls -1 "$SCREENSHOT_DIR"/*.png 2>/dev/null | wc -l)
echo -e "${GREEN}✓${NC} Total screenshots captured: $screenshot_count"
echo -e "${GREEN}✓${NC} Location: $SCREENSHOT_DIR"
echo ""

# Generate JSON report
cat > "$SCREENSHOT_DIR/capture-report.json" << EOF
{
  "platform": "android",
  "device": "$DEVICE",
  "timestamp": "$(date -Iseconds)",
  "total_screenshots": $screenshot_count,
  "screenshots": [
$(ls -1 "$SCREENSHOT_DIR"/*.png 2>/dev/null | while read -r file; do
    filename=$(basename "$file")
    size=$(stat -c%s "$file")
    echo "    {"
    echo "      \"file\": \"$filename\","
    echo "      \"path\": \"$file\","
    echo "      \"size_bytes\": $size"
    echo "    },"
done | sed '$ s/,$//')
  ],
  "key_verifications": {
    "tab_bar_labels_visible": "manual_verification_required",
    "drag_handles_on_right": "manual_verification_required",
    "volume_bars_visible": "manual_verification_required",
    "text_contrast_improved": "manual_verification_required"
  },
  "notes": [
    "Screenshots captured from Android emulator",
    "Coordinates are approximate and may need adjustment",
    "Visual verification of improvements required"
  ]
}
EOF

echo -e "${GREEN}✓${NC} Report generated: $SCREENSHOT_DIR/capture-report.json"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review screenshots in: $SCREENSHOT_DIR"
echo "2. Verify key improvements:"
echo "   - Tab bar labels visible"
echo "   - Drag handles on RIGHT side"
echo "   - Volume progress bars clearly visible"
echo "   - Text contrast improved"
echo ""
