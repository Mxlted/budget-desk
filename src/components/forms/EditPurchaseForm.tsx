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
import { DateInput } from '@mantine/dates';
import { Check, Pencil, X } from 'lucide-react';
import { normalizeCurrencyAmount, type NumericInputValue } from '../../amounts';
import type { Transaction, TransactionType } from '../../types';

interface EditPurchaseFormProps {
  transaction: Transaction;
  categoryOptions: Array<{ value: string; label: string }>;
  accountOptions: Array<{ value: string; label: string }>;
  onSave: (transaction: Transaction) => void;
  onCancel: () => void;
  onError: (title: string, message: string) => void;
}

interface PurchaseDraft {
  date: string;
  merchant: string;
  category: string;
  amount: NumericInputValue;
  type: TransactionType;
  account: string;
  notes: string;
}

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

const draftFromTransaction = (transaction: Transaction): PurchaseDraft => ({
  date: transaction.date,
  merchant: transaction.merchant,
  category: transaction.category,
  amount: transaction.amount,
  type: transaction.type,
  account: transaction.account,
  notes: transaction.notes ?? '',
});

export function EditPurchaseForm({
  transaction,
  categoryOptions,
  accountOptions,
  onSave,
  onCancel,
  onError,
}: EditPurchaseFormProps) {
  const expenseCategoryOptions = useMemo(
    () => categoryOptions.filter((item) => item.value !== 'Income'),
    [categoryOptions],
  );
  const fallbackCategory = expenseCategoryOptions[0]?.value ?? 'Other';
  const [purchase, setPurchase] = useState(() => draftFromTransaction(transaction));

  useEffect(() => {
    setPurchase(draftFromTransaction(transaction));
  }, [transaction]);

  useEffect(() => {
    setPurchase((current) => {
      const categoryExists = expenseCategoryOptions.some((item) => item.value === current.category);
      if (current.type === 'income' || categoryExists) {
        return current;
      }

      return { ...current, category: fallbackCategory };
    });
  }, [expenseCategoryOptions, fallbackCategory]);

  const handleSubmit = () => {
    const amount = normalizeCurrencyAmount(purchase.amount);

    if (!purchase.date || !purchase.merchant.trim() || amount <= 0) {
      onError(
        'Entry needs a little more detail',
        'Add a date, merchant, and amount before saving it.',
      );
      return;
    }

    onSave({
      ...transaction,
      date: purchase.date,
      merchant: purchase.merchant.trim(),
      category: purchase.type === 'income' ? 'Income' : purchase.category,
      amount,
      type: purchase.type,
      account: purchase.account,
      notes: purchase.notes.trim() || undefined,
    });
  };

  return (
    <Paper className="panel form-panel" withBorder>
      <Group mb="md" gap="sm">
        <ThemeIcon color="blue" variant="light">
          <Pencil size={18} />
        </ThemeIcon>
        <Title order={3}>Edit entry</Title>
      </Group>

      <Stack gap="sm">
        <SegmentedControl
          value={purchase.type}
          onChange={(value) =>
            setPurchase((current) => ({
              ...current,
              type: value as TransactionType,
              category:
                value === 'income'
                  ? 'Income'
                  : expenseCategoryOptions.some((item) => item.value === current.category)
                    ? current.category
                    : fallbackCategory,
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
          allowNegative={false}
          decimalScale={2}
          fixedDecimalScale
          step={0.01}
          value={purchase.amount}
          onChange={(value) =>
            setPurchase((current) => ({
              ...current,
              amount: value,
            }))
          }
        />
        <Select
          label="Category"
          data={
            purchase.type === 'income'
              ? [{ value: 'Income', label: 'Income' }]
              : expenseCategoryOptions
          }
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
        <Group grow>
          <Button leftSection={<Check size={16} />} onClick={handleSubmit}>
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
