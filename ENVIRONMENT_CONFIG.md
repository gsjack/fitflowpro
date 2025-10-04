# FitFlow Pro - Environment Configuration Guide

**Version**: 1.0.0
**Last Updated**: October 4, 2025
**Purpose**: Document all required environment variables and configuration settings for production deployment

---

## Overview

FitFlow Pro uses environment variables to configure backend API endpoints, authentication secrets, database paths, and feature flags. This document covers:

1. Backend configuration (.env for Fastify server)
2. Mobile configuration (.env for React Native/Expo)
3. Security best practices
4. Environment-specific configurations (dev, staging, production)

---

## Backend Configuration

### Location
**File**: `/home/pi/fitflow-backend/.env`

### Required Variables

```bash
# Database Configuration
DATABASE_PATH=./data/fitflow.db
# SQLite database file path (relative to backend root)
# Production: Use absolute path for clarity: /home/pi/fitflow-backend/data/fitflow.db

# JWT Authentication
JWT_SECRET=<REPLACE_WITH_SECURE_SECRET>
# CRITICAL: Must be cryptographically secure (256-bit recommended)
# Generate with: openssl rand -base64 32
# Example: "xK8vN2pQ7mR4sT6wY9zA3bC5dE8fG1hJ4kL7mN0pQ3rS6tU9vW2xY5zA8bC1dE4f"
# DO NOT use default value in production!

# Server Configuration
PORT=3000
# API server port (default: 3000)
# Nginx reverse proxy will forward from 443 → 3000

HOST=0.0.0.0
# Bind to all network interfaces (allows external connections)
# Use 127.0.0.1 for localhost-only (development)

# Node Environment
NODE_ENV=production
# Options: development | staging | production
# Affects logging, error handling, performance optimizations

# CORS Configuration
CORS_ORIGIN=https://app.fitflow.pro
# Allowed origin for CORS (mobile app domain)
# For multiple origins: https://app.fitflow.pro,https://fitflow.pro
# Development: Use '*' (allow all origins)

# Logging
LOG_LEVEL=info
# Options: trace | debug | info | warn | error | fatal
# Production: 'info' or 'warn' (reduces noise)
# Development: 'debug' (verbose logging)
```

### Optional Variables

```bash
# Rate Limiting (recommended for production)
RATE_LIMIT_MAX=100
# Maximum requests per time window (default: 100)

RATE_LIMIT_WINDOW=60000
# Time window in milliseconds (default: 60000 = 1 minute)

# Authentication Rate Limiting (stricter for auth endpoints)
AUTH_RATE_LIMIT_MAX=5
# Maximum login/register attempts per minute (default: 5)

# Database Performance Tuning
SQLITE_CACHE_SIZE=-64000
# SQLite cache size in KB (negative = KB, positive = pages)
# Default: -64000 (-64MB cache)

SQLITE_MMAP_SIZE=268435456
# Memory-mapped I/O size in bytes (default: 256MB)

# Session Management
SESSION_TIMEOUT=1800000
# Active session timeout in milliseconds (default: 30 minutes)
# Note: JWT tokens expire after 30 days (hardcoded in server.ts)

# Backup Configuration (if automated backups enabled)
BACKUP_ENABLED=true
BACKUP_PATH=/home/pi/fitflow-backups
BACKUP_RETENTION_DAYS=30
```

### Example: Development .env

```bash
# Development Backend Configuration
DATABASE_PATH=./data/fitflow.db
JWT_SECRET=dev-secret-do-not-use-in-production
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
CORS_ORIGIN=*
LOG_LEVEL=debug
```

### Example: Production .env

