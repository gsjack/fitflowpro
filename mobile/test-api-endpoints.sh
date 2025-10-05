#!/bin/bash

# API Endpoint Testing Script
# Tests all major FitFlow Pro API endpoints
# Usage: ./test-api-endpoints.sh [API_BASE_URL]

API_BASE_URL="${1:-http://localhost:3000}"
TEST_USERNAME="api-test-$(date +%s)@example.com"
TEST_PASSWORD="Test1234"

echo "=========================================="
echo "FitFlow Pro API Endpoint Tests"
echo "=========================================="
echo "API Base URL: $API_BASE_URL"
echo "Test User: $TEST_USERNAME"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local auth_header=$4
    local data=$5
    local description=$6

    echo -n "Testing: $description... "

    if [ -z "$data" ]; then
        if [ -z "$auth_header" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_BASE_URL$endpoint")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_BASE_URL$endpoint" -H "$auth_header")
        fi
    else
        if [ -z "$auth_header" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_BASE_URL$endpoint" -H "Content-Type: application/json" -d "$data")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_BASE_URL$endpoint" -H "Content-Type: application/json" -H "$auth_header" -d "$data")
        fi
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected HTTP $expected_status, got HTTP $http_code)"
        echo "  Response: $body"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Test 1: Health check
echo ""
echo "=== Unauthenticated Endpoints ==="
test_endpoint "GET" "/health" "200" "" "" "Health check"

# Test 2: Register user
echo ""
register_data="{\"username\":\"$TEST_USERNAME\",\"password\":\"$TEST_PASSWORD\",\"age\":28}"
response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "$register_data")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

echo -n "Testing: User registration... "
if [ "$http_code" = "201" ]; then
    TOKEN=$(echo "$body" | grep -o '"token":"[^"]*' | sed 's/"token":"//')
    echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
    echo "  Token: ${TOKEN:0:50}..."
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (Expected HTTP 201, got HTTP $http_code)"
    echo "  Response: $body"
    ((TESTS_FAILED++))
    echo ""
    echo "Cannot continue without token. Exiting."
    exit 1
fi

# Test 3: Login
echo ""
login_data="{\"username\":\"$TEST_USERNAME\",\"password\":\"$TEST_PASSWORD\"}"
test_endpoint "POST" "/api/auth/login" "200" "" "$login_data" "User login"

# Authenticated endpoints
echo ""
echo "=== Authenticated Endpoints ==="
AUTH_HEADER="Authorization: Bearer $TOKEN"

# User endpoints
test_endpoint "GET" "/api/users/me" "200" "$AUTH_HEADER" "" "Get current user profile"

# Program endpoints
test_endpoint "GET" "/api/programs" "200" "$AUTH_HEADER" "" "Get user's program"

# Program days endpoints
test_endpoint "GET" "/api/program-days" "200" "$AUTH_HEADER" "" "List program days"
test_endpoint "GET" "/api/program-days/recommended" "404" "$AUTH_HEADER" "" "Get recommended workout (404 expected for rest day)"

# Analytics endpoints
test_endpoint "GET" "/api/analytics/volume-current-week" "200" "$AUTH_HEADER" "" "Get current week volume"
test_endpoint "GET" "/api/analytics/program-volume-analysis" "200" "$AUTH_HEADER" "" "Get program volume analysis"
test_endpoint "GET" "/api/analytics/consistency" "200" "$AUTH_HEADER" "" "Get consistency metrics"

# Exercise endpoints
test_endpoint "GET" "/api/exercises" "200" "$AUTH_HEADER" "" "List all exercises"

# Expected failures (for documentation)
echo ""
echo "=== Expected Failures (Validation) ==="
test_endpoint "GET" "/api/programs" "401" "" "" "Get programs without auth (should be 401)"
test_endpoint "POST" "/api/auth/register" "409" "" "$register_data" "Register duplicate user (should be 409)"

# Summary
echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Check output above.${NC}"
    exit 1
fi
