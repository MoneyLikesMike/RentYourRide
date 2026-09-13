import React, { useState, useRef } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const scale = uiScale;

export const FLOW_GUEST_CHECK_IN = 'guestCheckIn';
/** Same steps and UI as guest check-in photo flow; saves to host check-in photos. */
export const FLOW_HOST_CHECK_IN = 'hostCheckIn';
/** Same capture flow as check-in; photos saved as check-out documentation. */
export const FLOW_GUEST_CHECKOUT = 'guestCheckout';
export const FLOW_HOST_CHECKOUT = 'hostCheckout';

const HOST_PHOTO_STEPS = [
  'Front',
  'Angled front',
  'Drivers side',
  'Rear',
  'Front cabin',
  'Rear cabin',
];

const GUEST_CHECK_IN_STEPS = [
  'Front',
  'Passenger side',
  'Driver side',
  'Rear',
  'Interior',
  'Fuel gauge',
  'Odometer',
  'Proof of identification',
];

// Example images used as placeholders for simulation (same as step examples)
const PHOTO_EXAMPLE_IMAGES = [
  require('../assets/94264CB7-DE76-444D-9F33-01D22C2C5E07_1_105_c.jpeg'),
  require('../assets/A708FA82-C1DB-4EF0-9D25-44655A016CC7_1_105_c.jpeg'),
  require('../assets/C0882119-514C-43A9-916D-A3418A06CCD2_1_105_c.jpeg'),
  require('../assets/C41B6BB0-F9D8-469A-B2C0-75B8DDE54C78_1_105_c.jpeg'),
  require('../assets/717C1446-22EE-4B83-B91D-2BE2CE568663_1_105_c.jpeg'),
  require('../assets/9FA9F20E-2AF4-497F-9F61-3E2520D0671D_1_105_c.jpeg'),
];

const GUEST_EXAMPLE_ICONS = [
  null,
  null,
  null,
  null,
  null,
  require('../assets/icons/fuel.png'),
  require('../assets/icons/gauges.png'),
  require('../assets/icons/drivingLicense1.png'),
];

function getSteps(flow) {
  return flow === FLOW_GUEST_CHECK_IN ||
    flow === FLOW_HOST_CHECK_IN ||
    flow === FLOW_GUEST_CHECKOUT ||
    flow === FLOW_HOST_CHECKOUT
    ? GUEST_CHECK_IN_STEPS
    : HOST_PHOTO_STEPS;
}

const PhotoShootScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [currentStep, setCurrentStep] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [showExampleModal, setShowExampleModal] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const flow = route?.params?.flow;
  const bookingId = route?.params?.bookingId;
  const steps = getSteps(flow);
  const stepLabel = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const isCheckInPhotoFlow =
    flow === FLOW_GUEST_CHECK_IN ||
    flow === FLOW_HOST_CHECK_IN ||
    flow === FLOW_GUEST_CHECKOUT ||
    flow === FLOW_HOST_CHECKOUT;

  const stencilHintText =
    isCheckInPhotoFlow
      ? currentStep === 5
        ? 'Fill the frame with the fuel gauge'
        : currentStep === 6
          ? 'Fill the frame with the odometer reading'
          : currentStep === 7
            ? 'Capture your ID clearly within the frame'
            : 'Position your vehicle within the frame'
      : 'Position your vehicle within the frame';

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;
    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      if (photo?.uri) {
        const entry = { step: currentStep, label: stepLabel, uri: photo.uri };
        const next = [...capturedPhotos, entry];
        setCapturedPhotos(next);
        if (isLastStep) {
          if (flow === FLOW_GUEST_CHECK_IN) {
            navigation.navigate('GuestConditionPhotoReviewScreen', { bookingId, photos: next });
          } else if (flow === FLOW_GUEST_CHECKOUT) {
            navigation.navigate('GuestConditionPhotoReviewScreen', { bookingId, photos: next, checkoutFlow: true });
          } else if (flow === FLOW_HOST_CHECK_IN) {
            navigation.navigate('HostConditionPhotoReviewScreen', { bookingId, photos: next });
          } else if (flow === FLOW_HOST_CHECKOUT) {
            navigation.navigate('HostConditionPhotoReviewScreen', { bookingId, photos: next, checkoutFlow: true });
          } else {
            navigation.navigate('PhotoManagementScreen', { photos: next });
          }
        } else {
          setCurrentStep((prev) => prev + 1);
        }
      }
    } catch (err) {
      console.warn('Capture error', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  if (!permission) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
              <Path d="M31 8L17 24L31 40" stroke="#FFB131" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
        </View>
        <Text style={styles.permissionText}>
          {isCheckInPhotoFlow
            ? 'Camera access is required to document the vehicle for check-in'
            : 'Camera access is required to take photos of your ride'}
        </Text>
        <TouchableOpacity style={styles.grantButton} onPress={requestPermission}>
          <Text style={styles.grantButtonText}>Grant permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        autofocus="on"
      >
        <View style={[styles.overlay, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
                <Path d="M31 8L17 24L31 40" stroke="#FFB131" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
            <Text style={styles.stepIndicator}>
              Step {currentStep + 1} of {steps.length}: {stepLabel.toUpperCase()}
            </Text>
          </View>

          {/* Stencil frame - align vehicle within this */}
          <View style={styles.stencilContainer}>
            <View style={styles.stencilFrame}>
              {isCheckInPhotoFlow ? (
                currentStep === 0 ? (
                  <Image
                    source={require('../assets/icons/frontCarStencil.png')}
                    style={styles.stencilImage}
                    resizeMode="contain"
                  />
                ) : currentStep === 1 ? (
                  <Image
                    source={require('../assets/icons/stencilSideGreen.png')}
                    style={styles.stencilImage}
                    resizeMode="contain"
                  />
                ) : currentStep === 2 ? (
                  <Image
                    source={require('../assets/icons/stencilLeftSideGreen.png')}
                    style={styles.stencilImage}
                    resizeMode="contain"
                  />
                ) : currentStep === 3 ? (
                  <Image
                    source={require('../assets/rearStencil.png')}
                    style={styles.stencilImage}
                    resizeMode="contain"
                  />
                ) : currentStep === 4 ? (
                  <Image
                    source={require('../assets/icons/frontCabinStencil.png')}
                    style={styles.stencilImage}
                    resizeMode="contain"
                  />
                ) : currentStep === 5 ? (
                  <Image
                    source={require('../assets/icons/fuel.png')}
                    style={styles.stencilDetailImage}
                    resizeMode="contain"
                  />
                ) : currentStep === 6 ? (
                  <Image
                    source={require('../assets/icons/gauges.png')}
                    style={styles.stencilDetailImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Image
                    source={require('../assets/icons/drivingLicense1.png')}
                    style={styles.stencilDetailImage}
                    resizeMode="contain"
                  />
                )
              ) : currentStep === 0 ? (
                <Image
                  source={require('../assets/icons/frontCarStencil.png')}
                  style={styles.stencilImage}
                  resizeMode="contain"
                />
              ) : currentStep === 1 ? (
                <Image
                  source={require('../assets/icons/angledFrontStencil.png')}
                  style={styles.stencilImage}
                  resizeMode="contain"
                />
              ) : currentStep === 2 ? (
                <Image
                  source={require('../assets/driverSideStencil.png')}
                  style={styles.stencilImage}
                  resizeMode="contain"
                />
              ) : currentStep === 3 ? (
                <Image
                  source={require('../assets/rearStencil.png')}
                  style={styles.stencilImage}
                  resizeMode="contain"
                />
              ) : currentStep === 4 ? (
                <Image
                  source={require('../assets/icons/frontCabinStencil.png')}
                  style={styles.stencilImage}
                  resizeMode="contain"
                />
              ) : currentStep === 5 ? (
                <Image
                  source={require('../assets/rearCabinStencil.png')}
                  style={styles.stencilImage}
                  resizeMode="contain"
                />
              ) : (
                <>
                  <View style={[styles.stencilCorner, styles.stencilTopLeft]} />
                  <View style={[styles.stencilCorner, styles.stencilTopRight]} />
                  <View style={[styles.stencilCorner, styles.stencilBottomLeft]} />
                  <View style={[styles.stencilCorner, styles.stencilBottomRight]} />
                </>
              )}
            </View>
            <Text style={styles.stencilHint}>{stencilHintText}</Text>
          </View>

          {/* Bottom center: iPhone-style shutter button */}
          <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
            <TouchableOpacity
              style={[styles.shutterButtonOuter, isCapturing && styles.captureButtonDisabled]}
              onPress={handleCapture}
              disabled={isCapturing}
              activeOpacity={0.8}
            >
              {isCapturing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <View style={styles.shutterButtonInner} />
              )}
            </TouchableOpacity>
          </View>

          {/* Right side: Example box only */}
          <View style={[styles.rightControls, { paddingBottom: insets.bottom + 24 }]}>
            <TouchableOpacity
              style={styles.exampleBox}
              onPress={() => setShowExampleModal(true)}
              activeOpacity={0.9}
            >
              <View style={styles.exampleBoxThumbnail}>
                <Image
                  source={
                    isCheckInPhotoFlow
                      ? currentStep <= 4
                        ? PHOTO_EXAMPLE_IMAGES[currentStep]
                        : GUEST_EXAMPLE_ICONS[currentStep]
                      : currentStep === 0
                        ? PHOTO_EXAMPLE_IMAGES[0]
                        : currentStep === 1
                          ? PHOTO_EXAMPLE_IMAGES[1]
                          : currentStep === 2
                            ? PHOTO_EXAMPLE_IMAGES[2]
                            : currentStep === 3
                              ? PHOTO_EXAMPLE_IMAGES[3]
                              : currentStep === 4
                                ? PHOTO_EXAMPLE_IMAGES[4]
                                : currentStep === 5
                                  ? PHOTO_EXAMPLE_IMAGES[5]
                                  : require('../assets/icons/frontCarStencil.png')
                  }
                  style={styles.exampleBoxImage}
                  resizeMode={isCheckInPhotoFlow && currentStep >= 5 ? 'contain' : 'cover'}
                />
                <View style={styles.exampleBoxIconOverlay}>
                  <Image
                    source={require('../assets/icons/searchIcon.png')}
                    style={styles.exampleBoxSearchIcon}
                    resizeMode="contain"
                  />
                </View>
              </View>
              <Text style={styles.exampleBoxLabel}>EXAMPLE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>

      <Modal
        visible={showExampleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExampleModal(false)}
      >
        <Pressable style={styles.exampleModalFullscreen} onPress={() => setShowExampleModal(false)}>
          {isCheckInPhotoFlow && currentStep >= 5 ? (
            <Image
              source={GUEST_EXAMPLE_ICONS[currentStep]}
              style={styles.exampleModalImageFullscreen}
              resizeMode="contain"
            />
          ) : isCheckInPhotoFlow && currentStep <= 4 ? (
            <Image
              source={PHOTO_EXAMPLE_IMAGES[currentStep]}
              style={styles.exampleModalImageFullscreen}
              resizeMode="contain"
            />
          ) : currentStep === 0 ? (
            <Image
              source={require('../assets/94264CB7-DE76-444D-9F33-01D22C2C5E07_1_105_c.jpeg')}
              style={styles.exampleModalImageFullscreen}
              resizeMode="contain"
            />
          ) : currentStep === 1 ? (
            <Image
              source={require('../assets/A708FA82-C1DB-4EF0-9D25-44655A016CC7_1_105_c.jpeg')}
              style={styles.exampleModalImageFullscreen}
              resizeMode="contain"
            />
          ) : currentStep === 2 ? (
            <Image
              source={require('../assets/C0882119-514C-43A9-916D-A3418A06CCD2_1_105_c.jpeg')}
              style={styles.exampleModalImageFullscreen}
              resizeMode="contain"
            />
          ) : currentStep === 3 ? (
            <Image
              source={require('../assets/C41B6BB0-F9D8-469A-B2C0-75B8DDE54C78_1_105_c.jpeg')}
              style={styles.exampleModalImageFullscreen}
              resizeMode="contain"
            />
          ) : currentStep === 4 ? (
            <Image
              source={require('../assets/717C1446-22EE-4B83-B91D-2BE2CE568663_1_105_c.jpeg')}
              style={styles.exampleModalImageFullscreen}
              resizeMode="contain"
            />
          ) : currentStep === 5 ? (
            <Image
              source={require('../assets/9FA9F20E-2AF4-497F-9F61-3E2520D0671D_1_105_c.jpeg')}
              style={styles.exampleModalImageFullscreen}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.exampleModalPlaceholderFullscreen}>
              <Text style={styles.examplePlaceholderTextFullscreen}>Example photo for {stepLabel}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.exampleModalCloseButton, { top: insets.top + 12 }]}
            onPress={() => setShowExampleModal(false)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Image
              source={require('../assets/icons/icArrowBack18Px.png')}
              style={styles.exampleModalCloseIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerContainer: {
    position: 'absolute',
    top: 60 * scale,
    left: 20 * scale,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20 * scale,
  },
  backButton: {
    padding: 10 * scale,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20 * scale,
  },
  stepIndicator: {
    flex: 1,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: '#fff',
    textAlign: 'center',
    marginRight: 50 * scale,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 8 * scale,
    paddingHorizontal: 12 * scale,
    borderRadius: 8 * scale,
  },
  stencilContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stencilFrame: {
    width: screenWidth,
    height: Math.min(screenWidth * 0.92, screenHeight * 0.66),
    position: 'relative',
  },
  stencilImage: {
    width: '100%',
    height: '100%',
  },
  stencilDetailImage: {
    width: '72%',
    height: '72%',
    alignSelf: 'center',
  },
  stencilCorner: {
    position: 'absolute',
    width: 36 * scale,
    height: 36 * scale,
    borderColor: COLORS.GREENY_BLUE_TWO,
  },
  stencilTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  stencilTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  stencilBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  stencilBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  stencilHint: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: '#fff',
    marginTop: 2 * scale,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16 * scale,
    paddingVertical: 8 * scale,
    borderRadius: 8 * scale,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutterButtonOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20 * scale,
  },
  shutterButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },
  captureButtonDisabled: {
    opacity: 0.8,
  },
  rightControls: {
    position: 'absolute',
    right: 20 * scale,
    bottom: 0,
    alignItems: 'center',
  },
  exampleBox: {
    alignItems: 'center',
  },
  exampleBoxThumbnail: {
    width: 72 * scale,
    height: 72 * scale,
    borderRadius: 8 * scale,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.4)',
    position: 'relative',
  },
  exampleBoxIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exampleBoxSearchIcon: {
    width: 20,
    height: 20,
  },
  exampleBoxImage: {
    width: '100%',
    height: '100%',
  },
  exampleBoxLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: '#fff',
    marginTop: 6 * scale,
    letterSpacing: 0.5,
  },
  permissionText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16 * scale,
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 40 * scale,
  },
  grantButton: {
    marginTop: 24 * scale,
    paddingVertical: 14 * scale,
    paddingHorizontal: 32 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25 * scale,
  },
  grantButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16 * scale,
    color: '#fff',
  },
  exampleModalFullscreen: {
    flex: 1,
    backgroundColor: '#000',
  },
  exampleModalImageFullscreen: {
    width: '100%',
    height: '100%',
  },
  exampleModalPlaceholderFullscreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  exampleModalCloseButton: {
    position: 'absolute',
    right: 20 * scale,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exampleModalCloseIcon: {
    width: 24,
    height: 24,
  },
  examplePlaceholderText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: '#4A4A4A',
    textAlign: 'center',
  },
  examplePlaceholderTextFullscreen: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: '#fff',
    textAlign: 'center',
  },
  examplePlaceholderSubtext: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: '#9B9B9B',
    marginTop: 8 * scale,
    textAlign: 'center',
  },
});

export default PhotoShootScreen;
