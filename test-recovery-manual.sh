#!/bin/bash

echo "=== Recovery Assessment Persistence Test ==="
echo ""

# Check if servers are running
echo "Step 1: Checking if servers are running..."
echo -n "Backend server (port 3000): "
if curl -s http://localhost:3000/health > /dev/null; then
  echo "✓ Running"
else
  echo "✗ Not running"
  exit 1
fi

echo -n "Expo web server (port 8081): "
if curl -s http://localhost:8081 > /dev/null; then
  echo "✓ Running"
else
  echo "✗ Not running"
  exit 1
fi

echo ""
echo "Step 2: Login and get auth token..."

# Login
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"asigator@googlemail.com","password":"password123"}')

echo "Login response: $LOGIN_RESPONSE"

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "✗ Failed to get auth token"
  exit 1
else
  echo "✓ Auth token obtained: ${TOKEN:0:20}..."
fi

echo ""
echo "Step 3: Check existing recovery assessments for today..."

sqlite3 /mnt/1000gb/Fitness/fitflowpro/backend/data/fitflow.db \
  "SELECT id, user_id, date, sleep_quality, muscle_soreness, motivation, recovery_score
   FROM recovery_assessments
   WHERE user_id = 151 AND date = '2025-10-03';"

EXISTING_COUNT=$(sqlite3 /mnt/1000gb/Fitness/fitflowpro/backend/data/fitflow.db \
  "SELECT COUNT(*) FROM recovery_assessments WHERE user_id = 151 AND date = '2025-10-03';")

echo "Existing entries for today: $EXISTING_COUNT"

echo ""
echo "Step 4: Submit recovery assessment via API..."

RECOVERY_RESPONSE=$(curl -s -X POST http://localhost:3000/api/recovery-assessments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "sleep_quality": 5,
    "muscle_soreness": 5,
    "motivation": 5
  }')

echo "Recovery assessment response: $RECOVERY_RESPONSE"

echo ""
echo "Step 5: Check database after submission..."

sqlite3 /mnt/1000gb/Fitness/fitflowpro/backend/data/fitflow.db \
  "SELECT id, user_id, date, sleep_quality, muscle_soreness, motivation, recovery_score
   FROM recovery_assessments
   WHERE user_id = 151 AND date = '2025-10-03';"

NEW_COUNT=$(sqlite3 /mnt/1000gb/Fitness/fitflowpro/backend/data/fitflow.db \
  "SELECT COUNT(*) FROM recovery_assessments WHERE user_id = 151 AND date = '2025-10-03';")

echo "Total entries after submission: $NEW_COUNT"

echo ""
echo "Step 6: Get recovery assessment for today via API..."

GET_RESPONSE=$(curl -s -X GET "http://localhost:3000/api/recovery-assessments/today" \
  -H "Authorization: Bearer $TOKEN")

echo "GET /api/recovery-assessments/today response:"
echo "$GET_RESPONSE"

echo ""
echo "=== Test Summary ==="
echo "Initial entries: $EXISTING_COUNT"
echo "Final entries: $NEW_COUNT"

if [ "$NEW_COUNT" -gt "$EXISTING_COUNT" ]; then
  echo "✓ Recovery assessment successfully stored in database"
else
  echo "⚠ No new entry created (may already exist for today)"
fi

echo ""
echo "All recent recovery assessments for user 151:"
sqlite3 /mnt/1000gb/Fitness/fitflowpro/backend/data/fitflow.db \
  "SELECT id, date, sleep_quality, muscle_soreness, motivation, recovery_score
   FROM recovery_assessments
   WHERE user_id = 151
   ORDER BY date DESC
   LIMIT 10;"
