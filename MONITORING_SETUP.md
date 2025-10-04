# FitFlow Pro - Monitoring & Observability Setup

**Version**: 1.0.0
**Last Updated**: October 4, 2025
**Purpose**: Comprehensive monitoring, logging, and alerting setup for production deployment

---

## Overview

This guide covers monitoring and observability for FitFlow Pro's production infrastructure:

1. **Backend Monitoring**: PM2, Nginx, SQLite performance
2. **Application Monitoring**: API metrics, error tracking, performance
3. **Infrastructure Monitoring**: Raspberry Pi resources (CPU, memory, disk)
4. **Logging**: Centralized log aggregation and analysis
5. **Alerting**: Proactive incident detection and notifications

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile App (iOS/Android)              │
│                                                           │
│  - Crash Reporting (Sentry/Firebase)                     │
│  - Performance Monitoring (React Native Performance)     │
│  - User Analytics (App Store/Play Console)               │
└─────────────────────────────────────────────────────────┘
                              ↓ HTTPS
┌─────────────────────────────────────────────────────────┐
│                     Nginx Reverse Proxy                   │
│                                                           │
│  - Access Logs (/var/log/nginx/access.log)              │
│  - Error Logs (/var/log/nginx/error.log)                │
│  - Request Metrics (status codes, latency)               │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│                   Fastify Backend (PM2)                   │
│                                                           │
│  - PM2 Logs (~/.pm2/logs/fitflow-api-*.log)             │
│  - Application Metrics (PM2 monitoring)                  │
│  - Health Check Endpoint (/health)                       │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│                   SQLite Database                         │
│                                                           │
│  - Query Performance (explain query plan)                │
│  - Database Size Monitoring                              │
│  - WAL Mode Performance                                  │
└─────────────────────────────────────────────────────────┘

                    Monitoring Layer
┌─────────────────────────────────────────────────────────┐
│  PM2 Web Dashboard | Grafana | Prometheus | Loki         │
│  (Optional: Self-hosted on Raspberry Pi)                 │
└─────────────────────────────────────────────────────────┘
```

---

## 1. PM2 Process Monitoring

PM2 is the process manager for the Fastify backend. It provides:
- Process health monitoring
- Automatic restarts on crashes
- Log management
- Resource usage tracking

### Setup PM2 Monitoring

**Step 1: Install PM2 (if not already installed)**
```bash
sudo npm install -g pm2

# Enable PM2 startup on boot
pm2 startup systemd
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u pi --hp /home/pi
```

**Step 2: Configure PM2 Ecosystem**

**File**: `/home/pi/fitflow-backend/ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    {
      name: 'fitflow-api',
      script: './dist/server.js',
      instances: 1, // Single instance (Raspberry Pi - limited resources)
      exec_mode: 'fork', // Use 'cluster' if multi-core supported
      autorestart: true,
      watch: false, // Disable file watching in production
      max_memory_restart: '500M', // Restart if memory exceeds 500MB
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/home/pi/.pm2/logs/fitflow-api-error.log',
      out_file: '/home/pi/.pm2/logs/fitflow-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Performance monitoring
      instance_var: 'INSTANCE_ID',
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
    },
  ],
};
```

**Step 3: Start with PM2**
```bash
cd /home/pi/fitflow-backend
pm2 start ecosystem.config.js
pm2 save  # Save current process list
```

### PM2 Monitoring Commands

**View Process Status**:
```bash
pm2 status
# Output:
# ┌─────┬────────────────┬─────────────┬─────────┬─────────┬──────────┐
# │ id  │ name           │ mode        │ ↺       │ status  │ cpu      │
# ├─────┼────────────────┼─────────────┼─────────┼─────────┼──────────┤
# │ 0   │ fitflow-api    │ fork        │ 0       │ online  │ 0.5%     │
# └─────┴────────────────┴─────────────┴─────────┴─────────┴──────────┘
```

**View Resource Usage**:
```bash
pm2 monit
# Interactive dashboard showing:
# - CPU usage
# - Memory usage
# - Event loop latency
# - Active requests
```

**View Logs (Real-time)**:
```bash
pm2 logs fitflow-api
# Shows combined stdout + stderr

pm2 logs fitflow-api --err
# Shows only errors

pm2 logs fitflow-api --lines 100
# Show last 100 log lines
```

**Restart Process**:
```bash
pm2 restart fitflow-api
# Graceful restart (wait for connections to close)

