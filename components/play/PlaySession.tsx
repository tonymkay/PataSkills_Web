import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { CardDeck } from '@/components/cards/CardDeck';
import { SessionStateScreen } from '@/components/feedback/SessionStateScreen';
import { useKeys } from '@/hooks/useKeys';
import { getKeysState, LOW_KEYS_THRESHOLD } from '@/lib/keys';
import { groupQuestionsBySession } from '@/utils/groupSessions';
import { QuizQuestion } from '@/types/quiz';

const XP_PER_CORRECT = 10;

type FlowState = 'playing' | 'topicComplete' | 'sessionUnlocked' | 'keysReset' | 'lowKeys' | 'outOfKeys' | 'allComplete';

/** Why we ended up on the "out of keys" screen — determines what happens
 *  once the reset timer refills the balance:
 *  - 'entry': the user hadn't started `currentSession` yet (blocked right
 *    at the door — e.g. fresh app open with 0 keys). Resuming should NOT
 *    advance sessionIndex, just start the session that was blocked.
 *  - 'advance': the user had just finished a topic and was blocked trying
 *    to move to the next one. Resuming should advance sessionIndex, same
 *    as the normal (never-ran-out) continue flow. */
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
    balance,
    resetAt,
    ready,
    spendKey,
    startResetTimer,
    dismissLowKeysWarning,
    isOutOfKeys,
  } = useKeys();

  const [sessionIndex, setSessionIndex] = useState(0);
  const [flowState, setFlowState] = useState<FlowState>('playing');
  const [sessionStarted, setSessionStarted] = useState(false);
  const [lastStats, setLastStats] = useState<SessionStats>({ correctCount: 0, totalAnswered: 0 });
  const [totalXp, setTotalXp] = useState(0);
  const [keysAfterAdvance, setKeysAfterAdvance] = useState(0);
  const [outOfKeysReason, setOutOfKeysReason] = useState<OutOfKeysReason>(null);

  const currentSession = sessions[sessionIndex] ?? null;
  const hasMoreSessions = sessionIndex < sessions.length - 1;

  // Spend one key when entering the first session on load.
  const startCurrentSession = useCallback(async () => {
    if (sessionStarted) return true;
    if (isOutOfKeys) {
      setOutOfKeysReason('entry');
      setFlowState('outOfKeys');
      return false;
    }
    const remaining = await spendKey();
    if (remaining === null) {
      setOutOfKeysReason('entry');
      setFlowState('outOfKeys');
      return false;
    }
    setSessionStarted(true);
    setFlowState('playing');
    return true;
  }, [sessionStarted, isOutOfKeys, spendKey]);

  // Kick off the first session once keys are loaded. Guarded by a ref (not
  // just `sessionStarted`) so it fires exactly once — otherwise, whenever
  // `isOutOfKeys` flips (e.g. the reset timer refilling the balance while
  // sitting on the out-of-keys screen), `startCurrentSession` gets a new
  // identity and this effect would re-run, silently spending a key and
  // slamming flowState to 'playing' over whatever screen was showing.
  const hasAttemptedStartRef = React.useRef(false);
  React.useEffect(() => {
    if (!ready || sessionStarted || sessions.length === 0 || hasAttemptedStartRef.current) return;
    hasAttemptedStartRef.current = true;
    void startCurrentSession();
  }, [ready, sessionStarted, sessions.length, startCurrentSession]);

  const handleSessionComplete = useCallback(
    (stats: SessionStats) => {
      setLastStats(stats);
      setTotalXp((prev) => prev + stats.correctCount * XP_PER_CORRECT);
      setFlowState('topicComplete');
    },
    [],
  );

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

    const keyState = await getKeysState();
    if (remaining === LOW_KEYS_THRESHOLD && !keyState.lowKeysWarningShown) {
      setFlowState('lowKeys');
      return;
    }

    // A session was just successfully unlocked/paid for — always show the
    // unlock screen, even at 0 remaining. Skipping straight to 'playing'
    // when remaining was 0 meant that last-key session played silently
    // with no feedback, and the player only found out they were out of
    // keys after finishing it.
    setKeysAfterAdvance(remaining);
    setFlowState('sessionUnlocked');
  }, [hasMoreSessions, isOutOfKeys, spendKey]);

  const handleStartUnlockedSession = useCallback(async () => {
    if (outOfKeysReason === 'entry') {
      // No key was spent for currentSession yet (we never got past the
      // block) — spend one now that the balance is back, and start the
      // same session rather than advancing past it.
      const remaining = await spendKey();
      if (remaining === null) {
        // Safety net: somehow still out of keys — go back to that screen.
        setFlowState('outOfKeys');
        return;
      }
    } else {
      setSessionIndex((i) => i + 1);
    }
    setOutOfKeysReason(null);
    setSessionStarted(true);
    setFlowState('playing');
  }, [outOfKeysReason, spendKey]);

  // CTA on the "you have new keys" screen — hands off to the familiar
  // "unlocked next session" screen before actually starting it. Spends the
  // key for that next session right here (mirrors advanceToNextSession,
  // which also spends before showing sessionUnlocked) so the displayed
  // count is the post-spend balance, not the raw refilled one.
  const handleClaimNewKeys = useCallback(async () => {
    const remaining = await spendKey();
    if (remaining === null) {
      // Refill hasn't actually landed yet — back to the out-of-keys screen.
      setFlowState('outOfKeys');
      return;
    }
    setKeysAfterAdvance(remaining);
    setFlowState('sessionUnlocked');
  }, [spendKey]);

  const handleTopicContinue = useCallback(() => {
    void advanceToNextSession();
  }, [advanceToNextSession]);

  const handleLowKeysLater = useCallback(async () => {
    await dismissLowKeysWarning();
    setSessionIndex((i) => i + 1);
    setSessionStarted(true);
    setFlowState('playing');
  }, [dismissLowKeysWarning]);

  // True exactly when the "out of keys" screen is the one being shown to
  // the user right now — covers both the explicit flowState and the
  // sessions-exhausted fallback below, which reuses the same screen. Used
  // to know when to (re)start the reset timer.
  const showingOutOfKeysScreen = flowState === 'outOfKeys' || (ready && flowState === 'playing' && !currentSession);

  // Sessions-exhausted fallback specifically: there's no "next session" to
  // unlock here even once keys refill, so this path keeps the old
  // straight-back-to-homepage behaviour rather than the keysReset screen.
  const showingExhaustedFallback = ready && flowState === 'playing' && !currentSession;

  // The timer only starts once this screen is actually on screen — not
  // whenever the balance happens to hit 0 internally.
  React.useEffect(() => {
    if (showingOutOfKeysScreen) {
      void startResetTimer();
    }
  }, [showingOutOfKeysScreen, startResetTimer]);

  // The reset timer is the source of truth. Once it fires while the user
  // is sitting on the explicit out-of-keys screen, don't wait for a button
  // press — surface the "you have new keys" screen so they can claim them
  // and move on to the next session.
  React.useEffect(() => {
    if (flowState === 'outOfKeys' && !isOutOfKeys) {
      setFlowState('keysReset');
    }
  }, [flowState, isOutOfKeys]);

  // The exhausted-sessions fallback has no "next session" to offer even
  // once keys refill, so it just exits to the homepage as before.
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

  if (flowState === 'keysReset') {
    return (
      <SessionStateScreen
        kind="keysReset"
        keysLeft={balance ?? 0}
        onPrimaryPress={handleClaimNewKeys}
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
      />
    );
  }

  if (flowState === 'sessionUnlocked') {
    return (
      <SessionStateScreen
        kind="sessionUnlocked"
        keysLeft={keysAfterAdvance}
        onPrimaryPress={handleStartUnlockedSession}
      />
    );
  }

  if (flowState === 'lowKeys') {
    return (
      <SessionStateScreen
        kind="lowKeys"
        onSecondaryPress={() => void handleLowKeysLater()}
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
    <CardDeck
      key={sessionIndex}
      questions={currentSession.questions}
      keyBalance={balance ?? 0}
      onSessionComplete={handleSessionComplete}
      onClose={onExit}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
