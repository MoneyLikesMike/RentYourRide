import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import Svg, { Path } from 'react-native-svg';

const BASE_WIDTH = 375;
const scale = 1;

export default function GetPaidLandingScreen() {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      {/* Top Row: Back button */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke={COLORS.MANGO_TWO} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <View style={styles.headerRightSpacer} />
      </View>
      {/* Empty State Content */}
      <View style={styles.emptyStateContainer}>
        <Image source={require('../assets/icons/FinishIcon.png')} style={styles.emptyIcon} />
        <View style={styles.headerHighlightRow}>
          <View style={styles.headerHighlight} />
          <Text style={styles.emptyHeader}>
            <Text style={styles.headerReady}>Ready</Text> to start earning?
          </Text>
        </View>
        <Text style={styles.emptyParagraph}>We want to pay you! Add your payout information so we can pay you directly!</Text>
      </View>
      {/* Bottom Add Payout Method Button */}
      <View style={styles.bottomBtnRow}>
        <TouchableOpacity style={styles.bottomBtn} onPress={() => navigation.navigate('GetPaidStep1Screen')}>
          <Text style={styles.bottomBtnText}>Add payout method</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 0 },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 73 * scale,
    paddingBottom: 12 * scale,
    backgroundColor: '#fff',
    zIndex: 2,
    paddingRight: 39,
  },
  backBtn: {
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    height: 23 * scale,
    width: 39 * scale,
    padding: 8 * scale,
    zIndex: 3,
  },
  headerRightSpacer: {
    flex: 1,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
    marginTop: 40,
  },
  emptyIcon: {
    width: 176 * scale,
    height: 174 * scale,
    resizeMode: 'contain',
    marginBottom: 32 * scale,
  },
  headerHighlightRow: {
    width: 300,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  headerHighlight: {
    position: 'absolute',
    left: 15,
    top: 15,
    width: 42,
    height: 13,
    backgroundColor: 'rgba(255,177,49,0.3)',
    borderRadius: 5,
    zIndex: 0,
  },
  emptyHeader: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 22,
    color: 'rgb(14,38,43)',
    textAlign: 'center',
    width: 300,
    height: 30,
    zIndex: 1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  headerReady: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 22,
    color: 'rgb(14,38,43)',
    fontWeight: 'bold',
    zIndex: 2,
  },
  emptyParagraph: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: 'rgb(171,171,171)',
    textAlign: 'center',
    letterSpacing: -0.2,
    width: 278,
    height: 72,
    marginBottom: 32,
  },
  bottomBtnRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 50,
  },
  bottomBtn: {
    width: 239,
    height: 50,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBtnText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: 'rgb(247,247,247)',
    letterSpacing: 0.2,
    width: 180,
    height: 22,
    textAlign: 'center',
  },
}); 