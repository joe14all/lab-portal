import React, { useState } from 'react';
import { useLab } from '../../../contexts'; // Import useLab
import StatusBadge from '../StatusBadge';
import Modal from '../../common/Modal'; 
import { 
  IconTooth, 
  IconChevronRight, 
  IconAlert,
  IconDrill,
  IconLayers,
  IconCheck,
  IconClose
} from '../../../layouts/components/LabIcons';
import styles from './CaseUnitsList.module.css';

const getUnitIcon = (type) => {
  const lowerType = (type || '').toLowerCase();
  if (lowerType.includes('implant') || lowerType.includes('abutment')) return <IconDrill width="20" height="20" />;
  if (lowerType.includes('denture') || lowerType.includes('partial')) return <IconLayers width="20" height="20" />;
  return <IconTooth width="20" height="20" />;
};

// --- REMOVED HARDCODED WORKFLOWS ---
// We now use the dynamic workflows from Context

const CaseUnitsList = ({ units, stages, caseId, updateUnitStatus }) => {
  const { workflows } = useLab(); // Get Dynamic Workflows
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [holdReason, setHoldReason] = useState('');

  // --- Logic Helpers ---

  const getNextStageForUnit = (unit) => {
    const currentStatus = unit.status || 'stage-new';
    
    // 1. Find the specific workflow assigned to this unit
    let activeWorkflow = workflows.find(w => w.id === unit.workflowId);
    
    // Fallback: If no workflow ID on unit, try to guess/find a default based on category
    // (This handles legacy data or units created before workflow selection)
    if (!activeWorkflow) {
       // Simple fallback logic or default to first available
       activeWorkflow = workflows[0]; 
    }

    if (!activeWorkflow) return null;

    // 2. Get valid stage IDs for this workflow
    const validStageIds = activeWorkflow.stages;

    // 3. Map to full Stage Objects to ensure we have metadata (labels, etc.)
    // Filter global stages to only those in this workflow
    const workflowStages = stages.filter(s => validStageIds.includes(s.id));
    
    // 4. Sort them by the order defined in the WORKFLOW definition (Source of Truth)
    workflowStages.sort((a, b) => {
      return validStageIds.indexOf(a.id) - validStageIds.indexOf(b.id);
    });

    // 5. Find where we are now
    const currentIndex = workflowStages.findIndex(s => s.id === currentStatus);
    
    // 6. Return next step if available
    if (currentIndex !== -1 && currentIndex < workflowStages.length - 1) {
      return workflowStages[currentIndex + 1];
    }
    
    return null;
  };

  const getProgressPercent = (status) => {
    if (status === 'stage-shipped' || status === 'stage-delivered') return 100;
    const stage = stages.find(s => s.id === status);
    if (!stage) return 0;
    // Use standard order for rough estimate, or refine based on workflow position
    return Math.min(100, Math.max(5, (stage.order / 11) * 100));
  };
  
  // --- Handlers ---
  const handleStatusUpdate = (unitId, newStatus) => {
    updateUnitStatus(unitId, newStatus);
  };

  const initiateHold = (unitId) => {
    setSelectedUnitId(unitId);
    setHoldReason(''); 
    setHoldModalOpen(true);
  };

  const confirmHold = () => {
    if (!selectedUnitId) return;
    updateUnitStatus(selectedUnitId, 'stage-hold', holdReason);
    setHoldModalOpen(false);
    setSelectedUnitId(null);
  };

  return (
    <>
      <div className="card">
        <h3 className={styles.sectionTitle}>
          Production Units ({units.length})
        </h3>
        
        <div className={styles.list}>
          {units.map((unit, idx) => {
            const effectiveStatus = unit.status || 'stage-new';
            
            // Use the new dynamic workflow-aware helper
            const nextStage = getNextStageForUnit(unit);
            
            const isHold = effectiveStatus === 'stage-hold';
            const progress = getProgressPercent(effectiveStatus);

            return (
              <div key={unit.id || idx} className={`${styles.unitItem} ${isHold ? styles.unitHold : ''}`}>
                
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
                  <StatusBadge status={effectiveStatus} />
                </div>

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

                {unit.instructions && (
                  <div className={styles.instructions}>
                    <span className={styles.label}>Notes:</span> {unit.instructions}
                  </div>
                )}

                {isHold && unit.holdReason && (
                   <div className={styles.instructions} style={{ marginTop: '0.5rem', borderColor: 'var(--error-500)', color: 'var(--error-500)' }}>
                     <strong>Hold Reason:</strong> {unit.holdReason}
                   </div>
                )}

                <div className={styles.actionRow}>
                  <div className={styles.progressTrack} title={`${progress}% Complete`}>
                    <div 
                      className={styles.progressBar} 
                      style={{ width: `${progress}%`, backgroundColor: isHold ? 'var(--error-500)' : 'var(--primary)' }}
                    />
                  </div>

                  <div className={styles.buttons}>
                    {/* Action: Put on Hold */}
                    {!isHold && effectiveStatus !== 'stage-shipped' && (
                      <button 
                        className={`icon-button ${styles.actionBtn} ${styles.holdBtn}`}
                        onClick={() => initiateHold(unit.id)}
                        title="Put on Hold"
                      >
                        <IconAlert width="16" height="16" />
                      </button>
                    )}

                    {/* Action: Advance (Dynamic) */}
                    {nextStage && !isHold && (
                      <button 
                        className={`button secondary ${styles.advanceBtn}`} 
                        onClick={() => handleStatusUpdate(unit.id, nextStage.id)}
                      >
                        <span>Move to {nextStage.label}</span>
                        <IconChevronRight width="14" height="14" />
                      </button>
                    )}

                    {/* Action: Resume (From Hold) */}
                    {isHold && (
                      <button 
                        className="button primary"
                        // Resume: Ideally find the *previous* active stage from history
                        // For MVP, we default to 'stage-design' or the first stage of the workflow
                        onClick={() => handleStatusUpdate(unit.id, 'stage-design')} 
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

      {/* --- HOLD MODAL --- */}
      <Modal
        isOpen={holdModalOpen}
        onClose={() => setHoldModalOpen(false)}
        title="Put Unit On Hold"
        icon={<IconAlert width="20" height="20" />}
        width="400px"
        variant="danger"
        footer={
          <>
            <button className="button text" onClick={() => setHoldModalOpen(false)}>Cancel</button>
            <button className="button primary danger" onClick={confirmHold} disabled={!holdReason.trim()}>
              Confirm Hold
            </button>
          </>
        }
      >
        <div style={{ padding: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Reason for Hold
          </label>
          <textarea
            className="input"
            style={{ width: '100%', minHeight: '100px', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}
            placeholder="e.g., Unclear margin, Material shortage..."
            value={holdReason}
            onChange={(e) => setHoldReason(e.target.value)}
            autoFocus
          />
        </div>
      </Modal>
    </>
  );
};

export default CaseUnitsList;