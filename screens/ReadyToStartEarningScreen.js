import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useListings } from '../context/ListingsContext';
import { useAuth } from '../context/AuthContext';
import * as listingsApi from '../services/listingsApi';
import {
  buildListingAvailabilityPatch,
  calendarDataToApiRanges,
} from '../utils/listingAvailability';
import { draftToListingBody } from '../utils/listingDraftPayload';
import { syncListingPhotos } from '../utils/listingPhotos';
import { isRemoteListingId } from '../utils/listingId';

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375;

const ReadyToStartEarningScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { draft, addListing, clearDraft, mergeRemoteListings } = useListings();
  const { isAuthenticated, isReady } = useAuth();
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleListMyRide = async () => {
    if (!termsAccepted) return;
    const city = draft?.city ?? 'Winnipeg';
    const pricePerDay =
      typeof draft?.pricePerDay === 'number' ? draft.pricePerDay : Number(draft?.pricePerDay) || 0;

    if (isAuthenticated && isReady) {
      try {
        const availFields = buildListingAvailabilityPatch({
          advanceNotice: draft?.advanceNotice,
          shortestTrip: draft?.shortestTrip,
          longestTrip: draft?.longestTrip,
          dailyKm: draft?.dailyKm,
          existingExtras: draft?.extras,
        });
        const blockedRanges =
          draft?.availability?.length > 0
            ? draft.availability
            : calendarDataToApiRanges(draft?.calendarData);
        const publishDraft = {
          ...draft,
          city,
          pricePerDay: pricePerDay || 40,
          dailyKm: availFields.dailyKm,
          instantBooking: availFields.instantBooking,
          extras: availFields.extras,
          availability: blockedRanges,
        };
        const existingId =
          draft?.serverListingId && isRemoteListingId(draft.serverListingId)
            ? draft.serverListingId
            : null;
        let listingId = existingId;
        let row = null;
        if (listingId) {
          await syncListingPhotos(listingId, publishDraft.photos ?? []);
          row = await listingsApi.hostPatchListing(listingId, draftToListingBody(publishDraft));
          if (blockedRanges?.length) {
            await listingsApi.hostListingAvailability(listingId, blockedRanges);
          }
        } else {
          row = await listingsApi.hostCreateListing(draftToListingBody(publishDraft));
          listingId = row?.id;
          if (listingId && publishDraft.photos?.length) {
            await syncListingPhotos(listingId, publishDraft.photos);
          }
        }
        if (listingId) {
          const published = await listingsApi.hostPublishListing(listingId);
          if (published) row = published;
        }
        if (row) mergeRemoteListings([{ ...row, owned: true, active: true, published: true }]);
        clearDraft();
        const root = navigation.getParent();
        if (root) root.navigate('MainTabs');
        return;
      } catch (e) {
        Alert.alert('Could not list ride', e?.message || 'Try again later.');
      }
    }

    addListing({
      ...draft,
      city,
      title: draft?.title || 'My vehicle',
      vehicleType: draft?.vehicleType || 'SEDAN',
      photos: draft?.photos ?? [],
      pricePerDay,
      instantBooking: Boolean(draft?.instantBooking),
      hostName: draft?.hostName || 'Moe Jackson',
      hostTrips: draft?.hostTrips ?? 52,
      hostRating: draft?.hostRating ?? 5,
    });
    clearDraft();
    const root = navigation.getParent();
    if (root) root.navigate('MainTabs');
  };

  const openTerms = () => {
    Linking.openURL('https://rentyourride.com/terms').catch(() => {});
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke="#FFB131" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconWrapper}>
          <View style={styles.iconCircle}>
            <Image source={require('../assets/icons/FinishIcon.png')} style={styles.icon} resizeMode="contain" />
          </View>
        </View>

        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <View style={styles.readyWithHighlight}>
              <Text style={styles.title}>Ready</Text>
              <View style={styles.titleUnderline} />
            </View>
            <Text style={styles.title}> to start earning?</Text>
          </View>
        </View>

        <View style={styles.bodyWrap}>
          <Text style={styles.body}>
            Congratulations! Your vehicle is ready to be listed on Rent Your Ride to start earning some extra cash!
          </Text>
        </View>

        <View style={styles.termsRow}>
          <TouchableOpacity
            style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}
            onPress={() => setTermsAccepted((v) => !v)}
            activeOpacity={0.7}
          >
            {termsAccepted ? (
              <Image source={require('../assets/icons/checkmark.png')} style={styles.checkmarkImage} />
            ) : null}
          </TouchableOpacity>
          <View style={styles.termsTextWrap}>
            <Text style={styles.termsText}>
              By listing your ride, you agree to the{' '}
              <Text style={styles.termsLink} onPress={openTerms}>
                Rent Your Ride terms of service
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.saveButtonContainer, { paddingBottom: 24 + insets.bottom }]}>
        <TouchableOpacity
          style={[styles.saveButton, !termsAccepted && styles.saveButtonDisabled]}
          onPress={handleListMyRide}
          activeOpacity={0.8}
          disabled={!termsAccepted}
        >
          <Text style={styles.saveButtonText}>List my ride</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    paddingHorizontal: 20 * scale,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20 * scale,
    paddingBottom: 100,
  },
  iconWrapper: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24 * scale,
  },
  iconCircle: {
    width: 215 * scale,
    height: 215 * scale,
    borderRadius: 107.5 * scale,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 215 * scale,
    height: 215 * scale,
  },
  titleSection: {
    alignSelf: 'center',
    marginBottom: 16 * scale,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  readyWithHighlight: {
    position: 'relative',
  },
  title: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 22,
    color: 'rgb(14, 38, 43)',
    lineHeight: 30,
  },
  titleUnderline: {
    width: 42,
    height: 13,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 177, 49, 0.3)',
    alignSelf: 'flex-start',
    marginTop: -13,
    marginLeft: -15,
  },
  body: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: 'rgb(171, 171, 171)',
    letterSpacing: -0.2,
    minHeight: 102,
    textAlign: 'left',
    lineHeight: 22,
  },
  bodyWrap: {
    width: 320,
    alignSelf: 'center',
    paddingLeft: 34 * scale, // aligns with terms text (after checkbox + gap)
    marginBottom: 20 * scale,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: 320,
    alignSelf: 'center',
    marginBottom: 28 * scale,
  },
  checkbox: {
    width: 22 * scale,
    height: 20 * scale,
    borderRadius: 11 * scale,
    borderWidth: 2 * scale,
    borderColor: 'rgb(0,180,171)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12 * scale,
    alignSelf: 'flex-start',
  },
  checkboxChecked: {
    backgroundColor: 'rgb(0,180,171)',
    borderColor: 'rgb(0,180,171)',
  },
  checkmarkImage: {
    width: 22 * scale,
    height: 20 * scale,
    resizeMode: 'contain',
  },
  termsTextWrap: {
    flex: 1,
  },
  termsText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: 'rgb(171, 171, 171)',
    letterSpacing: -0.2,
    lineHeight: 22,
    textAlign: 'left',
  },
  termsLink: {
    color: COLORS.GREENY_BLUE_TWO,
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20 * scale,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
  },
  saveButton: {
    height: 50 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D1D1',
  },
  saveButtonText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 16 * scale,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});

export default ReadyToStartEarningScreen;
