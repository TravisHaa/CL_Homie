import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'homie:deviceId';

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const fresh = generateUuid();
  await AsyncStorage.setItem(STORAGE_KEY, fresh);
  return fresh;
}
