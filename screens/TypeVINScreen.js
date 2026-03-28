import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Dimensions, Switch } from 'react-native';
import { Svg, Path } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375; // Base width is 375

const TypeVINScreen = ({ navigation, route }) => {
  const { completedAddress } = route.params || {};
  const [isModelYear1981OrLater, setIsModelYear1981OrLater] = useState(true);
  const [vinNumber, setVinNumber] = useState('');

  // Mock list of existing VINs - in real app this would come from your database
  const existingVINs = ['DLKHFKLHE3HJKH23J', 'ABC123DEF456GHI78', 'XYZ789JKL012MNO34'];

  const handleContinue = () => {
    // Validate VIN format (basic check for 17 characters)
    if (vinNumber.length !== 17) {
      alert('VIN must be exactly 17 characters long');
      return;
    }

    // Check if VIN already exists
    if (existingVINs.includes(vinNumber.toUpperCase())) {
      // Navigate to VIN already exists screen
      navigation.navigate('VINAlreadyExistsScreen');
    } else {
      // Mock vehicle data - in real app this would come from VIN lookup API
      const vehicleData = {
        year: '2020',
        make: 'Toyota',
        model: 'Camry',
        body: 'Sedan',
        vin: vinNumber.toUpperCase(),
        isModelYear1981OrLater: isModelYear1981OrLater
      };
      
      // Navigate back to Tell Us About Your Ride screen with vehicle data and address
      navigation.navigate('TellUsAboutYourRideScreen1', { 
        vehicleData: vehicleData,
        showVehicleInfo: true,
        completedAddress: completedAddress
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke="#FFB131" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        
        {/* Header Text */}
        <View style={styles.headerTextWrapper}>
          <Text style={styles.headerText}>TYPE VIN</Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.contentContainer}>
        
        {/* Model Year Toggle Section */}
        <View style={styles.section}>
          <Text style={styles.sectionText}>MY MODEL YEAR IS 1981 OR LATER</Text>
          <Switch
            value={isModelYear1981OrLater}
            onValueChange={setIsModelYear1981OrLater}
            trackColor={{ false: '#D1D1D1', true: 'rgb(76, 182, 177)' }}
            thumbColor={isModelYear1981OrLater ? '#FFFFFF' : '#F4F3F4'}
            ios_backgroundColor="#D1D1D1"
          />
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Enter VIN Manually Section */}
        <View style={styles.vinSection}>
          <Text style={styles.sectionText}>ENTER VIN MANUALLY</Text>
          <TextInput
            style={styles.vinInput}
            value={vinNumber}
            onChangeText={setVinNumber}
            placeholder="Enter VIN"
            placeholderTextColor="rgba(0, 0, 0, 0.3)"
            autoCapitalize="characters"
            maxLength={17}
          />
        </View>

        {/* Bottom Divider */}
        <View style={styles.bottomDivider} />

      </View>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.continueButton, !vinNumber && styles.continueButtonDisabled]} 
          onPress={handleContinue}
          disabled={!vinNumber}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 60 * scale,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20 * scale,
    marginBottom: 40 * scale,
  },
  backButton: {
    padding: 10 * scale,
  },
  headerTextWrapper: {
    flex: 1,
    alignItems: 'center',
    marginRight: 43 * scale, // Compensate for back button width
  },
  headerText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 15 * scale,
    color: 'rgb(100, 100, 100)',
    letterSpacing: 0.2,
    width: 74 * scale,
    height: 20 * scale,
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 27.5 * scale,
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20 * scale,
  },
  vinSection: {
    paddingVertical: 20 * scale,
  },
  sectionText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 11 * scale,
    color: '#000000',
    letterSpacing: 0.2,
    width: 216 * scale,
    height: 15 * scale,
    opacity: 0.7,
    marginBottom: 15 * scale,
  },
  vinInput: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14 * scale,
    color: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(151, 151, 151, 0.3)',
    borderRadius: 8 * scale,
    paddingHorizontal: 12 * scale,
    paddingVertical: 8 * scale,
    width: 320 * scale,
    height: 40 * scale,
  },
  divider: {
    width: 320 * scale,
    height: 1,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: 'rgb(151, 151, 151)',
    opacity: 0.24,
    alignSelf: 'center',
  },
  bottomDivider: {
    width: 320 * scale,
    height: 2,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: 'rgb(151, 151, 151)',
    opacity: 0.24,
    alignSelf: 'center',
    marginTop: 20 * scale,
  },
  buttonContainer: {
    alignItems: 'center',
    paddingBottom: 50 * scale,
  },
  continueButton: {
    width: 250 * scale,
    height: 50 * scale,
    backgroundColor: 'rgb(76, 182, 177)',
    borderRadius: 25 * scale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#D1D1D1',
  },
  continueButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16 * scale,
    color: '#F7F7F7',
    letterSpacing: 0.2,
    width: 170 * scale,
    height: 22 * scale,
    textAlign: 'center',
  },
});

export default TypeVINScreen;

