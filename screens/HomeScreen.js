import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useListings } from '../context/ListingsContext';
import { useAuth } from '../context/AuthContext';
import { searchListings } from '../services/listingsApi';
import GooglePlacesAutocompleteField from '../components/GooglePlacesAutocompleteField';
import { resolveCurrentLocationQueryWithAlert } from '../utils/currentLocation';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;

export default function HomeScreen({ navigation }) {
  const { isAuthenticated, isReady } = useAuth();
  const { getListingsByCity, mergeRemoteListings } = useListings();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [selectedTab, setSelectedTab] = useState('home');

  const carTranslateX = scrollY.interpolate({
    inputRange: [0, 300 * scale],
    outputRange: [0, 120 * scale],
    extrapolate: 'clamp',
  });

  const runSearch = useCallback(
    async (rawLocation) => {
      const location = (rawLocation || '').trim();
      if (!location) return;

      const city = location.includes(',') ? location.split(',')[0].trim() : location;

      if (isAuthenticated && isReady) {
        try {
          const remote = await searchListings({ city });
          if (Array.isArray(remote) && remote.length > 0) {
            mergeRemoteListings(remote);
          }
        } catch (_) {
          /* fall through */
        }
      }

      const listings = getListingsByCity(city);
      if (listings.length > 0) {
        navigation.navigate('SearchResultsScreen', { city, listings });
      } else {
        navigation.navigate('EmptyVehicleSearchScreen', { location: city });
      }
    },
    [getListingsByCity, isAuthenticated, isReady, mergeRemoteListings, navigation],
  );

  const handlePlaceSelected = useCallback(
    ({ selection }) => {
      runSearch(selection.query || selection.city);
    },
    [runSearch],
  );

  const handleCurrentLocation = async () => {
    const loc = await resolveCurrentLocationQueryWithAlert();
    if (!loc) return;
    runSearch(loc.query);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Experience more together</Text>
      <View style={styles.searchSection}>
        <Text style={styles.locationHeading}>LOCATION</Text>
        <View style={styles.searchBarContainer}>
          <GooglePlacesAutocompleteField
            placeholder="City, airport, address, or hotel"
            onPlaceSelected={handlePlaceSelected}
            containerStyle={styles.placesContainer}
            inputStyle={styles.searchBar}
          />
        </View>
        <TouchableOpacity style={styles.currentLocationRow} onPress={handleCurrentLocation} activeOpacity={0.85}>
          <Image
            source={require('../assets/icons/current-location.png')}
            style={styles.currentLocationIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
      <Animated.ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.scrollSpacer} />
      </Animated.ScrollView>
      <Animated.View style={[styles.carImageContainer, { transform: [{ translateX: carTranslateX }] }]}>
        <Image source={require('../assets/icons/home-screen-car.png')} style={styles.carImage} resizeMode="contain" />
      </Animated.View>
      <View style={styles.menuBar}>
        <TouchableOpacity style={styles.menuItem} onPress={() => setSelectedTab('home')}>
          <Image
            source={require('../assets/icons/home.png')}
            style={[styles.menuIcon, selectedTab === 'home' && styles.menuIconSelected]}
            resizeMode="contain"
          />
          {selectedTab === 'home' && <View style={styles.menuDot} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            setSelectedTab('rental');
            navigation.navigate('RentalManagerScreen');
          }}
        >
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
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            setSelectedTab('profile');
            navigation.navigate('ProfileScreen');
          }}
        >
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
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 60 * scale : 40 * scale },
  title: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 22 * scale,
    color: 'rgb(14,38,43)',
    width: 288 * scale,
    height: 30 * scale,
    textAlign: 'left',
    marginBottom: 32 * scale,
    marginLeft: 22 * scale,
    alignSelf: 'flex-start',
  },
  locationHeading: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: '#000',
    letterSpacing: 0.2,
    width: 57 * scale,
    height: 15 * scale,
    textAlign: 'left',
    opacity: 0.7,
    marginBottom: 8 * scale,
    alignSelf: 'flex-start',
    marginLeft: 12 * scale,
  },
  searchSection: {
    width: '100%',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  searchBarContainer: {
    width: 331 * scale,
    marginBottom: 18 * scale,
    zIndex: 1000,
    elevation: 1000,
  },
  placesContainer: {
    width: '100%',
  },
  searchBar: {
    fontSize: 12 * scale,
    height: 49 * scale,
    borderWidth: 1.5,
    borderColor: 'rgb(224,224,224)',
    borderRadius: 5 * scale,
    paddingHorizontal: 16 * scale,
  },
  currentLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4 * scale,
    marginLeft: 12 * scale,
    opacity: 0.89,
    marginBottom: 24 * scale,
    alignSelf: 'flex-start',
  },
  currentLocationIcon: {
    width: 119 * scale,
    height: 27 * scale,
  },
  carImage: {
    width: 375 * scale,
    height: 113 * scale,
    marginBottom: 0,
  },
  menuBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 375 * scale,
    height: 78 * scale,
    backgroundColor: '#fff',
    paddingHorizontal: 24 * scale,
    marginBottom: 10 * scale,
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
  scrollArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollSpacer: {
    height: 120 * scale,
  },
  carImageContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 78 * scale,
    alignItems: 'center',
    width: '100%',
  },
});
