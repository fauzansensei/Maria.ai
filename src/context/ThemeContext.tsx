import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type Theme = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  isDark: true,
  setTheme: () => {},
  toggleTheme: () => {},
});

const resolveIsDark = (targetTheme: Theme): boolean => {
  try {
    if (targetTheme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return targetTheme === 'dark';
  } catch {
    return false;
  }
};

const applyThemeToDom = (darkActive: boolean) => {
  try {
    const root = document.documentElement;
    const isCurrentlyDark = root.classList.contains('dark');
    if (isCurrentlyDark === darkActive) return;
    if (darkActive) {
      root.classList.add('dark');
      document.body?.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      document.body?.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  } catch {}
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('maria_theme') as Theme;
      return saved || 'light';
    } catch {
      return 'light';
    }
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = (localStorage.getItem('maria_theme') as Theme) || 'light';
      const active = resolveIsDark(saved);
      applyThemeToDom(active);
      return active;
    } catch {
      return false;
    }
  });

  const themeRef = useRef<Theme>(theme);
  themeRef.current = theme;

  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      const systemDark = mediaQuery.matches;
      applyThemeToDom(systemDark);
      setIsDark(systemDark);
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    if (newTheme === themeRef.current) return;
    const darkActive = resolveIsDark(newTheme);
    themeRef.current = newTheme;
    applyThemeToDom(darkActive);
    setIsDark(darkActive);
    setThemeState(newTheme);
    try {
      localStorage.setItem('maria_theme', newTheme);
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    const next: Theme = themeRef.current === 'dark' ? 'light' : 'dark';
    const darkActive = next === 'dark';
    themeRef.current = next;
    applyThemeToDom(darkActive);
    setIsDark(darkActive);
    setThemeState(next);
    try {
      localStorage.setItem('maria_theme', next);
    } catch {}
  }, []);

  const contextValue = useMemo(
    () => ({ theme, isDark, setTheme, toggleTheme }),
    [theme, isDark, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
