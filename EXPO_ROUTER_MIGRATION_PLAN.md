# Expo Router Migration Plan - Web Support Solution

**Date**: October 4, 2025
**Goal**: Migrate from React Navigation to Expo Router for native web support
**Estimated Time**: 10-15 hours (autonomous execution)
**Validation**: Chrome DevTools MCP screenshot verification

---

## Executive Summary

**Problem**: react-native-screens breaks web builds (requireNativeComponent unavailable)
**Solution**: Migrate to Expo Router (file-based routing with built-in web support)
**Approach**: Incremental migration with parallel old/new routes during transition
**Risk Level**: Medium-High (major architectural change)
**Rollback Strategy**: Git branches + feature flags

---

## Phase 1: Planning & Preparation (30 min)

### 1.1 Current Architecture Analysis

**Existing Navigation Structure** (from App.tsx):
```
App
├── AuthNavigator (Stack)
│   ├── Login
│   └── Register
└── MainNavigator (BottomTabs)
    ├── Dashboard
    ├── Workout
    ├── VO2maxWorkout
    ├── Analytics
    ├── Planner
    └── Settings
```

**Navigation Features Used**:
- Stack navigation (auth flow)
- Bottom tab navigation (main app)
- Deep linking (potentially)
- Navigation params
- Navigation guards (auth state)

### 1.2 Expo Router Equivalent Architecture

**New Structure** (file-based):
```
app/
├── _layout.tsx                    # Root layout (auth check)
├── (auth)/
│   ├── _layout.tsx               # Auth stack layout
│   ├── login.tsx                 # /login
│   └── register.tsx              # /register
└── (tabs)/
    ├── _layout.tsx               # Bottom tab layout
    ├── index.tsx                 # /dashboard (home)
    ├── workout.tsx               # /workout
    ├── vo2max-workout.tsx        # /vo2max-workout
    ├── analytics.tsx             # /analytics
    ├── planner.tsx               # /planner
    └── settings.tsx              # /settings
```

**Key Differences**:
- ✅ File paths = URL routes (automatic)
- ✅ Layouts replace Navigators
- ✅ Groups (auth)/(tabs) don't show in URL
- ✅ index.tsx = default route for group

### 1.3 Migration Strategy

**Approach**: Parallel dual-mode migration
1. Install Expo Router alongside React Navigation
2. Create new app/ directory structure
3. Gradually move screens while keeping old App.tsx working
4. Switch entry point when all screens migrated
5. Remove React Navigation dependencies

**Why this approach**:
- ✅ No downtime - app keeps working during migration
- ✅ Incremental testing - validate each screen as we go
- ✅ Easy rollback - just revert entry point change
- ✅ Low risk - old code untouched until final switch

---

## Phase 2: Expo Router Installation (1 hour)

### 2.1 Package Installation

```bash
cd /home/asigator/fitness2025/mobile

# Install Expo Router
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar

# Note: react-native-screens already installed (will be used differently by Expo Router)
```

### 2.2 Configuration Updates

**app.json** changes:
```json
{
  "expo": {
    "scheme": "fitflow",
    "web": {
      "bundler": "metro"  // Change from webpack to metro
    },
    "plugins": [
      "expo-router"
    ]
  }
}
```

**package.json** changes:
```json
{
  "main": "expo-router/entry",  // Change from node_modules/expo/AppEntry.js
  "scripts": {
    "start": "expo start",
    "web": "expo start --web"
  }
}
```

**Create metro.config.js** (if not exists):
```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
```

### 2.3 TypeScript Configuration

**tsconfig.json** updates:
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## Phase 3: Directory Structure Setup (30 min)

### 3.1 Create app/ Directory

```bash
mkdir -p app/(auth)
mkdir -p app/(tabs)
```

### 3.2 Create Layout Files

**app/_layout.tsx** (Root):
```tsx
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { PaperProvider } from 'react-native-paper';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/services/api/queryClient';
import { useAuthStore } from '../src/stores/authStore';

export default function RootLayout() {
  const { isAuthenticated } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to home if authenticated
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments]);

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <Slot />
      </PaperProvider>
    </QueryClientProvider>
  );
}
```

**app/(auth)/_layout.tsx** (Auth Stack):
```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
```

