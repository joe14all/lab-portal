 import React, { useState, useMemo } from 'react';
import { useFinance, useCrm } from '../../contexts';
import { 
  IconSearch, 
  IconCheck, 
  IconClock,
  IconInvoice
} from '../../layouts/components/LabIcons';
import styles from './Payments.module.css';

const Payments = () => {
  const { payments, loading: financeLoading } = useFinance();
  const { clinics, loading: crmLoading } = useCrm();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('All');

  const loading = financeLoading || crmLoading;

  // --- 1. Enrich Data ---
  const enrichedPayments = useMemo(() => {
    if (!payments || !clinics) return [];
    
    return payments.map(pay => {
      const clinic = clinics.find(c => c.id === pay.clinicId);
      return {
        ...pay,
        clinicName: clinic ? clinic.name : 'Unknown Clinic',
        // Calculate allocations count for display
        allocationCount: pay.allocations ? pay.allocations.length : 0
      };
    });
  }, [payments, clinics]);

  // --- 2. Filter Logic ---
  const filteredPayments = useMemo(() => {
    return enrichedPayments.filter(pay => {
      const matchesSearch = 
        pay.paymentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pay.clinicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pay.referenceCode && pay.referenceCode.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesMethod = methodFilter === 'All' || pay.method === methodFilter;

      return matchesSearch && matchesMethod;
    });
  }, [enrichedPayments, searchQuery, methodFilter]);

  // --- 3. Stats ---
  const totalCollected = useMemo(() => {
    return filteredPayments.reduce((acc, curr) => acc + curr.totalAmount, 0);
  }, [filteredPayments]);

  const formatMoney = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  if (loading) return <div className={styles.loading}>Loading payment history...</div>;

  return (
    <div className={styles.pageContainer}>
      
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1>Payment History</h1>
          <p>Track incoming payments and allocations.</p>
        </div>
        <div className={styles.totalBadge}>
          <span>Total Visible:</span>
          <strong>{formatMoney(totalCollected)}</strong>
        </div>
      </div>

      {/* Filters */}
      <div className={`card ${styles.filtersCard}`}>
        <div className={styles.searchWrapper}>
          <IconSearch className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search by Ref #, Receipt #, or Clinic..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        
        <div className={styles.filterGroup}>
          <label>Method:</label>
          <select 
            value={methodFilter} 
            onChange={(e) => setMethodFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="All">All Methods</option>
            <option value="Check">Check</option>
            <option value="CreditCard">Credit Card</option>
            <option value="BankTransfer">Bank Transfer</option>
            <option value="Cash">Cash</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className={`card ${styles.tableCard}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Receipt #</th>
              <th>Clinic</th>
              <th>Method</th>
              <th>Reference</th>
              <th>Allocations</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length > 0 ? (
              filteredPayments.map(pay => (
                <tr key={pay.id} className={styles.tableRow}>
                  <td>{new Date(pay.transactionDate).toLocaleDateString()}</td>
                  <td className={styles.mono}>{pay.paymentNumber}</td>
                  <td className={styles.fwBold}>{pay.clinicName}</td>
                  <td>{pay.method}</td>
                  <td className={styles.mono}>{pay.referenceCode || '-'}</td>
                  <td>
                    {pay.allocationCount > 0 ? (
                      <span className={styles.tag}>{pay.allocationCount} Invoices</span>
                    ) : (
                      <span className={`${styles.tag} ${styles.tagWarning}`}>Unallocated</span>
                    )}
                  </td>
                  <td className={styles.fwBold}>{formatMoney(pay.totalAmount, pay.currency)}</td>
                  <td>
                    {pay.status === 'Completed' ? (
                      <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                        <IconCheck width="12" /> Completed
                      </span>
                    ) : (
                      <span className={`${styles.badge} ${styles.badgeWarning}`}>
                        <IconClock width="12" /> {pay.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className={styles.emptyState}>No payments found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Payments;