import React, { useState, useRef, useEffect, useCallback } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Modal,
  Pressable,
  Animated,
  TextInput,
  Switch,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useFavorites } from '../context/FavoritesContext';
import { useListings } from '../context/ListingsContext';
import ListingCard from '../components/ListingCard';
import GooglePlacesAutocompleteField from '../components/GooglePlacesAutocompleteField';
import { resolveCurrentLocationQueryWithAlert } from '../utils/currentLocation';
import { formatLocationLabel, resolveSearchCity, isMarketplaceListing } from '../utils/searchLocation';
import { searchListings } from '../services/listingsApi';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const scale = uiScale;
// Min height for Filters scroll content so the whole sheet area is scrollable
const REFINE_SCROLL_CONTENT_MIN_HEIGHT = screenHeight * 0.55;
// Car feature card size (same formula as DescribeYourRideScreen: 3 cols, padding 20*scale each side, 2 gaps 12*scale)
const REFINE_CAR_FEATURE_CARD_SIZE = (screenWidth - 40 * scale - 2 * 12 * scale) / 3;
const PRICE_THUMB_SIZE = 18;
const PRICE_MAX_VALUE = 199; // matches C$0 - C$199+/DAY label
const KM_SLIDER_MAX = 500; // 0 - 500 KM/DAY

const DEFAULT_DATE_RANGE = 'Jan 14 - Jan 25';
const DISTANCE_VALUES = [50, 100, 250, 500, 1000, 'prov', 'national'];
const DEFAULT_DATES_TEXT = 'Jan 8, 10:00 AM - Jan 10, 3:00 PM';
const SEARCH_PANEL_HEIGHT = 560;
const SORT_OPTIONS = ['Relevance', 'Price low to high', 'Price high to low', 'Distance'];
const VEHICLE_TYPE_OPTIONS = [
  { label: 'CARS', icon: require('../assets/icons/car3.png') },
  { label: 'SUVS', icon: require('../assets/icons/jeep.png') },
  { label: 'PICKUP', icon: require('../assets/icons/pickupCar.png') },
  { label: 'VAN', icon: require('../assets/icons/van1.png') },
  { label: 'COMMERCIAL\nTRUCK', icon: require('../assets/icons/truck.png') },
  { label: 'MOTORHOME', icon: require('../assets/icons/rv.png') },
  { label: 'MOPEDS\nAND MOTORCYCLES', icon: require('../assets/icons/Scooter.png') },
  { label: 'BUSES', icon: require('../assets/icons/Bus.png') },
];
const CAR_FEATURES_LIST = [
  { key: 'navigation', label: 'NAVIGATION', icon: require('../assets/icons/gps.png') },
  { key: 'remoteStart', label: 'REMOTE START', icon: require('../assets/icons/controller.png') },
  { key: 'backUpCamera', label: 'BACK UP CAMERA', icon: require('../assets/icons/record.png') },
  { key: 'audioInput', label: 'AUDIO INPUT', icon: require('../assets/icons/audioJack.png') },
  { key: 'usb', label: 'USB', icon: require('../assets/icons/usb.png') },
  { key: 'bluetooth', label: 'BLUETOOTH', icon: require('../assets/icons/bluetooth.png') },
  { key: 'petFriendly', label: 'PET FRIENDLY', icon: require('../assets/icons/medal1.png') },
  { key: 'convertible', label: 'CONVERTIBLE', icon: require('../assets/icons/cabriolet.png') },
  { key: 'sunroof', label: 'SUNROOF', icon: require('../assets/icons/sunroof.png') },
  { key: 'heatedSeats', label: 'HEATED SEATS', icon: require('../assets/icons/heat.png') },
  { key: 'snowTires', label: 'SNOW TIRES', icon: require('../assets/icons/tire.png') },
  { key: 'allWheelDrive', label: 'ALL-WHEEL DRIVE', icon: require('../assets/icons/chassis.png') },
];
const CAR_FEATURES_INITIAL_COUNT = 6;

const COLOR_OPTIONS = [
  { name: 'White', value: '#FFFFFF' },
  { name: 'Black', value: '#000000' },
  { name: 'Gray', value: '#808080' },
  { name: 'Silver', value: '#C0C0C0' },
  { name: 'Blue', value: '#0066CC' },
  { name: 'Red', value: '#DC143C' },
  { name: 'Brown', value: '#8B4513' },
  { name: 'Green', value: '#228B22' },
  { name: 'Gold', value: '#FFD700' },
  { name: 'Yellow', value: '#FFE135' },
  { name: 'Orange', value: '#FF8C00' },
  { name: 'Purple', value: '#800080' },
  { name: 'Pink', value: '#FF69B4' },
];

