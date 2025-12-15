/* eslint-disable no-unused-vars */
import React, { useState, useMemo } from 'react';
import { useProduction, useLab, useToast } from '../../contexts';
import EquipmentDetailModal from '../../components/production/EquipmentDetailModal';
import MaterialDetailModal from '../../components/production/MaterialDetailModal';
import BatchCreationModal from '../../components/production/BatchCreationModal';
import QualityCheckModal from '../../components/production/QualityCheckModal';
import MaintenanceModal from '../../components/production/MaintenanceModal';
import ProductionMetrics from '../../components/production/analytics/ProductionMetrics';
import BatchBoard from '../../components/production/BatchBoard';
import { 
  IconMill, 
  IconLayers, 
  IconFire, 
  IconAlert, 
  IconCheck
} from '../../layouts/components/LabIcons';
import styles from './ProductionQueue.module.css';

const getMachineIcon = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('mill')) return <IconMill width="24" height="24" />;
  if (t.includes('print')) return <IconLayers width="24" height="24" />;
  if (t.includes('furnace') || t.includes('press')) return <IconFire width="24" height="24" />;
  return <IconMill width="24" height="24" />;
};

const ProductionQueue = () => {
  const { 
    equipment, batches, materials, loading, 
    activeBatches, lowStockMaterials, equipmentStats,
    startBatch, completeBatch, logMaintenance, updateEquipmentStatus, addCasesToBatch
  } = useProduction();
  
  const { addToast } = useToast();
  const { cases } = useLab();

  // --- View State ---
  const [activeTab, setActiveTab] = useState('batches'); // 'batches' | 'floor' | 'analytics' | 'cases'
  
  // Count cases ready for production
  const readyForProductionCount = cases?.filter(c => 
    ['stage-design', 'stage-milling', 'stage-finishing'].includes(c.status)
  ).length || 0;

  // --- Modal State ---
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [addToBatchId, setAddToBatchId] = useState(null); // For adding to existing batch
  const [qcBatch, setQcBatch] = useState(null);
  const [maintenanceMachine, setMaintenanceMachine] = useState(null);

  // --- Handlers ---
  const handleStartBatch = async (batchId) => {
    try {
      await startBatch(batchId);
      addToast(`Batch ${batchId.split('-').pop()} started.`, 'success');
    } catch (err) {
      addToast("Failed to start batch", 'error');
    }
  };

  const handleCompleteClick = (batch) => setQcBatch(batch);

  const handleQCSubmit = async (batchId, metrics) => {
    try {
      await completeBatch(batchId, metrics);
      addToast("Batch completed and QC logged.", "success");
      setQcBatch(null);
    } catch (err) {
      addToast("Failed to complete batch", "error");
    }
  };

  const handleMaintenanceSave = async (eqId, data) => {
    try {
      await logMaintenance(eqId, data);
      addToast("Maintenance logged successfully.", "success");
      setMaintenanceMachine(null);
      setSelectedMachine(null); 
    } catch (err) {
      addToast("Failed to log maintenance", "error");
    }
  };

  const handleReportBreakdown = async (eqId) => {
    try {
      await updateEquipmentStatus(eqId, 'Maintenance', 'Reported breakdown via Dashboard');
      addToast("Machine marked as Maintenance required.", "info");
      setSelectedMachine(null);
    } catch (err) {
      addToast("Failed to update status", "error");
    }
  };

  const handleAddToBatch = (batchId) => {
    setAddToBatchId(batchId);
    setShowBatchModal(true);
  };

  const getCaseBatchInfo = (caseId) => {
    return batches.find(b => b.caseIds.includes(caseId));
  };




  const handleQuickBatchByMaterial = (materialGroup, caseIds) => {
    // Pre-select material and cases, then open modal
    setShowBatchModal(true);
  };

  // Group cases by material for quick batching
  const casesByMaterial = useMemo(() => {
    const productionCases = cases?.filter(c => 
      ['stage-design', 'stage-milling', 'stage-finishing'].includes(c.status)
    ) || [];
    
    const grouped = {};
    productionCases.forEach(caseItem => {
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
  }, [cases]);

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading production floor...</div>;
  }

  return (
    <div className={styles.container}>
      
      {/* HEADER WITH TABS */}
      <header className={styles.header}>
        <div>
          <h1>Production Queue</h1>
          <p>Real-time machine status and job batching.</p>
        </div>
        
        {/* Toggle Controls */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', backgroundColor: 'var(--bg-surface)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button 
              onClick={() => setActiveTab('batches')}
              style={{ 
                border: 'none', 
                backgroundColor: activeTab === 'batches' ? 'var(--neutral-100)' : 'transparent',
                color: activeTab === 'batches' ? 'var(--text-primary)' : 'var(--text-secondary)',
                padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}
            >
              <IconLayers width="16" />
              Batch Board
            </button>
            <button 
              onClick={() => setActiveTab('floor')}
              style={{ 
                border: 'none', 
                backgroundColor: activeTab === 'floor' ? 'var(--neutral-100)' : 'transparent',
                color: activeTab === 'floor' ? 'var(--text-primary)' : 'var(--text-secondary)',
                padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer'
              }}
            >
              Floor View
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              style={{ 
                border: 'none', 
                backgroundColor: activeTab === 'analytics' ? 'var(--neutral-100)' : 'transparent',
                color: activeTab === 'analytics' ? 'var(--text-primary)' : 'var(--text-secondary)',
                padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer'
              }}
            >
              Analytics
            </button>
            <button 
              onClick={() => setActiveTab('cases')}
              style={{ 
                border: 'none', 
                backgroundColor: activeTab === 'cases' ? 'var(--neutral-100)' : 'transparent',
                color: activeTab === 'cases' ? 'var(--text-primary)' : 'var(--text-secondary)',
                padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}
            >
              Cases Queue
              {readyForProductionCount > 0 && (
                <span style={{
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  borderRadius: '99px',
                  padding: '0.125rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  {readyForProductionCount}
                </span>
              )}
            </button>
          </div>

          <button className="button primary" onClick={() => setShowBatchModal(true)}>
            + Create Batch
          </button>
        </div>
      </header>

      {/* --- CONDITIONAL RENDER --- */}
      {activeTab === 'batches' ? (
        <BatchBoard />
      ) : activeTab === 'analytics' ? (
        <ProductionMetrics />
      ) : activeTab === 'cases' ? (
        <div style={{ padding: '2rem' }}>
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, marginBottom: '0.25rem', fontSize: '1.5rem' }}>Cases Ready for Production</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Organize and batch cases by material type
              </p>
            </div>
            <button 
              className="button primary"
              onClick={() => {
                setAddToBatchId(null);
                setShowBatchModal(true);
              }}
            >
              + Create New Batch
            </button>
          </div>

          {/* Group by Material */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {Object.keys(casesByMaterial).length > 0 ? (
              Object.entries(casesByMaterial).map(([material, materialCases]) => {
                const unbatchedCases = materialCases.filter(c => !getCaseBatchInfo(c.id));
                
                return (
                  <div key={material} style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.75rem',
                    overflow: 'hidden',
                    backgroundColor: 'var(--bg-surface)'
                  }}>
                    {/* Material Header */}
                    <div style={{
                      padding: '1rem 1.5rem',
                      backgroundColor: 'var(--neutral-50)',
                      borderBottom: '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{material}</h3>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {materialCases.length} case{materialCases.length !== 1 ? 's' : ''} 
                          {unbatchedCases.length > 0 && (
                            <span> • {unbatchedCases.length} unbatched</span>
                          )}
                        </p>
                      </div>
                      {unbatchedCases.length > 0 && (
                        <button
                          className="button success"
                          onClick={() => handleQuickBatchByMaterial(material, unbatchedCases.map(c => c.id))}
                        >
                          Batch All ({unbatchedCases.length})
                        </button>
                      )}
                    </div>

                    {/* Cases List */}
                    <div style={{ padding: '0.75rem' }}>
                      {materialCases.map(caseItem => {
                        const dueDate = caseItem.dates?.due ? new Date(caseItem.dates.due) : null;
                        const isUrgent = dueDate && (dueDate - new Date()) < 2 * 24 * 60 * 60 * 1000;
                        const batchInfo = getCaseBatchInfo(caseItem.id);

                        return (
                          <div
                            key={caseItem.id}
                            style={{
                              padding: '1rem',
                              marginBottom: '0.5rem',
                              border: '1px solid var(--border-color)',
                              borderRadius: '0.5rem',
                              backgroundColor: isUrgent ? '#fff5f5' : 'white',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                            onClick={() => window.location.href = `/cases/${caseItem.id}`}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-300)'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                              <div>
                                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                                  {caseItem.caseNumber}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                  {caseItem.patient?.name || 'Unknown Patient'}
                                </div>
                              </div>
                              <div style={{ 
                                padding: '0.25rem 0.75rem', 
                                borderRadius: '99px', 
                                fontSize: '0.75rem', 
                                fontWeight: 600,
                                backgroundColor: 
                                  caseItem.status === 'stage-design' ? 'var(--primary-100)' :
                                  caseItem.status === 'stage-milling' ? 'var(--warning-100)' : 'var(--success-100)',
                                color:
                                  caseItem.status === 'stage-design' ? 'var(--primary-700)' :
                                  caseItem.status === 'stage-milling' ? 'var(--warning-700)' : 'var(--success-700)'
                              }}>
                                {caseItem.status === 'stage-design' ? 'Design' :
                                 caseItem.status === 'stage-milling' ? 'Milling' : 'Finishing'}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                  {caseItem.units?.length || 0} units
                                </div>
                                {dueDate && (
                                  <div style={{ 
                                    fontSize: '0.75rem', 
                                    color: isUrgent ? 'var(--error-500)' : 'var(--text-secondary)',
                                    fontWeight: isUrgent ? 600 : 400
                                  }}>
                                    {isUrgent && '⚠️ '} Due: {dueDate.toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                              {batchInfo ? (
                                <div style={{
                                  padding: '0.5rem 1rem',
                                  borderRadius: '0.5rem',
                                  backgroundColor: batchInfo.status === 'Scheduled' ? 'var(--warning-100)' : 'var(--success-100)',
                                  color: batchInfo.status === 'Scheduled' ? 'var(--warning-700)' : 'var(--success-700)',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  whiteSpace: 'nowrap'
                                }}>
                                  <IconLayers width="14" height="14" />
                                  Batch {batchInfo.id.split('-').pop()}
                                </div>
                              ) : (
                                <button 
                                  className="button secondary"
                                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAddToBatchId(null);
                                    setShowBatchModal(true);
                                  }}
                                >
                                  Add to Batch
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ 
                padding: '3rem', 
                textAlign: 'center', 
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: '0.75rem',
                border: '1px solid var(--border-color)'
              }}>
                <IconCheck width="48" height="48" style={{ color: 'var(--success-500)', marginBottom: '1rem' }} />
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem' }}>All Clear</h3>
                <p style={{ margin: 0 }}>No cases ready for production at this time</p>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'floor' ? (
        <>
          {/* KPI STATS (Queue View Only) */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Machines Running</span>
              <span className={styles.statValue} style={{ color: 'var(--success-500)' }}>
                {equipmentStats.running} / {equipmentStats.total}
              </span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Active Batches</span>
              <span className={styles.statValue}>{activeBatches.length}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Low Stock Alerts</span>
              <span className={styles.statValue} style={{ color: lowStockMaterials.length > 0 ? 'var(--error-500)' : 'inherit' }}>
                {lowStockMaterials.length}
              </span>
            </div>
          </div>

          {/* EQUIPMENT STATUS */}
          <section>
            <div className={styles.sectionTitle}>
              <IconMill width="18" /> Equipment Status
            </div>
            <div className={styles.equipmentGrid}>
              {equipment.map(machine => {
                const isRunning = machine.status === 'Running';
                const isMaintenance = machine.status === 'Maintenance';
                const statusClass = isRunning ? styles.statusRunning 
                  : isMaintenance ? styles.statusMaintenance 
                  : styles.statusIdle;
                const badgeClass = isRunning ? styles.bgRunning 
                  : isMaintenance ? styles.bgMaintenance 
                  : styles.bgIdle;
                const activeBatch = machine.currentJobId 
                  ? batches.find(b => b.id === machine.currentJobId)
                  : null;

                return (
                  <div 
                    key={machine.id} 
                    className={`${styles.machineCard} ${statusClass}`}
                    onClick={() => isMaintenance ? setMaintenanceMachine(machine) : setSelectedMachine(machine)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles.machineHeader}>
                      <div>
                        <span className={styles.machineName}>{machine.name}</span>
                        <span className={styles.machineType}>{machine.type}</span>
                      </div>
                      <span className={`${styles.statusBadge} ${badgeClass}`}>
                        {machine.status}
                      </span>
                    </div>

                    <div className={styles.machineBody}>
                      {isRunning && activeBatch ? (
                        <div className={styles.currentJob}>
                          <div style={{ color: 'var(--primary)', opacity: 0.8 }}>
                            {getMachineIcon(machine.type)}
                          </div>
                          <div className={styles.jobMeta} style={{ flex: 1 }}>
                            <strong>Batch #{activeBatch.id.split('-').pop()}</strong>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              Ends: {new Date(activeBatch.estimatedEndTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            <div className={styles.progress}>
                              <div className={styles.progressBar} style={{ width: '60%' }}></div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                          {isMaintenance ? `Service Required. Click to log.` : 'Ready for assignment'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SPLIT: QUEUE & ALERTS */}
          <div className={styles.splitView}>
            <section>
              <div className={styles.sectionTitle}>
                <IconLayers width="18" /> Active Batches
              </div>
              <div className={styles.queueCard}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Batch ID</th>
                      <th>Machine</th>
                      <th>Status</th>
                      <th style={{textAlign:'right'}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeBatches.length > 0 ? activeBatches.map(batch => {
                      const machine = equipment.find(e => e.id === batch.machineId);
                      return (
                        <tr key={batch.id}>
                          <td style={{ fontWeight: 500 }}>
                            {batch.id}
                            <div style={{fontSize:'0.75rem', color:'var(--text-secondary)'}}>
                              {batch.materialId} • {batch.caseIds?.length || 0} Units
                            </div>
                          </td>
                          <td>{machine?.name || 'Unassigned'}</td>
                          <td>
                            {batch.status === 'InProgress' 
                              ? <span style={{ color: 'var(--primary)', fontWeight: 600 }}>In Progress</span> 
                              : batch.status}
                          </td>
                          <td style={{textAlign:'right'}}>
                            {batch.status === 'Scheduled' && (
                              <>
                                <button 
                                  className="button secondary small" 
                                  onClick={() => handleAddToBatch(batch.id)}
                                  style={{ marginRight: '0.5rem' }}
                                >
                                  Add More Cases
                                </button>
                                <button 
                                  className="button success small" 
                                  onClick={() => handleStartBatch(batch.id)}
                                >
                                  Start Production
                                </button>
                              </>
                            )}
                            {batch.status === 'InProgress' && (
                              <button className="button primary small" onClick={() => handleCompleteClick(batch)}>Complete</button>
                            )}
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No active batches.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <div className={styles.sectionTitle}>
                <IconAlert width="18" /> Inventory Alerts
              </div>
              {lowStockMaterials.length > 0 ? (
                <div className={styles.alertList}>
                  {lowStockMaterials.map(mat => (
                    <div 
                      key={mat.id} 
                      className={styles.alertItem}
                      onClick={() => setSelectedMaterial(mat)}
                      style={{ cursor: 'pointer' }}
                    >
                      <IconAlert width="20" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div className={styles.alertContent}>
                        <strong>Low Stock: {mat.name}</strong>
                        <p>Remaining: {mat.stockLevel} {mat.unit || 'units'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.queueCard} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <IconCheck width="32" style={{ color: 'var(--success-500)', marginBottom: '0.5rem' }} />
                  <p>Inventory levels are good.</p>
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}

      {/* --- MODALS (Shared across views) --- */}
      <EquipmentDetailModal 
        machine={selectedMachine} 
        isOpen={!!selectedMachine} 
        onClose={() => setSelectedMachine(null)}
        onReportIssue={handleReportBreakdown} 
      />
      <MaterialDetailModal
        material={selectedMaterial}
        isOpen={!!selectedMaterial}
        onClose={() => setSelectedMaterial(null)}
      />
      <BatchCreationModal 
        isOpen={showBatchModal}
        onClose={() => {
          setShowBatchModal(false);
          setAddToBatchId(null);
        }}
        existingBatchId={addToBatchId}
      />
      <QualityCheckModal 
        batch={qcBatch}
        isOpen={!!qcBatch}
        onClose={() => setQcBatch(null)}
        onComplete={handleQCSubmit}
      />
      <MaintenanceModal
        machine={maintenanceMachine}
        isOpen={!!maintenanceMachine}
        onClose={() => setMaintenanceMachine(null)}
        onSave={handleMaintenanceSave}
      />
    </div>
  );
};

export default ProductionQueue;