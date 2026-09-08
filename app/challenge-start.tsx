/**
 * "Starting in N" countdown. Companion/Scout count down locally from mount.
 * Online races (wired in a later step) will pass startedAtMs so every
 * device hits zero on the same wall-clock instant.
 */
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvatarStack, type AvatarStackMember } from '@/components/challenge/AvatarStack';
import { getPendingChallengeRun } from '@/lib/challengeRuntime';
import { getCompanionSessionSnapshot } from '@/lib/challengeCompanionSession';
import { CHALLENGE_COUNTDOWN_SECONDS } from '@/lib/challengeTimerSettings';
import { Radius, Spacing, StaticColors, Typography, useTheme } from '@/theme/tokens';

const COUNT_FROM = CHALLENGE_COUNTDOWN_SECONDS;

function initialParticipants(): AvatarStackMember[] {
  const pending = getPendingChallengeRun();
  if (!pending?.isCompanion) return [];
  return getCompanionSessionSnapshot().players.map((p) => ({
    id: p.deviceId,
    name: p.displayName ?? 'Player',
  }));
}

export default function ChallengeStartScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pending = getPendingChallengeRun();

  const startTargetMs =
    pending?.startedAtMs != null
      ? pending.startedAtMs + COUNT_FROM * 1000
      : null;

  const [count, setCount] = useState(() =>
    startTargetMs !== null ? Math.max(0, Math.ceil((startTargetMs - Date.now()) / 1000)) : COUNT_FROM,
  );
  const [participants] = useState<AvatarStackMember[]>(initialParticipants);

  const proceed = () => {
    if (pending) {
      router.replace('/challenge-run');
      return;
    }
    router.back();
  };

  useEffect(() => {
    if (startTargetMs === null) return undefined;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const remaining = Math.max(0, Math.ceil((startTargetMs - Date.now()) / 1000));
      setCount(remaining);
      if (remaining <= 0) {
        cancelled = true;
        proceed();
      }
    };
    tick();
    const interval = setInterval(tick, 200);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTargetMs]);

  useEffect(() => {
    if (startTargetMs !== null) return undefined;
    if (count <= 0) {
      proceed();
      return undefined;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const title = pending?.curriculumTitle ?? 'Challenge';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg }}>
        <Text style={[Typography.headlineXl, { color: colors.onSurfaceVariant }]}>Starting in</Text>
        <Text style={[Typography.displayLg, { color: StaticColors.timerOrange, fontSize: 88, lineHeight: 96 }]}>
          {String(Math.max(1, count))}
        </Text>

        <View style={{ height: Spacing.xxl }} />

        <View style={{ backgroundColor: colors.surfaceContainerHigh, borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm }}>
          <Text style={[Typography.bodyLg, { color: colors.onSurface }]} numberOfLines={1}>{title}</Text>
        </View>

        {pending?.isCompanion && (
          <AvatarStack members={participants} extraCount={0} showLabel={false} />
        )}
      </View>

      <View style={{ paddingBottom: Spacing.xl, gap: Spacing.md, alignItems: 'center', paddingHorizontal: Spacing.marginMobile }}>
        <Text style={[Typography.bodyLg, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
          Answer as many questions correctly, as fast as you can
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={[Typography.bodyMd, { color: colors.onSurface, textDecorationLine: 'underline' }]}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}
