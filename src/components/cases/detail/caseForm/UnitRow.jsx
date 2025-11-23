import React from 'react';
import { TOOTH_NUMBERS } from '../../../../constants/catalog';
import { IconClose } from '../../../../layouts/components/LabIcons';
import styles from './CaseForm.module.css';

const ARCH_OPTIONS = ["Upper", "Lower", "Both"];

const UnitRow = ({ 
  unit, 
  index, 
  onRemove, 
  onChange, 
  productCategories, 
  getWorkflowsForCategory,
  helpers // { requiresArch, getProductCategory }
}) => {
  const { requiresArch, getProductCategory } = helpers;

  // Derive state for this specific unit
  const showArch = requiresArch(unit.type);
  const category = getProductCategory(unit.type);
  const validWorkflows = getWorkflowsForCategory(category);

  return (
    <div className={styles.unitRow}>
      {/* Header: Index & Remove */}
      <div className={styles.unitHeader}>
        <span className={styles.unitIndex}>#{index + 1}</span>
        <button 
          type="button" 
          className={styles.removeBtn}
          onClick={() => onRemove(index)}
          title="Remove Unit"
        >
          <IconClose width="14" height="14" />
        </button>
      </div>

      <div className={styles.unitMainGrid}>
        
        {/* Position Selector (Tooth or Arch) */}
        <div className="form-group">
          <label>{showArch ? 'Arch' : 'Tooth'}</label>
          {showArch ? (
            <select
              value={unit.arch || ''}
              onChange={(e) => onChange(index, 'arch', e.target.value)}
            >
              {ARCH_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <select 
              value={unit.tooth || ''} 
              onChange={(e) => onChange(index, 'tooth', e.target.value)}
            >
              {TOOTH_NUMBERS.map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          )}
        </div>

        {/* Product Type Selector */}
        <div className="form-group" style={{ flex: 2 }}>
          <label>Product / Service</label>
          <select 
            value={unit.type} 
            onChange={(e) => onChange(index, 'type', e.target.value)}
          >
            {Object.entries(productCategories).map(([cat, items]) => (
              <optgroup key={cat} label={cat}>
                {items.map(prod => (
                  <option key={prod.id} value={prod.name}>{prod.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Dynamic Workflow Selector */}
        {validWorkflows.length > 0 && (
          <div className="form-group" style={{ flex: 1.5 }}>
            <label>Workflow</label>
            <select
              value={unit.workflowId || ''}
              onChange={(e) => onChange(index, 'workflowId', e.target.value)}
            >
              {validWorkflows.map(wf => (
                <option key={wf.id} value={wf.id}>{wf.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Shade Input */}
        <div className="form-group">
          <label>Shade</label>
          <input 
            type="text" 
            value={unit.shade} 
            onChange={(e) => onChange(index, 'shade', e.target.value)}
            placeholder="A2..."
          />
        </div>
      </div>

      {/* Instructions */}
      <div className={styles.unitExtras}>
        <input 
          type="text"
          className={styles.instructionInput}
          value={unit.instructions}
          onChange={(e) => onChange(index, 'instructions', e.target.value)}
          placeholder="Specific instructions for this unit..."
        />
      </div>
    </div>
  );
};

export default UnitRow;