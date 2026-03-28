import React, { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  TextInput,
  Switch,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useListings } from '../context/ListingsContext';

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375;

const EXTRAS = [
  { key: 'fuel', label: 'PRE PAID FUEL', helpTitle: 'PRE PAID FUEL', helpBody: 'Offer a pre-paid fuel option so guests can return the vehicle with a full tank without a separate refuel stop. Set the price you charge for this add-on.' },
  { key: 'cleaning', label: 'PRE PAID CLEANING', helpTitle: 'PRE PAID CLEANING', helpBody: 'Offer a pre-paid cleaning option so the vehicle is returned detailed. Set the price you charge for this add-on.' },
  { key: 'unlimitedKm', label: 'UNLIMITED KILOMETRES', helpTitle: 'UNLIMITED KILOMETRES', helpBody: 'Allow guests to drive without a daily kilometre limit for an extra fee. This can attract renters planning longer trips. Set the price for this add-on.' },
];

const ExtrasSetupScreen = ({ navigation }) => {
  const { editingListingId, draft, setDraftListing } = useListings();
  const insets = useSafeAreaInsets();
  const [fuelOn, setFuelOn] = useState(false);
  const [fuelPrice, setFuelPrice] = useState('');
  const [cleaningOn, setCleaningOn] = useState(false);
  const [cleaningPrice, setCleaningPrice] = useState('');
  const [unlimitedKmOn, setUnlimitedKmOn] = useState(false);
  const [unlimitedKmPrice, setUnlimitedKmPrice] = useState('');
  const [helpModalContent, setHelpModalContent] = useState(null);

  const draftRef = useRef(draft);
  draftRef.current = draft;

  useFocusEffect(
    useCallback(() => {
      if (!editingListingId) return;
      const d = draftRef.current;
      if (d.extrasFuelOn !== undefined) setFuelOn(!!d.extrasFuelOn);
      if (d.extrasFuelPrice != null && d.extrasFuelPrice !== '') setFuelPrice(String(d.extrasFuelPrice));
      if (d.extrasCleaningOn !== undefined) setCleaningOn(!!d.extrasCleaningOn);
      if (d.extrasCleaningPrice != null && d.extrasCleaningPrice !== '') setCleaningPrice(String(d.extrasCleaningPrice));
      if (d.extrasUnlimitedKmOn !== undefined) setUnlimitedKmOn(!!d.extrasUnlimitedKmOn);
      if (d.extrasUnlimitedKmPrice != null && d.extrasUnlimitedKmPrice !== '') {
        setUnlimitedKmPrice(String(d.extrasUnlimitedKmPrice));
      }
    }, [editingListingId])
  );

  const handlePriceChange = (key, text) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    if (key === 'fuel') setFuelPrice(digitsOnly);
    else if (key === 'cleaning') setCleaningPrice(digitsOnly);
    else setUnlimitedKmPrice(digitsOnly);
  };

  const getPrice = (key) => {
    if (key === 'fuel') return fuelPrice;
    if (key === 'cleaning') return cleaningPrice;
    return unlimitedKmPrice;
  };

  const getOn = (key) => {
    if (key === 'fuel') return fuelOn;
    if (key === 'cleaning') return cleaningOn;
    return unlimitedKmOn;
  };

  const setOn = (key, value) => {
    if (key === 'fuel') setFuelOn(value);
    else if (key === 'cleaning') setCleaningOn(value);
    else setUnlimitedKmOn(value);
  };

  const handleContinue = () => {
    setDraftListing({
      extrasFuelOn: fuelOn,
      extrasFuelPrice: fuelPrice,
      extrasCleaningOn: cleaningOn,
      extrasCleaningPrice: cleaningPrice,
      extrasUnlimitedKmOn: unlimitedKmOn,
      extrasUnlimitedKmPrice: unlimitedKmPrice,
    });
    if (editingListingId) {
      navigation.navigate('EditYourRideScreen');
    } else {
      navigation.navigate('DescribeYourRideScreen');
    }
  };

  const renderExtraSection = (extra, sectionStyle) => (
    <View style={[styles.section, sectionStyle]} key={extra.key}>
      <View style={styles.labelRow}>
        <Text style={styles.sectionLabel}>{extra.label}</Text>
        <TouchableOpacity
          style={styles.helpButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => setHelpModalContent({ title: extra.helpTitle, body: extra.helpBody })}
        >
          <Text style={styles.helpText}>?</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <Switch
          value={getOn(extra.key)}
          onValueChange={(v) => setOn(extra.key, v)}
          trackColor={{ false: '#E0E0E0', true: COLORS.GREENY_BLUE_TWO }}
          thumbColor="#fff"
        />
      </View>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Price"
          placeholderTextColor="#A9A9A9"
          value={getPrice(extra.key)}
          onChangeText={(text) => handlePriceChange(extra.key, text)}
          keyboardType="number-pad"
        />
      </View>
      <Text style={styles.helperText}>Type in no decimals allowed</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke="#FFB131" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <View style={styles.headerTitleWrapper}>
          <Text style={styles.headerTitle}>EXTRAS</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderExtraSection(EXTRAS[0], { marginBottom: 0 })}
        <View style={styles.divider} />
        {renderExtraSection(EXTRAS[1], { marginBottom: 0 })}
        <View style={styles.divider} />
        {renderExtraSection(EXTRAS[2])}
      </ScrollView>

      <Modal
        visible={helpModalContent != null}
        transparent
        animationType="fade"
        onRequestClose={() => setHelpModalContent(null)}
      >
        <Pressable style={styles.helpModalBackdrop} onPress={() => setHelpModalContent(null)}>
          <Pressable style={styles.helpModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.helpModalHeader}>
              <Text style={styles.helpModalTitle}>{helpModalContent?.title ?? ''}</Text>
              <TouchableOpacity
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={() => setHelpModalContent(null)}
              >
                <Text style={styles.helpModalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.helpModalBody}>{helpModalContent?.body ?? ''}</Text>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={[styles.saveButtonContainer, { paddingBottom: 24 + insets.bottom }]}>
        <TouchableOpacity style={styles.saveButton} onPress={handleContinue} activeOpacity={0.8}>
          <Text style={styles.saveButtonText}>{editingListingId ? 'SAVE' : 'CONTINUE'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20 * scale,
    marginBottom: 24 * scale,
  },
  backButton: {
    padding: 10 * scale,
  },
  headerTitleWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 43 * scale,
  },
  headerTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    color: '#4A4A4A',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20 * scale,
    paddingTop: 8,
  },
  section: {
    marginBottom: 24 * scale,
    position: 'relative',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8 * scale,
  },
  sectionLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: '#4A4A4A',
    letterSpacing: 0.2,
  },
  helpButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  helpText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: '#9B9B9B',
  },
  inputWrapper: {
    width: 331 * scale,
    height: 49 * scale,
    backgroundColor: 'rgba(249, 249, 249, 0.34)',
    borderRadius: 5 * scale,
    borderWidth: 1 * scale,
    borderColor: 'rgb(163, 163, 163)',
    justifyContent: 'center',
    paddingHorizontal: 12 * scale,
  },
  input: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: '#000',
    letterSpacing: 0.2,
    padding: 0,
  },
  helperText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: '#9B9B9B',
    marginTop: 8 * scale,
    lineHeight: 18 * scale,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginTop: 25,
    marginBottom: 24 * scale,
    marginHorizontal: 4,
  },
  helpModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24 * scale,
  },
  helpModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 12 * scale,
    paddingHorizontal: 20 * scale,
    paddingTop: 20 * scale,
    paddingBottom: 24 * scale,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  helpModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14 * scale,
  },
  helpModalTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 14 * scale,
    color: '#4A4A4A',
    letterSpacing: 0.2,
  },
  helpModalClose: {
    fontSize: 18,
    color: '#9B9B9B',
    padding: 4,
  },
  helpModalBody: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: '#9B9B9B',
    lineHeight: 20 * scale,
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20 * scale,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
  },
  saveButton: {
    height: 50 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 16 * scale,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});

export default ExtrasSetupScreen;
