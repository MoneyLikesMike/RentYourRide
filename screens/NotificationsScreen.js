import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useAuth } from '../context/AuthContext';
import { getNotificationSettings, patchNotificationSettings } from '../services/usersApi';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;

const NOTIFICATION_PREFS_KEY = '@ryr_notification_prefs';

async function persistLocal(payload) {
  await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(payload));
}

export default function NotificationsScreen({ navigation }) {
  const { isAuthenticated, isReady } = useAuth();
  const [textNotif, setTextNotif] = useState(false);
  const [emailNotif, setEmailNotif] = useState(false);
  const [pushNotif, setPushNotif] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
        if (cancelled) return;
        if (raw) {
          const p = JSON.parse(raw);
          if (typeof p.textNotif === 'boolean') setTextNotif(p.textNotif);
          if (typeof p.emailNotif === 'boolean') setEmailNotif(p.emailNotif);
          if (typeof p.pushNotif === 'boolean') setPushNotif(p.pushNotif);
        }
      } catch (_) {
        /* keep defaults */
      } finally {
        if (!cancelled) setPrefsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!prefsLoaded || !isAuthenticated || !isReady) return;
      let cancelled = false;
      (async () => {
        try {
          const s = await getNotificationSettings();
          if (cancelled || !s || typeof s !== 'object') return;
          const t = !!s.textNotif;
          const e = !!s.emailNotif;
          const p = !!s.pushNotif;
          setTextNotif(t);
          setEmailNotif(e);
          setPushNotif(p);
          await persistLocal({ textNotif: t, emailNotif: e, pushNotif: p });
        } catch (_) {
          /* offline */
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [prefsLoaded, isAuthenticated, isReady]),
  );

  useEffect(() => {
    if (!prefsLoaded) return;
    persistLocal({ textNotif, emailNotif, pushNotif }).catch(() => {});
  }, [prefsLoaded, textNotif, emailNotif, pushNotif]);

  const pushRemote = async (t, e, p) => {
    if (!isAuthenticated || !isReady) return;
    try {
      await patchNotificationSettings({ textNotif: t, emailNotif: e, pushNotif: p });
    } catch (_) {
      /* ignore */
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Svg width={23} height={23} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke={COLORS.MANGO_TWO} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <View style={styles.headerTextFlexWrapper}>
          <Text style={styles.headerText}>NOTIFICATIONS</Text>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>
      {/* Toggles */}
      <View style={styles.toggleContainer}>
        {/* Text Notifications */}
        <View style={styles.sectionWrapper}>
          <View style={styles.headerRowWithToggle}>
            <Text style={styles.sectionHeader}>TEXT NOTIFICATIONS</Text>
            <Switch
              value={textNotif}
              onValueChange={(v) => {
                setTextNotif(v);
                pushRemote(v, emailNotif, pushNotif);
              }}
              trackColor={{ false: '#e0e0e0', true: COLORS.GREENY_BLUE_TWO }}
              thumbColor="#fff"
            />
          </View>
          <Text style={styles.sectionDescription}>
            Receive important messages like booking requests, booking reminders, approvals, and messages from hosts or guests. These will be sent directly to your phone through text message.
          </Text>
        </View>
        <View style={styles.divider} />
        {/* Email Notifications */}
        <View style={styles.sectionWrapper}>
          <View style={styles.headerRowWithToggle}>
            <Text style={styles.sectionHeader}>EMAIL NOTIFICATIONS</Text>
            <Switch
              value={emailNotif}
              onValueChange={(v) => {
                setEmailNotif(v);
                pushRemote(textNotif, v, pushNotif);
              }}
              trackColor={{ false: '#e0e0e0', true: COLORS.GREENY_BLUE_TWO }}
              thumbColor="#fff"
            />
          </View>
          <Text style={styles.sectionDescription}>
            Receive important messages like booking requests, booking reminders, approvals, and messages from hosts or guests. These will be sent directly to you through email.
          </Text>
        </View>
        <View style={styles.divider} />
        {/* Push Notifications */}
        <View style={styles.sectionWrapper}>
          <View style={styles.headerRowWithToggle}>
            <Text style={styles.sectionHeader}>PUSH NOTIFICATIONS</Text>
            <Switch
              value={pushNotif}
              onValueChange={(v) => {
                setPushNotif(v);
                pushRemote(textNotif, emailNotif, v);
              }}
              trackColor={{ false: '#e0e0e0', true: COLORS.GREENY_BLUE_TWO }}
              thumbColor="#fff"
            />
          </View>
          <Text style={styles.sectionDescription}>
            Receive important messages like booking requests, booking reminders, approvals, and messages from hosts or guests. These will be sent directly to your phone through our app.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    width: SCREEN_WIDTH,
    height: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  backButton: {
    marginRight: 16,
  },
  headerTextFlexWrapper: {
    flex: 1,
    marginLeft: 39,
    marginRight: 39,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightSpacer: {
    width: 39,
  },
  headerText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.2,
    textAlign: 'center',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  toggleContainer: {
    marginTop: 32 * scale,
    paddingHorizontal: 24,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18 * scale,
  },
  toggleLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16,
    color: COLORS.BLACK,
    letterSpacing: 0.2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    width: '100%',
  },
  sectionWrapper: {
    marginTop: 18 * scale,
    marginBottom: 2 * scale,
    alignItems: 'flex-start',
    width: 312 * scale,
  },
  headerRowWithToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 312 * scale,
    marginBottom: 2 * scale,
  },
  sectionHeader: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: '#000',
    letterSpacing: 0.2,
    height: 15 * scale,
    textAlign: 'left',
    opacity: 0.7,
    marginBottom: 0,
    marginRight: 12 * scale,
  },
  sectionDescription: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12,
    color: 'rgb(142,142,142)',
    letterSpacing: 0.2,
    width: 312 * scale,
    textAlign: 'left',
    marginTop: 20 * scale,
    marginBottom: 20 * scale,
  },
});
