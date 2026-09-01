import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import { CardDeck } from '@/components/cards/CardDeck';
import { SessionStateScreen } from '@/components/feedback/SessionStateScreen';
import { useKeys } from '@/hooks/useKeys';
import { groupQuestionsBySession } from '@/utils/groupSessions';
import { QuizQuestion } from '@/types/quiz';
import { getLocalProgress, markTopicCompleted } from '@/lib/progress';

const XP_PER_CORRECT = 10;

type FlowState = 'playing' | 'topicComplete' | 'outOfKeys' | 'allComplete';

type OutOfKeysReason = 'entry' | 'advance' | null;

interface SessionStats {
  correctCount: number;
  totalAnswered: number;
}

interface PlaySessionProps {
  questions: QuizQuestion[];
  onExit?: () => void;
}

export function PlaySession({ questions, onExit }: PlaySessionProps) {
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const sessions = useMemo(() => groupQuestionsBySession(questions), [questions]);
  const {
    balance,
    isPremium,
    resetAt,
    ready,
    spendKey,
    startResetTimer,
    isOutOfKeys,
  } = useKeys();

  const [sessionIndex, setSessionIndex] = useState(0);
  const [flowState, setFlowState] = useState<FlowState>('playing');
  const [sessionStarted, setSessionStarted] = useState(false);
  const [lastStats, setLastStats] = useState<SessionStats>({ correctCount: 0, totalAnswered: 0 });
  const [totalXp, setTotalXp] = useState(0);

  const [outOfKeysReason, setOutOfKeysReason] = useState<OutOfKeysReason>(null);

  // Resume from last completed topic index
  React.useEffect(() => {
    getLocalProgress().then((p) => {
      if (p && p.completedTopics > 0 && sessions.length > 0) {
        setSessionIndex(Math.min(p.completedTopics, sessions.length - 1));
      }
    }).catch(() => {});
  }, [sessions]);

  const currentSession = sessions[sessionIndex];
  const hasMoreSessions = sessionIndex + 1 < sessions.length;

  // ── Initial spend on entry ──────────────────────────────────────────
  // Uses a ref so the async spend only happens once, even if React
  // re-fires the effect due to state updates inside spendKey → refresh.
  const entryStartedRef = React.useRef(false);

  React.useEffect(() => {
    if (!ready || entryStartedRef.current) return;
    entryStartedRef.current = true;

    (async () => {
      if (isOutOfKeys) {
        setOutOfKeysReason('entry');
        setFlowState('outOfKeys');
        return;
      }

      try {
        const remaining = await spendKey();
        if (remaining === null) {
          setOutOfKeysReason('entry');
          setFlowState('outOfKeys');
          return;
        }
        setSessionStarted(true);
      } catch (err) {
        console.warn('[PlaySession] entry spendKey failed:', err);
        setOutOfKeysReason('entry');
        setFlowState('outOfKeys');
      }
    })();
  }, [ready]); // minimal deps — ref guards re-entry

  const handleSessionComplete = useCallback(
    (stats: SessionStats) => {
      setLastStats(stats);
      setTotalXp((prev) => prev + stats.correctCount * XP_PER_CORRECT);
      // Source of truth: hitting topic complete screen marks topic done
      void markTopicCompleted(sessionIndex, sessions.length);
      setFlowState('topicComplete');
    },
    [sessionIndex, sessions.length],
  );

  // Directly advances to next session if keys available, or shows outOfKeys
  const advanceToNextSession = useCallback(async () => {
    if (!hasMoreSessions) {
      setFlowState('allComplete');
      return;
    }

    if (isOutOfKeys) {
      setOutOfKeysReason('advance');
      setFlowState('outOfKeys');
      return;
    }

    const remaining = await spendKey();
    if (remaining === null) {
      setOutOfKeysReason('advance');
      setFlowState('outOfKeys');
      return;
    }

    // Immediately start the next session
    setSessionIndex((i) => i + 1);
    setOutOfKeysReason(null);
    setSessionStarted(true);
    setFlowState('playing');
  }, [hasMoreSessions, isOutOfKeys, spendKey]);

  // Resume directly into playing once new keys become available
  const resumeSessionWithNewKeys = useCallback(async () => {
    const remaining = await spendKey();
    if (remaining === null) {
      setFlowState('outOfKeys');
      return;
    }

    if (outOfKeysReason === 'advance') {
      setSessionIndex((i) => i + 1);
    }
    setOutOfKeysReason(null);
    setSessionStarted(true);
    setFlowState('playing');
  }, [outOfKeysReason, spendKey]);

  const handleTopicContinue = useCallback(() => {
    void advanceToNextSession();
  }, [advanceToNextSession]);

  // Redo = replay the same session from scratch (no key spend — already paid)
  const handleRedoSession = useCallback(() => {
    setLastStats({ correctCount: 0, totalAnswered: 0 });
    setFlowState('playing');
  }, []);

  const showingOutOfKeysScreen =
    flowState === 'outOfKeys' || (ready && flowState === 'playing' && !currentSession);

  const showingExhaustedFallback =
    ready && flowState === 'playing' && !currentSession;

  React.useEffect(() => {
    if (showingOutOfKeysScreen) {
      void startResetTimer();
    }
  }, [showingOutOfKeysScreen, startResetTimer]);

  // Once keys refill or are purchased, immediately jump straight into the session.
  // Gated on focus: this screen can sit mounted-but-backgrounded behind the
  // buy-keys/checkout flow (those routes are pushed, not replaced), and the
  // balance can change while it's back there. Without the focus check this
  // fires invisibly in the background AND again when the user actually
  // returns and taps "Continue Playing" — spending 2 keys for one unlock.
  React.useEffect(() => {
    if (isFocused && flowState === 'outOfKeys' && !isOutOfKeys) {
      void resumeSessionWithNewKeys();
    }
  }, [isFocused, flowState, isOutOfKeys, resumeSessionWithNewKeys]);

  React.useEffect(() => {
    if (showingExhaustedFallback && !isOutOfKeys) {
      onExit?.();
    }
  }, [showingExhaustedFallback, isOutOfKeys, onExit]);

  // ── Render gates ────────────────────────────────────────────────────

  if (!ready) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.onSurface} />
      </View>
    );
  }

  if (flowState === 'outOfKeys') {
    return (
      <SessionStateScreen
        kind="outOfKeys"
        resetAt={resetAt}
        onSecondaryPress={onExit}
      />
    );
  }

  if (flowState === 'allComplete') {
    return (
      <SessionStateScreen
        kind="topicComplete"
        title="All caught up!"
        subtitle="You've finished every sign pair in this set."
        totalXp={totalXp}
        progressText={`${sessions.length}/${sessions.length}`}
        scoreText={`${sessions.length}/${sessions.length}`}
        onPrimaryPress={() => {}}
        onSecondaryPress={handleRedoSession}
      />
    );
  }

  if (flowState === 'topicComplete') {
    return (
      <SessionStateScreen
        kind="topicComplete"
        subtitle={currentSession?.title}
        totalXp={lastStats.correctCount * XP_PER_CORRECT}
        progressText={`${sessionIndex + 1}/${sessions.length}`}
        scoreText={`${sessionIndex + 1}/${sessions.length}`}
        onPrimaryPress={handleTopicContinue}
        onSecondaryPress={handleRedoSession}
      />
    );
  }

  if (!currentSession) {
    return (
      <SessionStateScreen
        kind="outOfKeys"
        resetAt={resetAt}
        onSecondaryPress={onExit}
      />
    );
  }

  if (!sessionStarted) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.onSurface} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CardDeck
        key={`session-${sessionIndex}`}
        questions={currentSession.questions}
        sessionTitle={currentSession.title}
        keyBalance={isPremium ? 999999 : (balance ?? 0)}
        onSessionComplete={handleSessionComplete}
        onExit={onExit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
