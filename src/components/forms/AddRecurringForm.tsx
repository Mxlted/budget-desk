import { useState } from 'react';
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
import { currentMonthKey, makeId, normalizeMonthKey } from '../../budgetMath';
import type { RecurringPurchase, TransactionType } from '../../types';

interface AddRecurringFormProps {
  selectedMonth: string;
  categoryOptions: Array<{ value: string; label: string }>;
  accountOptions: Array<{ value: string; label: string }>;
  onAdd: (recurring: RecurringPurchase) => void;
  onError: (title: string, message: string) => void;
}

const emptyRecurring = (month = currentMonthKey()) => ({
  merchant: '',
  category: 'Utilities',
  amount: 0,
  type: 'expense' as TransactionType,
  day: 1,
  account: 'Checking',
  startMonth: month,
  endMonth: '',
  notes: '',
});

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

export function AddRecurringForm({
  selectedMonth,
  categoryOptions,
  accountOptions,
  onAdd,
  onError,
}: AddRecurringFormProps) {
  const [recurring, setRecurring] = useState(emptyRecurring(selectedMonth));

  const handleSubmit = () => {
    if (!recurring.startMonth || !recurring.merchant.trim() || recurring.amount <= 0) {
      onError(
        'Monthly item needs a name and amount',
        'Add the name, amount, and start month before saving it.',
      );
      return;
    }

    const item: RecurringPurchase = {
      id: makeId(),
      merchant: recurring.merchant.trim(),
      category: recurring.type === 'income' ? 'Income' : recurring.category,
      amount: recurring.amount,
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
    setRecurring(emptyRecurring(selectedMonth));
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
              category:
                value === 'income'
                  ? 'Income'
                  : current.category === 'Income'
                    ? 'Utilities'
                    : current.category,
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
          decimalScale={2}
          fixedDecimalScale
          value={recurring.amount}
          onChange={(value) =>
            setRecurring((current) => ({
              ...current,
              amount: typeof value === 'number' ? value : 0,
            }))
          }
        />
        <NumberInput
          label="Day of month"
          min={1}
          max={31}
          value={recurring.day}
          onChange={(value) =>
            setRecurring((current) => ({
              ...current,
              day: typeof value === 'number' ? value : 1,
            }))
          }
        />
        <Select
          label="Category"
          data={categoryOptions.filter((item) => item.value !== 'Income')}
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
