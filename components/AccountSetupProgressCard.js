import React from 'react';
import { uiScale } from '../utils/uiScale';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = uiScale;
const TRACK_WIDTH = 270 * scale;

export default function AccountSetupProgressCard({ stepsLeft, progress, onPress }) {
  if (stepsLeft <= 0) return null;

  const fillWidth = Math.max(0, Math.min(1, progress)) * TRACK_WIDTH;
  const stepLabel = stepsLeft === 1 ? '1 STEP LEFT' : `${stepsLeft} STEPS LEFT`;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.stepCount}>{stepLabel}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: fillWidth }]} />
      </View>
      <Text style={styles.body}>
        We just need a couple details before you book a ride or list a ride. Verify your email,
        phone number and license. Let's get started now so you don't have to do it later.
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 344 * scale,
    backgroundColor: '#fff',
    borderRadius: 10 * scale,
    paddingVertical: 23 * scale,
    paddingHorizontal: 33 * scale,
    marginBottom: 32 * scale,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  stepCount: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: 'rgb(180,180,180)',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  track: {
    width: TRACK_WIDTH,
    height: 7 * scale,
    borderRadius: 8 * scale,
    backgroundColor: 'rgb(245,245,245)',
    marginVertical: 14 * scale,
    overflow: 'hidden',
  },
  fill: {
    height: 7 * scale,
    borderRadius: 8 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
  },
  body: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: 'rgb(142,142,142)',
    lineHeight: 16 * scale,
  },
});
