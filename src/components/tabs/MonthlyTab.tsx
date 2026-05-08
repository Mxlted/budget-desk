import { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Group,
  Paper,
  ScrollArea,
  SimpleGrid,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { Pause, Pencil, Play, Trash2 } from 'lucide-react';
import { preciseCurrency } from '../../budgetMath';
import { AddRecurringForm } from '../forms/AddRecurringForm';
import { EditRecurringForm } from '../forms/EditRecurringForm';
import type { RecurringPurchase } from '../../types';

interface MonthlyTabProps {
  selectedMonth: string;
  recurring: RecurringPurchase[];
  categoryOptions: Array<{ value: string; label: string }>;
  accountOptions: Array<{ value: string; label: string }>;
  onAddRecurring: (item: RecurringPurchase) => void;
  onUpdateRecurring: (item: RecurringPurchase) => void;
  onToggleRecurring: (id: string) => void;
  onRemoveRecurring: (id: string) => void;
  onFormError: (title: string, message: string) => void;
}

export function MonthlyTab({
  selectedMonth,
  recurring,
  categoryOptions,
  accountOptions,
  onAddRecurring,
  onUpdateRecurring,
  onToggleRecurring,
  onRemoveRecurring,
  onFormError,
}: MonthlyTabProps) {
  const activeCount = recurring.filter((item) => item.active).length;
  const [editingRecurring, setEditingRecurring] = useState<RecurringPurchase | null>(null);

  return (
    <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
      <AddRecurringForm
        selectedMonth={selectedMonth}
        categoryOptions={categoryOptions}
        accountOptions={accountOptions}
        onAdd={onAddRecurring}
        onError={onFormError}
      />

      {editingRecurring ? (
        <EditRecurringForm
          item={editingRecurring}
          selectedMonth={selectedMonth}
          categoryOptions={categoryOptions}
          accountOptions={accountOptions}
          onSave={(item) => {
            onUpdateRecurring(item);
            setEditingRecurring(null);
          }}
          onCancel={() => setEditingRecurring(null)}
          onError={onFormError}
        />
      ) : null}

      <Paper className="panel table-panel" withBorder>
        <Group justify="space-between" align="flex-start" mb="md">
          <Box>
            <Title order={3}>Recurring schedule</Title>
            <Text size="sm" c="dimmed">
              These appear automatically in each matching month
            </Text>
          </Box>
          <Badge variant="light" color="orange">
            {activeCount} active
          </Badge>
        </Group>

        <ScrollArea h={600}>
          <Table stickyHeader highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Category</Table.Th>
                <Table.Th>Schedule</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recurring.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Text fw={700}>{item.merchant}</Text>
                      <Badge color={item.active ? 'blue' : 'gray'} variant="light">
                        {item.active ? 'active' : 'paused'}
                      </Badge>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={item.type === 'income' ? 'blue' : 'orange'} variant="light">
                      {item.type}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{item.category}</Table.Td>
                  <Table.Td>
                    Day {item.day}, from {item.startMonth}
                    {item.endMonth ? ` to ${item.endMonth}` : ''}
                  </Table.Td>
                  <Table.Td>{preciseCurrency.format(item.amount)}</Table.Td>
                  <Table.Td>
                    <Group gap={4} wrap="nowrap">
                      <Tooltip label={`Edit ${item.merchant}`}>
                        <ActionIcon
                          variant="subtle"
                          aria-label={`Edit ${item.merchant}`}
                          onClick={() => setEditingRecurring(item)}
                        >
                          <Pencil size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip
                        label={item.active ? `Pause ${item.merchant}` : `Activate ${item.merchant}`}
                      >
                        <ActionIcon
                          variant="subtle"
                          aria-label={`${item.active ? 'Pause' : 'Activate'} ${item.merchant}`}
                          onClick={() => onToggleRecurring(item.id)}
                        >
                          {item.active ? <Pause size={16} /> : <Play size={16} />}
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label={`Delete ${item.merchant}`}>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          aria-label={`Delete ${item.merchant}`}
                          onClick={() => {
                            onRemoveRecurring(item.id);
                            if (editingRecurring?.id === item.id) {
                              setEditingRecurring(null);
                            }
                          }}
                        >
                          <Trash2 size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>

    </SimpleGrid>
  );
}
