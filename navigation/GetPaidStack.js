import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GetPaidLandingScreen from '../screens/GetPaidLandingScreen';
import GetPaidStep1Screen from '../screens/GetPaidStep1Screen';
import GetPaidStep2Screen from '../screens/GetPaidStep2Screen';
import GetPaidStep3Screen from '../screens/GetPaidStep3Screen';

const Stack = createNativeStackNavigator();

export default function GetPaidStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GetPaidLandingScreen" component={GetPaidLandingScreen} />
      <Stack.Screen name="GetPaidStep1Screen" component={GetPaidStep1Screen} />
      <Stack.Screen name="GetPaidStep2Screen" component={GetPaidStep2Screen} />
      <Stack.Screen name="GetPaidStep3Screen" component={GetPaidStep3Screen} />
    </Stack.Navigator>
  );
} 