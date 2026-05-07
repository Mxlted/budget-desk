import { ActionIcon, Box, Button, Group, ThemeIcon, Title, Text, Tooltip } from '@mantine/core';
import { MonthPickerInput } from '@mantine/dates';
import { ChevronLeft, ChevronRight, Download, WalletCards } from 'lucide-react';
import { addMonths, currentMonthKey, normalizeMonthKey } from '../budgetMath';
import { ColorSchemeToggle } from './ColorSchemeToggle';

const monthKeyToDate = (month: string): Date => {
  const [year, m] = normalizeMonthKey(month).split('-').map(Number);
  // Anchor to noon to avoid TZ rounding into adjacent month.
  return new Date(year, m - 1, 1, 12, 0, 0);
};

const dateToMonthKey = (date: Date): string => {
  const year = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${m}`;
};

interface AppHeaderProps {
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  onExport: () => void;
}

export function AppHeader({ selectedMonth, onSelectMonth, onExport }: AppHeaderProps) {
  return (
    <Group justify="space-between" wrap="nowrap" h="100%">
      <Group gap="sm" wrap="nowrap">
        <ThemeIcon size={38} radius="sm" color="gray">
          <WalletCards size={21} />
        </ThemeIcon>
        <Box>
          <Title order={2} className="app-title">
            Budget Desk
          </Title>
          <Text size="sm" c="dimmed">
            Local-first monthly spending planner
          </Text>
        </Box>
      </Group>

      <Group gap="xs" wrap="nowrap" className="header-actions">
        <Tooltip label="Previous month">
          <ActionIcon
            variant="default"
            size="lg"
            aria-label="Previous month"
            onClick={() => onSelectMonth(addMonths(selectedMonth, -1))}
          >
            <ChevronLeft size={18} />
          </ActionIcon>
        </Tooltip>
        <MonthPickerInput
          aria-label="Selected month"
          value={monthKeyToDate(selectedMonth)}
          onChange={(value) => {
            if (!value) return;
            const date = typeof value === 'string' ? new Date(value) : value;
            if (date instanceof Date && !Number.isNaN(date.getTime())) {
              onSelectMonth(dateToMonthKey(date));
            }
          }}
          valueFormat="MMM YYYY"
          popoverProps={{ withinPortal: true }}
          w={150}
        />
        <Tooltip label="Next month">
          <ActionIcon
            variant="default"
            size="lg"
            aria-label="Next month"
            onClick={() => onSelectMonth(addMonths(selectedMonth, 1))}
          >
            <ChevronRight size={18} />
          </ActionIcon>
        </Tooltip>
        <Button variant="default" onClick={() => onSelectMonth(currentMonthKey())}>
          This month
        </Button>
        <ColorSchemeToggle />
        <Tooltip label="Export budget data">
          <ActionIcon
            variant="default"
            size="lg"
            aria-label="Export budget data"
            onClick={onExport}
          >
            <Download size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}
