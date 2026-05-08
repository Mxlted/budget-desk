import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppShell,
  Box,
  Button,
  Group,
  MantineProvider,
  Paper,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  createTheme,
} from '@mantine/core';
import { Notifications, notifications } from '@mantine/notifications';
import { CalendarClock, Database, Plus, ReceiptText, Tags } from 'lucide-react';
import { normalizeCurrencyAmount } from './amounts';
import {
  budgetBars,
  categoryBreakdown,
  categoryBreakdownForMonths,
  currentMonthKey,
  formatMonth,
  makeId,
  parseStatement,
  preciseCurrency,
  summarizeMonth,
  trendData,
  yearlySummary,
} from './budgetMath';
import { categoryCatalog, createEmptyBudgetState, sanitizeBudgetState } from './data';
import { useBudgetState } from './hooks/useBudgetState';
import { useMonthNavigation } from './hooks/useMonthNavigation';
import { useTabNavigation } from './hooks/useTabNavigation';
import { AppHeader } from './components/AppHeader';
import { ConfirmModal, type ConfirmDetails } from './components/ConfirmModal';
import { MetricTile } from './components/MetricTile';
import { BudgetLimitsPanel } from './components/BudgetLimitsPanel';
import type {
  BudgetCategory,
  BudgetProfileTemplate,
  BudgetState,
  RecurringPurchase,
  StatementRow,
  Transaction,
} from './types';

const theme = createTheme({
  primaryColor: 'gray',
  defaultRadius: 'sm',
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headings: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
});

type ConfirmAction =
  | 'clear'
  | 'reset'
  | 'reset-category-limits-zero'
  | 'restore-category-limits'
  | 'delete-profile';

const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // 5 MB
const CUSTOM_CATEGORY_COLORS = [
  'indigo.6',
  'teal.6',
  'orange.6',
  'cyan.7',
  'pink.6',
  'grape.6',
  'red.6',
  'blue.7',
  'gray.6',
];

const showError = (title: string, message: string) =>
  notifications.show({ color: 'red', title, message });

const showInfo = (title: string, message: string) =>
  notifications.show({ color: 'blue', title, message });

const showNeutral = (title: string, message: string) =>
  notifications.show({ color: 'gray', title, message });

const normalizeCategoryName = (value: string) => value.trim().replace(/\s+/g, ' ');

const normalizeProfileName = (value: string) => value.trim().replace(/\s+/g, ' ');

const profileFileSlug = (value: string) =>
  normalizeProfileName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'budget';

const DashboardTab = lazy(() =>
  import('./components/tabs/DashboardTab').then((module) => ({ default: module.DashboardTab })),
);
const PurchasesTab = lazy(() =>
  import('./components/tabs/PurchasesTab').then((module) => ({ default: module.PurchasesTab })),
);
const MonthlyTab = lazy(() =>
  import('./components/tabs/MonthlyTab').then((module) => ({ default: module.MonthlyTab })),
);
const DataTab = lazy(() =>
  import('./components/tabs/DataTab').then((module) => ({ default: module.DataTab })),
);

