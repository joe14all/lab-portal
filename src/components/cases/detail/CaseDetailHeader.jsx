import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts';
import { 
  IconClock, 
  IconUser, 
  IconChevronRight,
  IconPrinter
} from '../../../layouts/components/LabIcons';
import styles from './CaseDetailHeader.module.css';

const CaseDetailHeader = ({ activeCase, onEditClick }) => {
  const navigate = useNavigate();
  const { hasAnyPermission } = useAuth();

  // Permission Gate: Only allow editing for roles involved in management or production.
  // Drivers/Shipping (LOGISTICS_VIEW) should not see this button.
  const canEdit = hasAnyPermission([
    'ALL_ACCESS',
    'CASE_MANAGE', 
    'CASE_EDIT_DESIGN', 
    'CASE_EDIT_PRODUCTION',
    'ORDER_CREATE' // Allow clients to edit their own orders if workflow permits
  ]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <header className={styles.header}>
      
      {/* Row 1: Navigation Bar */}
      <div className={styles.navBar}>
        <button 
          className={`button text ${styles.backBtn}`} 
          onClick={() => navigate('/cases')}
        >
          <IconChevronRight 
            width="14" 
            height="14" 
            style={{ transform: 'rotate(180deg)' }} 
          />
          Back to All Cases
        </button>
      </div>

      {/* Row 2: Main Info & Actions */}
      <div className={styles.mainContent}>
        
        {/* Left: Title & Meta */}
        <div className={styles.infoGroup}>
          <div className={styles.titleRow}>
            <h1 className={styles.patientName}>{activeCase.patient.name}</h1>
            <span className={styles.idBadge}>#{activeCase.caseNumber}</span>
          </div>
          
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <IconUser width="16" height="16" className={styles.metaIcon} />
              <span>{activeCase.doctorName}</span>
            </div>
            <span className={styles.divider}>•</span>
            <div className={styles.metaItem}>
              <IconClock width="16" height="16" className={styles.metaIcon} />
              <span>
                Due: <span className={styles.dueDate}>{new Date(activeCase.dates.due).toLocaleDateString()}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className={styles.actionGroup}>
          <button className="button secondary" onClick={handlePrint}>
            <IconPrinter width="16" height="16" style={{ marginRight: '0.5rem' }} />
            Print Ticket
          </button>
          
          {canEdit && (
            <button className="button primary" onClick={onEditClick}>
              Edit Case
            </button>
          )}
        </div>

      </div>
    </header>
  );
};

export default CaseDetailHeader;