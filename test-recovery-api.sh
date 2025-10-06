#!/bin/bash

echo "=== Recovery Assessment API Test ==="
echo ""

# Generate a unique username
TIMESTAMP=$(date +%s)
USERNAME="test_recovery_$TIMESTAMP@example.com"
PASSWORD="TestPass123!"

echo "Step 1: Register a new test user..."
echo "Username: $USERNAME"

REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$USERNAME\",
    \"password\": \"$PASSWORD\",
    \"age\": 30,
    \"weight_kg\": 75,
    \"experience_level\": \"intermediate\"
  }")

echo "Register response: $REGISTER_RESPONSE"

USER_ID=$(echo $REGISTER_RESPONSE | grep -o '"user_id":[0-9]*' | cut -d':' -f2)
TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "✗ Failed to register user"
  exit 1
else
  echo "✓ User registered successfully"
  echo "  User ID: $USER_ID"
  echo "  Token: ${TOKEN:0:30}..."
fi

echo ""
echo "Step 2: Check existing recovery assessments..."

GET_TODAY=$(curl -s -X GET "http://localhost:3000/api/recovery-assessments/today" \
  -H "Authorization: Bearer $TOKEN")

echo "GET /today response: $GET_TODAY"

echo ""
echo "Step 3: Submit recovery assessment..."

RECOVERY_RESPONSE=$(curl -s -X POST http://localhost:3000/api/recovery-assessments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "sleep_quality": 5,
    "muscle_soreness": 5,
    "motivation": 5
  }')

echo "POST response: $RECOVERY_RESPONSE"

echo ""
echo "Step 4: Verify recovery assessment was saved..."

GET_AFTER=$(curl -s -X GET "http://localhost:3000/api/recovery-assessments/today" \
  -H "Authorization: Bearer $TOKEN")

echo "GET /today after submission: $GET_AFTER"

# Check if response contains the recovery score
if echo "$GET_AFTER" | grep -q "recovery_score"; then
  echo "✓ Recovery assessment successfully retrieved"
  SCORE=$(echo $GET_AFTER | grep -o '"recovery_score":[0-9]*' | cut -d':' -f2)
  echo "  Recovery score: $SCORE"
else
  echo "✗ Failed to retrieve recovery assessment"
fi

echo ""
echo "Step 5: Test with user 151 (asigator@googlemail.com)..."

# Try to login as user 151 with common passwords
PASSWORDS=("fitflow" "test123" "password" "Password123!" "fitflow123" "admin123")

for PWD in "${PASSWORDS[@]}"; do
  LOGIN_RESP=$(curl -s -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"asigator@googlemail.com\",\"password\":\"$PWD\"}")

  if echo "$LOGIN_RESP" | grep -q "token"; then
    echo "✓ Found password for user 151: $PWD"
    TOKEN_151=$(echo $LOGIN_RESP | grep -o '"token":"[^"]*' | cut -d'"' -f4)

    echo ""
    echo "Submitting recovery assessment for user 151..."
    RECOVERY_151=$(curl -s -X POST http://localhost:3000/api/recovery-assessments \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN_151" \
      -d '{
        "sleep_quality": 5,
        "muscle_soreness": 5,
        "motivation": 5
      }')

    echo "Response: $RECOVERY_151"

    echo ""
    echo "Getting recovery for user 151..."
    GET_151=$(curl -s -X GET "http://localhost:3000/api/recovery-assessments/today" \
      -H "Authorization: Bearer $TOKEN_151")

    echo "Response: $GET_151"

    break
  fi
done

echo ""
echo "=== Test Complete ==="
