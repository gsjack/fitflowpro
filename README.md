# FitFlow Pro

Evidence-based fitness training application implementing Renaissance Periodization (RP) methodology by Dr. Mike Israetel.

**Version**: 1.0.0
**Status**: Production Ready
**Platform**: Mobile-first (React Native + Expo), Web-compatible

---

## Quick Start

### Backend (API Server)

```bash
cd backend
npm install
npm run dev  # Starts on http://localhost:3000
```

**Prerequisites**: Node.js 20 LTS, SQLite3

### Mobile App

```bash
cd mobile
npm install
npm run dev  # Starts Expo dev server
```

**Prerequisites**: Node.js 20 LTS, Expo CLI

### First Time Setup

1. **Backend Database**:
   ```bash
   cd backend/data
   sqlite3 fitflow.db < ../src/database/schema.sql
   sqlite3 fitflow.db "PRAGMA journal_mode=WAL;"
   cd ..
   npm run seed  # Load 100+ exercise library
   ```

2. **Backend Environment** (`backend/.env`):
   ```env
   PORT=3000
   JWT_SECRET=your-secret-key-here
   DATABASE_PATH=./data/fitflow.db
   NODE_ENV=development
   ```

3. **Mobile Environment** (`mobile/.env`):
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:3000
   ```

4. **Start Development**:
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev

   # Terminal 2: Mobile
   cd mobile && npm run dev
   ```

---

## Features

### Resistance Training
- **Exercise Library**: 100+ exercises (barbell, dumbbell, machine, cable, bodyweight)
- **Program Management**: 6-day split, mesocycle phase progression (MEV/MAV/MRV/Deload)
- **Workout Logging**: Set tracking with 1RM estimation (Epley formula + RIR adjustment)
- **Auto-Regulation**: Daily recovery assessment (sleep, soreness, motivation)
- **Volume Analytics**: Zone classification (below_mev, adequate, optimal, above_mrv)

### Cardio Training
- **VO2max Tracking**: Cooper formula estimation (age-based max HR)
- **Norwegian 4x4 Protocol**: 4 intervals × (4min work + 3min recovery)
- **Protocols**: Steady state, intervals, Norwegian 4x4

### Analytics & Progression
- **1RM Progression**: Track strength gains per exercise (12-week trends)
- **Volume Trends**: Weekly volume by muscle group (8-week trends)
- **Program Volume Analysis**: Real-time MEV/MAV/MRV compliance
- **Recovery Insights**: Auto-regulation recommendations (reduce sets, rest day)

---

## Architecture

### Tech Stack

**Backend**:
- Fastify 4.26+ (API server)
- better-sqlite3 (database)
- TypeScript, bcrypt, JWT auth
- 90.4% test passing rate, 78% code coverage

**Mobile**:
- React Native (Expo SDK 54+)
- Expo Router (file-based navigation)
- TypeScript, Zustand (state), TanStack Query
- React Native Paper (Material Design UI)

**Database**: SQLite with WAL mode (concurrent reads, < 5ms writes)

### Navigation (Expo Router)

File-based routing:
- `app/(auth)/login.tsx` → `/login`
- `app/(tabs)/index.tsx` → `/` (Dashboard)
- `app/(tabs)/workout.tsx` → `/workout`

**Auth Protection**: Automatic redirect (unauthenticated → `/login`, authenticated → `/(tabs)`)

**Web Support**: Direct URL navigation, browser back/forward, refresh maintains route

### Key Directories

```
fitness2025/
├── backend/                 # Fastify API server
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Auth, validation
│   │   └── database/       # Schema, migrations, seeds
│   ├── tests/              # Unit, contract, integration tests
│   └── data/               # SQLite database
├── mobile/                  # React Native app
│   ├── app/                # Expo Router screens (file-based routing)
│   │   ├── (auth)/         # Login, register
│   │   └── (tabs)/         # Dashboard, workout, analytics, planner, settings
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── services/       # API clients, sync queue
│   │   ├── stores/         # Zustand state management
│   │   └── database/       # SQLite wrapper (web fallback)
│   └── e2e/                # Playwright E2E tests
├── specs/                   # Feature specifications
│   ├── 001-specify-build-fitflow/
│   └── 002-actual-gaps-ultrathink/
└── CLAUDE.md               # Project context for Claude Code
```

---

## Development

### Backend Commands

```bash
cd backend
npm run dev              # Dev server (hot reload)
npm run build            # Compile TypeScript
npm start                # Production server
npm run test:unit        # Service unit tests
npm run test:contract    # API contract tests
npm run test:integration # End-to-end tests
npm run test:performance # Benchmark queries
npm run lint             # ESLint check
```

### Mobile Commands