pm2 reload fitflow-api
# Zero-downtime restart (cluster mode only)
```

**View Detailed Metrics**:
```bash
pm2 describe fitflow-api
# Output:
# - PID, uptime, restarts
# - Memory usage, CPU usage
# - Script path, log paths
# - Environment variables
```

### PM2 Web Dashboard (Optional)

**Install PM2 Web UI**:
```bash
pm2 install pm2-server-monit
# Access at: http://raspberrypi.local:9615
```

**Features**:
- Real-time process monitoring
- CPU/Memory charts
- Log streaming
- Process control (restart, stop, delete)

---

## 2. Nginx Access & Error Logs

Nginx reverse proxy logs all HTTP requests and errors.

### Log Locations

**Access Log**:
```bash
/var/log/nginx/access.log
# Format: IP - [timestamp] "METHOD /path HTTP/1.1" status bytes "referer" "user-agent"
# Example: 192.168.1.100 - [04/Oct/2025:14:30:00 +0000] "POST /api/auth/login HTTP/1.1" 200 1234 "-" "FitFlow/1.0"
```

**Error Log**:
```bash
/var/log/nginx/error.log
# Format: [timestamp] [level] PID#TID: *connection_id message
# Example: 2025/10/04 14:30:00 [error] 1234#1234: *5 connect() failed (111: Connection refused)
```

### Useful Nginx Log Queries

**Total Requests Today**:
```bash
grep "$(date +%d/%b/%Y)" /var/log/nginx/access.log | wc -l
```

**Top 10 Most Requested Endpoints**:
```bash
awk '{print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10
# Example output:
# 1523 /api/sets
# 892 /api/workouts
# 456 /api/auth/login
```

**4xx/5xx Error Rate (Last Hour)**:
```bash
grep "$(date +%d/%b/%Y:%H)" /var/log/nginx/access.log | grep -E " (4|5)[0-9]{2} " | wc -l
```

**Average Response Time** (requires custom log format):
```bash
# Add to /etc/nginx/nginx.conf:
# log_format timed_combined '$remote_addr - [$time_local] "$request" '
#                           '$status $body_bytes_sent "$http_referer" '
#                           '"$http_user_agent" $request_time';

