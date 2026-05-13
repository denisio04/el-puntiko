export type CurrencyCode = "USD" | "CUP" | "ZELLE";

export interface ExchangeRates {
  usdToCup: number;
  zelleToCup: number;
}

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: "$",
  CUP: "CUP",
  ZELLE: "ZLLE",
};

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  USD: "USD (Dólar)",
  CUP: "CUP (Peso Cubano)",
  ZELLE: "ZELLE",
};

/**
 * Convierte un precio desde USD a la moneda destino usando las tasas dadas.
 *
 * - USD → USD: sin cambios
 * - USD → CUP: price * usdToCup
 * - USD → ZELLE: price * usdToCup / zelleToCup (derivado)
 *
 * @throws Error si alguna tasa es <= 0
 */
export function convertPrice(
  priceInUSD: number,
  targetCurrency: CurrencyCode,
  rates: ExchangeRates
): number {
  if (rates.usdToCup <= 0) {
    throw new Error(`usdToCup rate must be > 0, got ${rates.usdToCup}`);
  }
  if (rates.zelleToCup <= 0) {
    throw new Error(`zelleToCup rate must be > 0, got ${rates.zelleToCup}`);
  }

  switch (targetCurrency) {
    case "USD":
      return priceInUSD;
    case "CUP":
      return priceInUSD * rates.usdToCup;
    case "ZELLE":
      return (priceInUSD * rates.usdToCup) / rates.zelleToCup;
    default:
      return priceInUSD;
  }
}

/**
 * Formatea un precio según la moneda.
 *
 * USD: $10.00
 * CUP: CUP 3,250.00
 * ZELLE: 10.00 ZLLE
 */
export function formatConvertedPrice(
  amount: number,
  currency: CurrencyCode
): string {
  switch (currency) {
    case "USD":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
    case "CUP":
      return `CUP ${new Intl.NumberFormat("es-CU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)}`;
    case "ZELLE":
      return `${new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)} ZLLE`;
    default:
      return `${amount.toFixed(2)}`;
  }
}
