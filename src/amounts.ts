export type NumericInputValue = number | string;

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

export const normalizeCurrencyAmount = (value: unknown, fallback = 0): number => {
  const parsed = parseFiniteNumber(value, fallback);
  const rounded = Math.round((parsed + Number.EPSILON) * 100) / 100;

  return Object.is(rounded, -0) ? 0 : rounded;
};
