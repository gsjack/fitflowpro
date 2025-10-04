#!/bin/bash

# FitFlow Pro - Visual Improvements Testing Script
# Comprehensive validation of all visual fixes
# Run from /home/asigator/fitness2025/mobile directory

set -e

echo "🧪 FitFlow Pro - Visual Improvements Testing"
echo "============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
PASSED=0
FAILED=0
SKIPPED=0

# Test result function
test_result() {
  local name=$1
  local result=$2
  local message=$3

  if [ "$result" == "pass" ]; then
    echo -e "${GREEN}✓ PASS${NC} $name"
    [ -n "$message" ] && echo "       $message"
    ((PASSED++))
  elif [ "$result" == "fail" ]; then
    echo -e "${RED}✗ FAIL${NC} $name"
    [ -n "$message" ] && echo "       $message"
    ((FAILED++))
  else
    echo -e "${YELLOW}⊘ SKIP${NC} $name"
    [ -n "$message" ] && echo "       $message"
    ((SKIPPED++))
  fi
}

echo "Test Suite 1: Color Contrast Validation"
echo "----------------------------------------"

# Check if colors.ts has new values
if grep -q "B8BEDC" src/theme/colors.ts; then
  test_result "Text secondary color updated" "pass" "#B8BEDC (6.51:1 contrast)"
else
  test_result "Text secondary color updated" "fail" "Still using #A0A6C8"
fi

if grep -q "9BA2C5" src/theme/colors.ts; then
  test_result "Text tertiary color updated" "pass" "#9BA2C5 (4.61:1 contrast)"
else
  test_result "Text tertiary color updated" "fail" "Still using #6B7299"
fi

if grep -q "8088B0" src/theme/colors.ts; then
  test_result "Text disabled color updated" "pass" "#8088B0 (4.51:1 contrast)"
else
  test_result "Text disabled color updated" "fail" "Still using #4A5080"
fi

echo ""
echo "Test Suite 2: Typography Validation"
echo "------------------------------------"

# Check WorkoutScreen text sizes
if grep -q 'variant="headlineMedium".*progressText' src/screens/WorkoutScreen.tsx; then
  test_result "Workout progress text upgraded" "pass" "titleSmall → headlineMedium (28px)"
else
  test_result "Workout progress text upgraded" "fail" "Still using titleSmall (16px)"
fi

if grep -q 'variant="bodyLarge".*color: colors.text.secondary' src/screens/WorkoutScreen.tsx; then
  test_result "Workout target info upgraded" "pass" "bodySmall → bodyLarge (16px)"
else
  test_result "Workout target info upgraded" "fail" "Still using bodySmall (14px)"
fi

echo ""
echo "Test Suite 3: Touch Target Compliance"
echo "--------------------------------------"

# Check if density="small" is removed
if ! grep -q 'density="small"' src/screens/DashboardScreen.tsx; then
  test_result "Recovery buttons fixed" "pass" "density='small' removed (48px height)"
else
  test_result "Recovery buttons fixed" "fail" "Still using density='small' (32px height)"
fi

echo ""
echo "Test Suite 4: Dependencies"
echo "--------------------------"

# Check for skeleton placeholder
if grep -q "react-native-skeleton-placeholder" package.json; then
  test_result "Skeleton placeholder installed" "pass" "react-native-skeleton-placeholder found"
else
  test_result "Skeleton placeholder installed" "fail" "Package not installed"
fi

# Check for expo-haptics
if grep -q "expo-haptics" package.json; then
  test_result "Haptic feedback library available" "pass" "expo-haptics found"
else
  test_result "Haptic feedback library available" "fail" "expo-haptics missing"
fi

echo ""
echo "Test Suite 5: Automated Unit Tests"
echo "-----------------------------------"

# Run contrast tests if they exist
if [ -f "src/theme/__tests__/contrast.test.ts" ]; then
  if npm test -- contrast.test.ts --passWithNoTests --silent 2>/dev/null; then
    test_result "Contrast tests" "pass" "All WCAG validations passed"
  else
    test_result "Contrast tests" "fail" "Some tests failed"
  fi
else
  test_result "Contrast tests" "skip" "Test file not found"
fi

echo ""
echo "Test Suite 6: File Integrity"
echo "-----------------------------"

# Check if critical files exist
files=(
  "src/theme/colors.ts"
  "src/screens/WorkoutScreen.tsx"
  "src/screens/DashboardScreen.tsx"
  "src/screens/PlannerScreen.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    test_result "File exists: $(basename $file)" "pass"
  else
    test_result "File exists: $(basename $file)" "fail" "File missing!"
  fi
done

echo ""
echo "=========================================="
echo "Test Results Summary"
echo "=========================================="
echo -e "${GREEN}Passed:${NC}  $PASSED"
echo -e "${RED}Failed:${NC}  $FAILED"
echo -e "${YELLOW}Skipped:${NC} $SKIPPED"
echo ""

TOTAL=$((PASSED + FAILED))
if [ $TOTAL -gt 0 ]; then
  PERCENTAGE=$((PASSED * 100 / TOTAL))
  echo "Success Rate: $PERCENTAGE%"
  echo ""

  if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run: npm run dev"
    echo "  2. Test on physical device"
    echo "  3. Verify visual improvements"
    echo ""
    exit 0
  else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "Action required:"
    echo "  1. Review failed tests above"
    echo "  2. Re-run: bash scripts/fix-visual-p0.sh"
    echo "  3. Or rollback: bash scripts/rollback-visual-fixes.sh"
    echo ""
    exit 1
  fi
fi
