import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from './client';
import type { Command, Payload } from '../domain/types';
type Execute = (action: Command, p?: Payload) => Promise<Record<string, unknown>>;
export async function pickAndUploadImage(command: Execute, demo: boolean) {
  const pick = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.8,
  });
  if (pick.canceled) return null;
  const image = await manipulateAsync(pick.assets[0].uri, [{ resize: { width: 1200 } }], {
    compress: 0.8,
    format: SaveFormat.JPEG,
  });
  if (demo) return image.uri;
  const { path } = await command('media_register');
  if (!path || !supabase) throw Error('BACKEND_NOT_CONFIGURED');
  const data = await (await fetch(image.uri)).arrayBuffer();
  if (data.byteLength > 5 * 1024 * 1024) throw Error('IMAGE_TOO_LARGE');
  const { error } = await supabase.storage
    .from('media')
    .upload(String(path), data, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return String(path);
}
export async function registerPush(command: Execute) {
  if (Platform.OS === 'web' || !Device.isDevice) throw Error('IPHONE_REQUIRED');
  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') throw Error('NOTIFICATION_PERMISSION_DENIED');
  const token = await Notifications.getDevicePushTokenAsync();
  await command('device_register', { token: String(token.data), platform: Platform.OS });
}
