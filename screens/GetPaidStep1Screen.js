import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, ScrollView, Image } from 'react-native';
import { COLORS } from '../constants/colors';
import Svg, { Path } from 'react-native-svg';

const COUNTRIES = [
  { code: 'CA', label: 'Canada' },
  { code: 'US', label: 'United States' },
];

const PROVINCES = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
  'Nova Scotia', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Northwest Territories',
  'Nunavut', 'Yukon'
];
const STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida',
  'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine',
  'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska',
  'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
  'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee',
  'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

// ErrorRow component for error message only
function ErrorRow({ message }) {
  return (
    <View style={{ marginBottom: 4, marginLeft: 20, width: 253 }}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export default function GetPaidStep1Screen({ navigation }) {
  const [country, setCountry] = useState('CA');
  const [showDropdown, setShowDropdown] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [province, setProvince] = useState('');
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);
  const [postalCode, setPostalCode] = useState('');
  const [state, setState] = useState('');
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [zipCode, setZipCode] = useState('');
  const [mobile, setMobile] = useState('');
  const [touched, setTouched] = useState(false);

  function isFormValid() {
    if (!firstName.trim()) return false;
    if (!lastName.trim()) return false;
    if (!email.trim() || !isValidEmail(email)) return false;
    if (!dob.trim()) return false;
    if (!address1.trim()) return false;
    if (!country) return false;
    if (country === 'CA' && !province) return false;
    if (country === 'CA' && !postalCode.trim()) return false;
    if (country === 'US' && !state) return false;
    if (country === 'US' && !zipCode.trim()) return false;
    if (!mobile.trim()) return false;
    return true;
  }

  function isValidEmail(email) {
    // Simple email regex
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
        <Text style={styles.sectionHeader}>Personal details</Text>
        {/* Paragraph */}
        <Text style={styles.paragraph}>Tell us a few details about yourself</Text>
        {/* Progress Bar */}
        <View style={styles.progressBarRow}>
          <View style={styles.progressBarActive} />
          <View style={styles.progressBarInactive} />
          <View style={styles.progressBarInactive} />
        </View>
        {/* Legal Name Section */}
        <Text style={styles.legalNameLabel}>Legal name</Text>
        <Text style={styles.inputLabel}>First Name</Text>
        <TextInput
          style={[styles.input, touched && !firstName.trim() && styles.inputError]}
          placeholder="First name"
          placeholderTextColor={COLORS.GRAY_PLACEHOLDER}
          value={firstName}
          onChangeText={setFirstName}
        />
        {touched && !firstName.trim() && <ErrorRow message="Please enter first name" />}
        <Text style={styles.inputLabel}>Last Name</Text>
        <TextInput
          style={[styles.input, touched && !lastName.trim() && styles.inputError]}
          placeholder="Last name"
          placeholderTextColor={COLORS.GRAY_PLACEHOLDER}
          value={lastName}
          onChangeText={setLastName}
        />
        {touched && !lastName.trim() && <ErrorRow message="Please enter last name" />}
        <View style={[styles.divider, { marginTop: 25 }]} />
        <Text style={styles.inputLabel}>Email Address</Text>
        <TextInput
          style={[styles.input, touched && (!email.trim() || !isValidEmail(email)) && styles.inputError]}
          placeholder="Email"
          placeholderTextColor={COLORS.GRAY_PLACEHOLDER}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {touched && !email.trim() && <ErrorRow message="Please enter email address" />}
        {touched && email.trim() && !isValidEmail(email) && <ErrorRow message="Please enter a valid email address" />}
        <View style={[styles.divider, { marginTop: 25 }]} />
        <Text style={styles.inputLabel}>Date Of Birth</Text>
        <TextInput
          style={[styles.input, touched && !dob.trim() && styles.inputError]}
          placeholder="MM / DD / YYYY"
          placeholderTextColor={COLORS.GRAY_PLACEHOLDER}
          value={dob}
          onChangeText={text => {
            // Remove all non-digits
            let cleaned = text.replace(/[^0-9]/g, '');
            // Limit to 8 digits
            cleaned = cleaned.slice(0, 8);
            let formatted = '';
            if (cleaned.length > 0) {
              formatted = cleaned.slice(0, 2);
            }
            if (cleaned.length > 2) {
              formatted += ' / ' + cleaned.slice(2, 4);
            }
            if (cleaned.length > 4) {
              formatted += ' / ' + cleaned.slice(4, 8);
            }
            setDob(formatted);
          }}
        />
        {touched && !dob.trim() && <ErrorRow message="Please enter date of birth" />}
        {/* Home Address Section */}
        <Text style={styles.legalNameLabel}>Home address</Text>
        <Text style={styles.inputLabel}>Address Line 1</Text>
        <TextInput
          style={[styles.input, touched && !address1.trim() && styles.inputError]}
          placeholder="Address line 1"
          placeholderTextColor={COLORS.GRAY_PLACEHOLDER}
          value={address1}
          onChangeText={setAddress1}
        />
        {touched && !address1.trim() && <ErrorRow message="Please enter address line 1" />}
        <Text style={styles.inputLabel}>Address Line 2</Text>
        <TextInput
          style={styles.input}
          placeholder="Address line 2 (optional)"
          placeholderTextColor={COLORS.GRAY_PLACEHOLDER}
          value={address2}
          onChangeText={setAddress2}
        />
        <Text style={styles.inputLabel}>Country</Text>
        <View style={{ position: 'relative', width: 331 }}>
          <TouchableOpacity style={[styles.inputBox, touched && !country && styles.inputError]} onPress={() => setShowDropdown(!showDropdown)}>
            <View style={styles.countryRow}>
              <Text style={styles.countryText}>{COUNTRIES.find(c => c.code === country).label}</Text>
              <View style={{ flex: 1 }} />
              <Image
                source={showDropdown ? require('../assets/icons/dropDownUp.png') : require('../assets/icons/dropDownDown.png')}
                style={styles.dropdownArrow}
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>
          {showDropdown && (
            <View style={styles.dropdownMenu}>
              {COUNTRIES.map(c => (
                <TouchableOpacity key={c.code} style={styles.dropdownItem} onPress={() => { setCountry(c.code); setShowDropdown(false); }}>
                  <Text style={styles.countryText}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        {touched && !country && <ErrorRow message="Please select a country" />}
        {country === 'CA' ? (
          <>
            <Text style={styles.inputLabel}>Province</Text>
            <View style={{ position: 'relative', width: 331 }}>
              <TouchableOpacity style={[styles.inputBox, touched && !province && styles.inputError]} onPress={() => setShowProvinceDropdown(!showProvinceDropdown)}>
                <View style={styles.countryRow}>
                  <Text style={[styles.countryText, { color: province ? '#000' : '#A9A9A9' }]}>{province || 'Select'}</Text>
                  <View style={{ flex: 1 }} />
                  <Image
                    source={showProvinceDropdown ? require('../assets/icons/dropDownUp.png') : require('../assets/icons/dropDownDown.png')}
                    style={styles.dropdownArrow}
                    resizeMode="contain"
                  />
                </View>
              </TouchableOpacity>
              {showProvinceDropdown && (
                <View style={styles.dropdownMenu}>
                  <ScrollView style={{ maxHeight: 180 }}>
                    {PROVINCES.map(p => (
                      <TouchableOpacity key={p} style={styles.dropdownItem} onPress={() => { setProvince(p); setShowProvinceDropdown(false); }}>
                        <Text style={styles.countryText}>{p}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
            {touched && !province && <ErrorRow message="Please select a province" />}
            <Text style={styles.inputLabel}>Postal Code</Text>
            <TextInput
              style={[styles.input, touched && !postalCode.trim() && styles.inputError]}
              placeholder="Postal code"
              placeholderTextColor={COLORS.GRAY_PLACEHOLDER}
              value={postalCode}
              onChangeText={text => {
                // Remove all non-alphanumeric
                let cleaned = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                // Limit to 6 characters
                cleaned = cleaned.slice(0, 6);
                let formatted = '';
                if (cleaned.length > 0) {
                  formatted = cleaned.slice(0, 3);
                }
                if (cleaned.length > 3) {
                  formatted += ' ' + cleaned.slice(3, 6);
                }
                setPostalCode(formatted);
              }}
            />
            {touched && !postalCode.trim() && <ErrorRow message="Please enter postal code" />}
            <View style={[styles.divider, { marginTop: 25 }]} />
          </>
        ) : (
          <>
            <Text style={styles.inputLabel}>State</Text>
            <View style={{ position: 'relative', width: 331 }}>
              <TouchableOpacity style={[styles.inputBox, touched && !state && styles.inputError]} onPress={() => setShowStateDropdown(!showStateDropdown)}>
                <View style={styles.countryRow}>
                  <Text style={[styles.countryText, { color: state ? '#000' : '#A9A9A9' }]}>{state || 'Select'}</Text>
                  <View style={{ flex: 1 }} />
                  <Image
                    source={showStateDropdown ? require('../assets/icons/dropDownUp.png') : require('../assets/icons/dropDownDown.png')}
                    style={styles.dropdownArrow}
                    resizeMode="contain"
                  />
                </View>
              </TouchableOpacity>
              {showStateDropdown && (
                <View style={styles.dropdownMenu}>
                  <ScrollView style={{ maxHeight: 180 }}>
                    {STATES.map(s => (
                      <TouchableOpacity key={s} style={styles.dropdownItem} onPress={() => { setState(s); setShowStateDropdown(false); }}>
                        <Text style={styles.countryText}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
            {touched && !state && <ErrorRow message="Please select a state" />}
            <Text style={styles.inputLabel}>Zip Code</Text>
            <TextInput
              style={[styles.input, touched && !zipCode.trim() && styles.inputError]}
              placeholder="Zip code"
              placeholderTextColor={COLORS.GRAY_PLACEHOLDER}
              value={zipCode}
              onChangeText={text => {
                // Remove all non-digits
                let cleaned = text.replace(/[^0-9]/g, '');
                // Limit to 9 digits
                cleaned = cleaned.slice(0, 9);
                let formatted = '';
                if (cleaned.length > 0) {
                  formatted = cleaned.slice(0, 5);
                }
                if (cleaned.length > 5) {
                  formatted += '-' + cleaned.slice(5, 9);
                }
                setZipCode(formatted);
              }}
            />
            {touched && !zipCode.trim() && <ErrorRow message="Please enter zip code" />}
            <View style={[styles.divider, { marginTop: 25 }]} />
          </>
        )}
        <Text style={styles.inputLabel}>Mobile Number</Text>
        <TextInput
          style={[styles.input, touched && !mobile.trim() && styles.inputError]}
          placeholder="Mobile number"
          placeholderTextColor={COLORS.GRAY_PLACEHOLDER}
          value={mobile}
          onChangeText={text => {
            // Remove all non-digits
            let cleaned = text.replace(/[^0-9]/g, '');
            // Limit to 10 digits
            cleaned = cleaned.slice(0, 10);
            let formatted = '';
            if (cleaned.length > 0) {
              formatted = '(' + cleaned.slice(0, 3);
            }
            if (cleaned.length > 3) {
              formatted += ') ' + cleaned.slice(3, 6);
            }
            if (cleaned.length > 6) {
              formatted += '-' + cleaned.slice(6, 10);
            }
            setMobile(formatted);
          }}
          keyboardType="phone-pad"
        />
        {touched && !mobile.trim() && <ErrorRow message="Please enter mobile number" />}
        {/* Bottom Paragraph and Next Button */}
        <Text style={styles.bottomParagraph}>
          By clicking next, you agree to the{' '}
          <Text style={styles.link} onPress={() => {/* TODO: open Connected Account Agreement link */}}>
            Connected Account Agreement
          </Text>
          {', to receiving autodialed text messages from Stripe, and you certify that the information you have provided to Stripe is complete and correct. Stripe, Inc. is a registered ISO of Wells Fargo Bank, N.A., Concord, CA'}
        </Text>
        <TouchableOpacity
          style={[styles.nextBtn, !isFormValid() && { opacity: 0.5 }]}
          onPress={() => {
            setTouched(true);
            if (isFormValid()) {
              navigation.navigate('GetPaidStep2Screen');
            }
          }}
          disabled={!isFormValid()}
        >
          <Text style={styles.nextBtnText}>NEXT</Text>
        </TouchableOpacity>
      </ScrollView>
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
  legalNameLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: 'rgb(80,80,80)',
    letterSpacing: -0.2,
    width: 159,
    height: 31,
    textAlign: 'left',
    marginTop: 10,
    marginBottom: 2,
    alignSelf: 'flex-start',
    paddingLeft: 2,
  },
  inputRow: {
    flexDirection: 'row',
    width: 331,
    marginBottom: 8,
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
  divider: {
    width: 331,
    height: 1,
    backgroundColor: 'rgb(224,224,224)',
    marginBottom: 8,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 331,
    marginBottom: 8,
  },
  countryLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: '#222',
    marginRight: 12,
  },
  picker: {
    width: 331,
    height: 49,
    color: '#222',
    backgroundColor: 'rgba(249,249,249,0.34)',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgb(163,163,163)',
  },
  bottomParagraph: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: 'rgb(169,169,169)',
    width: 331,
    textAlign: 'left',
    marginTop: 12,
    marginBottom: 12,
    lineHeight: 18,
    letterSpacing: 0.2,
    height: 104,
    alignSelf: 'center',
  },
  link: {
    color: COLORS.GREENY_BLUE_TWO,
    textDecorationLine: 'none',
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
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 0,
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
  errorText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: 'rgb(233,128,128)',
    letterSpacing: 0.2,
    width: 253,
    height: 23,
    textAlign: 'left',
  },
}); 