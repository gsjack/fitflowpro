#!/bin/bash
# Network diagnostics for FitFlow multi-device setup

echo "🔍 FitFlow Network Diagnostics"
echo "======================================================================"
echo ""

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Get current machine IP
CURRENT_IP=$(ip addr show | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | cut -d/ -f1 | head -1)
echo "📍 Current Machine IP: $CURRENT_IP"

# Check backend API URL from frontend .env
if [ -f "$PROJECT_ROOT/mobile/.env" ]; then
  FRONTEND_API_URL=$(grep EXPO_PUBLIC_API_URL "$PROJECT_ROOT/mobile/.env" | cut -d= -f2)
  if [ -z "$FRONTEND_API_URL" ]; then
    echo "⚠️  Frontend .env exists but EXPO_PUBLIC_API_URL is empty or commented!"
    echo "   Frontend will fall back to localhost (won't work from other devices)"
  else
    echo "📱 Frontend API URL: $FRONTEND_API_URL"
  fi
else
  echo "❌ Frontend .env not found - will use localhost!"
fi

echo ""
echo "🏥 Testing Backend Health..."
echo "----------------------------------------------------------------------"

# Test local backend
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  HEALTH=$(curl -s http://localhost:3000/health)
  echo "✅ Backend responding on localhost:3000"
  echo "   Response: $HEALTH"
else
  echo "❌ Backend NOT responding on localhost:3000"
fi

# Test backend on network IP
if [ "$CURRENT_IP" != "" ]; then
  if curl -s http://$CURRENT_IP:3000/health > /dev/null 2>&1; then
    HEALTH=$(curl -s http://$CURRENT_IP:3000/health)
    echo "✅ Backend responding on $CURRENT_IP:3000 (network access)"
    echo "   Response: $HEALTH"
  else
    echo "❌ Backend NOT responding on $CURRENT_IP:3000"
  fi
fi

# Test Raspberry Pi (if different machine)
echo ""
echo "🍓 Testing Raspberry Pi Backend..."
echo "----------------------------------------------------------------------"
if curl -s --connect-timeout 3 http://192.168.178.48:3000/health > /dev/null 2>&1; then
  HEALTH=$(curl -s http://192.168.178.48:3000/health)
  echo "✅ Raspberry Pi backend responding at 192.168.178.48:3000"
  echo "   Response: $HEALTH"
else
  echo "❌ Raspberry Pi backend NOT responding (may not be deployed)"
  echo "   Tip: Use './scripts/use-prod-env.sh' to deploy to Raspberry Pi"
fi

# Check CORS
echo ""
echo "🌐 CORS Configuration:"
echo "----------------------------------------------------------------------"
if [ -f "$PROJECT_ROOT/backend/.env" ]; then
  CORS_ORIGIN=$(grep CORS_ORIGIN "$PROJECT_ROOT/backend/.env" | cut -d= -f2)
  if [ "$CORS_ORIGIN" = "*" ]; then
    echo "✅ CORS allows all origins (development mode)"
  elif [ -z "$CORS_ORIGIN" ]; then
    echo "⚠️  CORS_ORIGIN not set in backend/.env"
  else
    echo "✅ CORS restricted to: $CORS_ORIGIN"
  fi
else
  echo "⚠️  Backend .env not found - using hardcoded CORS settings"
fi

# Show access URLs
echo ""
echo "📍 Access URLs:"
echo "----------------------------------------------------------------------"
echo "   Local Browser:     http://localhost:8081"
echo "   Network Access:    http://$CURRENT_IP:8081"
echo "   Expo Go (iPhone):  Scan QR code from 'npx expo start'"
echo ""

# Check if Expo is running
if lsof -i :8081 > /dev/null 2>&1; then
  echo "✅ Expo dev server running on port 8081"
else
  echo "❌ Expo dev server NOT running"
  echo "   Start with: cd mobile && npx expo start -c"
fi

# Environment detection
echo ""
echo "🔧 Current Environment:"
echo "----------------------------------------------------------------------"
if [ -f "$PROJECT_ROOT/mobile/.env" ]; then
  if grep -q "192.168.178.49" "$PROJECT_ROOT/mobile/.env"; then
    echo "📍 Development (Linux laptop 192.168.178.49)"
  elif grep -q "192.168.178.48" "$PROJECT_ROOT/mobile/.env"; then
    echo "🚀 Production (Raspberry Pi 192.168.178.48)"
  else
    echo "❓ Unknown configuration"
  fi
else
  echo "❌ No .env file - environment not configured"
fi

echo ""
echo "💡 Quick Actions:"
echo "----------------------------------------------------------------------"
echo "   Switch to dev:   ./scripts/use-dev-env.sh"
echo "   Switch to prod:  ./scripts/use-prod-env.sh"
echo "   Restart Expo:    cd mobile && npx expo start -c"
echo "   Restart Backend: cd backend && npm run dev"
echo ""
