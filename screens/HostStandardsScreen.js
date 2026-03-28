import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375;

const BULLETS = [
  'keeping your vehicle well maintained for your guests safety',
  'clean and fill your vehicle before a trip starts so your guest can have an amazing experience',
  'continuously update your vehicles availability through your calendar',
];

const BULLET_ROW_HEIGHTS = [57, 48, 50];

const HostStandardsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    navigation.goBack();
  };

  const handleIAgree = () => {
    navigation.navigate('ReadyToStartEarningScreen');
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
            <Image source={require('../assets/icons/award.png')} style={styles.icon} resizeMode="contain" />
          </View>
        </View>

        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <View style={styles.hostWithHighlight}>
              <Text style={styles.title}>Host</Text>
              <View style={styles.titleUnderline} />
            </View>
            <Text style={styles.title}> standards</Text>
          </View>
        </View>

        <Text style={styles.intro}>
          Rent Your Ride wants to create the best experience for both hosts and travellers. As a host you have the
          responsibility of maintaining that experience by:
        </Text>

        <View style={styles.bulletList}>
          {BULLETS.map((item, index) => (
            <View key={index} style={[styles.bulletRow, { minHeight: BULLET_ROW_HEIGHTS[index] }]}>
              <Text style={styles.bullet}>- </Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.agreeButton} onPress={handleIAgree} activeOpacity={0.8}>
          <Text style={styles.agreeButtonText}>I agree</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingBottom: 40,
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
    alignItems: 'center',
    marginBottom: 24 * scale,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'baseline',
  },
  hostWithHighlight: {
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
    alignSelf: 'center',
    marginTop: -13,
    marginLeft: -30,
  },
  intro: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: 'rgb(171, 171, 171)',
    letterSpacing: -0.2,
    width: 320,
    minHeight: 102,
    textAlign: 'left',
    alignSelf: 'center',
    lineHeight: 22,
    marginBottom: 8 * scale,
  },
  bulletList: {
    marginBottom: 32 * scale,
  },
  bulletRow: {
    flexDirection: 'row',
    width: 320,
    minHeight: 57,
    alignSelf: 'center',
    marginBottom: 12 * scale,
    paddingRight: 8,
  },
  bullet: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: 'rgb(171, 171, 171)',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: 'rgb(171, 171, 171)',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  agreeButton: {
    height: 50 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20 * scale,
  },
  agreeButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16,
    color: 'rgb(247, 247, 247)',
    letterSpacing: 0.2,
    width: 51,
    height: 22,
    lineHeight: 22,
    textAlign: 'center',
  },
});

export default HostStandardsScreen;
