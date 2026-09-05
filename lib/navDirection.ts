import { Platform } from 'react-native';

// Web-only. expo-router drives navigation through the browser History API:
// router.push()/router.replace() call history.pushState (no event fires),
// while router.back() and the hardware/browser back button call
// history.back(), which fires a native 'popstate' event synchronously
// before the router re-renders the new screen. native-stack's own
// slide_from_right animation (set in app/_layout.tsx) is a no-op on web —
// react-native-screens doesn't animate native-stack transitions there — so
// each screen animates itself (see components/nav/ScreenTransition.tsx) and
// needs to know which direction it arrived from. This flag is that signal.
let poppedFlag = false;

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    poppedFlag = true;
  });
}

// Call once per screen mount (ScreenTransition does this via useState
// initializer) — reads and clears the flag so it only ever applies to the
// screen that's actually arriving right now.
export function consumeNavDirection(): 'forward' | 'backward' {
  if (Platform.OS !== 'web') return 'forward';
  const direction = poppedFlag ? 'backward' : 'forward';
  poppedFlag = false;
  return direction;
}
