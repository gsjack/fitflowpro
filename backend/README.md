# FitFlow Pro - Backend API

**Version**: 1.0.0
**Tech Stack**: Fastify 4.26+, better-sqlite3, TypeScript, JWT auth
**Database**: SQLite with WAL mode

---

## Table of Contents

- [Getting Started](#getting-started)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication)
  - [Exercise Library](#exercise-library)
  - [Program Management](#program-management)
  - [Program Exercises](#program-exercises)
  - [Workouts & Sets](#workouts--sets)
  - [VO2max Cardio Tracking](#vo2max-cardio-tracking)
  - [Recovery Assessments](#recovery-assessments)
  - [Analytics](#analytics)
- [Authentication](#authentication-1)
- [Error Codes](#error-codes)
- [Development](#development)
- [Testing](#testing)

---

## Getting Started

### Prerequisites

- Node.js 20 LTS
- npm 10+
- SQLite3

### Installation

```bash
cd backend
npm install
```

### Database Setup

```bash
# Create database and apply schema
cd data
sqlite3 fitflow.db < ../src/database/schema.sql

# Enable WAL mode (required for performance)
sqlite3 fitflow.db "PRAGMA journal_mode=WAL;"

# Seed exercise library (optional but recommended)
cd ..
npm run seed
```

### Environment Variables

Create a `.env` file:

```env
PORT=3000
JWT_SECRET=your-secret-key-here
DATABASE_PATH=./data/fitflow.db
NODE_ENV=development
```

### Running the Server

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

Server runs on `http://localhost:3000` by default.

---

## API Endpoints

All endpoints (except auth) require JWT authentication via `Authorization: Bearer <token>` header.

### Authentication

#### Register User
```
POST /api/auth/register
```

**Request Body**:
```json
{
  "username": "user@example.com",
  "password": "SecurePass123!",
  "age": 28,
  "weight_kg": 75.0,
  "experience_level": "intermediate"
}
```

**Response** (201 Created):
```json
{
  "user_id": 1,
  "username": "user@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "age": 28,
  "weight_kg": 75.0,
  "experience_level": "intermediate"
}
```

**Validation**:
- `username`: Valid email format, unique
- `password`: Minimum 8 characters, mixed case + numbers
- `age`: 13-120 years (optional for registration, required for VO2max tracking)
- `experience_level`: One of: `beginner`, `intermediate`, `advanced`

---

#### Login
```
POST /api/auth/login
```

**Request Body**:
```json
{
  "username": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response** (200 OK):
```json
{
  "user_id": 1,
  "username": "user@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "age": 28,
  "weight_kg": 75.0,
  "experience_level": "intermediate"
}
```

**Errors**:
- `401`: Invalid credentials

---

### Exercise Library

#### List Exercises
```
GET /api/exercises
```

**Query Parameters**:
- `muscle_group` (optional): Filter by muscle group (e.g., `chest`, `back`)
- `equipment` (optional): Filter by equipment (e.g., `barbell`, `dumbbell`)
- `movement_pattern` (optional): `compound` or `isolation`
- `difficulty` (optional): `beginner`, `intermediate`, `advanced`
- `limit` (optional): Default 50, max 100
- `offset` (optional): Default 0

**Response** (200 OK):
```json
{
  "exercises": [
    {
      "id": 1,
      "name": "Barbell Bench Press",
      "muscle_groups": ["chest", "front_delts", "triceps"],
      "primary_muscle_group": "chest",
      "secondary_muscle_groups": ["front_delts", "triceps"],
      "equipment": "barbell",
      "movement_pattern": "compound",
      "difficulty": "intermediate",
      "description": "Compound pressing movement targeting chest, front delts, and triceps"
    }
  ],
  "total": 114,
  "limit": 50,
  "offset": 0
}
```

**Example**:
```bash
# Get all barbell chest exercises
curl http://localhost:3000/api/exercises?muscle_group=chest&equipment=barbell
```

---

#### Get Exercise by ID
```
GET /api/exercises/:id
```

**Response** (200 OK):
```json
{
  "id": 1,
  "name": "Barbell Bench Press",
  "muscle_groups": ["chest", "front_delts", "triceps"],
  "primary_muscle_group": "chest",
  "secondary_muscle_groups": ["front_delts", "triceps"],
  "equipment": "barbell",
  "movement_pattern": "compound",
  "difficulty": "intermediate",
  "description": "Compound pressing movement targeting chest, front delts, and triceps"
}
```

**Errors**:
- `404`: Exercise not found

---

### Program Management

#### Get User Program
```
GET /api/programs
```

**Response** (200 OK):
```json
{
  "id": 1,
  "user_id": 1,
  "name": "Upper/Lower Split",
  "mesocycle_phase": "mav",
  "mesocycle_week": 3,
  "phase_start_date": "2025-09-15",
  "created_at": "2025-09-01T10:00:00.000Z",
  "program_days": [
    {
      "id": 1,
      "program_id": 1,
      "day_number": 1,
      "name": "Push Day 1",
      "exercises": [
        {
          "id": 1,
          "program_day_id": 1,
          "exercise_id": 1,
          "exercise_name": "Barbell Bench Press",
          "sets": 4,
          "target_reps_min": 6,
          "target_reps_max": 10,
          "target_rir": 2,
          "order_index": 0
        }
      ]
    }
  ]
}
```

---

#### Advance Mesocycle Phase
```
PATCH /api/programs/:id/advance-phase
```

**Request Body** (optional):
```json
{
  "target_phase": "mrv",
  "manual": true
}
```

**Parameters**:
- `target_phase` (optional): Explicitly set phase (`mev`, `mav`, `mrv`, `deload`)
- `manual` (optional): If `false`, auto-advances to next phase in sequence

**Phase Sequence**:
1. MEV → MAV (1.2x volume)
2. MAV → MRV (1.15x volume)
3. MRV → Deload (0.5x volume)
4. Deload → MEV (2.0x volume)

**Response** (200 OK):
```json
{
  "program_id": 1,
  "old_phase": "mav",
  "new_phase": "mrv",
  "volume_multiplier": 1.15,
  "exercises_updated": 12,
  "mesocycle_week": 1
}
```

**Example Volume Progression**:
```
MEV: 10 sets → MAV: 12 sets → MRV: 14 sets → Deload: 7 sets → MEV: 14 sets
```

---

#### Get Program Volume Analysis
```
GET /api/programs/:id/volume
```

**Response** (200 OK):
```json
{
  "program_id": 1,
  "mesocycle_phase": "mav",
  "volume_by_muscle_group": {
    "chest": {
      "planned_sets": 12,
      "mev": 8,
      "mav": 14,
      "mrv": 22,
      "zone": "adequate"
    },
    "back": {
      "planned_sets": 16,
      "mev": 10,
      "mav": 18,
      "mrv": 28,
      "zone": "optimal"
    }
  },
  "warnings": []
}
```

**Zone Classifications**:
- `below_mev`: Planned sets < MEV (under-training)
- `adequate`: MEV ≤ planned < MAV (maintenance)
- `optimal`: MAV ≤ planned ≤ MRV (hypertrophy zone)
- `above_mrv`: Planned sets > MRV (overtraining risk)

---

### Program Exercises

#### List Program Exercises
```
GET /api/program-exercises
```

**Query Parameters**:
- `program_day_id` (optional): Filter by program day
- `exercise_id` (optional): Filter by exercise

**Response** (200 OK):
```json
{
  "program_exercises": [
    {
      "id": 1,
      "program_day_id": 1,
      "exercise_id": 1,
      "exercise_name": "Barbell Bench Press",
      "sets": 4,
      "target_reps_min": 6,
      "target_reps_max": 10,
      "target_rir": 2,
      "order_index": 0
    }
  ]
}
```

---

#### Add Exercise to Program
```
POST /api/program-exercises
```

**Request Body**:
```json
{
  "program_day_id": 1,
  "exercise_id": 5,
  "sets": 3,
  "target_reps_min": 8,
  "target_reps_max": 12,
  "target_rir": 2,
  "order_index": 2
}
```

**Response** (201 Created):
```json
{
  "id": 15,
  "program_day_id": 1,
  "exercise_id": 5,
  "exercise_name": "Dumbbell Flyes",
  "sets": 3,
  "target_reps_min": 8,
  "target_reps_max": 12,
  "target_rir": 2,
  "order_index": 2,
  "volume_warning": {
    "message": "Adding this exercise will exceed MRV for chest (24 > 22 sets)",
    "current_volume": {
      "chest": 21
    },
    "new_volume": {
      "chest": 24
    }
  }
}
```

**Volume Warning Logic**:
- Full set counting: 1 set Bench Press = +1 chest, +1 front_delts, +1 triceps
- Warns when adding exercise exceeds MRV or drops below MEV

---

#### Update Program Exercise
```
PATCH /api/program-exercises/:id
```

**Request Body** (all fields optional):
```json
{
  "sets": 5,
  "target_reps_min": 6,
  "target_reps_max": 8,
  "target_rir": 1
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "program_day_id": 1,
  "exercise_id": 1,
  "sets": 5,
  "target_reps_min": 6,
  "target_reps_max": 8,
  "target_rir": 1,
  "volume_warning": null
}
```

---

#### Delete Program Exercise
```
DELETE /api/program-exercises/:id
```

**Response** (200 OK):
```json
{
  "message": "Program exercise deleted",
  "volume_warning": {
    "message": "Removing this exercise drops chest below MEV (6 < 8 sets)",
    "new_volume": {
      "chest": 6
    }
  }
}
```

---

#### Swap Exercise
```
PUT /api/program-exercises/:id/swap
```

**Request Body**:
```json
{
  "new_exercise_id": 10
}
```

**Behavior**:
- Replaces exercise while preserving sets, reps, RIR, and order
- Example: Replace Barbell Bench Press with Dumbbell Bench Press

**Response** (200 OK):
```json
{
  "id": 1,
  "program_day_id": 1,
  "exercise_id": 10,
  "exercise_name": "Dumbbell Bench Press",
  "sets": 4,
  "target_reps_min": 6,
  "target_reps_max": 10,
  "target_rir": 2,
  "order_index": 0,
  "volume_warning": null
}
```

---

#### Batch Reorder Exercises
```
PATCH /api/program-exercises/batch-reorder
```

**Request Body**:
```json
{
  "program_day_id": 1,
  "exercise_order": [3, 1, 2]
}
```

**Behavior**:
- Reorders exercises within a program day
- `exercise_order` array contains program_exercise IDs in new order
- Updates `order_index` field for each exercise

**Response** (200 OK):
```json
{
  "message": "Exercises reordered successfully",
  "program_day_id": 1,
  "exercises_updated": 3
}
```

---

### Workouts & Sets

#### Create Workout
```
POST /api/workouts
```

**Request Body**:
```json
{
  "program_day_id": 1,
  "date": "2025-10-04"
}
```

**Response** (201 Created):
```json
{
  "workout_id": 42,
  "user_id": 1,
  "program_day_id": 1,
  "date": "2025-10-04",
  "status": "not_started",
  "created_at": "2025-10-04T10:30:00.000Z"
}
```

---

#### Log Set
```
POST /api/sets
```

**Request Body**:
```json
{
  "workout_id": 42,
  "exercise_id": 1,
  "weight_kg": 100.0,
  "reps": 8,
  "rir": 2
}
```

**Response** (201 Created):
```json
{
  "set_id": 123,
  "workout_id": 42,
  "exercise_id": 1,
  "weight_kg": 100.0,
  "reps": 8,
  "rir": 2,
  "estimated_1rm": 120.0,
  "timestamp": "2025-10-04T10:35:00.000Z",
  "synced": 1
}
```

**1RM Calculation** (Epley formula with RIR adjustment):
```
1RM = weight × (1 + (reps - rir) / 30)
Example: 100 × (1 + (8 - 2) / 30) = 100 × 1.2 = 120kg
```

---

### VO2max Cardio Tracking

#### Create VO2max Session
```
POST /api/vo2max-sessions
```

**Request Body**:
```json
{
  "workout_id": 42,
  "protocol": "norwegian_4x4",
  "duration_minutes": 28,
  "average_hr": 165,
  "max_hr": 185,
  "intervals_completed": 4,
  "notes": "Felt strong, hit all intervals"
}
```

**Protocols**:
- `steady_state`: Continuous moderate intensity
- `intervals`: Generic interval training
- `norwegian_4x4`: 4x4 protocol (4 intervals × 4min work + 3min recovery)

**Response** (201 Created):
```json
{
  "id": 5,
  "user_id": 1,
  "workout_id": 42,
  "date": "2025-10-04",
  "protocol": "norwegian_4x4",
  "duration_minutes": 28,
  "average_hr": 165,
  "max_hr": 185,
  "vo2max_estimated": 48.96,
  "intervals_completed": 4,
  "notes": "Felt strong, hit all intervals",
  "created_at": "2025-10-04T11:00:00.000Z"
}
```

**VO2max Estimation** (Cooper formula):
```
VO2max = 15.3 × (max_hr / resting_hr)
where:
  max_hr = 220 - age
  resting_hr = 60 (standard assumption)

Example: Age 28
  max_hr = 220 - 28 = 192 bpm
  VO2max = 15.3 × (192 / 60) = 48.96 ml/kg/min
```

**Requirements**:
- User must have `age` set in profile (required for Cooper formula)
- Heart rate: 60-220 bpm
- Duration: 10-120 minutes

---

#### List VO2max Sessions
```
GET /api/vo2max-sessions
```

**Query Parameters**:
- `start_date` (optional): Filter from date (YYYY-MM-DD)
- `end_date` (optional): Filter to date (YYYY-MM-DD)
- `protocol` (optional): Filter by protocol
- `limit` (optional): Default 50
- `offset` (optional): Default 0

**Response** (200 OK):
```json
{
  "sessions": [
    {
      "id": 5,
      "user_id": 1,
      "workout_id": 42,
      "date": "2025-10-04",
      "protocol": "norwegian_4x4",
      "duration_minutes": 28,
      "average_hr": 165,
      "max_hr": 185,
      "vo2max_estimated": 48.96,
      "intervals_completed": 4,
      "notes": "Felt strong, hit all intervals"
    }
  ],
  "total": 12,
  "limit": 50,
  "offset": 0
}
```

---

#### Get VO2max Progression
```
GET /api/vo2max-sessions/progression
```

**Query Parameters**:
- `weeks` (optional): Default 12

**Response** (200 OK):
```json
{
  "progression": [
    {
      "week": "2025-W40",
      "avg_vo2max": 48.5,
      "avg_hr": 164,
      "session_count": 2
    },
    {
      "week": "2025-W39",
      "avg_vo2max": 47.2,
      "avg_hr": 166,
      "session_count": 1
    }
  ],
  "total_sessions": 12,
  "latest_vo2max": 48.96,
  "improvement_percentage": 12.5
}
```

---

### Recovery Assessments

#### Submit Recovery Assessment
```
POST /api/recovery-assessments
```

**Request Body**:
```json
{
  "sleep_quality": 4,
  "muscle_soreness": 2,
  "motivation": 4,
  "notes": "Slept well, feeling ready to train"
}
```

**Scoring** (1-5 scale for each question):
- `sleep_quality`: 1 (poor) to 5 (excellent)
- `muscle_soreness`: 1 (very sore) to 5 (no soreness)
- `motivation`: 1 (low) to 5 (high)

**Recovery Score**: Sum of 3 questions (3-15 total)

**Response** (201 Created):
```json
{
  "id": 10,
  "user_id": 1,
  "date": "2025-10-04",
  "sleep_quality": 4,
  "muscle_soreness": 2,
  "motivation": 4,
  "recovery_score": 10,
  "recommendation": "reduce_1_set",
  "notes": "Slept well, feeling ready to train",
  "created_at": "2025-10-04T08:00:00.000Z"
}
```

**Auto-Regulation Recommendations**:
- **12-15**: `no_adjustment` (good recovery)
- **9-11**: `reduce_1_set` (moderate fatigue)
- **6-8**: `reduce_2_sets` (high fatigue)
- **3-5**: `rest_day` (severe fatigue)

---

### Analytics

#### Current Week Volume
```
GET /api/analytics/volume-current-week
```

**Response** (200 OK):
```json
{
  "week_start": "2025-09-30",
  "week_end": "2025-10-06",
  "volume_by_muscle_group": {
    "chest": {
      "completed_sets": 12,
      "planned_sets": 14,
      "mev": 8,
      "mav": 14,
      "mrv": 22,
      "zone": "adequate",
      "completion_percentage": 85.7
    },
    "back": {
      "completed_sets": 18,
      "planned_sets": 18,
      "mev": 10,
      "mav": 18,
      "mrv": 28,
      "zone": "optimal",
      "completion_percentage": 100.0
    }
  },
  "total_sets_completed": 48,
  "total_sets_planned": 56,
  "overall_completion": 85.7
}
```

---

#### Volume Trends
```
GET /api/analytics/volume-trends
```

**Query Parameters**:
- `weeks` (optional): Default 8
- `muscle_group` (optional): Filter by single muscle group

**Response** (200 OK):
```json
{
  "weeks": 8,
  "muscle_group_filter": null,
  "trends": [
    {
      "week": "2025-W40",
      "week_start": "2025-09-30",
      "week_end": "2025-10-06",
      "volume_by_muscle_group": {
        "chest": {
          "completed_sets": 12,
          "zone": "adequate"
        },
        "back": {
          "completed_sets": 18,
          "zone": "optimal"
        }
      }
    }
  ]
}
```

---

#### Program Volume Analysis
```
GET /api/analytics/program-volume-analysis
```

**Response** (200 OK):
```json
{
  "program_id": 1,
  "mesocycle_phase": "mav",
  "volume_by_muscle_group": {
    "chest": {
      "planned_sets": 14,
      "mev": 8,
      "mav": 14,
      "mrv": 22,
      "zone": "optimal",
      "status": "on_track"
    }
  },
  "warnings": [
    {
      "muscle_group": "triceps",
      "message": "Planned volume exceeds MRV (26 > 24 sets)",
      "planned_sets": 26,
      "mrv": 24
    }
  ],
  "summary": {
    "total_muscle_groups": 8,
    "optimal_zones": 5,
    "adequate_zones": 2,
    "warnings": 1
  }
}
```

---

#### 1RM Progression
```
GET /api/analytics/1rm-progression
```

**Query Parameters**:
- `exercise_id` (required): Exercise to track
- `weeks` (optional): Default 12

**Response** (200 OK):
```json
{
  "exercise_id": 1,
  "exercise_name": "Barbell Bench Press",
  "weeks": 12,
  "progression": [
    {
      "week": "2025-W40",
      "best_1rm": 122.5,
      "set_count": 8
    },
    {
      "week": "2025-W39",
      "best_1rm": 120.0,
      "set_count": 12
    }
  ],
  "latest_1rm": 122.5,
  "starting_1rm": 110.0,
  "improvement_kg": 12.5,
  "improvement_percentage": 11.4
}
```

---

## Authentication

All endpoints (except `/api/auth/register` and `/api/auth/login`) require JWT authentication.

### Using JWT Token

**Header**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example cURL**:
```bash
curl -X GET http://localhost:3000/api/exercises \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Token Expiration**: 30 days (home server use case)

**Token Payload**:
```json
{
  "user_id": 1,
  "username": "user@example.com",
  "iat": 1696406400,
  "exp": 1698998400
}
```

---

## Error Codes

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request body or parameters |
| 401 | Unauthorized | Missing or invalid JWT token |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists (e.g., duplicate username) |
| 500 | Internal Server Error | Server error |

### Error Response Format

```json
{
  "error": "Validation error",
  "message": "Username already exists",
  "statusCode": 409
}
```

### Common Errors

**401 Unauthorized**:
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing JWT token",
  "statusCode": 401
}
```

**400 Bad Request** (Validation):
```json
{
  "error": "Validation error",
  "message": "body/password must be at least 8 characters",
  "statusCode": 400
}
```

**404 Not Found**:
```json
{
  "error": "Not Found",
  "message": "Exercise not found",
  "statusCode": 404
}
```

**500 Internal Server Error**:
```json
{
  "error": "Internal Server Error",
  "message": "Database query failed",
  "statusCode": 500
}
```

---

## Development

### Project Structure

```
backend/
├── src/
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic
│   ├── middleware/      # Auth, validation, error handling
│   ├── database/        # Schema, migrations, seeds
│   └── server.ts        # Fastify app setup
├── tests/
│   ├── unit/           # Service unit tests
│   ├── contract/       # API contract tests
│   └── integration/    # End-to-end tests
├── data/               # SQLite database files
└── package.json
```

### Running in Development

```bash
npm run dev
```

Server runs with hot reload via `tsx watch`.

### Code Quality

```bash
# TypeScript compilation check
npm run build

# Linting
npm run lint

# Format code
npm run format
```

---

## Testing

### Unit Tests

Test service logic in isolation:

```bash
npm run test:unit
```

**Coverage Requirements**: ≥80% overall, 100% for critical paths

### Contract Tests

Validate API contracts (request/response schemas):

```bash
npm run test:contract
```

**Example**:
```typescript
test('POST /api/sets returns 201 with set data', async () => {
  const response = await request(app)
    .post('/api/sets')
    .set('Authorization', `Bearer ${token}`)
    .send({
      workout_id: 1,
      exercise_id: 1,
      weight_kg: 100,
      reps: 8,
      rir: 2
    });

  expect(response.status).toBe(201);
  expect(response.body).toHaveProperty('set_id');
  expect(response.body.estimated_1rm).toBe(120.0);
});
```

### Integration Tests

Test full workflows end-to-end:

```bash
npm run test:integration
```

### Performance Tests

Benchmark database queries:

```bash
npm run test:performance
```

**Requirements**:
- SQLite writes: < 5ms (p95)
- API responses: < 200ms (p95)

---

## Deployment

### Raspberry Pi 5 Setup

See `/DEPLOYMENT.md` for full deployment guide.

**Quick Start**:

```bash
# Install dependencies
sudo apt update && sudo apt install -y nodejs npm sqlite3

# Build production bundle
npm run build

# Start with PM2
pm2 start dist/server.js --name fitflow-api
pm2 startup
pm2 save
```

### SQLite Optimizations

Applied in `src/database/db.ts`:

```typescript
db.pragma('journal_mode = WAL');       // Concurrent reads
db.pragma('cache_size = -64000');      // 64MB cache
db.pragma('mmap_size = 268435456');    // 256MB memory-mapped I/O
```

### Nginx Reverse Proxy

Example configuration:

```nginx
server {
  listen 443 ssl;
  server_name fitflow.yourdomain.com;

  ssl_certificate /etc/letsencrypt/live/fitflow.yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/fitflow.yourdomain.com/privkey.pem;

  location /api {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

---

## License

MIT

## Contact

For issues or questions, see project repository.
