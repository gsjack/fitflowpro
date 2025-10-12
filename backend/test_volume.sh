#!/bin/bash

# Login and get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"asigator@gmail.com","password":"Test123!"}' \
  | jq -r '.token')

echo "Token: $TOKEN"

# Call volume endpoint
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/analytics/volume-current-week \
  | jq '.muscle_groups[] | select(.muscle_group == "biceps")'
