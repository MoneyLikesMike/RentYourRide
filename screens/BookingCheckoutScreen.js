import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import MapView, { Marker } from 'react-native-maps';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { getTripBillingDays } from '../utils/rentalTripDays';
import {
  formatVehicleDetailDateLine,
  getTimeToMinutes,
  resolveBookingDates,
  timeStringFromMinutes,
} from '../utils/bookingDatesDefaults';
import { useFocusEffect } from '@react-navigation/native';
import { usePaymentMethods } from '../context/PaymentMethodsContext';
import { useGuestBookings } from '../context/GuestBookingsContext';
import { useUserProfile } from '../context/UserProfileContext';
import { useAuth } from '../context/AuthContext';
import * as bookingsApi from '../services/bookingsApi';
import { isRemoteListingId } from '../utils/listingId';
import CardBrandBadge from '../components/CardBrandBadge';
import { TRIP_FEE_DISCLOSURE_TEXT } from '../constants/tripFeeDisclosure';
import GooglePlacesAutocompleteField from '../components/GooglePlacesAutocompleteField';
import { getCurrentCoordinates } from '../utils/currentLocation';
import { reverseGeocode } from '../services/geocodeApi';
import { MAP_PROVIDER } from '../utils/mapProvider';
import { isApplePayConfigured } from '../constants/stripe';
import { useApplePayCheckout } from '../hooks/useApplePayCheckout';
import { ensureIdentityVerified } from '../utils/verificationGates';
import { bookingOverlapsListingBlocks, resolveListingCalendarData } from '../utils/listingAvailability';
import { getListing } from '../services/listingsApi';
import { listingPhotoUrls } from '../utils/listingPhotos';
import { formatApproximatePickup } from '../utils/approximateLocation';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { navigateToUserProfile, navigateToAddCard } from '../utils/navigateRootStack';

const scale = uiScale;
// Match listing detail CTA: content band + flush yellow/teal into the home-indicator.
const BOTTOM_BAR_HEIGHT = 56;

const TERMS_URL = 'https://app.rentyourride.ca/terms-conditions?section=terms-of-service';
const PRIVACY_URL = 'https://app.rentyourride.ca/terms-conditions?section=privacy';
const CANCELLATION_POLICY_URL = 'https://app.rentyourride.ca/terms-conditions?section=cancelation';
const FREE_CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000;

function openLegalUrl(url) {
  Linking.openURL(url).catch(() => {});
}

/** Trip start as a local Date from booking date + startTime. */
function resolveTripStartDate(bookingDates) {
  if (bookingDates?.start == null) return null;
  const start = new Date(bookingDates.start);
  if (Number.isNaN(start.getTime())) return null;
  const mins = getTimeToMinutes(bookingDates.startTime || '10:00 AM');
  start.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return start;
}

/**
 * Free-cancel deadline = trip start − 24 hours (guest cancellation policy).
 * Shown as the same date/time style as Start / End on checkout.
 */
function formatFreeCancelUntilLabel(bookingDates) {
  const start = resolveTripStartDate(bookingDates);
  if (!start) return null;
  const until = new Date(start.getTime() - FREE_CANCEL_WINDOW_MS);
  const untilMins = until.getHours() * 60 + until.getMinutes();
  // Match Start/End date+time wording, but without the " - " separator.
  const line = formatVehicleDetailDateLine(until.getTime(), timeStringFromMinutes(untilMins));
  return line ? line.replace(' - ', ', ') : null;
}

function hostFirstNameFrom(hostName) {
  const raw = String(hostName || '').trim();
  if (!raw) return 'Host';
  return raw.split(/\s+/)[0] || 'Host';
}

const parsePercent = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const numeric = Number(value.replace('%', '').trim());
  return Number.isFinite(numeric) ? numeric : 0;
};

function isCardPaymentMethod(m) {
  if (!m) return false;
  if (m.type === 'paypal' || m.brand === 'paypal') return false;
  if (m.type === 'apple_pay' || m.brand === 'apple_pay') return false;
  return true;
}

function checkoutMethodSubtitle(m) {
  if (!m) return '';
  if (m.type === 'apple_pay' || m.brand === 'apple_pay') return 'Apple Pay';
  return `XXXX - ${m.last4 || '????'}`;
}

function normalizeCheckoutPaymentMethod(method) {
  if (!method) return null;
  const id = method.id || method.paymentMethodId;
  if (!id) return null;
  return { ...method, id };
}

function PaymentMethodIcons() {
  const iconBox = 22 * scale;
  return (
    <View style={styles.paymentHeaderIcons}>
      <View style={[styles.paymentHeaderIconBox, { width: iconBox, height: iconBox }]}>
        <View style={styles.paymentHeaderIconAppleInner}>
          <Text style={styles.paymentHeaderIconAppleText}>Pay</Text>
        </View>
      </View>
      <View
        style={[styles.paymentHeaderIconBox, { width: iconBox, height: iconBox }]}
        accessibilityLabel="Card"
      >
        <Svg width={16 * scale} height={11 * scale} viewBox="0 0 24 16" fill="none">
          <Path
            d="M2 2.5h20A1.5 1.5 0 0 1 23.5 4v8a1.5 1.5 0 0 1-1.5 1.5H2A1.5 1.5 0 0 1 .5 12V4A1.5 1.5 0 0 1 2 2.5z"
            stroke="#6A6A6A"
            strokeWidth={1.4}
          />
          <Path d="M1 6h22" stroke="#6A6A6A" strokeWidth={1.4} />
        </Svg>
      </View>
    </View>
  );
}

function CheckoutBrandChip({ method }) {
  if (!method) return null;
  if (method.type === 'apple_pay' || method.brand === 'apple_pay') {
    return (
      <View style={[checkoutChipStyles.chip, { backgroundColor: '#000000' }]}>
        <Text style={checkoutChipStyles.chipText}>APPLE PAY</Text>
      </View>
    );
  }
  return <CardBrandBadge brand={method.brand} type={method.type} size="sm" />;
}

