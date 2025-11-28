import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import { IconLayers, IconClose, IconChevronDown, IconChevronRight } from '../../../layouts/components/LabIcons';
import styles from './WorkflowFormModal.module.css';

const CATEGORIES = [
  "Crown & Bridge", "Removables", "Implants", "Orthodontics", "Repairs", "Services"
];

// Simple Icon Wrappers for Move buttons
const IconUp = () => <IconChevronDown style={{ transform: 'rotate(180deg)' }} width="14" height="14" />;
const IconDown = () => <IconChevronDown width="14" height="14" />;

const WorkflowFormModal = ({ isOpen, onClose, onSubmit, initialData, isDeleting, allStages }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Crown & Bridge',
    description: '',
    stages: [] // Array of stage IDs
  });

  const [selectedStageId, setSelectedStageId] = useState('');

  // Hydrate form
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          category: initialData.category || 'Crown & Bridge',
          description: initialData.description || '',
          stages: initialData.stages || []
        });
      } else {
        setFormData({
          name: '',
          category: 'Crown & Bridge',
          description: '',
          stages: ['stage-new', 'stage-received', 'stage-shipped'] // Default skeleton
        });
      }
    }
  }, [initialData, isOpen]);

  // --- Handlers ---
  
  const handleAddStage = () => {
    if (!selectedStageId) return;
    // Insert before 'stage-shipped' if it exists, otherwise at end
    const shippedIndex = formData.stages.indexOf('stage-shipped');
    const newStages = [...formData.stages];
    
    if (shippedIndex !== -1) {
      newStages.splice(shippedIndex, 0, selectedStageId);
    } else {
      newStages.push(selectedStageId);
    }

    setFormData(prev => ({ ...prev, stages: newStages }));
    setSelectedStageId('');
  };

  const handleRemoveStage = (index) => {
    const newStages = formData.stages.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, stages: newStages }));
  };

  const handleMove = (index, direction) => {
    const newStages = [...formData.stages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Bounds check
    if (targetIndex < 0 || targetIndex >= newStages.length) return;

    // Swap
    const temp = newStages[targetIndex];
    newStages[targetIndex] = newStages[index];
    newStages[index] = temp;

    setFormData(prev => ({ ...prev, stages: newStages }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Filter available stages to exclude simple duplicates logic if desired, 
  // but for now allow all system stages.
  const availableOptions = allStages.filter(s => !s.isSystem || true); 

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Workflow" : "Create Workflow"}
      icon={<IconLayers width="20" />}
      width="650px"
      footer={
        <div className={styles.footer}>
          {initialData ? (
            <button className="button secondary danger" onClick={isDeleting}>Delete Workflow</button>
          ) : <div />}
          <div className={styles.actions}>
            <button className="button text" onClick={onClose}>Cancel</button>
            <button className="button primary" onClick={handleSubmit} disabled={formData.stages.length < 2}>
              Save Sequence
            </button>
          </div>
        </div>
      }
    >
      <div className={styles.form}>
        
        {/* SECTION 1: INFO */}
        <div className={styles.section}>
          <div className={styles.grid2}>
            <div className="form-group">
              <label>Workflow Name *</label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Zirconia Fast Track"
              />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select 
                value={formData.category} 
                onChange={e => setFormData({...formData, category: e.target.value})}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <input 
              type="text" 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Brief details about this process..."
            />
          </div>
        </div>

        {/* SECTION 2: STAGE BUILDER */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Production Sequence</h4>
          
          <div className={styles.builderContainer}>
            {/* Add Control */}
            <div className={styles.stageControl}>
              <select 
                className={styles.stageSelect}
                value={selectedStageId}
                onChange={e => setSelectedStageId(e.target.value)}
              >
                <option value="">Select a stage to add...</option>
                {allStages
                  .sort((a,b) => a.order - b.order)
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      {s.label} ({s.category})
                    </option>
                ))}
              </select>
              <button 
                className="button secondary small" 
                onClick={handleAddStage}
                disabled={!selectedStageId}
              >
                + Add Step
              </button>
            </div>

            {/* List */}
            <div className={styles.sequenceList}>
              {formData.stages.map((stageId, index) => {
                const stageDef = allStages.find(s => s.id === stageId);
                const label = stageDef ? stageDef.label : stageId;
                
                return (
                  <div key={`${stageId}-${index}`} className={styles.stageRow}>
                    <div className={styles.stageInfo}>
                      <span className={styles.stepNum}>{index + 1}</span>
                      <span className={styles.stageName}>{label}</span>
                    </div>
                    <div className={styles.rowActions}>
                      <button 
                        className={styles.moveBtn} 
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0}
                        title="Move Up"
                      >
                        <IconUp />
                      </button>
                      <button 
                        className={styles.moveBtn} 
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === formData.stages.length - 1}
                        title="Move Down"
                      >
                        <IconDown />
                      </button>
                      <button 
                        className={styles.removeBtn} 
                        onClick={() => handleRemoveStage(index)}
                        title="Remove Step"
                      >
                        <IconClose width="14" height="14" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {formData.stages.length === 0 && (
                <div className={styles.emptyState}>No stages defined. Add steps above.</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
};

export default WorkflowFormModal;
