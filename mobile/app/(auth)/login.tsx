/**
 * LoginScreen - Migrated to Expo Router
 *
 * Login form screen.
 * Uses React Native Paper components for Material Design UI.
 *
 * Features:
 * - Login form: email, password
 * - Form validation: email format, password ≥8 chars
 * - Uses authApi from T031 (login function)
 * - Stores token and navigates to DashboardScreen on success
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  useTheme,
  HelperText,
} from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { login, getUserId } from '../../src/services/api/authApi';
import { initializeDatabase } from '../../src/database/db';
import { seedProgram } from '../../src/database/seedProgram';
import { colors } from '../../src/theme/colors';

/**
 * Validate email format using regex
 * @param email Email address
 * @returns true if valid email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * LoginScreen Component
 *
 * Displays login form with validation.
 * On successful auth, stores JWT token and navigates to dashboard.
 */
export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Validation state
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  // Validation errors
  const emailError = emailTouched && email.length > 0 && !isValidEmail(email);
  const passwordError = passwordTouched && password.length > 0 && password.length < 8;

  /**
   * Validate form before submission
   * @returns true if form is valid
   */
  const isFormValid = (): boolean => {
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }

    return true;
  };

  /**
   * Handle login submission
   */
  const handleLogin = async () => {
    console.log('[LoginScreen] handleLogin called with email:', email);
    setError(null);
    setEmailTouched(true);
    setPasswordTouched(true);

    if (!isFormValid()) {
      console.log('[LoginScreen] Form validation failed');
      return;
    }

    console.log('[LoginScreen] Form valid, calling login API...');
    setIsLoading(true);

    try {
      console.log('[LoginScreen] Calling login API with:', { email, password: '***' });
      await login(email, password);

      console.log('[LoginScreen] Login successful');

      // Initialize database and seed program on first login (native only)
      // Web uses API-only mode - no local SQLite database
      if (Platform.OS !== 'web') {
        await initializeDatabase();
        const userId = await getUserId();
        if (userId) {
          await seedProgram(userId);
        }
      }

      // Navigate to dashboard
      router.replace('/(tabs)');
    } catch (err) {
      console.error('[LoginScreen] Login failed:', err);

      const errorMessage =
        err instanceof Error && err.message.includes('401')
          ? 'Invalid email or password'
          : err instanceof Error
            ? err.message
            : 'Login failed. Please try again.';

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {/* App Title */}
          <Text variant="displaySmall" style={[styles.title, { color: theme.colors.primary }]}>
            FitFlow Pro
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Evidence-Based Training
          </Text>

          <Text variant="headlineMedium" style={styles.formTitle}>
            Login
          </Text>

          {/* Email Input */}
          <TextInput
            mode="outlined"
            label="Email"
            value={email}
            onChangeText={setEmail}
            onBlur={() => setEmailTouched(true)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            error={emailError}
            disabled={isLoading}
            style={styles.input}
            accessibilityLabel="Email address (required)"
            accessibilityHint="Enter your email address"
          />
          {emailError && (
            <HelperText
              type="error"
              visible={emailError}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              Please enter a valid email address
            </HelperText>
          )}

          {/* Password Input */}
          <TextInput
            mode="outlined"
            label="Password"
            value={password}
            onChangeText={setPassword}
            onBlur={() => setPasswordTouched(true)}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password"
            error={passwordError}
            disabled={isLoading}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                accessibilityRole="button"
                accessibilityHint="Toggles password visibility"
              />
            }
            style={styles.input}
            accessibilityLabel="Password (required)"
            accessibilityHint="Enter your password, must be at least 8 characters"
          />
          {passwordError && (
            <HelperText
              type="error"
              visible={passwordError}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              Password must be at least 8 characters
            </HelperText>
          )}

          {/* Error Message */}
          {error && (
            <Text
              variant="bodyMedium"
              style={[styles.errorText, { color: theme.colors.error }]}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              {error}
            </Text>
          )}

          {/* Submit Button - Web-compatible implementation */}
          {Platform.OS === 'web' ? (
            // Web: Use native button with onClick for proper event handling
            <button
              type="button"
              onClick={() => {
                console.log('[LoginScreen] Web button onClick triggered!');
                void handleLogin();
              }}
              disabled={isLoading}
              style={{
                marginTop: 24,
                minHeight: 56,
                borderRadius: 12,
                backgroundColor: theme.colors.primary,
                color: '#FFFFFF',
                fontSize: 18,
                fontWeight: 'bold',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                width: '100%',
              }}
            >
              {isLoading ? <ActivityIndicator size="small" color="#fff" /> : 'Login'}
            </button>
          ) : (
            // Native: Use Pressable
            <Pressable
              onPress={() => {
                console.log('[LoginScreen] Native Pressable onPress triggered!');
                void handleLogin();
              }}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.submitButton,
                {
                  backgroundColor: pressed ? theme.colors.primaryContainer : theme.colors.primary,
                  opacity: isLoading ? 0.6 : 1,
                },
              ]}
              accessibilityLabel="Login"
              accessibilityHint="Sign in to your account"
              accessibilityRole="button"
            >
              <View style={styles.buttonContent}>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Login</Text>
                )}
              </View>
            </Pressable>
          )}

          {/* Link to Register */}
          <View style={styles.linkContainer}>
            <Text variant="bodyMedium" style={styles.linkText}>
              Don't have an account?{' '}
            </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable accessibilityRole="link" accessibilityLabel="Go to registration">
                <Text variant="bodyMedium" style={[styles.linkText, { color: theme.colors.primary }]}>
                  Register
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27', // Dark theme background
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: '#0A0E27', // Dark theme background
  },
  content: {
    padding: 24,
    backgroundColor: '#0A0E27', // Dark theme background
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
  },
  formTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 4,
  },
  errorText: {
    marginTop: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: 24,
    minHeight: 56, // Large touch target
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  linkText: {
    opacity: 0.7,
  },
});
