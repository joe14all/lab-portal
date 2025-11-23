/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { MockService } from '../_mock/service';
import { useAuth } from './AuthContext';

const FinanceContext = createContext(null);

export const FinanceProvider = ({ children }) => {
  const { activeLab } = useAuth();

  // --- State ---
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Initialize Data ---
  useEffect(() => {
    const initData = async () => {
      if (!activeLab?.id) return;

      setLoading(true);
      try {
        const [fetchedInvoices, fetchedPayments] = await Promise.all([
          MockService.finance.invoices.getAll({ labId: activeLab.id }),
          MockService.finance.payments.getAll({ labId: activeLab.id })
        ]);
        
        setInvoices(fetchedInvoices);
        setPayments(fetchedPayments);
        setError(null);
      } catch (err) {
        console.error("Failed to load Finance data", err);
        setError("Failed to load Finance data");
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [activeLab]);

  // ============================================================
  // 1. INVOICE HANDLERS
  // ============================================================

  /**
   * (READ) Get a single invoice by ID
   */
  const getInvoiceById = useCallback((invoiceId) => {
    return invoices.find(inv => inv.id === invoiceId);
  }, [invoices]);

  /**
   * (READ) Get invoices for a specific clinic
   */
  const getInvoicesByClinic = useCallback((clinicId) => {
    return invoices.filter(inv => inv.clinicId === clinicId);
  }, [invoices]);

  /**
   * (CREATE) Generate a new invoice from cases
   */
  const createInvoice = useCallback(async (invoiceData) => {
    if (!activeLab) return;
    
    try {
      // Create payload with business logic defaults
      const payload = {
        ...invoiceData,
        labId: activeLab.id,
        invoiceNumber: `INV-2025-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'Sent',
        issueDate: new Date().toISOString(),
        balanceDue: invoiceData.totalAmount, 
        currency: invoiceData.currency || 'USD'
      };

      const newInvoice = await MockService.finance.invoices.create(payload);
      
      // Optimistic Update
      setInvoices(prev => [newInvoice, ...prev]);
      return newInvoice;
    } catch (err) {
      console.error("Failed to create invoice", err);
      throw err;
    }
  }, [activeLab]);

  // ============================================================
  // 2. PAYMENT HANDLERS
  // ============================================================

  /**
   * (CREATE) Process a payment and update invoice balances
   */
  const recordPayment = useCallback(async (paymentData) => {
    if (!activeLab) return;

    try {
      // 1. Persist Payment
      const newPayment = await MockService.finance.payments.create({
        ...paymentData,
        labId: activeLab.id,
        date: new Date().toISOString(),
        status: 'Completed'
      });

      setPayments(prev => [newPayment, ...prev]);

      // 2. Update Linked Invoices (Persist & State)
      if (newPayment.invoiceIds && newPayment.invoiceIds.length > 0) {
        // Calculate updates
        const updatedInvoices = invoices.map(inv => {
          if (newPayment.invoiceIds.includes(inv.id)) {
            // Simplistic allocation logic from original requirement
            const newBalance = Math.max(0, inv.balanceDue - newPayment.amount);
            const newStatus = newBalance <= 0 ? 'PaidInFull' : 'Partial';
            
            // Persist change to backend (Fire & Forget for mock speed)
            MockService.finance.invoices.update(inv.id, {
              balanceDue: newBalance,
              status: newStatus
            });

            return { ...inv, balanceDue: newBalance, status: newStatus };
          }
          return inv;
        });

        setInvoices(updatedInvoices);
      }

      return newPayment;
    } catch (err) {
      console.error("Failed to record payment", err);
      throw err;
    }
  }, [activeLab, invoices]);

  // ============================================================
  // EXPORT VALUE
  // ============================================================

  const value = useMemo(() => ({
    // State
    invoices,
    payments,
    loading,
    error,

    // Invoice Actions
    getInvoiceById,
    getInvoicesByClinic,
    createInvoice,

    // Payment Actions
    recordPayment,
    
  }), [
    invoices, payments, loading, error,
    getInvoiceById, getInvoicesByClinic, createInvoice,
    recordPayment
  ]);

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
};

// Hook
export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};