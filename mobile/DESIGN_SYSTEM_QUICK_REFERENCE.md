# FitFlow Pro - Design System Quick Reference

**Quick lookup for developers implementing features**

---

## Colors (Import from `/src/theme/colors.ts`)

### Most Used Colors

```typescript
import { colors } from '../theme/colors';

// Backgrounds
colors.background.primary    // #0A0E27 - Main screen background
colors.background.secondary   // #1A1F3A - Card backgrounds
colors.background.tertiary    // #252B4A - Elevated cards, modals

// Actions & Interactive
colors.primary.main           // #4C6FFF - Primary buttons, active states
colors.success.main           // #00D9A3 - Complete button, positive metrics
colors.warning.main           // #FFB800 - Warning states, alerts
colors.error.main             // #FF4757 - Errors, cancelled states

// Text
colors.text.primary           // #FFFFFF - Main text
colors.text.secondary         // #A0A6C8 - Secondary text, labels
colors.text.tertiary          // #6B7299 - Captions, hints

// Dividers & Effects
colors.effects.divider        // #252B4A - Separator lines
colors.effects.overlay        // #0A0E2780 - Modal overlays
```

### Gradients

```typescript
import { gradients } from '../theme/colors';

gradients.primary             // ['#4C6FFF', '#7B3FFF'] - Hero elements
gradients.success             // ['#00D9A3', '#00A67D'] - Success states
gradients.card                // ['#1A1F3A', '#252B4A'] - Card backgrounds
gradients.hero                // ['#2A2F4A', '#1A1F3A'] - Hero sections
```

---

## Typography (Import from `/src/theme/typography.ts`)

### Font Sizes

```typescript
import { typography, spacing, borderRadius } from '../theme/typography';

// Hero numbers (weight, reps)
fontSize: 72, fontWeight: '700'  // typography.hero

// Large metrics
fontSize: 48, fontWeight: '700'  // typography.displayLarge
fontSize: 36, fontWeight: '600'  // typography.displayMedium

// Headers
fontSize: 32, fontWeight: '600'  // typography.headlineLarge
fontSize: 24, fontWeight: '600'  // typography.headlineMedium

// Body text
fontSize: 18, fontWeight: '400'  // typography.bodyLarge
fontSize: 16, fontWeight: '400'  // typography.bodyMedium
fontSize: 14, fontWeight: '400'  // typography.bodySmall

// Labels
fontSize: 12, fontWeight: '600', textTransform: 'uppercase'  // typography.labelLarge
```

### Spacing (8px Grid)

```typescript
spacing.xs    // 4px   - Tight spacing
spacing.sm    // 8px   - Small gaps
spacing.md    // 16px  - Standard spacing
spacing.lg    // 24px  - Section gaps
spacing.xl    // 32px  - Large gaps
spacing.xxl   // 48px  - Extra large
spacing.xxxl  // 64px  - Maximum
```

### Border Radius

```typescript
borderRadius.sm     // 8px   - Small elements
borderRadius.md     // 12px  - Standard
borderRadius.lg     // 16px  - Large cards
borderRadius.xl     // 24px  - Modals
borderRadius.round  // 999px - Fully rounded
```

---

## Common Patterns

### Card with Dark Background

```typescript
<Card style={styles.card}>
  <Card.Content>
    {/* Content */}
  </Card.Content>
</Card>

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
});
```

### Gradient Card

```typescript
import GradientCard from '../components/common/GradientCard';

<GradientCard
  gradient={gradients.primary as [string, string, ...string[]]}
  style={{ margin: spacing.lg }}
>
  <View style={{ padding: spacing.lg }}>
    {/* Content */}
  </View>
</GradientCard>
```

### Large Number Display

```typescript
<View style={styles.numberDisplay}>
  <TextInput
    value={value}
    onChangeText={setValue}
    keyboardType="decimal-pad"
    style={styles.numberInput}
    mode="flat"
    textColor={colors.primary.main}
  />
</View>

const styles = StyleSheet.create({
  numberDisplay: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberInput: {
    backgroundColor: 'transparent',
    fontSize: 48,
    fontWeight: '700',
    textAlign: 'center',
  },
});
```

### Primary Action Button

```typescript
<Button
  mode="contained"
  onPress={handleAction}
  style={styles.primaryButton}
  buttonColor={colors.primary.main}
  contentStyle={styles.buttonContent}
  labelStyle={styles.buttonLabel}
  icon="arrow-right"
>
  Continue
</Button>

const styles = StyleSheet.create({
  primaryButton: {
    minHeight: 56,
    borderRadius: borderRadius.md,
  },
  buttonContent: {
    height: 56,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
```

### Success Action Button

