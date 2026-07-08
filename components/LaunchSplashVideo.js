import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform, StatusBar as RNStatusBar } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

const LAUNCH_VIDEO = require('../assets/splash/ryr_launch_animation.mp4');
/** Brief pause after the video ends before transitioning to the app. */
const END_DELAY_MS = 150;
const SPLASH_BG = '#DFF2F1';

export default function LaunchSplashVideo({ appReady, onFinish }) {
  const [videoEnded, setVideoEnded] = useState(false);
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

  useEffect(() => {
    const timeout = setTimeout(() => {
      setVideoEnded(true);
    }, 8000);
    return () => clearTimeout(timeout);
  }, []);

  const handlePlaybackStatusUpdate = useCallback((status) => {
    if (!status.isLoaded) return;
    if (status.didJustFinish) {
      setVideoEnded(true);
    }
  }, []);

  const handleReadyForDisplay = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
    videoRef.current?.playAsync().catch(() => {});
  }, []);

  return (
    <View style={styles.container} pointerEvents="auto">
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <Video
        ref={videoRef}
        style={styles.video}
        source={LAUNCH_VIDEO}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        isLooping={false}
        isMuted={false}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onReadyForDisplay={handleReadyForDisplay}
      />
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
});
