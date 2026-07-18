import React, { useState } from 'react';
import { uiScale } from '../utils/uiScale';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Dimensions, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = uiScale;

export default function ChangeEmailScreen({ navigation, route }) {
  const [email, setEmail] = useState('');

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.background} activeOpacity={1} onPress={() => navigation.goBack()} />
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
        <Text style={styles.header}>Change email address</Text>
        {/* Paragraph */}
        <Text style={styles.paragraph}>
          We will send a link to your new email address to verify it.
        </Text>
        {/* Email Label */}
        <Text style={styles.label}>Email</Text>
        {/* Email Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={route?.params?.currentEmail || 'Oldemail@gmail.com'}
            placeholderTextColor={'rgb(191,191,191)'}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        {/* Done Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => {
              Alert.alert(
                'Coming soon',
                'Email changes are not available on the dev API yet. Contact support if you need help.',
              );
            }}
          >
            <Text style={styles.doneButtonText}>Done</Text>
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
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    minHeight: 420,
    width: '100%',
    height: SCREEN_HEIGHT * 0.9,
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
    width: 34,
    height: 15,
    textTransform: 'uppercase',
  },
  inputContainer: {
    width: 273 * scale,
    height: 49 * scale,
    backgroundColor: 'rgba(249,249,249,0.3441917782738095)',
    borderRadius: 5 * scale,
    borderWidth: 1,
    borderColor: 'rgb(163,163,163)',
    marginBottom: 378,
    justifyContent: 'center',
    opacity: 0.95,
  },
  input: {
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
}); 