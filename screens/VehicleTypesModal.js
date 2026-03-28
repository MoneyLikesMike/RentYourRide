import React from 'react';
import { View, Text, TouchableOpacity, Modal, Dimensions, ScrollView, StyleSheet, Image } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const scale = screenWidth / 375; // Base width is 375

const VehicleTypesModal = ({ visible, onClose, onContinue }) => {

  const vehicleTypes = [
    'Cars',
    'SUV',
    'Pickup Truck',
    'Van',
    'Commercial Truck',
    'RV and Motorhome',
    'Moped and Scooter',
    'Buses'
  ];

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
        
        <TouchableOpacity 
          style={styles.modalContainer}
          onPress={() => {}} // Prevent touch events from bubbling
          activeOpacity={1}
        >
          {/* Slide indicator */}
          <View style={styles.slideIndicator}>
            <View style={styles.slideBar} />
          </View>

          {/* Header */}
          <Text style={styles.header}>Types of vehicle you can list</Text>

          {/* Vehicle types list */}
          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {vehicleTypes.map((vehicle, index) => (
              <View key={index} style={styles.vehicleRow}>
                <Image 
                  source={require('../assets/icons/checkmark.png')}
                  style={styles.checkmark}
                  resizeMode="contain"
                />
                <Text style={styles.vehicleText}>{vehicle}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Continue button */}
          <TouchableOpacity 
            style={styles.continueButton}
            onPress={() => onContinue()}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </TouchableOpacity>
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
    height: 613 * scale,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 14 * scale,
    borderTopRightRadius: 14 * scale,
    paddingTop: 20 * scale,
    paddingHorizontal: 40 * scale,
    paddingBottom: 40 * scale,
  },
  slideIndicator: {
    alignItems: 'center',
    marginBottom: 31 * scale,
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
    height: 30 * scale,
    alignSelf: 'center',
    marginBottom: 30 * scale,
  },
  scrollContainer: {
    flex: 1,
    marginBottom: 20 * scale,
    paddingHorizontal: 20 * scale,
    paddingVertical: 10 * scale,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: -5 * scale,
    paddingVertical: 10 * scale,
    justifyContent: 'center',
    width: '100%',
    paddingLeft: 50 * scale,
  },
  checkmark: {
    width: 22 * scale,
    height: 20 * scale,
    marginRight: 15 * scale,
    marginTop: 2 * scale,
  },
  vehicleText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16 * scale,
    color: '#505050',
    letterSpacing: -0.2,
    width: 200 * scale,
    height: 31 * scale,
    textAlign: 'left',
  },
  continueButton: {
    width: 239 * scale,
    height: 50 * scale,
    backgroundColor: '#00B4AB',
    borderRadius: 25 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  continueButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16 * scale,
    color: '#F7F7F7',
    textAlign: 'center',
    letterSpacing: 0.2,
    width: 239 * scale,
    height: 22 * scale,
  },
});

export default VehicleTypesModal; 