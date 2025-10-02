# FitFlow Pro Backend Deployment Guide

## Deployment Target: Raspberry Pi 5 (ARM64)

This guide documents the deployment process for the FitFlow Pro backend API server on a Raspberry Pi 5 running ARM64 Linux.

## Prerequisites

### Raspberry Pi 5 Setup

1. **OS Installation**:
   - Install Raspberry Pi OS (64-bit) - Debian-based
   - Update system: `sudo apt update && sudo apt upgrade -y`

2. **Install Dependencies**:
   ```bash
   # Node.js 20.x (LTS)
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs npm

   # SQLite3
   sudo apt install -y sqlite3

   # Nginx (reverse proxy)
   sudo apt install -y nginx

   # PM2 (process manager)
   sudo npm install -g pm2

   # Certbot (SSL certificates)
   sudo apt install -y certbot python3-certbot-nginx
   ```

3. **Create Application Directory**:
   ```bash
   sudo mkdir -p /opt/fitflow-api
   sudo chown $USER:$USER /opt/fitflow-api
   ```

## Build Process

### 1. Build Backend Locally

From your development machine:

```bash
cd /home/asigator/fitness2025/backend

# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Verify build output
ls -la dist/
# Should see: server.js, database/, routes/, services/, middleware/
```

### 2. Transfer to Raspberry Pi

```bash
# From project backend directory
rsync -avz --exclude 'node_modules' --exclude 'tests' \
  ./ pi@fitflow.local:/opt/fitflow-api/

# SSH to Raspberry Pi
ssh pi@fitflow.local
cd /opt/fitflow-api

# Install production dependencies only
npm install --production
```

## Database Setup

### 1. Initialize SQLite Database

```bash
cd /opt/fitflow-api

# Create data directory
mkdir -p data

# Initialize database schema
sqlite3 data/fitflow.db < src/database/schema.sql

# Enable WAL mode (required for performance)
sqlite3 data/fitflow.db "PRAGMA journal_mode=WAL;"

# Verify schema
sqlite3 data/fitflow.db ".schema"
```

### 2. Seed Exercise Library

```bash
# Seed 100+ exercises
sqlite3 data/fitflow.db < src/database/seeds/exercises.sql

# Verify seed data
sqlite3 data/fitflow.db "SELECT COUNT(*) FROM exercises;"
# Should return: 100+
```

### 3. Set Permissions

```bash
# Ensure SQLite files are writable
chmod 644 data/fitflow.db
chmod 644 data/fitflow.db-wal
chmod 644 data/fitflow.db-shm
```

## PM2 Process Manager

### 1. Start Application

```bash
cd /opt/fitflow-api

# Start with PM2
pm2 start ecosystem.config.js

# Verify running
pm2 status
# Should show: fitflow-api | online

# View logs
pm2 logs fitflow-api
```

### 2. Configure Auto-Start on Boot

```bash
# Generate startup script
pm2 startup

# Copy the command output and run it (requires sudo)
# Example: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u pi --hp /home/pi

# Save current process list
pm2 save

# Verify auto-start
sudo systemctl status pm2-pi.service
```

### 3. Monitor Application

```bash
# Real-time monitoring
pm2 monit

# Process info
pm2 info fitflow-api

# Restart application
pm2 restart fitflow-api

# Stop application
pm2 stop fitflow-api
```

## Nginx Reverse Proxy

### 1. Create Nginx Configuration

Create `/etc/nginx/sites-available/fitflow`:

```nginx
# Rate limiting zone (100 requests/min per IP)
limit_req_zone $binary_remote_addr zone=fitflow_limit:10m rate=100r/m;

server {
    listen 80;
    server_name fitflow.yourdomain.com;

    # Redirect HTTP to HTTPS (after SSL setup)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name fitflow.yourdomain.com;

    # SSL certificates (configured by certbot)
    ssl_certificate /etc/letsencrypt/live/fitflow.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fitflow.yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API proxy
    location /api/ {
        # Rate limiting
        limit_req zone=fitflow_limit burst=20 nodelay;

        # Proxy to Fastify
        proxy_pass http://localhost:3000;
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
        proxy_pass http://localhost:3000/health;
        access_log off;
    }

    # Logging
    access_log /var/log/nginx/fitflow-access.log;
    error_log /var/log/nginx/fitflow-error.log;
}
```

### 2. Enable Site

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/fitflow /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 3. Setup SSL with Let's Encrypt

```bash
# Obtain SSL certificate (interactive)
sudo certbot --nginx -d fitflow.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run

# Certbot auto-renewal is configured via systemd timer
sudo systemctl status certbot.timer
```

## Environment Variables

### Production Configuration

Create `/opt/fitflow-api/.env`:

```bash
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info

# Security (CHANGE THIS!)
JWT_SECRET=<generate-random-64-char-string>

# Database
DB_PATH=/opt/fitflow-api/data/fitflow.db
```

**Generate JWT Secret**:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Update ecosystem.config.js** to load `.env` file or set environment variables directly.

## Monitoring and Maintenance

### Log Management

