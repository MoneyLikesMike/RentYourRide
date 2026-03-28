import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { Svg, Path } from 'react-native-svg';
import { FontAwesome } from '@expo/vector-icons';
import PhoneVerificationSuccessScreen from './PhoneVerificationSuccessScreen';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;

export default function PhoneVerificationScreen({ navigation, phoneNumber = '(222) 999-8875', onVerify, onPhoneVerified }) {
  const [code, setCode] = useState('');
  const inputRef = useRef(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleCodeChange = (text) => {
    // Only allow 4 digits
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
    setCode(cleaned);
    if (cleaned.length === 4) {
      if (cleaned === '1234') {
        setShowSuccess(true);
      }
      if (onVerify) {
        onVerify(cleaned);
      }
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* HEADER ROW */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
              <Path d="M31 8L17 24L31 40" stroke={COLORS.MANGO_TWO} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
          <Text style={styles.headerText}>PHONE VERIFICATION</Text>
        </View>
        {/* ICON DOUBLE CIRCLE */}
        <View style={styles.iconStack}>
          <View style={styles.iconOuterCircle} />
          <View style={styles.iconInnerCircle} />
          <Image
            source={require('../assets/icons/phone verification icon.png')}
            style={styles.iconPhone}
            resizeMode="contain"
          />
        </View>
        {/* MAIN TEXT */}
        <Text style={styles.codePrompt}>Enter 4-digit code</Text>
        <Text style={styles.subtext}>We sent a code to {phoneNumber}. Enter the code in that message</Text>
        {/* CODE INPUT UNDERLINES */}
        <View style={styles.codeInputRow}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.underlineBox}>
              <TextInput
                ref={i === 0 ? inputRef : undefined}
                style={styles.underlineInput}
                value={code[i] ? code[i] : ''}
                onChangeText={(text) => {
                  let newCode = code.split('');
                  newCode[i] = text.replace(/[^0-9]/g, '').slice(0, 1);
                  const joined = newCode.join('').slice(0, 4);
                  setCode(joined);
                  if (joined.length === 4) {
                    if (joined === '1234') {
                      setShowSuccess(true);
                    }
                    if (onVerify) onVerify(joined);
                  }
                }}
                keyboardType="number-pad"
                maxLength={1}
                autoFocus={i === 0}
                textAlign="center"
                placeholder=""
                placeholderTextColor={COLORS.GRAY_PLACEHOLDER}
              />
              <View
                style={[
                  styles.underline,
                  { backgroundColor: code[i] ? COLORS.GREENY_BLUE_TWO : 'rgb(220,220,220)' }
                ]}
              />
            </View>
          ))}
        </View>
        {/* RESEND */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendGray}>Didn’t get it?</Text>
          <TouchableOpacity>
            <Text style={styles.resendGreen}>Send code again</Text>
          </TouchableOpacity>
        </View>
        {/* CALL ME INSTEAD */}
        <View style={styles.callMeSpacer} />
        <TouchableOpacity style={styles.callContainer}>
          <FontAwesome name="phone" size={21 * scale} color={COLORS.GREENY_BLUE_TWO} style={styles.callIcon} />
          <Text style={styles.callText}>Call me instead</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
      {showSuccess && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 100,
          backgroundColor: 'rgba(0,0,0,0.18)',
          justifyContent: 'flex-end',
        }}>
          <PhoneVerificationSuccessScreen onOk={() => {
            setShowSuccess(false);
            if (onPhoneVerified) onPhoneVerified();
            navigation.goBack();
          }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 60 * scale,
  },
  headerRow: {
    position: 'relative',
    height: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  backButton: {
    position: 'absolute',
    left: -6,
    top: 0,
    height: 43,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.2,
    textAlign: 'center',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  iconStack: {
    width: 181,
    height: 180,
    alignSelf: 'center',
    marginBottom: 32 * scale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconOuterCircle: {
    position: 'absolute',
    width: 181,
    height: 180,
    borderRadius: 90.5,
    backgroundColor: '#F8FBFB',
    top: 0,
    left: 0,
  },
  iconInnerCircle: {
    position: 'absolute',
    width: 135,
    height: 134,
    borderRadius: 67.5,
    backgroundColor: '#DFF2F1',
    top: 23,
    left: 23,
  },
  iconPhone: {
    width: 181,
    height: 180,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  codePrompt: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 22 * scale,
    color: 'rgb(14,38,43)',
    textAlign: 'center',
    marginBottom: 8 * scale,
  },
  subtext: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: 'rgb(142,142,142)',
    textAlign: 'center',
    letterSpacing: 0.2,
    width: 283,
    minHeight: 40,
    flexWrap: 'wrap',
    alignSelf: 'center',
    marginBottom: 32 * scale,
  },
  codeInputRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32 * scale,
  },
  underlineBox: {
    alignItems: 'center',
    marginHorizontal: 8 * scale,
  },
  underlineInput: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 24 * scale,
    color: COLORS.BLACK,
    width: 32 * scale,
    height: 40 * scale,
    textAlign: 'center',
    marginBottom: 2 * scale,
  },
  underline: {
    width: 32 * scale,
    height: 2 * scale,
    backgroundColor: 'rgb(220,220,220)',
    borderRadius: 1 * scale,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 0,
  },
  resendGray: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: 'rgb(142,142,142)',
    letterSpacing: 0.2,
    textAlign: 'center',
    marginBottom: 2 * scale,
  },
  resendGreen: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  callMeSpacer: {
    flex: 1,
  },
  callContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 68 * scale,
  },
  callIcon: {
    marginRight: 8 * scale,
  },
  callText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
}); 