import React, { useCallback, useState, useMemo } from 'react';
import { uiScale } from '../utils/uiScale';
import { useRoute } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import ShareLinkModal from './ShareLinkModal';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = uiScale;

const REFERRAL_BASE = 'https://rentyourride.com/invite';
const CREDIT_DISPLAY = '$25';

const HEADLINE_COLOR = 'rgb(14, 38, 43)';

function ChevronRight() {
  return (
    <Svg width={10 * scale} height={16 * scale} viewBox="0 0 10 16" fill="none">
      <Path
        d="M2 2L8 8L2 14"
        stroke={COLORS.GREENY_BLUE_TWO}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function ReferHostScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const referralCode = route.params?.referralCode?.trim?.() || '';
  const referralLink = useMemo(() => {
    if (!referralCode) return REFERRAL_BASE;
    return `${REFERRAL_BASE}?code=${encodeURIComponent(referralCode)}`;
  }, [referralCode]);
  const hostShareMessage = useMemo(
    () => `List your vehicle on Rent Your Ride and earn. ${referralLink}`,
    [referralLink],
  );
  const [shareModalVisible, setShareModalVisible] = useState(false);

  const onCopyLink = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(referralLink);
      Alert.alert('Link copied', 'Your referral link was copied to the clipboard.');
    } catch (_) {
      Alert.alert('Could not copy', 'Please try again.');
    }
  }, [referralLink]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={12}>
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
        <View style={styles.headerTextFlexWrapper}>
          <Text style={styles.headerText}>REFER A HOST</Text>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 * scale + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headlineFrame}>
          <Text style={styles.headline}>
            {`Earn ${CREDIT_DISPLAY} for every new host you refer to Rent Your Ride`}
          </Text>
        </View>

        <View style={styles.bodyFrame}>
          <Text style={styles.bodyParagraph}>
            {`Friends who start hosting their vehicle will earn you ${CREDIT_DISPLAY} when they complete their first rental.`}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.listRow}
          onPress={() => navigation.navigate('TravelCreditScreen')}
          activeOpacity={0.85}
        >
          <Text style={styles.listRowLabel}>YOUR EARNINGS</Text>
          <ChevronRight />
        </TouchableOpacity>

        <View style={styles.rowDivider} />

        <TouchableOpacity
          style={styles.listRow}
          onPress={() => navigation.navigate('TermsAndConditionsScreen')}
          activeOpacity={0.85}
        >
          <Text style={styles.listRowLabel}>TERMS & CONDITIONS</Text>
          <ChevronRight />
        </TouchableOpacity>

        <Text style={styles.hostCallout}>
          Know someone who would like to earn money from while renting out their car?
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.copyLinkButton}
            onPress={onCopyLink}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Copy referral link"
          >
            <Text style={styles.copyLinkText}>Copy link</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => setShareModalVisible(true)}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Share your referral link"
          >
            <Text style={styles.shareButtonText}>Share your link</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ShareLinkModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        referralLink={referralLink}
        shareMessage={hostShareMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16 * scale,
    paddingHorizontal: 20 * scale,
    backgroundColor: '#fff',
  },
  backButton: {
    marginRight: 16,
    justifyContent: 'center',
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
    fontSize: 15 * scale,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24 * scale,
    paddingTop: 8 * scale,
  },
  headlineFrame: {
    width: 305 * scale,
    height: 73 * scale,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    marginBottom: 16 * scale,
  },
  headline: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 22 * scale,
    lineHeight: 28 * scale,
    color: HEADLINE_COLOR,
    textAlign: 'left',
  },
  bodyFrame: {
    width: 315 * scale,
    height: 83 * scale,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    marginBottom: 24 * scale,
  },
  bodyParagraph: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    lineHeight: 22 * scale,
    color: 'rgb(171, 171, 171)',
    letterSpacing: -0.2,
    textAlign: 'left',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16 * scale,
  },
  listRowLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: 'rgba(0, 0, 0, 0.6994977678571429)',
    letterSpacing: 0.2,
  },
  rowDivider: {
    width: 313 * scale,
    height: 2 * scale,
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgb(235, 235, 235)',
  },
  hostCallout: {
    marginTop: 24 * scale,
    marginBottom: 4 * scale,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    lineHeight: 19 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.1,
    textAlign: 'left',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24 * scale + 225,
    paddingVertical: 8 * scale,
  },
  copyLinkButton: {
    flexShrink: 0,
    justifyContent: 'center',
    paddingVertical: 10 * scale,
    marginLeft: 20,
  },
  copyLinkText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: COLORS.MANGO_TWO,
  },
  shareButton: {
    flexShrink: 0,
    width: 167 * scale,
    height: 50 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25 * scale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: '#fff',
  },
});
