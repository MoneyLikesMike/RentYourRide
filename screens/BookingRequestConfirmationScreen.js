import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375;

export default function BookingRequestConfirmationScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { listing = {} } = route.params || {};

  const hostName = listing.hostName || 'Host';
  const vehicleName = listing.title || 'vehicle';
  const isInstantBooking = listing.instantBooking === true;

  // Title matches design: Nunito-SemiBold 22, rgb(14,38,43), 288×60, center (typographic apostrophe)
  const title = 'You\u2019re booking request has been sent';
  const subtitleInstant = `Wohoo! You've instantly booked *${hostName}* *${vehicleName}*`;
  const subtitleNonInstant =
    'You\u2019re almost there! The host has 8 hours to respond to your request. If they don\u2019t respond within 8 hours your request will be canceled. Rent Your Ride processes refunds immediately. It may take the bank up to 10 days to update your account.';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Svg width={24} height={24} viewBox="0 0 48 48" fill="none">
          <Path d="M31 8L17 24L31 40" stroke={COLORS.YELLOWISH_ORANGE} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </TouchableOpacity>

      <View style={styles.centerWrap}>
        <Image source={require('../assets/icons/everydayRidesIcon.png')} style={styles.successIcon} resizeMode="contain" />

        <View style={styles.titleWrap}>
          <View style={styles.titleHighlight} />
          <Text style={styles.title}>
            {title}
          </Text>
        </View>
        {isInstantBooking ? (
          <Text style={[styles.subtitleText, styles.subtitleInstantSizing]}>{subtitleInstant}</Text>
        ) : (
          <View style={styles.subtitleFrame}>
            <Text style={styles.subtitleText}>{subtitleNonInstant}</Text>
          </View>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: 14 + insets.bottom }]}>
        <TouchableOpacity
          style={styles.messageBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ChatScreen')}
        >
          <Text style={styles.messageBtnText}>MESSAGE *{hostName.toUpperCase()}*</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backBtn: {
    paddingHorizontal: 20 * scale,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    marginTop: -40,
  },
  successIcon: {
    width: 130,
    height: 130,
    marginBottom: 18,
  },
  titleWrap: {
    width: 288,
    height: 60,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  titleHighlight: {
    position: 'absolute',
    width: 42,
    height: 13,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 177, 49, 0.3)',
    left: -3,
    top: 16,
    zIndex: 0,
  },
  title: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 22,
    color: 'rgb(14, 38, 43)',
    textAlign: 'center',
    width: 288,
    height: 60,
    lineHeight: 30,
    zIndex: 1,
    includeFontPadding: false,
  },
  /** Body: Nunito-SemiBold 15, gray 171/255, kerning -0.2, 319×137 centered */
  subtitleFrame: {
    width: 319,
    height: 137,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  subtitleText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: 'rgb(171, 171, 171)',
    textAlign: 'center',
    letterSpacing: -0.2,
    width: 319,
    lineHeight: 22,
    includeFontPadding: false,
  },
  subtitleInstantSizing: {
    maxWidth: 319,
    width: 319,
  },
  footer: {
    paddingHorizontal: 20 * scale,
    paddingTop: 12,
  },
  messageBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
  messageBtnText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 17,
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.3,
    width: 222,
    height: 23,
    lineHeight: 23,
  },
});
