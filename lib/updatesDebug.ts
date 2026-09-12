import * as Updates from 'expo-updates';
import * as Application from 'expo-application';

export interface UpdateDiagnostics {
  timestamp: string;
  isEnabled: boolean;
  isEmbeddedLaunch: boolean;
  isEmergencyLaunch: boolean;
  emergencyLaunchReason: string | null;
  runtimeVersion: string;
  channel: string | null;
  updateId: string | null;
  createdAt: string | null;
  checkAutomatically: string;
  updatesDirectory: string | null;
  appVersion: string;
  buildVersion: string;
}

/** Snapshot of everything expo-updates knows about the CURRENTLY RUNNING
 *  bundle — all synchronous, no network. Safe to call anytime. */
export function getStaticDiagnostics(): UpdateDiagnostics {
  return {
    timestamp: new Date().toISOString(),
    isEnabled: Updates.isEnabled,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    isEmergencyLaunch: Updates.isEmergencyLaunch,
    emergencyLaunchReason: Updates.emergencyLaunchReason ?? null,
    runtimeVersion: Updates.runtimeVersion ?? 'n/a',
    channel: Updates.channel ?? 'n/a',
    updateId: Updates.updateId ?? null,
    createdAt: Updates.createdAt ? Updates.createdAt.toISOString() : null,
    checkAutomatically: String(Updates.checkAutomatically),
    // `Updates.updatesDirectory` isn't exposed on the JS API in this SDK version —
    // always null now. Field kept for shape compatibility with PataSkillsV2's version.
    updatesDirectory: null,
    appVersion: Application.nativeApplicationVersion ?? 'n/a',
    buildVersion: Application.nativeBuildVersion ?? 'n/a',
  };
}

export interface CheckResult {
  timestamp: string;
  ok: boolean;
  /** Full raw object from checkForUpdateAsync() — isAvailable, manifest,
   *  reason, etc. Not collapsed to a status string. */
  raw?: unknown;
  errorMessage?: string;
  errorStack?: string;
}

/** Runs the real update check and captures EVERYTHING it returns or throws —
 *  intentionally does not summarize, since the summary is exactly what's been
 *  hiding the actual problem so far. */
export async function runManualCheck(): Promise<CheckResult> {
  const timestamp = new Date().toISOString();
  try {
    const check = await Updates.checkForUpdateAsync();
    return { timestamp, ok: true, raw: check };
  } catch (e) {
    return {
      timestamp,
      ok: false,
      errorMessage: e instanceof Error ? e.message : String(e),
      errorStack: e instanceof Error ? e.stack : undefined,
    };
  }
}

/** Human-readable date, e.g. "17 Jul 2026". Returns 'unknown' for null/invalid. */
function formatDate(iso: string | null): string {
  if (!iso) return 'unknown';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Plain-language read on which channel this build listens to — the raw
 *  value is still the thing to act on, this is just a friendlier label. */
function channelLabel(channel: string | null): string {
  if (channel === 'preview') return 'Preview (test)';
  if (channel === 'production') return 'Production (live)';
  return channel ?? 'not set';
}

/** One-line, non-technical read on whether this install can receive OTA
 *  updates at all right now, and what it's currently running. */
export function getPlainStatus(diag: UpdateDiagnostics): string {
  if (!diag.isEnabled) {
    return "Updates are turned off on this install — it can only be updated by installing a new build (Play Store or APK).";
  }
  if (diag.isEmergencyLaunch) {
    return `This install recovered from a failed update${diag.emergencyLaunchReason ? ` (${diag.emergencyLaunchReason})` : ''} — worth rebuilding fresh rather than pushing another OTA on top.`;
  }
  if (diag.isEmbeddedLaunch) {
    return `Running the original build (version ${diag.appVersion}) — has not received any update yet.`;
  }
  return `Running an update installed on ${formatDate(diag.createdAt)}.`;
}

/** Same read as getPlainStatus, compressed to 3 words or fewer for the
 *  on-screen "Status" row in the Update Info sheet. */
export function getStatusShort(diag: UpdateDiagnostics): string {
  if (!diag.isEnabled) return 'Updates off';
  if (diag.isEmergencyLaunch) return 'Recovered from error';
  if (diag.isEmbeddedLaunch) return 'Not updated yet';
  return 'Update installed';
}

/** Plain-language read on the result of a manual check. */
export function interpretCheckResult(result: CheckResult | null): string {
  if (!result) return 'Not checked yet.';
  if (!result.ok) return `Check failed: ${result.errorMessage ?? 'unknown error'}.`;
  const raw = result.raw as { isAvailable?: boolean } | undefined;
  if (raw?.isAvailable) return 'A newer update is available and should be picked up shortly.';
  return 'Up to date — nothing newer published on this channel.';
}

/** Plain-text block meant to be shared (e.g. via WhatsApp) from a customer's
 *  device straight to support. */
export function buildSupportSummary(diag: UpdateDiagnostics, checkResult: CheckResult | null): string {
  return [
    'PataSkills Play — Update Info',
    `App version: ${diag.appVersion} (build ${diag.buildVersion})`,
    `Channel: ${channelLabel(diag.channel)}`,
    `Status: ${getPlainStatus(diag)}`,
    `Last checked: ${interpretCheckResult(checkResult)}`,
  ].join('\n');
}
