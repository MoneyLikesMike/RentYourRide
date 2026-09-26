import React from 'react';
import { uiScale } from '../utils/uiScale';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { PlatformPayButton, PlatformPay } from '@stripe/stripe-react-native';

const scale = uiScale;
const BUTTON_HEIGHT = 52 * scale;
const BUTTON_RADIUS = 12 * scale;

/**
 * Official Apple Pay button for checkout — follows Apple HIG sizing and styling.
 */
export default function ApplePayCheckoutButton({ onPress, loading = false, disabled = false }) {
  if (loading) {
    return (
      <View style={[styles.buttonShell, styles.loadingShell]}>
        <ActivityIndicator color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.buttonShell}>
      <PlatformPayButton
        onPress={onPress}
        type={PlatformPay.ButtonType.Book}
        appearance={PlatformPay.ButtonStyle.Black}
        borderRadius={BUTTON_RADIUS}
        disabled={disabled}
        style={styles.nativeButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  buttonShell: {
    width: '100%',
    height: BUTTON_HEIGHT,
    borderRadius: BUTTON_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  loadingShell: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  nativeButton: {
    width: '100%',
    height: BUTTON_HEIGHT,
  },
});
