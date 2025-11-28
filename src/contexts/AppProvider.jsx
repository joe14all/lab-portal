import React from 'react';
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import { CrmProvider } from './CrmContext';
import { LabProvider } from './LabContext';
import { FinanceProvider } from './FinanceContext';
import { LogisticsProvider } from './LogisticsContext';
import { ProductionProvider } from './ProductionContext';
import { ToastProvider } from './ToastContext';

export const AppProvider = ({ children }) => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <CrmProvider>
            <ProductionProvider>
              <LabProvider>
                <FinanceProvider>
                  <LogisticsProvider>
                    {children}
                  </LogisticsProvider>
                </FinanceProvider>
              </LabProvider>
            </ProductionProvider>
          </CrmProvider>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};