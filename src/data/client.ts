import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const storage = {
  async getItem(key: string) {
    if (Platform.OS === 'web') return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
    const count = Number(await SecureStore.getItemAsync(`${key}.count`));
    if (!count) return null;
    const parts = await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)),
    );
    return parts.some((x) => x === null) ? null : parts.join('');
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await this.removeItem(key);
    const parts = value.match(/[\s\S]{1,1800}/g) || [];
    for (let i = 0; i < parts.length; i++) await SecureStore.setItemAsync(`${key}.${i}`, parts[i]);
    await SecureStore.setItemAsync(`${key}.count`, String(parts.length));
  },
  async removeItem(key: string) {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    const count = Number(await SecureStore.getItemAsync(`${key}.count`));
    for (let i = 0; i < count; i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
    await SecureStore.deleteItemAsync(`${key}.count`);
  },
};
export const backendConfigured = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);
export const demoEnabled = process.env.EXPO_PUBLIC_DEMO_ENABLED !== 'false';
export const supabase: SupabaseClient | null = backendConfigured
  ? createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null;
