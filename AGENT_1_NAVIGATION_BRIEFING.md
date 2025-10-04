# Agent 1 - Navigation System Implementation Briefing

**Agent Role**: Navigation Specialist
**Priority**: P0 CRITICAL (Blocking all other agents)
**Estimated Duration**: 4-6 hours
**Start Time**: October 4, 2025, 18:35

---

## Mission

**Make the FitFlow Pro app bootable by implementing a complete navigation system.**

Currently, App.tsx is empty boilerplate. The app has 7 beautiful screens but no way to navigate between them. Your job is to install React Navigation, wire up all screens, and get the app launching successfully on iOS Simulator.

---

## Context

### Current State
- ✅ Backend: 100% functional, 35+ API endpoints working
- ✅ Mobile Screens: 7 screens implemented (Auth, Dashboard, Workout, VO2max, Analytics, Planner, Settings)
- ✅ Mobile Components: 20+ components ready
- ❌ **Navigation: App.tsx is EMPTY** - No navigation system exists
- ❌ **App Status: DOES NOT RUN** - Cannot access any screens

### Why This Matters
- **Blocking**: All visual improvements from Iteration 1 cannot be verified without a bootable app
- **User Impact**: App is unusable without navigation
- **Team Impact**: 7 other agents waiting on you to complete

---

## Your Objectives

### Primary Objective
✅ **Make app bootable with working navigation between all 7 screens**

### Success Criteria
- [ ] React Navigation dependencies installed
- [ ] App.tsx implements bottom tab navigator
- [ ] All 7 screens wired and accessible
- [ ] Tab bar shows icons + labels ("Home", "Analytics", "Planner", "Settings")
- [ ] Auth flow properly gates authenticated screens
- [ ] App launches on iOS Simulator without crashes
- [ ] Navigation between screens works smoothly (< 300ms transitions)

---

## Implementation Guide

### Step 1: Install Dependencies (10 minutes)

```bash
cd /home/asigator/fitness2025/mobile

# Core navigation
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack

# Required dependencies for Expo
npx expo install react-native-screens react-native-safe-area-context
```

**Verification**: `npm list @react-navigation/native` shows version installed

---

### Step 2: Create Navigation Stack (2 hours)

**File**: `/home/asigator/fitness2025/mobile/App.tsx`

**Structure**:
```typescript
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Import theme
import { theme } from './src/theme/colors';

// Import screens
import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import WorkoutScreen from './src/screens/WorkoutScreen';
import VO2maxWorkoutScreen from './src/screens/VO2maxWorkoutScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import PlannerScreen from './src/screens/PlannerScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Bottom tab navigator for authenticated users
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          height: 56,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: theme.colors.background.paper,
        },
        tabBarActiveTintColor: theme.colors.primary.main,
        tabBarInactiveTintColor: theme.colors.text.tertiary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: theme.colors.background.paper,
        },
        headerTintColor: theme.colors.text.primary,
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-line" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Planner"
        component={PlannerScreen}
        options={{
          title: 'Planner',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-check" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Root navigation with auth flow
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user has valid auth token
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // TODO: Implement actual auth check with SecureStore
      // For now, default to unauthenticated
      setIsAuthenticated(false);
    } catch (error) {
      console.error('[App] Auth check failed:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    // TODO: Add proper loading screen
    return null;
  }

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          {!isAuthenticated ? (
            <Stack.Screen name="Auth" component={AuthScreen} />
          ) : (
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen
                name="Workout"
                component={WorkoutScreen}
                options={{
                  headerShown: true,
                  title: 'Workout',
                }}
              />
              <Stack.Screen
                name="VO2maxWorkout"
                component={VO2maxWorkoutScreen}
                options={{
                  headerShown: true,
                  title: 'VO2max Cardio',
                }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
```

**Key Implementation Notes**:
- Bottom tabs for main navigation (Home, Analytics, Planner, Settings)
- Stack navigator for workout screens (full-screen, not in tabs)
- Auth flow gates access to main app
- Tab bar height 56px for WCAG touch target compliance
- Tab labels visible (fontSize 12px, fontWeight 600) - P0 requirement
- Icons + text for better UX

---

### Step 3: Fix Screen Imports (1 hour)

**Problem**: Screens may not export correctly

**Check each screen file**:
```bash
# Verify exports
grep -n "export default" /home/asigator/fitness2025/mobile/src/screens/*.tsx
```

**Expected pattern**:
```typescript
export default function DashboardScreen() {
  // ... component code
}
```

**If missing**, add export to each screen file.

---

### Step 4: Handle Navigation Props (1 hour)

**Problem**: Screens need navigation props for screen transitions

**Update each screen to accept navigation prop**:

