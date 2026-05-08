import { ActionIcon, Box, Button, Group, Select, ThemeIcon, Title, Text, Tooltip } from '@mantine/core';
import { MonthPickerInput } from '@mantine/dates';
import { ChevronLeft, ChevronRight, Download, WalletCards } from 'lucide-react';
import { addMonths, currentMonthKey } from '../budgetMath';
import { dateToMonthKey, inputValueToDate, monthKeyToDate } from '../formHelpers';
import { ColorSchemeToggle } from './ColorSchemeToggle';

interface AppHeaderProps {
  selectedMonth: string;
  profileOptions: Array<{ value: string; label: string }>;
  activeProfileId: string;
  onSelectProfile: (profileId: string) => void;
  onSelectMonth: (month: string) => void;
  onExport: () => void;
}

export function AppHeader({
  selectedMonth,
  profileOptions,
  activeProfileId,
  onSelectProfile,
  onSelectMonth,
  onExport,
}: AppHeaderProps) {
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
        <Select
          aria-label="Budget profile"
          data={profileOptions}
          value={activeProfileId}
          allowDeselect={false}
          onChange={(value) => {
            if (value) {
              onSelectProfile(value);
            }
          }}
          w={175}
        />
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
            const date = inputValueToDate(value);
            if (date) {
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
