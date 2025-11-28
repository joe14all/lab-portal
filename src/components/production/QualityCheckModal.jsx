import React, { useState, useMemo } from 'react';
import Modal from '../common/Modal';
import { IconCheck, IconClose, IconMicroscope } from '../../layouts/components/LabIcons';
import styles from './QualityCheckModal.module.css';

const QualityCheckModal = ({ batch, isOpen, onClose, onComplete }) => {
  // Local state to track Pass/Fail for each unit
  // Structure: { [unitId]: 'pass' | 'fail' }
  const initialResults = useMemo(() => {
    if (!isOpen || !batch) return {};
    // Default all to 'pass' for efficiency
    // In a real app, we might want them 'pending' first
    const initial = {};
    // Mocking batch units from caseIds since we don't have a direct BatchUnit join table in this mock
    // Ideally batch.units would exist. We will simulate unit entries.
    batch.caseIds.forEach((caseId) => {
      // Mock units: assuming 1 unit per case for this UI demo if not explicit
      initial[`${caseId}-u1`] = 'pass';
    });
    return initial;
  }, [isOpen, batch]);

  const [results, setResults] = useState(initialResults);

  const handleToggle = (unitId, status) => {
    setResults(prev => ({ ...prev, [unitId]: status }));
  };

  const handleSubmit = () => {
    const total = Object.keys(results).length;
    const passed = Object.values(results).filter(s => s === 'pass').length;
    const failed = total - passed;

    const metrics = {
      successRate: total > 0 ? (passed / total) * 100 : 0,
      defectCount: failed,
      totalUnits: total
    };

    onComplete(batch.id, metrics);
  };

  if (!batch) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Quality Control: Batch #${batch.id.split('-').pop()}`}
      icon={<IconMicroscope width="20" />}
      width="600px"
      footer={
        <div className={styles.footer}>
          <button className="button text" onClick={onClose}>Cancel</button>
          <button className="button primary" onClick={handleSubmit}>
            Submit Results & Complete
          </button>
        </div>
      }
    >
      <div className={styles.container}>
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Machine</span>
            <span className={styles.summaryValue}>{batch.machineId}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Material</span>
            <span className={styles.summaryValue}>{batch.materialId}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Total Units</span>
            <span className={styles.summaryValue}>{Object.keys(results).length}</span>
          </div>
        </div>

        <div className={styles.unitList}>
          {Object.keys(results).map((unitKey, idx) => {
            const status = results[unitKey];
            const caseId = unitKey.split('-u')[0]; // Extract rough case ID
            return (
              <div key={unitKey} className={`${styles.unitCard} ${styles[status]}`}>
                <div className={styles.unitInfo}>
                  <strong>Unit {idx + 1} (Case {caseId})</strong>
                  <span>{status === 'pass' ? 'Verified' : 'Flagged for Rework'}</span>
                </div>
                
                <div className={styles.qcActions}>
                  <button 
                    className={`${styles.qcBtn} ${styles.btnPass} ${status === 'pass' ? styles.active : ''}`}
                    onClick={() => handleToggle(unitKey, 'pass')}
                  >
                    <IconCheck width="14" /> Pass
                  </button>
                  <button 
                    className={`${styles.qcBtn} ${styles.btnFail} ${status === 'fail' ? styles.active : ''}`}
                    onClick={() => handleToggle(unitKey, 'fail')}
                  >
                    <IconClose width="14" /> Fail
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

export default QualityCheckModal;