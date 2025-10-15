import { useEffect } from 'react';

export function useMarketingTheme() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;
    const root = document.documentElement;

    body?.classList.add('marketing-theme');
    root?.classList.add('marketing-root');

    return () => {
      body?.classList.remove('marketing-theme');
      root?.classList.remove('marketing-root');
    };
  }, []);
}
