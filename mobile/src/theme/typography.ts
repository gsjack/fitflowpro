/**
 * FitFlow Pro Typography Scale
 *
 * Optimized for workout data display with emphasis on numbers
 */

export const typography = {
  // Hero Numbers (weight, reps, 1RM)
  hero: {
    fontSize: 72,
    fontWeight: '700' as const,
    lineHeight: 80,
    letterSpacing: -1,
  },

  // Large Numbers (set counts, metrics)
  displayLarge: {
    fontSize: 48,
    fontWeight: '700' as const,
    lineHeight: 56,
    letterSpacing: -0.5,
  },

  displayMedium: {
    fontSize: 36,
    fontWeight: '600' as const,
    lineHeight: 44,
    letterSpacing: -0.25,
  },

  displaySmall: {
    fontSize: 28,
    fontWeight: '600' as const,
    lineHeight: 36,
    letterSpacing: 0,
  },

  // Workout Names & Headers
  headlineLarge: {
    fontSize: 32,
    fontWeight: '600' as const,
    lineHeight: 40,
    letterSpacing: 0,
  },

  headlineMedium: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: 0,
  },

  headlineSmall: {
    fontSize: 20,
    fontWeight: '500' as const,
    lineHeight: 28,
    letterSpacing: 0,
  },

  // Exercise Names & Titles
  titleLarge: {
    fontSize: 20,
    fontWeight: '500' as const,
    lineHeight: 28,
    letterSpacing: 0,
  },

  titleMedium: {
    fontSize: 18,
    fontWeight: '500' as const,
    lineHeight: 24,
    letterSpacing: 0.15,
  },

  titleSmall: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 20,
    letterSpacing: 0.1,
  },

  // Body Text
  bodyLarge: {
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 28,
    letterSpacing: 0.5,
  },

  bodyMedium: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    letterSpacing: 0.25,
  },

  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: 0.4,
  },

  // Captions & Labels
  labelLarge: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0.1,
    textTransform: 'uppercase' as const,
  },

  labelMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 0.5,
  },

  labelSmall: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 0.5,
  },

  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0.4,
  },

  // Button Text
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
};

// Spacing scale (8px grid)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Border radius scale
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999, // Fully rounded
};
