import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { PlaySession } from '@/components/play/PlaySession';
import { LandingScreen } from '@/components/landing/LandingScreen';
import { LearningStyleScreen } from '@/components/landing/LearningStyleScreen';
import { TrackDetailSheet } from '@/components/landing/TrackDetailSheet';
import { DownloadingScreen } from '@/components/feedback/DownloadingScreen';
import { downloadSession, DownloadProgress } from '@/lib/downloadSession';
import { Track } from '@/lib/curriculum';
import { PlaySession as PlaySessionData } from '@/utils/groupSessions';
import { SignCatalogEntry } from '@/types/quiz';

type Stage = 'landing' | 'learning-style' | 'downloading' | 'session';

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
  // A ?track= deep link (no resume) previews here instead of auto-starting —
  // TrackDetailSheet over the landing screen, same as picking a style from
  // LearningStyleScreen. null hides it.
  const [deepLinkPreviewTrack, setDeepLinkPreviewTrack] = useState<Track | null>(null);

  const runDownload = useCallback(async (track: Track = 'pairs', deepLinked = false) => {
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
    setStage('learning-style');
  }, []);

  const handleBackToLanding = useCallback(() => {
    setStage('landing');
  }, []);

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
    setStage('landing');
    setSessions([]);
    setSignCatalog([]);
    setError(null);
    setProgress(null);
  }, []);

  // Auto-start: resume from payment. A bare ?track= link (ad link, no
  // resume) previews instead — see deepLinkPreviewTrack below.
  useEffect(() => {
    if (params.resume === 'true') {
      void runDownload(urlTrack ?? 'pairs', true);
    } else if (urlTrack) {
      setDeepLinkPreviewTrack(urlTrack);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background || '#14171C' }]}>
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
      ) : stage === 'learning-style' ? (
        <LearningStyleScreen onSelectTrack={handleSelectTrack} onBack={handleBackToLanding} />
      ) : (
        <>
          <LandingScreen onStart={handleStart} onRestore={handleSelectTrack} />
          <TrackDetailSheet
            track={deepLinkPreviewTrack}
            onStartPractice={(track) => {
              setDeepLinkPreviewTrack(null);
              void runDownload(track, true);
            }}
            onClose={() => setDeepLinkPreviewTrack(null)}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