```typescript
import { useNavigation } from '@react-navigation/native';

export default function DashboardScreen() {
  const navigation = useNavigation();

  const handleStartWorkout = () => {
    navigation.navigate('Workout');
  };

  // ... rest of component
}
```

**Screens that need navigation**:
- DashboardScreen: Navigate to Workout, VO2maxWorkout
- WorkoutScreen: Navigate back to Home
- VO2maxWorkoutScreen: Navigate back to Home
- AnalyticsScreen: May need navigation for drill-down
- PlannerScreen: No navigation needed (self-contained)
- SettingsScreen: No navigation needed (self-contained)

---

### Step 5: Test on iOS Simulator (30 minutes)

```bash
cd /home/asigator/fitness2025/mobile

# Clear cache and start
npx expo start -c --ios

# Wait for simulator to launch
# Test all navigation flows:
# 1. Auth screen loads
# 2. Can navigate to Home tab
# 3. Can navigate to Analytics tab
# 4. Can navigate to Planner tab
# 5. Can navigate to Settings tab
# 6. Can navigate from Home to Workout screen
# 7. Can navigate back from Workout
```

**Success Criteria**:
- ✅ App launches without crashes
- ✅ All tabs visible with icons + labels
- ✅ Can switch between tabs smoothly
- ✅ Workout screen navigates correctly
- ✅ Back button works

---

### Step 6: Fix Any Crashes (1-2 hours buffer)

**Common issues to watch for**:

1. **Missing dependencies**:
   ```bash
   npm install <missing-package>
   ```

2. **TypeScript errors**:
   - Fix critical errors that prevent compilation
   - Use `// @ts-expect-error` for non-critical issues with TODO comment

3. **Import path errors**:
   - Check that all screen imports resolve correctly
   - Use absolute paths if relative paths fail

4. **Theme issues**:
   - Verify `./src/theme/colors.ts` exports theme correctly
   - Check that theme structure matches React Native Paper requirements

---

## Files You'll Modify

1. **App.tsx** (CRITICAL) - Main navigation configuration
2. **DashboardScreen.tsx** - Add navigation calls
3. **WorkoutScreen.tsx** - Add navigation calls
4. **VO2maxWorkoutScreen.tsx** - Add navigation calls
5. **package.json** - Add navigation dependencies

**Total files**: 5 primary files

---

## Testing Checklist

Before marking complete:

### Navigation Tests
- [ ] App launches on iOS Simulator without crashes
- [ ] Bottom tab bar is visible
- [ ] Tab bar shows all 4 tabs (Home, Analytics, Planner, Settings)
- [ ] Tab labels are visible (12px font, 600 weight)
- [ ] Tab icons render correctly
- [ ] Can tap each tab and see correct screen
- [ ] Tab transitions are smooth (< 300ms)
- [ ] Active tab is visually distinct

### Workout Navigation Tests
- [ ] Can navigate from Home to Workout screen
- [ ] Workout screen has header with back button
- [ ] Back button returns to Home tab
- [ ] Can navigate from Home to VO2max Workout screen
- [ ] VO2max screen has header with back button

### Auth Flow Tests
- [ ] Auth screen shows when not authenticated
- [ ] Main tabs hidden when not authenticated
- [ ] (TODO in Iteration 3: Login actually authenticates)

---

## Deliverables

1. **Code**: Updated App.tsx with full navigation
2. **Dependencies**: package.json with navigation libraries
3. **Screenshot**: iOS Simulator showing app running with bottom tabs
4. **Report**: AGENT_1_NAVIGATION_REPORT.md documenting:
   - Installation steps
   - Implementation decisions
   - Issues encountered and solutions
   - Testing results
   - Next steps for other agents

---

## Handoff to Next Agent

Once you complete:
1. Update ITERATION_2_PROGRESS.md (mark Agent 1 complete)
2. Create AGENT_1_NAVIGATION_REPORT.md
3. Capture 1 screenshot showing working navigation
4. Notify Agent 2 (Visual Fixes) that navigation is ready

---

## Resources

- React Navigation Docs: https://reactnavigation.org/docs/getting-started
- Bottom Tabs: https://reactnavigation.org/docs/bottom-tab-navigator
- Stack Navigator: https://reactnavigation.org/docs/stack-navigator
- Theme Integration: https://reactnavigation.org/docs/themes
- CLAUDE.md: /home/asigator/fitness2025/CLAUDE.md (project conventions)

---

## Emergency Contacts

If blocked:
- Check CLAUDE.md "Common Pitfalls" section
- Check Iteration 2 plan for context
- Document blocker in AGENT_1_NAVIGATION_REPORT.md

---

**GO TIME**: Start implementation now. The team is counting on you!

**Target Completion**: 4 hours from start (22:35 today)

Good luck! 🚀