```bash
# Production Backend Configuration
DATABASE_PATH=/home/pi/fitflow-backend/data/fitflow.db
JWT_SECRET=xK8vN2pQ7mR4sT6wY9zA3bC5dE8fG1hJ4kL7mN0pQ3rS6tU9vW2xY5zA8bC1dE4f
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
CORS_ORIGIN=https://app.fitflow.pro
LOG_LEVEL=info
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=5
SQLITE_CACHE_SIZE=-64000
SQLITE_MMAP_SIZE=268435456
BACKUP_ENABLED=true
BACKUP_PATH=/home/pi/fitflow-backups
BACKUP_RETENTION_DAYS=30
```

---

## Mobile Configuration

### Location
**File**: `/home/asigator/fitness2025/mobile/.env`

### Required Variables

```bash
# API Configuration
EXPO_PUBLIC_API_URL=https://api.fitflow.pro
# Backend API base URL (must use HTTPS in production)
# Development (physical device): http://192.168.x.x:3000
# Development (simulator/emulator): http://localhost:3000
# Production: https://api.fitflow.pro

# IMPORTANT: Expo SDK 49+ requires EXPO_PUBLIC_ prefix for runtime access
# Variables without this prefix are NOT available in JavaScript at runtime
```

### Optional Variables

```bash
# Feature Flags (if remote config not used)
EXPO_PUBLIC_VO2MAX_ENABLED=true
EXPO_PUBLIC_PROGRAM_PLANNER_ENABLED=true
EXPO_PUBLIC_ANALYTICS_ENABLED=true

# Offline Sync Configuration
EXPO_PUBLIC_SYNC_RETRY_ATTEMPTS=5
EXPO_PUBLIC_SYNC_RETRY_DELAY=1000
# Initial retry delay in ms (exponential backoff: 1s, 2s, 4s, 8s, 16s)

# Performance Monitoring
EXPO_PUBLIC_PERFORMANCE_MONITORING=false
# Enable performance tracking (development only)

# Debug Mode
EXPO_PUBLIC_DEBUG_MODE=false
# Show debug overlays and console logs (development only)
```

### Example: Development .env

```bash
# Development Mobile Configuration (Physical Device)
EXPO_PUBLIC_API_URL=http://192.168.178.48:3000
EXPO_PUBLIC_DEBUG_MODE=true
EXPO_PUBLIC_PERFORMANCE_MONITORING=true
```

### Example: Production .env

```bash
# Production Mobile Configuration
EXPO_PUBLIC_API_URL=https://api.fitflow.pro
EXPO_PUBLIC_DEBUG_MODE=false
EXPO_PUBLIC_PERFORMANCE_MONITORING=false
EXPO_PUBLIC_VO2MAX_ENABLED=true
EXPO_PUBLIC_PROGRAM_PLANNER_ENABLED=true
EXPO_PUBLIC_ANALYTICS_ENABLED=true
```

### Important Notes for Expo

1. **EXPO_PUBLIC_ Prefix Required**:
   - Only variables with `EXPO_PUBLIC_` prefix are available at runtime
   - Variables without prefix are build-time only
   - See CLAUDE.md "Common Pitfalls → Expo Environment Variables"

2. **Cache Clear Required**:
   - After changing .env, restart Expo with: `npx expo start -c`
   - Cache clear rebuilds Metro bundle with new env vars

3. **Verification**:
   ```bash
   # After starting Expo, verify env var is loaded
   # Look for this in console output:
   env: export EXPO_PUBLIC_API_URL
   ```

---

## Security Best Practices

### Secrets Management

**DO NOT**:
- ❌ Commit `.env` files to version control
- ❌ Share secrets in Slack, email, or documentation
- ❌ Use default/example secrets in production
- ❌ Store secrets in plaintext on production servers

**DO**:
- ✅ Use `.env.example` with placeholder values (safe to commit)
- ✅ Store production secrets in secure password manager (1Password, Bitwarden)
- ✅ Rotate secrets periodically (JWT_SECRET every 90 days)
- ✅ Use different secrets for dev/staging/production environments

### Generating Secure Secrets

