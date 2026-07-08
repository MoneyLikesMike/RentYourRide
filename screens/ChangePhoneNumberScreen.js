import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CountryPicker, { getCallingCode } from 'react-native-country-picker-modal';
import { TextInputMask } from 'react-native-masked-text';
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

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;

const DROPDOWN_ICON =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAi0lEQVRYR+3WuQ6AIBRE0eHL1T83FBqU5S1szdiY2NyTKcCAzU/Y3AcBXIALcIF0gRPAsehgugDEXnYQrUC88RIgfpuJ+MRrgFmILN4CjEYU4xJgFKIa1wB6Ec24FuBFiHELwIpQxa0ALUId9wAkhCnuBdQQ5ngP4I9wxXsBDyJ9m+8y/g9wAS7ABW4giBshQZji3AAAAABJRU5ErkJggg==';

export default function ChangePhoneNumberScreen({ navigation, onSave }) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
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

  const scrollPhoneFieldIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 140, animated: true });
    });
  }, []);

  const handleSave = async () => {
    const valid = isValidNationalPhone(phoneNumber, countryCode);
    setIsValid(valid);
    if (!valid) return;

    const e164 = toE164(phoneNumber, countryCode, callingCode);
    setSubmitting(true);
    try {
      const result = await startPhoneVerification(e164);
      const display = formatPhoneForDisplay(e164, countryCode);
      alertDevVerificationCode(result, display);
      if (onSave) onSave(e164, display);
      else navigation.goBack();
    } catch (err) {
      Alert.alert('Could not send code', err?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const useNaPhoneMask = countryCode === 'CA' || countryCode === 'US';

  return (
    <KeyboardAvoidingView
      style={styles.modal}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
        keyboardShouldPersistTaps="never"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <TouchableOpacity style={styles.exitButton} onPress={() => navigation.goBack()}>
          <View style={styles.exitXContainer}>
            <View style={styles.exitXLine} />
            <View style={[styles.exitXLine, styles.exitXLineReverse]} />
          </View>
        </TouchableOpacity>

        <Text style={styles.header}>Change phone number</Text>
        <Text style={styles.paragraph}>
          We will send a code to your new phone number to verify it
        </Text>

        <Text style={styles.label}>Phone number</Text>
        <View style={styles.phoneRow}>
          <TouchableOpacity
            style={styles.countryBox}
            onPress={() => setPickerVisible(true)}
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
            <Image source={{ uri: DROPDOWN_ICON }} style={styles.dropdownIcon} resizeMode="contain" />
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
                onFocus={scrollPhoneFieldIntoView}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                returnKeyType="done"
                placeholder="(613) 555-0137"
                placeholderTextColor="rgb(191,191,191)"
              />
            ) : (
              <TextInput
                style={styles.phoneInput}
                value={phoneNumber}
                onChangeText={handlePhoneChange}
                onFocus={scrollPhoneFieldIntoView}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                returnKeyType="done"
                placeholder={placeholderForCountry(countryCode)}
                placeholderTextColor="rgb(191,191,191)"
                maxLength={20}
              />
            )}
          </View>
        </View>

        {!isValid && (
          <Text style={styles.errorText}>Please enter a valid phone number</Text>
        )}

        <TouchableOpacity
          style={[styles.doneButton, submitting && styles.doneButtonDisabled]}
          onPress={handleSave}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.doneButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <CountryPicker
        countryCode={countryCode}
        visible={pickerVisible}
        withFilter
        withFlag
        withCallingCode
        withEmoji
        renderFlagButton={() => null}
        onSelect={handleCountrySelect}
        onClose={() => setPickerVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.92,
    width: '100%',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  exitButton: {
    width: 21,
    height: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  exitXContainer: {
    width: 21,
    height: 21,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  exitXLine: {
    position: 'absolute',
    width: 21,
    height: 3,
    backgroundColor: COLORS.MANGO_TWO,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  exitXLineReverse: {
    transform: [{ rotate: '-45deg' }],
  },
  header: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 22,
    color: 'rgb(14,38,43)',
    textAlign: 'left',
    marginBottom: 8,
  },
  paragraph: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: 'rgb(142,142,142)',
    letterSpacing: 0.2,
    marginBottom: 24,
    textAlign: 'left',
  },
  label: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: COLORS.BLACK,
    letterSpacing: 0.2,
    opacity: 0.7,
    marginBottom: 11,
    textTransform: 'uppercase',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  doneButton: {
    width: 250,
    height: 50,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 24,
  },
  doneButtonDisabled: {
    opacity: 0.7,
  },
  doneButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16,
    color: 'rgb(247,247,247)',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12,
    color: 'rgb(233,128,128)',
    letterSpacing: 0.2,
    marginBottom: 4,
    marginLeft: 2,
    textAlign: 'left',
  },
});
