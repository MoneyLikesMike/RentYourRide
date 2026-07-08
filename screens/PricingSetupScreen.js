import React, { useState, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  TextInput,
  Switch,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useListings } from '../context/ListingsContext';
import { useSaveListingStep } from '../hooks/useSaveListingStep';

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375;

const DISCOUNT_OPTIONS = ['5%', '10%', '15%', '20%', '25%', '30%', '35%', '40%', '45%', '50%', '55%', '60%', '65%', '70%'];

/** $0.25/km through $1.00/km in $0.05 steps */
const KM_OVERAGE_OPTIONS = (() => {
  const opts = [];
  for (let cents = 25; cents <= 100; cents += 5) {
    opts.push(cents / 100);
  }
  return opts;
})();

const formatKmOverageLabel = (fee) => `$${Number(fee).toFixed(2)}/km`;

const PricingSetupScreen = ({ navigation }) => {
  const { editingListingId, draft } = useListings();
  const { saveStep, saving } = useSaveListingStep();
  const insets = useSafeAreaInsets();
  const [dailyPrice, setDailyPrice] = useState('');
  const [deliveryOn, setDeliveryOn] = useState(false);
  const [deliveryPrice, setDeliveryPrice] = useState('');
  const [weeklyDiscount, setWeeklyDiscount] = useState('');
  const [monthlyDiscount, setMonthlyDiscount] = useState('');
  const [kmOverageFee, setKmOverageFee] = useState(0.25);
  const [showWeeklyPicker, setShowWeeklyPicker] = useState(false);
  const [showMonthlyPicker, setShowMonthlyPicker] = useState(false);
  const [showKmOveragePicker, setShowKmOveragePicker] = useState(false);
  const [overlayLayout, setOverlayLayout] = useState(null);
  const [openDropdownKey, setOpenDropdownKey] = useState(null); // 'weekly' | 'monthly' | 'kmOverage' | null
  const [helpModalContent, setHelpModalContent] = useState(null);

  const weeklyRef = useRef(null);
  const monthlyRef = useRef(null);
  const kmOverageRef = useRef(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useFocusEffect(
    useCallback(() => {
      if (!editingListingId) return;
      const d = draftRef.current;
      if (d.pricePerDay != null && d.pricePerDay !== '') {
        setDailyPrice(String(d.pricePerDay));
      }
      if (d.weeklyDiscount != null && d.weeklyDiscount !== '') {
        setWeeklyDiscount(String(d.weeklyDiscount));
      }
      if (d.monthlyDiscount != null && d.monthlyDiscount !== '') {
        setMonthlyDiscount(String(d.monthlyDiscount));
      }
      if (typeof d.kmOverageFee === 'number') {
        setKmOverageFee(d.kmOverageFee);
      }
      if (d.deliveryPrice != null && Number(d.deliveryPrice) > 0) {
        setDeliveryOn(true);
        setDeliveryPrice(String(d.deliveryPrice));
      }
    }, [editingListingId])
  );

  const handleDailyPriceChange = (text) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    setDailyPrice(digitsOnly);
  };

  const handleDeliveryPriceChange = (text) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    setDeliveryPrice(digitsOnly);
  };

  const closeAllPickers = () => {
    setShowWeeklyPicker(false);
    setShowMonthlyPicker(false);
    setShowKmOveragePicker(false);
    setOpenDropdownKey(null);
    setOverlayLayout(null);
  };

  const openDropdownWithOverlay = (wrapperRef, key, setShow) => {
    closeAllPickers();
    wrapperRef.current?.measureInWindow((x, y, width, height) => {
      setOverlayLayout({ x, y, width, height });
      setOpenDropdownKey(key);
      setShow(true);
    });
  };

  const handleContinue = async () => {
    const ok = await saveStep({
      pricePerDay: dailyPrice ? Number(dailyPrice) : null,
      kmOverageFee: typeof kmOverageFee === 'number' ? kmOverageFee : 0.25,
      deliveryPrice: deliveryOn ? (deliveryPrice ? Number(deliveryPrice) : 0) : 0,
      weeklyDiscount,
      monthlyDiscount,
    });
    if (!ok) return;
    if (editingListingId) {
      navigation.navigate('EditYourRideScreen');
    } else {
      navigation.navigate('ExtrasLandingScreen');
    }
  };

  const renderDropdown = (label, value, setValue, show, setShow, wrapperRef, dropdownKey, onHelpPress) => (
    <View style={styles.section}>
      <View style={styles.labelRow}>
        <Text style={styles.sectionLabel}>{label}</Text>
        <TouchableOpacity
          style={styles.helpButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={onHelpPress}
        >
          <Text style={styles.helpText}>?</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.dropdownWrapper} ref={wrapperRef} collapsable={false}>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => openDropdownWithOverlay(wrapperRef, dropdownKey, setShow)}
        >
          <View style={styles.dropdownRow}>
            <Text style={[styles.dropdownText, { color: value ? '#000' : '#A9A9A9' }]}>{value || 'Select'}</Text>
            <View style={{ flex: 1 }} />
            <Image
              source={show && openDropdownKey === dropdownKey ? require('../assets/icons/dropDownUp.png') : require('../assets/icons/dropDownDown.png')}
              style={styles.dropdownArrow}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
      </View>
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
          <Text style={styles.headerTitle}>PRICING</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="never"
      >
        {/* Daily Price */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionLabel}>DAILY PRICE</Text>
            <TouchableOpacity
              style={styles.helpButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => setHelpModalContent({
                title: 'DAILY PRICE',
                body: 'Set your daily rental rate. Enter a whole number only (no decimals).',
              })}
            >
              <Text style={styles.helpText}>?</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Price"
              placeholderTextColor="#A9A9A9"
              value={dailyPrice}
              onChangeText={handleDailyPriceChange}
              keyboardType="number-pad"
            />
          </View>
          <Text style={styles.helperText}>Type in no decimals allowed</Text>
        </View>

        {/* KM overage fee */}
        {renderDropdown(
          'KM OVERAGE FEE',
          formatKmOverageLabel(kmOverageFee),
          setKmOverageFee,
          showKmOveragePicker,
          setShowKmOveragePicker,
          kmOverageRef,
          'kmOverage',
          () =>
            setHelpModalContent({
              title: 'KM OVERAGE FEE',
              body: 'Guests get a daily kilometre allowance with each trip. This is the price per kilometre they pay if they go over that allowance. You can choose any rate from $0.25/km up to $1.00/km.',
            })
        )}

        {/* Delivery */}
        <View style={[styles.section, { marginBottom: 0 }]}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionLabel}>DELIVERY</Text>
            <TouchableOpacity
              style={styles.helpButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => setHelpModalContent({
                title: 'DELIVERY',
                body: 'Turn on delivery to allow guests to have the vehicle delivered to them. Delivery includes both drop off and pick up. You can set the delivery price when this is enabled.',
              })}
            >
              <Text style={styles.helpText}>?</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <Switch
              value={deliveryOn}
              onValueChange={setDeliveryOn}
              trackColor={{ false: '#E0E0E0', true: COLORS.GREENY_BLUE_TWO }}
              thumbColor="#fff"
            />
          </View>
          {deliveryOn && (
            <>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Delivery price"
                  placeholderTextColor="#A9A9A9"
                  value={deliveryPrice}
                  onChangeText={handleDeliveryPriceChange}
                  keyboardType="number-pad"
                />
              </View>
              <Text style={styles.helperText}>Type in no decimals allowed</Text>
            </>
          )}
        </View>

        <View style={styles.divider} />

        {renderDropdown(
          'WEEKLY DISCOUNT',
          weeklyDiscount,
          setWeeklyDiscount,
          showWeeklyPicker,
          setShowWeeklyPicker,
          weeklyRef,
          'weekly',
          () => setHelpModalContent({
            title: 'WEEKLY DISCOUNT',
            body: 'Offer a discount for guests who rent for a week or longer. This can help attract longer bookings.',
          })
        )}

        {renderDropdown(
          'MONTHLY DISCOUNT',
          monthlyDiscount,
          setMonthlyDiscount,
          showMonthlyPicker,
          setShowMonthlyPicker,
          monthlyRef,
          'monthly',
          () => setHelpModalContent({
            title: 'MONTHLY DISCOUNT',
            body: 'Offer a discount for guests who rent for a month or longer. Monthly rentals can provide more stable income.',
          })
        )}
      </ScrollView>

      <Modal
        visible={openDropdownKey != null}
        transparent
        animationType="fade"
        onRequestClose={closeAllPickers}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeAllPickers}>
          {overlayLayout && openDropdownKey && (
            <View
              style={[
                styles.overlayDropdownMenu,
                {
                  left: overlayLayout.x,
                  top: overlayLayout.y + overlayLayout.height,
                  width: overlayLayout.width,
                },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <ScrollView
                style={{ maxHeight: 180 * scale }}
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                {openDropdownKey === 'kmOverage'
                  ? KM_OVERAGE_OPTIONS.map((fee) => (
                      <TouchableOpacity
                        key={fee}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setKmOverageFee(fee);
                          closeAllPickers();
                        }}
                      >
                        <Text style={styles.dropdownText}>{formatKmOverageLabel(fee)}</Text>
                      </TouchableOpacity>
                    ))
                  : DISCOUNT_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt}
                        style={styles.dropdownItem}
                        onPress={() => {
                          if (openDropdownKey === 'weekly') setWeeklyDiscount(opt);
                          else setMonthlyDiscount(opt);
                          closeAllPickers();
                        }}
                      >
                        <Text style={styles.dropdownText}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
              </ScrollView>
            </View>
          )}
        </Pressable>
      </Modal>

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
        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.7 }]}
          onPress={handleContinue}
          activeOpacity={0.8}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>{editingListingId ? 'SAVE' : 'CONTINUE'}</Text>
          )}
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
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginTop: 25,
    marginBottom: 24 * scale,
    marginHorizontal: 4,
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
  dropdownWrapper: {
    position: 'relative',
    width: 331 * scale,
  },
  dropdownButton: {
    width: 331 * scale,
    height: 49 * scale,
    backgroundColor: 'rgba(249, 249, 249, 0.34)',
    borderRadius: 5 * scale,
    borderWidth: 1 * scale,
    borderColor: 'rgb(163, 163, 163)',
    justifyContent: 'center',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12 * scale,
  },
  dropdownText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: '#000',
    letterSpacing: 0.2,
    opacity: 0.7,
  },
  dropdownArrow: {
    width: 16 * scale,
    height: 16 * scale,
    marginRight: 8 * scale,
    tintColor: '#6ED2D0',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12 * scale,
    paddingHorizontal: 16 * scale,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  overlayDropdownMenu: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 5 * scale,
    borderWidth: 1 * scale,
    borderColor: 'rgb(163, 163, 163)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
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

export default PricingSetupScreen;
