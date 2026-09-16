import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_REMEMBER_ME, STORAGE_REMEMBERED_EMAIL } from '../constants/storageKeys';

const PASSWORD_KEY = 'ryr_remember_me_password';

export async function loadRememberMeCredentials() {
  try {
    const enabled = (await AsyncStorage.getItem(STORAGE_REMEMBER_ME)) === '1';
    if (!enabled) {
      return { enabled: false, email: '', password: '' };
    }
    const email = (await AsyncStorage.getItem(STORAGE_REMEMBERED_EMAIL)) ?? '';
    let password = '';
    try {
      password = (await SecureStore.getItemAsync(PASSWORD_KEY)) ?? '';
    } catch {
      password = '';
    }
    return { enabled: true, email, password };
  } catch {
    return { enabled: false, email: '', password: '' };
  }
}

export async function saveRememberMeCredentials(email, password) {
  const trimmedEmail = email.trim();
  await AsyncStorage.multiSet([
    [STORAGE_REMEMBER_ME, '1'],
    [STORAGE_REMEMBERED_EMAIL, trimmedEmail],
  ]);
  await SecureStore.setItemAsync(PASSWORD_KEY, password);
}

export async function clearRememberMeCredentials() {
  await AsyncStorage.multiRemove([STORAGE_REMEMBER_ME, STORAGE_REMEMBERED_EMAIL]).catch(() => {});
  await SecureStore.deleteItemAsync(PASSWORD_KEY).catch(() => {});
}
