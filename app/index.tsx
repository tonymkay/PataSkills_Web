import React, { useMemo, useState, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { PlaySession } from '@/components/play/PlaySession';
import { LandingScreen } from '@/components/landing/LandingScreen';
import { QuizQuestion } from '@/types/quiz';
import questionsDataRaw from '@/data/questions.sample.json';
import { hydrateQuestionsList } from '@/utils/hydrateQuestions';

export default function PlayEntry() {
  const { colors } = useTheme();
  const [started, setStarted] = useState(false);

  // Load, sanitize, and hydrate questions from local JSON dataset with local sign assets
  const questions = useMemo<QuizQuestion[]>(() => {
    try {
      const data = questionsDataRaw as unknown as QuizQuestion[];
      if (Array.isArray(data) && data.length > 0) {
        return hydrateQuestionsList(data);
      }
    } catch (e) {
      console.warn('Failed to load questions data:', e);
    }
    return [];
  }, []);

  const handleStart = useCallback(() => setStarted(true), []);
  const handleExit = useCallback(() => setStarted(false), []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background || '#14171C' }]}>
      {started ? (
        <PlaySession questions={questions} onExit={handleExit} />
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