**JWT_SECRET** (256-bit random):
```bash
openssl rand -base64 32
# Output: xK8vN2pQ7mR4sT6wY9zA3bC5dE8fG1hJ4kL7mN0pQ3rS6tU9vW2xY5zA8bC1dE4f
```

**Database Encryption Key** (if encryption enabled):
```bash
openssl rand -hex 32
# Output: 4f8a2b1c3d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a
```

### File Permissions

**Backend .env**:
```bash
# Set restrictive permissions (owner read/write only)
chmod 600 /home/pi/fitflow-backend/.env
chown pi:pi /home/pi/fitflow-backend/.env
```

**Database**:
```bash
# Restrict database file access
chmod 600 /home/pi/fitflow-backend/data/fitflow.db
chown pi:pi /home/pi/fitflow-backend/data/fitflow.db
```

### Secret Rotation Procedure

**Rotating JWT_SECRET** (every 90 days):
1. Generate new secret: `openssl rand -base64 32`
2. Update production `.env` with new secret
3. Restart backend: `pm2 restart fitflow-api`
4. **WARNING**: All existing JWT tokens become invalid
5. Users must re-login (expected behavior)

**Communication Plan**:
- Notify users 24 hours in advance: "Scheduled maintenance window"
- Rotate during low-traffic window (2 AM UTC)
- Monitor login failures after rotation

---

## Environment-Specific Configurations

### Development Environment

**Backend** (`backend/.env`):
```bash
DATABASE_PATH=./data/fitflow-dev.db
JWT_SECRET=dev-secret-change-in-production
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
CORS_ORIGIN=*
LOG_LEVEL=debug
```

**Mobile** (`mobile/.env`):
```bash
# Physical device (use your machine's IP)
EXPO_PUBLIC_API_URL=http://192.168.178.48:3000

# Simulator/emulator
EXPO_PUBLIC_API_URL=http://localhost:3000

# Debug features
EXPO_PUBLIC_DEBUG_MODE=true
```

**Characteristics**:
- Verbose logging (LOG_LEVEL=debug)
- Allow all CORS origins (CORS_ORIGIN=*)
- Weak JWT secret (acceptable for local dev)
- Local database (isolated from production)

### Staging Environment (Optional)

**Backend** (`backend/.env.staging`):
```bash
DATABASE_PATH=/home/pi/fitflow-staging/data/fitflow.db
JWT_SECRET=staging-secret-different-from-prod
PORT=3001
HOST=0.0.0.0
NODE_ENV=staging
CORS_ORIGIN=https://staging.fitflow.pro
LOG_LEVEL=info
```

**Mobile** (`mobile/.env.staging`):
```bash
EXPO_PUBLIC_API_URL=https://staging-api.fitflow.pro
EXPO_PUBLIC_DEBUG_MODE=false
```

**Characteristics**:
- Production-like configuration
- Separate database (staging data)
- Different port (3001 vs 3000)
- Used for UAT and final testing

### Production Environment

**Backend** (`backend/.env`):
```bash
DATABASE_PATH=/home/pi/fitflow-backend/data/fitflow.db
JWT_SECRET=<SECURE_SECRET_FROM_PASSWORD_MANAGER>
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
CORS_ORIGIN=https://app.fitflow.pro
LOG_LEVEL=info
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=5
BACKUP_ENABLED=true
```

**Mobile** (`mobile/.env`):
```bash
EXPO_PUBLIC_API_URL=https://api.fitflow.pro
EXPO_PUBLIC_DEBUG_MODE=false
```

**Characteristics**:
- Strict CORS (single origin)
- Strong JWT secret (256-bit)
- Rate limiting enabled
- Info-level logging (not debug)
- Automated backups

---

## Configuration Validation

### Backend Validation Script

Create `/home/pi/fitflow-backend/scripts/validate-env.sh`:

