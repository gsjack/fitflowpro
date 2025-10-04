# API Response Samples - Integration Testing

**Test Date**: October 4, 2025
**Test User**: integration_test_1759598773@example.com
**User ID**: 577

---

## Authentication Endpoints

### POST /api/auth/register ✅

**Request**:
```json
{
  "username": "integration_test_1759598773@example.com",
  "password": "TestPass123!",
  "age": 28
}
```

**Response** (201 Created):
```json
{
  "user_id": 577,
  "username": "integration_test_1759598773@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST /api/auth/login ✅

**Request**:
```json
{
  "username": "integration_test_1759598773@example.com",
  "password": "TestPass123!"
}
```

**Response** (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user_id": 577
}
```

---

## Program Endpoints

### GET /api/programs ✅

**Response** (200 OK):
```json
{
  "id": 440,
  "user_id": 577,
  "name": "Test 6-Day Split",
  "mesocycle_phase": "mav",
  "mesocycle_week": 1,
  "phase_start_date": "2025-10-04",
  "created_at": "2025-10-04T19:26:13.000Z"
}
```

### PATCH /api/programs/440/advance-phase ✅

**Response** (200 OK):
```json
{
  "previous_phase": "mev",
  "new_phase": "mav",
  "volume_multiplier": 1.2,
  "exercises_updated": 24
}
```

