export interface Transaction {
  id: string;
  date: string;
  title: string;
  category: string;
  account: string;
  amount: number;
  currency: string; // 'ARS' | 'USD'
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  transferAmount?: number;
  transferCurrency?: string;
  toAccount?: string;
  receiveAmount?: number;
  receiveCurrency?: string;
  description?: string;
  dueDate?: string;
  installments?: string; // e.g. "6/6"
}

export interface BudgetGoal {
  category: string;
  monthlyLimitARS: number;
}

export interface RecurringRule {
  id: string;
  title: string;
  category: string;
  account: string;
  amount: number;
  currency: string;
  type: 'EXPENSE' | 'INCOME';
  dayOfMonth: number;
}

export interface InflationPoint {
  month: string; // YYYY-MM
  inflationIndex: number; // Cumulative inflation index
  usdArsRate: number; // Official or MEP rate
}

export type ViewTab = 'overview' | 'transactions' | 'accounts' | 'budgets' | 'recurring' | 'inflation' | 'ai-advisor';
export type DisplayCurrency = 'ARS' | 'USD';

export interface AccountCustomBalance {
  accountName: string;
  currentBalance: number;
  currency: string;
}

export interface TransactionFilter {
  type?: string;
  category?: string;
  account?: string;
  search?: string;
  month?: string; // YYYY-MM
}

export interface TrendPoint {
  month: string;
  isForecast?: boolean;
  isCurrentMonth?: boolean;
  income: number;
  expense: number;
  net: number;
  projectedIncome?: number;
  projectedExpense?: number;
  projectedNet?: number;
  forecastBalance: number;
  fxRate?: number;
}

export interface PredictiveMetrics {
  currentDayOfMonth: number;
  daysInMonth: number;
  daysRemaining: number;
  dailyExpenseVelocity: number;
  projectedRemainingVariableExpense: number;
  pendingRecurringIncome: number;
  pendingRecurringExpense: number;
  currentLiquidBalance: number;
  projectedEOMBalance: number;
  projectedEOMIncome: number;
  projectedEOMExpense: number;
  projectedEOMNet: number;
  projectedSavingsRate: number;
}

export interface RecurringOccurrence {
  id: string;
  date: string;
  month: string;
  amount: number;
  currency: string;
  account: string;
  title: string;
  description?: string;
  installments?: string;
}

export interface IdentifiedRecurringItem {
  id: string;
  title: string;
  cleanTitle: string;
  category: string;
  type: 'INCOME' | 'EXPENSE';
  account: string;
  currency: string;
  latestAmount: number;
  avgAmount: number;
  minAmount: number;
  maxAmount: number;
  dayOfMonth: number;
  occurrencesCount: number;
  distinctMonthsCount: number;
  isInstallment: boolean;
  installmentInfo?: string;
  history: RecurringOccurrence[];
  monthlyTrend: {
    month: string;
    amount: number;
    amountDisplay: number;
    currency: string;
    account: string;
  }[];
}


