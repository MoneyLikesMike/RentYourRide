import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Image,
  Dimensions,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { PlatformPayButton, PlatformPay } from '@stripe/stripe-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import MapView, { Marker } from 'react-native-maps';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { getTripBillingDays } from '../utils/rentalTripDays';
import { useFocusEffect } from '@react-navigation/native';
import { usePaymentMethods } from '../context/PaymentMethodsContext';
import { useGuestBookings } from '../context/GuestBookingsContext';
import { useUserProfile } from '../context/UserProfileContext';
import { useAuth } from '../context/AuthContext';
import * as bookingsApi from '../services/bookingsApi';
import { isRemoteListingId } from '../utils/listingId';
import { brandLabel } from '../utils/paymentMethodUtils';
import { TRIP_FEE_DISCLOSURE_TEXT } from '../constants/tripFeeDisclosure';
import GooglePlacesAutocompleteField from '../components/GooglePlacesAutocompleteField';
import { getCurrentCoordinates } from '../utils/currentLocation';
import { reverseGeocode } from '../services/geocodeApi';
import { MAP_PROVIDER } from '../utils/mapProvider';
import { isApplePayConfigured } from '../constants/stripe';
import { useApplePayCheckout } from '../hooks/useApplePayCheckout';

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375;
const TAB_BAR_HEIGHT = 78 * scale;

