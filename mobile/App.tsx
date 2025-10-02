import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
  Workout: undefined;
  Analytics: undefined;
  Planner: undefined;
  Settings: undefined;
};

// Create navigators
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Create QueryClient for TanStack Query
const queryClient = new QueryClient();

/**
 * Wrapper components to handle screen props
 */

// Dashboard wrapper - provides required props
function DashboardWrapper() {
  const [userId, setUserId] = useState<number | null>(null);
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();

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
        // Start workout via store and navigate to Workout tab
        try {
          console.log('[Dashboard] Starting workout...');
          await useWorkoutStore.getState().startWorkout(userId, programDayId, date);
          console.log('[Dashboard] Workout started, navigating to workout tab');
          navigation.navigate('Workout'); // Auto-navigate to Workout tab
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
function SettingsWrapper() {
  const [, setForceUpdate] = useState(0);

  const handleLogout = () => {
    void (async () => {
      await clearToken();
      // Force re-render to trigger auth check
      setForceUpdate((prev) => prev + 1);
    })();
  };

  return <SettingsScreen onLogout={handleLogout} />;
}

// Auth wrapper - provides auth success handler
function AuthWrapper({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  return <AuthScreen onAuthSuccess={onAuthSuccess} />;
}

/**
 * Main app bottom tab navigator
 *
 * Provides navigation between core app screens:
 * - Dashboard: Workout overview and quick actions
 * - Workout: Active workout tracking with set logging
 * - Analytics: Progress charts and 1RM trends
 * - Planner: Program customization and mesocycle planning
 * - Settings: Profile and app configuration
 */
function MainAppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#6200ee',
        },
        headerTintColor: '#fff',
        tabBarActiveTintColor: '#6200ee',
        tabBarInactiveTintColor: 'gray',
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardWrapper}
        options={{
          title: 'FitFlow Pro',
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Workout"
        component={WorkoutScreen}
        options={{
          title: 'Active Workout',
          tabBarLabel: 'Workout',
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          title: 'Progress Analytics',
          tabBarLabel: 'Analytics',
        }}
      />
      <Tab.Screen
        name="Planner"
        component={PlannerWrapper}
        options={{
          title: 'Program Planner',
          tabBarLabel: 'Planner',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsWrapper}
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
        }}
      />
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

  // Show loading spinner while checking auth
  if (isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="MainApp" component={MainAppTabs} options={{ headerShown: false }} />
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
      <PaperProvider theme={MD3LightTheme}>
        <AppNavigator />
        <StatusBar style="auto" />
      </PaperProvider>
    </QueryClientProvider>
  );
}
