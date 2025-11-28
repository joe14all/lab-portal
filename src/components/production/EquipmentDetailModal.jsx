import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { IconDrill, IconCheck, IconAlert, IconClock, IconMicroscope } from '../../layouts/components/LabIcons';
import styles from './EquipmentDetailModal.module.css';
import { TelemetryGenerator } from '../../utils/production/telemetry'; // NEW
import { PredictiveModel } from '../../utils/production/predictiveModel'; // NEW
import TelemetryChart from './analytics/TelemetryChart'; // NEW

const EquipmentDetailModal = ({ machine, isOpen, onClose, onReportIssue }) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // IoT State
  const [telemetry, setTelemetry] = useState([]);
  const [health, setHealth] = useState(null);

  // Simulate Live Connection
  useEffect(() => {
    if (isOpen && machine?.status === 'Running') {
      // 1. Load Initial History
      const history = TelemetryGenerator.generateHistory(machine.type);
      setTelemetry(history);

      // 2. Start Live Stream
      const interval = setInterval(() => {
        setTelemetry(prev => {
          const next = TelemetryGenerator.nextPoint(machine.type, prev[prev.length - 1]);
          const newData = [...prev.slice(1), next]; // Keep window size constant
          
          // 3. Run Analysis
          const analysis = PredictiveModel.analyze(newData, machine.type);
          setHealth(analysis);
          
          return newData;
        });
      }, 2000); // Update every 2 seconds

      return () => clearInterval(interval);
    }
  }, [isOpen, machine]);

  if (!machine) return null;

  const handleReportClick = () => {
    onReportIssue(machine.id);
    onClose();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className={styles.grid2}>
            <div className={styles.infoBlock}>
              <span className={styles.label}>Manufacturer</span>
              <span className={styles.value}>{machine.name.split(' ')[0]}</span>
            </div>
            <div className={styles.infoBlock}>
              <span className={styles.label}>Type</span>
              <span className={styles.value}>{machine.type}</span>
            </div>
            <div className={styles.infoBlock}>
              <span className={styles.label}>Warranty Provider</span>
              <span className={styles.value}>{machine.warranty?.provider || 'N/A'}</span>
            </div>
            <div className={styles.infoBlock}>
              <span className={styles.label}>Warranty Expiry</span>
              <span className={styles.value}>
                {machine.warranty?.expiryDate 
                  ? new Date(machine.warranty.expiryDate).toLocaleDateString() 
                  : 'Expired/Unknown'}
              </span>
            </div>
            <div className={styles.infoBlock} style={{ gridColumn: '1 / -1' }}>
              <span className={styles.label}>Hourly Operating Cost</span>
              <span className={styles.value}>
                ${machine.operatingCost?.perHour?.toFixed(2) || '0.00'} / hr 
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                  ({machine.operatingCost?.energyConsumption || '-'})
                </span>
              </span>
            </div>
          </div>
        );

      case 'telemetry': // NEW TAB
        if (machine.status !== 'Running') {
          return (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              <IconAlert width="32" style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
              <p>Machine is offline. Telemetry unavailable.</p>
            </div>
          );
        }
        return (
          <div className={styles.container}>
            {/* Health Score Header */}
            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              padding: '1rem', backgroundColor: 'var(--bg-body)', borderRadius: '0.5rem',
              borderLeft: `4px solid ${health?.score < 80 ? '#f59e0b' : '#10b981'}`
            }}>
              <div>
                <span className={styles.label}>AI Health Score</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  {health?.score || 100}/100
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ 
                  fontSize: '0.8rem', fontWeight: 600, 
                  color: health?.score < 80 ? 'var(--warning-500)' : 'var(--success-500)'
                }}>
                  {health?.status || 'Analyzing...'}
                </span>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  {health?.recommendation}
                </div>
              </div>
            </div>

            {/* Charts */}
            <div style={{ marginTop: '1.5rem' }}>
              <TelemetryChart 
                data={telemetry} dataKey="temperature" 
                label="Temperature (°C)" unit="°C" color="#ef4444" 
                domain={[20, 80]}
              />
              <TelemetryChart 
                data={telemetry} dataKey="rpm" 
                label="Spindle Speed (RPM)" unit="rpm" color="#3b82f6" 
                domain={[0, 40000]}
              />
              <TelemetryChart 
                data={telemetry} dataKey="vibration" 
                label="Vibration (mm/s)" unit="mm/s" color="#f59e0b" 
                domain={[0, 5]}
              />
            </div>
          </div>
        );

      case 'maintenance':
        return (
          <div className={styles.container}>
            <div className={styles.metricCard} style={{ textAlign: 'left', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <span className={styles.label}>Next Service Due</span>
                <div style={{ color: 'var(--error-500)', fontWeight: '700' }}>
                  {new Date(machine.maintenance?.nextServiceDue).toLocaleDateString()}
                </div>
              </div>
              {machine.status !== 'Maintenance' && (
                <button 
                  className="button secondary danger small"
                  onClick={handleReportClick}
                >
                  Report Issue
                </button>
              )}
            </div>
            
            <div className={styles.infoBlock}>
              <span className={styles.label}>Last Service Notes</span>
              <p style={{ fontSize: '0.9rem', margin: 0, padding: '0.5rem', backgroundColor: 'var(--bg-body)', borderRadius: '4px' }}>
                {machine.maintenance?.notes || 'No notes available.'}
              </p>
            </div>
          </div>
        );

      case 'calibration':
        return (
          <div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Technician</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {machine.calibrationHistory && machine.calibrationHistory.length > 0 ? (
                  machine.calibrationHistory.map((cal, idx) => (
                    <tr key={idx}>
                      <td>{new Date(cal.date).toLocaleDateString()}</td>
                      <td>{cal.technician}</td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <IconCheck width="12" color="var(--success-500)" /> {cal.results}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '1rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                      No calibration records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );

      case 'metrics':
        return (
          <div className={styles.grid2}>
            <div className={styles.metricCard}>
              <span className={styles.label}>Total Run Time</span>
              <span className={styles.metricVal}>{machine.utilizationMetrics?.hoursRun || 0}h</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.label}>Idle Time</span>
              <span className={styles.metricVal}>{machine.utilizationMetrics?.idleTime || 0}h</span>
            </div>
            <div className={styles.metricCard} style={{ gridColumn: '1 / -1' }}>
              <span className={styles.label}>Efficiency</span>
              <span className={styles.metricVal}>
                {Math.round((machine.utilizationMetrics?.hoursRun / ((machine.utilizationMetrics?.hoursRun + machine.utilizationMetrics?.idleTime) || 1)) * 100)}%
              </span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Machine Details"
      icon={<IconDrill width="20" />}
      width="600px"
      footer={
        <div style={{display:'flex', justifyContent:'space-between', width:'100%'}}>
          {machine.status !== 'Maintenance' ? (
             <button className="button text danger" onClick={handleReportClick}>
               <IconAlert width="14" style={{marginRight:'4px'}}/> Report Breakdown
             </button>
          ) : <div />}
          
          <button className="button primary" onClick={onClose}>Done</button>
        </div>
      }
    >
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.headerRow}>
          <div className={styles.machineInfo}>
            <h4>{machine.name}</h4>
            <span className={styles.serial}>S/N: {machine.serialNumber}</span>
          </div>
          <span className={`${styles.statusTag} ${styles[machine.status]}`}>
            {machine.status}
          </span>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {['overview', 'telemetry', 'maintenance', 'calibration', 'metrics'].map(tab => (
            <button
              key={tab}
              className={`${styles.tabBtn} ${activeTab === tab ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className={styles.tabContent}>
          {renderTabContent()}
        </div>
      </div>
    </Modal>
  );
};

export default EquipmentDetailModal;