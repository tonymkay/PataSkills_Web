import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { CardDeck } from '@/components/cards/CardDeck';
import { SessionStateScreen } from '@/components/feedback/SessionStateScreen';
import { useKeys } from '@/hooks/useKeys';
import { groupQuestionsBySession } from '@/utils/groupSessions';
import { QuizQuestion } from '@/types/quiz';

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
  const sessions = useMemo(() => groupQuestionsBySession(questions), [questions]);
  const {
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

  const currentSession = sessions[sessionIndex];
  const hasMoreSessions = sessionIndex + 1 < sessions.length;

  // Initial spend on entry
  React.useEffect(() => {
    if (!ready || sessionStarted) return;

    let cancelled = false;

    async function tryStart() {
      if (isOutOfKeys) {
        if (!cancelled) {
          setOutOfKeysReason('entry');
          setFlowState('outOfKeys');
        }
        return;
      }

      const remaining = await spendKey();
      if (cancelled) return;

      if (remaining === null) {
        setOutOfKeysReason('entry');
        setFlowState('outOfKeys');
        return;
      }

      setSessionStarted(true);
    }

    void tryStart();

    return () => {
      cancelled = true;
    };
  }, [ready, sessionStarted, isOutOfKeys, spendKey]);

  const handleSessionComplete = useCallback(
    (stats: SessionStats) => {
      setLastStats(stats);
      setTotalXp((prev) => prev + stats.correctCount * XP_PER_CORRECT);
      setFlowState('topicComplete');
    },
    [],
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

  // Once keys refill or are purchased, immediately jump straight into the session
  React.useEffect(() => {
    if (flowState === 'outOfKeys' && !isOutOfKeys) {
      void resumeSessionWithNewKeys();
    }
  }, [flowState, isOutOfKeys, resumeSessionWithNewKeys]);

  React.useEffect(() => {
    if (showingExhaustedFallback && !isOutOfKeys) {
      onExit?.();
    }
  }, [showingExhaustedFallback, isOutOfKeys, onExit]);

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
        scoreText={`${lastStats.correctCount}/${lastStats.totalAnswered}`}
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
        scoreText={`${lastStats.correctCount}/${lastStats.totalAnswered}`}
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
