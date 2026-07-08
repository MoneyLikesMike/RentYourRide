import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getReferralsSummary } from '../services/referralsApi';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;

const DEFAULT_EARNINGS = { dollars: '0', currency: 'CAD' };

function EarningsLine({ dollars, currency, caption }) {
  return (
    <View style={styles.earningsBlock}>
      <View style={styles.amountLine}>
        <Text style={styles.amountDollars}>${dollars}</Text>
        <Text style={styles.amountCurrency}> {currency}</Text>
      </View>
      <Text style={styles.earningsCaption}>{caption}</Text>
    </View>
  );
}

export default function TravelCreditScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isReady } = useAuth();
  const [credits, setCredits] = useState(DEFAULT_EARNINGS);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated || !isReady) {
        setCredits(DEFAULT_EARNINGS);
        return undefined;
      }
      let cancelled = false;
      (async () => {
        try {
          const row = await getReferralsSummary();
          if (cancelled || !row) return;
          const balance = Number(row.creditsBalance ?? 0);
          setCredits({
            dollars: Number.isFinite(balance) ? balance.toFixed(2) : '0',
            currency: 'CAD',
          });
        } catch {
          if (!cancelled) setCredits(DEFAULT_EARNINGS);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [isAuthenticated, isReady]),
  );

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
          <Text style={styles.headerText}>YOUR EARNINGS</Text>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 * scale }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.scrollInner}>
          <EarningsLine
            dollars={credits.dollars}
            currency={credits.currency}
            caption="Travel credit balance"
          />
          <Text style={styles.pendingDetail}>
            Pending referral details will appear here when the referrals API supports them.
          </Text>
        </View>
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
    paddingTop: 20 * scale,
    alignItems: 'flex-start',
  },
  scrollInner: {
    width: '100%',
    alignSelf: 'flex-start',
  },
  earningsBlock: {
    marginBottom: 22 * scale,
    alignSelf: 'flex-start',
  },
  amountLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6 * scale,
  },
  amountDollars: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 22 * scale,
    color: COLORS.GREENY_BLUE_TWO,
  },
  amountCurrency: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 22 * scale,
    color: COLORS.MANGO_TWO,
  },
  earningsCaption: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: 'rgb(171, 171, 171)',
    letterSpacing: 0.1,
  },
  sectionHeadingFrame: {
    marginTop: 16 * scale,
    marginBottom: 16 * scale,
    alignSelf: 'flex-start',
  },
  pendingDetail: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    lineHeight: 18 * scale,
    color: 'rgb(171, 171, 171)',
    letterSpacing: 0.1,
  },
});
