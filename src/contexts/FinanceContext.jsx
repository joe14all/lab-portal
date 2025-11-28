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
        
        // Sort by newest first
        setInvoices(fetchedInvoices.sort((a, b) => new Date(b.issueDate || b.createdAt) - new Date(a.issueDate || a.createdAt)));
        setPayments(fetchedPayments.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)));
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
   * (CREATE) Generate a new invoice from selected cases
   */
  const createInvoice = useCallback(async (invoiceData) => {
    if (!activeLab) return;
    
    try {
      // Calculate totals if not provided (Safety net)
      const calculatedSubtotal = invoiceData.items.reduce((sum, item) => sum + (item.total || 0), 0);
      const calculatedTax = invoiceData.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
      const calculatedTotal = calculatedSubtotal + calculatedTax;

      // Create payload with business logic defaults
      const payload = {
        ...invoiceData,
        labId: activeLab.id,
        invoiceNumber: `INV-2025-${Math.floor(1000 + Math.random() * 9000)}`,
        status: invoiceData.status || 'Draft',
        issueDate: invoiceData.status === 'Sent' ? new Date().toISOString() : null,
        subtotal: calculatedSubtotal,
        taxTotal: calculatedTax,
        totalAmount: calculatedTotal,
        balanceDue: calculatedTotal, 
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

  /**
   * (UPDATE) Update invoice details or status (e.g., Void, WriteOff, Move to Sent)
   */
  const updateInvoice = useCallback(async (invoiceId, updates) => {
    try {
      // If moving to 'Sent', ensure issueDate is set
      if (updates.status === 'Sent' && !updates.issueDate) {
        updates.issueDate = new Date().toISOString();
      }

      // If Voiding, clear balance
      if (updates.status === 'Void') {
        updates.balanceDue = 0;
      }

      const updatedInvoice = await MockService.finance.invoices.update(invoiceId, updates);
      
      setInvoices(prev => prev.map(inv => inv.id === invoiceId ? updatedInvoice : inv));
      return updatedInvoice;
    } catch (err) {
      console.error("Failed to update invoice", err);
      throw err;
    }
  }, []);

  /**
   * (DELETE) Remove a Draft invoice
   */
  const deleteInvoice = useCallback(async (invoiceId) => {
    try {
      await MockService.finance.invoices.delete(invoiceId);
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
    } catch (err) {
      console.error("Failed to delete invoice", err);
      throw err;
    }
  }, []);

  // ============================================================
  // 2. PAYMENT HANDLERS
  // ============================================================

  /**
   * (CREATE) Process a payment and update allocated invoice balances
   * Now supports the 'allocations' array structure.
   */
  const recordPayment = useCallback(async (paymentData) => {
    if (!activeLab) return;

    try {
      // 1. Create Payment Record
      const newPayment = await MockService.finance.payments.create({
        ...paymentData,
        labId: activeLab.id,
        transactionDate: new Date().toISOString(),
        status: 'Completed' // Assuming direct entry implies success for this mock
      });

      setPayments(prev => [newPayment, ...prev]);

      // 2. Update Linked Invoices based on Allocations
      if (newPayment.allocations && newPayment.allocations.length > 0) {
        
        // We need to update local state AND backend for each affected invoice
        const updatedInvoicesMap = {};

        // Perform updates sequentially or parallel (Parallel preferred for mock)
        await Promise.all(newPayment.allocations.map(async (alloc) => {
          const invoice = invoices.find(inv => inv.id === alloc.invoiceId);
          if (invoice) {
            const newBalance = Math.max(0, invoice.balanceDue - alloc.amountApplied);
            const newStatus = newBalance <= 0 ? 'Paid' : 'Partial';
            
            // Persist
            const updatedInv = await MockService.finance.invoices.update(invoice.id, {
              balanceDue: newBalance,
              status: newStatus
            });
            
            // Store for local state update
            updatedInvoicesMap[invoice.id] = updatedInv;
          }
        }));

        // Batch update local state
        setInvoices(prev => prev.map(inv => updatedInvoicesMap[inv.id] || inv));
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
    updateInvoice,
    deleteInvoice,

    // Payment Actions
    recordPayment,
    
  }), [
    invoices, payments, loading, error,
    getInvoiceById, getInvoicesByClinic, createInvoice, updateInvoice, deleteInvoice,
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