import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DismissKeyboard from '../components/DismissKeyboard';
import PinAccuracyModal from './PinAccuracyModal';
import GooglePlacesAutocompleteField from '../components/GooglePlacesAutocompleteField';
import { resolveCurrentLocationAddress } from '../utils/currentLocation';
import { forwardGeocode } from '../services/geocodeApi';

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375;

function buildAddressQuery({ address, city, country }) {
  return [address, city, country].filter(Boolean).join(', ');
}

const AddressEntryModal = ({ visible, onClose, onNext, initialAddress }) => {
  const [country, setCountry] = useState(initialAddress?.country || '');
  const [city, setCity] = useState(initialAddress?.city || '');
  const [address, setAddress] = useState(initialAddress?.address || '');
  const [latitude, setLatitude] = useState(
    Number.isFinite(initialAddress?.latitude) ? initialAddress.latitude : null,
  );
  const [longitude, setLongitude] = useState(
    Number.isFinite(initialAddress?.longitude) ? initialAddress.longitude : null,
  );
  const [editingField, setEditingField] = useState(null);
  const [showPinAccuracyModal, setShowPinAccuracyModal] = useState(false);
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const [pinAddressData, setPinAddressData] = useState(null);

  React.useEffect(() => {
    if (visible && initialAddress) {
      setCountry(initialAddress.country || '');
      setCity(initialAddress.city || '');
      setAddress(initialAddress.address || '');
      setLatitude(Number.isFinite(initialAddress.latitude) ? initialAddress.latitude : null);
      setLongitude(Number.isFinite(initialAddress.longitude) ? initialAddress.longitude : null);
    }
  }, [visible, initialAddress]);

  const handleEditField = (field) => {
    setEditingField(field);
  };

  const applyPlaceSelection = (field, { selection }) => {
    if (field === 'country') {
      setCountry(selection.country || selection.query);
    } else if (field === 'city') {
      setCity(selection.city || selection.query.split(',')[0].trim());
      if (selection.country) setCountry(selection.country);
    } else if (field === 'address') {
      setAddress(selection.street || selection.query);
      if (selection.city) setCity(selection.city);
      if (selection.country) setCountry(selection.country);
    }
    if (Number.isFinite(selection.latitude) && Number.isFinite(selection.longitude)) {
      setLatitude(selection.latitude);
      setLongitude(selection.longitude);
    }
    setEditingField(null);
  };

  const handleCurrentLocation = async () => {
    const addressData = await resolveCurrentLocationAddress();
    if (!addressData) return;

    setCountry(addressData.country);
    setCity(addressData.city);
    setAddress(addressData.address);
    if (Number.isFinite(addressData.latitude) && Number.isFinite(addressData.longitude)) {
      setLatitude(addressData.latitude);
      setLongitude(addressData.longitude);
    }
    setEditingField(null);
  };

  const resolveCoordinatesForPin = async () => {
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
    const query = buildAddressQuery({ address, city, country });
    if (!query.trim()) {
      throw new Error('Please enter your pickup address before continuing.');
    }
    const geo = await forwardGeocode(query);
    setLatitude(geo.latitude);
    setLongitude(geo.longitude);
    return { latitude: geo.latitude, longitude: geo.longitude };
  };

  const handleAddressNext = async () => {
    setResolvingLocation(true);
    try {
      const coords = await resolveCoordinatesForPin();
      setPinAddressData({
        country,
        city,
        address,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      setShowPinAccuracyModal(true);
    } catch (err) {
      Alert.alert('Location', err?.message || 'Could not find that location on the map.');
    } finally {
      setResolvingLocation(false);
    }
  };

  const handlePinAccuracyClose = () => {
    setShowPinAccuracyModal(false);
  };

  const handlePinAccuracyNext = (addressData) => {
    setShowPinAccuracyModal(false);
    setCountry(addressData.country);
    setCity(addressData.city);
    setAddress(addressData.address);
    setLatitude(addressData.latitude);
    setLongitude(addressData.longitude);
    onNext(addressData);
  };

  const handleAddressUpdate = (newAddressData) => {
    if (newAddressData.country != null) setCountry(newAddressData.country);
    if (newAddressData.city != null) setCity(newAddressData.city);
    if (newAddressData.address != null) setAddress(newAddressData.address);
    if (Number.isFinite(newAddressData.latitude) && Number.isFinite(newAddressData.longitude)) {
      setLatitude(newAddressData.latitude);
      setLongitude(newAddressData.longitude);
      setPinAddressData((prev) =>
        prev
          ? {
              ...prev,
              country: newAddressData.country ?? prev.country,
              city: newAddressData.city ?? prev.city,
              address: newAddressData.address ?? prev.address,
              latitude: newAddressData.latitude,
              longitude: newAddressData.longitude,
            }
          : null,
      );
    }
  };

  const fieldTypes = {
    country: 'country',
    city: '(cities)',
    address: 'address',
  };

  const renderField = (field, label, value) => {
    const isEditing = editingField === field;
    const hasValue = value && value.trim() !== '';

    return (
      <View style={styles.inputGroup}>
        <View style={styles.fieldRow}>
          <Text style={styles.inputLabel}>{label}</Text>
          {!isEditing && !hasValue && (
            <TouchableOpacity style={styles.editButton} onPress={() => handleEditField(field)}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {isEditing ? (
          <View style={styles.inputContainer}>
            <GooglePlacesAutocompleteField
              placeholder={`Enter ${label.toLowerCase()}`}
              types={fieldTypes[field]}
              onPlaceSelected={(result) => applyPlaceSelection(field, result)}
              containerStyle={styles.placesField}
            />
          </View>
        ) : hasValue ? (
          <TouchableOpacity style={styles.completedFieldContainer} onPress={() => handleEditField(field)}>
            <Text style={styles.completedFieldText}>{value}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.overlayTouchable} onPress={onClose} activeOpacity={1} />

        <DismissKeyboard style={styles.modalContainer}>
          <View style={styles.slideIndicator}>
            <View style={styles.slideBar} />
          </View>

          <Text style={styles.header}>Where can guests pick up{'\n'}your ride?</Text>

          <Text style={styles.mainParagraph}>
            Guests can only see the exact pick up location once you've approved their booking
          </Text>

          <TouchableOpacity style={styles.currentLocationButton} onPress={handleCurrentLocation}>
            <Text style={styles.currentLocationText}>Use current location</Text>
          </TouchableOpacity>

          <Text style={styles.orText}>or enter your address</Text>

          <View style={styles.addressFields}>
            {renderField('country', 'COUNTRY', country)}
            {renderField('city', 'CITY', city)}
            {renderField('address', 'ADDRESS', address)}
          </View>

          <TouchableOpacity
            style={[styles.nextButton, resolvingLocation && styles.nextButtonDisabled]}
            onPress={handleAddressNext}
            disabled={resolvingLocation}
          >
            {resolvingLocation ? (
              <ActivityIndicator color="#F7F7F7" />
            ) : (
              <Text style={styles.nextButtonText}>Next</Text>
            )}
          </TouchableOpacity>
        </DismissKeyboard>
      </View>

      <PinAccuracyModal
        visible={showPinAccuracyModal}
        onClose={handlePinAccuracyClose}
        onNext={handlePinAccuracyNext}
        addressData={pinAddressData}
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
    textAlign: 'center',
  },
  orText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 13 * scale,
    color: '#8E8E8E',
    textAlign: 'center',
    letterSpacing: 0.2,
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
    opacity: 0.7,
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
    opacity: 0.7,
  },
  inputContainer: {
    position: 'relative',
    zIndex: 1,
  },
  placesField: {
    zIndex: 5,
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
  nextButtonDisabled: {
    opacity: 0.7,
  },
  nextButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16 * scale,
    color: '#F7F7F7',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});

export default AddressEntryModal;
