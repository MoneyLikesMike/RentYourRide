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
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useGuestBookings } from '../context/GuestBookingsContext';
import { useBookingUpdate } from '../hooks/useBookingUpdate';
import { formatTripDateTime } from '../utils/guestBookingFormat';

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375;

/** Pops host check-in flow and returns to booking details (Sign → Agreement → Guidelines → Check-in → Details). */
const CHECK_IN_FLOW_DEPTH = 5;

export default function HostCheckInReminderScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { bookingId } = route.params || {};
  const { getBookingById } = useGuestBookings();
  const { applyBookingUpdate } = useBookingUpdate();
  const startBtnScale = useRef(new Animated.Value(1)).current;
  const [startTripBusy, setStartTripBusy] = useState(false);

  const booking = useMemo(() => (bookingId ? getBookingById(bookingId) : null), [bookingId, getBookingById]);

  const ls = booking?.listingSnapshot || {};
  const startFmt = useMemo(
    () => formatTripDateTime(booking?.bookingDates?.start, booking?.bookingDates?.startTime),
    [booking?.bookingDates?.start, booking?.bookingDates?.startTime]
  );
  const endFmt = useMemo(
    () => formatTripDateTime(booking?.bookingDates?.end, booking?.bookingDates?.endTime),
    [booking?.bookingDates?.end, booking?.bookingDates?.endTime]
  );

  const guestName = booking?.guestName || 'Guest';
  const guestEmail = booking?.guestEmail || '—';
  const guestPhone = booking?.guestPhone || '—';

  const exitToBookingDetails = useCallback(() => {
    navigation.pop(CHECK_IN_FLOW_DEPTH);
  }, [navigation]);

  const onFinishLater = useCallback(() => {
    exitToBookingDetails();
  }, [exitToBookingDetails]);

  const onStartTripLongPress = useCallback(() => {
    if (!booking?.id || startTripBusy) return;
    setStartTripBusy(true);
    startBtnScale.setValue(1);
    Animated.sequence([
      Animated.spring(startBtnScale, {
        toValue: 1.18,
        useNativeDriver: true,
        friction: 5,
        tension: 220,
      }),
      Animated.spring(startBtnScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 120,
      }),
    ]).start(({ finished }) => {
      if (!finished) {
        setStartTripBusy(false);
        return;
      }
      void (async () => {
        const ok = await applyBookingUpdate(
          booking.id,
          { hostTripStartedAt: Date.now() },
          { errorTitle: 'Could not start trip' },
        );
        setStartTripBusy(false);
        if (!ok) return;
        navigation.dispatch(
          CommonActions.reset({
            index: 1,
            routes: [
              { name: 'RentalManagerScreen' },
              { name: 'ActiveRentalsScreen', params: { initialTab: 'host' } },
            ],
          }),
        );
      })();
    });
  }, [booking?.id, startTripBusy, startBtnScale, applyBookingUpdate, navigation]);

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
        <TouchableOpacity style={styles.topBarBtn} onPress={exitToBookingDetails} hitSlop={12}>
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
        contentContainerStyle={[styles.scrollInner, { paddingBottom: 120 * scale + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCircle}>
          <Image source={require('../assets/icons/everydayRidesIcon.png')} style={styles.heroCar} resizeMode="contain" />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.reminderTitle}>Reminder</Text>
          <View style={styles.titleHighlight} />
        </View>

        <Text style={styles.intro}>
          Here are the details for this trip. Feel free to screenshot this page so you don’t forget.
        </Text>

        <View style={styles.hairline} />

        <View style={styles.twoCol}>
          <View style={styles.colHalf}>
            <Text style={styles.colLabel}>PICK UP TIME</Text>
            <Text style={styles.colDateLine}>{startFmt.dateLine || '—'}</Text>
            <Text style={styles.colTimeLine}>{startFmt.timeLine || '—'}</Text>
          </View>
          <View style={styles.colHalf}>
            <Text style={styles.colLabel}>RETURN TIME</Text>
            <Text style={styles.colDateLine}>{endFmt.dateLine || '—'}</Text>
            <Text style={styles.colTimeLine}>{endFmt.timeLine || '—'}</Text>
          </View>
        </View>

        <View style={styles.hairline} />

        <Text style={styles.hostSectionLabel}>GUEST CONTACT INFO</Text>
        <Text style={styles.contactLine}>{guestName}</Text>
        <Text style={styles.contactLine}>{guestEmail}</Text>
        <Text style={styles.contactLine}>{guestPhone}</Text>

        <View style={styles.hairline} />

        <Text style={styles.footerNote}>
          Please keep a direct open line of communication with your guest to avoid any confusion.
          Confirm pickup details and vehicle access before handover.
        </Text>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.holdHint}>Hold down to start trip</Text>
        <Pressable
          style={({ pressed }) => [pressed && styles.startFabOuterPressed]}
          onLongPress={onStartTripLongPress}
          delayLongPress={450}
          disabled={startTripBusy}
        >
          <Animated.View
            style={[
              styles.startFabOuter,
              { transform: [{ scale: startBtnScale }] },
            ]}
          >
            <View style={styles.startFabInner}>
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
    paddingHorizontal: 22 * scale,
    paddingTop: 8 * scale,
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
    marginBottom: 12 * scale,
  },
  reminderTitle: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 22 * scale,
    color: 'rgb(14, 38, 43)',
    width: 268 * scale,
    height: 30 * scale,
    textAlign: 'center',
    lineHeight: 30 * scale,
  },
  titleHighlight: {
    width: 42 * scale,
    height: 13 * scale,
    borderRadius: 5 * scale,
    backgroundColor: 'rgba(255, 177, 49, 0.3)',
    marginTop: 6 * scale,
    alignSelf: 'center',
    transform: [{ translateX: -40 * scale }, { translateY: -20 * scale }],
  },
  intro: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    lineHeight: 20 * scale,
    color: 'rgb(171, 171, 171)',
    textAlign: 'left',
    alignSelf: 'stretch',
    marginBottom: 20 * scale,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E0E0E0',
    marginVertical: 16 * scale,
  },
  twoCol: {
    flexDirection: 'row',
    paddingVertical: 4 * scale,
  },
  colHalf: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: 4 * scale,
  },
  colLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: 'rgba(0, 0, 0, 0.7)',
    letterSpacing: 0.2,
    width: 107 * scale,
    height: 15 * scale,
    textAlign: 'left',
    lineHeight: 15 * scale,
    marginBottom: 8 * scale,
  },
  colDateLine: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: 'rgb(142, 142, 142)',
    letterSpacing: 0.2,
    textAlign: 'left',
    lineHeight: 16 * scale,
    alignSelf: 'stretch',
  },
  colTimeLine: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: 'rgb(142, 142, 142)',
    letterSpacing: 0.2,
    textAlign: 'left',
    lineHeight: 16 * scale,
    marginTop: 4 * scale,
    alignSelf: 'stretch',
  },
  hostSectionLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 10 * scale,
    color: 'rgb(140, 140, 140)',
    letterSpacing: 0.4,
    marginBottom: 10 * scale,
  },
  contactLine: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: 'rgb(120, 120, 120)',
    marginBottom: 6 * scale,
  },
  footerNote: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    lineHeight: 18 * scale,
    color: 'rgb(171, 171, 171)',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22 * scale,
    paddingTop: 12 * scale,
    gap: 16 * scale,
    backgroundColor: '#fff',
  },
  holdHint: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
    flexShrink: 1,
    maxWidth: 220 * scale,
  },
  startFabOuter: {
    width: 64 * scale,
    height: 64 * scale,
    borderRadius: 32 * scale,
    borderWidth: 2,
    borderColor: 'rgba(76, 182, 177, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startFabOuterPressed: {
    opacity: 0.85,
  },
  startFabInner: {
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
