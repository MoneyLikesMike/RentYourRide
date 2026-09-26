import React, { useState } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DismissKeyboard from '../components/DismissKeyboard';
import PinAccuracyModal from './PinAccuracyModal';
import GooglePlacesAutocompleteField from '../components/GooglePlacesAutocompleteField';
import { resolveCurrentLocationAddress } from '../utils/currentLocation';
import { forwardGeocode } from '../services/geocodeApi';

const scale = uiScale;

function buildAddressQuery({ address, city, country }) {
  return [address, city, country].filter(Boolean).join(', ');
}

function formatAddressDisplay({ address, city, country }) {
  return buildAddressQuery({ address, city, country });
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
  const [selectedDisplay, setSelectedDisplay] = useState('');
  const [searchInitialValue, setSearchInitialValue] = useState('');
  const [showPinAccuracyModal, setShowPinAccuracyModal] = useState(false);
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const [pinAddressData, setPinAddressData] = useState(null);

  React.useEffect(() => {
    if (!visible || !initialAddress) return;
    setCountry(initialAddress.country || '');
    setCity(initialAddress.city || '');
    setAddress(initialAddress.address || '');
    setLatitude(Number.isFinite(initialAddress.latitude) ? initialAddress.latitude : null);
    setLongitude(Number.isFinite(initialAddress.longitude) ? initialAddress.longitude : null);
    const display = formatAddressDisplay(initialAddress);
    setSelectedDisplay(display);
    setSearchInitialValue(display);
  }, [visible, initialAddress]);

  const applyPlaceSelection = ({ selection }) => {
    const street = selection.street || selection.query.split(',')[0]?.trim() || selection.query;
    setAddress(street);
    setCity(selection.city || '');
    setCountry(selection.country || '');
    if (Number.isFinite(selection.latitude) && Number.isFinite(selection.longitude)) {
      setLatitude(selection.latitude);
      setLongitude(selection.longitude);
    }
    const display = selection.query || formatAddressDisplay({
      address: street,
      city: selection.city,
      country: selection.country,
    });
    setSelectedDisplay(display);
    setSearchInitialValue(display);
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
    const display = formatAddressDisplay(addressData);
    setSelectedDisplay(display);
    setSearchInitialValue(display);
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
    if (!buildAddressQuery({ address, city, country }).trim()) {
      Alert.alert('Location', 'Please search for or use your current location.');
      return;
    }
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
    const display = formatAddressDisplay(addressData);
    setSelectedDisplay(display);
    setSearchInitialValue(display);
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
    const display = formatAddressDisplay({
      country: newAddressData.country ?? country,
      city: newAddressData.city ?? city,
      address: newAddressData.address ?? address,
    });
    if (display.trim()) {
      setSelectedDisplay(display);
      setSearchInitialValue(display);
    }
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

          <Text style={styles.orText}>or search for your address</Text>

          <View style={styles.searchSection}>
            <GooglePlacesAutocompleteField
              key={searchInitialValue || 'address-search'}
              placeholder="Search address"
              types="address"
              initialValue={searchInitialValue}
              onPlaceSelected={applyPlaceSelection}
              containerStyle={styles.placesField}
            />
          </View>

          {selectedDisplay ? (
            <View style={styles.selectedAddressBox}>
              <Text style={styles.selectedAddressLabel}>Selected address</Text>
              <Text style={styles.selectedAddressText}>{selectedDisplay}</Text>
            </View>
          ) : null}

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
    marginBottom: 16 * scale,
  },
  searchSection: {
    marginBottom: 16 * scale,
    zIndex: 20,
  },
  placesField: {
    zIndex: 20,
  },
  selectedAddressBox: {
    backgroundColor: 'rgba(0, 180, 171, 0.08)',
    borderRadius: 8 * scale,
    borderWidth: 1,
    borderColor: 'rgba(0, 180, 171, 0.25)',
    paddingHorizontal: 14 * scale,
    paddingVertical: 12 * scale,
    marginBottom: 24 * scale,
  },
  selectedAddressLabel: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 11 * scale,
    color: '#00B4AB',
    letterSpacing: 0.3,
    marginBottom: 4 * scale,
    textTransform: 'uppercase',
  },
  selectedAddressText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14 * scale,
    color: '#505050',
    lineHeight: 20 * scale,
  },
  nextButton: {
    width: 239 * scale,
    height: 50 * scale,
    backgroundColor: '#00B4AB',
    borderRadius: 25 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 8 * scale,
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
