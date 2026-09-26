import React, { useCallback, useState } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { getMe } from '../services/usersApi';
import { submitLicenseToDidit } from '../services/diditLicenseFlow';
import { abandonDiditLicenseSession } from '../services/diditApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = uiScale;

const BODY_COPY =
  'Rent Your Ride verifies the I.D. of every user on the platform. Please ensure that you are a minimum of 18 years old and hold a valid drivers license.';

function statusLabel(me) {
  if (me?.licenseVerified) return 'Verified';
  const s = (me?.licenseVerificationStatus || '').trim();
  if (s === 'pending_review') return 'In review';
  if (s === 'declined') return 'Declined';
  if (s === 'resubmitted') return 'Resubmit required';
  if (s === 'in_progress') return 'In progress';
  if (s === 'awaiting_user') return 'Awaiting your action';
  if (s === 'expired') return 'Expired — verify again';
  return 'Not verified';
}

/**
 * Intro + Didit start (legacy LicenseVerificationFirst).
 * Already-approved users confirm via LicenseAlreadyApprovedModal on Contact Information,
 * then land here to re-run the same flow.
 */
export default function LicenseVerificationScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  // Tab bar is hidden on this screen (CustomTabBar); pad for home indicator only.
  const bottomPad = Math.max(insets.bottom, 16) + 24 * scale;

  const refresh = useCallback(async () => {
    try {
      const profile = await getMe();
      setMe(profile);
    } catch (_) {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      refresh();
    }, [refresh]),
  );

  const status = (me?.licenseVerificationStatus || '').trim();
  // Only true "in review" blocks retry. Mid-flow abandon leaves in_progress — allow re-upload.
  const showPending = !me?.licenseVerified && status === 'pending_review';
  const canRetryAbandoned =
    !me?.licenseVerified &&
    (status === 'in_progress' || status === 'awaiting_user');

  const handleNext = async () => {
    if (showPending) {
      navigation.navigate('LicenseVerificationPendingScreen');
      return;
    }

    setBusy(true);
    try {
      if (canRetryAbandoned) {
        try {
          await abandonDiditLicenseSession();
        } catch (_) {
          /* still attempt a new session */
        }
      }

      const result = await submitLicenseToDidit();

      if (result.type === 'completed') {
        navigation.navigate('LicenseVerificationPendingScreen');
        refresh();
        return;
      }

      if (result.type === 'cancelled') {
        try {
          await abandonDiditLicenseSession();
        } catch (_) {
          /* ignore */
        }
        Alert.alert('Cancelled', 'You can verify your license anytime from this screen.');
        return;
      }

      Alert.alert(
        'Verification failed',
        result.error?.message || 'Something went wrong. Please try again.',
      );
    } catch (e) {
      Alert.alert('Could not start verification', e?.message || 'Please try again later.');
    } finally {
      setBusy(false);
      refresh();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path
              d="M31 8L17 24L31 40"
              stroke={COLORS.MANGO_TWO}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.title}>LICENSE VERIFICATION</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.GREENY_BLUE_TWO} />
      ) : (
        <View style={[styles.main, { paddingBottom: bottomPad }]}>
          <View style={styles.hero}>
            <Image
              source={require('../assets/icons/licenseVerification.png')}
              style={styles.heroImage}
              resizeMode="contain"
            />
            <View style={styles.headlineWrap}>
              <View style={styles.letsHighlight} />
              <Text style={styles.headline}>
                <Text style={styles.headlineLets}>Let&apos;s</Text> add your license
              </Text>
            </View>
            <Text style={styles.body}>{BODY_COPY}</Text>
            {showPending ? (
              <Text style={styles.statusHint}>Status: {statusLabel(me)}</Text>
            ) : canRetryAbandoned ? (
              <Text style={styles.statusHint}>
                Previous attempt was not finished — tap Next to try again.
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.nextButton, busy && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color={COLORS.YELLOWISH_ORANGE} />
            ) : (
              <Text style={styles.nextButtonText}>
                {showPending ? 'View status' : canRetryAbandoned ? 'Try again' : 'Next'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    width: SCREEN_WIDTH,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16 * scale,
    paddingBottom: 8,
  },
  backButton: {
    marginRight: 8 * scale,
    zIndex: 2,
  },
  title: {
    flex: 1,
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  headerSpacer: { width: 31 * scale },
  loader: { marginTop: 40 },
  main: {
    flex: 1,
    paddingHorizontal: 50 * scale,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    paddingTop: 28 * scale,
  },
  heroImage: {
    width: 190 * scale,
    height: 190 * scale,
    marginBottom: 24 * scale,
  },
  headlineWrap: {
    position: 'relative',
    marginBottom: 28 * scale,
    alignItems: 'center',
  },
  letsHighlight: {
    position: 'absolute',
    left: 0,
    top: 14 * scale,
    width: 52 * scale,
    height: 12 * scale,
    backgroundColor: 'rgba(255, 177, 49, 0.35)',
    borderRadius: 4,
    zIndex: 0,
  },
  headline: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 22 * scale,
    color: 'rgb(14,38,43)',
    textAlign: 'center',
    zIndex: 1,
  },
  headlineLets: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 22 * scale,
    color: 'rgb(14,38,43)',
  },
  body: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: 'rgb(142,142,142)',
    lineHeight: 23 * scale,
    textAlign: 'center',
  },
  statusHint: {
    marginTop: 16 * scale,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    textAlign: 'center',
  },
  nextButton: {
    width: '100%',
    height: 50 * scale,
    borderRadius: 25 * scale,
    borderWidth: 2,
    borderColor: COLORS.YELLOWISH_ORANGE,
    backgroundColor: 'rgba(255,178,20,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.7,
  },
  nextButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16 * scale,
    color: COLORS.YELLOWISH_ORANGE,
    letterSpacing: 0.2,
  },
});
