import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { getMe, patchMe } from '../services/usersApi';

export default function ChangeLicenseScreen({ navigation }) {
  const [licenseNumber, setLicenseNumber] = useState('');
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const me = await getMe();
          if (!cancelled) setLicenseNumber(me.licenseNumber || '');
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
    const trimmed = licenseNumber.trim();
    if (!trimmed) {
      Alert.alert('License required', 'Enter your driver license number.');
      return;
    }
    setBusy(true);
    try {
      await patchMe({ licenseNumber: trimmed });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Save failed', e?.message || 'Could not update license.');
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
        <Text style={styles.title}>LICENSE</Text>
        <TouchableOpacity onPress={handleSave} disabled={busy}>
          <Text style={[styles.save, busy && styles.saveDisabled]}>Save</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.form}>
        <Text style={styles.label}>Driver license number</Text>
        <TextInput
          style={styles.input}
          value={licenseNumber}
          onChangeText={setLicenseNumber}
          placeholder="D1234-56789-00000"
          autoCapitalize="characters"
        />
        <Text style={styles.hint}>
          For identity verification, use Verify my license on the license verification screen. You can
          also save a license number here for your profile.
        </Text>
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
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { fontFamily: FONTS.NUNITO_BOLD, fontSize: 15, color: 'rgb(100,100,100)' },
  cancel: { fontFamily: FONTS.NUNITO_SEMIBOLD, fontSize: 16, color: COLORS.MANGO_TWO },
  save: { fontFamily: FONTS.NUNITO_BOLD, fontSize: 16, color: COLORS.GREENY_BLUE_TWO },
  saveDisabled: { opacity: 0.5 },
  form: { paddingHorizontal: 24 },
  label: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12,
    color: COLORS.GREENY_BLUE_TWO,
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontFamily: FONTS.NUNITO_REGULAR,
    fontSize: 16,
  },
  hint: {
    marginTop: 16,
    fontFamily: FONTS.NUNITO_REGULAR,
    fontSize: 13,
    color: 'rgb(142,142,142)',
    lineHeight: 18,
  },
});
