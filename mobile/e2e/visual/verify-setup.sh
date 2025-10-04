#!/bin/bash

###############################################################################
# Visual Regression Testing - Setup Verification Script
#
# This script verifies that all prerequisites are met for running visual
# regression tests.
#
# Usage:
#   chmod +x verify-setup.sh
#   ./verify-setup.sh
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Visual Regression Testing - Setup Verification${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Function to check status
check_pass() {
  echo -e "${GREEN}✅ $1${NC}"
  ((CHECKS_PASSED++))
}

check_fail() {
  echo -e "${RED}❌ $1${NC}"
  ((CHECKS_FAILED++))
}

check_warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
  ((CHECKS_WARNING++))
}

# 1. Check Node.js version
echo -e "${BLUE}[1/10] Checking Node.js version...${NC}"
if command -v node &> /dev/null; then
  NODE_VERSION=$(node -v)
  MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')

  if [ "$MAJOR_VERSION" -ge 20 ]; then
    check_pass "Node.js $NODE_VERSION (>= 20 required)"
  else
    check_fail "Node.js $NODE_VERSION (upgrade to 20+ required)"
  fi
else
  check_fail "Node.js not found (install Node.js 20+)"
fi

# 2. Check npm
echo -e "\n${BLUE}[2/10] Checking npm...${NC}"
if command -v npm &> /dev/null; then
  NPM_VERSION=$(npm -v)
  check_pass "npm v$NPM_VERSION installed"
else
  check_fail "npm not found"
fi

# 3. Check if in correct directory
echo -e "\n${BLUE}[3/10] Checking current directory...${NC}"
if [ -f "../../../package.json" ] && [ -d "../../../mobile" ]; then
  check_pass "In correct directory (mobile/e2e/visual/)"
else
  check_warn "Run from mobile/e2e/visual/ directory for accurate results"
fi

# 4. Check backend dependencies
echo -e "\n${BLUE}[4/10] Checking backend dependencies...${NC}"
if [ -d "../../../backend/node_modules" ]; then
  check_pass "Backend dependencies installed"
else
  check_fail "Backend dependencies missing (run: cd backend && npm install)"
fi

# 5. Check mobile dependencies
echo -e "\n${BLUE}[5/10] Checking mobile dependencies...${NC}"
if [ -d "../../node_modules" ]; then
  check_pass "Mobile dependencies installed"
else
  check_fail "Mobile dependencies missing (run: cd mobile && npm install)"
fi

# 6. Check Playwright installation
echo -e "\n${BLUE}[6/10] Checking Playwright...${NC}"
if [ -f "../../node_modules/@playwright/test/package.json" ]; then
  PLAYWRIGHT_VERSION=$(cat ../../node_modules/@playwright/test/package.json | grep '"version"' | cut -d'"' -f4)
  check_pass "Playwright v$PLAYWRIGHT_VERSION installed"
else
  check_fail "Playwright not installed (run: cd mobile && npm install)"
fi

# 7. Check Playwright browsers
echo -e "\n${BLUE}[7/10] Checking Playwright browsers...${NC}"
if [ -d "$HOME/.cache/ms-playwright/chromium-"* ] 2>/dev/null; then
  check_pass "Chromium browser installed"
else
  check_fail "Chromium not installed (run: npx playwright install chromium)"
fi

# 8. Check backend server
echo -e "\n${BLUE}[8/10] Checking backend server...${NC}"
if curl -f http://localhost:3000/health &> /dev/null; then
  check_pass "Backend server running on port 3000"
else
  check_fail "Backend server not running (run: cd backend && npm run dev)"
fi

# 9. Check mobile web server
echo -e "\n${BLUE}[9/10] Checking mobile web server...${NC}"
if curl -f http://localhost:8081 &> /dev/null; then
  check_pass "Mobile web server running on port 8081"
else
  check_fail "Mobile web server not running (run: cd mobile && npm run dev)"
fi

# 10. Check visual test files
echo -e "\n${BLUE}[10/10] Checking visual test files...${NC}"
if [ -f "./screens.visual.spec.ts" ] && [ -f "./p0-improvements.visual.spec.ts" ] && [ -f "./helpers.ts" ]; then
  check_pass "All visual test files present"
else
  check_fail "Visual test files missing"
fi

# Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Verification Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Passed: $CHECKS_PASSED${NC}"
echo -e "${RED}❌ Failed: $CHECKS_FAILED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $CHECKS_WARNING${NC}"

# Final status
echo -e "\n${BLUE}========================================${NC}"
if [ $CHECKS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ READY TO RUN VISUAL REGRESSION TESTS${NC}"
  echo -e "\nNext steps:"
  echo -e "  1. Generate baselines:   ${BLUE}npm run test:visual:update${NC}"
  echo -e "  2. Run visual tests:     ${BLUE}npm run test:visual${NC}"
  echo -e "  3. View test report:     ${BLUE}npm run test:visual:report${NC}"
else
  echo -e "${RED}❌ SETUP INCOMPLETE${NC}"
  echo -e "\nFix the failed checks above before running tests."

  if curl -f http://localhost:3000/health &> /dev/null; then
    :
  else
    echo -e "\n${YELLOW}💡 Quick fix for missing servers:${NC}"
    echo -e "  Terminal 1: ${BLUE}cd backend && npm run dev${NC}"
    echo -e "  Terminal 2: ${BLUE}cd mobile && npm run dev${NC}"
  fi
fi

echo -e "${BLUE}========================================${NC}\n"

# Exit with error if any checks failed
if [ $CHECKS_FAILED -gt 0 ]; then
  exit 1
else
  exit 0
fi
