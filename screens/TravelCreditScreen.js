import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;

const AVATAR = 48 * scale;
const RADIUS = AVATAR / 2;

const MOCK_POTENTIAL = { dollars: '500', currency: 'CAD' };
const MOCK_PAID_OUT = { dollars: '0', currency: 'CAD' };

const MOCK_PENDING = [
  {
    id: 'p1',
    name: 'Lisa Mackenzie',
    detail: 'signed up, but hasn’t taken a ride yet.',
    avatar: require('../assets/9FA9F20E-2AF4-497F-9F61-3E2520D0671D_1_105_c.jpeg'),
  },
  { id: 'p2', name: 'Anna Torn', detail: 'hasn’t signed up yet', placeholder: true },
  { id: 'p3', name: 'Lil Jon', detail: 'hasn’t signed up yet', placeholder: true },
  { id: 'p4', name: 'Elena Johnson', detail: 'hasn’t signed up yet', placeholder: true },
];

function PlaceholderAvatar() {
  return (
    <View style={styles.placeholderAvatar}>
      <Ionicons name="person" size={22 * scale} color={COLORS.GREENY_BLUE_TWO} />
    </View>
  );
}

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
            dollars={MOCK_POTENTIAL.dollars}
            currency={MOCK_POTENTIAL.currency}
            caption="Potential earnings"
          />
          <EarningsLine
            dollars={MOCK_PAID_OUT.dollars}
            currency={MOCK_PAID_OUT.currency}
            caption="Paid out"
          />

          <View style={styles.sectionHeadingFrame}>
            <Text style={styles.sectionHeading}>PENDING REFERRALS</Text>
          </View>
          {MOCK_PENDING.map((p) => (
            <View key={p.id} style={styles.pendingRow}>
              {p.placeholder ? (
                <PlaceholderAvatar />
              ) : (
                <Image source={p.avatar} style={styles.avatarImg} />
              )}
              <View style={styles.pendingMid}>
                <Text style={styles.personName}>{p.name}</Text>
                <Text style={styles.pendingDetail}>{p.detail}</Text>
              </View>
            </View>
          ))}
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
  sectionHeading: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    letterSpacing: 0.4,
    color: COLORS.GREENY_BLUE_TWO,
    textAlign: 'left',
  },
  avatarImg: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: RADIUS,
  },
  placeholderAvatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: RADIUS,
    backgroundColor: 'rgba(76, 182, 177, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(76, 182, 177, 0.45)',
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20 * scale,
  },
  pendingMid: {
    flex: 1,
    marginLeft: 14 * scale,
    paddingTop: 2 * scale,
  },
  personName: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    color: 'rgb(60, 60, 60)',
    marginBottom: 4 * scale,
  },
  pendingDetail: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    lineHeight: 18 * scale,
    color: 'rgb(171, 171, 171)',
    letterSpacing: 0.1,
  },
});
