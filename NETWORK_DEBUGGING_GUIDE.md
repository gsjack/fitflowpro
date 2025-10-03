# FitFlow Pro - Network Error Debugging Guide

## Problem Summary

Users experiencing "network error" when trying to register on both webapp and mobile device.

## Root Cause Analysis

### ✅ Backend Status: HEALTHY
- **Server**: Running on `http://0.0.0.0:3000` (PID: 12149)
- **Health Check**: ✅ Responding correctly
- **Registration Endpoint**: ✅ Working perfectly
- **CORS Configuration**: ✅ Configured correctly (`origin: true`)
- **Test Results**: ✅ Successful registration via curl

### ❌ Root Cause: Network Configuration Issue

The "network error" is caused by **incorrect API URL configuration** for different environments:

#### Problem 1: Mobile Device Using `localhost:3000`
- Mobile devices **cannot** access `localhost:3000` (localhost on mobile = the mobile device itself)
- Must use computer's **local IP address** instead: `http://192.168.178.49:3000`

#### Problem 2: Missing Environment Variable Configuration
- App defaults to `localhost:3000` or `10.0.2.2:3000` (Android emulator)
- No `.env` file to override for physical devices
- `FITFLOW_API_URL` environment variable not set

## Solution

### For WebApp (Browser on same computer as backend)

**Works out of the box** with default config:
```bash
# Backend URL: http://localhost:3000
cd mobile
npm run web
```

The webapp uses `http://localhost:3000` which works because browser and backend are on the same machine.

### For Mobile Device (Physical iPhone/Android on WiFi)

**Step 1: Find your computer's local IP address**

```bash
# On Linux/Mac:
ip addr show | grep "inet " | grep -v 127.0.0.1

# Output example:
# inet 192.168.178.49/24 brd 192.168.178.255 scope global dynamic noprefixrorange wlp4s0
# Your IP is: 192.168.178.49
```

```bash
# On Windows:
ipconfig | findstr IPv4

# Output example:
# IPv4 Address. . . . . . . . . . . : 192.168.178.49
```

**Step 2: Create `.env` file in mobile directory**

```bash
cd /home/asigator/fitness2025/mobile
cat > .env << 'EOF'
# Replace with YOUR computer's IP address
FITFLOW_API_URL=http://192.168.178.49:3000
EOF
```

**Step 3: Restart Expo dev server**

```bash
# Kill existing server
pkill -f "expo start"

# Start with new config
npm run dev
```

**Step 4: Scan QR code from your mobile device**

- Open Expo Go app on your phone
- Scan QR code from terminal
- App will now connect to `http://192.168.178.49:3000`

### For Android Emulator

**No configuration needed** - uses special alias:

```bash
# Android emulator default (10.0.2.2 = host machine)
cd mobile
npm run android
```

The app automatically uses `http://10.0.2.2:3000` for Android emulator.

### For iOS Simulator

**No configuration needed** - can access localhost:

```bash
# iOS simulator can access host's localhost
cd mobile
npm run ios
```

The app uses `http://localhost:3000` which works on iOS simulator.

## Testing & Verification

### Test 1: Backend Health Check

```bash
# Test from your computer
curl http://localhost:3000/health

# Expected output:
# {"status":"ok","timestamp":1759428798000}
```

```bash
# Test from your local IP (what mobile device sees)
curl http://192.168.178.49:3000/health

# Expected output:
# {"status":"ok","timestamp":1759428798000}
```

### Test 2: Registration Endpoint

```bash
# Test registration with curl
curl -X POST http://192.168.178.49:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Origin: http://192.168.178.49:8081" \
  -d '{
    "username":"test@example.com",
    "password":"testpass123",
    "age":25,
    "weight_kg":75,
    "experience_level":"beginner"
  }'

# Expected output:
# {"user_id":146,"token":"eyJhbGc..."}
```

### Test 3: Browser Test Page

Open the test HTML file in your browser:

```bash
cd /home/asigator/fitness2025
python3 -m http.server 8080 &
```

Then open: `http://localhost:8080/test_registration.html`

**Instructions:**
1. Change "Backend URL" to your configuration
2. Click "Test /health" - should be green ✅
3. Click "Test Registration" - should be green ✅
4. Check diagnosis section for any issues

## API Configuration by Environment

| Environment | API URL | Configuration |
|------------|---------|---------------|
| **Web (localhost)** | `http://localhost:3000` | Default - no config needed |
| **Physical Device** | `http://192.168.178.49:3000` | Set `FITFLOW_API_URL` in `.env` |
| **Android Emulator** | `http://10.0.2.2:3000` | Default - no config needed |
| **iOS Simulator** | `http://localhost:3000` | Default - no config needed |

