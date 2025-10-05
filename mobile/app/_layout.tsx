import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getToken } from '../src/services/api/authApi';
import darkTheme from '../src/theme/darkTheme';

// Create QueryClient for TanStack Query
const queryClient = new QueryClient();

export default function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Check authentication status on mount AND when segments change
    const checkAuth = async () => {
      console.log('[_layout] checkAuth called, segments:', segments);
      const token = await getToken();
      console.log('[_layout] Token retrieved:', !!token);
      console.log('[_layout] Setting isAuthenticated to:', !!token);

      const isAuth = !!token;
      setIsAuthenticated(isAuth);

      // Handle navigation AFTER auth state is determined
      const inAuthGroup = segments[0] === '(auth)';
      console.log('[_layout] inAuthGroup:', inAuthGroup, 'isAuth:', isAuth);

      if (!isAuth && !inAuthGroup) {
        // Redirect to login if not authenticated
        console.log('[_layout] Not authenticated, redirecting to login');
        router.replace('/(auth)/login');
      } else if (isAuth && inAuthGroup) {
        // Redirect to home if authenticated
        console.log('[_layout] Authenticated in auth group, redirecting to tabs');
        router.replace('/(tabs)');
      }
    };
    void checkAuth();
  }, [segments]); // Re-check auth whenever route changes

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={darkTheme}>
        <Slot />
      </PaperProvider>
    </QueryClientProvider>
  );
}