```bash
#!/bin/bash

# FitFlow Backend Environment Validation
# Usage: ./scripts/validate-env.sh

set -e

echo "Validating FitFlow Backend Environment..."

# Check .env file exists
if [ ! -f .env ]; then
  echo "❌ ERROR: .env file not found"
  exit 1
fi

# Source .env
source .env

# Validate required variables
REQUIRED_VARS=("DATABASE_PATH" "JWT_SECRET" "PORT" "NODE_ENV")

for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    echo "❌ ERROR: $VAR is not set"
    exit 1
  else
    echo "✅ $VAR is set"
  fi
done

# Validate JWT_SECRET strength (production only)
if [ "$NODE_ENV" = "production" ]; then
  if [ ${#JWT_SECRET} -lt 32 ]; then
    echo "❌ ERROR: JWT_SECRET too short for production (minimum 32 characters)"
    exit 1
  fi

  if [ "$JWT_SECRET" = "dev-secret-change-in-production" ]; then
    echo "❌ ERROR: Using default JWT_SECRET in production"
    exit 1
  fi

  echo "✅ JWT_SECRET meets production requirements"
fi

# Validate DATABASE_PATH
if [ ! -f "$DATABASE_PATH" ]; then
  echo "⚠️  WARNING: Database file not found at $DATABASE_PATH"
  echo "   Will be created on first run"
fi

# Validate PORT
if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1024 ] || [ "$PORT" -gt 65535 ]; then
  echo "❌ ERROR: PORT must be between 1024-65535"
  exit 1
fi

echo "✅ All validations passed"
```

**Run validation**:
```bash
cd /home/pi/fitflow-backend
chmod +x scripts/validate-env.sh
./scripts/validate-env.sh
```

### Mobile Validation

Check if EXPO_PUBLIC_API_URL is loaded:

```typescript
// In mobile/App.tsx or mobile/src/utils/validateEnv.ts
console.log('[ENV] EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);

if (!process.env.EXPO_PUBLIC_API_URL) {
  console.error('❌ EXPO_PUBLIC_API_URL is not set!');
  console.error('   1. Check .env file exists');
  console.error('   2. Restart Expo with cache clear: npx expo start -c');
}
```

**Expected output** (after `npx expo start -c`):
```
env: export EXPO_PUBLIC_API_URL
[ENV] EXPO_PUBLIC_API_URL: https://api.fitflow.pro
```

---

## Troubleshooting

### Backend Issues

**Problem**: `JWT_SECRET is not set` error on startup
```bash
# Solution: Check .env file exists and is sourced
cd /home/pi/fitflow-backend
cat .env | grep JWT_SECRET
# Should output: JWT_SECRET=<your-secret>

# If missing, create .env from template
cp .env.example .env
# Edit .env and set JWT_SECRET
```

**Problem**: CORS errors from mobile app
```bash
# Solution: Check CORS_ORIGIN matches mobile app domain
cd /home/pi/fitflow-backend
cat .env | grep CORS_ORIGIN
# Production: CORS_ORIGIN=https://app.fitflow.pro
# Development: CORS_ORIGIN=*

# Restart after changing CORS_ORIGIN
pm2 restart fitflow-api
```

**Problem**: Database connection errors
```bash
# Solution: Verify DATABASE_PATH is correct
cd /home/pi/fitflow-backend
cat .env | grep DATABASE_PATH
# Should point to existing .db file or writable directory

# Check file exists
ls -la $(grep DATABASE_PATH .env | cut -d'=' -f2)

# Check permissions
ls -la data/fitflow.db
# Should be: -rw------- (600) owned by pi
```

### Mobile Issues

**Problem**: API calls fail with "Network Error"
```bash
# Solution: Verify EXPO_PUBLIC_API_URL is loaded
# In Expo Metro console, check for:
# env: export EXPO_PUBLIC_API_URL

# If missing:
# 1. Add EXPO_PUBLIC_ prefix to variable in .env
# 2. Restart Expo with cache clear: npx expo start -c
# 3. Verify in App.tsx: console.log(process.env.EXPO_PUBLIC_API_URL)
```

