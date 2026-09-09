import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { PLANS, keyPackById } from '@/lib/premium';
import { getDeviceId } from '@/lib/deviceId';
import { linkDeviceToEmail, trackPurchaseInterested, trackPurchaseSuccess } from '@/lib/deviceAnalytics';

/**
 * Billing / subscriptions — Google Play Billing via RevenueCat
 * (react-native-purchases), ported from PataSkillsV2/lib/billing.ts for
 * play's email-identity model (no supabase.auth session here -- see
 * configureBilling()/purchasePlan()/purchaseKeyPack() below for how RC's
 * app_user_id gets bound to the email revenuecat-webhook expects).
 *
 * NATIVE MODULE: react-native-purchases is not in the JS bundle -- it's
 * linked into the app binary. This file lazy-`require`s it so the app keeps
 * running over OTA (and in Expo Go) before the SDK is built in; until then
 * every call degrades to a safe no-op and `configured` stays false.
 */

const RC_ANDROID_KEY = process.env.EXPO_PUBLIC_RC_ANDROID_KEY ?? '';
const ENTITLEMENT_ID = 'premium';

type PurchasesModule = any;
let Purchases: PurchasesModule | null = null;
let configured = false;

function nativeModule(): PurchasesModule | null {
  if (Purchases) return Purchases;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Purchases = require('react-native-purchases').default;
    return Purchases;
  } catch {
    return null;
  }
}

export function billingAvailable(): boolean {
  return nativeModule() != null;
}

/**
 * Initialise RevenueCat anonymously at launch. Unlike PataSkillsV2 (which
 * binds RC to supabase.auth's user id here), play has no auth session at
 * launch -- the email only exists once the user reaches keys-confirm.tsx /
 * subscription-confirm.tsx. So configureBilling() just brings the SDK up
 * under an RC-generated anonymous id; purchasePlan()/purchaseKeyPack() call
 * Purchases.logIn(email) right before the purchase, which re-aliases that
 * anonymous id to the email -- making app_user_id in RC's webhook payload
 * the same email revenuecat-webhook already expects (its
 * `if (userId.includes('@'))` mirror-to-play_accounts branch).
 */
export async function configureBilling(): Promise<void> {
  await enforceLocalExpiry();
  const mod = nativeModule();
  if (!mod || configured || Platform.OS !== 'android') return;
  // GUARD: react-native-purchases' native SDK throws a synchronous,
  // UNCATCHABLE native exception when configure() is called with an empty
  // apiKey -- it dispatches to a native bridge thread, so no JS try/catch
  // can ever catch it, and it crashes the whole app. Never call in without
  // a real key (same guard as PataSkillsV2/lib/billing.ts).
  if (!RC_ANDROID_KEY) return;
  try {
    mod.configure({ apiKey: RC_ANDROID_KEY });
    configured = true;
    // Reconcile on launch: if the store already says this device/account is
    // entitled (e.g. reinstall), mirror it locally right away.
    await syncEntitlement();
  } catch {
    /* leave unconfigured -- free tier still fully works */
  }
}

export interface StorePlan {
  id: string;
  packageId: string;
  priceString: string; // localised, from the store (e.g. "KES 13,500")
  title: string;
}

/**
 * The purchasable packages from the active RevenueCat offering, with
 * LOCALISED store pricing. Returns [] until the SDK is built in -- the UI
 * then falls back to the static PLANS copy (usdToKES estimate).
 */
export async function getStorePlans(): Promise<StorePlan[]> {
  const mod = nativeModule();
  if (!mod) return [];
  try {
    const offerings = await mod.getOfferings();
    const pkgs = offerings?.current?.availablePackages ?? [];
    return pkgs.map((p: any) => ({
      id: p.identifier,
      packageId: p.identifier,
      priceString: p.product?.priceString ?? '',
      title: p.product?.title ?? p.identifier,
    }));
  } catch {
    return [];
  }
}

export interface StoreKeyPack {
  /** Google Play / RevenueCat product id (KeyPack.productId). */
  productId: string;
  priceString: string; // localised, from the store (e.g. "KES 260")
}

/**
 * LOCALISED store pricing for the one-time keys packs (consumable INAPP
 * products). Returns [] until the SDK is built in -- the Keys page then
 * falls back to the static USD/KES estimate (formatUSDAmount), same as it
 * always has.
 */
