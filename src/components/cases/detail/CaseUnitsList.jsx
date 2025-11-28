/* eslint-disable no-unused-vars */
import React, { useState, useMemo } from 'react';
import { useLab, useCrm } from '../../../contexts'; // Added useCrm for product lookup
import StatusBadge from '../StatusBadge';
import Modal from '../../common/Modal'; 
import { 
  IconTooth, 
  IconChevronRight, 
  IconAlert,
  IconMill,
  IconLayers,
  IconCheck,
  IconClose,
  IconInvoice // Added for Fees
} from '../../../layouts/components/LabIcons';
import styles from './CaseUnitsList.module.css';

const getUnitIcon = (type) => {
  const lowerType = (type || '').toLowerCase();
  if (lowerType.includes('implant') || lowerType.includes('abutment')) return <IconMill width="20" height="20" />;
  if (lowerType.includes('denture') || lowerType.includes('partial')) return <IconLayers width="20" height="20" />;
  return <IconTooth width="20" height="20" />;
};

const CaseUnitsList = ({ units, stages, caseId, updateUnitStatus }) => {
  const { workflows } = useLab(); 
  const { products } = useCrm(); // Get products to check categories
  
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [holdReason, setHoldReason] = useState('');

  // --- 1. SEPARATE PRODUCTION UNITS FROM FEES/SERVICES ---
  const { productionUnits, feeUnits } = useMemo(() => {
    // Fallback if products aren't loaded yet
    if (!products || products.length === 0) {
        return { productionUnits: units, feeUnits: [] };
    }

    const prod = [];
    const fees = [];

    units.forEach(u => {
        const product = products.find(p => p.name === u.type);
        const category = product?.category || 'Other';
        
        if (category === 'Fees' || category === 'Services') {
            fees.push(u);
        } else {
            prod.push(u);
        }
    });

    return { productionUnits: prod, feeUnits: fees };
  }, [units, products]);

  // --- Logic Helpers ---

  const getNextStageForUnit = (unit) => {
    const currentStatus = unit.status || 'stage-new';
    
    // 1. Find the specific workflow assigned to this unit
    let activeWorkflow = workflows.find(w => w.id === unit.workflowId);
    
    // Fallback: Default to first workflow ONLY for production units
    if (!activeWorkflow) {
       activeWorkflow = workflows[0]; 
    }

    if (!activeWorkflow) return null;

    // 2. Get valid stage IDs for this workflow
    const validStageIds = activeWorkflow.stages;

    // 3. Map & Sort
    const workflowStages = stages.filter(s => validStageIds.includes(s.id));
    workflowStages.sort((a, b) => validStageIds.indexOf(a.id) - validStageIds.indexOf(b.id));

    // 4. Find current position
    const currentIndex = workflowStages.findIndex(s => s.id === currentStatus);
    
    // 5. Return next step
    if (currentIndex !== -1 && currentIndex < workflowStages.length - 1) {
      return workflowStages[currentIndex + 1];
    }
    
    return null;
  };

  const getProgressPercent = (status) => {
    if (status === 'stage-shipped' || status === 'stage-delivered') return 100;
    const stage = stages.find(s => s.id === status);
    if (!stage) return 0;
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
      {/* SECTION 1: PRODUCTION UNITS */}
      <div className="card">
        <h3 className={styles.sectionTitle}>
          Production Units ({productionUnits.length})
        </h3>
        
        {productionUnits.length === 0 ? (
            <div style={{padding: '1rem', color: 'var(--text-secondary)', fontStyle: 'italic'}}>
                No physical production items in this case.
            </div>
        ) : (
            <div className={styles.list}>
            {productionUnits.map((unit, idx) => {
                const effectiveStatus = unit.status || 'stage-new';
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
                        <span>{unit.material || '-'}</span>
                    </div>
                    <div className={styles.detailCol}>
                        <span className={styles.label}>Shade</span>
                        <span>{unit.shade || '-'}</span>
                    </div>
                    <div className={styles.detailCol}>
                        <span className={styles.label}>Stump</span>
                        <span>{unit.stumpShade || '-'}</span>
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
                        {!isHold && effectiveStatus !== 'stage-shipped' && (
                        <button 
                            className={`icon-button ${styles.actionBtn} ${styles.holdBtn}`}
                            onClick={() => initiateHold(unit.id)}
                            title="Put on Hold"
                        >
                            <IconAlert width="16" height="16" />
                        </button>
                        )}

                        {nextStage && !isHold && (
                        <button 
                            className={`button secondary ${styles.advanceBtn}`} 
                            onClick={() => handleStatusUpdate(unit.id, nextStage.id)}
                        >
                            <span>Move to {nextStage.label}</span>
                            <IconChevronRight width="14" height="14" />
                        </button>
                        )}

                        {isHold && (
                        <button 
                            className="button primary"
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
        )}
      </div>

      {/* SECTION 2: FEES & SERVICES */}
      {feeUnits.length > 0 && (
        <div className="card">
            <h3 className={styles.sectionTitle}>
                Fees & Services ({feeUnits.length})
            </h3>
            <div className={styles.list}>
                {feeUnits.map((unit, idx) => (
                    <div key={unit.id || idx} className={styles.unitItem} style={{ backgroundColor: 'var(--bg-body)', borderColor: 'transparent' }}>
                        <div className={styles.unitHeader} style={{border:0, paddingBottom:0}}>
                            <div className={styles.identity}>
                                <span className={styles.typeIcon} style={{ backgroundColor: 'var(--neutral-200)', color: 'var(--neutral-600)' }}>
                                    <IconInvoice width="20" height="20" />
                                </span>
                                <div className={styles.idText}>
                                    <span className={styles.toothBadge}>Service Item</span>
                                    <strong>{unit.type}</strong>
                                    {unit.priceOverride && <span style={{fontSize:'0.8rem', color:'var(--text-secondary)'}}>Price Override: {unit.priceOverride}</span>}
                                </div>
                            </div>
                            <div style={{display:'flex', gap:'0.5rem'}}>
                                {/* Static Badge for Fees */}
                                <span style={{
                                    fontSize: '0.75rem', 
                                    fontWeight: 600, 
                                    padding: '0.25rem 0.75rem', 
                                    borderRadius: '99px', 
                                    backgroundColor: 'var(--success-bg)', 
                                    color: 'var(--success-500)'
                                }}>
                                    Applied
                                </span>
                            </div>
                        </div>
                        {unit.instructions && (
                            <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                ↪ {unit.instructions}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
      )}

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