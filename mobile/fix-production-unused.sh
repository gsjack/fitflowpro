#!/bin/bash

# Fix unused imports in production code

# planner.tsx - remove Divider, ActivityIndicator
sed -i '19s/  Divider,//' app/\(tabs\)/planner.tsx
sed -i '20s/  ActivityIndicator,//' app/\(tabs\)/planner.tsx

# settings.tsx - remove getUserFromToken
sed -i 's/, getUserFromToken//' app/\(tabs\)/settings.tsx

# Norwegian4x4Timer.tsx - prefix duration with _
sed -i 's/const duration =/const _duration =/' src/components/Norwegian4x4Timer.tsx

# MuscleGroupVolumeBar.tsx - prefix theme with _
sed -i 's/const theme =/const _theme =/' src/components/analytics/MuscleGroupVolumeBar.tsx

# OneRMProgressionChart.tsx - remove ActivityIndicator
sed -i 's/  ActivityIndicator,//' src/components/analytics/OneRMProgressionChart.tsx

# VolumeChart.tsx - remove ActivityIndicator
sed -i 's/  ActivityIndicator,//' src/components/analytics/VolumeChart.tsx

# WeeklyConsistencyCalendar.tsx - prefix theme with _
sed -i 's/const theme =/const _theme =/' src/components/analytics/WeeklyConsistencyCalendar.tsx

# PhaseProgressIndicator.tsx - prefix theme with _
sed -i 's/const theme =/const _theme =/' src/components/planner/PhaseProgressIndicator.tsx

# VolumeWarningBadge.tsx - prefix theme with _
sed -i 's/const theme =/const _theme =/' src/components/planner/VolumeWarningBadge.tsx

# SetLogCard.tsx - remove exerciseName
sed -i 's/  exerciseName,//' src/components/workout/SetLogCard.tsx

# AuthScreen.tsx - remove Button
sed -i 's/  Button,//' src/screens/AuthScreen.tsx

# DashboardScreen.tsx - remove Alert and onSubmitRecovery
sed -i 's/  Alert,//' src/screens/DashboardScreen.tsx
sed -i 's/  onSubmitRecovery,//' src/screens/DashboardScreen.tsx

# PlannerScreen.tsx - remove Divider, ActivityIndicator
sed -i '19s/  Divider,//' src/screens/PlannerScreen.tsx
sed -i '20s/  ActivityIndicator,//' src/screens/PlannerScreen.tsx

# recoveryDb.ts and workoutDb.ts - prefix userId with _
sed -i 's/const { userId }/const { userId: _userId }/' src/services/database/recoveryDb.ts
sed -i 's/const { userId }/const { userId: _userId }/' src/services/database/workoutDb.ts

echo "Fixed production code unused variables"
