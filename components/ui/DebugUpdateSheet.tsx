import { useState } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { useTheme, Spacing, Radius, Typography } from '@/theme/tokens';
import {
  getStaticDiagnostics,
  runManualCheck,
  getStatusShort,
  interpretCheckResult,
  buildSupportSummary,
  type CheckResult,
} from '@/lib/updatesDebug';

/**
 * Update Info sheet — baked into the native APK on purpose so it works even
 * when OTA delivery itself is what's being diagnosed (a view shipped via OTA
 * can't diagnose OTA not landing). Permanent, standing tool, not temporary
 * debug scaffolding — mirrors PataSkillsV2's components/ui/DebugUpdateSheet.tsx;
 * see PataSkillsV2/docs/WINDOWS_UBUNTU_WORKFLOW.md ("Runtime version: what
 * can break") for why this stays rather than gets removed once OTA works.
 *
 * Two audiences, two layers:
 * - A customer can open this and read/share a plain-language summary
 *   without needing to understand raw IDs or hashes.
 * - A developer can expand "Technical details" for the exact values needed
 *   to cross-reference against `eas update:list`.
 */
export function DebugUpdateSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);
  const diag = getStaticDiagnostics();

  const onRunCheck = async () => {
    if (checking) return;
    setChecking(true);
    const result = await runManualCheck();
    setChecking(false);
    setCheckResult(result);
  };

  const onShare = async () => {
    try {
      await Share.share({ message: buildSupportSummary(diag, checkResult) });
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  };

  const row = (label: string, value: string | null | undefined) => (
    <View style={{ paddingVertical: Spacing.xs }}>
      <Text style={[Typography.bodySm, { color: colors.onSurfaceVariant }]}>{label}</Text>
      <Text style={[Typography.bodyMd, { color: colors.onSurface }]} selectable>
        {value ?? 'null'}
      </Text>
    </View>
  );

  const divider = () => (
    <View style={{ height: 1, backgroundColor: colors.outlineVariant, marginVertical: Spacing.sm }} />
  );

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={[Typography.headlineSm, { color: colors.onSurface, paddingBottom: Spacing.sm }]}>
        Update Info
      </Text>

      {/* Plain-language summary — safe for a customer to read, screenshot, or share as-is. */}
      {row('App version', `${diag.appVersion} (build ${diag.buildVersion})`)}
      {row(
        'Channel',
        diag.channel === 'preview' ? 'Preview (test)' : diag.channel === 'production' ? 'Production (live)' : diag.channel,
      )}
      {row('Status', getStatusShort(diag))}
      {row('Last checked', interpretCheckResult(checkResult))}

      {divider()}

      <Pressable
        onPress={onShare}
        style={{
          marginTop: Spacing.sm,
          paddingVertical: Spacing.gutter,
          alignItems: 'center',
          borderRadius: Radius.sm,
          backgroundColor: colors.surfaceContainerHigh,
        }}
      >
        <Text style={[Typography.bodyLg, { color: colors.onSurface }]}>Share with support</Text>
      </Pressable>

      <Pressable
        onPress={onRunCheck}
        disabled={checking}
        style={{
          marginTop: Spacing.sm,
          paddingVertical: Spacing.gutter,
          alignItems: 'center',
          borderRadius: Radius.sm,
          backgroundColor: colors.surfaceContainerHigh,
          opacity: checking ? 0.6 : 1,
        }}
      >
        <Text style={[Typography.bodyLg, { color: colors.onSurface }]}>
          {checking ? 'Checking…' : 'Run check now'}
        </Text>
      </Pressable>

      <Pressable onPress={() => setShowTechnical((v) => !v)} style={{ paddingVertical: Spacing.xs }}>
        <Text style={[Typography.bodyMd, { color: colors.onSurfaceVariant }]}>
          {showTechnical ? '▾ Technical details' : '▸ Technical details'}
        </Text>
      </Pressable>

      {showTechnical && (
        <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
          {row('Runtime version (running bundle)', diag.runtimeVersion)}
          {row('Channel (raw)', diag.channel)}
          {row('Update ID', diag.updateId)}
          {row('Update created at', diag.createdAt)}
          {row('Embedded launch (never fetched an OTA)', String(diag.isEmbeddedLaunch))}
          {row('Emergency launch', String(diag.isEmergencyLaunch))}
          {diag.isEmergencyLaunch && row('Emergency reason', diag.emergencyLaunchReason)}
          {row('Updates enabled', String(diag.isEnabled))}
          {row('Check-automatically setting', diag.checkAutomatically)}

          {checkResult && (
            <>
              {divider()}
              <Text style={[Typography.bodySm, { color: colors.onSurfaceVariant }]}>
                Last manual check — {checkResult.timestamp}
              </Text>
              {checkResult.ok ? (
                row('Raw result', JSON.stringify(checkResult.raw, null, 2))
              ) : (
                <>
                  {row('Error message', checkResult.errorMessage)}
                  {row('Error stack', checkResult.errorStack)}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
    </BottomSheet>
  );
}
