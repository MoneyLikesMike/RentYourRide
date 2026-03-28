import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, Dimensions, Image } from 'react-native';
import Modal from 'react-native-modal';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;

const SHARE_SUBJECT = 'Rent Your Ride';

export default function ShareLinkModal({ visible, onClose, referralLink, shareMessage }) {
  const insets = useSafeAreaInsets();

  const safeClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const openEmail = useCallback(() => {
    const url = `mailto:?subject=${encodeURIComponent(SHARE_SUBJECT)}&body=${encodeURIComponent(shareMessage)}`;
    safeClose();
    Linking.openURL(url).catch(() =>
      Alert.alert('Email unavailable', 'No email app could be opened on this device.'),
    );
  }, [shareMessage, safeClose]);

  const openSms = useCallback(() => {
    const url = `sms:?body=${encodeURIComponent(shareMessage)}`;
    safeClose();
    Linking.openURL(url).catch(() =>
      Alert.alert('SMS unavailable', 'Could not open the messaging app.'),
    );
  }, [shareMessage, safeClose]);

  const copyLink = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(referralLink);
      safeClose();
      Alert.alert('Link copied', 'Your referral link was copied to the clipboard.');
    } catch (_) {
      Alert.alert('Could not copy', 'Please try again.');
    }
  }, [referralLink, safeClose]);

  const openFacebook = useCallback(() => {
    const u = encodeURIComponent(referralLink);
    safeClose();
    Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${u}`).catch(() =>
      Alert.alert('Could not open', 'Unable to open Facebook.'),
    );
  }, [referralLink, safeClose]);

  const openWhatsApp = useCallback(() => {
    const text = encodeURIComponent(shareMessage);
    const appUrl = `whatsapp://send?text=${text}`;
    const webUrl = `https://api.whatsapp.com/send?text=${text}`;
    safeClose();
    Linking.canOpenURL(appUrl)
      .then((ok) => {
        if (ok) return Linking.openURL(appUrl);
        return Linking.openURL(webUrl);
      })
      .catch(() => Linking.openURL(webUrl));
  }, [shareMessage, safeClose]);

  const rowDivider = { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgb(235, 235, 235)' };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={safeClose}
      onSwipeComplete={safeClose}
      swipeDirection={['down']}
      style={styles.modalRoot}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropOpacity={0.45}
      useNativeDriverForBackdrop
    >
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16 * scale) }]}>
        <View style={styles.handleWrap} accessibilityLabel="Drag handle">
          <View style={styles.handle} />
        </View>

        <View style={styles.sheetTitleFrame}>
          <Text style={styles.sheetTitle}>SHARE LINK</Text>
        </View>

        <TouchableOpacity style={[styles.row, rowDivider]} onPress={openEmail} activeOpacity={0.75}>
          <Text style={styles.rowLabel}>EMAIL</Text>
          <Image
            source={require('../assets/icons/email.png')}
            style={styles.rowIconImage}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.row, rowDivider]} onPress={openSms} activeOpacity={0.75}>
          <Text style={styles.rowLabel}>SMS</Text>
          <Ionicons name="chatbubble-ellipses-outline" size={26 * scale} color={COLORS.GREENY_BLUE_TWO} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.row, rowDivider]} onPress={copyLink} activeOpacity={0.75}>
          <Text style={styles.rowLabel}>COPY LINK</Text>
          <Ionicons name="copy-outline" size={26 * scale} color={COLORS.GREENY_BLUE_TWO} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.row, rowDivider]} onPress={openFacebook} activeOpacity={0.75}>
          <Text style={styles.rowLabel}>FACEBOOK</Text>
          <MaterialCommunityIcons name="facebook" size={26 * scale} color="#1877F2" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={openWhatsApp} activeOpacity={0.75}>
          <Text style={styles.rowLabel}>WHATSAPP</Text>
          <MaterialCommunityIcons name="whatsapp" size={26 * scale} color="#25D366" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16 * scale,
    borderTopRightRadius: 16 * scale,
    paddingTop: 8 * scale,
  },
  handleWrap: {
    alignSelf: 'center',
    marginBottom: 16 * scale,
    opacity: 0.5158110119047619,
    paddingVertical: 3,
  },
  handle: {
    width: 48 * scale,
    height: 2 * scale,
    borderRadius: 1 * scale,
    borderWidth: 3,
    borderColor: COLORS.MANGO_TWO,
    backgroundColor: 'transparent',
  },
  sheetTitleFrame: {
    width: 94 * scale,
    height: 42 * scale,
    alignSelf: 'center',
    justifyContent: 'center',
    marginBottom: 8 * scale,
  },
  sheetTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    color: 'rgb(109, 109, 109)',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18 * scale,
    paddingHorizontal: 24 * scale,
  },
  rowLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: 'rgba(0, 0, 0, 0.7)',
    letterSpacing: 0.6,
  },
  rowIconImage: {
    width: 26 * scale,
    height: 26 * scale,
  },
});
