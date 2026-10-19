import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import {
  FINISH_PAYOUT_BANNER_BODY,
  FINISH_PAYOUT_BANNER_TITLE,
} from '../constants/payoutRequirementCopy';
import { useListings } from '../context/ListingsContext';

/**
 * Shown on Host / Payouts / listing surfaces when payouts are not ready
 * or Stripe still has past/currently due requirements.
 */
export default function FinishPayoutSetupBanner({ pendingAmount }) {
  const navigation = useNavigation();
  const { payoutSetupComplete, payoutStatusMeta } = useListings();
  const due =
    (payoutStatusMeta?.currentlyDue?.length || 0) +
      (payoutStatusMeta?.pastDue?.length || 0) >
    0;
  const show = !payoutSetupComplete || due;
  if (!show) return null;

  const deadline = payoutStatusMeta?.currentDeadline
    ? new Date(payoutStatusMeta.currentDeadline).toLocaleDateString()
    : null;

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={() => navigation.navigate('FinishPayoutSetupScreen')}
      activeOpacity={0.85}
    >
      <Text style={styles.title}>{FINISH_PAYOUT_BANNER_TITLE}</Text>
      <Text style={styles.body}>{FINISH_PAYOUT_BANNER_BODY}</Text>
      {deadline ? (
        <Text style={styles.meta}>Deadline: {deadline}</Text>
      ) : null}
      {pendingAmount != null && Number(pendingAmount) > 0 ? (
        <Text style={styles.meta}>
          Waiting: ${Number(pendingAmount).toFixed(2)} CAD
        </Text>
      ) : null}
      <Text style={styles.cta}>Continue setup →</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(242, 140, 28, 0.12)',
    borderWidth: 1,
    borderColor: COLORS.MANGO_TWO,
  },
  title: {
    fontFamily: 'Nunito',
    fontWeight: '700',
    fontSize: 15,
    color: '#222',
    marginBottom: 4,
  },
  body: {
    fontFamily: 'Nunito',
    fontSize: 13,
    color: '#444',
    lineHeight: 18,
  },
  meta: {
    fontFamily: 'Nunito',
    fontSize: 12,
    color: '#666',
    marginTop: 6,
  },
  cta: {
    fontFamily: 'Nunito',
    fontWeight: '700',
    fontSize: 13,
    color: COLORS.MANGO_TWO,
    marginTop: 8,
  },
});
