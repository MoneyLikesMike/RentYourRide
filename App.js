import React from 'react';
import AppNavigator from './navigation/AppNavigator';
import { FavoritesProvider } from './context/FavoritesContext';
import { ListingsProvider } from './context/ListingsContext';
import { UserProfileProvider } from './context/UserProfileContext';
import { PaymentMethodsProvider } from './context/PaymentMethodsContext';
import { GuestBookingsProvider } from './context/GuestBookingsContext';
import {
  useFonts,
  Nunito_300Light,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_300Light,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });
  console.log('fontsLoaded:', fontsLoaded);
  if (!fontsLoaded) return null;
  return (
    <ListingsProvider>
      <UserProfileProvider>
        <PaymentMethodsProvider>
          <GuestBookingsProvider>
            <FavoritesProvider>
              <AppNavigator />
            </FavoritesProvider>
          </GuestBookingsProvider>
        </PaymentMethodsProvider>
      </UserProfileProvider>
    </ListingsProvider>
  );
}