```bash
# PM2 logs (last 100 lines)
pm2 logs fitflow-api --lines 100

# PM2 logs (follow)
pm2 logs fitflow-api --raw

# Nginx access logs
sudo tail -f /var/log/nginx/fitflow-access.log

# Nginx error logs
sudo tail -f /var/log/nginx/fitflow-error.log
```

### Log Rotation

PM2 log rotation:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Database Backup

```bash
# Daily backup script
cat > /opt/fitflow-api/backup.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/opt/fitflow-api/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup SQLite database
sqlite3 /opt/fitflow-api/data/fitflow.db ".backup $BACKUP_DIR/fitflow_$DATE.db"

# Keep only last 30 days
find $BACKUP_DIR -name "fitflow_*.db" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/fitflow_$DATE.db"
EOF

chmod +x /opt/fitflow-api/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add line: 0 2 * * * /opt/fitflow-api/backup.sh >> /opt/fitflow-api/logs/backup.log 2>&1
```

### Performance Monitoring

```bash
# SQLite performance check
sqlite3 /opt/fitflow-api/data/fitflow.db "PRAGMA compile_options;"
sqlite3 /opt/fitflow-api/data/fitflow.db "PRAGMA journal_mode;"
# Should return: wal

# API response time monitoring
curl -w "@-" -o /dev/null -s "https://fitflow.yourdomain.com/health" <<'EOF'
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
   time_pretransfer:  %{time_pretransfer}\n
      time_redirect:  %{time_redirect}\n
 time_starttransfer:  %{time_starttransfer}\n
                    ----------\n
         time_total:  %{time_total}\n
EOF
```

## Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs fitflow-api --err

# Common issues:
# 1. Port 3000 already in use
sudo lsof -i :3000
# Kill conflicting process or change PORT in ecosystem.config.js

# 2. Database file permissions
ls -la /opt/fitflow-api/data/
chmod 644 /opt/fitflow-api/data/fitflow.db

# 3. Missing dependencies
cd /opt/fitflow-api && npm install --production
```

### 502 Bad Gateway (Nginx)

```bash
# Check if Fastify is running
curl http://localhost:3000/health

# Check Nginx error logs
sudo tail -f /var/log/nginx/fitflow-error.log

# Verify proxy_pass configuration
sudo nginx -t
```

### High Memory Usage

```bash
# Monitor PM2 memory
pm2 monit

# Restart if memory exceeds 512MB (configured in ecosystem.config.js)
pm2 restart fitflow-api

# Check for memory leaks
pm2 describe fitflow-api
```

### SQLite Database Locked

```bash
# Check for long-running queries
sqlite3 /opt/fitflow-api/data/fitflow.db "PRAGMA busy_timeout = 5000;"

# Verify WAL mode enabled
sqlite3 /opt/fitflow-api/data/fitflow.db "PRAGMA journal_mode;"

# If corrupted, restore from backup
cp /opt/fitflow-api/backups/fitflow_YYYYMMDD_HHMMSS.db /opt/fitflow-api/data/fitflow.db
pm2 restart fitflow-api
```

## Security Checklist

- [ ] JWT_SECRET changed from default (64+ random characters)
- [ ] SSL certificate installed (HTTPS only)
- [ ] Rate limiting enabled (100 req/min per IP)
- [ ] Firewall configured (allow only 80, 443, 22)
- [ ] SSH key authentication enabled (disable password auth)
- [ ] Database file permissions correct (644)
- [ ] Nginx security headers configured
- [ ] Log rotation enabled
- [ ] Automatic backups configured
- [ ] PM2 startup script enabled

```bash
# Firewall (ufw)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

## Performance Targets

Per constitutional requirements:

- **API response time**: < 200ms (p95)
- **SQLite write latency**: < 5ms (p95), < 10ms (p99)
- **Health check**: < 50ms

Monitor via:
```bash
# API benchmarking
ab -n 1000 -c 10 https://fitflow.yourdomain.com/health

# SQLite benchmarking
cd /opt/fitflow-api
npm run test:performance
```

## Updates and Rollback

### Update Application

```bash
# On development machine
cd /home/asigator/fitness2025/backend
npm run build

# Transfer to Raspberry Pi
rsync -avz --exclude 'node_modules' --exclude 'tests' \
  ./ pi@fitflow.local:/opt/fitflow-api/

# On Raspberry Pi
ssh pi@fitflow.local
cd /opt/fitflow-api
npm install --production
pm2 restart fitflow-api
```

### Rollback

```bash
# PM2 saves previous versions
pm2 describe fitflow-api

# Restore from backup
cd /opt/fitflow-api
git checkout <previous-commit>
npm run build
pm2 restart fitflow-api
```

## Additional Resources

- **Fastify Documentation**: https://www.fastify.io/
- **PM2 Documentation**: https://pm2.keymetrics.io/
- **Nginx Documentation**: https://nginx.org/en/docs/
- **Let's Encrypt**: https://letsencrypt.org/
- **SQLite WAL Mode**: https://www.sqlite.org/wal.html
