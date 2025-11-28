import React, { useMemo } from 'react';
import { useLab } from '../../contexts';
import { 
  IconDrill, 
  IconLayers, 
  IconFire, 
  IconAlert, 
  IconCheck, 
  IconClock 
} from '../../layouts/components/LabIcons';
import styles from './ProductionQueue.module.css';

// Helper: Icon for Machine Type
const getMachineIcon = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('mill')) return <IconDrill width="24" height="24" />;
  if (t.includes('print')) return <IconLayers width="24" height="24" />;
  if (t.includes('furnace') || t.includes('press')) return <IconFire width="24" height="24" />;
  return <IconDrill width="24" height="24" />;
};

const ProductionQueue = () => {
  const { equipment, batches, materials, loading } = useLab();

  // --- Computed Data ---
  const activeBatches = useMemo(() => {
    return batches.filter(b => b.status === 'InProgress' || b.status === 'Scheduled');
  }, [batches]);

  const lowMaterials = useMemo(() => {
    return materials.filter(m => 
      m.status === 'LowStock' || m.status === 'ReorderNow' || m.stockLevel <= m.reorderThreshold
    );
  }, [materials]);

  const machineStats = useMemo(() => {
    const running = equipment.filter(e => e.status === 'Running').length;
    const idle = equipment.filter(e => e.status === 'Idle').length;
    const down = equipment.filter(e => e.status === 'Maintenance').length;
    return { running, idle, down };
  }, [equipment]);

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading production floor...</div>;
  }

  return (
    <div className={styles.container}>
      
      {/* HEADER */}
      <header className={styles.header}>
        <div>
          <h1>Production Queue</h1>
          <p>Real-time machine status and job batching.</p>
        </div>
        <div>
          <button className="button primary">+ Create Batch</button>
        </div>
      </header>

      {/* KPI STATS */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Machines Running</span>
          <span className={styles.statValue} style={{ color: 'var(--success-500)' }}>
            {machineStats.running} / {equipment.length}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Active Batches</span>
          <span className={styles.statValue}>{activeBatches.length}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Low Stock Alerts</span>
          <span className={styles.statValue} style={{ color: lowMaterials.length > 0 ? 'var(--error-500)' : 'inherit' }}>
            {lowMaterials.length}
          </span>
        </div>
      </div>

      {/* EQUIPMENT STATUS */}
      <section>
        <div className={styles.sectionTitle}>
          <IconDrill width="18" /> Equipment Status
        </div>
        <div className={styles.equipmentGrid}>
          {equipment.map(machine => {
            const isRunning = machine.status === 'Running';
            const statusClass = machine.status === 'Running' ? styles.statusRunning 
              : machine.status === 'Maintenance' ? styles.statusMaintenance 
              : styles.statusIdle;
            
            const badgeClass = machine.status === 'Running' ? styles.bgRunning 
              : machine.status === 'Maintenance' ? styles.bgMaintenance 
              : styles.bgIdle;

            // Find current batch if running
            const activeBatch = machine.currentJobId 
              ? batches.find(b => b.id === machine.currentJobId)
              : null;

            return (
              <div key={machine.id} className={`${styles.machineCard} ${statusClass}`}>
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
                        <strong>{activeBatch.id}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {activeBatch.caseIds?.length || 0} Units • Ends {new Date(activeBatch.estimatedEndTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        {/* Fake Progress Bar for Visuals */}
                        <div className={styles.progress}>
                          <div className={styles.progressBar} style={{ width: '60%' }}></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                      {machine.status === 'Maintenance' 
                        ? `Reason: ${machine.maintenance?.notes || 'Scheduled Service'}`
                        : 'Ready for assignment'}
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
        
        {/* LEFT: BATCH QUEUE */}
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
                  <th>Material</th>
                  <th>Units</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {activeBatches.length > 0 ? activeBatches.map(batch => {
                  const machine = equipment.find(e => e.id === batch.machineId);
                  const material = materials.find(m => m.id === batch.materialId);
                  return (
                    <tr key={batch.id}>
                      <td style={{ fontWeight: 500 }}>{batch.id}</td>
                      <td>{machine?.name || 'Unknown'}</td>
                      <td>{material?.name || batch.materialId}</td>
                      <td>{batch.caseIds?.length || 0}</td>
                      <td>
                        {batch.status === 'InProgress' 
                          ? <span style={{ color: 'var(--primary)', fontWeight: 600 }}>In Progress</span> 
                          : batch.status}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No active batches.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* RIGHT: MATERIAL ALERTS */}
        <section>
          <div className={styles.sectionTitle}>
            <IconAlert width="18" /> Inventory Alerts
          </div>
          {lowMaterials.length > 0 ? (
            <div className={styles.alertList}>
              {lowMaterials.map(mat => (
                <div key={mat.id} className={styles.alertItem}>
                  <IconAlert width="20" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div className={styles.alertContent}>
                    <strong>Low Stock: {mat.name}</strong>
                    <p>Remaining: {mat.stockLevel} {mat.unit || 'units'} (Threshold: {mat.reorderThreshold})</p>
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
    </div>
  );
};

export default ProductionQueue;