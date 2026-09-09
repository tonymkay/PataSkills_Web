/**
 * Join a Tournament — code entry only, no searching/listening. The person
 * types the code (and, if the invite is email-locked, the email they were
 * invited with) and taps Join. On success we already hold the real
 * tournamentId from play_join_tournament_by_code, so we go straight into
 * challenge-tournament-room.tsx — same room screen every other tournament
 * entry point uses.
 */
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Ticket } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { ScreenTransition } from '@/components/nav/ScreenTransition';
import { navBack } from '@/lib/navDirection';
import { FontFamily, Radius, Spacing, StaticColors, useTheme } from '@/theme/tokens';
import { joinTournamentByCode, type JoinByCodeResult } from '@/lib/tournaments';
import { sanitizeAndValidateEmail } from '@/lib/email';

const GREEN = StaticColors.selection.activeBorder;

function messageFor(result: JoinByCodeResult): string {
  switch (result) {
    case 'not_found':
      return "That code doesn't match any tournament. Double-check it and try again.";
    case 'expired':
      return 'This invite has expired.';
    case 'wrong_email':
      return "This invite is for a different email — enter the email you were invited with.";
    case 'ineligible':
      return 'This tournament has already ended.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export default function ChallengeTournamentJoinScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [code, setCode] = useState('');
  const [needsEmail, setNeedsEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onJoin = async () => {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setError('Enter the code you were invited with.');
      return;
    }
    let emailToSend: string | null = null;
    if (needsEmail) {
      const { valid, email: sanitized, error: emailErr } = sanitizeAndValidateEmail(email);
      if (!valid) {
        setError(emailErr || 'Enter the email you were invited with.');
        return;
      }
      emailToSend = sanitized;
    }

    setBusy(true);
    setError(null);
    try {
      const { result, tournamentId } = await joinTournamentByCode(trimmedCode, emailToSend);
      if (result === 'joined' || result === 'already') {
        if (!tournamentId) {
          setError('Something went wrong. Please try again.');
          return;
        }
        router.replace({
          pathname: '/challenge-tournament-room' as any,
          params: { tournamentId },
        });
        return;
      }
      if (result === 'wrong_email' && !needsEmail) {
        setNeedsEmail(true);
      }
      setError(messageFor(result));
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenTransition>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, Spacing.gutter) }]}>
        <View style={styles.header}>
          <Pressable onPress={() => navBack(router)} hitSlop={Spacing.sm} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.onSurface} strokeWidth={2.2} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Join a Tournament</Text>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} bounces={false}>
          <View style={[styles.iconCircle, { backgroundColor: colors.surfaceContainerHigh }]}>
            <Ticket size={32} color={GREEN} strokeWidth={2} />
          </View>

          <Text style={[styles.title, { color: colors.onSurface }]}>Enter your invite code</Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            Ask the person who created the tournament for the code they were given.
          </Text>

          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colors.onSurface }]}>Invite code</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: error && !needsEmail ? '#ef4444' : colors.surfaceContainerHigh }]}>
              <TextInput
                value={code}
                onChangeText={(t) => { setCode(t.toUpperCase()); if (error) setError(null); }}
                placeholder="e.g. 7K3PQR"
                placeholderTextColor={colors.onSurfaceVariant}
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                maxLength={8}
                editable={!busy}
                style={[styles.input, styles.codeInput, { color: colors.onSurface }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
              />
            </View>
          </View>

          {needsEmail && (
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: colors.onSurface }]}>Email you were invited with</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.surfaceContainerHigh }]}>
                <TextInput
                  value={email}
                  onChangeText={(t) => { setEmail(t); if (error) setError(null); }}
                  placeholder="your.email@example.com"
                  placeholderTextColor={colors.onSurfaceVariant}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  editable={!busy}
                  style={[styles.input, { color: colors.onSurface }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                />
              </View>
            </View>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + Spacing.base, Spacing.lg) }]}>
          <Button label="Join" onPress={onJoin} disabled={busy} loading={busy} />
        </View>
      </View>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.marginMobile, paddingVertical: Spacing.sm, gap: Spacing.gutter,
  },
  backButton: { padding: Spacing.xs },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: 22, lineHeight: 28 },
  body: { flexGrow: 1, paddingHorizontal: Spacing.marginMobile, paddingTop: Spacing.xl, alignItems: 'center' },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
  },
  title: { fontFamily: FontFamily.bold, fontSize: 20, textAlign: 'center' },
  subtitle: {
    fontFamily: FontFamily.regular, fontSize: 14, textAlign: 'center',
    marginTop: Spacing.xs, marginBottom: Spacing.xl, lineHeight: 20,
  },
  inputSection: { width: '100%', marginBottom: Spacing.md },
  inputLabel: { fontFamily: FontFamily.semiBold, fontSize: 13, marginBottom: Spacing.xs },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.md, borderWidth: 1.5, paddingHorizontal: Spacing.md, height: 52,
  },
  input: { flex: 1, fontFamily: FontFamily.regular, fontSize: 15, height: '100%' },
  codeInput: { fontFamily: FontFamily.bold, fontSize: 20, letterSpacing: 4 },
  errorText: {
    color: '#ef4444', fontFamily: FontFamily.medium, fontSize: 13,
    textAlign: 'center', marginTop: Spacing.xs,
  },
  footer: { paddingHorizontal: Spacing.marginMobile, paddingTop: Spacing.sm },
});
