import { useCallback, useEffect, useMemo } from 'react';
import { Platform, useWindowDimensions, View, ViewStyle } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fontAssets } from '@/constants/typography';
import { PHONE_ASPECT_RATIO, WEB_MAX_HEIGHT, WEB_MAX_WIDTH } from '@/constants/layout';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Web renders in an arbitrary-width/height browser window. The app is
// locked to a phone aspect ratio and letterboxed on whichever axis is
// oversized for that ratio — capping width alone still let a short, wide
// window stretch the frame into a shape the app was never designed for
// (screens built assuming a tall phone get huge vertical gaps). Native
// (iOS/Android) is untouched — this branch never runs there.
const WEB_BACKDROP = '#0B0D12';

// '100vh' is a valid CSS value that react-native-web passes straight through,
// but RN's ViewStyle types don't know that — cast once here instead of
// littering @ts-expect-error at call sites (which mis-targets the error line
// on a multi-line inline style object anyway).
const webViewportStyle = {
  flex: 1,
  minHeight: '100vh',
  width: '100%',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: WEB_BACKDROP,
} as unknown as ViewStyle;

/** Fit a PHONE_ASPECT_RATIO box inside the given window, capped by the
 * absolute max dimensions, shrinking whichever axis needs it. */
function useWebFrameSize() {
  const { width: winW, height: winH } = useWindowDimensions();
  return useMemo(() => {
    let height = Math.min(winH, WEB_MAX_HEIGHT);
    let width = height * PHONE_ASPECT_RATIO;
    if (width > winW) {
      width = winW;
      height = width / PHONE_ASPECT_RATIO;
    }
    width = Math.min(width, WEB_MAX_WIDTH);
    return { width, height };
  }, [winW, winH]);
}

function RootLayoutInner() {
  const { colors } = useTheme();
  const [fontsLoaded] = useFonts(fontAssets);
  // Called unconditionally (rules of hooks) even though only the web
  // branch below uses the result — harmless no-op read on native.
  const webFrameSize = useWebFrameSize();

  const onLayout = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    onLayout();
  }, [onLayout]);

  if (!fontsLoaded) return null;

  const content = (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );

  if (Platform.OS !== 'web') {
    return content;
  }

  return (
    <View style={webViewportStyle}>
      <View style={{ width: webFrameSize.width, height: webFrameSize.height, overflow: 'hidden' }}>
        {content}
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider defaultMode="dark">
          <RootLayoutInner />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
