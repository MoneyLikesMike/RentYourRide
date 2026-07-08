import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { CardField } from '@stripe/stripe-react-native';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import GooglePlacesAutocompleteField from '../components/GooglePlacesAutocompleteField';
import { usePaymentMethods } from '../context/PaymentMethodsContext';
import { useAuth } from '../context/AuthContext';
import { detectCardBrand } from '../utils/paymentMethodUtils';
import { navigateAfterPaymentMethodSaved } from '../utils/navigateAfterPaymentSave';
import { isStripeConfigured } from '../constants/stripe';
import { useSavePaymentCard } from '../hooks/useSavePaymentCard';

function AddCardStripeBridge(props) {
  const { saveCard } = useSavePaymentCard();
  return <AddCardForm {...props} saveCard={saveCard} />;
}

export default function AddCardScreen(props) {
  const { isAuthenticated, isReady } = useAuth();
  const stripeFlow = isAuthenticated && isReady && isStripeConfigured();
  if (stripeFlow) {
    return <AddCardStripeBridge {...props} />;
  }
  return <AddCardForm {...props} saveCard={null} />;
}

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;

const COUNTRIES = [
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
];

/** Stripe CardField on iOS only accepts hex colors (rgba parses as black). */
const CARD_FIELD_STYLE = {
  backgroundColor: '#FFFFFF',
  textColor: '#000000',
  placeholderColor: '#545454',
  borderColor: '#A3A3A3',
  borderWidth: 1,
  borderRadius: 5,
  fontSize: 13,
};