const checkoutChipStyles = StyleSheet.create({
  chip: {
    width: 52 * scale,
    height: 32 * scale,
    borderRadius: 4 * scale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 8 * scale,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});

export default function BookingCheckoutScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const checkoutBarHeight = BOTTOM_BAR_HEIGHT + insets.bottom;
  const { listing = {}, bookingDates: routeBookingDates } = route.params || {};
  const bookingDates = useMemo(() => resolveBookingDates(routeBookingDates), [routeBookingDates]);
  const { methods, defaultMethodId, refreshFromApi } = usePaymentMethods();
  const { addGuestBooking } = useGuestBookings();
  const { firstName, lastName, photoUri: profilePhotoUri } = useUserProfile();
  const { isAuthenticated, isReady } = useAuth();
  const { supported: applePaySupported, payForBooking, savePaymentMethod } = useApplePayCheckout();
  const [quotePricing, setQuotePricing] = useState(null);
  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [paymentPickerVisible, setPaymentPickerVisible] = useState(false);
  const [applePayLoading, setApplePayLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedPaymentIntentId, setConfirmedPaymentIntentId] = useState(null);
  const [applePayMethod, setApplePayMethod] = useState(null);
  const submittingRef = useRef(false);
  const idempotencyKeyRef = useRef(null);

  const checkoutSessionKey = useMemo(() => {
    const lid =
      listing?.id != null && listing.id !== ''
        ? String(listing.id)
        : `${listing?.title || ''}|${listing?.pickupAddress || ''}|${String(listing?.pricePerDay ?? '')}`;
    return `${lid}|${bookingDates?.start ?? ''}|${bookingDates?.end ?? ''}`;
  }, [listing?.id, listing?.title, listing?.pickupAddress, listing?.pricePerDay, bookingDates?.start, bookingDates?.end]);

  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: typeof listing?.latitude === 'number' ? listing.latitude : 49.8951,
    longitude: typeof listing?.longitude === 'number' ? listing.longitude : -97.1384,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  const [extraUnlimitedKm, setExtraUnlimitedKm] = useState(false);
  const [extraPrepaidFuel, setExtraPrepaidFuel] = useState(false);
  const [extraPrepaidClean, setExtraPrepaidClean] = useState(false);
  const [introMessage, setIntroMessage] = useState('');
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [paymentMode, setPaymentMode] = useState('card');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const showApplePayButton =
    Platform.OS === 'ios' && isApplePayConfigured() && applePaySupported && isAuthenticated && isReady;

  const cardMethods = useMemo(() => (methods || []).filter(isCardPaymentMethod), [methods]);

  // Native stack can reuse this screen; reset local state when listing or trip changes
  useEffect(() => {
    setMapRegion({
      latitude: typeof listing?.latitude === 'number' ? listing.latitude : 49.8951,
      longitude: typeof listing?.longitude === 'number' ? listing.longitude : -97.1384,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
    setDeliveryEnabled(false);
    setDeliveryLocation('');
    setMapModalVisible(false);
    setExtraUnlimitedKm(false);
    setExtraPrepaidFuel(false);
    setExtraPrepaidClean(false);
    setIntroMessage('');
    setNoteExpanded(false);
    setAgreedToTerms(false);
    setPaymentMode(
      Platform.OS === 'ios' && isApplePayConfigured() && applePaySupported && isAuthenticated && isReady
        ? 'apple_pay'
        : 'card',
    );
    setSelectedMethodId(null);
    setConfirmedPaymentIntentId(null);
    setApplePayMethod(null);
    setSubmitting(false);
    submittingRef.current = false;
    // One key per checkout session so double-taps reuse the same server booking.
    idempotencyKeyRef.current = `book_${checkoutSessionKey}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    // applePaySupported / auth captured for default paymentMode on session start only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutSessionKey]);

  useFocusEffect(
    useCallback(() => {
      setSelectedMethodId((prev) => {
        if (!prev) return prev;
        return cardMethods.some((m) => m.id === prev) ? prev : null;
      });
    }, [cardMethods])
  );

  const selectedPaymentMethod = useMemo(() => {
    if (applePayMethod) return applePayMethod;
    if (!cardMethods.length) return null;
    if (selectedMethodId && cardMethods.some((m) => m.id === selectedMethodId)) {
      return cardMethods.find((m) => m.id === selectedMethodId);
    }
    if (defaultMethodId && cardMethods.some((m) => m.id === defaultMethodId)) {
      return cardMethods.find((m) => m.id === defaultMethodId);
    }
    return cardMethods[0];
  }, [cardMethods, defaultMethodId, selectedMethodId, applePayMethod]);

  const sortedPaymentMethods = useMemo(() => {
    const copy = [...cardMethods];
    copy.sort((a, b) => {
      const aDef = a.id === defaultMethodId ? 0 : 1;
      const bDef = b.id === defaultMethodId ? 0 : 1;
      return aDef - bDef;
    });
    return copy;
  }, [cardMethods, defaultMethodId]);

  const pricePerDay = Number(listing.pricePerDay) || 40;
  const deliveryFee = Number(listing.deliveryPrice) || 0;
  const kmPerDayRaw = listing.dailyKm || '200 km/day';
  const kmPerDayNumber = Number(String(kmPerDayRaw).replace(/[^\d]/g, '')) || 200;
  const canDeliver = deliveryFee > 0;
  const pickupAddress = listing.pickupAddress || 'Winnipeg, MB R3N1P1';
  const vehicleTitle = listing.title || 'Vehicle';
  const hostName = listing.hostName || 'Host';
  const hostFirst = hostFirstNameFrom(hostName);
  const hostPhotoUri = useMemo(
    () => resolveMediaUrl(listing.hostPhotoUri),
    [listing.hostPhotoUri],
  );
  const listingThumbUri = useMemo(() => {
    const urls = listingPhotoUrls(listing.photos);
    return urls[0] || null;
  }, [listing.photos]);
  const locationDisplay = formatApproximatePickup({
    city: listing.city,
    pickupAddress: listing.pickupAddress,
    province: listing.province,
  });
  const freeCancelUntilLabel = useMemo(
    () => formatFreeCancelUntilLabel(bookingDates),
    [bookingDates],
  );
  const isInstantBooking = listing.instantBooking === true;

  const startDateTimeText = formatVehicleDetailDateLine(bookingDates.start, bookingDates.startTime);
  const endDateTimeText = formatVehicleDetailDateLine(bookingDates.end, bookingDates.endTime);

  const openHostProfile = useCallback(() => {
    if (!listing.hostUserId && !hostName) return;
    navigateToUserProfile(navigation, {
      profileUser: {
        userId: listing.hostUserId || null,
        displayName: hostName,
        photoUri: hostPhotoUri || listing.hostPhotoUri || null,
        joinedYear: listing.hostJoinedYear ?? null,
        aboutBio: listing.hostBio || '',
      },
      highlightListings: [listing],
    });
  }, [navigation, listing, hostName, hostPhotoUri]);

  const tripDays = useMemo(() => {
    if (bookingDates?.start == null || bookingDates?.end == null) return 1;
    return getTripBillingDays(bookingDates.start, bookingDates.end);
  }, [bookingDates?.start, bookingDates?.end]);

  useEffect(() => {
    let cancelled = false;
    if (
      !isAuthenticated ||
      !isReady ||
      !isRemoteListingId(listing?.id) ||
      bookingDates?.start == null ||
      bookingDates?.end == null
    ) {
      setQuotePricing(null);
      return undefined;
    }
    (async () => {
      try {
        const q = await bookingsApi.quoteBooking({
          listingId: String(listing.id),
          bookingDates,
          extraUnlimitedKm,
          extraPrepaidFuel,
          extraPrepaidClean,
          deliveryEnabled: !!(deliveryEnabled && canDeliver),
        });
        if (!cancelled) setQuotePricing(q);
      } catch {
        if (!cancelled) setQuotePricing(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    isReady,
    listing?.id,
    bookingDates?.start,
    bookingDates?.end,
    bookingDates?.startTime,
    bookingDates?.endTime,
    extraUnlimitedKm,
    extraPrepaidFuel,
    extraPrepaidClean,
    deliveryEnabled,
    canDeliver,
  ]);

  const weeklyDiscountPct = parsePercent(listing.weeklyDiscount);
  const monthlyDiscountPct = parsePercent(listing.monthlyDiscount);

  const baseTripSubtotal = pricePerDay * tripDays;
  /** Monthly (30+ inclusive days) takes precedence over weekly (7+ days) when both thresholds apply */
  const appliesMonthlyDiscount = tripDays >= 30 && monthlyDiscountPct > 0;
  const appliesWeeklyDiscount = tripDays >= 7 && weeklyDiscountPct > 0 && !appliesMonthlyDiscount;

  const discountMultiplier = appliesMonthlyDiscount
    ? 1 - monthlyDiscountPct / 100
    : appliesWeeklyDiscount
      ? 1 - weeklyDiscountPct / 100
      : 1;
  const discountedTripSubtotal = Math.max(0, baseTripSubtotal * discountMultiplier);
  const tripDiscountSavings = Math.max(0, baseTripSubtotal - discountedTripSubtotal);

  const unlimitedKmFee = extraUnlimitedKm ? 150 : 0;
  const prepaidFuelFee = extraPrepaidFuel ? 80 : 0;
  const prepaidCleanFee = extraPrepaidClean ? 50 : 0;
  const selectedDeliveryFee = deliveryEnabled && canDeliver ? deliveryFee : 0;
  const extrasSubtotal = unlimitedKmFee + prepaidFuelFee + prepaidCleanFee + selectedDeliveryFee;
  const subtotal = discountedTripSubtotal + extrasSubtotal;
  // Platform trip fee: 10% of daily rental only (after trip-length discount), not extras/delivery
  const tripFee = discountedTripSubtotal * 0.1;
  const grandTotal = subtotal + tripFee;

  const effectiveTripDays = quotePricing?.tripDays ?? tripDays;
  const effectiveDiscountedTripSubtotal =
    quotePricing?.discountedTripSubtotal ?? discountedTripSubtotal;
  const effectiveBaseTripSubtotal = quotePricing?.baseTripSubtotal ?? baseTripSubtotal;
  const effectiveTripDiscountSavings = quotePricing?.tripDiscountSavings ?? tripDiscountSavings;
  const effectiveTripFee = quotePricing?.tripFee ?? tripFee;
  const effectiveSubtotal = quotePricing?.subtotal ?? subtotal;
  const effectiveGrandTotal = quotePricing?.grandTotal ?? grandTotal;
  const effectiveKmLabel = quotePricing?.kmIncludedLabel
    ? quotePricing.kmIncludedLabel
    : extraUnlimitedKm
      ? 'Unlimited kms'
      : `${kmPerDayNumber * effectiveTripDays} km`;

  const selectedExtras = [
    extraPrepaidClean ? { key: 'clean', label: 'Prepaid clean', amount: prepaidCleanFee, icon: require('../assets/icons/cleanCar.png') } : null,
    extraUnlimitedKm ? { key: 'kms', label: 'Unlimited kilometres', amount: unlimitedKmFee, icon: require('../assets/icons/road.png') } : null,
    extraPrepaidFuel ? { key: 'fuel', label: 'Prepaid fuel', amount: prepaidFuelFee, icon: require('../assets/icons/fuel.png') } : null,
    selectedDeliveryFee > 0 ? { key: 'delivery', label: 'Delivery', amount: selectedDeliveryFee, icon: require('../assets/icons/shorttrip.png') } : null,
  ].filter(Boolean);

  const openCheckoutCalendar = useCallback(() => {
    navigation.navigate('CalendarScreen', {
      mode: 'booking',
      returnTo: 'BookingCheckoutScreen',
      listing,
      bookingDates,
      bookingSessionKey: Date.now(),
      savedCalendarData: resolveListingCalendarData(listing) || undefined,
    });
  }, [bookingDates, listing, navigation]);

  const submitBooking = useCallback(
    async ({ paymentIntentId = confirmedPaymentIntentId, paymentMethod = selectedPaymentMethod } = {}) => {
      // Hard lock: ignore double-taps while the first request is in flight.
      if (submittingRef.current) return null;
      if (!agreedToTerms) {
        Alert.alert(
          'Agreement required',
          'Please agree to the total, Terms of Service, cancellation policy, and privacy policy before booking.',
        );
        return null;
      }
      submittingRef.current = true;
      setSubmitting(true);
      let succeeded = false;
      try {
        if (!(await ensureIdentityVerified(navigation, { alertTitle: 'Verify your account to book' }))) {
          return null;
        }
        if (!normalizeCheckoutPaymentMethod(paymentMethod) && !paymentIntentId) {
          Alert.alert('Payment required', 'Add or select a payment method before booking.');
          return null;
        }
        const normalizedPaymentMethod = normalizeCheckoutPaymentMethod(paymentMethod) || paymentMethod;
        if (isRemoteListingId(listing?.id) && bookingDates?.start != null && bookingDates?.end != null) {
          let blockSource = listing;
          try {
            const fresh = await getListing(String(listing.id));
            if (fresh) blockSource = fresh;
          } catch (_) {
            /* use listing snapshot */
          }
          if (bookingOverlapsListingBlocks(bookingDates, resolveListingCalendarData(blockSource) || blockSource)) {
            Alert.alert(
              'Dates unavailable',
              'Those dates are blocked by the host for this vehicle. Please choose different dates.',
            );
            return null;
          }
        }
        if (!idempotencyKeyRef.current) {
          idempotencyKeyRef.current = `book_${checkoutSessionKey}_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 10)}`;
        }
        const guestName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Guest';
        const dropAddr =
          deliveryEnabled && canDeliver && deliveryLocation?.trim()
            ? deliveryLocation.trim()
            : pickupAddress;
        let bookingId;
        try {
          bookingId = await addGuestBooking({
            idempotencyKey: idempotencyKeyRef.current,
            instantBooking: listing.instantBooking === true,
            guestName,
            guestPhotoUri: profilePhotoUri || null,
            listingSnapshot: {
              id: listing.id,
              title: listing.title,
              photos: listing.photos,
              pickupAddress: listing.pickupAddress,
              hostName: listing.hostName,
              hostPhotoUri: listing.hostPhotoUri,
              hostEmail: listing.hostEmail,
              hostPhone: listing.hostPhone,
              year: listing.year ?? listing.vehicleData?.year,
              make: listing.make ?? listing.vehicleData?.make,
              model: listing.model ?? listing.vehicleData?.model,
              vin: listing.vin ?? listing.vehicleData?.vin,
              licensePlate: listing.licensePlate,
              licenseProvince: listing.licenseProvince,
              vehicleData: listing.vehicleData ? { ...listing.vehicleData } : undefined,
            },
            bookingDates: { ...(bookingDates || {}) },
            pickupAddress,
            dropoffAddress: dropAddr,
            deliveryEnabled: !!(deliveryEnabled && canDeliver),
            extras: selectedExtras.map((e) => ({ key: e.key, label: e.label, amount: e.amount })),
            introMessage: introMessage.trim(),
            pricing: {
              tripDays: effectiveTripDays,
              pricePerDay,
              baseTripSubtotal: effectiveBaseTripSubtotal,
              discountedTripSubtotal: effectiveDiscountedTripSubtotal,
              tripDiscountSavings: effectiveTripDiscountSavings,
              appliesWeeklyDiscount,
              appliesMonthlyDiscount,
              weeklyDiscountPct,
              monthlyDiscountPct,
              unlimitedKmFee,
              prepaidFuelFee,
              prepaidCleanFee,
              selectedDeliveryFee,
              subtotal: effectiveSubtotal,
              tripFee: effectiveTripFee,
              grandTotal: effectiveGrandTotal,
              hostReceiveTotal: Math.max(0, Number(effectiveSubtotal) || 0),
              kmIncludedLabel: effectiveKmLabel,
            },
            selectedPaymentMethod: normalizedPaymentMethod,
            stripePaymentIntentId: paymentIntentId || null,
          });
        } catch (e) {
          Alert.alert(
            'Booking not saved',
            e?.message ||
              'This trip could not be saved to the server. Messaging and trip updates require a synced booking.',
          );
          return null;
        }
        succeeded = true;
        navigation.navigate('BookingRequestConfirmationScreen', {
          listing,
          bookingDates,
          selectedPaymentMethod: normalizedPaymentMethod,
          bookingId,
        });
        return bookingId;
      } finally {
        if (succeeded) {
          // Stay locked so back-navigation cannot re-submit this checkout session.
          setSubmitting(true);
        } else {
          submittingRef.current = false;
          setSubmitting(false);
        }
      }
    },
    [
      addGuestBooking,
      agreedToTerms,
      checkoutSessionKey,
      appliesMonthlyDiscount,
      appliesWeeklyDiscount,
      bookingDates,
      canDeliver,
      confirmedPaymentIntentId,
      deliveryEnabled,
      deliveryLocation,
      effectiveBaseTripSubtotal,
      effectiveDiscountedTripSubtotal,
      effectiveGrandTotal,
      effectiveKmLabel,
      effectiveSubtotal,
      effectiveTripDays,
      effectiveTripDiscountSavings,
      effectiveTripFee,
      firstName,
      introMessage,
      lastName,
      listing,
      monthlyDiscountPct,
      navigation,
      pickupAddress,
      prepaidCleanFee,
      prepaidFuelFee,
      pricePerDay,
      profilePhotoUri,
      selectedExtras,
      selectedPaymentMethod,
      selectedDeliveryFee,
      unlimitedKmFee,
      weeklyDiscountPct,
    ],
  );

  const handleApplePay = useCallback(async () => {
    if (submittingRef.current || applePayLoading) return;
    if (!agreedToTerms) {
      Alert.alert(
        'Agreement required',
        'Please agree to the total, Terms of Service, cancellation policy, and privacy policy before booking.',
      );
      return;
    }
    if (!isAuthenticated || !isReady) {
      Alert.alert('Sign in required', 'Please sign in to pay with Apple Pay.');
      return;
    }
    const isInstant = listing.instantBooking === true;
    const rentalLabel = listing.title || 'Vehicle rental';
    setApplePayLoading(true);
    try {
      if (isInstant && effectiveGrandTotal > 0) {
        const result = await payForBooking({
          amountDollars: effectiveGrandTotal,
          description: rentalLabel,
          metadata: {
            listingId: listing?.id != null ? String(listing.id) : '',
            purpose: 'booking',
          },
        });
        setConfirmedPaymentIntentId(result.paymentIntentId);
        setApplePayMethod(result.paymentMethod);
        await submitBooking({
          paymentIntentId: result.paymentIntentId,
          paymentMethod: result.paymentMethod,
        });
        return;
      }
      const method = await savePaymentMethod({
        amountDollars: effectiveGrandTotal,
        description: rentalLabel,
      });
      setApplePayMethod(method);
      setConfirmedPaymentIntentId(null);
      await refreshFromApi();
      if (method.id) setSelectedMethodId(method.id);
      await submitBooking({ paymentMethod: method });
      return;
    } catch (err) {
      Alert.alert('Apple Pay', err?.message || 'Could not complete Apple Pay.');
    } finally {
      setApplePayLoading(false);
    }
  }, [
    agreedToTerms,
    applePayLoading,
    effectiveGrandTotal,
    isAuthenticated,
    isReady,
    listing,
    payForBooking,
    refreshFromApi,
    savePaymentMethod,
    submitBooking,
  ]);

  const onStickyCtaPress = useCallback(async () => {
    if (!agreedToTerms) {
      Alert.alert(
        'Agreement required',
        'Please agree to the total, Terms of Service, cancellation policy, and privacy policy before booking.',
      );
      return;
    }
    try {
      if (paymentMode === 'apple_pay' && showApplePayButton) {
        await handleApplePay();
      } else {
        await submitBooking();
      }
    } catch (err) {
      Alert.alert('Booking failed', err?.message || 'Could not send booking request.');
    }
  }, [agreedToTerms, handleApplePay, paymentMode, showApplePayButton, submitBooking]);

  const openCurrentLocationPicker = async () => {
    try {
      const coords = await getCurrentCoordinates();
      const nextRegion = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setMapRegion(nextRegion);
      setMapModalVisible(true);
    } catch (_) {
      /* permission denied */
    }
  };

  const confirmCurrentLocation = async () => {
    try {
      const geo = await reverseGeocode(mapRegion.latitude, mapRegion.longitude);
      setDeliveryLocation(geo.formatted || geo.city || `${mapRegion.latitude.toFixed(5)}, ${mapRegion.longitude.toFixed(5)}`);
    } finally {
      setMapModalVisible(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Svg width={24} height={24} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke={COLORS.YELLOWISH_ORANGE} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: checkoutBarHeight + 28 * scale }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.carHostRow}>
          {listingThumbUri ? (
            <Image source={{ uri: listingThumbUri }} style={styles.carThumb} />
          ) : (
            <View style={[styles.carThumb, styles.carThumbPlaceholder]} />
          )}
          <View style={styles.carHostTextCol}>
            <Text style={styles.carTitle} numberOfLines={1}>{vehicleTitle}</Text>
            <TouchableOpacity
              style={styles.hostTapRow}
              onPress={openHostProfile}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`View ${hostName}'s profile`}
            >
              {hostPhotoUri ? (
                <Image source={{ uri: hostPhotoUri }} style={styles.hostAvatar} resizeMode="cover" />
              ) : (
                <View style={[styles.hostAvatar, styles.hostAvatarPlaceholder]} />
              )}
              <Text style={styles.hostUnderTitle} numberOfLines={1}>{hostName}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.tripMetaCard} activeOpacity={0.85} onPress={openCheckoutCalendar}>
          <View style={styles.tripMetaTop}>
            <Image source={require('../assets/icons/currentLocationPin.png')} style={styles.tripMetaPin} resizeMode="contain" />
            <Text style={styles.tripMetaLocation} numberOfLines={1}>{locationDisplay}</Text>
          </View>
          <View style={styles.tripMetaDateRow}>
            <Text style={styles.tripMetaDateLabel}>Start</Text>
            <Text style={styles.tripMetaDateValue} numberOfLines={1}>{startDateTimeText}</Text>
          </View>
          <View style={styles.tripMetaDateRow}>
            <Text style={styles.tripMetaDateLabel}>End</Text>
            <Text style={styles.tripMetaDateValue} numberOfLines={1}>{endDateTimeText}</Text>
          </View>
        </TouchableOpacity>

        {canDeliver ? (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitleQuiet}>Delivery</Text>
            <View style={styles.extraAddRow}>
              <View style={styles.extraAddCopy}>
                <Text style={styles.extraAddTitle}>
                  Have the vehicle dropped off to you · ${deliveryFee.toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                activeOpacity={0.7}
                onPress={() => setDeliveryEnabled((v) => !v)}
              >
                <Text style={[styles.extraAddText, deliveryEnabled && styles.extraAddTextOn]}>
                  {deliveryEnabled ? 'Added' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
            {deliveryEnabled ? (
              <>
                <Text style={styles.softFieldLabel}>Delivery address</Text>
                <GooglePlacesAutocompleteField
                  placeholder="Enter delivery address"
                  types="address"
                  initialValue={deliveryLocation}
                  onChangeText={setDeliveryLocation}
                  onManualSubmit={setDeliveryLocation}
                  onPlaceSelected={({ selection }) => {
                    setDeliveryLocation(selection.query || '');
                  }}
                  containerStyle={styles.deliveryPlacesField}
                  inputStyle={styles.input}
                />
                <TouchableOpacity style={styles.currentLocationBtn} activeOpacity={0.85} onPress={openCurrentLocationPicker}>
                  <Image source={require('../assets/icons/currentLocationPin.png')} style={styles.currentLocationIcon} resizeMode="contain" />
                  <Text style={styles.currentLocationText}>Current location</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        ) : null}

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitleQuiet}>Extras</Text>

          <View style={styles.extraAddRow}>
            <View style={styles.extraAddCopy}>
              <Text style={styles.extraAddTitle}>Unlimited kilometres · $150</Text>
              <Text style={styles.extraAddSubtitle}>Includes {kmPerDayNumber} km/day</Text>
            </View>
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
              activeOpacity={0.7}
              onPress={() => setExtraUnlimitedKm((v) => !v)}
            >
              <Text style={[styles.extraAddText, extraUnlimitedKm && styles.extraAddTextOn]}>
                {extraUnlimitedKm ? 'Added' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.extraAddRow}>
            <View style={styles.extraAddCopy}>
              <Text style={styles.extraAddTitle}>Prepaid fuel · $80</Text>
              <Text style={styles.extraAddSubtitle} numberOfLines={1}>
                Return with a full tank, no refuel needed
              </Text>
            </View>
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
              activeOpacity={0.7}
              onPress={() => setExtraPrepaidFuel((v) => !v)}
            >
              <Text style={[styles.extraAddText, extraPrepaidFuel && styles.extraAddTextOn]}>
                {extraPrepaidFuel ? 'Added' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.extraAddRow, styles.extraAddRowLast]}>
            <View style={styles.extraAddCopy}>
              <Text style={styles.extraAddTitle}>Prepaid clean · $50</Text>
              <Text style={styles.extraAddSubtitle} numberOfLines={1}>
                Skip the end of trip clean, return as is
              </Text>
            </View>
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
              activeOpacity={0.7}
              onPress={() => setExtraPrepaidClean((v) => !v)}
            >
              <Text style={[styles.extraAddText, extraPrepaidClean && styles.extraAddTextOn]}>
                {extraPrepaidClean ? 'Added' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitleGreen}>Price details</Text>

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>
              ${pricePerDay.toFixed(2)} × {effectiveTripDays} {effectiveTripDays === 1 ? 'day' : 'days'}
            </Text>
            <Text style={styles.receiptValue}>
              $
              {(effectiveTripDiscountSavings > 0
                ? effectiveBaseTripSubtotal
                : effectiveDiscountedTripSubtotal
              ).toFixed(2)}
            </Text>
          </View>

          {effectiveTripDiscountSavings > 0 ? (
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>
                {appliesMonthlyDiscount
                  ? `Monthly discount (${listing.monthlyDiscount || `${monthlyDiscountPct}%`})`
                  : `Weekly discount (${listing.weeklyDiscount || `${weeklyDiscountPct}%`})`}
              </Text>
              <Text style={[styles.receiptValue, styles.receiptSavings]}>
                −${effectiveTripDiscountSavings.toFixed(2)}
              </Text>
            </View>
          ) : null}

          <View style={styles.receiptRow}>
            <View style={styles.tripFeeLabelInline}>
              <Text style={styles.receiptLabel}>Trip fee</Text>
              <TouchableOpacity
                onPress={() => Alert.alert('Trip fee', TRIP_FEE_DISCLOSURE_TEXT)}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                style={styles.tripFeeInfoHit}
              >
                <View style={styles.tripFeeInfoCircle}>
                  <Text style={styles.tripFeeInfoI}>i</Text>
                </View>
              </TouchableOpacity>
            </View>
            <Text style={styles.receiptValue}>${effectiveTripFee.toFixed(2)}</Text>
          </View>

          {extraUnlimitedKm ? (
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Unlimited km</Text>
              <Text style={styles.receiptValue}>${unlimitedKmFee.toFixed(2)}</Text>
            </View>
          ) : null}
          {extraPrepaidFuel ? (
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Prepaid fuel</Text>
              <Text style={styles.receiptValue}>${prepaidFuelFee.toFixed(2)}</Text>
            </View>
          ) : null}
          {extraPrepaidClean ? (
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Prepaid clean</Text>
              <Text style={styles.receiptValue}>${prepaidCleanFee.toFixed(2)}</Text>
            </View>
          ) : null}
          {deliveryEnabled && canDeliver ? (
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Delivery</Text>
              <Text style={styles.receiptValue}>${selectedDeliveryFee.toFixed(2)}</Text>
            </View>
          ) : null}

          <View style={styles.receiptDivider} />

          <View style={styles.receiptRow}>
            <Text style={styles.receiptTotalLabel}>Total</Text>
            <Text style={styles.receiptTotalValue}>${effectiveGrandTotal.toFixed(2)} CAD</Text>
          </View>
          <Text style={styles.receiptCaption}>
            {extraUnlimitedKm
              ? 'Unlimited kilometres included'
              : `${effectiveKmLabel} included in this trip`}
          </Text>
        </View>

        {freeCancelUntilLabel ? (
          <Text style={styles.cancelLine}>Cancellation: Free until {freeCancelUntilLabel}</Text>
        ) : null}

        <Text style={styles.chargeTiming}>
          {isInstantBooking
            ? 'You’ll be charged now for the trip total.'
            : 'A hold for the trip total is placed on your card when you send the request. You’re charged once the host accepts.'}
        </Text>

        <View style={styles.sectionBlock}>
          <View style={styles.paymentHeaderRow}>
            <Text style={[styles.sectionTitleQuiet, styles.paymentHeaderTitle]}>Payment</Text>
            <PaymentMethodIcons />
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.paymentSelectBtn}
            onPress={() => setPaymentPickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Choose payment method"
          >
            {paymentMode === 'apple_pay' && showApplePayButton ? (
              <View style={styles.paymentSelectInner}>
                <View style={[checkoutChipStyles.chip, { backgroundColor: '#000000' }]}>
                  <Text style={checkoutChipStyles.chipText}>APPLE PAY</Text>
                </View>
                <Text style={styles.paymentSelectLabel}>Apple Pay</Text>
              </View>
            ) : selectedPaymentMethod && paymentMode === 'card' ? (
              <View style={styles.paymentSelectInner}>
                <CheckoutBrandChip method={selectedPaymentMethod} />
                <Text style={styles.paymentSelectLabel} numberOfLines={1}>
                  {checkoutMethodSubtitle(selectedPaymentMethod)}
                </Text>
              </View>
            ) : (
              <Text style={styles.paymentSelectPlaceholder}>Choose payment method</Text>
            )}
            <Text style={styles.paymentSelectChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.addCardLink}
            onPress={() =>
              navigateToAddCard(navigation, { returnAfterPayment: true })
            }
          >
            <Text style={styles.addPaymentText}>Add card</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.sectionBlock, styles.noteSection]}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.noteToggle}
            onPress={() => setNoteExpanded((v) => !v)}
          >
            <Text style={styles.noteToggleText}>Add a note to {hostFirst}</Text>
            <Text style={styles.noteChevron}>{noteExpanded ? '−' : '+'}</Text>
          </TouchableOpacity>
          {noteExpanded ? (
            <TextInput
              multiline
              placeholder="Share your plans for the trip"
              placeholderTextColor="#B3B3B3"
              value={introMessage}
              onChangeText={setIntroMessage}
              style={styles.introInput}
              textAlignVertical="top"
            />
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.agreeRow}
          activeOpacity={0.85}
          onPress={() => setAgreedToTerms((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreedToTerms }}
        >
          <View style={[styles.agreeCheckbox, agreedToTerms && styles.agreeCheckboxOn]}>
            {agreedToTerms ? <Text style={styles.agreeCheckMark}>✓</Text> : null}
          </View>
          <Text style={styles.agreeText}>
            I agree to pay the total shown and to the Rent Your Ride{' '}
            <Text style={styles.agreeLink} onPress={() => openLegalUrl(TERMS_URL)}>
              terms of service
            </Text>
            ,{' '}
            <Text style={styles.agreeLink} onPress={() => openLegalUrl(CANCELLATION_POLICY_URL)}>
              cancellation policy
            </Text>
            {' '}and I acknowledge the{' '}
            <Text style={styles.agreeLink} onPress={() => openLegalUrl(PRIVACY_URL)}>
              privacy policy
            </Text>
            .
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.checkoutStickyBar,
          { height: checkoutBarHeight },
          (!agreedToTerms || submitting || applePayLoading) && styles.checkoutStickyDisabled,
        ]}
        activeOpacity={0.85}
        disabled={submitting || applePayLoading}
        onPress={onStickyCtaPress}
        accessibilityRole="button"
        accessibilityLabel={isInstantBooking ? 'Book trip' : 'Request trip'}
      >
        <View style={[styles.checkoutPricePane, { height: checkoutBarHeight }]}>
          <Text style={styles.checkoutPriceMain} numberOfLines={1}>
            CAD ${Number(effectiveGrandTotal).toFixed(2)}
          </Text>
          <View
            style={[
              styles.checkoutArrowTip,
              {
                borderTopWidth: checkoutBarHeight / 2,
                borderBottomWidth: checkoutBarHeight / 2,
              },
            ]}
          />
        </View>
        <View style={[styles.checkoutBookPane, { height: checkoutBarHeight }]}>
          {submitting || applePayLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.checkoutBookText}>
              {isInstantBooking ? 'BOOK TRIP' : 'REQUEST TRIP'}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <Modal
        visible={paymentPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPaymentPickerVisible(false)}
      >
        <View style={styles.paymentPickerBackdrop}>
          <TouchableOpacity
            style={styles.paymentPickerDismiss}
            activeOpacity={1}
            onPress={() => setPaymentPickerVisible(false)}
          />
          <View style={styles.paymentPickerSheet}>
            <Text style={styles.paymentPickerTitle}>Payment method</Text>
            {showApplePayButton ? (
              <TouchableOpacity
                style={[
                  styles.paymentPickerRow,
                  paymentMode === 'apple_pay' && styles.paymentPickerRowActive,
                ]}
                onPress={() => {
                  setPaymentMode('apple_pay');
                  setApplePayMethod(null);
                  setConfirmedPaymentIntentId(null);
                  setPaymentPickerVisible(false);
                }}
                activeOpacity={0.85}
              >
                <View style={[checkoutChipStyles.chip, { backgroundColor: '#000000' }]}>
                  <Text style={checkoutChipStyles.chipText}>APPLE PAY</Text>
                </View>
                <View style={styles.savedMethodTextCol}>
                  <Text style={styles.paymentPickerLine}>Apple Pay</Text>
                </View>
                {paymentMode === 'apple_pay' ? <Text style={styles.paymentPickerCheck}>✓</Text> : null}
              </TouchableOpacity>
            ) : null}
            {sortedPaymentMethods.map((m) => {
              const active = m.id === selectedPaymentMethod?.id && paymentMode === 'card';
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.paymentPickerRow, active && styles.paymentPickerRowActive]}
                  onPress={() => {
                    setApplePayMethod(null);
                    setConfirmedPaymentIntentId(null);
                    setSelectedMethodId(m.id);
                    setPaymentMode('card');
                    setPaymentPickerVisible(false);
                  }}
                  activeOpacity={0.85}
                >
                  <CheckoutBrandChip method={m} />
                  <View style={styles.savedMethodTextCol}>
                    <Text style={styles.paymentPickerLine} numberOfLines={1}>
                      {checkoutMethodSubtitle(m)}
                    </Text>
                  </View>
                  {active ? <Text style={styles.paymentPickerCheck}>✓</Text> : null}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.paymentPickerRow}
              onPress={() => {
                setPaymentPickerVisible(false);
                navigateToAddCard(navigation, { returnAfterPayment: true });
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.addPaymentText}>Add card</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.paymentPickerCancel}
              onPress={() => setPaymentPickerVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.paymentPickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={mapModalVisible} transparent animationType="slide">
        <View style={styles.mapModalBackdrop}>
          <View style={styles.mapModalCard}>
            <Text style={styles.mapModalTitle}>Adjust delivery location</Text>
            <MapView
              provider={MAP_PROVIDER}
              style={styles.mapModal}
              region={mapRegion}
              onRegionChangeComplete={setMapRegion}
            >
              <Marker coordinate={{ latitude: mapRegion.latitude, longitude: mapRegion.longitude }} />
            </MapView>
            <View style={styles.mapActions}>
              <TouchableOpacity style={styles.mapCancelBtn} onPress={() => setMapModalVisible(false)} activeOpacity={0.85}>
                <Text style={styles.mapCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mapConfirmBtn} onPress={confirmCurrentLocation} activeOpacity={0.85}>
                <Text style={styles.mapConfirmText}>Confirm location</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16 * scale,
    paddingVertical: 12 * scale,
  },
  backBtn: {
    width: 32 * scale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 17 * scale,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.2,
  },
  content: {
    paddingHorizontal: 20 * scale,
  },
  carHostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56 * scale,
    marginTop: 4 * scale,
    marginBottom: 14 * scale,
  },
  carThumb: {
    width: 56 * scale,
    height: 56 * scale,
    borderRadius: 8 * scale,
    backgroundColor: '#EFEFEF',
  },
  carThumbPlaceholder: {
    backgroundColor: '#E8E8E8',
  },
  carHostTextCol: {
    flex: 1,
    marginLeft: 12 * scale,
    justifyContent: 'center',
  },
  carTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    color: '#2F2F2F',
  },
  hostUnderTitle: {
    flex: 1,
    marginLeft: 8 * scale,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: '#8A8A8A',
  },
  hostTapRow: {
    marginTop: 4 * scale,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostAvatar: {
    width: 22 * scale,
    height: 22 * scale,
    borderRadius: 11 * scale,
    backgroundColor: '#E8E8E8',
  },
  hostAvatarPlaceholder: {
    backgroundColor: '#D8D8D8',
  },
  tripMetaCard: {
    borderWidth: 1,
    borderColor: '#E6E6E6',
    borderRadius: 12 * scale,
    paddingHorizontal: 14 * scale,
    paddingVertical: 12 * scale,
    backgroundColor: '#FAFAFA',
    marginBottom: 8 * scale,
  },
  tripMetaTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8 * scale,
  },
  tripMetaPin: {
    width: 14 * scale,
    height: 14 * scale,
    marginRight: 6 * scale,
    tintColor: COLORS.YELLOWISH_ORANGE,
  },
  tripMetaLocation: {
    flex: 1,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: '#4A4A4A',
  },
  tripMetaDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2 * scale,
  },
  tripMetaDateLabel: {
    width: 42 * scale,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: COLORS.GREENY_BLUE_TWO,
  },
  tripMetaDateValue: {
    flex: 1,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: '#6A6A6A',
  },
  sectionBlock: {
    marginTop: 18 * scale,
    paddingBottom: 14 * scale,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(151,151,151,0.28)',
  },
  sectionTitleQuiet: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: '#9A9A9A',
    marginBottom: 10 * scale,
    letterSpacing: 0.2,
  },
  sectionTitleGreen: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    marginBottom: 10 * scale,
    letterSpacing: 0.2,
  },
  softFieldLabel: {
    marginTop: 12 * scale,
    marginBottom: 6 * scale,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: '#6A6A6A',
  },
  input: {
    height: 42 * scale,
    borderWidth: 1,
    borderColor: '#E2E2E2',
    borderRadius: 8 * scale,
    paddingHorizontal: 12 * scale,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: '#4A4A4A',
  },
  deliveryPlacesField: {
    marginBottom: 8 * scale,
    zIndex: 20,
  },
  currentLocationBtn: {
    marginTop: 4 * scale,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  currentLocationIcon: {
    width: 20 * scale,
    height: 20 * scale,
    tintColor: COLORS.YELLOWISH_ORANGE,
    marginRight: 6 * scale,
  },
  currentLocationText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: COLORS.YELLOWISH_ORANGE,
  },
  extraAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10 * scale,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(151,151,151,0.2)',
  },
  extraAddRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 2 * scale,
  },
  extraAddCopy: {
    flex: 1,
    marginRight: 12 * scale,
  },
  extraAddTitle: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: '#3A3A3A',
  },
  extraAddSubtitle: {
    marginTop: 2 * scale,
    fontFamily: FONTS.NUNITO,
    fontSize: 12 * scale,
    color: '#8E8E8E',
    flexShrink: 1,
  },
  extraAddText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: COLORS.GREENY_BLUE_TWO,
  },
  extraAddTextOn: {
    fontFamily: FONTS.NUNITO_BOLD,
    color: COLORS.GREENY_BLUE_TWO,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8 * scale,
  },
  receiptLabel: {
    flex: 1,
    fontFamily: FONTS.NUNITO,
    fontSize: 14 * scale,
    color: '#4A4A4A',
    paddingRight: 12 * scale,
  },
  receiptValue: {
    fontFamily: FONTS.NUNITO,
    fontSize: 14 * scale,
    color: '#4A4A4A',
  },
  receiptSavings: {
    color: COLORS.GREENY_BLUE_TWO,
  },
  receiptDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(151,151,151,0.35)',
    marginTop: 4 * scale,
    marginBottom: 10 * scale,
  },
  receiptTotalLabel: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    color: COLORS.GREENY_BLUE_TWO,
  },
  receiptTotalValue: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    color: COLORS.GREENY_BLUE_TWO,
  },
  receiptCaption: {
    marginTop: 2 * scale,
    fontFamily: FONTS.NUNITO,
    fontSize: 11 * scale,
    color: '#9B9B9B',
  },
  tripFeeLabelInline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12 * scale,
  },
  tripFeeInfoHit: {
    marginLeft: 4 * scale,
  },
  tripFeeInfoCircle: {
    width: 14 * scale,
    height: 14 * scale,
    borderRadius: 7 * scale,
    borderWidth: 1.25,
    borderColor: '#8A8A8A',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  tripFeeInfoI: {
    fontSize: 8 * scale,
    fontFamily: FONTS.NUNITO_BOLD,
    color: '#8A8A8A',
    marginTop: -0.5,
  },
  cancelLine: {
    marginTop: 14 * scale,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: '#4A4A4A',
  },
  chargeTiming: {
    marginTop: 8 * scale,
    fontFamily: FONTS.NUNITO,
    fontSize: 12 * scale,
    color: '#8A8A8A',
    lineHeight: 18 * scale,
  },
  paymentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10 * scale,
  },
  paymentHeaderTitle: {
    marginBottom: 0,
  },
  paymentHeaderIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6 * scale,
  },
  paymentHeaderIconBox: {
    borderRadius: 4 * scale,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D0D0D0',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  paymentHeaderIconAppleInner: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentHeaderIconAppleText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 8 * scale,
    color: '#fff',
    letterSpacing: 0.2,
  },
  paymentSelectBtn: {
    minHeight: 52 * scale,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12 * scale,
    paddingVertical: 10 * scale,
    paddingHorizontal: 14 * scale,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  paymentSelectInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8 * scale,
  },
  paymentSelectLabel: {
    flex: 1,
    marginLeft: 10 * scale,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: '#2F2F2F',
  },
  paymentSelectPlaceholder: {
    flex: 1,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: '#8E8E8E',
  },
  paymentSelectChevron: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 22 * scale,
    color: '#A0A0A0',
    marginTop: -2 * scale,
  },
  addCardLink: {
    marginTop: 10 * scale,
    alignSelf: 'flex-start',
  },
  addPaymentText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: COLORS.GREENY_BLUE_TWO,
  },
  savedMethodTextCol: {
    justifyContent: 'center',
    marginLeft: 12 * scale,
    flexShrink: 1,
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16 * scale,
    marginBottom: 4 * scale,
    paddingRight: 4 * scale,
  },
  agreeCheckbox: {
    width: 22 * scale,
    height: 22 * scale,
    borderRadius: 4 * scale,
    borderWidth: 1.5,
    borderColor: '#B0B0B0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10 * scale,
    marginTop: 1 * scale,
    backgroundColor: '#fff',
  },
  agreeCheckboxOn: {
    borderColor: COLORS.GREENY_BLUE_TWO,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
  },
  agreeCheckMark: {
    color: '#fff',
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 13 * scale,
    marginTop: -1,
  },
  agreeText: {
    flex: 1,
    fontFamily: FONTS.NUNITO,
    fontSize: 12 * scale,
    color: '#4A4A4A',
    lineHeight: 18 * scale,
  },
  agreeLink: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    color: COLORS.GREENY_BLUE_TWO,
  },
  noteSection: {
    borderBottomWidth: 0,
    marginBottom: 8 * scale,
  },
  noteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4 * scale,
  },
  noteToggleText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: '#4A4A4A',
  },
  noteChevron: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 18 * scale,
    color: COLORS.GREENY_BLUE_TWO,
  },
  introInput: {
    marginTop: 10 * scale,
    borderWidth: 1,
    borderColor: '#E2E2E2',
    borderRadius: 8 * scale,
    minHeight: 90 * scale,
    paddingHorizontal: 12 * scale,
    paddingVertical: 10 * scale,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: '#4A4A4A',
  },
  checkoutStickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    zIndex: 50,
    elevation: 50,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
  checkoutStickyDisabled: {
    opacity: 0.55,
  },
  checkoutPricePane: {
    width: 168,
    backgroundColor: COLORS.YELLOWISH_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 22,
    position: 'relative',
    zIndex: 2,
  },
  checkoutPriceMain: {
    fontFamily: 'GothamRounded-Book',
    fontSize: 17,
    color: '#fff',
    letterSpacing: 0.3,
    textAlign: 'center',
    lineHeight: 20,
  },
  checkoutArrowTip: {
    position: 'absolute',
    right: -30,
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 30,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: COLORS.YELLOWISH_ORANGE,
  },
  checkoutBookPane: {
    flex: 1,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutBookText: {
    fontFamily: 'GothamRounded-Book',
    fontSize: 17,
    color: '#fff',
    letterSpacing: 0.8,
    lineHeight: 20,
  },
  paymentPickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  paymentPickerDismiss: {
    flex: 1,
  },
  paymentPickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 14 * scale,
    borderTopRightRadius: 14 * scale,
    paddingBottom: 24 * scale + 8,
    paddingTop: 12 * scale,
  },
  paymentPickerTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 13 * scale,
    color: '#8E8E8E',
    textAlign: 'center',
    marginBottom: 12 * scale,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paymentPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14 * scale,
    paddingHorizontal: 20 * scale,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  paymentPickerRowActive: {
    backgroundColor: 'rgba(76, 182, 177, 0.08)',
  },
  paymentPickerLine: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: '#000',
    letterSpacing: 0.2,
  },
  paymentPickerCheck: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 18 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    marginLeft: 8 * scale,
  },
  paymentPickerCancel: {
    marginTop: 12 * scale,
    paddingVertical: 14 * scale,
  },
  paymentPickerCancelText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 17 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    textAlign: 'center',
  },
  mapModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  mapModalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16 * scale,
    borderTopRightRadius: 16 * scale,
    padding: 14 * scale,
    paddingBottom: 20 * scale,
  },
  mapModalTitle: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: '#4A4A4A',
    textAlign: 'center',
    marginBottom: 10 * scale,
  },
  mapModal: {
    width: '100%',
    height: 260 * scale,
    borderRadius: 8 * scale,
  },
  mapActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12 * scale,
    gap: 10 * scale,
  },
  mapCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DADADA',
    borderRadius: 24 * scale,
    height: 44 * scale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapConfirmBtn: {
    flex: 1,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 24 * scale,
    height: 44 * scale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCancelText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: '#777',
  },
  mapConfirmText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: '#fff',
  },
});
