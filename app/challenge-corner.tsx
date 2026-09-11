/**
 * Challenge Corner — static 4-row menu (Add / Online / Offline / Tournaments).
 * No Live row. Online/Create/Tournament routes land in later steps; Offline
 * is fully wired now.
 */
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronLeft, Plus, Globe, WifiOff, Trophy, ChevronRight, Ticket } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HomeBottomGlow } from '@/constants/gradients';
import { IconSize, Radius, Spacing, StaticColors, Typography, useTheme } from '@/theme/tokens';
import { ScreenTransition } from '@/components/nav/ScreenTransition';
import { navPush, navBack, navReplace } from '@/lib/navDirection';
import { getMyChallengeStories, type ChallengeStory } from '@/lib/challenges';

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

function formatExpiry(deadlineAt: Date | null): string {
  if (!deadlineAt) return 'Waiting for players';
  const msLeft = deadlineAt.getTime() - Date.now();
  if (msLeft <= 0) return 'Expiring soon';
  const mins = Math.round(msLeft / 60000);
  if (mins < 60) return `Expires in ${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `Expires in ${hours}h ${remMins}m` : `Expires in ${hours}h`;
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

  // Both the header arrow and the OS-level back (hardware button / gesture)
  // pop the real stack when there's history to pop — this lands on
  // whatever Home instance is already underneath, with the correct
  // native-stack "pop" animation, instead of pushing/replacing in a new
  // one. replace() is only a fallback for the rare case where this screen
  // has no history to pop (e.g. a web reload landing directly here).
  const goHome = () => {
    if (router.canGoBack()) navBack(router);
    else navReplace(router, '/(tabs)/home', 'backward');
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goHome();
      return true;
    });
    return () => sub.remove();
  }, []);

  // Own waiting challenge, if any — swaps the Add row into "Join Your
  // Challenge" and routes straight to its waiting room. Re-checked every
  // time this screen regains focus so it clears once the challenge is
  // aborted, expires, or completes.
  const [pendingChallenge, setPendingChallenge] = useState<ChallengeStory | null>(null);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getMyChallengeStories().then((stories) => {
        if (!alive) return;
        setPendingChallenge(stories.find((s) => s.isCreator && s.status === 'waiting' && !s.isTournament) ?? null);
      });
      return () => { alive = false; };
    }, []),
  );

  const rows: MenuRowSpec[] = [
    {
      key: 'add',
      Icon: Plus,
      iconBg: accent,
      iconColor: colors.white,
      title: pendingChallenge ? 'My Challenge' : 'Add',
      subtitle: pendingChallenge ? formatExpiry(pendingChallenge.deadlineAt) : 'Create a new challenge',
      onPress: () => (pendingChallenge
        ? navPush(router, { pathname: '/challenge-online' as any, params: { challengeId: pendingChallenge.challengeId, origin: 'create' } })
        : navPush(router, '/challenge-create')),
    },
    {
      key: 'join-tournament',
      Icon: Ticket,
      iconBg: colors.actionBlue,
      iconColor: colors.white,
      title: 'Join with a Code',
      subtitle: 'For a private challenge or tournament invite',
      onPress: () => navPush(router, '/challenge-tournament-join'),
    },
    {
      key: 'online',
      Icon: Globe,
      iconBg: StaticColors.selection.activeBorder,
      iconColor: colors.white,
      title: 'Online Challenge',
      subtitle: <WinnerRewardSubtext rewardKeys={5} />,
      onPress: () => navPush(router, '/challenge-online'),
    },
    {
      key: 'offline',
      Icon: WifiOff,
      iconBg: colors.actionBlue,
      iconColor: colors.white,
      title: 'Offline Challenge',
      subtitle: <WinnerRewardSubtext rewardKeys={3} />,
      onPress: () => navPush(router, '/challenge-offline'),
    },
    {
      key: 'tournament',
      Icon: Trophy,
      iconBg: StaticColors.timerOrange,
      iconColor: colors.white,
      title: 'Tournaments',
      subtitle: <WinnerRewardSubtext rewardKeys={5} />,
      // source: 'scout-local' routes this into the self-contained
      // bot-tournament system (createLocalScoutTournament) instead of the
      // online RPC path — the online path has no matchmaking at all, so a
      // tournament created from here could never have anyone else in the
      // room. The local path guarantees the field is always filled.
      onPress: () => navPush(router, { pathname: '/challenge-tournament', params: { source: 'scout-local' } }),
    },
  ];

  return (
    <ScreenTransition>
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
        <Pressable onPress={goHome} hitSlop={10}>
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
              row.key === 'add' && !pendingChallenge ? (
                <Plus size={22} color={accent} strokeWidth={2.5} />
              ) : (
                <ChevronRight size={22} color={colors.onSurfaceVariant} strokeWidth={2} />
              )
            }
          />
        ))}
      </View>
    </View>
    </ScreenTransition>
  );
}
