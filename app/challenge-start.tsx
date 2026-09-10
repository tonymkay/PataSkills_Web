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
import { BouncingDots } from '@/components/feedback/DownloadingScreen';
import {
  getPendingChallengeRun,
  setPendingChallengeRunQuestions,
} from '@/lib/challengeRuntime';
import { getCompanionSessionSnapshot } from '@/lib/challengeCompanionSession';
import { buildChallengeQuestions } from '@/lib/challengeQuestions';
import { prefetchChallengeQuestions } from '@/lib/imagePrefetch';
import { CHALLENGE_COUNTDOWN_SECONDS } from '@/lib/challengeTimerSettings';
import { Radius, Spacing, StaticColors, Typography, useTheme } from '@/theme/tokens';
import type { CurriculumSlug } from '@/constants/curriculumAssets';

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
  const [pending, setPending] = useState(() => getPendingChallengeRun());
  const [prepReady, setPrepReady] = useState(() => (pending?.questions.length ?? 0) > 0);
  const [prepError, setPrepError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const startTargetMs =
    pending?.startedAtMs != null
      ? pending.startedAtMs + COUNT_FROM * 1000
      : null;

  const [count, setCount] = useState(() =>
    startTargetMs !== null ? Math.max(0, Math.ceil((startTargetMs - Date.now()) / 1000)) : COUNT_FROM,
  );
  const [participants] = useState<AvatarStackMember[]>(initialParticipants);

  // Prep the real question set + prefetch its images during the countdown
  // when the joining screen only handed off a recipe (seed/questionCount/
  // topicIndex, questions: []) — this is what turns the "Starting in 8"
  // window from pure theater into actual work. retryCount forces a rerun
  // after a failed attempt even though `pending` itself hasn't changed.
  useEffect(() => {
    if (prepReady || !pending || pending.seed === undefined) return undefined;
    let alive = true;
    (async () => {
      try {
        const questions = await buildChallengeQuestions(
          pending.curriculumSlug as CurriculumSlug,
          pending.seed!,
          pending.questionCount!,
          pending.topicIndex,
        );
        if (!alive) return;
        if (questions.length === 0) throw new Error('No questions available for this challenge.');
        await prefetchChallengeQuestions(questions, pending.curriculumSlug as CurriculumSlug);
        if (!alive) return;
        setPendingChallengeRunQuestions(questions);
        setPending(getPendingChallengeRun());
        setPrepReady(true);
      } catch (e) {
        if (alive) setPrepError(e instanceof Error ? e.message : 'Could not prepare this challenge.');
      }
    })();
    return () => { alive = false; };
  }, [pending, prepReady, retryCount]);

  const proceed = () => {
    if (pending && prepReady) {
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
        if (!prepReady) return; // hold — prep still running, don't proceed yet
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
  }, [startTargetMs, prepReady]);

  useEffect(() => {
    if (startTargetMs !== null) return undefined;
    if (count <= 0) {
      if (!prepReady) return undefined; // hold at 0 — prep still running
      proceed();
      return undefined;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, prepReady]);

  const title = pending?.curriculumTitle ?? 'Challenge';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg }}>
        {prepError ? (
          <>
            <Text style={[Typography.headlineMd, { color: colors.onSurface, textAlign: 'center' }]}>
              Couldn&apos;t start challenge
            </Text>
            <Text style={[Typography.bodyLg, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
              {prepError}
            </Text>
            <Pressable
              onPress={() => {
                setPrepError(null);
                setRetryCount((n) => n + 1);
              }}
              hitSlop={10}
            >
              <Text style={[Typography.bodyMd, { color: colors.onSurface, textDecorationLine: 'underline' }]}>
                RETRY
              </Text>
            </Pressable>
          </>
        ) : count <= 1 && !prepReady ? (
          <>
            <Text style={[Typography.headlineXl, { color: colors.onSurfaceVariant }]}>Getting ready</Text>
            <BouncingDots color={colors.tealAccent || '#2BD9C4'} />
          </>
        ) : (
          <>
            <Text style={[Typography.headlineXl, { color: colors.onSurfaceVariant }]}>Starting in</Text>
            <Text style={[Typography.displayLg, { color: StaticColors.timerOrange, fontSize: 88, lineHeight: 96 }]}>
              {String(Math.max(1, count))}
            </Text>
          </>
        )}

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
