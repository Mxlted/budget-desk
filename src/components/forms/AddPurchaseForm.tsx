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
import { Check, Plus } from 'lucide-react';
import { normalizeCurrencyAmount, type NumericInputValue } from '../../amounts';
import { currentMonthKey, makeId } from '../../budgetMath';
import {
  dateToISO,
  getExpenseCategoryOptions,
  getFallbackExpenseCategory,
  inputValueToDate,
  parseISODate,
  resolveTypedCategory,
} from '../../formHelpers';
import type { Transaction, TransactionType } from '../../types';

interface AddPurchaseFormProps {
  selectedMonth: string;
  categoryOptions: Array<{ value: string; label: string }>;
  accountOptions: Array<{ value: string; label: string }>;
  onAdd: (transaction: Transaction) => void;
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

const emptyPurchase = (month = currentMonthKey(), category = 'Groceries'): PurchaseDraft => ({
  date: `${month}-15`,
  merchant: '',
  category,
  amount: 0,
  type: 'expense' as TransactionType,
  account: 'Credit Card',
  notes: '',
});

export function AddPurchaseForm({
  selectedMonth,
  categoryOptions,
  accountOptions,
  onAdd,
  onError,
}: AddPurchaseFormProps) {
  const expenseCategoryOptions = useMemo(
    () => getExpenseCategoryOptions(categoryOptions),
    [categoryOptions],
  );
  const fallbackCategory = getFallbackExpenseCategory(expenseCategoryOptions);
  const [purchase, setPurchase] = useState(() => emptyPurchase(selectedMonth, fallbackCategory));

  useEffect(() => {
    setPurchase((current) => {
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
    const amount = normalizeCurrencyAmount(purchase.amount);

    if (!purchase.date || !purchase.merchant.trim() || amount <= 0) {
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
      category: resolveTypedCategory(
        purchase.type,
        purchase.category,
        expenseCategoryOptions,
        fallbackCategory,
      ),
      amount,
      type: purchase.type,
      account: purchase.account,
      notes: purchase.notes.trim() || undefined,
      source: 'manual',
    };

    onAdd(transaction);
    setPurchase(emptyPurchase(selectedMonth, fallbackCategory));
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
        <DateInput
          label="Date"
          value={parseISODate(purchase.date)}
          valueFormat="YYYY-MM-DD"
          onChange={(value) => {
            const date = inputValueToDate(value);
            if (date) {
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
        <Button leftSection={<Check size={16} />} onClick={handleSubmit}>
          Save purchase
        </Button>
      </Stack>
    </Paper>
  );
}
