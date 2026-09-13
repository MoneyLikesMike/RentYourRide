import React, { useCallback, useEffect, useState } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { Svg, Path } from 'react-native-svg';
import { FontAwesome } from '@expo/vector-icons';
import PhoneVerificationSuccessScreen from './PhoneVerificationSuccessScreen';
import {
  finishPhoneVerification,
  startPhoneVerification,
} from '../services/phoneVerificationApi';
import { alertDevVerificationCode } from '../utils/phoneVerificationDev';

const CELL_COUNT = 6;
const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = uiScale;

export default function PhoneVerificationScreen({
  navigation,
  route,
  phoneNumber = '',
  phoneE164 = '',
  onPhoneVerified,
}) {
  const [value, setValue] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const ref = useBlurOnFulfill({ value, cellCount: CELL_COUNT });
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value,
    setValue,
  });

  const displayPhone = phoneNumber || route?.params?.phoneNumber || '';
  const verifyTarget = phoneE164 || route?.params?.phoneE164 || displayPhone;

  useEffect(() => {
    const timer = setTimeout(() => ref.current?.focus?.(), 250);
    return () => clearTimeout(timer);
  }, [ref]);

  const submitCode = useCallback(
    async (enteredCode) => {
      if (enteredCode.length !== CELL_COUNT || verifying) return;
      setVerifying(true);
      try {
        const result = await finishPhoneVerification(enteredCode);
        setShowSuccess(true);
        if (onPhoneVerified) onPhoneVerified(result?.user || result);
      } catch (err) {
        Alert.alert('Verification failed', err?.message || 'Incorrect or expired code.');
        setValue('');
        ref.current?.focus?.();
      } finally {
        setVerifying(false);
      }
    },
    [onPhoneVerified, ref, verifying],
  );

  useEffect(() => {
    if (value.length === CELL_COUNT) {
      submitCode(value);
    }
  }, [submitCode, value]);

  const handleResend = async () => {
    if (!verifyTarget || resending) return;
    setResending(true);
    try {
      const result = await startPhoneVerification(verifyTarget);
      if (result?.devCode) {
        alertDevVerificationCode(result, displayPhone || verifyTarget);
      } else {
        Alert.alert(
          'Code sent',
          `A new verification code was sent to ${displayPhone || verifyTarget}.`,
        );
      }
      setValue('');
      ref.current?.focus?.();
    } catch (err) {
      Alert.alert('Could not resend', err?.message || 'Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
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
        </View>

        <View style={styles.iconStack}>
          <View style={styles.iconOuterCircle} />
          <View style={styles.iconInnerCircle} />
          <Image
            source={require('../assets/icons/phone verification icon.png')}
            style={styles.iconPhone}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.codePrompt}>Enter 6-digit code</Text>
        <Text style={styles.subtext}>
          We sent a code to {displayPhone || verifyTarget}. Enter the code in that message
        </Text>

        <CodeField
          {...props}
          ref={ref}
          value={value}
          onChangeText={setValue}
          cellCount={CELL_COUNT}
          rootStyle={styles.codeFieldRoot}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
          editable={!verifying}
          renderCell={({ index, symbol, isFocused }) => (
            <View key={index} style={styles.underlineBox} onLayout={getCellOnLayoutHandler(index)}>
              <Text style={styles.underlineInput}>
                {symbol || (isFocused ? <Cursor /> : null)}
              </Text>
              <View
                style={[
                  styles.underline,
                  {
                    backgroundColor:
                      symbol || isFocused ? COLORS.GREENY_BLUE_TWO : 'rgb(220,220,220)',
                  },
                ]}
              />
            </View>
          )}
        />

        {verifying ? (
          <ActivityIndicator color={COLORS.GREENY_BLUE_TWO} style={{ marginBottom: 16 }} />
        ) : null}

        <View style={styles.resendContainer}>
          <Text style={styles.resendGray}>Didn’t get it?</Text>
          <TouchableOpacity onPress={handleResend} disabled={resending}>
            <Text style={styles.resendGreen}>
              {resending ? 'Sending…' : 'Send code again'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.callMeSpacer} />
        <TouchableOpacity style={styles.callContainer} disabled>
          <FontAwesome name="phone" size={21 * scale} color={COLORS.GREENY_BLUE_TWO} style={styles.callIcon} />
          <Text style={styles.callText}>Call me instead</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {showSuccess && (
        <View style={styles.successOverlay}>
          <PhoneVerificationSuccessScreen
            onOk={() => {
              setShowSuccess(false);
              navigation.goBack();
            }}
          />
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
  codeFieldRoot: {
    marginBottom: 32 * scale,
    justifyContent: 'center',
  },
  underlineBox: {
    alignItems: 'center',
    marginHorizontal: 5 * scale,
  },
  underlineInput: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 24 * scale,
    color: COLORS.BLACK,
    width: 28 * scale,
    height: 40 * scale,
    textAlign: 'center',
    marginBottom: 2 * scale,
  },
  underline: {
    width: 28 * scale,
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
    opacity: 0.45,
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
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'flex-end',
  },
});