export default function SearchResultsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { city = '', listings: initialRouteListings = [], country } = route.params || {};
  const { getListingsByCity, mergeRemoteListings } = useListings();
  const [selectedCity, setSelectedCity] = useState(city);
  const [currentListings, setCurrentListings] = useState(() => {
    if (Array.isArray(initialRouteListings) && initialRouteListings.length > 0) {
      return initialRouteListings.filter(isMarketplaceListing);
    }
    const key = (city || '').trim();
    return key ? getListingsByCity(key).filter(isMarketplaceListing) : [];
  });
  const useMiles = country === 'US' || country === 'USA' || country === 'United States';
  const [dateRange, setDateRange] = useState(DEFAULT_DATE_RANGE);
  const [datesDetailText, setDatesDetailText] = useState(DEFAULT_DATES_TEXT);
  const [searchPanelVisible, setSearchPanelVisible] = useState(false);
  const [refineModalVisible, setRefineModalVisible] = useState(false);
  const [selectedDistance, setSelectedDistance] = useState(500);
  const panelSlide = useRef(new Animated.Value(-SEARCH_PANEL_HEIGHT)).current;
  const [editingCity, setEditingCity] = useState(false);
  const [whereInput, setWhereInput] = useState(selectedCity ?? '');
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [instantEnabled, setInstantEnabled] = useState(false);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(1);
  const [priceTrackWidth, setPriceTrackWidth] = useState(0);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);
  const [selectedVehicleTypes, setSelectedVehicleTypes] = useState([]);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedCarFeatures, setSelectedCarFeatures] = useState(new Set());
  const [carFeaturesExpanded, setCarFeaturesExpanded] = useState(false);
  const [kmPerDay, setKmPerDay] = useState(200 / KM_SLIDER_MAX); // 0-1, default 200
  const [kmTrackWidth, setKmTrackWidth] = useState(0);
  const locationLabel = selectedCity ? `${selectedCity}, Canada` : 'Enter location';
  const whereLabel = selectedCity
    ? `250 Wincott Dr, ${selectedCity}, Canada`
    : '250 Wincott Dr, Toronto, Canada';
  const { isFavorited, toggleFavorite } = useFavorites();

  const getDistanceLabel = (val) => {
    if (val === 'prov') return useMiles ? 'State' : 'Prov.';
    if (val === 'national') return 'National';
    return useMiles ? `${val} mi` : `${val} km`;
  };

  const toggleCarFeature = (key) => {
    setSelectedCarFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const currentMinPrice = Math.round(priceMin * PRICE_MAX_VALUE);
  const currentMaxPrice = Math.round(priceMax * PRICE_MAX_VALUE);

  const priceMinStart = useRef(0);
  const priceMaxStart = useRef(1);

  const clamp01 = (val) => {
    if (val < 0) return 0;
    if (val > 1) return 1;
    return val;
  };

  const priceThumbRange = Math.max(priceTrackWidth - PRICE_THUMB_SIZE, 1);

  const minThumbResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        priceMinStart.current = priceMin;
      },
      onPanResponderMove: (_, gesture) => {
        const delta = gesture.dx / priceThumbRange;
        let next = clamp01(priceMinStart.current + delta);
        if (next > priceMax - 0.02) next = Math.max(priceMax - 0.02, 0);
        setPriceMin(next);
      },
    })
  ).current;

  const maxThumbResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        priceMaxStart.current = priceMax;
      },
      onPanResponderMove: (_, gesture) => {
        const delta = gesture.dx / priceThumbRange;
        let next = clamp01(priceMaxStart.current + delta);
        if (next < priceMin + 0.02) next = Math.min(priceMin + 0.02, 1);
        setPriceMax(next);
      },
    })
  ).current;

  const kmThumbStart = useRef(0);
  const kmThumbRange = Math.max(kmTrackWidth - PRICE_THUMB_SIZE, 1);
  const kmThumbResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        kmThumbStart.current = kmPerDay;
      },
      onPanResponderMove: (_, gesture) => {
        const delta = gesture.dx / kmThumbRange;
        setKmPerDay(clamp01(kmThumbStart.current + delta));
      },
    })
  ).current;

  const openSearchPanel = () => {
    setSearchPanelVisible(true);
    Animated.spring(panelSlide, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeSearchPanel = () => {
    setSearchPanelVisible(false);
    Animated.timing(panelSlide, {
      toValue: -SEARCH_PANEL_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleSearch = () => {
    closeSearchPanel();
  };

  useEffect(() => {
    setSelectedCity(city);
  }, [city]);

  // Prefer fresh route/search API results — never replace with stale AsyncStorage catalog alone.
  const refreshSearch = useCallback(
    async (cityKey, routeListings) => {
      const key = (cityKey || '').trim();
      if (!key) return;
      if (Array.isArray(routeListings) && routeListings.length > 0) {
        setCurrentListings(routeListings.filter(isMarketplaceListing));
      }
      try {
        const remote = await searchListings({ city: key });
        if (Array.isArray(remote)) {
          mergeRemoteListings(remote);
          setCurrentListings(remote.filter(isMarketplaceListing));
          return;
        }
      } catch (_) {
        /* offline */
      }
      if (!Array.isArray(routeListings) || routeListings.length === 0) {
        setCurrentListings(getListingsByCity(key).filter(isMarketplaceListing));
      }
    },
    [getListingsByCity, mergeRemoteListings],
  );

  useEffect(() => {
    refreshSearch(selectedCity, initialRouteListings);
  }, [selectedCity, initialRouteListings, refreshSearch]);

  useFocusEffect(
    useCallback(() => {
      refreshSearch(selectedCity, route.params?.listings);
    }, [selectedCity, route.params?.listings, refreshSearch]),
  );

  const openWhereEdit = () => {
    setWhereInput(selectedCity ?? '');
    setEditingCity(true);
  };

  const handleCityNext = () => {
    const raw = (whereInput ?? '').trim();
    const nextCity = raw.includes(',') ? raw.split(',')[0].trim() : raw || selectedCity;
    setSelectedCity(nextCity);
    closeSearchPanel();
    setEditingCity(false);
  };

  const handleUseCurrentLocation = async () => {
    const loc = await resolveCurrentLocationQueryWithAlert();
    if (!loc) return;
    const { city, query } = resolveSearchCity({ city: loc.city, query: loc.query });
    setWhereInput(query || loc.query);
    setSelectedCity(city || formatLocationLabel(loc.query));
    setEditingCity(false);
    closeSearchPanel();
  };

  // When returning from booking calendar
  const bookingDates = route.params?.bookingDates;
  if (bookingDates && typeof bookingDates === 'object') {
    const start = new Date(bookingDates.start);
    const end = new Date(bookingDates.end);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const short = `${monthNames[start.getMonth()]} ${start.getDate()} - ${monthNames[end.getMonth()]} ${end.getDate()}`;
    if (dateRange !== short) setDateRange(short);
    const detail = `${monthNames[start.getMonth()]} ${start.getDate()}, ${bookingDates.startTime} - ${monthNames[end.getMonth()]} ${end.getDate()}, ${bookingDates.endTime}`;
    if (datesDetailText !== detail) setDatesDetailText(detail);
    // clear it so we don't loop
    navigation.setParams({ bookingDates: undefined });
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Svg width={24} height={24} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke="#FFB131" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <View style={styles.headerSearchRow}>
                <TouchableOpacity style={styles.searchBarPill} onPress={openSearchPanel} activeOpacity={0.85}>
            <View style={styles.searchBarPillLeft}>
              <Text style={styles.searchLocation} numberOfLines={1}>{locationLabel}</Text>
              <Text style={styles.dateText}>{dateRange}</Text>
            </View>
            <View style={styles.searchBarPillArrow}>
              <Image source={require('../assets/icons/dropDownDown.png')} style={styles.dropDownArrow} resizeMode="contain" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton} onPress={() => setRefineModalVisible(true)}>
            <Image source={require('../assets/icons/settings.png')} style={styles.filterIcon} resizeMode="contain" />
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={searchPanelVisible} transparent animationType="none">
        <Pressable style={styles.searchPanelBackdrop} onPress={closeSearchPanel}>
          <Animated.View
            style={[
              styles.searchPanel,
              {
                paddingTop: insets.top + 12,
                transform: [{ translateY: panelSlide }],
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <TouchableOpacity style={[styles.searchPanelBackBtn, { top: insets.top + 12 }]} onPress={closeSearchPanel}>
              <Svg width={24} height={24} viewBox="0 0 48 48" fill="none">
                <Path d="M31 8L17 24L31 40" stroke={COLORS.YELLOWISH_ORANGE} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>

            <ScrollView
              style={styles.searchPanelScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="on-drag"
              nestedScrollEnabled
            >
              <View style={styles.searchPanelSection}>
                <Text style={styles.searchPanelLabel}>WHERE</Text>
                {editingCity ? (
                  <View style={styles.whereEditBlock}>
                    <GooglePlacesAutocompleteField
                      placeholder="City, airport, address, or hotel"
                      onPlaceSelected={({ selection }) => {
                        setWhereInput(selection.query);
                        setSelectedCity(selection.city || selection.query.split(',')[0].trim());
                        setEditingCity(false);
                        closeSearchPanel();
                      }}
                      containerStyle={{ marginTop: 8 }}
                      inputStyle={styles.inlineCityInput}
                    />
                    <TouchableOpacity onPress={handleCityNext} activeOpacity={0.85} style={styles.inlineCityNextBtn}>
                      <Text style={styles.inlineCityNextBtnText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.searchPanelRow}>
                    <Text style={styles.searchPanelValue} numberOfLines={1}>{whereLabel}</Text>
                    <TouchableOpacity onPress={openWhereEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={styles.searchPanelEdit}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <View style={styles.searchPanelDivider} />
              <View style={styles.searchPanelSection}>
                <Text style={styles.searchPanelLabel}>LOCATION</Text>
                <TouchableOpacity
                  style={styles.searchPanelRowRight}
                  onPress={handleUseCurrentLocation}
                  activeOpacity={0.85}
                >
                  <Image source={require('../assets/icons/currentLocationPin.png')} style={styles.searchPanelPin} resizeMode="contain" />
                  <Text style={styles.searchPanelCurrentLocation}>Current Location</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.searchPanelDivider} />
              <View style={styles.searchPanelSection}>
                <Text style={styles.searchPanelLabel}>DISTANCE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.distanceScrollContent}>
                  {DISTANCE_VALUES.map((val) => (
                    <TouchableOpacity
                      key={String(val)}
                      style={[styles.distanceChip, selectedDistance === val && styles.distanceChipSelected]}
                      onPress={() => setSelectedDistance(val)}
                    >
                      <Text style={[styles.distanceChipText, selectedDistance === val && styles.distanceChipTextSelected]}>{getDistanceLabel(val)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.searchPanelSection}>
                <Text style={styles.searchPanelLabel}>DATES</Text>
                <View style={styles.searchPanelRow}>
                  <Text style={styles.searchPanelValue}>{datesDetailText}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      closeSearchPanel();
                      navigation.navigate('CalendarScreen', {
                        mode: 'booking',
                        returnTo: 'SearchResultsScreen',
                        bookingSessionKey: Date.now(),
                      });
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.searchPanelEdit}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.searchPanelDivider} />
            </ScrollView>

            <TouchableOpacity style={styles.searchPanelSearchBtn} onPress={handleSearch} activeOpacity={0.85}>
              <Text style={styles.searchPanelSearchBtnText}>Search</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* AddressEntryModal removed; city edit is inline within the dropdown */}

      <Modal
        visible={refineModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRefineModalVisible(false)}
      >
        <View style={styles.refineBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setRefineModalVisible(false)} />
          <View style={styles.refineModal} onStartShouldSetResponder={() => true}>
            <View style={styles.refineHandleWrap}>
              <View style={styles.refineHandle} />
            </View>
            <View style={styles.refineHeader}>
              <Text style={styles.refineTitle}>FILTERS</Text>
            </View>

            <View style={styles.refineScrollWrap}>
            <ScrollView
              style={styles.refineBody}
              contentContainerStyle={[styles.refineBodyContent, { minHeight: REFINE_SCROLL_CONTENT_MIN_HEIGHT }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={true}
              nestedScrollEnabled={true}
              directionalLockEnabled={true}
              scrollEventThrottle={16}
            >
              <View style={styles.refineSectionSort}>
                <Text style={styles.refineLabel}>SORT BY</Text>
                <TouchableOpacity
                  style={styles.refineSelectRow}
                  activeOpacity={0.85}
                  onPress={() => setSortOpen((open) => !open)}
                >
                  <Text style={styles.refineSelectText}>{sortBy}</Text>
                  <Image
                    source={
                      sortOpen
                        ? require('../assets/icons/dropDownUp.png')
                        : require('../assets/icons/dropDownDown.png')
                    }
                    style={styles.refineSelectArrow}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                {sortOpen && (
                  <View style={styles.refineSortMenu} pointerEvents="box-none">
                    <View style={styles.refineSortMenuInner}>
                      {SORT_OPTIONS.map((opt) => (
                        <TouchableOpacity
                          key={opt}
                          style={styles.refineSortItem}
                          activeOpacity={0.85}
                          onPress={() => {
                            setSortBy(opt);
                            setSortOpen(false);
                          }}
                        >
                          <Text style={styles.refineSortItemText}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.refineSection}>
                <Text style={styles.refineLabel}>DATES</Text>
                <View style={styles.searchPanelRow}>
                  <Text style={styles.searchPanelValue}>{datesDetailText}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setRefineModalVisible(false);
                      navigation.navigate('CalendarScreen', {
                        mode: 'booking',
                        returnTo: 'SearchResultsScreen',
                        bookingSessionKey: Date.now(),
                      });
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.searchPanelEdit}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.refineSection}>
                <View style={styles.refineToggleRow}>
                  <Text style={styles.refineLabel}>DELIVERY</Text>
                  <Switch
                    value={deliveryEnabled}
                    onValueChange={setDeliveryEnabled}
                    trackColor={{ false: '#e0e0e0', true: COLORS.GREENY_BLUE_TWO }}
                    thumbColor="#fff"
                  />
                </View>
              </View>

              <View style={styles.refineDivider} />

              <View style={styles.refineSection}>
                <View style={styles.refineToggleRow}>
                  <Text style={styles.refineLabel}>BOOK INSTANTLY</Text>
                  <Switch
                    value={instantEnabled}
                    onValueChange={setInstantEnabled}
                    trackColor={{ false: '#e0e0e0', true: COLORS.GREENY_BLUE_TWO }}
                    thumbColor="#fff"
                  />
                </View>
              </View>

              <View style={styles.refineDivider} />

              <View style={styles.refineSection}>
                <View style={styles.refinePriceRow}>
                  <Text style={styles.refineLabel}>PRICE</Text>
                  <Text style={styles.refinePriceMeta}>
                    C${currentMinPrice} - C${currentMaxPrice}+/DAY
                  </Text>
                </View>
                <View
                  style={styles.refinePriceSlider}
                  onLayout={(e) => {
                    setPriceTrackWidth(e.nativeEvent.layout.width);
                  }}
                >
                  <View style={styles.refinePriceSliderTrack} />
                  {priceTrackWidth > 0 && (
                    <View
                      style={[
                        styles.refinePriceSliderSelected,
                        {
                          left: priceMin * (priceTrackWidth - PRICE_THUMB_SIZE) + PRICE_THUMB_SIZE / 2,
                          width: (priceMax - priceMin) * (priceTrackWidth - PRICE_THUMB_SIZE),
                        },
                      ]}
                    />
                  )}
                  <View
                    {...minThumbResponder.panHandlers}
                    style={[
                      styles.refinePriceSliderThumb,
                      priceTrackWidth
                        ? { left: priceMin * (priceTrackWidth - PRICE_THUMB_SIZE) }
                        : { left: 0 },
                    ]}
                  />
                  <View
                    {...maxThumbResponder.panHandlers}
                    style={[
                      styles.refinePriceSliderThumb,
                      priceTrackWidth
                        ? { left: priceMax * (priceTrackWidth - PRICE_THUMB_SIZE) }
                        : { left: priceTrackWidth - PRICE_THUMB_SIZE },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.refineSection}>
                <Text style={styles.refineLabel}>VEHICLE TYPE</Text>
                <View style={styles.refineVehicleTypeGrid}>
                  {VEHICLE_TYPE_OPTIONS.map((t) => {
                    const isSelected = selectedVehicleTypes.includes(t.label);
                    return (
                      <TouchableOpacity
                        key={t.label}
                        style={[
                          styles.refineVehicleTypeCard,
                          isSelected && styles.refineTypeCardSelected,
                        ]}
                        activeOpacity={0.85}
                        onPress={() => {
                          setSelectedVehicleTypes((prev) =>
                            prev.includes(t.label)
                              ? prev.filter((v) => v !== t.label)
                              : [...prev, t.label]
                          );
                        }}
                      >
                        <Image source={t.icon} style={styles.refineVehicleTypeIcon} resizeMode="contain" />
                        <Text style={styles.refineVehicleTypeText}>{t.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.refineSection}>
                <View style={styles.refineTwoColRow}>
                  <View style={styles.refineCol}>
                    <Text style={styles.refineLabel}>MAKE</Text>
                    <View style={styles.refineSelectRow}>
                      <Text style={styles.refineSelectText}>Select</Text>
                      <Image source={require('../assets/icons/dropDownDown.png')} style={styles.refineSelectArrow} resizeMode="contain" />
                    </View>
                  </View>
                  <View style={styles.refineCol}>
                    <Text style={styles.refineLabel}>CAR YEAR</Text>
                    <View style={styles.refineSelectRow}>
                      <Text style={styles.refineSelectText}>Select</Text>
                      <Image source={require('../assets/icons/dropDownDown.png')} style={styles.refineSelectArrow} resizeMode="contain" />
                    </View>
                  </View>
                </View>

                <Text style={[styles.refineLabel, { marginTop: 14 }]}>MODEL</Text>
                <View style={styles.refineSelectRow}>
                  <Text style={styles.refineSelectText}>Select</Text>
                  <Image source={require('../assets/icons/dropDownDown.png')} style={styles.refineSelectArrow} resizeMode="contain" />
                </View>

                <Text style={[styles.refineLabel, { marginTop: 14 }]}>YEAR</Text>
                <View style={styles.refineSelectRow}>
                  <Text style={styles.refineSelectText}>Select</Text>
                  <Image source={require('../assets/icons/dropDownDown.png')} style={styles.refineSelectArrow} resizeMode="contain" />
                </View>

                <Text style={[styles.refineLabel, { marginTop: 14 }]}>COLOR</Text>
                <View style={styles.refineColorPickerContainer}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.refineColorScrollView}
                    nestedScrollEnabled={true}
                  >
                    {COLOR_OPTIONS.map((colorOption, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.refineColorSwatchContainer}
                        onPress={() => setSelectedColor(selectedColor === colorOption.name ? null : colorOption.name)}
                        activeOpacity={0.85}
                      >
                        <View
                          style={[
                            styles.refineColorSwatch,
                            { backgroundColor: colorOption.value },
                            colorOption.value === '#FFFFFF' && styles.refineWhiteColorSwatch,
                            selectedColor === colorOption.name && styles.refineSelectedColorSwatch,
                          ]}
                        >
                          {selectedColor === colorOption.name && (
                            <View style={styles.refineSelectedColorBorder} />
                          )}
                        </View>
                        {selectedColor === colorOption.name && (
                          <Text style={styles.refineSelectedColorText}>{colorOption.name}</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <Image
                    source={require('../assets/icons/arrow-button.png')}
                    style={styles.refineColorPickerArrow}
                    resizeMode="contain"
                  />
                </View>

                <Text style={[styles.refineLabel, { marginTop: 14 }]}>VEHICLE TRANSMISSION</Text>
                <View style={styles.refineSelectRow}>
                  <Text style={styles.refineSelectText}>Transmission Type</Text>
                  <Image source={require('../assets/icons/dropDownDown.png')} style={styles.refineSelectArrow} resizeMode="contain" />
                </View>

                <Text style={[styles.refineLabel, { marginTop: 14 }]}>FUEL TYPE</Text>
                <View style={styles.refineSelectRow}>
                  <Text style={styles.refineSelectText}>Electricity</Text>
                  <Image source={require('../assets/icons/dropDownDown.png')} style={styles.refineSelectArrow} resizeMode="contain" />
                </View>

                <View style={[styles.refinePriceRow, { marginTop: 14 }]}>
                  <Text style={styles.refineLabel}>KILOMETERS</Text>
                  <Text style={styles.refinePriceMeta}>{Math.round(kmPerDay * KM_SLIDER_MAX)} KM/DAY</Text>
                </View>
                <View
                  style={styles.refinePriceSlider}
                  onLayout={(e) => setKmTrackWidth(e.nativeEvent.layout.width)}
                >
                  <View style={styles.refinePriceSliderTrack} />
                  {kmTrackWidth > 0 && (
                    <View
                      style={[
                        styles.refinePriceSliderSelected,
                        {
                          left: PRICE_THUMB_SIZE / 2,
                          width: kmPerDay * (kmTrackWidth - PRICE_THUMB_SIZE),
                        },
                      ]}
                    />
                  )}
                  <View
                    {...kmThumbResponder.panHandlers}
                    style={[
                      styles.refinePriceSliderThumb,
                      kmTrackWidth ? { left: kmPerDay * (kmTrackWidth - PRICE_THUMB_SIZE) } : { left: 0 },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.refineSection}>
                <Text style={styles.refineLabel}>CAR FEATURES</Text>
                <View style={styles.refineCarFeatureGrid}>
                  {(carFeaturesExpanded ? CAR_FEATURES_LIST : CAR_FEATURES_LIST.slice(0, CAR_FEATURES_INITIAL_COUNT)).map((feature) => {
                    const selected = selectedCarFeatures.has(feature.key);
                    return (
                      <TouchableOpacity
                        key={feature.key}
                        style={[styles.refineCarFeatureCard, selected && styles.refineCarFeatureCardSelected]}
                        onPress={() => toggleCarFeature(feature.key)}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={feature.icon}
                          style={[styles.refineCarFeatureIcon, selected && styles.refineCarFeatureIconSelected]}
                          resizeMode="contain"
                        />
                        <Text style={[styles.refineCarFeatureLabel, selected && styles.refineCarFeatureLabelSelected]} numberOfLines={2}>
                          {feature.label}
                        </Text>
                        {selected && <View style={styles.refineCarFeatureBorderOverlay} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {CAR_FEATURES_LIST.length > CAR_FEATURES_INITIAL_COUNT && (
                  <TouchableOpacity
                    style={styles.refineMoreFeaturesWrap}
                    onPress={() => setCarFeaturesExpanded(!carFeaturesExpanded)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.refineMoreFeatures}>
                      {carFeaturesExpanded ? 'Show less' : 'More features'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
            </View>

            <TouchableOpacity
              style={styles.refineApplyBtn}
              onPress={() => setRefineModalVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.refineApplyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {currentListings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No rides in this area yet</Text>
            <Text style={styles.emptySubtitle}>Try another city or check back later.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {currentListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onPress={() => navigation.navigate('VehicleDetailScreen', { listing })}
                isFavorited={isFavorited(listing.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingRight: 16,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerSearchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20 * scale,
    paddingTop: 12,
    paddingBottom: 40,
  },
  searchBarPill: {
    flex: 1,
    maxWidth: 287 * scale,
    height: 42,
    backgroundColor: '#fff',
    borderRadius: 21,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 11,
    elevation: 4,
  },
  searchBarPillLeft: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  searchBarPillArrow: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchLocation: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: 'rgb(171,171,171)',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  dateText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
  },
  dropDownArrow: {
    width: 16,
    height: 16,
  },
  filterButton: {
    width: 42,
    height: 42,
    backgroundColor: '#fff',
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 11,
    elevation: 4,
  },
  filterIcon: {
    width: 16,
    height: 17,
  },
  searchPanelBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  searchPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SEARCH_PANEL_HEIGHT,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'visible',
  },
  searchPanelBackBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    padding: 4,
  },
  searchPanelScroll: {
    flex: 1,
    marginTop: 48,
    paddingHorizontal: 20 * scale,
    paddingBottom: 120,
  },
  searchPanelSection: {
    paddingVertical: 14,
  },
  whereEditBlock: {
    zIndex: 2000,
    elevation: 2000,
    overflow: 'visible',
  },
  searchPanelLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: '#000',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  searchPanelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchPanelRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  searchPanelValue: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14,
    color: 'rgb(120,120,120)',
    flex: 1,
    marginRight: 8,
  },
  searchPanelEdit: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14,
    color: COLORS.GREENY_BLUE_TWO,
  },
  // Inline WHERE editor (Edit -> City search -> Save)
  inlineCityInput: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14,
    color: 'rgb(120,120,120)',
    marginTop: 0,
  },
  inlineSuggestionsWrap: {
    marginTop: 8,
    paddingVertical: 6,
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
  },
  inlineSuggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 0,
  },
  inlineSuggestionText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14,
    color: '#222',
  },
  inlineCityNextBtn: {
    marginTop: 0,
    alignSelf: 'flex-end',
  },
  inlineCityNextBtnText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
  },
  searchPanelCurrentLocation: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
    textAlign: 'right',
  },
  searchPanelPin: {
    width: 20,
    height: 20,
    marginRight: 6,
  },
  searchPanelDivider: {
    height: 1,
    backgroundColor: '#eee',
  },
  refineBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  refineModal: {
    height: '75%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  refineHandleWrap: {
    alignItems: 'center',
    marginTop: 19,
    marginBottom: 8,
  },
  refineHandle: {
    width: 48,
    height: 2,
    opacity: 0.5158110119047619,
    borderWidth: 3,
    borderColor: COLORS.MANGO_TWO,
    backgroundColor: 'transparent',
  },
  refineHeader: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 14,
  },
  refineHeaderLeft: {
    position: 'absolute',
    left: 0,
    width: 24,
    height: 24,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  refineHeaderRight: {
    position: 'absolute',
    right: 0,
    width: 24,
    height: 24,
  },
  refineClose: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 22,
    color: '#FFB131',
  },
  refineTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15,
    color: 'rgb(100, 100, 100)',
    letterSpacing: 0.2,
    textAlign: 'center',
    width: 59,
    height: 20,
  },
  refineScrollWrap: {
    flex: 1,
    minHeight: 0,
  },
  refineBody: {
    flex: 1,
    minHeight: 0,
  },
  refineBodyContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  refineSection: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  refineDivider: {
    width: 332 * scale,
    height: 1,
    backgroundColor: 'rgba(151,151,151,0.2443)',
    alignSelf: 'center',
  },
  refineToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refineLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: 'rgba(0,0,0,0.699)',
    letterSpacing: 0.2,
    marginBottom: 10,
    minHeight: 15,
  },
  refineSelectRow: {
    height: 40,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refineSelectText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: '#9B9B9B',
  },
  refineSelectArrow: {
    width: 14,
    height: 14,
  },
  refineSectionSort: {
    position: 'relative',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  refineSortMenu: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '100%',
    zIndex: 1000,
    paddingTop: 6,
  },
  refineSortMenuInner: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  refineSortItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  refineSortItemText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: '#4A4A4A',
  },
  refineToggleStub: {
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F2',
    alignSelf: 'flex-end',
    width: 52,
  },
  refinePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refinePriceMeta: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: '#C1C1C1',
  },
  refinePriceSlider: {
    width: 332 * scale,
    height: 30,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  refinePriceSliderTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F0F0F0',
  },
  refinePriceSliderSelected: {
    position: 'absolute',
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
  },
  refinePriceSliderThumb: {
    position: 'absolute',
    width: PRICE_THUMB_SIZE,
    height: PRICE_THUMB_SIZE,
    borderRadius: PRICE_THUMB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: COLORS.GREENY_BLUE_TWO,
  },
  refineTypeCardSelected: {
    borderColor: COLORS.GREENY_BLUE_TWO,
    backgroundColor: 'rgba(76,182,177,0.06)',
  },
  refineVehicleTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginTop: 8,
  },
  refineVehicleTypeCard: {
    width: '31%',
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  refineVehicleTypeIcon: {
    width: 69,
    height: 45,
    marginBottom: 6,
    tintColor: COLORS.GREENY_BLUE_TWO,
  },
  refineVehicleTypeText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 9,
    color: 'rgba(0,0,0,0.694)',
    textAlign: 'center',
    letterSpacing: 0.1,
    textTransform: 'uppercase',
  },
  refineTwoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  refineCol: {
    flex: 1,
  },
  refineColorPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    minHeight: 50,
  },
  refineColorScrollView: {
    flex: 1,
  },
  refineColorPickerArrow: {
    width: 7 * scale,
    height: 12 * scale,
    marginLeft: 12 * scale,
  },
  refineColorSwatchContainer: {
    alignItems: 'center',
    marginRight: 28 * scale,
  },
  refineColorSwatch: {
    width: 32 * scale,
    height: 32 * scale,
    borderRadius: 16 * scale,
    position: 'relative',
  },
  refineWhiteColorSwatch: {
    borderWidth: 1 * scale,
    borderColor: '#E0E0E0',
  },
  refineSelectedColorSwatch: {
    borderWidth: 2 * scale,
    borderColor: '#FFB131',
  },
  refineSelectedColorBorder: {
    position: 'absolute',
    top: -2 * scale,
    left: -2 * scale,
    right: -2 * scale,
    bottom: -2 * scale,
    borderRadius: 18 * scale,
    borderWidth: 2 * scale,
    borderColor: '#FFB131',
  },
  refineSelectedColorText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 10 * scale,
    color: '#8E8E8E',
    letterSpacing: 0.2,
    marginTop: 4 * scale,
    textAlign: 'center',
  },
  refineCarFeatureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  refineCarFeatureCard: {
    width: REFINE_CAR_FEATURE_CARD_SIZE,
    height: REFINE_CAR_FEATURE_CARD_SIZE,
    backgroundColor: '#FFFFFF',
    borderRadius: 8 * scale,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12 * scale,
    position: 'relative',
  },
  refineCarFeatureCardSelected: {
    borderColor: COLORS.GREENY_BLUE_TWO,
  },
  refineCarFeatureIcon: {
    width: 70,
    height: 70,
    marginBottom: 8 * scale,
  },
  refineCarFeatureIconSelected: {
    tintColor: COLORS.GREENY_BLUE_TWO,
  },
  refineCarFeatureLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 9 * scale,
    color: '#4A4A4A',
    textAlign: 'center',
    letterSpacing: 0.2,
    paddingHorizontal: 4,
  },
  refineCarFeatureLabelSelected: {
    color: COLORS.GREENY_BLUE_TWO,
  },
  refineCarFeatureBorderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8 * scale,
    borderWidth: 2,
    borderColor: COLORS.GREENY_BLUE_TWO,
    backgroundColor: 'transparent',
  },
  refineMoreFeaturesWrap: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 6,
  },
  refineMoreFeatures: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16,
    color: COLORS.YELLOWISH_ORANGE,
    letterSpacing: 0.2,
    textAlign: 'center',
    width: 104,
    height: 22,
  },
  refineApplyBtn: {
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  refineApplyText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 16,
    color: '#fff',
    letterSpacing: 0.2,
  },
  distanceScrollContent: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    paddingRight: 20,
  },
  distanceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  distanceChipSelected: {
    borderColor: COLORS.GREENY_BLUE_TWO,
    backgroundColor: 'rgba(76, 182, 177, 0.08)',
  },
  distanceChipText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: '#9B9B9B',
  },
  distanceChipTextSelected: {
    color: COLORS.GREENY_BLUE_TWO,
  },
  searchPanelSearchBtn: {
    width: 331 * scale,
    height: 50,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25,
    marginBottom: 20,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPanelSearchBtnText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16,
    color: 'rgb(247, 247, 247)',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 48 * scale,
  },
  emptyTitle: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 20,
    color: '#0E262B',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: '#9B9B9B',
    textAlign: 'center',
  },
  list: {
    gap: 16 * scale,
  },
});