# Then query:
awk '{print $NF}' /var/log/nginx/access.log | awk '{sum+=$1; count++} END {print sum/count}'
# Output: average response time in seconds
```

**Requests by Status Code**:
```bash
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn
# Example output:
# 8523 200
# 342 201
# 45 400
# 12 404
# 3 500
```

### Log Rotation

**Configure Logrotate** (prevent disk fill):

**File**: `/etc/logrotate.d/nginx`

```
/var/log/nginx/*.log {
    daily
    rotate 14
    missingok
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 $(cat /var/run/nginx.pid)
    endscript
}
```

**Test Logrotate**:
```bash
sudo logrotate -f /etc/logrotate.d/nginx
# Check rotated logs:
ls -lh /var/log/nginx/
# Expected: access.log.1.gz, error.log.1.gz, etc.
```

---

## 3. Application Metrics

### Backend API Metrics

**Health Check Endpoint** (already implemented):

```typescript
// backend/src/server.ts
app.get('/health', async (request, reply) => {
  // Database connectivity check
  const dbHealthy = await checkDatabaseHealth();

  return {
    status: dbHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };
});
```

**Check Health**:
```bash
curl http://localhost:3000/health | jq
# Output:
# {
#   "status": "ok",
#   "timestamp": "2025-10-04T14:30:00.000Z",
#   "uptime": 86400,
#   "memory": {
#     "rss": 52428800,
#     "heapTotal": 18874368,
#     "heapUsed": 12345678,
#     "external": 1234567
#   }
# }
```

### Custom Metrics Endpoint (Optional)

Add `/metrics` endpoint for detailed application metrics:

```typescript
// backend/src/routes/metrics.ts
import { FastifyInstance } from 'fastify';

export default async function metricsRoutes(app: FastifyInstance) {
  app.get('/metrics', async (request, reply) => {
    const db = request.server.db;

    // Aggregate metrics
    const [
      totalUsers,
      totalWorkouts,
      totalSets,
      avgSetsPerWorkout,
      activeUsers24h,
    ] = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM users'),
      db.get('SELECT COUNT(*) as count FROM workouts'),
      db.get('SELECT COUNT(*) as count FROM sets'),
      db.get('SELECT AVG(set_count) as avg FROM (SELECT workout_id, COUNT(*) as set_count FROM sets GROUP BY workout_id)'),
      db.get("SELECT COUNT(DISTINCT user_id) as count FROM workouts WHERE created_at >= datetime('now', '-24 hours')"),
    ]);

    return {
      users: {
        total: totalUsers.count,
        active_24h: activeUsers24h.count,
      },
      workouts: {
        total: totalWorkouts.count,
        avg_sets: avgSetsPerWorkout.avg,
      },
      sets: {
        total: totalSets.count,
      },
      timestamp: new Date().toISOString(),
    };
  });
}
```

**Query Metrics**:
```bash
curl http://localhost:3000/metrics | jq
```

---

## 4. Infrastructure Monitoring (Raspberry Pi)

Monitor system resources to prevent performance degradation.

### CPU Monitoring

**Real-time CPU Usage**:
```bash
top -b -n 1 | grep "Cpu(s)"
# Output: %Cpu(s): 12.5 us, 3.2 sy, 0.0 ni, 84.1 id, 0.2 wa, 0.0 hi, 0.0 si, 0.0 st
# Key: us (user), sy (system), id (idle)
```

**CPU Load Average (1, 5, 15 min)**:
```bash
uptime
# Output: 14:30:00 up 10 days, 2:15, 1 user, load average: 0.45, 0.38, 0.32
# Rule of thumb: Load < number of CPU cores is healthy
# Raspberry Pi 5 (4 cores): Load < 4.0 is good
```

### Memory Monitoring

**Memory Usage**:
```bash
free -h
# Output:
#               total        used        free      shared  buff/cache   available
# Mem:           7.8Gi       2.1Gi       3.2Gi       150Mi       2.5Gi       5.4Gi
# Swap:          2.0Gi          0B       2.0Gi
```

**Memory Pressure** (if > 80% used, consider optimization):
```bash
awk '/MemTotal/{total=$2} /MemAvailable/{avail=$2} END {print (total-avail)/total*100 "%"}' /proc/meminfo
# Output: 35.5% (good if < 80%)
```

### Disk Monitoring

**Disk Usage**:
```bash
df -h /home/pi/fitflow-backend/data
# Output:
# Filesystem      Size  Used Avail Use% Mounted on
# /dev/sda1       128G   45G   77G  37% /
```

**Database Size**:
```bash
ls -lh /home/pi/fitflow-backend/data/fitflow.db
# Output: -rw------- 1 pi pi 52M Oct 4 14:30 fitflow.db
```

**Disk I/O** (read/write operations):
```bash
iostat -x 1 5
# Shows: tps, read/write KB/s, await (avg wait time)
# High await (> 100ms) indicates disk bottleneck
```

### Temperature Monitoring (Raspberry Pi Specific)

**CPU Temperature**:
```bash
vcgencmd measure_temp
# Output: temp=45.2'C (healthy if < 70°C under load)
```

**Thermal Throttling Check**:
```bash
vcgencmd get_throttled
# Output: throttled=0x0 (no throttling)
# If non-zero, CPU is being throttled due to heat/voltage
```

### Automated Resource Monitoring Script

**File**: `/home/pi/scripts/monitor-resources.sh`

```bash
#!/bin/bash

# FitFlow Resource Monitoring Script
# Run every 5 minutes via cron

LOG_FILE="/home/pi/logs/resource-monitor.log"
ALERT_EMAIL="admin@fitflow.pro"  # Optional: email alerts

# Get metrics
CPU_LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}')
MEM_USAGE=$(awk '/MemTotal/{total=$2} /MemAvailable/{avail=$2} END {print (total-avail)/total*100}' /proc/meminfo)
DISK_USAGE=$(df -h /home/pi/fitflow-backend/data | awk 'NR==2 {print $5}' | sed 's/%//')
CPU_TEMP=$(vcgencmd measure_temp | awk -F'=' '{print $2}' | sed 's/'\''C//')
DB_SIZE=$(du -h /home/pi/fitflow-backend/data/fitflow.db | awk '{print $1}')

# Log metrics
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "$TIMESTAMP | CPU: $CPU_LOAD | MEM: ${MEM_USAGE}% | DISK: ${DISK_USAGE}% | TEMP: ${CPU_TEMP}C | DB: $DB_SIZE" >> $LOG_FILE

# Check thresholds and alert
if (( $(echo "$MEM_USAGE > 80" | bc -l) )); then
  echo "⚠️  ALERT: Memory usage is ${MEM_USAGE}% (threshold: 80%)" | tee -a $LOG_FILE
  # Optional: send email
  # echo "High memory usage: ${MEM_USAGE}%" | mail -s "FitFlow Alert" $ALERT_EMAIL
fi

if (( $(echo "$DISK_USAGE > 85" | bc -l) )); then
  echo "⚠️  ALERT: Disk usage is ${DISK_USAGE}% (threshold: 85%)" | tee -a $LOG_FILE
fi

if (( $(echo "$CPU_TEMP > 70" | bc -l) )); then
  echo "⚠️  ALERT: CPU temperature is ${CPU_TEMP}C (threshold: 70C)" | tee -a $LOG_FILE
fi

# Clean old logs (keep last 30 days)
find /home/pi/logs/ -name "resource-monitor.log" -mtime +30 -delete
```

**Setup Cron Job**:
```bash
# Create logs directory
mkdir -p /home/pi/logs

# Make script executable
chmod +x /home/pi/scripts/monitor-resources.sh

# Add to crontab (run every 5 minutes)
crontab -e

# Add this line:
*/5 * * * * /home/pi/scripts/monitor-resources.sh

