import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Animated } from 'react-native';
import LoginScreen from './LoginScreen';
import SignUpScreen from './SignUpScreen';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useNavigation } from '@react-navigation/native';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;

export default function AuthScreen({ route }) {
  const navigation = useNavigation();
  const initialTab = route?.params?.tab === 'signup' ? 'signup' : 'login';
  const [activeTab, setActiveTab] = useState(initialTab);
  const anim = useRef(new Animated.Value(initialTab === 'signup' ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: activeTab === 'signup' ? 1 : 0,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  // Swipe animation: login (0), signup (1)
  const loginTranslate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -SCREEN_WIDTH],
  });
  const signupTranslate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_WIDTH, 0],
  });

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoStack}>
        <Image source={require('../assets/logo/ryrLogoNew.png')} style={styles.logo} resizeMode="contain" />
      </View>
      {/* Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity onPress={() => setActiveTab('login')} style={styles.toggleBtn}>
          <Text style={[styles.toggleText, activeTab === 'login' && styles.toggleTextActive]}>LOG IN</Text>
          {activeTab === 'login' && <View style={styles.toggleUnderline} />}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('signup')} style={styles.toggleBtn}>
          <Text style={[styles.toggleText, activeTab === 'signup' && styles.toggleTextActive]}>SIGN UP</Text>
          {activeTab === 'signup' && <View style={styles.toggleUnderline} />}
        </TouchableOpacity>
      </View>
      {/* Animated Content Area */}
      <View style={styles.animatedContainer}>
        <Animated.View style={[styles.animatedScreen, { transform: [{ translateX: loginTranslate }] }]}> 
          <LoginScreen isChildScreen onSwitchToSignUp={() => setActiveTab('signup')} onForgotPassword={() => navigation.navigate('ForgotPasswordScreen')} />
        </Animated.View>
        <Animated.View style={[styles.animatedScreen, { transform: [{ translateX: signupTranslate }] }]}> 
          <SignUpScreen isChildScreen />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: '#fff', paddingTop: 90 * scale },
  logoStack: {
    width: 219 * scale,
    height: 77 * scale,
    marginBottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 219 * scale,
    height: 77 * scale,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 71 * scale,
    marginBottom: 25 * scale,
  },
  toggleBtn: {
    marginHorizontal: 30 * scale,
    alignItems: 'center',
  },
  toggleText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 18 * scale,
    color: 'rgb(122,121,121)',
    opacity: 0.74,
    letterSpacing: 0.5,
    height: 24 * scale,
    textAlign: 'center',
  },
  toggleTextActive: {
    color: COLORS.YELLOWISH_ORANGE,
    fontWeight: 'bold',
  },
  toggleUnderline: {
    width: 37 * scale,
    height: 1 * scale,
    backgroundColor: COLORS.YELLOWISH_ORANGE,
    marginTop: 2 * scale,
    borderRadius: 1 * scale,
  },
  animatedContainer: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  animatedScreen: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    left: 0,
    top: 0,
  },
}); 