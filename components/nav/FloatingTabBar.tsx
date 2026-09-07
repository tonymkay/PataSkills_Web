import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Home, Library, KeyRound, PieChart, type LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing, Radius, Typography, IconSize } from '@/theme/tokens';

const BAR_PADDING = 6;
const PILL_MARGIN = 4;

// Route name -> icon, matching PataSkillsV2's FloatingTabBar 1:1 in spirit
// (design borrowed from there) but built on lucide-react-native, the icon
// set the rest of `play` already uses -- V2's is @expo/vector-icons, which
// isn't a play dependency and isn't worth adding just for this.
const TAB_ICONS: Record<string, LucideIcon> = {
  home: Home,
  skills: Library,
  keys: KeyRound,
  reports: PieChart,
};

/**
 * Minimal shape of the props expo-router's <Tabs tabBar={...}> passes.
 * Typed locally (same approach V2's FloatingTabBar takes) rather than
 * pulling in @react-navigation/bottom-tabs' full types.
 */
interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    emit: (e: { type: string; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

/**
 * Floating pill tab bar -- design borrowed from PataSkillsV2's
 * FloatingTabBar: a rounded surface bar with a spring-animated active pill
 * sliding behind whichever tab is focused. Plain Pressables (no Android
 * ripple) so there's no grey-blob-on-tap artifact. Theme-aware throughout,
 * reusing the same `selectionActiveBorder`/`selectionActiveTint` tokens
 * `play` already shares with V2.
 */
export function FloatingTabBar({ state, descriptors, navigation }: TabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);

  const tabCount = state.routes.length;
  const pillWidth = barWidth > 0 ? (barWidth - BAR_PADDING * 2) / tabCount : 0;

  const pillX = useSharedValue(state.index);
  useEffect(() => {
    pillX.value = withSpring(state.index, { damping: 22, stiffness: 190, overshootClamping: true });
  }, [state.index, pillX]);
  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: BAR_PADDING + PILL_MARGIN + pillX.value * pillWidth }],
  }));

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]} pointerEvents="box-none">
      <View
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        style={[
          styles.bar,
          {
            backgroundColor: colors.surfaceContainerLowest,
            borderColor: colors.outlineVariant,
            shadowColor: colors.black,
          },
        ]}
      >
        {barWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pill,
              {
                width: pillWidth - PILL_MARGIN * 2,
                backgroundColor: colors.selectionActiveTint,
                borderColor: colors.selectionActiveBorder,
              },
              pillStyle,
            ]}
          />
        )}

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const focused = index === state.index;
          const tint = focused ? colors.selectionActiveBorder : colors.onSurfaceVariant;
          const Icon = TAB_ICONS[route.name] ?? Home;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tabBtn}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
            >
              <Icon size={IconSize.tab} color={tint} strokeWidth={2.2} />
              <Text style={[Typography.tabBarLabel, { color: tint }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.marginMobile,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: BAR_PADDING,
    paddingVertical: BAR_PADDING,
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.18, shadowRadius: 24 },
      android: { elevation: 12 },
    }),
  },
  pill: {
    position: 'absolute',
    top: BAR_PADDING,
    bottom: BAR_PADDING,
    left: 0,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    gap: Spacing.xs,
  },
});
