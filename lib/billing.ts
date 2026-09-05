import { supabase } from '@/lib/supabase';
import { PLANS, keyPackById } from '@/lib/premium';
import { usdToKES } from '@/lib/currency';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  email: string,
  label: string,
  kind: 'subscription' | 'keys',
  productId: string,
  keysCount?: number,
  expiresAt?: string,
): Promise<string | null> {
  await loadPaystackScript();

  const reference = `pataplay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  // Fallback if PaystackPop is not available on non-web or script error
  if (typeof window === 'undefined' || !(window as any).PaystackPop) {
    return reference;
  }

  return new Promise((resolve, reject) => {
    try {
      const handler = (window as any).PaystackPop.setup({
        key: process.env.EXPO_PUBLIC_PATASKILLS_PAYSTACK_PUBLIC_KEY || 'pk_test_placeholder',
        email,
        amount: Math.round(amountKES * 100),
        currency: 'KES',
        ref: reference,
        label,
        metadata: {
          email,
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

export async function purchasePlan(packageId: string, email: string, skill?: string, track?: string): Promise<PurchaseResult> {
  const plan = PLANS.find((p) => p.packageId === packageId) || PLANS[1];
  const amountKES = usdToKES(plan.annualUSD ?? plan.weeklyUSD ?? plan.monthlyUSD);
  const periodDays = plan.weeklyUSD ? 7 : plan.annualUSD ? 365 : 30;
  const expiresAt = new Date(Date.now() + periodDays * 86_400_000).toISOString();
  try {
    // Save email locally before payment
    await AsyncStorage.setItem('@play/user_email', email);
    const reference = await openCheckout(amountKES, email, `PataSkills ${plan.name}`, 'subscription', plan.packageId, undefined, expiresAt);
    if (!reference) return 'cancelled';
    // Save purchase to Supabase
    try {
      await supabase.from('play_purchases').upsert(
        { email, paystack_ref: reference, keys: 0, is_premium: true, updated_at: new Date().toISOString() },
        { onConflict: 'paystack_ref' }
      );
    } catch {}
    const { router } = await import('expo-router');
    // skill/track carried through so "Continue Playing" on payment-complete
    // resumes the same skill/track instead of falling back to
    // driving-theory (Bug B fix, §B.2/§C.1 of the multi-skill architecture
    // doc). Both are optional -- this purchase flow can be entered without
    // an active session context.
    router.replace({ pathname: '/payment-complete', params: { reference, type: 'subscription', email, ...(skill ? { skill } : {}), ...(track ? { track } : {}) } });
    return 'purchased';
  } catch {
    return 'error';
  }
}

export async function purchaseKeyPack(packId: string, email: string, skill?: string, track?: string): Promise<PurchaseResult> {
  const pack = keyPackById(packId);
  if (!pack) return 'error';
  const amountKES = usdToKES(pack.priceUSD);
  try {
    // Save email locally before payment
    await AsyncStorage.setItem('@play/user_email', email);
    const reference = await openCheckout(amountKES, email, `PataSkills ${pack.keys} keys`, 'keys', pack.productId, pack.keys);
    if (!reference) return 'cancelled';
    // Save purchase to Supabase
    try {
      await supabase.from('play_purchases').upsert(
        { email, paystack_ref: reference, keys: pack.keys, is_premium: false, updated_at: new Date().toISOString() },
        { onConflict: 'paystack_ref' }
      );
    } catch {}
    const { router } = await import('expo-router');
    // See purchasePlan()'s identical comment above -- same skill/track handoff.
    router.replace({ pathname: '/payment-complete', params: { reference, type: 'keys', count: String(pack.keys), email, ...(skill ? { skill } : {}), ...(track ? { track } : {}) } });
    return 'purchased';
  } catch {
    return 'error';
  }
}
