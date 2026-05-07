import { memo } from 'react';
import { Badge, Paper, Text } from '@mantine/core';

export interface MetricTileProps {
  label: string;
  value: string;
  detail: string;
  tone: 'blue' | 'orange' | 'red';
}

function MetricTileComponent({ label, value, detail, tone }: MetricTileProps) {
  return (
    <Paper className="metric-tile" withBorder>
      <Text size="xs" fw={700} c="dimmed" tt="uppercase">
        {label}
      </Text>
      <Text className="metric-value">{value}</Text>
      <Badge color={tone} variant="light">
        {detail}
      </Badge>
    </Paper>
  );
}

export const MetricTile = memo(MetricTileComponent);
