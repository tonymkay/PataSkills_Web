/**
 * Join a Tournament — code entry only, no searching/listening. The person
 * types the code (and, if the invite is email-locked, the email they were
 * invited with) and taps Join. On success we already hold the real
 * tournamentId from play_join_tournament_by_code, so we go straight into
 * challenge-tournament-room.tsx — same room screen every other tournament
 * entry point uses.
 */
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Ticket } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { ScreenTransition } from '@/components/nav/ScreenTransition';
import { navBack, navReplace } from '@/lib/navDirection';
import { FontFamily, Radius, Spacing, StaticColors, useTheme } from '@/theme/tokens';
import { joinTournamentByCode, type JoinByCodeResult } from '@/lib/tournaments';
import { joinChallengeByCode } from '@/lib/challenges';
import { sanitizeAndValidateEmail } from '@/lib/email';

const GREEN = StaticColors.selection.activeBorder;

function messageFor(result: JoinByCodeResult): string {
  switch (result) {
    case 'not_found':
      return "That code doesn't match anything. Double-check it and try again.";
    case 'expired':
      return 'This invite has expired.';
    case 'wrong_email':
      return "This invite is for a different email — enter the email you were invited with.";
    case 'ineligible':
      return 'This has already ended.';
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

  // Challenge Corner is always the return destination from this screen —
  // both the in-app back arrow and OS/hardware back. Pop the real stack
  // when there's history to pop — lands on the existing Challenge Corner
  // instance underneath with the correct native-stack "pop" animation,
  // instead of stacking a new one via replace(). replace() is only a
  // fallback for when this screen has no history to pop (e.g. a web
  // reload landing directly here).
  const goToChallengeCorner = useCallback(() => {
    if (router.canGoBack()) navBack(router);
    else navReplace(router, '/challenge-corner', 'backward');
  }, [router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goToChallengeCorner();
      return true;
    });
    return () => sub.remove();
  }, [goToChallengeCorner]);

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
      // Codes are two separate namespaces (challenges vs tournaments) —
      // try the friend-challenge lookup first since it doesn't need an
      // email, and only fall back to the tournament lookup on a genuine
      // "no such code" miss.
      const challengeAttempt = await joinChallengeByCode(trimmedCode);
      if (challengeAttempt.result !== 'not_found') {
        if (challengeAttempt.result === 'joined' || challengeAttempt.result === 'started' || challengeAttempt.result === 'already') {
          if (!challengeAttempt.challengeId) {
            setError('Something went wrong. Please try again.');
            return;
          }
          router.replace({
            pathname: '/challenge-online' as any,
            params: { challengeId: challengeAttempt.challengeId },
          });
          return;
        }
        // 'ineligible' — a real challenge code that's no longer joinable.
        setError('This challenge has already ended or was cancelled.');
        return;
      }

      const { result, tournamentId } = await joinTournamentByCode(trimmedCode, emailToSend);
      if (result === 'joined' || result === 'already') {
        if (!tournamentId) {
          setError('Something went wrong. Please try again.');
          return;
        }
        // challenge-tournament.tsx owns the whole tournament flow now,
        // including the shared waiting room — it picks up from params.tournamentId
        // itself (body starts at 'loading', fetches state, and routes into
        // ChallengeWaitingRoom once the player taps through).
        router.replace({
          pathname: '/challenge-tournament' as any,
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
          <Pressable onPress={goToChallengeCorner} hitSlop={Spacing.sm} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.onSurface} strokeWidth={2.2} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Join with a Code</Text>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} bounces={false}>
          <View style={[styles.iconCircle, { backgroundColor: colors.surfaceContainerHigh }]}>
            <Ticket size={32} color={GREEN} strokeWidth={2} />
          </View>

          <Text style={[styles.title, { color: colors.onSurface }]}>Enter your invite code</Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            Works for both private challenges and tournaments — ask whoever created it for the code they were given.
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
