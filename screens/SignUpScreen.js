import React, { useState } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
  Switch,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/authApi';
import SocialAuthButtons from '../components/SocialAuthButtons';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = uiScale;

function ErrorRow({ message }) {
  return (
    <View style={styles.errorRow}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export default function SignUpScreen(props) {
  const navigation = useNavigation();
  const { signUp } = useAuth();
  // Remove local toggle state; always use navigation for tab switching
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updates, setUpdates] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSignUp = async () => {
    let valid = true;
    setSubmitError('');
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Please enter email address');
      valid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError('Invalid email address');
      valid = false;
    } else {
      setEmailError('');
    }
    if (!firstName) {
      setFirstNameError('Please enter first name');
      valid = false;
    } else {
      setFirstNameError('');
    }
    if (!lastName) {
      setLastNameError('Please enter last name');
      valid = false;
    } else {
      setLastNameError('');
    }
    // Password validation
    if (!password) {
      setPasswordError('Please enter a password');
      valid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      valid = false;
    } else {
      setPasswordError('');
    }
    if (!valid) return;
    setSubmitting(true);
    try {
      await signUp({ email, password, firstName, lastName });
      navigation.navigate('TermsAndConditionsScreen');
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err && typeof err.message === 'string'
            ? err.message
            : 'Could not create account. Try again.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Social Sign Up Icons */}
        <SocialAuthButtons isSignUp style={{ marginBottom: 120 * scale }} />

        {/* Or sign up using email */}
        <Text style={styles.orEmailText}>Or sign up using email</Text>

        {/* Email Field */}
        <View style={[styles.inputContainer, emailError ? styles.inputError : null]}>
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor={COLORS.GRAY_PLACEHOLDER}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        {emailError ? <ErrorRow message={emailError} /> : null}

        {/* First Name Field */}
        <View style={[styles.inputContainer, firstNameError ? styles.inputError : null]}>
          <TextInput
            style={styles.input}
            placeholder="First Name"
            placeholderTextColor={COLORS.GRAY_PLACEHOLDER}
            value={firstName}
            onChangeText={setFirstName}
          />
        </View>
        {firstNameError ? <ErrorRow message={firstNameError} /> : null}

        {/* Last Name Field */}
        <View style={[styles.inputContainer, lastNameError ? styles.inputError : null]}>
          <TextInput
            style={styles.input}
            placeholder="Last Name"
            placeholderTextColor={COLORS.GRAY_PLACEHOLDER}
            value={lastName}
            onChangeText={setLastName}
          />
        </View>
        {lastNameError ? <ErrorRow message={lastNameError} /> : null}

        {/* Password Field */}
        <View style={[styles.inputContainer, passwordError ? styles.inputError : null]}>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={COLORS.GRAY_PLACEHOLDER}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          {password.length > 0 && (
            <TouchableOpacity style={styles.showHideBtn} onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.showHideText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          )}
        </View>
        {passwordError ? <ErrorRow message={passwordError} /> : null}
        {submitError ? <ErrorRow message={submitError} /> : null}

        {/* Age Notice */}
        <Text style={styles.ageNotice}>You need to be at least 18 years old.</Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Updates Toggle */}
        <View style={styles.updatesRow}>
          <Text style={styles.updatesText}>Send me updates, news, and deals</Text>
          <Switch
            value={updates}
            onValueChange={setUpdates}
            trackColor={{ false: '#e0e0e0', true: COLORS.GREENY_BLUE_TWO }}
            thumbColor={updates ? '#fff' : '#fff'}
            style={styles.updatesSwitch}
          />
        </View>

        {/* Sign Up Button */}
        <TouchableOpacity
          style={[styles.signupButton, submitting && styles.signupButtonDisabled]}
          onPress={handleSignUp}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.YELLOWISH_ORANGE} />
          ) : (
            <Text style={styles.signupButtonText}>Sign up</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: '#fff', paddingTop: 0 },
  logoStack: {
    width: 219 * scale,
    height: 77 * scale,
    marginBottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 219 * scale,
    height: 77 * scale,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 71 * scale,
    marginBottom: 0,
  },
  toggleBtn: {
    marginHorizontal: 16 * scale,
    alignItems: 'center',
  },
  toggleText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 18 * scale,
    color: 'rgb(122,121,121)',
    opacity: 0.74,
    letterSpacing: 0.5,
    height: 24 * scale,
    textAlign: 'center',
  },
  toggleTextActive: {
    color: COLORS.YELLOWISH_ORANGE,
    fontWeight: 'bold',
  },
  toggleUnderline: {
    width: 37 * scale,
    height: 1 * scale,
    backgroundColor: COLORS.YELLOWISH_ORANGE,
    marginTop: 2 * scale,
    borderRadius: 1 * scale,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10 * scale,
    marginBottom: 16 * scale,
  },
  socialBtn: {
    width: 50 * scale,
    height: 50 * scale,
    borderRadius: 25 * scale,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgb(227,227,227)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 11.5 * scale,
  },
  socialIcon: { width: 50 * scale, height: 50 * scale, resizeMode: 'contain' },
  orEmailText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: 'rgb(142,142,142)',
    letterSpacing: 0.2,
    width: 126 * scale,
    height: 16 * scale,
    textAlign: 'center',
    marginBottom: 16 * scale,
  },
  inputContainer: {
    width: 273 * scale,
    height: 49 * scale,
    backgroundColor: 'rgba(249,249,249,0.34)',
    borderRadius: 5 * scale,
    borderWidth: 1,
    borderColor: 'rgb(163,163,163)',
    marginBottom: 16 * scale,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12 * scale,
    opacity: 0.95,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: COLORS.BLACK,
    height: 49 * scale,
  },
  showHideBtn: {
    padding: 4 * scale,
  },
  showHideText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: COLORS.GREENY_BLUE_TWO,
  },
  inputError: {
    borderColor: 'rgb(233,128,128)',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4 * scale,
    marginLeft: 20 * scale,
    width: 253 * scale,
  },
  errorText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: 'rgb(233,128,128)',
    letterSpacing: 0.2,
    width: 253 * scale,
    height: 23 * scale,
    textAlign: 'left',
  },
  ageNotice: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: 'rgb(142,142,142)',
    letterSpacing: 0.2,
    width: 273 * scale,
    height: 18 * scale,
    textAlign: 'center',
    marginTop: 8 * scale,
    marginBottom: 8 * scale,
  },
  divider: {
    width: 273 * scale,
    height: 1,
    backgroundColor: 'rgb(220,220,220)',
    marginTop: 29 * scale,
  },
  updatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 273 * scale,
    marginBottom: 24 * scale,
    marginTop: 29 * scale,
  },
  updatesText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: COLORS.BLACK,
    letterSpacing: 0.2,
    width: 227 * scale,
    height: 15 * scale,
    opacity: 0.7,
    textTransform: 'uppercase',
  },
  updatesSwitch: {
    width: 39 * scale,
    height: 24 * scale,
  },
  signupButton: {
    width: 273 * scale,
    height: 50 * scale,
    backgroundColor: 'rgba(255,178,20,0.1)',
    borderRadius: 25 * scale,
    borderWidth: 2,
    borderColor: COLORS.YELLOWISH_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 42 * scale,
  },
  signupButtonDisabled: {
    opacity: 0.7,
  },
  signupButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16 * scale,
    color: COLORS.YELLOWISH_ORANGE,
    letterSpacing: 0.2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 40 * scale,
    flexGrow: 1,
    paddingHorizontal: 16 * scale,
  },
});



