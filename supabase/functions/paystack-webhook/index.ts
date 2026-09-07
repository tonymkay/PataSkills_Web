// Supabase Edge Function: paystack-webhook
//
// Paystack web payments for PataSkills and Play apps.
// Signs the raw body with PATASKILLS_PAYSTACK_SECRET_KEY (HMAC-SHA512).
//
// Deploy:
//   npx supabase functions deploy paystack-webhook --no-verify-jwt --project-ref sdevofgaeiwkfinlmnab
//   npx supabase secrets set PATASKILLS_PAYSTACK_SECRET_KEY=sk_test_xxx --project-ref sdevofgaeiwkfinlmnab

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PAYSTACK_SECRET = Deno.env.get('PATASKILLS_PAYSTACK_SECRET_KEY') ?? '';

const KES_PER_USD = 129;
const KEY_PACKS: Record<string, { keys: number; priceUSD: number }> = {
  pataskills_keys_20: { keys: 20, priceUSD: 2 },
  pataskills_keys_40: { keys: 40, priceUSD: 4 },
  pataskills_keys_60: { keys: 60, priceUSD: 6 },
  pataskills_keys_80: { keys: 80, priceUSD: 8 },
  pataskills_keys_100: { keys: 100, priceUSD: 10 },
  pataskills_keys_120: { keys: 120, priceUSD: 12 },
  pataskills_keys_140: { keys: 140, priceUSD: 14 },
  pataskills_keys_160: { keys: 160, priceUSD: 16 },
};
const PLANS: Record<string, { priceUSD: number; periodDays: number }> = {
  $rc_weekly: { priceUSD: 4, periodDays: 7 },
  $rc_monthly: { priceUSD: 12, periodDays: 30 },
  $rc_annual: { priceUSD: 129.6, periodDays: 365 },
};
function expectedAmountKobo(priceUSD: number): number {
  return Math.round(Math.round(priceUSD * KES_PER_USD) * 100);
}
const AMOUNT_TOLERANCE_KOBO = 100;

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

async function verifySignature(rawBody: string, signature: string): Promise<boolean> {
  if (!PAYSTACK_SECRET || !signature) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(PAYSTACK_SECRET),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const computed = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return computed === signature;
}

Deno.serve(async (req) => {
  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature') ?? '';
  if (!(await verifySignature(rawBody, signature))) {
    return new Response('unauthorized', { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response('bad request', { status: 400 });
  }

  const eventType: string = body?.event ?? '';
  const data = body?.data ?? {};
  const reference: string | null = data?.reference ?? null;
  const userId: string | null = data?.metadata?.user_id ?? null;
  const userEmail: string | null = data?.metadata?.email ?? data?.customer?.email ?? null;
  const amount: number | null = data?.amount ?? null;
  const currency: string | null = data?.currency ?? null;
  const status: string = data?.status ?? eventType;
  const kind: string = data?.metadata?.kind ?? 'subscription';
  const productId: string | null = data?.metadata?.product_id ?? null;

  let keysCount: number | null = null;
  let expiresAt: string | null = null;
  let amountVerified = false;

  if (kind === 'keys' && productId && KEY_PACKS[productId]) {
    const pack = KEY_PACKS[productId];
    keysCount = pack.keys;
    amountVerified = amount != null && Math.abs(amount - expectedAmountKobo(pack.priceUSD)) <= AMOUNT_TOLERANCE_KOBO;
  } else if (kind === 'subscription' && productId && PLANS[productId]) {
    const plan = PLANS[productId];
    expiresAt = new Date(Date.now() + plan.periodDays * 86_400_000).toISOString();
    amountVerified = amount != null && Math.abs(amount - expectedAmountKobo(plan.priceUSD)) <= AMOUNT_TOLERANCE_KOBO;
  }

  const finalStatus = status === 'success' && !amountVerified ? 'flagged_amount_mismatch' : status;

  // 1. Audit log in web_purchases
  if (reference) {
    await admin.from('web_purchases').upsert(
      {
        user_id: userId,
        paystack_ref: reference,
        paystack_event: eventType,
        amount_kobo: amount,
        currency,
        status: finalStatus,
        kind,
        keys: keysCount,
        product_id: productId,
        raw_payload: body,
      },
      { onConflict: 'paystack_ref' },
    );
  }

  // 2. Mirror into play_purchases and play_accounts for Play app
  if (reference && userEmail && eventType === 'charge.success' && amountVerified) {
    if (kind === 'subscription') {
      await admin.from('play_accounts').upsert(
        {
          email: userEmail,
          balance: 999999,
          is_premium: true,
          reset_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email' },
      );
      await admin.from('play_purchases').upsert(
        {
          email: userEmail,
          paystack_ref: reference,
          keys: 0,
          is_premium: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'paystack_ref' },
      );
    } else if (kind === 'keys' && keysCount) {
      await admin.from('play_purchases').upsert(
        {
          email: userEmail,
          paystack_ref: reference,
          keys: keysCount,
          is_premium: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'paystack_ref' },
      );
    }
  }

  // 3. Grant Premium entitlement to PataSkills tables
  if (eventType === 'charge.success' && userId && kind === 'subscription' && amountVerified) {
    try {
      await admin.rpc('set_subscription', {
        p_user_id: userId,
        p_active: true,
        p_product: data?.plan?.plan_code ?? 'web_premium',
        p_expires: expiresAt,
        p_store: 'paystack',
      });
    } catch {
      // best-effort if RPC not yet deployed
    }
    await admin.from('user_premium').upsert({
      user_id: userId,
      premium: true,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    });
  }

  return new Response('ok', { status: 200 });
});
