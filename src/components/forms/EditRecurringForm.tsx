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
import { Check, Pencil, X } from 'lucide-react';
import {
  normalizeCurrencyAmount,
  parseFiniteNumber,
  type NumericInputValue,
} from '../../amounts';
import { normalizeMonthKey } from '../../budgetMath';
import type { RecurringPurchase, TransactionType } from '../../types';

interface EditRecurringFormProps {
  item: RecurringPurchase;
  selectedMonth: string;
  categoryOptions: Array<{ value: string; label: string }>;
  accountOptions: Array<{ value: string; label: string }>;
  onSave: (item: RecurringPurchase) => void;
  onCancel: () => void;
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

const monthKeyToDate = (month: string): Date | null => {
  if (!month) return null;
  const [year, m] = normalizeMonthKey(month).split('-').map(Number);
  return new Date(year, m - 1, 1, 12, 0, 0);
};

const dateToMonthKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const draftFromRecurring = (item: RecurringPurchase): RecurringDraft => ({
  merchant: item.merchant,
  category: item.category,
  amount: item.amount,
  type: item.type,
  day: item.day,
  account: item.account,
  startMonth: item.startMonth,
  endMonth: item.endMonth ?? '',
  notes: item.notes ?? '',
});

export function EditRecurringForm({
  item,
  selectedMonth,
  categoryOptions,
  accountOptions,
  onSave,
  onCancel,
  onError,
}: EditRecurringFormProps) {
  const expenseCategoryOptions = useMemo(
    () => categoryOptions.filter((option) => option.value !== 'Income'),
    [categoryOptions],
  );
  const fallbackCategory = expenseCategoryOptions[0]?.value ?? 'Other';
  const [recurring, setRecurring] = useState(() => draftFromRecurring(item));

  useEffect(() => {
    setRecurring(draftFromRecurring(item));
  }, [item]);

  useEffect(() => {
    setRecurring((current) => {
      const categoryExists = expenseCategoryOptions.some((option) => option.value === current.category);
      if (current.type === 'income' || categoryExists) {
        return current;
      }

      return { ...current, category: fallbackCategory };
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

    onSave({
      ...item,
      merchant: recurring.merchant.trim(),
      category: recurring.type === 'income' ? 'Income' : recurring.category,
      amount,
      type: recurring.type,
      day: recurring.day,
      account: recurring.account,
      startMonth: normalizeMonthKey(recurring.startMonth, selectedMonth),
      endMonth: recurring.endMonth
        ? normalizeMonthKey(recurring.endMonth, recurring.startMonth)
        : undefined,
      notes: recurring.notes.trim() || undefined,
    });
  };

  return (
    <Paper className="panel form-panel" withBorder>
      <Group mb="md" gap="sm">
        <ThemeIcon color="blue" variant="light">
          <Pencil size={18} />
        </ThemeIcon>
        <Title order={3}>Edit monthly</Title>
      </Group>

      <Stack gap="sm">
        <SegmentedControl
          value={recurring.type}
          onChange={(value) =>
            setRecurring((current) => ({
              ...current,
              type: value as TransactionType,
              category:
                value === 'income'
                  ? 'Income'
                  : expenseCategoryOptions.some((option) => option.value === current.category)
                    ? current.category
                    : fallbackCategory,
            }))
          }
          data={[
            { label: 'Expense', value: 'expense' },
            { label: 'Income', value: 'income' },
          ]}
        />
        <TextInput
          label="Name"
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
              day: Math.min(31, Math.max(1, Math.round(parseFiniteNumber(value, 1)))),
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
            if (!value) return;
            const date = typeof value === 'string' ? new Date(value) : value;
            if (date instanceof Date && !Number.isNaN(date.getTime())) {
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
            const date = typeof value === 'string' ? new Date(value) : value;
            if (date instanceof Date && !Number.isNaN(date.getTime())) {
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
        <Group grow>
          <Button
            color={recurring.type === 'income' ? 'blue' : 'orange'}
            leftSection={<Check size={16} />}
            onClick={handleSubmit}
          >
            Save changes
          </Button>
          <Button variant="default" leftSection={<X size={16} />} onClick={onCancel}>
            Cancel
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
