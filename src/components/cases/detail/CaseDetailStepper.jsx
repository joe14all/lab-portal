import React, { useState, useMemo } from 'react';
import { useLab, useAuth } from '../../../contexts';
import Modal from '../../common/Modal'; // Imported generic Modal
import { 
  IconCheck, 
  IconDrill, 
  IconMicroscope, 
  IconAlert,
  IconBox,
  IconFile,
  IconTooth,
  IconTruck,
  IconFire, 
  IconLayers
} from '../../../layouts/components/LabIcons';
import styles from './CaseDetailStepper.module.css';

// --- ICON MAPPING ---
const getStageIcon = (stageId) => {
  if (stageId.includes('received')) return <IconBox width="16" height="16" />;
  if (stageId.includes('model')) return <IconTooth width="16" height="16" />;
  if (stageId.includes('design')) return <IconFile width="16" height="16" />;
  if (stageId.includes('waxup')) return <IconDrill width="16" height="16" />; 
  if (stageId.includes('milling')) return <IconDrill width="16" height="16" />;
  if (stageId.includes('casting')) return <IconFire width="16" height="16" />; 
  if (stageId.includes('processing')) return <IconLayers width="16" height="16" />; 
  if (stageId.includes('finishing')) return <IconMicroscope width="16" height="16" />;
  if (stageId.includes('qc')) return <IconCheck width="16" height="16" />;
  if (stageId.includes('shipped')) return <IconTruck width="16" height="16" />;
  return null;
};

// --- WORKFLOW DEFINITIONS ---
const WORKFLOWS = {
  REMOVABLE: ['stage-new', 'stage-received', 'stage-model', 'stage-waxup', 'stage-processing', 'stage-finishing', 'stage-qc', 'stage-shipped'],
  CASTING: ['stage-new', 'stage-received', 'stage-model', 'stage-waxup', 'stage-casting', 'stage-finishing', 'stage-qc', 'stage-shipped'],
  ORTHO: ['stage-new', 'stage-received', 'stage-model', 'stage-processing', 'stage-finishing', 'stage-qc', 'stage-shipped'],
  IMPLANT: ['stage-new', 'stage-received', 'stage-model', 'stage-design', 'stage-milling', 'stage-finishing', 'stage-qc', 'stage-shipped'],
  FIXED_DIGITAL: ['stage-new', 'stage-received', 'stage-design', 'stage-milling', 'stage-finishing', 'stage-qc', 'stage-shipped']
};

const detectWorkflow = (activeCase) => {
  if (!activeCase) return 'FIXED_DIGITAL';
  const tags = (activeCase.tags || []).map(t => t.toLowerCase());
  const itemTypes = (activeCase.units || []).map(u => u.type.toLowerCase()).join(' ');
  if (tags.includes('ortho') || tags.includes('splint') || itemTypes.includes('nightguard')) return 'ORTHO';
  if (tags.includes('implant') || itemTypes.includes('implant')) return 'IMPLANT';
  if (itemTypes.includes('denture') && !itemTypes.includes('partial')) return 'REMOVABLE';
  if (tags.includes('metal') || tags.includes('gold') || itemTypes.includes('cast')) return 'CASTING';
  if (tags.includes('removable') || itemTypes.includes('partial')) return 'REMOVABLE';
  return 'FIXED_DIGITAL';
};

const CaseDetailStepper = ({ activeCase, stages }) => {
  const { updateCaseStatus } = useLab();
  const { hasAnyPermission } = useAuth();
  const [showHoldModal, setShowHoldModal] = useState(false);

  const currentStatus = activeCase?.status;
  const isHold = currentStatus === 'stage-hold';

  const workflowKey = useMemo(() => detectWorkflow(activeCase), [activeCase]);
  const relevantStageIds = WORKFLOWS[workflowKey];

  const displayStages = useMemo(() => {
    const filtered = stages.filter(s => relevantStageIds.includes(s.id));
    return filtered.sort((a, b) => {
      return relevantStageIds.indexOf(a.id) - relevantStageIds.indexOf(b.id);
    });
  }, [stages, relevantStageIds]);

  // Logic to determine where the Hold Badge appears
  const holdTargetStageId = activeCase.heldAtStageId || 'stage-design'; 
  
  const activeIndex = isHold 
    ? displayStages.findIndex(s => s.id === holdTargetStageId)
    : displayStages.findIndex(s => s.id === currentStatus);

  const safeActiveIndex = activeIndex === -1 ? 1 : activeIndex;
  const canEditStatus = hasAnyPermission(['ALL_ACCESS', 'CASE_MANAGE', 'CASE_EDIT_PRODUCTION']);

  const handleStepClick = (stage, index) => {
    if (isHold && index === safeActiveIndex) {
      setShowHoldModal(true);
      return;
    }
    if (!canEditStatus) return;
    if (stage.id === currentStatus) return;

    if (index < safeActiveIndex && !isHold) {
      if (!window.confirm(`Roll back to ${stage.label}?`)) return;
    }
    updateCaseStatus(activeCase.id, stage.id);
  };

  const getStepStateClass = (index) => {
    let classes = [styles.step];
    if (index === safeActiveIndex) {
      classes.push(styles.active);
      if (isHold) classes.push(styles.holdActive); 
    } else if (index < safeActiveIndex) {
      classes.push(styles.completed);
    }
    if (canEditStatus || (isHold && index === safeActiveIndex)) {
      classes.push(styles.interactive);
    }
    return classes.join(' ');
  };

  return (
    <>
      <section className={`${styles.stepperCard} ${isHold ? styles.containerHold : ''}`}>
        <div className={styles.stepper}>
          {displayStages.map((stage, index) => {
            const stateClass = getStepStateClass(index);
            const isCompleted = stateClass.includes(styles.completed);
            const showHoldBadge = isHold && index === safeActiveIndex;

            return (
              <div 
                key={stage.id} 
                className={stateClass}
                onClick={() => handleStepClick(stage, index)}
                title={showHoldBadge ? `View Hold Reason` : stage.label}
              >
                {/* BADGE REPLACEMENT */}
                {showHoldBadge ? (
                  <div className={styles.holdBadge}>
                    <IconAlert width="20" height="20" className={styles.holdIcon} />
                  </div>
                ) : (
                  <div className={styles.stepCircle}>
                    {isCompleted ? (
                      <IconCheck width="16" height="16" />
                    ) : (
                      getStageIcon(stage.id) || <span style={{fontSize:'0.75rem'}}>{index + 1}</span>
                    )}
                  </div>
                )}
                <span className={styles.stepLabel}>{stage.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* --- REUSABLE MODAL --- */}
      <Modal
        isOpen={showHoldModal}
        onClose={() => setShowHoldModal(false)}
        title="Case On Hold"
        variant="danger"
        width="450px"
        icon={<IconAlert width="20" height="20" />}
        footer={
          <button className="button secondary" onClick={() => setShowHoldModal(false)}>
            Close
          </button>
        }
      >
        <label style={{ 
          display: 'block', 
          fontSize: '0.75rem', 
          color: 'var(--text-secondary)', 
          marginBottom: '0.5rem',
          fontWeight: 600,
          textTransform: 'uppercase' 
        }}>
          Reason for Hold
        </label>
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          {activeCase.holdReason || 'No specific reason provided by the lab.'}
        </p>
      </Modal>
    </>
  );
};

export default CaseDetailStepper;