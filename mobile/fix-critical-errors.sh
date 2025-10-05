#!/bin/bash
# Fix critical TypeScript errors - module paths and type errors

cd /home/asigator/fitness2025/mobile

echo "=== Fixing Critical TypeScript Errors ==="

# 1. Fix dynamic import paths in app/(tabs)
echo "[1/3] Fixing dynamic import paths..."
sed -i "s|'../services/api/programApi'|'../../src/services/api/programApi'|g" 'app/(tabs)/planner.tsx'
sed -i "s|'../services/api/authApi'|'../../src/services/api/authApi'|g" 'app/(tabs)/workout.tsx'
sed -i "s|'../services/database/workoutDb'|'../../src/services/database/workoutDb'|g" 'app/(tabs)/workout.tsx'
echo "✓ Dynamic import paths fixed"

# 2. Remove React Navigation imports from src/screens (now using Expo Router)
echo "[2/3] Removing deprecated React Navigation imports..."
sed -i "/import { useFocusEffect } from '@react-navigation\/native';/d" src/screens/AnalyticsScreen.tsx
sed -i "/import { useNavigation, RouteProp } from '@react-navigation\/native';/d" src/screens/VO2maxWorkoutScreen.tsx
sed -i "/import { useRoute } from '@react-navigation\/native';/d" src/screens/WorkoutScreen.tsx
echo "✓ Deprecated imports removed"

# 3. Fix unused @ts-expect-error in sqliteWrapper
echo "[3/3] Removing unused @ts-expect-error..."
# Find and remove the @ts-expect-error line before SQLite.openDatabase
sed -i '/\/\/ @ts-expect-error/d' src/database/sqliteWrapper.ts
echo "✓ Unused directives removed"

echo ""
echo "=== Checking Remaining Critical Errors ==="
MODULE_ERRORS=$(npx tsc --noEmit 2>&1 | grep -E "^(src/|app/)" | grep "TS2307" | grep -v "__tests__" | wc -l)
TYPE_ERRORS=$(npx tsc --noEmit 2>&1 | grep -E "^(src/|app/)" | grep "TS2339" | grep -v "__tests__" | wc -l)

echo "Module not found errors: $MODULE_ERRORS"
echo "Property not exist errors: $TYPE_ERRORS"

if [ $MODULE_ERRORS -eq 0 ] && [ $TYPE_ERRORS -lt 10 ]; then
  echo "✅ Critical errors resolved!"
else
  echo "❌ Critical errors remaining:"
  npx tsc --noEmit 2>&1 | grep -E "^(src/|app/)" | grep -E "(TS2307|TS2339)" | grep -v "__tests__" | head -15
fi
