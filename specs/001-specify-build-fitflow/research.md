# Research: FitFlow Pro Technical Decisions

**Date**: 2025-10-02
**Feature**: FitFlow Pro - Evidence-Based Training Application

## Research Topics & Decisions

### 1. Background Timer on iOS

**Challenge**: iOS terminates background execution after ~30 seconds when app is backgrounded. Rest timers for compound lifts can be 3-5 minutes, requiring continuous background operation.

**Decision**: Silent Audio Session Workaround

**Rationale**:
- iOS allows background audio playback indefinitely (music apps use this)
- Playing a looping 1-second silent MP3 file keeps the app's background execution context alive
- Expo's `expo-av` provides `Audio.setAudioModeAsync()` to configure background audio
- Combine with interval timer and local notifications for completion alerts

**Alternatives Considered**:
1. **Background Tasks API** (`expo-background-fetch`)
   - **Rejected**: Limited to 15-minute minimum intervals; cannot provide second-by-second countdown
   - **Why**: Unsuitable for 60-second to 5-minute rest timers needing real-time feedback

2. **Background Geolocation**
   - **Rejected**: Permission-heavy workaround; drains battery; inappropriate for gym use case
   - **Why**: Requires location permissions user doesn't need; ethical concerns

3. **Server-Side Timer with Push Notifications**
   - **Rejected**: Requires network connectivity; defeats offline-first architecture
   - **Why**: Gym WiFi unreliable; adds server complexity for simple local feature

**Implementation Notes**:
- Generate `silence.mp3` (1 second) with: `ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 1 silence.mp3`
- Audio configuration:
  ```typescript
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    shouldDuckAndroid: false,
    allowsRecordingIOS: false,
  });
  ```
- Use `setInterval()` for countdown logic (reliable to ±50ms)
- Schedule local notifications at 10 seconds remaining and 0 seconds (completion)

**Sources**:
- Expo Audio documentation: https://docs.expo.dev/versions/latest/sdk/audio/
- iOS Background Execution Limits: Apple Developer Documentation
- Community workarounds: Stack Overflow discussions on React Native background timers

---

### 2. Offline-First Sync Architecture

**Challenge**: Reliable sync between mobile SQLite database and backend server with retry logic, exponential backoff, and conflict resolution when network is unstable.

**Decision**: Queue-Based Sync with Timestamp Conflict Resolution

**Rationale**:
- Queue persists in AsyncStorage; survives app restarts
- Exponential backoff prevents server overload during network issues (1s, 2s, 4s, 8s, 16s)
- Timestamp-based conflicts favor client during active workouts (phone is source of truth)
- Background sync non-blocking; never interrupts user interactions

**Alternatives Considered**:
1. **CRDTs (Conflict-Free Replicated Data Types)**
   - **Rejected**: Overkill for single-user fitness tracking; adds complexity
   - **Why**: No concurrent multi-user editing; timestamp resolution sufficient

2. **Operational Transformation**
   - **Rejected**: Designed for collaborative text editing; inapplicable to set logging
   - **Why**: Sets are immutable once logged (weight, reps, RIR never change post-logging)

3. **Server as Source of Truth**
   - **Rejected**: Requires online connectivity for workout logging; unacceptable
   - **Why**: Violates zero-data-loss tolerance; gym WiFi unreliable

**Implementation Notes**:
- SyncQueue class in `/src/services/sync/syncQueue.ts`
- Task structure:
  ```typescript
  interface SyncTask {
    id: string;
    type: 'set' | 'workout' | 'recovery' | 'vo2max';
    data: any;
    localId: number;
    retries: number;
    maxRetries: 5;
    createdAt: number;
  }
  ```
- Persist queue in AsyncStorage key `@fitflow/sync_queue`
- Process queue on app start, network reconnect, and after each local write
- Max 5 retries with exponential backoff; log failures for manual review

**Sources**:
- Martin Kleppmann's "Designing Data-Intensive Applications" (Chapter 5: Replication)
- Offline First design patterns: https://offlinefirst.org/
- PouchDB sync algorithm (inspiration for retry logic)

---

### 3. SQLite Performance Optimization

**Challenge**: Achieve < 5ms write latency for set logging during workouts to ensure instant UI feedback.

**Decision**: WAL Mode + Denormalization + Strategic Indexing

**Rationale**:
- **WAL (Write-Ahead Logging)**: Allows concurrent reads during writes; isolates write operations
- **Denormalization**: Duplicate exercise names, user data to avoid JOINs in hot paths
- **Strategic Indices**: Index `workout_id`, `user_id`, `synced` flag, all foreign keys
- **Transaction Batching**: Group multiple inserts (sets in a workout) into single transaction

