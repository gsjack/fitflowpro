/**
 * Animation Utilities
 *
 * Reusable animation utilities for smooth UI transitions
 */

import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

/**
 * Fade-in animation hook
 *
 * Returns an animated opacity value that fades in when `isVisible` is true
 *
 * @param isVisible - Whether the content should be visible
 * @param duration - Animation duration in milliseconds (default: 200ms)
 * @returns Animated.Value for opacity
 */
export function useFadeIn(isVisible: boolean, duration: number = 200): Animated.Value {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start();
    } else {
      // Reset to 0 when not visible
      fadeAnim.setValue(0);
    }
  }, [isVisible, duration, fadeAnim]);

  return fadeAnim;
}

/**
 * Slide-in animation hook
 *
 * Returns an animated translateY value that slides in from bottom
 *
 * @param isVisible - Whether the content should be visible
 * @param duration - Animation duration in milliseconds (default: 250ms)
 * @param distance - Distance to slide in pixels (default: 20)
 * @returns Animated.Value for translateY
 */
export function useSlideIn(
  isVisible: boolean,
  duration: number = 250,
  distance: number = 20
): Animated.Value {
  const slideAnim = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }).start();
    } else {
      // Reset to initial position when not visible
      slideAnim.setValue(distance);
    }
  }, [isVisible, duration, distance, slideAnim]);

  return slideAnim;
}

/**
 * Combined fade + slide animation hook
 *
 * Returns both opacity and translateY animated values
 *
 * @param isVisible - Whether the content should be visible
 * @param duration - Animation duration in milliseconds (default: 200ms)
 * @param distance - Distance to slide in pixels (default: 15)
 * @returns Object with opacity and translateY animated values
 */
export function useFadeSlideIn(
  isVisible: boolean,
  duration: number = 200,
  distance: number = 15
): { opacity: Animated.Value; translateY: Animated.Value } {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations
      fadeAnim.setValue(0);
      slideAnim.setValue(distance);
    }
  }, [isVisible, duration, distance, fadeAnim, slideAnim]);

  return {
    opacity: fadeAnim,
    translateY: slideAnim,
  };
}