**app/(tabs)/_layout.tsx** (Bottom Tabs):
```tsx
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: {
          backgroundColor: colors.background.secondary,
          borderTopColor: colors.effects.divider,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="dumbbell" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-bar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: 'Planner',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

---

## Phase 4: Screen Migration (6 hours)

### 4.1 Migration Order (Low to High Complexity)

1. **Settings** (30 min) - Simplest, no navigation dependencies
2. **Login** (30 min) - Auth flow, simple form
3. **Register** (30 min) - Auth flow, simple form
4. **Dashboard** (1h) - Query hooks, navigation to workout
5. **Analytics** (1h) - Charts, time range state
6. **Planner** (1.5h) - Complex state, modals, drag-and-drop
7. **Workout** (1.5h) - Most complex, timers, set logging, modals
8. **VO2maxWorkout** (1h) - Timer, HR tracking, intervals

### 4.2 Screen Migration Template

**For each screen**:
1. Copy from `/src/screens/XScreen.tsx` to `/app/(tabs)/x.tsx` (or (auth) for login/register)
2. Update imports:
   ```tsx
   // OLD
   import { useNavigation } from '@react-navigation/native';

   // NEW
   import { useRouter, useLocalSearchParams } from 'expo-router';
   ```
3. Replace navigation calls:
   ```tsx
   // OLD
   navigation.navigate('Workout', { workoutId: 123 });

   // NEW
   router.push({ pathname: '/workout', params: { workoutId: 123 } });
   ```
4. Update params access:
   ```tsx
   // OLD
   const { workoutId } = route.params;

   // NEW
   const { workoutId } = useLocalSearchParams();
   ```
5. Remove navigation prop from component signature
6. Test in isolation

### 4.3 Special Cases

**VO2maxWorkout** (modal screen):
```tsx
// app/(tabs)/_layout.tsx
<Tabs.Screen
  name="vo2max-workout"
  options={{
    href: null,  // Hide from tab bar
  }}
/>

// Navigate to it:
router.push('/vo2max-workout');
```

**Modals** (e.g., ExerciseSelectionModal):
- Keep as components (not routes)
- Use state for visibility
- No navigation changes needed

---

## Phase 5: Navigation Code Updates (2 hours)

### 5.1 Update Navigation Calls Throughout Codebase

**Files to scan**:
```bash
grep -r "navigation.navigate\|navigation.push\|navigation.goBack" src/
```

**Replace patterns**:
```tsx
// OLD: navigation.navigate('ScreenName', { param: value })
// NEW: router.push({ pathname: '/screen-name', params: { param: value } })

// OLD: navigation.goBack()
// NEW: router.back()

