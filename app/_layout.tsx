import { useCallback, useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fontAssets } from '@/constants/typography';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Web sizing (phone-width cap, full viewport height, no letterboxing on
// mobile) lives in app/+html.tsx as plain CSS on #root. Nothing web-specific
// belongs here — this component is identical on native and web, with one
// exception: on web, the actual font files are already declared as real
// @font-face rules in +html.tsx (present from the first byte of HTML), so
// asking expo-font to fetch them again here would just be a second, later,
// JS-driven fetch of files the browser may already have — pure downside,
// no upside. Passing an empty map keeps the hook (and the splash-hide
// logic below) working identically, just with nothing left for it to do.
function RootLayoutInner() {
  const { colors } = useTheme();
  const [fontsLoaded] = useFonts(Platform.OS === 'web' ? {} : fontAssets);

  const onLayout = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    onLayout();
  }, [onLayout]);

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
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