**Alternatives Considered**:
1. **Fully Normalized Schema**
   - **Rejected**: JOIN operations add 2-5ms latency per query
   - **Why**: Logging a set requires instant feedback; cannot tolerate JOIN delays

2. **In-Memory Database (`:memory:`)**
   - **Rejected**: Data lost on app crash; unacceptable for zero-data-loss requirement
   - **Why**: Workouts can be interrupted (phone call, app crash); persistence critical

3. **IndexedDB (Web-based)**
   - **Rejected**: React Native uses native SQLite; IndexedDB unavailable
   - **Why**: Platform constraint; Expo SQLite is native

**Implementation Notes**:
- Enable WAL mode: `PRAGMA journal_mode=WAL;`
- Index creation:
  ```sql
  CREATE INDEX idx_sets_workout ON sets(workout_id);
  CREATE INDEX idx_sets_synced ON sets(synced);
  CREATE INDEX idx_workouts_user_date ON workouts(user_id, date);
  ```
- Denormalize exercise names into `sets` table for read performance
- Benchmark with `console.time('db_write')` during development
- Target: p95 < 5ms, p99 < 10ms

**Sources**:
- SQLite WAL documentation: https://www.sqlite.org/wal.html
- expo-sqlite performance best practices
- Benchmarking tests from production React Native apps (Reddit discussions)

---

### 4. Renaissance Periodization Volume Landmarks

**Challenge**: Define accurate MEV/MAV/MRV thresholds per muscle group for auto-regulation and volume tracking.

**Decision**: RP Guidelines + User-Specific Calibration

**Rationale**:
- MEV (Minimum Effective Volume): Lower threshold for muscle growth
- MAV (Maximum Adaptive Volume): Optimal volume for most users
- MRV (Maximum Recoverable Volume): Upper limit before overreaching
- Initial values from RP literature; adjust based on user's recovery patterns

**Volume Landmarks (Sets per Muscle Group per Week)**:

| Muscle Group | MEV | MAV | MRV |
|-------------|-----|-----|-----|
| Chest | 8 | 14 | 22 |
| Back (Lats) | 10 | 16 | 26 |
| Back (Traps) | 6 | 12 | 20 |
| Shoulders (Front Delts) | 4 | 8 | 14 |
| Shoulders (Side Delts) | 8 | 16 | 26 |
| Shoulders (Rear Delts) | 8 | 14 | 22 |
| Biceps | 6 | 12 | 20 |
| Triceps | 6 | 12 | 22 |
| Quads | 8 | 14 | 24 |
| Hamstrings | 6 | 12 | 20 |
| Glutes | 6 | 12 | 20 |
| Calves | 8 | 14 | 22 |
| Abs | 8 | 16 | 28 |

**Alternatives Considered**:
1. **Fixed Volume Prescriptions**
   - **Rejected**: Individual variation in recovery capacity is significant
   - **Why**: MEV for one user may be MRV for another; personalization critical

2. **AI-Based Volume Prediction**
   - **Rejected**: Insufficient data for ML model training; overcomplicated MVP
   - **Why**: Need 6-12 months of user data to train models; start with guidelines

**Implementation Notes**:
- Store landmarks in `/src/constants/volumeLandmarks.ts`
- Display as color-coded zones in analytics:
  - < MEV: Red (under-training)
  - MEV-MAV: Green (optimal)
  - MAV-MRV: Yellow (approaching limit)
  - > MRV: Red (overreaching)
- Adjust landmarks based on recovery assessment patterns (Phase 2 enhancement)

**Sources**:
- Dr. Mike Israetel's "The Renaissance Diet 2.0" (Chapter 12: Volume Landmarks)
- RP YouTube channel: Volume Landmark series
- Research: Schoenfeld et al. (2017) "Dose-response relationship between weekly resistance training volume and increases in muscle mass"

---

### 5. 1RM Estimation Formulas

**Challenge**: Accurately estimate one-rep max (1RM) from submaximal sets (weight × reps @ RIR) for strength progression tracking.

**Decision**: Epley Formula with RIR Adjustment

**Rationale**:
- **Epley Formula**: `1RM = weight × (1 + reps / 30)`
- **RIR Adjustment**: Subtract RIR from reps for conservative estimate
  - Example: 100kg × 8 reps @ RIR 2 → `100 × (1 + (8-2) / 30) = 120kg`
- Epley is accurate for 1-10 rep range; less reliable > 12 reps
- Conservative estimates prevent overestimating strength

