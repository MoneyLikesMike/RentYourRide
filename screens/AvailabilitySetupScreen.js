import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useListings } from '../context/ListingsContext';
import { useAuth } from '../context/AuthContext';
import { isRemoteListingId } from '../utils/listingId';
import {
  apiRangesToCalendarData,
  buildListingAvailabilityPatch,
  calendarDataToApiRanges,
} from '../utils/listingAvailability';
import { getHostListingAvailability } from '../services/listingsApi';

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375;

const ADVANCE_NOTICE_OPTIONS = ['Instant booking', '3 hours', '6 hours', '12 hours', '1 day', '2 days', '3 days'];
const TRIP_LENGTH_OPTIONS = ['1 day', '2 days', '3 days', '5 days', '1 week', '2 weeks', '1 month'];
const LONGEST_TRIP_OPTIONS = ['1 day', '2 days', '3 days', '5 days', '1 week', '2 weeks', '1 month', '2 months', '3 months', '6 months', '1 year'];
const DAILY_KM_OPTIONS = ['100 km', '200 km', '300 km', '500 km', 'Unlimited'];

const AvailabilitySetupScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { setDraftListing, editingListingId, draft, saveRemoteListingPatch } = useListings();
  const { isAuthenticated, isReady } = useAuth();
  const [savedCalendarData, setSavedCalendarData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [advanceNotice, setAdvanceNotice] = useState('');
  const [shortestTrip, setShortestTrip] = useState('');
  const [longestTrip, setLongestTrip] = useState('');
  const [dailyKm, setDailyKm] = useState('');
  const [showAdvanceNoticePicker, setShowAdvanceNoticePicker] = useState(false);
  const [showShortestPicker, setShowShortestPicker] = useState(false);
  const [showLongestPicker, setShowLongestPicker] = useState(false);
  const [showDailyKmPicker, setShowDailyKmPicker] = useState(false);
  const [overlayLayout, setOverlayLayout] = useState(null);
  const [openDropdownKey, setOpenDropdownKey] = useState(null); // 'advance'|'shortest'|'longest'|'daily'|null
  const [helpModalContent, setHelpModalContent] = useState(null); // { title, body } | null

  const advanceRef = useRef(null);
  const shortestRef = useRef(null);
  const longestRef = useRef(null);
  const dailyRef = useRef(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const remoteAvailLoadedRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      if (!editingListingId) return;
      const d = draftRef.current;
      const extras = d.extras && typeof d.extras === 'object' ? d.extras : {};
      let adv = d.advanceNotice || extras.advanceNotice || '';
      if (!adv && d.instantBooking === true) adv = 'Instant booking';
      if (adv) setAdvanceNotice(adv);
      if (d.shortestTrip || extras.shortestTrip) {
        setShortestTrip(d.shortestTrip || extras.shortestTrip);
      }
      if (d.longestTrip || extras.longestTrip) {
        setLongestTrip(d.longestTrip || extras.longestTrip);
      }
      if (d.dailyKm) setDailyKm(d.dailyKm);
      if (d.calendarData != null) setSavedCalendarData(d.calendarData);
      else if (Array.isArray(d.availability) && d.availability.length > 0) {
        setSavedCalendarData(apiRangesToCalendarData(d.availability));
      }
    }, [editingListingId])
  );

  useFocusEffect(
    useCallback(() => {
      const id = editingListingId;
      if (!id || !isRemoteListingId(id) || !isAuthenticated || !isReady) return;
      if (remoteAvailLoadedRef.current === id) return;
      remoteAvailLoadedRef.current = id;
      let cancelled = false;
      (async () => {
        try {
          const ranges = await getHostListingAvailability(id);
          if (cancelled || !Array.isArray(ranges)) return;
          const cal = apiRangesToCalendarData(ranges);
          if (cal) {
            setSavedCalendarData(cal);
            setDraftListing({ calendarData: cal, availability: ranges });
          }
        } catch {
          /* keep draft/local calendar */
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [editingListingId, isAuthenticated, isReady, setDraftListing])
  );

  const isAnyPickerOpen =
    showAdvanceNoticePicker || showShortestPicker || showLongestPicker || showDailyKmPicker;

  useEffect(() => {
    if (route.params?.calendarData) {
      setSavedCalendarData(route.params.calendarData);
      navigation.setParams({ calendarData: undefined });
    }
  }, [route.params?.calendarData]);

  useEffect(() => {
    const availability = route.params?.availabilityData;
    if (availability && typeof availability === 'object') {
      if (availability.advanceNotice !== undefined) setAdvanceNotice(availability.advanceNotice);
      if (availability.shortestTrip !== undefined) setShortestTrip(availability.shortestTrip);
      if (availability.longestTrip !== undefined) setLongestTrip(availability.longestTrip);
      if (availability.dailyKm !== undefined) setDailyKm(availability.dailyKm);
      navigation.setParams({ availabilityData: undefined });
    }
  }, [route.params?.availabilityData]);

  const handleSave = async () => {
    const ranges = calendarDataToApiRanges(savedCalendarData);
    const listingPatch = buildListingAvailabilityPatch({
      advanceNotice,
      shortestTrip,
      longestTrip,
      dailyKm,
      existingExtras: draft.extras,
    });
    const draftPatch = {
      instantBooking: advanceNotice === 'Instant booking',
      advanceNotice,
      shortestTrip,
      longestTrip,
      dailyKm,
      calendarData: savedCalendarData ?? null,
      availability: ranges,
      ...listingPatch,
    };

    if (isAuthenticated && isReady) {
      setSaving(true);
      try {
        await saveRemoteListingPatch(draftPatch, { syncAvailability: true });
      } catch (e) {
        Alert.alert('Could not save availability', e?.message || 'Try again later.');
        setSaving(false);
        return;
      }
      setSaving(false);
    } else {
      setDraftListing(draftPatch);
    }

    if (editingListingId) {
      navigation.navigate('EditYourRideScreen');
    } else {
      navigation.navigate('PricingLandingScreen');
    }
  };

  const closeAllPickers = () => {
    setShowAdvanceNoticePicker(false);
    setShowShortestPicker(false);
    setShowLongestPicker(false);
    setShowDailyKmPicker(false);
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

  const renderDropdown = (label, value, options, show, setShow, setValue, helperText, wrapperRef, dropdownKey, onHelpPress) => (
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
              source={show ? require('../assets/icons/dropDownUp.png') : require('../assets/icons/dropDownDown.png')}
              style={styles.dropdownArrow}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
        {show && openDropdownKey !== dropdownKey && (
          <View style={styles.dropdownMenu}>
            <ScrollView
              style={{ maxHeight: 180 * scale }}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setValue(opt);
                    setShow(false);
                  }}
                >
                  <Text style={styles.dropdownText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
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
          <Text style={styles.headerTitle}>AVAILABILITY AND RESTRICTIONS</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="never"
      >
        {renderDropdown(
          'ADVANCE NOTICE',
          advanceNotice,
          ADVANCE_NOTICE_OPTIONS,
          showAdvanceNoticePicker,
          setShowAdvanceNoticePicker,
          setAdvanceNotice,
          "We will block trips that don't give you enough notice",
          advanceRef,
          'advance',
          () => setHelpModalContent({
            title: 'ADVANCE NOTICE',
            body: "Set how far in advance you would like guests to book your vehicle. We will block trips that don't give you enough notice. Guests are more likely to book your ride if you have Instant Booking available.",
          })
        )}

        {renderDropdown(
          'SHORTEST POSSIBLE TRIP',
          shortestTrip,
          TRIP_LENGTH_OPTIONS,
          showShortestPicker,
          setShowShortestPicker,
          setShortestTrip,
          null,
          shortestRef,
          'shortest',
          () => setHelpModalContent({
            title: 'SHORTEST POSSIBLE TRIP',
            body: "Set the minimum duration a guest can rent your vehicle. We find 1 day minimum trips will result in more booking requests for you.",
          })
        )}

        {renderDropdown(
          'LONGEST POSSIBLE TRIP',
          longestTrip,
          LONGEST_TRIP_OPTIONS,
          showLongestPicker,
          setShowLongestPicker,
          setLongestTrip,
          "We will block requests that don't fit within your restrictions",
          longestRef,
          'longest',
          () => setHelpModalContent({
            title: 'LONGEST POSSIBLE TRIP',
            body: 'Set the maximum duration a guest can rent your vehicle.',
          })
        )}

        {renderDropdown(
          'DAILY KILOMETRE RESTRICTION',
          dailyKm,
          DAILY_KM_OPTIONS,
          showDailyKmPicker,
          setShowDailyKmPicker,
          setDailyKm,
          null,
          dailyRef,
          'daily',
          () => setHelpModalContent({
            title: 'DAILY KILOMETRE RESTRICTION',
            body: "Set how many kilometres guests can put on your vehicle a day. We find 200kms or more will result in more booking requests for you.",
          })
        )}

        <TouchableOpacity
          style={styles.calendarRow}
          onPress={() => navigation.navigate('CalendarScreen', {
            savedCalendarData,
            availabilityData: { advanceNotice, shortestTrip, longestTrip, dailyKm },
          })}
          activeOpacity={0.7}
        >
          <View style={styles.calendarIconWrap}>
            <Image
              source={require('../assets/icons/calendarIcon.png')}
              style={styles.calendarIcon}
              resizeMode="contain"
            />
          </View>
          <View style={styles.calendarTextWrap}>
            <Text style={styles.calendarLabel}>CALENDAR</Text>
            <Text style={styles.calendarDescription}>Block guests from booking specific dates on your calendar</Text>
          </View>
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" style={styles.calendarArrow}>
            <Path d="M9 18l6-6-6-6" stroke={COLORS.GREENY_BLUE_TWO} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={openDropdownKey != null}
        transparent
        animationType="fade"
        onRequestClose={closeAllPickers}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeAllPickers}>
          {overlayLayout && openDropdownKey && (() => {
            const opts = openDropdownKey === 'advance' ? ADVANCE_NOTICE_OPTIONS
              : openDropdownKey === 'shortest' ? TRIP_LENGTH_OPTIONS
              : openDropdownKey === 'longest' ? LONGEST_TRIP_OPTIONS
              : DAILY_KM_OPTIONS;
            const setVal = openDropdownKey === 'advance' ? setAdvanceNotice
              : openDropdownKey === 'shortest' ? setShortestTrip
              : openDropdownKey === 'longest' ? setLongestTrip
              : setDailyKm;
            const setSh = openDropdownKey === 'advance' ? setShowAdvanceNoticePicker
              : openDropdownKey === 'shortest' ? setShowShortestPicker
              : openDropdownKey === 'longest' ? setShowLongestPicker
              : setShowDailyKmPicker;
            return (
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
                  {opts.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setVal(opt);
                        setSh(false);
                        closeAllPickers();
                      }}
                    >
                      <Text style={styles.dropdownText}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            );
          })()}
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
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
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
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    width: 331 * scale,
    backgroundColor: '#fff',
    borderRadius: 5 * scale,
    borderWidth: 1 * scale,
    borderColor: 'rgb(163, 163, 163)',
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
  helperText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: '#9B9B9B',
    marginTop: 8 * scale,
    lineHeight: 18 * scale,
  },
  calendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16 * scale,
    paddingHorizontal: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
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
  calendarIconWrap: {
    width: 40 * scale,
    height: 40 * scale,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14 * scale,
  },
  calendarIcon: {
    width: 24 * scale,
    height: 24 * scale,
  },
  calendarTextWrap: {
    flex: 1,
  },
  calendarLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: '#4A4A4A',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  calendarDescription: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: '#4A4A4A',
    opacity: 0.8,
    lineHeight: 16 * scale,
  },
  calendarArrow: {
    marginLeft: 8,
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
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 16 * scale,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});

export default AvailabilitySetupScreen;
