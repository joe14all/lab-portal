import React, { useState } from 'react';
import { IconUser, IconInvoice, IconCheck } from '../../../layouts/components/LabIcons';
import styles from './CaseContextCard.module.css';

// Helper Component for individual rows
const DetailItem = ({ label, value, isPrimary = false, isCopyable = false }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!isCopyable || !value || value === 'N/A') return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.detailItem}>
      <span className={styles.label}>{label}</span>
      <div 
        className={`
          ${styles.valueGroup} 
          ${isCopyable ? styles.copyable : ''}
        `} 
        onClick={handleCopy}
        title={isCopyable ? "Click to copy" : ""}
      >
        <span className={`${styles.value} ${isPrimary ? styles.primary : ''}`}>
          {value}
        </span>
        {copied && <span className={styles.copyFeedback}><IconCheck width="12" /> Copied</span>}
      </div>
    </div>
  );
};

const CaseContextCard = ({ activeCase }) => {
  const formatCurrency = (amount, currency) => {
    if (amount === undefined || amount === null) return 'Pending';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
  };

  return (
    <div className={styles.container}>
      
      {/* --- CARD 1: PATIENT & CLINIC --- */}
      <div className={styles.card}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            <IconUser className={styles.icon} />
            Patient Context
          </h3>
        </div>
        
        <div className={styles.content}>
          <div className={styles.row}>
            <DetailItem label="Patient Name" value={activeCase.patient.name} isPrimary />
          </div>
          
          <div className={styles.grid2}>
            <DetailItem label="Age" value={activeCase.patient.age || 'N/A'} />
            <DetailItem label="Gender" value={activeCase.patient.gender || 'N/A'} />
          </div>

          <DetailItem label="Chart Number" value={activeCase.patient.chartNumber || 'N/A'} isCopyable />

          <hr className={styles.divider} />

          <DetailItem label="Clinic" value={activeCase.clinicName} />
          <DetailItem label="Doctor" value={activeCase.doctorName} />
        </div>
      </div>

      {/* --- CARD 2: FINANCIAL --- */}
      <div className={styles.card}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            <IconInvoice className={styles.icon} />
            Financial
          </h3>
          {/* Status Tag */}
          <span className={styles.statusTag}>
            {activeCase.financial?.invoiceId ? 'Invoiced' : 'Estimate'}
          </span>
        </div>

        <div className={styles.content}>
          <DetailItem 
            label="Estimated Total" 
            value={formatCurrency(activeCase.financial?.estimatedTotal, activeCase.financial?.currency)}
            isPrimary
          />
          
          <div className={styles.grid2}>
             <DetailItem 
              label="Price List" 
              value={activeCase.financial?.priceListId ? 'Contract' : 'Standard'} 
            />
             <DetailItem 
              label="Currency" 
              value={activeCase.financial?.currency || 'USD'} 
            />
          </div>

          <DetailItem 
            label="Invoice ID" 
            value={activeCase.financial?.invoiceId || 'Unbilled'} 
            isCopyable={!!activeCase.financial?.invoiceId}
          />
        </div>
      </div>

    </div>
  );
};

export default CaseContextCard;