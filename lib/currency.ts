import { Platform } from 'react-native';

export type CurrencyCode = 'KES' | 'USD';

export const KES_PER_USD = 129;

export function usdToKES(amountUSD: number): number {
  return Math.round(amountUSD * KES_PER_USD);
}

export function formatUSDAmount(amountUSD: number, currency: CurrencyCode = 'USD'): string {
  if (currency === 'USD') {
    return `$${amountUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `KES ${usdToKES(amountUSD).toLocaleString('en-US')}`;
}

export function formatPrice(amountKES: number, currency: CurrencyCode = 'KES'): string {
  if (currency === 'KES') return `KES ${amountKES.toLocaleString('en-US')}`;
  const usd = amountKES / KES_PER_USD;
  return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function splitCurrencyAmount(priceString: string): { currency: string; amount: string } {
  const match = /^([^0-9.]+)\s*(.*)$/.exec(priceString.trim());
  if (match) {
    return { currency: match[1].trim(), amount: match[2].trim() };
  }
  return { currency: '', amount: priceString };
}
