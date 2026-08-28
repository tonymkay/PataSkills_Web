import { Dimensions, Platform } from 'react-native';

/**
 * Web renders in an arbitrary-width/height browser window; the app is
 * locked to a phone-like aspect ratio (see app/_layout.tsx) rather than
 * just capped by width. A width-only cap still lets a short, wide browser
 * window stretch content into a wide-short rectangle it was never designed
 * for (screens built assuming a tall phone end up with huge vertical gaps).
 * Locking the ratio and letterboxing whichever axis is oversized keeps the
 * app the same shape everywhere. Anything doing its own window-width layout
 * math (card widths, sheet heights) should clamp against WEB_MAX_WIDTH too,
 * or it'll size itself to the real browser window instead of the frame.
 */
export const WEB_MAX_WIDTH = 430;
export const WEB_MAX_HEIGHT = 932;
// width / height of a modern phone screen (~iPhone 15 Pro Max proportions)
export const PHONE_ASPECT_RATIO = 9 / 19.5;

const { width: RAW_WINDOW_WIDTH, height: RAW_WINDOW_HEIGHT } = Dimensions.get('window');

export const SCREEN_WIDTH =
  Platform.OS === 'web' ? Math.min(RAW_WINDOW_WIDTH, WEB_MAX_WIDTH) : RAW_WINDOW_WIDTH;

// Height isn't clamped by the frame (it's height: 100vh, full viewport height),
// so RAW_WINDOW_HEIGHT is correct as-is on web too.
export const SCREEN_HEIGHT = RAW_WINDOW_HEIGHT;
