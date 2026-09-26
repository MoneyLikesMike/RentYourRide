import React, { useEffect } from 'react';
import { uiScale } from '../utils/uiScale';
import { Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { navigationRef } from './navigationRef';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform, Dimensions } from 'react-native';
import WelcomeScreen from '../screens/WelcomeScreen';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import AuthScreen from '../screens/AuthScreen';
import TermsAndConditionsScreen from '../screens/TermsAndConditionsScreen';
import CommunityGuidelinesScreen from '../screens/CommunityGuidelinesScreen';
import NotificationOnboardingScreen from '../screens/NotificationOnboardingScreen';
import EmailVerificationScreen from '../screens/EmailVerificationScreen';
import ExtendTripScreen from '../screens/ExtendTripScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import EmailChangeSuccessScreen from '../screens/EmailChangeSuccessScreen';
import HomeScreen from '../screens/HomeScreen';
import RentalManagerScreen from '../screens/RentalManagerScreen';
import AccountManagementScreen from '../screens/AccountManagementScreen';
import DeleteAccountScreen from '../screens/DeleteAccountScreen';
import ContactInformationScreen from '../screens/ContactInformationScreen';
import ChangeEmailScreen from '../screens/ChangeEmailScreen';
import ChangeAddressScreen from '../screens/ChangeAddressScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import PaymentInformationScreen from '../screens/PaymentInformationScreen';
import MessagesScreen from '../screens/MessagesScreen';
import { useMessaging } from '../context/MessagingContext';
import FavouritesScreen from '../screens/FavouritesScreen';
import RentalRequestScreen from '../screens/RentalRequestScreen';
import ActiveRentalsScreen from '../screens/ActiveRentalsScreen';
import GuestBookingDetailsScreen from '../screens/GuestBookingDetailsScreen';
import GuestCheckInScreen from '../screens/GuestCheckInScreen';
import GuestCheckoutScreen from '../screens/GuestCheckoutScreen';
import HostCheckoutScreen from '../screens/HostCheckoutScreen';
import CheckInGuidelinesScreen from '../screens/CheckInGuidelinesScreen';
import GuestRentalAgreementScreen from '../screens/GuestRentalAgreementScreen';
import GuestRentalAgreementSignScreen from '../screens/GuestRentalAgreementSignScreen';
import GuestCheckoutTripCompleteScreen from '../screens/GuestCheckoutTripCompleteScreen';
import HostCheckoutTripCompleteScreen from '../screens/HostCheckoutTripCompleteScreen';
import GuestHostReviewScreen from '../screens/GuestHostReviewScreen';
import HostGuestReviewScreen from '../screens/HostGuestReviewScreen';
import GuestCheckInReminderScreen from '../screens/GuestCheckInReminderScreen';
import HostCheckInScreen from '../screens/HostCheckInScreen';
import HostRentalAgreementScreen from '../screens/HostRentalAgreementScreen';
import HostRentalAgreementSignScreen from '../screens/HostRentalAgreementSignScreen';
import HostCheckInReminderScreen from '../screens/HostCheckInReminderScreen';
import GuestVehicleConditionPhotosScreen from '../screens/GuestVehicleConditionPhotosScreen';
import HostVehicleConditionPhotosScreen from '../screens/HostVehicleConditionPhotosScreen';
import HostConditionPhotoReviewScreen from '../screens/HostConditionPhotoReviewScreen';
import GuestConditionPhotoReviewScreen from '../screens/GuestConditionPhotoReviewScreen';
import PhotoShootScreen from '../screens/PhotoShootScreen';
import HostBookingDetailsScreen from '../screens/HostBookingDetailsScreen';
import RentalAgreementsScreen from '../screens/RentalAgreementsScreen';
import CompletedRentalAgreementScreen from '../screens/CompletedRentalAgreementScreen';
import RentalHistoryScreen from '../screens/RentalHistoryScreen';
import PayoutsDashboardScreen from '../screens/PayoutsDashboardScreen';
import PayoutEmptyStateScreen from '../screens/PayoutEmptyStateScreen';
import GetPaidStack from './GetPaidStack';
import EmptyVehicleSearchScreen from '../screens/EmptyVehicleSearchScreen';
import SearchResultsScreen from '../screens/SearchResultsScreen';
import ListRideStack from './ListRideStack';
import { SharedBrowseScreens, SHARED_BROWSE_ROUTE_NAMES } from './SharedBrowseScreens';
import ListingsScreen from '../screens/ListingsScreen';
import ReferralsCreditsScreen from '../screens/ReferralsCreditsScreen';
import InviteFriendScreen from '../screens/InviteFriendScreen';
import ReferHostScreen from '../screens/ReferHostScreen';
import TravelCreditScreen from '../screens/TravelCreditScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = uiScale;

