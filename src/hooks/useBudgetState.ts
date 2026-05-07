import { useCallback, useMemo } from 'react';
import { useLocalStorage } from '@mantine/hooks';
import { createInitialBudgetState, sanitizeBudgetState } from '../data';
import type { BudgetState } from '../types';

const STORAGE_KEY = 'budget-desk-state-v1';

export interface UseBudgetState {
  state: BudgetState;
  setState: (next: BudgetState | ((current: BudgetState) => BudgetState)) => void;
  clearState: () => void;
}

/**
 * Wraps the budget state in localStorage with sanitization. The reducer-style
 * setter only sanitizes the produced `next` value — `current` is already
 * sanitized because every previous write came through this same wrapper.
 */
export function useBudgetState(): UseBudgetState {
  const [storedState, setStoredState, clearState] = useLocalStorage<BudgetState>({
    key: STORAGE_KEY,
    defaultValue: createInitialBudgetState(),
  });

  const state = useMemo(() => sanitizeBudgetState(storedState), [storedState]);

  const setState = useCallback(
    (next: BudgetState | ((current: BudgetState) => BudgetState)) => {
      setStoredState((current) => {
        const nextState = typeof next === 'function' ? next(current) : next;
        return sanitizeBudgetState(nextState);
      });
    },
    [setStoredState],
  );

  return { state, setState, clearState };
}
