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
import { DateInput } from '@mantine/dates';
import { Check, Plus } from 'lucide-react';
import { currentMonthKey, makeId } from '../../budgetMath';
import type { Transaction, TransactionType } from '../../types';

interface AddPurchaseFormProps {
  selectedMonth: string;
  categoryOptions: Array<{ value: string; label: string }>;
  accountOptions: Array<{ value: string; label: string }>;
  onAdd: (transaction: Transaction) => void;
  onError: (title: string, message: string) => void;
}

const emptyPurchase = (month = currentMonthKey()) => ({
  date: `${month}-15`,
  merchant: '',
  category: 'Groceries',
  amount: 0,
  type: 'expense' as TransactionType,
  account: 'Credit Card',
  notes: '',
});

const parseISODate = (iso: string): Date | null => {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
};

const dateToISO = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export function AddPurchaseForm({
  selectedMonth,
  categoryOptions,
  accountOptions,
  onAdd,
  onError,
}: AddPurchaseFormProps) {
  const [purchase, setPurchase] = useState(emptyPurchase(selectedMonth));

  const handleSubmit = () => {
    if (!purchase.date || !purchase.merchant.trim() || purchase.amount <= 0) {
      onError(
        'Purchase needs a little more detail',
        'Add a date, merchant, and amount before saving it.',
      );
      return;
    }

    const transaction: Transaction = {
      id: makeId(),
      date: purchase.date,
      merchant: purchase.merchant.trim(),
      category: purchase.type === 'income' ? 'Income' : purchase.category,
      amount: purchase.amount,
      type: purchase.type,
      account: purchase.account,
      notes: purchase.notes.trim() || undefined,
      source: 'manual',
    };

    onAdd(transaction);
    setPurchase(emptyPurchase(selectedMonth));
  };

  return (
    <Paper className="panel form-panel" withBorder>
      <Group mb="md" gap="sm">
        <ThemeIcon color="gray" variant="light">
          <Plus size={18} />
        </ThemeIcon>
        <Title order={3}>Add purchase</Title>
      </Group>

      <Stack gap="sm">
        <SegmentedControl
          value={purchase.type}
          onChange={(value) =>
            setPurchase((current) => ({
              ...current,
              type: value as TransactionType,
              category: value === 'income' ? 'Income' : current.category,
            }))
          }
          data={[
            { label: 'Expense', value: 'expense' },
            { label: 'Income', value: 'income' },
          ]}
        />
        <DateInput
          label="Date"
          value={parseISODate(purchase.date)}
          valueFormat="YYYY-MM-DD"
          onChange={(value) => {
            if (!value) return;
            const date = typeof value === 'string' ? new Date(value) : value;
            if (date instanceof Date && !Number.isNaN(date.getTime())) {
              setPurchase((current) => ({ ...current, date: dateToISO(date) }));
            }
          }}
          popoverProps={{ withinPortal: true }}
        />
        <TextInput
          label="Merchant"
          placeholder="Coffee shop, payroll, rent..."
          value={purchase.merchant}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setPurchase((current) => ({ ...current, merchant: value }));
          }}
        />
        <NumberInput
          label="Amount"
          min={0}
          prefix="$"
          decimalScale={2}
          fixedDecimalScale
          value={purchase.amount}
          onChange={(value) =>
            setPurchase((current) => ({
              ...current,
              amount: typeof value === 'number' ? value : 0,
            }))
          }
        />
        <Select
          label="Category"
          data={categoryOptions}
          value={purchase.category}
          disabled={purchase.type === 'income'}
          onChange={(value) =>
            setPurchase((current) => ({ ...current, category: value ?? current.category }))
          }
        />
        <Select
          label="Account"
          data={accountOptions}
          value={purchase.account}
          onChange={(value) =>
            setPurchase((current) => ({ ...current, account: value ?? current.account }))
          }
        />
        <TextInput
          label="Notes"
          placeholder="Optional"
          value={purchase.notes}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setPurchase((current) => ({ ...current, notes: value }));
          }}
        />
        <Button leftSection={<Check size={16} />} onClick={handleSubmit}>
          Save purchase
        </Button>
      </Stack>
    </Paper>
  );
}
