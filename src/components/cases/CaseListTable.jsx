import React from 'react';
import StatusBadge from './StatusBadge';
import { IconChevronRight } from '../../layouts/components/LabIcons';
import styles from './CaseListTable.module.css';

const CaseListTable = ({ cases, onRowClick }) => {
  if (!cases || cases.length === 0) {
    return <div className={styles.emptyState}>No cases found.</div>;
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Case ID</th>
            <th>Patient</th>
            <th>Doctor / Clinic</th>
            <th>Units</th>
            <th>Received</th>
            <th>Due Date</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id} className={styles.row} onClick={() => onRowClick(c.id)}>
              <td className={styles.caseId}>{c.caseNumber}</td>
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
              <td>
                <span className={styles.unitCount}>
                  {c.units?.length || c.items?.length || 0}
                </span>
              </td>
              <td className={styles.date}>
                {new Date(c.dates.received).toLocaleDateString()}
              </td>
              <td className={styles.date}>
                {c.dates.due ? (
                  <span className={styles.dueDate}>
                    {new Date(c.dates.due).toLocaleDateString()}
                  </span>
                ) : '-'}
              </td>
              <td>
                <StatusBadge status={c.status} />
              </td>
              <td className={styles.actionCell}>
                <IconChevronRight width="16" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CaseListTable;