function AddCardForm({ navigation, route, saveCard }) {
  const { addPaymentMethod, updatePaymentMethod, methods, refreshFromApi } =
    usePaymentMethods();
  const { isAuthenticated, isReady } = useAuth();
  const editId = route.params?.editId;
  const existing = useMemo(
    () => (editId ? methods.find((m) => m.id === editId && m.type === 'card') : null),
    [editId, methods]
  );

  const useStripeCard =
    Boolean(saveCard) &&
    isAuthenticated &&
    isReady &&
    (!existing || existing.id?.startsWith('pm_'));

  const [country, setCountry] = useState('US');
  const [showDropdown, setShowDropdown] = useState(false);
  const [cardholder, setCardholder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expDate, setExpDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [address, setAddress] = useState('');
  const [zip, setZip] = useState('');
  const [cardComplete, setCardComplete] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setCardholder(existing.cardholderName || '');
    setExpDate(existing.expDate || '');
    setCountry(existing.country || 'US');
    setAddress(existing.address || '');
    setZip(existing.zip || '');
    setCardNumber('');
  }, [existing]);

  const zipLabel = country === 'US' ? 'ZIP CODE' : 'POSTAL CODE';
  const zipPlaceholder = country === 'US' ? 'Zip Code' : 'Postal Code';

  const handleBillingAddressSelected = useCallback(({ selection }) => {
    const street =
      selection.street ||
      selection.query.split(',')[0]?.trim() ||
      selection.query;
    setAddress(street);
    if (selection.postalCode) {
      setZip(selection.postalCode.replace(/\s+/g, ' ').trim());
    }
    const code = (selection.countryCode || '').toUpperCase();
    if (code === 'US' || code === 'CA') {
      setCountry(code);
    }
    setShowDropdown(false);
  }, []);

  const finishSave = (isEdit) => {
    navigateAfterPaymentMethodSaved(navigation, {
      returnAfterPayment: route.params?.returnAfterPayment === true,
      isEdit,
    });
  };

  const handleAddCard = async () => {
    const name = cardholder.trim();
    const exp = expDate.trim();
    const street = address.trim();
    const z = zip.trim();

    if (!name) {
      Alert.alert('Missing name', 'Please enter the cardholder name.');
      return;
    }
    if (!street) {
      Alert.alert('Missing address', 'Please enter your billing address.');
      return;
    }
    if (!useStripeCard && (!exp || exp.length < 4)) {
      Alert.alert('Invalid expiry', 'Please enter the expiration date (MM/YY).');
      return;
    }
    if (!z) {
      Alert.alert('Missing postal code', `Please enter your ${country === 'US' ? 'ZIP' : 'postal'} code.`);
      return;
    }

    if (existing && !useStripeCard) {
      const digits = cardNumber.replace(/\D/g, '');
      const partial = {
        cardholderName: name,
        expDate: exp,
        address: street,
        country,
        zip: z,
      };
      if (digits.length >= 13) {
        partial.brand = detectCardBrand(digits);
        partial.last4 = digits.slice(-4);
      }
      updatePaymentMethod(existing.id, partial);
      finishSave(true);
      return;
    }

    const replacingStripeCard = useStripeCard && existing && cardComplete;
    const addingStripeCard = useStripeCard && !existing;

    if (addingStripeCard || replacingStripeCard) {
      if (!cardComplete) {
        Alert.alert('Incomplete card', 'Please enter your full card details.');
        return;
      }
      setSaving(true);
      try {
        const paymentMethodId = await saveCard({
          billingDetails: {
            name,
            address: { line1: street, postalCode: z, country },
          },
        });
        await refreshFromApi();
        if (paymentMethodId) {
          await addPaymentMethod({ type: 'card', paymentMethodId });
        }
        finishSave(!!existing);
      } catch (e) {
        if (e?.code === 'STRIPE_NOT_CONFIGURED') {
          Alert.alert(
            'Payments unavailable',
            'Add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY on the API to save cards securely.',
          );
        } else {
          Alert.alert('Could not save card', e?.message || 'Try again later.');
        }
      } finally {
        setSaving(false);
      }
      return;
    }

    if (existing && useStripeCard) {
      updatePaymentMethod(existing.id, {
        cardholderName: name,
        address: street,
        country,
        zip: z,
      });
      finishSave(true);
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

    setSaving(true);
    try {
      await addPaymentMethod({
        type: 'card',
        brand: detectCardBrand(digits),
        last4: digits.slice(-4),
        cardholderName: name,
        expDate: exp,
        address: street,
        country,
        zip: z,
      });
      finishSave(false);
    } catch (e) {
      Alert.alert('Could not save card', e?.message || 'Try again later.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
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

      <Text style={styles.inputHeader}>CARDHOLDER NAME</Text>
      <View style={styles.inputBox}>
        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor="rgba(0,0,0,0.33)"
          value={cardholder}
          onChangeText={setCardholder}
          editable={!saving}
        />
      </View>

      <Text style={styles.inputHeader}>CARD NUMBER</Text>
      {existing && !useStripeCard ? (
        <View style={[styles.inputBox, styles.maskedCardBox]}>
          <Text style={styles.maskedCardText}>XXXX - {existing.last4}</Text>
        </View>
      ) : null}
      {existing && !useStripeCard ? (
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
              editable={!saving}
            />
          </View>
        </>
      ) : null}

      {useStripeCard ? (
        <>
          {existing ? (
            <View style={[styles.inputBox, styles.maskedCardBox, { marginBottom: 8 * scale }]}>
              <Text style={styles.maskedCardText}>XXXX - {existing.last4}</Text>
            </View>
          ) : null}
          {existing ? (
            <Text style={styles.replaceHint}>Enter new card details below to replace this card on file.</Text>
          ) : null}
          <View style={styles.cardFieldBox}>
            <CardField
              postalCodeEnabled={false}
              placeholders={{ number: '4242 4242 4242 4242' }}
              cardStyle={CARD_FIELD_STYLE}
              style={styles.cardField}
              onCardChange={(details) => setCardComplete(Boolean(details.complete))}
            />
          </View>
        </>
      ) : !existing ? (
        <View style={styles.inputBox}>
          <TextInput
            style={styles.input}
            placeholder="Card Number"
            placeholderTextColor="rgba(0,0,0,0.33)"
            keyboardType="number-pad"
            value={cardNumber}
            onChangeText={setCardNumber}
            editable={!saving}
          />
        </View>
      ) : null}

      {!useStripeCard ? (
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
                editable={!saving}
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
                editable={!existing && !saving}
              />
            </View>
          </View>
        </View>
      ) : null}

      <Text style={styles.inputHeader}>ADDRESS</Text>
      <View style={styles.addressSection}>
        <GooglePlacesAutocompleteField
          key={existing?.id || 'new-card-address'}
          placeholder="Street address"
          types="address"
          initialValue={address}
          onChangeText={setAddress}
          onPlaceSelected={handleBillingAddressSelected}
          containerStyle={styles.addressPlacesField}
          inputStyle={styles.placesInput}
        />
      </View>

      <View style={styles.countrySection}>
        <Text style={styles.inputHeader}>COUNTRY</Text>
        <TouchableOpacity
          style={styles.inputBox}
          onPress={() => setShowDropdown(!showDropdown)}
          disabled={saving}
        >
          <View style={styles.countryRow}>
            <Text style={styles.countryText}>{COUNTRIES.find((c) => c.code === country).label}</Text>
          </View>
        </TouchableOpacity>
        {showDropdown && (
          <View style={styles.dropdownMenu}>
            {COUNTRIES.map((c) => (
              <TouchableOpacity
                key={c.code}
                style={styles.dropdownItem}
                onPress={() => {
                  setCountry(c.code);
                  setShowDropdown(false);
                }}
              >
                <Text style={styles.countryText}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <Text style={styles.inputHeader}>{zipLabel}</Text>
      <View style={styles.inputBox}>
        <TextInput
          style={styles.input}
          placeholder={zipPlaceholder}
          placeholderTextColor="rgba(0,0,0,0.33)"
          value={zip}
          onChangeText={setZip}
          editable={!saving}
        />
      </View>

      {useStripeCard ? (
        <Text style={styles.secureNote}>Card details are encrypted by Stripe and never stored on our servers.</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.addButton, saving && styles.addButtonDisabled]}
        onPress={handleAddCard}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.addButtonText}>{existing ? 'Save' : 'Add Card'}</Text>
        )}
      </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    width: SCREEN_WIDTH,
  },
  scrollContent: {
    paddingHorizontal: 22 * scale,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40 * scale,
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
  cardFieldBox: {
    width: 331 * scale,
    marginBottom: 12 * scale,
  },
  cardField: {
    width: 331 * scale,
    height: 49 * scale,
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
  countrySection: {
    zIndex: 1,
  },
  addressSection: {
    zIndex: 20,
    marginBottom: 12 * scale,
  },
  addressPlacesField: {
    width: 331 * scale,
  },
  placesInput: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: '#000',
    backgroundColor: 'rgba(249,249,249,0.34)',
    borderColor: 'rgb(163,163,163)',
    borderWidth: 1,
    borderRadius: 5 * scale,
    height: 49 * scale,
    paddingHorizontal: 16 * scale,
  },
  dropdownMenu: {
    width: 331 * scale,
    backgroundColor: '#fff',
    borderRadius: 5 * scale,
    borderWidth: 1,
    borderColor: 'rgb(163,163,163)',
    marginTop: -8 * scale,
    marginBottom: 12 * scale,
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
  secureNote: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: '#8E8E8E',
    marginBottom: 8 * scale,
    lineHeight: 16,
  },
  addButton: {
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 8 * scale,
    paddingVertical: 12 * scale,
    paddingHorizontal: 32 * scale,
    alignItems: 'center',
    marginTop: 12 * scale,
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  addButtonText: {
    color: '#fff',
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
