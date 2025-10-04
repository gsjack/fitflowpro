#!/bin/bash

# FitFlow Pro - Rollback Visual Fixes Script
# Restores files to pre-fix state from automatic backups
# Run from /home/asigator/fitness2025/mobile directory

set -e

echo "🔄 FitFlow Pro - Rollback Visual Fixes"
echo "======================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}✗${NC} Error: Must run from mobile directory"
  exit 1
fi

# Function to restore from backup
restore_from_backup() {
  local file=$1
  local backup=$(ls -t ${file}.backup.* 2>/dev/null | head -1)

  if [ -f "$backup" ]; then
    cp "$backup" "$file"
    echo -e "${GREEN}✓${NC} Restored: $file"
    echo "  From: $(basename $backup)"
  else
    echo -e "${YELLOW}⊘${NC} No backup found: $file"
  fi
}

echo "Restoring files from backups..."
echo "--------------------------------"

restore_from_backup "src/theme/colors.ts"
restore_from_backup "src/screens/WorkoutScreen.tsx"
restore_from_backup "src/screens/DashboardScreen.tsx"
restore_from_backup "src/screens/PlannerScreen.tsx"

echo ""
echo "Cleaning up backup files..."
find src -name "*.backup.*" -type f -delete 2>/dev/null || true
echo -e "${GREEN}✓${NC} Backup files removed"

echo ""
echo "✅ Rollback Complete!"
echo ""
echo "Next steps:"
echo "  1. Run: npm run dev"
echo "  2. Verify app works as before"
echo "  3. Review what went wrong"
echo ""