## Common Errors & Solutions

### Error: "Network request failed"

**Cause**: Cannot reach backend API

**Solutions**:
1. Check backend is running: `lsof -i :3000`
2. Verify IP address is correct: `ip addr show`
3. Ensure firewall allows port 3000: `sudo ufw allow 3000`
4. Verify devices on same WiFi network

### Error: "Failed to fetch"

**Cause**: CORS or network issue

**Solutions**:
1. Check browser console for CORS errors
2. Verify backend CORS config in `/home/asigator/fitness2025/backend/src/server.ts`
3. Test with curl to isolate issue

### Error: "Request timeout"

**Cause**: Backend not responding

**Solutions**:
1. Check backend logs: `cd backend && npm run dev`
2. Verify SQLite database is accessible
3. Check system resources (CPU/memory)

## File Locations

### Frontend API Configuration
- **Auth API**: `/home/asigator/fitness2025/mobile/src/services/api/authApi.ts`
  - Lines 20-27: `getDefaultApiUrl()` function
  - Line 27: `API_BASE_URL = process.env.FITFLOW_API_URL || getDefaultApiUrl()`

- **Workout DB**: `/home/asigator/fitness2025/mobile/src/services/database/workoutDb.ts`
  - Lines 15-22: Similar configuration

### Backend Configuration
- **Server**: `/home/asigator/fitness2025/backend/src/server.ts`
  - Line 18: `HOST = '0.0.0.0'` (listens on all interfaces)
  - Line 17: `PORT = 3000`
  - Lines 32-35: CORS config (`origin: true` - allows all origins)

### Environment Files
- **Example config**: `/home/asigator/fitness2025/mobile/.env.example`
- **Your config**: `/home/asigator/fitness2025/mobile/.env` (create this)

## Current Network Configuration

**Your Computer (Backend Server)**:
- IP Address: `192.168.178.49`
- Port: `3000`
- Status: ✅ Running (PID 12149)

**Backend Listening On**:
- Interface: `0.0.0.0:3000` (all network interfaces)
- Accessible via:
  - `http://localhost:3000` (from same computer)
  - `http://192.168.178.49:3000` (from WiFi devices)
  - `http://172.17.0.1:3000` (from Docker containers)

**Test Results**:
```
✅ curl http://localhost:3000/health                    → SUCCESS
✅ curl http://192.168.178.49:3000/health              → SUCCESS
✅ curl http://localhost:3000/api/auth/register        → SUCCESS (201)
✅ curl http://192.168.178.49:3000/api/auth/register   → SUCCESS (201)
✅ CORS headers                                        → Configured correctly
```

## Quick Fix Commands

### For Mobile Device Registration

```bash
# 1. Find your IP
ip addr show | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | cut -d'/' -f1

# 2. Create .env with your IP (replace 192.168.178.49)
cd /home/asigator/fitness2025/mobile
echo "FITFLOW_API_URL=http://192.168.178.49:3000" > .env

# 3. Restart Expo
pkill -f "expo start"
cd /home/asigator/fitness2025/mobile
npm run dev

# 4. Scan QR code from your phone
```

### For WebApp Registration

```bash
# Should work out of the box
cd /home/asigator/fitness2025/mobile
npm run web

# Open browser: http://localhost:8081
```

## Verification Checklist

Before testing on mobile device:

- [ ] Backend running: `lsof -i :3000` shows node process
- [ ] Health check works: `curl http://192.168.178.49:3000/health`
- [ ] Registration works: `curl -X POST http://192.168.178.49:3000/api/auth/register ...`
- [ ] `.env` file created with correct IP
- [ ] Expo dev server restarted after creating `.env`
- [ ] Mobile device on same WiFi network as computer
- [ ] Firewall allows port 3000: `sudo ufw status`

## Additional Notes

### Why localhost doesn't work on mobile devices

- `localhost` and `127.0.0.1` are **loopback addresses**
- They always point to **the device itself**
- When mobile app uses `http://localhost:3000`, it tries to connect to port 3000 **on the phone**, not your computer
- Solution: Use your computer's **actual IP address** on the local network

### Android Emulator Special Case

- Android emulator runs in a VM with its own network
- Google provides special alias `10.0.2.2` → host machine
- This is why default code checks for Android and uses `10.0.2.2:3000`

### Security Note

- Backend configured with `origin: true` (allows all origins)
- This is OK for development on local network
- **For production**: Configure specific allowed origins in CORS config

## Contact & Support

If issues persist after following this guide:

1. Check backend logs: `cd backend && npm run dev`
2. Check browser console (F12) for detailed error messages
3. Run test suite: `cd backend && npm run test:contract`
4. Review `/home/asigator/fitness2025/CLAUDE.md` for architecture details
