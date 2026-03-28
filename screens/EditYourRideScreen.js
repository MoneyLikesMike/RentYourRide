import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useListings } from '../context/ListingsContext';
import { navigateToVehicleDetailFromRoot, navigateToListingsFromRoot } from '../utils/navigateRootStack';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;
/** 54×54 pt @ 375-wide artboard — all five edit-hub card icons. */
const EDIT_CARD_ICON_54 = 54 * scale;

const H_PAD = 20 * scale;
const GAP = 12 * scale;
const CARD_W = (SCREEN_WIDTH - 2 * H_PAD - GAP) / 2;

const EDIT_CARDS = [
  {
    key: 'details',
    label: 'DETAILS',
    icon: require('../assets/icons/investigate.png'),
    screen: 'TellUsAboutYourRideScreen1',
  },
  {
    key: 'availability',
    label: 'AVAILABILITY AND\nRESTRICTIONS',
    icon: require('../assets/icons/password2.png'),
    screen: 'AvailabilitySetupScreen',
  },
  {
    key: 'extras',
    label: 'EXTRAS',
    icon: require('../assets/icons/cleanCar.png'),
    screen: 'ExtrasSetupScreen',
  },
  {
    key: 'pricing',
    label: 'PRICING',
    icon: require('../assets/icons/price.png'),
    screen: 'PricingSetupScreen',
  },
  {
    key: 'photos',
    label: 'PHOTOS',
    icon: require('../assets/icons/photo.png'),
    screen: 'PhotoManagementScreen',
    fullWidth: false,
  },
];

export default function EditYourRideScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const listingId = route.params?.listingId;

  const { draft, listings, beginEditListing, clearEditListingSession, saveEditedListingFromDraft } = useListings();

  const lastBegunId = useRef(null);

  /** Collapse stack to this screen only (avoid Back → list-ride landing). Skip if already sole route so remount doesn’t loop. */
  useLayoutEffect(() => {
    if (!listingId) return;
    const routes = navigation.getState()?.routes ?? [];
    const sole =
      routes.length === 1 && routes[0].name === 'EditYourRideScreen';
    if (sole) return;
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'EditYourRideScreen', params: { listingId } }],
      })
    );
  }, [listingId, navigation]);

  useEffect(() => {
    if (!listingId) return;
    if (lastBegunId.current !== listingId) {
      beginEditListing(listingId);
      lastBegunId.current = listingId;
    }
  }, [listingId, beginEditListing]);

  const previewListing = useMemo(() => {
    const base = listings.find((l) => l.id === listingId);
    if (!base) return null;
    return { ...base, ...draft, id: base.id };
  }, [listings, listingId, draft]);

  const openSection = (card) => {
    if (card.screen === 'PhotoManagementScreen') {
      navigation.navigate('PhotoManagementScreen', {
        photos: draft.photos ?? [],
      });
      return;
    }
    navigation.navigate(card.screen);
  };

  const handleBack = () => {
    clearEditListingSession();
    navigation.goBack();
  };

  const handleSave = () => {
    saveEditedListingFromDraft();
    navigateToListingsFromRoot(navigation);
  };

  const handlePreview = () => {
    if (previewListing) {
      navigateToVehicleDetailFromRoot(navigation, previewListing);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={12}>
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path
              d="M31 8L17 24L31 40"
              stroke={COLORS.YELLOWISH_ORANGE}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>EDIT YOUR RIDE</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hubBlock}>
          <View style={styles.grid}>
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.card}
                onPress={() => openSection(EDIT_CARDS[0])}
                activeOpacity={0.88}
              >
                <Image
                  source={EDIT_CARDS[0].icon}
                  style={[styles.cardIcon, { width: EDIT_CARD_ICON_54, height: EDIT_CARD_ICON_54 }]}
                  resizeMode="contain"
                />
                <Text style={styles.cardLabel}>{EDIT_CARDS[0].label}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.card}
                onPress={() => openSection(EDIT_CARDS[1])}
                activeOpacity={0.88}
              >
                <Image
                  source={EDIT_CARDS[1].icon}
                  style={[styles.cardIcon, { width: EDIT_CARD_ICON_54, height: EDIT_CARD_ICON_54 }]}
                  resizeMode="contain"
                />
                <Text style={styles.cardLabel}>{EDIT_CARDS[1].label}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.card}
                onPress={() => openSection(EDIT_CARDS[2])}
                activeOpacity={0.88}
              >
                <Image
                  source={EDIT_CARDS[2].icon}
                  style={[styles.cardIcon, { width: EDIT_CARD_ICON_54, height: EDIT_CARD_ICON_54 }]}
                  resizeMode="contain"
                />
                <Text style={styles.cardLabel}>{EDIT_CARDS[2].label}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.card}
                onPress={() => openSection(EDIT_CARDS[3])}
                activeOpacity={0.88}
              >
                <Image
                  source={EDIT_CARDS[3].icon}
                  style={[styles.cardIcon, { width: EDIT_CARD_ICON_54, height: EDIT_CARD_ICON_54 }]}
                  resizeMode="contain"
                />
                <Text style={styles.cardLabel}>{EDIT_CARDS[3].label}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.photosRow}>
              <TouchableOpacity
                style={[styles.card, styles.cardPhotos]}
                onPress={() => openSection(EDIT_CARDS[4])}
                activeOpacity={0.88}
              >
                <Image
                  source={EDIT_CARDS[4].icon}
                  style={[styles.cardIcon, { width: EDIT_CARD_ICON_54, height: EDIT_CARD_ICON_54 }]}
                  resizeMode="contain"
                />
                <Text style={styles.cardLabel}>{EDIT_CARDS[4].label}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity onPress={handlePreview} style={styles.previewBtn} activeOpacity={0.7}>
            <Text style={styles.previewText}>Preview</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 24 + insets.bottom }]}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.88}>
          <Text style={styles.saveBtnText}>SAVE CHANGES</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16 * scale,
    paddingVertical: 12 * scale,
  },
  backBtn: {
    width: 40 * scale,
  },
  headerTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: H_PAD,
  },
  hubBlock: {
    width: '100%',
  },
  grid: {
    gap: GAP,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
  },
  photosRow: {
    alignItems: 'center',
  },
  card: {
    width: CARD_W,
    minHeight: 140 * scale,
    backgroundColor: '#fff',
    borderRadius: 12 * scale,
    paddingVertical: 16 * scale,
    paddingHorizontal: 10 * scale,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  cardPhotos: {
    marginTop: 0,
  },
  cardIcon: {
    width: 56 * scale,
    height: 56 * scale,
    marginBottom: 10 * scale,
  },
  cardLabel: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 11 * scale,
    color: 'rgb(120,120,120)',
    textAlign: 'center',
    letterSpacing: 0.4,
    lineHeight: 15 * scale,
  },
  previewBtn: {
    alignSelf: 'center',
    marginTop: 28 * scale,
    paddingVertical: 8,
  },
  previewText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16 * scale,
    color: COLORS.MANGO_TWO,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: H_PAD,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: 12 * scale,
  },
  saveBtn: {
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 999,
    paddingVertical: 16 * scale,
    alignItems: 'center',
  },
  saveBtnText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    color: '#fff',
    letterSpacing: 0.5,
  },
});
