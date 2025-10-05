#!/bin/bash
# Fix production TypeScript errors systematically

cd /home/asigator/fitness2025/mobile

echo "=== Fixing Production TypeScript Errors ==="
echo ""

# 1. Remove specific unused imports
echo "[1/5] Removing unused imports..."

# app/(auth)/login.tsx - Remove Button, colors
sed -i '/^  Button,$/d' 'app/(auth)/login.tsx'
sed -i "/^import { colors } from '..\/..\/src\/theme\/colors';$/d" 'app/(auth)/login.tsx'

# app/(auth)/register.tsx - Remove colors
sed -i "/^import { colors } from '..\/..\/src\/theme\/colors';$/d" 'app/(auth)/register.tsx'

# app/(tabs)/analytics.tsx - Remove ActivityIndicator
sed -i 's/ScrollView, ActivityIndicator/ScrollView/' 'app/(tabs)/analytics.tsx'

# app/(tabs)/index.tsx - Remove StatCard
sed -i '/^import StatCard from/d' 'app/(tabs)/index.tsx'

# app/(tabs)/planner.tsx - Remove Divider, ActivityIndicator
sed -i '/^  Divider,$/d' 'app/(tabs)/planner.tsx'
sed -i 's/Platform, ActivityIndicator/Platform/' 'app/(tabs)/planner.tsx'

# app/(tabs)/settings.tsx - Remove WeightUnit
sed -i "s/, WeightUnit//" 'app/(tabs)/settings.tsx'

# app/(tabs)/vo2max-workout.tsx - Remove Platform
sed -i 's/Dimensions, Platform/Dimensions/' 'app/(tabs)/vo2max-workout.tsx'

# app/(tabs)/workout.tsx - Remove WorkoutScreenProps and unused imports
sed -i '/^interface WorkoutScreenProps {$/,/^}$/d' 'app/(tabs)/workout.tsx'

# src/components - Remove unused imports
sed -i '/^interface IntervalPhase {$/,/^}$/d' src/components/Norwegian4x4Timer.tsx
sed -i 's/, Button, ActivityIndicator//' src/components/VO2maxProgressionChart.tsx
sed -i 's/ScrollView, ActivityIndicator/ScrollView/' src/components/analytics/OneRMProgressionChart.tsx
sed -i 's/ScrollView, ActivityIndicator/ScrollView/' src/components/analytics/VolumeChart.tsx
sed -i 's/ScrollView, ActivityIndicator, Platform/ScrollView, Platform/' src/components/analytics/VolumeTrendsChart.tsx
sed -i 's/, VolumeTrends//' src/components/analytics/VolumeTrendsChart.tsx
sed -i 's/TouchableOpacity, Dimensions/TouchableOpacity/' src/components/analytics/WeeklyConsistencyCalendar.tsx
sed -i 's/parseISO, //' src/components/analytics/WeeklyConsistencyCalendar.tsx
sed -i 's/import { View } from/import {/' src/components/common/GradientCard.tsx
sed -i 's/, View//' src/components/planner/VolumeWarningBadge.tsx
sed -i 's/, Animated//' src/components/skeletons/SkeletonWrapper.tsx
sed -i 's/, Platform//' src/components/workout/ExerciseVideoModal.tsx

# src/screens - Remove unused imports
sed -i 's/ScrollView, ActivityIndicator/ScrollView/' src/screens/AnalyticsScreen.tsx
sed -i '/^  Button,$/d' src/screens/AuthScreen.tsx

echo "✓ Unused imports removed"

# 2. Remove unused variable declarations
echo "[2/5] Removing unused variable declarations..."

# Remove 'const theme = useTheme()' where unused
sed -i '/^  const theme = useTheme();$/d' src/components/analytics/MuscleGroupVolumeBar.tsx
sed -i '/^  const theme = useTheme();$/d' src/components/analytics/WeeklyConsistencyCalendar.tsx
sed -i '/^  const theme = useTheme();$/d' src/components/planner/PhaseProgressIndicator.tsx
sed -i '/^  const theme = useTheme();$/d' src/components/planner/VolumeWarningBadge.tsx

# Remove unused destructured variables
sed -i 's/  const { userId } =/  const { userId: _userId } =/' 'app/(tabs)/planner.tsx'
sed -i 's/  const { params } =/  const { params: _params } =/' 'app/(tabs)/vo2max-workout.tsx'
sed -i 's/  const { params } =/  const { params: _params } =/' 'app/(tabs)/workout.tsx'
sed -i 's/  duration,/  duration: _duration,/' src/components/Norwegian4x4Timer.tsx
sed -i 's/  muscleGroup,/  muscleGroup: _muscleGroup,/' src/components/analytics/VolumeTrendsChart.tsx
sed -i 's/  borderRadius,/  borderRadius: _borderRadius,/' src/components/planner/AlternativeExerciseSuggestions.tsx
sed -i 's/  exerciseName,/  exerciseName: _exerciseName,/' src/components/workout/SetLogCard.tsx

# Fix useProgramData.ts - add underscore to unused destructured vars
sed -i 's/const { refetch } =/const { refetch: _refetch } =/' src/hooks/useProgramData.ts
sed -i 's/const { request } =/const { request: _request } =/' src/hooks/useProgramData.ts

echo "✓ Unused variables prefixed with underscore"

# 3. Remove unused @ts-expect-error directives
echo "[3/5] Removing unused @ts-expect-error directives..."
sed -i '/\/\/ @ts-expect-error - SQLite.openDatabase not typed correctly$/d' src/database/sqliteWrapper.ts

echo "✓ Unused @ts-expect-error directives removed"

# 4. Fix module path errors (relative imports)
echo "[4/5] Fixing module import paths..."

# app/(tabs)/planner.tsx - fix programApi path
sed -i "s|import { getProgramById } from '../services/api/programApi';|import { getProgramById } from '../../src/services/api/programApi';|" 'app/(tabs)/planner.tsx'

# app/(tabs)/workout.tsx - fix authApi and workoutDb paths
sed -i "s|import { getUserFromToken } from '../services/api/authApi';|import { getUserFromToken } from '../../src/services/api/authApi';|" 'app/(tabs)/workout.tsx'
sed -i "s|import { saveWorkout } from '../services/database/workoutDb';|import { saveWorkout } from '../../src/services/database/workoutDb';|" 'app/(tabs)/workout.tsx'

# src/screens/AnalyticsScreen.tsx - remove react-navigation import (using Expo Router now)
sed -i "/import { useFocusEffect } from '@react-navigation\/native';/d" src/screens/AnalyticsScreen.tsx

echo "✓ Module paths fixed"

echo ""
echo "=== Checking Remaining Production Errors ==="
ERROR_COUNT=$(npx tsc --noEmit 2>&1 | grep -E "^(src/|app/)" | grep "error TS" | grep -v "__tests__" | wc -l)
echo "Production errors remaining: $ERROR_COUNT"

if [ $ERROR_COUNT -eq 0 ]; then
  echo "✅ All production errors fixed!"
else
  echo "❌ Errors remaining. Showing first 20:"
  npx tsc --noEmit 2>&1 | grep -E "^(src/|app/)" | grep "error TS" | grep -v "__tests__" | head -20
fi
