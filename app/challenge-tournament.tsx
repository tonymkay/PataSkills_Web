/**
 * Tournament story — search → found → join → promotion/elimination/final_win.
 * Port of pataskillsv2 tournament-story.tsx adapted to Play conventions:
 *   • curriculumSlug instead of skillId
 *   • getCurriculaCatalog / getCachedTitle instead of fetchSkills
 *   • getDeviceId from @/lib/deviceId
 *   • No logClientError / logTournamentResult (Play doesn't have them — silent catch)
 *   • Play typography / theming via @/theme/tokens
 *   • BottomBannerAd from @/components/ads/BottomBannerAd
 *   • AvatarStack from @/components/challenge/AvatarStack
 *   • No "Live" branch — search mode only
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  BackHandler,
  ScrollView,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { X, Trophy } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
} from 'react-native-reanimated';

import { BottomBannerAd } from '@/components/ads/BottomBannerAd';
import { Avatar } from '@/components/profile/Avatar';
import { AvatarStack } from '@/components/challenge/AvatarStack';
import { Button } from '@/components/ui/Button';
import { Spacing, StaticColors, Typography, useTheme } from '@/theme/tokens';
import { getCurriculaCatalog } from '@/lib/curriculaCatalog';
import { getFinishedChallengeRun } from '@/lib/challengeRuntime';
import {
  createTournament,
  findTournamentByChallenge,
  getTournamentState,
  claimTournamentReward,
  joinTournament,
  type TournamentState,
} from '@/lib/tournaments';
import { grantBonusKey } from '@/lib/keys';
import {
  createLocalScoutTournament,
  getLocalTournamentState,
  claimLocalTournamentReward,
  stopLocalScoutTournament,
  isLocalTournamentId,
  getLocalStagePool,
  type LocalTournamentState,
} from '@/lib/challengeScoutTournamentSession';
import type { CurriculumSlug } from '@/constants/curriculumAssets';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Adapts local shape onto TournamentState so render code needs no special-cases. */
function localStateAsTournamentState(s: LocalTournamentState | null): TournamentState | null {
  if (!s) return null;
  return { ...s, promotedCount: 0, promotedPhotos: [], fieldPhotos: [] };
}

type StoryBody =
  | 'searching'   // looking for a tournament (search pulse)
  | 'ready'       // tournament found
  | 'loading'     // brief spinner while fetching state after re-entry
  | 'promotion'   // promoted to next stage
  | 'elimination' // eliminated
  | 'final_win';  // tournament winner

function bodyForState(s: TournamentState): StoryBody {
  if (s.myStatus === 'eliminated') return 'elimination';
  if (s.myStatus === 'placed') return 'final_win';
  return 'promotion';
}

async function resolveActiveCurriculumSlug(paramSlug?: string): Promise<string | null> {
  if (paramSlug) return paramSlug;
  const finished = getFinishedChallengeRun()?.curriculumSlug;
  if (finished) return finished;
  const catalog = await getCurriculaCatalog();
  return catalog[0]?.slug ?? null;
}

const INITIAL_SEARCH_TIMER_MS = 60_000;
const EXTRA_SEARCH_MS = 30_000;

const GREEN = StaticColors.selection.activeBorder;

// ─── Search pulse animation ───────────────────────────────────────────────────

