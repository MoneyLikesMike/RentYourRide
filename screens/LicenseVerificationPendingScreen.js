import React, { useCallback, useState } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { getMe } from '../services/usersApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = uiScale;
const TITLE_COLOR = 'rgb(14, 38, 43)';

function statusLabel(me) {
  if (me?.licenseVerified) return 'Verified';
  const s = (me?.licenseVerificationStatus || '').trim();
  if (s === 'pending_review') return 'In review';
  if (s === 'in_progress') return 'In review';
  return 'Submitted';
}

export default function LicenseVerificationPendingScreen({ navigation }) {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setMe(await getMe());
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

  const handleContinue = () => {
    navigation.navigate('VerificationStepsScreen');
  };

  const verified = !!me?.licenseVerified;
  const label = statusLabel(me);

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
        <Text style={styles.headerTitle}>LICENSE VERIFICATION</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.illustrationWrap}>
          <Image
            source={require('../assets/icons/licenseVerification.png')}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        <View style={styles.titleRow}>
          <View style={styles.titleAccent} />
          <Text style={styles.heading}>
            {verified ? 'Your license is verified' : "We're still reviewing your license"}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.GREENY_BLUE_TWO} style={styles.loader} />
        ) : (
          <>
            {!verified ? (
              <Text style={styles.statusLine}>Status: {label}</Text>
            ) : null}
            <Text style={styles.body}>
              {verified
                ? 'You are cleared to rent and list on Rent Your Ride. Contact support if your license details change.'
                : "You look good! Please give us a moment to verify your ID. We will send you an email once you're verified or if we need more information."}
            </Text>
          </>
        )}

        <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.continueButtonText}>Continiue</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16 * scale,
    paddingBottom: 12 * scale,
  },
  backButton: {
    marginRight: 8 * scale,
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    color: 'rgb(100, 100, 100)',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  headerRightSpacer: {
    width: 31 * scale,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32 * scale,
    paddingTop: 40 * scale,
    paddingBottom: 40 * scale,
  },
  illustrationWrap: {
    alignItems: 'center',
    marginBottom: 32 * scale,
  },
  illustration: {
    width: 191 * scale,
    height: 190 * scale,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12 * scale,
  },
  titleAccent: {
    width: 24 * scale,
    height: 4 * scale,
    borderRadius: 2 * scale,
    backgroundColor: COLORS.YELLOWISH_ORANGE,
    marginRight: 10 * scale,
    marginTop: 10 * scale,
  },
  heading: {
    flex: 1,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 22 * scale,
    color: TITLE_COLOR,
    lineHeight: 30 * scale,
    textAlign: 'left',
  },
  loader: {
    marginVertical: 16 * scale,
  },
  statusLine: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    marginBottom: 10 * scale,
  },
  body: {
    fontFamily: FONTS.NUNITO_REGULAR,
    fontSize: 15 * scale,
    color: 'rgb(100, 100, 100)',
    lineHeight: 23 * scale,
    marginBottom: 48 * scale,
  },
  continueButton: {
    width: 273 * scale,
    height: 50 * scale,
    alignSelf: 'center',
    borderRadius: 25 * scale,
    borderWidth: 2,
    borderColor: COLORS.YELLOWISH_ORANGE,
    backgroundColor: 'rgba(255, 178, 20, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 16 * scale,
    color: COLORS.YELLOWISH_ORANGE,
    letterSpacing: 0.2,
  },
});
