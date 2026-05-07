import {
  Box,
  Group,
  NumberInput,
  Paper,
  Progress,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { Target } from 'lucide-react';
import { currency } from '../budgetMath';
import type { SavingsGoal } from '../types';

interface SavingsGoalsPanelProps {
  goals: SavingsGoal[];
  onUpdateSaved: (id: string, saved: number) => void;
}

export function SavingsGoalsPanel({ goals, onUpdateSaved }: SavingsGoalsPanelProps) {
  return (
    <Paper className="panel" withBorder>
      <Group mb="md" gap="sm">
        <ThemeIcon color="gray" variant="light">
          <Target size={18} />
        </ThemeIcon>
        <Title order={3}>Savings goals</Title>
      </Group>

      {goals.length === 0 ? (
        <Box className="empty-state">No savings goals yet.</Box>
      ) : (
        <Stack gap="md">
          {goals.map((goal) => {
            const percent = goal.target > 0 ? (goal.saved / goal.target) * 100 : 0;

            return (
              <Box key={goal.id}>
                <Group justify="space-between" mb={6}>
                  <Text fw={700}>{goal.name}</Text>
                  <Text size="sm" c="dimmed">
                    {currency.format(goal.saved)} / {currency.format(goal.target)}
                  </Text>
                </Group>
                <Progress value={Math.min(percent, 100)} color={goal.color} mb="xs" />
                <NumberInput
                  size="xs"
                  label={`Saved so far — ${goal.name}`}
                  min={0}
                  prefix="$"
                  value={goal.saved}
                  onChange={(value) =>
                    onUpdateSaved(goal.id, typeof value === 'number' ? value : 0)
                  }
                />
              </Box>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
}
