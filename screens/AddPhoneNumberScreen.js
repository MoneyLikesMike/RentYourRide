import React, { useCallback, useEffect, useState } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CountryPicker, { getCallingCode } from 'react-native-country-picker-modal';
import { OTP_ALLOWED_COUNTRY_CODES } from '../utils/otpAllowedCountries';
import { TextInputMask } from 'react-native-masked-text';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import {
  formatNationalPhone,
  isValidNationalPhone,
  placeholderForCountry,
  toE164,
  formatPhoneForDisplay,
  countryCodeToEmoji,
} from '../utils/phoneFormat';
import { startPhoneVerification } from '../services/phoneVerificationApi';
import { alertDevVerificationCode } from '../utils/phoneVerificationDev';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = uiScale;

const DROPDOWN_ICON =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAi0lEQVRYR+3WuQ6AIBRE0eHL1T83FBqU5S1szdiY2NyTKcCAzU/Y3AcBXIALcIF0gRPAsehgugDEXnYQrUC88RIgfpuJ+MRrgFmILN4CjEYU4xJgFKIa1wB6Ec24FuBFiHELwIpQxa0ALUId9wAkhCnuBdQQ5ngP4I9wxXsBDyJ9m+8y/g9wAS7ABW4giBshQZji3AAAAABJRU5ErkJggg==';

/**
 * Initial phone verification — enter number (legacy ProfileVerificationFirst).
 * Header: PHONE VERIFICATION · icon asset · country + calling code · Next.
 */
