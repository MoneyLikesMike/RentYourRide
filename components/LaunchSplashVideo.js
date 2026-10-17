import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform, StatusBar as RNStatusBar, Image } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

/** Brief pause after the intro ends before transitioning to the app. */
const END_DELAY_MS = 150;
const SPLASH_BG = '#DFF2F1';
const FALLBACK_LOGO = require('../assets/logo/ryrLogoNew.png');

/**
 * Tagline finishes typing by ~3.55–3.65 s in the source animation.
 * Exit as soon as that point is reached (or the trimmed file ends) — no ~2 s still hold.
 */
const TAGLINE_DONE_MS = 3650;
/** Stuck-player / decode hang safety net (~3.75 s video + buffer). */
const HARD_CAP_MS = 4500;
/** Static logo fallback when AV fails — keep brief (ticket: ~1–1.5 s). */
const FALLBACK_CAP_MS = 1400;

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
  const endedRef = useRef(videoModuleFailed || !Video);

  const markEnded = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    videoRef.current?.pauseAsync?.().catch(() => {});
    setVideoEnded(true);
  }, []);

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
      markEnded();
    }, useFallback ? FALLBACK_CAP_MS : HARD_CAP_MS);
    return () => clearTimeout(timeout);
  }, [useFallback, markEnded]);

  const handlePlaybackStatusUpdate = useCallback(
    (status) => {
      if (!status) return;
      if (status.error) {
        console.warn('[LaunchSplash] playback error', status.error);
        setUseFallback(true);
        markEnded();
        return;
      }
      if (!status.isLoaded) return;
      // End once the tagline is fully typed — do not wait out a trailing still hold.
      if (
        status.didJustFinish ||
        (typeof status.positionMillis === 'number' &&
          status.positionMillis >= TAGLINE_DONE_MS)
      ) {
        markEnded();
      }
    },
    [markEnded],
  );

  const handleReadyForDisplay = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
    // Prefer muted autoplay — unmuted AVPlayer without an audio session has crashed TF builds.
    videoRef.current?.playAsync?.().catch(() => {
      setUseFallback(true);
      markEnded();
    });
  }, [markEnded]);

  const handleVideoError = useCallback(() => {
    setUseFallback(true);
    markEnded();
  }, [markEnded]);

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
