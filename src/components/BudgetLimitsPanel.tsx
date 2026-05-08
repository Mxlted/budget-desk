import { useState } from 'react';
import {
  ActionIcon,
  Button,
  Group,
  NumberInput,
  Paper,
  SimpleGrid,
  Switch,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { normalizeCurrencyAmount, type NumericInputValue } from '../amounts';
import type { BudgetCategory } from '../types';

interface BudgetLimitsPanelProps {
  budgets: BudgetCategory[];
  enabled: boolean;
  hasValues: boolean;
  onToggle: (enabled: boolean) => void;
  onUpdate: (category: string, monthlyLimit: number) => void;
  onAddCategory: (category: string, monthlyLimit: number) => boolean;
  onRemoveCategory: (category: string) => void;
  onResetToZero: () => void;
  onRestoreDefaults: () => void;
}

export function BudgetLimitsPanel({
  budgets,
  enabled,
  hasValues,
  onToggle,
  onUpdate,
  onAddCategory,
  onRemoveCategory,
  onResetToZero,
  onRestoreDefaults,
}: BudgetLimitsPanelProps) {
  const [newCategory, setNewCategory] = useState('');
  const [newLimit, setNewLimit] = useState<NumericInputValue>(0);

  const handleAddCategory = () => {
    const created = onAddCategory(newCategory, normalizeCurrencyAmount(newLimit));

    if (created) {
      setNewCategory('');
      setNewLimit(0);
    }
  };

  return (
    <Paper className="panel wide-panel" withBorder>
      <Group justify="space-between" align="flex-start" mb="md">
        <Group gap="md" align="center">
          <Title order={3}>Category limits</Title>
          <Switch
            checked={enabled}
            aria-label="Toggle category limits"
            onLabel="On"
            offLabel="Off"
            onChange={(event) => onToggle(event.currentTarget.checked)}
          />
        </Group>
        <Group gap="xs" justify="flex-end">
          <Button
            variant="light"
            color="gray"
            leftSection={<RefreshCcw size={16} />}
            disabled={!hasValues}
            onClick={onResetToZero}
          >
            Reset to $0
          </Button>
          <Button
            variant="default"
            leftSection={<RefreshCcw size={16} />}
            onClick={onRestoreDefaults}
          >
            Restore defaults
          </Button>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" mb="md">
        <TextInput
          label="New category"
          value={newCategory}
          onChange={(event) => setNewCategory(event.currentTarget.value)}
        />
        <NumberInput
          label="Monthly limit"
          min={0}
          prefix="$"
          allowNegative={false}
          decimalScale={2}
          fixedDecimalScale
          step={0.01}
          value={newLimit}
          onChange={(value) => setNewLimit(value)}
        />
        <Button
          leftSection={<Plus size={16} />}
          disabled={!newCategory.trim()}
          onClick={handleAddCategory}
          style={{ alignSelf: 'flex-end' }}
        >
          Add category
        </Button>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
        {budgets.map((budget) => (
          <Group key={budget.category} align="flex-end" gap="xs" wrap="nowrap">
            <NumberInput
              label={budget.category}
              min={0}
              prefix="$"
              allowNegative={false}
              decimalScale={2}
              fixedDecimalScale
              step={0.01}
              value={budget.monthlyLimit}
              disabled={!enabled}
              onChange={(value) => onUpdate(budget.category, normalizeCurrencyAmount(value))}
              style={{ flex: 1 }}
            />
            <Tooltip label={`Remove ${budget.category}`}>
              <ActionIcon
                variant="subtle"
                color="red"
                aria-label={`Remove ${budget.category}`}
                disabled={budgets.length <= 1}
                onClick={() => onRemoveCategory(budget.category)}
              >
                <Trash2 size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ))}
      </SimpleGrid>
    </Paper>
  );
}
