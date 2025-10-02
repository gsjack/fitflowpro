# CSV Export Service

This service provides data export functionality for FitFlow Pro mobile app.

## Features

- **Workout Export**: Export all workout data with sets, reps, weight, RIR, and volume
- **Analytics Export**: Export 1RM progression and volume trends
- **Recovery Export**: Export recovery assessments with auto-regulation data
- **CSV Format**: Properly escaped CSV with special character handling
- **Device Sharing**: Uses Expo Sharing API for cross-platform file sharing

## Usage

### Export Workouts

```typescript
import { exportAndShareWorkouts } from '../services/export/csvExporter';

// Export all workouts for user
await exportAndShareWorkouts(userId);

// Export workouts in date range
await exportAndShareWorkouts(userId, '2025-01-01', '2025-12-31');
```

### Export Recovery Data

```typescript
import { exportAndShareRecovery } from '../services/export/csvExporter';

// Export all recovery assessments
await exportAndShareRecovery(userId);

// Export recovery in date range
await exportAndShareRecovery(userId, '2025-01-01', '2025-12-31');
```

### Export Analytics

```typescript
import { exportAnalyticsCsv, shareCsvFile } from '../services/export/csvExporter';

// Export analytics for specific exercise and muscle group
const fileUri = await exportAnalyticsCsv(
  exerciseId: 1,
  muscleGroup: 'chest',
  startDate: '2025-01-01',
  endDate: '2025-12-31'
);

// Share the file
await shareCsvFile(fileUri);
```

## CSV Format

### Workouts CSV

```csv
Date,Exercise,Set,Reps,Weight (kg),RIR,Volume (kg)
2025-10-01,Barbell Bench Press,1,8,100,2,800
2025-10-01,Barbell Bench Press,2,7,100,1,700
```

### Recovery CSV

```csv
Date,Sleep Quality (1-5),Muscle Soreness (1-5),Mental Motivation (1-5),Total Score,Volume Adjustment
2025-10-01,4,3,5,12,none
2025-10-02,2,4,2,8,reduce_2_sets
```

### Analytics CSV

```csv
Date,Exercise,Estimated 1RM (kg),Weekly Volume (sets)
2025-10-01,Exercise 1,120,
2025-W40,chest,,14
```

## Special Character Handling

The CSV exporter properly escapes:
- **Commas**: Fields containing commas are quoted
- **Quotes**: Quotes are escaped as double quotes (`""`)
- **Newlines**: Fields with newlines are quoted

Example:
```typescript
// Exercise name: Romanian "RDL" Deadlift
// CSV output: "Romanian ""RDL"" Deadlift"
```

## Integration with SettingsScreen

```typescript
import { useState } from 'react';
import { Button } from 'react-native-paper';
import { exportAndShareWorkouts } from '../services/export/csvExporter';

function SettingsScreen() {
  const [exporting, setExporting] = useState(false);
  const userId = 1; // Get from auth context

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAndShareWorkouts(userId);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      mode="contained"
      onPress={handleExport}
      loading={exporting}
    >
      Export Workout Data (CSV)
    </Button>
  );
}
```
