import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { startVerification } from '@didit-protocol/sdk-react-native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { getMe } from '../services/usersApi';
import { createDiditLicenseSession } from '../services/diditApi';

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
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const handleVerify = async () => {
    setBusy(true);
    try {
      const session = await createDiditLicenseSession();
      const token = session?.session_token;
      if (!token) {
        throw new Error('Could not start verification session.');
      }

      const result = await startVerification(token);

      if (result.type === 'completed') {
        Alert.alert(
          'Submitted',
          'Your license verification was submitted. We will update your status shortly after review.',
          [{ text: 'OK', onPress: refresh }],
        );
      } else if (result.type === 'cancelled') {
        Alert.alert('Cancelled', 'You can verify your license anytime from this screen.');
      } else if (result.type === 'failed') {
        Alert.alert(
          'Verification failed',
          result.error?.message || 'Something went wrong. Please try again.',
        );
      }
    } catch (e) {
      Alert.alert('Could not start verification', e?.message || 'Please try again later.');
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const verified = !!me?.licenseVerified;
  const label = statusLabel(me);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>LICENSE</Text>
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
              To rent or list vehicles, we verify your driver's license with our identity
              partner Didit. You will be asked to scan your license and complete a short liveness
              check. Images are processed by Didit for verification only.
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
                <Text style={styles.primaryButtonText}>Verify my license</Text>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { fontFamily: FONTS.NUNITO_BOLD, fontSize: 15, color: 'rgb(100,100,100)' },
  back: { fontFamily: FONTS.NUNITO_SEMIBOLD, fontSize: 16, color: COLORS.MANGO_TWO },
  headerSpacer: { width: 48 },
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
