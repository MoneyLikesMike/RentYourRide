import React, { useState, useEffect, useRef } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path, Line, Circle } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

const { width: screenWidth } = Dimensions.get('window');
const scale = uiScale;

const VIN_MARKER_LABELS = [
  'Under hood (front of engine block on most gasoline cars)',
  'Drivers side interior dash (most common)',
  'Front end of frame (older cars)',
  'Drivers side door pillar (inside)',
];

// Marker positions as percentage (left, top) for connecting line; leftOffset in pt for line alignment
const MARKER_CENTERS = [
  { left: 0.22, top: 0.52, leftOffset: -30, topOffset: -5 },
  { left: 0.32, top: 0.42, leftOffset: 5 },
  { left: 0.48, top: 0.35, leftOffset: -10, topOffset: 45 },
  { left: 0.68, top: 0.48, leftOffset: -40, topOffset: 20 },
];

const MARKER_SIZE = 16;
const LINE_GAP = 20; // Line ends this many px below illustration so it doesn't overlap text
const BOTTOM_CIRCLE_R = 5;
const BOTTOM_CIRCLE_STROKE = 2;
const BOTTOM_CIRCLE_PADDING = BOTTOM_CIRCLE_R + BOTTOM_CIRCLE_STROKE; // so full circle isn't clipped

const WhereIsMyVINScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { completedAddress } = route.params || {};
  const [selectedMarker, setSelectedMarker] = useState(0);
  const [illustrationLayout, setIllustrationLayout] = useState({ width: 0, height: 0 });
  const [markerLayouts, setMarkerLayouts] = useState([null, null, null, null]);
  const glowAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(1))).current;

  const handleMarkerLayout = (index, event) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setMarkerLayouts((prev) => {
      const next = [...prev];
      next[index] = { centerX: x + width / 2, bottomY: y + height };
      return next;
    });
  };

  useEffect(() => {
    const loops = glowAnims.map((anim) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [glowAnims]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleUseMyVIN = () => {
    navigation.navigate('ScanVINScreen', { completedAddress });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke="#FFB131" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <View style={styles.headerTitleWrapper}>
          <View style={styles.titleRow}>
            <View style={styles.titleHighlight} />
            <View style={styles.titleFrame}>
              <Text style={styles.title}>Where is my VIN?</Text>
            </View>
          </View>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 50 * scale + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.descriptionFrame}>
          <Text style={styles.description}>
            We will use your VIN to help gather information to list your vehicle including the year,
            make and model. You can either scan it or enter it manually.
          </Text>
        </View>

        {/* Car illustration with VIN location markers and connecting line */}
        <View
          style={styles.illustrationWrapper}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setIllustrationLayout({ width, height });
          }}
        >
          <View style={styles.illustrationContainer}>
            <Image
              source={require('../assets/icons/exoticsIcon.png')}
              style={styles.carImage}
              resizeMode="contain"
            />
            {/* VIN location markers (animated glow, tappable) */}
            {[0, 1, 2, 3].map((i) => (
              <TouchableOpacity
                key={i}
                style={[styles.markerPosition, styles[`marker${['Front', 'Hood', 'Roof', 'Rear'][i]}`]]}
                onLayout={(e) => handleMarkerLayout(i, e)}
                onPress={() => setSelectedMarker(selectedMarker === i ? null : i)}
                activeOpacity={1}
              >
                <Animated.View
                  style={[
                    styles.marker,
                    selectedMarker === i && styles.markerSelected,
                    { transform: [{ scale: glowAnims[i] }] },
                  ]}
                >
                  {selectedMarker === i && <View style={styles.markerWhiteCenter} />}
                </Animated.View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Connecting line from selected marker to label */}
          {selectedMarker !== null &&
            illustrationLayout.width > 0 &&
            illustrationLayout.height > 0 && (
              <View
                style={[
                  styles.connectorLineOverlay,
                  {
                    width: illustrationLayout.width,
                    height: illustrationLayout.height + LINE_GAP + BOTTOM_CIRCLE_PADDING,
                  },
                ]}
                pointerEvents="none"
              >
                <Svg
                  width={illustrationLayout.width}
                  height={illustrationLayout.height + LINE_GAP + BOTTOM_CIRCLE_PADDING}
                  style={styles.connectorLineSvg}
                >
                  {(() => {
                    const measured = markerLayouts[selectedMarker];
                    const fallback = MARKER_CENTERS[selectedMarker];
                    const { left: l, top: t, leftOffset: offset = 0, topOffset: topOff = 0 } = fallback;
                    const cx = measured
                      ? measured.centerX
                      : illustrationLayout.width * l + MARKER_SIZE / 2 + offset;
                    const startY = measured
                      ? measured.bottomY
                      : illustrationLayout.height * t + topOff + MARKER_SIZE;
                    const endY = illustrationLayout.height + LINE_GAP - 4;
                    return (
                      <>
                        <Line
                          x1={cx}
                          y1={startY}
                          x2={cx}
                          y2={endY}
                          stroke={COLORS.YELLOWISH_ORANGE}
                          strokeWidth={2}
                          strokeOpacity={0.9}
                        />
                        <Circle
                          cx={cx}
                          cy={endY}
                          r={BOTTOM_CIRCLE_R}
                          fill="none"
                          stroke={COLORS.YELLOWISH_ORANGE}
                          strokeWidth={BOTTOM_CIRCLE_STROKE}
                        />
                      </>
                    );
                  })()}
                </Svg>
              </View>
            )}
        </View>

        {selectedMarker !== null && (
          <View style={styles.vinLabelFrame}>
            <Text style={styles.vinLocationLabel}>{VIN_MARKER_LABELS[selectedMarker]}</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.ctaButton} onPress={handleUseMyVIN} activeOpacity={0.8}>
            <Text style={styles.ctaButtonText}>Use my VIN</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20 * scale,
    marginBottom: 24 * scale,
  },
  backButton: {
    padding: 10 * scale,
  },
  headerTitleWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 43 * scale, // Balance back button so title is centered
  },
  titleRow: {
    position: 'relative',
    alignSelf: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24 * scale,
  },
  titleHighlight: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 48 * scale,
    height: 13 * scale,
    backgroundColor: 'rgba(255, 177, 49, 0.3)',
    borderRadius: 5,
  },
  titleFrame: {
    width: 192 * scale,
    height: 30 * scale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 22,
    color: 'rgb(14, 38, 43)',
    textAlign: 'center',
  },
  descriptionFrame: {
    width: 303 * scale,
    height: 92 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24 * scale,
  },
  description: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: 'rgb(171, 171, 171)',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  illustrationWrapper: {
    width: '100%',
    position: 'relative',
    marginBottom: 4,
  },
  illustrationContainer: {
    width: '100%',
    aspectRatio: 1.1,
    maxHeight: 280 * scale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectorLineOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  connectorLineSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  carImage: {
    width: '85%',
    height: '85%',
  },
  markerPosition: {
    position: 'absolute',
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.YELLOWISH_ORANGE,
    borderWidth: 2,
    borderColor: 'rgba(255, 178, 20, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.YELLOWISH_ORANGE,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  markerWhiteCenter: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  markerSelected: {
    borderWidth: 3,
    ...Platform.select({
      ios: {
        shadowRadius: 12,
        shadowOpacity: 1,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  markerFront: {
    left: '22%',
    top: '52%',
    marginLeft: -30,
    marginTop: -5,
  },
  markerHood: {
    left: '32%',
    top: '42%',
    marginLeft: 5,
  },
  markerRoof: {
    left: '48%',
    top: '35%',
    marginLeft: -10,
    marginTop: 45,
  },
  markerRear: {
    left: '68%',
    top: '48%',
    marginLeft: -40,
    marginTop: 20,
  },
  vinLabelFrame: {
    width: 325 * scale,
    minHeight: 56 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 24 * scale,
  },
  vinLocationLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: 'rgb(171, 171, 171)',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
    paddingBottom: 50 * scale,
  },
  ctaButton: {
    width: 146 * scale,
    height: 50 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16,
    color: 'rgb(247, 247, 247)',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});

export default WhereIsMyVINScreen;
