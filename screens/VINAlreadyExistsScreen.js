import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions, Linking } from 'react-native';
import { Svg, Path } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375; // Base width is 375

const VINAlreadyExistsScreen = ({ navigation }) => {
  const handleContactSupport = () => {
    const subject = encodeURIComponent('Duplicate VIN Issue - Vehicle Already Listed');
    const body = encodeURIComponent('Hello,\n\nI am encountering a duplicate VIN error when trying to list my vehicle. The VIN I entered appears to already be in use on your platform. Could you please help me resolve this issue?\n\nThank you.');
    const emailUrl = `mailto:support@rentyourride.ca?subject=${subject}&body=${body}`;
    
    Linking.openURL(emailUrl).catch(err => {
      console.error('Failed to open email client:', err);
      alert('Unable to open email client. Please contact support@rentyourride.ca directly.');
    });
  };

  const handleGoBack = () => {
    navigation.goBack();
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
      </View>

      {/* Main Content */}
      <View style={styles.contentContainer}>
        
        {/* Icon */}
        <Image
          source={require('../assets/icons/vin error icon 3.png')}
          style={styles.icon}
          resizeMode="contain"
        />

        {/* Ooops Text */}
        <View style={styles.textContainer}>
          <Text style={styles.oopsText}>Ooops!</Text>
          {/* Underline under "Ooops" */}
          <View style={styles.underline} />
        </View>

        {/* Description Paragraph */}
        <Text style={styles.descriptionText}>
          This VIN has already been used to list a vehicle. Our policy prohibits the same vehicle from being listed more than once at a time to prevent spam and duplicate listings. If you think there's a mistake on our end please contact support.
        </Text>

      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.goBackButton} onPress={handleGoBack}>
          <Text style={styles.goBackText}>Go back</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactSupportButton} onPress={handleContactSupport}>
          <Text style={styles.contactSupportText}>Contact Support</Text>
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
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20 * scale,
  },
  icon: {
    width: 200 * scale,
    height: 200 * scale,
    marginBottom: 40 * scale,
  },
  textContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  oopsText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 22 * scale,
    color: 'rgb(14, 38, 43)',
    textAlign: 'center',
    width: 80 * scale,
    height: 30 * scale,
  },
  underline: {
    position: 'absolute',
    width: 42 * scale,
    height: 13 * scale,
    backgroundColor: 'rgba(255, 177, 49, 0.3)',
    borderRadius: 5 * scale,
    top: 15 * scale,
    left: -11 * scale,
  },
  descriptionText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 15 * scale,
    color: 'rgb(171, 171, 171)',
    textAlign: 'center',
    letterSpacing: -0.2,
    width: 320 * scale,
    height: 138 * scale,
    marginTop: 20 * scale,
    marginBottom: 109 * scale,
    lineHeight: 22 * scale,
  },
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20 * scale,
    paddingBottom: 50 * scale,
    paddingLeft: 48 * scale,
  },
  goBackButton: {
    paddingVertical: 15 * scale,
  },
  goBackText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16 * scale,
    color: '#FFB131',
    letterSpacing: 0.2,
    width: 61 * scale,
    height: 22 * scale,
    textAlign: 'center',
  },
  contactSupportButton: {
    width: 182 * scale,
    height: 50 * scale,
    backgroundColor: '#00B4AB',
    borderRadius: 25 * scale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactSupportText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16 * scale,
    color: '#F7F7F7',
    letterSpacing: 0.2,
    width: 124 * scale,
    height: 22 * scale,
    textAlign: 'center',
  },
});

export default VINAlreadyExistsScreen;