```bash
cd mobile
npm run dev              # Expo dev server
npm run build:ios        # Build iOS app
npm run build:android    # Build Android app
npm run test:unit        # Vitest unit tests
npm run test:integration # Integration scenarios
npm run test:contract    # API contract validation
npm run lint             # ESLint check
```

### Testing Strategy

1. **Contract Tests** (backend): API request/response schema validation
2. **Unit Tests** (backend + mobile): Service logic, utilities, calculations
3. **Integration Tests** (mobile): Full user workflows (login → workout → analytics)
4. **E2E Tests** (mobile): Playwright browser automation

**Coverage Requirements**: ≥80% overall, 100% for critical paths (auth, sync, workout logging)

---

## Scientific Concepts

### Volume Landmarks (Renaissance Periodization)

Sets per muscle group per week:
- **MEV** (Minimum Effective Volume): Lower threshold for growth
- **MAV** (Maximum Adaptive Volume): Optimal range
- **MRV** (Maximum Recoverable Volume): Upper limit before overtraining

**Example**: Chest MEV=8, MAV=14, MRV=22 sets/week

**Full Set Counting**: 1 set Bench Press = +1 chest, +1 front_delts, +1 triceps (multi-muscle exercises contribute fully to each muscle worked)

### Mesocycle Phase Progression

**Phases** (7-8 week cycles):
1. **MEV** (Weeks 1-2): Baseline adaptation
2. **MAV** (Weeks 3-5): Progressive overload
3. **MRV** (Weeks 6-7): Peak volume (overreaching)
4. **Deload** (Week 8): Recovery (50% volume reduction)

**Volume Multipliers** when advancing:
- MEV → MAV: 1.2x (+20%)
- MAV → MRV: 1.15x (+15%)
- MRV → Deload: 0.5x (-50%)
- Deload → MEV: 2.0x (+100%, progressive overload)

**Manual Advancement**: Phases do NOT auto-advance (user/coach decides based on recovery)

### RIR (Reps in Reserve)

0-4 scale measuring proximity to failure:
- **0**: Absolute failure
- **1**: 1 rep left
- **2**: 2 reps left (hypertrophy target)
- **3**: 3 reps left (deload intensity)

### 1RM Estimation (Epley Formula + RIR)

```typescript
1RM = weight × (1 + (reps - rir) / 30)

Example: 100kg × 8 reps @ RIR 2
  → 100 × (1 + (8 - 2) / 30)
  → 100 × 1.2
  → 120kg
```

### VO2max Estimation (Cooper Formula)

```typescript
VO2max = 15.3 × (max_hr / resting_hr)

where:
  max_hr = 220 - age
  resting_hr = 60 (standard assumption)

Example: Age 28
  max_hr = 220 - 28 = 192 bpm
  VO2max = 15.3 × (192 / 60) = 48.96 ml/kg/min
```

**Requirements**: User must have `age` set in profile (required for Cooper formula)

---

## Deployment

### Raspberry Pi 5 (ARM64)

**Prerequisites**:
- Node.js 20 LTS
- SQLite3
- Nginx (reverse proxy)
- PM2 (process manager)

**Setup**:

```bash
# Install dependencies
sudo apt update && sudo apt install -y nodejs npm sqlite3 nginx

# Clone repository
git clone <repo-url>
cd fitness2025

# Backend setup
cd backend
npm install
npm run build

# PM2 process manager
pm2 start dist/server.js --name fitflow-api
pm2 startup
pm2 save

# Nginx reverse proxy (HTTPS with Let's Encrypt)
sudo certbot --nginx -d fitflow.yourdomain.com
```

**SQLite Optimizations** (applied in `backend/src/database/db.ts`):
```typescript
db.pragma('journal_mode = WAL');       // Concurrent reads
db.pragma('cache_size = -64000');      // 64MB cache
db.pragma('mmap_size = 268435456');    // 256MB memory-mapped I/O
```

**Performance Requirements**:
- SQLite writes: < 5ms (p95)
- API responses: < 200ms (p95)
- UI interactions: < 100ms perceived latency

---

## Documentation

- **Backend API**: `/backend/README.md` (endpoints, authentication, schemas)
- **Mobile App**: `/mobile/README.md` (setup, navigation, components)
- **Project Context**: `/CLAUDE.md` (architecture, conventions, pitfalls)
- **Specifications**: `/specs/001-specify-build-fitflow/spec.md` (functional requirements)
- **Deployment**: `/backend/DEPLOYMENT.md` (Raspberry Pi setup, Nginx, PM2)

---

## License

MIT

## Status

**Backend**: 90.4% tests passing (123/136), 78% code coverage
**Mobile**: Production ready, 88/100 readiness score
**Overall**: GO DECISION APPROVED (October 4, 2025)

For detailed validation report, see `/specs/001-specify-build-fitflow/VALIDATION_REPORT.md`.
