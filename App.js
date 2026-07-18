import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import * as SplashScreen from 'expo-splash-screen';
import AppNavigator from './navigation/AppNavigator';
import LaunchSplashVideo from './components/LaunchSplashVideo';
import DismissKeyboard from './components/DismissKeyboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { ListingsProvider } from './context/ListingsContext';
import { UserProfileProvider } from './context/UserProfileContext';
import { PaymentMethodsProvider } from './context/PaymentMethodsContext';
import { GuestBookingsProvider } from './context/GuestBookingsContext';
import { MessagingProvider } from './context/MessagingContext';
import { getStripePublishableKey } from './constants/stripe';
import {
  useFonts,
  Nunito_300Light,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';

const SPLASH_BG = '#DFF2F1';

SplashScreen.preventAutoHideAsync().catch(() => {});

function PushRegistration() {
  const { isAuthenticated, isReady } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !isReady) return undefined;
    let sub;
    (async () => {
      const push = await import('./services/pushNotifications');
      push.registerForPushNotificationsAsync().catch(() => {});
      sub = push.addNotificationResponseListener((response) => {
        const data = response?.notification?.request?.content?.data || {};
        if (data.bookingId) {
          // Navigation is handled when user opens the app from a notification tap.
        }
      });
    })();
    return () => sub?.remove();
  }, [isAuthenticated, isReady]);

  return null;
}

function AppProviders() {
  return (
    <ListingsProvider>
      <UserProfileProvider>
        <PaymentMethodsProvider>
          <GuestBookingsProvider>
            <FavoritesProvider>
              <MessagingProvider>
                <PushRegistration />
                <AppNavigator />
              </MessagingProvider>
            </FavoritesProvider>
          </GuestBookingsProvider>
        </PaymentMethodsProvider>
      </UserProfileProvider>
    </ListingsProvider>
  );
}

function MainApp() {
  const stripeKey = getStripePublishableKey();
  const tree = (
    <SafeAreaProvider>
      <DismissKeyboard>
        <AppProviders />
      </DismissKeyboard>
    </SafeAreaProvider>
  );

  return (
    <AuthProvider>
      {stripeKey ? (
        <StripeProvider publishableKey={stripeKey}>{tree}</StripeProvider>
      ) : (
        tree
      )}
    </AuthProvider>
  );
}

export default function App() {
  const [showLaunchVideo, setShowLaunchVideo] = useState(true);
  const [fontsLoaded] = useFonts({
    Nunito_300Light,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });
  const [fontsTimedOut, setFontsTimedOut] = useState(false);
  const appReady = fontsLoaded || fontsTimedOut;

  useEffect(() => {
    SplashScreen.setOptions?.({ fade: true, duration: 120 });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setFontsTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleLaunchFinish = useCallback(() => {
    setShowLaunchVideo(false);
  }, []);

  if (showLaunchVideo) {
    return (
      <View style={styles.splashRoot}>
        <LaunchSplashVideo appReady={appReady} onFinish={handleLaunchFinish} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <MainApp />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  splashRoot: {
    flex: 1,
    backgroundColor: SPLASH_BG,
  },
});
