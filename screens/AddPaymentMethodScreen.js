import React from 'react';
import { uiScale } from '../utils/uiScale';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = uiScale;

export default function AddPaymentMethodScreen({ navigation, route }) {
  const returnAfterPayment = route.params?.returnAfterPayment === true;
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Svg width={23} height={23} viewBox="0 0 48 48" fill="none">
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
          <Text style={styles.headerText}>ADD PAYMENT METHOD</Text>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      <TouchableOpacity
        style={styles.optionRow}
        onPress={() => navigation.navigate('AddCardScreen', { returnAfterPayment })}
        activeOpacity={0.7}
      >
        <Text style={styles.optionTitle}>Debit or credit card</Text>
        <Text style={styles.optionChevron}>›</Text>
      </TouchableOpacity>
      <View style={styles.rowDivider} />

      <TouchableOpacity
        style={styles.optionRow}
        onPress={() => navigation.navigate('AddPayPalScreen', { returnAfterPayment })}
        activeOpacity={0.7}
      >
        <Text style={styles.optionTitle}>PayPal</Text>
        <Text style={styles.optionChevron}>›</Text>
      </TouchableOpacity>
      <View style={styles.rowDivider} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    width: SCREEN_WIDTH,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 22 * scale,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32 * scale,
  },
  backButton: {
    marginRight: 16,
  },
  headerTextFlexWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRightSpacer: {
    width: 39,
  },
  headerText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18 * scale,
    paddingHorizontal: 4 * scale,
  },
  optionTitle: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16,
    color: '#000',
    letterSpacing: 0.2,
  },
  optionChevron: {
    fontSize: 22,
    color: COLORS.GREENY_BLUE_TWO,
    fontWeight: '300',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E0E0E0',
    marginLeft: 4 * scale,
  },
});
