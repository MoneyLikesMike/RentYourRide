import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, TouchableOpacity, Image, Dimensions, StyleSheet, Switch, ScrollView, TextInput } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import AddressEntryModal from './AddressEntryModal';
import {
  CAR_FEATURES,
  DESCRIPTION_MAX_LENGTH,
  INSTRUCTIONS_MAX_LENGTH,
} from './DescribeYourRideScreen';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useListings } from '../context/ListingsContext';

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375; // Base width is 375;
const EDIT_DESCRIBE_CARD_SIZE = (332 * scale - 2 * 12 * scale) / 3;

function parseTitleToVehicleData(title) {
  if (!title || typeof title !== 'string') return null;
  const m = title.trim().match(/^(\d{4})\s+(.+?)\s+(.+)$/);
  if (!m) return null;
  return { year: m[1], make: m[2], model: m[3] };
}

/** Rebuild structured address from stored pickup line "addr, city, country". */
function pickupStringToCompletedAddress(pickup, cityFallback, countryFallback) {
  if (!pickup || typeof pickup !== 'string') return null;
  const parts = pickup.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const country = parts[parts.length - 1];
    const city = parts[parts.length - 2];
    const address = parts.slice(0, -2).join(', ');
    return { address, city, country };
  }
  if (parts.length === 2) {
    return { address: parts[0], city: parts[1], country: countryFallback || '' };
  }
  return { address: pickup, city: cityFallback || '', country: countryFallback || '' };
}

