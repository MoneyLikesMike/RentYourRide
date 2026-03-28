import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import Svg, { Path } from 'react-native-svg';

const BASE_WIDTH = 375;
const scale = 1;

export default function PayoutEmptyStateScreen() {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      {/* Top Row: Back and List a ride */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke={COLORS.MANGO_TWO} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <View style={styles.headerRightSpacer} />
        <TouchableOpacity style={styles.listBtn} onPress={() => navigation.navigate('ListRideScreen')}>
          <View style={styles.iconPlusRow}>
            <Image source={require('../assets/icons/skeletoncar.png')} style={styles.skeletonCarIcon} />
            <View style={styles.plusWrapper}>
              <View style={styles.plusVertical} />
              <View style={styles.plusHorizontal} />
            </View>
          </View>
        </TouchableOpacity>
      </View>
      {/* Empty State Content */}
      <View style={styles.emptyStateContainer}>
        <Image source={require('../assets/icons/carwithxicon.png')} style={styles.emptyIcon} />
        <View style={styles.headerHighlightRow}>
          <View style={styles.headerHighlight} />
          <Text style={styles.emptyHeader}>
            <Text style={styles.headerLets}>Let’s</Text> get you paid
          </Text>
        </View>
        <Text style={styles.emptyParagraph}>We need you to list a vehicle first before we can send you your earnings</Text>
      </View>
      {/* Bottom Back Button */}
      <View style={styles.bottomBackBtnRow}>
        <TouchableOpacity style={styles.bottomBackBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.bottomBackBtnText}>BACK</Text>
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
  listBtn: {
    width: 78,
    height: 42,
    backgroundColor: '#fff',
    borderRadius: 21.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginLeft: 'auto',
    marginRight: 0,
  },
  listBtnText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: '#fff',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  iconPlusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  skeletonCarIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    marginRight: 8,
  },
  plusWrapper: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  plusVertical: {
    position: 'absolute',
    width: 2,
    height: 14,
    backgroundColor: COLORS.MANGO_TWO,
    borderRadius: 1,
    left: 6,
    top: 0,
  },
  plusHorizontal: {
    position: 'absolute',
    width: 14,
    height: 2,
    backgroundColor: COLORS.MANGO_TWO,
    borderRadius: 1,
    left: 0,
    top: 6,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
    marginTop: 40,
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
    left: 45,
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
  headerLets: {
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
  bottomBackBtnRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 50,
  },
  bottomBackBtn: {
    width: 239,
    height: 50,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBackBtnText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: 'rgb(247,247,247)',
    letterSpacing: 0.2,
    width: 45,
    height: 22,
    textAlign: 'center',
  },
  emptyIcon: {
    width: 176 * scale,
    height: 174 * scale,
    resizeMode: 'contain',
    marginBottom: 32 * scale,
  },
}); 