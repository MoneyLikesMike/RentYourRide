import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { FONTS } from '../constants/fonts';
import { useFavorites } from '../context/FavoritesContext';
import ListingCard from '../components/ListingCard';
import { navigateToVehicleDetail } from '../utils/navigateRootStack';

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375;

export default function FavouritesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { favorites, isFavorited, toggleFavorite } = useFavorites();

  const openListing = useCallback(
    (listing) => {
      navigateToVehicleDetail(navigation, listing);
    },
    [navigation]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Svg width={24} height={24} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke="#FFB131" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.title}>Favourites</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {favorites.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No favourites yet</Text>
            <Text style={styles.emptySubtitle}>Tap the heart on a ride to save it here.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {favorites.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onPress={() => openListing(listing)}
                isFavorited={isFavorited(listing.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: { padding: 4, width: 32 },
  title: { flex: 1, textAlign: 'center', fontFamily: FONTS.NUNITO_BOLD, fontSize: 18, color: '#0E262B' },
  scrollContent: { paddingHorizontal: 20 * scale, paddingTop: 12, paddingBottom: 40 },
  emptyWrap: { paddingTop: 56 * scale, alignItems: 'center' },
  emptyTitle: { fontFamily: FONTS.NUNITO_BOLD, fontSize: 20, color: '#0E262B', marginBottom: 8 },
  emptySubtitle: { fontFamily: FONTS.NUNITO_SEMIBOLD, fontSize: 14, color: '#9B9B9B', textAlign: 'center' },
  list: { gap: 16 * scale },
});
