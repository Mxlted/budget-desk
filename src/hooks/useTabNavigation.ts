import { useCallback, useEffect, useState } from 'react';

const VALID_TABS = ['dashboard', 'transactions', 'recurring', 'categories', 'data'] as const;
export type TabKey = (typeof VALID_TABS)[number];

const isTabKey = (value: string | null | undefined): value is TabKey =>
  !!value && (VALID_TABS as readonly string[]).includes(value);

const getUrlTab = (fallback: TabKey): TabKey => {
  const value = new URLSearchParams(window.location.search).get('tab');
  return isTabKey(value) ? value : fallback;
};

const writeUrlTab = (tab: TabKey, mode: 'push' | 'replace' = 'replace') => {
  const url = new URL(window.location.href);
  url.searchParams.set('tab', tab);
  window.history[mode === 'replace' ? 'replaceState' : 'pushState']({ tab }, '', url);
};

export function useTabNavigation(defaultTab: TabKey = 'dashboard') {
  const [activeTab, setActiveTab] = useState<TabKey>(() => getUrlTab(defaultTab));

  const onChange = useCallback((value: string | null) => {
    if (isTabKey(value)) {
      setActiveTab(value);
      writeUrlTab(value, 'replace');
    }
  }, []);

  useEffect(() => {
    writeUrlTab(activeTab, 'replace');

    const handlePopState = () => {
      setActiveTab(getUrlTab(defaultTab));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { activeTab, setActiveTab: onChange };
}
