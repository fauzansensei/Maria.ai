import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type Theme = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => 'dark' | 'light';
}

interface ThemeActionsContextType {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => 'dark' | 'light';
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  isDark: true,
  setTheme: () => {},
  toggleTheme: () => 'dark',
});

const ThemeActionsContext = createContext<ThemeActionsContextType>({
  setTheme: () => {},
  toggleTheme: () => 'dark',
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

const applyDarkClassFast = (darkActive: boolean) => {
  try {
    document.documentElement.classList.toggle('dark', darkActive);
  } catch {}
};

const applyThemeSideEffects = (targetTheme: Theme, darkActive: boolean) => {
  try {
    document.documentElement.style.colorScheme = darkActive ? 'dark' : 'light';
    localStorage.setItem('maria_theme', targetTheme);
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
      applyDarkClassFast(active);
      document.documentElement.style.colorScheme = active ? 'dark' : 'light';
      return active;
    } catch {
      return false;
    }
  });

  const themeRef = useRef<Theme>(theme);
  const isDarkRef = useRef<boolean>(isDark);
  const persistTimerRef = useRef<number | null>(null);

  const schedulePersist = useCallback((targetTheme: Theme, darkActive: boolean) => {
    if (persistTimerRef.current !== null) {
      window.clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = window.setTimeout(() => {
      persistTimerRef.current = null;
      applyThemeSideEffects(targetTheme, darkActive);
    }, 80);
  }, []);

  useEffect(() => {
    const flushPersist = () => {
      if (persistTimerRef.current !== null) {
        window.clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
      applyThemeSideEffects(themeRef.current, isDarkRef.current);
    };
    window.addEventListener('pagehide', flushPersist);
    window.addEventListener('beforeunload', flushPersist);
    return () => {
      window.removeEventListener('pagehide', flushPersist);
      window.removeEventListener('beforeunload', flushPersist);
      if (persistTimerRef.current !== null) {
        window.clearTimeout(persistTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      const systemDark = mediaQuery.matches;
      isDarkRef.current = systemDark;
      applyDarkClassFast(systemDark);
      setIsDark(systemDark);
      schedulePersist('system', systemDark);
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme, schedulePersist]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      if (newTheme === themeRef.current) return;
      const darkActive = resolveIsDark(newTheme);
      themeRef.current = newTheme;
      isDarkRef.current = darkActive;
      applyDarkClassFast(darkActive);
      setIsDark(darkActive);
      setThemeState(newTheme);
      schedulePersist(newTheme, darkActive);
    },
    [schedulePersist]
  );

  const toggleTheme = useCallback((): 'dark' | 'light' => {
    const darkActive = !isDarkRef.current;
    const nextTheme: 'dark' | 'light' = darkActive ? 'dark' : 'light';
    themeRef.current = nextTheme;
    isDarkRef.current = darkActive;
    applyDarkClassFast(darkActive);
    setIsDark(darkActive);
    setThemeState(nextTheme);
    schedulePersist(nextTheme, darkActive);
    return nextTheme;
  }, [schedulePersist]);

  const actionsValue = useMemo(
    () => ({ setTheme, toggleTheme }),
    [setTheme, toggleTheme]
  );

  const contextValue = useMemo(
    () => ({ theme, isDark, setTheme, toggleTheme }),
    [theme, isDark, setTheme, toggleTheme]
  );

  return (
    <ThemeActionsContext.Provider value={actionsValue}>
      <ThemeContext.Provider value={contextValue}>
        {children}
      </ThemeContext.Provider>
    </ThemeActionsContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export const useThemeActions = () => useContext(ThemeActionsContext);

