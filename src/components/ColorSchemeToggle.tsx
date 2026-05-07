import { ActionIcon, Tooltip, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import { Moon, Sun } from 'lucide-react';

export function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme({ keepTransitions: true });
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const nextScheme = computedColorScheme === 'dark' ? 'light' : 'dark';
  const label = `Switch to ${nextScheme} mode`;

  return (
    <Tooltip label={label}>
      <ActionIcon
        variant="default"
        size="lg"
        aria-label={label}
        onClick={() => setColorScheme(nextScheme)}
      >
        {computedColorScheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </ActionIcon>
    </Tooltip>
  );
}
