import React from 'react';
import Svg, { Path } from 'react-native-svg';

// Official Google "G" mark brand colours — fixed by Google's brand
// guidelines, not app theme tokens, so raw hex is intentional here.
const GOOGLE_BLUE = '#4285F4';
const GOOGLE_GREEN = '#34A853';
const GOOGLE_YELLOW = '#FBBC05';
const GOOGLE_RED = '#EA4335';

/** Official 4-colour Google "G" mark. */
export function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path
        fill={GOOGLE_BLUE}
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <Path
        fill={GOOGLE_GREEN}
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />
      <Path
        fill={GOOGLE_YELLOW}
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <Path
        fill={GOOGLE_RED}
        d="M9 3.58c1.321 0 2.508.454 3.441 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </Svg>
  );
}
