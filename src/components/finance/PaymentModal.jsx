import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import { useCrm, useFinance } from '../../contexts';
import { IconInvoice } from '../../layouts/components/LabIcons';
import styles from './PaymentModal.module.css';

const PaymentModal = ({ isOpen, onClose, onSuccess }) => {
  const { clinics } = useCrm();
  const { getInvoicesByClinic, recordPayment } = useFinance();

  const [clinicId, setClinicId] = useState('');
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState('Check');
  const [refCode, setRefCode] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Allocation State: { [invoiceId]: amountApplied }
  const [allocations, setAllocations] = useState({});

  // Fetch Open Invoices when clinic changes
  const openInvoices = useMemo(() => {
    if (!clinicId) return [];
    return getInvoicesByClinic(clinicId).filter(inv => inv.balanceDue > 0);
  }, [clinicId, getInvoicesByClinic]);

  // Reset Logic
  useEffect(() => {
    if (isOpen) {
      setAllocations({});
      setAmount(0);
      setClinicId('');
      setRefCode('');
    }
  }, [isOpen]);

  // Helper: Calculate Remaining
  const allocatedTotal = Object.values(allocations).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  const remaining = amount - allocatedTotal;

  // Auto-Allocate Handler (Oldest First)
  const handleAutoAllocate = () => {
    let remainingAmt = amount;
    const newAlloc = {};
    
    // Sort oldest first
    const sorted = [...openInvoices].sort((a, b) => new Date(a.issueDate) - new Date(b.issueDate));
    
    for (const inv of sorted) {
      if (remainingAmt <= 0) break;
      const apply = Math.min(remainingAmt, inv.balanceDue);
      newAlloc[inv.id] = apply;
      remainingAmt -= apply;
    }
    setAllocations(newAlloc);
  };

  const handleSubmit = async () => {
    const allocationList = Object.entries(allocations)
      .filter(([_, val]) => val > 0)
      .map(([invId, val]) => ({
        invoiceId: invId,
        amountApplied: parseFloat(val)
      }));

    const payload = {
      clinicId,
      totalAmount: parseFloat(amount),
      method,
      referenceCode: refCode,
      transactionDate: date,
      allocations: allocationList
    };

    await recordPayment(payload);
    onSuccess();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Payment"
      icon={<IconInvoice />}
      width="600px"
      footer={
        <div className={styles.footer}>
          <div className={styles.summary}>
            <span className={remaining < 0 ? styles.errorText : styles.validText}>
              Unallocated: ${remaining.toFixed(2)}
            </span>
          </div>
          <div className={styles.actions}>
            <button className="button text" onClick={onClose}>Cancel</button>
            <button 
              className="button primary" 
              onClick={handleSubmit} 
              disabled={!clinicId || amount <= 0 || remaining < 0}
            >
              Process Payment
            </button>
          </div>
        </div>
      }
    >
      <div className={styles.container}>
        {/* Payment Details */}
        <div className={styles.card}>
          <div className={styles.row}>
            <div className="form-group" style={{flex: 1}}>
              <label>Clinic</label>
              <select value={clinicId} onChange={e => setClinicId(e.target.value)}>
                <option value="">Select Clinic...</option>
                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{flex: 1}}>
              <label>Amount ($)</label>
              <input 
                type="number" 
                value={amount} 
                onChange={e => setAmount(parseFloat(e.target.value))} 
              />
            </div>
          </div>
          <div className={styles.row}>
            <div className="form-group" style={{flex: 1}}>
              <label>Method</label>
              <select value={method} onChange={e => setMethod(e.target.value)}>
                <option>Check</option>
                <option>Credit Card</option>
                <option>Bank Transfer</option>
                <option>Cash</option>
              </select>
            </div>
            <div className="form-group" style={{flex: 1}}>
              <label>Ref #</label>
              <input 
                type="text" 
                value={refCode} 
                onChange={e => setRefCode(e.target.value)} 
                placeholder="Check No. / Auth ID"
              />
            </div>
          </div>
        </div>

        {/* Allocation Section */}
        {clinicId && (
          <div className={styles.allocationSection}>
            <div className={styles.allocHeader}>
              <h4>Open Invoices</h4>
              <button 
                className="button secondary small" 
                onClick={handleAutoAllocate}
                disabled={amount <= 0}
              >
                Auto-Allocate
              </button>
            </div>
            
            <div className={styles.invoiceList}>
              {openInvoices.length === 0 && <p className={styles.empty}>No open invoices.</p>}
              
              {openInvoices.map(inv => (
                <div key={inv.id} className={styles.invoiceRow}>
                  <div className={styles.invInfo}>
                    <strong>{inv.invoiceNumber}</strong>
                    <span>Due: {new Date(inv.dueDate).toLocaleDateString()}</span>
                  </div>
                  <div className={styles.invBalance}>
                    Open: ${inv.balanceDue.toFixed(2)}
                  </div>
                  <div className={styles.invInput}>
                    <label>Apply:</label>
                    <input 
                      type="number"
                      max={inv.balanceDue}
                      value={allocations[inv.id] || ''}
                      onChange={(e) => setAllocations({
                        ...allocations,
                        [inv.id]: parseFloat(e.target.value)
                      })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PaymentModal;