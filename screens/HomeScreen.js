import React, { useState, useCallback, useEffect } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Svg, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useListings } from '../context/ListingsContext';
import { searchListings } from '../services/listingsApi';
import GooglePlacesAutocompleteField from '../components/GooglePlacesAutocompleteField';
import HomeStripCard from '../components/HomeStripCard';
import { resolveCurrentLocationQueryWithAlert, getCurrentCoordinates } from '../utils/currentLocation';
import { isMarketplaceListing, resolveSearchCity, formatLocationLabel } from '../utils/searchLocation';
import { buildHomeDiscoveryStrips } from '../utils/homeDiscovery';

const scale = uiScale;
const MOUNTAIN_W = 375 * scale;
const MOUNTAIN_H = 113 * scale;

function DiscoverySection({ title, subtitle, items, onPressListing }) {
  if (!items?.length) return null;
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, !subtitle && styles.sectionTitleSolo]}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stripContent}
        keyboardShouldPersistTaps="handled"
      >
        {items.map((item) => (
          <HomeStripCard
            key={item.listing.id}
            listing={item.listing}
            distanceKm={item.distanceKm}
            badge={item.badge}
            onPress={() => onPressListing(item.listing)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { getListingsByCity, mergeRemoteListings } = useListings();
  const [selectedTab, setSelectedTab] = useState('home');
  const [strips, setStrips] = useState({ nearYou: [], bestValue: [], newHosts: [] });
  const [loadingStrips, setLoadingStrips] = useState(true);

  const openListing = useCallback(
    (listing) => {
      navigation.navigate('VehicleDetailScreen', { listing });
    },
    [navigation],
  );

  const loadDiscovery = useCallback(async () => {
    setLoadingStrips(true);
    let origin = null;
    try {
      origin = await getCurrentCoordinates();
    } catch (_) {
      origin = null;
    }

    let remote = [];
    try {
      if (origin) {
        remote = await searchListings({
          latitude: origin.latitude,
          longitude: origin.longitude,
          radiusKm: 80,
        });
      }
      if (!Array.isArray(remote) || remote.length < 3) {
        const all = await searchListings({});
        if (Array.isArray(all)) remote = all;
      }
    } catch (_) {
      remote = [];
    }

    if (Array.isArray(remote) && remote.length) {
      mergeRemoteListings(remote);
    }

    const pool = (Array.isArray(remote) ? remote : []).filter(isMarketplaceListing);
    setStrips(buildHomeDiscoveryStrips(pool, { origin, limit: 3 }));
    setLoadingStrips(false);
  }, [mergeRemoteListings]);

  useEffect(() => {
    loadDiscovery();
  }, [loadDiscovery]);

  const runSearch = useCallback(
    async (searchInput, explicitCity, coords = null) => {
      const { city, query } = resolveSearchCity({
        city: explicitCity,
        query: typeof searchInput === 'string' ? searchInput : '',
      });
      const displayLocation = formatLocationLabel(city || query);
      if (!city) {
        navigation.navigate('EmptyVehicleSearchScreen', { location: displayLocation });
        return;
      }

      const origin =
        coords &&
        Number.isFinite(coords.latitude) &&
        Number.isFinite(coords.longitude)
          ? { latitude: coords.latitude, longitude: coords.longitude }
          : null;

      let remoteResults = null;
      try {
        remoteResults = await searchListings(
          origin
            ? { city, latitude: origin.latitude, longitude: origin.longitude }
            : { city },
        );
        if (Array.isArray(remoteResults)) {
          mergeRemoteListings(remoteResults);
        }
      } catch (_) {
        /* fall through to local cache */
      }

      let merged;
      if (Array.isArray(remoteResults)) {
        merged = remoteResults.filter(isMarketplaceListing);
      } else {
        merged = getListingsByCity(city).filter(isMarketplaceListing);
      }

      if (merged.length > 0) {
        navigation.navigate('SearchResultsScreen', {
          city,
          listings: merged,
          ...(origin
            ? { latitude: origin.latitude, longitude: origin.longitude }
            : {}),
        });
      } else {
        navigation.navigate('EmptyVehicleSearchScreen', { location: formatLocationLabel(query || city) });
      }
    },
    [getListingsByCity, mergeRemoteListings, navigation],
  );

  const handlePlaceSelected = useCallback(
    ({ selection }) => {
      runSearch(selection.query, selection.city, {
        latitude: selection.latitude,
        longitude: selection.longitude,
      });
    },
    [runSearch],
  );

  const handleCurrentLocation = async () => {
    const loc = await resolveCurrentLocationQueryWithAlert();
    if (!loc) return;
    runSearch(loc.query, loc.city, {
      latitude: loc.latitude,
      longitude: loc.longitude,
    });
  };

  const handleManualSearch = useCallback(
    (text) => {
      const trimmed = (text || '').trim();
      if (!trimmed) return;
      runSearch(trimmed, trimmed.includes(',') ? undefined : trimmed);
    },
    [runSearch],
  );

  const hasStrips =
    strips.nearYou.length > 0 || strips.bestValue.length > 0 || strips.newHosts.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Experience more together</Text>
      <View style={styles.searchSection}>
        <Text style={styles.locationHeading}>LOCATION</Text>
        <View style={styles.searchBarContainer}>
          <GooglePlacesAutocompleteField
            placeholder="City, airport, address, or hotel"
            onPlaceSelected={handlePlaceSelected}
            onManualSubmit={handleManualSearch}
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
      <View style={styles.scrollWrap}>
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {loadingStrips && !hasStrips ? (
            <ActivityIndicator style={styles.loader} color={COLORS.GREENY_BLUE_TWO} />
          ) : null}
          <DiscoverySection title="Near you" items={strips.nearYou} onPressListing={openListing} />
          <DiscoverySection
            title="Best value this week"
            items={strips.bestValue}
            onPressListing={openListing}
          />
          <DiscoverySection
            title="New hosts"
            subtitle="First-booking deals"
            items={strips.newHosts}
            onPressListing={openListing}
          />
          <View style={styles.scrollSpacer} />
        </ScrollView>
      </View>
      <View pointerEvents="none" style={styles.carImageContainer}>
        {/* Soft glass fade — cards dissolve under the mountain instead of a hard white block */}
        <View style={styles.carImageBackdrop}>
          <Svg width={MOUNTAIN_W} height={MOUNTAIN_H}>
            <Defs>
              <LinearGradient id="homeMountainGlass" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
                <Stop offset="0.28" stopColor="#FFFFFF" stopOpacity="0.35" />
                <Stop offset="0.55" stopColor="#EAF7F6" stopOpacity="0.72" />
                <Stop offset="0.78" stopColor="#FFFFFF" stopOpacity="0.9" />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.97" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width={MOUNTAIN_W} height={MOUNTAIN_H} fill="url(#homeMountainGlass)" />
          </Svg>
        </View>
        <Image source={require('../assets/icons/home-screen-car.png')} style={styles.carImage} resizeMode="contain" />
      </View>
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 * scale : 40 * scale,
  },
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
    backgroundColor: '#fff',
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
    marginBottom: 16 * scale,
    alignSelf: 'flex-start',
  },
  currentLocationIcon: {
    width: 119 * scale,
    height: 27 * scale,
  },
  scrollWrap: {
    flex: 1,
    width: '100%',
  },
  scrollArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 8 * scale,
  },
  loader: {
    marginTop: 24 * scale,
    marginBottom: 8 * scale,
  },
  section: {
    width: '100%',
    marginBottom: 20 * scale,
    paddingLeft: 22 * scale,
  },
  sectionTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 17 * scale,
    color: 'rgb(14,38,43)',
    marginBottom: 4 * scale,
  },
  sectionTitleSolo: {
    marginBottom: 10 * scale,
  },
  sectionSubtitle: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: 'rgb(142,142,142)',
    marginBottom: 10 * scale,
  },
  stripContent: {
    paddingRight: 22 * scale,
    paddingTop: 6 * scale,
  },
  scrollSpacer: {
    height: 150 * scale,
  },
  carImage: {
    width: MOUNTAIN_W,
    height: MOUNTAIN_H,
    marginBottom: 0,
  },
  carImageContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 78 * scale,
    alignItems: 'center',
    width: '100%',
    height: MOUNTAIN_H,
    overflow: 'hidden',
    zIndex: 5,
  },
  carImageBackdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
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
    zIndex: 10,
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
