import React, { useEffect, useRef, useState } from 'react';
import { uiScale } from '../utils/uiScale';
import { View, Text, TouchableOpacity, Modal, Dimensions, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { reverseGeocode } from '../services/geocodeApi';
import { MAP_PROVIDER } from '../utils/mapProvider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const scale = uiScale;

const PinAccuracyModal = ({ visible, onClose, onNext, addressData, onAddressUpdate }) => {
  const mapRef = useRef(null);
  const [pinCoordinate, setPinCoordinate] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!visible) {
      setMapReady(false);
      return;
    }
    const lat = addressData?.latitude;
    const lng = addressData?.longitude;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const next = { latitude: lat, longitude: lng };
      setPinCoordinate(next);
    }
  }, [visible, addressData?.latitude, addressData?.longitude]);

  useEffect(() => {
    if (!visible || !mapReady || !pinCoordinate || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: pinCoordinate.latitude,
        longitude: pinCoordinate.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      300,
    );
  }, [visible, mapReady, pinCoordinate?.latitude, pinCoordinate?.longitude]);

  const handlePinDragEnd = async (e) => {
    const newCoordinate = e.nativeEvent.coordinate;
    setPinCoordinate(newCoordinate);

    try {
      const geo = await reverseGeocode(newCoordinate.latitude, newCoordinate.longitude);
      onAddressUpdate({
        country: geo.country || addressData?.country || '',
        city: geo.city || addressData?.city || '',
        address: geo.street || geo.formatted || addressData?.address || '',
        latitude: newCoordinate.latitude,
        longitude: newCoordinate.longitude,
      });
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      onAddressUpdate({
        latitude: newCoordinate.latitude,
        longitude: newCoordinate.longitude,
      });
    }
  };

  const mapRegion = pinCoordinate
    ? {
        latitude: pinCoordinate.latitude,
        longitude: pinCoordinate.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.overlayTouchable} onPress={onClose} activeOpacity={1} />

        <View style={styles.modalContainer}>
          <View style={styles.slideIndicator}>
            <View style={styles.slideBar} />
          </View>

          <Text style={styles.header}>Is the pin in the right place?</Text>

          <View style={styles.mapContainer}>
            {mapRegion ? (
              <MapView
                ref={mapRef}
                provider={MAP_PROVIDER}
                style={styles.map}
                initialRegion={mapRegion}
                onMapReady={() => setMapReady(true)}
                showsUserLocation
                showsMyLocationButton={false}
              >
                <Marker
                  coordinate={pinCoordinate}
                  title="Pickup Location"
                  description={`${addressData?.address || ''}, ${addressData?.city || ''}, ${addressData?.country || ''}`}
                  draggable
                  onDragEnd={handlePinDragEnd}
                />
              </MapView>
            ) : (
              <View style={styles.mapLoading}>
                <ActivityIndicator size="large" color="#00B4AB" />
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.nextButton, !pinCoordinate && styles.nextButtonDisabled]}
            disabled={!pinCoordinate}
            onPress={() => {
              if (!pinCoordinate) return;
              onNext({
                country: addressData?.country || '',
                city: addressData?.city || '',
                address: addressData?.address || '',
                latitude: pinCoordinate.latitude,
                longitude: pinCoordinate.longitude,
              });
            }}
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
    marginBottom: 20 * scale,
    paddingHorizontal: 20 * scale,
  },
  mapContainer: {
    flex: 1,
    width: 375 * scale,
    borderRadius: 14 * scale,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
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
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16 * scale,
    color: '#F7F7F7',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});

export default PinAccuracyModal;
