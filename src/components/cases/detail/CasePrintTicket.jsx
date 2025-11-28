import React from 'react';
import { IconMill } from '../../../layouts/components/LabIcons'; 
import styles from './CasePrintTicket.module.css';

const CasePrintTicket = ({ activeCase }) => {
  if (!activeCase) return null;

  return (
    <div className={styles.printContainer}>
      
      {/* TICKET HEADER */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <IconMill width="32" height="32" />
          <div>
            <h1>JS Dental Laboratory</h1>
            <p>123 Lab Street, Tech City, CA 90210</p>
            <p>(555) 123-4567 • support@jslab.com</p>
          </div>
        </div>
        <div className={styles.caseId}>
          <h2>CASE #{activeCase.caseNumber}</h2>
          {/* Visual mock for barcode */}
          <div className={styles.barcodePlaceholder}>||| || |||| || |||||</div>
        </div>
      </header>

      <hr className={styles.divider} />

      {/* INFO GRID */}
      <section className={styles.infoGrid}>
        <div className={styles.infoBox}>
          <h3>Doctor / Clinic</h3>
          <p><strong>{activeCase.doctorName}</strong></p>
          <p>{activeCase.clinicName}</p>
          <p>Acct: {activeCase.clinicId || 'N/A'}</p>
        </div>
        <div className={styles.infoBox}>
          <h3>Patient</h3>
          <p><strong>{activeCase.patient.name}</strong></p>
          <p>Age: {activeCase.patient.age || '-'} • {activeCase.patient.gender || '-'}</p>
          <p>Chart #: {activeCase.patient.chartNumber || 'N/A'}</p>
        </div>
        <div className={styles.infoBox}>
          <h3>Dates</h3>
          <p>Received: {new Date(activeCase.dates.received).toLocaleDateString()}</p>
          <p><strong>Due Date: {new Date(activeCase.dates.due).toLocaleDateString()}</strong></p>
        </div>
      </section>

      {/* UNITS TABLE */}
      <section className={styles.unitsSection}>
        <h3>Prescription Details</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.toothCell}>Tooth</th>
              <th>Product / Type</th>
              <th>Material</th>
              <th>Shade</th>
              <th>Stump</th>
            </tr>
          </thead>
          <tbody>
            {activeCase.units.map((unit, idx) => (
              <tr key={idx}>
                <td className={styles.toothCell}>#{unit.tooth}</td>
                <td>{unit.type}</td>
                <td>{unit.material}</td>
                <td>{unit.shade || '-'}</td>
                <td>{unit.stumpShade || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* INSTRUCTIONS / NOTES */}
      <section className={styles.notesSection}>
        <h3>Instructions</h3>
        <div className={styles.notesBox}>
          {activeCase.units.map((unit, idx) => (
            unit.instructions ? (
              <p key={idx}><strong>Unit #{unit.tooth}:</strong> {unit.instructions}</p>
            ) : null
          ))}
          {(!activeCase.units.some(u => u.instructions)) && <p>No specific instructions provided.</p>}
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.qcCheck}>
          <span>QC Verified By: __________________</span>
          <span>Date: ___________</span>
        </div>
        <p className={styles.systemMeta}>Printed on {new Date().toLocaleString()}</p>
      </footer>

    </div>
  );
};

export default CasePrintTicket;