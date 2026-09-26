import React from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import {
  GUEST_GUIDELINE_SECTIONS,
  HOST_GUIDELINE_SECTIONS,
} from '../content/communityGuidelines';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = uiScale;

function GuidelineBlock({ section }) {
  if (section.type === 'title') {
    return <Text style={styles.title}>{section.text}</Text>;
  }
  if (section.type === 'bullet') {
    return (
      <Text style={styles.body}>
        <Text style={styles.lead}>• {section.lead}</Text>
        {section.rest}
      </Text>
    );
  }
  if (section.type === 'item') {
    return <Text style={styles.body}>{section.text}</Text>;
  }
  if (section.type === 'emphasis') {
    return <Text style={styles.lead}>{section.text}</Text>;
  }
  return <Text style={styles.body}>{section.text}</Text>;
}

export default function CommunityGuidelinesScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const kind = route?.params?.kind === 'guest' ? 'guest' : 'host';
  const sections = kind === 'guest' ? GUEST_GUIDELINE_SECTIONS : HOST_GUIDELINE_SECTIONS;
  const header = kind === 'guest' ? 'GUEST GUIDELINES' : 'HOST GUIDELINES';

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 20 * scale) + 12 * scale }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={12}>
          <Svg width={23} height={23} viewBox="0 0 48 48" fill="none">
            <Path
              d="M31 8L17 24L31 40"
              stroke={COLORS.MANGO_TWO}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
        <View style={styles.headerTextFlexWrapper}>
          <Text style={styles.headerText}>{header}</Text>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24 * scale) + 24 * scale },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section, index) => (
          <GuidelineBlock key={`${kind}-${index}`} section={section} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    width: SCREEN_WIDTH,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12 * scale,
    paddingHorizontal: 20 * scale,
    backgroundColor: '#fff',
  },
  backButton: {
    width: 39 * scale,
    alignItems: 'flex-start',
  },
  headerTextFlexWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightSpacer: {
    width: 39 * scale,
  },
  headerText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 16 * scale,
    color: 'rgb(14,38,43)',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 28 * scale,
    paddingTop: 8 * scale,
  },
  title: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 18 * scale,
    color: 'rgb(14,38,43)',
    textAlign: 'center',
    marginBottom: 15 * scale,
    marginTop: 8 * scale,
  },
  body: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: 'rgb(171,171,171)',
    marginBottom: 15 * scale,
    lineHeight: 22 * scale,
  },
  lead: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: 'rgb(14,38,43)',
    marginBottom: 15 * scale,
    lineHeight: 22 * scale,
  },
});