// OLD: navigation.replace('ScreenName')
// NEW: router.replace('/screen-name')
```

**Common files to update**:
- `/src/components/dashboard/*` - Navigate to workout
- `/src/components/workout/*` - Complete workout, go back
- `/src/components/planner/*` - Navigate between screens
- `/src/stores/workoutStore.ts` - Start workout navigation
- `/src/stores/authStore.ts` - Login/logout redirects

### 5.2 Deep Linking Updates

**app.json**:
```json
{
  "expo": {
    "scheme": "fitflow",
    "web": {
      "linking": {
        "prefixes": ["https://fitflow.app", "fitflow://"]
      }
    }
  }
}
```

Expo Router handles deep linking automatically based on file structure.

---

## Phase 6: Entry Point Switch (30 min)

### 6.1 Update package.json

```json
{
  "main": "expo-router/entry"
}
```

### 6.2 Create app.json Plugin

```json
{
  "expo": {
    "plugins": ["expo-router"]
  }
}
```

### 6.3 Test Full App Flow

1. Clear cache: `npx expo start --clear`
2. Test auth flow: Login → Dashboard
3. Test all tabs: Dashboard, Workout, Analytics, Planner, Settings
4. Test deep links: Open workout from dashboard
5. Test logout: Should redirect to login

---

## Phase 7: Cleanup (1 hour)

### 7.1 Remove React Navigation Dependencies

```bash
npm uninstall @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
```

### 7.2 Delete Old Files

```bash
# Backup first
mv App.tsx App.tsx.backup

# Remove old navigation setup files (if any separate files exist)
# Keep for reference until fully validated
```

### 7.3 Update TypeScript Types

Remove navigation prop types from screen components (no longer needed).

---

## Phase 8: Web Testing & Validation (2 hours)

### 8.1 Web Build Test

```bash
npx expo start --web --clear
```

**Validation checklist**:
- ✅ App loads without errors
- ✅ Login screen renders
- ✅ Can navigate to register
- ✅ After login, dashboard loads
- ✅ All tabs clickable and functional
- ✅ URL changes when navigating (/dashboard, /workout, etc.)
- ✅ Browser back button works
- ✅ Refresh maintains state

### 8.2 Chrome DevTools MCP Validation

**Capture screenshots** of each screen:
```bash
# Login screen
chrome-devtools://screenshot --url=http://localhost:8081/login --output=/tmp/web-login.png

# Dashboard
chrome-devtools://screenshot --url=http://localhost:8081/ --output=/tmp/web-dashboard.png

# Workout
chrome-devtools://screenshot --url=http://localhost:8081/workout --output=/tmp/web-workout.png

# Analytics
chrome-devtools://screenshot --url=http://localhost:8081/analytics --output=/tmp/web-analytics.png

# Planner
chrome-devtools://screenshot --url=http://localhost:8081/planner --output=/tmp/web-planner.png

# Settings
chrome-devtools://screenshot --url=http://localhost:8081/settings --output=/tmp/web-settings.png
```

**READ each screenshot** to verify:
- No blank white pages
- UI elements visible
- Layout matches mobile version
- No JavaScript errors in console

### 8.3 Mobile Testing

```bash
npx expo start --android
npx expo start --ios
```

**Validation**:
- ✅ Navigation feels native (no web-like behavior)
- ✅ Gestures work (swipe back on iOS)
- ✅ Deep links open correct screens
- ✅ No performance regressions

---

## Phase 9: Documentation & Rollback Plan (1 hour)

### 9.1 Create Migration Report

Document:
- What changed
- New file structure
- Breaking changes (if any)
- Known issues
- Performance metrics

### 9.2 Rollback Procedure

**If migration fails**:
```bash
# 1. Revert package.json main entry
git checkout package.json

# 2. Restore old App.tsx
mv App.tsx.backup App.tsx

# 3. Reinstall React Navigation
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs

# 4. Clear cache and restart
npx expo start --clear
```

### 9.3 Update CLAUDE.md

Add Expo Router usage patterns and file structure documentation.

---

## Autonomous Execution Plan

### Agent Delegation Strategy

**Agent 1 - Setup Specialist** (1.5h):
- Phase 2: Package installation & configuration
- Phase 3: Directory structure & layout files
- Return: Setup complete, layouts created

**Agent 2 - Screen Migration Specialist** (6h):
- Phase 4: Migrate all 8 screens
- Phase 5: Update navigation calls
- Return: All screens migrated, navigation updated

**Agent 3 - Testing & Validation Specialist** (2.5h):
- Phase 6: Entry point switch
- Phase 7: Cleanup
- Phase 8: Web + mobile testing with Chrome DevTools MCP
- Return: Validation report with screenshots

**Agent 4 - Documentation Specialist** (1h):
- Phase 9: Migration report, rollback docs, CLAUDE.md updates
- Return: Complete documentation

**Coordination**:
- Agents run sequentially (dependencies between phases)
- Each agent commits to git after completion
- Final agent generates summary report
- Use Chrome DevTools MCP for screenshot validation

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Navigation breaks during migration | Medium | High | Parallel migration, keep old App.tsx working |
| Web still doesn't work after migration | Low | High | Test early in Phase 8, rollback if needed |
| TypeScript errors from navigation changes | Medium | Medium | Incremental migration with type checking |
| State management breaks | Low | Medium | Keep stores unchanged, only update navigation |
| Deep linking stops working | Low | Medium | Expo Router handles automatically, test early |

---

## Success Criteria

### Functional Requirements
- ✅ All 8 screens accessible via file-based routes
- ✅ Authentication flow works (login → dashboard)
- ✅ Bottom tabs navigation functional
- ✅ URL routing works on web (e.g., /workout)
- ✅ Browser back button works
- ✅ Mobile gestures work (swipe back)

### Non-Functional Requirements
- ✅ No performance regression vs React Navigation
- ✅ Web app loads without errors (no blank pages)
- ✅ Chrome DevTools validation screenshots all PASS
- ✅ TypeScript compiles with 0 new errors
- ✅ All existing tests pass

### Documentation Requirements
- ✅ Migration report created
- ✅ Rollback procedure documented
- ✅ CLAUDE.md updated with new patterns

---

## Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Planning | 30 min | T+0h | T+0.5h |
| Installation | 1h | T+0.5h | T+1.5h |
| Directory Setup | 30 min | T+1.5h | T+2h |
| Screen Migration | 6h | T+2h | T+8h |
| Navigation Updates | 2h | T+8h | T+10h |
| Entry Switch | 30 min | T+10h | T+10.5h |
| Cleanup | 1h | T+10.5h | T+11.5h |
| Testing | 2h | T+11.5h | T+13.5h |
| Documentation | 1h | T+13.5h | T+14.5h |

**Total: 14.5 hours** (within 10-15h estimate)

---

**Plan Status**: ✅ READY FOR AUTONOMOUS EXECUTION
**Validation Method**: Chrome DevTools MCP screenshot analysis
**Next Step**: Spawn Agent 1 - Setup Specialist
