import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import darkTheme from './src/theme/darkTheme';
import { colors } from './src/theme/colors';

// Import screens
import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import WorkoutScreen from './src/screens/WorkoutScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import PlannerScreen from './src/screens/PlannerScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Import auth utilities
import { getToken, clearToken, getUserId } from './src/services/api/authApi';
import { useWorkoutStore } from './src/stores/workoutStore';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// Navigation type definitions
export type RootStackParamList = {
  Auth: undefined;
  MainApp: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Analytics: undefined;
  Planner: undefined;
  Settings: undefined;
};

export type DashboardStackParamList = {
  DashboardHome: undefined;
  Workout: undefined;
};

// Create navigators
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();

// Create QueryClient for TanStack Query
const queryClient = new QueryClient();

/**
 * Wrapper components to handle screen props
 */

// Dashboard Stack Navigator (Dashboard + Workout screens)
function DashboardStackNavigator() {
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStack.Screen name="DashboardHome" component={DashboardWrapper} />
      <DashboardStack.Screen name="Workout" component={WorkoutScreen} />
    </DashboardStack.Navigator>
  );
}

// Dashboard wrapper - provides required props
function DashboardWrapper() {
  const [userId, setUserId] = useState<number | null>(null);
  const navigation = useNavigation();

  useEffect(() => {
    void (async () => {
      const id = await getUserId();
      setUserId(id);
    })();
  }, []);

  if (userId === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <DashboardScreen
      userId={userId}
      onStartWorkout={async (programDayId: number, date: string) => {
        // Start workout via store and navigate to WorkoutScreen
        try {
          console.log('[Dashboard] Starting workout...');
          await useWorkoutStore.getState().startWorkout(userId, programDayId, date);
          console.log('[Dashboard] Workout started, navigating to WorkoutScreen');
          navigation.navigate('Workout' as never);
        } catch (error) {
          console.error('[DashboardWrapper] Failed to start workout:', error);
        }
      }}
      onSubmitRecovery={() => {
        // Recovery submission handled within DashboardScreen
      }}
    />
  );
}

// Planner wrapper - provides userId
function PlannerWrapper() {
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      const id = await getUserId();
      setUserId(id);
    })();
  }, []);

  if (userId === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <PlannerScreen userId={userId} />;
}

// Settings wrapper - provides logout handler
function SettingsWrapper({ onLogout }: { onLogout: () => void }) {
  return <SettingsScreen onLogout={onLogout} />;
}

// Auth wrapper - provides auth success handler
function AuthWrapper({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  return <AuthScreen onAuthSuccess={onAuthSuccess} />;
}

/**
 * Main app bottom tab navigator
 *
 * Provides navigation between core app screens:
 * - Dashboard: Workout overview, quick actions, and active workout tracking
 * - Analytics: Progress charts and 1RM trends
 * - Planner: Program customization and mesocycle planning
 * - Settings: Profile and app configuration
 */
function MainAppTabs({ onLogout }: { onLogout: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.background.secondary,
          borderTopWidth: 1,
          borderTopColor: colors.effects.divider,
          paddingBottom: 4,
          paddingTop: 4,
          height: 60,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStackNavigator}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarLabel: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-line" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Planner"
        component={PlannerWrapper}
        options={{
          tabBarLabel: 'Planner',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-month" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" size={size} color={color} />
          ),
        }}
      >
        {() => <SettingsWrapper onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

/**
 * Root navigation component
 *
 * Implements authentication flow:
 * 1. Checks for stored JWT token on app launch
 * 2. If token exists → navigate to MainApp (bottom tabs)
 * 3. If no token → show Auth screen (login/register)
 *
 * Auth screen automatically stores token on successful login/register,
 * triggering re-render and navigation to MainApp.
 */
function AppNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const checkAuth = async () => {
    const token = await getToken();
    console.log('[AppNavigator] checkAuth - token exists:', !!token);
    setIsAuthenticated(!!token);
  };

  useEffect(() => {
    // Check authentication status on mount
    void checkAuth();
  }, []);

  const handleAuthSuccess = () => {
    // Re-check authentication status after successful login/register
    console.log('[AppNavigator] handleAuthSuccess called - re-checking auth');
    void checkAuth();
  };

  const handleLogout = async () => {
    // Handle logout: clear token and reset authentication state
    try {
      console.log('[AppNavigator] handleLogout called - clearing token');
      await clearToken();
      console.log('[AppNavigator] Token cleared, setting isAuthenticated to false');
      setIsAuthenticated(false);
    } catch (error) {
      console.error('[AppNavigator] Logout failed:', error);
      // Still set to unauthenticated even if token clear fails
      setIsAuthenticated(false);
    }
  };

  // Show loading spinner while checking auth
  if (isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const navigationTheme = {
    dark: true,
    colors: {
      primary: colors.primary.main,
      background: colors.background.primary,
      card: colors.background.secondary,
      text: colors.text.primary,
      border: colors.effects.divider,
      notification: colors.primary.main,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="MainApp" options={{ headerShown: false }}>
            {() => <MainAppTabs onLogout={handleLogout} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen
            name="Auth"
            options={{ animationTypeForReplace: 'pop', headerShown: false }}
          >
            {(props) => <AuthWrapper {...props} onAuthSuccess={handleAuthSuccess} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/**
 * Root App component with providers
 *
 * Wraps the app with:
 * - QueryClientProvider: TanStack Query for API data fetching
 * - PaperProvider: React Native Paper theming and components
 * - NavigationContainer: React Navigation routing (wrapped inside AppNavigator)
 * - StatusBar: Expo status bar configuration
 */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={darkTheme}>
        <AppNavigator />
        <StatusBar style="light" />
      </PaperProvider>
    </QueryClientProvider>
  );
}
