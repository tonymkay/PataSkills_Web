/**
 * Score + live leaderboard. Companion, Scout, and Online are fully wired.
 * Tournament stages (isScout + tournamentId) route back into
 * challenge-tournament.tsx instead of /challenge-reward — that screen owns
 * promotion/elimination/final_win and the actual reward grant. Real online
 * tournament stages aren't wired end-to-end yet (see challenge-start.tsx).
 *
 * Exit is locked until everyone finishes or the 2-minute grace timer
 * (firstResultsAt) clears — same as the old app. Non-tournament runs then
 * go to /challenge-reward.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Trophy } from 'lucide-react-native';
import { Avatar } from '@/components/profile/Avatar';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { QuitConfirmSheet } from '@/components/feedback/QuitConfirmSheet';
import { BrandGradients } from '@/constants/gradients';
import { Radius, Spacing, StaticColors, Typography, useTheme } from '@/theme/tokens';
import {
  clearChallengeRun,
  getFinishedChallengeRun,
  setChallengeRewardSummary,
  type FinishedChallengeRun,
} from '@/lib/challengeRuntime';
import { markCompanionResultsViewed, stopCompanionSession } from '@/lib/challengeCompanionSession';
import { useChallengeCompanionSession } from '@/hooks/useChallengeCompanionSession';
import { markScoutResultsViewed, stopScoutSession } from '@/lib/challengeScoutSession';
import { useChallengeScoutSession } from '@/hooks/useChallengeScoutSession';
import { recordLocalStageResult, isLocalTournamentId } from '@/lib/challengeScoutTournamentSession';
import { getChallengeState, markChallengeResultsViewed, claimChallengeReward, type ChallengeState } from '@/lib/challenges';
import { getDeviceId } from '@/lib/deviceId';
import { resolveCorrectAnswerText } from '@/lib/mistakes';

const GREEN = StaticColors.selection.activeBorder;
const AMBER = StaticColors.achievementAmber;
const EXIT_UNLOCK_MS = 120000;
const MAX_VISIBLE_ROWS = 4;
const ROW_HEIGHT = 64;

interface Row {
  id: string;
  name: string;
  score: number;
  total: number;
  finished: boolean;
  currentQuestionIndex: number;
  timeMs: number;
  isMe: boolean;
}

function sortRows(rows: Row[]): Row[] {
  const finished = rows.filter((r) => r.finished).sort((a, b) => (b.score - a.score) || (a.timeMs - b.timeMs));
  const unfinished = rows.filter((r) => !r.finished).sort((a, b) => b.currentQuestionIndex - a.currentQuestionIndex);
  return [...finished, ...unfinished];
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function ProgressPill({
  current, total, trackColor, fillColor,
}: {
  current: number; total: number; trackColor: string; fillColor: string;
}) {
  const pct = total > 0 ? Math.max(0, Math.min(1, current / total)) : 0;
  return (
    <View style={{ height: 5, borderRadius: Radius.full, backgroundColor: trackColor, overflow: 'hidden', width: '100%' }}>
      <View style={{ height: '100%', width: `${pct * 100}%`, borderRadius: Radius.full, backgroundColor: fillColor }} />
    </View>
  );
}

export default function ChallengeResultsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [run] = useState<FinishedChallengeRun | null>(() => getFinishedChallengeRun());
  const isCompanion = !!run?.isCompanion;
  const isScout = !!run?.isScout;
  const isOnline = !!run?.challengeId && !isCompanion && !isScout;
  const isMultiplayer = isCompanion || isOnline || isScout;
  const isTournament = !!run?.tournamentId;
  const isLocalTournament = isTournament && isLocalTournamentId(run?.tournamentId);
  const activityLabel = isTournament ? 'Tournament' : 'Challenge';

  const companionSession = useChallengeCompanionSession();
  const scoutSession = useChallengeScoutSession();
  const [onlineState, setOnlineState] = useState<ChallengeState | null>(null);
  const [myDeviceId, setMyDeviceId] = useState<string | null>(null);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [quitWarnOpen, setQuitWarnOpen] = useState(false);
  const [anchorMs, setAnchorMs] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(EXIT_UNLOCK_MS);
  const exitedRef = useRef(false);

  useEffect(() => {
    if (!run) return;
    if (isCompanion) {
      const t = markCompanionResultsViewed();
      queueMicrotask(() => setAnchorMs(t));
    } else if (isScout) {
      const t = markScoutResultsViewed();
      queueMicrotask(() => setAnchorMs(t));
    } else if (isOnline && run.challengeId) {
      markChallengeResultsViewed(run.challengeId).then((t) => setAnchorMs(t ? t.getTime() : Date.now()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isOnline || !run?.challengeId) return undefined;
    getDeviceId().then(setMyDeviceId);
    let cancelled = false;
    const poll = () => {
      getChallengeState(run.challengeId!).then((state) => {
        if (!cancelled) setOnlineState(state);
      });
    };
    poll();
    const t = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(t); };
  }, [isOnline, run?.challengeId]);

  useEffect(() => {
    if (anchorMs === null) return undefined;
    const tick = () => setRemainingMs(Math.max(0, anchorMs + EXIT_UNLOCK_MS - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [anchorMs]);

  const closeReview = useCallback(() => setReviewOpen(false), []);

  const rows: Row[] = isCompanion
    ? companionSession.players.map((p) => ({
        id: p.deviceId, name: p.displayName, score: p.score, total: p.total, timeMs: p.timeMs,
        finished: p.finished, currentQuestionIndex: p.currentQuestionIndex, isMe: p.deviceId === companionSession.deviceId,
      }))
    : isScout
    ? scoutSession.players.map((p) => ({
        id: p.deviceId, name: p.displayName, score: p.score, total: p.total, timeMs: p.timeMs,
        finished: p.finished, currentQuestionIndex: p.currentQuestionIndex, isMe: p.deviceId === scoutSession.deviceId,
      }))
    : isOnline && onlineState
    ? onlineState.players.map((p) => ({
        id: p.deviceId ?? p.displayName ?? Math.random().toString(36),
        name: p.displayName ?? 'Player',
        score: p.score ?? 0,
        total: p.total ?? run?.total ?? 0,
        timeMs: p.timeMs ?? 0,
        finished: !!p.finishedAt,
        currentQuestionIndex: p.currentQuestionIndex,
        isMe: p.deviceId === myDeviceId,
      }))
    : [];
  const sortedRows = sortRows(rows);
  const waitingCount = rows.filter((r) => !r.finished).length;
  const allFinished = isMultiplayer && rows.length > 0 && rows.every((r) => r.finished);
  const unlocked = !isMultiplayer || remainingMs <= 0 || allFinished;
  const myPositionIndex = sortedRows.findIndex((r) => r.isMe);
  const myPositionLabel = myPositionIndex >= 0 ? `${myPositionIndex + 1}/${sortedRows.length}` : null;

  const rewardKeys = isCompanion
    ? companionSession.players.find((p) => p.deviceId === companionSession.deviceId)?.rewardKeys ?? 0
    : isScout
    ? scoutSession.players.find((p) => p.deviceId === scoutSession.deviceId)?.rewardKeys ?? 0
    : 0;

  const finalizeAndCleanup = () => {
    if (isCompanion) stopCompanionSession();
    else if (isScout) stopScoutSession();
  };

  const onExit = async () => {
    if (!unlocked || exitedRef.current) return;
    exitedRef.current = true;

    // Tournament stage race: don't go through the normal reward path —
    // challenge-tournament.tsx owns promotion/elimination/final_win and
    // the actual reward grant. For a local (offline scout) bracket, we're
    // the ones who have to advance it, since nothing server-side is
    // ticking the stage forward; capture the finished pool before
    // finalizeAndCleanup() tears the scout session down.
    if (isTournament && run?.tournamentId) {
      if (isLocalTournament) {
        try {
          await recordLocalStageResult(
            scoutSession.players.map((p) => ({ deviceId: p.deviceId, score: p.score, timeMs: p.timeMs })),
          );
        } catch { /* best-effort */ }
      }
      finalizeAndCleanup();
      clearChallengeRun();
      router.replace({
        pathname: '/challenge-tournament' as any,
        params: {
          tournamentId: run.tournamentId,
          stage: String(run.tournamentStage ?? 1),
          stageScore: String(run.score ?? 0),
          stageTotal: String(run.total ?? 0),
          ...(isLocalTournament ? { source: 'scout-local' } : {}),
        },
      });
      return;
    }

    finalizeAndCleanup();
    let keys = rewardKeys;
    if (isOnline && run?.challengeId) {
      try { keys = await claimChallengeReward(run.challengeId); } catch { /* best-effort */ }
    }
    setChallengeRewardSummary({
      score: run?.score ?? 0,
      total: run?.total ?? 0,
      rewardKeys: keys,
      activityLabel,
      origin: run?.origin,
    });
    clearChallengeRun();
    router.replace('/challenge-reward');
  };

  const onQuit = () => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    finalizeAndCleanup();
    clearChallengeRun();
    router.back();
  };

  const onBackPress = useCallback((): boolean => {
    if (reviewOpen) {
      setReviewOpen(false);
      return true;
    }
    if (quitWarnOpen) {
      setQuitWarnOpen(false);
      return true;
    }
    setQuitWarnOpen(true);
    return true;
  }, [reviewOpen, quitWarnOpen]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [onBackPress]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    window.history.pushState({ page: 'challenge-results' }, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState({ page: 'challenge-results' }, '', window.location.href);
      onBackPress();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onBackPress]);

  if (!run) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, paddingHorizontal: Spacing.marginMobile }}>
        <Text style={[Typography.headlineSm, { color: colors.onSurface, textAlign: 'center' }]}>Couldn&apos;t load your results</Text>
        <Text style={[Typography.bodyMd, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
          This challenge&apos;s results are no longer available.
        </Text>
        <Button label="Go back" onPress={() => router.back()} />
      </View>
    );
  }

  const headline = isMultiplayer ? 'My Rank' : 'Complete!';
  const exitLabel = isTournament ? 'Continue' : rewardKeys > 0 ? 'See Reward' : 'Exit';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.marginMobile, paddingBottom: Spacing.xl, gap: Spacing.lg }}
      >
        <View style={{ alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.xxl }}>
          <Trophy size={64} color={AMBER} strokeWidth={2} />
          <Text style={[Typography.headlineLg, { color: colors.onSurface, fontWeight: 'bold' }]}>{headline}</Text>
          {isMultiplayer && myPositionLabel ? (
            <Text style={[Typography.displayLg, { color: colors.onSurface, fontWeight: 'bold' }]}>{myPositionLabel}</Text>
          ) : isMultiplayer ? (
            <Text style={[Typography.displayLg, { color: colors.onSurfaceVariant }]}>…</Text>
          ) : (
            <Text style={[Typography.displayLg, { color: colors.onSurface }]}>{run.score}/{run.total}</Text>
          )}
        </View>

        {isMultiplayer && (
          <View style={{ gap: Spacing.sm }}>
            <Text style={[Typography.bodySm, { color: colors.onSurfaceVariant, fontWeight: '600', textAlign: 'center' }]}>{activityLabel} Leaderboard</Text>
            {waitingCount > 0 && (
              <Text style={[Typography.bodySm, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
                Waiting for {waitingCount} {waitingCount === 1 ? 'player' : 'players'}…
              </Text>
            )}
            <View
              style={{
                borderRadius: Radius.lg, borderWidth: 1.5, borderColor: colors.outlineVariant,
                backgroundColor: colors.surfaceContainerLow, overflow: 'hidden',
              }}
            >
              <ScrollView
                style={{ maxHeight: ROW_HEIGHT * MAX_VISIBLE_ROWS }}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                <View>
                  {sortedRows.length === 0 ? (
                    /* Loading placeholder while online state is being fetched */
                    [0, 1, 2].map((idx) => (
                      <View
                        key={`placeholder-${idx}`}
                        style={{
                          gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm,
                          borderBottomWidth: idx === 2 ? 0 : 1,
                          borderBottomColor: colors.outlineVariant,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                          <View style={{ width: 34, height: 14, borderRadius: Radius.sm, backgroundColor: colors.surfaceContainerHigh }} />
                          <View style={{ width: 32, height: 32, borderRadius: Radius.full, backgroundColor: colors.surfaceContainerHigh }} />
                          <View style={{ flex: 1, height: 14, borderRadius: Radius.sm, backgroundColor: colors.surfaceContainerHigh }} />
                        </View>
                        <View style={{ paddingLeft: 34 + 32 + Spacing.sm * 2 }}>
                          <View style={{ width: '60%', height: 10, borderRadius: Radius.sm, backgroundColor: colors.surfaceContainerHigh }} />
                        </View>
                      </View>
                    ))
                  ) : (
                    sortedRows.map((r, i) => (
                      <View
                        key={r.id}
                        style={{
                          gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm,
                          borderBottomWidth: i === sortedRows.length - 1 ? 0 : 1,
                          borderBottomColor: colors.outlineVariant,
                          backgroundColor: r.isMe ? StaticColors.selection.activeTint : 'transparent',
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                          <Text style={[Typography.bodyMd, { color: colors.onSurface, width: 34, textAlign: 'center', fontWeight: 'bold' }]}>
                            {i + 1}
                          </Text>
                          <Avatar name={r.name} size={32} imageUrl={null} />
                          <Text style={[Typography.bodyMd, { color: colors.onSurface, flex: 1 }]} numberOfLines={1}>{r.isMe ? 'You' : r.name}</Text>
                        </View>
                        <View style={{ paddingLeft: 34 + 32 + Spacing.sm * 2 }}>
                          {r.finished ? (
                            <Text style={[Typography.caption, { color: colors.onSurfaceVariant }]}>
                              {r.score}/{r.total} • {formatTime(r.timeMs)}
                            </Text>
                          ) : (
                            <ProgressPill
                              current={r.currentQuestionIndex}
                              total={r.total}
                              trackColor={colors.surfaceContainerHigh}
                              fillColor={GREEN}
                            />
                          )}
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: Spacing.marginMobile, paddingBottom: Spacing.lg, gap: Spacing.sm }}>
        <Button label="Results" variant="outline" onPress={() => setReviewOpen(true)} textColor={colors.onSurface} />
        {unlocked && (
          <Button
            label={exitLabel}
            variant="gradient"
            gradientColors={BrandGradients.discovery.colors}
            gradientStart={BrandGradients.discovery.start}
            gradientEnd={BrandGradients.discovery.end}
            textColor={StaticColors.discoveryText}
            onPress={onExit}
          />
        )}
      </View>

      <BottomSheet visible={reviewOpen} onClose={closeReview} maxHeightPercent={0.6}>
        <View style={reviewStyles.headerRow}>
          <Text style={[Typography.titleMedium, { color: colors.onSurface, fontWeight: '800' }]}>Review</Text>
          <Pressable
            onPress={closeReview}
            hitSlop={12}
            style={[reviewStyles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
          >
            <Ionicons name="close" size={18} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>

        <ScrollView
          style={reviewStyles.scrollView}
          contentContainerStyle={{ paddingBottom: Spacing.md, gap: Spacing.gutter }}
          showsVerticalScrollIndicator={false}
        >
          {run.questions.map((q, i) => {
            const correct = run.correct[i];
            return (
              <View
                key={q.id}
                style={{
                  borderRadius: Radius.xl, borderWidth: 1.5, borderColor: colors.outlineVariant,
                  backgroundColor: colors.surfaceContainerLow, paddingHorizontal: Spacing.lg,
                  paddingVertical: Spacing.lg, gap: Spacing.md, alignItems: 'center',
                }}
              >
                <Text style={[Typography.bodySm, { color: correct ? GREEN : StaticColors.wrongChipBg }]}>
                  {`Question ${i + 1}`}
                </Text>
                <Text style={[Typography.bodyMd, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
                  {q.question}
                </Text>
                <View
                  style={{
                    alignSelf: 'center',
                    backgroundColor: correct ? colors.correctBg : StaticColors.wrongChipBg,
                    borderRadius: Radius.full,
                    paddingHorizontal: Spacing.md,
                    paddingVertical: 7,
                  }}
                >
                  <Text style={{ color: correct ? colors.correctDark : StaticColors.wrongChipLetterBg, fontSize: 11, lineHeight: 18, fontWeight: 'bold' }}>
                    {correct ? 'CORRECT' : 'MISSED'}
                  </Text>
                </View>
                <Text style={[Typography.bodyMd, { color: GREEN, textAlign: 'center' }]}>
                  {resolveCorrectAnswerText(q)}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </BottomSheet>

      <QuitConfirmSheet
        visible={quitWarnOpen}
        onKeepPlaying={() => setQuitWarnOpen(false)}
        onQuit={() => { setQuitWarnOpen(false); onQuit(); }}
        title="Leave now?"
        subtitle={`You'll lose any rewards from this ${activityLabel.toLowerCase()}.`}
        keepLabel="STAY"
        quitLabel="QUIT"
      />
    </View>
  );
}

const reviewStyles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.md,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flexGrow: 0,
  },
});