# Verify cron job
crontab -l | grep monitor-resources
```

---

## 5. SQLite Performance Monitoring

### Query Performance

**Enable Query Logging** (development only):
```typescript
// backend/src/database/db.ts
if (process.env.NODE_ENV === 'development') {
  db.on('trace', (sql) => {
    const start = Date.now();
    db.get(sql, (err, row) => {
      const duration = Date.now() - start;
      if (duration > 10) {
        console.warn(`[SLOW QUERY] ${duration}ms: ${sql}`);
      }
    });
  });
}
```

**Analyze Query Plan** (find missing indices):
```bash
sqlite3 /home/pi/fitflow-backend/data/fitflow.db

# Explain query plan
EXPLAIN QUERY PLAN SELECT * FROM sets WHERE workout_id = 123;
# Expected output shows index usage:
# SEARCH sets USING INDEX idx_sets_workout (workout_id=?)

# If no index used:
# SCAN sets
# → Create index: CREATE INDEX idx_sets_workout ON sets(workout_id);
```

**Check Index Coverage**:
```bash
sqlite3 /home/pi/fitflow-backend/data/fitflow.db

# List all indices
.indexes

# Expected indices:
# idx_sets_workout
# idx_sets_synced
# idx_workouts_user_date
# idx_workouts_synced
# (etc.)
```

### Database Size Monitoring

**Track Growth Over Time**:
```bash
# Create monitoring script
cat > /home/pi/scripts/monitor-db-size.sh << 'EOF'
#!/bin/bash
DB_PATH="/home/pi/fitflow-backend/data/fitflow.db"
LOG_FILE="/home/pi/logs/db-size.log"

DB_SIZE=$(du -b $DB_PATH | awk '{print $1}')
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "$TIMESTAMP | $DB_SIZE" >> $LOG_FILE
EOF

chmod +x /home/pi/scripts/monitor-db-size.sh

# Add to cron (daily at midnight)
crontab -e
# Add: 0 0 * * * /home/pi/scripts/monitor-db-size.sh
```

**Alert on Rapid Growth**:
```bash
# Check if database grew > 100MB in 24 hours
tail -2 /home/pi/logs/db-size.log | awk '
  NR==1 {prev=$3}
  NR==2 {curr=$3; diff=(curr-prev)/1024/1024; if(diff>100) print "⚠️  Database grew by " diff "MB in 24h"}
'
```

---

## 6. Error Tracking & Crash Reporting

### Backend Error Logging

**Structured Error Logging**:
```typescript
// backend/src/utils/logger.ts
import { FastifyInstance } from 'fastify';

export function logError(app: FastifyInstance, error: Error, context: any) {
  app.log.error({
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });

  // Optional: Send to external service (Sentry, Rollbar)
  // Sentry.captureException(error, { extra: context });
}
```

**Usage in Routes**:
```typescript
try {
  // ... route logic
} catch (error) {
  logError(app, error, { route: '/api/sets', userId: request.user.id });
  throw error;
}
```

### Mobile Error Tracking (Optional)

**Option 1: Sentry (Recommended)**:
```bash
# Install Sentry SDK
cd /home/asigator/fitness2025/mobile
npm install @sentry/react-native

