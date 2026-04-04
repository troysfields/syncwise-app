'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';

// ============================================================
// Theme Provider — Dark Mode Toggle
// Wraps the entire app, toggles CSS variables for light/dark
// Persists preference to localStorage across sessions
// ============================================================

const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {}, mounted: false });

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  // Check saved preference, then system preference, then mark mounted
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('syncwise-theme');
        if (saved === 'dark' || saved === 'light') {
          setTheme(saved);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          setTheme('dark');
        }
      } catch (e) {
        // localStorage not available — fall back to system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          setTheme('dark');
        }
      }
    }
    setMounted(true);
  }, []);

  // Apply theme class to document (only after mount to avoid hydration mismatch)
  useEffect(() => {
    if (mounted && typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme, mounted]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      try { localStorage.setItem('syncwise-theme', next); } catch (e) { /* ignore */ }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Simple toggle button component
export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  // Render a placeholder during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <button className="theme-toggle" aria-label="Toggle theme" title="Toggle Theme">
        <span className="theme-toggle-icon" aria-hidden="true">&nbsp;</span>
      </button>
    );
  }

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {theme === 'light' ? '🌙' : '☀️'}
      </span>
    </button>
  );
}
