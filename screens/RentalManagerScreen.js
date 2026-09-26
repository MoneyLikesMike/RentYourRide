import React from 'react';
import { uiScale } from '../utils/uiScale';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useListings } from '../context/ListingsContext';
import { startListRideFlow } from '../utils/verificationGates';

const scale = uiScale;

function buildIcons({ canStartListingWithoutGetPaid, hasListingOrPayoutInfo }) {
  return [
    {
      label: 'List a new ride',
      icon: require('../assets/icons/list-a-new-ride.png'),
      onPress: (navigation) => {
        startListRideFlow(navigation, { canUseListingsHub: canStartListingWithoutGetPaid });
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
  const { canUseListingsHub } = useListings();
  const ICONS = React.useMemo(
    () =>
      buildIcons({
        canStartListingWithoutGetPaid: canUseListingsHub,
        hasListingOrPayoutInfo: canUseListingsHub,
      }),
    [canUseListingsHub],
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.headerContainer}>
        <Text style={styles.heading}>RENTAL MANAGER</Text>
      </View>
      {/* Content-sized scroll — no minHeight, or empty space becomes scrollable */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        alwaysBounceVertical={false}
      >
        <View style={styles.grid}>
          {ICONS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.button}
              onPress={() => (item.onPress ? item.onPress(navigation) : null)}
              activeOpacity={0.8}
            >
              <View style={styles.iconWrapper}>
                <Image source={item.icon} style={styles.icon} resizeMode="contain" />
              </View>
              <Text style={styles.buttonLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
    paddingTop: 8 * scale,
    paddingBottom: 24 * scale,
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
});
