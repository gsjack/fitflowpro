# FitFlow Pro - Deployment Guide

**Version**: 1.0.0
**Last Updated**: October 4, 2025

This guide covers deploying FitFlow Pro to production, with focus on Raspberry Pi 5 ARM64 deployment.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Backend Deployment](#backend-deployment)
  - [Database Setup](#database-setup)
  - [Environment Configuration](#environment-configuration)
  - [PM2 Process Manager](#pm2-process-manager)
  - [Nginx Reverse Proxy](#nginx-reverse-proxy)
  - [SSL/TLS with Let's Encrypt](#ssltls-with-lets-encrypt)
- [Mobile App Deployment](#mobile-app-deployment)
  - [Environment Variables](#environment-variables)
  - [iOS Build](#ios-build)
  - [Android Build](#android-build)
  - [Over-The-Air (OTA) Updates](#over-the-air-ota-updates)
- [Post-Deployment Checklist](#post-deployment-checklist)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Hardware Requirements

**Backend (Raspberry Pi 5)**:
- Raspberry Pi 5 (4GB RAM minimum, 8GB recommended)
- 32GB+ microSD card (Class 10 or UHS-I)
- Reliable power supply (5V 5A USB-C)
- Ethernet connection (recommended) or WiFi

**Development Machine**:
- macOS (for iOS builds) or Linux/Windows (for Android builds)
- Node.js 20 LTS
- Expo CLI

### Software Requirements

**Backend**:
- Raspberry Pi OS (64-bit, Bookworm or later)
- Node.js 20 LTS
- npm 10+
- SQLite3
- Nginx (for reverse proxy)
- Certbot (for SSL/TLS)

**Mobile**:
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- Xcode (for iOS builds, macOS only)
- Android Studio (for Android builds)

---

## Backend Deployment

### Step 1: Prepare Raspberry Pi

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v20.x.x
npm --version   # Should be 10.x.x

# Install system dependencies
sudo apt install -y sqlite3 nginx certbot python3-certbot-nginx git

# Install PM2 globally
sudo npm install -g pm2
```

### Step 2: Clone Repository

```bash
# Create application directory
sudo mkdir -p /opt/fitflow
sudo chown $USER:$USER /opt/fitflow

# Clone repository
cd /opt/fitflow
git clone https://github.com/yourusername/fitness2025.git .

# Or transfer files via SCP
# scp -r ./fitness2025 pi@raspberrypi.local:/opt/fitflow
```

### Step 3: Install Dependencies

```bash
cd /opt/fitflow/backend

# Install dependencies (ARM64 architecture)
npm install

# If you encounter esbuild errors (platform mismatch):
rm -rf node_modules
npm install

# This ensures ARM64 binaries (@esbuild/linux-arm64) are installed
```

### Database Setup

```bash
# Create database directory
mkdir -p /opt/fitflow/backend/data

# Apply schema
cd /opt/fitflow/backend/data
sqlite3 fitflow.db < ../src/database/schema.sql

# Enable WAL mode (required for performance)
sqlite3 fitflow.db "PRAGMA journal_mode=WAL;"

# Verify WAL mode
sqlite3 fitflow.db "PRAGMA journal_mode;"
# Expected output: wal

# Seed exercise library
cd /opt/fitflow/backend
npm run seed

# Verify seeding
sqlite3 data/fitflow.db "SELECT COUNT(*) FROM exercises;"
# Expected: 114 (or your exercise count)
```

**Database Permissions**:
```bash
# Ensure proper permissions
chmod 644 /opt/fitflow/backend/data/fitflow.db
chmod 644 /opt/fitflow/backend/data/fitflow.db-wal
chmod 644 /opt/fitflow/backend/data/fitflow.db-shm

# Set ownership to application user
sudo chown -R $USER:$USER /opt/fitflow/backend/data
```

### Environment Configuration

Create `/opt/fitflow/backend/.env`:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Database
DATABASE_PATH=/opt/fitflow/backend/data/fitflow.db

# JWT Authentication
JWT_SECRET=YOUR_SECURE_SECRET_KEY_HERE_CHANGE_THIS

# CORS (if needed for web client)
CORS_ORIGIN=https://fitflow.yourdomain.com

# Logging
LOG_LEVEL=info
```

**Security Note**: Generate a strong JWT secret:
```bash
openssl rand -base64 64
```

**File Permissions**:
```bash
chmod 600 /opt/fitflow/backend/.env
```

### Build Production Bundle

```bash
cd /opt/fitflow/backend

# Build TypeScript to JavaScript
npm run build

# Verify build
ls -lh dist/
# Should see: server.js and other compiled files
```

### PM2 Process Manager

PM2 provides process management, auto-restart, and monitoring.

**Create PM2 Ecosystem File** (`/opt/fitflow/backend/ecosystem.config.js`):

```javascript
module.exports = {
  apps: [
    {
      name: 'fitflow-api',
      script: './dist/server.js',
      cwd: '/opt/fitflow/backend',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/fitflow-api-error.log',
      out_file: '/var/log/pm2/fitflow-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
```

**Start Application**:

```bash
# Create log directory
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2

# Start application
cd /opt/fitflow/backend
pm2 start ecosystem.config.js

# Check status
pm2 status
# Expected: fitflow-api | online | 0 restarts

# View logs
pm2 logs fitflow-api

# Test API
curl http://localhost:3000/health
# Expected: {"status":"ok"}
```

**Auto-Start on Boot**:

```bash
# Generate startup script
pm2 startup

# Follow the printed command (example):
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u pi --hp /home/pi

# Save current PM2 process list
pm2 save

# Verify startup configuration
systemctl status pm2-$USER
```

**PM2 Management Commands**:

```bash
# Restart application
pm2 restart fitflow-api

# Stop application
pm2 stop fitflow-api

# View detailed info
pm2 show fitflow-api

# Monitor in real-time
pm2 monit

# Update PM2
pm2 update
```

### Nginx Reverse Proxy

Nginx provides:
- Reverse proxy (HTTP → backend)
- SSL/TLS termination
- Static file serving
- Rate limiting
- CORS headers

**Create Nginx Configuration** (`/etc/nginx/sites-available/fitflow`):

```nginx
# Upstream backend server
upstream fitflow_backend {
  server localhost:3000;
  keepalive 64;
}

# HTTP → HTTPS redirect
server {
  listen 80;
  listen [::]:80;
  server_name fitflow.yourdomain.com;

  # Let's Encrypt challenge
  location /.well-known/acme-challenge/ {
    root /var/www/html;
  }

  # Redirect all other traffic to HTTPS
  location / {
    return 301 https://$server_name$request_uri;
  }
}

# HTTPS server
server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name fitflow.yourdomain.com;

  # SSL Configuration (updated by certbot)
  ssl_certificate /etc/letsencrypt/live/fitflow.yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/fitflow.yourdomain.com/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Frame-Options DENY always;
  add_header X-Content-Type-Options nosniff always;
  add_header X-XSS-Protection "1; mode=block" always;

  # CORS headers (if needed)
  add_header Access-Control-Allow-Origin "https://fitflow.yourdomain.com" always;
  add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
  add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;

  # API proxy
  location /api {
    proxy_pass http://fitflow_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;

    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
  }

  # Health check endpoint
  location /health {
    proxy_pass http://fitflow_backend;
    access_log off;
  }

  # Rate limiting (optional)
  limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
  location /api/auth {
    limit_req zone=api_limit burst=5 nodelay;
    proxy_pass http://fitflow_backend;
  }
}
```

**Enable Configuration**:

```bash
# Test configuration syntax
sudo nginx -t

# Enable site
sudo ln -s /etc/nginx/sites-available/fitflow /etc/nginx/sites-enabled/

# Restart Nginx
sudo systemctl restart nginx

# Enable auto-start
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

### SSL/TLS with Let's Encrypt

**Obtain SSL Certificate**:

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate (interactive)
sudo certbot --nginx -d fitflow.yourdomain.com

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose redirect option (2 = redirect HTTP to HTTPS)

# Verify certificate
sudo certbot certificates
```

**Auto-Renewal**:

```bash
# Test renewal (dry run)
sudo certbot renew --dry-run

# Certbot auto-renewal is enabled via systemd timer
systemctl status certbot.timer

# Manual renewal (if needed)
sudo certbot renew
sudo systemctl reload nginx
```

**Certificate Expiry**: Let's Encrypt certificates expire every 90 days. Certbot auto-renews at 60 days.

---

## Mobile App Deployment

### Environment Variables

**Create `/mobile/.env`** (for local development):

```env
# Backend API URL (local network)
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000

# For production (HTTPS domain)
# EXPO_PUBLIC_API_URL=https://fitflow.yourdomain.com
```

**Create `/mobile/.env.production`** (for production builds):

```env
# Backend API URL (production)
EXPO_PUBLIC_API_URL=https://fitflow.yourdomain.com

# Expo project configuration
EXPO_PUBLIC_APP_ENV=production
```

**Important**: Never commit `.env` files to Git. Add to `.gitignore`:

```gitignore
.env
.env.local
.env.production
```

### Expo Build Configuration

**Update `app.json`** or **`app.config.js`**:

```json
{
  "expo": {
    "name": "FitFlow Pro",
    "slug": "fitflow-pro",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.yourcompany.fitflow",
      "buildNumber": "1.0.0",
      "infoPlist": {
        "NSMicrophoneUsageDescription": "FitFlow uses the microphone for background rest timer audio."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.yourcompany.fitflow",
      "versionCode": 1,
      "permissions": ["VIBRATE", "NOTIFICATIONS"]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "extra": {
      "eas": {
        "projectId": "YOUR_EXPO_PROJECT_ID"
      }
    }
  }
}
```

### iOS Build

**Prerequisites**:
- macOS with Xcode installed
- Apple Developer account ($99/year)
- EAS CLI installed (`npm install -g eas-cli`)

**Configure EAS Build** (`eas.json`):

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://fitflow.yourdomain.com"
      },
      "ios": {
        "bundleIdentifier": "com.yourcompany.fitflow"
      },
      "android": {
        "buildType": "apk"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "YOUR_ASC_APP_ID",
        "appleTeamId": "YOUR_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

**Build for iOS**:

```bash
cd mobile

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for iOS (production)
eas build --platform ios --profile production

# Wait for build to complete (10-20 minutes)
# Download IPA file from Expo dashboard or CLI
```

**Submit to App Store**:

```bash
# Submit to TestFlight (beta testing)
eas submit --platform ios --profile production

# Or manually upload via Xcode or Application Loader
```

### Android Build

**Prerequisites**:
- Android Studio (for testing)
- Google Play Developer account ($25 one-time fee, optional)

**Build for Android**:

```bash
cd mobile

# Build APK (for testing)
eas build --platform android --profile production

# Build AAB (for Google Play Store)
eas build --platform android --profile production

# Download APK/AAB from Expo dashboard
```

**Submit to Google Play**:

```bash
# Create service account key in Google Cloud Console
# Download JSON key and save as google-service-account.json

# Submit to Google Play (internal testing)
eas submit --platform android --profile production
```

**Install APK Directly** (for testing without Play Store):

```bash
# Transfer APK to Android device
adb install fitflow-pro.apk

# Or share APK via email/cloud storage
```

### Over-The-Air (OTA) Updates

Expo supports OTA updates for JavaScript/React Native code changes (no app store submission required).

**Publish Update**:

```bash
cd mobile

# Publish to production channel
eas update --branch production --message "Fix: Volume calculation bug"

# Users will receive update on next app restart
```

**Update Channels**:
- `production`: Live users
- `staging`: Internal testing
- `development`: Local development

**Note**: OTA updates do NOT work for:
- Native code changes (Swift, Kotlin)
- Expo SDK upgrades
- App config changes (permissions, bundle ID)

---

## Post-Deployment Checklist

### Backend Verification

```bash
# 1. Health check
curl https://fitflow.yourdomain.com/health
# Expected: {"status":"ok"}

# 2. API endpoint test
curl https://fitflow.yourdomain.com/api/exercises | jq
# Expected: JSON with exercise list

# 3. Authentication test
curl -X POST https://fitflow.yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test@example.com","password":"Test123!","age":28}'
# Expected: 201 with user_id and token

# 4. Check PM2 status
pm2 status
# Expected: fitflow-api | online | 0 restarts

# 5. Check logs for errors
pm2 logs fitflow-api --lines 100

# 6. Verify SSL certificate
curl -I https://fitflow.yourdomain.com
# Expected: HTTP/2 200, Strict-Transport-Security header

# 7. Test database integrity
sqlite3 /opt/fitflow/backend/data/fitflow.db "PRAGMA integrity_check;"
# Expected: ok
```

### Mobile App Verification

```bash
# 1. Install app on test device (iOS/Android)

# 2. Verify API connection
# - Open app, check network requests in logs
# - Backend logs should show requests from device IP

# 3. Test core workflows
# - Register new user
# - Create workout
# - Log sets
# - View analytics

# 4. Test offline mode
# - Enable airplane mode
# - Log sets (should work)
# - Disable airplane mode
# - Verify sync (check backend database for sets)

# 5. Test background timers (iOS)
# - Start rest timer
# - Background app
# - Verify timer continues (audio workaround)
# - Verify notification at completion
```

### Database Backup

```bash
# Create backup script
sudo tee /opt/fitflow/backup.sh > /dev/null <<'EOF'
#!/bin/bash
BACKUP_DIR="/opt/fitflow/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_PATH="/opt/fitflow/backend/data/fitflow.db"

mkdir -p $BACKUP_DIR
sqlite3 $DB_PATH ".backup $BACKUP_DIR/fitflow_$DATE.db"

# Keep only last 30 days of backups
find $BACKUP_DIR -name "fitflow_*.db" -mtime +30 -delete

echo "Backup completed: fitflow_$DATE.db"
EOF

# Make executable
chmod +x /opt/fitflow/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/fitflow/backup.sh") | crontab -
```

**Test Backup**:

```bash
/opt/fitflow/backup.sh
ls -lh /opt/fitflow/backups/
```

### Monitoring Setup

**System Monitoring**:

```bash
# Install htop for process monitoring
sudo apt install -y htop

# Monitor CPU/RAM usage
htop

# Check disk usage
df -h
# Ensure /opt/fitflow has sufficient space
```

**Application Monitoring**:

```bash
# PM2 monitoring
pm2 monit  # Real-time monitoring

# View PM2 web dashboard
pm2 web  # Access at http://raspberrypi.local:9615

# Check error logs
tail -f /var/log/pm2/fitflow-api-error.log
```

**Nginx Monitoring**:

```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log

# Check active connections
sudo netstat -tuln | grep :443
```

---

## Monitoring & Maintenance

### Log Management

**Rotate Logs** (prevent disk space issues):

```bash
# Create logrotate configuration
sudo tee /etc/logrotate.d/fitflow > /dev/null <<'EOF'
/var/log/pm2/fitflow-api-*.log {
  daily
  missingok
  rotate 14
  compress
  delaycompress
  notifempty
  create 0640 pi pi
  sharedscripts
  postrotate
    pm2 reloadLogs
  endscript
}
EOF

# Test logrotate
sudo logrotate -d /etc/logrotate.d/fitflow
```

### Performance Monitoring

**Database Performance**:

```bash
# Check database size
sqlite3 /opt/fitflow/backend/data/fitflow.db "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();"

# Analyze query performance
sqlite3 /opt/fitflow/backend/data/fitflow.db "ANALYZE;"

# Vacuum database (reclaim space)
sqlite3 /opt/fitflow/backend/data/fitflow.db "VACUUM;"
```

**API Performance**:

```bash
# Benchmark API endpoint
ab -n 1000 -c 10 https://fitflow.yourdomain.com/health

# Expected: Requests/sec > 500
```

### System Updates

```bash
# Update system packages (monthly)
sudo apt update && sudo apt upgrade -y

# Update Node.js packages
cd /opt/fitflow/backend
npm outdated
npm update

# Rebuild production bundle
npm run build

# Restart application
pm2 restart fitflow-api
```

### SSL Certificate Renewal

Certbot auto-renews, but verify:

```bash
# Check certificate expiry
sudo certbot certificates

# Force renewal (if needed)
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

---

## Troubleshooting

### Backend Issues

**Issue**: PM2 process keeps restarting

```bash
# Check error logs
pm2 logs fitflow-api --err --lines 50

# Common causes:
# - Port 3000 already in use (check with: sudo lsof -i :3000)
# - Database file permissions
# - Missing .env file
# - Invalid JWT_SECRET

# Fix permissions
sudo chown -R $USER:$USER /opt/fitflow/backend/data
chmod 644 /opt/fitflow/backend/data/fitflow.db
```

**Issue**: Database locked errors

```bash
# Check WAL mode
sqlite3 /opt/fitflow/backend/data/fitflow.db "PRAGMA journal_mode;"
# If not "wal", enable it:
sqlite3 /opt/fitflow/backend/data/fitflow.db "PRAGMA journal_mode=WAL;"

# Check for stale locks
ls -lh /opt/fitflow/backend/data/
# If you see fitflow.db-shm or fitflow.db-wal, restart PM2:
pm2 restart fitflow-api
```

**Issue**: API returns 500 errors

```bash
# Check logs for stack trace
pm2 logs fitflow-api --lines 100

# Enable debug logging
# Edit .env:
LOG_LEVEL=debug

# Restart
pm2 restart fitflow-api
```

### Mobile App Issues

**Issue**: Network errors (cannot connect to backend)

```bash
# Verify backend is accessible
curl https://fitflow.yourdomain.com/health

# Check mobile app logs for API URL
# Open Expo dev tools, look for:
# "API_BASE_URL: https://fitflow.yourdomain.com"

# Verify EXPO_PUBLIC_API_URL is set correctly
# In mobile/.env (development):
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000

# In production build:
EXPO_PUBLIC_API_URL=https://fitflow.yourdomain.com

# Restart Expo with cache clear
npx expo start -c
```

**Issue**: iOS build fails

```bash
# Common causes:
# - Missing bundle identifier in app.json
# - Invalid provisioning profile
# - Xcode version mismatch

# Check EAS build logs
eas build:list

# Retry build with clean cache
eas build --platform ios --profile production --clear-cache
```

**Issue**: Android build fails

```bash
# Common causes:
# - Gradle version mismatch
# - Missing Android SDK
# - Invalid package name

# Check EAS build logs
eas build:list

# Retry build
eas build --platform android --profile production
```

### Nginx Issues

**Issue**: 502 Bad Gateway

```bash
# Check if backend is running
curl http://localhost:3000/health

# If not running, start PM2:
pm2 start fitflow-api

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test Nginx configuration
sudo nginx -t
```

**Issue**: SSL certificate errors

```bash
# Check certificate validity
sudo certbot certificates

# Renew certificate
sudo certbot renew
sudo systemctl reload nginx

# If renewal fails, check Nginx config:
sudo nginx -t
```

### Database Issues

**Issue**: Database file corrupted

```bash
# Check integrity
sqlite3 /opt/fitflow/backend/data/fitflow.db "PRAGMA integrity_check;"

# If corrupted, restore from backup:
cp /opt/fitflow/backups/fitflow_YYYYMMDD_HHMMSS.db /opt/fitflow/backend/data/fitflow.db

# Enable WAL mode
sqlite3 /opt/fitflow/backend/data/fitflow.db "PRAGMA journal_mode=WAL;"

# Restart application
pm2 restart fitflow-api
```

**Issue**: Disk space full

```bash
# Check disk usage
df -h

# Clear old backups
rm /opt/fitflow/backups/fitflow_old_*.db

# Clear PM2 logs
pm2 flush

# Clear Nginx logs
sudo truncate -s 0 /var/log/nginx/access.log
sudo truncate -s 0 /var/log/nginx/error.log

# Vacuum database
sqlite3 /opt/fitflow/backend/data/fitflow.db "VACUUM;"
```

---

## Security Best Practices

1. **Change Default JWT Secret**: Generate strong secret with `openssl rand -base64 64`
2. **Use HTTPS Only**: Never allow unencrypted HTTP connections in production
3. **Firewall Configuration**: Restrict SSH and API access
   ```bash
   sudo ufw allow 22/tcp   # SSH
   sudo ufw allow 80/tcp   # HTTP (for Let's Encrypt)
   sudo ufw allow 443/tcp  # HTTPS
   sudo ufw enable
   ```
4. **Regular Backups**: Daily database backups to separate storage
5. **Update Dependencies**: Monthly `npm update` and system package updates
6. **Monitor Logs**: Check error logs daily for suspicious activity
7. **Rate Limiting**: Enable Nginx rate limiting for auth endpoints
8. **Database Encryption**: Consider SQLCipher for at-rest encryption (optional)

---

## Support

For deployment issues or questions:
- GitHub Issues: https://github.com/yourusername/fitness2025/issues
- Documentation: `/CLAUDE.md`, `/backend/README.md`

---

**Last Updated**: October 4, 2025
**Version**: 1.0.0