const formatDateTime = (timestamp, fallbackText) => {
  if (!timestamp) return fallbackText;
  const d = new Date(timestamp);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  const hours24 = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hour12 = hours24 % 12 || 12;
  const minutePadded = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${month} ${day}, ${year} - ${hour12}:${minutePadded} ${ampm}`;
};

const parsePercent = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const numeric = Number(value.replace('%', '').trim());
  return Number.isFinite(numeric) ? numeric : 0;
};

function checkoutMethodSubtitle(m) {
  if (!m) return '';
  if (m.type === 'paypal') return m.email || '';
  if (m.type === 'apple_pay' || m.brand === 'apple_pay') return 'Apple Pay';
  return `XXXX - ${m.last4 || '????'}`;
}

function CheckoutBrandChip({ method }) {
  if (!method) return null;
  if (method.type === 'paypal') {
    return (
      <View style={checkoutChipStyles.chipPaypal}>
        <Text style={checkoutChipStyles.chipText}>PayPal</Text>
      </View>
    );
  }
  if (method.type === 'apple_pay' || method.brand === 'apple_pay') {
    return (
      <View style={[checkoutChipStyles.chip, { backgroundColor: '#000000' }]}>
        <Text style={checkoutChipStyles.chipText}>APPLE PAY</Text>
      </View>
    );
  }
  const b = method.brand || 'other';
  const bg =
    b === 'visa'
      ? '#1A1F71'
      : b === 'mastercard'
        ? '#000000'
        : b === 'amex'
          ? '#006FCF'
          : b === 'discover'
            ? '#FF6000'
            : '#4A4A4A';
  return (
    <View style={[checkoutChipStyles.chip, { backgroundColor: bg }]}>
      <Text style={checkoutChipStyles.chipText}>{brandLabel(b).toUpperCase()}</Text>
    </View>
  );
}

const checkoutChipStyles = StyleSheet.create({
  chip: {
    width: 52 * scale,
    height: 32 * scale,
    borderRadius: 4 * scale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipPaypal: {
    width: 52 * scale,
    height: 32 * scale,
    borderRadius: 4 * scale,
    backgroundColor: '#003087',
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
  const { listing = {}, bookingDates } = route.params || {};
  const { methods, defaultMethodId, refreshFromApi } = usePaymentMethods();
  const { addGuestBooking } = useGuestBookings();
  const { firstName, lastName, photoUri: profilePhotoUri } = useUserProfile();
  const { isAuthenticated, isReady } = useAuth();
  const { supported: applePaySupported, payForBooking, savePaymentMethod } = useApplePayCheckout();
  const [quotePricing, setQuotePricing] = useState(null);
  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [paymentPickerVisible, setPaymentPickerVisible] = useState(false);
  const [applePayLoading, setApplePayLoading] = useState(false);
  const [confirmedPaymentIntentId, setConfirmedPaymentIntentId] = useState(null);
  const [applePayMethod, setApplePayMethod] = useState(null);

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
    setSelectedMethodId(null);
    setConfirmedPaymentIntentId(null);
    setApplePayMethod(null);
  }, [checkoutSessionKey]);

  useFocusEffect(
    useCallback(() => {
      setSelectedMethodId((prev) => {
        if (!prev) return prev;
        return methods.some((m) => m.id === prev) ? prev : null;
      });
    }, [methods])
  );

  const selectedPaymentMethod = useMemo(() => {
    if (applePayMethod) return applePayMethod;
    if (!methods.length) return null;
    if (selectedMethodId && methods.some((m) => m.id === selectedMethodId)) {
      return methods.find((m) => m.id === selectedMethodId);
    }
    if (defaultMethodId && methods.some((m) => m.id === defaultMethodId)) {
      return methods.find((m) => m.id === defaultMethodId);
    }
    return methods[0];
  }, [methods, defaultMethodId, selectedMethodId, applePayMethod]);

  const showApplePayButton =
    Platform.OS === 'ios' && isApplePayConfigured() && applePaySupported && isAuthenticated && isReady;

  const sortedPaymentMethods = useMemo(() => {
    const copy = [...methods];
    copy.sort((a, b) => {
      const aDef = a.id === defaultMethodId ? 0 : 1;
      const bDef = b.id === defaultMethodId ? 0 : 1;
      return aDef - bDef;
    });
    return copy;
  }, [methods, defaultMethodId]);

  const pricePerDay = Number(listing.pricePerDay) || 40;
  const deliveryFee = Number(listing.deliveryPrice) || 0;
  const kmPerDayRaw = listing.dailyKm || '200 km/day';
  const kmPerDayNumber = Number(String(kmPerDayRaw).replace(/[^\d]/g, '')) || 200;
  const canDeliver = deliveryFee > 0;
  const pickupAddress = listing.pickupAddress || 'Winnipeg, MB R3N1P1';

  const startDateTimeText = formatDateTime(
    bookingDates?.start,
    bookingDates?.startTime ? `JUN 10, 2020 - ${bookingDates.startTime}` : 'JUN 10, 2020 - 12:00 AM'
  );
  const endDateTimeText = formatDateTime(
    bookingDates?.end,
    bookingDates?.endTime ? `JUN 12, 2020 - ${bookingDates.endTime}` : 'JUN 12, 2020 - 9:00 PM'
  );

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
    extraPrepaidClean ? { key: 'clean', label: 'Pre paid clean', amount: prepaidCleanFee, icon: require('../assets/icons/cleanCar.png') } : null,
    extraUnlimitedKm ? { key: 'kms', label: 'Unlimited kms', amount: unlimitedKmFee, icon: require('../assets/icons/road.png') } : null,
    extraPrepaidFuel ? { key: 'fuel', label: 'Pre paid fuel', amount: prepaidFuelFee, icon: require('../assets/icons/fuel.png') } : null,
    selectedDeliveryFee > 0 ? { key: 'delivery', label: 'Delivery', amount: selectedDeliveryFee, icon: require('../assets/icons/shorttrip.png') } : null,
  ].filter(Boolean);

  const submitBooking = useCallback(
    async ({ paymentIntentId = confirmedPaymentIntentId, paymentMethod = selectedPaymentMethod } = {}) => {
      const guestName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Guest';
      const dropAddr =
        deliveryEnabled && canDeliver && deliveryLocation?.trim()
          ? deliveryLocation.trim()
          : pickupAddress;
      const bookingId = await addGuestBooking({
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
          kmIncludedLabel: effectiveKmLabel,
        },
        selectedPaymentMethod: paymentMethod,
        stripePaymentIntentId: paymentIntentId || null,
      });
      navigation.navigate('BookingRequestConfirmationScreen', {
        listing,
        bookingDates,
        selectedPaymentMethod: paymentMethod,
        bookingId,
      });
      return bookingId;
    },
    [
      addGuestBooking,
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
      Alert.alert(
        'Apple Pay ready',
        'Your payment method is saved. Tap Send booking request to continue.',
      );
    } catch (err) {
      Alert.alert('Apple Pay', err?.message || 'Could not complete Apple Pay.');
    } finally {
      setApplePayLoading(false);
    }
  }, [
    effectiveGrandTotal,
    isAuthenticated,
    isReady,
    listing,
    payForBooking,
    refreshFromApi,
    savePaymentMethod,
    submitBooking,
  ]);

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Svg width={24} height={24} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke={COLORS.YELLOWISH_ORANGE} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CHECKOUT</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_HEIGHT + 8 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.locationCard}>
          <Image source={require('../assets/icons/currentLocationPin.png')} style={styles.locationIcon} resizeMode="contain" />
          <Text style={styles.locationText}>{pickupAddress}</Text>
        </View>

        <View style={styles.dateRow}>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>Start</Text>
            <Text style={styles.dateValue}>{startDateTimeText}</Text>
          </View>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>End</Text>
            <Text style={styles.dateValue}>{endDateTimeText}</Text>
          </View>
        </View>
        <View style={styles.dateDeliveryDivider} />

        {canDeliver ? (
          <View style={[styles.section, styles.deliverySection]}>
            <View style={styles.toggleRow}>
              <Text style={styles.sectionTitleGreen}>Have the vehicle dropped off to you</Text>
              <Switch
                value={deliveryEnabled}
                onValueChange={setDeliveryEnabled}
                trackColor={{ false: '#D9D9D9', true: COLORS.GREENY_BLUE_TWO }}
                thumbColor="#fff"
              />
            </View>
            {deliveryEnabled ? (
              <>
                <Text style={[styles.label, styles.deliveryLocationLabel]}>LOCATION</Text>
                <GooglePlacesAutocompleteField
                  placeholder="Enter delivery address"
                  types="address"
                  onPlaceSelected={({ selection }) => setDeliveryLocation(selection.query)}
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

        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <Text style={styles.label}>UNLIMITED KMS</Text>
            <Switch
              value={extraUnlimitedKm}
              onValueChange={setExtraUnlimitedKm}
              trackColor={{ false: '#D9D9D9', true: COLORS.GREENY_BLUE_TWO }}
              thumbColor="#fff"
            />
          </View>
          <Text style={styles.extraPrice}>${150}</Text>
          <View style={styles.rowDivider} />

          <View style={styles.toggleRow}>
            <Text style={styles.label}>PRE PAID FUEL</Text>
            <Switch
              value={extraPrepaidFuel}
              onValueChange={setExtraPrepaidFuel}
              trackColor={{ false: '#D9D9D9', true: COLORS.GREENY_BLUE_TWO }}
              thumbColor="#fff"
            />
          </View>
          <Text style={styles.extraPrice}>${80}</Text>
          <View style={styles.rowDivider} />

          <View style={styles.toggleRow}>
            <Text style={styles.label}>PRE PAID CLEAN</Text>
            <Switch
              value={extraPrepaidClean}
              onValueChange={setExtraPrepaidClean}
              trackColor={{ false: '#D9D9D9', true: COLORS.GREENY_BLUE_TWO }}
              thumbColor="#fff"
            />
          </View>
          <Text style={styles.extraPrice}>${50}</Text>
        </View>

        <View style={[styles.section, styles.introduceSection]}>
          <Text style={styles.label}>INTRODUCE YOURSELF</Text>
          <TextInput
            multiline
            placeholder="Introduce yourself and share your plans with your trip and their vehicle"
            placeholderTextColor="#B3B3B3"
            value={introMessage}
            onChangeText={setIntroMessage}
            style={styles.introInput}
            textAlignVertical="top"
          />
        </View>

        <View style={[styles.section, styles.tripSummarySection]}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Kilometres included in this trip</Text>
            <Text style={styles.summaryValue}>{effectiveKmLabel}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Price per day</Text>
            <Text style={styles.summaryValue}>${pricePerDay.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{effectiveTripDays} days</Text>
            <Text style={styles.summaryValue}>${effectiveBaseTripSubtotal.toFixed(2)}</Text>
          </View>
          {effectiveTripDiscountSavings > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {appliesMonthlyDiscount
                  ? `Monthly discount (${listing.monthlyDiscount || `${monthlyDiscountPct}%`})`
                  : `Weekly discount (${listing.weeklyDiscount || `${weeklyDiscountPct}%`})`}
              </Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>- ${effectiveTripDiscountSavings.toFixed(2)}</Text>
            </View>
          ) : null}
          {effectiveTripDiscountSavings > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Trip total (after discount)</Text>
              <Text style={styles.summaryValue}>${effectiveDiscountedTripSubtotal.toFixed(2)}</Text>
            </View>
          ) : null}

          {selectedExtras.length > 0 ? (
            <>
              <View style={styles.rowDivider} />
              <Text style={styles.selectedExtrasHeader}>SELECTED EXTRAS</Text>
              <View style={styles.selectedExtrasList}>
                {selectedExtras.map((extra) => (
                  <View key={extra.key} style={styles.summaryRow}>
                    <View style={styles.extraRowLeft}>
                      <Image source={extra.icon} style={styles.extraTagIcon} resizeMode="contain" />
                      <Text style={styles.extraTagTitle}>{extra.label}</Text>
                    </View>
                    <Text style={styles.summaryValue}>${extra.amount.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.greenDivider} />
            </>
          ) : null}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${effectiveSubtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.tripFeeRowLeft}>
              <View style={styles.tripFeeLabelInline}>
                <Text style={styles.tripFeeLabelText}>Trip fee</Text>
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
            </View>
            <Text style={styles.summaryValue}>${effectiveTripFee.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Price</Text>
            <Text style={styles.totalValue}>${effectiveGrandTotal.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.paymentLabel}>Payment Method</Text>
          {selectedPaymentMethod ? (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.savedMethodRow}
              onPress={() => methods.length > 1 && setPaymentPickerVisible(true)}
              disabled={methods.length <= 1}
            >
              <View style={styles.savedMethodInner}>
                <CheckoutBrandChip method={selectedPaymentMethod} />
                <View style={styles.savedMethodTextCol}>
                  <Text style={styles.savedMethodLine} numberOfLines={1}>
                    {checkoutMethodSubtitle(selectedPaymentMethod)}
                  </Text>
                </View>
              </View>
              {methods.length > 1 ? (
                <View style={styles.savedMethodChevronWrap}>
                  <Image
                    source={require('../assets/icons/arrow-button.png')}
                    style={styles.paymentRowChevron}
                    resizeMode="contain"
                  />
                </View>
              ) : null}
            </TouchableOpacity>
          ) : null}
          {showApplePayButton ? (
            <View style={styles.applePayBtnWrap}>
              {applePayLoading ? (
                <View style={[styles.applePayBtn, styles.applePayLoading]}>
                  <ActivityIndicator color="#000000" />
                </View>
              ) : (
                <PlatformPayButton
                  onPress={handleApplePay}
                  type={PlatformPay.ButtonType.Book}
                  appearance={PlatformPay.ButtonStyle.Black}
                  borderRadius={4 * scale}
                  disabled={applePayLoading}
                  style={styles.applePayNativeBtn}
                />
              )}
            </View>
          ) : null}
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.addPaymentBtn}
            onPress={() =>
              navigation.navigate('ProfileScreen', {
                screen: 'AddPaymentMethodScreen',
                params: { returnAfterPayment: true },
              })
            }
          >
            <Text style={styles.addPaymentText}>Add Payment Method</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sendRequestWrap}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.sendRequestBtn}
            onPress={async () => {
              try {
                await submitBooking();
              } catch (err) {
                Alert.alert('Booking failed', err?.message || 'Could not send booking request.');
              }
            }}
          >
            <Text style={styles.sendRequestText}>SEND BOOKING REQUEST</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
            <Text style={styles.paymentPickerTitle}>Cards on file</Text>
            {sortedPaymentMethods.map((m) => {
              const active = m.id === selectedPaymentMethod?.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.paymentPickerRow, active && styles.paymentPickerRowActive]}
                  onPress={() => {
                    setApplePayMethod(null);
                    setConfirmedPaymentIntentId(null);
                    setSelectedMethodId(m.id);
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 17,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.2,
  },
  content: {
    paddingHorizontal: 20 * scale,
  },
  locationCard: {
    height: 42,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginTop: 8,
  },
  locationIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
    tintColor: COLORS.YELLOWISH_ORANGE,
  },
  locationText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: '#9B9B9B',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  dateBox: {
    width: '48%',
    height: 59,
    backgroundColor: '#F2F2F2',
    borderRadius: 7,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 0,
  },
  dateDeliveryDivider: {
    height: 1,
    backgroundColor: 'rgba(151,151,151,0.22)',
    marginTop: 14,
    marginBottom: 8,
  },
  dateLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12,
    color: COLORS.GREENY_BLUE_TWO,
    marginBottom: 4,
  },
  dateValue: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 8,
    color: '#9B9B9B',
    letterSpacing: 0.1,
  },
  section: {
    marginTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(151,151,151,0.22)',
  },
  introduceSection: {
    marginTop: 24,
    marginBottom: 0,
    paddingBottom: 16,
  },
  tripSummarySection: {
    marginTop: 16,
    borderBottomWidth: 0,
  },
  deliverySection: {
    marginTop: 0,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 34,
  },
  sectionTitleGreen: {
    flex: 1,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
    marginRight: 12,
  },
  label: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: '#4A4A4A',
    letterSpacing: 0.2,
  },
  input: {
    marginTop: 8,
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E2E2',
    borderRadius: 4,
    paddingHorizontal: 12,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12,
    color: '#4A4A4A',
  },
  suggestionsWrap: {
    borderWidth: 1,
    borderColor: '#E2E2E2',
    borderRadius: 4,
    marginTop: 6,
    overflow: 'hidden',
  },
  suggestionRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EAEAEA',
    backgroundColor: '#fff',
  },
  suggestionText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12,
    color: '#666',
  },
  currentLocationBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  currentLocationIcon: {
    width: 22,
    height: 22,
    tintColor: COLORS.YELLOWISH_ORANGE,
    marginRight: 6,
  },
  deliveryLocationLabel: {
    marginBottom: 8,
  },
  deliveryPlacesField: {
    marginBottom: 8,
    zIndex: 20,
  },
  currentLocationText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12,
    color: COLORS.YELLOWISH_ORANGE,
  },
  extraPrice: {
    marginTop: 2,
    marginBottom: 8,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12,
    color: '#B3B3B3',
  },
  rowDivider: {
    height: 1,
    backgroundColor: 'rgba(151,151,151,0.22)',
    marginVertical: 8,
  },
  introInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E2E2',
    borderRadius: 4,
    minHeight: 90,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12,
    color: '#4A4A4A',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tripFeeRowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripFeeLabelInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripFeeLabelText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
  },
  tripFeeInfoHit: {
    marginLeft: 4,
  },
  tripFeeInfoCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.25,
    borderColor: COLORS.GREENY_BLUE_TWO,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  tripFeeInfoI: {
    fontSize: 8,
    fontFamily: FONTS.NUNITO_BOLD,
    color: COLORS.GREENY_BLUE_TWO,
    marginTop: -0.5,
  },
  summaryLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
  },
  summaryLabelBold: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 12,
    color: '#4A4A4A',
    letterSpacing: 0.2,
  },
  summaryValue: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12,
    color: '#8E8E8E',
  },
  discountValue: {
    color: COLORS.GREENY_BLUE_TWO,
  },
  selectedExtrasList: {
    marginTop: 4,
    marginBottom: 6,
  },
  selectedExtrasHeader: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
    marginTop: 2,
    marginBottom: 4,
  },
  extraRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  extraTagIcon: {
    width: 22,
    height: 22,
    marginRight: 8,
  },
  extraTagTitle: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: COLORS.GREENY_BLUE_TWO,
  },
  greenDivider: {
    height: 1,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    opacity: 0.9,
    marginTop: 12,
    marginBottom: 12,
  },
  totalRow: {
    marginTop: 8,
  },
  totalLabel: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 16,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
  },
  totalValue: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 16,
    color: COLORS.GREENY_BLUE_TWO,
  },
  paymentLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16,
    color: '#7A7A7A',
    textAlign: 'center',
    marginBottom: 10,
  },
  savedMethodRow: {
    width: 323 * scale,
    minHeight: 56,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10 * scale,
    paddingHorizontal: 14 * scale,
    marginBottom: 10 * scale,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
  },
  savedMethodInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '88%',
  },
  savedMethodTextCol: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12 * scale,
    maxWidth: 200 * scale,
  },
  savedMethodLine: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: '#000',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  savedMethodChevronWrap: {
    position: 'absolute',
    right: 14 * scale,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentRowChevron: {
    width: 10 * scale,
    height: 16 * scale,
    tintColor: '#7EB8D4',
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
    fontSize: 13,
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
    fontSize: 15,
    color: '#000',
    letterSpacing: 0.2,
  },
  paymentPickerCheck: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 18,
    color: COLORS.GREENY_BLUE_TWO,
    marginLeft: 8 * scale,
  },
  paymentPickerCancel: {
    marginTop: 12 * scale,
    paddingVertical: 14 * scale,
  },
  paymentPickerCancelText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 17,
    color: COLORS.GREENY_BLUE_TWO,
    textAlign: 'center',
  },
  applePayBtn: {
    width: 323 * scale,
    height: 56,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#111',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  applePayBtnWrap: {
    width: 323 * scale,
    height: 56,
    alignSelf: 'center',
    marginTop: 0,
  },
  applePayNativeBtn: {
    width: '100%',
    height: 56,
  },
  applePayLoading: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#111',
    borderRadius: 14,
  },
  applePayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleGlyph: {
    fontSize: 22,
    lineHeight: 24,
    color: '#000',
    marginRight: 8,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  applePayText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 20,
    lineHeight: 24,
    color: '#000',
    textAlign: 'center',
    letterSpacing: 0.2,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  addPaymentBtn: {
    marginTop: 10,
    alignItems: 'center',
  },
  addPaymentText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
  },
  sendRequestWrap: {
    paddingTop: 16,
    paddingBottom: 0,
  },
  sendRequestBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendRequestText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 17,
    color: '#fff',
    letterSpacing: 0.3,
    textAlign: 'center',
    width: 248,
    height: 23,
    lineHeight: 23,
  },
  mapModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  mapModalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 14,
    paddingBottom: 20,
  },
  mapModalTitle: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: '#4A4A4A',
    textAlign: 'center',
    marginBottom: 10,
  },
  mapModal: {
    width: '100%',
    height: 260,
    borderRadius: 8,
  },
  mapActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },
  mapCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DADADA',
    borderRadius: 24,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapConfirmBtn: {
    flex: 1,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 24,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCancelText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14,
    color: '#777',
  },
  mapConfirmText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14,
    color: '#fff',
  },
});
