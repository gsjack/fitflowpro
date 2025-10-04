# Spawning Agent 1 - Navigation Specialist

**Time**: October 4, 2025, 18:40
**Mission**: Implement navigation system to make app bootable
**Briefing**: /home/asigator/fitness2025/AGENT_1_NAVIGATION_BRIEFING.md
**Progress Tracking**: /home/asigator/fitness2025/ITERATION_2_PROGRESS.md

---

## Agent 1 Instructions

You are Agent 1, the Navigation Specialist. Your mission is critical: **Make the FitFlow Pro app bootable.**

### Your Task (4-6 hours)

1. **Install React Navigation dependencies** (10 min)
   ```bash
   cd /home/asigator/fitness2025/mobile
   npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
   npx expo install react-native-screens react-native-safe-area-context
   ```

2. **Implement navigation in App.tsx** (2 hours)
   - Bottom tab navigator (Home, Analytics, Planner, Settings)
   - Stack navigator for workout screens
   - Auth flow gating
   - See AGENT_1_NAVIGATION_BRIEFING.md for complete code

3. **Fix screen imports and add navigation props** (1 hour)
   - Ensure all screens export correctly
   - Add `useNavigation()` hook where needed
   - Fix navigation calls in DashboardScreen, WorkoutScreen, VO2maxWorkoutScreen

4. **Test on iOS Simulator** (30 min)
   ```bash
   npx expo start -c --ios
   ```
   - Verify app launches
   - Test all tab navigation
   - Test workout screen navigation

5. **Fix crashes and issues** (1-2 hour buffer)
   - TypeScript errors
   - Missing dependencies
   - Import path issues

### Success Criteria

- ✅ App launches on iOS Simulator without crashes
- ✅ Bottom tab bar visible with 4 tabs
- ✅ Tab labels visible (12px, 600 weight)
- ✅ Can navigate between all 7 screens
- ✅ Navigation smooth (< 300ms transitions)

### Deliverables

1. **Code**: Updated App.tsx with navigation
2. **Report**: AGENT_1_NAVIGATION_REPORT.md
3. **Screenshot**: iOS Simulator with working tabs
4. **Updated**: ITERATION_2_PROGRESS.md (mark complete)

---

## Start Now

Read AGENT_1_NAVIGATION_BRIEFING.md and begin implementation.

The team is waiting on you! 🚀
