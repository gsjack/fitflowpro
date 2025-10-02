# FitFlow Pro - Deployment Quick Start

This document provides a quick reference for deploying the FitFlow Pro application. For detailed instructions, see:
- **Backend**: `/home/asigator/fitness2025/backend/DEPLOYMENT.md`
- **Mobile**: `/home/asigator/fitness2025/mobile/DEPLOYMENT.md`

## Backend Deployment (Raspberry Pi 5)

### Prerequisites
```bash
# On Raspberry Pi 5
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm sqlite3 nginx
sudo npm install -g pm2
sudo apt install -y certbot python3-certbot-nginx
```

### Quick Deploy
```bash
# 1. Build locally
cd /home/asigator/fitness2025/backend
npm install
npm run build

# 2. Transfer to Pi
rsync -avz --exclude 'node_modules' --exclude 'tests' \
  ./ pi@fitflow.local:/opt/fitflow-api/

# 3. Setup on Pi
ssh pi@fitflow.local
cd /opt/fitflow-api
npm install --production

# 4. Initialize database
mkdir -p data
sqlite3 data/fitflow.db < src/database/schema.sql
sqlite3 data/fitflow.db "PRAGMA journal_mode=WAL;"
sqlite3 data/fitflow.db < src/database/seeds/exercises.sql

# 5. Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions

# 6. Configure Nginx (see backend/DEPLOYMENT.md)
sudo nano /etc/nginx/sites-available/fitflow
sudo ln -s /etc/nginx/sites-available/fitflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 7. Setup SSL
sudo certbot --nginx -d fitflow.yourdomain.com
```

## Mobile App Build

### Prerequisites
```bash
# Install Expo CLI
npm install -g expo-cli eas-cli

# Login to Expo
expo login
eas login
```

### Generate Silent Audio (Required for iOS Background Timer)
```bash
cd /home/asigator/fitness2025/mobile
mkdir -p assets

# Option 1: ffmpeg
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 1 -q:a 9 -acodec libmp3lame assets/silence.mp3

# Option 2: Download
curl -o assets/silence.mp3 https://raw.githubusercontent.com/anars/blank-audio/master/1-second-of-silence.mp3
```

### iOS Build
```bash
cd /home/asigator/fitness2025/mobile

# Configure EAS
eas build:configure

# Production build
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --profile production
```

### Android Build
```bash
cd /home/asigator/fitness2025/mobile

# Production build
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android --profile production
```

## Configuration Files

### Backend: ecosystem.config.js ✓
Location: `/home/asigator/fitness2025/backend/ecosystem.config.js`
- PM2 process manager configuration
- Auto-restart enabled
- Memory limit: 512MB

### Backend: server.ts ✓
Location: `/home/asigator/fitness2025/backend/src/server.ts`
- Fastify server with logger
- trustProxy: true (for Nginx reverse proxy)
- All routes registered: auth, workouts, sets, recovery, analytics
- JWT plugin, CORS middleware
- Port 3000 (configurable via PORT env var)

### Mobile: app.json ✓
Location: `/home/asigator/fitness2025/mobile/app.json`
- iOS background modes: ["audio"] (for rest timer)
- Bundle identifiers configured
- Android FOREGROUND_SERVICE permission
- Notification permissions

## Environment Variables

### Backend (.env)
```bash
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info
JWT_SECRET=<generate-with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
DB_PATH=/opt/fitflow-api/data/fitflow.db
```

### Mobile (.env.production)
```bash
API_BASE_URL=https://fitflow.yourdomain.com
APP_ENV=production
ENABLE_DEV_TOOLS=false
```

## Testing Deployment

### Backend Health Check
```bash
# Local
curl http://localhost:3000/health

# Production (after Nginx + SSL setup)
curl https://fitflow.yourdomain.com/health

# Expected response: {"status":"ok","timestamp":1696262400000}
```

### Mobile App Testing
```bash
# iOS TestFlight
eas build --platform ios --profile preview
# Install via TestFlight app

# Android APK
eas build --platform android --profile preview
# Install APK on device

# Critical tests:
# - Background timer (3-5 min with app backgrounded)
# - Offline mode (airplane mode)
# - Sync queue (go online, verify sync)
# - SQLite performance (< 5ms writes)
```

## Performance Targets

Per constitutional requirements:

| Metric | Target | Validation |
|--------|--------|------------|
| SQLite writes | p95 < 5ms, p99 < 10ms | `npm run test:performance` |
| API responses | p95 < 200ms | `ab -n 1000 -c 10 https://...` |
| UI interactions | < 100ms | Manual testing |
| Rest timer accuracy | ±2 seconds | Manual testing |

## Troubleshooting

### Backend won't start
```bash
# Check PM2 logs
pm2 logs fitflow-api --err

# Check port availability
sudo lsof -i :3000

# Verify database
ls -la /opt/fitflow-api/data/fitflow.db
```

### Mobile build fails
```bash
# Clear Expo cache
expo start --clear

# Update dependencies
npm update

# Re-configure EAS
eas build:configure
```

### iOS background timer not working
```bash
# Verify in app.json:
# "ios": { "infoPlist": { "UIBackgroundModes": ["audio"] } }

# Check silence.mp3 exists
ls -la /home/asigator/fitness2025/mobile/assets/silence.mp3

# Test on physical device (simulators unreliable)
```

## Security Checklist

- [ ] JWT_SECRET changed from default (64+ random characters)
- [ ] SSL certificate installed (HTTPS only)
- [ ] Rate limiting enabled (100 req/min per IP)
- [ ] Firewall configured (allow only 80, 443, 22)
- [ ] Database file permissions correct (644)
- [ ] Nginx security headers configured
- [ ] Log rotation enabled
- [ ] Automatic backups configured

## Monitoring

### Backend Logs
```bash
# PM2 logs
pm2 logs fitflow-api

# Nginx access logs
sudo tail -f /var/log/nginx/fitflow-access.log

# Nginx error logs
sudo tail -f /var/log/nginx/fitflow-error.log
```

### Database Backup
```bash
# Manual backup
sqlite3 /opt/fitflow-api/data/fitflow.db ".backup /opt/fitflow-api/backups/fitflow_$(date +%Y%m%d).db"

# Automated daily backup (see backend/DEPLOYMENT.md)
# Cron job at 2 AM: 0 2 * * * /opt/fitflow-api/backup.sh
```

## Quick Reference Commands

```bash
# Backend
pm2 restart fitflow-api      # Restart API server
pm2 logs fitflow-api          # View logs
pm2 monit                     # Monitor resources
sudo systemctl reload nginx   # Reload Nginx config

# Mobile
eas build --platform ios      # Build iOS
eas build --platform android  # Build Android
expo start                    # Local dev server

# Database
sqlite3 /opt/fitflow-api/data/fitflow.db   # Open SQLite shell
sqlite3 fitflow.db "PRAGMA journal_mode;"  # Check WAL mode
sqlite3 fitflow.db "SELECT COUNT(*) FROM exercises;"  # Verify seed data
```

## Support

For detailed deployment instructions, troubleshooting, and configuration options:
- Backend: `/home/asigator/fitness2025/backend/DEPLOYMENT.md`
- Mobile: `/home/asigator/fitness2025/mobile/DEPLOYMENT.md`
- Project docs: `/home/asigator/fitness2025/CLAUDE.md`
