import { Dimensions, Platform } from 'react-native';

/**
 * Web renders in an arbitrary-width browser window; the app is capped to a
 * phone-like column (see app/_layout.tsx) so it doesn't stretch full-bleed
 * on desktop. Anything that measures window width for layout math (card
 * widths, sheet heights, etc.) must clamp against this same value on web,
 * or it'll size itself to the real browser window instead of the frame.
 */
export const WEB_MAX_WIDTH = 430;

const { width: RAW_WINDOW_WIDTH, height: RAW_WINDOW_HEIGHT } = Dimensions.get('window');

export const SCREEN_WIDTH =
  Platform.OS === 'web' ? Math.min(RAW_WINDOW_WIDTH, WEB_MAX_WIDTH) : RAW_WINDOW_WIDTH;

// Height isn't clamped by the frame (it's height: 100vh, full viewport height),
// so RAW_WINDOW_HEIGHT is correct as-is on web too.
export const SCREEN_HEIGHT = RAW_WINDOW_HEIGHT;