function AppContent() {
  const {
    state,
    profiles,
    activeProfile,
    activeProfileId,
    setState,
    clearState,
    createProfile,
    renameProfile,
    deleteProfile,
    switchProfile,
  } = useBudgetState();
  const { selectedMonth, setActiveMonth } = useMonthNavigation();
  const { activeTab, setActiveTab } = useTabNavigation('dashboard');

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statementType, setStatementType] = useState<'bank' | 'credit-card'>('bank');
  const [importAccount, setImportAccount] = useState('Checking');
  const [importPreview, setImportPreview] = useState<StatementRow[]>([]);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  // ─── Memoized derived state ──────────────────────────────────────────────
  const monthSummary = useMemo(() => summarizeMonth(state, selectedMonth), [state, selectedMonth]);
  const dashboardData = useMemo(() => {
    if (activeTab !== 'dashboard') {
      return null;
    }

    const breakdown = categoryBreakdown(state, selectedMonth);
    const yearSummary = yearlySummary(state, selectedMonth);

    return {
      breakdown,
      bars: budgetBars(state, selectedMonth, breakdown),
      trend: trendData(state, selectedMonth),
      yearSummary,
      yearlyBreakdown: categoryBreakdownForMonths(state, yearSummary.months),
    };
  }, [activeTab, state, selectedMonth]);

  const categoryOptions = useMemo(
    () => state.budgets.map((item) => ({ value: item.category, label: item.category })),
    [state.budgets],
  );
  const profileOptions = useMemo(
    () => profiles.map((profile) => ({ value: profile.id, label: profile.name })),
    [profiles],
  );
  const accountOptions = useMemo(
    () => state.accounts.map((account) => ({ value: account, label: account })),
    [state.accounts],
  );
  const categoryLimitBudgets = useMemo(
    () => state.budgets.filter((budget) => budget.category !== 'Income'),
    [state.budgets],
  );
  const hasCategoryLimitValues = useMemo(
    () => categoryLimitBudgets.some((budget) => budget.monthlyLimit > 0),
    [categoryLimitBudgets],
  );
  const categoryLimitsEnabled = state.categoryLimitsEnabled;

  const filteredTransactions = useMemo(
    () => {
      if (activeTab !== 'transactions') {
        return [];
      }

      const searchQuery = query.trim().toLowerCase();

      return monthSummary.rows.filter((item) => {
        const matchesSearch =
          searchQuery.length === 0 ||
          `${item.merchant} ${item.category} ${item.account}`
            .toLowerCase()
            .includes(searchQuery);
        const matchesCategory = !categoryFilter || item.category === categoryFilter;
        return matchesSearch && matchesCategory;
      });
    },
    [activeTab, monthSummary.rows, query, categoryFilter],
  );

  useEffect(() => {
    setImportPreview([]);
    setQuery('');
    setCategoryFilter(null);
    setImportAccount(state.accounts[0] ?? 'Checking');
    // Only reset transient controls when the user switches profiles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfileId]);

  // ─── Action handlers ─────────────────────────────────────────────────────
  const handleAddTransaction = useCallback(
    (transaction: Transaction) => {
      setState((current) => ({ ...current, transactions: [transaction, ...current.transactions] }));
      showInfo('Saved', `${transaction.merchant} was added to ${formatMonth(selectedMonth)}.`);
    },
    [setState, selectedMonth],
  );

  const handleRemoveTransaction = useCallback(
    (id: string) => {
      setState((current) => ({
        ...current,
        transactions: current.transactions.filter((item) => item.id !== id),
      }));
    },
    [setState],
  );

  const handleUpdateTransaction = useCallback(
    (transaction: Transaction) => {
      setState((current) => ({
        ...current,
        transactions: current.transactions.map((item) =>
          item.id === transaction.id ? transaction : item,
        ),
      }));
      showInfo('Entry updated', `${transaction.merchant} was saved.`);
    },
    [setState],
  );

  const handleAddRecurring = useCallback(
    (item: RecurringPurchase) => {
      setState((current) => ({ ...current, recurring: [item, ...current.recurring] }));
      showInfo(`Monthly ${item.type} saved`, `${item.merchant} will appear in matching months.`);
    },
    [setState],
  );

  const handleUpdateRecurring = useCallback(
    (item: RecurringPurchase) => {
      setState((current) => ({
        ...current,
        recurring: current.recurring.map((currentItem) =>
          currentItem.id === item.id ? item : currentItem,
        ),
      }));
      showInfo(`Monthly ${item.type} updated`, `${item.merchant} was saved.`);
    },
    [setState],
  );

  const handleRemoveRecurring = useCallback(
    (id: string) => {
      setState((current) => ({
        ...current,
        recurring: current.recurring.filter((item) => item.id !== id),
      }));
    },
    [setState],
  );

  const handleAddCategory = useCallback(
    (categoryValue: string, monthlyLimit: number) => {
      const category = normalizeCategoryName(categoryValue);

      if (!category) {
        showError('Category needs a name', 'Enter a category name before adding it.');
        return false;
      }

      if (category.toLowerCase() === 'income') {
        showError('Income is reserved', 'Income is already managed as its own category.');
        return false;
      }

      if (
        state.budgets.some(
          (budget) => budget.category.toLowerCase() === category.toLowerCase(),
        )
      ) {
        showError('Category already exists', `${category} is already in your category list.`);
        return false;
      }

      const budget: BudgetCategory = {
        category,
        monthlyLimit: Math.max(0, normalizeCurrencyAmount(monthlyLimit)),
        color: CUSTOM_CATEGORY_COLORS[state.budgets.length % CUSTOM_CATEGORY_COLORS.length],
        keywords: [],
      };

      setState((current) => ({
        ...current,
        budgets: [...current.budgets, budget],
      }));
      showInfo('Category added', `${category} is now available for expenses.`);
      return true;
    },
    [setState, state.budgets],
  );

  const handleRemoveCategory = useCallback(
    (category: string) => {
      if (category === 'Income') {
        showError('Income is reserved', 'Income cannot be removed.');
        return;
      }

      const remainingExpenseCategories = state.budgets.filter(
        (budget) => budget.category !== category && budget.category !== 'Income',
      );

      if (remainingExpenseCategories.length === 0) {
        showError(
          'Keep one expense category',
          'Add a custom category before removing the last expense category.',
        );
        return;
      }

      const fallbackCategory = remainingExpenseCategories[0].category;

      setState((current) => ({
        ...current,
        budgets: current.budgets.filter((budget) => budget.category !== category),
        transactions: current.transactions.map((transaction) =>
          transaction.type === 'expense' && transaction.category === category
            ? { ...transaction, category: fallbackCategory }
            : transaction,
        ),
        recurring: current.recurring.map((item) =>
          item.type === 'expense' && item.category === category
            ? { ...item, category: fallbackCategory }
            : item,
        ),
      }));

      if (categoryFilter === category) {
        setCategoryFilter(null);
      }

      showNeutral('Category removed', `${category} entries now use ${fallbackCategory}.`);
    },
    [categoryFilter, setState, state.budgets],
  );

  const handleSelectProfile = useCallback(
    (profileId: string) => {
      switchProfile(profileId);
    },
    [switchProfile],
  );

  const handleCreateProfile = useCallback(
    (name: string, template: BudgetProfileTemplate) => {
      const profileName = normalizeProfileName(name);

      if (!profileName) {
        showError('Profile needs a name', 'Name the budget profile before creating it.');
        return false;
      }

      if (
        profiles.some((profile) => profile.name.toLowerCase() === profileName.toLowerCase())
      ) {
        showError('Profile already exists', `${profileName} is already in your profile list.`);
        return false;
      }

      createProfile(profileName, template);
      showInfo('Profile created', `${profileName} is now the active budget profile.`);
      return true;
    },
    [createProfile, profiles],
  );

  const handleRenameActiveProfile = useCallback(
    (name: string) => {
      const profileName = normalizeProfileName(name);

      if (!profileName) {
        showError('Profile needs a name', 'Enter a name before saving this profile.');
        return false;
      }

      if (
        profiles.some(
          (profile) =>
            profile.id !== activeProfileId &&
            profile.name.toLowerCase() === profileName.toLowerCase(),
        )
      ) {
        showError('Profile already exists', `${profileName} is already in your profile list.`);
        return false;
      }

      renameProfile(activeProfileId, profileName);
      showInfo('Profile renamed', `This budget profile is now ${profileName}.`);
      return true;
    },
    [activeProfileId, profiles, renameProfile],
  );

  const handleDeleteActiveProfile = useCallback(() => {
    if (profiles.length <= 1) {
      showError('Keep one profile', 'Create another budget profile before deleting this one.');
      return;
    }

    const deletedName = activeProfile.name;
    deleteProfile(activeProfileId);
    showNeutral('Profile deleted', `${deletedName} was removed from this browser.`);
  }, [activeProfile.name, activeProfileId, deleteProfile, profiles.length]);

  const handleToggleRecurring = useCallback(
    (id: string) => {
      setState((current) => ({
        ...current,
        recurring: current.recurring.map((item) =>
          item.id === id ? { ...item, active: !item.active } : item,
        ),
      }));
    },
    [setState],
  );

  const handlePreviewStatement = useCallback(
    async (file: File | null) => {
      if (!file) {
        return;
      }
      if (file.size > MAX_IMPORT_BYTES) {
        showError(
          'File too large',
          `CSV must be smaller than ${MAX_IMPORT_BYTES / 1024 / 1024} MB.`,
        );
        return;
      }

      const text = await file.text();
      const rows = parseStatement(text, importAccount, statementType, state.budgets);
      setImportPreview(rows);

      notifications.show({
        color: rows.length > 0 ? 'blue' : 'red',
        title: rows.length > 0 ? 'Statement parsed' : 'No usable rows found',
        message:
          rows.length > 0
            ? `${rows.length} transactions are ready to review.`
            : 'Try a CSV with date, description, and amount columns.',
      });
    },
    [importAccount, statementType, state.budgets],
  );

  const handleImportRows = useCallback(() => {
    if (importPreview.length === 0) return;

    setState((current) => ({
      ...current,
      transactions: [
        ...importPreview.map((item) => ({ ...item, id: makeId(), source: 'import' as const })),
        ...current.transactions,
      ],
    }));
    showInfo('Statement imported', `${importPreview.length} rows were saved.`);
    setImportPreview([]);
  }, [importPreview, setState]);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `budget-desk-${profileFileSlug(activeProfile.name)}-${selectedMonth}.json`;
    // Append before click — Firefox refuses to download from a detached anchor.
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [activeProfile.name, state, selectedMonth]);

  const handleImportData = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (file.size > MAX_IMPORT_BYTES) {
        showError(
          'File too large',
          `Backup must be smaller than ${MAX_IMPORT_BYTES / 1024 / 1024} MB.`,
        );
        return;
      }

      try {
        const parsed: unknown = JSON.parse(await file.text());
        // Defensive structural check — sanitizeBudgetState handles deeper cases,
        // but this gives a clear error message before clobbering state.
        if (
          typeof parsed !== 'object' ||
          parsed === null ||
          !Array.isArray((parsed as BudgetState).transactions) ||
          !Array.isArray((parsed as BudgetState).recurring)
        ) {
          throw new Error('Invalid budget export');
        }

        const sanitized = sanitizeBudgetState(parsed);
        setState(sanitized);
        showInfo('Budget restored', 'The active profile was replaced with the imported file.');
      } catch {
        showError('Import failed', 'That JSON file does not look like a Budget Desk export.');
      }
    },
    [setState],
  );

  const handleResetSampleData = useCallback(() => {
    // In profile mode, clearState resets only the active budget profile.
    clearState();
    showInfo('Sample data restored', 'The active budget profile has been reset.');
  }, [clearState]);

  const handleClearBudgetData = useCallback(() => {
    setState(createEmptyBudgetState());
    setImportPreview([]);
    setQuery('');
    setCategoryFilter(null);
    showNeutral(
      'Saved budget data cleared',
      'Transactions, monthly purchases, imported rows, and goals were removed from this profile.',
    );
  }, [setState]);

  const handleResetCategoryLimitsToZero = useCallback(() => {
    setState((current) => ({
      ...current,
      budgets: current.budgets.map((budget) =>
        budget.category === 'Income' ? budget : { ...budget, monthlyLimit: 0 },
      ),
    }));
    showNeutral('Category limits reset', 'Every category limit was set to $0.');
  }, [setState]);

  const handleRestoreCategoryLimits = useCallback(() => {
    setState((current) => ({
      ...current,
      budgets: current.budgets.map((budget) => {
        const defaultBudget = categoryCatalog.find((item) => item.category === budget.category);
        return {
          ...budget,
          monthlyLimit: defaultBudget?.monthlyLimit ?? budget.monthlyLimit,
        };
      }),
    }));
    showNeutral(
      'Default category limits restored',
      'Monthly limits were restored to the starter defaults.',
    );
  }, [setState]);

  const handleToggleCategoryLimits = useCallback(
    (enabled: boolean) => {
      setState((current) => ({ ...current, categoryLimitsEnabled: enabled }));
      if (enabled) {
        showInfo('Category limits on', 'Your saved category limits are active again.');
      } else {
        showNeutral('Category limits off', 'Your current category limit amounts were saved.');
      }
    },
    [setState],
  );

  const handleUpdateBudget = useCallback(
    (category: string, monthlyLimit: number) => {
      setState((current) => ({
        ...current,
        budgets: current.budgets.map((item) =>
          item.category === category
            ? { ...item, monthlyLimit: Math.max(0, normalizeCurrencyAmount(monthlyLimit)) }
            : item,
        ),
      }));
    },
    [setState],
  );

  const handleUpdateGoalSaved = useCallback(
    (id: string, saved: number) => {
      setState((current) => ({
        ...current,
        savingsGoals: current.savingsGoals.map((goal) =>
          goal.id === id ? { ...goal, saved: Math.max(0, normalizeCurrencyAmount(saved)) } : goal,
        ),
      }));
    },
    [setState],
  );

  // ─── Confirm modal details (memoized) ────────────────────────────────────
  const confirmDetails = useMemo<ConfirmDetails | null>(() => {
    switch (confirmAction) {
      case 'clear':
        return {
          title: 'Clear saved budget data?',
          body: 'This removes transactions, monthly items, imported rows, and savings goals from the active profile.',
          confirmLabel: 'Clear data',
          color: 'red',
          onConfirm: handleClearBudgetData,
        };
      case 'reset-category-limits-zero':
        return {
          title: 'Reset category limits to $0?',
          body: 'This changes every category monthly limit to $0. Transactions, monthly items, and savings goals stay untouched.',
          confirmLabel: 'Reset to $0',
          color: 'gray',
          onConfirm: handleResetCategoryLimitsToZero,
        };
      case 'restore-category-limits':
        return {
          title: 'Restore default category limits?',
          body: "This restores every category's monthly limit to the starter defaults. Transactions, monthly items, and savings goals stay untouched.",
          confirmLabel: 'Restore defaults',
          color: 'gray',
          onConfirm: handleRestoreCategoryLimits,
        };
      case 'delete-profile':
        return {
          title: `Delete ${activeProfile.name}?`,
          body: 'This removes this local budget profile from this browser. Other profiles stay available.',
          confirmLabel: 'Delete profile',
          color: 'red',
          onConfirm: handleDeleteActiveProfile,
        };
      case 'reset':
        return {
          title: 'Reset sample data?',
          body: 'This replaces the active profile with the starter sample budget.',
          confirmLabel: 'Reset data',
          color: 'gray',
          onConfirm: handleResetSampleData,
        };
      default:
        return null;
    }
  }, [
    activeProfile.name,
    confirmAction,
    handleClearBudgetData,
    handleDeleteActiveProfile,
    handleResetCategoryLimitsToZero,
    handleRestoreCategoryLimits,
    handleResetSampleData,
  ]);

  const handleConfirm = useCallback(() => {
    confirmDetails?.onConfirm();
    setConfirmAction(null);
  }, [confirmDetails]);

  return (
    <>
      <ConfirmModal
        opened={confirmAction !== null}
        details={confirmDetails}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
      />

      <AppShell header={{ height: 72 }} padding="lg">
        <AppShell.Header className="app-header">
          <AppHeader
            selectedMonth={selectedMonth}
            profileOptions={profileOptions}
            activeProfileId={activeProfileId}
            onSelectProfile={handleSelectProfile}
            onSelectMonth={setActiveMonth}
            onExport={handleExport}
          />
        </AppShell.Header>

        <AppShell.Main>
          <Stack gap="lg" className="workspace">
            <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="md">
              <MetricTile
                label="Monthly income"
                value={preciseCurrency.format(monthSummary.income)}
                detail={
                  monthSummary.usesPlannedIncome
                    ? 'Planned'
                    : monthSummary.actualIncome > 0
                      ? 'Actual'
                      : 'No income'
                }
                tone="blue"
              />
              <MetricTile
                label="Expenses"
                value={preciseCurrency.format(monthSummary.expenses)}
                detail={`${preciseCurrency.format(monthSummary.recurring)} recurring`}
                tone="orange"
              />
              <MetricTile
                label="Cash flow"
                value={preciseCurrency.format(monthSummary.remaining)}
                detail={`${Math.round(monthSummary.savingsRate)}% left`}
                tone={monthSummary.remaining >= 0 ? 'blue' : 'red'}
              />
              <MetricTile
                label="Transactions"
                value={String(monthSummary.rows.length)}
                detail={formatMonth(selectedMonth)}
                tone="blue"
              />
            </SimpleGrid>

            {monthSummary.rows.length === 0 ? (
              <Paper className="empty-month-panel" withBorder>
                <Group justify="space-between" align="center">
                  <Box>
                    <Text fw={800}>No entries for {formatMonth(selectedMonth)} yet</Text>
                    <Text size="sm" c="dimmed">
                      Use Purchases for one-time items or Monthly for recurring bills. The browser
                      Back button now returns to the previous selected month.
                    </Text>
                  </Box>
                  <Button variant="default" onClick={() => setActiveMonth(currentMonthKey())}>
                    This month
                  </Button>
                </Group>
              </Paper>
            ) : null}

            <Tabs value={activeTab} onChange={setActiveTab} variant="pills" keepMounted={false}>
              <Tabs.List className="tabs-list">
                <Tabs.Tab value="dashboard" leftSection={<ReceiptText size={16} />}>
                  Dashboard
                </Tabs.Tab>
                <Tabs.Tab value="transactions" leftSection={<Plus size={16} />}>
                  Purchases
                </Tabs.Tab>
                <Tabs.Tab value="recurring" leftSection={<CalendarClock size={16} />}>
                  Monthly
                </Tabs.Tab>
                <Tabs.Tab value="categories" leftSection={<Tags size={16} />}>
                  Categories
                </Tabs.Tab>
                <Tabs.Tab value="data" leftSection={<Database size={16} />}>
                  Import & data
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="dashboard" pt="lg">
                {activeTab === 'dashboard' && dashboardData ? (
                  <Suspense fallback={null}>
                    <DashboardTab
                      selectedMonth={selectedMonth}
                      monthSummary={monthSummary}
                      trend={dashboardData.trend}
                      breakdown={dashboardData.breakdown}
                      yearlySummary={dashboardData.yearSummary}
                      yearlyBreakdown={dashboardData.yearlyBreakdown}
                      bars={dashboardData.bars}
                      categoryLimitsEnabled={categoryLimitsEnabled}
                      hasCategoryLimitValues={hasCategoryLimitValues}
                      savingsGoals={state.savingsGoals}
                      onUpdateGoalSaved={handleUpdateGoalSaved}
                      onResetCategoryLimits={() => setConfirmAction('reset-category-limits-zero')}
                      onRestoreCategoryLimits={() => setConfirmAction('restore-category-limits')}
                    />
                  </Suspense>
                ) : null}
              </Tabs.Panel>

              <Tabs.Panel value="transactions" pt="lg">
                {activeTab === 'transactions' ? (
                  <Suspense fallback={null}>
                    <PurchasesTab
                      selectedMonth={selectedMonth}
                      filteredTransactions={filteredTransactions}
                      query={query}
                      onQueryChange={setQuery}
                      categoryFilter={categoryFilter}
                      onCategoryFilterChange={setCategoryFilter}
                      categoryOptions={categoryOptions}
                      accountOptions={accountOptions}
                      onAddTransaction={handleAddTransaction}
                      onUpdateTransaction={handleUpdateTransaction}
                      onRemoveTransaction={handleRemoveTransaction}
                      onFormError={showError}
                    />
                  </Suspense>
                ) : null}
              </Tabs.Panel>

              <Tabs.Panel value="recurring" pt="lg">
                {activeTab === 'recurring' ? (
                  <Suspense fallback={null}>
                    <MonthlyTab
                      selectedMonth={selectedMonth}
                      recurring={state.recurring}
                      categoryOptions={categoryOptions}
                      accountOptions={accountOptions}
                      onAddRecurring={handleAddRecurring}
                      onUpdateRecurring={handleUpdateRecurring}
                      onToggleRecurring={handleToggleRecurring}
                      onRemoveRecurring={handleRemoveRecurring}
                      onFormError={showError}
                    />
                  </Suspense>
                ) : null}
              </Tabs.Panel>

              <Tabs.Panel value="categories" pt="lg">
                <BudgetLimitsPanel
                  budgets={categoryLimitBudgets}
                  enabled={categoryLimitsEnabled}
                  hasValues={hasCategoryLimitValues}
                  onToggle={handleToggleCategoryLimits}
                  onUpdate={handleUpdateBudget}
                  onAddCategory={handleAddCategory}
                  onRemoveCategory={handleRemoveCategory}
                  onResetToZero={() => setConfirmAction('reset-category-limits-zero')}
                  onRestoreDefaults={() => setConfirmAction('restore-category-limits')}
                />
              </Tabs.Panel>

              <Tabs.Panel value="data" pt="lg">
                {activeTab === 'data' ? (
                  <Suspense fallback={null}>
                    <DataTab
                      profiles={profiles}
                      activeProfileId={activeProfileId}
                      onSelectProfile={handleSelectProfile}
                      onCreateProfile={handleCreateProfile}
                      onRenameProfile={handleRenameActiveProfile}
                      onDeleteProfile={() => setConfirmAction('delete-profile')}
                      importPreview={importPreview}
                      statementType={statementType}
                      onStatementTypeChange={setStatementType}
                      importAccount={importAccount}
                      onImportAccountChange={setImportAccount}
                      accountOptions={accountOptions}
                      onPreviewStatement={handlePreviewStatement}
                      onImportRows={handleImportRows}
                      onExport={handleExport}
                      onImportData={handleImportData}
                      onClearData={() => setConfirmAction('clear')}
                      onResetSampleData={() => setConfirmAction('reset')}
                    />
                  </Suspense>
                ) : null}
              </Tabs.Panel>
            </Tabs>
          </Stack>
        </AppShell.Main>
      </AppShell>
    </>
  );
}

export default function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications position="top-right" />
      <AppContent />
    </MantineProvider>
  );
}
