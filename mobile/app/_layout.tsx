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
    // Check authentication status on mount
    const checkAuth = async () => {
      const token = await getToken();
      setIsAuthenticated(!!token);
    };
    void checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated === null) return; // Wait for auth check

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
      <PaperProvider theme={darkTheme}>
        <Slot />
      </PaperProvider>
    </QueryClientProvider>
  );
}
