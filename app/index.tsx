import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { SlideInRight, SlideInLeft, FadeOut } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeContext';
import { PlaySession } from '@/components/play/PlaySession';
import { LandingScreen } from '@/components/landing/LandingScreen';
import { LearningStyleScreen } from '@/components/landing/LearningStyleScreen';
import { TrackDetailScreen } from '@/components/landing/TrackDetailScreen';
import { DownloadingScreen } from '@/components/feedback/DownloadingScreen';
import { downloadSession, DownloadProgress } from '@/lib/downloadSession';
import { Track } from '@/lib/curriculum';
import { PlaySession as PlaySessionData } from '@/utils/groupSessions';
import { SignCatalogEntry } from '@/types/quiz';
import { ScreenTransition } from '@/components/nav/ScreenTransition';

type Stage = 'landing' | 'learning-style' | 'track-detail' | 'downloading' | 'session';

// Where a track-detail preview was opened from — determines both what the
// back button returns to, and (since only the deep-link entry point skips
// an explicit style choice) whether starting practice counts as deep-linked.
type TrackDetailOrigin = 'landing' | 'learning-style';

const VALID_TRACKS: Track[] = ['pairs', 'names', 'meanings', 'whereUsed', 'full', 'reading'];

// Same reasoning as PlaySession's topic-transition delay: keep the
// "Loading questions…" beat feeling consistent even when the real
// download resolves almost instantly (cached, or a fast connection).
const MIN_LOADING_MS = 2000;

function parseTrack(value?: string): Track | null {
  return VALID_TRACKS.includes(value as Track) ? (value as Track) : null;
}

export default function PlayEntry() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ resume?: string; track?: string }>();
  const urlTrack = parseTrack(params.track);
  const [stage, setStage] = useState<Stage>('landing');
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<PlaySessionData[]>([]);
  const [signCatalog, setSignCatalog] = useState<SignCatalogEntry[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track>('pairs');
  // Whether the current track came from a deep link (ad/payment link with a
  // ?track= param) rather than the learner explicitly picking a learning
  // style — drives whether PlaySession opens the mode-switcher sheet on
  // every "Continue" (deep link, no style was ever chosen) or just advances
  // straight to the next session (LearningStyleScreen already asked).
  const [trackIsDeepLinked, setTrackIsDeepLinked] = useState(false);
  // Track being previewed on the track-detail page (picked from
  // LearningStyleScreen's list, or a ?track= deep link straight from
  // Landing) — null means the page has nothing to show.
  const [previewTrack, setPreviewTrack] = useState<Track | null>(null);
  const [trackDetailOrigin, setTrackDetailOrigin] = useState<TrackDetailOrigin>('landing');
  // Direction for the stage transition animation — 'forward' slides the new
  // stage in from the right, 'backward' slides it in from the left. Exiting
  // is a plain fade regardless of direction: a directional slide-out reads
  // the *previous* render's direction (stale by one transition whenever
  // direction changes, e.g. forward-forward-back), which visibly looked
  // like the wrong screen moving the wrong way — same reasoning Bluesky's
  // own ScreenTransition component uses (FadeOut for exit, directional
  // SlideIn for enter).
  const [stageDirection, setStageDirection] = useState<'forward' | 'backward'>('forward');

  const runDownload = useCallback(async (track: Track = 'pairs', deepLinked = false) => {
    setStageDirection('forward');
    setStage('downloading');
    setError(null);
    setProgress(null);
    setCurrentTrack(track);
    setTrackIsDeepLinked(deepLinked);
    const startedAt = Date.now();
    const result = await downloadSession(track, (p) => setProgress(p));
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_LOADING_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS - elapsed));
    }
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setSessions(result.sessions);
    setSignCatalog(result.signCatalog);
    setStage('session');
  }, []);

  const handleStart = useCallback(() => {
    setStageDirection('forward');
    setStage('learning-style');
  }, []);

  const handleBackToLanding = useCallback(() => {
    setStageDirection('backward');
    setStage('landing');
  }, []);

  const openTrackDetail = useCallback((track: Track, origin: TrackDetailOrigin) => {
    setPreviewTrack(track);
    setTrackDetailOrigin(origin);
    setStageDirection('forward');
    setStage('track-detail');
  }, []);

  const closeTrackDetail = useCallback(() => {
    setStageDirection('backward');
    setStage(trackDetailOrigin);
  }, [trackDetailOrigin]);

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
    void runDownload(urlTrack ?? 'pairs', trackIsDeepLinked);
  }, [runDownload, urlTrack, trackIsDeepLinked]);

  const handleExit = useCallback(() => {
    setStageDirection('backward');
    setStage('landing');
    setSessions([]);
    setSignCatalog([]);
    setError(null);
    setProgress(null);
  }, []);

  // Auto-start: resume from payment. A bare ?track= link (ad link, no
  // resume) opens the track-detail page instead — see openTrackDetail above.
  useEffect(() => {
    if (params.resume === 'true') {
      void runDownload(urlTrack ?? 'pairs', true);
    } else if (urlTrack) {
      openTrackDetail(urlTrack, 'landing');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Plain View with a static inset instead of SafeAreaView: SafeAreaView
  // re-derives/re-lays-out its own insets on web, and doing that inside a
  // node that ScreenTransition is actively sliding with translateX caused
  // the jank you saw on this screen (the confirm/plans screens never had
  // this — they already just use a fixed insets.top padding number).
  return (
    <ScreenTransition>
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background || '#14171C',
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <Animated.View
        key={stage}
        style={styles.stageContainer}
        entering={stageDirection === 'forward' ? SlideInRight.duration(280) : SlideInLeft.duration(280)}
        exiting={FadeOut.duration(180)}
      >
      {stage === 'session' ? (
        <PlaySession
          sessions={sessions}
          signCatalog={signCatalog}
          track={currentTrack}
          deepLinked={trackIsDeepLinked}
          onSwitchTrack={handleSelectTrack}
          onExit={handleExit}
        />
      ) : stage === 'downloading' ? (
        <DownloadingScreen progress={progress} error={error} onRetry={handleRetry} />
      ) : stage === 'track-detail' ? (
        <TrackDetailScreen
          track={previewTrack}
          onStartPractice={handleStartFromTrackDetail}
          onBack={closeTrackDetail}
        />
      ) : stage === 'learning-style' ? (
        <LearningStyleScreen onPreviewTrack={handlePreviewFromLearningStyle} onBack={handleBackToLanding} />
      ) : (
        <LandingScreen onStart={handleStart} onRestore={handlePreviewFromLanding} />
      )}
      </Animated.View>
    </View>
    </ScreenTransition>
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
