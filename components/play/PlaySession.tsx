import React, { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Animated, { SlideInRight, SlideInLeft, FadeOut } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeContext';
import { CardDeck } from '@/components/cards/CardDeck';
import { SessionStateScreen } from '@/components/feedback/SessionStateScreen';
import { KeysOfferScreen } from '@/components/feedback/KeysOfferScreen';
import { ModeSwitcherSheet, ModeSwitcherHeading } from '@/components/landing/ModeSwitcherSheet';
import { LoadingQuestionsScreen } from '@/components/feedback/DownloadingScreen';
import { useKeys } from '@/hooks/useKeys';
import { PlaySession as PlaySessionData } from '@/utils/groupSessions';
import { SignCatalogEntry } from '@/types/quiz';
import { getLocalProgress, markTopicCompleted, markTrackCompleted } from '@/lib/progress';
import { trackTopicComplete, trackPaywallSeen } from '@/lib/deviceAnalytics';
import { recordXpEarned } from '@/lib/xp';
import { recordActivityToday } from '@/lib/streak';
import { Track } from '@/lib/curriculum';
import type { CurriculumSlug } from '@/constants/curriculumAssets';

const XP_PER_CORRECT = 5;

// 'keysOffer' is the first-look pack_20 upsell (KeysOfferScreen), shown
// before 'outOfKeys' (SessionStateScreen's full "Other ways to Proceed"
// list) the moment a learner actually runs out of keys -- see the
// 'entry'/'advance' branches below. Its "Maybe later" moves straight to
// 'outOfKeys'; resuming after a purchase attempt or the empty-sessions
// defensive fallback go straight to 'outOfKeys' without repeating the
// upsell.
type FlowState = 'playing' | 'topicComplete' | 'keysOffer' | 'outOfKeys' | 'loadingTopic';

type OutOfKeysReason = 'entry' | 'advance' | null;

interface SessionStats {
  correctCount: number;
  totalAnswered: number;
}

interface PlaySessionProps {
  sessions: PlaySessionData[];
  signCatalog?: SignCatalogEntry[];
  /** Which skill this session belongs to — drives which tracks
   *  ModeSwitcherSheet offers when switching mid-session. */
  skillId: CurriculumSlug;
  /** The track these sessions were derived from — drives the continuation
   *  flow (which mode is "current", and the per-track don't-show-again pref). */
  track: Track;
  /** True when this track came from a deep link (ad/payment link, or the
   *  resume param) rather than the learner picking a learning style on
   *  LearningStyleScreen — the mode-switcher sheet only opens on "Continue"
   *  in this case, since no style was ever chosen for them to keep. */
  deepLinked?: boolean;
  /** Starts a fresh download for a different track — wired to the same
   *  handler the initial LandingScreen mode picker uses. */
  onSwitchTrack: (track: Track) => void;
  onExit?: () => void;
  /** Forwarded from SkillsFlow — true only for the pre-unlock, first-ever
   *  onboarding run. Swaps the topicComplete screen's REDO SESSION button
   *  for an underlined "Go to home page" link (onExit); every other
   *  behavior — including still spending a key to continue — is unchanged. */
  isOnboarding?: boolean;
}

export function PlaySession({ sessions, signCatalog, skillId, track, deepLinked = false, onSwitchTrack, onExit, isOnboarding = false }: PlaySessionProps) {
  const { colors } = useTheme();
  const isFocused = useIsFocused();
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

  // Centralizes every path that surfaces the paywall (KeysOfferScreen or
  // SessionStateScreen kind="outOfKeys" directly) so trackPaywallSeen()
  // fires exactly once per encounter, from one place, instead of being
  // duplicated at each call site below. `toState` defaults to 'keysOffer'
  // (the normal first-look upsell) -- resumeSessionWithNewKeys passes
  // 'outOfKeys' explicitly since a second failed attempt skips straight
  // to the full "Other ways to Proceed" screen without repeating the
  // upsell, but it's still a fresh paywall encounter worth logging.
  const showPaywall = useCallback(
    (reason: Exclude<OutOfKeysReason, null>, toState: 'keysOffer' | 'outOfKeys' = 'keysOffer') => {
      setOutOfKeysReason(reason);
      void trackPaywallSeen(skillId, track, reason === 'advance' ? sessionIndex + 1 : null);
      setFlowState(toState);
    },
    [skillId, track, sessionIndex],
  );

  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [switcherHeading, setSwitcherHeading] = useState<ModeSwitcherHeading>('switch');
  // Direction for the questions <-> topic-complete entering slide — forward
  // on finishing a topic, backward when Redo Session sends the learner back
  // into the questions. Exiting is a plain fade regardless of direction: a
  // directional slide-out reads the *previous* render's direction (stale by
  // one transition whenever direction changes), which visibly looked like
  // the wrong screen moving the wrong way.
  const [screenDirection, setScreenDirection] = useState<'forward' | 'backward'>('forward');

  // Resume from last completed topic index
  React.useEffect(() => {
    getLocalProgress(skillId).then((p) => {
      if (p && p.completedTopics > 0 && sessions.length > 0) {
        setSessionIndex(Math.min(p.completedTopics, sessions.length - 1));
      }
    }).catch(() => {});
  }, [sessions, skillId]);

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
        showPaywall('entry');
        return;
      }

      try {
        const remaining = await spendKey();
        if (remaining === null) {
          showPaywall('entry');
          return;
        }
        setSessionStarted(true);
      } catch (err) {
        console.warn('[PlaySession] entry spendKey failed:', err);
        showPaywall('entry');
      }
    })();
  }, [ready]); // minimal deps — ref guards re-entry

  const handleSessionComplete = useCallback(
    (stats: SessionStats) => {
      setLastStats(stats);
      const earnedXp = stats.correctCount * XP_PER_CORRECT;
      setTotalXp((prev) => prev + earnedXp);
      void recordXpEarned(skillId, earnedXp);
      void recordActivityToday();
      // Source of truth: hitting topic complete screen marks topic done
      void markTopicCompleted(skillId, sessionIndex, sessions.length);
      void trackTopicComplete(skillId, track, sessionIndex, stats);
      setScreenDirection('forward');
      setFlowState('topicComplete');
    },
    [sessionIndex, sessions.length, skillId, track],
  );

  // Directly advances to next session if keys available, or shows outOfKeys.
  // Callers are expected to have already handled the !hasMoreSessions case
  // (routed to the mode-switcher sheet instead) — this is a defensive no-op
  // if it's ever reached with nothing left.
  const advanceToNextSession = useCallback(async () => {
    if (!hasMoreSessions) {
      return;
    }

    if (isOutOfKeys) {
      showPaywall('advance');
      return;
    }

    const remaining = await spendKey();
    if (remaining === null) {
      showPaywall('advance');
      return;
    }

    // Same "Loading questions…" beat every topic start gets, held for a
    // fixed 2s even though nothing's actually being fetched here — keeps
    // the transition consistent with the initial download and with
    // switching tracks.
    setScreenDirection('forward');
    setFlowState('loadingTopic');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setSessionIndex((i) => i + 1);
    setOutOfKeysReason(null);
    setSessionStarted(true);
    setFlowState('playing');
  }, [hasMoreSessions, isOutOfKeys, spendKey, showPaywall]);

  // Resume directly into playing once new keys become available
  const resumeSessionWithNewKeys = useCallback(async () => {
    const remaining = await spendKey();
    if (remaining === null) {
      showPaywall(outOfKeysReason ?? 'entry', 'outOfKeys');
      return;
    }

    if (outOfKeysReason === 'advance') {
      // Ran out of keys right at a topic transition — this resume is
      // itself a new topic starting, same loading beat applies.
      setFlowState('loadingTopic');
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setSessionIndex((i) => i + 1);
    }
    setOutOfKeysReason(null);
    setSessionStarted(true);
    setFlowState('playing');
  }, [outOfKeysReason, spendKey, showPaywall]);

  // Fires when the learner presses NEXT SESSION on the topicComplete screen.
  // Decides which continuation UI (if any) to show, per the spec:
  //  - no topics left in this track → mode switcher, "track complete" heading,
  //    always shown regardless of entry point (nowhere else to go).
  //  - next session locked (out of keys) → fall straight through to the
  //    existing outOfKeys screen, no continuation UI shown at all.
  //  - deep-linked entry (no learning style was ever chosen) → mode
  //    switcher, "switch" heading, every time.
  //  - otherwise (learner picked a style on LearningStyleScreen) → advance
  //    straight to the next session, no confirmation UI.
  const handleNextPress = useCallback(async () => {
    if (!hasMoreSessions) {
      // Source of truth for ModeSwitcherSheet's "N/6 tracks complete"
      // count and per-row DONE state — this is the one place we know for
      // certain every topic in `track` has been exhausted.
      void markTrackCompleted(skillId, track);
      setSwitcherHeading('trackComplete');
      setSwitcherVisible(true);
      return;
    }

    if (isOutOfKeys) {
      void advanceToNextSession();
      return;
    }

    if (deepLinked) {
      setSwitcherHeading('switch');
      setSwitcherVisible(true);
      return;
    }

    void advanceToNextSession();
  }, [hasMoreSessions, isOutOfKeys, deepLinked, advanceToNextSession, track, skillId]);

  const handleSelectTrack = useCallback(
    (newTrack: Track) => {
      setSwitcherVisible(false);
      onSwitchTrack(newTrack);
    },
    [onSwitchTrack],
  );

  // Redo = replay the same session from scratch (no key spend — already paid)
  const handleRedoSession = useCallback(() => {
    setLastStats({ correctCount: 0, totalAnswered: 0 });
    setScreenDirection('backward');
    setFlowState('playing');
  }, []);

  const showingOutOfKeysScreen =
    flowState === 'outOfKeys' || flowState === 'keysOffer' || (ready && flowState === 'playing' && !currentSession);

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
    if (isFocused && (flowState === 'outOfKeys' || flowState === 'keysOffer') && !isOutOfKeys) {
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
    return <LoadingQuestionsScreen />;
  }

  if (flowState === 'loadingTopic') {
    return <LoadingQuestionsScreen />;
  }

  if (flowState === 'keysOffer') {
    return (
      <KeysOfferScreen
        skillId={skillId}
        track={track}
        onMaybeLater={() => setFlowState('outOfKeys')}
      />
    );
  }

  if (flowState === 'outOfKeys') {
    return (
      <SessionStateScreen
        kind="outOfKeys"
        resetAt={resetAt}
        onPrimaryPress={resumeSessionWithNewKeys}
        onSecondaryPress={onExit}
        skillId={skillId}
        track={track}
      />
    );
  }

  if (flowState === 'topicComplete') {
    return (
      <Animated.View
        key="topicComplete"
        style={styles.container}
        entering={screenDirection === 'forward' ? SlideInRight.duration(280) : SlideInLeft.duration(280)}
        exiting={FadeOut.duration(180)}
      >
        <SessionStateScreen
          kind="topicComplete"
          subtitle={currentSession?.title}
          totalXp={lastStats.correctCount * XP_PER_CORRECT}
          progressText={`${sessionIndex + 1}/${sessions.length}`}
          scoreText={`${sessionIndex + 1}/${sessions.length}`}
          onPrimaryPress={handleNextPress}
          onSecondaryPress={isOnboarding ? onExit : handleRedoSession}
          isOnboarding={isOnboarding}
        />
        <ModeSwitcherSheet
          visible={switcherVisible}
          heading={switcherHeading}
          skillId={skillId}
          currentTrack={track}
          onSelectTrack={handleSelectTrack}
          onClose={() => setSwitcherVisible(false)}
        />
      </Animated.View>
    );
  }

  if (!currentSession) {
    return (
      <SessionStateScreen
        kind="outOfKeys"
        resetAt={resetAt}
        onSecondaryPress={onExit}
        skillId={skillId}
        track={track}
      />
    );
  }

  if (!sessionStarted) {
    return <LoadingQuestionsScreen />;
  }

  return (
    <Animated.View
      key="playing"
      style={[styles.container, { backgroundColor: colors.background }]}
      entering={screenDirection === 'forward' ? SlideInRight.duration(280) : SlideInLeft.duration(280)}
      exiting={FadeOut.duration(180)}
    >
      {currentSession.kind === 'reading' ? (
        <CardDeck
          key={`session-${sessionIndex}`}
          signs={currentSession.signs}
          signCatalog={signCatalog}
          sessionTitle={currentSession.title}
          keyBalance={isPremium ? 999999 : (balance ?? 0)}
          skillId={skillId}
          topicIndex={sessionIndex}
          onSessionComplete={handleSessionComplete}
          onExit={onExit}
        />
      ) : (
        <CardDeck
          key={`session-${sessionIndex}`}
          questions={currentSession.questions}
          signCatalog={signCatalog}
          sessionTitle={currentSession.title}
          keyBalance={isPremium ? 999999 : (balance ?? 0)}
          skillId={skillId}
          topicIndex={sessionIndex}
          onSessionComplete={handleSessionComplete}
          onExit={onExit}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