**Problem**: Environment variable undefined at runtime
```bash
# Solution: Must use EXPO_PUBLIC_ prefix (Expo SDK 49+)

# Wrong:
FITFLOW_API_URL=https://api.fitflow.pro

# Correct:
EXPO_PUBLIC_API_URL=https://api.fitflow.pro

# After fixing, restart with cache clear:
npx expo start -c
```

---

## Example Files

### Backend: .env.example

**File**: `/home/asigator/fitness2025/backend/.env.example`

```bash
# FitFlow Pro Backend Configuration
# Copy this file to .env and fill in values

# Database
DATABASE_PATH=./data/fitflow.db

# Authentication
JWT_SECRET=CHANGE_ME_TO_SECURE_RANDOM_STRING
# Generate with: openssl rand -base64 32

# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# CORS
CORS_ORIGIN=*
# Production: https://app.fitflow.pro

# Logging
LOG_LEVEL=debug
# Production: info or warn

# Rate Limiting (optional)
# RATE_LIMIT_MAX=100
# AUTH_RATE_LIMIT_MAX=5

# Database Performance (optional)
# SQLITE_CACHE_SIZE=-64000
# SQLITE_MMAP_SIZE=268435456

# Backups (optional)
# BACKUP_ENABLED=true
# BACKUP_PATH=/home/pi/fitflow-backups
# BACKUP_RETENTION_DAYS=30
```

### Mobile: .env.example

**File**: `/home/asigator/fitness2025/mobile/.env.example`

```bash
# FitFlow Pro Mobile Configuration
# Copy this file to .env and fill in values

# API Configuration (MUST use EXPO_PUBLIC_ prefix)
EXPO_PUBLIC_API_URL=http://localhost:3000

# Development (physical device): http://192.168.x.x:3000
# Development (simulator/emulator): http://localhost:3000
# Production: https://api.fitflow.pro

# Feature Flags (optional)
# EXPO_PUBLIC_VO2MAX_ENABLED=true
# EXPO_PUBLIC_PROGRAM_PLANNER_ENABLED=true
# EXPO_PUBLIC_ANALYTICS_ENABLED=true

# Debug Mode (optional)
# EXPO_PUBLIC_DEBUG_MODE=false
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] **Create .env files** from .env.example templates
- [ ] **Generate secure JWT_SECRET** (256-bit): `openssl rand -base64 32`
- [ ] **Set CORS_ORIGIN** to production domain (no wildcard)
- [ ] **Set NODE_ENV=production** (backend)
- [ ] **Set EXPO_PUBLIC_API_URL** to HTTPS endpoint (mobile)
- [ ] **Validate all required variables** set
- [ ] **Run validation script**: `./scripts/validate-env.sh`

### Post-Deployment

- [ ] **Verify env vars loaded** (check logs for "env: export EXPO_PUBLIC_API_URL")
- [ ] **Test API connectivity** (curl health endpoint)
- [ ] **Test mobile app connection** (login flow)
- [ ] **Monitor logs** for configuration errors
- [ ] **Store secrets in password manager** (backup)

### Secret Rotation Schedule

- [ ] **JWT_SECRET**: Rotate every 90 days
- [ ] **Database backup encryption key**: Rotate every 180 days
- [ ] **SSL certificates**: Auto-renew via certbot (Let's Encrypt)
- [ ] **Review all secrets**: Quarterly security audit

---

## Additional Resources

- **Expo Environment Variables**: https://docs.expo.dev/guides/environment-variables/
- **Fastify Configuration**: https://www.fastify.io/docs/latest/Reference/Server/
- **SQLite Pragma**: https://www.sqlite.org/pragma.html
- **Let's Encrypt**: https://letsencrypt.org/getting-started/
- **OpenSSL Random**: https://www.openssl.org/docs/man1.1.1/man1/rand.html

---

**Document Version**: 1.0.0
**Last Updated**: October 4, 2025
**Next Review**: After production deployment (within 7 days)