### GET /api/program-days?program_id=440 ✅

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "program_id": 440,
    "day_number": 1,
    "name": "Push Day A",
    "description": "Chest, shoulders, triceps"
  },
  {
    "id": 2,
    "program_id": 440,
    "day_number": 2,
    "name": "Pull Day A",
    "description": "Back, biceps, rear delts"
  },
  ...
]
```

---

## Exercise Endpoints

### GET /api/exercises?limit=2 ❌ (video_url missing)

**Current Response** (200 OK):
```json
{
  "exercises": [
    {
      "id": 1,
      "name": "Barbell Bench Press",
      "primary_muscle_group": "chest",
      "secondary_muscle_groups": ["front_delts", "triceps"],
      "equipment": "barbell",
      "movement_pattern": "compound",
      "difficulty": "intermediate",
      "default_sets": 4,
      "default_reps": "6-8",
      "default_rir": 2,
      "description": "Compound chest exercise"
      // ❌ video_url field MISSING (stripped by schema)
    },
    {
      "id": 4,
      "name": "Dumbbell Bench Press",
      "primary_muscle_group": "chest",
      "secondary_muscle_groups": ["front_delts", "triceps"],
      "equipment": "dumbbell",
      "movement_pattern": "compound",
      "difficulty": "intermediate",
      "default_sets": 4,
      "default_reps": "8-10",
      "default_rir": 2,
      "description": "Greater ROM than barbell"
      // ❌ video_url field MISSING
    }
  ],
  "count": 2
}
```

**Expected Response** (After Fix):
```json
{
  "exercises": [
    {
      "id": 1,
      "name": "Barbell Bench Press",
      "primary_muscle_group": "chest",
      "secondary_muscle_groups": ["front_delts", "triceps"],
      "equipment": "barbell",
      "movement_pattern": "compound",
      "difficulty": "intermediate",
      "default_sets": 4,
      "default_reps": "6-8",
      "default_rir": 2,
      "description": "Compound chest exercise",
      "video_url": "https://www.youtube.com/watch?v=rT7DgCr-3pg" // ✅ ADDED
    },
    {
      "id": 4,
      "name": "Dumbbell Bench Press",
      "primary_muscle_group": "chest",
      "secondary_muscle_groups": ["front_delts", "triceps"],
      "equipment": "dumbbell",
      "movement_pattern": "compound",
      "difficulty": "intermediate",
      "default_sets": 4,
      "default_reps": "8-10",
      "default_rir": 2,
      "description": "Greater ROM than barbell",
      "video_url": "https://www.youtube.com/watch?v=BYKScL2sgCs" // ✅ ADDED
    }
  ],
  "count": 2
}
```

**Database Query** (Verification):
```sql
SELECT id, name, video_url FROM exercises WHERE id IN (1, 4);
```

**Database Result**:
```
1|Barbell Bench Press|https://www.youtube.com/watch?v=rT7DgCr-3pg
4|Dumbbell Bench Press|https://www.youtube.com/watch?v=BYKScL2sgCs
```

**Analysis**: Database has video_url, but API strips it due to missing schema definition.

---

## Workout Endpoints

### POST /api/workouts ✅

**Request**:
```json
{
  "date": "2025-10-04",
  "program_day_id": 1
}
```

**Response** (201 Created):
```json
{
  "id": 663,
  "user_id": 577,
  "date": "2025-10-04",
  "program_day_id": 1,
  "status": "in_progress",
  "created_at": "2025-10-04T19:26:14.000Z"
}
```

### PATCH /api/workouts/663 ✅

**Request**:
```json
{
  "status": "completed"
}
```

**Response** (200 OK):
```json
{
  "id": 663,
  "user_id": 577,
  "date": "2025-10-04",
  "program_day_id": 1,
  "status": "completed",
  "completed_at": "2025-10-04T19:26:15.000Z"
}
```

---

## Set Endpoints

### POST /api/sets ❌ (set_number/timestamp required)

**Current Request** (FAILS):
```json
{
  "workout_id": 663,
  "exercise_id": 1,
  "weight_kg": 100.0,
  "reps": 8,
  "rir": 2
}
```

**Current Response** (400 Bad Request):
```json
{
  "statusCode": 400,
  "code": "FST_ERR_VALIDATION",
  "error": "Bad Request",
  "message": "body must have required property 'set_number'"
}
```

**Required Request** (With set_number):
```json
{
  "workout_id": 663,
  "exercise_id": 1,
  "set_number": 1,        // ❌ REQUIRED (undocumented)
  "weight_kg": 100.0,
  "reps": 8,
  "rir": 2
}
```

**Response** (400 Bad Request - timestamp required):
```json
{
  "statusCode": 400,
  "code": "FST_ERR_VALIDATION",
  "error": "Bad Request",
  "message": "body must have required property 'timestamp'"
}
```

**Required Request** (With timestamp):
```json
{
  "workout_id": 663,
  "exercise_id": 1,
  "set_number": 1,
  "weight_kg": 100.0,
  "reps": 8,
  "rir": 2,
  "timestamp": 1759598773000  // ❌ REQUIRED (Unix milliseconds)
}
```

**Response** (400 Bad Request - wrong timestamp format):
```json
{
  "statusCode": 400,
  "code": "FST_ERR_VALIDATION",
  "error": "Bad Request",
  "message": "body/timestamp must be integer"
}
```

**Failed Request** (ISO 8601 timestamp):
```json
{
  "workout_id": 663,
  "exercise_id": 1,
  "set_number": 1,
  "weight_kg": 100.0,
  "reps": 8,
  "rir": 2,
  "timestamp": "2025-10-04T19:30:00.000Z"  // ❌ NOT ACCEPTED (must be integer)
}
```

**Expected Response** (After Fix - 201 Created):
```json
{
  "id": 1234,
  "workout_id": 663,
  "exercise_id": 1,
  "set_number": 1,
  "weight_kg": 100.0,
  "reps": 8,
  "rir": 2,
  "estimated_1rm": 120.0,
  "timestamp": 1759598773000,
  "created_at": "2025-10-04T19:26:13.000Z"
}
```

---

## Analytics Endpoints

### GET /api/analytics/1rm-progression ✅

**Query**: `?exercise_id=1&start_date=2025-01-01&end_date=2025-12-31`

**Response** (200 OK - Empty for new user):
```json
[]
```

**Response** (With Data):
```json
[
  {
    "date": "2025-10-01",
    "estimated_1rm": 120.0
  },
  {
    "date": "2025-10-04",
    "estimated_1rm": 125.0
  }
]
```

### GET /api/analytics/volume-trends ⚠️

**Query**: `?muscle_group=chest&weeks=8`

**Response** (200 OK - Empty for new user):
```json
{
  "weeks": []
}
```

**Response** (With Data):
```json
{
  "weeks": [
    {
      "week_start": "2025-09-30",
      "muscle_groups": [
        {
          "muscle_group": "chest",
          "completed_sets": 12,
          "mev": 8,
          "mav": 14,
          "mrv": 22,
          "zone": "adequate"
        }
      ]
    }
  ]
}
```

### GET /api/analytics/consistency ✅

**Response** (200 OK):
```json
{
  "adherence_rate": 0.5,
  "avg_session_duration": 0,
  "total_workouts": 2
}
```

### GET /api/analytics/program-volume-analysis ✅

**Response** (200 OK):
```json
{
  "program_id": 440,
  "mesocycle_phase": "mav",
  "muscle_groups": [
    {
      "muscle_group": "chest",
      "planned_weekly_sets": 16,
      "mev": 8,
      "mav": 14,
      "mrv": 22,
      "zone": "optimal"
    },
    {
      "muscle_group": "lats",
      "planned_weekly_sets": 18,
      "mev": 10,
      "mav": 16,
      "mrv": 24,
      "zone": "optimal"
    }
  ]
}
```

---

## Error Handling Responses

### Duplicate Program Creation ✅

**Request**: POST /api/programs (user already has program)

**Response** (409 Conflict):
```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "User already has an active program"
}
```

### Invalid Weight ✅

**Request**: POST /api/sets with `weight_kg: -10`

**Response** (400 Bad Request):
```json
{
  "statusCode": 400,
  "code": "FST_ERR_VALIDATION",
  "error": "Bad Request",
  "message": "body/weight_kg must be >= 0"
}
```

### Extreme Weight ✅

**Request**: POST /api/sets with `weight_kg: 600`

**Response** (400 Bad Request):
```json
{
  "statusCode": 400,
  "code": "FST_ERR_VALIDATION",
  "error": "Bad Request",
  "message": "body/weight_kg must be <= 500"
}
```

### Invalid Exercise ID ✅

**Request**: GET /api/exercises/999999

**Response** (404 Not Found):
```json
{
  "error": "Exercise not found"
}
```

---

## Database State Verification

### Exercises with Video URLs

**Query**:
```sql
SELECT COUNT(*) as total,
       COUNT(video_url) as with_video,
       COUNT(CASE WHEN video_url IS NULL THEN 1 END) as without_video
