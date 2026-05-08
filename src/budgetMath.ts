import { categoryCatalog } from './data';
import {
  fromCurrencyCents,
  normalizeCurrencyAmount,
  parseFiniteNumber,
  sumCurrency,
  toCurrencyCents,
} from './amounts';
import type {
  BudgetCategory,
  BudgetState,
  RecurringPurchase,
  StatementRow,
  Transaction,
} from './types';

export const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export const preciseCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const formatMonthKeyFromParts = (year: number, monthNumber: number) =>
  `${year}-${String(monthNumber).padStart(2, '0')}`;

const formatDateKeyFromParts = (year: number, monthNumber: number, day: number) =>
  `${formatMonthKeyFromParts(year, monthNumber)}-${String(day).padStart(2, '0')}`;

export const currentMonthKey = () => {
  const now = new Date();
  return formatMonthKeyFromParts(now.getFullYear(), now.getMonth() + 1);
};

export const isMonthKey = (value: string | null | undefined): boolean => {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return false;
  }

  const month = Number(match[2]);
  return month >= 1 && month <= 12;
};

export const normalizeMonthKey = (
  value: string | null | undefined,
  fallback: string = currentMonthKey(),
): string => (typeof value === 'string' && isMonthKey(value) ? value : fallback);

export const isISODate = (value: string | null | undefined): boolean => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day, 12, 0, 0);

  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
};

export const toMonthKey = (date: string) => (isISODate(date) ? date.slice(0, 7) : '');

