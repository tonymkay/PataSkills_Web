import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { PlaySession } from '@/components/play/PlaySession';
import { LandingScreen } from '@/components/landing/LandingScreen';
import { DownloadingScreen } from '@/components/feedback/DownloadingScreen';
import { QuizQuestion } from '@/types/quiz';
import { downloadSession, DownloadProgress } from '@/lib/downloadSession';

type Stage = 'landing' | 'downloading' | 'session';

export default function PlayEntry() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ resume?: string }>();
  const [stage, setStage] = useState<Stage>('landing');
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);

  const runDownload = useCallback(async () => {
    setStage('downloading');
    setError(null);
    setProgress(null);
    const result = await downloadSession((p) => setProgress(p));
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setQuestions(result.questions);
    setStage('session');
  }, []);

  const handleStart = useCallback(() => {
    void runDownload();
  }, [runDownload]);

  const handleRetry = useCallback(() => {
    void runDownload();
  }, [runDownload]);

  const handleExit = useCallback(() => {
    setStage('landing');
    setQuestions([]);
    setError(null);
    setProgress(null);
  }, []);

  // Auto-resume session if returning from successful payment
  useEffect(() => {
    if (params.resume === 'true') {
      void runDownload();
    }
  }, [params.resume, runDownload]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background || '#14171C' }]}>
      {stage === 'session' ? (
        <PlaySession questions={questions} onExit={handleExit} />
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
