import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { PlaySession } from '@/components/play/PlaySession';
import { LandingScreen } from '@/components/landing/LandingScreen';
import { DownloadingScreen } from '@/components/feedback/DownloadingScreen';
import { downloadSession, DownloadProgress } from '@/lib/downloadSession';
import { Track } from '@/lib/curriculum';
import { PlaySession as PlaySessionData } from '@/utils/groupSessions';
import { SignCatalogEntry } from '@/types/quiz';

type Stage = 'landing' | 'downloading' | 'session';

const VALID_TRACKS: Track[] = ['pairs', 'names', 'meanings', 'whereUsed', 'full', 'reading'];

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

  const runDownload = useCallback(async (track: Track = 'pairs') => {
    setStage('downloading');
    setError(null);
    setProgress(null);
    setCurrentTrack(track);
    const result = await downloadSession(track, (p) => setProgress(p));
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setSessions(result.sessions);
    setSignCatalog(result.signCatalog);
    setStage('session');
  }, []);

  const handleStart = useCallback(
    (track: Track) => {
      void runDownload(track);
    },
    [runDownload],
  );

  const handleRetry = useCallback(() => {
    void runDownload(urlTrack ?? 'pairs');
  }, [runDownload, urlTrack]);

  const handleExit = useCallback(() => {
    setStage('landing');
    setSessions([]);
    setSignCatalog([]);
    setError(null);
    setProgress(null);
  }, []);

  // Auto-start: resume from payment, or an ad link carrying a track param
  useEffect(() => {
    if (params.resume === 'true' || urlTrack) {
      void runDownload(urlTrack ?? 'pairs');
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
          onSwitchTrack={handleStart}
          onExit={handleExit}
        />
      ) : stage === 'downloading' ? (
        <DownloadingScreen progress={progress} error={error} onRetry={handleRetry} />
      ) : (
        <LandingScreen onStart={handleStart} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
