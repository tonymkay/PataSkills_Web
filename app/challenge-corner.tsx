/**
 * Challenge Corner — static 4-row menu (Add / Online / Offline / Tournaments).
 * No Live row. Online/Create/Tournament routes land in later steps; Offline
 * is fully wired now.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus, Globe, WifiOff, Trophy, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HomeBottomGlow } from '@/constants/gradients';
import { IconSize, Radius, Spacing, StaticColors, Typography, useTheme } from '@/theme/tokens';

type MenuRowSpec = {
  key: string;
  Icon: typeof Globe;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string | React.ReactNode;
  onPress: () => void;
};

function WinnerRewardSubtext({ rewardKeys }: { rewardKeys: number }) {
  const { colors } = useTheme();
  return (
    <Text style={[Typography.bodySm, { color: colors.onSurfaceVariant }]}>
      Win{' '}
      <Text style={[Typography.bodySm, { color: colors.warningOrange }]}>
        {`upto ${rewardKeys} ${rewardKeys === 1 ? 'key' : 'keys'}`}
      </Text>
      {' '}per challenge
    </Text>
  );
}

function MenuRow({ Icon, iconBg, iconColor, title, subtitle, onPress, trailing }: {
  Icon: typeof Globe;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string | React.ReactNode;
  onPress: () => void;
  trailing: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md }}
    >
      <View style={{
        width: 52, height: 52, borderRadius: Radius.full,
        backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={24} color={iconColor} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[Typography.bodyLg, { color: colors.onSurface }]}>{title}</Text>
        {typeof subtitle === 'string' ? (
          <Text style={[Typography.bodySm, { color: colors.onSurfaceVariant }]}>{subtitle}</Text>
        ) : (
          subtitle
        )}
      </View>
      {trailing}
    </Pressable>
  );
}

export default function ChallengeCornerScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const accent = colors.tealAccent;

  const rows: MenuRowSpec[] = [
    {
      key: 'add',
      Icon: Plus,
      iconBg: accent,
      iconColor: colors.white,
      title: 'Add',
      subtitle: 'Create a new challenge',
      onPress: () => router.push('/challenge-create'),
    },
    {
      key: 'online',
      Icon: Globe,
      iconBg: StaticColors.selection.activeBorder,
      iconColor: colors.white,
      title: 'Online Challenge',
      subtitle: <WinnerRewardSubtext rewardKeys={5} />,
      onPress: () => router.push('/challenge-online'),
    },
    {
      key: 'offline',
      Icon: WifiOff,
      iconBg: colors.actionBlue,
      iconColor: colors.white,
      title: 'Offline Challenge',
      subtitle: <WinnerRewardSubtext rewardKeys={3} />,
      onPress: () => router.push('/challenge-offline'),
    },
    {
      key: 'tournament',
      Icon: Trophy,
      iconBg: StaticColors.timerOrange,
      iconColor: colors.white,
      title: 'Tournaments',
      subtitle: <WinnerRewardSubtext rewardKeys={5} />,
      onPress: () => router.push('/challenge-tournament'),
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%' }}>
        <LinearGradient
          colors={HomeBottomGlow.colors}
          start={HomeBottomGlow.start}
          end={HomeBottomGlow.end}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.marginMobile, paddingVertical: Spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ChevronLeft size={IconSize.header} color={colors.onSurface} strokeWidth={2.5} />
        </Pressable>
        <Text style={[Typography.headlineMd, { color: colors.onSurface, flex: 1 }]} numberOfLines={1}>
          Challenge Corner
        </Text>
      </View>

      <View style={{ flex: 1, paddingHorizontal: Spacing.marginMobile, paddingTop: Spacing.sm, paddingBottom: insets.bottom + Spacing.lg }}>
        {rows.map((row) => (
          <MenuRow
            key={row.key}
            Icon={row.Icon}
            iconBg={row.iconBg}
            iconColor={row.iconColor}
            title={row.title}
            subtitle={row.subtitle}
            onPress={row.onPress}
            trailing={
              row.key === 'add' ? (
                <Plus size={22} color={accent} strokeWidth={2.5} />
              ) : (
                <ChevronRight size={22} color={colors.onSurfaceVariant} strokeWidth={2} />
              )
            }
          />
        ))}
      </View>
    </View>
  );
}
