import React, { useState } from 'react';
import Odontogram from './Odontogram';
import styles from './PrescriptionForm.module.css';

/**
 * Smart Prescription Form with Clinical Intelligence
 * Handles bridges, implants, dentures with automatic unit creation
 */

const RESTORATION_TYPES = {
  CROWN: {
    label: 'Crown',
    category: 'Fixed',
    requiresRange: false,
    defaultMaterial: 'Zirconia',
    materials: ['Zirconia', 'E.max', 'PFM', 'Gold', 'Acrylic Temp'],
    unitCount: 1
  },
  BRIDGE: {
    label: 'Bridge',
    category: 'Fixed',
    requiresRange: true,
    defaultMaterial: 'Zirconia',
    materials: ['Zirconia', 'E.max', 'PFM', 'Gold'],
    unitCount: 'dynamic' // Based on tooth range
  },
  IMPLANT_CROWN: {
    label: 'Implant Crown',
    category: 'Implant',
    requiresRange: false,
    defaultMaterial: 'Zirconia',
    materials: ['Zirconia', 'E.max', 'PFM'],
    unitCount: 1,
    extraFields: ['implantSystem', 'abutmentType']
  },
  IMPLANT_BRIDGE: {
    label: 'Implant Bridge',
    category: 'Implant',
    requiresRange: true,
    defaultMaterial: 'Zirconia',
    materials: ['Zirconia', 'E.max', 'PFM'],
    unitCount: 'dynamic',
    extraFields: ['implantSystem', 'abutmentType']
  },
  VENEER: {
    label: 'Veneer',
    category: 'Cosmetic',
    requiresRange: false,
    defaultMaterial: 'E.max',
    materials: ['E.max', 'Feldspathic Porcelain', 'Composite'],
    unitCount: 1
  },
  INLAY_ONLAY: {
    label: 'Inlay / Onlay',
    category: 'Fixed',
    requiresRange: false,
    defaultMaterial: 'E.max',
    materials: ['E.max', 'Zirconia', 'Gold'],
    unitCount: 1
  },
  DENTURE_FULL: {
    label: 'Full Denture',
    category: 'Removable',
    requiresRange: false,
    arch: true,
    materials: ['Acrylic', 'Valplast', 'TCS (Tooth Colored Base)'],
    unitCount: 1
  },
  DENTURE_PARTIAL: {
    label: 'Partial Denture',
    category: 'Removable',
    requiresRange: true,
    arch: true,
    materials: ['Cast Metal Frame', 'Valplast', 'Acrylic'],
    unitCount: 1
  }
};

const IMPLANT_SYSTEMS = [
  'Straumann',
  'Nobel Biocare',
  'Zimmer Biomet',
  'BioHorizons',
  'Dentsply Sirona',
  'MIS',
  'Hiossen',
  'Other'
];