const ProfileStackNav = createNativeStackNavigator();
const HomeStackNav = createNativeStackNavigator();

function HomeStack() {
  return (
    <HomeStackNav.Navigator screenOptions={{ headerShown: false }}>
      <HomeStackNav.Screen name="HomeScreen" component={HomeScreen} />
      <HomeStackNav.Screen name="SearchResultsScreen" component={SearchResultsScreen} />
      <HomeStackNav.Screen name="EmptyVehicleSearchScreen" component={EmptyVehicleSearchScreen} />
      {SharedBrowseScreens({ Stack: HomeStackNav, includeChatThread: true })}
    </HomeStackNav.Navigator>
  );
}

function ProfileStack() {
  return (
    <ProfileStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStackNav.Screen name="AccountManagementScreen" component={AccountManagementScreen} />
      <ProfileStackNav.Screen name="DeleteAccountScreen" component={DeleteAccountScreen} />
      <ProfileStackNav.Screen name="ContactInformationScreen" component={ContactInformationScreen} />
      <ProfileStackNav.Screen name="ChangeEmailScreen" component={ChangeEmailScreen} options={{ presentation: 'modal' }} />
      <ProfileStackNav.Screen name="ChangeAddressScreen" component={ChangeAddressScreen} />
      <ProfileStackNav.Screen name="NotificationsScreen" component={NotificationsScreen} />
      <ProfileStackNav.Screen name="PaymentInformationScreen" component={PaymentInformationScreen} />
      <ProfileStackNav.Screen name="FavouritesScreen" component={FavouritesScreen} />
      <ProfileStackNav.Screen name="ListingsScreen" component={ListingsScreen} />
      <ProfileStackNav.Screen name="ReferralsCreditsScreen" component={ReferralsCreditsScreen} />
      <ProfileStackNav.Screen name="InviteFriendScreen" component={InviteFriendScreen} />
      <ProfileStackNav.Screen name="ReferHostScreen" component={ReferHostScreen} />
      <ProfileStackNav.Screen name="TravelCreditScreen" component={TravelCreditScreen} />
      <ProfileStackNav.Screen name="TermsAndConditionsScreen" component={TermsAndConditionsScreen} />
      <ProfileStackNav.Screen name="CommunityGuidelinesScreen" component={CommunityGuidelinesScreen} />
      {/* Nested flows stay on this stack so Back returns here */}
      {SharedBrowseScreens({ Stack: ProfileStackNav, includeChatThread: true })}
    </ProfileStackNav.Navigator>
  );
}

const RentalManagerStackNav = createNativeStackNavigator();

