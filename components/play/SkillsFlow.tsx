import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { SlideInRight, SlideInLeft, FadeOut } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeContext';
import { PlaySession } from '@/components/play/PlaySession';
import { LandingScreen } from '@/components/landing/LandingScreen';
import { LearningStyleScreen } from '@/components/landing/LearningStyleScreen';
import { TrackDetailScreen } from '@/components/landing/TrackDetailScreen';
import { DownloadingScreen } from '@/components/feedback/DownloadingScreen';
import { downloadSession, DownloadProgress } from '@/lib/downloadSession';
import { navDismissTo } from '@/lib/navDirection';
import { areTabsUnlocked } from '@/lib/progress';
import { trackSessionStarted, trackTopicLoadingStarted } from '@/lib/deviceAnalytics';
import { Track } from '@/lib/curriculum';
import { PlaySession as PlaySessionData } from '@/utils/groupSessions';
import { SignCatalogEntry } from '@/types/quiz';
import type { CurriculumSlug } from '@/constants/curriculumAssets';
import { LANDING_SKILLS } from '@/constants/skills';

type Stage = 'landing' | 'learning-style' | 'track-detail' | 'downloading' | 'session';

type TrackDetailOrigin = 'landing' | 'learning-style';

const DEFAULT_SKILL: CurriculumSlug = 'driving-theory';

// All six Track values are accepted again — lib/curriculum.ts's
// deriveTrack() always supported the four driving-theory role tracks
// (pairs/names/meanings/whereUsed), they just weren't reachable from any
// URL/UI surface. Which of these a given skill actually shows in its
// picker is now decided per-curriculum by detectAvailableTracks()/
// getAvailableTracks() (lib/curriculum.ts), not by this list — this list
// only decides which ?track= values parse at all, same backward-
// compatible spirit as parseSkill() below.
const VALID_TRACKS: Track[] = ['pairs', 'names', 'meanings', 'whereUsed', 'full', 'reading'];

const MIN_LOADING_MS = 2000;

function parseTrack(value?: string): Track | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? (trimmed as Track) : null;
}

// Validated against LANDING_SKILLS, mirroring parseTrack() above — an
// unrecognized/mistyped ?skill= falls back to DEFAULT_SKILL rather than
// erroring, same backward-compatible spirit as an old track-only link.
function parseSkill(value?: string): CurriculumSlug | null {
  return LANDING_SKILLS.some((s) => s.id === value) ? (value as CurriculumSlug) : null;
}

/**
 * The full Skills Corner -> learning-style -> track-detail -> downloading
 * -> session state machine. Lives here (not directly in a route file) so
 * it can be rendered from two places: app/index.tsx (pre-unlock gate, no
 * tab bar) and app/(tabs)/skills.tsx (post-unlock "Skills" tab) — see the
 * routing restructure section of the tabbed-home implementation plan.
 * Behavior is unchanged from the original single-route app/index.tsx.
 */
interface SkillsFlowProps {
  embedded?: boolean;
  standalone?: boolean;
  /** True only when rendered from the pre-unlock root gate's first-ever
   *  run (app/index.tsx, after GetStartedScreen). Forwarded to PlaySession
   *  so the topicComplete screen swaps its REDO SESSION button for an
   *  underlined "Go to home page" link — see docs for the onboarding plan. */
  isOnboarding?: boolean;
}

