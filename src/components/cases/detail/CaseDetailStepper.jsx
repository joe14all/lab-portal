import React, { useMemo } from 'react';
import { 
  IconCheck, 
  IconDrill, 
  IconMicroscope, 
  IconAlert 
} from '../../../layouts/components/LabIcons';
import styles from './CaseDetailStepper.module.css';

// Map specific stages to their representative icons
const getStageIcon = (stageId) => {
  switch (stageId) {
    case 'stage-milling':
      return <IconDrill width="16" height="16" />;
    case 'stage-finishing':
    case 'stage-qc':
      return <IconMicroscope width="16" height="16" />;
    case 'stage-shipped':
      return <IconCheck width="16" height="16" />;
    case 'stage-hold':
      return <IconAlert width="16" height="16" />;
    default:
      return null;
  }
};

const CaseDetailStepper = ({ caseStatus, stages }) => {
    
    // Ensure stages are sorted by order property
    const orderedStages = useMemo(() => {
        return stages.filter(s => s.category !== 'EXCEPTION' && s.id !== 'stage-production')
                     .sort((a, b) => a.order - b.order);
    }, [stages]);
    
    const currentStageIndex = stages.findIndex(s => s.id === caseStatus);
    
    const getStageClass = (stageId, index) => {
        const stageInStages = stages.find(s => s.id === stageId);
        // Compare against the index of the full stages list
        const fullIndex = stages.findIndex(s => s.id === stageId); 

        if (caseStatus === stageId) return `${styles.step} ${styles.active}`;
        if (fullIndex < currentStageIndex) return `${styles.step} ${styles.completed}`;
        return styles.step;
    };


  return (
    <section className={styles.stepperCard}>
        {/*  */}
        <div className={styles.stepper}>
          {orderedStages.map((stage, index) => {
            
            const isCompleted = stages.findIndex(s => s.id === stage.id) < currentStageIndex;

            return (
              <div key={stage.id} className={getStageClass(stage.id, index)}>
                <div className={styles.stepCircle}>
                  {isCompleted ? (
                    <IconCheck width="16" height="16" />
                  ) : (
                    getStageIcon(stage.id) || index + 1
                  )}
                </div>
                <span className={styles.stepLabel}>{stage.label}</span>
              </div>
            );
          })}
        </div>
    </section>
  );
};

export default CaseDetailStepper;