export async function getStoreKeyPacks(productIds: string[]): Promise<StoreKeyPack[]> {
  const mod = nativeModule();
  if (!mod || productIds.length === 0) return [];
  try {
    const products = await mod.getProducts(productIds, 'INAPP');
    return (products ?? []).map((p: any) => ({
      productId: p.identifier,
      priceString: p.priceString ?? '',
    }));
  } catch {
    return [];
  }
}

export type PurchaseResult = 'purchased' | 'cancelled' | 'unavailable' | 'error';

export async function purchasePlan(packageId: string, email: string, skill?: string, track?: string): Promise<PurchaseResult> {
  const mod = nativeModule();
  if (!mod || !configured) return 'unavailable';
  const plan = PLANS.find((p) => p.packageId === packageId) || PLANS[1];
  const periodDays = plan.weeklyUSD ? 7 : plan.annualUSD ? 365 : 30;
  const fallbackExpiresAt = new Date(Date.now() + periodDays * 86_400_000).toISOString();
  try {
    await AsyncStorage.setItem('@play/user_email', email);
    void trackPurchaseInterested(plan.packageId, skill, track);

    // Re-alias RC's anonymous id to this email BEFORE purchasing, so the
    // purchase (and the webhook event it fires) is attributed to the email
    // -- see configureBilling()'s comment above.
    await mod.logIn(email);

    const offerings = await mod.getOfferings();
    const pkg = (offerings?.current?.availablePackages ?? []).find((p: any) => p.identifier === packageId);
    if (!pkg) return 'unavailable';
    const { customerInfo } = await mod.purchasePackage(pkg);
    const ent = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
    if (!ent) return 'error';

    await getDeviceId();
    await linkDeviceToEmail(email);
    void trackPurchaseSuccess(plan.packageId, skill, track);

    const expiresAt = ent?.expirationDate ?? fallbackExpiresAt;

    // Play Billing has already verified this purchase by the time we get
    // here -- payment-complete.tsx's native branch grants immediately from
    // these params, same as it always has (no self-grant Supabase write
    // needed here, unlike the removed web-side upserts in billing.web.ts).
    const { router } = await import('expo-router');
    router.replace({
      pathname: '/payment-complete',
      params: {
        type: 'subscription',
        email,
        expiresAt,
        ...(skill ? { skill } : {}),
        ...(track ? { track } : {}),
      },
    });
    return 'purchased';
  } catch (e: any) {
    if (e?.userCancelled) return 'cancelled';
    return 'error';
  }
}

export async function purchaseKeyPack(packId: string, email: string, skill?: string, track?: string): Promise<PurchaseResult> {
  const pack = keyPackById(packId);
  const mod = nativeModule();
  if (!pack) return 'error';
  if (!mod || !configured) return 'unavailable';
  try {
    await AsyncStorage.setItem('@play/user_email', email);
    void trackPurchaseInterested(pack.id, skill, track);

    await mod.logIn(email);

    const products = await mod.getProducts([pack.productId], 'INAPP');
    // GUARD 1: match the returned product's own identifier against the pack
    // we asked for, not array position -- an out-of-order/stale
    // getProducts() response could otherwise purchase (and credit keys for)
    // a different store product than the one the user tapped.
    const product = (products ?? []).find((p: any) => p?.identifier === pack.productId);
    if (!product) return 'unavailable';
    const { transaction } = await mod.purchaseStoreProduct(product);
    if (!transaction) return 'error';
    // GUARD 2, post-purchase: confirm the completed transaction is for THIS
    // key pack's product before treating the purchase as successful.
    const purchasedId = transaction?.productIdentifier ?? product.identifier;
    if (purchasedId !== pack.productId) return 'error';

    await getDeviceId();
    await linkDeviceToEmail(email);
    void trackPurchaseSuccess(pack.id, skill, track);

    // Same as purchasePlan() above -- Play Billing already confirmed this,
    // so payment-complete.tsx's native branch grants directly from params.
    const { router } = await import('expo-router');
    router.replace({
      pathname: '/payment-complete',
      params: { type: 'keys', count: String(pack.keys), email, ...(skill ? { skill } : {}), ...(track ? { track } : {}) },
    });
    return 'purchased';
  } catch (e: any) {
    if (e?.userCancelled) return 'cancelled';
    return 'error';
  }
}

export interface SubscriptionInfo {
  active: boolean;
  expiresAt: string | null;
  startedAt: string | null;
  willRenew: boolean | null;
  managementURL: string | null;
  billingIssueDetectedAt: string | null;
}

