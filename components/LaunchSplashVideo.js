import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform, StatusBar as RNStatusBar, Image } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

/** Brief pause after the video ends before transitioning to the app. */
const END_DELAY_MS = 150;
const SPLASH_BG = '#DFF2F1';
const FALLBACK_LOGO = require('../assets/logo/ryrLogoNew.png');

let Video = null;
let ResizeMode = null;
let videoModuleFailed = false;
try {
  // Lazy-ish bind: still evaluated when this file loads, but catch native link failures.
  const av = require('expo-av');
  Video = av.Video;
  ResizeMode = av.ResizeMode;
} catch (e) {
  videoModuleFailed = true;
  console.warn('[LaunchSplash] expo-av unavailable', e?.message || e);
}

const LAUNCH_VIDEO = !videoModuleFailed
  ? require('../assets/splash/ryr_launch_animation.mp4')
  : null;

export default function LaunchSplashVideo({ appReady, onFinish }) {
  const [videoEnded, setVideoEnded] = useState(videoModuleFailed || !Video);
  const [useFallback, setUseFallback] = useState(videoModuleFailed || !Video);
  const finishedRef = useRef(false);
  const videoRef = useRef(null);

  useEffect(() => {
    RNStatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      RNStatusBar.setTranslucent(true);
      RNStatusBar.setBackgroundColor(SPLASH_BG);
    }
  }, []);

  const finish = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    try {
      await SplashScreen.hideAsync();
    } catch (_) {
      /* ignore */
    }
    onFinish?.();
  }, [onFinish]);

  useEffect(() => {
    if (!appReady || !videoEnded) return;
    const timer = setTimeout(finish, END_DELAY_MS);
    return () => clearTimeout(timer);
  }, [appReady, videoEnded, finish]);

  // Hard cap so a stuck AVPlayer cannot leave the user on splash forever / crash mid-decode.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setVideoEnded(true);
    }, useFallback ? 1200 : 6000);
    return () => clearTimeout(timeout);
  }, [useFallback]);

  const handlePlaybackStatusUpdate = useCallback((status) => {
    if (!status) return;
    if (status.error) {
      console.warn('[LaunchSplash] playback error', status.error);
      setUseFallback(true);
      setVideoEnded(true);
      return;
    }
    if (!status.isLoaded) return;
    if (status.didJustFinish) {
      setVideoEnded(true);
    }
  }, []);

  const handleReadyForDisplay = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
    // Prefer muted autoplay — unmuted AVPlayer without an audio session has crashed TF builds.
    videoRef.current?.playAsync?.().catch(() => {
      setUseFallback(true);
      setVideoEnded(true);
    });
  }, []);

  const handleVideoError = useCallback(() => {
    setUseFallback(true);
    setVideoEnded(true);
  }, []);

  return (
    <View style={styles.container} pointerEvents="auto">
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      {useFallback || !Video ? (
        <View style={styles.fallback}>
          <Image source={FALLBACK_LOGO} style={styles.logo} resizeMode="contain" />
        </View>
      ) : (
        <Video
          ref={videoRef}
          style={styles.video}
          source={LAUNCH_VIDEO}
          resizeMode={ResizeMode?.CONTAIN ?? 'contain'}
          shouldPlay
          isLooping={false}
          isMuted
          volume={0}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onReadyForDisplay={handleReadyForDisplay}
          onError={handleVideoError}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SPLASH_BG,
  },
  video: {
    flex: 1,
    backgroundColor: SPLASH_BG,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SPLASH_BG,
  },
  logo: {
    width: 180,
    height: 180,
  },
});
