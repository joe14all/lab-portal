/* eslint-disable no-unused-vars */
import React, { useState, useMemo } from 'react';
import { useProduction, useLab, useToast } from '../../contexts';
import { IconLayers, IconClock, IconCheck, IconAlert } from '../../layouts/components/LabIcons';
import styles from './BatchBoard.module.css';

const BatchBoard = () => {
  const { batches, equipment, materials, startBatch, addCasesToBatch, removeCaseFromBatch, completeBatch } = useProduction();
  const { cases, refreshCases } = useLab();
  const { addToast } = useToast();

  const [draggedCase, setDraggedCase] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Get unbatched cases ready for production
  const unbatchedCases = useMemo(() => {
    const batchedCaseIds = new Set();
    batches.forEach(b => b.caseIds?.forEach(id => batchedCaseIds.add(id)));
    
    return cases?.filter(c => 
      ['stage-design', 'stage-milling', 'stage-finishing'].includes(c.status) &&
      !batchedCaseIds.has(c.id)
    ) || [];
  }, [cases, batches]);

  // Group unbatched cases by material
  const unbatchedByMaterial = useMemo(() => {
    const grouped = {};
    unbatchedCases.forEach(caseItem => {
      caseItem.units?.forEach(unit => {
        const material = unit.material || 'Unknown Material';
        if (!grouped[material]) {
          grouped[material] = [];
        }
        if (!grouped[material].some(c => c.id === caseItem.id)) {
          grouped[material].push(caseItem);
        }
      });
    });
    return grouped;
  }, [unbatchedCases]);

  // Get scheduled batches (can be modified)
  const scheduledBatches = useMemo(() => {
    return batches.filter(b => b.status === 'Scheduled');
  }, [batches]);

  // Get in-progress batches (read-only)
  const inProgressBatches = useMemo(() => {
    return batches.filter(b => b.status === 'InProgress');
  }, [batches]);

  // Drag handlers
  const handleDragStart = (e, caseItem) => {
    setDraggedCase(caseItem);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnBatch = async (e, batchId) => {
    e.preventDefault();
    if (!draggedCase) return;

    try {
      await addCasesToBatch(batchId, [draggedCase.id]);
      addToast(`Case ${draggedCase.caseNumber} added to batch`, 'success');
    } catch (err) {
      addToast(err.message || 'Failed to add case to batch', 'error');
    }
    
    setDraggedCase(null);
  };

  const handleRemoveFromBatch = async (batchId, caseId) => {
    try {
      await removeCaseFromBatch(batchId, caseId);
      addToast('Case removed from batch', 'success');
      // Refresh cases to update the unbatched list
      if (refreshCases) await refreshCases();
    } catch (err) {
      addToast('Failed to remove case', 'error');
    }
  };

  const handleStartBatch = async (batchId) => {
    try {
      await startBatch(batchId);
      addToast('Batch started', 'success');
    } catch (err) {
      addToast('Failed to start batch', 'error');
    }
  };

  const handleCompleteBatch = async (batchId) => {
    try {
      await completeBatch(batchId, {
        passRate: 100,
        defects: 0,
        notes: 'Completed from Batch Board'
      });
      addToast('Batch completed - cases advanced to next stage', 'success');
      // Refresh cases to show updated statuses
      if (refreshCases) await refreshCases();
    } catch (err) {
      addToast('Failed to complete batch', 'error');
    }
  };

  const getBatchMachine = (batchId) => {
    const batch = batches.find(b => b.id === batchId);
    return equipment.find(e => e.id === batch?.machineId);
  };

  const getCaseDetails = (caseId) => {
    return cases?.find(c => c.id === caseId);
  };

  return (
    <div className={styles.boardContainer}>
      
      {/* LEFT COLUMN: Unbatched Cases */}
      <div className={styles.column}>
        <div className={styles.columnHeader}>
          <h3>Ready for Batching</h3>
          <span className={styles.badge}>{unbatchedCases.length}</span>
        </div>

        <div className={styles.columnContent}>
          {Object.keys(unbatchedByMaterial).length > 0 ? (
            Object.entries(unbatchedByMaterial).map(([material, materialCases]) => (
              <div key={material} className={styles.materialGroup}>
                <div className={styles.materialHeader}>
                  <span className={styles.materialName}>{material}</span>
                  <span className={styles.materialCount}>{materialCases.length}</span>
                </div>
                
                <div className={styles.casesList}>
                  {materialCases.map(caseItem => {
                    const dueDate = caseItem.dates?.due ? new Date(caseItem.dates.due) : null;
                    const isUrgent = dueDate && (dueDate - new Date()) < 2 * 24 * 60 * 60 * 1000;

                    return (
                      <div
                        key={caseItem.id}
                        className={`${styles.caseCard} ${isUrgent ? styles.urgent : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, caseItem)}
                      >
                        <div className={styles.caseHeader}>
                          <span className={styles.caseNumber}>{caseItem.caseNumber}</span>
                          <span className={styles.unitCount}>{caseItem.units?.length || 0} units</span>
                        </div>
                        <div className={styles.casePatient}>{caseItem.patient?.name}</div>
                        {dueDate && (
                          <div className={`${styles.caseDue} ${isUrgent ? styles.dueUrgent : ''}`}>
                            {isUrgent && <IconAlert width="12" />}
                            Due: {dueDate.toLocaleDateString()}
                          </div>
                        )}
                        <div className={styles.dragHint}>Drag to batch →</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <IconCheck width="48" />
              <p>All cases are batched!</p>
            </div>
          )}
        </div>
      </div>

      {/* MIDDLE COLUMN: Scheduled Batches */}
      <div className={styles.column}>
        <div className={styles.columnHeader}>
          <h3>Scheduled Batches</h3>
          <span className={styles.badge}>{scheduledBatches.length}</span>
        </div>

        <div className={styles.columnContent}>
          {scheduledBatches.length > 0 ? (
            scheduledBatches.map(batch => {
              const machine = getBatchMachine(batch.id);
              const batchCases = batch.caseIds?.map(id => getCaseDetails(id)).filter(Boolean) || [];

              return (
                <div
                  key={batch.id}
                  className={styles.batchCard}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnBatch(e, batch.id)}
                >
                  <div className={styles.batchHeader}>
                    <div>
                      <div className={styles.batchTitle}>
                        <IconLayers width="16" />
                        Batch {batch.id.split('-').pop()}
                      </div>
                      <div className={styles.batchMachine}>{machine?.name || 'Unassigned'}</div>
                    </div>
                    <button
                      className="button success small"
                      onClick={() => handleStartBatch(batch.id)}
                    >
                      Start
                    </button>
                  </div>

                  <div className={styles.batchStats}>
                    <span>{batchCases.length} cases</span>
                    <span>•</span>
                    <span>{batch.materialConsumed?.units || 0} units</span>
                  </div>

                  <div className={styles.batchCases}>
                    {batchCases.map(caseItem => (
                      <div key={caseItem.id} className={styles.batchCaseItem}>
                        <div className={styles.batchCaseInfo}>
                          <span className={styles.batchCaseNumber}>{caseItem.caseNumber}</span>
                          <span className={styles.batchCasePatient}>{caseItem.patient?.name}</span>
                        </div>
                        <button
                          className={styles.removeBtn}
                          onClick={() => handleRemoveFromBatch(batch.id, caseItem.id)}
                          title="Remove from batch"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className={styles.dropZone}>
                    Drop cases here to add to batch
                  </div>
                </div>
              );
            })
          ) : (
            <div className={styles.emptyState}>
              <IconLayers width="48" />
              <p>No scheduled batches</p>
              <span className={styles.emptyHint}>Drag cases here to create batches</span>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: In Progress */}
      <div className={styles.column}>
        <div className={styles.columnHeader}>
          <h3>In Progress</h3>
          <span className={styles.badge}>{inProgressBatches.length}</span>
        </div>

        <div className={styles.columnContent}>
          {inProgressBatches.length > 0 ? (
            inProgressBatches.map(batch => {
              const machine = getBatchMachine(batch.id);
              const batchCases = batch.caseIds?.map(id => getCaseDetails(id)).filter(Boolean) || [];
              const startTime = batch.startTime ? new Date(batch.startTime) : null;
              const estimatedEnd = batch.estimatedEndTime ? new Date(batch.estimatedEndTime) : null;

              return (
                <div key={batch.id} className={`${styles.batchCard} ${styles.inProgress}`}>
                  <div className={styles.batchHeader}>
                    <div>
                      <div className={styles.batchTitle}>
                        <IconLayers width="16" />
                        Batch {batch.id.split('-').pop()}
                      </div>
                      <div className={styles.batchMachine}>{machine?.name || 'Unassigned'}</div>
                    </div>
                    <button
                      className="button success small"
                      onClick={() => handleCompleteBatch(batch.id)}
                      title="Complete batch and advance cases"
                    >
                      Complete
                    </button>
                  </div>

                  <div className={styles.batchStats}>
                    <span>{batchCases.length} cases</span>
                    <span>•</span>
                    <span>{batch.materialConsumed?.units || 0} units</span>
                  </div>

                  {estimatedEnd && (
                    <div className={styles.batchTime}>
                      <IconClock width="14" />
                      Est. completion: {estimatedEnd.toLocaleTimeString()}
                    </div>
                  )}

                  <div className={styles.batchCases}>
                    {batchCases.map(caseItem => (
                      <div key={caseItem.id} className={styles.batchCaseItem}>
                        <div className={styles.batchCaseInfo}>
                          <span className={styles.batchCaseNumber}>{caseItem.caseNumber}</span>
                          <span className={styles.batchCasePatient}>{caseItem.patient?.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className={styles.emptyState}>
              <IconClock width="48" />
              <p>No active production</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchBoard;
