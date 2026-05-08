import type {
  BudgetCategory,
  BudgetState,
  RecurringPurchase,
  SavingsGoal,
  Transaction,
} from './types';
import { parseFiniteNumber } from './amounts';

export const categoryCatalog: BudgetCategory[] = [
  {
    category: 'Housing',
    monthlyLimit: 1850,
    color: 'indigo.6',
    keywords: ['rent', 'mortgage', 'leasing', 'apartment'],
  },
  {
    category: 'Groceries',
    monthlyLimit: 620,
    color: 'teal.6',
    keywords: ['grocery', 'market', 'trader joe', 'aldi', 'kroger', 'whole foods', 'walmart'],
  },
  {
    category: 'Dining',
    monthlyLimit: 310,
    color: 'orange.6',
    keywords: ['restaurant', 'cafe', 'coffee', 'doordash', 'uber eats', 'grubhub', 'pizza'],
  },
  {
    category: 'Transportation',
    monthlyLimit: 420,
    color: 'cyan.7',
    keywords: ['gas', 'fuel', 'uber', 'lyft', 'parking', 'metro', 'transit'],
  },
  {
    category: 'Utilities',
    monthlyLimit: 260,
    color: 'yellow.7',
    keywords: ['electric', 'water', 'internet', 'utility', 'verizon', 'xfinity', 'at&t'],
  },
  {
    category: 'Entertainment',
    monthlyLimit: 230,
    color: 'pink.6',
    keywords: ['netflix', 'spotify', 'hulu', 'steam', 'cinema', 'concert', 'ticket'],
  },
  {
    category: 'Shopping',
    monthlyLimit: 340,
    color: 'grape.6',
    keywords: ['amazon', 'target', 'best buy', 'store', 'shop'],
  },
  {
    category: 'Health',
    monthlyLimit: 220,
    color: 'red.6',
    keywords: ['pharmacy', 'doctor', 'clinic', 'dental', 'health', 'cvs', 'walgreens'],
  },
  {
    category: 'Savings',
    monthlyLimit: 900,
    color: 'blue.7',
    keywords: ['transfer', 'savings', 'brokerage'],
  },
  {
    category: 'Income',
    monthlyLimit: 0,
    color: 'blue.6',
    keywords: ['payroll', 'deposit', 'salary', 'invoice'],
  },
  {
    category: 'Other',
    monthlyLimit: 250,
    color: 'gray.6',
    keywords: [],
  },
];

const accounts = ['Checking', 'Credit Card', 'Savings'];

// Anchor to noon UTC so timezone offsets cannot push the date into a different
// day/month than intended (an early-month local date can land in the previous
// UTC month otherwise, which corrupts seed data and month bucketing).
const currentMonth = (() => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
})();

const makeDate = (monthOffset: number, day: number) => {
  const now = new Date();
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, day, 12));
  return target.toISOString().slice(0, 10);
};

const sampleTransactions: Transaction[] = [
  {
    id: 'seed-income-1',
    date: makeDate(0, 1),
    merchant: 'Payroll deposit',
    category: 'Income',
    amount: 5400,
    type: 'income',
    account: 'Checking',
    source: 'manual',
  },
  {
    id: 'seed-grocery-1',
    date: makeDate(0, 3),
    merchant: 'Neighborhood Market',
    category: 'Groceries',
    amount: 112.49,
    type: 'expense',
    account: 'Credit Card',
    source: 'manual',
  },
  {
    id: 'seed-dining-1',
    date: makeDate(0, 5),
    merchant: 'Friday dinner',
    category: 'Dining',
    amount: 68.2,
    type: 'expense',
    account: 'Credit Card',
    source: 'manual',
  },
  {
    id: 'seed-transport-1',
    date: makeDate(0, 7),
    merchant: 'Fuel stop',
    category: 'Transportation',
    amount: 47.82,
    type: 'expense',
    account: 'Credit Card',
    source: 'manual',
  },
  {
    id: 'seed-health-1',
    date: makeDate(0, 10),
    merchant: 'Pharmacy refill',
    category: 'Health',
    amount: 24.5,
    type: 'expense',
    account: 'Credit Card',
    source: 'manual',
  },
  {
    id: 'seed-shopping-1',
    date: makeDate(-1, 12),
    merchant: 'Home office supplies',
    category: 'Shopping',
    amount: 146.33,
    type: 'expense',
    account: 'Credit Card',
    source: 'manual',
  },
  {
    id: 'seed-grocery-2',
    date: makeDate(-1, 9),
    merchant: 'Weekly groceries',
    category: 'Groceries',
    amount: 151.68,
    type: 'expense',
    account: 'Credit Card',
    source: 'manual',
  },
  {
    id: 'seed-income-2',
    date: makeDate(-1, 1),
    merchant: 'Payroll deposit',
    category: 'Income',
    amount: 5400,
    type: 'income',
    account: 'Checking',
    source: 'manual',
  },
  {
    id: 'seed-utilities-1',
    date: makeDate(-2, 16),
    merchant: 'Electric company',
    category: 'Utilities',
    amount: 128.9,
    type: 'expense',
    account: 'Checking',
    source: 'manual',
  },
  {
    id: 'seed-entertainment-1',
    date: makeDate(-2, 20),
    merchant: 'Concert tickets',
    category: 'Entertainment',
    amount: 94.0,
    type: 'expense',
    account: 'Credit Card',
    source: 'manual',
  },
];

