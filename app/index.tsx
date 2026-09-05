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

type TrackDetailOrigin = 'landing' | 'learning-style';

const VALID_TRACKS: Track[] = ['pairs', 'names', 'meanings', 'whereUsed', 'full', 'reading'];

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
  const [trackIsDeepLinked, setTrackIsDeepLinked] = useState(false);
  const [previewTrack, setPreviewTrack] = useState<Track | null>(null);
  const [trackDetailOrigin, setTrackDetailOrigin] = useState<TrackDetailOrigin>('landing');
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

  useEffect(() => {
    if (params.resume === 'true') {
      void runDownload(urlTrack ?? 'pairs', true);
    } else if (urlTrack) {
      openTrackDetail(urlTrack, 'landing');
    }
  }, []);

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
            track={currentTrack}
            deepLinked={trackIsDeepLinked}
            onSwitchTrack={handleSelectTrack}
            onExit={handleExit}
          />
        </View>
      ) : (
        <Animated.View
          key={stage}
          style={styles.stageContainer}
          entering={stageDirection === 'forward' ? SlideInRight.duration(280) : SlideInLeft.duration(280)}
          exiting={FadeOut.duration(180)}
        >
          {stage === 'downloading' ? (
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
      )}
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