**Alternatives Considered**:
1. **Brzycki Formula**: `1RM = weight / (1.0278 - 0.0278 × reps)`
   - **Rejected**: Less accurate for low rep ranges (1-5); RP focuses on 6-12 rep range
   - **Why**: Epley performs better in hypertrophy-focused training

2. **Direct 1RM Testing**
   - **Rejected**: Injury risk; CNS fatigue; inapplicable for hypertrophy training
   - **Why**: FitFlow Pro targets muscle growth, not powerlifting; 1RM testing counterproductive

3. **Wathan Formula**: `1RM = (100 × weight) / (48.8 + 53.8 × e^(-0.075 × reps))`
   - **Rejected**: Complex calculation; marginal accuracy improvement
   - **Why**: Epley is simpler, well-validated, sufficient for tracking trends

**Implementation Notes**:
- Function signature:
  ```typescript
  function calculateOneRepMax(weight: number, reps: number, rir: number): number {
    const effectiveReps = reps - rir;
    return weight * (1 + effectiveReps / 30);
  }
  ```
- Display estimated 1RM in workout summary and analytics dashboard
- Track 1RM trends over time (4-week, 12-week, all-time)
- Confidence interval ±5% for estimates from 6-10 reps; ±10% for 1-5 or 11-15 reps

**Sources**:
- Epley, B. (1985). "Poundage Chart". Boyd Epley Workout.
- Mayhew et al. (1992). "Accuracy of prediction equations for determining one repetition maximum bench press"
- RP Hypertrophy Guide: 1RM estimation for tracking

---

### 6. Raspberry Pi 5 Deployment

**Challenge**: Deploy Node.js backend on resource-constrained Raspberry Pi 5 (ARM64, 8GB RAM) with acceptable performance.

**Decision**: Fastify + better-sqlite3 + PM2 with Optimizations

**Rationale**:
- **Fastify**: 2-3x faster than Express; lower memory footprint
- **better-sqlite3**: Synchronous API eliminates callback overhead; native ARM64 bindings
- **PM2**: Process manager with clustering, auto-restart, monitoring
- **Optimizations**:
  - SQLite WAL mode (concurrent reads)
  - 64MB cache size (default 2MB insufficient)
  - Memory-mapped I/O for large datasets
  - Nginx reverse proxy for HTTPS and static file serving

**Alternatives Considered**:
1. **Express.js**
   - **Rejected**: Slower request handling; larger memory footprint
   - **Why**: Raspberry Pi 5 has limited resources; performance matters

2. **PostgreSQL Database**
   - **Rejected**: Heavier process; requires separate daemon; overkill for single-user
   - **Why**: SQLite is lightweight, embedded, sufficient for personal fitness tracking

3. **Docker Containerization**
   - **Considered**: Easier deployment, environment consistency
   - **Decision**: Optional; bare-metal deployment simpler for home server use case

**Implementation Notes**:
- Fastify server setup:
  ```typescript
  const server = Fastify({
    logger: { level: 'info', file: './logs/app.log' },
    trustProxy: true,
  });
  ```
- SQLite optimizations:
  ```typescript
  db.pragma('journal_mode = WAL');
  db.pragma('cache_size = -64000'); // 64MB
  db.pragma('mmap_size = 268435456'); // 256MB
  ```
- PM2 configuration:
  ```bash
  pm2 start dist/server.js --name fitflow-api --instances 1
  pm2 startup
  pm2 save
  ```
- Nginx reverse proxy for SSL termination (Let's Encrypt) and static files
- Automated backups with cron: daily SQLite `.backup` at 2 AM

**Sources**:
- Fastify benchmarks vs. Express: https://www.fastify.io/benchmarks/
- better-sqlite3 performance tuning: GitHub wiki
- Raspberry Pi 5 specifications and ARM64 optimization guides
- PM2 documentation: https://pm2.keymetrics.io/

---

## Summary of Decisions

| Topic | Decision | Key Benefit |
|-------|----------|-------------|
| Background Timer | Silent audio session workaround | Keeps iOS timer running indefinitely |
| Sync Architecture | Queue-based with exponential backoff | Reliable sync with retry logic; offline-first |
| SQLite Performance | WAL mode + denormalization + indices | < 5ms write latency; instant UI feedback |
| Volume Landmarks | RP guidelines (MEV/MAV/MRV per muscle) | Science-based auto-regulation and tracking |
| 1RM Estimation | Epley formula with RIR adjustment | Accurate strength tracking from submaximal sets |
| Pi 5 Deployment | Fastify + better-sqlite3 + PM2 | Resource-efficient backend for ARM64 server |

**Next Phase**: Design data model, generate API contracts, create failing contract tests
