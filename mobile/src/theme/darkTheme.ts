/**
 * FitFlow Pro Dark Theme
 *
 * Material Design 3 dark theme configuration for React Native Paper
 */

import { MD3DarkTheme } from 'react-native-paper';
import { colors } from './colors';

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    // Primary colors
    primary: colors.primary.main,
    primaryContainer: colors.primary.dark,
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#FFFFFF',

    // Secondary colors
    secondary: colors.success.main,
    secondaryContainer: colors.success.dark,
    onSecondary: '#000000',
    onSecondaryContainer: '#FFFFFF',

    // Tertiary colors (warnings)
    tertiary: colors.warning.main,
    tertiaryContainer: colors.warning.dark,
    onTertiary: '#000000',
    onTertiaryContainer: '#FFFFFF',

    // Surface colors
    surface: colors.background.secondary,
    surfaceVariant: colors.background.tertiary,
    surfaceDisabled: colors.background.tertiary,
    onSurface: colors.text.primary,
    onSurfaceVariant: colors.text.secondary,
    onSurfaceDisabled: colors.text.disabled,

    // Background
    background: colors.background.primary,
    onBackground: colors.text.primary,

    // Error colors
    error: colors.error.main,
    errorContainer: colors.error.dark,
    onError: '#FFFFFF',
    onErrorContainer: '#FFFFFF',

    // Outline/borders
    outline: colors.effects.divider,
    outlineVariant: colors.effects.divider,

    // Inverse colors (for snackbars, etc)
    inverseSurface: colors.text.primary,
    inverseOnSurface: colors.background.primary,
    inversePrimary: colors.primary.main,

    // Elevation overlay (Material Design 3)
    elevation: {
      level0: 'transparent',
      level1: colors.background.secondary,
      level2: colors.background.tertiary,
      level3: '#2F3551',
      level4: '#353B5A',
      level5: '#3A4163',
    },

    // Shadow (unused in web, but included for completeness)
    shadow: '#000000',

    // Scrim (overlay for modals)
    scrim: colors.effects.overlay,

    // Backdrop (for bottom sheets)
    backdrop: colors.effects.overlay,
  },
  // Ensure dark mode is always enabled
  dark: true,
};

// Export the theme with custom properties
export default {
  ...darkTheme,
  // Add custom theme properties for FitFlow-specific styling
  custom: {
    colors,
    gradients: {
      primary: colors.primary.gradient,
      card: ['#1A1F3A', '#252B4A'],
      hero: ['#2A2F4A', '#1A1F3A'],
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
      xxxl: 64,
    },
    borderRadius: {
      sm: 8,
      md: 12,
      lg: 16,
      xl: 24,
      round: 999,
    },
  },
};
