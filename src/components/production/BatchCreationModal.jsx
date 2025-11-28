/* eslint-disable no-unused-vars */
import React, { useState, useMemo } from 'react';
import Modal from '../common/Modal';
import { useLab, useProduction, useToast } from '../../contexts';
import { BatchScheduler } from '../../utils/production/batchScheduler';
import { IconLayers, IconCheck, IconAlert } from '../../layouts/components/LabIcons';
import styles from './BatchCreationModal.module.css';

const STEPS = ['Select Material', 'Select Units', 'Configure Batch'];

const BatchCreationModal = ({ isOpen, onClose }) => {
  const { cases } = useLab();
  const { equipment, materials, createBatch, loading: prodLoading } = useProduction();
  const { addToast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  
  // Selection State
  const [selectedMaterialGroup, setSelectedMaterialGroup] = useState(null); // String (Material Name)
  const [selectedUnits, setSelectedUnits] = useState([]); // Array of unit objects
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState(''); // Inventory Item ID

  // 1. Group Candidates
  const groupedCandidates = useMemo(() => {
    return BatchScheduler.getProductionCandidates(cases);
  }, [cases]);

  // 2. Filter Machines & Materials based on selection
  const compatibleMachines = useMemo(() => {
    if (!selectedMaterialGroup) return [];
    return BatchScheduler.getCompatibleMachines(selectedMaterialGroup, equipment);
  }, [selectedMaterialGroup, equipment]);

  const compatibleInventory = useMemo(() => {
    if (!selectedMaterialGroup) return [];
    // Fuzzy match material name to inventory name
    const search = selectedMaterialGroup.split(' ')[0].toLowerCase();
    return materials.filter(m => m.name.toLowerCase().includes(search) && m.stockLevel > 0);
  }, [selectedMaterialGroup, materials]);

  // --- Handlers ---

  const handleGroupSelect = (material) => {
    setSelectedMaterialGroup(material);
    // Pre-select all units in this group
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

    const machine = equipment.find(e => e.id === selectedMachineId);
    const duration = BatchScheduler.estimateDurationMinutes(selectedUnits.length, machine.type);
    const endTime = new Date(Date.now() + duration * 60000).toISOString();

    const batchData = {
      type: machine.type.includes('Mill') ? 'Milling' : 'Printing', // Simple inference
      machineId: selectedMachineId,
      materialId: selectedMaterialId,
      caseIds: [...new Set(selectedUnits.map(u => u.caseId))], // Unique Case IDs
      estimatedEndTime: endTime,
      materialConsumed: {
        units: selectedUnits.length, // Simplified consumption logic
        percentage: (selectedUnits.length * 5) // Mock logic
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
                  {/* Mock logic for rush check since we don't have tags here easily */}
                  {unit.caseNumber.endsWith('8') && <span className={styles.rushBadge}>RUSH</span>}
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
        <div className={styles.configForm}>
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
              {compatibleMachines.length === 0 && <div style={{color:'var(--text-secondary)'}}>No compatible machines found.</div>}
            </div>
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

          {/* Warnings */}
          {compatibleInventory.length === 0 && (
            <div className={styles.stockWarning}>
              <IconAlert width="18" />
              <span>No matching inventory found in stock.</span>
            </div>
          )}
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
      width="700px"
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
              disabled={!selectedMachineId || !selectedMaterialId || prodLoading}
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