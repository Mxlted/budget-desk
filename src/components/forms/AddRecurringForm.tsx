import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Group,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { MonthPickerInput } from '@mantine/dates';
import { CalendarClock, Check } from 'lucide-react';
import { normalizeCurrencyAmount, type NumericInputValue } from '../../amounts';
import { currentMonthKey, makeId, normalizeMonthKey } from '../../budgetMath';
import {
  clampDayOfMonth,
  dateToMonthKey,
  getExpenseCategoryOptions,
  getFallbackExpenseCategory,
  inputValueToDate,
  monthKeyToDate,
  resolveTypedCategory,
} from '../../formHelpers';
import type { RecurringPurchase, TransactionType } from '../../types';

interface AddRecurringFormProps {
  selectedMonth: string;
  categoryOptions: Array<{ value: string; label: string }>;
  accountOptions: Array<{ value: string; label: string }>;
  onAdd: (recurring: RecurringPurchase) => void;
  onError: (title: string, message: string) => void;
}

interface RecurringDraft {
  merchant: string;
  category: string;
  amount: NumericInputValue;
  type: TransactionType;
  day: number;
  account: string;
  startMonth: string;
  endMonth: string;
  notes: string;
}

const emptyRecurring = (month = currentMonthKey(), category = 'Utilities'): RecurringDraft => ({
  merchant: '',
  category,
  amount: 0,
  type: 'expense' as TransactionType,
  day: 1,
  account: 'Checking',
  startMonth: month,
  endMonth: '',
  notes: '',
});

export function AddRecurringForm({
  selectedMonth,
  categoryOptions,
  accountOptions,
  onAdd,
  onError,
}: AddRecurringFormProps) {
  const expenseCategoryOptions = useMemo(
    () => getExpenseCategoryOptions(categoryOptions),
    [categoryOptions],
  );
  const fallbackCategory = getFallbackExpenseCategory(expenseCategoryOptions);
  const [recurring, setRecurring] = useState(() =>
    emptyRecurring(selectedMonth, fallbackCategory),
  );

  useEffect(() => {
    setRecurring((current) => {
      const category = resolveTypedCategory(
        current.type,
        current.category,
        expenseCategoryOptions,
        fallbackCategory,
      );
      if (category === current.category) {
        return current;
      }

      return { ...current, category };
    });
  }, [expenseCategoryOptions, fallbackCategory]);

  const handleSubmit = () => {
    const amount = normalizeCurrencyAmount(recurring.amount);

    if (!recurring.startMonth || !recurring.merchant.trim() || amount <= 0) {
      onError(
        'Monthly item needs a name and amount',
        'Add the name, amount, and start month before saving it.',
      );
      return;
    }

    const item: RecurringPurchase = {
      id: makeId(),
      merchant: recurring.merchant.trim(),
      category: resolveTypedCategory(
        recurring.type,
        recurring.category,
        expenseCategoryOptions,
        fallbackCategory,
      ),
      amount,
      type: recurring.type,
      day: recurring.day,
      account: recurring.account,
      active: true,
      startMonth: normalizeMonthKey(recurring.startMonth, selectedMonth),
      endMonth: recurring.endMonth
        ? normalizeMonthKey(recurring.endMonth, recurring.startMonth)
        : undefined,
      notes: recurring.notes.trim() || undefined,
    };

    onAdd(item);
    setRecurring(emptyRecurring(selectedMonth, fallbackCategory));
  };

  return (
    <Paper className="panel form-panel" withBorder>
      <Group mb="md" gap="sm">
        <ThemeIcon color="orange" variant="light">
          <CalendarClock size={18} />
        </ThemeIcon>
        <Title order={3}>Monthly item</Title>
      </Group>

      <Stack gap="sm">
        <SegmentedControl
          value={recurring.type}
          onChange={(value) =>
            setRecurring((current) => ({
              ...current,
              type: value as TransactionType,
              category: resolveTypedCategory(
                value as TransactionType,
                current.category,
                expenseCategoryOptions,
                fallbackCategory,
              ),
            }))
          }
          data={[
            { label: 'Expense', value: 'expense' },
            { label: 'Income', value: 'income' },
          ]}
        />
        <TextInput
          label="Name"
          placeholder={
            recurring.type === 'income'
              ? 'Payroll, side income, stipend...'
              : 'Rent, internet, subscription...'
          }
          value={recurring.merchant}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setRecurring((current) => ({ ...current, merchant: value }));
          }}
        />
        <NumberInput
          label="Amount"
          min={0}
          prefix="$"
          allowNegative={false}
          decimalScale={2}
          fixedDecimalScale
          step={0.01}
          value={recurring.amount}
          onChange={(value) =>
            setRecurring((current) => ({
              ...current,
              amount: value,
            }))
          }
        />
        <NumberInput
          label="Day of month"
          min={1}
          max={31}
          allowDecimal={false}
          value={recurring.day}
          onChange={(value) =>
            setRecurring((current) => ({
              ...current,
              day: clampDayOfMonth(value),
            }))
          }
        />
        <Select
          label="Category"
          data={
            recurring.type === 'income'
              ? [{ value: 'Income', label: 'Income' }]
              : expenseCategoryOptions
          }
          value={recurring.category}
          disabled={recurring.type === 'income'}
          onChange={(value) =>
            setRecurring((current) => ({ ...current, category: value ?? current.category }))
          }
        />
        <Select
          label="Account"
          data={accountOptions}
          value={recurring.account}
          onChange={(value) =>
            setRecurring((current) => ({ ...current, account: value ?? current.account }))
          }
        />
        <MonthPickerInput
          label="Starts"
          value={monthKeyToDate(recurring.startMonth)}
          valueFormat="YYYY-MM"
          onChange={(value) => {
            const date = inputValueToDate(value);
            if (date) {
              setRecurring((current) => ({ ...current, startMonth: dateToMonthKey(date) }));
            }
          }}
          popoverProps={{ withinPortal: true }}
        />
        <MonthPickerInput
          label="Ends"
          value={monthKeyToDate(recurring.endMonth)}
          valueFormat="YYYY-MM"
          clearable
          onChange={(value) => {
            if (!value) {
              setRecurring((current) => ({ ...current, endMonth: '' }));
              return;
            }
            const date = inputValueToDate(value);
            if (date) {
              setRecurring((current) => ({ ...current, endMonth: dateToMonthKey(date) }));
            }
          }}
          popoverProps={{ withinPortal: true }}
        />
        <TextInput
          label="Notes"
          placeholder="Optional"
          value={recurring.notes}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setRecurring((current) => ({ ...current, notes: value }));
          }}
        />
        <Button
          color={recurring.type === 'income' ? 'blue' : 'orange'}
          leftSection={<Check size={16} />}
          onClick={handleSubmit}
        >
          Save monthly {recurring.type}
        </Button>
      </Stack>
    </Paper>
  );
}
