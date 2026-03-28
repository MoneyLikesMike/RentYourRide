import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { COLORS } from '../constants/colors';
import Svg, { Path } from 'react-native-svg';

export default function GetPaidStep2Screen({ navigation }) {
  const [aboutYou, setAboutYou] = useState('');
  const [touched, setTouched] = useState(false);

  function isFormValid() {
    if (!aboutYou.trim()) return false;
    return true;
  }

  function isValidEmail(email) {
    // Simple email regex
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ErrorRow component for error message only
  function ErrorRow({ message }) {
    return (
      <View style={{ marginBottom: 4, marginLeft: 20, width: 253 }}>
        <Text style={styles.errorText}>{message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Row: Back button and header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Svg width={23} height={23} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke={COLORS.MANGO_TWO} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <View style={styles.headerTitleWrapper}>
          <Text style={styles.topHeader}>GET PAID</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Section Header */}
        <Text style={styles.sectionHeader}>Business</Text>
        {/* Paragraph */}
        <Text style={styles.paragraph}>Tell us about your business</Text>
        {/* Progress Bar */}
        <View style={styles.progressBarRow}>
          <View style={styles.progressBarActive} />
          <View style={styles.progressBarActive} />
          <View style={styles.progressBarInactive} />
        </View>
        {/* About You Section */}
        <Text style={styles.legalNameLabel}>About You</Text>
        <TextInput
          style={[styles.input, touched && !aboutYou.trim() && styles.inputError]}
          placeholder="Tell us about yourself and your business"
          placeholderTextColor={COLORS.GRAY_PLACEHOLDER}
          value={aboutYou}
          onChangeText={setAboutYou}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        {touched && !aboutYou.trim() && <ErrorRow message="Please tell us about yourself" />}
        <Text style={styles.websiteParagraph}>
          Provide your business website instead
        </Text>
        <Text style={styles.aboutParagraph}>
          In a few sentences, describe your goods or services, your customers (e.g., during checkout, one day after a service, etc.)
        </Text>
      </ScrollView>
      <TouchableOpacity
        style={[styles.nextBtn, !isFormValid() && { opacity: 0.5 }]}
        onPress={() => {
          setTouched(true);
          if (isFormValid()) {
            navigation.navigate('GetPaidStep3Screen');
          }
        }}
        disabled={!isFormValid()}
      >
        <Text style={styles.nextBtnText}>NEXT</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingTop: 20,
    paddingBottom: 8,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    zIndex: 2,
    position: 'relative',
    marginBottom: 37, // Added spacing below header
  },
  backBtn: {
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    height: 23,
    width: 39,
    padding: 8,
    zIndex: 3,
  },
  headerTitleWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  topHeader: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.2,
    width: 71,
    height: 20,
    textAlign: 'center',
  },
  sectionHeader: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 18,
    color: 'rgb(14,38,43)',
    width: 286,
    height: 24,
    textAlign: 'center',
    marginBottom: 2,
  },
  paragraph: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: 'rgb(142,142,142)',
    width: 315,
    height: 23,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 12,
  },
  progressBarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 8,
  },
  progressBarActive: {
    width: 62,
    height: 3,
    backgroundColor: 'rgb(57,175,169)',
    borderRadius: 5,
    marginRight: 8,
  },
  progressBarInactive: {
    width: 62,
    height: 3,
    backgroundColor: 'rgb(224,224,224)',
    borderRadius: 5,
    marginRight: 8,
  },
  legalNameLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: 'rgb(80,80,80)',
    letterSpacing: -0.2,
    width: 159,
    height: 31,
    textAlign: 'left',
    marginTop: 10,
    marginBottom: 2,
    alignSelf: 'flex-start',
    paddingLeft: 2,
  },
  input: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: '#222',
    backgroundColor: 'rgba(249,249,249,0.34)',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgb(163,163,163)',
    width: 331,
    height: 120,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  inputError: {
    borderColor: 'red',
  },
  aboutParagraph: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: 'rgb(142,142,142)',
    width: 331,
    textAlign: 'left',
    marginBottom: 12,
    marginTop: 29,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  websiteParagraph: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: COLORS.GREENY_BLUE_TWO,
    width: 278,
    height: 19,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  bottomParagraph: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: 'rgb(169,169,169)',
    width: 331,
    textAlign: 'left',
    marginTop: 12,
    marginBottom: 12,
    lineHeight: 18,
    letterSpacing: 0.2,
    height: 104,
    alignSelf: 'center',
  },
  link: {
    color: COLORS.GREENY_BLUE_TWO,
    textDecorationLine: 'none',
  },
  nextBtn: {
    width: 239,
    height: 50,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  nextBtnText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: 'rgb(247,247,247)',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: 'rgb(233,128,128)',
    letterSpacing: 0.2,
    width: 253,
    height: 23,
    textAlign: 'left',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 0,
  },
}); 