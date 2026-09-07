import { Tabs } from 'expo-router';
import { FloatingTabBar } from '@/components/nav/FloatingTabBar';

/**
 * The tabbed shell shown once a learner unlocks tabs (see
 * areTabsUnlocked()/unlockTabsIfNeeded() in lib/progress.ts, and the gate
 * in app/index.tsx that decides whether to redirect here at all). Route
 * names below ('home' | 'skills' | 'keys' | 'reports') must match
 * FloatingTabBar's TAB_ICONS keys and the file names in this directory.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...(props as any)} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="skills" options={{ title: 'Skills' }} />
      <Tabs.Screen name="keys" options={{ title: 'Keys' }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
    </Tabs>
  );
}
