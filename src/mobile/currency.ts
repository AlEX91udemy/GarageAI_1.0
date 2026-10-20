export type GarageCurrency = "rub" | "usd" | "eur";

export const GARAGE_CURRENCY_KEY = "garagehub_currency";

export const CURRENCY_SYMBOLS: Record<GarageCurrency, string> = {
  rub: "₽",
  usd: "$",
  eur: "€",
};

export function getGarageCurrency(): GarageCurrency {
  const saved = localStorage.getItem(GARAGE_CURRENCY_KEY);
  return saved === "usd" || saved === "eur" ? saved : "rub";
}

export function formatGarageCurrency(amount: number, currency = getGarageCurrency()): string {
  const formatted = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ${CURRENCY_SYMBOLS[currency]}`;
}