function TournamentSearchPulse() {
  const { colors } = useTheme();
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })),
      -1,
    );
  }, [pulse]);
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.35]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.5, 0]),
  }));
  return (
    <View style={{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          { position: 'absolute', width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: GREEN },
          ringStyle,
        ]}
      />
      <View
        style={{
          width: 68, height: 68, borderRadius: 34, backgroundColor: GREEN,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Trophy size={28} color="#FFFFFF" strokeWidth={2} />
      </View>
    </View>
  );
}

// ─── Screen component ─────────────────────────────────────────────────────────

export default function ChallengeTournamentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<{
    tournamentId?: string;
    slug?: string;
    sourceChallengeId?: string;
    scoutIds?: string;
    scoutNames?: string;
    source?: string;
    stageScore?: string;
    stageTotal?: string;
  }>();

  const [stageScore] = useState<number | null>(
    params.stageScore !== undefined ? Number(params.stageScore) : null,
  );
  const [stageTotal] = useState<number | null>(
    params.stageTotal !== undefined ? Number(params.stageTotal) : null,
  );

  const [tournamentId, setTournamentId] = useState<string | undefined>(params.tournamentId);
  const isOffline = params.source === 'scout-local' || isLocalTournamentId(params.tournamentId);
  const [body, setBody] = useState<StoryBody>(() =>
    params.tournamentId ? 'loading' : 'searching',
  );
  const [loading, setLoading] = useState(false);
  const [tState, setTState] = useState<TournamentState | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  // ── Reanimated progress (internal timer for search timeout) ──
  const progress = useSharedValue(0);
  const timerTotalMs = useRef(INITIAL_SEARCH_TIMER_MS);
  const timerStartTime = useRef<number | null>(null);

  const close = useCallback(() => router.back(), [router]);

  const startSearchTimer = useCallback((addedMs = 0) => {
    if (timerStartTime.current === null) timerStartTime.current = Date.now();
    if (addedMs > 0) timerTotalMs.current += addedMs;
    const elapsed = Date.now() - timerStartTime.current;
    const remaining = Math.max(0, timerTotalMs.current - elapsed);
    cancelAnimation(progress);
    if (remaining <= 0) { runOnJS(close)(); return; }
    const startProgress = Math.min(1, elapsed / timerTotalMs.current);
    progress.value = startProgress;
    progress.value = withTiming(1, { duration: remaining }, (done) => {
      if (done) runOnJS(close)();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [close]);

  useEffect(() => {
    if (!isFocused || loading || body !== 'searching') {
      cancelAnimation(progress);
      return;
    }
    startSearchTimer(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, loading, body, startSearchTimer]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => cancelAnimation(progress), []);

  // ── Content crossfade ──
  const contentAnim = useSharedValue(1);
  useEffect(() => {
    contentAnim.value = 0;
    contentAnim.value = withTiming(1, { duration: 260 });
  }, [body, contentAnim]);
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentAnim.value,
    transform: [{ translateX: (1 - contentAnim.value) * 24 }],
  }));

  // ── Fetch tournament state ──
  const refreshState = useCallback(async (tid: string) => {
    if (isLocalTournamentId(tid)) {
      const state = localStateAsTournamentState(getLocalTournamentState());
      setTState(state);
      return state;
    }
    try {
      const state = await getTournamentState(tid);
      setTState(state);
      return state;
    } catch {
      return null;
    }
  }, []);

  // ── Create tournament helper ──
  const resolvedSlugRef = useRef<string | null>(params.slug ?? null);

  const doCreate = useCallback(async () => {
    const activeSlug = resolvedSlugRef.current ?? (await resolveActiveCurriculumSlug(params.slug));
    if (!activeSlug) return null;
    resolvedSlugRef.current = activeSlug;
    setLoading(true);
    try {
      if (isOffline) {
        const tid = await createLocalScoutTournament(activeSlug as CurriculumSlug);
        setTournamentId(tid);
        void refreshState(tid);
        return tid;
      }
      const scoutIdArr = params.scoutIds ? params.scoutIds.split(',') : [];
      const scoutNameArr = params.scoutNames ? params.scoutNames.split(',') : [];
      let tid: string | null = null;
      try {
        const created = await createTournament({
          curriculumSlug: activeSlug,
          sourceChallengeId: params.sourceChallengeId || null,
          scoutIds: scoutIdArr.length > 0 ? scoutIdArr : undefined,
          scoutNames: scoutNameArr.length > 0 ? scoutNameArr : undefined,
        });
        tid = created?.tournamentId ?? null;
        setInviteCode(created?.inviteCode ?? null);
      } catch (err) {
        const message = err instanceof Error ? err.message : '';
        if (message.includes('already exists') && params.sourceChallengeId) {
          tid = await findTournamentByChallenge(params.sourceChallengeId);
        }
        if (!tid) return null;
      }
      if (!tid) return null;
      setTournamentId(tid);
      void refreshState(tid);
      return tid;
    } finally {
      setLoading(false);
    }
  }, [params.slug, params.sourceChallengeId, params.scoutIds, params.scoutNames, refreshState, isOffline]);

  // ── Fetch state when we already have a tournamentId ──
  // Scoped to `body === 'loading'` — that's ONLY true when the screen was
  // entered with an existing params.tournamentId (a genuine re-entry into
  // an in-progress tournament, e.g. resuming after a stage's promotion).
  // Without this guard, the effect also fired the instant a *fresh* join
  // set tournamentId (via doCreate() inside handleJoinNow), racing against
  // handleJoinNow's own setBody('ready') and usually winning a beat later —
  // bodyForState() falls through to 'promotion' for any status that isn't
  // literally 'eliminated'/'placed', including a brand-new 'active' member,
  // so a fresh join would flash "Tournament Found" then immediately
  // "You are promoted" without the player ever reaching the actual stage.
  useEffect(() => {
    if (tournamentId && !tState && body === 'loading') {
      const timer = setTimeout(() => {
        void refreshState(tournamentId).then((s) => {
          if (!s) return;
          setBody(bodyForState(s));
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [tournamentId, tState, body, refreshState]);

  // ── Back / exit ──
  const handleBackExit = useCallback(() => {
    if (isOffline) stopLocalScoutTournament();
    // Guard: router.back() silently no-ops on web if this screen was
    // loaded directly (typed URL / refresh) with no prior route in
    // expo-router's own nav state.
    if (router.canGoBack()) router.back();
    else router.replace('/challenge-corner' as any);
  }, [isOffline, router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBackExit();
      return true;
    });
    return () => sub.remove();
  }, [handleBackExit]);

  // ── Handlers ──

  const handleJoinNow = async () => {
    const activeSlug = await resolveActiveCurriculumSlug(params.slug);
    if (!activeSlug) return;
    resolvedSlugRef.current = activeSlug;
    const tid = await doCreate();
    if (tid) setBody('ready');
  };

  const resetToSearching = useCallback(() => {
    if (isOffline) stopLocalScoutTournament();
    setTournamentId(undefined);
    setTState(null);
    timerStartTime.current = null;
    timerTotalMs.current = INITIAL_SEARCH_TIMER_MS;
    startSearchTimer(0);
    setBody('searching');
  }, [isOffline, startSearchTimer]);

  const handleSearchAgain = () => {
    if (isOffline) stopLocalScoutTournament();
    setTournamentId(undefined);
    setTState(null);
    startSearchTimer(EXTRA_SEARCH_MS);
    setBody('searching');
  };

  const handleSeeTarget = async () => {
    let tid = tournamentId;
    if (!tid) tid = (await doCreate()) ?? undefined;
    if (!tid) return;
    if (isLocalTournamentId(tid)) {
      router.replace({
        pathname: '/challenge-tournament-room' as any,
        params: { tournamentId: tid },
      });
      return;
    }
    try {
      await joinTournament(tid);
      router.replace({
        pathname: '/challenge-tournament-room' as any,
        params: { tournamentId: tid },
      });
    } catch { /* silent */ }
  };

  const handleContinue = async () => {
    let tid = tournamentId;
    if (!tid) tid = (await doCreate()) ?? undefined;
    if (!tid) return;
    router.replace({
      pathname: '/challenge-tournament-room' as any,
      params: {
        tournamentId: tid,
        stage: String(tState?.currentStage ?? 1),
      },
    });
  };

  const handleCollectReward = async () => {
    if (!tournamentId) return;
    setLoading(true);
    try {
      if (isLocalTournamentId(tournamentId)) {
        const keys = claimLocalTournamentReward();
        if (keys > 0) await grantBonusKey(keys, 'tournament_reward_local', tournamentId);
        stopLocalScoutTournament();
      } else {
        await claimTournamentReward(tournamentId);
      }
    } finally {
      setLoading(false);
      resetToSearching();
    }
  };

  // ── Auto-search → auto-join (2–10s delay, capped under 10s per spec) ──
  const autoFoundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (body !== 'searching' || !isFocused) {
      if (autoFoundTimerRef.current) clearTimeout(autoFoundTimerRef.current);
      autoFoundTimerRef.current = null;
      return;
    }
    const delayMs = 2000 + Math.random() * 8000;
    autoFoundTimerRef.current = setTimeout(() => {
      void handleJoinNow();
    }, delayMs);
    return () => {
      if (autoFoundTimerRef.current) clearTimeout(autoFoundTimerRef.current);
      autoFoundTimerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, isFocused]);

  // ── Tier helpers ──
  const tierLabel = tState?.tier
    ? tState.tier.charAt(0).toUpperCase() + tState.tier.slice(1)
    : '';

  const rewardKeysForTier = tState
    ? tState.tier === 'large' ? 5 : tState.tier === 'mid' ? 3 : 1
    : 10;

  // ── Render body ──

  const renderBodyContent = () => {
    switch (body) {
      case 'searching':
        return (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: '34%', paddingBottom: Spacing.xxl }}>
            <TournamentSearchPulse />
            <Text style={[Typography.headlineMd, { color: colors.onSurface, textAlign: 'center', marginTop: Spacing.lg }]}>
              Looking for a tournament…
            </Text>
          </View>
        );

      case 'ready': {
        const fieldPhotos = tState?.fieldPhotos ?? [];
        const fieldSize = tState?.fieldSize ?? 0;
        const fieldNames = isOffline ? getLocalStagePool()?.scoutNames ?? [] : [];
        const avatarCount = Math.max(fieldPhotos.length, fieldNames.length);
        const overflow = fieldSize > avatarCount ? fieldSize - avatarCount : 0;

        return (
          <View style={styles.contentCenter}>
            <Text style={[Typography.headlineMd, { color: colors.onSurface, textAlign: 'center' }]}>
              Tournament Found
            </Text>
            {tState?.topicTitle ? (
              <>
                <Text style={[Typography.headlineSm, { color: colors.onSurface, textAlign: 'center', marginTop: Spacing.lg }]}>
                  {tState.topicTitle}
                </Text>
                {tState.curriculumTitle ? (
                  <Text style={[Typography.bodySm, { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: Spacing.xs }]}>
                    {tState.curriculumTitle}
                  </Text>
                ) : null}
              </>
            ) : tierLabel ? (
              <Text style={[Typography.bodySm, { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: Spacing.sm }]}>
                {tierLabel} Tournament • {tState?.stageCount ?? '?'} stages
              </Text>
            ) : null}

            {!isOffline && (inviteCode ?? tState?.inviteCode) ? (
              <View
                style={{
                  marginTop: Spacing.lg, alignItems: 'center', gap: Spacing.xs,
                  backgroundColor: colors.surfaceContainerHigh, borderRadius: 16,
                  paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
                }}
              >
                <Text style={[Typography.bodySm, { color: colors.onSurfaceVariant }]}>
                  Invite a friend with this code
                </Text>
                <Text
                  style={{
                    fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 4,
                    color: GREEN,
                  }}
                  selectable
                >
                  {inviteCode ?? tState?.inviteCode}
                </Text>
              </View>
            ) : null}

            {(fieldPhotos.length > 0 || fieldNames.length > 0) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.lg }}>
                <View style={{ flexDirection: 'row' }}>
                  {fieldPhotos.length > 0
                    ? fieldPhotos.slice(0, 6).map((photo, idx) => (
                        <View
                          key={idx}
                          style={{
                            marginLeft: idx === 0 ? 0 : -14,
                            zIndex: 10 - idx,
                            borderWidth: 2,
                            borderColor: colors.background,
                            borderRadius: 20,
                          }}
                        >
                          <Avatar name="" size={36} imageUrl={photo || null} />
                        </View>
                      ))
                    : fieldNames.slice(0, 6).map((name, idx) => (
                        <View
                          key={idx}
                          style={{
                            marginLeft: idx === 0 ? 0 : -14,
                            zIndex: 10 - idx,
                            borderWidth: 2,
                            borderColor: colors.background,
                            borderRadius: 20,
                          }}
                        >
                          <Avatar name={name} size={36} imageUrl={null} />
                        </View>
                      ))}
                </View>
                {overflow > 0 && (
                  <Text style={[Typography.bodySm, { color: colors.onSurfaceVariant, marginLeft: Spacing.sm }]}>
                    +{overflow}
                  </Text>
                )}
              </View>
            )}

            <Text
              style={[Typography.bodySm, { color: colors.onSurfaceVariant, textAlign: 'center', paddingHorizontal: Spacing.md, marginTop: Spacing.lg }]}
            >
              Winner Reward is{' '}
              <Text style={[Typography.bodySm, { color: GREEN, fontWeight: '600' }]}>
                {rewardKeysForTier} keys
              </Text>
            </Text>
          </View>
        );
      }

      case 'loading':
        return (
          <View style={styles.contentCenter}>
            <ActivityIndicator color={GREEN} />
          </View>
        );

      case 'promotion': {
        const promotedCount = tState?.promotedCount ?? 0;
        return (
          <View style={styles.contentCenter}>
            {stageScore !== null && stageTotal !== null && (
              <>
                <Text style={[Typography.bodySm, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
                  Your score
                </Text>
                <Text
                  style={{
                    fontSize: 40, lineHeight: 48, fontWeight: '400',
                    color: colors.onSurface, textAlign: 'center', marginTop: Spacing.xs,
                  }}
                >
                  {stageScore}/{stageTotal}
                </Text>
              </>
            )}
            <Text style={[Typography.headlineMd, { color: colors.onSurface, textAlign: 'center', marginTop: Spacing.md }]}>
              You are promoted.
            </Text>
            {promotedCount > 0 && (
              <Text style={[Typography.bodySm, { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: Spacing.sm }]}>
                +{promotedCount} other{promotedCount !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        );
      }

      case 'elimination':
        return (
          <View style={styles.contentCenter}>
            <Text style={[Typography.headlineXl, { color: colors.onSurface, textAlign: 'center' }]}>
              So Close!
            </Text>
            <Text
              style={[Typography.bodySm, { color: colors.onSurfaceVariant, textAlign: 'center', paddingHorizontal: Spacing.md, marginTop: Spacing.md }]}
            >
              You did not qualify{'\n'}for the next challenge
            </Text>
          </View>
        );

      case 'final_win': {
        const placement = tState?.myPlacement ?? 1;
        const rewardKeys = tState?.myRewardKeys ?? 0;
        const ordinal = placement === 1 ? '1st' : placement === 2 ? '2nd' : '3rd';
        return (
          <View style={styles.contentCenter}>
            <Text style={[Typography.headlineMd, { color: colors.onSurface, textAlign: 'center' }]}>
              Congrats!
            </Text>
            <Text
              style={[Typography.bodySm, { color: colors.onSurfaceVariant, textAlign: 'center', paddingHorizontal: Spacing.md, marginTop: Spacing.md }]}
            >
              You finished {ordinal} and{'\n'}won the challenge reward
            </Text>
            {rewardKeys > 0 && (
              <Text
                style={{
                  fontSize: 48, lineHeight: 58, fontWeight: '700',
                  color: StaticColors.timerOrange, textAlign: 'center', marginTop: Spacing.lg,
                }}
              >
                {rewardKeys} 🔑
              </Text>
            )}
          </View>
        );
      }

      default:
        return null;
    }
  };

  // ── Render CTAs ──

  const renderCTAs = () => {
    switch (body) {
      case 'searching':
        return null;
      case 'ready':
        return (
          <>
            <Button label="Join Tournament" variant="gradient" loading={loading} onPress={handleSeeTarget} />
            <Button label="Search again" variant="outline" onPress={handleSearchAgain} />
          </>
        );
      case 'promotion':
        return (
          <>
            <Button label="Continue" variant="gradient" loading={loading} onPress={handleContinue} />
            <Button label="Leave Challenge" variant="outline" onPress={resetToSearching} />
          </>
        );
      case 'elimination':
        return <Button label="Got It" variant="outline" onPress={resetToSearching} />;
      case 'final_win':
        return (
          <Button label="Collect Reward" variant="gradient" loading={loading} onPress={handleCollectReward} />
        );
      default:
        return null;
    }
  };

  // ── Main render ──

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Header: X only */}
      <View style={styles.header}>
        <Pressable onPress={handleBackExit} hitSlop={10}>
          <X size={24} color={colors.onSurface} strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* Body */}
      <Animated.View style={[styles.bodyFlex, contentStyle]}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.bodyScrollContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={false}
        >
          {renderBodyContent()}
        </ScrollView>
      </Animated.View>

      {/* Banner ad while searching */}
      {body === 'searching' && (
        <View style={{ alignItems: 'center', paddingBottom: Spacing.sm }}>
          <BottomBannerAd />
        </View>
      )}

      {/* Bottom CTAs */}
      <View style={[styles.ctaGroup, { paddingBottom: insets.bottom + Spacing.lg }]}>
        {renderCTAs()}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: Spacing.sm,
  },
  bodyFlex: {
    flex: 1,
    paddingHorizontal: Spacing.marginMobile,
  },
  bodyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  contentCenter: {
    alignItems: 'center',
  },
  ctaGroup: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.md,
  },
});
