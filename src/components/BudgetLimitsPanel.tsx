import { Button, Group, NumberInput, Paper, SimpleGrid, Switch, Title } from '@mantine/core';
import { RefreshCcw } from 'lucide-react';
import type { BudgetCategory } from '../types';

interface BudgetLimitsPanelProps {
  budgets: BudgetCategory[];
  enabled: boolean;
  hasValues: boolean;
  onToggle: (enabled: boolean) => void;
  onUpdate: (category: string, monthlyLimit: number) => void;
  onResetToZero: () => void;
  onRestoreDefaults: () => void;
}

export function BudgetLimitsPanel({
  budgets,
  enabled,
  hasValues,
  onToggle,
  onUpdate,
  onResetToZero,
  onRestoreDefaults,
}: BudgetLimitsPanelProps) {
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
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
        {budgets.map((budget) => (
          <NumberInput
            key={budget.category}
            label={budget.category}
            min={0}
            prefix="$"
            value={budget.monthlyLimit}
            disabled={!enabled}
            onChange={(value) => onUpdate(budget.category, typeof value === 'number' ? value : 0)}
          />
        ))}
      </SimpleGrid>
    </Paper>
  );
}
