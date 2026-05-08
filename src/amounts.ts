export type NumericInputValue = number | string;

const CENTS_PER_DOLLAR = 100;

export const parseFiniteNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value
    .trim()
    .replace(/^\((.*)\)$/, '-$1')
    .replace(/[$,\s]/g, '');

  if (!normalized || normalized === '-' || normalized === '.') {
    return fallback;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const toCurrencyCents = (value: unknown, fallback = 0): number => {
  const parsed = parseFiniteNumber(value, fallback);
  const sign = parsed < 0 ? -1 : 1;

  return sign * Math.round(Math.abs(parsed) * CENTS_PER_DOLLAR + Number.EPSILON);
};

export const fromCurrencyCents = (cents: number): number => {
  const normalizedCents = Number.isFinite(cents) ? Math.round(cents) : 0;
  const amount = normalizedCents / CENTS_PER_DOLLAR;

  return Object.is(amount, -0) ? 0 : amount;
};

export const normalizeCurrencyAmount = (value: unknown, fallback = 0): number => {
  return fromCurrencyCents(toCurrencyCents(value, fallback));
};

export const sumCurrency = (values: unknown[]): number => {
  const cents = values.reduce<number>((sum, value) => sum + toCurrencyCents(value), 0);

  return fromCurrencyCents(cents);
};