# Initialize in App.tsx
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://your-sentry-dsn@sentry.io/project-id',
  enableAutoSessionTracking: true,
  tracesSampleRate: 0.2, // 20% performance sampling
});
```

**Option 2: Firebase Crashlytics**:
```bash
# Install Firebase SDK
npm install @react-native-firebase/app @react-native-firebase/crashlytics

# Configure in App.tsx
import crashlytics from '@react-native-firebase/crashlytics';

crashlytics().log('App mounted');
```

---

## 7. Alerting & Notifications

### PM2 Alerts (Process Crashes)

**Option 1: PM2 Email Notifications** (requires pm2-slack or pm2-email):
```bash
pm2 install pm2-email

# Configure email settings
pm2 set pm2-email:email admin@fitflow.pro
pm2 set pm2-email:smtp_host smtp.gmail.com
pm2 set pm2-email:smtp_port 587
pm2 set pm2-email:smtp_user your-email@gmail.com
pm2 set pm2-email:smtp_password your-app-password

# Enable crash alerts
pm2 set pm2-email:crash true
```

**Option 2: PM2 Webhook (Slack/Discord)**:
```bash
pm2 install pm2-slack

# Configure Slack webhook
pm2 set pm2-slack:slack_url https://hooks.slack.com/services/YOUR/WEBHOOK/URL
pm2 set pm2-slack:servername FitFlow-Production
```

### Healthcheck Monitoring (External)

**Option 1: UptimeRobot** (free, cloud-based):
1. Sign up at uptimerobot.com
2. Add monitor: HTTP(s) → https://api.fitflow.pro/health
3. Check interval: 5 minutes
4. Alert contacts: Email, SMS, Slack

**Option 2: Self-hosted Healthcheck Script**:

**File**: `/home/pi/scripts/healthcheck.sh`

```bash
#!/bin/bash

# FitFlow Healthcheck Script
# Run every 5 minutes via cron

API_URL="http://localhost:3000/health"
ALERT_EMAIL="admin@fitflow.pro"
LOG_FILE="/home/pi/logs/healthcheck.log"

# Perform health check
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

if [ "$HTTP_CODE" != "200" ]; then
  echo "$TIMESTAMP | ❌ UNHEALTHY | HTTP $HTTP_CODE" | tee -a $LOG_FILE

  # Alert (email or Slack)
  echo "FitFlow API is down (HTTP $HTTP_CODE)" | mail -s "ALERT: FitFlow API Down" $ALERT_EMAIL

  # Attempt auto-restart
  echo "Attempting PM2 restart..."
  pm2 restart fitflow-api
else
  echo "$TIMESTAMP | ✅ HEALTHY | HTTP 200" >> $LOG_FILE
fi
```

**Setup Cron**:
```bash
chmod +x /home/pi/scripts/healthcheck.sh
crontab -e
# Add: */5 * * * * /home/pi/scripts/healthcheck.sh
```

---

## 8. Grafana Dashboard (Optional - Advanced)

For comprehensive visualization of all metrics.

### Install Prometheus + Grafana

**Step 1: Install Prometheus**:
```bash
# Download Prometheus for ARM64
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-arm64.tar.gz
tar -xzf prometheus-2.45.0.linux-arm64.tar.gz
sudo mv prometheus-2.45.0.linux-arm64 /opt/prometheus

# Create systemd service
sudo tee /etc/systemd/system/prometheus.service > /dev/null <<EOF
[Unit]
Description=Prometheus
After=network.target

[Service]
User=pi
ExecStart=/opt/prometheus/prometheus --config.file=/opt/prometheus/prometheus.yml
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable prometheus
sudo systemctl start prometheus
```

**Step 2: Install Grafana**:
```bash
# Add Grafana APT repository
sudo apt-get install -y software-properties-common
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
echo "deb https://packages.grafana.com/oss/deb stable main" | sudo tee /etc/apt/sources.list.d/grafana.list

# Install Grafana
sudo apt-get update
sudo apt-get install -y grafana

# Start Grafana
sudo systemctl enable grafana-server
sudo systemctl start grafana-server

