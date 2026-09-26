import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

/**
 * Legacy-style confirm when changing an already-approved license.
 */
export default function LicenseAlreadyApprovedModal({ visible, onUpdate, onCancel }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Image
            source={require('../assets/icons/license-already-approved.png')}
            style={styles.image}
            resizeMode="contain"
          />
          <Text style={styles.title}>
            Your license is already approved would you like to update it?
          </Text>
          <TouchableOpacity style={styles.updateButton} onPress={onUpdate} activeOpacity={0.85}>
            <Text style={styles.updateButtonText}>Update</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.85}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 28,
    alignItems: 'center',
  },
  image: {
    width: 150,
    height: 150,
    marginBottom: 16,
  },
  title: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 18,
    color: 'rgb(14,38,43)',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 36,
  },
  updateButton: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  updateButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16,
    color: '#fff',
  },
  cancelButton: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORS.YELLOWISH_ORANGE,
    backgroundColor: 'rgba(255,178,20,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16,
    color: COLORS.YELLOWISH_ORANGE,
  },
});
