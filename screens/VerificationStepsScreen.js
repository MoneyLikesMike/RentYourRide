import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useAccountSetupSteps } from '../hooks/useAccountSetupSteps';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;

function CheckIcon() {
  return (
    <Svg width={20 * scale} height={20 * scale} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke={COLORS.YELLOWISH_ORANGE}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ArrowIcon() {
  return (
    <Svg width={15 * scale} height={15 * scale} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6l6 6-6 6"
        stroke={COLORS.GREENY_BLUE_TWO}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function StepRow({ title, done, onPress, disabled }) {
  if (done) {
    return (
      <View style={styles.stepRow}>
        <Text style={styles.stepTitle}>{title}</Text>
        <CheckIcon />
      </View>
    );
  }
  return (
    <TouchableOpacity
      style={styles.stepRow}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Text style={styles.stepTitle}>{title}</Text>
      <ArrowIcon />
    </TouchableOpacity>
  );
}

export default function VerificationStepsScreen({ navigation }) {
  const { incomplete, pending, verified } = useAccountSetupSteps();

  const openStep = (step) => {
    if (!step?.screen) return;
    navigation.navigate(step.screen, step.params);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
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
          <Text style={styles.headerText}>VERIFICATION STEPS</Text>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {incomplete.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What's Left</Text>
            {incomplete.map((step) => (
              <StepRow
                key={step.id}
                title={step.title}
                done={false}
                onPress={() => openStep(step)}
              />
            ))}
          </View>
        ) : null}

        {pending.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending</Text>
            {pending.map((step) => (
              <Text key={step.id} style={styles.pendingText}>
                {step.title}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Done</Text>
          {verified.map((step) => (
            <StepRow key={step.id} title={step.title} done />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16 * scale,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 12 * scale,
  },
  backButton: {
    marginRight: 8,
  },
  headerTextFlexWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  headerRightSpacer: {
    width: 31,
  },
  headerText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.2,
  },
  scrollContent: {
    paddingHorizontal: 20 * scale,
    paddingBottom: 40 * scale,
  },
  section: {
    marginBottom: 32 * scale,
  },
  sectionTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 18 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    marginBottom: 10 * scale,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12 * scale,
    borderBottomWidth: 1,
    borderBottomColor: 'rgb(235,235,235)',
  },
  stepTitle: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: '#222',
    flex: 1,
    paddingRight: 12 * scale,
  },
  pendingText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: '#666',
    paddingVertical: 10 * scale,
    borderBottomWidth: 1,
    borderBottomColor: 'rgb(235,235,235)',
  },
});
