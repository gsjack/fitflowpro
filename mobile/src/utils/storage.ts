/**
 * Web-Compatible Storage Wrapper
 *
 * Provides unified storage API across all platforms:
 * - Web: Uses localStorage
 * - Native (iOS/Android): Uses AsyncStorage
 *
 * This solves the AsyncStorage web incompatibility issue where
 * AsyncStorage.setItem/getItem/removeItem fail on web platform.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class Storage {
  /**
   * Store a value
   * @param key Storage key
   * @param value Value to store (must be string)
   */
  async setItem(key: string, value: string): Promise<void> {
    console.log('[Storage] setItem called');
    console.log('[Storage] Platform.OS:', Platform.OS);
    console.log('[Storage] Key:', key);
    console.log('[Storage] Value length:', value.length);
    console.log('[Storage] localStorage available:', typeof localStorage !== 'undefined');

    if (Platform.OS === 'web') {
      try {
        console.log('[Storage] Using localStorage.setItem');
        localStorage.setItem(key, value);
        console.log('[Storage] localStorage.setItem succeeded');

        // Verify immediately
        const check = localStorage.getItem(key);
        console.log('[Storage] Immediate verification - value exists:', !!check);
      } catch (error) {
        console.error('[Storage] localStorage.setItem failed:', error);
        throw new Error('Failed to store data');
      }
    } else {
      console.log('[Storage] Using AsyncStorage.setItem');
      await AsyncStorage.setItem(key, value);
      console.log('[Storage] AsyncStorage.setItem succeeded');
    }
  }

  /**
   * Retrieve a value
   * @param key Storage key
   * @returns Stored value or null if not found
   */
  async getItem(key: string): Promise<string | null> {
    console.log('[Storage] getItem called');
    console.log('[Storage] Platform.OS:', Platform.OS);
    console.log('[Storage] Key:', key);

    if (Platform.OS === 'web') {
      try {
        console.log('[Storage] Using localStorage.getItem');
        const value = localStorage.getItem(key);
        console.log('[Storage] localStorage.getItem returned:', !!value);
        if (value) {
          console.log('[Storage] Value length:', value.length);
        }
        return value;
      } catch (error) {
        console.error('[Storage] localStorage.getItem failed:', error);
        return null;
      }
    } else {
      console.log('[Storage] Using AsyncStorage.getItem');
      const value = await AsyncStorage.getItem(key);
      console.log('[Storage] AsyncStorage.getItem returned:', !!value);
      return value;
    }
  }

  /**
   * Remove a value
   * @param key Storage key
   */
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('[Storage] localStorage.removeItem failed:', error);
        throw new Error('Failed to remove data');
      }
    } else {
      await AsyncStorage.removeItem(key);
    }
  }

  /**
   * Clear all storage
   * WARNING: This clears ALL data, not just FitFlow data
   */
  async clear(): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.clear();
      } catch (error) {
        console.error('[Storage] localStorage.clear failed:', error);
        throw new Error('Failed to clear storage');
      }
    } else {
      await AsyncStorage.clear();
    }
  }
}

export default new Storage();
