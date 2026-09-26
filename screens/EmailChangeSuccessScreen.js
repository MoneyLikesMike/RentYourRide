import React, { useCallback, useState } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { STORAGE_AUTH_USER } from '../constants/storageKeys';
import { useAuth } from '../context/AuthContext';
import { confirmEmailChange } from '../services/authApi';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = uiScale;

export default function EmailChangeSuccessScreen({ navigation, route }) {
  const token = (route?.params?.token || '').trim();
  const { applyUser } = useAuth();
  const [busy, setBusy] = useState(false);

  const onOk = useCallback(async () => {
    if (busy) return;
    if (!token) {
      Alert.alert(
        'Missing link',
        'Open the confirmation link from your email again.',
      );
      return;
    }
    setBusy(true);
    try {
      const result = await confirmEmailChange(token);
      const next = result?.user;
      if (next && applyUser) {
        await applyUser(next);
      } else if (next?.email) {
        const raw = await AsyncStorage.getItem(STORAGE_AUTH_USER);
        if (raw) {
          try {
            const prev = JSON.parse(raw);
            const merged = { ...prev, email: next.email };
            await AsyncStorage.setItem(STORAGE_AUTH_USER, JSON.stringify(merged));
          } catch {
            /* ignore */
          }
        }
      }
      if (navigation?.canGoBack?.()) {
        navigation.goBack();
      } else if (navigation?.navigate) {
        navigation.navigate('MainTabs', {
          screen: 'ProfileScreen',
          params: { screen: 'ContactInformationScreen' },
        });
      }
    } catch (e) {
      Alert.alert(
        'Could not update email',
        e?.message || 'This link is invalid or has expired. Request a new one from Contact Information.',
      );
    } finally {
      setBusy(false);
    }
  }, [applyUser, busy, navigation, token]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../assets/icons/email-change-success.png')}
          style={styles.icon}
          resizeMode="contain"
        />
        <View style={styles.successTextContainer}>
          <View style={styles.emailHighlight} />
          <Text style={styles.successText}>
            <Text style={styles.emailText}>Email</Text> change successful
          </Text>
        </View>
      </View>
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.okButton, busy && styles.okButtonDisabled]}
          onPress={() => void onOk()}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.okButtonText}>Ok</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  icon: {
    width: 180 * scale,
    height: 180 * scale,
    marginBottom: 24 * scale,
  },
  successTextContainer: {
    position: 'relative',
    width: 253,
    height: 73,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 22,
    color: 'rgb(14,38,43)',
    textAlign: 'center',
    width: 253,
    height: 73,
    zIndex: 1,
  },
  emailHighlight: {
    position: 'absolute',
    left: 48,
    top: 16,
    width: 58,
    height: 13,
    backgroundColor: 'rgba(255, 177, 49, 0.3)',
    borderRadius: 5,
    zIndex: 0,
  },
  emailText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 22,
    color: 'rgb(14,38,43)',
    zIndex: 1,
  },
  bottomContainer: {
    width: '100%',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 56,
  },
  okButton: {
    width: 250,
    height: 50,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  okButtonDisabled: {
    opacity: 0.7,
  },
  okButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16,
    color: 'rgb(247,247,247)',
    letterSpacing: 0.2,
    textAlign: 'center',
    width: 170,
    height: 22,
  },
});
