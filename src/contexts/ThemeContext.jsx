/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const { user, updateUser } = useAuth();

  // --- 1. Initialize Theme State ---
  // Strategy: Check LocalStorage -> Check System Preference -> Default to 'light'
  const getInitialTheme = () => {
    const savedTheme = localStorage.getItem('lab_theme');
    if (savedTheme) return savedTheme;

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  };

  const [theme, setTheme] = useState(getInitialTheme);

  // --- 2. Sync with User Profile (When User Logs In) ---
  // If the incoming user has a saved preference, honor it immediately.
  useEffect(() => {
    const userTheme = user?.preferences?.theme;
    if (!userTheme) return;

    // Avoid synchronous setState inside the effect to prevent cascading renders:
    // only update when different, and schedule update asynchronously.
    if (userTheme !== theme) {
      Promise.resolve().then(() => setTheme(userTheme));
    }
  }, [user, theme]);

  // --- 3. Apply Theme to DOM ---
  useEffect(() => {
    const body = window.document.body;
    body.classList.remove('light', 'dark');
    body.classList.add(theme);
    // Always keep local storage in sync
    localStorage.setItem('lab_theme', theme);
  }, [theme]);

  // --- 4. Toggle Action ---
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    // If authenticated, save this preference to the backend
    if (user) {
      // We merge with existing preferences to avoid overwriting notifications settings
      const currentPrefs = user.preferences || {};
      updateUser({ 
        preferences: { 
          ...currentPrefs, 
          theme: newTheme 
        } 
      });
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook with error handling
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};