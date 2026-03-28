import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Dimensions, ScrollView, StyleSheet, TextInput, FlatList, Alert } from 'react-native';
import * as Location from 'expo-location';
import PinAccuracyModal from './PinAccuracyModal';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const scale = screenWidth / 375; // Base width is 375

const AddressEntryModal = ({ visible, onClose, onNext, initialAddress }) => {
  const [country, setCountry] = useState(initialAddress?.country || '');
  const [city, setCity] = useState(initialAddress?.city || '');
  const [address, setAddress] = useState(initialAddress?.address || '');
  const [editingField, setEditingField] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [inputValues, setInputValues] = useState({
    country: '',
    city: '',
    address: ''
  });
  const [showPinAccuracyModal, setShowPinAccuracyModal] = useState(false);

  // Update fields when modal opens with initial address data
  React.useEffect(() => {
    if (visible && initialAddress) {
      setCountry(initialAddress.country || '');
      setCity(initialAddress.city || '');
      setAddress(initialAddress.address || '');
    }
  }, [visible, initialAddress]);

  const handleEditField = (field) => {
    setEditingField(field);
    setInputValues(prev => ({ ...prev, [field]: '' }));
    setSuggestions([]);
  };

  const handleInputChange = (field, value) => {
    setInputValues(prev => ({ ...prev, [field]: value }));
    
    // Simulate Google suggestions based on input
    if (value.length > 0) {
      const mockSuggestions = {
        country: ['Canada', 'United States', 'Mexico', 'United Kingdom', 'Germany'],
        city: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Edmonton'],
        address: ['123 Main St', '456 Oak Ave', '789 Pine Rd', '321 Elm St', '654 Maple Dr']
      };
      
      const filtered = mockSuggestions[field].filter(item => 
        item.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionSelect = (field, suggestion) => {
    if (field === 'country') setCountry(suggestion);
    if (field === 'city') setCity(suggestion);
    if (field === 'address') setAddress(suggestion);
    
    setEditingField(null);
    setSuggestions([]);
    setInputValues(prev => ({ ...prev, [field]: '' }));
  };

  const handleInputComplete = (field) => {
    const value = inputValues[field];
    if (value.trim()) {
      if (field === 'country') setCountry(value);
      if (field === 'city') setCity(value);
      if (field === 'address') setAddress(value);
    }
    setEditingField(null);
    setSuggestions([]);
    setInputValues(prev => ({ ...prev, [field]: '' }));
  };

  const handleCurrentLocation = async () => {
    try {
      // Request location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use current location.');
        return;
      }

      // Get current location
      let location = await Location.getCurrentPositionAsync({});
      
      // Reverse geocode to get address details
      let reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const addressInfo = reverseGeocode[0];
        
        // Extract country, city, and address
        const countryName = addressInfo.country || 'Unknown Country';
        const cityName = addressInfo.city || addressInfo.region || 'Unknown City';
        const streetAddress = addressInfo.street ? 
          `${addressInfo.street}${addressInfo.streetNumber ? ` ${addressInfo.streetNumber}` : ''}` : 
          'Unknown Address';

        // Set the values
        setCountry(countryName);
        setCity(cityName);
        setAddress(streetAddress);
        
        // Close any open editing field
        setEditingField(null);
        setSuggestions([]);
        setInputValues({ country: '', city: '', address: '' });
      } else {
        Alert.alert('Location Error', 'Unable to get address information for your current location.');
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Location Error', 'Unable to get your current location. Please try again.');
    }
  };

  const handleAddressNext = () => {
    setShowPinAccuracyModal(true);
  };

  const handlePinAccuracyClose = () => {
    setShowPinAccuracyModal(false);
  };

  const handlePinAccuracyNext = () => {
    setShowPinAccuracyModal(false);
    // Pass the address data back to the parent screen
    onNext({ country, city, address });
  };

  const handleAddressUpdate = (newAddressData) => {
    setCountry(newAddressData.country);
    setCity(newAddressData.city);
    setAddress(newAddressData.address);
  };

  const renderField = (field, label, value) => {
    const isEditing = editingField === field;
    const hasValue = value && value.trim() !== '';

    return (
      <View style={styles.inputGroup}>
        <View style={styles.fieldRow}>
          <Text style={styles.inputLabel}>{label}</Text>
          {!isEditing && !hasValue && (
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => handleEditField(field)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {isEditing ? (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputValues[field]}
              onChangeText={(text) => handleInputChange(field, text)}
              placeholder={`Enter ${label.toLowerCase()}`}
              placeholderTextColor="#8E8E8E"
              autoFocus={true}
              onSubmitEditing={() => handleInputComplete(field)}
            />
            {suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <FlatList
                  data={suggestions}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.suggestionItem}
                      onPress={() => handleSuggestionSelect(field, item)}
                    >
                      <Text style={styles.suggestionText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                  style={styles.suggestionsList}
                />
              </View>
            )}
          </View>
        ) : hasValue ? (
          <TouchableOpacity 
            style={styles.completedFieldContainer}
            onPress={() => handleEditField(field)}
          >
            <Text style={styles.completedFieldText}>{value}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.overlayTouchable} 
          onPress={onClose}
          activeOpacity={1}
        />
        
        <View style={styles.modalContainer}>
          {/* Slide indicator */}
          <View style={styles.slideIndicator}>
            <View style={styles.slideBar} />
          </View>

          {/* Header */}
          <Text style={styles.header}>Where can guests pick up{'\n'}your ride?</Text>

          {/* Main paragraph */}
          <Text style={styles.mainParagraph}>
            Guests can only see the exact pick up location once you've approved their booking
          </Text>

          {/* Use current location button */}
          <TouchableOpacity 
            style={styles.currentLocationButton}
            onPress={handleCurrentLocation}
          >
            <Text style={styles.currentLocationText}>Use current location</Text>
          </TouchableOpacity>

          {/* Or enter address text */}
          <Text style={styles.orText}>or enter your address</Text>

          {/* Address entry fields */}
          <View style={styles.addressFields}>
            {renderField('country', 'COUNTRY', country)}
            {renderField('city', 'CITY', city)}
            {renderField('address', 'ADDRESS', address)}
          </View>

          {/* Next button */}
          <TouchableOpacity 
            style={styles.nextButton}
            onPress={handleAddressNext}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Pin Accuracy Modal */}
      <PinAccuracyModal
        visible={showPinAccuracyModal}
        onClose={handlePinAccuracyClose}
        onNext={handlePinAccuracyNext}
        addressData={{ country, city, address }}
        onAddressUpdate={handleAddressUpdate}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  modalContainer: {
    width: 375 * scale,
    height: 691 * scale,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 14 * scale,
    borderTopRightRadius: 14 * scale,
    paddingTop: 20 * scale,
    paddingHorizontal: 20 * scale,
    paddingBottom: 40 * scale,
  },
  slideIndicator: {
    alignItems: 'center',
    marginBottom: 20 * scale,
  },
  slideBar: {
    width: 48 * scale,
    height: 2 * scale,
    backgroundColor: '#FFB131',
    borderRadius: 1 * scale,
    opacity: 0.52,
  },
  header: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 22 * scale,
    color: '#0E262B',
    textAlign: 'center',
    width: 280 * scale,
    height: 60 * scale,
    alignSelf: 'center',
    marginBottom: 20 * scale,
  },
  mainParagraph: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 15 * scale,
    color: '#8E8E8E',
    textAlign: 'center',
    letterSpacing: 0.2,
    width: 283 * scale,
    height: 69 * scale,
    alignSelf: 'center',
    marginBottom: 30 * scale,
  },
  currentLocationButton: {
    width: 273 * scale,
    height: 50 * scale,
    backgroundColor: 'rgba(255, 178, 20, 0.1)',
    borderRadius: 25 * scale,
    borderWidth: 2 * scale,
    borderColor: '#FFB131',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 15 * scale,
  },
  currentLocationText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16 * scale,
    color: '#FFB131',
    letterSpacing: 0.2,
    width: 150 * scale,
    height: 22 * scale,
    textAlign: 'center',
  },
  orText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 13 * scale,
    color: '#8E8E8E',
    textAlign: 'center',
    letterSpacing: 0.2,
    width: 283 * scale,
    height: 18 * scale,
    alignSelf: 'center',
    marginBottom: 30 * scale,
  },
  addressFields: {
    marginBottom: 30 * scale,
  },
  inputGroup: {
    marginBottom: 41 * scale,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8 * scale,
    paddingHorizontal: 0,
  },
  inputLabel: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 11 * scale,
    color: '#000000',
    letterSpacing: 0.2,
    width: 98 * scale,
    height: 15 * scale,
    textAlign: 'left',
    opacity: 0.7,
    alignSelf: 'flex-start',
    marginLeft: 10 * scale,
  },
  editButton: {
    width: 80 * scale,
    height: 20 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -9 * scale,
  },
  editButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 15 * scale,
    color: '#00B4AB',
    letterSpacing: 0.2,
    textAlign: 'right',
    opacity: 0.7,
  },
  inputContainer: {
    position: 'relative',
    zIndex: 1,
  },
  textInput: {
    width: '100%',
    height: 50 * scale,
    borderWidth: 1 * scale,
    borderColor: '#E0E0E0',
    borderRadius: 8 * scale,
    paddingHorizontal: 12 * scale,
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14 * scale,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 50 * scale,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1 * scale,
    borderColor: '#E0E0E0',
    borderRadius: 8 * scale,
    maxHeight: 150 * scale,
    zIndex: 2,
  },
  suggestionsList: {
    maxHeight: 150 * scale,
  },
  suggestionItem: {
    paddingHorizontal: 12 * scale,
    paddingVertical: 10 * scale,
    borderBottomWidth: 1 * scale,
    borderBottomColor: '#F0F0F0',
  },
  suggestionText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14 * scale,
    color: '#000000',
  },
  completedFieldContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 120 * scale,
    height: 20 * scale,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 10 * scale,
  },
  completedFieldText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 15 * scale,
    color: 'rgba(142, 142, 142, 1)',
    textAlign: 'right',
    letterSpacing: 0.2,
    opacity: 0.7,
    flexShrink: 1,
  },
  nextButton: {
    width: 239 * scale,
    height: 50 * scale,
    backgroundColor: '#00B4AB',
    borderRadius: 25 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  nextButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16 * scale,
    color: '#F7F7F7',
    letterSpacing: 0.2,
    width: 36 * scale,
    height: 22 * scale,
    textAlign: 'center',
  },
});

export default AddressEntryModal; 