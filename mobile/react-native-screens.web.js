// Web shim for react-native-screens
// Native screens are not supported on web, so we provide no-op implementations

export function enableScreens(enabled) {
  // No-op on web
}

export function screensEnabled() {
  return false;
}

// Export other functions as no-ops
export const Screen = () => null;
export const ScreenContainer = () => null;
export const NativeScreen = () => null;
export const NativeScreenContainer = () => null;

// Default export
export default {
  enableScreens,
  screensEnabled,
  Screen,
  ScreenContainer,
  NativeScreen,
  NativeScreenContainer,
};
