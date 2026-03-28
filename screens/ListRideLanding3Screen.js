import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions, ScrollView, StyleSheet, PanResponder, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VehicleTypesModal from './VehicleTypesModal';

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375; // Base width is 375

const ListRideLanding3Screen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const translateX = React.useRef(new Animated.Value(0)).current;
  const activeDotScale = React.useRef(new Animated.Value(1)).current;
  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 2;
      },
      onPanResponderMove: (_evt, gestureState) => {
        const { dx } = gestureState;
        translateX.setValue(dx * 0.2);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        const { dx, vx } = gestureState;
        if (dx > 50 || vx > 0.5) {
          navigation.navigate('ListRideLanding2Screen');
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  useFocusEffect(
    React.useCallback(() => {
      translateX.setValue(0);
      activeDotScale.setValue(0.9);
      Animated.spring(activeDotScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    }, [translateX])
  );

  const handleVehicleTypeSelect = (selectedVehicle) => {
    setModalVisible(false);
    // Modal closed, no vehicle selection required
  };

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Animated.View style={{ flex: 1, transform: [{ translateX }] }}>
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 160 * scale }]} // Add extra bottom padding for progress bar
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <Image 
          source={require('../assets/icons/ClockwMountainIcon.png')}
          style={styles.icon}
          resizeMode="contain"
        />

        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerHighlight} />
          <Text style={styles.header}>It'll only takes 10 minutes</Text>
        </View>

        {/* Paragraphs */}
        <View style={styles.paragraphsContainer}>
          {/* Paragraph 1 */}
          <View style={styles.paragraphRow}>
            <Image 
              source={require('../assets/icons/checkmark.png')}
              style={styles.checkmark}
              resizeMode="contain"
            />
            <View style={styles.paragraphBox}>
              <Text style={styles.paragraphText}>
                <Text style={styles.paragraphBold}>Vin{'\n'}</Text>
                <Text style={styles.paragraphRegular}>Scan your vin or enter it yourself to automatically fill out most of your rides info</Text>
              </Text>
            </View>
          </View>

          {/* Paragraph 2 */}
          <View style={styles.paragraphRow}>
            <Image 
              source={require('../assets/icons/checkmark.png')}
              style={styles.checkmark}
              resizeMode="contain"
            />
            <View style={styles.paragraphBox}>
              <Text style={styles.paragraphText}>
                <Text style={styles.paragraphBold}>License plate{'\n'}</Text>
                <Text style={styles.paragraphRegular}>We use this to ensure your car is protected.</Text>
              </Text>
            </View>
          </View>

          {/* Paragraph 3 */}
          <View style={styles.paragraphRow}>
            <Image 
              source={require('../assets/icons/checkmark.png')}
              style={styles.checkmark}
              resizeMode="contain"
            />
            <View style={styles.paragraphBox}>
              <Text style={styles.paragraphText}>
                <Text style={styles.paragraphBold}>Photos of your car{'\n'}</Text>
                <Text style={styles.paragraphRegular}>Who wants to rent a ride they can't see? We pride ourselves by giving users exactly what they see.</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Types of vehicle button */}
        <TouchableOpacity style={styles.typesButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.typesButtonText}>Types of vehicle you can list</Text>
        </TouchableOpacity>

        {/* Begin listing button */}
        <TouchableOpacity style={styles.beginListingButton} onPress={() => navigation.navigate('TellUsAboutYourRideScreen1')}>
          <Text style={styles.beginListingButtonText}>Begin listing</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom controls */}
      <View style={[styles.bottomRow, { bottom: Math.max(24 * scale, insets.bottom + 16) }]}>
        {/* Back Button */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>BACK</Text>
        </TouchableOpacity>
        {/* Progress Bar */}
        <View style={styles.progressBarRow}>
          <View style={styles.progressDotInactive} />
          <View style={styles.progressDotInactive} />
          <Animated.View style={[styles.progressDotActive, { transform: [{ scale: activeDotScale }] }]} />
        </View>
        {/* Empty space for balance */}
        <View style={styles.emptySpace} />
      </View>

      {/* Vehicle Types Modal */}
      <VehicleTypesModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onContinue={handleVehicleTypeSelect}
      />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 108 * scale,
    paddingBottom: 40 * scale,
  },
  icon: {
    width: 306 * scale,
    height: 156 * scale,
    marginBottom: 40 * scale,
  },
  headerContainer: {
    width: 206 * scale,
    height: 60 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30 * scale,
    position: 'relative',
  },
  header: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 22,
    color: '#0E262B',
    textAlign: 'center',
    lineHeight: 30 * scale,
    letterSpacing: -0.2,
  },
  headerHighlight: {
    position: 'absolute',
    left: 0,
    top: 13 * scale,
    width: 53 * scale,
    height: 13 * scale,
    backgroundColor: 'rgba(255,177,49,0.3)',
    borderRadius: 5 * scale,
  },
  paragraphsContainer: {
    width: 285 * scale,
    marginLeft: -25 * scale,
  },
  paragraphRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 13 * scale,
  },
  checkmark: {
    width: 22 * scale,
    height: 20 * scale,
    marginRight: 10 * scale,
    marginTop: 2 * scale,
  },
  paragraphBox: {
    width: 280 * scale,
    minHeight: 50 * scale,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  paragraphText: {
    width: 285 * scale,
    textAlign: 'left',
    lineHeight: 20 * scale,
  },
  paragraphBold: {
    fontFamily: 'Nunito-Bold',
    fontSize: 15,
    color: '#505050',
    letterSpacing: -0.2,
  },
  paragraphRegular: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 15,
    color: '#ABABAB',
    letterSpacing: -0.2,
  },
  typesButton: {
    marginTop: 30 * scale,
    marginBottom: 20 * scale,
  },
  typesButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16 * scale,
    color: '#FFB131',
    textAlign: 'center',
    letterSpacing: 0.2,
    width: 208 * scale,
    height: 22 * scale,
  },
  beginListingButton: {
    width: 239 * scale,
    height: 50 * scale,
    backgroundColor: '#00B4AB',
    borderRadius: 25 * scale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  beginListingButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16 * scale,
    color: '#F7F7F7',
    textAlign: 'center',
    letterSpacing: 0.2,
    width: 240 * scale,
    height: 22 * scale,
  },
  bottomRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 40 * scale,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24 * scale,
  },
  backBtn: {
    width: 36 * scale,
    height: 18 * scale,
    opacity: 0.52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 15,
    color: 'rgb(0,180,171)',
    textAlign: 'center',
    letterSpacing: 0.2,
    paddingRight: 2 * scale,
  },
  progressBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  progressDotActive: {
    width: 12 * scale,
    height: 12 * scale,
    borderRadius: 6 * scale,
    backgroundColor: 'rgb(0,180,171)',
    marginHorizontal: 4 * scale,
  },
  progressDotInactive: {
    width: 12 * scale,
    height: 12 * scale,
    borderRadius: 6 * scale,
    backgroundColor: 'rgb(216,216,216)',
    opacity: 0.53,
    marginHorizontal: 4 * scale,
  },
  emptySpace: {
    width: 41 * scale,
    height: 18 * scale,
  },
});

export default ListRideLanding3Screen; 