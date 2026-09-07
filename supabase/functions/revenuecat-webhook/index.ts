// Supabase Edge Function: revenuecat-webhook
//
// RevenueCat webhook handler for Android/iOS in-app purchases.
// Receives events from RevenueCat and updates subscriptions/user_premium/play_accounts.
//
// Deploy:
//   supabase functions deploy revenuecat-webhook --no-verify-jwt
//   supabase secrets set RC_WEBHOOK_SECRET=... RESEND_API_KEY=... EMAIL_FROM="PataSkills <noreply@pataskills.com>"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RC_SECRET = Deno.env.get('RC_WEBHOOK_SECRET') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'PataSkills <noreply@pataskills.com>';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const ACTIVE_EVENTS = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION', 'NON_RENEWING_PURCHASE']);
const INACTIVE_EVENTS = new Set(['EXPIRATION', 'BILLING_ISSUE', 'CANCELLATION', 'SUBSCRIPTION_PAUSED']);

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY || !to) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
  }).catch(() => {});
}

function emailFor(type: string): { subject: string; html: string } | null {
  switch (type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
      return {
        subject: 'Your PataSkills Premium is active 🎉',
        html: `<p>Thanks for subscribing to PataSkills Premium — you have unlimited learning.</p>
               <p>A receipt was sent to you by Google Play. Manage your subscription anytime in the app’s Settings.</p>`,
      };
    case 'BILLING_ISSUE':
      return {
        subject: 'Action needed: your PataSkills Premium payment failed',
        html: `<p>We couldn’t process your Premium renewal. Google Play will retry, but to avoid losing access please update your payment method in the Play Store.</p>`,
      };
    case 'CANCELLATION':
      return {
        subject: 'Your PataSkills Premium won’t renew',
        html: `<p>Your Premium won’t renew at the end of the current period. You’ll keep Premium until it expires, then move to the free plan (daily keys).</p>
               <p>Changed your mind? Resubscribe anytime in the app.</p>`,
      };
    case 'EXPIRATION':
      return {
        subject: 'Your PataSkills Premium has ended',
        html: `<p>Your Premium has ended and you’re back on the free plan with daily keys. Resubscribe anytime to get unlimited learning again.</p>`,
      };
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? '';
  if (!RC_SECRET || auth !== RC_SECRET) {
    return new Response('unauthorized', { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response('bad request', { status: 400 });
  }

  const event = body?.event ?? {};
  const type: string = event.type ?? '';
  const userId: string | null = event.app_user_id ?? null;
  if (!userId) return new Response('no app_user_id', { status: 200 });

  const isActive = ACTIVE_EVENTS.has(type) ? true : INACTIVE_EVENTS.has(type) ? false : null;
  const productId: string | null = event.product_id ?? null;
  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;

  const isKeyProduct = productId ? productId.includes('keys') : false;

  if (isActive !== null && !isKeyProduct) {
    try {
      await admin.rpc('set_subscription', {
        p_user_id: userId,
        p_active: isActive,
        p_product: productId,
        p_expires: expiresAt,
      });
    } catch {}

    await admin.from('user_premium').upsert({
      user_id: userId,
      premium: isActive,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    });

    // Mirror to play_accounts if userId is an email or maps to an email
    if (userId.includes('@')) {
      await admin.from('play_accounts').upsert({
        email: userId,
        is_premium: isActive,
        balance: isActive ? 999999 : 3,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });
    }
  }

  const mail = emailFor(type);
  if (mail) {
    let email: string | null = userId.includes('@') ? userId : null;
    if (!email) {
      const { data: userRes } = await admin.auth.admin.getUserById(userId);
      email = userRes?.user?.email ?? null;
    }
    if (email) await sendEmail(email, mail.subject, mail.html);
  }

  return new Response('ok', { status: 200 });
});
