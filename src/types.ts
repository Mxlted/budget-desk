export type TransactionType = 'expense' | 'income';
export type TransactionSource = 'manual' | 'import' | 'recurring';

export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  category: string;
  amount: number;
  type: TransactionType;
  account: string;
  notes?: string;
  source: TransactionSource;
}

export interface RecurringPurchase {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  type: TransactionType;
  day: number;
  account: string;
  active: boolean;
  startMonth: string;
  endMonth?: string;
  notes?: string;
}

export interface BudgetCategory {
  category: string;
  monthlyLimit: number;
  color: string;
  keywords: string[];
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  saved: number;
  monthlyContribution: number;
  color: string;
}

export interface BudgetState {
  transactions: Transaction[];
  recurring: RecurringPurchase[];
  budgets: BudgetCategory[];
  categoryLimitsEnabled: boolean;
  savingsGoals: SavingsGoal[];
  accounts: string[];
  plannedMonthlyIncome: number;
}

export type BudgetProfileTemplate = 'empty' | 'sample' | 'current';

export interface BudgetProfile {
  id: string;
  name: string;
  state: BudgetState;
  createdAt: string;
  updatedAt: string;
}

export interface StatementRow {
  date: string;
  merchant: string;
  category: string;
  amount: number;
  type: TransactionType;
  account: string;
  notes?: string;
}