const TellUsAboutYourRideScreen1 = ({ navigation, route }) => {
  const { setDraftCity, setDraftListing, editingListingId, draft } = useListings();
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [completedAddress, setCompletedAddress] = useState(route?.params?.completedAddress || null);
  const [vehicleData, setVehicleData] = useState(route?.params?.vehicleData || null);
  const [showVehicleInfo, setShowVehicleInfo] = useState(route?.params?.showVehicleInfo || false);
  
  // New sections state
  const [odometerReading, setOdometerReading] = useState('');
  const [transmission, setTransmission] = useState('');
  const [showTransmissionPicker, setShowTransmissionPicker] = useState(false);
  const [showOdometerPicker, setShowOdometerPicker] = useState(false);
  const [salvageTitle, setSalvageTitle] = useState(false);

  const [description, setDescription] = useState('');
  const [checkInInstructions, setCheckInInstructions] = useState('');
  const [checkOutInstructions, setCheckOutInstructions] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState(() => new Set());
  
  // Additional vehicle details state
  const [trim, setTrim] = useState('');
  const [style, setStyle] = useState('');
  const [color, setColor] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [licenseProvince, setLicenseProvince] = useState('');
  const [showTrimPicker, setShowTrimPicker] = useState(false);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [showFuelTypePicker, setShowFuelTypePicker] = useState(false);
  const [showLicenseProvincePicker, setShowLicenseProvincePicker] = useState(false);

  const transmissionOptions = ['Automatic', 'Manual'];
  
  // Additional vehicle detail options
  const trimOptions = ['Base', 'LE', 'XLE', 'Limited', 'Sport', 'Premium'];
  const styleOptions = ['4dr Sedan (Electric DD)', '2dr Coupe', '4dr Hatchback', '5dr SUV', '4dr Wagon'];
  const colorOptions = [
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
    { name: 'Pink', value: '#FF69B4' }
  ];
  const fuelTypeOptions = ['Gasoline', 'Diesel', 'Hybrid', 'Electricity', 'Plug-in Hybrid'];
  
  // US States
  const usStates = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'];
  
  // Canadian Provinces
  const canadianProvinces = ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'];
  
  // Determine if country uses km or miles
  const isMetricCountry = completedAddress?.country && 
    !['United States', 'US', 'USA'].includes(completedAddress.country);
  
  // Determine which province/state options to show
  const isUSLocation = completedAddress?.country && 
    ['United States', 'US', 'USA'].includes(completedAddress.country);
  const licenseProvinceOptions = isUSLocation ? usStates : canadianProvinces;
  
  const odometerOptions = isMetricCountry 
    ? ['0-50K km', '50K-100K km', '100K-150K km', '150K-200K km', '200K-250K km', '250K-300K km']
    : ['0-50K miles', '50K-100K miles', '100K-150K miles', '150K-200K miles', '200K-250K miles', '250K-300K miles'];

  const draftRef = useRef(draft);
  draftRef.current = draft;

  useFocusEffect(
    useCallback(() => {
      if (!editingListingId) return;
      const d = draftRef.current;
      if (d.completedAddress && typeof d.completedAddress === 'object') {
        setCompletedAddress(d.completedAddress);
      } else if (d.pickupAddress) {
        const ca = pickupStringToCompletedAddress(d.pickupAddress, d.city, d.country || 'Canada');
        if (ca) setCompletedAddress(ca);
      }
      const vd =
        d.vehicleData && typeof d.vehicleData === 'object'
          ? d.vehicleData
          : parseTitleToVehicleData(d.title);
      if (vd) {
        setVehicleData(vd);
        setShowVehicleInfo(true);
      }
      if (d.odometerReading) setOdometerReading(String(d.odometerReading));
      if (d.transmission) setTransmission(d.transmission);
      if (d.salvageTitle !== undefined) setSalvageTitle(!!d.salvageTitle);
      if (d.trim) setTrim(d.trim);
      if (d.style) setStyle(d.style);
      if (d.color) setColor(d.color);
      if (d.fuelType) setFuelType(d.fuelType);
      if (d.licensePlate) setLicensePlate(String(d.licensePlate));
      if (d.licenseProvince) setLicenseProvince(d.licenseProvince);
      if (typeof d.description === 'string') setDescription(d.description);
      if (typeof d.checkInInstructions === 'string') setCheckInInstructions(d.checkInInstructions);
      if (typeof d.checkOutInstructions === 'string') setCheckOutInstructions(d.checkOutInstructions);
      if (Array.isArray(d.carFeatures)) setSelectedFeatures(new Set(d.carFeatures));
    }, [editingListingId])
  );

  useEffect(() => {
    if (route?.params?.completedAddress &&
      JSON.stringify(route.params.completedAddress) !== JSON.stringify(completedAddress)
    ) {
      setCompletedAddress(route.params.completedAddress);
    }
    
    // Update vehicle data when passed from VIN flow
    if (route?.params?.vehicleData) {
      setVehicleData(route.params.vehicleData);
      setShowVehicleInfo(true);
      const v = route.params.vehicleData;
      const year = v?.year ? String(v.year).trim() : '';
      const make = v?.make ? String(v.make).trim() : '';
      const model = v?.model ? String(v.model).trim() : '';
      const title = [year, make, model].filter(Boolean).join(' ').trim();
      const bodyRaw = v?.body ?? v?.bodyClass ?? v?.vehicleType ?? v?.style ?? null;
      const vehicleType = bodyRaw ? String(bodyRaw).trim() : null;
      setDraftListing({
        ...(title ? { title } : {}),
        ...(vehicleType ? { vehicleType } : {}),
      });
    }
  }, [route?.params?.completedAddress, route?.params?.vehicleData, completedAddress]);

  // Cleanup effect to ensure modal is closed
  useEffect(() => {
    return () => {
      setAddressModalVisible(false);
    };
  }, []);

  // Force close modal on focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('Screen focused, ensuring modal is closed');
      setAddressModalVisible(false);
    });
    return unsubscribe;
  }, [navigation]);

  // Reset modal state when address is completed
  useEffect(() => {
    if (completedAddress) {
      console.log('Address completed, forcing modal closed');
      setAddressModalVisible(false);
    }
  }, [completedAddress]);

  const handleAddressNext = (addressData) => {
    console.log('Address completed:', addressData);
    setDraftCity(addressData.city ?? null);
    setAddressModalVisible(false);
    setCompletedAddress(addressData);
    navigation.setParams({ completedAddress: addressData });
    
    // Double-check modal is closed after a brief delay
    setTimeout(() => {
      console.log('Double-checking modal state:', addressModalVisible);
      setAddressModalVisible(false);
    }, 100);
  };

  const handleAddressClose = () => {
    console.log('Address modal closing');
    setAddressModalVisible(false);
  };

  // Check if all required fields are filled
  const allRequiredFieldsFilled = 
    completedAddress && 
    vehicleData && 
    odometerReading && 
    transmission && 
    color && 
    fuelType && 
    licensePlate && 
    licenseProvince;

  const toggleEditDescribeFeature = (key) => {
    setSelectedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleNext = () => {
    if (allRequiredFieldsFilled) {
      const year = vehicleData?.year ? String(vehicleData.year).trim() : '';
      const make = vehicleData?.make ? String(vehicleData.make).trim() : '';
      const model = vehicleData?.model ? String(vehicleData.model).trim() : '';
      const title = [year, make, model].filter(Boolean).join(' ').trim();
      const pickupAddress = completedAddress
        ? `${completedAddress.address || ''}${completedAddress.city ? `, ${completedAddress.city}` : ''}${completedAddress.country ? `, ${completedAddress.country}` : ''}`
        : '';

      setDraftListing({
        ...(title ? { title } : {}),
        odometerReading,
        transmission,
        salvageTitle,
        trim,
        style,
        color,
        fuelType,
        licensePlate,
        licenseProvince,
        pickupAddress,
        ...(completedAddress ? { completedAddress } : {}),
        ...(vehicleData && typeof vehicleData === 'object' ? { vehicleData } : {}),
        ...(editingListingId
          ? {
              description: description.trim(),
              checkInInstructions: checkInInstructions.trim(),
              checkOutInstructions: checkOutInstructions.trim(),
              carFeatures: Array.from(selectedFeatures),
            }
          : {}),
      });
      if (editingListingId) {
        navigation.navigate('EditYourRideScreen');
      } else {
        navigation.navigate('AvailabilityLandingScreen');
      }
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContentContainer,
          editingListingId && styles.scrollContentContainerEditing,
        ]}
      >
        {/* Header with Back Button */}
        <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke="#FFB131" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.mainHeader}>
          {editingListingId ? 'EDIT YOUR RIDE' : 'TELL US ABOUT YOUR RIDE'}
        </Text>
      </View>

      {/* Section 1: Where can guests pick up your ride? */}
      <TouchableOpacity style={styles.sectionButton} onPress={() => setAddressModalVisible(true)}>
        <Text style={styles.sectionHeader}>WHERE CAN GUESTS PICK UP YOUR RIDE?</Text>
        <Text style={styles.sectionText}>
          {completedAddress ? `${completedAddress.address}, ${completedAddress.city}, ${completedAddress.country}` : 'Enter address'}
        </Text>
        <Image
          source={require('../assets/icons/arrow-button.png')}
          style={styles.arrowIcon}
          resizeMode="contain"
        />
        <View style={styles.divider} />
      </TouchableOpacity>

      {/* Section 2: What kind of vehicle do you have */}
      <TouchableOpacity 
        style={styles.sectionButton}
        onPress={() => navigation.navigate('WhereIsMyVINScreen', { completedAddress })}
      >
        <Text style={styles.sectionHeader}>WHAT KIND OF VEHICLE DO YOU HAVE</Text>
        <Text style={styles.sectionText}>
          {vehicleData ? `${vehicleData.year} ${vehicleData.make} ${vehicleData.model}` : 'Identify your car'}
        </Text>
        <Image
          source={require('../assets/icons/arrow-button.png')}
          style={styles.arrowIcon}
          resizeMode="contain"
        />
        <View style={styles.divider} />
      </TouchableOpacity>

      {/* Conditional Sections - Only show after address and vehicle are completed */}
      {(completedAddress && vehicleData) && (
        <>
          {/* Section 3: Odometer */}
          <View style={[styles.sectionButton, styles.odometerSection]}>
            <Text style={styles.sectionHeader}>ODOMETER</Text>
            <View style={{ position: 'relative', width: 331 * scale }}>
              <TouchableOpacity 
                style={styles.dropdownButton}
                onPress={() => setShowOdometerPicker(!showOdometerPicker)}
              >
                <View style={styles.dropdownRow}>
                  <Text style={[styles.dropdownText, { color: odometerReading ? '#000' : '#A9A9A9' }]}>
                    {odometerReading || 'Select'}
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Image
                    source={showOdometerPicker ? require('../assets/icons/dropDownUp.png') : require('../assets/icons/dropDownDown.png')}
                    style={styles.dropdownArrow}
                    resizeMode="contain"
                  />
                </View>
              </TouchableOpacity>
              {showOdometerPicker && (
                <View style={styles.dropdownMenu}>
                  <ScrollView 
                    style={{ maxHeight: 180 * scale }}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                  >
                    {odometerOptions.map((option) => (
                      <TouchableOpacity 
                        key={option} 
                        style={styles.dropdownItem} 
                        onPress={() => { 
                          setOdometerReading(option); 
                          setShowOdometerPicker(false); 
                        }}
                      >
                        <Text style={styles.dropdownText}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          {/* Section 4: Vehicle Transmission */}
          <View style={[styles.sectionButton, styles.transmissionSection]}>
            <Text style={styles.sectionHeader}>VEHICLE TRANSMISSION</Text>
            <View style={{ position: 'relative', width: 331 * scale }}>
              <TouchableOpacity 
                style={styles.dropdownButton}
                onPress={() => setShowTransmissionPicker(!showTransmissionPicker)}
              >
                <View style={styles.dropdownRow}>
                  <Text style={[styles.dropdownText, { color: transmission ? '#000' : '#A9A9A9' }]}>
                    {transmission || 'Transmission Type'}
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Image
                    source={showTransmissionPicker ? require('../assets/icons/dropDownUp.png') : require('../assets/icons/dropDownDown.png')}
                    style={styles.dropdownArrow}
                    resizeMode="contain"
                  />
                </View>
              </TouchableOpacity>
              {showTransmissionPicker && (
                <View style={styles.dropdownMenu}>
                  <ScrollView 
                    style={{ maxHeight: 180 * scale }}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                  >
                    {transmissionOptions.map((option) => (
                      <TouchableOpacity 
                        key={option} 
                        style={styles.dropdownItem} 
                        onPress={() => { 
                          setTransmission(option); 
                          setShowTransmissionPicker(false); 
                        }}
                      >
                        <Text style={styles.dropdownText}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          {/* Additional sections - only show after odometer and transmission are completed */}
          {(odometerReading && transmission) && (
            <>
              {/* Section 6: TRIM (Optional) */}
              <View style={[styles.sectionButton, styles.transmissionSection]}>
                <Text style={styles.sectionHeader}>TRIM (OPTIONAL)</Text>
                <View style={{ position: 'relative', width: 331 * scale }}>
                  <TouchableOpacity 
                    style={styles.dropdownButton}
                    onPress={() => setShowTrimPicker(!showTrimPicker)}
                  >
                    <View style={styles.dropdownRow}>
                      <Text style={[styles.dropdownText, { color: trim ? '#000' : '#A9A9A9' }]}>
                        {trim || 'Base'}
                      </Text>
                      <View style={{ flex: 1 }} />
                      <Image
                        source={showTrimPicker ? require('../assets/icons/dropDownUp.png') : require('../assets/icons/dropDownDown.png')}
                        style={styles.dropdownArrow}
                        resizeMode="contain"
                      />
                    </View>
                  </TouchableOpacity>
                  {showTrimPicker && (
                    <View style={styles.dropdownMenu}>
                      <ScrollView 
                        style={{ maxHeight: 180 * scale }}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        {trimOptions.map((option) => (
                          <TouchableOpacity 
                            key={option} 
                            style={styles.dropdownItem} 
                            onPress={() => { 
                              setTrim(option); 
                              setShowTrimPicker(false); 
                            }}
                          >
                            <Text style={styles.dropdownText}>{option}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              {/* Section 7: STYLE (Optional) */}
              <View style={[styles.sectionButton, styles.transmissionSection]}>
                <Text style={styles.sectionHeader}>STYLE (OPTIONAL)</Text>
                <View style={{ position: 'relative', width: 331 * scale }}>
                  <TouchableOpacity 
                    style={styles.dropdownButton}
                    onPress={() => setShowStylePicker(!showStylePicker)}
                  >
                    <View style={styles.dropdownRow}>
                      <Text style={[styles.dropdownText, { color: style ? '#000' : '#A9A9A9' }]}>
                        {style || '4dr Sedan (Electric DD)'}
                      </Text>
                      <View style={{ flex: 1 }} />
                      <Image
                        source={showStylePicker ? require('../assets/icons/dropDownUp.png') : require('../assets/icons/dropDownDown.png')}
                        style={styles.dropdownArrow}
                        resizeMode="contain"
                      />
                    </View>
                  </TouchableOpacity>
                  {showStylePicker && (
                    <View style={styles.dropdownMenu}>
                      <ScrollView 
                        style={{ maxHeight: 180 * scale }}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        {styleOptions.map((option) => (
                          <TouchableOpacity 
                            key={option} 
                            style={styles.dropdownItem} 
                            onPress={() => { 
                              setStyle(option); 
                              setShowStylePicker(false); 
                            }}
                          >
                            <Text style={styles.dropdownText}>{option}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              {/* Section 8: COLOR */}
              <View style={[styles.sectionButton, styles.transmissionSection]}>
                <Text style={styles.sectionHeader}>COLOR</Text>
                <View style={styles.colorPickerContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScrollView}>
                    {colorOptions.map((colorOption, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.colorSwatchContainer}
                        onPress={() => setColor(colorOption.name)}
                      >
                        <View
                          style={[
                            styles.colorSwatch,
                            { backgroundColor: colorOption.value },
                            colorOption.value === '#FFFFFF' && styles.whiteColorSwatch,
                            color === colorOption.name && styles.selectedColorSwatch
                          ]}
                        >
                          {color === colorOption.name && (
                            <View style={styles.selectedColorBorder} />
                          )}
                        </View>
                        {color === colorOption.name && (
                          <Text style={styles.selectedColorText}>{colorOption.name}</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <Image
                    source={require('../assets/icons/arrow-button.png')}
                    style={styles.colorPickerArrow}
                    resizeMode="contain"
                  />
                </View>
              </View>

              {/* Section 9: FUEL TYPE */}
              <View style={[styles.sectionButton, styles.transmissionSection]}>
                <Text style={styles.sectionHeader}>FUEL TYPE</Text>
                <View style={{ position: 'relative', width: 331 * scale }}>
                  <TouchableOpacity 
                    style={styles.dropdownButton}
                    onPress={() => setShowFuelTypePicker(!showFuelTypePicker)}
                  >
                    <View style={styles.dropdownRow}>
                      <Text style={[styles.dropdownText, { color: fuelType ? '#000' : '#A9A9A9' }]}>
                        {fuelType || 'Gasoline'}
                      </Text>
                      <View style={{ flex: 1 }} />
                      <Image
                        source={showFuelTypePicker ? require('../assets/icons/dropDownUp.png') : require('../assets/icons/dropDownDown.png')}
                        style={styles.dropdownArrow}
                        resizeMode="contain"
                      />
                    </View>
                  </TouchableOpacity>
                  {showFuelTypePicker && (
                    <View style={styles.dropdownMenu}>
                      <ScrollView 
                        style={{ maxHeight: 180 * scale }}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        {fuelTypeOptions.map((option) => (
                          <TouchableOpacity 
                            key={option} 
                            style={styles.dropdownItem} 
                            onPress={() => { 
                              setFuelType(option); 
                              setShowFuelTypePicker(false); 
                            }}
                          >
                            <Text style={styles.dropdownText}>{option}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              {/* Divider between Fuel Type and License Plate */}
              <View style={styles.sectionDivider} />

              {/* Section 10: LICENSE PLATE */}
              <View style={[styles.sectionButton, styles.transmissionSection]}>
                <Text style={styles.sectionHeader}>LICENSE PLATE</Text>
                <TextInput
                  style={styles.textInput}
                  value={licensePlate}
                  onChangeText={(text) => setLicensePlate(text.toUpperCase())}
                  placeholder="ABC-1234"
                  placeholderTextColor="#A9A9A9"
                  autoCapitalize="characters"
                  maxLength={8}
                />
              </View>

              {/* Section 11: PROVINCE/STATE OF LICENSE PLATE */}
              <View style={[styles.sectionButton, styles.transmissionSection]}>
                <Text style={styles.sectionHeader}>{isUSLocation ? 'STATE OF LICENSE PLATE' : 'PROVINCE OF LICENSE PLATE'}</Text>
                <View style={{ position: 'relative', width: 331 * scale }}>
                  <TouchableOpacity 
                    style={styles.dropdownButton}
                    onPress={() => setShowLicenseProvincePicker(!showLicenseProvincePicker)}
                  >
                    <View style={styles.dropdownRow}>
                      <Text style={[styles.dropdownText, { color: licenseProvince ? '#000' : '#A9A9A9' }]}>
                        {licenseProvince || (isUSLocation ? 'Select State' : 'Select Province')}
                      </Text>
                      <View style={{ flex: 1 }} />
                      <Image
                        source={showLicenseProvincePicker ? require('../assets/icons/dropDownUp.png') : require('../assets/icons/dropDownDown.png')}
                        style={styles.dropdownArrow}
                        resizeMode="contain"
                      />
                    </View>
                  </TouchableOpacity>
                  {showLicenseProvincePicker && (
                    <View style={styles.dropdownMenu}>
                      <ScrollView 
                        style={{ maxHeight: 180 * scale }}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        {licenseProvinceOptions.map((option) => (
                          <TouchableOpacity 
                            key={option} 
                            style={styles.dropdownItem} 
                            onPress={() => { 
                              setLicenseProvince(option); 
                              setShowLicenseProvincePicker(false); 
                            }}
                          >
                            <Text style={styles.dropdownText}>{option}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              {/* Information message */}
              <View style={styles.infoMessageContainer}>
                <View style={styles.infoIcon}>
                  <Text style={styles.infoIconText}>!</Text>
                </View>
                <Text style={styles.infoMessageText}>License plate info will not be visible to the public</Text>
              </View>

              {/* Divider below information message */}
              <View style={[styles.sectionDivider, { marginTop: 27 * scale, marginBottom: 22 * scale }]} />

              {/* Section 12: Salvage Title Toggle */}
              <View style={styles.sectionButton}>
                <Text style={[styles.sectionText, styles.salvageTitleText]}>My car has never had a salvage title</Text>
                <Switch
                  value={salvageTitle}
                  onValueChange={setSalvageTitle}
                  trackColor={{ false: '#D1D1D1', true: '#4CB6B1' }}
                  thumbColor={salvageTitle ? '#FFFFFF' : '#F4F3F4'}
                  ios_backgroundColor="#D1D1D1"
                  style={styles.toggleSwitch}
                />
              </View>

              {editingListingId && (
                <View style={styles.editDescribeWrap}>
                  <Text style={styles.editDescribeSectionLabel}>VEHICLE DESCRIPTION</Text>
                  <TextInput
                    style={styles.editDescribeInput}
                    placeholder="Describe to guests why your ride is so special. Tell them why they should rent your ride."
                    placeholderTextColor="#A9A9A9"
                    value={description}
                    onChangeText={(t) => {
                      if (t.length <= DESCRIPTION_MAX_LENGTH) setDescription(t);
                    }}
                    maxLength={DESCRIPTION_MAX_LENGTH}
                    multiline
                    textAlignVertical="top"
                  />
                  <Text style={styles.editDescribeCharCount}>
                    {description.length}/{DESCRIPTION_MAX_LENGTH}
                  </Text>

                  <Text style={[styles.editDescribeSectionLabel, styles.editDescribeCarFeaturesLabel]}>
                    CAR FEATURES
                  </Text>
                  <View style={styles.editDescribeFeatureGrid}>
                    {CAR_FEATURES.map((feature) => {
                      const selected = selectedFeatures.has(feature.key);
                      return (
                        <TouchableOpacity
                          key={feature.key}
                          style={[
                            styles.editDescribeFeatureCard,
                            selected && styles.editDescribeFeatureCardSelected,
                          ]}
                          onPress={() => toggleEditDescribeFeature(feature.key)}
                          activeOpacity={0.7}
                        >
                          <Image
                            source={feature.icon}
                            style={[styles.editDescribeFeatureIcon, selected && styles.editDescribeFeatureIconSelected]}
                            resizeMode="contain"
                          />
                          <Text
                            style={[styles.editDescribeFeatureLabel, selected && styles.editDescribeFeatureLabelSelected]}
                            numberOfLines={2}
                          >
                            {feature.label}
                          </Text>
                          {selected && <View style={styles.editDescribeCardBorderOverlay} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.editDescribeSectionLabel, styles.editDescribeInstructionsLabel]}>
                    CHECK-IN INSTRUCTIONS
                  </Text>
                  <TextInput
                    style={styles.editDescribeInput}
                    placeholder="Add instructions for guests when they pick up the vehicle (e.g. where to find the keys, parking spot, contact info)"
                    placeholderTextColor="#A9A9A9"
                    value={checkInInstructions}
                    onChangeText={(t) => {
                      if (t.length <= INSTRUCTIONS_MAX_LENGTH) setCheckInInstructions(t);
                    }}
                    maxLength={INSTRUCTIONS_MAX_LENGTH}
                    multiline
                    textAlignVertical="top"
                  />
                  <Text style={styles.editDescribeCharCount}>
                    {checkInInstructions.length}/{INSTRUCTIONS_MAX_LENGTH}
                  </Text>

                  <Text style={[styles.editDescribeSectionLabel, styles.editDescribeInstructionsLabel]}>
                    CHECK-OUT INSTRUCTIONS
                  </Text>
                  <TextInput
                    style={styles.editDescribeInput}
                    placeholder="Add instructions for guests when they drop off the vehicle (e.g. where to park, key return, fuel level)"
                    placeholderTextColor="#A9A9A9"
                    value={checkOutInstructions}
                    onChangeText={(t) => {
                      if (t.length <= INSTRUCTIONS_MAX_LENGTH) setCheckOutInstructions(t);
                    }}
                    maxLength={INSTRUCTIONS_MAX_LENGTH}
                    multiline
                    textAlignVertical="top"
                  />
                  <Text style={styles.editDescribeCharCount}>
                    {checkOutInstructions.length}/{INSTRUCTIONS_MAX_LENGTH}
                  </Text>
                </View>
              )}

              {/* Next Button */}
              <View style={styles.nextButtonContainer}>
                <TouchableOpacity 
                  style={[styles.nextButton, !allRequiredFieldsFilled && styles.nextButtonDisabled]}
                  onPress={handleNext}
                  disabled={!allRequiredFieldsFilled}
                >
                  <Text style={styles.nextButtonText}>{editingListingId ? 'SAVE' : 'Next'}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </>
      )}
      </ScrollView>

      {/* Address Entry Modal */}
      <AddressEntryModal
        key={addressModalVisible ? 'open' : 'closed'}
        visible={addressModalVisible}
        onClose={handleAddressClose}
        onNext={handleAddressNext}
        initialAddress={completedAddress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingTop: 60 * scale,
    paddingBottom: 40 * scale,
  },
  scrollContentContainerEditing: {
    paddingBottom: 100 * scale,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 20 * scale,
    marginBottom: 59 * scale,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20 * scale,
    padding: 10 * scale,
  },
  backArrow: {
    width: 24 * scale,
    height: 24 * scale,
    transform: [{ rotate: '180deg' }],
  },
  mainHeader: {
    fontFamily: 'Nunito-Bold',
    fontSize: 15 * scale,
    color: '#646464',
    textAlign: 'center',
    letterSpacing: 0.2,
    paddingHorizontal: 48 * scale,
    alignSelf: 'center',
  },
  sectionButton: {
    width: 332 * scale,
    height: 53 * scale,
    backgroundColor: '#FFFFFF',
    marginBottom: 15 * scale,
    alignSelf: 'center',
    position: 'relative',
  },
  odometerSection: {
    marginBottom: 15 * scale,
  },
  transmissionSection: {
    marginTop: 15 * scale,
    marginBottom: 15 * scale,
  },
  sectionHeader: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 11 * scale,
    color: '#000000',
    letterSpacing: 0.2,
    width: 241 * scale,
    height: 15 * scale,
    textAlign: 'left',
    position: 'absolute',
    left: 0.5 * scale,
    top: -19 * scale,
  },
  sectionText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 12 * scale,
    color: '#8E8E8E',
    letterSpacing: 0.2,
    width: 256 * scale,
    height: 24 * scale,
    textAlign: 'left',
    position: 'absolute',
    left: 0.5 * scale,
    top: 5.5 * scale,
  },
  arrowIcon: {
    width: 7 * scale,
    height: 12 * scale,
    position: 'absolute',
    right: 0.5 * scale,
    top: 5.5 * scale,
  },
  divider: {
    width: 331 * scale,
    height: 2 * scale,
    borderWidth: 1 * scale,
    borderColor: '#EBEBEB',
    position: 'absolute',
    bottom: 15.5 * scale,
    left: 0.5 * scale,
    alignSelf: 'center',
  },
  sectionDivider: {
    width: 331 * scale,
    height: 1 * scale,
    backgroundColor: '#EBEBEB',
    alignSelf: 'center',
    marginVertical: 20 * scale,
  },
  selectButton: {
    position: 'absolute',
    left: 0.5 * scale,
    top: 5.5 * scale,
    width: 320 * scale,
    height: 24 * scale,
    justifyContent: 'center',
  },
  selectButtonText: {
    color: '#8E8E8E',
  },
  dropdownButton: {
    width: 331 * scale,
    height: 49 * scale,
    backgroundColor: 'rgba(249, 249, 249, 0.34)',
    borderRadius: 5 * scale,
    borderWidth: 1 * scale,
    borderColor: 'rgb(163, 163, 163)',
    justifyContent: 'center',
    marginBottom: 0,
    opacity: 1,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12 * scale,
  },
  dropdownText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 13 * scale,
    color: '#000',
    letterSpacing: 0.2,
    opacity: 0.7,
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
  dropdownArrow: {
    width: 16 * scale,
    height: 16 * scale,
    marginRight: 8 * scale,
    tintColor: '#6ED2D0',
  },
  salvageTitleText: {
    color: '#4CB6B1',
    position: 'absolute',
    left: 0.5 * scale,
    top: 5.5 * scale,
    width: 256 * scale,
  },
  toggleSwitch: {
    position: 'absolute',
    right: 0.5 * scale,
    top: -7.5 * scale,
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  textInput: {
    width: 331 * scale,
    height: 49 * scale,
    backgroundColor: 'rgba(249, 249, 249, 0.34)',
    borderRadius: 5 * scale,
    borderWidth: 1 * scale,
    borderColor: 'rgb(163, 163, 163)',
    paddingHorizontal: 12 * scale,
    fontFamily: 'Nunito-SemiBold',
    fontSize: 13 * scale,
    color: '#000',
    letterSpacing: 0.2,
    opacity: 0.7,
  },
  colorPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 331 * scale,
    justifyContent: 'space-between',
  },
  colorScrollView: {
    flex: 1,
  },
  colorPickerArrow: {
    width: 7 * scale,
    height: 12 * scale,
    marginLeft: 12 * scale,
  },
  colorSwatchContainer: {
    alignItems: 'center',
    marginRight: 28 * scale,
  },
  colorSwatch: {
    width: 32 * scale,
    height: 32 * scale,
    borderRadius: 16 * scale,
    position: 'relative',
  },
  whiteColorSwatch: {
    borderWidth: 1 * scale,
    borderColor: '#E0E0E0',
  },
  selectedColorSwatch: {
    borderWidth: 2 * scale,
    borderColor: '#FFB131',
  },
  selectedColorBorder: {
    position: 'absolute',
    top: -2 * scale,
    left: -2 * scale,
    right: -2 * scale,
    bottom: -2 * scale,
    borderRadius: 18 * scale,
    borderWidth: 2 * scale,
    borderColor: '#FFB131',
  },
  selectedColorText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 10 * scale,
    color: '#8E8E8E',
    letterSpacing: 0.2,
    marginTop: 4 * scale,
    textAlign: 'center',
  },
  infoMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    paddingHorizontal: 20 * scale,
  },
  infoIcon: {
    width: 16 * scale,
    height: 16 * scale,
    borderRadius: 8 * scale,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5 * scale,
    borderColor: 'rgb(76, 182, 177)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8 * scale,
  },
  infoIconText: {
    color: 'rgb(76, 182, 177)',
    fontSize: 10 * scale,
    fontFamily: 'Nunito-Bold',
  },
  infoMessageText: {
    flex: 1,
    fontFamily: 'Nunito-SemiBold',
    fontSize: 12 * scale,
    color: '#8E8E8E',
    letterSpacing: 0.2,
  },
  editDescribeWrap: {
    width: 332 * scale,
    alignSelf: 'center',
    marginTop: 28 * scale,
    paddingHorizontal: 0,
  },
  editDescribeSectionLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: '#4A4A4A',
    letterSpacing: 0.2,
    marginBottom: 8 * scale,
  },
  editDescribeCarFeaturesLabel: {
    marginTop: 28 * scale,
  },
  editDescribeInstructionsLabel: {
    marginTop: 28 * scale,
  },
  editDescribeInput: {
    width: '100%',
    minHeight: 120 * scale,
    backgroundColor: 'rgba(249, 249, 249, 0.34)',
    borderRadius: 5 * scale,
    borderWidth: 1 * scale,
    borderColor: 'rgb(163, 163, 163)',
    paddingHorizontal: 12 * scale,
    paddingVertical: 12 * scale,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: '#000',
  },
  editDescribeCharCount: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: '#9B9B9B',
    marginTop: 6 * scale,
    alignSelf: 'flex-end',
  },
  editDescribeFeatureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8 * scale,
  },
  editDescribeFeatureCard: {
    width: EDIT_DESCRIBE_CARD_SIZE,
    height: EDIT_DESCRIBE_CARD_SIZE,
    backgroundColor: '#FFFFFF',
    borderRadius: 8 * scale,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12 * scale,
    position: 'relative',
  },
  editDescribeFeatureCardSelected: {
    borderColor: COLORS.GREENY_BLUE_TWO,
  },
  editDescribeFeatureIcon: {
    width: 70,
    height: 70,
    marginBottom: 8 * scale,
  },
  editDescribeFeatureIconSelected: {
    tintColor: COLORS.GREENY_BLUE_TWO,
  },
  editDescribeFeatureLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 9 * scale,
    color: '#4A4A4A',
    textAlign: 'center',
    letterSpacing: 0.2,
    paddingHorizontal: 4,
  },
  editDescribeFeatureLabelSelected: {
    color: COLORS.GREENY_BLUE_TWO,
  },
  editDescribeCardBorderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8 * scale,
    borderWidth: 2,
    borderColor: COLORS.GREENY_BLUE_TWO,
    backgroundColor: 'transparent',
  },
  nextButtonContainer: {
    alignItems: 'center',
    marginTop: 40 * scale,
    marginBottom: 30 * scale,
  },
  nextButton: {
    width: 331 * scale,
    height: 51 * scale,
    backgroundColor: 'rgb(76, 182, 177)',
    borderRadius: 25.5 * scale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#D1D1D1',
    opacity: 0.6,
  },
  nextButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 17 * scale,
    color: '#FFFFFF',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});

export default TellUsAboutYourRideScreen1; 