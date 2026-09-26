import React, { useCallback, useState } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useAuth } from '../context/AuthContext';
import { getDeletionEligibility, deleteMyAccount } from '../services/usersApi';
import {
  isAppleSignInAvailable,
  isSocialAuthCancellation,
  signInWithAppleNative,
  signInWithGoogleNative,
} from '../services/socialAuthNative';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = uiScale;

export default function DeleteAccountScreen({ navigation }) {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [blockers, setBlockers] = useState([]);
  const [hasPassword, setHasPassword] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [appleConnected, setAppleConnected] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getDeletionEligibility();
      setCanDelete(!!result?.canDelete);
      setBlockers(Array.isArray(result?.blockers) ? result.blockers : []);
      setHasPassword(!!result?.hasPassword);
      setGoogleConnected(!!result?.googleConnected);
      setAppleConnected(!!result?.appleConnected);
    } catch (err) {
      setError(err?.message || 'Could not check whether this account can be deleted.');
      setCanDelete(false);
      setBlockers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const finishDelete = async (creds) => {
    setDeleting(true);
    setError('');
    try {
      await deleteMyAccount(creds);
      await signOut();
    } catch (err) {
      const blockersFromApi = err?.body?.blockers || err?.body?.message?.blockers;
      if (Array.isArray(blockersFromApi) && blockersFromApi.length) {
        setCanDelete(false);
        setBlockers(blockersFromApi);
      }
      setError(err?.message || 'Could not delete your account. Try again.');
      setDeleting(false);
    }
  };

  const confirmThenDelete = (creds) => {
    Alert.alert(
      'Delete your account?',
      'Your account will be deactivated now and permanently deleted after 30 days. Sign in during those 30 days to cancel.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => finishDelete(creds),
        },
      ],
    );
  };

  const onPasswordDelete = () => {
    if (!password.trim()) {
      setError('Enter your password to continue.');
      return;
    }
    confirmThenDelete({ password: password.trim() });
  };

  const onGoogleDelete = async () => {
    setError('');
    try {
      const native = await signInWithGoogleNative();
      confirmThenDelete({ googleIdToken: native.idToken });
    } catch (err) {
      if (isSocialAuthCancellation(err)) return;
      setError(err?.message || 'Google sign-in failed. Try again.');
    }
  };

  const onAppleDelete = async () => {
    setError('');
    try {
      const native = await signInWithAppleNative();
      confirmThenDelete({ appleIdentityToken: native.identityToken });
    } catch (err) {
      if (isSocialAuthCancellation(err)) return;
      setError(err?.message || 'Apple sign-in failed. Try again.');
    }
  };

  const goToTrips = () => {
    const tabNav = navigation.getParent();
    if (tabNav?.navigate) {
      tabNav.navigate('RentalManagerScreen');
    } else {
      navigation.navigate('RentalManagerScreen');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Svg width={23} height={23} viewBox="0 0 48 48" fill="none">
            <Path
              d="M31 8L17 24L31 40"
              stroke={COLORS.MANGO_TWO}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
        <View style={styles.headerTextFlexWrapper}>
          <Text style={styles.headerText}>DELETE ACCOUNT</Text>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Delete your account</Text>
        <Text style={styles.body}>
          For security, you must sign in again before we start deletion. Your account is
          deactivated immediately, then permanently deleted after 30 days. Sign back in during
          those 30 days to cancel.
        </Text>
        <Text style={styles.body}>
          Your guest and host profiles are part of the same account and will both be removed.
          You cannot delete your account while you have an active or upcoming trip, or an
          outstanding balance.
        </Text>

        {loading ? (
          <ActivityIndicator color={COLORS.GREENY_BLUE_TWO} style={styles.spinner} />
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!loading && blockers.length > 0
          ? blockers.map((blocker) => (
              <View key={blocker.code} style={styles.blockerCard}>
                <Text style={styles.blockerTitle}>{blocker.title}</Text>
                <Text style={styles.blockerDetail}>{blocker.detail}</Text>
                {blocker.code === 'ACTIVE_TRIPS' ? (
                  <TouchableOpacity onPress={goToTrips}>
                    <Text style={styles.blockerLink}>Go to trips</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))
          : null}

        {!loading && canDelete && hasPassword ? (
          <>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={COLORS.GRAY_PLACEHOLDER}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
              onPress={onPasswordDelete}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.deleteButtonText}>Delete account</Text>
              )}
            </TouchableOpacity>
          </>
        ) : null}

        {!loading && canDelete && googleConnected ? (
          <TouchableOpacity
            style={[styles.socialButton, deleting && styles.deleteButtonDisabled]}
            onPress={onGoogleDelete}
            disabled={deleting}
          >
            <Text style={styles.socialButtonText}>Sign in with Google to delete</Text>
          </TouchableOpacity>
        ) : null}

        {!loading && canDelete && appleConnected && isAppleSignInAvailable() ? (
          <TouchableOpacity
            style={[styles.socialButton, deleting && styles.deleteButtonDisabled]}
            onPress={onAppleDelete}
            disabled={deleting}
          >
            <Text style={styles.socialButtonText}>Sign in with Apple to delete</Text>
          </TouchableOpacity>
        ) : null}

        {!loading &&
        canDelete &&
        !hasPassword &&
        !googleConnected &&
        !appleConnected ? (
          <Text style={styles.error}>
            This account has no password or linked sign-in method. Contact support to
            delete it.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    width: SCREEN_WIDTH,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  backButton: {
    marginRight: 16,
  },
  headerTextFlexWrapper: {
    flex: 1,
    marginLeft: 39,
    marginRight: 39,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightSpacer: {
    width: 39,
  },
  headerText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.2,
    textAlign: 'center',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  content: {
    paddingHorizontal: 24 * scale,
    paddingBottom: 48 * scale,
  },
  title: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 22 * scale,
    color: '#17252A',
    marginBottom: 12 * scale,
  },
  body: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    lineHeight: 21 * scale,
    color: '#646464',
    marginBottom: 12 * scale,
  },
  spinner: {
    marginTop: 24 * scale,
  },
  error: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: '#F9493A',
    marginTop: 8 * scale,
    marginBottom: 12 * scale,
  },
  blockerCard: {
    backgroundColor: '#FFF8F6',
    borderRadius: 10 * scale,
    padding: 16 * scale,
    marginTop: 8 * scale,
    borderWidth: 1,
    borderColor: '#F5D4CE',
  },
  blockerTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 14 * scale,
    color: '#17252A',
    marginBottom: 6 * scale,
  },
  blockerDetail: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    lineHeight: 19 * scale,
    color: '#646464',
  },
  blockerLink: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 13 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    marginTop: 10 * scale,
  },
  label: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 13 * scale,
    color: '#17252A',
    marginTop: 20 * scale,
    marginBottom: 8 * scale,
  },
  passwordInput: {
    height: 50 * scale,
    borderRadius: 10 * scale,
    borderWidth: 1,
    borderColor: '#D8E6E5',
    paddingHorizontal: 14 * scale,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: '#17252A',
  },
  deleteButton: {
    marginTop: 16 * scale,
    height: 50 * scale,
    borderRadius: 10 * scale,
    backgroundColor: '#F9493A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialButton: {
    marginTop: 12 * scale,
    height: 50 * scale,
    borderRadius: 10 * scale,
    backgroundColor: '#17252A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialButtonText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    color: '#fff',
  },
  deleteButtonDisabled: {
    opacity: 0.7,
  },
  deleteButtonText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 16 * scale,
    color: '#fff',
  },
});
