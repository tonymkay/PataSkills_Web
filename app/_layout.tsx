import { useCallback, useEffect } from 'react';
import { Platform, View, ViewStyle } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fontAssets } from '@/constants/typography';
import { WEB_MAX_WIDTH } from '@/constants/layout';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Web renders in an arbitrary-width browser window; cap the app to a
// phone-like column so buttons/layout don't stretch full-bleed on desktop.
// Native (iOS/Android) is untouched — this branch never runs there.
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

const webFrameStyle = {
  width: '100%',
  maxWidth: WEB_MAX_WIDTH,
  height: '100vh',
  overflow: 'hidden',
} as unknown as ViewStyle;

function RootLayoutInner() {
  const { colors } = useTheme();
  const [fontsLoaded] = useFonts(fontAssets);

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
      <View style={webFrameStyle}>{content}</View>
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
