import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Svg, Path } from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const scale = screenWidth / 375; // Base width is 375

const ScanVINScreen = ({ navigation, route }) => {
  const { completedAddress } = route.params || {};
  const [permission, requestPermission] = useCameraPermissions();

  const handleTypeVINInstead = () => {
    navigation.navigate('TypeVINScreen', { completedAddress });
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.noAccessText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
              <Path d="M31 8L17 24L31 40" stroke="#FFB131" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
        </View>
        <View style={styles.permissionContainer}>
          <Text style={styles.noAccessText}>Camera access is required to scan VIN</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.typeVINButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.typeVINButton} onPress={handleTypeVINInstead}>
            <Text style={styles.typeVINButtonText}>Type VIN instead</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke="#FFB131" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Camera View */}
      <CameraView
        style={styles.camera}
        facing="back"
        autofocus="on"
      >
        <View style={styles.cameraOverlay}>
          {/* Scanning frame */}
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          
          <Text style={styles.instructionText}>
            Position VIN within the frame to scan
          </Text>
        </View>
      </CameraView>

      {/* Type VIN Instead Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.typeVINButton} onPress={handleTypeVINInstead}>
          <Text style={styles.typeVINButtonText}>Type VIN instead</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerContainer: {
    position: 'absolute',
    top: 60 * scale,
    left: 20 * scale,
    zIndex: 10,
  },
  backButton: {
    padding: 10 * scale,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20 * scale,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 300 * scale,
    height: 100 * scale,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30 * scale,
    height: 30 * scale,
    borderColor: '#FFB131',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  instructionText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16 * scale,
    color: '#FFFFFF',
    marginTop: 30 * scale,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20 * scale,
    paddingVertical: 10 * scale,
    borderRadius: 10 * scale,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 50 * scale,
    width: '100%',
    alignItems: 'center',
  },
  typeVINButton: {
    width: 250 * scale,
    height: 50 * scale,
    backgroundColor: '#00B4AB',
    borderRadius: 25 * scale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeVINButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16 * scale,
    color: '#F7F7F7',
    letterSpacing: 0.2,
    width: 170 * scale,
    height: 22 * scale,
    textAlign: 'center',
  },
  noAccessText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 18 * scale,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 100 * scale,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40 * scale,
  },
  permissionButton: {
    width: 250 * scale,
    height: 50 * scale,
    backgroundColor: '#00B4AB',
    borderRadius: 25 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20 * scale,
  },
});

export default ScanVINScreen;

