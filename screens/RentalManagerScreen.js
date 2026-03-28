import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, ScrollView, Platform } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useListings } from '../context/ListingsContext';
import { navigateRootStack } from '../utils/navigateRootStack';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;

function buildIcons({ canStartListingWithoutGetPaid, hasListingOrPayoutInfo }) {
  return [
  {
    label: 'List a new ride',
    icon: require('../assets/icons/list-a-new-ride.png'),
    onPress: (navigation) => {
      // First listing: Get Paid first. Already listed once (or finished payout setup): start listing immediately.
      if (!canStartListingWithoutGetPaid) {
        navigateRootStack(navigation, 'GetPaidStack');
      } else {
        navigateRootStack(navigation, 'ListRideStack');
      }
    },
  },
  {
    label: 'Rental requests',
    icon: require('../assets/icons/suitcaseAlt.png'),
    onPress: (navigation) => navigation.navigate('RentalRequestScreen'),
  },
  {
    label: 'Active rentals',
    icon: require('../assets/icons/usersAlt.png'),
    onPress: (navigation) => navigation.navigate('ActiveRentalsScreen'),
  },
  {
    label: 'Rental agreements',
    icon: require('../assets/icons/text.png'),
    onPress: (navigation) => navigation.navigate('RentalAgreementsScreen'),
  },
  {
    label: 'Payouts',
    icon: require('../assets/icons/price.png'),
    onPress: (navigation) => {
      if (!hasListingOrPayoutInfo) {
        navigation.navigate('PayoutEmptyStateScreen');
      } else {
        navigation.navigate('PayoutsDashboardScreen');
      }
    },
  },
  {
    label: 'Rental history',
    icon: require('../assets/icons/icHistory24Px.png'),
    onPress: (navigation) => navigation.navigate('RentalHistoryScreen'),
  },
];
}

export default function RentalManagerScreen({ navigation }) {
  const [selectedTab, setSelectedTab] = React.useState('rental');
  const { canUseListingsHub } = useListings();
  const ICONS = React.useMemo(
    () => buildIcons({ canStartListingWithoutGetPaid: canUseListingsHub, hasListingOrPayoutInfo: canUseListingsHub }),
    [canUseListingsHub]
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Stationary Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.heading}>RENTAL MANAGER</Text>
      </View>
      <View style={{ height: 46 * scale }} />
      {/* Scrollable grid only */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {ICONS.map((item, idx) => (
            <TouchableOpacity key={item.label} style={styles.button} onPress={() => item.onPress ? item.onPress(navigation) : null} activeOpacity={0.8}>
              <View style={styles.iconWrapper}>
                <Image source={item.icon} style={styles.icon} resizeMode="contain" />
              </View>
              <Text style={styles.buttonLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      {/* Menu Bar */}
      <View style={styles.menuBar}>
        <TouchableOpacity style={styles.menuItem} onPress={() => { setSelectedTab('home'); navigation.navigate('HomeScreen'); }}>
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
        <TouchableOpacity style={styles.menuItem} onPress={() => setSelectedTab('profile')}>
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
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: 73 * scale,
    paddingBottom: 40 * scale,
    minHeight: '100%',
  },
  headerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 73 * scale,
    paddingBottom: 12 * scale,
    backgroundColor: '#fff',
    zIndex: 2,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 40 * scale,
    minHeight: '100%',
  },
  heading: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15 * scale,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.2,
    width: 142 * scale,
    height: 20 * scale,
    textAlign: 'center',
    alignSelf: 'center',
    fontWeight: 'bold',
    textTransform: 'none',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 18 * scale,
    rowGap: 18 * scale,
    width: '100%',
  },
  button: {
    width: 147 * scale,
    height: 147 * scale,
    backgroundColor: '#fff',
    borderRadius: 13 * scale,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 9 * scale,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrapper: {
    width: 60 * scale,
    height: 60 * scale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12 * scale,
  },
  icon: {
    width: 47 * scale,
    height: 48 * scale,
    alignSelf: 'center',
  },
  buttonLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 10 * scale,
    color: '#000',
    textAlign: 'center',
    letterSpacing: 0.2,
    width: 121 * scale,
    height: 18 * scale,
    opacity: 0.69,
    textTransform: 'uppercase',
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