import React from 'react';
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import { CrmProvider } from './CrmContext';
import { LabProvider } from './LabContext';
import { FinanceProvider } from './FinanceContext';
import { LogisticsProvider } from './LogisticsContext';
import { ProductionProvider } from './ProductionContext';
import { ProcurementProvider } from './ProcurementContext'; // NEW
import { ToastProvider } from './ToastContext';

export const AppProvider = ({ children }) => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <CrmProvider>
            {/* Procurement depends on Production for Inventory updates */}
            <ProductionProvider>
              <ProcurementProvider>
                <LabProvider>
                  <FinanceProvider>
                    <LogisticsProvider>
                      {children}
                    </LogisticsProvider>
                  </FinanceProvider>
                </LabProvider>
              </ProcurementProvider>
            </ProductionProvider>
          </CrmProvider>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};