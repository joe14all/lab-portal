/* src/pages/finance/Invoices.jsx */
import React, { useState, useMemo } from 'react';
import { useFinance, useCrm, useToast } from '../../contexts';
import InvoiceFormModal from '../../components/finance/InvoiceFormModal';
import PaymentModal from '../../components/finance/PaymentModal';
import InvoiceDetailModal from '../../components/finance/InvoiceDetailModal';
import { 
  IconSearch, 
  IconCheck, 
  IconAlert, 
  IconClock,
  IconChevronRight,
  IconInvoice
} from '../../layouts/components/LabIcons';
import styles from './Invoices.module.css';

const Invoices = () => {
  // --- 1. Consume Context Data ---
  const { invoices, createInvoice, loading: financeLoading } = useFinance();
  const { clinics, loading: crmLoading } = useCrm();
  const { addToast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // --- Modal State ---
  const [showCreate, setShowCreate] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const loading = financeLoading || crmLoading;

  // --- 2. Computed Data (Stats & Derived Fields) ---
  const enrichedInvoices = useMemo(() => {
    if (!invoices || !clinics) return [];
    
    return invoices.map(inv => {
      // Resolve relationship: Invoice -> Clinic
      const clinic = clinics.find(c => c.id === inv.clinicId);
      return {
        ...inv,
        clinicName: clinic ? clinic.name : 'Unknown Clinic',
        accountNumber: clinic ? clinic.accountNumber : 'N/A'
      };
    });
  }, [invoices, clinics]);

  // Calculate Stats
  const stats = useMemo(() => {
    const totalDue = enrichedInvoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
    const overdueCount = enrichedInvoices.filter(inv => inv.status === 'Overdue').length;
    const openCount = enrichedInvoices.filter(inv => inv.status === 'Sent' || inv.status === 'Partial').length;
    
    return { totalDue, overdueCount, openCount };
  }, [enrichedInvoices]);

  // Filter Logic
  const filteredInvoices = useMemo(() => {
    return enrichedInvoices.filter(inv => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        inv.invoiceNumber.toLowerCase().includes(searchLower) ||
        inv.clinicName.toLowerCase().includes(searchLower);
      
      const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [enrichedInvoices, searchQuery, statusFilter]);

  // --- 3. Handlers ---

  const handleCreateSubmit = async (data) => {
    try {
      await createInvoice(data);
      addToast('Invoice created successfully', 'success');
      setShowCreate(false);
    } catch (error) {
      console.error(error);
      addToast('Failed to create invoice', 'error');
    }
  };

  const handlePaymentSuccess = () => {
    addToast('Payment recorded and allocated successfully.', 'success');
    setShowPayment(false);
  };

  // --- Helper: Format Currency ---
  const formatMoney = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // --- Helper: Status Badge ---
  const renderStatusBadge = (status) => {
    let styleClass = styles.badgeDefault;
    let icon = null;

    switch (status) {
      case 'Paid': // Updated from PaidInFull
        styleClass = styles.badgeSuccess;
        icon = <IconCheck width="14" height="14" />;
        break;
      case 'Overdue':
        styleClass = styles.badgeError;
        icon = <IconAlert width="14" height="14" />;
        break;
      case 'Sent':
      case 'Partial':
        styleClass = styles.badgeWarning;
        icon = <IconClock width="14" height="14" />;
        break;
      default:
        break;
    }

    return (
      <span className={`${styles.statusBadge} ${styleClass}`}>
        {icon}
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Loading financial data...</p>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      
      {/* --- Header & Stats --- */}
      <header className={styles.pageHeader}>
        <div>
          <h1>Financial Overview</h1>
          <p>Manage invoices, payments, and clinic balances.</p>
        </div>
        <div className={styles.headerActions}>
          <button 
            className="button secondary" 
            onClick={() => setShowPayment(true)}
            style={{ marginRight: '0.75rem' }}
          >
            <IconInvoice width="16" style={{marginRight: '0.5rem'}}/> Record Payment
          </button>
          <button 
            className="button primary"
            onClick={() => setShowCreate(true)}
          >
            + Create Invoice
          </button>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Outstanding Balance</span>
          <strong className={styles.statValue}>{formatMoney(stats.totalDue)}</strong>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Overdue Invoices</span>
          <strong className={`${styles.statValue} ${styles.textError}`}>{stats.overdueCount}</strong>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Open Invoices</span>
          <strong className={styles.statValue}>{stats.openCount}</strong>
        </div>
      </div>

      {/* --- Filters --- */}
      <div className={`card ${styles.filtersCard}`}>
        <div className={styles.searchWrapper}>
          <IconSearch className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search by invoice # or clinic..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        
        <div className={styles.filterGroup}>
          <label>Status:</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="All">All Statuses</option>
            <option value="Sent">Sent</option>
            <option value="Partial">Partial</option>
            <option value="Overdue">Overdue</option>
            <option value="Paid">Paid</option>
            <option value="Draft">Draft</option>
          </select>
        </div>
      </div>

      {/* --- Invoices Table --- */}
      <div className={`card ${styles.tableCard}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Clinic</th>
              <th>Issue Date</th>
              <th>Due Date</th>
              <th>Total</th>
              <th>Balance Due</th>
              <th>Status</th>
              <th style={{textAlign: 'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length > 0 ? (
              filteredInvoices.map((inv) => (
                <tr 
                  key={inv.id} 
                  className={styles.tableRow}
                  onClick={() => setSelectedInvoice(inv)} // Row Click opens Detail
                  style={{ cursor: 'pointer' }}
                >
                  <td className={styles.fwBold}>{inv.invoiceNumber}</td>
                  <td>
                    <div className={styles.cellClinic}>
                      <strong>{inv.clinicName}</strong>
                      <span>{inv.accountNumber}</span>
                    </div>
                  </td>
                  <td>{inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : '-'}</td>
                  <td>
                    <span className={inv.status === 'Overdue' ? styles.textError : ''}>
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}
                    </span>
                  </td>
                  <td>{formatMoney(inv.totalAmount, inv.currency)}</td>
                  <td className={styles.fwBold}>
                    {formatMoney(inv.balanceDue, inv.currency)}
                  </td>
                  <td>{renderStatusBadge(inv.status)}</td>
                  <td style={{textAlign: 'right'}}>
                    <button 
                      className={`icon-button ${styles.actionBtn}`}
                      onClick={(e) => { e.stopPropagation(); setSelectedInvoice(inv); }}
                    >
                      <IconChevronRight />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className={styles.emptyState}>
                  No invoices found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- MODALS --- */}
      <InvoiceFormModal 
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreateSubmit}
      />

      <PaymentModal 
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={handlePaymentSuccess}
      />

      <InvoiceDetailModal 
        invoice={selectedInvoice}
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />

    </div>
  );
};

export default Invoices;