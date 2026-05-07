import { useCallback, useEffect, useState } from 'react';
import { normalizeMonthKey } from '../budgetMath';

const getUrlMonth = () => {
  const params = new URLSearchParams(window.location.search);
  return normalizeMonthKey(params.get('month'));
};

const writeUrlMonth = (month: string, mode: 'push' | 'replace' = 'push') => {
  const normalizedMonth = normalizeMonthKey(month);
  const url = new URL(window.location.href);
  url.searchParams.set('month', normalizedMonth);
  window.history[mode === 'replace' ? 'replaceState' : 'pushState'](
    { month: normalizedMonth },
    '',
    url,
  );
};

export interface UseMonthNavigation {
  selectedMonth: string;
  setActiveMonth: (month: string, mode?: 'push' | 'replace') => void;
}

export function useMonthNavigation(onMonthChange?: (month: string) => void): UseMonthNavigation {
  const [selectedMonth, setSelectedMonth] = useState(getUrlMonth);

  const setActiveMonth = useCallback(
    (month: string, mode: 'push' | 'replace' = 'push') => {
      const normalizedMonth = normalizeMonthKey(month, selectedMonth);
      setSelectedMonth(normalizedMonth);
      writeUrlMonth(normalizedMonth, mode);
      onMonthChange?.(normalizedMonth);
    },
    [selectedMonth, onMonthChange],
  );

  useEffect(() => {
    writeUrlMonth(selectedMonth, 'replace');

    const handlePopState = () => {
      const month = getUrlMonth();
      setSelectedMonth(month);
      onMonthChange?.(month);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
    // selectedMonth + onMonthChange intentionally omitted: this effect should
    // only run on mount to sync the initial URL and register the popstate
    // handler. The handler reads getUrlMonth() fresh each invocation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { selectedMonth, setActiveMonth };
}
