import React, { useState, useMemo } from 'react';
import { useFinance, useCrm } from '../../contexts';
import { 
  IconSearch, 
  IconCheck, 
  IconAlert, 
  IconClock,
  IconChevronRight
} from '../../layouts/components/LabIcons';
import styles from './Invoices.module.css';

const Invoices = () => {
  // --- 1. Consume Context Data ---
  const { invoices, loading: financeLoading } = useFinance();
  const { clinics, loading: crmLoading } = useCrm();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

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
      const matchesSearch = 
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.clinicName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [enrichedInvoices, searchQuery, statusFilter]);

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
      case 'PaidInFull':
        styleClass = styles.badgeSuccess;
        icon = <IconCheck width="14" height="14" />;
        break;
      case 'Overdue':
        styleClass = styles.badgeError;
        icon = <IconAlert width="14" height="14" />;
        break;
      case 'Sent':
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
          <button className="button primary">
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
            <option value="Overdue">Overdue</option>
            <option value="PaidInFull">Paid In Full</option>
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
                <tr key={inv.id} className={styles.tableRow}>
                  <td className={styles.fwBold}>{inv.invoiceNumber}</td>
                  <td>
                    <div className={styles.cellClinic}>
                      <strong>{inv.clinicName}</strong>
                      <span>{inv.accountNumber}</span>
                    </div>
                  </td>
                  <td>{new Date(inv.issueDate).toLocaleDateString()}</td>
                  <td>
                    <span className={inv.status === 'Overdue' ? styles.textError : ''}>
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </span>
                  </td>
                  <td>{formatMoney(inv.totalAmount, inv.currency)}</td>
                  <td className={styles.fwBold}>
                    {formatMoney(inv.balanceDue, inv.currency)}
                  </td>
                  <td>{renderStatusBadge(inv.status)}</td>
                  <td style={{textAlign: 'right'}}>
                    <button className={`icon-button ${styles.actionBtn}`}>
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

    </div>
  );
};

export default Invoices;