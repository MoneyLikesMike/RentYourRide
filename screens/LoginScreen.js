import React, { useEffect, useState } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { resetToMainTabs } from '../navigation/navigationRef';
import { ApiError } from '../services/authApi';
import {
  clearRememberMeCredentials,
  loadRememberMeCredentials,
  saveRememberMeCredentials,
} from '../services/rememberMe';
import SocialAuthButtons from '../components/SocialAuthButtons';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = uiScale;

// ErrorRow component for error message only
function ErrorRow({ message }) {
  return (
    <View style={styles.errorRow}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export default function LoginScreen({ isChildScreen, onSwitchToSignUp, onForgotPassword }) {
  const navigation = useNavigation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  // Remove local toggle state; always use navigation for tab switching
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadRememberMeCredentials();
      if (cancelled) return;
      setRememberMe(saved.enabled);
      if (saved.enabled) {
        setEmail(saved.email);
        setPassword(saved.password);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async () => {
    let valid = true;
    setSubmitError('');
    if (!email) {
      setEmailError('Please enter email address');
      valid = false;
    } else {
      setEmailError('');
    }
    if (!password) {
      setPasswordError('Please enter a password');
      valid = false;
    } else {
      setPasswordError('');
    }
    if (!valid) return;
    setSubmitting(true);
    try {
      await signIn(email, password);
      if (rememberMe) {
        await saveRememberMeCredentials(email, password);
      } else {
        await clearRememberMeCredentials();
      }
      resetToMainTabs();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err && typeof err.message === 'string'
            ? err.message
            : 'Could not sign in. Check your connection and try again.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Email Field */}
        <View style={[styles.inputContainer, { marginTop: 10 * scale }, emailError ? styles.inputError : null]}>
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
        {emailError ? (
          <ErrorRow message={emailError} />
        ) : null}

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
        {passwordError ? (
          <ErrorRow message={passwordError} />
        ) : null}
        {submitError ? (
          <View style={styles.submitErrorWrap}>
            <ErrorRow message={submitError} />
          </View>
        ) : null}

        {/* Remember Me and Forgot Password */}
        <View style={styles.rememberRow}>
          <TouchableOpacity style={styles.checkboxContainer} onPress={() => setRememberMe(!rememberMe)}>
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && (
                <Ionicons name="checkmark" size={11 * scale} color="#fff" />
              )}
            </View>
            <Text style={styles.rememberText}>Remember Me</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (isChildScreen && onForgotPassword) {
                onForgotPassword();
              } else if (navigation) {
                navigation.navigate('ForgotPasswordScreen');
              }
            }}
          >
            <Text style={styles.forgotText}>Forgot Password</Text>
          </TouchableOpacity>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.loginButton, submitting && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.YELLOWISH_ORANGE} />
          ) : (
            <Text style={styles.loginButtonText}>LOG IN</Text>
          )}
        </TouchableOpacity>

        {/* Social Login Icons */}
        <SocialAuthButtons style={{ marginBottom: 120 * scale }} />

        {/* Bottom Sign Up Prompt */}
        <View style={styles.signupRow}>
          <Text style={styles.signupGray}>Don’t have an account? </Text>
          <TouchableOpacity
            onPress={() => {
              if (isChildScreen && onSwitchToSignUp) {
                onSwitchToSignUp();
              } else if (navigation) {
                navigation.navigate('SignUpScreen');
              }
            }}
          >
            <Text style={styles.signupGreen}>Create an account</Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 32 * scale,
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
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 273 * scale,
    marginBottom: 24 * scale,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 13 * scale,
    height: 13 * scale,
    backgroundColor: '#fff',
    borderRadius: 3 * scale,
    borderWidth: 1,
    borderColor: 'rgb(220,220,220)',
    marginRight: 8 * scale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderColor: COLORS.GREENY_BLUE_TWO,
  },
  rememberText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: 'rgb(191,191,191)',
    letterSpacing: 0.2,
  },
  forgotText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
  },
  loginButton: {
    width: 273 * scale,
    height: 50 * scale,
    backgroundColor: 'rgba(255,178,20,0.1)',
    borderRadius: 25 * scale,
    borderWidth: 2,
    borderColor: COLORS.YELLOWISH_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24 * scale,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  submitErrorWrap: {
    width: 273 * scale,
    marginBottom: 8 * scale,
  },
  loginButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16 * scale,
    color: COLORS.YELLOWISH_ORANGE,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 120 * scale,
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
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0,
  },
  signupGray: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: 'rgb(142,142,142)',
    letterSpacing: 0.2,
  },
  signupGreen: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
  },
  inputError: {
    borderColor: 'rgb(233,128,128)',
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
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4 * scale,
    marginLeft: 20 * scale,
    width: 253 * scale,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 40 * scale,
    flexGrow: 1,
  },
});

