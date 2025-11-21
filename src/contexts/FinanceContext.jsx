/* eslint-disable no-unused-vars */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

// --- Mock Data Imports ---
import invoicesData from '../_mock/data/finance/invoices.json';
import paymentsData from '../_mock/data/finance/payments.json';

const FinanceContext = createContext(null);

export const FinanceProvider = ({ children }) => {
  // --- State ---
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Initialize Data ---
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        // Simulate network latency
        await new Promise(resolve => setTimeout(resolve, 600));
        
        setInvoices(invoicesData);
        setPayments(paymentsData);
      } catch (err) {
        console.error("Failed to load Finance data", err);
        setError("Failed to load Finance data");
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // --- Helper for simulated API calls ---
  const simulateApi = (callback, delay = 500) => {
    return new Promise((resolve, reject) => {
      setLoading(true);
      setError(null);
      setTimeout(() => {
        try {
          const result = callback();
          resolve(result);
        } catch (err) {
          console.error("Mock API Error:", err.message);
          setError(err.message);
          reject(err);
        } finally {
          setLoading(false);
        }
      }, delay);
    });
  };

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
    return await simulateApi(() => {
      const newInvoice = {
        ...invoiceData,
        id: `inv-${Date.now()}`,
        invoiceNumber: `INV-2025-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'Sent',
        issueDate: new Date().toISOString(),
        balanceDue: invoiceData.totalAmount, // Initially full amount due
        currency: invoiceData.currency || 'USD'
      };
      setInvoices(prev => [newInvoice, ...prev]);
      return newInvoice;
    });
  }, []);

  // ============================================================
  // 2. PAYMENT HANDLERS
  // ============================================================

  /**
   * (CREATE) Process a payment
   * Logic mirrors the Patient Portal's makePayment logic
   * by updating the invoice balance.
   */
  const recordPayment = useCallback(async (paymentData) => {
    return await simulateApi(() => {
      const newPayment = {
        ...paymentData,
        id: `pay-${Date.now()}`,
        date: new Date().toISOString(),
        status: 'Completed'
      };

      setPayments(prev => [newPayment, ...prev]);

      // If payment is linked to invoices, update their balances
      if (newPayment.invoiceIds && newPayment.invoiceIds.length > 0) {
        setInvoices(prevInvoices => prevInvoices.map(inv => {
          if (newPayment.invoiceIds.includes(inv.id)) {
            // Simplistic allocation: Assume single invoice or full payment
            // In a real app, you'd allocate specific amounts per invoice
            const newBalance = Math.max(0, inv.balanceDue - newPayment.amount);
            const newStatus = newBalance <= 0 ? 'PaidInFull' : 'Partial';
            
            return { ...inv, balanceDue: newBalance, status: newStatus };
          }
          return inv;
        }));
      }

      return newPayment;
    });
  }, []);

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