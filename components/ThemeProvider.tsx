'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Try to get initial theme from document class (set by script in layout)
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Sync state with actual DOM class
    const isDark = document.documentElement.classList.contains('dark');
    if ((isDark && theme === 'light') || (!isDark && theme === 'dark')) {
      setTheme(isDark ? 'dark' : 'light');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Use requestAnimationFrame for smoother transition
    requestAnimationFrame(() => {
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    });
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Return default values during SSR or if used outside provider
    return {
      theme: 'light' as Theme,
      toggleTheme: () => {},
    };
  }
  return context;
}
