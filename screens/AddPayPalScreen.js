import React, { useState, useEffect } from 'react';
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
import { navigateAfterPaymentMethodSaved } from '../utils/navigateAfterPaymentSave';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
}

export default function AddPayPalScreen({ navigation, route }) {
  const { addPaymentMethod, updatePaymentMethod, methods } = usePaymentMethods();
  const editId = route.params?.editId;
  const existing = editId ? methods.find((m) => m.id === editId) : null;

  const [email, setEmail] = useState('');

  useEffect(() => {
    if (existing?.type === 'paypal' && existing.email) {
      setEmail(existing.email);
    }
  }, [existing]);

  const handleSave = () => {
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      Alert.alert('Invalid email', 'Please enter a valid PayPal email address.');
      return;
    }
    const editing = !!(editId && existing);
    if (editing) {
      updatePaymentMethod(editId, { type: 'paypal', email: trimmed });
    } else {
      addPaymentMethod({ type: 'paypal', email: trimmed });
    }
    navigateAfterPaymentMethodSaved(navigation, {
      returnAfterPayment: route.params?.returnAfterPayment === true,
      isEdit: editing,
    });
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
          <Text style={styles.headerText}>{editId ? 'EDIT PAYPAL' : 'ADD PAYPAL'}</Text>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      <Text style={styles.inputHeader}>PAYPAL EMAIL</Text>
      <View style={styles.inputBox}>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="rgba(0,0,0,0.33)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <TouchableOpacity style={styles.addButton} onPress={handleSave} activeOpacity={0.85}>
        <Text style={styles.addButtonText}>{editId ? 'Save' : 'Add PayPal'}</Text>
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
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  inputHeader: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: '#000',
    letterSpacing: 0.2,
    opacity: 0.7,
    marginBottom: 6 * scale,
  },
  inputBox: {
    width: 331 * scale,
    height: 49 * scale,
    backgroundColor: 'rgba(249,249,249,0.34)',
    borderRadius: 5 * scale,
    borderWidth: 1,
    borderColor: 'rgb(163,163,163)',
    justifyContent: 'center',
    marginBottom: 24 * scale,
  },
  input: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: '#000',
    letterSpacing: 0.2,
    paddingHorizontal: 16 * scale,
  },
  addButton: {
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 8 * scale,
    paddingVertical: 12 * scale,
    alignItems: 'center',
    marginTop: 8 * scale,
  },
  addButtonText: {
    color: '#fff',
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
