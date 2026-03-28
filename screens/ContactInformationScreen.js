import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import ChangeEmailScreen from './ChangeEmailScreen';
import Modal from 'react-native-modal';
import ChangePasswordScreen from './ChangePasswordScreen';
import PasswordChangeSuccessScreen from './PasswordChangeSuccessScreen';
import ChangePhoneNumberScreen from './ChangePhoneNumberScreen';
import PhoneVerificationScreen from './PhoneVerificationScreen';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;

const initialUser = {
  email: 'RentYourRide@gmail.com',
  emailVerified: true,
  password: 'password123', // Example, will be masked
  address: '959 Alton St.Dominion, NS B1G…',
  mobile: '+1-613-555-0102',
  mobileVerified: false,
  license: 'D1234-56789-00000',
  licenseVerified: false,
};

export default function ContactInformationScreen({ navigation }) {
  const [user, setUser] = React.useState(initialUser);
  const [showChangeEmail, setShowChangeEmail] = React.useState(false);
  const [showChangePassword, setShowChangePassword] = React.useState(false);
  const [showPasswordChangeSuccess, setShowPasswordChangeSuccess] = React.useState(false);
  const [showChangePhoneNumber, setShowChangePhoneNumber] = React.useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = React.useState(false);
  const [pendingPhone, setPendingPhone] = React.useState('');
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          {/* Inline SVG Back Arrow */}
          <Svg width={23} height={23} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke={COLORS.MANGO_TWO} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <View style={styles.headerTextFlexWrapper}>
          <Text style={styles.headerText}>CONTACT INFORMATION</Text>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <Text style={styles.sectionHeader}>ACCOUNT</Text>
        <View style={styles.accountDivider} />
        {/* Email Row */}
        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>EMAIL</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
          <View style={styles.infoButtonCol}>
            <Text style={user.emailVerified ? styles.verifiedBadge : styles.notVerifiedBadge}>
              {user.emailVerified ? '(Verified)' : '(Not verified)'}
            </Text>
            <TouchableOpacity onPress={() => setShowChangeEmail(true)}>
              <Text style={styles.changeButton}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Password Row */}
        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>PASSWORD</Text>
            <Text style={styles.passwordValue}>
              {Array(user.password.length).fill('•').join('')}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowChangePassword(true)}>
            <Text style={styles.changeButton}>Change</Text>
          </TouchableOpacity>
        </View>
        {/* Profile Section */}
        <Text style={styles.sectionHeader}>PROFILE</Text>
        <View style={styles.divider} />
        {/* Address Row */}
        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>ADDRESS</Text>
            <Text style={styles.infoValue}>{user.address}</Text>
          </View>
          <View style={styles.infoButtonCol}>
            <View style={styles.badgePlaceholder} />
            <TouchableOpacity onPress={() => navigation.navigate('ChangeAddressScreen')}>
              <Text style={styles.changeButton}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Mobile Row */}
        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>MOBILE PHONE</Text>
            <Text style={styles.infoValue}>{user.mobile}</Text>
          </View>
          <View style={styles.infoButtonCol}>
            <Text style={user.mobileVerified ? styles.verifiedBadge : styles.notVerifiedBadge}>
              {user.mobileVerified ? '(Verified)' : '(Not verified)'}
            </Text>
            <TouchableOpacity onPress={() => setShowChangePhoneNumber(true)}>
              <Text style={styles.changeButton}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* License Row */}
        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>LICENSE</Text>
            <Text style={styles.infoValue}>{user.license}</Text>
          </View>
          <View style={styles.infoButtonCol}>
            <Text style={user.licenseVerified ? styles.verifiedBadge : styles.notVerifiedBadge}>
              {user.licenseVerified ? '(Verified)' : '(Not verified)'}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('ChangeLicenseScreen')}>
              <Text style={styles.changeButton}>{user.license ? 'Change' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      {showChangeEmail && (
        <Modal
          isVisible={showChangeEmail}
          onBackdropPress={() => setShowChangeEmail(false)}
          onSwipeComplete={() => setShowChangeEmail(false)}
          swipeDirection={['down']}
          style={{ margin: 0, justifyContent: 'flex-end' }}
          animationIn="slideInUp"
          animationOut="slideOutDown"
          backdropOpacity={0.18}
        >
          <ChangeEmailScreen
            navigation={{ goBack: () => setShowChangeEmail(false) }}
            route={{ params: { currentEmail: user.email } }}
          />
        </Modal>
      )}
      {showChangePassword && (
        <Modal
          isVisible={showChangePassword}
          onBackdropPress={() => setShowChangePassword(false)}
          onSwipeComplete={() => setShowChangePassword(false)}
          swipeDirection={['down']}
          style={{ margin: 0, justifyContent: 'flex-end' }}
          animationIn="slideInUp"
          animationOut="slideOutDown"
          backdropOpacity={0.18}
        >
          <ChangePasswordScreen
            navigation={{ goBack: () => setShowChangePassword(false) }}
            onSave={() => {
              setShowChangePassword(false);
              setTimeout(() => setShowPasswordChangeSuccess(true), 350); // Wait for modal to close
            }}
          />
        </Modal>
      )}
      {showPasswordChangeSuccess && (
        <Modal
          isVisible={showPasswordChangeSuccess}
          onBackdropPress={() => setShowPasswordChangeSuccess(false)}
          onSwipeComplete={() => setShowPasswordChangeSuccess(false)}
          swipeDirection={['down']}
          style={{ margin: 0, justifyContent: 'flex-end' }}
          animationIn="none"
          animationOut="none"
          backdropOpacity={0.18}
        >
          <PasswordChangeSuccessScreen navigation={{ goBack: () => setShowPasswordChangeSuccess(false) }} />
        </Modal>
      )}
      {showChangePhoneNumber && (
        <Modal
          isVisible={showChangePhoneNumber}
          onBackdropPress={() => setShowChangePhoneNumber(false)}
          onSwipeComplete={() => setShowChangePhoneNumber(false)}
          swipeDirection={['down']}
          style={{ margin: 0, justifyContent: 'flex-end' }}
          animationIn="slideInUp"
          animationOut="slideOutDown"
          backdropOpacity={0.18}
        >
          <ChangePhoneNumberScreen
            navigation={{ goBack: () => setShowChangePhoneNumber(false) }}
            onSave={(phone) => {
              setShowChangePhoneNumber(false);
              setPendingPhone(phone);
              setTimeout(() => setShowPhoneVerification(true), 350);
            }}
          />
        </Modal>
      )}
      {showPhoneVerification && (
        <Modal
          isVisible={showPhoneVerification}
          onBackdropPress={() => setShowPhoneVerification(false)}
          onSwipeComplete={() => setShowPhoneVerification(false)}
          swipeDirection={['down']}
          style={{ margin: 0, justifyContent: 'flex-end' }}
          animationIn="slideInUp"
          animationOut="slideOutDown"
          backdropOpacity={0.18}
        >
          <PhoneVerificationScreen
            navigation={{ goBack: () => setShowPhoneVerification(false) }}
            phoneNumber={pendingPhone}
            onPhoneVerified={() => {
              setUser((prev) => ({ ...prev, mobile: pendingPhone, mobileVerified: true }));
              setShowPhoneVerification(false);
            }}
          />
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  backButton: {
    marginRight: 16,
  },
  headerTextFlexWrapper: {
    flex: 1,
    marginLeft: 39, // 16 (backButton marginRight) + 23 (icon width)
    marginRight: 39, // for symmetry
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightSpacer: {
    width: 39,
  },
  headerText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.2,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
    alignSelf: 'flex-start',
    marginLeft: 0,
    textTransform: 'uppercase',
    textAlign: 'left',
  },
  divider: {
    height: 0.5,
    backgroundColor: '#E0E0E0',
    marginBottom: 27,
    width: '100%',
  },
  accountDivider: {
    height: 0.5,
    backgroundColor: '#E0E0E0',
    marginBottom: 27,
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  infoCol: {
    flex: 1,
    // Ensure infoCol starts at 0 relative to scrollContent
  },
  infoLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: COLORS.BLACK,
    letterSpacing: 0.2,
    opacity: 0.7,
    marginBottom: 11,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: 'rgb(142,142,142)',
    letterSpacing: 0.2,
    opacity: 0.7,
    marginRight: 8,
    // No textTransform for values
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedBadge: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12,
    color: COLORS.YELLOWISH_ORANGE,
    letterSpacing: 0.2,
    marginBottom: 11,
  },
  notVerifiedBadge: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12,
    color: 'rgb(142,142,142)',
    letterSpacing: 0.2,
    marginBottom: 11,
  },
  changeButton: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
    textAlign: 'right',
    width: 74,
  },
  infoButtonCol: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    minWidth: 74,
  },
  badgePlaceholder: {
    height: 17, // Approximate height of badge + marginBottom (12 font size + 11 margin)
  },
  passwordValue: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: COLORS.BLACK,
    letterSpacing: 0.2,
    opacity: 0.7,
    marginRight: 8,
  },
}); 