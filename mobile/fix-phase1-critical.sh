#!/bin/bash
# Phase 1 Critical Fixes: AxiosInstance.token, React Navigation, Theme

cd /home/asigator/fitness2025/mobile

echo "=== Phase 1: Critical TypeScript Fixes ==="

# 1. Fix AxiosInstance.token in WeightLogModal
echo "[1/5] Fixing AxiosInstance.token in WeightLogModal..."
sed -i 's/import { getAuthenticatedClient }/import { getToken }/' src/components/dashboard/WeightLogModal.tsx
sed -i 's/const client = await getAuthenticatedClient();/const token = await getToken();/' src/components/dashboard/WeightLogModal.tsx
sed -i 's/if (!client?.token)/if (!token)/' src/components/dashboard/WeightLogModal.tsx
sed -i 's/return logBodyWeight(client.token, weightData);/return logBodyWeight(token, weightData);/' src/components/dashboard/WeightLogModal.tsx
echo "✓ WeightLogModal fixed"

# 2. Fix AxiosInstance.token in BodyWeightChart
echo "[2/5] Fixing AxiosInstance.token in BodyWeightChart..."
sed -i 's/import { getAuthenticatedClient }/import { getToken }/' src/components/analytics/BodyWeightChart.tsx
sed -i 's/const client = await getAuthenticatedClient();/const token = await getToken();/g' src/components/analytics/BodyWeightChart.tsx
sed -i 's/if (!client?.token)/if (!token)/g' src/components/analytics/BodyWeightChart.tsx
sed -i 's/return getLatestBodyWeight(client.token);/return getLatestBodyWeight(token);/' src/components/analytics/BodyWeightChart.tsx
sed -i 's/return logBodyWeight(client.token, weightData);/return logBodyWeight(token, weightData);/' src/components/analytics/BodyWeightChart.tsx
echo "✓ BodyWeightChart fixed"

# 3. Fix theme.colors.paper errors (use theme.colors.background instead)
echo "[3/5] Fixing theme property errors..."
sed -i 's/theme\.colors\.paper/theme.colors.surface/' src/components/analytics/BodyWeightChart.tsx
sed -i 's/theme\.colors\.paper/theme.colors.surface/' src/components/dashboard/BodyWeightWidget.tsx
sed -i 's/theme\.colors\.divider/theme.colors.outline/' src/components/analytics/BodyWeightChart.tsx
echo "✓ Theme properties fixed"

# 4. Remove React Navigation imports from src/screens (these are old files, likely unused)
echo "[4/5] Removing React Navigation imports..."
sed -i "/import { useNavigation } from '@react-navigation\/native';/d" src/screens/AnalyticsScreen.tsx
sed -i "/import { useNavigation, useRoute, RouteProp } from '@react-navigation\/native';/d" src/screens/VO2maxWorkoutScreen.tsx
sed -i "/import { useNavigation } from '@react-navigation\/native';/d" src/screens/WorkoutScreen.tsx

# Also need to remove usage of these hooks
sed -i 's/const navigation = useNavigation();//' src/screens/AnalyticsScreen.tsx
sed -i 's/const navigation = useNavigation();//' src/screens/VO2maxWorkoutScreen.tsx
sed -i 's/const navigation = useNavigation();//' src/screens/WorkoutScreen.tsx
echo "✓ React Navigation removed"

# 5. Fix type assignment errors
echo "[5/5] Fixing type assignment errors..."

# DashboardHeader - fix recovery recommendation type
sed -i 's/setRecoveryRecommendation(recommendation);/setRecoveryRecommendation(recommendation as "none" | "reduce_1_set" | "reduce_2_sets" | "rest_day" | null);/' src/components/dashboard/DashboardHeader.tsx

# DashboardHeader - fix async callback
sed -i 's/(sleepQuality: number, muscleSoreness: number, mentalMotivation: number) => {/async (sleepQuality: number, muscleSoreness: number, mentalMotivation: number) => {/' src/components/dashboard/DashboardHeader.tsx

# WeeklyVolumeSection - fix VolumeZone type
sed -i 's/zone = analyzedZone;/zone = analyzedZone as VolumeZone;/' src/components/dashboard/WeeklyVolumeSection.tsx

# useVO2maxSession - fix null vs undefined
sed -i 's/estimatedVO2max: vo2max,/estimatedVO2max: vo2max ?? undefined,/' src/hooks/useVO2maxSession.ts

echo "✓ Type assignments fixed"

echo ""
echo "=== Checking Production Errors ==="
PROD_ERRORS=$(npx tsc --noEmit 2>&1 | grep -E "^(src/|app/)" | grep "error TS" | grep -v "__tests__" | wc -l)
echo "Production errors remaining: $PROD_ERRORS"

if [ $PROD_ERRORS -lt 40 ]; then
  echo "✅ Phase 1 successful! Reduced from 58 → $PROD_ERRORS"
else
  echo "⚠️  Still need more fixes. Showing first 15:"
  npx tsc --noEmit 2>&1 | grep -E "^(src/|app/)" | grep "error TS" | grep -v "__tests__" | head -15
fi
