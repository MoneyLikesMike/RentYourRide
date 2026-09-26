import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { getMe, patchMe } from '../services/usersApi';
import GooglePlacesAutocompleteField from '../components/GooglePlacesAutocompleteField';

function formatAddressLine(parts) {
  return [
    parts.addressLine,
    parts.addressCity,
    parts.addressProvince,
    parts.addressPostalCode,
    parts.addressCountry,
  ]
    .map((p) => (p && String(p).trim()) || '')
    .filter(Boolean)
    .join(', ');
}

export default function ChangeAddressScreen({ navigation }) {
  const [display, setDisplay] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressProvince, setAddressProvince] = useState('');
  const [addressPostalCode, setAddressPostalCode] = useState('');
  const [addressCountry, setAddressCountry] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [placesKey, setPlacesKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const me = await getMe();
          if (cancelled) return;
          const next = {
            addressLine: me.addressLine || '',
            addressCity: me.addressCity || '',
            addressProvince: me.addressProvince || '',
            addressPostalCode: me.addressPostalCode || '',
            addressCountry: me.addressCountry || '',
          };
          setAddressLine(next.addressLine);
          setAddressCity(next.addressCity);
          setAddressProvince(next.addressProvince);
          setAddressPostalCode(next.addressPostalCode);
          setAddressCountry(next.addressCountry);
          setDisplay(formatAddressLine(next));
          setPlacesKey((k) => k + 1);
        } catch (_) {
          /* offline */
        } finally {
          if (!cancelled) setLoaded(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const onPlaceSelected = ({ selection }) => {
    const street =
      selection.street ||
      selection.query.split(',')[0]?.trim() ||
      selection.query ||
      '';
    const next = {
      addressLine: street,
      addressCity: selection.city || '',
      addressProvince: selection.province || selection.region || '',
      addressPostalCode: selection.postalCode || '',
      addressCountry: selection.country || '',
    };
    setAddressLine(next.addressLine);
    setAddressCity(next.addressCity);
    setAddressProvince(next.addressProvince);
    setAddressPostalCode(next.addressPostalCode);
    setAddressCountry(next.addressCountry);
    setDisplay(selection.query || formatAddressLine(next));
  };

  const handleSave = async () => {
    if (!addressLine.trim() && !display.trim()) {
      Alert.alert('Address required', 'Search and select an address to continue.');
      return;
    }
    setBusy(true);
    try {
      await patchMe({
        addressLine: addressLine.trim() || display.trim(),
        addressCity: addressCity.trim(),
        addressProvince: addressProvince.trim(),
        addressPostalCode: addressPostalCode.trim(),
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
        <Text style={styles.title}>CHANGE ADDRESS</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.form}>
        <Text style={styles.paragraph}>
          Start typing and pick your address from the suggestions.
        </Text>
        <Text style={styles.label}>ADDRESS</Text>
        {loaded ? (
          <GooglePlacesAutocompleteField
            key={`addr-${placesKey}`}
            placeholder="Street address, city…"
            types="address"
            initialValue={display}
            onChangeText={setDisplay}
            onPlaceSelected={onPlaceSelected}
            containerStyle={styles.placesField}
          />
        ) : (
          <ActivityIndicator color={COLORS.GREENY_BLUE_TWO} style={styles.loader} />
        )}
      </View>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.saveButton, busy && styles.saveDisabled]}
          onPress={() => void handleSave()}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
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
    marginBottom: 8,
  },
  backButton: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerSpacer: { width: 40 },
  title: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 13,
    color: 'rgb(14,38,43)',
    letterSpacing: 0.6,
  },
  form: { paddingHorizontal: 20, flex: 1 },
  paragraph: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: 'rgb(142,142,142)',
    marginBottom: 20,
    lineHeight: 22,
  },
  label: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: '#666',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  placesField: { zIndex: 20 },
  loader: { marginTop: 16 },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  saveButton: {
    width: 250,
    height: 50,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDisabled: { opacity: 0.7 },
  saveButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16,
    color: 'rgb(247,247,247)',
  },
});