function RentalManagerStack() {
  return (
    <RentalManagerStackNav.Navigator screenOptions={{ headerShown: false }}>
      <RentalManagerStackNav.Screen name="RentalManagerScreen" component={RentalManagerScreen} />
      <RentalManagerStackNav.Screen name="RentalRequestScreen" component={RentalRequestScreen} />
      <RentalManagerStackNav.Screen name="ActiveRentalsScreen" component={ActiveRentalsScreen} />
      <RentalManagerStackNav.Screen name="GuestBookingDetailsScreen" component={GuestBookingDetailsScreen} />
      <RentalManagerStackNav.Screen name="GuestCheckInScreen" component={GuestCheckInScreen} />
      <RentalManagerStackNav.Screen name="GuestCheckoutScreen" component={GuestCheckoutScreen} />
      <RentalManagerStackNav.Screen name="HostCheckoutScreen" component={HostCheckoutScreen} />
      <RentalManagerStackNav.Screen name="CheckInGuidelinesScreen" component={CheckInGuidelinesScreen} />
      <RentalManagerStackNav.Screen name="GuestRentalAgreementScreen" component={GuestRentalAgreementScreen} />
      <RentalManagerStackNav.Screen name="GuestRentalAgreementSignScreen" component={GuestRentalAgreementSignScreen} />
      <RentalManagerStackNav.Screen name="GuestCheckoutTripCompleteScreen" component={GuestCheckoutTripCompleteScreen} />
      <RentalManagerStackNav.Screen name="HostCheckoutTripCompleteScreen" component={HostCheckoutTripCompleteScreen} />
      <RentalManagerStackNav.Screen name="GuestHostReviewScreen" component={GuestHostReviewScreen} />
      <RentalManagerStackNav.Screen name="HostGuestReviewScreen" component={HostGuestReviewScreen} />
      <RentalManagerStackNav.Screen name="GuestCheckInReminderScreen" component={GuestCheckInReminderScreen} />
      <RentalManagerStackNav.Screen name="HostCheckInScreen" component={HostCheckInScreen} />
      <RentalManagerStackNav.Screen name="HostRentalAgreementScreen" component={HostRentalAgreementScreen} />
      <RentalManagerStackNav.Screen name="HostRentalAgreementSignScreen" component={HostRentalAgreementSignScreen} />
      <RentalManagerStackNav.Screen name="HostCheckInReminderScreen" component={HostCheckInReminderScreen} />
      <RentalManagerStackNav.Screen name="GuestVehicleConditionPhotosScreen" component={GuestVehicleConditionPhotosScreen} />
      <RentalManagerStackNav.Screen name="HostVehicleConditionPhotosScreen" component={HostVehicleConditionPhotosScreen} />
      <RentalManagerStackNav.Screen name="PhotoShootScreen" component={PhotoShootScreen} />
      <RentalManagerStackNav.Screen name="GuestConditionPhotoReviewScreen" component={GuestConditionPhotoReviewScreen} />
      <RentalManagerStackNav.Screen name="HostConditionPhotoReviewScreen" component={HostConditionPhotoReviewScreen} />
      <RentalManagerStackNav.Screen name="HostBookingDetailsScreen" component={HostBookingDetailsScreen} />
      <RentalManagerStackNav.Screen name="RentalAgreementsScreen" component={RentalAgreementsScreen} />
      <RentalManagerStackNav.Screen name="CompletedRentalAgreementScreen" component={CompletedRentalAgreementScreen} />
      <RentalManagerStackNav.Screen name="RentalHistoryScreen" component={RentalHistoryScreen} />
      <RentalManagerStackNav.Screen name="PayoutsDashboardScreen" component={PayoutsDashboardScreen} />
      {SharedBrowseScreens({ Stack: RentalManagerStackNav, includeChatThread: true })}
    </RentalManagerStackNav.Navigator>
  );
}

const MessagingStackNav = createNativeStackNavigator();

function MessagingStack() {
  return (
    <MessagingStackNav.Navigator screenOptions={{ headerShown: false }}>
      <MessagingStackNav.Screen name="MessagesScreen" component={MessagesScreen} />
      <MessagingStackNav.Screen
        name="ChatThreadScreen"
        getComponent={() => require('../screens/ChatThreadScreen').default}
      />
      {/* ChatThread already registered above — don't duplicate */}
      {SharedBrowseScreens({ Stack: MessagingStackNav, includeChatThread: false })}
    </MessagingStackNav.Navigator>
  );
}

