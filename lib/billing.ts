import { supabase } from '@/lib/supabase';
import { PLANS, keyPackById } from '@/lib/premium';
import { usdToKES } from '@/lib/currency';

const PAYSTACK_PUBLIC_KEY = process.env.EXPO_PUBLIC_PATASKILLS_PAYSTACK_PUBLIC_KEY || 'pk_test_placeholder';

export function billingAvailable(): boolean {
  return true;
}

let scriptPromise: Promise<void> | null = null;
function loadPaystackScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).PaystackPop) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Paystack'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

async function openCheckout(
  amountKES: number,
  label: string,
  kind: 'subscription' | 'keys',
  productId: string,
  keysCount?: number,
  expiresAt?: string,
): Promise<string | null> {
  await loadPaystackScript();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  const userEmail = user?.email || 'guest@pataskills.com';
  const userId = user?.id || 'guest';

  const reference = `pataplay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  // Fallback if PaystackPop is not available on non-web or script error
  if (typeof window === 'undefined' || !(window as any).PaystackPop) {
    return reference;
  }

  return new Promise((resolve, reject) => {
    try {
      const handler = (window as any).PaystackPop.setup({
        key: process.env.EXPO_PUBLIC_PATASKILLS_PAYSTACK_PUBLIC_KEY || 'pk_test_placeholder',
        email: userEmail,
        amount: Math.round(amountKES * 100),
        currency: 'KES',
        ref: reference,
        label,
        metadata: {
          user_id: userId,
          kind,
          product_id: productId,
          keys: keysCount ?? null,
          expires_at: expiresAt ?? null,
        },
        callback: () => resolve(reference),
        onClose: () => resolve(null),
      });
      handler.openIframe();
    } catch (e) {
      reject(e);
    }
  });
}

export type PurchaseResult = 'purchased' | 'cancelled' | 'unavailable' | 'error';

export async function purchasePlan(packageId: string): Promise<PurchaseResult> {
  const plan = PLANS.find((p) => p.packageId === packageId) || PLANS[1];
  const amountKES = usdToKES(plan.annualUSD ?? plan.weeklyUSD ?? plan.monthlyUSD);
  const periodDays = plan.weeklyUSD ? 7 : plan.annualUSD ? 365 : 30;
  const expiresAt = new Date(Date.now() + periodDays * 86_400_000).toISOString();
  try {
    const reference = await openCheckout(amountKES, `PataSkills ${plan.name}`, 'subscription', plan.packageId, undefined, expiresAt);
    if (!reference) return 'cancelled';
    const { router } = await import('expo-router');
    router.replace({ pathname: '/payment-complete', params: { reference, type: 'subscription' } });
    return 'purchased';
  } catch {
    return 'error';
  }
}

export async function purchaseKeyPack(packId: string): Promise<PurchaseResult> {
  const pack = keyPackById(packId);
  if (!pack) return 'error';
  const amountKES = usdToKES(pack.priceUSD);
  try {
    const reference = await openCheckout(amountKES, `PataSkills ${pack.keys} keys`, 'keys', pack.productId, pack.keys);
    if (!reference) return 'cancelled';
    const { router } = await import('expo-router');
    router.replace({ pathname: '/payment-complete', params: { reference, type: 'keys', count: String(pack.keys) } });
    return 'purchased';
  } catch {
    return 'error';
  }
}
