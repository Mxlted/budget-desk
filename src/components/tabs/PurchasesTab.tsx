import {
  ActionIcon,
  Badge,
  Box,
  Group,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { Filter, Search, Trash2 } from 'lucide-react';
import { preciseCurrency } from '../../budgetMath';
import { AddPurchaseForm } from '../forms/AddPurchaseForm';
import type { Transaction } from '../../types';

interface PurchasesTabProps {
  selectedMonth: string;
  filteredTransactions: Transaction[];
  query: string;
  onQueryChange: (value: string) => void;
  categoryFilter: string | null;
  onCategoryFilterChange: (value: string | null) => void;
  categoryOptions: Array<{ value: string; label: string }>;
  accountOptions: Array<{ value: string; label: string }>;
  onAddTransaction: (transaction: Transaction) => void;
  onRemoveTransaction: (id: string) => void;
  onFormError: (title: string, message: string) => void;
}

export function PurchasesTab({
  selectedMonth,
  filteredTransactions,
  query,
  onQueryChange,
  categoryFilter,
  onCategoryFilterChange,
  categoryOptions,
  accountOptions,
  onAddTransaction,
  onRemoveTransaction,
  onFormError,
}: PurchasesTabProps) {
  return (
    <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
      <AddPurchaseForm
        selectedMonth={selectedMonth}
        categoryOptions={categoryOptions}
        accountOptions={accountOptions}
        onAdd={onAddTransaction}
        onError={onFormError}
      />

      <Paper className="panel table-panel" withBorder>
        <Group justify="space-between" align="flex-start" mb="md">
          <Box>
            <Title order={3}>Ledger</Title>
            <Text size="sm" c="dimmed">
              Manual, imported, and scheduled entries
            </Text>
          </Box>
          <Badge variant="light" color="gray">
            {filteredTransactions.length} rows
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" mb="md">
          <TextInput
            leftSection={<Search size={16} />}
            placeholder="Search merchant, category, account"
            value={query}
            onChange={(event) => onQueryChange(event.currentTarget.value)}
          />
          <Select
            leftSection={<Filter size={16} />}
            placeholder="All categories"
            clearable
            data={categoryOptions}
            value={categoryFilter}
            onChange={onCategoryFilterChange}
          />
        </SimpleGrid>

        <ScrollArea h={520}>
          <Table stickyHeader highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Merchant</Table.Th>
                <Table.Th>Category</Table.Th>
                <Table.Th>Account</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredTransactions.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>{item.date}</Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Text fw={600}>{item.merchant}</Text>
                      {item.source !== 'manual' ? (
                        <Badge size="xs" variant="light">
                          {item.source}
                        </Badge>
                      ) : null}
                    </Group>
                  </Table.Td>
                  <Table.Td>{item.category}</Table.Td>
                  <Table.Td>{item.account}</Table.Td>
                  <Table.Td>
                    <Text fw={700} c={item.type === 'income' ? 'blue.6' : undefined}>
                      {item.type === 'income' ? '+' : '-'}
                      {preciseCurrency.format(item.amount)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {item.source !== 'recurring' ? (
                      <Tooltip label={`Delete ${item.merchant}`}>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          aria-label={`Delete ${item.merchant}`}
                          onClick={() => onRemoveTransaction(item.id)}
                        >
                          <Trash2 size={16} />
                        </ActionIcon>
                      </Tooltip>
                    ) : null}
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
