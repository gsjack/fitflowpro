#!/bin/bash

# Test complete workout flow for asigator@googlemail.com

echo "=== Testing Complete Workout API Flow ==="
echo ""

# 1. Login to get token
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"asigator@googlemail.com","password":"Test123!"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.userId')

if [ "$TOKEN" = "null" ]; then
  echo "❌ Login failed: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Logged in as user $USER_ID"
echo "Token: ${TOKEN:0:20}..."
echo ""

# 2. Get recommended workout
echo "2. Getting recommended workout..."
RECOMMENDED=$(curl -s http://localhost:3000/api/program-days/recommended \
  -H "Authorization: Bearer $TOKEN")

PROGRAM_DAY_ID=$(echo $RECOMMENDED | jq -r '.id')
DAY_NAME=$(echo $RECOMMENDED | jq -r '.day_name')
DAY_TYPE=$(echo $RECOMMENDED | jq -r '.day_type')

echo "✅ Recommended: $DAY_NAME (ID: $PROGRAM_DAY_ID, type: $DAY_TYPE)"
echo ""

# 3. Create workout
echo "3. Creating workout..."
TODAY="2025-10-06"
CREATE_WORKOUT=$(curl -s -X POST http://localhost:3000/api/workouts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"program_day_id\":$PROGRAM_DAY_ID,\"date\":\"$TODAY\"}")

WORKOUT_ID=$(echo $CREATE_WORKOUT | jq -r '.id')

if [ "$WORKOUT_ID" = "null" ]; then
  echo "❌ Workout creation failed: $CREATE_WORKOUT"
  exit 1
fi

echo "✅ Workout created: ID $WORKOUT_ID"
echo ""

# 4. Get workout details
echo "4. Getting workout details..."
WORKOUT=$(curl -s http://localhost:3000/api/workouts/$WORKOUT_ID \
  -H "Authorization: Bearer $TOKEN")

EXERCISE_ID=$(echo $WORKOUT | jq -r '.exercises[0].exercise_id')
EXERCISE_NAME=$(echo $WORKOUT | jq -r '.exercises[0].exercise_name')
EXERCISE_SETS=$(echo $WORKOUT | jq -r '.exercises[0].sets')

echo "✅ First exercise: $EXERCISE_NAME (ID: $EXERCISE_ID, $EXERCISE_SETS sets)"
echo ""

# 5. Log a set
echo "5. Logging set 1..."
LOG_SET=$(curl -s -X POST http://localhost:3000/api/sets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"workout_id\":$WORKOUT_ID,\"exercise_id\":$EXERCISE_ID,\"set_number\":1,\"weight_kg\":100,\"reps\":8,\"rir\":2}")

SET_ID=$(echo $LOG_SET | jq -r '.id')

if [ "$SET_ID" = "null" ]; then
  echo "❌ Set logging failed: $LOG_SET"
  exit 1
fi

echo "✅ Set logged: ID $SET_ID (100kg x 8 reps @ RIR 2)"
echo ""

# 6. Verify set was saved
echo "6. Verifying set in database..."
SETS=$(curl -s "http://localhost:3000/api/workouts/$WORKOUT_ID/sets" \
  -H "Authorization: Bearer $TOKEN")

SET_COUNT=$(echo $SETS | jq '. | length')

echo "✅ Sets in workout: $SET_COUNT"
echo ""

echo "=== SUCCESS ==="
echo "Workout ID: $WORKOUT_ID"
echo "URL to access: http://192.168.178.48:8081/workout?programDayId=$PROGRAM_DAY_ID&date=$TODAY"