const sampleRecurring: RecurringPurchase[] = [
  {
    id: 'rec-rent',
    merchant: 'Rent',
    category: 'Housing',
    amount: 1725,
    type: 'expense',
    day: 1,
    account: 'Checking',
    active: true,
    startMonth: currentMonth,
  },
  {
    id: 'rec-internet',
    merchant: 'Fiber internet',
    category: 'Utilities',
    amount: 78,
    type: 'expense',
    day: 12,
    account: 'Checking',
    active: true,
    startMonth: currentMonth,
  },
  {
    id: 'rec-streaming',
    merchant: 'Streaming bundle',
    category: 'Entertainment',
    amount: 42,
    type: 'expense',
    day: 18,
    account: 'Credit Card',
    active: true,
    startMonth: currentMonth,
  },
  {
    id: 'rec-auto-save',
    merchant: 'Automatic savings',
    category: 'Savings',
    amount: 650,
    type: 'expense',
    day: 2,
    account: 'Checking',
    active: true,
    startMonth: currentMonth,
  },
];

const sampleSavingsGoals: SavingsGoal[] = [
  {
    id: 'goal-emergency',
    name: 'Emergency fund',
    target: 12000,
    saved: 7800,
    monthlyContribution: 500,
    color: 'blue.7',
  },
  {
    id: 'goal-travel',
    name: 'Trip fund',
    target: 3000,
    saved: 1220,
    monthlyContribution: 150,
    color: 'cyan.7',
  },
];

export const createInitialBudgetState = (): BudgetState => ({
  transactions: sampleTransactions,
  recurring: sampleRecurring,
  budgets: categoryCatalog,
  categoryLimitsEnabled: true,
  savingsGoals: sampleSavingsGoals,
  accounts,
  plannedMonthlyIncome: 5400,
});

