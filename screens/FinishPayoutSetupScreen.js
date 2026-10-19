import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../constants/colors';
import Svg, { Path } from 'react-native-svg';
import {
  SIN_WHY_WE_ASK,
  verificationErrorMessage,
} from '../constants/payoutRequirementCopy';
import { useListings } from '../context/ListingsContext';
import {
  listPayoutRequirements,
  submitRequirementBank,
  submitRequirementDocument,
  submitRequirementPersonal,
  submitRequirementSin,
  submitRequirementTos,
} from '../services/payoutsApi';

export default function FinishPayoutSetupScreen({ navigation }) {
  const { refreshPayoutStatusFromApi, setPayoutSetupComplete } = useListings();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [requirements, setRequirements] = useState([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState(null);

  // Form fields for the active screen
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sin, setSin] = useState('');
  const [showSin, setShowSin] = useState(false);
  const [transitNumber, setTransitNumber] = useState('');
  const [institutionNumber, setInstitutionNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [holderName, setHolderName] = useState('');
  const [frontUri, setFrontUri] = useState(null);
  const [backUri, setBackUri] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPayoutRequirements();
      const list = res?.requirements || [];
      setRequirements(list);
      setIndex(0);
      if (res?.payoutsReady) {
        setPayoutSetupComplete(true);
        await refreshPayoutStatusFromApi?.();
        Alert.alert('You’re ready', 'Payouts are enabled on your account.');
        navigation.goBack();
      }
    } catch (e) {
      setError(e?.message || 'Could not load requirements');
    } finally {
      setLoading(false);
    }
  }, [navigation, refreshPayoutStatusFromApi, setPayoutSetupComplete]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const current = requirements[index];

  const pickImage = async (side) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Allow camera access to photograph your ID.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    if (side === 'front') setFrontUri(result.assets[0].uri);
    else setBackUri(result.assets[0].uri);
  };

  const advanceOrReload = async () => {
    await reload();
  };

  const onSubmit = async () => {
    if (!current || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (current.screen === 'personal' || current.screen === 'address') {
        await submitRequirementPersonal({
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
        });
      } else if (current.screen === 'sin') {
        await submitRequirementSin(sin.replace(/\D/g, ''));
        setSin('');
      } else if (current.screen === 'bank') {
        await submitRequirementBank({
          transitNumber: transitNumber.replace(/\D/g, ''),
          institutionNumber: institutionNumber.replace(/\D/g, ''),
          accountNumber: accountNumber.replace(/\D/g, ''),
          accountHolderName: holderName.trim(),
        });
      } else if (current.screen === 'tos') {
        await submitRequirementTos();
      } else if (
        current.screen === 'id_document' ||
        current.screen === 'address_document'
      ) {
        if (!frontUri) {
          Alert.alert('Photo needed', 'Take a photo of the front of your document.');
          setBusy(false);
          return;
        }
        setUploadProgress('Uploading…');
        await submitRequirementDocument({
          frontUri,
          backUri,
          purpose:
            current.screen === 'address_document'
              ? 'additional_verification'
              : 'identity_document',
        });
        setUploadProgress(null);
        setFrontUri(null);
        setBackUri(null);
      } else {
        Alert.alert(
          'Contact support',
          'We need help verifying a requirement. Our team has been notified.',
        );
      }
      await advanceOrReload();
    } catch (e) {
      const msg = verificationErrorMessage(
        e?.body?.code,
        e?.message || 'Could not save. Please try again.',
      );
      setError(msg);
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
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
        <View style={styles.headerTitleWrapper}>
          <Text style={styles.topHeader}>FINISH PAYOUT SETUP</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.MANGO_TWO} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {!current ? (
            <Text style={styles.lead}>
              Nothing else is due right now. Pull to refresh from Payouts if status
              changes.
            </Text>
          ) : (
            <>
              <Text style={styles.step}>
                Step {index + 1} of {requirements.length}
              </Text>
              <Text style={styles.title}>{current.label}</Text>
              {current.errorReason ? (
                <Text style={styles.errorReason}>{current.errorReason}</Text>
              ) : null}

              {(current.screen === 'personal' || current.screen === 'address') && (
                <>
                  <Text style={styles.label}>First name</Text>
                  <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />
                  <Text style={styles.label}>Last name</Text>
                  <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />
                </>
              )}

              {current.screen === 'sin' && (
                <>
                  <Text style={styles.why}>{SIN_WHY_WE_ASK}</Text>
                  <Text style={styles.label}>Social Insurance Number</Text>
                  <TextInput
                    style={styles.input}
                    value={sin}
                    onChangeText={(t) => setSin(t.replace(/[^\d\s]/g, '').slice(0, 11))}
                    keyboardType="number-pad"
                    secureTextEntry={!showSin}
                    autoComplete="off"
                    textContentType="none"
                  />
                  <TouchableOpacity onPress={() => setShowSin((v) => !v)}>
                    <Text style={styles.link}>{showSin ? 'Hide' : 'Show'} SIN</Text>
                  </TouchableOpacity>
                </>
              )}

              {(current.screen === 'id_document' ||
                current.screen === 'address_document') && (
                <>
                  <Text style={styles.why}>
                    Take a clear photo of your government ID
                    {current.screen === 'address_document' ? ' or proof of address' : ''}.
                  </Text>
                  <TouchableOpacity style={styles.docBtn} onPress={() => pickImage('front')}>
                    <Text style={styles.docBtnText}>
                      {frontUri ? 'Retake front' : 'Photograph front'}
                    </Text>
                  </TouchableOpacity>
                  {frontUri ? (
                    <Image source={{ uri: frontUri }} style={styles.preview} />
                  ) : null}
                  <TouchableOpacity style={styles.docBtn} onPress={() => pickImage('back')}>
                    <Text style={styles.docBtnText}>
                      {backUri ? 'Retake back' : 'Photograph back (optional)'}
                    </Text>
                  </TouchableOpacity>
                  {uploadProgress ? (
                    <Text style={styles.meta}>{uploadProgress}</Text>
                  ) : null}
                </>
              )}

              {current.screen === 'bank' && (
                <>
                  <Text style={styles.label}>Account holder name</Text>
                  <TextInput style={styles.input} value={holderName} onChangeText={setHolderName} />
                  <Text style={styles.label}>Transit (5 digits)</Text>
                  <TextInput
                    style={styles.input}
                    value={transitNumber}
                    onChangeText={setTransitNumber}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.label}>Institution (3 digits)</Text>
                  <TextInput
                    style={styles.input}
                    value={institutionNumber}
                    onChangeText={setInstitutionNumber}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.label}>Account number</Text>
                  <TextInput
                    style={styles.input}
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    keyboardType="number-pad"
                    secureTextEntry
                  />
                </>
              )}

              {current.screen === 'tos' && (
                <Text style={styles.why}>
                  By continuing you re-accept the Stripe Connected Account Agreement and
                  RentYourRide Terms so we can finish verifying your payout account.
                </Text>
              )}

              {current.screen === 'unknown' && (
                <Text style={styles.why}>
                  This requirement needs a team member. We’ve notified support — you’ll
                  get an email when it’s resolved.
                </Text>
              )}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.nextBtn, busy && { opacity: 0.6 }]}
                onPress={() => void onSubmit()}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.nextBtnText}>
                    {current.screen === 'tos' ? 'AGREE AND CONTINUE' : 'SAVE AND CONTINUE'}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingTop: 20,
    paddingBottom: 8,
    paddingHorizontal: 24,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitleWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  topHeader: {
    fontFamily: 'Nunito',
    fontSize: 16,
    color: COLORS.MANGO_TWO,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  scroll: { padding: 24, paddingBottom: 80 },
  step: { fontFamily: 'Nunito', fontSize: 13, color: '#888', marginBottom: 6 },
  title: {
    fontFamily: 'Nunito',
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    marginBottom: 12,
  },
  lead: { fontFamily: 'Nunito', fontSize: 15, color: '#444' },
  label: {
    fontFamily: 'Nunito',
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Nunito',
    fontSize: 15,
  },
  why: {
    fontFamily: 'Nunito',
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 12,
  },
  link: { fontFamily: 'Nunito', color: COLORS.MANGO_TWO, marginTop: 8 },
  docBtn: {
    borderWidth: 1,
    borderColor: COLORS.MANGO_TWO,
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  docBtnText: { fontFamily: 'Nunito', fontWeight: '700', color: COLORS.MANGO_TWO },
  preview: { width: '100%', height: 160, marginTop: 10, borderRadius: 8 },
  meta: { fontFamily: 'Nunito', marginTop: 8, color: '#666' },
  error: { color: '#E98080', marginTop: 12, fontFamily: 'Nunito' },
  errorReason: { color: '#E98080', marginBottom: 10, fontFamily: 'Nunito' },
  nextBtn: {
    marginTop: 28,
    backgroundColor: COLORS.MANGO_TWO,
    borderRadius: 26,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnText: {
    fontFamily: 'Nunito',
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
});
