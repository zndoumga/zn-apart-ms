import type { Currency } from '../types';

/**
 * Default exchange rate (EUR to FCFA)
 * 1 EUR = 655.957 FCFA (fixed CFA franc rate)
 */
export const DEFAULT_EXCHANGE_RATE = 655.957;

/**
 * Convert amount from one currency to another
 */
export function convertCurrency(
  amount: number,
  from: Currency,
  exchangeRate: number = DEFAULT_EXCHANGE_RATE
): number {
  if (from === 'EUR') {
    return Math.round(amount * exchangeRate);
  } else {
    return Math.round((amount / exchangeRate) * 100) / 100;
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(
  amount: number,
  currency: Currency,
  options?: {
    showSymbol?: boolean;
    compact?: boolean;
  }
): string {
  const { showSymbol = true, compact = false } = options || {};
  
  if (currency === 'EUR') {
    const formatted = new Intl.NumberFormat('fr-FR', {
      style: showSymbol ? 'currency' : 'decimal',
      currency: 'EUR',
      notation: compact ? 'compact' : 'standard',
      minimumFractionDigits: compact ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return formatted;
  } else {
    const formatted = new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      notation: compact ? 'compact' : 'standard',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    return showSymbol ? `${formatted} FCFA` : formatted;
  }
}

/**
 * Format currency with both EUR and FCFA
 */
export function formatDualCurrency(
  amountEUR: number,
  amountFCFA: number,
  primaryCurrency: Currency = 'EUR'
): string {
  if (primaryCurrency === 'EUR') {
    return `${formatCurrency(amountEUR, 'EUR')} (${formatCurrency(amountFCFA, 'FCFA')})`;
  } else {
    return `${formatCurrency(amountFCFA, 'FCFA')} (${formatCurrency(amountEUR, 'EUR')})`;
  }
}

/**
 * Parse currency input (handles both EUR and FCFA inputs)
 */
export function parseCurrencyInput(
  value: string,
  currency: Currency
): number {
  // Remove currency symbols and spaces
  const cleaned = value
    .replace(/[€$FCFA\s]/g, '')
    .replace(/,/g, '.')
    .replace(/\s/g, '');
  
  const parsed = parseFloat(cleaned);
  
  if (isNaN(parsed)) {
    return 0;
  }
  
  return currency === 'EUR' 
    ? Math.round(parsed * 100) / 100 
    : Math.round(parsed);
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: Currency): string {
  return currency === 'EUR' ? '€' : 'FCFA';
}

/**
 * Calculate amounts in both currencies
 */
export function calculateBothCurrencies(
  amount: number,
  inputCurrency: Currency,
  exchangeRate: number = DEFAULT_EXCHANGE_RATE
): { EUR: number; FCFA: number } {
  if (inputCurrency === 'EUR') {
    return {
      EUR: amount,
      FCFA: Math.round(amount * exchangeRate),
    };
  } else {
    return {
      EUR: Math.round((amount / exchangeRate) * 100) / 100,
      FCFA: amount,
    };
  }
}

