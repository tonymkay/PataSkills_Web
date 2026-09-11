/**
 * ChallengeWaitingRoom — the "waiting to start" room a challenge creator or
 * joiner sits in: players roster, realtime handoff into the quiz once it
 * starts, creator-only invite code + cancel-for-everyone, and the abort/
 * leave confirmation on both the in-app X and OS/hardware back.
 *
 * Self-contained: owns its own header, safe-area insets, bottom ad and
 * QuitConfirmSheet, so a host screen can render just this and nothing else
 * for the waiting phase — whether that's a route (challenge-online.tsx) or
 * a local state swap inside another screen (challenge-create.tsx).
 *
 * `onExit` is called once navigation away from the room should happen:
 * after a non-creator leaves, after a creator steps away without
 * cancelling, or after a creator's cancel-for-everyone is confirmed. The
 * host decides what "exit" means (pop the stack, or flip local state).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Globe2, Share2 } from 'lucide-react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolate,
} from 'react-native-reanimated';
import { IconSize, Radius, Spacing, StaticColors, Typography, useTheme } from '@/theme/tokens';
import { AvatarStack } from '@/components/challenge/AvatarStack';
import { BottomBannerAd } from '@/components/ads/BottomBannerAd';
import { QuitConfirmSheet } from '@/components/feedback/QuitConfirmSheet';
import {
  cancelChallenge, getChallengeMembers, getChallengeState, getMyChallengeStories,
  leaveChallenge, startChallenge, subscribeToChallengeStatus, type ChallengeMember,
} from '@/lib/challenges';
import { setPendingChallengeRun } from '@/lib/challengeRuntime';
import { getCachedTitle } from '@/lib/curriculaCatalog';

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

export function ChallengeWaitingRoom({
  challengeId,
  onExit,
  title = 'Online Challenge',
  mode = 'challenge',
  tournamentId,
  tournamentStage,
}: {
  challengeId: string;
  onExit: () => void;
  title?: string;
  /** 'tournament' suppresses creator-only controls (invite code, Start
   *  Challenge, Cancel for everyone) that don't apply to a shared
   *  tournament-stage pool — there's no single creator to gate them on. */
  mode?: 'challenge' | 'tournament';
  /** Threaded into the realtime handoff's PendingChallengeRun so
   *  challenge-results.tsx knows to route back into the tournament flow
   *  instead of the normal challenge exit path. */
  tournamentId?: string;
  tournamentStage?: number;
}) {
  const isTournament = mode === 'tournament';
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // ── Members roster (polled) ──────────────────────────────────────────────
  const [members, setMembers] = useState<ChallengeMember[] | null>(null);
  useEffect(() => {
    let alive = true;
    const tick = () => void getChallengeMembers(challengeId).then((m) => alive && setMembers(m));
    tick();
    const t = setInterval(tick, 4000);
    return () => { alive = false; clearInterval(t); };
  }, [challengeId]);

  // ── Creator-only: invite code + cancel-for-everyone ──────────────────────
  const [isCreator, setIsCreator] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showAbortSheet, setShowAbortSheet] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (isTournament) return;
    let alive = true;
    getMyChallengeStories().then((stories) => {
      if (!alive) return;
      const mine = stories.find((s) => s.challengeId === challengeId);
      setIsCreator(!!mine?.isCreator);
      setInviteCode(mine?.inviteCode ?? null);
    });
    return () => { alive = false; };
  }, [challengeId, isTournament]);

  const onShareCode = useCallback(() => {
    if (!inviteCode) return;
    void Share.share({
      message: `Join my challenge on PataSkills! Use code ${inviteCode} under "Join a Challenge".`,
    });
  }, [inviteCode]);

  const onCancelChallenge = useCallback(() => {
    setShowAbortSheet(true);
  }, []);

  // Creator-only: lets the host start early once at least one other player
  // has actually joined, instead of waiting on some external condition.
  // The realtime subscription/poll above (attemptHandoff) picks up the
  // resulting 'running' status the same way it would for any other start.
  const joinedOthers = (members ?? []).filter((m) => m.status === 'joined').length;
  const canStart = isCreator && joinedOthers >= 1;

  const onStartChallenge = useCallback(async () => {
    setStarting(true);
    try {
      await startChallenge(challengeId);
    } catch { /* best-effort — polling/subscription still catches a real start */ }
    setStarting(false);
  }, [challengeId]);

  const onKeepWaiting = useCallback(() => {
    setShowAbortSheet(false);
  }, []);

  const onConfirmAbort = useCallback(async () => {
    setShowAbortSheet(false);
    setCancelling(true);
    try {
      await cancelChallenge(challengeId);
    } catch { /* best-effort — still exit below */ }
    setCancelling(false);
    onExit();
  }, [challengeId, onExit]);

  // ── Realtime handoff once the challenge starts ───────────────────────────
  const handedOffRef = useRef(false);
  const attemptHandoff = useCallback(async () => {
    if (handedOffRef.current) return;
    const state = await getChallengeState(challengeId);
    if (!state || state.status !== 'running' || !state.startedAt) return;
    const stories = await getMyChallengeStories();
    const mine = stories.find((s) => s.challengeId === challengeId);
    if (!mine) return;
    if (handedOffRef.current) return;
    handedOffRef.current = true;
    setPendingChallengeRun({
      challengeId,
      curriculumSlug: mine.curriculumSlug,
      curriculumTitle: getCachedTitle(mine.curriculumSlug) ?? mine.curriculumSlug,
      startedAtMs: state.startedAt.getTime(),
      questions: [],
      seed: mine.seed,
      questionCount: mine.questionCount,
      topicIndex: mine.targetTopicCount,
      origin: 'challenge-corner',
      ...(tournamentId ? { tournamentId, tournamentStage } : {}),
    });
    router.replace('/challenge-start' as any);
  }, [challengeId, router, tournamentId, tournamentStage]);

  useEffect(() => {
    const unsubscribe = subscribeToChallengeStatus(challengeId, () => void attemptHandoff());
    const t = setInterval(() => void attemptHandoff(), 1500);
    return () => { unsubscribe(); clearInterval(t); };
  }, [challengeId, attemptHandoff]);

  // ── Exit / back handling ──────────────────────────────────────────────────
  const onLeaveWaiting = useCallback(async () => {
    // Creators just step away — the challenge keeps waiting in the
    // background and the host screen (Challenge Corner tile, or this
    // room re-opening) will bring them back to it. Only the explicit
    // "Cancel for everyone" button ends it for real. Non-creators leaving
    // does still release their spot.
    if (!isCreator) {
      try { await leaveChallenge(challengeId); } catch { /* best-effort */ }
    }
    onExit();
  }, [challengeId, isCreator, onExit]);

  const onPressBack = useCallback(() => {
    // A tournament stage's shared pool has no single creator to prompt for
    // a cancel-for-everyone decision — leaving just leaves.
    if (isTournament) { void onLeaveWaiting(); return; }
    if (isCreator) { setShowAbortSheet(true); return; }
    void onLeaveWaiting();
  }, [isTournament, isCreator, onLeaveWaiting]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onPressBack();
      return true;
    });
    return () => sub.remove();
  }, [onPressBack]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.marginMobile, paddingVertical: Spacing.sm, backgroundColor: colors.background, zIndex: 10 }}>
        <Pressable onPress={onPressBack} hitSlop={10}>
          <X size={IconSize.header} color={colors.onSurface} strokeWidth={2.5} />
        </Pressable>
        <Text style={[Typography.headlineMd, { color: colors.onSurface }]}>{title}</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ alignItems: 'center', gap: Spacing.xxl, paddingHorizontal: Spacing.marginMobile, paddingTop: 40, paddingBottom: Spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', gap: Spacing.sm }}>
          <GlobePulse />
          <Text style={[Typography.headlineSm, { color: colors.onSurface, fontWeight: 'bold', marginTop: Spacing.md }]}>
            Waiting to start
          </Text>
          <Text style={[Typography.bodyMd, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
            Hang tight — the challenge starts once everyone&apos;s in.
          </Text>
        </View>
        {!isTournament && isCreator && inviteCode && (
          <View style={{ alignItems: 'center', gap: Spacing.sm, width: '100%' }}>
            <Text style={[Typography.bodySm, { color: colors.onSurfaceVariant, fontWeight: 'bold', letterSpacing: 0.5, textTransform: 'uppercase' }]}>
              Invite code
            </Text>
            <Pressable
              onPress={onShareCode}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
                paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
                borderRadius: Radius.lg, borderWidth: 1.5, borderColor: colors.outlineVariant,
              }}
            >
              <Text style={[Typography.headlineSm, { color: colors.onSurface, fontWeight: 'bold', letterSpacing: 4 }]}>
                {inviteCode}
              </Text>
              <Share2 size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
            </Pressable>
            <Pressable onPress={onShareCode} hitSlop={8}>
              <Text style={[Typography.bodySm, { color: colors.onSurfaceVariant, fontWeight: '600' }]}>
                Share via WhatsApp, email & more
              </Text>
            </Pressable>
          </View>
        )}

        {(isTournament || joinedOthers >= 1) && (
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
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: Spacing.marginMobile, paddingBottom: Spacing.sm, gap: Spacing.sm }}>
        {!isTournament && canStart && (
          <Pressable
            onPress={onStartChallenge}
            disabled={starting}
            style={{
              width: '100%',
              paddingVertical: Spacing.md,
              borderRadius: Radius.lg,
              alignItems: 'center',
              backgroundColor: colors.primary,
              opacity: starting ? 0.7 : 1,
            }}
          >
            <Text style={[Typography.bodyMd, { color: colors.onPrimary ?? '#000', fontWeight: 'bold' }]}>
              {starting ? 'STARTING\u2026' : 'START CHALLENGE'}
            </Text>
          </Pressable>
        )}

        {!isTournament && isCreator && inviteCode && (
          <Pressable onPress={onCancelChallenge} disabled={cancelling} hitSlop={8} style={{ alignItems: 'center', paddingVertical: Spacing.xs }}>
            <Text style={[Typography.bodySm, { color: '#ef4444', fontWeight: '600' }]}>
              {cancelling ? 'Cancelling\u2026' : 'Cancel for everyone'}
            </Text>
          </Pressable>
        )}
      </View>

      <View style={{ alignItems: 'center', paddingBottom: Spacing.md }}>
        <BottomBannerAd />
      </View>

      <QuitConfirmSheet
        visible={showAbortSheet}
        onKeepPlaying={onKeepWaiting}
        onQuit={() => void onConfirmAbort()}
        title="Abort this challenge?"
        subtitle="Players waiting will no longer be able to join."
        keepLabel="KEEP WAITING"
        quitLabel={cancelling ? 'ABORTING\u2026' : 'ABORT'}
      />
    </View>
  );
}
