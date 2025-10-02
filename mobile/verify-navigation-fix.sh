#!/bin/bash

# Verification script for registration navigation fix
# Run this script to verify the fix is working

echo "========================================="
echo "Registration Navigation Fix Verification"
echo "========================================="
echo ""

# Check 1: Verify App.tsx has the fix
echo "✓ Checking App.tsx for fix..."
if grep -q "handleAuthSuccess = () => {" App.tsx; then
    echo "  ✅ handleAuthSuccess callback found"
else
    echo "  ❌ handleAuthSuccess callback NOT found"
    exit 1
fi

if grep -q "onAuthSuccess={handleAuthSuccess}" App.tsx; then
    echo "  ✅ Callback passed to AuthWrapper"
else
    echo "  ❌ Callback NOT passed to AuthWrapper"
    exit 1
fi

if grep -q "void checkAuth();" App.tsx; then
    echo "  ✅ checkAuth called in handleAuthSuccess"
else
    echo "  ❌ checkAuth NOT called in handleAuthSuccess"
    exit 1
fi

echo ""

# Check 2: Verify AuthWrapper is simplified
echo "✓ Checking AuthWrapper simplification..."
if grep -q "function AuthWrapper({ onAuthSuccess }: { onAuthSuccess: () => void })" App.tsx; then
    echo "  ✅ AuthWrapper accepts onAuthSuccess prop"
else
    echo "  ❌ AuthWrapper does NOT accept onAuthSuccess prop"
    exit 1
fi

echo ""

# Check 3: Verify AuthScreen calls callback
echo "✓ Checking AuthScreen callback chain..."
if grep -q "onAuthSuccess();" src/screens/AuthScreen.tsx; then
    echo "  ✅ AuthScreen calls onAuthSuccess after registration"
else
    echo "  ❌ AuthScreen does NOT call onAuthSuccess"
    exit 1
fi

echo ""

# Check 4: Verify token storage in authApi
echo "✓ Checking token storage in authApi..."
if grep -q "await storeToken(response.data.token);" src/services/api/authApi.ts; then
    echo "  ✅ Token stored after registration"
else
    echo "  ❌ Token NOT stored after registration"
    exit 1
fi

echo ""

# Check 5: TypeScript compilation
echo "✓ Checking TypeScript compilation..."
if npx tsc --noEmit 2>&1 | grep -q "App.tsx.*error"; then
    echo "  ❌ App.tsx has TypeScript errors"
    npx tsc --noEmit 2>&1 | grep "App.tsx"
    exit 1
else
    echo "  ✅ App.tsx compiles without errors"
fi

echo ""
echo "========================================="
echo "✅ ALL CHECKS PASSED"
echo "========================================="
echo ""
echo "The registration navigation fix is in place."
echo ""
echo "Manual testing steps:"
echo "1. Open http://localhost:8081 in browser"
echo "2. Fill registration form and click Register"
echo "3. Verify you see Dashboard screen within 1-2 seconds"
echo ""
echo "Expected console output:"
echo "  [AuthScreen] Registration successful, calling onAuthSuccess callback"
echo "  [AppNavigator] handleAuthSuccess called - re-checking auth"
echo "  [AppNavigator] checkAuth - token exists: true"
echo ""
