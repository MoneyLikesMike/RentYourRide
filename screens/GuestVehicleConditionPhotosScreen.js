import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import PictureDocumentationPlaceholderGrid from '../components/PictureDocumentationPlaceholderGrid';
import { FLOW_GUEST_CHECK_IN, FLOW_GUEST_CHECKOUT } from '../screens/PhotoShootScreen';

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375;

const INSTRUCTION_COPY =
  'Document the vehicles condition. We require a picture of all four sides of the vehicle , all four wheels, the odometer, fuel gauge, the interior and proof of identification. If there is any damage take photos and document them in the damage notes.';

export default function GuestVehicleConditionPhotosScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const bookingId = route.params?.bookingId;
  const checkoutFlow = route.params?.checkoutFlow === true;

  const onContinue = useCallback(() => {
    navigation.navigate('PhotoShootScreen', {
      flow: checkoutFlow ? FLOW_GUEST_CHECKOUT : FLOW_GUEST_CHECK_IN,
      bookingId,
    });
  }, [navigation, bookingId, checkoutFlow]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backBtnAbsolute}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path
              d="M31 8L17 24L31 40"
              stroke={COLORS.MANGO_TWO}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={2}>
          Show us the condition
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollInner, { paddingBottom: insets.bottom + 24 * scale }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="never"
      >
        <Text style={styles.instruction}>{INSTRUCTION_COPY}</Text>

        <PictureDocumentationPlaceholderGrid />

        <TouchableOpacity style={styles.continueBtn} activeOpacity={0.88} onPress={onContinue}>
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerRow: {
    width: '100%',
    minHeight: 44 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16 * scale,
    paddingHorizontal: 48 * scale,
    position: 'relative',
  },
  backBtnAbsolute: {
    position: 'absolute',
    left: 8 * scale,
    top: 10 * scale,
    zIndex: 2,
    paddingVertical: 8 * scale,
    paddingHorizontal: 10 * scale,
  },
  headerTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 17 * scale,
    lineHeight: Math.round(22 * scale),
    color: 'rgb(14, 38, 43)',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 20 * scale,
  },
  instruction: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    lineHeight: Math.round(20 * scale),
    color: 'rgb(120, 120, 120)',
    textAlign: 'left',
    alignSelf: 'stretch',
    marginBottom: 24 * scale,
  },
  continueBtn: {
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25 * scale,
    paddingVertical: 16 * scale,
    alignItems: 'center',
    marginTop: -72 * scale,
  },
  continueBtnText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16 * scale,
    color: '#fff',
  },
});
