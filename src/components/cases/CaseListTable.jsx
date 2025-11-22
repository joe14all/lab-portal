import React from 'react';
import StatusBadge from './StatusBadge';
import { 
  IconChevronRight, 
  IconTooth, 
  IconDrill, 
  IconLayers, 
  IconMicroscope,
  IconFire 
} from '../../layouts/components/LabIcons';
import styles from './CaseListTable.module.css';

// Helper to determine icon and visual style based on case tags/units
const getCaseTypeConfig = (c) => {
  const tags = (c.tags || []).map(t => t.toLowerCase());
  const unitTypes = (c.units || []).map(u => u.type.toLowerCase()).join(' ');

  if (tags.includes('implant') || unitTypes.includes('implant')) {
    return { 
      icon: <IconDrill width="18" height="18" />, 
      label: 'Implant', 
      className: styles.typeImplant 
    };
  }
  if (tags.includes('removable') || unitTypes.includes('denture') || unitTypes.includes('partial')) {
    return { 
      icon: <IconLayers width="18" height="18" />, 
      label: 'Removable', 
      className: styles.typeRemovable 
    };
  }
  if (tags.includes('ortho') || unitTypes.includes('guard') || unitTypes.includes('splint')) {
    return { 
      icon: <IconMicroscope width="18" height="18" />, 
      label: 'Ortho', 
      className: styles.typeOrtho 
    };
  }
  // Default to Crown & Bridge
  return { 
    icon: <IconTooth width="18" height="18" />, 
    label: 'Crown & Bridge', 
    className: styles.typeFixed 
  };
};

const CaseListTable = ({ cases, onRowClick }) => {
  if (!cases || cases.length === 0) {
    return <div className={styles.emptyState}>No cases found.</div>;
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
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

            return (
              <tr key={c.id} className={styles.row} onClick={() => onRowClick(c.id)}>
                <td className={styles.caseId}>
                  #{c.caseNumber.split('-')[1] || c.caseNumber}
                </td>
                <td>
                  <div className={`${styles.typeBadge} ${typeConfig.className}`}>
                    {typeConfig.icon}
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
                    {c.units?.length || c.items?.length || 0}
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