function CustomTabBar({ state, descriptors, navigation }) {
  const { unreadTotal } = useMessaging();
  // Hide bottom nav on specific nested screens (e.g. booking calendar).
  const focusedRoute = state.routes[state.index];
  const focusedNestedName = getFocusedRouteNameFromRoute(focusedRoute) ?? focusedRoute.name;
  if (
    SHARED_BROWSE_ROUTE_NAMES.includes(focusedNestedName) ||
    focusedNestedName === 'ChatThreadScreen' ||
    focusedNestedName === 'InviteFriendScreen' ||
    focusedNestedName === 'ReferHostScreen' ||
    focusedNestedName === 'TravelCreditScreen' ||
    focusedNestedName === 'GuestBookingDetailsScreen' ||
    focusedNestedName === 'GuestCheckInScreen' ||
    focusedNestedName === 'GuestCheckoutScreen' ||
    focusedNestedName === 'HostCheckoutScreen' ||
    focusedNestedName === 'CheckInGuidelinesScreen' ||
    focusedNestedName === 'GuestRentalAgreementScreen' ||
    focusedNestedName === 'GuestRentalAgreementSignScreen' ||
    focusedNestedName === 'GuestCheckoutTripCompleteScreen' ||
    focusedNestedName === 'HostCheckoutTripCompleteScreen' ||
    focusedNestedName === 'GuestHostReviewScreen' ||
    focusedNestedName === 'HostGuestReviewScreen' ||
    focusedNestedName === 'GuestCheckInReminderScreen' ||
    focusedNestedName === 'GuestVehicleConditionPhotosScreen' ||
    focusedNestedName === 'PhotoShootScreen' ||
    focusedNestedName === 'GuestConditionPhotoReviewScreen' ||
    focusedNestedName === 'HostBookingDetailsScreen' ||
    focusedNestedName === 'HostCheckInScreen' ||
    focusedNestedName === 'HostRentalAgreementScreen' ||
    focusedNestedName === 'HostRentalAgreementSignScreen' ||
    focusedNestedName === 'HostCheckInReminderScreen' ||
    focusedNestedName === 'HostVehicleConditionPhotosScreen' ||
    focusedNestedName === 'HostConditionPhotoReviewScreen' ||
    focusedNestedName === 'CompletedRentalAgreementScreen' ||
    focusedNestedName === 'PayoutsDashboardScreen'
  ) {
    return null;
  }

  const icons = [
    require('../assets/icons/home.png'),
    require('../assets/icons/skeletoncar.png'), // Rental Manager tab icon
    require('../assets/icons/path2.png'),
    require('../assets/icons/shape.png'),
  ];
  return (
    <View style={tabBarStyles.menuBar}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };
        const showBadge = route.name === 'ChatScreen' && unreadTotal > 0;
        const badgeLabel = unreadTotal > 99 ? '99+' : String(unreadTotal);
        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            style={tabBarStyles.menuItem}
            activeOpacity={0.8}
          >
            <Image
              source={icons[index]}
              style={[tabBarStyles.menuIcon, isFocused && tabBarStyles.menuIconSelected]}
              resizeMode="contain"
            />
            {showBadge && (
              <View style={tabBarStyles.unreadBadge}>
                <Text style={tabBarStyles.unreadBadgeText}>{badgeLabel}</Text>
              </View>
            )}
            {isFocused && <View style={tabBarStyles.menuDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={props => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} />
      <Tab.Screen name="RentalManagerScreen" component={RentalManagerStack} />
      <Tab.Screen name="ChatScreen" component={MessagingStack} />
      <Tab.Screen name="ProfileScreen" component={ProfileStack} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isReady } = useAuth();

  useEffect(() => {
    if (!isReady) return undefined;

    const openFromUrl = (url) => {
      if (!url || !navigationRef.isReady()) return;
      try {
        // Custom scheme: com.rentyourride.ios://confirm-email-change?token=
        // HTTPS (if universal links / paste): …/confirm-email-change?token=
        const normalized = url.replace(/^com\.rentyourride\.ios:\/*/i, 'https://app.rentyourride.ca/');
        const parsed = new URL(normalized);
        const path = parsed.pathname.replace(/\/$/, '');
        const token = (
          parsed.searchParams.get('token') ||
          parsed.searchParams.get('passwordRecoveryVerificationToken') ||
          parsed.searchParams.get('emailChangeToken') ||
          ''
        ).trim();
        if (!token) return;
        if (path === '/reset-password' || path.endsWith('/reset-password')) {
          navigationRef.navigate('ResetPasswordScreen', { token });
          return;
        }
        if (
          path === '/confirm-email-change' ||
          path.endsWith('/confirm-email-change')
        ) {
          navigationRef.navigate('EmailChangeSuccessScreen', { token });
        }
      } catch {
        // ignore malformed urls
      }
    };

    Linking.getInitialURL().then(openFromUrl).catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => openFromUrl(url));
    return () => sub.remove();
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={isAuthenticated ? 'MainTabs' : 'Welcome'}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="AuthScreen" component={AuthScreen} />
        <Stack.Screen name="TermsAndConditionsScreen" component={TermsAndConditionsScreen} />
        <Stack.Screen name="CommunityGuidelinesScreen" component={CommunityGuidelinesScreen} />
        <Stack.Screen name="NotificationOnboardingScreen" component={NotificationOnboardingScreen} />
        <Stack.Screen name="EmailVerificationScreen" component={EmailVerificationScreen} />
        <Stack.Screen name="ExtendTripScreen" component={ExtendTripScreen} />
        <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPasswordScreen" component={ResetPasswordScreen} />
        <Stack.Screen
          name="EmailChangeSuccessScreen"
          component={EmailChangeSuccessScreen}
        />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="PayoutEmptyStateScreen" component={PayoutEmptyStateScreen} />
        <Stack.Screen name="GetPaidStack" component={GetPaidStack} />
        <Stack.Screen name="ListRideStack" component={ListRideStack} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const tabBarStyles = StyleSheet.create({
  menuBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 78 * scale,
    backgroundColor: '#fff',
    paddingHorizontal: 24 * scale,
    marginBottom: Platform.OS === 'ios' ? 0 : 0,
    borderTopWidth: 0,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
  unreadBadge: {
    position: 'absolute',
    top: -6 * scale,
    right: -8 * scale,
    minWidth: 16 * scale,
    height: 16 * scale,
    borderRadius: 8 * scale,
    backgroundColor: COLORS.MANGO_TWO,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4 * scale,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 10 * scale,
    fontFamily: FONTS.NUNITO_BOLD,
    lineHeight: 12 * scale,
  },
});