import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, PanResponder, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;

const paragraphs = [
  'Let your ride work for you and start earning now',
  'It\'s free to list! You\'ll earn up to 80% of your daily price',
  'Set your own daily price',
  'Only get requests that work for you by setting your availability',
  'Earn more by offering to drop off  your ride',
];

export default function ListRideLanding1Screen({ navigation }) {
  const insets = useSafeAreaInsets();
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
        if (dx < -50 || vx < -0.5) {
          navigation.navigate('ListRideLanding2Screen');
        } else if (dx > 50 || vx > 0.5) {
          if (navigation.canGoBack()) navigation.goBack();
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
  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Animated.View style={{ flex: 1, alignItems: 'center', transform: [{ translateX }] }}>
      {/* Icon */}
      <Image source={require('../assets/icons/ShakingHandsRide Icon.png')} style={styles.icon} />
      {/* Header with highlight */}
      <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center', width: 206 * scale, height: 30 * scale, marginBottom: 18 * scale }}>
        {/* Rectangle highlight behind 'Earn' */}
        <View style={{
          position: 'absolute',
          left: 10 * scale,
          top: 3 * scale,
          width: 53 * scale,
          height: 13 * scale,
          backgroundColor: 'rgba(255,177,49,0.3)',
          borderRadius: 5 * scale,
        }} />
        <Text style={styles.header}>
          <Text style={{ position: 'relative' }}>Earn</Text>
          <Text> extra cash</Text>
        </Text>
      </View>
      {/* Paragraphs with checkmarks */}
      <View style={styles.paragraphsContainer}>
        {paragraphs.map((text, idx) => (
          <View key={idx} style={styles.paragraphBox}>
            <View style={styles.paragraphRow}>
              <Image source={require('../assets/icons/checkmark.png')} style={styles.checkmark} />
              <Text style={styles.paragraph}>{text}</Text>
            </View>
          </View>
        ))}
      </View>
      {/* Bottom controls */}
      <View style={[styles.bottomRow, { bottom: Math.max(24 * scale, insets.bottom + 16) }]}>
        {/* Skip Button */}
        <TouchableOpacity onPress={() => navigation.popToTop()} style={styles.skipBtn}>
          <Text style={styles.skipText}>BACK</Text>
        </TouchableOpacity>
        {/* Progress Bar */}
        <View style={styles.progressBarRow}>
          <Animated.View style={[styles.progressDotActive, { transform: [{ scale: activeDotScale }] }]} />
          <View style={styles.progressDotInactive} />
          <View style={styles.progressDotInactive} />
        </View>
        {/* Next Button */}
        <TouchableOpacity onPress={() => navigation.navigate('ListRideLanding2Screen')} style={styles.nextBtn}>
          <Text style={styles.nextText}>NEXT</Text>
        </TouchableOpacity>
      </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 108 * scale,
    paddingHorizontal: 0,
  },
  icon: {
    width: 375 * scale,
    height: 292 * scale,
    resizeMode: 'contain',
    marginBottom: 18 * scale,
  },
  header: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 22,
    color: 'rgb(14,38,43)',
    textAlign: 'center',
    width: 206 * scale,
    height: 30 * scale,
    marginBottom: 18 * scale,
  },
  paragraphsContainer: {
    marginTop: 8 * scale,
    marginBottom: 32 * scale,
    width: 320 * scale,
  },
  paragraphRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9 * scale,
  },
  checkmark: {
    width: 22 * scale,
    height: 20 * scale,
    marginRight: 12 * scale,
    resizeMode: 'contain',
  },
  paragraph: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: 'rgb(171,171,171)',
    letterSpacing: -0.2,
    width: 280 * scale,
    textAlign: 'left',
  },
  paragraphBox: {
    width: 280 * scale,
    height: 50 * scale,
    justifyContent: 'center',
    alignItems: 'flex-start',
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
  skipBtn: {
    width: 36 * scale,
    height: 18 * scale,
    opacity: 0.52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipText: {
    fontFamily: FONTS.NUNITO_BOLD,
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
  nextBtn: {
    width: 41 * scale,
    height: 18 * scale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15,
    color: 'rgb(0,180,171)',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
}); 