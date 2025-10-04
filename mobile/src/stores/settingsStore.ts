/**
 * Settings Store
 *
 * Zustand store for user preferences with AsyncStorage persistence.
 * Manages weight unit preference (kg/lbs) for US market compatibility.
 *
 * Architecture:
 * - Persisted to AsyncStorage for cross-session retention
 * - Defaults to kg (metric) for international users
 * - Automatically hydrates on app startup
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type WeightUnit = 'kg' | 'lbs';

interface SettingsState {
  // Preferences
  weightUnit: WeightUnit;

  // Actions
  setWeightUnit: (unit: WeightUnit) => void;
}

/**
 * Settings store with AsyncStorage persistence
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Initial state
      weightUnit: 'kg',

      /**
       * Set weight unit preference
       */
      setWeightUnit: (unit: WeightUnit) => {
        console.log('[SettingsStore] Setting weight unit to:', unit);
        set({ weightUnit: unit });
      },
    }),
    {
      name: 'fitflow-settings-storage', // AsyncStorage key
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
