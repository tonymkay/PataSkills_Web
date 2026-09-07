import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { useTheme, Spacing, Radius, IconSize, StaticColors } from '@/theme/tokens';
import { FontFamily } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { HELP_TOPICS, submitHelpRequest, type HelpTopic } from '@/lib/help';
import { getStoredEmail } from '@/lib/email';

function headerTitle(topic: HelpTopic | null): string {
  if (!topic) return 'Feedback form';
  if (topic === 'bug') return 'Report a problem';
  return HELP_TOPICS.find((t) => t.id === topic)?.label ?? 'Feedback form';
}

export default function FeedbackFormScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ topic: string }>();

  const topic = (params.topic ?? null) as HelpTopic | null;

  const [email, setEmail] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    getStoredEmail().then(setEmail).catch(() => {});
  }, []);

  const name = email ? email.split('@')[0] : 'Learner';
  const canSubmit = !!topic && message.trim().length > 0 && !submitting;

  const onSubmit = async () => {
    if (!topic || !canSubmit) return;
    setSubmitting(true);
    const result = await submitHelpRequest({
      topic,
      customTopic: topic === 'other' ? customTopic : undefined,
      name,
      email: email || undefined,
      message,
    });
    setSubmitting(false);
    if (result === 'ok') {
      setSent(true);
      setMessage('');
      setCustomTopic('');
    }
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
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
          {headerTitle(topic)}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {sent ? (
          <View
            style={[
              styles.successCard,
              {
                backgroundColor: colors.selectionActiveTint,
                borderColor: colors.selectionActiveBorder,
              },
            ]}
          >
            <CheckCircle2 size={32} color={colors.selectionActiveBorder} strokeWidth={2} />
            <View style={styles.successTextWrap}>
              <Text style={[styles.successTitle, { color: colors.onSurface }]}>
                Message sent
              </Text>
              <Text style={[styles.successSubtitle, { color: colors.onSurfaceVariant }]}>
                Thanks — our team will review it for action.
              </Text>
            </View>
            <Button
              label="Back to Settings"
              onPress={() => router.replace('/settings')}
              variant="outline"
              borderColor={colors.selectionActiveBorder}
              textColor={colors.onSurface}
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        ) : (
          <View style={styles.formWrap}>
            <Text style={[styles.sendingAsText, { color: colors.onSurfaceVariant }]}>
              Sending as <Text style={{ color: colors.onSurface, fontFamily: FontFamily.semiBold }}>{name}</Text>
            </Text>

            {topic === 'other' && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.onSurface }]}>
                  Topic
                </Text>
                <TextInput
                  value={customTopic}
                  onChangeText={setCustomTopic}
                  placeholder="What's this about? (optional)"
                  placeholderTextColor={colors.onSurfaceVariant}
                  editable={!submitting}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surfaceContainer,
                      borderColor: colors.surfaceContainerHigh,
                      color: colors.onSurface,
                    },
                  ]}
                />
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.onSurface }]}>
                Description
              </Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Tell us what's going on…"
                placeholderTextColor={colors.onSurfaceVariant}
                editable={!submitting}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: colors.surfaceContainer,
                    borderColor: colors.surfaceContainerHigh,
                    color: colors.onSurface,
                  },
                ]}
              />
            </View>

            <Button
              label="Submit"
              onPress={onSubmit}
              disabled={!canSubmit}
              loading={submitting}
              backgroundColor={canSubmit ? StaticColors.tealAccent : colors.surfaceContainerHigh}
              textColor={canSubmit ? '#000000' : colors.onSurfaceVariant}
              style={{ marginTop: Spacing.sm }}
            />

            <Text style={[styles.footnote, { color: colors.onSurfaceVariant }]}>
              Your request will be reviewed by our team for action.
            </Text>
          </View>
        )}
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
  },
  formWrap: {
    gap: Spacing.md,
  },
  sendingAsText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    height: 50,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontFamily: FontFamily.regular,
    fontSize: 15,
  },
  textArea: {
    height: 130,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  footnote: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  successCard: {
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    padding: Spacing.gutter,
    gap: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  successTextWrap: {
    alignItems: 'center',
    gap: 4,
  },
  successTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    lineHeight: 24,
  },
  successSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    textAlign: 'center',
  },
});
