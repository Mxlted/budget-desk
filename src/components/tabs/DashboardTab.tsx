import {
  Badge,
  Box,
  Button,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { AreaChart, BarChart, DonutChart } from '@mantine/charts';
import { RefreshCcw } from 'lucide-react';
import { currency, formatMonth, preciseCurrency } from '../../budgetMath';
import { SavingsGoalsPanel } from '../SavingsGoalsPanel';
import type { SavingsGoal } from '../../types';

interface DashboardTabProps {
  selectedMonth: string;
  monthSummary: { expenses: number };
  trend: Array<Record<string, number | string>>;
  breakdown: Array<{ category: string; name: string; value: number; color: string }>;
  bars: Array<{ category: string; Spent: number; Budget: number; color: string }>;
  categoryLimitsEnabled: boolean;
  hasCategoryLimitValues: boolean;
  savingsGoals: SavingsGoal[];
  onUpdateGoalSaved: (id: string, saved: number) => void;
  onResetCategoryLimits: () => void;
  onRestoreCategoryLimits: () => void;
}

export function DashboardTab({
  selectedMonth,
  monthSummary,
  trend,
  breakdown,
  bars,
  categoryLimitsEnabled,
  hasCategoryLimitValues,
  savingsGoals,
  onUpdateGoalSaved,
  onResetCategoryLimits,
  onRestoreCategoryLimits,
}: DashboardTabProps) {
  return (
    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
      <Paper className="panel" withBorder>
        <Group justify="space-between" align="flex-start" mb="md">
          <Box>
            <Title order={3}>Monthly trend</Title>
            <Text size="sm" c="dimmed">
              Income, total expenses, and recurring commitments
            </Text>
          </Box>
          <Badge variant="light" color="blue">
            6 months
          </Badge>
        </Group>
        <AreaChart
          h={290}
          data={trend}
          dataKey="month"
          withLegend
          valueFormatter={(value) => currency.format(value)}
          series={[
            { name: 'Income', color: 'blue.6' },
            { name: 'Expenses', color: 'orange.6' },
            { name: 'Recurring', color: 'indigo.6' },
          ]}
        />
      </Paper>

      <Paper className="panel" withBorder>
        <Group justify="space-between" align="flex-start" mb="md">
          <Box>
            <Title order={3}>Category mix</Title>
            <Text size="sm" c="dimmed">
              Expenses for {formatMonth(selectedMonth)}
            </Text>
          </Box>
          <Badge variant="light" color="gray">
            {breakdown.length} categories
          </Badge>
        </Group>
        {breakdown.length > 0 ? (
          <DonutChart
            h={290}
            data={breakdown}
            valueFormatter={(value) => currency.format(value)}
            chartLabel={currency.format(monthSummary.expenses)}
            withLabelsLine
            withLabels
          />
        ) : (
          <Box className="empty-state">Add a purchase to build a category chart.</Box>
        )}
      </Paper>

      <Paper className="panel wide-panel" withBorder>
        <Group justify="space-between" align="flex-start" mb="md">
          <Box>
            <Title order={3}>Budget pressure</Title>
            <Text size="sm" c="dimmed">
              Monthly limits compared with actual spend
            </Text>
          </Box>
          <Badge variant="light" color="orange">
            live totals
          </Badge>
        </Group>
        {!categoryLimitsEnabled ? (
          <Box className="empty-state">Category limits are disabled.</Box>
        ) : bars.length > 0 ? (
          <BarChart
            h={340}
            data={bars}
            dataKey="category"
            orientation="vertical"
            yAxisProps={{ width: 120 }}
            valueFormatter={(value) => currency.format(value)}
            withLegend
            series={[
              { name: 'Spent', color: 'orange.6' },
              { name: 'Budget', color: 'gray.6' },
            ]}
          />
        ) : (
          <Box className="empty-state">All category limits are set to $0.</Box>
        )}
      </Paper>

      <Paper className="panel" withBorder>
        <Group justify="space-between" align="flex-start" mb="md">
          <Title order={3}>Budget limits</Title>
          <Group gap={6} wrap="wrap" justify="flex-end">
            <Button
              variant="light"
              color="gray"
              size="xs"
              leftSection={<RefreshCcw size={14} />}
              disabled={!hasCategoryLimitValues}
              onClick={onResetCategoryLimits}
            >
              Reset to $0
            </Button>
            <Button
              variant="default"
              size="xs"
              leftSection={<RefreshCcw size={14} />}
              onClick={onRestoreCategoryLimits}
            >
              Defaults
            </Button>
          </Group>
        </Group>
        {!categoryLimitsEnabled ? (
          <Box className="empty-state">Category limits are disabled.</Box>
        ) : bars.length > 0 ? (
          <Stack gap="md">
            {bars.slice(0, 7).map((item) => {
              const percent = item.Budget > 0 ? (item.Spent / item.Budget) * 100 : 0;
              const color = percent > 100 ? 'red' : percent > 80 ? 'orange' : 'blue';

              return (
                <Box key={item.category}>
                  <Group justify="space-between" mb={6}>
                    <Text fw={700}>{item.category}</Text>
                    <Text size="sm" c="dimmed">
                      {preciseCurrency.format(item.Spent)} / {preciseCurrency.format(item.Budget)}
                    </Text>
                  </Group>
                  <Progress value={Math.min(percent, 100)} color={color} radius="xl" />
                </Box>
              );
            })}
          </Stack>
        ) : (
          <Box className="empty-state">All category limits are set to $0.</Box>
        )}
      </Paper>

      {/* Phase 4.2: Savings goals moved from Data tab to Dashboard */}
      <SavingsGoalsPanel goals={savingsGoals} onUpdateSaved={onUpdateGoalSaved} />
    </SimpleGrid>
  );
}
