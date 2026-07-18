import React, { useMemo, useState } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useGuestBookings } from '../context/GuestBookingsContext';
import * as bookingsApi from '../services/bookingsApi';
import { formatTripDateTime } from '../utils/guestBookingFormat';
import { useApplePayCheckout } from '../hooks/useApplePayCheckout';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const { width: screenWidth } = Dimensions.get('window');
const scale = uiScale;

const EXTEND_OPTIONS = [1, 2, 3, 5, 7];

export default function ExtendTripScreen({ navigation, route }) {
  const { bookingId } = route.params || {};
  const { getBookingById, refreshBookingsFromApi } = useGuestBookings();
  const { payForBooking } = useApplePayCheckout();
  const booking = useMemo(() => (bookingId ? getBookingById(bookingId) : null), [bookingId, getBookingById]);
  const [selectedDays, setSelectedDays] = useState(1);
  const [quote, setQuote] = useState(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentEndMs = Number(booking?.bookingDates?.end ?? 0);
  const newEndMs = currentEndMs + selectedDays * MS_PER_DAY;

  const newEndFmt = formatTripDateTime(newEndMs);

  const loadQuote = async (days) => {
    if (!bookingId || !currentEndMs) return;
    const end = currentEndMs + days * MS_PER_DAY;
    setLoadingQuote(true);
    try {
      const q = await bookingsApi.quoteExtension(bookingId, end);
      setQuote(q);
    } catch (e) {
      setQuote(null);
      Alert.alert('Quote unavailable', e?.message || 'Could not price this extension.');
    } finally {
      setLoadingQuote(false);
    }
  };

  const onSelectDays = (days) => {
    setSelectedDays(days);
    loadQuote(days);
  };

  React.useEffect(() => {
    if (bookingId && currentEndMs) {
      loadQuote(1);
    }
  }, [bookingId, currentEndMs]);

  const onSubmit = async () => {
    if (!bookingId) return;
    setSubmitting(true);
    try {
      let stripePaymentIntentId;
      const total = Number(quote?.grandTotal ?? 0);
      if (total >= 0.5) {
        const paid = await payForBooking({
          amountDollars: total,
          description: 'Trip extension',
          metadata: { bookingId, purpose: 'extension' },
        });
        stripePaymentIntentId = paid.paymentIntentId;
      }
      await bookingsApi.requestExtension(bookingId, { newEndMs, stripePaymentIntentId });
      await refreshBookingsFromApi();
      Alert.alert(
        'Extension requested',
        'Your host will review your trip extension request. You will be notified when they respond.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      Alert.alert('Request failed', e?.message || 'Could not request extension.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!booking) {
    return (
      <View style={styles.container}>
        <Text style={styles.missing}>Booking not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>EXTEND TRIP</Text>
      <Text style={styles.sub}>
        Current end: {formatTripDateTime(currentEndMs).dateLine} {formatTripDateTime(currentEndMs).timeLine}
      </Text>
      <Text style={styles.sub}>New end: {newEndFmt.dateLine} {newEndFmt.timeLine}</Text>

      <Text style={styles.label}>Add days</Text>
      <View style={styles.chips}>
        {EXTEND_OPTIONS.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.chip, selectedDays === d && styles.chipActive]}
            onPress={() => onSelectDays(d)}
          >
            <Text style={[styles.chipText, selectedDays === d && styles.chipTextActive]}>+{d}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loadingQuote ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={COLORS.GREENY_BLUE_TWO} />
      ) : quote ? (
        <View style={styles.quoteBox}>
          <Text style={styles.quoteLine}>Extension cost: ${Number(quote.grandTotal ?? 0).toFixed(2)} CAD</Text>
          <Text style={styles.quoteHint}>Payment will be collected when your host approves.</Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.primaryBtn} onPress={onSubmit} disabled={submitting || loadingQuote}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryText}>Request extension</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.cancel}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 * scale, paddingTop: 56 * scale },
  title: { fontFamily: FONTS.NUNITO_LIGHT, fontSize: 20 * scale, color: '#7a7979', marginBottom: 12 },
  sub: { fontFamily: FONTS.NUNITO_REGULAR, fontSize: 14, color: '#666', marginBottom: 6 },
  label: { marginTop: 20, marginBottom: 10, fontFamily: FONTS.NUNITO_SEMIBOLD, color: '#444' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: COLORS.GREENY_BLUE_TWO },
  chipText: { fontFamily: FONTS.NUNITO_SEMIBOLD, color: COLORS.GREENY_BLUE_TWO },
  chipTextActive: { color: '#fff' },
  quoteBox: { marginTop: 24, padding: 16, backgroundColor: '#f5fafa', borderRadius: 12 },
  quoteLine: { fontFamily: FONTS.NUNITO_SEMIBOLD, fontSize: 16, color: '#333' },
  quoteHint: { marginTop: 6, fontFamily: FONTS.NUNITO_REGULAR, fontSize: 13, color: '#777' },
  primaryBtn: {
    marginTop: 32,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontFamily: FONTS.NUNITO_SEMIBOLD, fontSize: 16 },
  cancel: { textAlign: 'center', marginTop: 16, color: '#888' },
  missing: { padding: 24, textAlign: 'center' },
});
