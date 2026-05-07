import { useState } from 'react';
import {
  Box,
  Button,
  Divider,
  FileInput,
  Group,
  Paper,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  Database,
  Download,
  FileDown,
  FileSpreadsheet,
  RefreshCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { preciseCurrency } from '../../budgetMath';
import type { StatementRow } from '../../types';

const PREVIEW_LIMIT = 25;

interface DataTabProps {
  importPreview: StatementRow[];
  statementType: 'bank' | 'credit-card';
  onStatementTypeChange: (value: 'bank' | 'credit-card') => void;
  importAccount: string;
  onImportAccountChange: (value: string) => void;
  accountOptions: Array<{ value: string; label: string }>;
  onPreviewStatement: (file: File | null) => Promise<void> | void;
  onImportRows: () => void;
  onExport: () => void;
  onImportData: (file: File | null) => Promise<void> | void;
  onClearData: () => void;
  onResetSampleData: () => void;
}

export function DataTab({
  importPreview,
  statementType,
  onStatementTypeChange,
  importAccount,
  onImportAccountChange,
  accountOptions,
  onPreviewStatement,
  onImportRows,
  onExport,
  onImportData,
  onClearData,
  onResetSampleData,
}: DataTabProps) {
  // Reset key forces FileInput to remount and clear after a successful import,
  // so the same file can be reselected without confusion.
  const [statementInputKey, setStatementInputKey] = useState(0);
  const [backupInputKey, setBackupInputKey] = useState(0);

  return (
    <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
      <Paper className="panel" withBorder>
        <Group mb="md" gap="sm">
          <ThemeIcon color="blue" variant="light">
            <FileSpreadsheet size={18} />
          </ThemeIcon>
          <Title order={3}>Statement import</Title>
        </Group>

        <Stack gap="sm">
          <SegmentedControl
            value={statementType}
            onChange={(value) => onStatementTypeChange(value as 'bank' | 'credit-card')}
            data={[
              { label: 'Bank account', value: 'bank' },
              { label: 'Credit card', value: 'credit-card' },
            ]}
          />
          <Select
            label="Import account"
            data={accountOptions}
            value={importAccount}
            onChange={(value) => onImportAccountChange(value ?? importAccount)}
          />
          <FileInput
            key={statementInputKey}
            clearable
            accept=".csv,text/csv,text/plain"
            label="CSV file"
            placeholder="Choose bank or card statement"
            leftSection={<Upload size={16} />}
            onChange={onPreviewStatement}
          />
          <Button
            leftSection={<FileDown size={16} />}
            disabled={importPreview.length === 0}
            onClick={() => {
              onImportRows();
              setStatementInputKey((k) => k + 1);
            }}
          >
            Import {importPreview.length || ''} rows
          </Button>
          <Text size="sm" c="dimmed">
            Expected columns: date, description or merchant, and amount. Debit and credit columns
            work too.
          </Text>
        </Stack>
      </Paper>

      <Paper className="panel" withBorder>
        <Group mb="md" gap="sm">
          <ThemeIcon color="gray" variant="light">
            <Database size={18} />
          </ThemeIcon>
          <Title order={3}>Local storage</Title>
        </Group>

        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            This app saves to localStorage, not cookies. Localhost and 127.0.0.1 also keep separate
            saved data.
          </Text>
          <Button variant="light" leftSection={<Download size={16} />} onClick={onExport}>
            Export JSON backup
          </Button>
          <FileInput
            key={backupInputKey}
            clearable
            accept="application/json,.json"
            label="Restore backup"
            placeholder="Choose Budget Desk JSON"
            leftSection={<Upload size={16} />}
            onChange={async (file) => {
              await onImportData(file);
              setBackupInputKey((k) => k + 1);
            }}
          />
          <Divider />
          <Button
            color="red"
            variant="filled"
            leftSection={<Trash2 size={16} />}
            onClick={onClearData}
          >
            Clear saved budget data
          </Button>
          <Button
            color="gray"
            variant="light"
            leftSection={<RefreshCcw size={16} />}
            onClick={onResetSampleData}
          >
            Reset sample data
          </Button>
        </Stack>
      </Paper>

      <Paper className="panel" withBorder>
        <Group mb="md" gap="sm">
          <ThemeIcon color="gray" variant="light">
            <FileSpreadsheet size={18} />
          </ThemeIcon>
          <Title order={3}>Tips</Title>
        </Group>
        <Stack gap="xs">
          <Text size="sm" c="dimmed">
            Use the URL <code>?month=YYYY-MM</code> to deep-link a specific month. The browser back
            button restores the previous month.
          </Text>
          <Text size="sm" c="dimmed">
            Active tab is preserved in the URL too — bookmark <code>?tab=transactions</code> to jump
            straight to the ledger.
          </Text>
          <TextInput
            label="Current URL"
            readOnly
            value={typeof window !== 'undefined' ? window.location.href : ''}
            onFocus={(event) => event.currentTarget.select()}
          />
        </Stack>
      </Paper>

      <Paper className="panel wide-panel" withBorder>
        <Group justify="space-between" align="flex-start" mb="md">
          <Title order={3}>Import preview</Title>
          {importPreview.length > 0 ? (
            <Text size="sm" c="dimmed">
              Showing {Math.min(importPreview.length, PREVIEW_LIMIT)} of {importPreview.length} rows
            </Text>
          ) : null}
        </Group>
        {importPreview.length > 0 ? (
          <ScrollArea h={320}>
            <Table
              stickyHeader
              highlightOnHover
              verticalSpacing="sm"
              aria-label="Statement import preview"
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Merchant</Table.Th>
                  <Table.Th>Category</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Amount</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {importPreview.slice(0, PREVIEW_LIMIT).map((item, index) => (
                  <Table.Tr key={`${item.date}-${item.merchant}-${index}`}>
                    <Table.Td>{item.date}</Table.Td>
                    <Table.Td>{item.merchant}</Table.Td>
                    <Table.Td>{item.category}</Table.Td>
                    <Table.Td>{item.type}</Table.Td>
                    <Table.Td>{preciseCurrency.format(item.amount)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        ) : (
          <Box className="empty-state">Choose a CSV statement to preview imported rows.</Box>
        )}
      </Paper>
    </SimpleGrid>
  );
}
