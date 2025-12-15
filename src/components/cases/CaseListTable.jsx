import React from 'react';
import StatusBadge from './StatusBadge';
import { 
  IconChevronRight, 
  IconFire 
} from '../../layouts/components/LabIcons';
import styles from './CaseListTable.module.css';

// Import SVG icons
import crownIcon from '../../assets/icons/crown.svg';
import implantCrownIcon from '../../assets/icons/implantCrown.svg';
import partialDentureIcon from '../../assets/icons/partialDenture.svg';
import orthoIcon from '../../assets/icons/ortho.svg';

// Helper to determine icon and visual style based on case tags/units
const getCaseTypeConfig = (c) => {
  const tags = (c.tags || []).map(t => t.toLowerCase());
  const unitTypes = (c.units || []).map(u => u.type.toLowerCase()).join(' ');

  if (tags.includes('implant') || unitTypes.includes('implant')) {
    return { 
      icon: implantCrownIcon, 
      label: 'Implant', 
      className: styles.typeImplant 
    };
  }
  if (tags.includes('removable') || unitTypes.includes('denture') || unitTypes.includes('partial')) {
    return { 
      icon: partialDentureIcon, 
      label: 'Removable', 
      className: styles.typeRemovable 
    };
  }
  if (tags.includes('ortho') || unitTypes.includes('guard') || unitTypes.includes('splint')) {
    return { 
      icon: orthoIcon, 
      label: 'Ortho', 
      className: styles.typeOrtho 
    };
  }
  // Default to Crown & Bridge
  return { 
    icon: crownIcon, 
    label: 'Crown & Bridge', 
    className: styles.typeFixed 
  };
};

const CaseListTable = ({ 
  cases, 
  onRowClick, 
  selectedIds = [], 
  onSelectionChange = () => {} 
}) => {
  if (!cases || cases.length === 0) {
    return <div className={styles.emptyState}>No cases found.</div>;
  }

  // --- Selection Logic ---
  const allSelected = cases.length > 0 && selectedIds.length === cases.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < cases.length;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      onSelectionChange(cases.map(c => c.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (e, id) => {
    e.stopPropagation(); // Prevent row navigation when selecting
    if (e.target.checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(sid => sid !== id));
    }
  };

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {/* CHECKBOX COLUMN */}
            <th className={styles.checkboxCell}>
              <input 
                type="checkbox"
                className={styles.checkbox}
                checked={allSelected}
                ref={el => el && (el.indeterminate = isIndeterminate)}
                onChange={handleSelectAll}
                aria-label="Select all cases"
              />
            </th>
            <th style={{ width: '120px' }}>Case ID</th>
            <th style={{ width: '180px' }}>Type</th>
            <th>Patient</th>
            <th>Doctor / Clinic</th>
            <th style={{ textAlign: 'center' }}>Units</th>
            <th>Received</th>
            <th>Due Date</th>
            <th>Status</th>
            <th style={{ width: '40px' }}></th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => {
            const typeConfig = getCaseTypeConfig(c);
            const isRush = (c.tags || []).includes('Rush');
            const isSelected = selectedIds.includes(c.id);

            return (
              <tr 
                key={c.id} 
                className={`${styles.row} ${isSelected ? styles.selected : ''}`} 
                onClick={() => onRowClick(c.id)}
              >
                {/* CHECKBOX CELL */}
                <td className={styles.checkboxCell}>
                  <input 
                    type="checkbox"
                    className={styles.checkbox}
                    checked={isSelected}
                    onChange={(e) => handleSelectRow(e, c.id)}
                    onClick={(e) => e.stopPropagation()} // Extra safety
                    aria-label={`Select case ${c.caseNumber}`}
                  />
                </td>
                <td className={styles.caseId}>
                  #{c.caseNumber.split('-')[1] || c.caseNumber}
                </td>
                <td>
                  <div className={`${styles.typeBadge} ${typeConfig.className}`}>
                    <img src={typeConfig.icon} alt={typeConfig.label} className={styles.typeIcon} />
                    <span>{typeConfig.label}</span>
                  </div>
                </td>
                <td>
                  <div className={styles.primaryText}>{c.patient.name}</div>
                  <div className={styles.subText}>
                    {c.patient.age}yo • {c.patient.gender === 'Male' ? 'M' : 'F'}
                  </div>
                </td>
                <td>
                  <div className={styles.primaryText}>{c.doctorName}</div>
                  <div className={styles.subText}>{c.clinicName}</div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className={styles.unitCount}>
                    {c.units?.length || 0}
                  </span>
                </td>
                <td className={styles.date}>
                  {new Date(c.dates.received).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </td>
                <td className={styles.date}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={styles.dueDate}>
                      {c.dates.due ? new Date(c.dates.due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-'}
                    </span>
                    {isRush && (
                      <span className={styles.rushTag} title="Rush Case">
                        <IconFire width="14" height="14" />
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <StatusBadge status={c.status} />
                </td>
                <td className={styles.actionCell}>
                  <IconChevronRight width="16" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CaseListTable;