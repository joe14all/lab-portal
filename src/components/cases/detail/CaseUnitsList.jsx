import React from 'react';
import StatusBadge from '../StatusBadge';
import { 
  IconTooth, 
  IconChevronRight, 
  IconAlert,
  IconDrill,
  IconLayers,
  IconCheck
} from '../../../layouts/components/LabIcons';
import styles from './CaseUnitsList.module.css';

const getUnitIcon = (type) => {
  const lowerType = (type || '').toLowerCase();
  if (lowerType.includes('implant') || lowerType.includes('abutment')) return <IconDrill width="20" height="20" />;
  if (lowerType.includes('denture') || lowerType.includes('partial')) return <IconLayers width="20" height="20" />;
  return <IconTooth width="20" height="20" />;
};

const CaseUnitsList = ({ units, stages, caseId, updateUnitStatus }) => {
  
  // Helper: Find next logical stage
  const getNextStageForUnit = (currentUnitStatus) => {
    const currentStage = stages.find(s => s.id === currentUnitStatus);
    if (!currentStage) return null;
    
    // Find next stage by order, excluding exceptions like 'Hold'
    return stages
      .filter(s => s.order > currentStage.order && s.category !== 'EXCEPTION')
      .sort((a, b) => a.order - b.order)[0];
  };

  // Helper: Calculate progress percentage for visual bar
  const getProgressPercent = (status) => {
    if (status === 'stage-shipped' || status === 'stage-delivered') return 100;
    const stage = stages.find(s => s.id === status);
    if (!stage) return 0;
    // Rough estimate based on total standard stages (~11)
    return Math.min(100, Math.max(5, (stage.order / 11) * 100));
  };
  
  const handleStatusUpdate = (unitId, newStatus) => {
    updateUnitStatus(caseId, newStatus, unitId);
  };
  
  return (
    <div className="card">
      <h3 className={styles.sectionTitle}>
        Production Units ({units.length})
      </h3>
      
      <div className={styles.list}>
        {units.map((unit, idx) => {
          const nextStage = getNextStageForUnit(unit.status);
          const isHold = unit.status === 'stage-hold';
          const progress = getProgressPercent(unit.status);

          return (
            <div key={unit.id || idx} className={`${styles.unitItem} ${isHold ? styles.unitHold : ''}`}>
              
              {/* ROW 1: Header & Status */}
              <div className={styles.unitHeader}>
                <div className={styles.identity}>
                  <span className={styles.typeIcon}>{getUnitIcon(unit.type)}</span>
                  <div className={styles.idText}>
                    <span className={styles.toothBadge}>
                      {unit.tooth ? `Tooth #${unit.tooth}` : 'Full Arch'}
                    </span>
                    <strong>{unit.type}</strong>
                  </div>
                </div>
                <StatusBadge status={unit.status} />
              </div>

              {/* ROW 2: Details Grid */}
              <div className={styles.unitDetails}>
                <div className={styles.detailCol}>
                  <span className={styles.label}>Material</span>
                  <span>{unit.material}</span>
                </div>
                <div className={styles.detailCol}>
                  <span className={styles.label}>Shade</span>
                  <span>{unit.shade || 'N/A'}</span>
                </div>
                <div className={styles.detailCol}>
                  <span className={styles.label}>Stump</span>
                  <span>{unit.stumpShade || 'N/A'}</span>
                </div>
              </div>

              {/* ROW 3: Instructions (Conditional) */}
              {unit.instructions && (
                <div className={styles.instructions}>
                  <span className={styles.label}>Notes:</span> {unit.instructions}
                </div>
              )}

              {/* ROW 4: Progress & Actions */}
              <div className={styles.actionRow}>
                
                {/* Mini Progress Bar */}
                <div className={styles.progressTrack} title={`${progress}% Complete`}>
                  <div 
                    className={styles.progressBar} 
                    style={{ width: `${progress}%`, backgroundColor: isHold ? 'var(--error-500)' : 'var(--primary)' }}
                  />
                </div>

                {/* Action Buttons */}
                <div className={styles.buttons}>
                  {/* Hold Button */}
                  {!isHold && unit.status !== 'stage-shipped' && (
                    <button 
                      className={`icon-button ${styles.actionBtn} ${styles.holdBtn}`}
                      onClick={() => handleStatusUpdate(unit.id, 'stage-hold')}
                      title="Put on Hold"
                    >
                      <IconAlert width="16" height="16" />
                    </button>
                  )}

                  {/* Advance Button */}
                  {nextStage && !isHold && (
                    <button 
                      className={`button secondary ${styles.advanceBtn}`} 
                      onClick={() => handleStatusUpdate(unit.id, nextStage.id)}
                    >
                      <span>Move to {nextStage.label}</span>
                      <IconChevronRight width="14" height="14" />
                    </button>
                  )}

                  {/* Resume Button (If Hold) */}
                  {isHold && (
                    <button 
                      className="button primary"
                      onClick={() => handleStatusUpdate(unit.id, 'stage-design')} // Reset to design or logic to find previous
                    >
                      Resume Production
                    </button>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CaseUnitsList;