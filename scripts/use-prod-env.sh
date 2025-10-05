#!/bin/bash
# Switch to production environment (Raspberry Pi)

set -e  # Exit on error

echo "🚀 Switching to PRODUCTION environment (Raspberry Pi)..."
echo ""

# Get project root (parent of scripts directory)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Copy environment files
if [ -f "$PROJECT_ROOT/backend/.env.production" ]; then
  cp "$PROJECT_ROOT/backend/.env.production" "$PROJECT_ROOT/backend/.env"
  echo "✅ Backend: Configured for production"
else
  echo "⚠️  backend/.env.production not found"
fi

if [ -f "$PROJECT_ROOT/mobile/.env.production" ]; then
  cp "$PROJECT_ROOT/mobile/.env.production" "$PROJECT_ROOT/mobile/.env"
  echo "✅ Frontend: Configured for http://192.168.178.48:3000"
else
  echo "⚠️  mobile/.env.production not found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Production environment configured successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Configuration:"
echo "   Backend:    Raspberry Pi (192.168.178.48:3000)"
echo "   Frontend:   Points to http://192.168.178.48:3000"
echo ""
echo "⚠️  IMPORTANT - Production Deployment Required:"
echo ""
echo "1. Verify Raspberry Pi backend is running:"
echo "   curl http://192.168.178.48:3000/health"
echo ""
echo "2. If not deployed, deploy backend to Raspberry Pi:"
echo "   cd backend && npm run build"
echo "   rsync -avz --exclude node_modules ./ pi@192.168.178.48:/opt/fitflow-api/"
echo "   ssh pi@192.168.178.48"
echo "   cd /opt/fitflow-api && npm install --production"
echo "   pm2 start ecosystem.config.js --env production"
echo ""
echo "3. Start frontend:"
echo "   cd mobile && npx expo start -c"
echo ""
echo "📚 See DEPLOYMENT.md for complete production deployment guide"
echo ""
