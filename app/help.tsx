import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ChevronRight,
  CreditCard,
  Bug,
  Crown,
  CircleUser,
  BookOpen,
  CircleHelp,
  type LucideIcon,
} from 'lucide-react-native';
import { useTheme, Spacing, Radius, IconSize } from '@/theme/tokens';
import { FontFamily } from '@/constants/typography';
import { HELP_TOPICS, type HelpTopic } from '@/lib/help';

/** Map each topic id to a matching icon, matching pataskillsv2/app/help.tsx */
const TOPIC_ICONS: Record<HelpTopic, LucideIcon> = {
  premium: Crown,
  billing: CreditCard,
  bug: Bug,
  account: CircleUser,
  content: BookOpen,
  other: CircleHelp,
};

interface HelpTopicRowProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  isLast: boolean;
}

function HelpTopicRow({ icon: Icon, label, onPress, isLast }: HelpTopicRowProps) {
  const { colors } = useTheme();

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.topicRow,
          pressed && { opacity: 0.6 },
        ]}
      >
        <View style={styles.iconBox}>
          <Icon size={IconSize.header} color={colors.onSurface} strokeWidth={2} />
        </View>
        <Text style={[styles.topicLabel, { color: colors.onSurface }]} numberOfLines={1}>
          {label}
        </Text>
        <ChevronRight size={IconSize.inline} color={colors.onSurfaceVariant} strokeWidth={2} />
      </Pressable>
      {!isLast && <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />}
    </>
  );
}

export default function HelpScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const onSelectTopic = (topicId: HelpTopic) => {
    router.push({ pathname: '/feedback-form', params: { topic: topicId } });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* ─── Back header ─── */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={IconSize.header} color={colors.onSurface} strokeWidth={2.2} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Help</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>
          WHAT DO YOU NEED HELP WITH?
        </Text>

        <View
          style={[
            styles.topicsCard,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: colors.surfaceContainerHigh,
            },
          ]}
        >
          {HELP_TOPICS.map((opt, i) => (
            <HelpTopicRow
              key={opt.id}
              icon={TOPIC_ICONS[opt.id]}
              label={opt.label}
              onPress={() => onSelectTopic(opt.id)}
              isLast={i === HELP_TOPICS.length - 1}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    lineHeight: 24,
  },
  content: {
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: Spacing.xs,
  },
  topicsCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.gutter,
    overflow: 'hidden',
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  iconBox: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicLabel: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 16,
    lineHeight: 22,
  },
  divider: {
    height: 1,
  },
});
