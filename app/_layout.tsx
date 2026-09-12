import { useCallback, useEffect, useState } from 'react';
import { BackHandler, Platform, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider as NavigationThemeProvider, DarkTheme as NavigationDarkTheme } from '@react-navigation/native';
import { fontAssets } from '@/constants/typography';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { initNotifications } from '@/lib/notifications';
import { configureBilling } from '@/lib/billing';
import { initAutoBackupOnReconnect } from '@/lib/backup';
import { getHasEverLoggedIn, subscribeToLogout } from '@/lib/authGate';
import { getStoredEmail } from '@/lib/email';
import { AccountGateScreen } from '@/components/auth/AccountGateScreen';

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

  // Permanent account gate check (see lib/authGate.ts). Runs once per cold
  // boot, before the Stack (and therefore every route, including deep
  // links) is allowed to render. gateChecked stays false — same as
  // !fontsLoaded — until this resolves, so there's no flash of unlocked
  // content while it's pending.
  const [gateChecked, setGateChecked] = useState(false);
  const [gated, setGated] = useState(false);
  const [lastEmail, setLastEmail] = useState('');

  const onLayout = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    onLayout();
    void initNotifications();
    void configureBilling();
    const unsubscribeAutoBackup = initAutoBackupOnReconnect();
    return unsubscribeAutoBackup;
  }, [onLayout]);

  useEffect(() => {
    (async () => {
      const [everLoggedIn, email, loggedOutPending] = await Promise.all([
        getHasEverLoggedIn(),
        getStoredEmail(),
        AsyncStorage.getItem('@play/logged_out_pending'),
      ]);
      const fallbackEmail = email || (await AsyncStorage.getItem('@play/last_logged_out_email')) || '';
      setLastEmail(fallbackEmail);
      // Gate on the explicit, durable flag (set only by logoutAccount(),
      // cleared only by a confirmed successful login) rather than solely
      // on '@play/user_email' being empty — that key alone can't be fully
      // trusted end-to-end (e.g. a lingering Supabase session getting
      // silently restored after a hard app kill). !email stays as a
      // belt-and-suspenders fallback for a device that somehow never got
      // the flag written.
      setGated(everLoggedIn && (loggedOutPending === 'true' || !email));
      setGateChecked(true);
    })();
  }, []);

  // Mid-session logout: put the gate up the instant logoutAccount() runs,
  // from anywhere in the app (Settings, etc.) — don't wait for the next
  // cold boot. See lib/authGate.ts notifyLoggedOut/subscribeToLogout.
  useEffect(() => {
    return subscribeToLogout(() => {
      AsyncStorage.getItem('@play/last_logged_out_email')
        .then((email) => setLastEmail(email || ''))
        .catch(() => {});
      setGated(true);
    });
  }, []);

  // Trap the Android hardware/gesture back button while the permanent
  // account gate is up — there is no dismiss/skip; logging back in is the
  // only way out, so back must not navigate anywhere or close the app.
  useEffect(() => {
    if (!gated) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [gated]);

  if (!fontsLoaded || !gateChecked) return null;

  if (gated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style="light" />
        <AccountGateScreen lastEmail={lastEmail} onLoggedIn={() => setGated(false)} />
      </View>
    );
  }

  // react-navigation's native-stack renders its own screen "card"
  // container underneath whatever each screen paints, and that card
  // defaults to a light background (react-navigation's DefaultTheme).
  // For an instant either side of a transition — and permanently on web,
  // where native-stack doesn't animate at all — that default shows
  // through as a white flash. The app is always dark, so this navigation
  // theme is the fix, not a per-platform toggle.
  const appBackground = colors.background || '#0B0D12';
  const navigationTheme = {
    ...NavigationDarkTheme,
    colors: {
      ...NavigationDarkTheme.colors,
      background: appBackground,
      card: appBackground,
    },
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <NavigationThemeProvider value={navigationTheme}>
        <AppErrorBoundary>
          <Stack
            screenOptions={{
              headerShown: false,
              // react-native-screens doesn't animate native-stack transitions
              // on web (screens just swap instantly), so this Stack-level
              // animation only ever does anything on iOS/Android. Web screens
              // animate themselves instead — see components/nav/ScreenTransition.
              animation: Platform.OS === 'web' ? 'none' : 'slide_from_right',
              animationDuration: 280,
            }}
          />
        </AppErrorBoundary>
      </NavigationThemeProvider>
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