export const createEmptyBudgetState = (): BudgetState => ({
  transactions: [],
  recurring: [],
  budgets: categoryCatalog,
  categoryLimitsEnabled: true,
  savingsGoals: [],
  accounts,
  plannedMonthlyIncome: 0,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const safeNumber = (value: unknown, fallback = 0) => parseFiniteNumber(value, fallback);

const safeString = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback;

const safeType = (value: unknown) => (value === 'income' ? 'income' : 'expense');

const safeMonth = (value: unknown, fallback = currentMonth) =>
  typeof value === 'string' && /^\d{4}-\d{2}$/.test(value) ? value : fallback;

const safeDate = (value: unknown, fallback = currentMonth + '-01') =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;

const normalizeCategoryName = (value: unknown) => safeString(value).trim().replace(/\s+/g, ' ');

const safeKeywords = (value: unknown, fallback: string[] = []) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : fallback;

const cloneDefaultBudget = (category: string) => {
  const budget = categoryCatalog.find((item) => item.category === category) ?? categoryCatalog[0];

  return {
    ...budget,
    keywords: [...budget.keywords],
  };
};

const sanitizeBudgets = (savedBudgets: Record<string, unknown>[]): BudgetCategory[] => {
  if (savedBudgets.length === 0) {
    return categoryCatalog.map((budget) => ({ ...budget, keywords: [...budget.keywords] }));
  }

  const budgets = savedBudgets.reduce<BudgetCategory[]>((items, saved) => {
    const rawCategory = normalizeCategoryName(saved.category);
    const defaultBudget = categoryCatalog.find(
      (item) => item.category.toLowerCase() === rawCategory.toLowerCase(),
    );
    const category = defaultBudget?.category ?? rawCategory;

    if (
      !category ||
      items.some((item) => item.category.toLowerCase() === category.toLowerCase())
    ) {
      return items;
    }

    return [
      ...items,
      {
        category,
        monthlyLimit: Math.max(
          0,
          safeNumber(saved.monthlyLimit, defaultBudget?.monthlyLimit ?? 0),
        ),
        color: safeString(saved.color, defaultBudget?.color ?? 'gray.6'),
        keywords: safeKeywords(saved.keywords, defaultBudget?.keywords ?? []),
      },
    ];
  }, []);

  if (!budgets.some((budget) => budget.category === 'Income')) {
    budgets.push(cloneDefaultBudget('Income'));
  }

  if (!budgets.some((budget) => budget.category !== 'Income')) {
    budgets.push(cloneDefaultBudget('Other'));
  }

  return budgets;
};

const fallbackExpenseCategory = (budgets: BudgetCategory[]) =>
  budgets.find((budget) => budget.category !== 'Income')?.category ?? 'Other';

const safeExpenseCategory = (
  value: unknown,
  budgets: BudgetCategory[],
  fallback = fallbackExpenseCategory(budgets),
) => {
  const category = normalizeCategoryName(value);
  const match = budgets.find(
    (budget) =>
      budget.category.toLowerCase() === category.toLowerCase() && budget.category !== 'Income',
  );

  return match?.category ?? fallback;
};

// Savings goal accents avoid green/lime because those palettes are reserved
// elsewhere in the UI (e.g. positive cash flow, "all good" budget signals).
// Reusing them on goals would dilute that visual language, so we coerce
// any imported/legacy green-ish color back to the neutral fallback.
const safeNeutralAccent = (value: unknown, fallback = 'blue.6') => {
  const color = safeString(value, fallback);
  return color.startsWith('green') || color.startsWith('lime') ? fallback : color;
};

export const sanitizeBudgetState = (value: unknown): BudgetState => {
  const fallback = createInitialBudgetState();

  if (!isRecord(value)) {
    return fallback;
  }

  const savedBudgets = Array.isArray(value.budgets) ? value.budgets.filter(isRecord) : [];
  const budgets = sanitizeBudgets(savedBudgets);
  const defaultExpenseCategory = fallbackExpenseCategory(budgets);

  const transactions = Array.isArray(value.transactions)
    ? value.transactions.filter(isRecord).map((item, index): Transaction => {
        const type = safeType(item.type);

        return {
          id: safeString(item.id, `stored-transaction-${index}`),
          date: safeDate(item.date),
          merchant: safeString(item.merchant, 'Stored transaction'),
          category:
            type === 'income'
              ? 'Income'
              : safeExpenseCategory(item.category, budgets, defaultExpenseCategory),
          amount: Math.max(0, safeNumber(item.amount)),
          type,
          account: safeString(item.account, accounts[0]),
          notes: safeString(item.notes) || undefined,
          source: item.source === 'import' || item.source === 'recurring' ? item.source : 'manual',
        };
      })
    : [];
  const recurring = Array.isArray(value.recurring)
    ? value.recurring.filter(isRecord).map((item, index): RecurringPurchase => {
        const type = safeType(item.type);

        return {
          id: safeString(item.id, `stored-recurring-${index}`),
          merchant: safeString(item.merchant, 'Monthly item'),
          category:
            type === 'income'
              ? 'Income'
              : safeExpenseCategory(item.category, budgets, defaultExpenseCategory),
          amount: Math.max(0, safeNumber(item.amount)),
          type,
          day: Math.min(31, Math.max(1, Math.round(safeNumber(item.day, 1)))),
          account: safeString(item.account, accounts[0]),
          active: typeof item.active === 'boolean' ? item.active : true,
          startMonth: safeMonth(item.startMonth),
          endMonth: item.endMonth ? safeMonth(item.endMonth) : undefined,
          notes: safeString(item.notes) || undefined,
        };
      })
    : [];
  const savingsGoals = Array.isArray(value.savingsGoals)
    ? value.savingsGoals.filter(isRecord).map(
        (item, index): SavingsGoal => ({
          id: safeString(item.id, `stored-goal-${index}`),
          name: safeString(item.name, 'Savings goal'),
          target: Math.max(0, safeNumber(item.target)),
          saved: Math.max(0, safeNumber(item.saved)),
          monthlyContribution: Math.max(0, safeNumber(item.monthlyContribution)),
          color: safeNeutralAccent(item.color),
        }),
      )
    : [];
  const savedAccounts = Array.isArray(value.accounts)
    ? (value.accounts as string[]).filter((item) => typeof item === 'string' && item.trim())
    : [];
  const plannedMonthlyIncome =
    typeof value.plannedMonthlyIncome === 'number' && Number.isFinite(value.plannedMonthlyIncome)
      ? value.plannedMonthlyIncome
      : fallback.plannedMonthlyIncome;

  return {
    transactions,
    recurring,
    budgets,
    categoryLimitsEnabled:
      typeof value.categoryLimitsEnabled === 'boolean'
        ? value.categoryLimitsEnabled
        : fallback.categoryLimitsEnabled,
    savingsGoals,
    accounts: savedAccounts.length > 0 ? savedAccounts : accounts,
    plannedMonthlyIncome,
  };
};
