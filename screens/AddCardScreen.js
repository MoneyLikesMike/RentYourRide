import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { usePaymentMethods } from '../context/PaymentMethodsContext';
import { detectCardBrand } from '../utils/paymentMethodUtils';
import { navigateAfterPaymentMethodSaved } from '../utils/navigateAfterPaymentSave';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;

const COUNTRIES = [
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
];

export default function AddCardScreen({ navigation, route }) {
  const { addPaymentMethod, updatePaymentMethod, methods } = usePaymentMethods();
  const editId = route.params?.editId;
  const existing = useMemo(
    () => (editId ? methods.find((m) => m.id === editId && m.type === 'card') : null),
    [editId, methods]
  );

  const [country, setCountry] = useState('US');
  const [showDropdown, setShowDropdown] = useState(false);
  const [cardholder, setCardholder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expDate, setExpDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [zip, setZip] = useState('');

  useEffect(() => {
    if (!existing) return;
    setCardholder(existing.cardholderName || '');
    setExpDate(existing.expDate || '');
    setCountry(existing.country || 'US');
    setZip(existing.zip || '');
    setCardNumber('');
  }, [existing]);

  const zipLabel = country === 'US' ? 'ZIP CODE' : 'POSTAL CODE';
  const zipPlaceholder = country === 'US' ? 'Zip Code' : 'Postal Code';

  const handleAddCard = () => {
    const name = cardholder.trim();
    const exp = expDate.trim();
    const z = zip.trim();

    if (!name) {
      Alert.alert('Missing name', 'Please enter the cardholder name.');
      return;
    }
    if (!exp || exp.length < 4) {
      Alert.alert('Invalid expiry', 'Please enter the expiration date (MM/YY).');
      return;
    }
    if (!z) {
      Alert.alert('Missing postal code', `Please enter your ${country === 'US' ? 'ZIP' : 'postal'} code.`);
      return;
    }

    if (existing) {
      const digits = cardNumber.replace(/\D/g, '');
      const partial = {
        cardholderName: name,
        expDate: exp,
        country,
        zip: z,
      };
      if (digits.length >= 13) {
        partial.brand = detectCardBrand(digits);
        partial.last4 = digits.slice(-4);
      }
      updatePaymentMethod(existing.id, partial);
      navigateAfterPaymentMethodSaved(navigation, {
        returnAfterPayment: route.params?.returnAfterPayment === true,
        isEdit: true,
      });
      return;
    }

    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length < 13) {
      Alert.alert('Invalid card', 'Please enter a valid card number.');
      return;
    }
    const cvcDigits = cvc.replace(/\D/g, '');
    if (cvcDigits.length < 3) {
      Alert.alert('Invalid CVC', 'Please enter the security code.');
      return;
    }

    addPaymentMethod({
      type: 'card',
      brand: detectCardBrand(digits),
      last4: digits.slice(-4),
      cardholderName: name,
      expDate: exp,
      country,
      zip: z,
    });
    navigateAfterPaymentMethodSaved(navigation, {
      returnAfterPayment: route.params?.returnAfterPayment === true,
      isEdit: false,
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Svg width={23} height={23} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke={COLORS.MANGO_TWO} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <View style={styles.headerTextFlexWrapper}>
          <Text style={styles.headerText}>{existing ? 'EDIT CARD' : 'ADD CARD'}</Text>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>
      {/* Cardholder Name */}
      <Text style={styles.inputHeader}>CARDHOLDER NAME</Text>
      <View style={styles.inputBox}>
        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor="rgba(0,0,0,0.33)"
          value={cardholder}
          onChangeText={setCardholder}
        />
      </View>
      {/* Card Number */}
      <Text style={styles.inputHeader}>CARD NUMBER</Text>
      {existing ? (
        <View style={[styles.inputBox, styles.maskedCardBox]}>
          <Text style={styles.maskedCardText}>XXXX - {existing.last4}</Text>
        </View>
      ) : null}
      {existing ? (
        <>
          <Text style={styles.replaceHint}>Enter a new card number below only if you want to replace this card.</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              placeholder="New card number (optional)"
              placeholderTextColor="rgba(0,0,0,0.33)"
              keyboardType="number-pad"
              value={cardNumber}
              onChangeText={setCardNumber}
            />
          </View>
        </>
      ) : (
        <View style={styles.inputBox}>
          <TextInput
            style={styles.input}
            placeholder="Card Number"
            placeholderTextColor="rgba(0,0,0,0.33)"
            keyboardType="number-pad"
            value={cardNumber}
            onChangeText={setCardNumber}
          />
        </View>
      )}
      {/* Exp Date & CVC */}
      <View style={styles.rowInputs}>
        <View style={{ width: 180 * scale, marginRight: 8 * scale }}>
          <Text style={styles.inputHeaderSmall}>EXP. DATE</Text>
          <View style={styles.inputBoxExpDate}>
            <TextInput
              style={styles.input}
              placeholder="XX / XX"
              placeholderTextColor="rgba(0,0,0,0.33)"
              value={expDate}
              onChangeText={setExpDate}
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>
        </View>
        <View style={{ width: 143 * scale, marginLeft: 8 * scale }}>
          <Text style={styles.inputHeaderSmall}>CVC</Text>
          <View style={styles.inputBoxCvc}>
            <TextInput
              style={styles.input}
              placeholder={existing ? '—' : 'XXX'}
              placeholderTextColor="rgba(0,0,0,0.33)"
              value={cvc}
              onChangeText={setCvc}
              keyboardType="number-pad"
              maxLength={4}
              editable={!existing}
            />
          </View>
        </View>
      </View>
      {/* Country Dropdown */}
      <Text style={styles.inputHeader}>COUNTRY</Text>
      <TouchableOpacity style={styles.inputBox} onPress={() => setShowDropdown(!showDropdown)}>
        <View style={styles.countryRow}>
          <Text style={styles.countryText}>{COUNTRIES.find(c => c.code === country).label}</Text>
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
      {/* Zip/Postal Code */}
      <Text style={styles.inputHeader}>{zipLabel}</Text>
      <View style={styles.inputBox}>
        <TextInput
          style={styles.input}
          placeholder={zipPlaceholder}
          placeholderTextColor="rgba(0,0,0,0.33)"
          value={zip}
          onChangeText={setZip}
        />
      </View>
      {/* Add Card Button */}
      <TouchableOpacity style={styles.addButton} onPress={handleAddCard}>
        <Text style={styles.addButtonText}>{existing ? 'Save' : 'Add Card'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    width: SCREEN_WIDTH,
    paddingHorizontal: 22 * scale,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32 * scale,
  },
  backButton: {
    marginRight: 16,
  },
  headerTextFlexWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRightSpacer: {
    width: 39,
  },
  headerText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.2,
    textAlign: 'center',
    width: 83 * scale,
    height: 20 * scale,
  },
  inputHeader: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11,
    color: '#000',
    letterSpacing: 0.2,
    width: 114 * scale,
    height: 15 * scale,
    textAlign: 'left',
    opacity: 0.7,
    marginBottom: 6 * scale,
    marginTop: 10 * scale,
  },
  inputHeaderSmall: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11,
    color: '#000',
    letterSpacing: 0.2,
    width: 56 * scale,
    height: 15 * scale,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 6 * scale,
    marginTop: 10 * scale,
  },
  inputBox: {
    width: 331 * scale,
    height: 49 * scale,
    backgroundColor: 'rgba(249,249,249,0.34)',
    borderRadius: 5 * scale,
    borderWidth: 1,
    borderColor: 'rgb(163,163,163)',
    justifyContent: 'center',
    marginBottom: 12 * scale,
    opacity: 1,
  },
  inputBoxExpDate: {
    width: 180 * scale,
    height: 49 * scale,
    backgroundColor: 'rgba(249,249,249,0.34)',
    borderRadius: 5 * scale,
    borderWidth: 1,
    borderColor: 'rgb(163,163,163)',
    justifyContent: 'center',
    marginBottom: 12 * scale,
    opacity: 1,
  },
  inputBoxCvc: {
    width: 143 * scale,
    height: 49 * scale,
    backgroundColor: 'rgba(249,249,249,0.34)',
    borderRadius: 5 * scale,
    borderWidth: 1,
    borderColor: 'rgb(163,163,163)',
    justifyContent: 'center',
    marginBottom: 12 * scale,
    opacity: 1,
  },
  input: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: '#000',
    letterSpacing: 0.2,
    paddingHorizontal: 16 * scale,
    opacity: 1,
    height: 18 * scale,
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12 * scale,
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
    top: 370 * scale,
    left: 22 * scale,
    width: 331 * scale,
    backgroundColor: '#fff',
    borderRadius: 5 * scale,
    borderWidth: 1,
    borderColor: 'rgb(163,163,163)',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12 * scale,
    paddingHorizontal: 16 * scale,
  },
  maskedCardBox: {
    justifyContent: 'center',
  },
  maskedCardText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: '#000',
    letterSpacing: 0.2,
    paddingHorizontal: 16 * scale,
  },
  replaceHint: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: '#8E8E8E',
    marginBottom: 8 * scale,
    marginTop: -4 * scale,
  },
  addButton: {
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 8 * scale,
    paddingVertical: 12 * scale,
    paddingHorizontal: 32 * scale,
    alignItems: 'center',
    marginTop: 12 * scale,
  },
  addButtonText: {
    color: '#fff',
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    letterSpacing: 0.2,
  },
}); 