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
  products, 
  addons,
  getWorkflowsForCategory,   
  error 
}) => {
  return (
   <div className="card">
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle} style={{marginBottom:0, border:0}}>
          <IconTooth width="18" height="18" /> Prescription & Fees
        </h3>
        <button type="button" className="button secondary" onClick={onAddUnit}>
          + Add Item
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
          <p>No items added to this case.</p>
          <button type="button" className="button text" onClick={onAddUnit}>Add First Item</button>
        </div>
      ) : (
        <div className={styles.unitsList}>
          {units.map((unit, index) => (
            <UnitRow 
              key={index} // Ideally utilize a stable ID if available, use Index for creation
              index={index}
              unit={unit}
              onRemove={onRemoveUnit}
              onChange={onUnitChange}
              productCategories={productCategories}
              products={products}
              addons={addons}
              getWorkflowsForCategory={getWorkflowsForCategory}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default UnitsSection;