import React from 'react';
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import { CrmProvider } from './CrmContext';
import { LabProvider } from './LabContext';
import { FinanceProvider } from './FinanceContext';

export const AppProvider = ({ children }) => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <CrmProvider>
          <LabProvider>
            <FinanceProvider>
              {children}
            </FinanceProvider>
          </LabProvider>
        </CrmProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};