# Access at: http://raspberrypi.local:3000
# Default login: admin / admin
```

**Step 3: Configure Prometheus Data Source**:
1. Open Grafana: http://raspberrypi.local:3000
2. Configuration → Data Sources → Add Prometheus
3. URL: http://localhost:9090
4. Save & Test

**Step 4: Import Dashboard**:
1. Dashboards → Import
2. Use template ID: 1860 (Node Exporter Full)
3. Or create custom dashboard with panels for:
   - PM2 process metrics
   - Nginx request rate
   - Database size
   - API response times

---

## 9. Monitoring Checklist

### Daily Monitoring (Automated)

- [ ] **Health Check**: API responds with 200 status
- [ ] **PM2 Status**: Process online, no restarts
- [ ] **CPU Load**: < 4.0 (on 4-core Raspberry Pi)
- [ ] **Memory Usage**: < 80%
- [ ] **Disk Usage**: < 85%
- [ ] **CPU Temperature**: < 70°C
- [ ] **Database Size**: Track growth rate

### Weekly Monitoring (Manual)

- [ ] **Error Rate**: < 1% of total requests
- [ ] **Nginx Logs**: No unusual patterns (brute force, DDOS)
- [ ] **PM2 Logs**: No uncaught exceptions
- [ ] **Database Performance**: No slow queries (> 10ms)
- [ ] **App Store Reviews**: Respond to negative reviews
- [ ] **Crash Reports**: Investigate any crashes

### Monthly Monitoring (Manual)

- [ ] **Disk Cleanup**: Rotate old logs, backups
- [ ] **Dependency Updates**: npm audit, security patches
- [ ] **SSL Certificate**: Verify expiration (Let's Encrypt auto-renews)
- [ ] **Backup Verification**: Test restore from backup
- [ ] **Performance Trends**: Compare month-over-month metrics

---

## 10. Incident Response Playbook

### Scenario 1: API Down (Health Check Fails)

**Symptoms**:
- Health check returns 500 or timeout
- PM2 shows process crashed/stopped

**Actions**:
1. Check PM2 status: `pm2 status`
2. View error logs: `pm2 logs fitflow-api --err --lines 100`
3. Restart process: `pm2 restart fitflow-api`
4. If restart fails, check database connectivity
5. If database locked, restart SQLite: `fuser -k data/fitflow.db`
6. Check disk space: `df -h`
7. Escalate to engineering if unresolved in 15 minutes

### Scenario 2: High Memory Usage (> 90%)

**Symptoms**:
- Memory usage alert triggered
- App slow or unresponsive

**Actions**:
1. Identify memory hog: `ps aux --sort=-%mem | head -10`
2. Check PM2 memory: `pm2 status` (memory column)
3. If backend > 500MB, investigate memory leak
4. Restart backend: `pm2 restart fitflow-api`
5. Monitor memory after restart: `watch -n 5 free -h`
6. If issue persists, check for long-running queries

### Scenario 3: Database Performance Degradation

**Symptoms**:
- API response times > 500ms
- Users report slow app

**Actions**:
1. Check database size: `ls -lh data/fitflow.db`
2. Check for lock: `lsof | grep fitflow.db`
3. Analyze slow queries: Enable query logging (see Section 5)
4. Optimize queries: Add missing indices
5. Vacuum database (compact): `sqlite3 data/fitflow.db "VACUUM;"`
6. Consider archiving old data if DB > 1GB

---

## 11. Monitoring Resources

### Tools Used

- **PM2**: Process management and monitoring
- **Nginx**: Access/error logs
- **SQLite**: Database performance
- **Bash Scripts**: Custom monitoring scripts
- **Cron**: Scheduled health checks

### Optional Tools

- **Grafana**: Visualization dashboards
- **Prometheus**: Metrics collection
- **Sentry**: Error tracking (mobile + backend)
- **UptimeRobot**: External uptime monitoring
- **PM2 Plus**: Advanced PM2 monitoring (paid)

### Useful Resources

- PM2 Documentation: https://pm2.keymetrics.io/docs/usage/monitoring/
- Nginx Logging: https://nginx.org/en/docs/http/ngx_http_log_module.html
- SQLite Performance: https://www.sqlite.org/performance.html
- Grafana Dashboards: https://grafana.com/grafana/dashboards/

---

**Document Version**: 1.0.0
**Last Updated**: October 4, 2025
**Next Review**: After production deployment (within 7 days)