export default function AddPhoneNumberScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [countryCode, setCountryCode] = useState('CA');
  const [callingCode, setCallingCode] = useState('1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCallingCode('CA').then((code) => setCallingCode(String(code)));
  }, []);

  const handleCountrySelect = useCallback(async (country) => {
    setCountryCode(country.cca2);
    const code = country.callingCode?.[0] || (await getCallingCode(country.cca2));
    setCallingCode(String(code));
    setPhoneNumber((prev) => formatNationalPhone(prev, country.cca2));
    setPickerVisible(false);
  }, []);

  const handlePhoneChange = useCallback(
    (text) => {
      setPhoneNumber(formatNationalPhone(text, countryCode));
      if (!isValid) setIsValid(true);
    },
    [countryCode, isValid],
  );

  const handleNext = async () => {
    const valid = isValidNationalPhone(phoneNumber, countryCode);
    setIsValid(valid);
    if (!valid) return;

    const e164 = toE164(phoneNumber, countryCode, callingCode);
    setSubmitting(true);
    try {
      const result = await startPhoneVerification(e164);
      const display = formatPhoneForDisplay(e164, countryCode);
      alertDevVerificationCode(result, display);
      navigation.replace('PhoneVerificationScreen', {
        phoneE164: e164,
        phoneNumber: display,
      });
    } catch (err) {
      Alert.alert('Could not send code', err?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const useNaPhoneMask = countryCode === 'CA' || countryCode === 'US';
  // Tab bar is hidden on this screen (CustomTabBar); pad for home indicator only.
  const bottomPad = Math.max(insets.bottom, 16) + 16 * scale;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              accessibilityLabel="Back"
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
            <Text style={styles.headerText}>PHONE VERIFICATION</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.body}>
            <Image
              source={require('../assets/icons/phone-verification-icon.png')}
              style={styles.icon}
              resizeMode="contain"
            />

            <Text style={styles.mainTitle}>Enter a phone number below</Text>

            <View style={styles.phoneRow}>
              <TouchableOpacity
                style={styles.countryBox}
                onPress={() => {
                  Keyboard.dismiss();
                  setPickerVisible(true);
                }}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Select country code"
              >
                <View style={styles.flagWrap}>
                  <Text style={styles.flagEmoji} allowFontScaling={false}>
                    {countryCodeToEmoji(countryCode)}
                  </Text>
                </View>
                <Text style={styles.countryCodeText}>+{callingCode}</Text>
                <Image
                  source={{ uri: DROPDOWN_ICON }}
                  style={styles.dropdownIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              <View style={styles.phoneInputBox}>
                {useNaPhoneMask ? (
                  <TextInputMask
                    type="cel-phone"
                    options={{
                      maskType: 'BRL',
                      withDDD: true,
                      dddMask: '(999) 999-9999',
                    }}
                    style={styles.phoneInput}
                    value={phoneNumber}
                    onChangeText={(text) => {
                      setPhoneNumber(text);
                      if (!isValid) setIsValid(true);
                    }}
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={() => Keyboard.dismiss()}
                    placeholder="(613) 555-0137"
                    placeholderTextColor="rgb(191,191,191)"
                  />
                ) : (
                  <TextInput
                    style={styles.phoneInput}
                    value={phoneNumber}
                    onChangeText={handlePhoneChange}
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={() => Keyboard.dismiss()}
                    placeholder={placeholderForCountry(countryCode) || 'Phone number'}
                    placeholderTextColor="rgb(191,191,191)"
                    maxLength={20}
                  />
                )}
              </View>
            </View>

            {!isValid ? (
              <Text style={styles.errorText}>Please enter a valid phone number</Text>
            ) : null}
          </View>

          {/* Collapses when the keyboard opens so Next sits under the field, not over it. */}
          <View style={styles.flexSpacer} />

          <TouchableOpacity
            style={[styles.nextButton, submitting && styles.nextButtonDisabled]}
            onPress={() => {
              Keyboard.dismiss();
              void handleNext();
            }}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.YELLOWISH_ORANGE} />
            ) : (
              <Text style={styles.nextButtonText}>Next</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <CountryPicker
        countryCode={countryCode}
        visible={pickerVisible}
        countryCodes={OTP_ALLOWED_COUNTRY_CODES}
        withFilter
        withFlag
        withCallingCode
        withEmoji
        withAlphaFilter
        renderFlagButton={() => null}
        onSelect={handleCountrySelect}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    width: SCREEN_WIDTH,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  flexSpacer: {
    flexGrow: 1,
    minHeight: 24 * scale,
  },
  headerRow: {
    height: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Platform.OS === 'ios' ? 56 : 40,
    marginBottom: 12,
    paddingHorizontal: 16 * scale,
  },
  backButton: {
    width: 40,
    height: 43,
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 2,
  },
  headerSpacer: { width: 40 },
  headerText: {
    flex: 1,
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  body: {
    alignItems: 'center',
    paddingTop: 28 * scale,
    paddingHorizontal: 24 * scale,
  },
  icon: {
    width: 180 * scale,
    height: 180 * scale,
    marginBottom: 24 * scale,
  },
  mainTitle: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 21 * scale,
    color: 'rgb(14,38,43)',
    textAlign: 'center',
    marginBottom: 22 * scale,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 327 * scale,
    alignSelf: 'center',
    marginBottom: 8,
  },
  countryBox: {
    minWidth: 112 * scale,
    height: 49 * scale,
    backgroundColor: 'rgba(228,228,228,0.3441917782738095)',
    borderRadius: 5 * scale,
    borderWidth: 1,
    borderColor: 'rgb(163,163,163)',
    marginRight: 8 * scale,
    paddingHorizontal: 8 * scale,
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.95,
    overflow: 'hidden',
  },
  flagWrap: {
    width: 24 * scale,
    height: 24 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6 * scale,
    overflow: 'hidden',
  },
  flagEmoji: {
    fontSize: 18 * scale,
    lineHeight: 20 * scale,
    textAlign: 'center',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  countryCodeText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: COLORS.BLACK,
    flexShrink: 0,
  },
  dropdownIcon: {
    width: 10 * scale,
    height: 10 * scale,
    marginLeft: 6 * scale,
  },
  phoneInputBox: {
    flex: 1,
    height: 49 * scale,
    backgroundColor: 'rgba(249,249,249,0.3441917782738095)',
    borderRadius: 5 * scale,
    borderWidth: 1,
    borderColor: 'rgb(163,163,163)',
    justifyContent: 'center',
    opacity: 0.95,
  },
  phoneInput: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: COLORS.BLACK,
    height: 49 * scale,
    paddingHorizontal: 12 * scale,
  },
  errorText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12,
    color: 'rgb(233,128,128)',
    marginTop: 4,
    width: '100%',
    maxWidth: 327 * scale,
    textAlign: 'left',
    marginLeft: 2,
  },
  nextButton: {
    width: 273 * scale,
    height: 50 * scale,
    borderRadius: 25 * scale,
    borderWidth: 2,
    borderColor: COLORS.YELLOWISH_ORANGE,
    backgroundColor: 'rgba(255,178,20,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 8 * scale,
  },
  nextButtonDisabled: {
    opacity: 0.7,
  },
  nextButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16 * scale,
    color: COLORS.YELLOWISH_ORANGE,
    letterSpacing: 0.2,
  },
});
