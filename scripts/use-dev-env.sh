#!/bin/bash
# Switch to development environment (Linux laptop)

set -e  # Exit on error

echo "🔧 Switching to DEVELOPMENT environment (Linux laptop)..."
echo ""

# Get current IP
CURRENT_IP=$(ip addr show | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | cut -d/ -f1 | head -1)

if [ -z "$CURRENT_IP" ]; then
  echo "❌ Could not detect network IP address"
  exit 1
fi

echo "📍 Detected IP: $CURRENT_IP"
echo ""

# Get project root (parent of scripts directory)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Update mobile .env.local with current IP (in case it changed)
echo "EXPO_PUBLIC_API_URL=http://$CURRENT_IP:3000" > "$PROJECT_ROOT/mobile/.env.local"
echo "✅ Updated mobile/.env.local with current IP"

# Copy environment files
if [ -f "$PROJECT_ROOT/backend/.env.local" ]; then
  cp "$PROJECT_ROOT/backend/.env.local" "$PROJECT_ROOT/backend/.env"
  echo "✅ Backend: Configured for development (localhost:3000)"
else
  echo "⚠️  backend/.env.local not found"
fi

cp "$PROJECT_ROOT/mobile/.env.local" "$PROJECT_ROOT/mobile/.env"
echo "✅ Frontend: Configured for http://$CURRENT_IP:3000"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Development environment configured successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Configuration:"
echo "   Backend:    localhost:3000 (accessible at $CURRENT_IP:3000)"
echo "   Frontend:   Points to http://$CURRENT_IP:3000"
echo ""
echo "🚀 Next steps:"
echo "   1. Start backend:  cd backend && npm run dev"
echo "   2. Start frontend: cd mobile && npx expo start -c"
echo ""
echo "🌐 Access URLs:"
echo "   Local:    http://localhost:8081"
echo "   Network:  http://$CURRENT_IP:8081"
echo "   iPhone:   Scan QR code with Expo Go app"
echo ""
echo "⚠️  Important: Always restart Expo with -c flag to reload environment variables"
echo ""
