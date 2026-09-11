/**
 * Tournament Room — waiting room for a single tournament stage.
 * Port of pataskillsv2's tournament-room concept, built to mirror Play's
 * challenge-scout-room.tsx conventions exactly:
 *   • GlobePulse replaced with TrophyPulse (same animation, Trophy icon)
 *   • Scout join reveal via challengeScoutTournamentSession.getMyStagePool()
 *   • Auto-handoff to challenge-start via setPendingChallengeRun
 *   • Online path uses getTournamentStageState poll
 *   • BottomBannerAd at bottom
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Trophy } from 'lucide-react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { BottomBannerAd } from '@/components/ads/BottomBannerAd';
import { Avatar } from '@/components/profile/Avatar';
import { makeRaceSeed } from '@/lib/challengeQuestions';
import { setPendingChallengeRun } from '@/lib/challengeRuntime';
import {
  isLocalTournamentId,
  getMyStagePool,
  getLocalTournamentState,
} from '@/lib/challengeScoutTournamentSession';
import {
  initScoutSession,
  getScoutSessionSnapshot,
  stopScoutSession,
  subscribeScoutSession,
} from '@/lib/challengeScoutSession';
import {
  getTournamentStageState,
  advanceTournamentStage,
  type TournamentStageState,
} from '@/lib/tournaments';
import { IconSize, Spacing, StaticColors, Typography, useTheme } from '@/theme/tokens';
import type { CurriculumSlug } from '@/constants/curriculumAssets';

const GREEN = StaticColors.selection.activeBorder;

function TrophyPulse() {
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
      <Animated.View style={[{ position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 1.5, borderColor: GREEN }, ring1Style]} />
      <Animated.View style={[{ position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 1.5, borderColor: GREEN }, ring2Style]} />
      <View
        style={{
          width: 100, height: 100, borderRadius: 50,
          backgroundColor: colors.surfaceContainerHigh,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 1, borderColor: colors.outlineVariant, zIndex: 10,
        }}
      >
        <Trophy size={36} color={GREEN} strokeWidth={2.2} />
      </View>
    </View>
  );
}

const START_BUFFER_MS = 1400;

export default function ChallengeTournamentRoom() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    tournamentId?: string;
    stage?: string;
    slug?: string;
  }>();

  const tournamentId = params.tournamentId ?? '';
  const isLocal = isLocalTournamentId(tournamentId);

  const [loading, setLoading] = useState(true);
  const [topicTitle, setTopicTitle] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [totalRoster, setTotalRoster] = useState(0);
  const [, forceTick] = useState(0);
  const proceededRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  // Subscribe to scout session changes for re-render
  useEffect(() => subscribeScoutSession(() => forceTick((n) => n + 1)), []);

  // ── Local (offline) path ──
  useEffect(() => {
    if (!isLocal) return;
    let active = true;
    (async () => {
      setLoading(true);
      const pool = getMyStagePool();
      const tournamentState = getLocalTournamentState();
      if (!pool || !tournamentState || !active) {
        if (active) { setLoading(false); router.back(); }
        return;
      }
      setTopicTitle(tournamentState.topicTitle || null);
      setTotalRoster(1 + pool.scouts.length); // human + scouts

      const slug = tournamentState.curriculumSlug as CurriculumSlug;
      // Each stage races fresh over the whole curriculum — the tournament's
      // topicTitle (above) is fixed at creation purely for display; there's
      // no per-stage topic index to scope to, so topicIndex stays null.
      const seed = makeRaceSeed();
      const questionCount = 10;

      // Init scout session for the race
      await initScoutSession(pool.scouts[0], 'You', questionCount, pool.scouts.slice(1));
      if (!active) return;
      setLoading(false);

      // Trickle-reveal scouts
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

      // Auto-proceed to challenge-start
      const handoffTimer = setTimeout(() => {
        if (!active || proceededRef.current) return;
        proceededRef.current = true;
        setPendingChallengeRun({
          isScout: true,
          tournamentId,
          tournamentStage: tournamentState.currentStage,
          curriculumSlug: slug,
          curriculumTitle: tournamentState.curriculumTitle,
          questions: [],
          seed,
          questionCount,
          topicIndex: null,
          origin: 'challenge-corner',
          difficulty: 'medium',
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
  }, [isLocal, tournamentId]);

  // ── Online path — poll tournament stage state ──
  useEffect(() => {
    if (isLocal || !tournamentId) return;
    let active = true;
    let pollTimer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const state = await getTournamentStageState(tournamentId);
        if (!active || !state) return;
        setTopicTitle(null); // online doesn't expose topic title in stage state
        // Was state.memberDeviceIds.length — the same array revealedPlayers
        // is built from, which made "revealedPlayers.length >= totalRoster"
        // trivially true on the very first poll (comparing a set against
        // its own length) regardless of how many players had actually
        // joined. targetSize is the real pool capacity the stage is
        // waiting to fill — same joinedCount/targetSize pattern Global
        // Challenge already uses correctly.
        setTotalRoster(state.targetSize);
        setRevealedIds(new Set(state.memberDeviceIds));
        setLoading(false);

        // If the stage challenge is already running, proceed
        if (state.status === 'running' && !proceededRef.current) {
          proceededRef.current = true;
          // For online tournaments, we need the stage's challenge ID
          // The actual question set is fetched by challenge-start from the server
          router.replace({
            pathname: '/challenge-start' as any,
            params: { challengeId: state.challengeId, tournamentId },
          });
          return;
        }
      } catch { /* silent */ }
      if (active) pollTimer = setTimeout(poll, 3000);
    };

    void poll();
    return () => {
      active = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocal, tournamentId]);

  const onBack = () => {
    clearTimers();
    if (!proceededRef.current) stopScoutSession();
    router.back();
  };

  // Revealed players from scout session (local) or from poll (online)
  const session = getScoutSessionSnapshot();
  const revealedPlayers = isLocal
    ? session.players.filter(
        (p) => p.deviceId === session.deviceId || revealedIds.has(p.deviceId),
      )
    : Array.from(revealedIds).map((id) => ({
        deviceId: id,
        displayName: null as string | null,
        isCreator: false,
      }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.gutter, paddingHorizontal: Spacing.marginMobile, paddingVertical: Spacing.sm }}>
        <Pressable onPress={onBack} hitSlop={10}>
          <ArrowLeft size={IconSize.header} color={colors.onSurface} strokeWidth={2} />
        </Pressable>
        <Text style={[Typography.headlineSm, { color: colors.onSurface, flex: 1 }]}>Tournament Stage</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.xxl, paddingHorizontal: Spacing.marginMobile, paddingBottom: Spacing.xxl }}>
          <View style={{ alignItems: 'center', gap: Spacing.sm }}>
            <TrophyPulse />
            {topicTitle ? (
              <Text style={[Typography.headlineSm, { color: colors.onSurface, fontWeight: 'bold', marginTop: Spacing.md, textAlign: 'center' }]}>
                {topicTitle}
              </Text>
            ) : null}
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
                const isYou = isLocal && p.deviceId === session.deviceId;
                let ringColor = colors.outlineVariant;
                if (isYou) ringColor = StaticColors.selection.youRing;
                else if ('isCreator' in p && p.isCreator) ringColor = GREEN;
                return (
                  <View key={p.deviceId} style={{
                    marginLeft: idx === 0 ? 0 : -14, zIndex: 10 - idx, borderWidth: 2.5,
                    borderColor: colors.background, borderRadius: 32,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <View style={{ borderWidth: 2, borderColor: ringColor, borderRadius: 28, padding: 2 }}>
                      <Avatar name={p.displayName ?? ''} size={48} imageUrl={null} />
                    </View>
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
