# Integration Test - Quick Fixes Required

**URGENT**: 3 critical bugs blocking production deployment

---

## BUG-003: Exercise video_url Field Missing (5 minutes) ⚠️

**File**: `/home/asigator/fitness2025/backend/src/routes/exercises.ts`

**Line 88 - Add to GET /api/exercises schema**:
```typescript
description: { type: 'string' },
video_url: { type: ['string', 'null'] }, // ADD THIS LINE
```

**Line 170 - Add to GET /api/exercises/:id schema**:
```typescript
description: { type: 'string' },
video_url: { type: ['string', 'null'] }, // ADD THIS LINE
```

**Test After Fix**:
```bash
curl -s "http://localhost:3000/api/exercises?limit=1" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.[0].video_url'
# Should return: "https://www.youtube.com/watch?v=..." or null
```

---

## BUG-001: POST /api/sets Requires set_number (10 minutes) ⚠️

**File**: `/home/asigator/fitness2025/backend/src/routes/sets.ts`

**Current Schema** (BROKEN):
```typescript
required: ['workout_id', 'exercise_id', 'set_number', 'weight_kg', 'reps', 'rir', 'timestamp']
```

**Fixed Schema**:
```typescript
required: ['workout_id', 'exercise_id', 'weight_kg', 'reps', 'rir']
// set_number and timestamp should be optional (auto-calculated)
```

**Test After Fix**:
```bash
curl -X POST "http://localhost:3000/api/sets" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workout_id":1,"exercise_id":1,"weight_kg":100,"reps":8,"rir":2}'
# Should return: 201 Created (not 400 Bad Request)
```

---

## BUG-002: timestamp Must Be Unix Milliseconds (10 minutes) ⚠️

**File**: `/home/asigator/fitness2025/backend/src/routes/sets.ts`

**Current Schema** (STRICT):
```typescript
timestamp: { type: 'number' } // Only accepts integers
```

**Fixed Schema** (FLEXIBLE):
```typescript
timestamp: {
  oneOf: [
    { type: 'number' },                    // Unix milliseconds
    { type: 'string', format: 'date-time' } // ISO 8601
  ]
}
```

**Alternative** (Make Optional):
```typescript
// Remove 'timestamp' from required array
// Auto-set to Date.now() if not provided
```

**Test After Fix**:
```bash
# Test with ISO 8601 string
curl -X POST "http://localhost:3000/api/sets" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workout_id":1,"exercise_id":1,"weight_kg":100,"reps":8,"rir":2,"timestamp":"2025-10-04T19:30:00.000Z"}'
# Should return: 201 Created

# Test with Unix milliseconds
curl -X POST "http://localhost:3000/api/sets" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workout_id":1,"exercise_id":1,"weight_kg":100,"reps":8,"rir":2,"timestamp":1759598773000}'
# Should return: 201 Created
```

---

## Verification Checklist

After applying all 3 fixes:

```bash
# 1. Check exercise videos appear
curl "http://localhost:3000/api/exercises?limit=3" \
  -H "Authorization: Bearer TOKEN" | grep video_url
# Expected: See "video_url": "https://..." for some exercises

# 2. Check set logging works without set_number
curl -X POST "http://localhost:3000/api/sets" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workout_id":1,"exercise_id":1,"weight_kg":100,"reps":8,"rir":2}'
# Expected: 201 Created

# 3. Check timestamp flexibility
curl -X POST "http://localhost:3000/api/sets" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workout_id":1,"exercise_id":1,"weight_kg":100,"reps":8,"rir":2,"timestamp":"2025-10-04T19:30:00Z"}'
# Expected: 201 Created
```

---

## Estimated Fix Time

| Bug | Code Change Time | Testing | Total |
|-----|-----------------|---------|-------|
| video_url schema | 3 min | 2 min | 5 min |
| set_number optional | 5 min | 5 min | 10 min |
| timestamp format | 5 min | 5 min | 10 min |
| **TOTAL** | **13 min** | **12 min** | **25 min** |

---

## Files to Edit

1. `/home/asigator/fitness2025/backend/src/routes/exercises.ts` (2 locations)
2. `/home/asigator/fitness2025/backend/src/routes/sets.ts` (1 location)

---

## After Fixing

Run full integration test suite:
```bash
/tmp/integration_test.sh
```

Expected result: **25/25 tests PASS** ✅
