import { Dimensions, Platform } from 'react-native';

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

const { width, height } = Dimensions.get('window');

/**
 * Global UI scale for fixed 375pt-wide designs.
 *
 * iPhone: width / 375 (unchanged historical behavior).
 * iPad: also fit the design height — a pure width scale (~2.2x on iPad Air)
 * pushes bottom-anchored buttons off-screen on non-scrolling screens, which
 * got build 30 rejected by App Review ("no option to proceed after login").
 */
export const uiScale = Platform.isPad
  ? Math.min(width / BASE_WIDTH, height / BASE_HEIGHT)
  : width / BASE_WIDTH;
