import { formatPrice, usdToKES, formatUSDAmount, type CurrencyCode } from '@/lib/currency';

export interface Plan {
  id: string;
  name: string;
  monthlyUSD: number;
  annualUSD?: number;
  weeklyUSD?: number;
  popular?: boolean;
  packageId: string;
}

export const PLANS: Plan[] = [
  { id: 'weekly', name: 'Weekly', monthlyUSD: 4, weeklyUSD: 4, packageId: '$rc_weekly' },
  { id: 'regular', name: 'Regular', monthlyUSD: 12, popular: true, packageId: '$rc_monthly' },
  { id: 'annual', name: 'Annual', monthlyUSD: 10.8, annualUSD: 129.6, packageId: '$rc_annual' },
];

export function planById(id?: string): Plan | undefined {
  return PLANS.find((p) => p.id === id) || PLANS[1];
}

export interface KeyPack {
  id: string;
  keys: number;
  priceUSD: number;
  popular?: boolean;
  productId: string;
}

export const KEY_PACKS: KeyPack[] = [
  { id: 'pack_20', keys: 20, priceUSD: 2.0, productId: 'keys_20' },
  { id: 'pack_40', keys: 40, priceUSD: 4.0, popular: true, productId: 'keys_40' },
  { id: 'pack_80', keys: 80, priceUSD: 8.0, productId: 'keys_80' },
  { id: 'pack_120', keys: 120, priceUSD: 12.0, productId: 'keys_120' },
];

export function keyPackById(id?: string): KeyPack | undefined {
  return KEY_PACKS.find((p) => p.id === id) || KEY_PACKS[1];
}