export const formatMonth = (month: string) =>
  new Date(`${normalizeMonthKey(month)}-01T12:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

export const makeId = () => {
  const cryptoObj =
    typeof globalThis !== 'undefined' && 'crypto' in globalThis ? globalThis.crypto : undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const daysInMonth = (month: string) => {
  const [year, monthIndex] = normalizeMonthKey(month).split('-').map(Number);
  return new Date(year, monthIndex, 0).getDate();
};

export const addMonths = (month: string, offset: number) => {
  const [year, monthIndex] = normalizeMonthKey(month).split('-').map(Number);
  const date = new Date(year, monthIndex - 1 + offset, 1, 12, 0, 0);
  return formatMonthKeyFromParts(date.getFullYear(), date.getMonth() + 1);
};

export const monthRange = (endingMonth: string, months: number) => {
  const count = Math.max(0, Math.floor(months));

  return Array.from({ length: count }, (_, index) => addMonths(endingMonth, index - count + 1));
};

export const yearFromMonth = (month: string) => normalizeMonthKey(month).slice(0, 4);

export const yearMonthRange = (month: string) => {
  const year = yearFromMonth(month);

  return Array.from({ length: 12 }, (_, index) => {
    const monthNumber = String(index + 1).padStart(2, '0');
    return `${year}-${monthNumber}`;
  });
};

export const yearToDateMonthRange = (month: string) => {
  const normalizedMonth = normalizeMonthKey(month);
  const year = yearFromMonth(normalizedMonth);
  const endingMonthNumber = Number(normalizedMonth.slice(5, 7));

  return Array.from({ length: endingMonthNumber }, (_, index) => {
    const monthNumber = String(index + 1).padStart(2, '0');
    return `${year}-${monthNumber}`;
  });
};

export const recurringAppliesToMonth = (purchase: RecurringPurchase, month: string) => {
  if (!purchase.active) {
    return false;
  }

  const normalizedMonth = normalizeMonthKey(month);
  const startMonth = normalizeMonthKey(purchase.startMonth);
  const endMonth = purchase.endMonth ? normalizeMonthKey(purchase.endMonth, startMonth) : undefined;

  if (startMonth > normalizedMonth) {
    return false;
  }

  return !endMonth || endMonth >= normalizedMonth;
};

export const materializeRecurring = (
  recurring: RecurringPurchase[],
  month: string,
): Transaction[] =>
  recurring
    .filter((item) => recurringAppliesToMonth(item, month))
    .map((item) => {
      const normalizedMonth = normalizeMonthKey(month);
      const day = Math.min(Math.max(1, Math.round(item.day)), daysInMonth(normalizedMonth));

      return {
        id: `recurring-${item.id}-${normalizedMonth}`,
        date: formatDateKeyFromParts(
          Number(normalizedMonth.slice(0, 4)),
          Number(normalizedMonth.slice(5, 7)),
          day,
        ),
        merchant: item.merchant,
        category: item.type === 'income' ? 'Income' : item.category,
        amount: normalizeCurrencyAmount(item.amount),
        type: item.type,
        account: item.account,
        notes: item.notes,
        source: 'recurring',
      };
    });

export const monthTransactions = (state: BudgetState, month: string) => {
  const normalizedMonth = normalizeMonthKey(month);
  const oneTime = state.transactions.filter((item) => toMonthKey(item.date) === normalizedMonth);

  return [...oneTime, ...materializeRecurring(state.recurring, normalizedMonth)].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
};

export const summarizeMonth = (state: BudgetState, month: string) => {
  const rows = monthTransactions(state, month);
  let actualIncomeCents = 0;
  let expensesCents = 0;
  let recurringCents = 0;
  let recurringIncomeCents = 0;
  let manualExpensesCents = 0;

  rows.forEach((item) => {
    const cents = toCurrencyCents(item.amount);

    if (item.type === 'income') {
      actualIncomeCents += cents;

      if (item.source === 'recurring') {
        recurringIncomeCents += cents;
      }

      return;
    }

    expensesCents += cents;

    if (item.source === 'recurring') {
      recurringCents += cents;
    } else {
      manualExpensesCents += cents;
    }
  });

  const actualIncome = fromCurrencyCents(actualIncomeCents);
  const plannedIncome = Math.max(0, normalizeCurrencyAmount(state.plannedMonthlyIncome));
  const usesPlannedIncome = actualIncome <= 0 && plannedIncome > 0;
  const income = usesPlannedIncome ? plannedIncome : actualIncome;
  const expenses = fromCurrencyCents(expensesCents);
  const recurring = fromCurrencyCents(recurringCents);
  const recurringIncome = fromCurrencyCents(recurringIncomeCents);
  const manualExpenses = fromCurrencyCents(manualExpensesCents);
  const remaining = normalizeCurrencyAmount(income - expenses);

  return {
    rows,
    actualIncome,
    plannedIncome,
    income,
    usesPlannedIncome,
    expenses,
    recurring,
    recurringIncome,
    manualExpenses,
    remaining,
    savingsRate: income > 0 ? (remaining / income) * 100 : 0,
  };
};

export const categoryBreakdown = (state: BudgetState, month: string) => {
  const rows = monthTransactions(state, month).filter((item) => item.type === 'expense');
  const totals = new Map<string, number>();
  const colors = new Map(state.budgets.map((item) => [item.category, item.color]));

  rows.forEach((item) => {
    totals.set(item.category, (totals.get(item.category) ?? 0) + toCurrencyCents(item.amount));
  });

  return Array.from(totals.entries())
    .map(([category, cents]) => ({
      category,
      name: category,
      value: fromCurrencyCents(cents),
      color: colors.get(category) ?? 'gray.6',
    }))
    .sort((a, b) => b.value - a.value);
};

export const categoryBreakdownForMonths = (state: BudgetState, months: string[]) => {
  const totals = new Map<string, number>();
  const colors = new Map(state.budgets.map((item) => [item.category, item.color]));

  months.forEach((month) => {
    monthTransactions(state, month)
      .filter((item) => item.type === 'expense')
      .forEach((item) => {
        totals.set(item.category, (totals.get(item.category) ?? 0) + toCurrencyCents(item.amount));
      });
  });

  return Array.from(totals.entries())
    .map(([category, cents]) => ({
      category,
      name: category,
      value: fromCurrencyCents(cents),
      color: colors.get(category) ?? 'gray.6',
    }))
    .sort((a, b) => b.value - a.value);
};

export const trendData = (state: BudgetState, selectedMonth: string) =>
  monthRange(selectedMonth, 6).map((month) => {
    const summary = summarizeMonth(state, month);

    return {
      month: new Date(`${month}-01T12:00:00`).toLocaleDateString('en-US', { month: 'short' }),
      Expenses: summary.expenses,
      Income: summary.income,
      Recurring: summary.recurring,
    };
  });

export const yearlySummary = (state: BudgetState, selectedMonth: string) => {
  const months = yearToDateMonthRange(selectedMonth);
  const monthly = months.map((month) => {
    const summary = summarizeMonth(state, month);

    return {
      month,
      label: new Date(`${month}-01T12:00:00`).toLocaleDateString('en-US', { month: 'short' }),
      income: summary.income,
      actualIncome: summary.actualIncome,
      plannedIncome: summary.plannedIncome,
      usesPlannedIncome: summary.usesPlannedIncome,
      expenses: summary.expenses,
      recurring: summary.recurring,
      recurringIncome: summary.recurringIncome,
      remaining: summary.remaining,
      transactionCount: summary.rows.length,
    };
  });

  const income = sumCurrency(monthly.map((item) => item.income));
  const actualIncome = sumCurrency(monthly.map((item) => item.actualIncome));
  const plannedIncome = sumCurrency(monthly.map((item) => item.plannedIncome));
  const expenses = sumCurrency(monthly.map((item) => item.expenses));
  const recurring = sumCurrency(monthly.map((item) => item.recurring));
  const recurringIncome = sumCurrency(monthly.map((item) => item.recurringIncome));
  const remaining = normalizeCurrencyAmount(income - expenses);
  const monthsWithActivity = monthly.filter((item) => item.transactionCount > 0);
  const bestMonth = monthly.reduce((best, item) =>
    item.remaining > best.remaining ? item : best,
  );
  const highestExpenseMonth = monthly.reduce((highest, item) =>
    item.expenses > highest.expenses ? item : highest,
  );
  const monthCount = monthly.length;
  const endingMonthLabel = monthly[monthly.length - 1]?.label ?? '';
  const periodLabel =
    monthCount === 12
      ? yearFromMonth(selectedMonth)
      : `Jan-${endingMonthLabel} ${yearFromMonth(selectedMonth)}`;

  return {
    year: yearFromMonth(selectedMonth),
    periodLabel,
    months,
    monthCount,
    monthly,
    income,
    actualIncome,
    plannedIncome,
    expenses,
    recurring,
    recurringIncome,
    remaining,
    savingsRate: income > 0 ? (remaining / income) * 100 : 0,
    averageMonthlyExpenses: monthCount > 0 ? normalizeCurrencyAmount(expenses / monthCount) : 0,
    activeMonthCount: monthsWithActivity.length,
    bestMonth,
    highestExpenseMonth,
  };
};

export const budgetBars = (
  state: BudgetState,
  month: string,
  breakdown = categoryBreakdown(state, month),
) => {
  const spentByCategory = new Map(breakdown.map((item) => [item.category, item.value]));

  return state.budgets
    .map((budget) => {
      const spent = spentByCategory.get(budget.category) ?? 0;
      const monthlyLimit = normalizeCurrencyAmount(budget.monthlyLimit);

      return {
        category: budget.category,
        Spent: normalizeCurrencyAmount(spent),
        Budget: monthlyLimit,
        color: budget.color,
      };
    })
    .filter((item) => item.Budget > 0)
    .sort((a, b) => b.Spent / b.Budget - a.Spent / a.Budget);
};

export const detectCategory = (merchant: string, budgets: BudgetCategory[] = categoryCatalog) => {
  const normalized = merchant.toLowerCase();
  const match = budgets.find((budget) =>
    budget.keywords.some((keyword) => normalized.includes(keyword)),
  );
  const fallbackCategory =
    budgets.find((budget) => budget.category !== 'Income')?.category ?? 'Other';
  return match?.category ?? fallbackCategory;
};

const normalizeHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const parseDate = (value: string) => {
  const trimmed = value.trim();

  // ISO: 2024-03-15
  if (isISODate(trimmed)) {
    return trimmed;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return '';
  }

  // US: M/D/YYYY or MM/DD/YYYY (also tolerates dashes or dots, e.g. 03-15-2024)
  const usMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (usMatch) {
    const [, m, d, y] = usMatch;
    const month = m.padStart(2, '0');
    const day = d.padStart(2, '0');
    const isoDate = `${y}-${month}-${day}`;
    return isISODate(isoDate) ? isoDate : '';
  }

  // Last resort is locale-dependent; read local date parts to avoid UTC month drift.
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return formatDateKeyFromParts(year, Number(month), Number(day));
};

const parseDelimitedText = (text: string) => {
  const firstLine = text.split(/\r?\n/).find(Boolean) ?? '';
  const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(cell.trim());
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }

      row.push(cell.trim());
      cell = '';

      if (row.some(Boolean)) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some(Boolean)) {
    rows.push(row);
  }

  return rows;
};

export const parseStatement = (
  text: string,
  account: string,
  statementType: 'bank' | 'credit-card',
  budgets: BudgetCategory[],
): StatementRow[] => {
  const rows = parseDelimitedText(text);

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map(normalizeHeader);
  const findColumn = (candidates: string[]) =>
    headers.findIndex((header) => candidates.some((candidate) => header.includes(candidate)));

  const dateColumn = findColumn(['transactiondate', 'posteddate', 'postdate', 'date']);
  const merchantColumn = findColumn(['description', 'merchant', 'name', 'payee', 'details']);
  const amountColumn = findColumn(['amount', 'transactionamount']);
  const debitColumn = findColumn(['debit', 'withdrawal', 'charge']);
  const creditColumn = findColumn(['credit', 'deposit', 'payment']);

  if (
    dateColumn === -1 ||
    merchantColumn === -1 ||
    (amountColumn === -1 && debitColumn === -1 && creditColumn === -1)
  ) {
    return [];
  }

  return rows.slice(1).flatMap((row): StatementRow[] => {
    const date = parseDate(row[dateColumn] ?? '');
    const merchant = row[merchantColumn]?.trim() || 'Imported transaction';

    let amount = 0;
    let expense = false;

    if (amountColumn !== -1) {
      const signedAmount = normalizeCurrencyAmount(parseFiniteNumber(row[amountColumn] ?? ''));
      amount = normalizeCurrencyAmount(Math.abs(signedAmount));
      expense = statementType === 'credit-card' ? signedAmount > 0 : signedAmount < 0;
    } else {
      const debit =
        debitColumn !== -1
          ? normalizeCurrencyAmount(Math.abs(parseFiniteNumber(row[debitColumn] ?? '')))
          : 0;
      const credit =
        creditColumn !== -1
          ? normalizeCurrencyAmount(Math.abs(parseFiniteNumber(row[creditColumn] ?? '')))
          : 0;
      expense = debit > 0;
      amount = debit > 0 ? debit : credit;
    }

    if (!date || amount === 0) {
      return [];
    }

    return [
      {
        date,
        merchant,
        category: expense ? detectCategory(merchant, budgets) : 'Income',
        amount,
        type: expense ? 'expense' : 'income',
        account,
        notes: 'Imported from statement',
      },
    ];
  });
};
