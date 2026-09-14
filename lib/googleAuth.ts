import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
} from '@react-native-google-signin/google-signin';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/** True once the Web client id (required by Supabase token validation) is set. */
export const isGoogleConfigured = Boolean(WEB_CLIENT_ID);

let configured = false;
function ensureConfigured() {
  if (configured) return;
  // webClientId is what Supabase validates the ID token's audience against.
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
  });
  configured = true;
}

/**
 * Native Google sign-in. Opens the system Google account picker and
 * returns the ID token, which the caller exchanges for a Supabase session
 * via restoreAccountWithGoogle(idToken).
 *
 * Returns null if the user cancels. Throws on real errors.
 */
export async function signInWithGoogle(): Promise<string | null> {
  ensureConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  // Sign out of the native module first (device-local only, does not touch
  // the Supabase session) so the account chooser is shown every time
  // instead of silently resolving to a cached account.
  try {
    await GoogleSignin.signOut();
  } catch {
    /* nothing cached — fine */
  }
  try {
    const response = await GoogleSignin.signIn();
    // v13+ returns { type, data }; older returns the user object directly.
    const idToken =
      (response as any)?.data?.idToken ?? (response as any)?.idToken ?? null;
    if (!idToken) throw new Error('No ID token returned from Google');
    return idToken;
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) return null;
    throw e;
  }
}
