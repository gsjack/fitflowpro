#!/bin/bash

# Capture Register tab
echo "Capturing Register tab..."
adb shell input tap 240 100
sleep 2
adb exec-out screencap -p > 02-auth-register.png
echo "✓ Screenshot 2 captured: $(ls -lh 02-auth-register.png | awk '{print $5}')"

# Go back to Login tab and login
echo "Logging in..."
adb shell input tap 80 100
sleep 1
# Tap email field
adb shell input tap 160 200
sleep 0.5
adb shell input text "test@example.com"
sleep 0.5
# Tap password field
adb shell input tap 160 280
sleep 0.5
adb shell input text "Test123!"
sleep 0.5
# Tap login button
adb shell input tap 160 400
sleep 4

# Capture Dashboard
echo "Capturing Dashboard..."
adb exec-out screencap -p > 03-dashboard.png
echo "✓ Screenshot 3 captured: $(ls -lh 03-dashboard.png | awk '{print $5}')"

sleep 1

# Navigate to Analytics
echo "Navigating to Analytics..."
adb shell input tap 107 605
sleep 2
adb exec-out screencap -p > 04-analytics.png
echo "✓ Screenshot 4 captured: $(ls -lh 04-analytics.png | awk '{print $5}')"

sleep 1

# Scroll down on Analytics to see more charts
adb shell input swipe 160 400 160 200
sleep 1
adb exec-out screencap -p > 05-analytics-scrolled.png
echo "✓ Screenshot 5 captured: $(ls -lh 05-analytics-scrolled.png | awk '{print $5}')"

# Navigate to Planner
echo "Navigating to Planner..."
adb shell input tap 213 605
sleep 2
adb exec-out screencap -p > 06-planner.png
echo "✓ Screenshot 6 captured: $(ls -lh 06-planner.png | awk '{print $5}')"

sleep 1

# Scroll to see drag handles
adb shell input swipe 160 400 160 200
sleep 1
adb exec-out screencap -p > 07-planner-drag-handles.png
echo "✓ Screenshot 7 captured (CRITICAL - verify drag handles on RIGHT): $(ls -lh 07-planner-drag-handles.png | awk '{print $5}')"

# Navigate to Settings
echo "Navigating to Settings..."
adb shell input tap 280 605
sleep 2
adb exec-out screencap -p > 08-settings.png
echo "✓ Screenshot 8 captured: $(ls -lh 08-settings.png | awk '{print $5}')"

sleep 1

# Go back to Dashboard and try to start workout
echo "Navigating to Dashboard for workout..."
adb shell input tap 53 605
sleep 2

# Scroll down to find "Start Workout" button
adb shell input swipe 160 500 160 200
sleep 1

# Try to tap "Start Workout" if visible (approximate location)
adb shell input tap 160 350
sleep 3

adb exec-out screencap -p > 09-workout-or-dashboard.png
echo "✓ Screenshot 9 captured: $(ls -lh 09-workout-or-dashboard.png | awk '{print $5}')"

echo ""
echo "✅ Screenshot capture complete!"
echo "Total screenshots: $(ls -1 *.png 2>/dev/null | wc -l)"
