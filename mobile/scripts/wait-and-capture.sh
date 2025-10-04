#!/bin/bash
# Wait for Android build to complete and automatically capture screenshots

set -e

echo "🔍 Monitoring Android build progress..."
echo "   Build log: /tmp/expo-build-v2.log"
echo ""

# Wait for build to complete by watching for success/failure messages
while true; do
    if grep -q "BUILD SUCCESSFUL" /tmp/expo-build-v2.log 2>/dev/null; then
        echo "✅ Build completed successfully!"
        break
    elif grep -q "BUILD FAILED" /tmp/expo-build-v2.log 2>/dev/null; then
        echo "❌ Build failed!"
        echo ""
        echo "Last 50 lines of build log:"
        tail -50 /tmp/expo-build-v2.log
        exit 1
    fi

    # Show progress
    echo -n "."
    sleep 5
done

echo ""
echo "⏳ Waiting 10 seconds for app to launch on emulator..."
sleep 10

echo ""
echo "📸 Starting screenshot capture..."
echo ""

# Run the screenshot capture script
/home/asigator/fitness2025/mobile/scripts/capture-android-screenshots.sh

echo ""
echo "✅ Complete! Screenshots saved to: /home/asigator/fitness2025/mobile/screenshots/mobile-final/"
echo ""
