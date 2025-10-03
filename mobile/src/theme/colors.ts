/**
 * FitFlow Pro Dark Mode Color Palette
 *
 * Inspired by top fitness apps (Strong, Hevy, JEFIT)
 * WCAG AA compliant for dark backgrounds
 */

export const colors = {
  // Background Colors
  background: {
    primary: '#0A0E27',      // Deep blue-black (main background)
    secondary: '#1A1F3A',    // Elevated cards/surfaces
    tertiary: '#252B4A',     // Higher elevation (modals, bottom sheets)
  },

  // Primary Brand Colors
  primary: {
    main: '#4C6FFF',         // Electric blue (primary actions)
    light: '#6B88FF',        // Lighter variant for hover states
    dark: '#3A55CC',         // Darker variant for pressed states
    gradient: ['#4C6FFF', '#7B3FFF'], // Gradient for hero elements
  },

  // Success/Progress Colors
  success: {
    main: '#00D9A3',         // Mint green (completed sets, positive metrics)
    light: '#33E3B5',
    dark: '#00A67D',
    bg: '#00D9A320',         // 20% opacity background
  },

  // Warning/Attention Colors
  warning: {
    main: '#FFB800',         // Amber (caution, moderate alerts)
    light: '#FFC933',
    dark: '#CC9300',
    bg: '#FFB80020',
  },

  // Error/Danger Colors
  error: {
    main: '#FF4757',         // Red (errors, cancelled workouts)
    light: '#FF6B7A',
    dark: '#CC3946',
    bg: '#FF475720',
  },

  // Muscle Group Colors (for volume charts)
  muscle: {
    chest: '#FF6B9D',        // Pink-red
    back: '#4C6FFF',         // Electric blue
    shoulders: '#FFB800',     // Amber
    arms: '#00D9A3',         // Mint green
    legs: '#FF8A3D',         // Orange
    abs: '#9B59B6',          // Purple
  },

  // Text Colors
  text: {
    primary: '#FFFFFF',       // White (main text)
    secondary: '#A0A6C8',     // Light blue-gray (secondary text)
    tertiary: '#6B7299',      // Darker blue-gray (captions, hints)
    disabled: '#4A5080',      // Very subtle (disabled states)
  },

  // Status Colors
  status: {
    notStarted: '#6B7299',    // Gray
    inProgress: '#4C6FFF',    // Blue
    completed: '#00D9A3',     // Green
    cancelled: '#FF4757',     // Red
  },

  // Chart Colors
  chart: {
    grid: '#252B4A',          // Grid lines
    axis: '#4A5080',          // Axis lines/labels
    tooltip: '#1A1F3A',       // Tooltip background
    gradientStart: '#4C6FFF40', // Chart gradient fill start
    gradientEnd: '#4C6FFF00',   // Chart gradient fill end (transparent)
  },

  // Special Effects
  effects: {
    glow: '#4C6FFF40',        // Glow effect for focus states
    shimmer: '#FFFFFF20',     // Shimmer for loading states
    overlay: '#0A0E2780',     // Modal/sheet overlay (50% opacity)
    divider: '#252B4A',       // Divider lines
  },
};

// Gradient presets for common UI patterns
export const gradients = {
  primary: ['#4C6FFF', '#7B3FFF'],
  success: ['#00D9A3', '#00A67D'],
  warning: ['#FFB800', '#FF8A3D'],
  card: ['#1A1F3A', '#252B4A'],
  hero: ['#2A2F4A', '#1A1F3A'],
};

// Shadow/elevation presets (for React Native Paper)
export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#4C6FFF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
};
