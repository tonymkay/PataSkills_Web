import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { SkillsFlow } from '@/components/play/SkillsFlow';

/**
 * Dedicated full-screen learning route.
 * Lives outside `app/(tabs)` so no bottom floating tab bar is rendered,
 * ensuring all learning stages (learning-style picker, track preview,
 * downloading, quiz questions, action buttons, and payment screens)
 * have full viewport height without being obstructed by bottom tabs.
 */
export default function PlayScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background || '#14171C' }]}>
      <SkillsFlow standalone />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
