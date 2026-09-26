import React, { useState } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { resetPassword } from '../services/authApi';
import PasswordChangeSuccessScreen from './PasswordChangeSuccessScreen';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = uiScale;

export default function ResetPasswordScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const token = String(route.params?.token || '').trim();

  const [newPassword, setNewPassword] = useState('');
  const [reenterPassword, setReenterPassword] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [reenterPasswordError, setReenterPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showReenterPassword, setShowReenterPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleSave = async () => {
    let valid = true;
    setFormError('');
    if (!token) {
      setFormError('Open the reset link from your email to continue.');
      return;
    }
    if (newPassword.length < 8) {
      setNewPasswordError('New password must be at least 8 characters');
      valid = false;
    } else {
      setNewPasswordError('');
    }
    if (reenterPassword !== newPassword) {
      setReenterPasswordError('Passwords do not match');
      valid = false;
    } else {
      setReenterPasswordError('');
    }
    if (!valid) return;

    setBusy(true);
    try {
      await resetPassword(token, newPassword);
      setDone(true);
    } catch (e) {
      setFormError(e?.message || 'Invalid or expired reset link.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <PasswordChangeSuccessScreen
        navigation={{
          goBack: () => navigation.navigate('AuthScreen', { tab: 'login' }),
        }}
      />
    );
  }

  return (
    <View style={styles.overlay}>
      <KeyboardAvoidingView
        style={styles.modal}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.exitButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Close"
        >
          <View style={styles.exitXContainer}>
            <View style={styles.exitXLine} />
            <View style={[styles.exitXLine, styles.exitXLineReverse]} />
          </View>
        </TouchableOpacity>

        <Text style={styles.header}>Set up password</Text>

        {!token ? (
          <Text style={styles.errorText}>
            Open the reset link from your email to continue.
          </Text>
        ) : null}

        <Text style={styles.label}>New password</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New password"
            placeholderTextColor={'rgb(191,191,191)'}
            autoCapitalize="none"
            secureTextEntry={!showNewPassword}
          />
          {newPassword.length > 0 ? (
            <TouchableOpacity
              style={styles.showHideBtn}
              onPress={() => setShowNewPassword(!showNewPassword)}
            >
              <Text style={styles.showHideText}>
                {showNewPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {newPasswordError ? (
          <Text style={styles.errorText}>{newPasswordError}</Text>
        ) : null}

        <Text style={styles.label}>Re-enter password</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={reenterPassword}
            onChangeText={setReenterPassword}
            placeholder="Re-enter password"
            placeholderTextColor={'rgb(191,191,191)'}
            autoCapitalize="none"
            secureTextEntry={!showReenterPassword}
          />
          {reenterPassword.length > 0 ? (
            <TouchableOpacity
              style={styles.showHideBtn}
              onPress={() => setShowReenterPassword(!showReenterPassword)}
            >
              <Text style={styles.showHideText}>
                {showReenterPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {reenterPasswordError ? (
          <Text style={styles.errorText}>{reenterPasswordError}</Text>
        ) : null}
        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={handleSave}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.doneButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#fff',
  },
  modal: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    flex: 1,
    width: '100%',
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
    marginBottom: 24,
    width: 305,
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
  inputContainer: {
    width: 273 * scale,
    height: 49 * scale,
    backgroundColor: 'rgba(249,249,249,0.3441917782738095)',
    borderRadius: 5 * scale,
    borderWidth: 1,
    borderColor: 'rgb(163,163,163)',
    marginBottom: 24,
    justifyContent: 'center',
    opacity: 0.95,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: COLORS.BLACK,
    height: 49 * scale,
    paddingHorizontal: 12 * scale,
    opacity: 0.7,
    flex: 1,
  },
  showHideBtn: {
    padding: 4 * scale,
    position: 'absolute',
    right: 8 * scale,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  showHideText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: COLORS.GREENY_BLUE_TWO,
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
    marginBottom: 8,
    marginLeft: 2,
    textAlign: 'left',
  },
});
