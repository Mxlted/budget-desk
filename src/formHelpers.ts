import { parseFiniteNumber } from './amounts';
import { isISODate, isMonthKey, normalizeMonthKey } from './budgetMath';
import type { TransactionType } from './types';

export interface SelectOption {
  value: string;
  label: string;
}

export const getExpenseCategoryOptions = (categoryOptions: SelectOption[]) =>
  categoryOptions.filter((item) => item.value !== 'Income');

export const getFallbackExpenseCategory = (expenseCategoryOptions: SelectOption[]) =>
  expenseCategoryOptions[0]?.value ?? 'Other';

export const resolveTypedCategory = (
  type: TransactionType,
  category: string,
  expenseCategoryOptions: SelectOption[],
  fallbackCategory = getFallbackExpenseCategory(expenseCategoryOptions),
) => {
  if (type === 'income') {
    return 'Income';
  }

  return expenseCategoryOptions.some((item) => item.value === category)
    ? category
    : fallbackCategory;
};

export const parseISODate = (iso: string): Date | null => {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match || !isISODate(iso)) return null;

  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
};

export const dateToISO = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const monthKeyToDate = (month: string): Date | null => {
  if (!isMonthKey(month)) return null;

  const [year, m] = normalizeMonthKey(month).split('-').map(Number);
  return new Date(year, m - 1, 1, 12, 0, 0);
};

export const dateToMonthKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

export const inputValueToDate = (value: Date | string | null): Date | null => {
  if (!value) return null;

  if (typeof value === 'string') {
    if (isISODate(value)) {
      return parseISODate(value);
    }

    if (isMonthKey(value)) {
      return monthKeyToDate(value);
    }

    if (/^\d{4}-\d{2}(-\d{2})?$/.test(value)) {
      return null;
    }
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
};

export const clampDayOfMonth = (value: unknown, fallback = 1) =>
  Math.min(31, Math.max(1, Math.round(parseFiniteNumber(value, fallback))));
