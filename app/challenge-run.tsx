/**
 * Timed race quiz. Play questions are always single-choice, so every tap
 * auto-advances after a short highlight beat — no Continue, no FeedbackSheet.
 * Reuses TwoImageCard for option rendering (same cards as the main play deck).
 *
 * Scout / online branches land in a later step; companion is fully wired.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { TwoImageCard } from '@/components/cards/TwoImageCard';
import { QuitConfirmSheet } from '@/components/feedback/QuitConfirmSheet';
import { IconSize, Radius, Spacing, StaticColors, Typography, useTheme } from '@/theme/tokens';
import {
  getPendingChallengeRun,
  setFinishedChallengeRun,
  type FinishedChallengeRun,
  type PendingChallengeRun,
} from '@/lib/challengeRuntime';
import { getChallengeTimerSettings, secondsForDifficulty } from '@/lib/challengeTimerSettings';
import {
  sendCompanionFinish,
  sendCompanionProgress,
  startCompanionRace,
  stopCompanionSession,
} from '@/lib/challengeCompanionSession';
import { sendScoutFinish, sendScoutProgress, startScoutRace, stopScoutSession } from '@/lib/challengeScoutSession';
import { submitChallengeResult } from '@/lib/challenges';
import { useChallengeCompanionSession } from '@/hooks/useChallengeCompanionSession';
import { useChallengeScoutSession } from '@/hooks/useChallengeScoutSession';

const GREEN = StaticColors.selection.activeBorder;
const AUTO_ADVANCE_DELAY_MS = 260;
const FILL_EMPTY = 0;
const FILL_ARRIVED = 0.05;
const FILL_ANSWERED = 0.8;
const FILL_DONE = 1;

function Segment({ fill, trackColor }: { fill: number; trackColor: string }) {
  const w = useSharedValue(fill);
  useEffect(() => {
    w.value = withTiming(fill, { duration: 350 });
  }, [fill, w]);
  const animStyle = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={{ flex: 1, height: Spacing.base, borderRadius: Radius.full, backgroundColor: trackColor }}>
      <Animated.View style={[{ height: '100%', borderRadius: Radius.full, backgroundColor: GREEN }, animStyle]} />
    </View>
  );
}

function RunProgressBar({
  total, index, currentAnswered, onBack,
}: {
  total: number; index: number; currentAnswered: boolean; onBack: () => void;
}) {
  const { colors } = useTheme();
  const fillFor = (i: number) => {
    if (i < index) return FILL_DONE;
    if (i > index) return FILL_EMPTY;
    return currentAnswered ? FILL_ANSWERED : FILL_ARRIVED;
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm }}>
      <Pressable onPress={onBack} hitSlop={Spacing.base}>
        <ArrowLeft size={IconSize.header} color={colors.onSurface} strokeWidth={2} />
      </Pressable>
      <View style={{ flex: 1, flexDirection: 'row', gap: Spacing.xs }}>
        {Array.from({ length: total }).map((_, i) => (
          <Segment key={i} fill={fillFor(i)} trackColor={colors.surfaceContainerHigh} />
        ))}
      </View>
    </View>
  );
}

export default function ChallengeRunScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [pending] = useState<PendingChallengeRun | null>(() => getPendingChallengeRun());
  const questions = useMemo(() => pending?.questions ?? [], [pending]);
  const total = questions.length;

  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>(() => questions.map(() => false));
  const [quitOpen, setQuitOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const startedAtRef = useRef<number>(0);
  const advancingRef = useRef(false);
  const finishedRef = useRef(false);

  const current = questions[qIndex];
  const isCompanion = !!pending?.isCompanion;
  const isScout = !!pending?.isScout;
  const companionSession = useChallengeCompanionSession();
  const scoutSession = useChallengeScoutSession();
  const notifiedFinishRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!pending || total === 0) {
      router.back();
      return;
    }
    startedAtRef.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pending || total === 0) return undefined;
    let alive = true;
    (async () => {
      const settings = await getChallengeTimerSettings();
      const perQuestionSeconds = secondsForDifficulty(settings, pending.difficulty);
      if (!alive) return;
      const deadlineMs = perQuestionSeconds * 1000 * total;
      if (isCompanion) startCompanionRace(deadlineMs);
      else if (isScout) startScoutRace(deadlineMs);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, total]);

  useEffect(() => {
    if (!isCompanion) return;
    companionSession.players.forEach((p) => {
      if (!p.deviceId || p.deviceId === companionSession.deviceId || !p.finished || notifiedFinishRef.current.has(p.deviceId)) return;
      notifiedFinishRef.current.add(p.deviceId);
      const firstName = (p.displayName || 'Player').trim().split(' ')[0];
      const seconds = Math.max(0, Math.round((p.timeMs ?? 0) / 1000));
      setToast(`${firstName} finished in ${seconds}secs`);
    });
  }, [isCompanion, companionSession.deviceId, companionSession.players]);

  useEffect(() => {
    if (!isScout) return;
    scoutSession.players.forEach((p) => {
      if (!p.deviceId || p.deviceId === scoutSession.deviceId || !p.finished || notifiedFinishRef.current.has(p.deviceId)) return;
      notifiedFinishRef.current.add(p.deviceId);
      const firstName = (p.displayName || 'Player').trim().split(' ')[0];
      const seconds = Math.max(0, Math.round((p.timeMs ?? 0) / 1000));
      setToast(`${firstName} finished in ${seconds}secs`);
    });
  }, [isScout, scoutSession.deviceId, scoutSession.players]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const finishRun = useCallback((finalResults: boolean[]) => {
    if (!pending || finishedRef.current) return;
    finishedRef.current = true;
    const timeMs = Date.now() - startedAtRef.current;
    const score = finalResults.filter(Boolean).length;
    const run: FinishedChallengeRun = { ...pending, timeMs, score, total, correct: finalResults };
    setFinishedChallengeRun(run);
    if (isCompanion) sendCompanionFinish(score, total, timeMs);
    else if (isScout) sendScoutFinish(score, total, timeMs);
    else if (pending.challengeId) {
      submitChallengeResult(pending.challengeId, { timeMs, score, total }).catch(() => { /* best-effort */ });
    }
    router.replace('/challenge-results');
  }, [pending, total, isCompanion, isScout, router]);

  const advance = useCallback((correct: boolean) => {
    if (!current || advancingRef.current) return;
    advancingRef.current = true;

    const nextResults = [...results];
    nextResults[qIndex] = correct;
    setResults(nextResults);

    const nextIndex = qIndex + 1;
    const liveScore = nextResults.filter(Boolean).length;
    if (isCompanion) sendCompanionProgress(nextIndex, liveScore);
    else if (isScout) sendScoutProgress(nextIndex, liveScore);

    if (nextIndex >= total) {
      finishRun(nextResults);
    } else {
      setQIndex(nextIndex);
      setSelected(null);
      advancingRef.current = false;
    }
  }, [current, results, qIndex, total, isCompanion, isScout, finishRun]);

  useEffect(() => {
    if (selected === null || !current) return undefined;
    const t = setTimeout(() => advance(selected === current.correctAnswer), AUTO_ADVANCE_DELAY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const confirmLeave = () => {
    setQuitOpen(false);
    if (isCompanion) stopCompanionSession();
    else if (isScout) stopScoutSession();
    router.back();
  };

  const onBackPress = useCallback((): boolean => {
    setQuitOpen(true);
    return true;
  }, []);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [onBackPress]);

  if (!pending || !current) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: Spacing.marginMobile }}>
        <RunProgressBar
          total={total}
          index={qIndex}
          currentAnswered={selected !== null}
          onBack={() => setQuitOpen(true)}
        />
      </View>

      {toast && (
        <View style={{ alignItems: 'center', paddingHorizontal: Spacing.marginMobile, paddingBottom: Spacing.xs }}>
          <Text style={[Typography.bodySm, { color: colors.onSurfaceVariant }]}>{toast}</Text>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: Spacing.marginMobile, paddingTop: Spacing.gutter, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <TwoImageCard
          question={current}
          selectedOption={selected}
          onSelectOption={(i) => { if (selected === null) setSelected(i); }}
          onOpenLearnMore={() => {}}
          onToggleFlag={() => {}}
          isFlagged={false}
          evaluatedResult={
            selected === null ? null : selected === current.correctAnswer ? 'right' : 'wrong'
          }
        />
      </ScrollView>

      <QuitConfirmSheet
        visible={quitOpen}
        onKeepPlaying={() => setQuitOpen(false)}
        onQuit={confirmLeave}
        title="Leave the challenge?"
        subtitle="Your progress will be lost."
        keepLabel="KEEP GOING"
        quitLabel="LEAVE"
      />
    </View>
  );
}
