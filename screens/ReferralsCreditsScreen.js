import React, { useCallback, useState } from 'react';
import { uiScale } from '../utils/uiScale';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useAuth } from '../context/AuthContext';
import { getReferralsSummary } from '../services/referralsApi';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = uiScale;

const INVITE_COPY =
  'Share your referral link. When a friend completes their first trip as a guest, you can earn account credit.';
const HOST_COPY =
  'Invite someone to list their vehicle. When they become a host and complete qualifying trips, you can earn credit.';

function InviteFriendIcon({ size = 44 }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={require('../assets/usersAdd.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

function ReferHostIcon({ size = 44 }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={require('../assets/icons/list-a-new-ride.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

export default function ReferralsCreditsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isReady } = useAuth();
  const [accountSummary, setAccountSummary] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!isAuthenticated || !isReady) {
        setAccountSummary(null);
        return undefined;
      }
      (async () => {
        try {
          const row = await getReferralsSummary();
          if (!cancelled && row) setAccountSummary(row);
        } catch {
          if (!cancelled) setAccountSummary(null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [isAuthenticated, isReady]),
  );

  const onInviteFriend = useCallback(() => {
    navigation.navigate('InviteFriendScreen', {
      referralCode: accountSummary?.referralCode || '',
    });
  }, [navigation, accountSummary?.referralCode]);

  const onReferHost = useCallback(() => {
    navigation.navigate('ReferHostScreen', {
      referralCode: accountSummary?.referralCode || '',
    });
  }, [navigation, accountSummary?.referralCode]);

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
          <Text style={styles.headerText}>REFERRALS & CREDITS</Text>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {accountSummary && isAuthenticated ? (
          <View style={styles.summaryBanner}>
            <Text style={styles.summaryBannerTitle}>Referrals & credits</Text>
            <Text style={styles.summaryBannerLine}>
              Your code:{' '}
              <Text style={styles.summaryBannerEmphasis}>{accountSummary.referralCode || '—'}</Text>
            </Text>
            <Text style={styles.summaryBannerLine}>
              Credit balance:{' '}
              <Text style={styles.summaryBannerEmphasis}>
                ${Number(accountSummary.creditsBalance ?? 0).toFixed(2)}
              </Text>
            </Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.row} onPress={onInviteFriend} activeOpacity={0.85}>
          <View style={styles.rowTextCol}>
            <Text style={styles.rowTitle}>INVITE FRIEND</Text>
            <Text style={styles.rowDesc}>{INVITE_COPY}</Text>
          </View>
          <InviteFriendIcon />
        </TouchableOpacity>

        <View style={styles.rowDivider} />

        <TouchableOpacity style={styles.row} onPress={onReferHost} activeOpacity={0.85}>
          <View style={styles.rowTextCol}>
            <Text style={styles.rowTitle}>REFER A HOST</Text>
            <Text style={styles.rowDesc}>{HOST_COPY}</Text>
          </View>
          <ReferHostIcon />
        </TouchableOpacity>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 24 * scale,
    paddingTop: 8 * scale,
  },
  summaryBanner: {
    backgroundColor: 'rgb(250, 250, 250)',
    borderRadius: 12 * scale,
    padding: 16 * scale,
    marginBottom: 16 * scale,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgb(235, 235, 235)',
  },
  summaryBannerTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 14 * scale,
    color: COLORS.BLACK,
    marginBottom: 10 * scale,
  },
  summaryBannerLine: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: 'rgb(100, 100, 100)',
    marginBottom: 6 * scale,
  },
  summaryBannerEmphasis: {
    fontFamily: FONTS.NUNITO_BOLD,
    color: COLORS.GREENY_BLUE_TWO,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20 * scale,
  },
  rowTextCol: {
    flex: 1,
    paddingRight: 16 * scale,
  },
  rowTitle: {
    width: 166 * scale,
    height: 15 * scale,
    textAlign: 'left',
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    lineHeight: 15 * scale,
    color: 'rgba(0, 0, 0, 0.6994977678571429)',
    letterSpacing: 0.2,
    marginBottom: 8 * scale,
  },
  rowDesc: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    lineHeight: 19 * scale,
    color: 'rgb(171, 171, 171)',
    letterSpacing: 0.1,
  },
  rowDivider: {
    width: 313 * scale,
    height: 2 * scale,
    alignSelf: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgb(235, 235, 235)',
  },
});