const SHADE_SYSTEMS = {
  VITA_CLASSICAL: ['A1', 'A2', 'A3', 'A3.5', 'A4', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4', 'D2', 'D3', 'D4'],
  VITA_3D: ['1M1', '1M2', '2M1', '2M2', '2M3', '2R1.5', '2R2.5', '3M1', '3M2', '3M3', '3R1.5', '3R2.5', '4M1', '4M2', '4M3', '5M1', '5M2', '5M3']
};

const PrescriptionForm = ({ onSubmit, onCancel, existingUnits = [] }) => {
  // Persistent odontogram selection
  const [selectedTeeth, setSelectedTeeth] = useState([]);
  
  // Current prescription being built
  const [currentRestoration, setCurrentRestoration] = useState(null); // RESTORATION_TYPES key
  const [currentMaterial, setCurrentMaterial] = useState('');
  const [currentShade, setCurrentShade] = useState('');
  const [currentShadeSystem, setCurrentShadeSystem] = useState('VITA_CLASSICAL');
  const [currentImplantSystem, setCurrentImplantSystem] = useState('');
  const [currentAbutmentType, setCurrentAbutmentType] = useState('Custom Abutment');
  const [currentInstructions, setCurrentInstructions] = useState('');
  const [currentArch, setCurrentArch] = useState('Upper');
  
  // Completed prescriptions list
  const [prescriptions, setPrescriptions] = useState([]);

  const restorationConfig = currentRestoration ? RESTORATION_TYPES[currentRestoration] : null;
  const selectionMode = restorationConfig?.requiresRange ? 'range' : 'multiple';

  // Get already used teeth from existing units and current prescriptions
  const usedTeeth = [
    ...existingUnits.map(u => u.tooth).filter(Boolean),
    ...prescriptions.flatMap(p => p.units.map(u => u.tooth).filter(Boolean))
  ];
  
  const highlightedTeeth = {};
  existingUnits.forEach(unit => {
    if (unit.tooth) {
      highlightedTeeth[unit.tooth] = {
        color: '#10b981',
        label: unit.type?.split(' ')[0] || 'Unit'
      };
    }
  });
  
  // Highlight current prescriptions
  prescriptions.forEach(p => {
    p.units.forEach(unit => {
      if (unit.tooth) {
        highlightedTeeth[unit.tooth] = {
          color: '#3b82f6',
          label: p.label.split(' ')[0]
        };
      }
    });
  });

  const handleRestorationTypeSelect = (type) => {
    setCurrentRestoration(type);
    const resto = RESTORATION_TYPES[type];
    if (resto) {
      setCurrentMaterial(resto.defaultMaterial || resto.materials[0]);
      // Keep selected teeth - don't clear selection when changing type
    }
  };

  const handleAddToPrescription = () => {
    if (!currentRestoration) {
      alert('Please select restoration type');
      return;
    }

    if (restorationConfig.arch) {
      // Arch-based restoration (dentures)
      const newPrescription = {
        id: `rx-${Date.now()}`,
        type: currentRestoration,
        label: `${RESTORATION_TYPES[currentRestoration].label} - ${currentArch}`,
        arch: currentArch,
        material: currentMaterial,
        shade: restorationConfig.category === 'Removable' ? currentShade : null,
        instructions: currentInstructions,
        units: [{
          type: RESTORATION_TYPES[currentRestoration].label,
          arch: currentArch,
          material: currentMaterial,
          shade: currentShade,
          instructions
        }]
      };
      setPrescriptions([...prescriptions, newPrescription]);
    } else {
      // Tooth-based restoration
      if (selectedTeeth.length === 0) {
        alert('Please select teeth');
        return;
      }

      if (currentRestoration === 'BRIDGE' && selectedTeeth.length < 3) {
        alert('Bridge requires at least 3 teeth (2 abutments + 1 pontic)');
        return;
      }

      const units = selectedTeeth.map((tooth, idx) => {
        let unitType = RESTORATION_TYPES[currentRestoration].label;
        
        // For bridges, mark abutments and pontics
        if (currentRestoration === 'BRIDGE') {
          if (idx === 0 || idx === selectedTeeth.length - 1) {
            unitType = `${unitType} Abutment`;
          } else {
            unitType = `${unitType} Pontic`;
          }
        }

        return {
          tooth,
          type: unitType,
          material: currentMaterial,
          shade: currentShade,
          implantSystem: restorationConfig.extraFields?.includes('implantSystem') ? currentImplantSystem : null,
          abutmentType: restorationConfig.extraFields?.includes('abutmentType') ? currentAbutmentType : null,
          instructions: idx === 0 ? currentInstructions : '' // Only first unit gets instructions
        };
      });

      const newPrescription = {
        id: `rx-${Date.now()}`,
        type: currentRestoration,
        label: `${RESTORATION_TYPES[currentRestoration].label} #${selectedTeeth.sort((a,b) => a-b).join(', ')}`,
        teeth: selectedTeeth,
        material: currentMaterial,
        shade: currentShade,
        implantSystem: currentImplantSystem,
        abutmentType: currentAbutmentType,
        instructions: currentInstructions,
        units
      };

      setPrescriptions([...prescriptions, newPrescription]);
    }

    // Reset form
    setSelectedTeeth([]);
    setCurrentInstructions('');
  };

  const handleRemovePrescription = (id) => {
    setPrescriptions(prescriptions.filter(p => p.id !== id));
  };

  const handleSubmitAll = () => {
    if (prescriptions.length === 0) {
      alert('Please add at least one restoration');
      return;
    }

    // Flatten all units from all prescriptions
    const allUnits = prescriptions.flatMap(p => p.units);
    onSubmit(allUnits);
  };

  return (
    <div className={styles.prescriptionForm}>
      <div className={styles.header}>
        <h3>Prescription Entry</h3>
        <p className={styles.subtitle}>Select teeth and add restorations to build your prescription</p>
      </div>

      {/* ALWAYS VISIBLE: Odontogram */}
      <div className={styles.section}>
        <label className={styles.label}>👄 Select Teeth</label>
        <Odontogram
          selectedTeeth={selectedTeeth}
          onSelectionChange={setSelectedTeeth}
          mode={selectionMode}
          disabledTeeth={usedTeeth}
          highlightedTeeth={highlightedTeeth}
        />
      </div>

      {/* Restoration Type Selection - Always visible */}
      <div className={styles.section}>
        <label className={styles.label}>🦷 Restoration Type</label>
        <div className={styles.restorationGrid}>
          {Object.entries(RESTORATION_TYPES).map(([key, resto]) => (
            <button
              key={key}
              type="button"
              className={`${styles.restorationCard} ${currentRestoration === key ? styles.selected : ''}`}
              onClick={() => handleRestorationTypeSelect(key)}
            >
              <div className={styles.restoName}>{resto.label}</div>
              <div className={styles.restoCategory}>{resto.category}</div>
            </button>
          ))}
        </div>
      </div>

      {/* CONDITIONAL: Details for selected restoration type */}
      {currentRestoration && (
        <>
          {/* Arch Selection for dentures */}
          {restorationConfig.arch && (
            <div className={styles.section}>
              <label className={styles.label}>Select Arch</label>
              <div className={styles.archButtons}>
                <button
                  type="button"
                  className={`${styles.archBtn} ${currentArch === 'Upper' ? styles.active : ''}`}
                  onClick={() => setCurrentArch('Upper')}
                >
                  Upper Arch
                </button>
                <button
                  type="button"
                  className={`${styles.archBtn} ${currentArch === 'Lower' ? styles.active : ''}`}
                  onClick={() => setCurrentArch('Lower')}
                >
                  Lower Arch
                </button>
                <button
                  type="button"
                  className={`${styles.archBtn} ${currentArch === 'Both' ? styles.active : ''}`}
                  onClick={() => setCurrentArch('Both')}
                >
                  Both Arches
                </button>
              </div>
            </div>
          )}

          {/* Material Selection */}
          <div className={styles.section}>
            <label className={styles.label}>Material</label>
            <select
              value={currentMaterial}
              onChange={(e) => setCurrentMaterial(e.target.value)}
              className={styles.select}
            >
              {restorationConfig.materials.map(mat => (
                <option key={mat} value={mat}>{mat}</option>
              ))}
            </select>
          </div>

          {/* Shade Selection */}
          <div className={styles.section}>
            <label className={styles.label}>Shade</label>
            <div className={styles.shadeRow}>
              <select
                value={currentShadeSystem}
                onChange={(e) => setCurrentShadeSystem(e.target.value)}
                className={styles.select}
                style={{flex: '0 0 200px'}}
              >
                <option value="VITA_CLASSICAL">VITA Classical</option>
                <option value="VITA_3D">VITA 3D Master</option>
              </select>
              <select
                value={currentShade}
                onChange={(e) => setCurrentShade(e.target.value)}
                className={styles.select}
              >
                <option value="">Select Shade...</option>
                {SHADE_SYSTEMS[currentShadeSystem].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Implant-specific fields */}
          {restorationConfig.extraFields?.includes('implantSystem') && (
            <>
              <div className={styles.section}>
                <label className={styles.label}>Implant System</label>
                <select
                  value={currentImplantSystem}
                  onChange={(e) => setCurrentImplantSystem(e.target.value)}
                  className={styles.select}
                >
                  <option value="">Select System...</option>
                  {IMPLANT_SYSTEMS.map(sys => (
                    <option key={sys} value={sys}>{sys}</option>
                  ))}
                </select>
              </div>

              <div className={styles.section}>
                <label className={styles.label}>Abutment Type</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radio}>
                    <input
                      type="radio"
                      value="Custom Abutment"
                      checked={currentAbutmentType === 'Custom Abutment'}
                      onChange={(e) => setCurrentAbutmentType(e.target.value)}
                    />
                    Custom Abutment
                  </label>
                  <label className={styles.radio}>
                    <input
                      type="radio"
                      value="Stock Abutment"
                      checked={currentAbutmentType === 'Stock Abutment'}
                      onChange={(e) => setCurrentAbutmentType(e.target.value)}
                    />
                    Stock Abutment
                  </label>
                  <label className={styles.radio}>
                    <input
                      type="radio"
                      value="Screw Retained"
                      checked={currentAbutmentType === 'Screw Retained'}
                      onChange={(e) => setCurrentAbutmentType(e.target.value)}
                    />
                    Screw Retained
                  </label>
                </div>
              </div>
            </>
          )}

          {/* Special Instructions */}
          <div className={styles.section}>
            <label className={styles.label}>Special Instructions</label>
            <textarea
              value={currentInstructions}
              onChange={(e) => setCurrentInstructions(e.target.value)}
              className={styles.textarea}
              placeholder="Add any special instructions, shade notes, or preferences..."
              rows="3"
            />
          </div>

          <button
            type="button"
            onClick={handleAddToPrescription}
            className="button primary"
            style={{width: '100%'}}
          >
            + Add to Prescription
          </button>
        </>
      )}

      {/* Prescription Summary */}
      {prescriptions.length > 0 && (
        <div className={styles.prescriptionSummary}>
          <h4>Current Prescription ({prescriptions.length} item{prescriptions.length > 1 ? 's' : ''})</h4>
          <div className={styles.prescriptionList}>
            {prescriptions.map(rx => (
              <div key={rx.id} className={styles.prescriptionItem}>
                <div className={styles.rxHeader}>
                  <strong>{rx.label}</strong>
                  <button
                    type="button"
                    onClick={() => handleRemovePrescription(rx.id)}
                    className={styles.removeBtn}
                  >
                    ×
                  </button>
                </div>
                <div className={styles.rxDetails}>
                  <span>{rx.material}</span>
                  {rx.shade && <span>• Shade: {rx.shade}</span>}
                  {rx.implantSystem && <span>• {rx.implantSystem}</span>}
                  <span>• {rx.units.length} unit{rx.units.length > 1 ? 's' : ''}</span>
                </div>
                {rx.instructions && (
                  <div className={styles.rxInstructions}>{rx.instructions}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <div className={styles.unitCount}>
          {prescriptions.length > 0 && (
            <span className={styles.countBadge}>
              {prescriptions.reduce((sum, p) => sum + p.units.length, 0)} unit{prescriptions.reduce((sum, p) => sum + p.units.length, 0) !== 1 ? 's' : ''} ready
            </span>
          )}
        </div>
        <div className={styles.actionButtons}>
          <button type="button" onClick={onCancel} className="button secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmitAll}
            className="button primary"
            disabled={prescriptions.length === 0}
          >
            ✓ Create Case
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionForm;
