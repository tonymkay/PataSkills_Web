import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { Typography, FontFamily } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { SignCatalogEntry } from '@/types/quiz';

interface ReadingCardProps {
  sign: SignCatalogEntry;
}

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  regulatory: 'shield-checkmark-outline',
  warning: 'warning-outline',
  prohibitory: 'ban-outline',
  informational: 'information-circle-outline',
  mandatory: 'arrow-forward-circle-outline',
};

export function ReadingCard({ sign }: ReadingCardProps) {
  const { colors, mode } = useTheme();
  const icon = TYPE_ICON[sign.signType] ?? 'information-circle-outline';

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
      <LinearGradient
        colors={['#5EEAD4', '#2DD4BF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        <View style={styles.imageBox}>
          {sign.image ? (
            <Image
              source={typeof sign.image === 'string' ? { uri: sign.image } : sign.image}
              style={styles.signImage}
              contentFit="contain"
            />
          ) : (
            <Ionicons name={icon} size={72} color="#092C23" />
          )}
        </View>
        <Text style={[Typography.titleLarge, styles.nameText]}>{sign.name}</Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{sign.signType.toUpperCase()}</Text>
        </View>
      </LinearGradient>

      <View style={styles.cardBody}>
        <Text style={[Typography.labelSmall, styles.sectionHeading, { color: colors.onSurfaceVariant }]}>
          WHAT IT MEANS
        </Text>
        <Text style={[Typography.bodyMedium, styles.bodyText, { color: colors.onSurface }]}>
          {sign.meaning}
        </Text>

        <Text style={[Typography.labelSmall, styles.sectionHeading, { color: colors.onSurfaceVariant }]}>
          WHERE YOU'LL SEE IT
        </Text>
        <Text style={[Typography.bodyMedium, styles.bodyText, { color: colors.onSurface }]}>
          {sign.whereUsed}
        </Text>

        {sign.explanation ? (
          <View
            style={[
              styles.explanationCard,
              {
                backgroundColor: mode === 'dark' ? (colors.surfaceContainerLow || '#1E232D') : '#F8FAFC',
                borderColor: mode === 'dark' ? colors.outlineVariant : '#E2E8F0',
              },
            ]}
          >
            <Text style={[Typography.bodyMedium, styles.bodyText, { color: colors.onSurface }]}>
              {sign.explanation}
            </Text>
          </View>
        ) : null}

        {sign.memoryTip ? (
          <View style={styles.tipRow}>
            <Ionicons name="bulb-outline" size={16} color={colors.tealAccent || '#07B7A9'} />
            <Text style={[Typography.bodySmall, styles.tipText, { color: colors.onSurfaceVariant }]}>
              {sign.memoryTip}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

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
    minHeight: 180,
  },
  imageBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 100,
  },
  signImage: {
    width: '100%',
    height: '100%',
  },
  nameText: {
    fontFamily: FontFamily.extraBold,
    textAlign: 'center',
    color: '#092C23',
    fontSize: 20,
    lineHeight: 26,
    marginTop: Spacing.xs,
  },
  typeBadge: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(9, 44, 35, 0.14)',
  },
  typeBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: '#092C23',
  },
  cardBody: {
    padding: Spacing.md,
  },
  sectionHeading: {
    fontFamily: FontFamily.bold,
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
    marginBottom: 6,
  },
  bodyText: {
    fontFamily: FontFamily.regular,
    lineHeight: 22,
  },
  explanationCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: 14,
    borderWidth: 1,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: Spacing.md,
  },
  tipText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    lineHeight: 18,
  },
});
