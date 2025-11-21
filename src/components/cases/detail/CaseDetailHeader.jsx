import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  IconClock, 
  IconUser, 
  IconChevronRight 
} from '../../../layouts/components/LabIcons';
import styles from './CaseDetailHeader.module.css';

const CaseDetailHeader = ({ activeCase, onEditClick }) => {
  const navigate = useNavigate();

  return (
    <header className={styles.header}>
      <div className={styles.titleGroup}>
        
        {/* Back Button */}
        <button 
          className={styles.backBtn} 
          onClick={() => navigate('/cases')}
          aria-label="Back to Case List"
        >
          <IconChevronRight 
            width="14" 
            height="14" 
            style={{ transform: 'rotate(180deg)' }} 
          />
          Back to Cases
        </button>

        <h1>
          <span className={styles.patientName}>{activeCase.patient.name}</span>
          <span className={styles.caseNumber}>#{activeCase.caseNumber}</span>
        </h1>
        
        <div className={styles.metaRow}>
          <span className={styles.metaItem}>
            <IconUser width="16" height="16" /> {activeCase.doctorName}
          </span>
          <span className={styles.metaItem}>
            <IconClock width="16" height="16" /> Due: {new Date(activeCase.dates.due).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <button className="button secondary">Print Ticket</button>
        <button className="button primary" onClick={onEditClick}>
          Edit Case
        </button>
      </div>
    </header>
  );
};

export default CaseDetailHeader;