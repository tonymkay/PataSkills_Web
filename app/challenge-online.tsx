/**
 * Online Challenge — browse → join → wait flow for a real global challenge.
 * Search mode ONLY (no live branch — per plan, Live is removed in Play).
 * Scout gap-filler auto-injects via useChallengeSearch when no real
 * challenges appear within the injection delay window.
 *
 * A challengeId param (e.g. deep link) skips straight to the waiting room.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X, Globe2, Search, WifiOff } from 'lucide-react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, interpolate,
} from 'react-native-reanimated';
import { IconSize, Radius, Spacing, StaticColors, Typography, useTheme } from '@/theme/tokens';
import { StoryCarousel } from '@/components/challenge/StoryCarousel';
import { AvatarStack } from '@/components/challenge/AvatarStack';
import { BottomBannerAd } from '@/components/ads/BottomBannerAd';
import { useChallengeSearch } from '@/hooks/useChallengeSearch';
import { useOnline } from '@/hooks/useOnline';
import {
  getChallengeMembers, getChallengeState, getMyChallengeStories,
  leaveChallenge, subscribeToChallengeStatus,
  type ChallengeMember, type OpenGlobalChallenge,
} from '@/lib/challenges';
import { buildChallengeQuestions } from '@/lib/challengeQuestions';
import { setPendingChallengeRun } from '@/lib/challengeRuntime';
import { getCachedTitle } from '@/lib/curriculaCatalog';
import type { CurriculumSlug } from '@/constants/curriculumAssets';

type Phase = 'browsing' | 'waiting';

// ── Animated pulse components ────────────────────────────────────────────

function GlobePulse() {
  const { colors } = useTheme();
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1800 }), -1, false);
  }, [pulse]);

  const ring1 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.8, 1.8]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.4, 0]),
  }));
  const ring2 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.5, 1.3]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.35, 0]),
  }));

  return (
    <View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 1.5, borderColor: colors.primary }, ring1]} />
      <Animated.View style={[{ position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 1.5, borderColor: colors.primary }, ring2]} />
      <View style={{
        width: 100, height: 100, borderRadius: 50, backgroundColor: colors.surfaceContainerHigh,
        alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.outlineVariant, zIndex: 10,
      }}>
        <Globe2 size={36} color={StaticColors.selection.activeBorder} strokeWidth={2.2} />
      </View>
    </View>
  );
}

function SearchPulse({ color }: { color: string }) {
  const { colors } = useTheme();
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })), -1);
  }, [pulse]);
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.35]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.5, 0]),
  }));
  return (
    <View style={{ width: 88, height: 88, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: color }, ringStyle]} />
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <Search size={26} color={colors.white} strokeWidth={2} />
      </View>
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────

export default function ChallengeOnlineScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    challengeId?: string;
    slug?: string;
    origin?: string;
  }>();

  // Phase: browsing (searching for challenges) vs waiting (in a challenge room)
  const [phase, setPhase] = useState<Phase>(() => (params.challengeId ? 'waiting' : 'browsing'));
  const [activeChallengeId, setActiveChallengeId] = useState<string | undefined>(params.challengeId);

  const handleJoined = useCallback((challengeId: string, _slug: string) => {
    setActiveChallengeId(challengeId);
    setPhase('waiting');
  }, []);

  // Search hook — polls for open global challenges, injects scout gap-filler
  const collab = useChallengeSearch('challenge-corner', handleJoined);
  const searchStartedRef = useRef(false);
  const online = useOnline();

  useEffect(() => {
    if (phase !== 'browsing') return;
    if (searchStartedRef.current) return;
    searchStartedRef.current = true;
    collab.startSearching();
    return () => {
      collab.stopSearching();
      searchStartedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Waiting phase: joined-members roster + realtime handoff ─────────────

  const [members, setMembers] = useState<ChallengeMember[] | null>(null);
  const handedOffRef = useRef(false);

  useEffect(() => {
    if (phase !== 'waiting' || !activeChallengeId) return;
    let alive = true;
    const tick = () => void getChallengeMembers(activeChallengeId).then((m) => alive && setMembers(m));
    tick();
    const t = setInterval(tick, 4000);
    return () => { alive = false; clearInterval(t); };
  }, [phase, activeChallengeId]);

  const attemptHandoff = useCallback(async () => {
    if (!activeChallengeId || handedOffRef.current) return;
    const state = await getChallengeState(activeChallengeId);
    if (!state || state.status !== 'running' || !state.startedAt) return;
    const stories = await getMyChallengeStories();
    const mine = stories.find((s) => s.challengeId === activeChallengeId);
    if (!mine) return;
    const questions = await buildChallengeQuestions(
      mine.curriculumSlug as CurriculumSlug,
      mine.seed,
      mine.questionCount,
      mine.targetTopicCount,
    );
    if (questions.length === 0) return;
    if (handedOffRef.current) return;
    handedOffRef.current = true;
    setPendingChallengeRun({
      challengeId: activeChallengeId,
      curriculumSlug: mine.curriculumSlug,
      curriculumTitle: getCachedTitle(mine.curriculumSlug) ?? mine.curriculumSlug,
      startedAtMs: state.startedAt.getTime(),
      questions,
      origin: 'challenge-corner',
    });
    router.replace('/challenge-start' as any);
  }, [activeChallengeId, router]);

  useEffect(() => {
    if (phase !== 'waiting' || !activeChallengeId) return;
    const unsubscribe = subscribeToChallengeStatus(activeChallengeId, () => void attemptHandoff());
    const t = setInterval(() => void attemptHandoff(), 1500);
    return () => { unsubscribe(); clearInterval(t); };
  }, [phase, activeChallengeId, attemptHandoff]);

  // router.back() silently no-ops on web when this screen was loaded
  // directly (typed URL / refresh) and expo-router has no prior route in
  // its own nav state — canGoBack() guards that so the X button always
  // does something.
  const exitScreen = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/challenge-corner' as any);
  }, [router]);

  const onLeaveWaiting = useCallback(async () => {
    if (activeChallengeId) {
      try { await leaveChallenge(activeChallengeId); } catch { /* best-effort */ }
    }
    exitScreen();
  }, [activeChallengeId, exitScreen]);

  const onExitBrowsing = useCallback(() => {
    collab.stopSearching();
    exitScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exitScreen]);

  const backButton = (
    <Pressable onPress={phase === 'waiting' ? () => void onLeaveWaiting() : onExitBrowsing} hitSlop={10}>
      <X size={IconSize.header} color={colors.onSurface} strokeWidth={2.5} />
    </Pressable>
  );

  const searchShowingCarousel = phase === 'browsing' && collab.openChallenges.length > 0;
  const isLookingForChallenge = phase === 'browsing' && !searchShowingCarousel;

  // ── Offline fallback ────────────────────────────────────────────────────

  if (!online && phase !== 'waiting') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.marginMobile, paddingVertical: Spacing.sm }}>
          {backButton}
          <Text style={[Typography.headlineMd, { color: colors.onSurface }]}>Online Challenge</Text>
        </View>
        <View style={{ flex: 1, paddingHorizontal: Spacing.marginMobile }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg }}>
            <View style={{
              width: 130, height: 130, borderRadius: 65,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: colors.surfaceContainerLow,
              borderWidth: 1.5, borderColor: colors.outlineVariant,
              marginBottom: Spacing.sm,
            }}>
              <WifiOff size={58} color={StaticColors.selection.activeBorder} strokeWidth={1.75} />
            </View>
            <Text style={[Typography.headlineLg, { color: colors.onSurface, textAlign: 'center' }]}>You are offline</Text>
            <Text style={[Typography.bodyMd, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
              Online challenges require internet connection. You can still practice with offline companion challenges.
            </Text>
          </View>
          <View style={{ paddingBottom: Spacing.xxl + Spacing.lg }}>
            <Pressable
              onPress={() => router.replace('/challenge-offline' as any)}
              style={{
                height: 56, borderRadius: Radius.lg,
                backgroundColor: StaticColors.selection.activeBorder,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={[Typography.bodyLg, { color: colors.white, fontWeight: '600' }]}>Search offline challenges</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      {!searchShowingCarousel && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.marginMobile, paddingVertical: Spacing.sm }}>
          {backButton}
          {!isLookingForChallenge && (
            <Text style={[Typography.headlineMd, { color: colors.onSurface }]}>Online Challenge</Text>
          )}
        </View>
      )}

      {phase === 'waiting' ? (
        // ── Waiting room: roster + realtime handoff ──
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.xxl, paddingHorizontal: Spacing.marginMobile, paddingBottom: Spacing.xxl }}>
          <View style={{ alignItems: 'center', gap: Spacing.sm }}>
            <GlobePulse />
            <Text style={[Typography.headlineSm, { color: colors.onSurface, fontWeight: 'bold', marginTop: Spacing.md }]}>
              Waiting to start
            </Text>
            <Text style={[Typography.bodyMd, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
              Hang tight — the challenge starts once everyone&apos;s in.
            </Text>
          </View>
          <View style={{ alignItems: 'center', gap: Spacing.sm }}>
            <Text style={[Typography.bodySm, { color: colors.onSurfaceVariant, fontWeight: 'bold', letterSpacing: 0.5, textTransform: 'uppercase' }]}>
              Players
            </Text>
            <AvatarStack
              members={(members ?? []).map((m, i) => ({ id: m.deviceId || String(i), name: m.displayName ?? 'Player' }))}
              maxVisible={4}
              size={40}
            />
          </View>
        </View>
      ) : searchShowingCarousel ? (
        // ── Search found results: StoryCarousel ──
        <View style={{ flex: 1 }}>
          <StoryCarousel<OpenGlobalChallenge>
            items={collab.openChallenges}
            keyExtractor={(c) => c.challengeId}
            onExit={() => { collab.stopSearching(); collab.startSearching(); }}
            ctaZoneHeight={130}
            leading={backButton}
            renderItem={(found) => (
              <View style={{ flex: 1 }}>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg }}>
                  <SearchPulse color={StaticColors.selection.activeBorder} />
                  <Text style={[Typography.headlineMd, { color: colors.onSurface, textAlign: 'center' }]}>Challenge found!</Text>
                  <Text style={[Typography.bodySm, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
                    {`${found.creatorName ?? 'Someone'}'s challenge \u00b7 ${found.joinedCount} joined`}
                  </Text>
                </View>
                <View style={{ marginBottom: Spacing.xl, alignSelf: 'center', paddingHorizontal: Spacing.marginMobile, width: '100%', maxWidth: 320 }}>
                  <Pressable
                    onPress={() => void collab.joinChallenge(found.challengeId)}
                    disabled={collab.joining}
                    style={{
                      height: 56, borderRadius: Radius.lg,
                      backgroundColor: StaticColors.selection.activeBorder,
                      alignItems: 'center', justifyContent: 'center',
                      opacity: collab.joining ? 0.7 : 1,
                    }}
                  >
                    <Text style={[Typography.bodyLg, { color: colors.white, fontWeight: 'bold' }]}>
                      {collab.joining ? 'Joining\u2026' : 'JOIN NOW'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        </View>
      ) : (
        // ── Searching state: pulsing animation ──
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start', gap: Spacing.lg, paddingHorizontal: Spacing.marginMobile, paddingTop: '42%', paddingBottom: Spacing.xxl }}>
          <SearchPulse color={StaticColors.selection.activeBorder} />
          <Text style={[Typography.headlineMd, { color: colors.onSurface, textAlign: 'center' }]}>Looking for a challenge…</Text>
        </View>
      )}

      <View style={{ alignItems: 'center', paddingBottom: Spacing.md }}>
        <BottomBannerAd />
      </View>
    </View>
  );
}
