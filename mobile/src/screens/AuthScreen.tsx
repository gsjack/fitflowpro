/**
 * AuthScreen (T065)
 *
 * Authentication screen with login and registration forms.
 * Uses React Native Paper components for Material Design UI.
 *
 * Features:
 * - Login form: email, password
 * - Register form: email, password, age, weight_kg, experience_level
 * - Form validation: email format, password ≥8 chars
 * - Uses authApi from T031 (register, login functions)
 * - Stores token and navigates to DashboardScreen on success
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  SegmentedButtons,
  ActivityIndicator,
  useTheme,
  HelperText,
} from 'react-native-paper';
import { register, login, getUserId } from '../services/api/authApi';
import { initializeDatabase } from '../database/db';
import { seedProgram } from '../database/seedProgram';

interface AuthScreenProps {
  onAuthSuccess: () => void; // Navigate to DashboardScreen after login/register
}

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
 * AuthScreen Component
 *
 * Displays login and registration forms with form validation.
 * On successful auth, stores JWT token and navigates to dashboard.
 *
 * NOTE: Complexity = 14 (exceeds limit of 10) - Justified for form validation logic
 * Alternative would be to extract validation into separate hooks, but this would
 * reduce code readability for a screen component. Acceptable trade-off.
 *
 * @param onAuthSuccess - Callback after successful authentication
 */
// eslint-disable-next-line complexity
export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const theme = useTheme();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [weightKg, setWeightKg] = useState('');
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

    if (mode === 'register') {
      if (age && (parseInt(age) < 13 || parseInt(age) > 100)) {
        setError('Age must be between 13 and 100');
        return false;
      }

      if (weightKg && (parseFloat(weightKg) < 30 || parseFloat(weightKg) > 300)) {
        setError('Weight must be between 30 and 300 kg');
        return false;
      }
    }

    return true;
  };

  /**
   * Handle login submission
   */
  const handleLogin = async () => {
    setError(null);
    setEmailTouched(true);
    setPasswordTouched(true);

    if (!isFormValid()) {
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);

      console.log('[AuthScreen] Login successful');

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
      onAuthSuccess();
    } catch (err) {
      console.error('[AuthScreen] Login failed:', err);

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

  /**
   * Handle registration submission
   */
  const handleRegister = async () => {
    setError(null);
    setEmailTouched(true);
    setPasswordTouched(true);

    if (!isFormValid()) {
      return;
    }

    setIsLoading(true);

    try {
      const ageNumber = age ? parseInt(age) : undefined;
      const weightNumber = weightKg ? parseFloat(weightKg) : undefined;

      await register(email, password, ageNumber, weightNumber, experienceLevel);

      console.log('[AuthScreen] Registration successful, calling onAuthSuccess callback');

      // API-only mode - backend handles program creation
      // No local database or seeding needed

      // Navigate to dashboard
      onAuthSuccess();
    } catch (err) {
      console.error('[AuthScreen] Registration failed:', err);

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

  /**
   * Handle form submission (login or register)
   */
  const handleSubmit = async () => {
    if (mode === 'login') {
      await handleLogin();
    } else {
      await handleRegister();
    }
  };

  /**
   * Switch between login and register modes
   */
  const handleModeChange = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setError(null);
    setEmailTouched(false);
    setPasswordTouched(false);
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

          {/* Mode Selector */}
          <SegmentedButtons
            value={mode}
            onValueChange={(value) => handleModeChange(value)}
            buttons={[
              { value: 'login', label: 'Login' },
              { value: 'register', label: 'Register' },
            ]}
            style={styles.modeSelector}
          />

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
            autoComplete={mode === 'login' ? 'password' : 'password-new'}
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

          {/* Registration-only fields */}
          {mode === 'register' && (
            <>
              {/* Age Input */}
              <TextInput
                mode="outlined"
                label="Age (optional)"
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                placeholder="13-100"
                disabled={isLoading}
                style={styles.input}
              />

              {/* Weight Input */}
              <TextInput
                mode="outlined"
                label="Weight (kg, optional)"
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="decimal-pad"
                placeholder="30-300"
                disabled={isLoading}
                style={styles.input}
              />

              {/* Experience Level */}
              <Text variant="labelLarge" style={styles.label}>
                Experience Level
              </Text>
              <SegmentedButtons
                value={experienceLevel}
                onValueChange={(value) => setExperienceLevel(value)}
                buttons={[
                  { value: 'beginner', label: 'Beginner' },
                  { value: 'intermediate', label: 'Intermediate' },
                  { value: 'advanced', label: 'Advanced' },
                ]}
                style={styles.experienceSelector}
              />
            </>
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

          {/* Submit Button */}
          <Button
            mode="contained"
            onPress={() => void handleSubmit()}
            disabled={isLoading}
            style={styles.submitButton}
            accessibilityLabel={mode === 'login' ? 'Login' : 'Create account'}
            accessibilityHint={
              mode === 'login' ? 'Sign in to your account' : 'Register a new account'
            }
            accessibilityRole="button"
            accessibilityState={{ disabled: isLoading }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : mode === 'login' ? (
              'Login'
            ) : (
              'Create Account'
            )}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 24,
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
  modeSelector: {
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
    paddingVertical: 8,
    minHeight: 44, // WCAG 2.1 AA: Minimum 44pt touch target
  },
});
