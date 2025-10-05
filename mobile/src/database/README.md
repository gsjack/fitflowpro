# Database Layer - Platform-Safe SQLite Wrapper

## Overview

The FitFlow database layer provides a platform-safe abstraction over `expo-sqlite` that gracefully handles:

1. **Web platform** - where SQLite is not available
2. **Native platforms (iOS/Android)** - where SQLite requires native modules
3. **Development builds** - where expo-sqlite may not be properly configured
4. **Expo Go** - where expo-sqlite has limitations

## Architecture

```
┌─────────────────────────────────────┐
│         Application Code            │
│  (screens, components, services)    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│         db.ts (Main API)            │
│  - initializeDatabase()             │
│  - getAllAsync()                    │
│  - runAsync()                       │
│  - withTransactionAsync()           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   sqliteWrapper.ts (Platform Safe)  │
│  - Conditional loading              │
│  - Error handling                   │
│  - Diagnostics                      │
└──────────────┬──────────────────────┘
               │
               ▼
        ┌──────┴──────┐
        │             │
        ▼             ▼
┌──────────┐   ┌──────────┐
│expo-sqlite│   │   null   │
│ (native)  │   │  (web)   │
└──────────┘   └──────────┘
```

## Files

### `sqliteWrapper.ts`

Platform-safe wrapper that conditionally loads `expo-sqlite`:

- **Exports**:
  - `openDatabaseAsync(name)` - Open database or return null
  - `isSQLiteAvailable()` - Check if SQLite is available
  - `getSQLiteLoadError()` - Get loading error if any
  - `getSQLiteDiagnostics()` - Platform and availability info

- **Features**:
  - Dynamic `require()` to avoid static bundler issues
  - Try-catch error handling for native module loading
  - Detailed error diagnostics for troubleshooting
  - Type-only imports to avoid runtime code

### `db.ts`

Main database API used by application code:

- **Exports**:
  - `initializeDatabase()` - Initialize DB or return null
  - `getAllAsync()` - Query multiple rows
  - `getFirstAsync()` - Query single row
  - `runAsync()` - Execute write query
  - `execAsync()` - Execute raw SQL
  - `withTransactionAsync()` - Execute transaction

- **Features**:
  - Schema initialization on first launch
  - Migration support
  - Performance monitoring (< 5ms write target)
  - Automatic fallback to API-only mode if SQLite unavailable

## Usage

### Basic Query

```typescript
import { getAllAsync, getFirstAsync } from '@/database/db';

// Query all workouts
const workouts = await getAllAsync<Workout>(
  'SELECT * FROM workouts WHERE user_id = ?',
  [userId]
);

// Query single user
const user = await getFirstAsync<User>(
  'SELECT * FROM users WHERE id = ?',
  [userId]
);
```

### Write Operations

```typescript
import { runAsync } from '@/database/db';

// Insert a set
const result = await runAsync(
  'INSERT INTO sets (workout_id, exercise_id, weight_kg, reps, rir) VALUES (?, ?, ?, ?, ?)',
  [workoutId, exerciseId, weight, reps, rir]
);

console.log('New set ID:', result.lastInsertRowId);
```

### Transactions

```typescript
import { withTransactionAsync } from '@/database/db';

await withTransactionAsync(async (tx) => {
  // Multiple operations execute atomically
  await tx.runAsync('UPDATE workouts SET status = ? WHERE id = ?', ['completed', workoutId]);
  await tx.runAsync('UPDATE sets SET synced = 0 WHERE workout_id = ?', [workoutId]);
});
```

### Check Availability

```typescript
import { initializeDatabase } from '@/database/db';
import { isSQLiteAvailable, getSQLiteDiagnostics } from '@/database/sqliteWrapper';

const db = await initializeDatabase();

if (!db) {
  console.log('SQLite not available - using API-only mode');
  console.log('Diagnostics:', getSQLiteDiagnostics());
}
```

## Platform Behavior

### Web Platform

- **Behavior**: Returns `null` from all database operations
- **Mode**: API-only (no local storage)
- **Reason**: `expo-sqlite` does not work in browsers

### iOS/Android (Development Build)

- **Behavior**: Loads `expo-sqlite` native module
- **Mode**: Offline-first with background sync
- **Requirements**:
  - Native development build required (not Expo Go)
  - Run `npx expo prebuild` after adding expo-sqlite
  - Rebuild app after configuration changes

### iOS/Android (Expo Go)

- **Behavior**: May fail to load native module
- **Mode**: Graceful fallback to API-only mode
- **Limitation**: Expo Go has limited native module support
- **Solution**: Use development build for full SQLite support

## Error Handling

The wrapper provides graceful error handling:

```typescript
import { getSQLiteLoadError, getSQLiteDiagnostics } from '@/database/sqliteWrapper';

const error = getSQLiteLoadError();
if (error) {
  console.error('SQLite load error:', error.message);

  if (error.message.includes('exposqlitenext')) {
    console.log('Native module not found - rebuild app with:');
    console.log('  npx expo prebuild');
    console.log('  npx expo run:ios (or run:android)');
  }
}
```

## Diagnostics

Get detailed platform information:

```typescript
import { getSQLiteDiagnostics } from '@/database/sqliteWrapper';

const diagnostics = getSQLiteDiagnostics();
console.log(diagnostics);
// Output:
// {
//   platform: 'ios',
//   available: true,
//   loadAttempted: true,
//   error: null
// }
```

## Troubleshooting

### Error: "exposqlitenext" module not found

**Cause**: Native modules not built or not available in Expo Go

**Solution**:
1. Exit Expo Go
2. Create development build:
   ```bash
   npx expo prebuild
   npx expo run:ios  # or run:android
   ```

### SQLite returns null on iOS/Android

**Diagnosis**:
```typescript
import { getSQLiteDiagnostics } from '@/database/sqliteWrapper';
console.log(getSQLiteDiagnostics());
```

**Common causes**:
- Running in Expo Go instead of development build
- Native modules not rebuilt after adding expo-sqlite
- Platform detection failing

### Performance Issues

The `db.ts` layer monitors write performance:

```typescript
// Automatically logs if write > 5ms
await runAsync('INSERT INTO sets ...', params);
// Console output if slow:
// [DB] Slow query detected: 12ms (target: < 5ms)
```

**Solutions**:
- Add indices for frequently queried columns
- Use transactions for bulk operations
- Denormalize data to avoid JOINs

## Testing

Run wrapper tests:

```bash
npm run test:unit src/database/__tests__/sqliteWrapper.test.ts
```

Tests validate:
- Platform detection (web vs native)
- Error handling (graceful degradation)
- Diagnostics accuracy
- No runtime errors on any platform

## API-Only Mode

When SQLite is unavailable, the app operates in **API-only mode**:

1. All database operations return empty results
2. Data is fetched from backend API on demand
3. No offline functionality
4. Background sync is skipped

This ensures the app never crashes due to missing SQLite, but provides a degraded experience on platforms without local storage support.
