import { supabase } from '@/lib/supabase';
import { getDeviceId } from '@/lib/deviceId';
import { getStoredEmail } from '@/lib/email';
import { clearAllLocal } from '@/lib/storage';

/**
 * Delete the account/data on this device (user-initiated). Same policy as
 * PataSkillsV2 — see PataSkillsV2/sql/53_account_deletion.sql and this
 * app's supabase/play_account_deletion.sql:
 *  • SERVER: soft-delete — request_play_account_deletion trashes the
 *    device/account for 90 days, then a scheduled purge removes it.
 *  • DEVICE: it's gone now — clear every local '@play/' key (keys balance,
 *    progress, tabs-unlocked flag, linked email, device id, etc) so the
 *    next launch is a clean first-run, same as a fresh install.
 *
 * Returns true if the server request went through; even if it didn't
 * (offline), the local wipe still happens so the user is reset on their
 * side regardless.
 */
export async function deleteAccount(): Promise<boolean> {
  let serverOk = false;
  try {
    const deviceId = await getDeviceId();
    const email = await getStoredEmail();
    const { error } = await supabase.rpc('request_play_account_deletion', {
      p_device_id: deviceId,
      p_email: email,
    });
    serverOk = !error;
  } catch {
    serverOk = false;
  }
  try {
    await supabase.auth.signOut();
  } catch {
    /* ignore — clearing local below is what matters on-device */
  }
  await clearAllLocal();
  return serverOk;
}
