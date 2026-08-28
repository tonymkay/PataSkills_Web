
import { TextStyle } from "react-native";

// V2 ships only the 5 weights actually used by the Typography scale below.
// (Thin / ExtraLight / Light were dropped for app-size — see plan §12.)
export const FontFamily = {
  regular: "Sora-Regular",
  medium: "Sora-Medium",
  semiBold: "Sora-SemiBold",
  bold: "Sora-Bold",
  extraBold: "Sora-ExtraBold",
} as const;

export const Typography: Record<string, TextStyle> = {

  displayLg: {
    fontFamily: FontFamily.extraBold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.8,
  },

  headlineXl: {
    fontFamily: FontFamily.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.4,
  },

  headlineLg: {
    fontFamily: FontFamily.bold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.3,
  },

  headlineMd: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    lineHeight: 31,
    letterSpacing: -0.2,
  },

  // Stories screen top headers only (app/stories.tsx) — slightly smaller
  // than headlineLg so the story cards read less shouty.
  storyHeadline: {
    fontFamily: FontFamily.bold,
    fontSize: 21,
    lineHeight: 26,
    letterSpacing: -0.2,
  },

  headlineSm: {
    fontFamily: FontFamily.semiBold,
    fontSize: 20,
    lineHeight: 26,
  },

  // Standard aliases for universal component compatibility
  titleLarge: {
    fontFamily: FontFamily.extraBold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
  },

  titleMedium: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.1,
  },

  titleSmall: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    lineHeight: 20,
  },

  headlineLarge: {
    fontFamily: FontFamily.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
  },

  headlineMedium: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
  },

  headlineSmall: {
    fontFamily: FontFamily.semiBold,
    fontSize: 18,
    lineHeight: 24,
  },

  bodyLarge: {
    fontFamily: FontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
  },

  bodyMedium: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
  },

  bodySmall: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },

  labelLarge: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    lineHeight: 20,
  },

  labelMedium: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    lineHeight: 18,
  },

  labelSmall: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    lineHeight: 16,
  },

  bodyLg: {
    fontFamily: FontFamily.regular,
    fontSize: 18,
    lineHeight: 29,
  },

  bodyMd: {
    fontFamily: FontFamily.regular,
    fontSize: 16,
    lineHeight: 26,
  },

  bodySm: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 22,
  },

  labelBold: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },

  labelMd: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  buttonText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  caption: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
  },

  streakBigLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 20,
    lineHeight: 26,
  },

  streakStatsLine: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
  },

  wideCardText: {
    fontFamily: FontFamily.regular,
    fontSize: 18,
    lineHeight: 22,
  },

  wideCardTagText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    lineHeight: 14,
  },

  sectionHeading: {
    fontFamily: FontFamily.regular,
    fontSize: 22,
    lineHeight: 28,
  },

  gridCardLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
  },

  gridCardCount: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    lineHeight: 12,
  },

  practiceBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    lineHeight: 20,
  },

  tabText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    lineHeight: 14,
  },

  cardTitleSm: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    lineHeight: 18,
  },

  cardName: {
    fontFamily: FontFamily.medium,
    fontSize: 17,
    lineHeight: 23,
  },

  tabLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    lineHeight: 17,
  },

  tableHeader: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    lineHeight: 20,
  },

  bigNumber: {
    fontFamily: FontFamily.bold,
    fontSize: 28,
    lineHeight: 34,
  },

  statLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    lineHeight: 14,
  },

  reportTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    lineHeight: 18,
  },

  reportSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    lineHeight: 16,
  },

  levelChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    lineHeight: 16,
  },

  itemId: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    lineHeight: 16,
  },

  itemAcc: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    lineHeight: 16,
  },

  itemSeen: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    lineHeight: 12,
  },

  progressCounter: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    lineHeight: 16,
  },

  signFallbackText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 9,
    lineHeight: 12,
  },

  signPromptText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
    lineHeight: 20,
  },

  questionOverlayText: {
    fontFamily: FontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
  },

  optionLetter: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    lineHeight: 16,
  },

  optionText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 20,
  },

  scoreMainTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 32,
    lineHeight: 40,
  },

  replayButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
    lineHeight: 20,
  },

  unlockText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    lineHeight: 18,
  },

  answerQNum: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    lineHeight: 20,
  },

  answerChipLetter: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    lineHeight: 16,
  },

  answerChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    lineHeight: 16,
  },

  answerIndicator: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    lineHeight: 16,
  },

  correctAnswerLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
  },

  correctAnswerText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    lineHeight: 18,
  },

  pointsText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 42,
    lineHeight: 48,
  },

  scoreRateText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
    lineHeight: 20,
  },

  tabBarLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    lineHeight: 14,
  },

  badgeText: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    lineHeight: 12,
  },

  scoreNumber: {
    fontFamily: FontFamily.extraBold,
    fontSize: 56,
    lineHeight: 64,
  },

  resultQuestion: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    lineHeight: 20,
  },

  sheetSignName: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    lineHeight: 22,
  },

  toastMessage: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    lineHeight: 18,
  },
} as const;

export const fontAssets = {
  [FontFamily.regular]: require("../assets/fonts/Sora-Regular.ttf"),
  [FontFamily.medium]: require("../assets/fonts/Sora-Medium.ttf"),
  [FontFamily.semiBold]: require("../assets/fonts/Sora-SemiBold.ttf"),
  [FontFamily.bold]: require("../assets/fonts/Sora-Bold.ttf"),
  [FontFamily.extraBold]: require("../assets/fonts/Sora-ExtraBold.ttf"),
} as const;