export async function getSubscriptionInfo(): Promise<SubscriptionInfo | null> {
  const mod = nativeModule();
  if (mod && configured) {
    try {
      const info = await mod.getCustomerInfo();
      const ent = info?.entitlements?.active?.[ENTITLEMENT_ID];
      if (ent) {
        return {
          active: true,
          expiresAt: ent?.expirationDate ?? null,
          startedAt: ent?.latestPurchaseDate ?? null,
          willRenew: typeof ent?.willRenew === 'boolean' ? ent.willRenew : null,
          managementURL: info?.managementURL ?? 'https://play.google.com/store/account/subscriptions',
          billingIssueDetectedAt: ent?.billingIssueDetectedAt ?? null,
        };
      }
      return null;
    } catch {
      /* offline, or the live call failed -- fall through to the local-state
       * check below (same fallback billing.web.ts uses). */
    }
  }

  try {
    const { getKeysState } = await import('@/lib/keys');
    const state = await getKeysState();
    if (!state.isPremium) return null;

    let expiresAt: string | null = state.expiresAt ?? null;
    if (!expiresAt) {
      expiresAt = await AsyncStorage.getItem('@play/premium_expires_at');
    }

    const email = await AsyncStorage.getItem('@play/user_email');
    if (email) {
      const { data } = await supabase
        .from('play_accounts')
        .select('is_premium')
        .eq('email', email)
        .maybeSingle();
      if (data && data.is_premium === false) {
        return null;
      }
    }

    return {
      active: true,
      expiresAt: expiresAt ?? null,
      startedAt: null,
      willRenew: null,
      managementURL: 'https://play.google.com/store/account/subscriptions',
      billingIssueDetectedAt: null,
    };
  } catch {
    return null;
  }
}

export interface PremiumOverrideInfo {
  awardedAt: string;
  expiresAt: string | null;
  claimed: boolean;
  permanent: boolean;
}

export async function getPremiumOverrideInfo(): Promise<PremiumOverrideInfo | null> {
  try {
    const { getKeysState } = await import('@/lib/keys');
    const state = await getKeysState();
    if (!state.isPremium) return null;
    const expiresAt = state.expiresAt ?? (await AsyncStorage.getItem('@play/premium_expires_at'));
    return {
      awardedAt: new Date().toISOString(),
      expiresAt: expiresAt ?? null,
      claimed: true,
      permanent: !expiresAt,
    };
  } catch {
    return null;
  }
}

export async function claimPremiumOverride(): Promise<void> {
  /* no-op */
}

export async function enforceLocalExpiry(): Promise<void> {
  try {
    const localExpires = await AsyncStorage.getItem('@play/premium_expires_at');
    if (localExpires) {
      const expTime = new Date(localExpires).getTime();
      if (!isNaN(expTime) && Date.now() >= expTime) {
        const { setPremium } = await import('@/lib/keys');
        await setPremium(false);
        await AsyncStorage.removeItem('@play/premium_expires_at');
        const email = await AsyncStorage.getItem('@play/user_email');
        if (email) {
          await supabase.from('play_accounts').update({ is_premium: false, balance: 3, updated_at: new Date().toISOString() }).eq('email', email);
        }
      }
    }
  } catch {
    /* best effort */
  }
}

export async function syncPremiumOverride(): Promise<void> {
  await enforceLocalExpiry();
}

/** Restore an existing subscription on a new device (Play account required). */
export async function restorePurchases(): Promise<boolean> {
  const mod = nativeModule();
  if (!mod || !configured) return false;
  try {
    const info = await mod.restorePurchases();
    const ent = info?.entitlements?.active?.[ENTITLEMENT_ID];
    if (ent) {
      const { setPremium } = await import('@/lib/keys');
      await setPremium(true, ent?.expirationDate ?? null);
      if (ent?.expirationDate) {
        await AsyncStorage.setItem('@play/premium_expires_at', ent.expirationDate);
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Re-read the live entitlement (call on launch / resume). */
export async function syncEntitlement(): Promise<boolean> {
  const mod = nativeModule();
  if (!mod || !configured) return false;
  try {
    const info = await mod.getCustomerInfo();
    const ent = info?.entitlements?.active?.[ENTITLEMENT_ID];
    if (ent) {
      const { setPremium } = await import('@/lib/keys');
      await setPremium(true, ent?.expirationDate ?? null);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
