import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import PhoneInput from 'react-native-phone-number-input';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;

export default function ChangePhoneNumberScreen({ navigation, onSave }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formattedValue, setFormattedValue] = useState('');
  const [isValid, setIsValid] = useState(true);
  const phoneInput = useRef(null);

  const handleSave = () => {
    const valid = phoneInput.current?.isValidNumber(phoneNumber);
    setIsValid(valid);
    if (valid) {
      if (onSave) onSave(formattedValue);
      else navigation.goBack();
    }
  };

  return (
    <View style={styles.overlay}>
      <KeyboardAvoidingView
        style={styles.modal}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Exit Button */}
        <TouchableOpacity style={styles.exitButton} onPress={() => navigation.goBack()}>
          <View style={styles.exitXContainer}>
            <View style={styles.exitXLine} />
            <View style={[styles.exitXLine, styles.exitXLineReverse]} />
          </View>
        </TouchableOpacity>
        {/* Header */}
        <Text style={styles.header}>Change phone number</Text>
        {/* Paragraph */}
        <Text style={styles.paragraph}>
          We will send a code to your new phone number to verify it
        </Text>
        {/* Phone Number Label */}
        <Text style={styles.label}>Phone number</Text>
        <View style={styles.phoneRow}>
          {/* Dropdown/Flag Container */}
          <View style={styles.dropdownContainer}>
            <PhoneInput
              ref={phoneInput}
              defaultValue={phoneNumber}
              defaultCode="CA"
              layout="first"
              onChangeCountry={() => {}}
              onChangeText={setPhoneNumber}
              onChangeFormattedText={setFormattedValue}
              containerStyle={styles.flagOnlyContainer}
              textContainerStyle={styles.flagOnlyTextContainer}
              codeTextStyle={styles.flagCodeText}
              flagButtonStyle={styles.flagButton}
              textInputProps={{ editable: false }}
              disableArrowIcon={false}
              withDarkTheme={false}
              withShadow={false}
              autoFocus={false}
              placeholder="+1 613 555 0137"
            />
          </View>
          {/* Phone Number Input Container */}
          <View style={styles.phoneInputContainer}>
            <PhoneInput
              ref={phoneInput}
              defaultValue={phoneNumber}
              defaultCode="US"
              layout="second"
              onChangeText={setPhoneNumber}
              onChangeFormattedText={setFormattedValue}
              containerStyle={styles.phoneInputInnerContainer}
              textContainerStyle={styles.phoneInputTextContainer}
              codeTextStyle={{ display: 'none' }}
              flagButtonStyle={{ display: 'none' }}
              withDarkTheme={false}
              withShadow={false}
              autoFocus={false}
              placeholder="Phone number"
              textInputProps={{
                keyboardType: 'phone-pad',
                placeholderTextColor: 'rgb(191,191,191)',
                style: styles.phoneInputText,
              }}
            />
          </View>
        </View>
        {!isValid && (
          <Text style={styles.errorText}>Please enter a valid phone number</Text>
        )}
        {/* Save Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity style={styles.doneButton} onPress={handleSave}>
            <Text style={styles.doneButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    minHeight: 320,
    width: '100%',
    height: SCREEN_HEIGHT * 0.6,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    marginTop: 0,
  },
  exitButton: {
    position: 'absolute',
    top: 24,
    left: 35,
    width: 21,
    height: 21,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
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
    marginTop: 48,
    marginBottom: 8,
    width: 305,
    height: 32,
  },
  paragraph: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: 'rgb(142,142,142)',
    letterSpacing: 0.2,
    marginBottom: 24,
    width: 324,
    height: 46,
    textAlign: 'left',
  },
  label: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: COLORS.BLACK,
    letterSpacing: 0.2,
    opacity: 0.7,
    marginBottom: 11,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dropdownContainer: {
    width: 67 * scale,
    height: 49 * scale,
    backgroundColor: 'rgba(228,228,228,0.3441917782738095)',
    borderRadius: 5 * scale,
    borderWidth: 1,
    borderColor: 'rgb(163,163,163)',
    marginRight: 8 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.95,
    overflow: 'hidden',
  },
  flagOnlyContainer: {
    width: 67 * scale,
    height: 49 * scale,
    backgroundColor: 'rgba(228,228,228,0.3441917782738095)',
    borderRadius: 5 * scale,
    borderWidth: 1,
    borderColor: 'rgb(163,163,163)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.95,
    overflow: 'hidden',
  },
  flagOnlyTextContainer: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    paddingLeft: 0,
    paddingRight: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagCodeText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: COLORS.BLACK,
    marginLeft: 0,
    marginRight: 0,
  },
  flagButton: {
    marginLeft: 0,
    marginRight: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneInputContainer: {
    width: 331 * scale - 67 * scale - 8 * scale,
    height: 49 * scale,
    backgroundColor: 'rgba(249,249,249,0.3441917782738095)',
    borderRadius: 5 * scale,
    borderWidth: 1,
    borderColor: 'rgb(163,163,163)',
    justifyContent: 'center',
    opacity: 0.95,
    overflow: 'hidden',
  },
  phoneInputInnerContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  phoneInputTextContainer: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    paddingLeft: 0,
    paddingRight: 0,
  },
  phoneInputText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: COLORS.BLACK,
    height: 49 * scale,
    paddingHorizontal: 12 * scale,
    opacity: 0.7,
  },
  bottomContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 56,
    alignItems: 'center',
  },
  doneButton: {
    width: 250,
    height: 50,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16,
    color: 'rgb(247,247,247)',
    letterSpacing: 0.2,
    textAlign: 'center',
    width: 170,
    height: 22,
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