export function SkillsFlow({ embedded = false, standalone = false, isOnboarding = false }: SkillsFlowProps = {}) {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ resume?: string; track?: string; skill?: string; topic?: string }>();
  const urlTrack = parseTrack(params.track);
  const initialSkill = parseSkill(params.skill) ?? DEFAULT_SKILL;

  const [selectedSkill, setSelectedSkill] = useState<CurriculumSlug>(initialSkill);
  const [stage, setStage] = useState<Stage>(() => {
    if (standalone) {
      if (params.resume === 'true') return 'downloading';
      if (urlTrack) return 'track-detail';
      if (params.skill) return 'learning-style';
    }
    return 'landing';
  });
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<PlaySessionData[]>([]);
  const [signCatalog, setSignCatalog] = useState<SignCatalogEntry[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track>('full');
  const [trackIsDeepLinked, setTrackIsDeepLinked] = useState(false);
  const [previewTrack, setPreviewTrack] = useState<Track | null>(null);
  const [trackDetailOrigin, setTrackDetailOrigin] = useState<TrackDetailOrigin>('landing');
  const [stageDirection, setStageDirection] = useState<'forward' | 'backward'>('forward');

  const runDownload = useCallback(async (track: Track = 'full', deepLinked = false, skillOverride?: CurriculumSlug) => {
    const skill = skillOverride ?? selectedSkill;
    setStageDirection('forward');
    setStage('downloading');
    setError(null);
    setProgress(null);
    setCurrentTrack(track);
    setTrackIsDeepLinked(deepLinked);
    void trackTopicLoadingStarted(skill, track);
    const startedAt = Date.now();
    const result = await downloadSession(track, skill, (p) => setProgress(p));
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_LOADING_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS - elapsed));
    }
    if ('error' in result) {
      setError(result.error);
      return;
    }
    // Topic-level deep link (§E of the multi-skill architecture doc): jump
    // straight to whichever session contains this topicId instead of
    // session 1. Only meaningful for track=full on topic-grouped skills —
    // pairId-grouped skills (driving-theory) and track=reading sessions
    // never carry a matching topicId, so the search below just finds
    // nothing and silently falls through to session 1, exactly like an
    // unrecognized topicId would. Never treated as an error.
    let sessions = result.sessions;
    if (params.topic) {
      const topicSessionIndex = sessions.findIndex(
        (s) => s.kind === 'quiz' && s.questions.some((q) => q.topicId === params.topic),
      );
      if (topicSessionIndex > 0) {
        sessions = sessions.slice(topicSessionIndex);
      }
    }
    setSessions(sessions);
    setSignCatalog(result.signCatalog);
    setStage('session');
    void trackSessionStarted(skill, track);
  }, [selectedSkill, params.topic]);

  const handleStart = useCallback((skillId: CurriculumSlug) => {
    setSelectedSkill(skillId);
    setStageDirection('forward');
    setStage('learning-style');
  }, []);

  const handleBackToLanding = useCallback(() => {
    if (standalone) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/skills');
      }
      return;
    }
    setStageDirection('backward');
    setStage('landing');
  }, [standalone, router]);

  const openTrackDetail = useCallback((track: Track, origin: TrackDetailOrigin) => {
    setPreviewTrack(track);
    setTrackDetailOrigin(origin);
    setStageDirection('forward');
    setStage('track-detail');
  }, []);

  const closeTrackDetail = useCallback(() => {
    if (standalone && trackDetailOrigin === 'landing') {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/skills');
      }
      return;
    }
    setStageDirection('backward');
    setStage(trackDetailOrigin);
  }, [standalone, trackDetailOrigin, router]);

  const handlePreviewFromLanding = useCallback(
    (track: Track) => openTrackDetail(track, 'landing'),
    [openTrackDetail],
  );

  const handlePreviewFromLearningStyle = useCallback(
    (track: Track) => openTrackDetail(track, 'learning-style'),
    [openTrackDetail],
  );

  const handleStartFromTrackDetail = useCallback(
    (track: Track) => {
      void runDownload(track, trackDetailOrigin === 'landing');
    },
    [runDownload, trackDetailOrigin],
  );

  const handleSelectTrack = useCallback(
    (track: Track) => {
      void runDownload(track);
    },
    [runDownload],
  );

  const handleRetry = useCallback(() => {
    void runDownload(urlTrack ?? 'full', trackIsDeepLinked);
  }, [runDownload, urlTrack, trackIsDeepLinked]);

  const handleExit = useCallback(async () => {
    // Don't clear `sessions` here: it's still PlaySession's live prop
    // while this await is in flight, and clearing it synchronously made
    // currentSession briefly undefined — tripping PlaySession's
    // `!currentSession` fallback (the outOfKeys "Other ways to Proceed"
    // screen) for one paint before navigation landed. Clear only once
    // we've decided PlaySession is unmounting or the stage is leaving
    // 'session', below.
    const unlocked = await areTabsUnlocked();
    if (unlocked) {
      // /(tabs)/home is already sitting underneath this pushed /play route
      // for every real exit (tapped from a Home/Skills card) — dismissTo
      // pops back down to that existing instance instead of replace()
      // stacking a duplicate (tabs) entry on top of it. Falls back to a
      // plain replace on its own if there's genuinely no history (e.g. a
      // cold deep link straight into /play), same as before this change.
      navDismissTo(router, '/(tabs)/home');
      return;
    }

    if (standalone) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/skills');
      }
      return;
    }

    setSessions([]);
    setSignCatalog([]);
    setError(null);
    setProgress(null);
    setStageDirection('backward');
    setStage('landing');
  }, [router, standalone]);

  useEffect(() => {
    // Resolve skill before dispatching either mount-time flow below.
    // Passed explicitly into runDownload as skillOverride rather than
    // relying solely on the setSelectedSkill call landing before
    // runDownload reads selectedSkill from closure — that update is
    // async, so without the explicit override this effect could still
    // download DEFAULT_SKILL's curriculum on the very first deep-linked
    // load (Bug B, §B.2/§C.1 of the multi-skill architecture doc).
    const urlSkill = parseSkill(params.skill);
    if (urlSkill) setSelectedSkill(urlSkill);

    if (params.resume === 'true') {
      void runDownload(urlTrack ?? 'full', true, urlSkill ?? DEFAULT_SKILL);
    } else if (urlTrack) {
      openTrackDetail(urlTrack, 'landing');
    } else if (standalone && urlSkill) {
      setStage('learning-style');
    }
    // Deliberately keyed on the raw param strings, not just `[]`. Under
    // expo-router's <Tabs>, this screen (the "Skills" tab) stays mounted
    // once visited — it does not remount the way a plain stack push to
    // '/' with new params does. Home's per-skill cards resume a session
    // by navigating here with fresh ?resume=&skill= params (see
    // components/home/SkillProgressCard.tsx), so this effect has to
    // react to those params changing, not just fire once on first mount,
    // or a second card tap after the first would silently no-op.
  }, [params.resume, params.skill, params.track, params.topic, standalone]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background || '#14171C',
          paddingTop: embedded ? 0 : insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {stage === 'session' ? (
        // No inner slide wrapper here — this stage is what a browser
        // back-nav from /subscription-plans or /subscription-confirm
        // lands back on. Wrapping it in a second, independently-directed
        // animation (stageDirection, which back-nav never updates) meant
        // that return trip played two un-synced slides at once, unlike
        // subscription-plans <-> subscription-confirm which only ever
        // have the single page-level ScreenTransition slide. PlaySession
        // already animates its own internal states (playing/topicComplete),
        // so it doesn't need this outer wrapper.
        <View style={styles.stageContainer}>
          <PlaySession
            sessions={sessions}
            signCatalog={signCatalog}
            skillId={selectedSkill}
            track={currentTrack}
            deepLinked={trackIsDeepLinked}
            onSwitchTrack={handleSelectTrack}
            onExit={handleExit}
            isOnboarding={isOnboarding}
          />
        </View>
      ) : (
        <Animated.View
          key={stage}
          style={styles.stageContainer}
          entering={
            stage === 'landing'
              ? undefined
              : stageDirection === 'forward'
                ? SlideInRight.duration(280)
                : SlideInLeft.duration(280)
          }
          exiting={stage === 'landing' ? undefined : FadeOut.duration(180)}
        >
          {stage === 'downloading' ? (
            <DownloadingScreen progress={progress} error={error} onRetry={handleRetry} />
          ) : stage === 'track-detail' ? (
            <TrackDetailScreen
              skillId={selectedSkill}
              track={previewTrack}
              onStartPractice={handleStartFromTrackDetail}
              onBack={closeTrackDetail}
              isOnboarding={isOnboarding}
            />
          ) : stage === 'learning-style' ? (
            <LearningStyleScreen
              skillId={selectedSkill}
              onPreviewTrack={handlePreviewFromLearningStyle}
              onBack={handleBackToLanding}
              isOnboarding={isOnboarding}
            />
          ) : (
            <LandingScreen onStart={handleStart} onRestore={handlePreviewFromLanding} isOnboarding={isOnboarding} />
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stageContainer: {
    flex: 1,
  },
});
