import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  ScrollView,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { COLORS } from '../constants/colors';
import Svg, { Path } from 'react-native-svg';
import { useListings } from '../context/ListingsContext';
import { useAuth } from '../context/AuthContext';
import { connectOnboardingLink } from '../services/payoutsApi';

const CURRENCIES = [
  { code: 'CAD', label: 'CAD - Canadian Dollar' },
  { code: 'USD', label: 'USD - US Dollar' },
];

const BANK_COUNTRIES = [
  { code: 'CA', label: 'Canada' },
  { code: 'US', label: 'United States' },
];

export default function GetPaidStep3Screen({ navigation }) {
  const { setPayoutSetupComplete } = useListings();
  const { isAuthenticated, isReady } = useAuth();
  const [currency, setCurrency] = useState('CAD');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [bankCountry, setBankCountry] = useState('CA');
  const [showBankCountryDropdown, setShowBankCountryDropdown] = useState(false);
  const [transitNumber, setTransitNumber] = useState('');
  const [institutionNumber, setInstitutionNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [touched, setTouched] = useState(false);

  function isFormValid() {
    if (!currency) return false;
    if (!bankCountry) return false;
    if (bankCountry === 'CA') {
      if (!transitNumber.trim()) return false;
      if (!institutionNumber.trim()) return false;
      if (!accountNumber.trim()) return false;
      if (!confirmAccountNumber.trim()) return false;
      if (accountNumber !== confirmAccountNumber) return false;
    } else {
      if (!routingNumber.trim()) return false;
      if (!accountNumber.trim()) return false;
      if (!confirmAccountNumber.trim()) return false;
      if (accountNumber !== confirmAccountNumber) return false;
    }
    return true;
  }

  // ErrorRow component for error message only
  function ErrorRow({ message }) {
    return (
      <View style={{ marginBottom: 4, marginLeft: 20, width: 253 }}>
        <Text style={styles.errorText}>{message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Row: Back button and header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Svg width={23} height={23} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke={COLORS.MANGO_TWO} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <View style={styles.headerTitleWrapper}>
          <Text style={styles.topHeader}>GET PAID</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Section Header */}
        <Text style={styles.sectionHeader}>Payout details</Text>
        {/* Paragraph */}
        <Text style={styles.paragraph}>Tell us where you'd like to receive your payouts</Text>
        {/* Progress Bar */}
        <View style={styles.progressBarRow}>
          <View style={styles.progressBarActive} />
          <View style={styles.progressBarActive} />
          <View style={styles.progressBarActive} />
        </View>
        {/* Currency Selection */}
        <Text style={styles.inputLabel}>Currency</Text>
        <View style={{ position: 'relative', width: 331 }}>
          <TouchableOpacity style={[styles.inputBox, touched && !currency && styles.inputError]} onPress={() => setShowCurrencyDropdown(!showCurrencyDropdown)}>
            <View style={styles.countryRow}>
              <Text style={styles.countryText}>{CURRENCIES.find(c => c.code === currency).label}</Text>
              <View style={{ flex: 1 }} />
              <Image
                source={showCurrencyDropdown ? require('../assets/icons/dropDownUp.png') : require('../assets/icons/dropDownDown.png')}
                style={styles.dropdownArrow}
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>
          {showCurrencyDropdown && (
            <View style={styles.dropdownMenu}>
              <ScrollView style={{ maxHeight: 180 }}>
                {CURRENCIES.map(c => (
                  <TouchableOpacity key={c.code} style={styles.dropdownItem} onPress={() => { setCurrency(c.code); setShowCurrencyDropdown(false); }}>
                    <Text style={styles.countryText}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
        {touched && !currency && <ErrorRow message="Please select a currency" />}
        {/* Country of Bank Account */}
        <Text style={styles.inputLabel}>Country of bank account</Text>
        <View style={{ position: 'relative', width: 331 }}>
          <TouchableOpacity style={[styles.inputBox, touched && !bankCountry && styles.inputError]} onPress={() => setShowBankCountryDropdown(!showBankCountryDropdown)}>
            <View style={styles.countryRow}>
              <Text style={styles.countryText}>{BANK_COUNTRIES.find(c => c.code === bankCountry).label}</Text>
              <View style={{ flex: 1 }} />
              <Image
                source={showBankCountryDropdown ? require('../assets/icons/dropDownUp.png') : require('../assets/icons/dropDownDown.png')}
                style={styles.dropdownArrow}
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>
          {showBankCountryDropdown && (
            <View style={styles.dropdownMenu}>
              <ScrollView style={{ maxHeight: 180 }}>
                {BANK_COUNTRIES.map(c => (
                  <TouchableOpacity key={c.code} style={styles.dropdownItem} onPress={() => { setBankCountry(c.code); setShowBankCountryDropdown(false); }}>
                    <Text style={styles.countryText}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
        {touched && !bankCountry && <ErrorRow message="Please select a country" />}
        {/* Bank Account Fields */}
        {bankCountry === 'CA' ? (
          <>
            <Text style={styles.inputLabel}>Transit number</Text>
            <TextInput
              style={[styles.input, touched && !transitNumber.trim() && styles.inputError]}
              placeholder="12345"
              placeholderTextColor={COLORS.GRAY_PLACEHOLDER}
              value={transitNumber}
              onChangeText={setTransitNumber}
              keyboardType="number-pad"
            />
            {touched && !transitNumber.trim() && <ErrorRow message="Please enter transit number" />}
            <Text style={styles.inputLabel}>Institution number</Text>
            <TextInput
              style={[styles.input, touched && !institutionNumber.trim() && styles.inputError]}
              placeholder="000"
              placeholderTextColor={COLORS.GRAY_PLACEHOLDER}
              value={institutionNumber}
              onChangeText={setInstitutionNumber}
              keyboardType="number-pad"
            />
            {touched && !institutionNumber.trim() && <ErrorRow message="Please enter institution number" />}
            <Text style={styles.inputLabel}>Account number</Text>
            <TextInput
              style={[styles.input, touched && !accountNumber.trim() && styles.inputError]}
              placeholder="000123456789"
              placeholderTextColor={COLORS.GRAY_PLACEHOLDER}
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="number-pad"
            />
            {touched && !accountNumber.trim() && <ErrorRow message="Please enter account number" />}
            <Text style={styles.inputLabel}>Confirm account number</Text>
            <TextInput
              style={[styles.input, touched && (!confirmAccountNumber.trim() || accountNumber !== confirmAccountNumber) && styles.inputError]}
              placeholder="000123456789"
              placeholderTextColor={COLORS.GRAY_PLACEHOLDER}
              value={confirmAccountNumber}
              onChangeText={setConfirmAccountNumber}
              keyboardType="number-pad"
            />
            {touched && !confirmAccountNumber.trim() && <ErrorRow message="Please confirm account number" />}
            {touched && confirmAccountNumber.trim() && accountNumber !== confirmAccountNumber && <ErrorRow message="Account numbers do not match" />}
          </>
        ) : (
          <>
            <Text style={styles.inputLabel}>Routing number</Text>
            <TextInput
              style={[styles.input, touched && !routingNumber.trim() && styles.inputError]}
              placeholder="11000-000"
              placeholderTextColor={COLORS.GRAY_PLACEHOLDER}
              value={routingNumber}
              onChangeText={setRoutingNumber}
              keyboardType="number-pad"
            />
            {touched && !routingNumber.trim() && <ErrorRow message="Please enter routing number" />}
            <Text style={styles.inputLabel}>Account number</Text>
            <TextInput
              style={[styles.input, touched && !accountNumber.trim() && styles.inputError]}
              placeholder="000123456789"
              placeholderTextColor={COLORS.GRAY_PLACEHOLDER}
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="number-pad"
            />
            {touched && !accountNumber.trim() && <ErrorRow message="Please enter account number" />}
            <Text style={styles.inputLabel}>Confirm account number</Text>
            <TextInput
              style={[styles.input, touched && (!confirmAccountNumber.trim() || accountNumber !== confirmAccountNumber) && styles.inputError]}
              placeholder="000123456789"
              placeholderTextColor={COLORS.GRAY_PLACEHOLDER}
              value={confirmAccountNumber}
              onChangeText={setConfirmAccountNumber}
              keyboardType="number-pad"
            />
            {touched && !confirmAccountNumber.trim() && <ErrorRow message="Please confirm account number" />}
            {touched && confirmAccountNumber.trim() && accountNumber !== confirmAccountNumber && <ErrorRow message="Account numbers do not match" />}
          </>
        )}
      </ScrollView>
      <TouchableOpacity
        style={[styles.nextBtn, !isFormValid() && { opacity: 0.5 }]}
        onPress={async () => {
          setTouched(true);
          if (!isFormValid()) return;
          if (isAuthenticated && isReady) {
            try {
              const { url } = await connectOnboardingLink({
                refreshUrl: 'https://rentyourride.com',
                returnUrl: 'https://rentyourride.com',
              });
              if (url) {
                const opened = await Linking.canOpenURL(url);
                if (opened) await Linking.openURL(url);
              }
            } catch (e) {
              Alert.alert('Connect setup', e?.message || 'Could not open Stripe Connect.');
            }
          }
          setPayoutSetupComplete(true);
          navigation.navigate('ListRideStack');
        }}
        disabled={!isFormValid()}
      >
        <Text style={styles.nextBtnText}>SAVE</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingTop: 20,
    paddingBottom: 8,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    zIndex: 2,
    position: 'relative',
    marginBottom: 37, // Added spacing below header
  },
  backBtn: {
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    height: 23,
    width: 39,
    padding: 8,
    zIndex: 3,
  },
  headerTitleWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  topHeader: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.2,
    width: 71,
    height: 20,
    textAlign: 'center',
  },
  sectionHeader: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 18,
    color: 'rgb(14,38,43)',
    width: 286,
    height: 24,
    textAlign: 'center',
    marginBottom: 2,
  },
  paragraph: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: 'rgb(142,142,142)',
    width: 315,
    height: 23,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 12,
  },
  progressBarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 8,
  },
  progressBarActive: {
    width: 62,
    height: 3,
    backgroundColor: 'rgb(57,175,169)',
    borderRadius: 5,
    marginRight: 8,
  },
  progressBarInactive: {
    width: 62,
    height: 3,
    backgroundColor: 'rgb(224,224,224)',
    borderRadius: 5,
    marginRight: 8,
  },
  inputLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: 'rgb(80,80,80)',
    marginBottom: 4,
    marginTop: 8,
    textAlign: 'left',
    width: 331,
    textTransform: 'capitalize',
    paddingLeft: 10,
  },
  input: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: '#222',
    backgroundColor: 'rgba(249,249,249,0.34)',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgb(163,163,163)',
    width: 331,
    height: 49,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  inputError: {
    borderColor: 'red',
  },
  inputBox: {
    width: 331,
    height: 49,
    backgroundColor: 'rgba(249,249,249,0.34)',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgb(163,163,163)',
    justifyContent: 'center',
    marginBottom: 12,
    opacity: 1,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  countryText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: '#000',
    letterSpacing: 0.2,
    opacity: 0.7,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    width: 331,
    backgroundColor: '#fff',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgb(163,163,163)',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    maxHeight: 180,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownArrow: {
    width: 16,
    height: 16,
    marginRight: 8,
    tintColor: '#6ED2D0',
  },
  nextBtn: {
    width: 239,
    height: 50,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  nextBtnText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: 'rgb(247,247,247)',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: 'rgb(233,128,128)',
    letterSpacing: 0.2,
    width: 253,
    height: 23,
    textAlign: 'left',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 0,
  },
}); 