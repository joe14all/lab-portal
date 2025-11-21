import React from 'react';
import StatusBadge from '../StatusBadge';
import { 
  IconTooth, 
  IconChevronRight 
} from '../../../layouts/components/LabIcons';
import styles from './CaseUnitsList.module.css';

const CaseUnitsList = ({ units, stages, caseId, updateUnitStatus }) => {
  
  // Function to find the next logical stage based on current unit status
  const getNextStageForUnit = (currentUnitStatus) => {
    const currentStage = stages.find(s => s.id === currentUnitStatus);
    if (!currentStage) return null;
    
    const nextStage = stages
      .filter(s => s.order > currentStage.order && s.category !== 'EXCEPTION')
      .sort((a, b) => a.order - b.order)[0];
      
    return nextStage;
  };
  
  const handleUnitStatusUpdate = (unitId, newStatus) => {
    updateUnitStatus(caseId, newStatus, unitId);
  };
  
  return (
    <div className="card">
      <h3 className={styles.sectionTitle}>Production Units ({units.length} Total)</h3>
      {units.map((unit, idx) => {
        const nextStage = getNextStageForUnit(unit.status);
        return (
          <div key={unit.id || idx} className={styles.unitItem}>
            <div className={styles.unitHeader}>
              <IconTooth width="20" height="20" className={styles.toothIcon} />
              <div className={styles.unitInfo}>
                <span className={styles.toothBadge}>Tooth #{unit.tooth || 'N/A'}</span>
                <strong>{unit.type} - {unit.material}</strong>
              </div>
              <StatusBadge status={unit.status} />
            </div>
            
            <div className={styles.unitDetails}>
              <span className={styles.unitMeta}>Shade: **{unit.shade || 'N/A'}**</span>
              <span className={styles.unitMeta}>Stump: {unit.stumpShade || 'N/A'}</span>
              <span className={styles.unitMeta}>Remakes: {unit.remakeCount || 0}</span>
            </div>

            {/* Production Action Button (Visible to Technicians/Managers) */}
            {nextStage && (
              <div className={styles.unitAction}>
                <button 
                  className="button secondary" 
                  onClick={() => handleUnitStatusUpdate(unit.id, nextStage.id)}
                  disabled={unit.status === 'stage-shipped' || unit.status === 'stage-hold'}
                >
                  <IconChevronRight width="16" height="16" /> 
                  Move to {nextStage.label}
                </button>
              </div>
            )}
            
            {unit.instructions && (
              <div className={styles.instructions}>
                <span className={styles.label}>Special Instructions:</span>
                <p>{unit.instructions}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CaseUnitsList;