import React from 'react';
import { TOOTH_NUMBERS } from '../../../../constants/catalog';
import { IconClose, IconDrill, IconCheck } from '../../../../layouts/components/LabIcons';
import styles from './CaseForm.module.css';

const ARCH_OPTIONS = ["Upper", "Lower", "Both"];

const UnitRow = ({ 
  unit, 
  index, 
  onRemove, 
  onChange, 
  productCategories, 
  products,
  addons,
  getWorkflowsForCategory
}) => {
  
  // 1. DERIVE CONTEXT FROM SELECTED PRODUCT
  const selectedProduct = products.find(p => p.name === unit.type);
  const category = selectedProduct?.category || '';
  const productId = selectedProduct?.id;

  // 2. DETERMINE VISIBILITY FLAGS
  const isFee = category === 'Fees';
  const isService = category === 'Services';
  const isNonPhysical = isFee || isService;

  const showTooth = !isNonPhysical && (category === 'Crown & Bridge' || category === 'Implants');
  const showArch = !isNonPhysical && (category === 'Removables' || category === 'Orthodontics');
  const showShade = !isNonPhysical && category !== 'Orthodontics'; // Usually Ortho doesn't need shade unless colored
  
  const validWorkflows = getWorkflowsForCategory(category);

  // 3. FILTER ADD-ONS
  // Only show addons linked to this product ID in addons.json
  const availableAddons = (!productId || !addons) ? [] : addons.filter(addon => 
    addon.applicableProducts.includes(productId)
  );

  const handleAddonToggle = (addonId) => {
    const currentIds = unit.addonIds || [];
    let newIds;
    if (currentIds.includes(addonId)) {
      newIds = currentIds.filter(id => id !== addonId);
    } else {
      newIds = [...currentIds, addonId];
    }
    onChange(index, 'addonIds', newIds);
  };

  return (
    <div className={styles.unitRow}>
      {/* HEADER */}
      <div className={styles.unitHeader}>
        <div className={styles.unitTitle}>
            <span className={styles.unitIndex}>Item #{index + 1}</span>
            {selectedProduct && <span className={styles.categoryBadge}>{category}</span>}
        </div>
        <button 
          type="button" 
          className={styles.removeBtn}
          onClick={() => onRemove(index)}
          title="Remove Item"
        >
          <IconClose width="16" height="16" />
        </button>
      </div>

      <div className={styles.unitMainGrid}>
        
        {/* 1. PRODUCT SELECTOR (Always Visible) */}
        <div className="form-group" style={{ flex: 2, minWidth: '250px' }}>
          <label>Product / Service</label>
          <select 
            value={unit.type} 
            onChange={(e) => onChange(index, 'type', e.target.value)}
            className={styles.productSelect}
          >
            <option value="" disabled>Select Item...</option>
            {Object.entries(productCategories).map(([cat, items]) => (
              <optgroup key={cat} label={cat}>
                {items.map(prod => (
                  <option key={prod.id} value={prod.name}>{prod.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* 2. CONDITIONAL: WORKFLOW */}
        {!isNonPhysical && validWorkflows.length > 0 && (
          <div className="form-group" style={{ flex: 1 }}>
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

        {/* 3. CONDITIONAL: TOOTH / ARCH */}
        {showTooth && (
            <div className="form-group" style={{ flex: 0.5, minWidth: '80px' }}>
            <label>Tooth</label>
            <select 
                value={unit.tooth || ''} 
                onChange={(e) => onChange(index, 'tooth', e.target.value)}
            >
                {TOOTH_NUMBERS.map(num => (
                <option key={num} value={num}>#{num}</option>
                ))}
            </select>
            </div>
        )}

        {showArch && (
            <div className="form-group" style={{ flex: 0.5, minWidth: '100px' }}>
            <label>Arch</label>
            <select
                value={unit.arch || ''}
                onChange={(e) => onChange(index, 'arch', e.target.value)}
            >
                {ARCH_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
            </div>
        )}

        {/* 4. CONDITIONAL: SHADE */}
        {showShade && (
          <div className="form-group" style={{ flex: 0.5, minWidth: '80px' }}>
            <label>Shade</label>
            <input 
              type="text" 
              value={unit.shade || ''} 
              onChange={(e) => onChange(index, 'shade', e.target.value)}
              placeholder="e.g. A2"
            />
          </div>
        )}
      </div>

      {/* 5. ADD-ONS SECTION (Only if applicable) */}
      {availableAddons.length > 0 && (
        <div className={styles.addonSection}>
            <label className={styles.addonLabel}>Available Add-ons:</label>
            <div className={styles.addonGrid}>
                {availableAddons.map(addon => {
                    const isChecked = (unit.addonIds || []).includes(addon.id);
                    return (
                        <div 
                            key={addon.id} 
                            className={`${styles.addonChip} ${isChecked ? styles.addonChecked : ''}`}
                            onClick={() => handleAddonToggle(addon.id)}
                        >
                            {isChecked ? <IconCheck width="12" /> : <div className={styles.emptyCheck} />}
                            <span>{addon.name} (+${addon.defaultPrice})</span>
                        </div>
                    );
                })}
            </div>
        </div>
      )}

      {/* 6. INSTRUCTIONS (Always Visible) */}
      <div className={styles.unitExtras}>
        <input 
          type="text"
          className={styles.instructionInput}
          value={unit.instructions || ''}
          onChange={(e) => onChange(index, 'instructions', e.target.value)}
          placeholder={isFee ? "Reason for fee..." : "Specific instructions for this unit..."}
        />
      </div>
    </div>
  );
};

export default UnitRow;