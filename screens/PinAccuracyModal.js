import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Dimensions, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const scale = screenWidth / 375; // Base width is 375

const PinAccuracyModal = ({ visible, onClose, onNext, addressData, onAddressUpdate }) => {
  // Default coordinates (you can replace with actual geocoded coordinates)
  const [pinCoordinate, setPinCoordinate] = useState({
    latitude: 43.6532,
    longitude: -79.3832,
  });

  const defaultRegion = {
    latitude: pinCoordinate.latitude,
    longitude: pinCoordinate.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const handlePinDragEnd = async (e) => {
    const newCoordinate = e.nativeEvent.coordinate;
    setPinCoordinate(newCoordinate);
    
    // Reverse geocode the new location
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: newCoordinate.latitude,
        longitude: newCoordinate.longitude,
      });

      if (reverseGeocode.length > 0) {
        const addressInfo = reverseGeocode[0];
        
        const countryName = addressInfo.country || 'Unknown Country';
        const cityName = addressInfo.city || addressInfo.region || 'Unknown City';
        const streetAddress = addressInfo.street ? 
          `${addressInfo.street}${addressInfo.streetNumber ? ` ${addressInfo.streetNumber}` : ''}` : 
          'Unknown Address';

        // Update the address fields
        onAddressUpdate({
          country: countryName,
          city: cityName,
          address: streetAddress,
        });
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  };

  const handlePinAccuracyNext = () => {
    onNext(); // Pass the address data back to the parent screen
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
          <Text style={styles.header}>Is the pin in the right place?</Text>

          {/* Map with draggable pin */}
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              region={defaultRegion}
              showsUserLocation={true}
              showsMyLocationButton={false}
            >
              <Marker
                coordinate={pinCoordinate}
                title="Pickup Location"
                description={`${addressData?.address}, ${addressData?.city}, ${addressData?.country}`}
                draggable={true}
                onDragEnd={handlePinDragEnd}
              />
            </MapView>
          </View>

          {/* Next button positioned on top of map */}
          <TouchableOpacity 
            style={styles.nextButton}
            onPress={() => onNext()}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    height: screenHeight * 0.9,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 14 * scale,
    borderTopRightRadius: 14 * scale,
    paddingTop: 20 * scale,
    paddingHorizontal: 0,
    paddingBottom: 0,
    position: 'relative',
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
    color: 'rgba(14, 38, 43, 1)',
    textAlign: 'center',
    width: '100%',
    height: 40 * scale,
    alignSelf: 'center',
    marginBottom: 20 * scale,
    paddingHorizontal: 20 * scale,
  },
  mapContainer: {
    flex: 1,
    width: 375 * scale,
    backgroundColor: 'transparent',
    borderRadius: 14 * scale,
    marginBottom: 0,
    position: 'relative',
    marginTop: 0,
  },
  map: {
    width: '100%',
    height: '100%',
    borderRadius: 14 * scale,
  },
  mapPlaceholder: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16 * scale,
    color: '#8E8E8E',
    textAlign: 'center',
    marginBottom: 15 * scale,
  },
  addressText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14 * scale,
    color: '#505050',
    textAlign: 'center',
    lineHeight: 20 * scale,
  },
  nextButton: {
    position: 'absolute',
    bottom: 40 * scale,
    width: 239 * scale,
    height: 50 * scale,
    backgroundColor: '#00B4AB',
    borderRadius: 25 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    zIndex: 10,
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

export default PinAccuracyModal; 