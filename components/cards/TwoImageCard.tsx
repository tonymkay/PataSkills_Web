import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ImageStyle,
  StyleProp,
} from 'react-native';
import { Image } from 'expo-image';
import Svg, { Polygon, Path, Rect, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeContext';
import { Typography, FontFamily } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { StaticColors } from '@/constants/colors';
import { QuizQuestion } from '@/types/quiz';
import { FlagIcon } from '@/components/feedback/FlagIcon';

export type QuestionLayoutType = 'single_image' | 'two_image' | 'text_only';

export function resolveQuestionType(question: QuizQuestion): QuestionLayoutType {
  // 1. Two image choice
  if (
    question.format === 'twoImageChoice' ||
    question.format === 'imageChoice' ||
    (Array.isArray(question.images) && question.images.length >= 2)
  ) {
    return 'two_image';
  }

  // 2. Single image with text answers
  if (
    question.format === 'singleImageChoice' ||
    Boolean(question.image) ||
    (question.format === 'imageTextChoice' && (question.image || question.signRef))
  ) {
    return 'single_image';
  }

  // 3. Pure text / True-False question
  return 'text_only';
}

interface TwoImageCardProps {
  question: QuizQuestion;
  selectedOption: number | null;
  onSelectOption: (index: number) => void;
  onOpenLearnMore: () => void;
  onToggleFlag: (flagged: boolean) => void;
  isFlagged: boolean;
  evaluatedResult?: 'right' | 'wrong' | null;
}

// Crisp Fallback Road Sign Graphic when URI / asset is null
function RoadSignGraphic({
  source,
  type,
  imageStyle,
  svgSize = 120,
}: {
  source?: any;
  type: 'yield' | 'children' | 'pedestrian' | 'general';
  imageStyle?: StyleProp<ImageStyle>;
  svgSize?: number;
}) {
  if (source) {
    const imageSource = typeof source === 'string' ? { uri: source } : source;
    return (
      <Image
        source={imageSource}
        style={[styles.signImage, imageStyle]}
        contentFit="contain"
        cachePolicy="disk"
      />
    );
  }

  // Yield Sign (Inverted Triangle with Pole)
  if (type === 'yield') {
    return (
      <View style={styles.svgSignWrapper}>
        <Svg width={svgSize} height={(svgSize * 110) / 120} viewBox="0 0 120 110">
          {/* Silver mounting pole */}
          <Rect x="56" y="90" width="8" height="20" fill="#94A3B8" rx="2" />
          {/* Outer Red Inverted Triangle */}
          <Polygon points="10,10 110,10 60,95" fill="#EF4444" stroke="#DC2626" strokeWidth="2" />
          {/* Inner White Triangle */}
          <Polygon points="26,18 94,18 60,78" fill="#FFFFFF" />
        </Svg>
      </View>
    );
  }

  // Children Crossing Sign (Triangle with Pole)
  if (type === 'children') {
    return (
      <View style={styles.svgSignWrapper}>
        <Svg width={svgSize} height={svgSize} viewBox="0 0 120 120">
          {/* Silver pole */}
          <Rect x="56" y="100" width="8" height="20" fill="#94A3B8" rx="2" />
          {/* Red Triangle */}
          <Polygon points="60,10 110,95 10,95" fill="#EF4444" stroke="#DC2626" strokeWidth="2" />
          {/* White Inner Triangle */}
          <Polygon points="60,25 96,88 24,88" fill="#FFFFFF" />
          {/* Silhouette of adults/children */}
          <G fill="#1E293B">
            {/* Child head & body */}
            <Path d="M44 54a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-3 4h6l2 12-4 12h-3l2-10-3-4-2 10h-3l2-14 2-6z" />
            {/* Adult head & body */}
            <Path d="M68 48a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm-4 5h8l3 15-5 16h-4l3-13-5-6-3 13h-4l3-18 4-7z" />
          </G>
        </Svg>
      </View>
    );
  }

  // Pedestrian Zebra Crossing Sign (Triangle with Pole)
  return (
    <View style={styles.svgSignWrapper}>
      <Svg width={svgSize} height={svgSize} viewBox="0 0 120 120">
        {/* Silver pole */}
        <Rect x="56" y="100" width="8" height="20" fill="#94A3B8" rx="2" />
        {/* Red Triangle */}
        <Polygon points="60,10 110,95 10,95" fill="#EF4444" stroke="#DC2626" strokeWidth="2" />
        {/* White Inner Triangle */}
        <Polygon points="60,25 96,88 24,88" fill="#FFFFFF" />
        {/* Zebra Crossing lines */}
        <G fill="#1E293B">
          <Rect x="38" y="78" width="6" height="7" rx="1" />
          <Rect x="48" y="78" width="6" height="7" rx="1" />
          <Rect x="58" y="78" width="6" height="7" rx="1" />
          <Rect x="68" y="78" width="6" height="7" rx="1" />
          <Rect x="78" y="78" width="6" height="7" rx="1" />
          {/* Walking person */}
          <Path d="M58 42a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm-6 7h8l4 12-4 16h-4l3-12-6-4-4 12h-4l4-17 3-7z" />
        </G>
      </Svg>
    </View>
  );
}

export function TwoImageCard({
  question,
  selectedOption,
  onSelectOption,
  onOpenLearnMore,
  onToggleFlag,
  isFlagged,
  evaluatedResult,
}: TwoImageCardProps) {
  const { colors, mode } = useTheme();

  const handleSelect = (index: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onSelectOption(index);
  };

  const layoutType = resolveQuestionType(question);

  // Gradient Colors tailored to match reference design
  const getHeaderGradient = () => {
    switch (layoutType) {
      case 'single_image':
        return ['#A7F3D0', '#86EFAC'] as const; // Fresh soft green mint
      case 'two_image':
        return ['#5EEAD4', '#2DD4BF'] as const; // Fresh teal mint
      case 'text_only':
      default:
        return ['#5EEAD4', '#38BDF8'] as const; // Cyan-mint vibrant gradient
    }
  };

  const answersList = (
    Array.isArray(question.answers) && question.answers.length > 0
      ? question.answers
      : ['Option 1', 'Option 2']
  ) as string[];

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: mode === 'dark' ? (colors.surfaceContainer || '#181B22') : '#FFFFFF',
          borderColor: mode === 'dark' ? colors.outlineVariant : '#E2E8F0',
        },
      ]}
    >
      {/* ── 1. Top Gradient Header ── */}
      <LinearGradient
        colors={getHeaderGradient()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradientHeader,
          layoutType === 'single_image' && styles.gradientHeaderSingleImage,
        ]}
      >
        {/* Type 1: Single Image Road Sign at Top */}
        {layoutType === 'single_image' ? (
          <View style={styles.singleImageContainer}>
            <RoadSignGraphic
              source={question.image}
              type={question.signRef === 'A' ? 'yield' : 'yield'}
            />
          </View>
        ) : null}

        {/* Bold Question Text */}
        <Text style={[Typography.titleLarge, styles.questionText]}>
          {question.question}
        </Text>
      </LinearGradient>

      {/* ── 2. Card Body / Options ── */}
      <View style={styles.cardBody}>
        {/* TYPE 2: Two Image Choice (Side-by-side A vs B) */}
        {layoutType === 'two_image' ? (
          <View style={styles.twoImageContainer}>
            {[0, 1].map((index) => {
              const label = question.labels?.[index] ?? (index === 0 ? 'A' : 'B');
              const imageUri = question.images?.[index];
              const isSelected = selectedOption === index;
              const isMarkedRight = evaluatedResult && isSelected && index === question.correctAnswer;
              const isMarkedWrong = evaluatedResult && isSelected && index !== question.correctAnswer;

              let cardBg = mode === 'dark' ? '#1E232D' : '#FFFFFF';
              let borderColor = mode === 'dark' ? '#2A2E38' : '#F1F5F9';
              let labelColor = colors.onSurface;

              if (isMarkedRight) {
                cardBg = 'rgba(61, 220, 132, 0.14)';
                borderColor = '#3DDC84';
                labelColor = '#22C55E';
              } else if (isMarkedWrong) {
                cardBg = colors.categoryOrangeBg;
                borderColor = StaticColors.achievementAmber;
                labelColor = StaticColors.achievementAmber;
              } else if (isSelected) {
                cardBg = 'rgba(7, 183, 169, 0.10)';
                borderColor = colors.tealAccent || '#07B7A9';
                labelColor = colors.tealAccent || '#07B7A9';
              }

              return (
                <Pressable
                  key={index}
                  onPress={() => handleSelect(index)}
                  style={[
                    styles.imageChoiceCard,
                    {
                      backgroundColor: cardBg,
                      borderColor: borderColor,
                    },
                  ]}
                >
                  <View style={styles.imageBox}>
                    <RoadSignGraphic
                      source={imageUri}
                      type={index === 0 ? 'children' : 'pedestrian'}
                      imageStyle={styles.imageChoiceSignImage}
                      svgSize={104}
                    />
                  </View>

                  <Text
                    style={[
                      styles.choiceBigLetter,
                      { color: labelColor },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          /* TYPE 1 & TYPE 3: Stacked Text Choices (True/False or Multiple Choice) */
          <View style={styles.textChoicesStack}>
            {answersList.map((answer: string, index: number) => {
              const isSelected = selectedOption === index;
              const isMarkedRight = evaluatedResult && isSelected && index === question.correctAnswer;
              const isMarkedWrong = evaluatedResult && isSelected && index !== question.correctAnswer;

              let rowBg = mode === 'dark' ? '#1E2B25' : '#EBF8EE';
              let borderColor = mode === 'dark' ? '#2A3B34' : '#DCF3E2';
              let textColor = colors.onSurface;

              if (isMarkedRight) {
                rowBg = 'rgba(61, 220, 132, 0.22)';
                borderColor = '#3DDC84';
                textColor = '#15803D';
              } else if (isMarkedWrong) {
                rowBg = colors.categoryOrangeBg;
                borderColor = StaticColors.achievementAmber;
                textColor = StaticColors.achievementAmber;
              } else if (isSelected) {
                rowBg = 'rgba(7, 183, 169, 0.16)';
                borderColor = colors.tealAccent || '#07B7A9';
              }

              return (
                <Pressable
                  key={index}
                  onPress={() => handleSelect(index)}
                  style={[
                    styles.textOptionCard,
                    {
                      backgroundColor: rowBg,
                      borderColor: borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      Typography.bodyMedium,
                      styles.textChoiceLabel,
                      {
                        color: textColor,
                        textAlign: layoutType === 'text_only' ? 'center' : 'left',
                      },
                    ]}
                  >
                    {answer}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* ── 3. Bottom Action Row (Learn More + Flag) ── */}
        <View style={styles.cardFooter}>
          <Pressable
            onPress={onOpenLearnMore}
            hitSlop={8}
            style={[
              styles.learnMoreButton,
              {
                backgroundColor: mode === 'dark' ? (colors.surfaceContainerHighest || '#2A2E38') : '#EEF2F6',
                borderColor: mode === 'dark' ? colors.outlineVariant : '#CBD5E1',
              },
            ]}
          >
            <Ionicons
              name="help-circle-outline"
              size={18}
              color={colors.tealAccent || '#07B7A9'}
            />
            <Text
              style={[
                Typography.labelMedium,
                styles.learnMoreText,
                { color: colors.onSurface },
              ]}
            >
              Learn More
            </Text>
          </Pressable>

          <FlagIcon
            isFlagged={isFlagged}
            onToggle={onToggleFlag}
            size={18}
          />
        </View>
      </View>
    </View>
  );
}

export const QuizCard = TwoImageCard;

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  gradientHeader: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  gradientHeaderSingleImage: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  singleImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.xs,
  },
  signImage: {
    width: 130,
    height: 120,
  },
  svgSignWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionText: {
    fontFamily: FontFamily.extraBold,
    textAlign: 'center',
    color: '#092C23',
    fontSize: 18,
    lineHeight: 24,
    marginTop: 4,
  },
  cardBody: {
    padding: Spacing.md,
  },
  // Type 2: Two Image Choice Styles
  twoImageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  imageChoiceCard: {
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderWidth: 2,
    minHeight: 172,
    gap: Spacing.sm,
  },
  imageBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 108,
  },
  imageChoiceSignImage: {
    width: 112,
    height: 104,
  },
  choiceBigLetter: {
    fontFamily: FontFamily.extraBold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: 0,
  },
  // Type 1 & 3: Stacked Text Choices
  textChoicesStack: {
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  textOptionCard: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderRadius: 14,
    borderWidth: 2,
    minHeight: 52,
    justifyContent: 'center',
  },
  textChoiceLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  // Footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.xs,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  learnMoreText: {
    fontFamily: FontFamily.semiBold,
  },
});
