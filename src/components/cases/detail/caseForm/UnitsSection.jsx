import React from 'react';
import UnitRow from './UnitRow';
import { IconTooth, IconAlert } from '../../../../layouts/components/LabIcons';
import styles from './CaseForm.module.css';

const UnitsSection = ({ 
  units, 
  onAddUnit, 
  onRemoveUnit, 
  onUnitChange, 
  productCategories,
  getWorkflowsForCategory,
  helpers, // { requiresArch, getProductCategory }
  error 
}) => {
  return (
    <div className="card">
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle} style={{marginBottom:0, border:0}}>
          <IconTooth width="18" height="18" /> Prescription Units
        </h3>
        <button type="button" className="button secondary" onClick={onAddUnit}>
          + Add Unit
        </button>
      </div>

      {/* Error Message for Units Array */}
      {error && (
        <div style={{ 
          backgroundColor: 'var(--error-bg)', 
          color: 'var(--error-500)', 
          padding: '0.75rem', 
          borderRadius: '0.5rem', 
          marginBottom: '1rem',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <IconAlert width="16" height="16" />
          {error}
        </div>
      )}

      {units.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No units added to this case.</p>
          <button type="button" className="button text" onClick={onAddUnit}>Add First Unit</button>
        </div>
      ) : (
        <div className={styles.unitsList}>
          {units.map((unit, index) => (
            <UnitRow 
              key={index}
              index={index}
              unit={unit}
              onRemove={onRemoveUnit}
              onChange={onUnitChange}
              productCategories={productCategories}
              getWorkflowsForCategory={getWorkflowsForCategory}
              helpers={helpers}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default UnitsSection;