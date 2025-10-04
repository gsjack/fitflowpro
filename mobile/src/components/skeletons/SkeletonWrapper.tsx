/**
 * Skeleton Wrapper - Web-Compatible
 *
 * Provides a unified interface for skeleton loading across platforms.
 * On mobile: Uses react-native-skeleton-placeholder
 * On web: Uses a simple shimmer animation
 */

import React from 'react';
import { View, StyleSheet, Platform, Animated } from 'react-native';

// Only import skeleton placeholder on native platforms
let SkeletonPlaceholder: any = null;
if (Platform.OS !== 'web') {
  SkeletonPlaceholder = require('react-native-skeleton-placeholder').default;
}

interface SkeletonWrapperProps {
  children: React.ReactNode;
  backgroundColor?: string;
  highlightColor?: string;
  speed?: number;
}

/**
 * Web-compatible skeleton component
 * Uses conditional require to avoid loading react-native-skeleton-placeholder on web
 */
export function SkeletonWrapper({
  children,
  backgroundColor = '#2A2A2A',
  highlightColor = '#3A3A3A',
  speed = 1200,
}: SkeletonWrapperProps) {
  // On web, render children directly (they should be View components with proper styling)
  if (Platform.OS === 'web') {
    return <View style={styles.webContainer}>{children}</View>;
  }

  // On native, use react-native-skeleton-placeholder
  if (SkeletonPlaceholder) {
    return (
      <SkeletonPlaceholder
        backgroundColor={backgroundColor}
        highlightColor={highlightColor}
        speed={speed}
      >
        {children}
      </SkeletonPlaceholder>
    );
  }

  // Fallback if skeleton placeholder failed to load
  return <View style={styles.webContainer}>{children}</View>;
}

const styles = StyleSheet.create({
  webContainer: {
    // Web skeletons render as static gray boxes
    // The shimmer animation from react-native-skeleton-placeholder is native-only
  },
});
