import React, { useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './themeStore';

const PRIMARY_STORAGE_KEY = 'ecoclinic_theme';
const LEGACY_STORAGE_KEY = 'totalsafety_theme';

const getInitialTheme = () => {
  try {
    const savedTheme = localStorage.getItem(PRIMARY_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
  } catch {
    // Fallback silencioso caso o localStorage esteja bloqueado
  }

  // Padrão do sistema: Claro ('light'), mantendo a opção de modo escuro sempre disponível
  return 'light';
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', theme === 'dark' ? '#000000' : '#f6f8fb');

    try {
      localStorage.setItem(PRIMARY_STORAGE_KEY, theme);
      localStorage.setItem(LEGACY_STORAGE_KEY, theme);
    } catch {
      // Theme remains active for the current session.
    }
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    isDark: theme === 'dark',
    setTheme,
    toggleTheme: () => setTheme(current => current === 'dark' ? 'light' : 'dark')
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export { useTheme } from '../hooks/useTheme';
