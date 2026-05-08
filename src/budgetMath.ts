import { categoryCatalog } from './data';
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

export const currentMonthKey = () => new Date().toISOString().slice(0, 7);

export const isMonthKey = (value: string | null | undefined): value is string => {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}-01T12:00:00`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 7) === value;
};

export const normalizeMonthKey = (
  value: string | null | undefined,
  fallback: string = currentMonthKey(),
): string => (isMonthKey(value) ? value : fallback);

export const toMonthKey = (date: string) => date.slice(0, 7);

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
  const date = new Date(year, monthIndex - 1 + offset, 1);
  return date.toISOString().slice(0, 7);
};

export const monthRange = (endingMonth: string, months: number) =>
  Array.from({ length: months }, (_, index) => addMonths(endingMonth, index - months + 1));

export const recurringAppliesToMonth = (purchase: RecurringPurchase, month: string) => {
  if (!purchase.active) {
    return false;
  }

  if (purchase.startMonth > month) {
    return false;
  }

  return !purchase.endMonth || purchase.endMonth >= month;
};

export const materializeRecurring = (
  recurring: RecurringPurchase[],
  month: string,
): Transaction[] =>
  recurring
    .filter((item) => recurringAppliesToMonth(item, month))
    .map((item) => {
      const day = String(Math.min(item.day, daysInMonth(month))).padStart(2, '0');

      return {
        id: `recurring-${item.id}-${month}`,
        date: `${month}-${day}`,
        merchant: item.merchant,
        category: item.type === 'income' ? 'Income' : item.category,
        amount: item.amount,
        type: item.type,
        account: item.account,
        notes: item.notes,
        source: 'recurring',
      };
    });

export const monthTransactions = (state: BudgetState, month: string) => {
  const oneTime = state.transactions.filter((item) => toMonthKey(item.date) === month);
  return [...oneTime, ...materializeRecurring(state.recurring, month)].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
};

export const summarizeMonth = (state: BudgetState, month: string) => {
  const rows = monthTransactions(state, month);
  const income = rows
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + item.amount, 0);
  const expenses = rows
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0);
  const recurring = rows
    .filter((item) => item.source === 'recurring' && item.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0);
  const manualExpenses = rows
    .filter((item) => item.source !== 'recurring' && item.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0);

  return {
    rows,
    income,
    expenses,
    recurring,
    manualExpenses,
    remaining: income - expenses,
    savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
  };
};

export const categoryBreakdown = (state: BudgetState, month: string) => {
  const rows = monthTransactions(state, month).filter((item) => item.type === 'expense');
  const totals = new Map<string, number>();

  rows.forEach((item) => {
    totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount);
  });

  return Array.from(totals.entries())
    .map(([category, value]) => ({
      category,
      name: category,
      value: Number(value.toFixed(2)),
      color: state.budgets.find((item) => item.category === category)?.color ?? 'gray.6',
    }))
    .sort((a, b) => b.value - a.value);
};

export const trendData = (state: BudgetState, selectedMonth: string) =>
  monthRange(selectedMonth, 6).map((month) => {
    const summary = summarizeMonth(state, month);

    return {
      month: new Date(`${month}-01T12:00:00`).toLocaleDateString('en-US', { month: 'short' }),
      Expenses: Number(summary.expenses.toFixed(2)),
      Income: Number(summary.income.toFixed(2)),
      Recurring: Number(summary.recurring.toFixed(2)),
    };
  });

export const budgetBars = (state: BudgetState, month: string) => {
  const breakdown = categoryBreakdown(state, month);

  return state.budgets
    .filter((item) => item.monthlyLimit > 0)
    .map((budget) => {
      const spent = breakdown.find((item) => item.category === budget.category)?.value ?? 0;

      return {
        category: budget.category,
        Spent: Number(spent.toFixed(2)),
        Budget: budget.monthlyLimit,
        color: budget.color,
      };
    })
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

const stripCurrency = (value: string) => {
  const trimmed = value.trim().replace(/\((.*)\)/, '-$1');
  const normalized = trimmed.replace(/[$,\s]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const parseDate = (value: string) => {
  const trimmed = value.trim();

  // ISO: 2024-03-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // US: M/D/YYYY or MM/DD/YYYY (also tolerates dashes or dots, e.g. 03-15-2024)
  const usMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (usMatch) {
    const [, m, d, y] = usMatch;
    const month = m.padStart(2, '0');
    const day = d.padStart(2, '0');
    return `${y}-${month}-${day}`;
  }

  // Last resort — locale-dependent, but anchor to noon UTC to avoid TZ drift
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

    let signedAmount = 0;
    if (amountColumn !== -1) {
      signedAmount = stripCurrency(row[amountColumn] ?? '');
    } else {
      const debit = debitColumn !== -1 ? stripCurrency(row[debitColumn] ?? '') : 0;
      const credit = creditColumn !== -1 ? stripCurrency(row[creditColumn] ?? '') : 0;
      signedAmount = credit - debit;
    }

    if (!date || signedAmount === 0) {
      return [];
    }

    const expense = statementType === 'credit-card' ? signedAmount > 0 : signedAmount < 0;

    return [
      {
        date,
        merchant,
        category: expense ? detectCategory(merchant, budgets) : 'Income',
        amount: Math.abs(signedAmount),
        type: expense ? 'expense' : 'income',
        account,
        notes: 'Imported from statement',
      },
    ];
  });
};
