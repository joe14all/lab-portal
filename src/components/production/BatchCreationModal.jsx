/* eslint-disable no-unused-vars */
import React, { useState, useMemo, useEffect } from 'react';
import Modal from '../common/Modal';
import { useLab, useProduction, useToast } from '../../contexts';
import { BatchScheduler } from '../../utils/production/batchScheduler';
import { NestingAlgorithm } from '../../utils/production/nestingAlgorithm'; // NEW IMPORT
import NestingPreview from './NestingPreview'; // NEW IMPORT
import { IconLayers, IconCheck, IconAlert, IconClock } from '../../layouts/components/LabIcons';
import styles from './BatchCreationModal.module.css';

const STEPS = ['Select Material', 'Select Units', 'Configure Batch'];

const BatchCreationModal = ({ isOpen, onClose }) => {
  const { cases } = useLab();
  const { equipment, materials, batches, createBatch, loading: prodLoading } = useProduction();
  const { addToast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  
  // Selection State
  const [selectedMaterialGroup, setSelectedMaterialGroup] = useState(null);
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [scheduleTime, setScheduleTime] = useState(new Date());

  // Computed State
  const [conflicts, setConflicts] = useState([]);
  const [nestingLayout, setNestingLayout] = useState(null);

  // 1. Group Candidates
  const groupedCandidates = useMemo(() => {
    return BatchScheduler.getProductionCandidates(cases);
  }, [cases]);

  // 2. Filter Machines & Inventory
  const compatibleMachines = useMemo(() => {
    if (!selectedMaterialGroup) return [];
    return BatchScheduler.getCompatibleMachines(selectedMaterialGroup, equipment);
  }, [selectedMaterialGroup, equipment]);

  const compatibleInventory = useMemo(() => {
    if (!selectedMaterialGroup) return [];
    const search = selectedMaterialGroup.split(' ')[0].toLowerCase();
    return materials.filter(m => m.name.toLowerCase().includes(search) && m.stockLevel > 0);
  }, [selectedMaterialGroup, materials]);

  // --- Effects ---

  // Run Nesting Calculation when units or material changes
  useEffect(() => {
    if (selectedUnits.length > 0 && selectedMaterialGroup) {
      // Infer shape from material name (mock logic)
      const type = selectedMaterialGroup.toLowerCase().includes('disc') ? 'Disc' : 'Block';
      const layout = NestingAlgorithm.calculateLayout(selectedUnits, type);
      setNestingLayout(layout);
    }
  }, [selectedUnits, selectedMaterialGroup]);

  // Run Conflict Detection when machine or time changes
  useEffect(() => {
    if (selectedMachineId && selectedUnits.length > 0) {
      const machine = equipment.find(e => e.id === selectedMachineId);
      const duration = BatchScheduler.estimateDurationMinutes(selectedUnits.length, machine.type);
      
      const startTime = new Date().toISOString(); // Assume starting now for check
      const endTime = new Date(Date.now() + duration * 60000).toISOString();

      const foundConflicts = BatchScheduler.detectScheduleConflicts({
        machineId: selectedMachineId,
        startTime: startTime,
        estimatedEndTime: endTime
      }, batches); // Pass all active batches from context

      setConflicts(foundConflicts);
    }
  }, [selectedMachineId, selectedUnits, equipment, batches]);

  // --- Handlers ---

  const handleGroupSelect = (material) => {
    setSelectedMaterialGroup(material);
    setSelectedUnits(groupedCandidates[material]);
    setCurrentStep(1);
  };

  const toggleUnit = (unit) => {
    if (selectedUnits.find(u => u.id === unit.id)) {
      setSelectedUnits(prev => prev.filter(u => u.id !== unit.id));
    } else {
      setSelectedUnits(prev => [...prev, unit]);
    }
  };

  const handleCreate = async () => {
    if (!selectedMachineId || !selectedMaterialId) return;
    if (conflicts.length > 0 && !window.confirm("There are schedule conflicts. Create anyway?")) return;

    const machine = equipment.find(e => e.id === selectedMachineId);
    const duration = BatchScheduler.estimateDurationMinutes(selectedUnits.length, machine.type);
    const endTime = new Date(Date.now() + duration * 60000).toISOString();

    const batchData = {
      type: machine.type.includes('Mill') ? 'Milling' : 'Printing',
      machineId: selectedMachineId,
      materialId: selectedMaterialId,
      caseIds: [...new Set(selectedUnits.map(u => u.caseId))],
      estimatedEndTime: endTime,
      materialConsumed: {
        units: selectedUnits.length,
        percentage: nestingLayout ? nestingLayout.efficiency : 0
      },
      priority: selectedUnits.some(u => u.priority === 'Rush') ? 'RUSH' : 'STANDARD'
    };

    try {
      await createBatch(batchData);
      addToast(`Batch created with ${selectedUnits.length} units`, 'success');
      onClose();
    } catch (err) {
      addToast("Failed to create batch", 'error');
    }
  };

  // --- Render Steps ---

  const renderStepContent = () => {
    if (currentStep === 0) {
      const groups = Object.keys(groupedCandidates);
      if (groups.length === 0) return <div className="empty-state">No pending units found.</div>;

      return (
        <div className={styles.groupGrid}>
          {groups.map(mat => (
            <div key={mat} className={styles.materialCard} onClick={() => handleGroupSelect(mat)}>
              <span className={styles.matTitle}>{mat}</span>
              <span className={styles.matCount}>{groupedCandidates[mat].length} Units Waiting</span>
            </div>
          ))}
        </div>
      );
    }

    if (currentStep === 1) {
      const candidates = groupedCandidates[selectedMaterialGroup] || [];
      return (
        <div className={styles.selectionList}>
          {candidates.map(unit => (
            <label key={unit.id} className={styles.unitRow}>
              <input 
                type="checkbox" 
                className={styles.checkbox}
                checked={!!selectedUnits.find(u => u.id === unit.id)}
                onChange={() => toggleUnit(unit)}
              />
              <div className={styles.unitInfo}>
                <span className={styles.unitMain}>
                  #{unit.tooth} - {unit.type}
                  {unit.priority === 'Rush' && <span className={styles.rushBadge}>RUSH</span>}
                </span>
                <span className={styles.unitSub}>
                  {unit.patient} (Dr. {unit.doctor}) • Due: {new Date(unit.dueDate).toLocaleDateString()}
                </span>
              </div>
            </label>
          ))}
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <div className={styles.configForm} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
          
          {/* Left: Configuration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Machine Selection */}
            <div>
              <label className="form-label">Select Equipment</label>
              <div className={styles.machineGrid}>
                {compatibleMachines.map(mac => (
                  <div 
                    key={mac.id}
                    className={`${styles.machineOption} ${selectedMachineId === mac.id ? styles.machineSelected : ''}`}
                    onClick={() => setSelectedMachineId(mac.id)}
                  >
                    <div style={{fontWeight:600}}>{mac.name}</div>
                    <div style={{fontSize:'0.8rem'}}>{mac.status}</div>
                  </div>
                ))}
              </div>
              {/* Conflict Warning */}
              {conflicts.length > 0 && (
                <div style={{ 
                  marginTop: '0.5rem', 
                  padding: '0.75rem', 
                  backgroundColor: '#fef2f2', 
                  border: '1px solid #fee2e2', 
                  borderRadius: '0.5rem',
                  color: '#b91c1c',
                  fontSize: '0.85rem'
                }}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600}}>
                    <IconClock width="14" /> Schedule Conflict Detected
                  </div>
                  <ul style={{ margin: '0.25rem 0 0 1.25rem', padding: 0 }}>
                    {conflicts.map((c, i) => (
                      <li key={i}>{c.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Inventory Selection */}
            <div className="form-group">
              <label>Consume Inventory Lot</label>
              <select 
                value={selectedMaterialId} 
                onChange={(e) => setSelectedMaterialId(e.target.value)}
                className="input"
              >
                <option value="">Select Material...</option>
                {compatibleInventory.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.name} (Lot: {inv.lotNumber}) - {inv.stockLevel} rem.
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: Nesting Preview */}
          <div>
            <label className="form-label" style={{marginBottom: '0.5rem', display: 'block'}}>Nesting Preview (Est.)</label>
            <NestingPreview layout={nestingLayout} />
            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <p>Simulated layout based on unit types.</p>
            </div>
          </div>

        </div>
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Production Batch"
      icon={<IconLayers width="20" />}
      width="800px" // Widened for the 2-column step 3
      footer={
        <div className={styles.footer}>
          {currentStep > 0 ? (
            <button className="button text" onClick={() => setCurrentStep(prev => prev - 1)}>Back</button>
          ) : (
            <button className="button text" onClick={onClose}>Cancel</button>
          )}

          {currentStep < 2 ? (
            <button 
              className="button primary" 
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={currentStep === 1 && selectedUnits.length === 0}
            >
              Next
            </button>
          ) : (
            <button 
              className="button primary" 
              onClick={handleCreate}
              disabled={!selectedMachineId || !selectedMaterialId || prodLoading || conflicts.length > 0}
            >
              {prodLoading ? 'Scheduling...' : 'Start Batch'}
            </button>
          )}
        </div>
      }
    >
      <div className={styles.container}>
        {/* Stepper */}
        <div className={styles.stepper}>
          {STEPS.map((label, idx) => (
            <div key={label} className={`${styles.step} ${idx === currentStep ? styles.stepActive : ''}`}>
              <div className={styles.stepNum}>{idx + 1}</div>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        {renderStepContent()}
      </div>
    </Modal>
  );
};

export default BatchCreationModal;