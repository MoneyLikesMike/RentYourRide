import React, { useCallback, useState } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { getMe } from '../services/usersApi';
import { submitLicenseToDidit } from '../services/diditLicenseFlow';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = uiScale;

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

export default function LicenseVerificationScreen({ navigation }) {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

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

  const verified = !!me?.licenseVerified;
  const label = statusLabel(me);
  const status = (me?.licenseVerificationStatus || '').trim();
  const showPending =
    status === 'pending_review' || status === 'in_progress' || status === 'awaiting_user';

  const handleVerify = async () => {
    if (showPending) {
      navigation.navigate('LicenseVerificationPendingScreen');
      return;
    }

    setBusy(true);
    try {
      const result = await submitLicenseToDidit();

      if (result.type === 'completed') {
        navigation.navigate('LicenseVerificationPendingScreen');
        refresh();
        return;
      }

      if (result.type === 'cancelled') {
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
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.statusLabel}>Status</Text>
          <Text style={[styles.statusValue, verified && styles.statusVerified]}>{label}</Text>

          {me?.licenseNumber ? (
            <Text style={styles.licenseNumber}>License on file: {me.licenseNumber}</Text>
          ) : null}

          <View style={styles.disclosureBox}>
            <Text style={styles.disclosureTitle}>Identity verification</Text>
            <Text style={styles.disclosureBody}>
              To rent or list vehicles, we verify your driver&apos;s license with Didit. You will
              scan your license and complete a short liveness check in the Didit flow. Images are
              processed by Didit for verification only.
            </Text>
          </View>

          {!verified ? (
            <TouchableOpacity
              style={[styles.primaryButton, busy && styles.primaryButtonDisabled]}
              onPress={handleVerify}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {showPending ? 'View submission status' : 'Verify my license'}
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <Text style={styles.verifiedNote}>
              Your license is verified. Contact support if your details change.
            </Text>
          )}

          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={() => navigation.navigate('ChangeLicenseScreen')}
          >
            <Text style={styles.secondaryLinkText}>Update license number manually</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'ios' ? 56 : 24 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16 * scale,
    paddingBottom: 16,
  },
  backButton: {
    marginRight: 8 * scale,
  },
  title: {
    flex: 1,
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  headerSpacer: { width: 31 * scale },
  loader: { marginTop: 40 },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  statusLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12,
    color: COLORS.GREENY_BLUE_TWO,
    marginTop: 8,
  },
  statusValue: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 22,
    color: 'rgb(80,80,80)',
    marginTop: 4,
    marginBottom: 12,
  },
  statusVerified: { color: COLORS.GREENY_BLUE_TWO },
  licenseNumber: {
    fontFamily: FONTS.NUNITO_REGULAR,
    fontSize: 14,
    color: 'rgb(120,120,120)',
    marginBottom: 20,
  },
  disclosureBox: {
    backgroundColor: '#f7faf9',
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e8f0ee',
  },
  disclosureTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15,
    color: COLORS.GREENY_BLUE_TWO,
    marginBottom: 8,
  },
  disclosureBody: {
    fontFamily: FONTS.NUNITO_REGULAR,
    fontSize: 14,
    color: 'rgb(90,90,90)',
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 16,
    color: '#fff',
  },
  verifiedNote: {
    fontFamily: FONTS.NUNITO_REGULAR,
    fontSize: 14,
    color: 'rgb(100,100,100)',
    lineHeight: 20,
    marginBottom: 16,
  },
  secondaryLink: { marginTop: 20, alignItems: 'center' },
  secondaryLinkText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14,
    color: COLORS.MANGO_TWO,
  },
});
