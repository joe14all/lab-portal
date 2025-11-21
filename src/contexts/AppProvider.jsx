import React from 'react';
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import { CrmProvider } from './CrmContext';
import { LabProvider } from './LabContext';
import { FinanceProvider } from './FinanceContext';
import { LogisticsProvider } from './LogisticsContext'; // NEW IMPORT

export const AppProvider = ({ children }) => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <CrmProvider>
          <LabProvider>
            <FinanceProvider>
              <LogisticsProvider> {/* NEW PROVIDER */}
                {children}
              </LogisticsProvider>
            </FinanceProvider>
          </LabProvider>
        </CrmProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};