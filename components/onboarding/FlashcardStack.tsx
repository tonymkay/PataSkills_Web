/**
 * Purely decorative flashcard fan for the pre-onboarding "Get Started"
 * screen. Text/options only — no sourced images, no real quiz data — so
 * it renders instantly. Center card is static; the two side cards start
 * stacked exactly behind it and animate outward slowly on mount (not a
 * snappy entrance — see GetStartedScreen's design note).
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { FontFamily, Radius, Spacing } from '@/theme/tokens';

interface CardOption {
  letter: string;
  label: string;
}

interface CardDef {
  colors: readonly [string, string];
  badge: string;
  tag: string;
  question: string;
  options: CardOption[];
}

const CARDS: CardDef[] = [
  {
    colors: ['#0ABFBF', '#0A8A9E'],
    badge: 'QUESTION 3',
    tag: 'TRUE / FALSE',
    question: 'The Equator passes through Kenya.',
    options: [
      { letter: 'A', label: 'True' },
      { letter: 'B', label: 'False' },
    ],
  },
  {
    colors: ['#3DCC6E', '#1E9E4E'],
    badge: 'QUESTION 1',
    tag: 'MULTIPLE CHOICE',
    question: 'Which of the following is the largest county in Kenya by area?',
    options: [
      { letter: 'A', label: 'Turkana' },
      { letter: 'B', label: 'Marsabit' },
      { letter: 'C', label: 'Wajir' },
      { letter: 'D', label: 'Garissa' },
    ],
  },
  {
    colors: ['#F5A623', '#E07B00'],
    badge: 'QUESTION 2',
    tag: 'MULTIPLE CHOICE',
    question: 'Which of the following is a renewable source of energy?',
    options: [
      { letter: 'A', label: 'Coal' },
      { letter: 'B', label: 'Solar' },
      { letter: 'C', label: 'Natural Gas' },
      { letter: 'D', label: 'Petroleum' },
    ],
  },
];

const REST_DELAY_MS = 400;
const REST_DURATION_MS = 1100;
const EASE_OUT = Easing.out(Easing.cubic);

function Card({ def }: { def: CardDef }) {
  return (
    <LinearGradient colors={def.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <View style={styles.cardTopRow}>
        <Text style={styles.cardBadge} numberOfLines={1}>{def.badge}</Text>
        <Text style={styles.cardTag} numberOfLines={1}>{def.tag}</Text>
      </View>
      <Text style={styles.cardQuestion} numberOfLines={4}>{def.question}</Text>
      <View style={styles.optionsList}>
        {def.options.map((opt) => (
          <View key={opt.letter} style={styles.optionRow}>
            <View style={styles.optionLetter}>
              <Text style={[styles.optionLetterText, { color: def.colors[1] }]}>{opt.letter}</Text>
            </View>
            <Text style={styles.optionLabel} numberOfLines={1}>{opt.label}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

interface SideCardProps {
  def: CardDef;
  direction: -1 | 1;
}

function SideCard({ def, direction }: SideCardProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      REST_DELAY_MS,
      withTiming(1, { duration: REST_DURATION_MS, easing: EASE_OUT }),
    );
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: direction * 92 * progress.value },
      { translateY: 14 * progress.value },
      { rotate: `${direction * 9 * progress.value}deg` },
      { scale: 1 - 0.08 * progress.value },
    ],
    opacity: 0.55 + 0.45 * progress.value,
  }));

  return (
    <Animated.View style={[styles.sideCardWrap, animatedStyle]}>
      <Card def={def} />
    </Animated.View>
  );
}

export function FlashcardStack() {
  const [leftDef, centerDef, rightDef] = CARDS;

  return (
    <View style={styles.container}>
      <SideCard def={leftDef} direction={-1} />
      <View style={styles.centerCardWrap}>
        <Card def={centerDef} />
      </View>
      <SideCard def={rightDef} direction={1} />
    </View>
  );
}

const CARD_WIDTH = 176;
const CARD_HEIGHT = 260;

const styles = StyleSheet.create({
  container: {
    height: CARD_HEIGHT + 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideCardWrap: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  centerCardWrap: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    zIndex: 2,
  },
  card: {
    flex: 1,
    borderRadius: Radius.xl,
    padding: Spacing.gutter,
    overflow: 'hidden',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  cardBadge: {
    fontFamily: FontFamily.bold,
    fontSize: 7,
    letterSpacing: 0.3,
    color: 'rgba(255,255,255,0.85)',
    flexShrink: 1,
  },
  cardTag: {
    fontFamily: FontFamily.bold,
    fontSize: 7,
    letterSpacing: 0.3,
    color: 'rgba(255,255,255,0.85)',
    flexShrink: 1,
  },
  cardQuestion: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    lineHeight: 18,
    color: '#FFFFFF',
    marginTop: Spacing.base,
  },
  optionsList: {
    marginTop: Spacing.base,
    gap: 3,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: Radius.md,
    paddingVertical: 6,
    paddingHorizontal: Spacing.base,
  },
  optionLetter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  optionLetterText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
  },
  optionLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: '#1A1A1A',
  },
});
