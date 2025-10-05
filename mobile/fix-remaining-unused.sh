#!/bin/bash

# Fix remaining unused variables in production code

# planner.tsx and PlannerScreen.tsx - remove userId from destructuring
sed -i 's/const { userId } = await getUserFromToken();/await getUserFromToken();/' app/\(tabs\)/planner.tsx
sed -i 's/const { userId } = await getUserFromToken();/await getUserFromToken();/' src/screens/PlannerScreen.tsx

# settings.tsx - fix getUserFromToken import (appears to be leftover after removal)
sed -i '/getUserFromToken/d' app/\(tabs\)/settings.tsx

# vo2max-workout.tsx and VO2maxWorkoutScreen.tsx - prefix params with _
sed -i 's/const params =/const _params =/' app/\(tabs\)/vo2max-workout.tsx
sed -i 's/const params =/const _params =/' src/screens/VO2maxWorkoutScreen.tsx

# workout.tsx - prefix params with _
sed -i 's/const params =/const _params =/' app/\(tabs\)/workout.tsx

# Remove unused type declarations (TS6196)
sed -i '/^interface WorkoutScreenProps/,/^}/d' app/\(tabs\)/workout.tsx
sed -i '/^interface IntervalPhase/,/^}/d' src/components/Norwegian4x4Timer.tsx
sed -i '/^interface VO2maxWorkoutParams/,/^}/d' src/screens/VO2maxWorkoutScreen.tsx

# recoveryDb.ts and workoutDb.ts - already prefixed, now remove destructuring entirely
sed -i 's/const { userId: _userId } = await getUserFromToken();//' src/services/database/recoveryDb.ts
sed -i 's/const { userId: _userId } = await getUserFromToken();//' src/services/database/workoutDb.ts

echo "Fixed remaining unused variables"
