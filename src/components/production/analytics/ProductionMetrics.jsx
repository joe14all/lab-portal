import React, { useMemo } from 'react';
import { useProduction } from '../../../contexts';
import { IconDrill, IconCheck, IconAlert, IconClock } from '../../../layouts/components/LabIcons';
import styles from './ProductionMetrics.module.css';

const ProductionMetrics = () => {
  const { equipment, batches } = useProduction();

  // --- 1. KPI Calculations ---
  const stats = useMemo(() => {
    const completedBatches = batches.filter(b => b.status === 'Completed');
    
    // Efficiency: (Completed Batches)
    const efficiency = completedBatches.length;
    
    // Quality: Avg Success Rate
    const totalRate = completedBatches.reduce((acc, b) => acc + (b.qualityMetrics?.successRate || 100), 0);
    const avgQuality = completedBatches.length ? (totalRate / completedBatches.length).toFixed(1) : 100;

    // Defect Rate: Inverted Quality
    const defectRate = (100 - avgQuality).toFixed(1);

    // Units Produced
    const unitsProduced = completedBatches.reduce((acc, b) => acc + (b.materialConsumed?.units || 0), 0);

    return { efficiency, avgQuality, defectRate, unitsProduced };
  }, [batches]);

  // --- 2. Equipment Utilization Data ---
  const utilData = useMemo(() => {
    const total = equipment.length || 1;
    const running = equipment.filter(e => e.status === 'Running').length;
    const idle = equipment.filter(e => e.status === 'Idle').length;
    const down = equipment.filter(e => e.status === 'Maintenance').length;

    return {
      runningPct: (running / total) * 100,
      idlePct: (idle / total) * 100,
      downPct: (down / total) * 100,
      runningCount: running,
      idleCount: idle,
      downCount: down
    };
  }, [equipment]);

  // --- 3. Mock Daily Output (Chart Data) ---
  // In a real app, this would aggregate by `endTime`
  const chartData = [
    { day: 'Mon', count: 12 },
    { day: 'Tue', count: 19 },
    { day: 'Wed', count: 15 },
    { day: 'Thu', count: 22 },
    { day: 'Fri', count: 8 }, // Today (lower because in progress)
  ];
  const maxVal = Math.max(...chartData.map(d => d.count)) || 1;

  return (
    <div className={styles.container}>
      
      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Units Produced</span>
          <span className={styles.kpiValue}>{stats.unitsProduced}</span>
          <div className={styles.kpiSub}>
            <IconCheck width="14" className={styles.trendUp} />
            <span className={styles.trendUp}>This Week</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>First Pass Yield</span>
          <span className={styles.kpiValue}>{stats.avgQuality}%</span>
          <div className={styles.kpiSub}>
            <span className={parseFloat(stats.avgQuality) > 95 ? styles.trendUp : styles.trendDown}>
              Target: 98%
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Active Machines</span>
          <span className={styles.kpiValue}>{utilData.runningCount} / {equipment.length}</span>
          <div className={styles.kpiSub}>
            <span className={styles.trendNeutral}>Real-time</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Defect Rate</span>
          <span className={styles.kpiValue}>{stats.defectRate}%</span>
          <div className={styles.kpiSub}>
            <IconAlert width="14" className={styles.trendDown} />
            <span className={styles.trendNeutral}>Last 7 Days</span>
          </div>
        </div>
      </div>

      <div className={styles.grid2} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        
        {/* Utilization Bar */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>
            <IconClock width="18" /> Fleet Utilization
          </div>
          <div className={styles.utilizationCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <strong>Current Status Distribution</strong>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total Capacity</span>
            </div>
            
            <div className={styles.progressBar}>
              <div className={`${styles.barSegment} ${styles.segRunning}`} style={{ width: `${utilData.runningPct}%` }} title="Running" />
              <div className={`${styles.barSegment} ${styles.segIdle}`} style={{ width: `${utilData.idlePct}%` }} title="Idle" />
              <div className={`${styles.barSegment} ${styles.segDown}`} style={{ width: `${utilData.downPct}%` }} title="Maintenance" />
            </div>

            <div className={styles.legend}>
              <div className={styles.legendItem}>
                <div className={`${styles.dot} ${styles.segRunning}`} />
                <span>Running ({utilData.runningCount})</span>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.dot} ${styles.segIdle}`} />
                <span>Idle ({utilData.idleCount})</span>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.dot} ${styles.segDown}`} />
                <span>Maintenance ({utilData.downCount})</span>
              </div>
            </div>
          </div>
        </section>

        {/* Output Chart (CSS Bar Chart) */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>
            <IconDrill width="18" /> Daily Production (Units)
          </div>
          <div className={styles.chartCard}>
            <div className={styles.chartArea}>
              {chartData.map((d, i) => (
                <div 
                  key={i} 
                  className={styles.chartBar} 
                  style={{ height: `${(d.count / maxVal) * 100}%` }}
                >
                  <span className={styles.barValue}>{d.count}</span>
                  <span className={styles.barLabel}>{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default ProductionMetrics;