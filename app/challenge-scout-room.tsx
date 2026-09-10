import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Globe2 } from 'lucide-react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { BottomBannerAd } from '@/components/ads/BottomBannerAd';
import { Avatar } from '@/components/profile/Avatar';
import { generateScoutChallenge, type ScoutChallenge } from '@/lib/challengeScouts';
import { getScoutSessionSnapshot, initScoutSession, stopScoutSession, subscribeScoutSession } from '@/lib/challengeScoutSession';
import { buildChallengeQuestions } from '@/lib/challengeQuestions';
import { setPendingChallengeRun } from '@/lib/challengeRuntime';
import { IconSize, Spacing, StaticColors, Typography, useTheme } from '@/theme/tokens';
import type { CurriculumSlug } from '@/constants/curriculumAssets';

function GlobePulse() {
  const { colors } = useTheme();
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1800 }), -1, false);
  }, [pulse]);
  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.8, 1.8]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.4, 0]),
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.5, 1.3]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.35, 0]),
  }));
  return (
    <View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 1.5, borderColor: colors.primary }, ring1Style]} />
      <Animated.View style={[{ position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 1.5, borderColor: colors.primary }, ring2Style]} />
      <View style={{
        width: 100, height: 100, borderRadius: 50, backgroundColor: colors.surfaceContainerHigh,
        alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.outlineVariant, zIndex: 10,
      }}>
        <Globe2 size={36} color={StaticColors.selection.activeBorder} strokeWidth={2.2} />
      </View>
    </View>
  );
}

const START_BUFFER_MS = 1400;

export default function ChallengeScoutRoom() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ slug?: string; origin?: string }>();

  const [challenge, setChallenge] = useState<ScoutChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [, forceTick] = useState(0);
  const proceededRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const c = await generateScoutChallenge(params.slug as CurriculumSlug | undefined);
      if (!alive) return;
      if (!c) {
        setLoading(false);
        router.back();
        return;
      }
      setChallenge(c);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [params.slug, router]);

  useEffect(() => subscribeScoutSession(() => forceTick((n) => n + 1)), []);

  useEffect(() => {
    if (!challenge) return;
    let active = true;
    (async () => {
      const questions = await buildChallengeQuestions(
        challenge.curriculumSlug, challenge.seed, challenge.questionCount, challenge.topicIndex,
      );
      if (!active || questions.length === 0) {
        if (active) router.back();
        return;
      }
      await initScoutSession(challenge.creatorScout, 'You', questions.length, challenge.waitingScouts);
      if (!active) return;

      const { joinTimeline } = getScoutSessionSnapshot();
      let lastOffset = 0;
      joinTimeline.forEach(({ deviceId, offsetMs }) => {
        lastOffset = Math.max(lastOffset, offsetMs);
        const t = setTimeout(() => {
          if (!active) return;
          setRevealedIds((prev) => new Set(prev).add(deviceId));
        }, offsetMs);
        timersRef.current.push(t);
      });

      const handoffTimer = setTimeout(() => {
        if (!active || proceededRef.current) return;
        proceededRef.current = true;
        setPendingChallengeRun({
          isScout: true,
          curriculumSlug: challenge.curriculumSlug,
          curriculumTitle: challenge.curriculumTitle,
          questions,
          origin: params.origin === 'home' ? 'home' : 'challenge-corner',
          difficulty: challenge.difficulty,
        });
        router.replace('/challenge-start');
      }, lastOffset + START_BUFFER_MS);
      timersRef.current.push(handoffTimer);
    })();
    return () => {
      active = false;
      clearTimers();
      if (!proceededRef.current) stopScoutSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge]);

  const onBack = () => {
    clearTimers();
    if (!proceededRef.current) stopScoutSession();
    router.back();
  };

  const session = getScoutSessionSnapshot();
  const totalRoster = challenge ? 1 + 1 + challenge.waitingScouts.length : 0;
  const revealedPlayers = session.players.filter(
    (p) => p.deviceId === session.deviceId || revealedIds.has(p.deviceId),
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.gutter, paddingHorizontal: Spacing.marginMobile, paddingVertical: Spacing.sm }}>
        <Pressable onPress={onBack} hitSlop={10}>
          <ArrowLeft size={IconSize.header} color={colors.onSurface} strokeWidth={2} />
        </Pressable>
        <Text style={[Typography.headlineSm, { color: colors.onSurface, flex: 1 }]}>Global Challenge</Text>
      </View>

      {loading || !challenge ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.xxl, paddingHorizontal: Spacing.marginMobile, paddingBottom: Spacing.xxl }}>
          <View style={{ alignItems: 'center', gap: Spacing.sm }}>
            <GlobePulse />
            <Text style={[Typography.headlineSm, { color: colors.onSurface, fontWeight: 'bold', marginTop: Spacing.md, textAlign: 'center' }]}>
              {challenge.topicTitle}
            </Text>
            <Text style={[Typography.bodyMd, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
              {revealedPlayers.length >= totalRoster
                ? "Everyone's in — starting now"
                : `${revealedPlayers.length} / ${totalRoster} joined — waiting for players`}
            </Text>
          </View>
          <View style={{ alignItems: 'center', gap: Spacing.sm }}>
            <Text style={[Typography.caption, { color: colors.onSurfaceVariant, fontWeight: 'bold', letterSpacing: 0.5, textTransform: 'uppercase' }]}>Players</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xs, minHeight: 58 }}>
              {revealedPlayers.slice(0, 4).map((p, idx) => {
                const isYou = p.deviceId === session.deviceId;
                let ringColor = colors.outlineVariant;
                if (isYou) ringColor = StaticColors.selection.youRing;
                else if (p.isCreator) ringColor = StaticColors.selection.activeBorder;
                return (
                  <View key={p.deviceId} style={{
                    marginLeft: idx === 0 ? 0 : -14, zIndex: 10 - idx, borderWidth: 2.5,
                    borderColor: colors.background, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
                  }}>
                    <View style={{ borderWidth: 2, borderColor: ringColor, borderRadius: 28, padding: 2 }}>
                      <Avatar name={p.displayName} size={48} imageUrl={null} />
                    </View>
                    {p.isCreator && (
                      <View style={{ position: 'absolute', bottom: -6, backgroundColor: StaticColors.selection.activeBorder, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, zIndex: 20 }}>
                        <Text style={{ fontSize: 9, fontWeight: 'bold', color: colors.white }}>HOST</Text>
                      </View>
                    )}
                  </View>
                );
              })}
              {revealedPlayers.length > 4 && (
                <View style={{
                  marginLeft: -14, width: 58, height: 58, borderRadius: 29, borderWidth: 2.5,
                  borderColor: colors.background, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: colors.surfaceContainerHigh, zIndex: 5,
                }}>
                  <Text style={[Typography.bodyLg, { color: colors.onSurface, fontWeight: 'bold' }]}>+{revealedPlayers.length - 4}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
      <View style={{ alignItems: 'center', paddingBottom: Math.max(insets.bottom, Spacing.md) }}>
        <BottomBannerAd />
      </View>
    </View>
  );
}
