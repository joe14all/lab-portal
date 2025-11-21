import React from 'react';
import styles from './CaseContextCard.module.css';

const DetailItem = ({ label, value, isPrimary = false }) => (
  <div className={styles.detailItem}>
    <span className={styles.label}>{label}</span>
    <span className={`${styles.value} ${isPrimary ? styles.primary : ''}`}>
      {value}
    </span>
  </div>
);

const CaseContextCard = ({ activeCase }) => {
  return (
    <>
      {/* Clinic & Patient Card */}
      <div className="card">
        <h3 className={styles.sectionTitle}>Clinic & Patient</h3>
        <div className={styles.detailList}>
          <DetailItem 
            label="Patient" 
            value={activeCase.patient.name} 
          />
          <DetailItem 
            label="Age / Gender" 
            value={`${activeCase.patient.age || 'N/A'} / ${activeCase.patient.gender || 'N/A'}`} 
          />
          <DetailItem 
            label="Chart #" 
            value={activeCase.patient.chartNumber || 'N/A'} 
          />
          <hr className={styles.divider} />
          <DetailItem 
            label="Clinic" 
            value={activeCase.clinicName} 
          />
          <DetailItem 
            label="Doctor" 
            value={activeCase.doctorName} 
          />
        </div>
      </div>

      {/* Financial Summary Card */}
      <div className="card">
        <h3 className={styles.sectionTitle}>Financial Summary</h3>
        <div className={styles.detailList}>
          <DetailItem 
            label="Estimated Total" 
            value={activeCase.financial?.estimatedTotal ? `$${activeCase.financial.estimatedTotal.toFixed(2)} ${activeCase.financial.currency}` : 'Pending'} 
            isPrimary
          />
          <DetailItem 
            label="Price List" 
            value={activeCase.financial?.priceListId || 'Standard'} 
          />
          <DetailItem 
            label="Invoice ID" 
            value={activeCase.financial?.invoiceId || 'N/A'} 
          />
        </div>
      </div>
    </>
  );
};

export default CaseContextCard;