import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { getMe, patchMe } from '../services/usersApi';
import GooglePlacesAutocompleteField from '../components/GooglePlacesAutocompleteField';

export default function ChangeAddressScreen({ navigation }) {
  const [addressLine, setAddressLine] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressCountry, setAddressCountry] = useState('');
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const me = await getMe();
          if (cancelled) return;
          setAddressLine(me.addressLine || '');
          setAddressCity(me.addressCity || '');
          setAddressCountry(me.addressCountry || '');
        } catch (_) {
          /* offline */
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const handleSave = async () => {
    setBusy(true);
    try {
      await patchMe({
        addressLine: addressLine.trim(),
        addressCity: addressCity.trim(),
        addressCountry: addressCountry.trim(),
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Save failed', e?.message || 'Could not update address.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>ADDRESS</Text>
        <TouchableOpacity onPress={handleSave} disabled={busy}>
          <Text style={[styles.save, busy && styles.saveDisabled]}>Save</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Country</Text>
        <TextInput
          style={styles.input}
          value={addressCountry}
          onChangeText={setAddressCountry}
          placeholder="Canada"
          autoCapitalize="words"
        />
        <Text style={styles.label}>City</Text>
        <GooglePlacesAutocompleteField
          placeholder="Winnipeg"
          types="(cities)"
          onPlaceSelected={({ selection }) => {
            setAddressCity(selection.city || selection.query.split(',')[0].trim());
            if (selection.country) setAddressCountry(selection.country);
          }}
          containerStyle={styles.placesField}
        />
        <Text style={styles.label}>Street address</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={addressLine}
          onChangeText={setAddressLine}
          placeholder="123 Main St"
          multiline
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 56 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  cancel: { fontFamily: FONTS.NUNITO_SEMIBOLD, fontSize: 16, color: COLORS.GREENY_BLUE_TWO },
  title: { fontFamily: FONTS.NUNITO_BOLD, fontSize: 14, color: '#666' },
  save: { fontFamily: FONTS.NUNITO_SEMIBOLD, fontSize: 16, color: COLORS.GREENY_BLUE_TWO },
  saveDisabled: { opacity: 0.5 },
  form: { paddingHorizontal: 20, paddingBottom: 40 },
  label: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: '#666',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  placesField: { zIndex: 10, marginBottom: 4 },
});
