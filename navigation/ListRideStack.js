import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EditYourRideScreen from '../screens/EditYourRideScreen';
import ListRideLanding1Screen from '../screens/ListRideLanding1Screen';
import ListRideLanding2Screen from '../screens/ListRideLanding2Screen';
import ListRideLanding3Screen from '../screens/ListRideLanding3Screen';
import TellUsAboutYourRideScreen1 from '../screens/TellUsAboutYourRideScreen1';
import AvailabilityLandingScreen from '../screens/AvailabilityLandingScreen';
import AvailabilitySetupScreen from '../screens/AvailabilitySetupScreen';
import CalendarScreen from '../screens/CalendarScreen';
import PricingLandingScreen from '../screens/PricingLandingScreen';
import PricingSetupScreen from '../screens/PricingSetupScreen';
import ExtrasLandingScreen from '../screens/ExtrasLandingScreen';
import ExtrasSetupScreen from '../screens/ExtrasSetupScreen';
import DescribeYourRideScreen from '../screens/DescribeYourRideScreen';
import ShowOffYourRideScreen from '../screens/ShowOffYourRideScreen';
import PhotoShootScreen from '../screens/PhotoShootScreen';
import PhotoManagementScreen from '../screens/PhotoManagementScreen';
import HostStandardsScreen from '../screens/HostStandardsScreen';
import ReadyToStartEarningScreen from '../screens/ReadyToStartEarningScreen';
import WhereIsMyVINScreen from '../screens/WhereIsMyVINScreen';
import ScanVINScreen from '../screens/ScanVINScreen';
import TypeVINScreen from '../screens/TypeVINScreen';
import VINAlreadyExistsScreen from '../screens/VINAlreadyExistsScreen';

const Stack = createNativeStackNavigator();

const ListRideStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="ListRideLanding1Screen"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="ListRideLanding1Screen" component={ListRideLanding1Screen} />
      <Stack.Screen name="EditYourRideScreen" component={EditYourRideScreen} />
      <Stack.Screen name="ListRideLanding2Screen" component={ListRideLanding2Screen} />
      <Stack.Screen name="ListRideLanding3Screen" component={ListRideLanding3Screen} />
      <Stack.Screen name="TellUsAboutYourRideScreen1" component={TellUsAboutYourRideScreen1} />
      <Stack.Screen name="AvailabilityLandingScreen" component={AvailabilityLandingScreen} />
      <Stack.Screen name="AvailabilitySetupScreen" component={AvailabilitySetupScreen} />
      <Stack.Screen name="CalendarScreen" component={CalendarScreen} />
      <Stack.Screen name="PricingLandingScreen" component={PricingLandingScreen} />
      <Stack.Screen name="PricingSetupScreen" component={PricingSetupScreen} />
      <Stack.Screen name="ExtrasLandingScreen" component={ExtrasLandingScreen} />
      <Stack.Screen name="ExtrasSetupScreen" component={ExtrasSetupScreen} />
      <Stack.Screen name="DescribeYourRideScreen" component={DescribeYourRideScreen} />
      <Stack.Screen name="ShowOffYourRideScreen" component={ShowOffYourRideScreen} />
      <Stack.Screen name="PhotoShootScreen" component={PhotoShootScreen} />
      <Stack.Screen name="PhotoManagementScreen" component={PhotoManagementScreen} />
      <Stack.Screen name="HostStandardsScreen" component={HostStandardsScreen} />
      <Stack.Screen name="ReadyToStartEarningScreen" component={ReadyToStartEarningScreen} />
      <Stack.Screen name="WhereIsMyVINScreen" component={WhereIsMyVINScreen} />
            <Stack.Screen name="ScanVINScreen" component={ScanVINScreen} />
            <Stack.Screen name="TypeVINScreen" component={TypeVINScreen} />
            <Stack.Screen name="VINAlreadyExistsScreen" component={VINAlreadyExistsScreen} />
    </Stack.Navigator>
  );
};

export default ListRideStack; 