import React, { useMemo, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Pressable,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useGuestBookings } from '../context/GuestBookingsContext';

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375;

/** HostCheckout → Guidelines → Agreement → Sign — pop back to Active rentals (host tab). */
const CHECKOUT_COMPLETION_FLOW_DEPTH = 5;

export default function HostCheckoutTripCompleteScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { bookingId } = route.params || {};
  const { getBookingById, updateGuestBooking } = useGuestBookings();
  const endBtnScale = useRef(new Animated.Value(1)).current;
  const [endTripBusy, setEndTripBusy] = useState(false);

  const booking = useMemo(() => (bookingId ? getBookingById(bookingId) : null), [bookingId, getBookingById]);

  const exitToActiveRentalsList = useCallback(() => {
    navigation.pop(CHECKOUT_COMPLETION_FLOW_DEPTH);
  }, [navigation]);

  const onFinishLater = useCallback(() => {
    exitToActiveRentalsList();
  }, [exitToActiveRentalsList]);

  const onEndTripLongPress = useCallback(() => {
    if (!booking?.id || endTripBusy) return;
    setEndTripBusy(true);
    endBtnScale.setValue(1);
    Animated.sequence([
      Animated.spring(endBtnScale, {
        toValue: 1.18,
        useNativeDriver: true,
        friction: 5,
        tension: 220,
      }),
      Animated.spring(endBtnScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 120,
      }),
    ]).start(({ finished }) => {
      if (!finished) {
        setEndTripBusy(false);
        return;
      }
      updateGuestBooking(booking.id, { hostCheckoutTripEndedAt: Date.now() });
      navigation.navigate('HostGuestReviewScreen', { bookingId: booking.id });
    });
  }, [booking?.id, endTripBusy, endBtnScale, updateGuestBooking, navigation]);

  if (!booking) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.missing}>Booking not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkBtn}>
          <Text style={styles.linkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBarBtn} onPress={exitToActiveRentalsList} hitSlop={12}>
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
        <TouchableOpacity onPress={onFinishLater} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
          <Text style={styles.finishLater}>Finish later</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollInner, { paddingBottom: 140 * scale + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCircle}>
          <Image source={require('../assets/icons/everydayRidesIcon.png')} style={styles.heroCar} resizeMode="contain" />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.congratsTitle}>Congratulations</Text>
          <View style={styles.titleHighlight} />
        </View>

        <Text style={styles.bodyCenter}>
          You completed a trip on Rent Your Ride. You will receive a receipt via email or you can check your trip
          history.
        </Text>
        <Text style={styles.bodyCenterSecond}>
          Rent Your Ride promotes a safe and honest environment. Reviews are essential to help create that
          environment.
        </Text>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.holdHint}>Hold down to end trip</Text>
        <Pressable
          style={({ pressed }) => [pressed && styles.endFabOuterPressed]}
          onLongPress={onEndTripLongPress}
          delayLongPress={450}
          disabled={endTripBusy}
        >
          <Animated.View style={[styles.endFabOuter, { transform: [{ scale: endBtnScale }] }]}>
            <View style={styles.endFabInner}>
              <Svg width={28 * scale} height={28 * scale} viewBox="0 0 48 48" fill="none">
                <Path
                  d="M18 12L30 24L18 36"
                  stroke="#fff"
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8 * scale,
    paddingVertical: 8 * scale,
  },
  topBarBtn: {
    width: 44 * scale,
    height: 44 * scale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  finishLater: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
    paddingRight: 8 * scale,
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 28 * scale,
    paddingTop: 8 * scale,
    alignItems: 'stretch',
  },
  heroCircle: {
    width: 140 * scale,
    height: 140 * scale,
    borderRadius: 70 * scale,
    backgroundColor: 'rgba(76, 182, 177, 0.12)',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20 * scale,
  },
  heroCar: {
    width: '72%',
    height: '72%',
  },
  titleBlock: {
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: 16 * scale,
  },
  congratsTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 24 * scale,
    color: 'rgb(14, 38, 43)',
    textAlign: 'center',
    lineHeight: 32 * scale,
    alignSelf: 'stretch',
  },
  titleHighlight: {
    width: 38 * scale,
    height: 12 * scale,
    borderRadius: 5 * scale,
    backgroundColor: 'rgba(255, 177, 49, 0.35)',
    marginTop: 6 * scale,
    alignSelf: 'center',
    transform: [{ translateX: -52 * scale - 30 }, { translateY: -16 * scale - 5 }],
  },
  bodyCenter: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    lineHeight: 22 * scale,
    color: 'rgb(120, 120, 120)',
    textAlign: 'left',
    alignSelf: 'stretch',
    marginBottom: 16 * scale,
  },
  bodyCenterSecond: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    lineHeight: 22 * scale,
    color: 'rgb(120, 120, 120)',
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 22 * scale,
    paddingTop: 12 * scale,
    backgroundColor: '#fff',
  },
  holdHint: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
    marginBottom: 14 * scale,
    textAlign: 'center',
  },
  endFabOuter: {
    width: 64 * scale,
    height: 64 * scale,
    borderRadius: 32 * scale,
    borderWidth: 2,
    borderColor: 'rgba(76, 182, 177, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endFabOuterPressed: {
    opacity: 0.85,
  },
  endFabInner: {
    width: 52 * scale,
    height: 52 * scale,
    borderRadius: 26 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missing: {
    textAlign: 'center',
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    color: '#888',
  },
  linkBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    color: COLORS.GREENY_BLUE_TWO,
  },
});
