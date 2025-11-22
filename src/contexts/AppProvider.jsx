import React from 'react';
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import { CrmProvider } from './CrmContext';
import { LabProvider } from './LabContext';
import { FinanceProvider } from './FinanceContext';
import { LogisticsProvider } from './LogisticsContext';
import { ToastProvider } from './ToastContext'; // NEW

export const AppProvider = ({ children }) => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider> {/* Added High Level Provider */}
          <CrmProvider>
            <LabProvider>
              <FinanceProvider>
                <LogisticsProvider>
                  {children}
                </LogisticsProvider>
              </FinanceProvider>
            </LabProvider>
          </CrmProvider>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};