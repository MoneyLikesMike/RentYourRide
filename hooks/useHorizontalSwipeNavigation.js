import { useMemo, useRef } from 'react';
import { Animated, PanResponder } from 'react-native';

/**
 * Horizontal swipe navigation that yields to vertical ScrollView gestures.
 */
export function useHorizontalSwipeNavigation({ onSwipeLeft, onSwipeRight }) {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_evt, gestureState) => {
          const { dx, dy } = gestureState;
          return Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5;
        },
        onPanResponderTerminationRequest: () => true,
        onPanResponderMove: (_evt, gestureState) => {
          translateX.setValue(gestureState.dx * 0.2);
        },
        onPanResponderRelease: (_evt, gestureState) => {
          const { dx, vx } = gestureState;
          if (dx < -50 || vx < -0.5) {
            onSwipeLeft?.();
          } else if (dx > 50 || vx > 0.5) {
            onSwipeRight?.();
          } else {
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [onSwipeLeft, onSwipeRight, translateX],
  );

  return { translateX, panHandlers: panResponder.panHandlers };
}
