/**
 * RegisterScreen - Migrated to Expo Router
 *
 * Registration form screen.
 * Uses React Native Paper components for Material Design UI.
 *
 * Features:
 * - Register form: email, password, experience_level
 * - Form validation: email format, password ≥8 chars
 * - Uses authApi from T031 (register function)
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
  SegmentedButtons,
  ActivityIndicator,
  useTheme,
  HelperText,
} from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { register } from '../../src/services/api/authApi';
import { colors } from '../../src/theme/colors';

type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

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
 * RegisterScreen Component
 *
 * Displays registration form with validation.
 * On successful auth, stores JWT token and navigates to dashboard.
 */
export default function RegisterScreen() {
  const theme = useTheme();
  const router = useRouter();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner');

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
   * Handle registration submission
   */
  const handleRegister = async () => {
    console.log('[RegisterScreen] handleRegister called with email:', email);
    setError(null);
    setEmailTouched(true);
    setPasswordTouched(true);

    if (!isFormValid()) {
      console.log('[RegisterScreen] Form validation failed');
      return;
    }

    console.log('[RegisterScreen] Form valid, calling register API...');
    setIsLoading(true);

    try {
      await register(email, password, undefined, undefined, experienceLevel);

      console.log('[RegisterScreen] Registration successful, navigating to dashboard');

      // API-only mode - backend handles program creation
      // No local database or seeding needed

      // Navigate to dashboard
      router.replace('/(tabs)');
    } catch (err) {
      console.error('[RegisterScreen] Registration failed:', err);

      const errorMessage =
        err instanceof Error && err.message.includes('409')
          ? 'An account with this email already exists'
          : err instanceof Error
            ? err.message
            : 'Registration failed. Please try again.';

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
            Create Account
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
            autoComplete="password-new"
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

          {/* Experience Level */}
          <Text variant="labelLarge" style={styles.label}>
            Experience Level
          </Text>
          <SegmentedButtons
            value={experienceLevel}
            onValueChange={(value) => setExperienceLevel(value as ExperienceLevel)}
            buttons={[
              { value: 'beginner', label: 'Beginner' },
              { value: 'intermediate', label: 'Intermediate' },
              { value: 'advanced', label: 'Advanced' },
            ]}
            style={styles.experienceSelector}
          />

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
                console.log('[RegisterScreen] Web button onClick triggered!');
                void handleRegister();
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
              {isLoading ? <ActivityIndicator size="small" color="#fff" /> : 'Create Account'}
            </button>
          ) : (
            // Native: Use Pressable
            <Pressable
              onPress={() => {
                console.log('[RegisterScreen] Native Pressable onPress triggered!');
                void handleRegister();
              }}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.submitButton,
                {
                  backgroundColor: pressed ? theme.colors.primaryContainer : theme.colors.primary,
                  opacity: isLoading ? 0.6 : 1,
                },
              ]}
              accessibilityLabel="Create account"
              accessibilityHint="Register a new account"
              accessibilityRole="button"
            >
              <View style={styles.buttonContent}>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </View>
            </Pressable>
          )}

          {/* Link to Login */}
          <View style={styles.linkContainer}>
            <Text variant="bodyMedium" style={styles.linkText}>
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable accessibilityRole="link" accessibilityLabel="Go to login">
                <Text variant="bodyMedium" style={[styles.linkText, { color: theme.colors.primary }]}>
                  Login
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
  label: {
    marginTop: 8,
    marginBottom: 8,
  },
  experienceSelector: {
    marginBottom: 16,
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
