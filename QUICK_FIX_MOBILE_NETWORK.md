# FitFlow Pro - Quick Fix for Mobile "Network Error"

## Problem
Getting "network error" when trying to register on mobile device?

## Solution (30 seconds)

```bash
cd /home/asigator/fitness2025/mobile
bash fix_mobile_network.sh
npm run dev
```

Then scan QR code from your phone. Done! ✅

---

## What This Does

1. Finds your computer's IP address (e.g., `192.168.178.49`)
2. Creates `.env` file with `FITFLOW_API_URL=http://192.168.178.49:3000`
3. Verifies backend is running and accessible
4. Gives you next steps

---

## Manual Fix (if script fails)

### Step 1: Find Your IP
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
# Look for: 192.168.x.x or 10.0.x.x
```

### Step 2: Create .env File
```bash
cd /home/asigator/fitness2025/mobile
echo "FITFLOW_API_URL=http://YOUR_IP:3000" > .env
# Replace YOUR_IP with the IP from Step 1
```

### Step 3: Restart Expo
```bash
npm run dev
```

### Step 4: Scan QR Code
Open Expo Go on your phone and scan the QR code.

---

## Why This Happens

- ❌ **Doesn't work**: `localhost:3000` (mobile device looks for server on the phone)
- ✅ **Works**: `192.168.178.49:3000` (mobile device looks for server on your computer)

`localhost` = "this device"
Your computer's IP = "that computer over there on WiFi"

---

## Environment-Specific Config

| Environment | Config Needed? | Default URL |
|-------------|---------------|-------------|
| WebApp (browser) | ❌ No | `http://localhost:3000` |
| Physical phone | ✅ **YES** | Need computer's IP |
| Android emulator | ❌ No | `http://10.0.2.2:3000` |
| iOS simulator | ❌ No | `http://localhost:3000` |

---

## Test If It's Working

```bash
# From your computer:
curl http://192.168.178.49:3000/health

# Should return:
# {"status":"ok","timestamp":1759428798}
```

If this works, your phone can reach the backend! ✅

---

## Still Not Working?

### Checklist:
- [ ] Backend running? `lsof -i :3000`
- [ ] Phone on same WiFi as computer?
- [ ] Correct IP in `.env` file?
- [ ] Restarted Expo after creating `.env`?
- [ ] Firewall blocking port 3000? `sudo ufw allow 3000`

### More Help:
- Detailed guide: `/home/asigator/fitness2025/NETWORK_DEBUGGING_GUIDE.md`
- Test page: Open `test_registration.html` in browser
- Full report: `/home/asigator/fitness2025/NETWORK_ERROR_RESOLUTION_REPORT.md`

---

## One-Liner Fix

```bash
cd mobile && bash fix_mobile_network.sh && npm run dev
```

That's it! 🎉