```typescript
<Button
  mode="contained"
  onPress={handleComplete}
  style={styles.successButton}
  buttonColor={colors.success.main}
  textColor="#000000"  // Black text for contrast
  icon="check-circle"
>
  Complete
</Button>

const styles = StyleSheet.create({
  successButton: {
    minHeight: 56,
    borderRadius: borderRadius.md,
  },
});
```

### Stat/Metric Display

```typescript
import StatCard from '../components/common/StatCard';

<StatCard
  label="Adherence Rate"
  value={85}
  unit="%"
  description="Workouts completed"
  color={colors.success.main}
  trend="up"
  trendValue="+5%"
/>
```

### Section Header

```typescript
<Text variant="labelMedium" style={styles.sectionLabel}>
  TODAY'S WORKOUT
</Text>

const styles = StyleSheet.create({
  sectionLabel: {
    color: colors.text.secondary,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
});
```

### Divider Line

```typescript
<Divider style={styles.divider} />

const styles = StyleSheet.create({
  divider: {
    backgroundColor: colors.effects.divider,
    marginVertical: spacing.md,
  },
});
```

---

## Component Elevation

### React Native Paper Elevation

```typescript
// Valid elevation values: 0, 1, 2, 3, 4, 5

<Card elevation={2}>...</Card>  // Subtle elevation
<Card elevation={4}>...</Card>  // Standard elevation
<Card elevation={5}>...</Card>  // High elevation (modals, timers)
```

---

## Status Colors

### Workout Status

```typescript
const getStatusColor = (status: string) => {
  switch (status) {
    case 'not_started': return colors.text.tertiary;     // Gray
    case 'in_progress':  return colors.primary.main;     // Blue
    case 'completed':    return colors.success.main;     // Green
    case 'cancelled':    return colors.error.main;       // Red
    default:             return colors.text.disabled;
  }
};
```

### Recovery Score

```typescript
const getRecoveryColor = (score: number) => {
  if (score >= 12) return colors.success.main;  // Good (12-15)
  if (score >= 9)  return colors.warning.main;  // Moderate (9-11)
  return colors.error.main;                      // Poor (3-8)
};
```

---

## Accessibility

### Minimum Touch Targets

```typescript
// Buttons
minHeight: 44,  // WCAG 2.1 AA minimum
minHeight: 56,  // Recommended for primary actions

// Icon buttons
size: 44,       // Minimum
size: 56,       // Recommended for workout logging
```

### Accessible Labels

```typescript
<Button
  accessibilityLabel="Complete set"
  accessibilityHint="Logs weight and reps, starts rest timer"
  accessibilityRole="button"
>
  Complete
</Button>
```

### Progress Indicators

```typescript
<ProgressBar
  progress={0.6}
  color={colors.primary.main}
  style={{ height: 8, borderRadius: 4 }}
  accessible={true}
  accessibilityRole="progressbar"
  accessibilityLabel={`Progress: ${60}%`}
  accessibilityValue={{ min: 0, max: 100, now: 60 }}
/>
```

---

## Common Mistakes to Avoid

❌ **Don't hardcode colors**
```typescript
backgroundColor: '#1A1F3A'  // BAD
```

✅ **Use theme colors**
```typescript
backgroundColor: colors.background.secondary  // GOOD
```

❌ **Don't use random spacing**
```typescript
margin: 17  // BAD
```

✅ **Use spacing scale**
```typescript
margin: spacing.lg  // GOOD (24px)
```

❌ **Don't use small buttons**
```typescript
<Button style={{ height: 32 }}>...</Button>  // BAD - too small
```

✅ **Use minimum 44pt touch targets**
```typescript
<Button style={{ minHeight: 44 }}>...</Button>  // GOOD
```

❌ **Don't forget gradient type assertion**
```typescript
<GradientCard gradient={gradients.primary}>  // BAD - TypeScript error
```

✅ **Assert gradient type**
```typescript
<GradientCard gradient={gradients.primary as [string, string, ...string[]]}>  // GOOD
```

---

## File Locations

```
/mobile/src/theme/
  ├── colors.ts           # Color palette, gradients, shadows
  ├── typography.ts       # Typography, spacing, border radius
  └── darkTheme.ts        # React Native Paper theme config

/mobile/src/components/common/
  ├── GradientCard.tsx    # Reusable gradient card
  └── StatCard.tsx        # Metric display card

/mobile/App.tsx           # Theme provider setup
```

---

## Import Cheat Sheet

```typescript
// Colors
import { colors, gradients } from '../theme/colors';

// Typography & Spacing
import { typography, spacing, borderRadius } from '../theme/typography';

// Theme (for provider)
import darkTheme from '../theme/darkTheme';

// Components
import GradientCard from '../components/common/GradientCard';
import StatCard from '../components/common/StatCard';

// React Native Paper
import { Card, Button, Text, TextInput, Divider } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
```

---

**Quick Tip**: Use VS Code snippets or IDE autocomplete to quickly access `colors.`, `spacing.`, and `borderRadius.` values!