FROM exercises;
```

**Result**:
```
total: 70
with_video: 15
without_video: 55
```

**Sample Exercises with Videos**:
```sql
SELECT id, name, video_url FROM exercises WHERE video_url IS NOT NULL LIMIT 5;
```

**Result**:
```
1|Barbell Bench Press|https://www.youtube.com/watch?v=rT7DgCr-3pg
2|Barbell Bench Press|https://www.youtube.com/watch?v=rT7DgCr-3pg
4|Dumbbell Bench Press|https://www.youtube.com/watch?v=BYKScL2sgCs
5|Incline Dumbbell Press|https://www.youtube.com/watch?v=SrqOu55lrYU
...
```

### Test User Program

**Query**:
```sql
SELECT * FROM programs WHERE user_id = 577;
```

**Result**:
```
id: 440
user_id: 577
name: Test 6-Day Split
mesocycle_phase: mav
mesocycle_week: 1
phase_start_date: 2025-10-04
created_at: 2025-10-04 19:26:13
```

### Test User Workouts

**Query**:
```sql
SELECT * FROM workouts WHERE user_id = 577;
```

**Result**:
```
id: 663
user_id: 577
date: 2025-10-04
program_day_id: 1
status: completed
completed_at: 2025-10-04 19:26:15
created_at: 2025-10-04 19:26:14
```

---

## API Contract Violations Summary

### BUG-001: POST /api/sets - set_number Required

**Schema Definition** (Current):
```typescript
required: ['workout_id', 'exercise_id', 'set_number', 'weight_kg', 'reps', 'rir', 'timestamp']
```

**Expected Schema** (Mobile Assumption):
```typescript
required: ['workout_id', 'exercise_id', 'weight_kg', 'reps', 'rir']
properties: {
  set_number: { type: 'number' },  // Optional, auto-calculate if missing
  timestamp: { type: 'number' },   // Optional, default to Date.now()
}
```

### BUG-002: timestamp Format Validation

**Current**: Only accepts Unix milliseconds integer
**Expected**: Accept ISO 8601 string OR Unix milliseconds

**Example Timestamps**:
- ✅ Accepted: `1759598773000` (Unix milliseconds)
- ❌ Rejected: `"2025-10-04T19:30:00.000Z"` (ISO 8601)
- ❌ Rejected: `"2025-10-04T19:30:00Z"` (ISO 8601 without milliseconds)

### BUG-003: video_url Field Stripped

**Service Layer** (exerciseService.ts):
```typescript
// ✅ SQL query includes video_url
SELECT id, name, ..., video_url FROM exercises
```

**Route Layer** (exercises.ts):
```typescript
// ❌ Schema definition omits video_url
response: {
  200: {
    properties: {
      id: { type: 'number' },
      name: { type: 'string' },
      // ... other fields ...
      // ❌ video_url: MISSING
    }
  }
}
```

**Result**: Fastify strips video_url from response even though database has it.

---

**Document Version**: 1.0
**Generated**: October 4, 2025
**Use**: API contract verification and debugging reference
