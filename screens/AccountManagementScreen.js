import React from 'react';
import { uiScale } from '../utils/uiScale';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, ScrollView, Platform, Linking } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useUserProfile } from '../context/UserProfileContext';
import { useListings } from '../context/ListingsContext';
import { useAuth } from '../context/AuthContext';
import { useAccountSetupSteps } from '../hooks/useAccountSetupSteps';
import AccountSetupProgressCard from '../components/AccountSetupProgressCard';
import { navigateRootStack } from '../utils/navigateRootStack';
import { ensureIdentityVerified } from '../utils/verificationGates';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = uiScale;

const PROFILE_OPTIONS = [
  { label: 'Contact Information', onPress: () => {} },
  { label: 'Notification Settings', onPress: () => {} },
  { label: 'Payment Information', onPress: () => {} },
  { label: 'Referrals and Credits', onPress: () => {} },
  { label: 'Listings', onPress: () => {} },
  { label: 'Favourites', onPress: () => {} },
  { label: 'Bug Report', onPress: () => {} },
  { label: 'Contact Us', onPress: () => {} },
];

export default function AccountManagementScreen({ navigation }) {
  const [selectedTab, setSelectedTab] = React.useState('profile');
  const { signOut } = useAuth();
  const { firstName, lastName, photoUri } = useUserProfile();
  const { canUseListingsHub } = useListings();
  const { stepsLeft, progress, allDone } = useAccountSetupSteps();
  const displayName =
    [firstName, lastName]
      .map((s) => (s ?? '').trim())
      .filter(Boolean)
      .join(' ') || 'Guest';

  const openUserProfile = () => {
    // Nested stack under Profile tab: tab-level navigate is reliable when the stack dispatch doesn’t resolve siblings.
    const tabNav = navigation.getParent();
    if (tabNav?.navigate) {
      tabNav.navigate('ProfileScreen', { screen: 'UserProfileScreen' });
    } else {
      navigation.navigate('UserProfileScreen');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Card */}
        <TouchableOpacity
          style={styles.profileCard}
          activeOpacity={0.8}
          onPress={openUserProfile}
        >
          <View style={styles.profilePhotoWrapper}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.profilePhoto} />
            ) : (
              <View style={styles.profilePhotoPlaceholder} />
            )}
          </View>
          <View style={styles.profileInfoRow}>
            <View style={styles.profileInfoTextCol}>
              <Text style={styles.profileName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.viewProfileText}>VIEW PROFILE</Text>
            </View>
            <Image source={require('../assets/icons/arrow-button.png')} style={styles.arrowIcon} />
          </View>
        </TouchableOpacity>
        {!allDone ? (
          <AccountSetupProgressCard
            stepsLeft={stepsLeft}
            progress={progress}
            onPress={() => navigation.navigate('VerificationStepsScreen')}
          />
        ) : null}
        {/* Profile Options */}
        <Text style={styles.basicInfoHeader}>BASIC INFORMATION</Text>
        {/* Grouped container for four buttons */}
        <View style={styles.infoGroupContainer}>
          {/* Contact Information */}
          <TouchableOpacity style={styles.infoGroupButton} onPress={() => navigation.navigate('ContactInformationScreen')}>
            <Text style={styles.infoGroupTextContact}>Contact Information</Text>
            <Image source={require('../assets/icons/arrow-button.png')} style={styles.infoGroupArrow} />
          </TouchableOpacity>
          <View style={styles.infoGroupDivider} />
          {/* Notifications */}
          <TouchableOpacity style={styles.infoGroupButton} onPress={() => navigation.navigate('NotificationsScreen')}>
            <Text style={styles.infoGroupTextNotifications}>Notifications</Text>
            <Image source={require('../assets/icons/arrow-button.png')} style={styles.infoGroupArrow} />
          </TouchableOpacity>
          <View style={styles.infoGroupDivider} />
          {/* Payments Information */}
          <TouchableOpacity style={styles.infoGroupButton} onPress={() => navigation.navigate('PaymentInformationScreen')}>
            <Text style={styles.infoGroupTextPayments}>Payment Information</Text>
            <Image source={require('../assets/icons/arrow-button.png')} style={styles.infoGroupArrow} />
          </TouchableOpacity>
          <View style={styles.infoGroupDivider} />
          {/* Referrals & Credits */}
          <TouchableOpacity
            style={styles.infoGroupButton}
            onPress={() => navigation.navigate('ReferralsCreditsScreen')}
          >
            <Text style={styles.infoGroupTextReferrals}>Referrals & Credits</Text>
            <Image source={require('../assets/icons/arrow-button.png')} style={styles.infoGroupArrow} />
          </TouchableOpacity>
        </View>
        {/* Rides Header */}
        <Text style={styles.ridesHeader}>RIDES</Text>
        {/* Rides Grouped Buttons */}
        <View style={styles.ridesGroupContainer}>
          {/* Listings */}
          <TouchableOpacity
            style={styles.ridesGroupButton}
            onPress={async () => {
              if (!(await ensureIdentityVerified(navigation, { alertTitle: 'Verify your account to list' }))) {
                return;
              }
              if (canUseListingsHub) {
                navigation.navigate('ListingsScreen');
              } else {
                navigateRootStack(navigation, 'GetPaidStack');
              }
            }}
          >
            <Text style={styles.ridesGroupText}>LISTINGS</Text>
            <Image source={require('../assets/icons/arrow-button.png')} style={styles.ridesGroupArrow} />
          </TouchableOpacity>
          <View style={styles.ridesGroupDivider} />
          {/* Favourites */}
          <TouchableOpacity style={styles.ridesGroupButton} onPress={() => navigation.navigate('FavouritesScreen')}>
            <Text style={styles.ridesGroupText}>FAVOURITES</Text>
            <Image source={require('../assets/icons/arrow-button.png')} style={styles.ridesGroupArrow} />
          </TouchableOpacity>
        </View>
        {/* Support Header */}
        <Text style={styles.supportHeader}>SUPPORT</Text>
        {/* Support Grouped Buttons */}
        <View style={styles.supportGroupContainer}>
          {/* Report a Bug */}
          <TouchableOpacity style={styles.supportGroupButton} onPress={() => Linking.openURL('mailto:support@rentyourride.ca?subject=Bug%20Report!')}>
            <Text style={styles.supportGroupText}>REPORT A BUG</Text>
            <Image source={require('../assets/icons/arrow-button.png')} style={styles.supportGroupArrow} />
          </TouchableOpacity>
          <View style={styles.supportGroupDivider} />
          {/* Contact Us */}
          <TouchableOpacity
            style={styles.supportGroupButton}
            onPress={() => {
              const subject = encodeURIComponent('Rent Your Ride - Support');
              const body = encodeURIComponent(
                'Hello,\n\nI need help with Rent Your Ride. Please find my message below:\n\n\n\nThank you,',
              );
              Linking.openURL(`mailto:support@rentyourride.ca?subject=${subject}&body=${body}`);
            }}
          >
            <Text style={styles.supportGroupText}>CONTACT US</Text>
            <Image source={require('../assets/icons/arrow-button.png')} style={styles.supportGroupArrow} />
          </TouchableOpacity>
        </View>
        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={() => signOut()}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
      {/* Menu Bar */}
      <View style={styles.menuBar}>
        <TouchableOpacity style={styles.menuItem} onPress={() => { setSelectedTab('home'); navigation.navigate('HomeTab'); }}>
          <Image
            source={require('../assets/icons/home.png')}
            style={[styles.menuIcon, selectedTab === 'home' && styles.menuIconSelected]}
            resizeMode="contain"
          />
          {selectedTab === 'home' && <View style={styles.menuDot} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => { setSelectedTab('rental'); navigation.navigate('RentalManagerScreen'); }}>
          <Image
            source={require('../assets/icons/shape2.png')}
            style={[styles.menuIcon, selectedTab === 'rental' && styles.menuIconSelected]}
            resizeMode="contain"
          />
          {selectedTab === 'rental' && <View style={styles.menuDot} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => setSelectedTab('chat')}>
          <Image
            source={require('../assets/icons/path2.png')}
            style={[styles.menuIcon, selectedTab === 'chat' && styles.menuIconSelected]}
            resizeMode="contain"
          />
          {selectedTab === 'chat' && <View style={styles.menuDot} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => { setSelectedTab('profile'); navigation.navigate('ProfileScreen'); }}>
          <Image
            source={require('../assets/icons/shape.png')}
            style={[styles.menuIcon, selectedTab === 'profile' && styles.menuIconSelected]}
            resizeMode="contain"
          />
          {selectedTab === 'profile' && <View style={styles.menuDot} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 40 * scale,
    paddingTop: 129 * scale,
    marginTop: -30 * scale,
  },
  profileCard: {
    width: 344 * scale,
    height: 94 * scale,
    backgroundColor: '#fff',
    borderRadius: 10 * scale,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32 * scale,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    paddingHorizontal: 20 * scale,
  },
  profilePhotoWrapper: {
    width: 54 * scale,
    height: 54 * scale,
    borderRadius: 27 * scale,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18 * scale,
    marginLeft: 18 * scale,
  },
  profilePhoto: {
    width: 54 * scale,
    height: 54 * scale,
    borderRadius: 27 * scale,
  },
  profilePhotoPlaceholder: {
    width: 54 * scale,
    height: 54 * scale,
    borderRadius: 27 * scale,
    backgroundColor: '#e0e0e0',
  },
  profileInfoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileInfoTextCol: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  profileName: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 21 * scale,
    color: 'rgb(86,86,86)',
    textAlign: 'left',
    flexShrink: 1,
    marginBottom: 4 * scale,
    maxWidth: 200 * scale,
  },
  viewProfileText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    width: 84 * scale,
    height: 16 * scale,
    textAlign: 'center',
    marginRight: 6 * scale,
    textTransform: 'uppercase',
  },
  arrowIcon: {
    width: 12 * scale,
    height: 12 * scale,
    resizeMode: 'contain',
  },
  optionsSection: {
    width: 344 * scale,
    marginBottom: 32 * scale,
  },
  optionRow: {
    paddingVertical: 14 * scale,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: '#222',
  },
  logoutButton: {
    height: 24 * scale,
    backgroundColor: 'transparent',
    borderRadius: 0,
    justifyContent: 'center',
    borderWidth: 0,
    marginTop: 26 * scale,
    marginBottom: 24 * scale,
    marginLeft: 35 * scale,
    alignSelf: 'flex-start',
  },
  logoutText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 18 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    textAlign: 'left',
    height: 24 * scale,
  },
  basicInfoHeader: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: 'rgb(193,193,193)',
    letterSpacing: 0.4,
    height: 42 * scale,
    textAlign: 'left',
    alignSelf: 'flex-start',
    marginLeft: 35 * scale,
    marginBottom: -10 * scale,
  },
  infoGroupContainer: {
    width: 344 * scale,
    height: 191 * scale,
    backgroundColor: '#fff',
    borderRadius: 10 * scale,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 3,
    marginBottom: 32 * scale,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  infoGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 344 * scale,
    height: 47.75 * scale,
    paddingHorizontal: 20 * scale,
    backgroundColor: 'transparent',
  },
  infoGroupTextContact: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: '#000',
    letterSpacing: 0.2,
    flex: 1,
    height: 15 * scale,
    textAlign: 'left',
    opacity: 0.7,
    textTransform: 'uppercase',
  },
  infoGroupTextNotifications: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: '#000',
    letterSpacing: 0.2,
    width: 85 * scale,
    height: 15 * scale,
    textAlign: 'left',
    opacity: 0.7,
    textTransform: 'uppercase',
  },
  infoGroupTextPayments: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: '#000',
    letterSpacing: 0.2,
    width: 140 * scale,
    height: 15 * scale,
    textAlign: 'left',
    opacity: 0.7,
    textTransform: 'uppercase',
  },
  infoGroupTextReferrals: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: '#000',
    letterSpacing: 0.2,
    width: 125 * scale,
    height: 15 * scale,
    textAlign: 'left',
    opacity: 0.7,
    textTransform: 'uppercase',
  },
  infoGroupArrow: {
    width: 12 * scale,
    height: 12 * scale,
    resizeMode: 'contain',
  },
  infoGroupDivider: {
    width: 344 * scale,
    height: 1 * scale,
    backgroundColor: 'transparent',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgb(235,235,235)',
    alignSelf: 'center',
  },
  ridesHeader: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: 'rgb(193,193,193)',
    letterSpacing: 0.4,
    height: 42 * scale,
    textAlign: 'left',
    alignSelf: 'flex-start',
    marginLeft: 35 * scale,
    marginBottom: -10 * scale,
  },
  ridesGroupContainer: {
    width: 344 * scale,
    height: 95.5 * scale,
    backgroundColor: '#fff',
    borderRadius: 10 * scale,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 3,
    marginBottom: 32 * scale,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  ridesGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 344 * scale,
    height: 47.75 * scale,
    paddingHorizontal: 20 * scale,
    backgroundColor: 'transparent',
  },
  ridesGroupText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: '#000',
    letterSpacing: 0.2,
    flex: 1,
    height: 15 * scale,
    textAlign: 'left',
    opacity: 0.7,
    textTransform: 'uppercase',
  },
  ridesGroupArrow: {
    width: 12 * scale,
    height: 12 * scale,
    resizeMode: 'contain',
  },
  ridesGroupDivider: {
    width: 344 * scale,
    height: 1 * scale,
    backgroundColor: 'transparent',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgb(235,235,235)',
    alignSelf: 'center',
  },
  supportHeader: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: 'rgb(193,193,193)',
    letterSpacing: 0.4,
    height: 42 * scale,
    textAlign: 'left',
    alignSelf: 'flex-start',
    marginLeft: 35 * scale,
    marginBottom: -10 * scale,
  },
  supportGroupContainer: {
    width: 344 * scale,
    height: 95.5 * scale,
    backgroundColor: '#fff',
    borderRadius: 10 * scale,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 3,
    marginBottom: 32 * scale,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  supportGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 344 * scale,
    height: 47.75 * scale,
    paddingHorizontal: 20 * scale,
    backgroundColor: 'transparent',
  },
  supportGroupText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: '#000',
    letterSpacing: 0.2,
    flex: 1,
    height: 15 * scale,
    textAlign: 'left',
    opacity: 0.7,
    textTransform: 'uppercase',
  },
  supportGroupArrow: {
    width: 12 * scale,
    height: 12 * scale,
    resizeMode: 'contain',
  },
  supportGroupDivider: {
    width: 344 * scale,
    height: 1 * scale,
    backgroundColor: 'transparent',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgb(235,235,235)',
    alignSelf: 'center',
  },
  menuBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 375 * scale,
    height: 78 * scale,
    backgroundColor: '#fff',
    paddingHorizontal: 24 * scale,
    marginBottom: Platform.OS === 'ios' ? 0 : 0,
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  menuItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24 * scale,
    height: 22 * scale,
  },
  menuIcon: {
    width: 24 * scale,
    height: 24 * scale,
    tintColor: '#C3C3C3',
  },
  menuIconSelected: {
    tintColor: COLORS.GREENY_BLUE_TWO,
  },
  menuDot: {
    width: 4 * scale,
    height: 4 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 2 * scale,
    marginTop: 7 * scale,
  },
}); 