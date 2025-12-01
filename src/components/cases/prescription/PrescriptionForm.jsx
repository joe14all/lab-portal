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
    unitCount: 1,
    color: '#2563eb' // Strong Blue
  },
  BRIDGE: {
    label: 'Bridge',
    category: 'Fixed',
    requiresRange: true,
    defaultMaterial: 'Zirconia',
    materials: ['Zirconia', 'E.max', 'PFM', 'Gold'],
    unitCount: 'dynamic',
    color: '#7c3aed' // Strong Purple
  },
  IMPLANT_CROWN: {
    label: 'Implant Crown',
    category: 'Implant',
    requiresRange: false,
    defaultMaterial: 'Zirconia',
    materials: ['Zirconia', 'E.max', 'PFM'],
    unitCount: 1,
    extraFields: ['implantSystem', 'abutmentType'],
    color: '#0891b2' // Strong Cyan
  },
  IMPLANT_BRIDGE: {
    label: 'Implant Bridge',
    category: 'Implant',
    requiresRange: true,
    defaultMaterial: 'Zirconia',
    materials: ['Zirconia', 'E.max', 'PFM'],
    unitCount: 'dynamic',
    extraFields: ['implantSystem', 'abutmentType'],
    color: '#0e7490' // Dark Cyan
  },
  VENEER: {
    label: 'Veneer',
    category: 'Cosmetic',
    requiresRange: false,
    defaultMaterial: 'E.max',
    materials: ['E.max', 'Feldspathic Porcelain', 'Composite'],
    unitCount: 1,
    color: '#db2777' // Strong Pink
  },
  INLAY_ONLAY: {
    label: 'Inlay / Onlay',
    category: 'Fixed',
    requiresRange: false,
    defaultMaterial: 'E.max',
    materials: ['E.max', 'Zirconia', 'Gold'],
    unitCount: 1,
    extraFields: ['surfaces'],
    color: '#ea580c' // Strong Orange
  },
  DENTURE_FULL: {
    label: 'Full Denture',
    category: 'Removable',
    requiresRange: false,
    arch: true,
    materials: ['Acrylic', 'Valplast', 'TCS (Tooth Colored Base)'],
    unitCount: 1,
    color: '#dc2626' // Strong Red
  },
  DENTURE_PARTIAL: {
    label: 'Partial Denture',
    category: 'Removable',
    requiresRange: true,
    arch: true,
    materials: ['Cast Metal Frame', 'Valplast', 'Acrylic'],
    unitCount: 1,
    extraFields: ['rpdComponents'],
    color: '#c2410c' // Dark Orange
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

const TOOTH_SURFACES = ['M', 'O', 'D', 'I', 'B', 'L', 'F'];

const RPD_COMPONENTS = {
  CLASPS: ['Circumferential Clasp', 'Akers Clasp', 'C-Clasp', 'I-Bar', 'Ring Clasp', 'Back Action Clasp'],
  RESTS: ['Occlusal Rest', 'Cingulum Rest', 'Incisal Rest'],
  CONNECTORS_MAJOR: ['Palatal Strap', 'Palatal Plate', 'Horseshoe', 'Lingual Bar', 'Lingual Plate', 'Kennedy Bar'],
  CONNECTORS_MINOR: ['Minor Connector', 'Approach Arm'],
  OTHER: ['Reciprocal Arm', 'Indirect Retainer', 'Denture Base', 'Artificial Teeth']
};

const PrescriptionForm = ({ onSubmit, onCancel, existingUnits = [] }) => {
  // Persistent odontogram selection
  const [selectedTeeth, setSelectedTeeth] = useState([]);
  const [toothRoles, setToothRoles] = useState({}); // { toothNum: 'retainer' | 'pontic' | 'abutment' | 'rpd_component' }
  
  // Current prescription being built
  const [currentRestoration, setCurrentRestoration] = useState(null); // RESTORATION_TYPES key
  const [currentMaterial, setCurrentMaterial] = useState('');
  const [currentShade, setCurrentShade] = useState('');
  const [currentShadeSystem, setCurrentShadeSystem] = useState('VITA_CLASSICAL');
  const [currentImplantSystem, setCurrentImplantSystem] = useState('');
  const [currentAbutmentType, setCurrentAbutmentType] = useState('Custom Abutment');
  const [currentInstructions, setCurrentInstructions] = useState('');
  const [currentArch, setCurrentArch] = useState('Upper');
  const [selectedArchForDenture, setSelectedArchForDenture] = useState(null); // 'upper' | 'lower' | 'both'
  const [selectedSurfaces, setSelectedSurfaces] = useState({}); // { toothNum: ['M', 'O', 'D'] }
  const [rpdComponents, setRpdComponents] = useState([]); // Array of selected RPD components
  const [rpdDetails, setRpdDetails] = useState({}); // { componentType: { teeth: [], notes: '' } }
  
  // Completed prescriptions list
  const [prescriptions, setPrescriptions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const restorationConfig = currentRestoration ? RESTORATION_TYPES[currentRestoration] : null;
  // Use range selection for bridges, multiple for everything else
  const selectionMode = (currentRestoration === 'BRIDGE' || currentRestoration === 'IMPLANT_BRIDGE') ? 'range' : 'multiple';
  
  // Arch quadrant mapping for dentures
  const ARCH_QUADRANTS = {
    upper: ['UR', 'UL'],
    lower: ['LR', 'LL'],
    both: ['UR', 'UL', 'LR', 'LL']
  };

  // Get already used teeth from existing units and current prescriptions
  const usedTeeth = [
    ...existingUnits.map(u => u.tooth).filter(Boolean),
    ...prescriptions.flatMap(p => p.units.map(u => u.tooth).filter(Boolean))
  ];
  
  const highlightedTeeth = {};
  // Show existing units in green
  existingUnits.forEach(unit => {
    if (unit.tooth) {
      highlightedTeeth[unit.tooth] = {
        color: '#10b981',
        label: unit.type?.split(' ')[0] || 'Unit'
      };
    }
  });
  
  // Show current prescriptions with restoration-type colors
  prescriptions.forEach(p => {
    const restoColor = RESTORATION_TYPES[p.type]?.color || '#6b7280';
    const restoLabel = RESTORATION_TYPES[p.type]?.label || 'Unit';
    
    p.units.forEach(unit => {
      if (unit.tooth) {
        // Show role for bridges (R/P) or type abbreviation
        let displayLabel = restoLabel.substring(0, 3);
        if (unit.role === 'retainer') displayLabel = 'R';
        if (unit.role === 'pontic') displayLabel = 'P';
        if (unit.role === 'abutment') displayLabel = 'A';
        
        highlightedTeeth[unit.tooth] = {
          color: restoColor,
          label: displayLabel
        };
      }
    });
  });

  const handleRestorationTypeSelect = (type) => {
    setCurrentRestoration(type);
    const resto = RESTORATION_TYPES[type];
    if (resto) {
      setCurrentMaterial(resto.defaultMaterial || resto.materials[0]);
      // Clear teeth selection when changing restoration type
      setSelectedTeeth([]);
      setToothRoles({});
      setSelectedArchForDenture(null);
      setSelectedSurfaces({});
      setRpdComponents([]);
      setRpdDetails({});
    }
  };
  
  const handleToothRoleToggle = (tooth) => {
    // For bridges: toggle between retainer and pontic
    // For RPD: toggle between abutment and component
    if (currentRestoration === 'BRIDGE' || currentRestoration === 'IMPLANT_BRIDGE') {
      setToothRoles(prev => ({
        ...prev,
        [tooth]: prev[tooth] === 'retainer' ? 'pontic' : 'retainer'
      }));
    } else if (currentRestoration === 'DENTURE_PARTIAL') {
      setToothRoles(prev => ({
        ...prev,
        [tooth]: prev[tooth] === 'abutment' ? 'rpd_component' : 'abutment'
      }));
    }
  };
  
  const handleSurfaceToggle = (tooth, surface) => {
    setSelectedSurfaces(prev => {
      const toothSurfaces = prev[tooth] || [];
      if (toothSurfaces.includes(surface)) {
        return {
          ...prev,
          [tooth]: toothSurfaces.filter(s => s !== surface)
        };
      } else {
        return {
          ...prev,
          [tooth]: [...toothSurfaces, surface]
        };
      }
    });
  };
  
  const handleRpdComponentToggle = (component) => {
    setRpdComponents(prev => {
      if (prev.includes(component)) {
        return prev.filter(c => c !== component);
      } else {
        return [...prev, component];
      }
    });
  };

  const handleAddToPrescription = () => {
    if (!currentRestoration) {
      alert('Please select restoration type');
      return;
    }

    if (restorationConfig.arch) {
      // Arch-based restoration (dentures)
      if (!selectedArchForDenture && currentRestoration === 'DENTURE_FULL') {
        alert('Please select arch on odontogram (Upper/Lower/Both)');
        return;
      }
      
      const archLabel = selectedArchForDenture ? 
        selectedArchForDenture.charAt(0).toUpperCase() + selectedArchForDenture.slice(1) : 
        currentArch;
      
      const newPrescription = {
        id: `rx-${Date.now()}`,
        type: currentRestoration,
        label: `${RESTORATION_TYPES[currentRestoration].label} - ${archLabel}`,
        arch: archLabel,
        material: currentMaterial,
        shade: restorationConfig.category === 'Removable' ? currentShade : null,
        instructions: currentInstructions,
        teeth: currentRestoration === 'DENTURE_PARTIAL' ? selectedTeeth : [],
        toothRoles: currentRestoration === 'DENTURE_PARTIAL' ? toothRoles : {},
        rpdComponents: currentRestoration === 'DENTURE_PARTIAL' ? rpdComponents : null,
        rpdDetails: currentRestoration === 'DENTURE_PARTIAL' ? rpdDetails : null,
        units: [{
          type: RESTORATION_TYPES[currentRestoration].label,
          arch: archLabel,
          material: currentMaterial,
          shade: currentShade,
          instructions: currentInstructions,
          teeth: currentRestoration === 'DENTURE_PARTIAL' ? selectedTeeth : [],
          toothRoles: currentRestoration === 'DENTURE_PARTIAL' ? toothRoles : {},
          rpdComponents: currentRestoration === 'DENTURE_PARTIAL' ? rpdComponents : null,
          rpdDetails: currentRestoration === 'DENTURE_PARTIAL' ? rpdDetails : null
        }]
      };
      setPrescriptions([...prescriptions, newPrescription]);
    } else {
      // Tooth-based restoration
      if (selectedTeeth.length === 0) {
        alert('Please select teeth on odontogram');
        return;
      }

      if ((currentRestoration === 'BRIDGE' || currentRestoration === 'IMPLANT_BRIDGE') && selectedTeeth.length < 3) {
        alert('Bridge requires at least 3 teeth (2 retainers + 1 pontic)');
        return;
      }
      
      // Check bridge has at least 2 retainers
      if (currentRestoration === 'BRIDGE' || currentRestoration === 'IMPLANT_BRIDGE') {
        const retainerCount = selectedTeeth.filter(t => toothRoles[t] === 'retainer').length;
        if (retainerCount < 2) {
          alert('Bridge requires at least 2 retainer teeth');
          return;
        }
      }

      // Sort teeth numerically for consistent ordering
      const sortedTeeth = [...selectedTeeth].sort((a, b) => a - b);
      
      const units = sortedTeeth.map((tooth, idx) => {
        let unitType = RESTORATION_TYPES[currentRestoration].label;
        
        // For bridges, use specified roles (or auto-assign if not set)
        if (currentRestoration === 'BRIDGE' || currentRestoration === 'IMPLANT_BRIDGE') {
          let role = toothRoles[tooth];
          // Auto-assign: first and last are retainers, middle are pontics
          if (!role) {
            role = (idx === 0 || idx === sortedTeeth.length - 1) ? 'retainer' : 'pontic';
          }
          unitType = `${unitType} ${role.charAt(0).toUpperCase() + role.slice(1)}`;
        }
        
        // For RPD, mark abutments
        if (currentRestoration === 'DENTURE_PARTIAL' && toothRoles[tooth] === 'abutment') {
          unitType = `${unitType} Abutment`;
        }

        return {
          tooth,
          type: unitType,
          role: toothRoles[tooth] || (currentRestoration === 'BRIDGE' || currentRestoration === 'IMPLANT_BRIDGE' ? ((idx === 0 || idx === sortedTeeth.length - 1) ? 'retainer' : 'pontic') : null),
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
        label: `${RESTORATION_TYPES[currentRestoration].label} #${sortedTeeth.join(', ')}`,
        teeth: sortedTeeth,
        toothRoles,
        material: currentMaterial,
        shade: currentShade,
        implantSystem: currentImplantSystem,
        abutmentType: currentAbutmentType,
        instructions: currentInstructions,
        surfaces: currentRestoration === 'INLAY_ONLAY' ? selectedSurfaces : null,
        units
      };

      setPrescriptions([...prescriptions, newPrescription]);
    }

    // Reset only selection and roles - keep restoration type and material settings
    setSelectedTeeth([]);
    setToothRoles({});
    setSelectedArchForDenture(null);
    setCurrentInstructions('');
    setSelectedSurfaces({});
    setRpdComponents([]);
    setRpdDetails({});
    // Don't reset currentRestoration - allows adding multiple of same type
  };


  const handleRemovePrescription = (id) => {
    setPrescriptions(prescriptions.filter(p => p.id !== id));
  };
  
  const handleEditPrescription = (rx) => {
    setEditingId(rx.id);
    setEditForm({
      material: rx.material,
      shade: rx.shade || '',
      shadeSystem: rx.shadeSystem || 'VITA_CLASSICAL',
      implantSystem: rx.implantSystem || '',
      abutmentType: rx.abutmentType || 'Custom Abutment',
      instructions: rx.instructions || '',
      teeth: rx.teeth || [],
      toothRoles: rx.toothRoles || {},
      arch: rx.arch || 'Upper',
      surfaces: rx.surfaces || {},
      rpdComponents: rx.rpdComponents || [],
      rpdDetails: rx.rpdDetails || {}
    });
  };
  
  const handleSaveEdit = (id) => {
    setPrescriptions(prescriptions.map(rx => {
      if (rx.id === id) {
        // Update prescription with edited values
        const updatedRx = {
          ...rx,
          material: editForm.material,
          shade: editForm.shade,
          shadeSystem: editForm.shadeSystem,
          implantSystem: editForm.implantSystem,
          abutmentType: editForm.abutmentType,
          instructions: editForm.instructions,
          teeth: editForm.teeth,
          toothRoles: editForm.toothRoles,
          arch: editForm.arch,
          surfaces: editForm.surfaces,
          rpdComponents: editForm.rpdComponents,
          rpdDetails: editForm.rpdDetails
        };
        
        // Update label with new teeth
        if (editForm.teeth.length > 0) {
          updatedRx.label = `${RESTORATION_TYPES[rx.type].label} #${editForm.teeth.sort((a,b) => a-b).join(', ')}`;
        }
        
        // Regenerate units with updated values
        const sortedTeeth = [...editForm.teeth].sort((a, b) => a - b);
        updatedRx.units = sortedTeeth.map((tooth, idx) => {
          let unitType = RESTORATION_TYPES[rx.type].label;
          
          if (rx.type === 'BRIDGE' || rx.type === 'IMPLANT_BRIDGE') {
            let role = editForm.toothRoles[tooth];
            if (!role) {
              role = (idx === 0 || idx === sortedTeeth.length - 1) ? 'retainer' : 'pontic';
            }
            unitType = `${unitType} ${role.charAt(0).toUpperCase() + role.slice(1)}`;
          }
          
          if (rx.type === 'DENTURE_PARTIAL' && editForm.toothRoles[tooth] === 'abutment') {
            unitType = `${unitType} Abutment`;
          }
          
          return {
            tooth,
            type: unitType,
            role: editForm.toothRoles[tooth] || (rx.type === 'BRIDGE' || rx.type === 'IMPLANT_BRIDGE' ? ((idx === 0 || idx === sortedTeeth.length - 1) ? 'retainer' : 'pontic') : null),
            material: editForm.material,
            shade: editForm.shade,
            implantSystem: editForm.implantSystem,
            abutmentType: editForm.abutmentType,
            instructions: idx === 0 ? editForm.instructions : ''
          };
        });
        
        return updatedRx;
      }
      return rx;
    }));
    setEditingId(null);
    setEditForm({});
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };
  
  const handleToothToggleInEdit = (tooth) => {
    const currentTeeth = editForm.teeth || [];
    if (currentTeeth.includes(tooth)) {
      setEditForm({
        ...editForm,
        teeth: currentTeeth.filter(t => t !== tooth)
      });
    } else {
      setEditForm({
        ...editForm,
        teeth: [...currentTeeth, tooth]
      });
    }
  };
  
  const handleEditRoleToggle = (tooth) => {
    const currentRx = prescriptions.find(p => p.id === editingId);
    if (!currentRx) return;
    
    if (currentRx.type === 'BRIDGE' || currentRx.type === 'IMPLANT_BRIDGE') {
      setEditForm({
        ...editForm,
        toothRoles: {
          ...editForm.toothRoles,
          [tooth]: editForm.toothRoles[tooth] === 'retainer' ? 'pontic' : 'retainer'
        }
      });
    } else if (currentRx.type === 'DENTURE_PARTIAL') {
      setEditForm({
        ...editForm,
        toothRoles: {
          ...editForm.toothRoles,
          [tooth]: editForm.toothRoles[tooth] === 'abutment' ? 'rpd_component' : 'abutment'
        }
      });
    }
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
        <p className={styles.subtitle}>Configure restoration details, then select teeth on odontogram below</p>
      </div>

      {/* Compact Inline Configuration Toolbar */}
      <div className={styles.compactToolbar}>
        {/* Restoration Type */}
        <div className={styles.toolbarSection}>
          <label className={styles.toolbarLabel}>Type:</label>
          <select
            value={currentRestoration || ''}
            onChange={(e) => handleRestorationTypeSelect(e.target.value)}
            className={styles.compactSelect}
          >
            <option value="">Select Restoration...</option>
            {Object.entries(RESTORATION_TYPES).map(([key, resto]) => (
              <option key={key} value={key}>{resto.label}</option>
            ))}
          </select>
        </div>

        {/* Conditional inline details */}
        {currentRestoration && (
        <>
          {/* Material */}
          <div className={styles.toolbarSection}>
            <label className={styles.toolbarLabel}>Material:</label>
            <select
              value={currentMaterial}
              onChange={(e) => setCurrentMaterial(e.target.value)}
              className={styles.compactSelect}
            >
              {restorationConfig.materials.map(mat => (
                <option key={mat} value={mat}>{mat}</option>
              ))}
            </select>
          </div>

          {/* Shade */}
          <div className={styles.toolbarSection}>
            <label className={styles.toolbarLabel}>Shade:</label>
            <select
              value={currentShadeSystem}
              onChange={(e) => setCurrentShadeSystem(e.target.value)}
              className={styles.compactSelect}
              style={{width: '120px'}}
            >
              <option value="VITA_CLASSICAL">VITA Classic</option>
              <option value="VITA_3D">VITA 3D</option>
            </select>
            <select
              value={currentShade}
              onChange={(e) => setCurrentShade(e.target.value)}
              className={styles.compactSelect}
              style={{width: '100px'}}
            >
              <option value="">Select...</option>
              {SHADE_SYSTEMS[currentShadeSystem].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Implant System */}
          {restorationConfig.extraFields?.includes('implantSystem') && (
            <>
              <div className={styles.toolbarSection}>
                <label className={styles.toolbarLabel}>Implant:</label>
                <select
                  value={currentImplantSystem}
                  onChange={(e) => setCurrentImplantSystem(e.target.value)}
                  className={styles.compactSelect}
                >
                  <option value="">Select...</option>
                  {IMPLANT_SYSTEMS.map(sys => (
                    <option key={sys} value={sys}>{sys}</option>
                  ))}
                </select>
              </div>

              <div className={styles.toolbarSection}>
                <label className={styles.toolbarLabel}>Abutment:</label>
                <select
                  value={currentAbutmentType}
                  onChange={(e) => setCurrentAbutmentType(e.target.value)}
                  className={styles.compactSelect}
                >
                  <option value="Custom Abutment">Custom</option>
                  <option value="Stock Abutment">Stock</option>
                  <option value="Screw Retained">Screw Retained</option>
                </select>
              </div>
            </>
          )}

          {/* Instructions - inline compact */}
          <div className={styles.toolbarSection} style={{flex: 1}}>
            <label className={styles.toolbarLabel}>Notes:</label>
            <input
              type="text"
              value={currentInstructions}
              onChange={(e) => setCurrentInstructions(e.target.value)}
              className={styles.compactInput}
              placeholder="Special instructions..."
            />
          </div>
          
        </>
      )}
      </div>
      
      {/* Surface Selection for Inlay/Onlay */}
      {currentRestoration === 'INLAY_ONLAY' && selectedTeeth.length > 0 && (
        <div className={styles.surfaceSelection}>
          <h4 className={styles.sectionTitle}>Select Surfaces for Each Tooth</h4>
          {selectedTeeth.sort((a, b) => a - b).map(tooth => (
            <div key={tooth} className={styles.toothSurfaceRow}>
              <span className={styles.toothLabel}>Tooth #{tooth}:</span>
              <div className={styles.surfaceButtons}>
                {TOOTH_SURFACES.map(surface => (
                  <button
                    key={surface}
                    type="button"
                    className={`${styles.surfaceBtn} ${selectedSurfaces[tooth]?.includes(surface) ? styles.active : ''}`}
                    onClick={() => handleSurfaceToggle(tooth, surface)}
                    title={`${surface} - ${
                      surface === 'M' ? 'Mesial' :
                      surface === 'O' ? 'Occlusal' :
                      surface === 'D' ? 'Distal' :
                      surface === 'I' ? 'Incisal' :
                      surface === 'B' ? 'Buccal' :
                      surface === 'L' ? 'Lingual' :
                      'Facial'
                    }`}
                  >
                    {surface}
                  </button>
                ))}
              </div>
              <span className={styles.surfaceDisplay}>
                {selectedSurfaces[tooth]?.length ? selectedSurfaces[tooth].join('') : 'None'}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {/* RPD Components for Partial Denture */}
      {currentRestoration === 'DENTURE_PARTIAL' && (
        <div className={styles.rpdComponents}>
          <h4 className={styles.sectionTitle}>Select RPD Components</h4>
          
          {Object.entries(RPD_COMPONENTS).map(([category, components]) => (
            <div key={category} className={styles.componentCategory}>
              <label className={styles.categoryLabel}>
                {category.replace('_', ' ')}:
              </label>
              <div className={styles.componentButtons}>
                {components.map(component => (
                  <button
                    key={component}
                    type="button"
                    className={`${styles.componentBtn} ${rpdComponents.includes(component) ? styles.active : ''}`}
                    onClick={() => handleRpdComponentToggle(component)}
                  >
                    {component}
                  </button>
                ))}
              </div>
            </div>
          ))}
          
          {rpdComponents.length > 0 && (
            <div className={styles.selectedComponents}>
              <strong>Selected:</strong> {rpdComponents.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Odontogram - Always visible */}
      {currentRestoration && (
        <div className={styles.odontogramSection}>
          {/* Color Legend */}
          {prescriptions.length > 0 && (
            <div className={styles.colorLegend}>
              <span className={styles.legendTitle}>Added Items:</span>
              {[...new Set(prescriptions.map(p => p.type))].map(type => (
                <div key={type} className={styles.legendItem}>
                  <span 
                    className={styles.legendColor} 
                    style={{backgroundColor: RESTORATION_TYPES[type]?.color}}
                  ></span>
                  <span className={styles.legendLabel}>{RESTORATION_TYPES[type]?.label}</span>
                </div>
              ))}
            </div>
          )}
          
          <Odontogram
            selectedTeeth={selectedTeeth}
            onSelectionChange={setSelectedTeeth}
            mode={selectionMode}
            disabledTeeth={usedTeeth}
            highlightedTeeth={highlightedTeeth}
            allowCrossQuadrant={currentRestoration === 'BRIDGE' || currentRestoration === 'IMPLANT_BRIDGE'}
            archSelectionMode={currentRestoration === 'DENTURE_FULL'}
            onArchSelect={setSelectedArchForDenture}
            selectedArch={selectedArchForDenture}
          />
          
          {/* Compact Role Assignment */}
          {selectedTeeth.length > 0 && (currentRestoration === 'BRIDGE' || currentRestoration === 'IMPLANT_BRIDGE') && (
            <div className={styles.compactRoles}>
              <span className={styles.rolesLabel}>Roles:</span>
              {selectedTeeth.sort((a, b) => a - b).map(tooth => (
                <button
                  key={tooth}
                  type="button"
                  className={`${styles.compactRoleBtn} ${styles[toothRoles[tooth] || 'pontic']}`}
                  onClick={() => handleToothRoleToggle(tooth)}
                  title={toothRoles[tooth] === 'retainer' ? 'Retainer (supporting crown)' : 'Pontic (suspended tooth)'}
                >
                  #{tooth}: {toothRoles[tooth] === 'retainer' ? 'R' : 'P'}
                </button>
              ))}
              <span className={styles.helpText}>(auto: ends=R, middle=P)</span>
            </div>
          )}
          
          {selectedTeeth.length > 0 && currentRestoration === 'DENTURE_PARTIAL' && (
            <div className={styles.compactRoles}>
              <span className={styles.rolesLabel}>Teeth:</span>
              {selectedTeeth.sort((a, b) => a - b).map(tooth => (
                <button
                  key={tooth}
                  type="button"
                  className={`${styles.compactRoleBtn} ${styles[toothRoles[tooth] || 'rpd_component']}`}
                  onClick={() => handleToothRoleToggle(tooth)}
                  title={toothRoles[tooth] === 'abutment' ? 'Abutment (supports clasps)' : 'Prosthetic component'}
                >
                  #{tooth}: {toothRoles[tooth] === 'abutment' ? 'A' : 'C'}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleAddToPrescription}
            className="button primary"
            style={{width: '100%', marginTop: '0.75rem'}}
          >
            + Add to Prescription {currentRestoration && `(${RESTORATION_TYPES[currentRestoration].label})`}
          </button>
        </div>
      )}

      {/* Empty state */}
      {!currentRestoration && (
        <div className={styles.emptyState}>
          <p>👆 Select a restoration type above to begin</p>
        </div>
      )}

      {/* Prescription Summary */}
      {prescriptions.length > 0 && (
        <div className={styles.prescriptionSummary}>
          <h4>Current Prescription ({prescriptions.length} item{prescriptions.length > 1 ? 's' : ''})</h4>
          <div className={styles.prescriptionList}>
            {prescriptions.map(rx => (
              <div key={rx.id} className={styles.prescriptionItem}>
                {editingId === rx.id ? (
                  // EDIT MODE
                  <div className={styles.editMode}>
                    <div className={styles.rxHeader}>
                      <strong>{RESTORATION_TYPES[rx.type].label} (Editing)</strong>
                      <div className={styles.editActions}>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(rx.id)}
                          className={styles.saveBtn}
                          title="Save changes"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className={styles.cancelBtn}
                          title="Cancel"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    
                    {/* Inline Edit Form */}
                    <div className={styles.editFields}>
                      <div className={styles.editRow}>
                        <label>Material:</label>
                        <select
                          value={editForm.material}
                          onChange={(e) => setEditForm({...editForm, material: e.target.value})}
                          className={styles.editSelect}
                        >
                          {RESTORATION_TYPES[rx.type].materials.map(mat => (
                            <option key={mat} value={mat}>{mat}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className={styles.editRow}>
                        <label>Shade:</label>
                        <select
                          value={editForm.shadeSystem}
                          onChange={(e) => setEditForm({...editForm, shadeSystem: e.target.value})}
                          className={styles.editSelect}
                        >
                          <option value="VITA_CLASSICAL">VITA Classic</option>
                          <option value="VITA_3D">VITA 3D</option>
                        </select>
                        <select
                          value={editForm.shade}
                          onChange={(e) => setEditForm({...editForm, shade: e.target.value})}
                          className={styles.editSelect}
                        >
                          <option value="">Select...</option>
                          {SHADE_SYSTEMS[editForm.shadeSystem || 'VITA_CLASSICAL'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      
                      {RESTORATION_TYPES[rx.type].extraFields?.includes('implantSystem') && (
                        <>
                          <div className={styles.editRow}>
                            <label>Implant:</label>
                            <select
                              value={editForm.implantSystem}
                              onChange={(e) => setEditForm({...editForm, implantSystem: e.target.value})}
                              className={styles.editSelect}
                            >
                              <option value="">Select...</option>
                              {IMPLANT_SYSTEMS.map(sys => (
                                <option key={sys} value={sys}>{sys}</option>
                              ))}
                            </select>
                          </div>
                          <div className={styles.editRow}>
                            <label>Abutment:</label>
                            <select
                              value={editForm.abutmentType}
                              onChange={(e) => setEditForm({...editForm, abutmentType: e.target.value})}
                              className={styles.editSelect}
                            >
                              <option value="Custom Abutment">Custom</option>
                              <option value="Stock Abutment">Stock</option>
                              <option value="Screw Retained">Screw Retained</option>
                            </select>
                          </div>
                        </>
                      )}
                      
                      <div className={styles.editRow}>
                        <label>Notes:</label>
                        <input
                          type="text"
                          value={editForm.instructions}
                          onChange={(e) => setEditForm({...editForm, instructions: e.target.value})}
                          className={styles.editInput}
                          placeholder="Special instructions..."
                        />
                      </div>
                      
                      {/* Tooth Selection for Edit */}
                      {!RESTORATION_TYPES[rx.type].arch && (
                        <div className={styles.editTeeth}>
                          <label>Teeth: (click to toggle)</label>
                          <div className={styles.toothGrid}>
                            {[...Array(48)].map((_, i) => {
                              const toothNum = i + 11 > 18 && i + 11 < 21 ? null : 
                                               i + 11 > 28 && i + 11 < 31 ? null :
                                               i + 11 > 38 && i + 11 < 41 ? null :
                                               i + 11 > 48 ? null : i + 11;
                              if (!toothNum || [19, 20, 29, 30, 39, 40, 49, 50].includes(toothNum)) return null;
                              
                              const isUsed = usedTeeth.includes(toothNum) && !rx.teeth.includes(toothNum);
                              const isInEdit = editForm.teeth?.includes(toothNum);
                              
                              return (
                                <button
                                  key={toothNum}
                                  type="button"
                                  className={`${styles.toothBtn} ${isInEdit ? styles.selected : ''} ${isUsed ? styles.disabled : ''}`}
                                  onClick={() => !isUsed && handleToothToggleInEdit(toothNum)}
                                  disabled={isUsed}
                                >
                                  {toothNum}
                                </button>
                              );
                            })}
                          </div>
                          
                          {/* Role assignment in edit */}
                          {editForm.teeth?.length > 0 && (rx.type === 'BRIDGE' || rx.type === 'IMPLANT_BRIDGE' || rx.type === 'DENTURE_PARTIAL') && (
                            <div className={styles.editRoles}>
                              <span className={styles.rolesLabel}>Roles:</span>
                              {editForm.teeth.sort((a, b) => a - b).map(tooth => (
                                <button
                                  key={tooth}
                                  type="button"
                                  className={`${styles.compactRoleBtn} ${styles[editForm.toothRoles[tooth] || 'pontic']}`}
                                  onClick={() => handleEditRoleToggle(tooth)}
                                >
                                  #{tooth}: {editForm.toothRoles[tooth] === 'retainer' || editForm.toothRoles[tooth] === 'abutment' ? 'R' : 'P'}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Surface Selection in Edit Mode */}
                      {rx.type === 'INLAY_ONLAY' && editForm.teeth?.length > 0 && (
                        <div className={styles.editSurfaces}>
                          <label>Surfaces:</label>
                          {editForm.teeth.sort((a, b) => a - b).map(tooth => (
                            <div key={tooth} className={styles.toothSurfaceRow}>
                              <span className={styles.toothLabel}>#{tooth}:</span>
                              <div className={styles.surfaceButtons}>
                                {TOOTH_SURFACES.map(surface => (
                                  <button
                                    key={surface}
                                    type="button"
                                    className={`${styles.surfaceBtn} ${editForm.surfaces?.[tooth]?.includes(surface) ? styles.active : ''}`}
                                    onClick={() => {
                                      const currentSurfaces = editForm.surfaces?.[tooth] || [];
                                      const updated = currentSurfaces.includes(surface)
                                        ? currentSurfaces.filter(s => s !== surface)
                                        : [...currentSurfaces, surface];
                                      setEditForm({
                                        ...editForm,
                                        surfaces: { ...editForm.surfaces, [tooth]: updated }
                                      });
                                    }}
                                  >
                                    {surface}
                                  </button>
                                ))}
                              </div>
                              <span className={styles.surfaceDisplay}>
                                {editForm.surfaces?.[tooth]?.join('') || 'None'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* RPD Components in Edit Mode */}
                      {rx.type === 'DENTURE_PARTIAL' && (
                        <div className={styles.editRpd}>
                          <label>RPD Components:</label>
                          {Object.entries(RPD_COMPONENTS).map(([category, components]) => (
                            <div key={category} className={styles.componentCategory}>
                              <label className={styles.categoryLabel}>
                                {category.replace('_', ' ')}:
                              </label>
                              <div className={styles.componentButtons}>
                                {components.map(component => (
                                  <button
                                    key={component}
                                    type="button"
                                    className={`${styles.componentBtn} ${editForm.rpdComponents?.includes(component) ? styles.active : ''}`}
                                    onClick={() => {
                                      const current = editForm.rpdComponents || [];
                                      const updated = current.includes(component)
                                        ? current.filter(c => c !== component)
                                        : [...current, component];
                                      setEditForm({
                                        ...editForm,
                                        rpdComponents: updated
                                      });
                                    }}
                                  >
                                    {component}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // VIEW MODE
                  <>
                    <div className={styles.rxHeader}>
                      <strong>{rx.label}</strong>
                      <div className={styles.rxActions}>
                        <button
                          type="button"
                          onClick={() => handleEditPrescription(rx)}
                          className={styles.editBtn}
                          title="Edit"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePrescription(rx.id)}
                          className={styles.removeBtn}
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <div className={styles.rxDetails}>
                      <span>{rx.material}</span>
                      {rx.shade && <span>• Shade: {rx.shade}</span>}
                      {rx.implantSystem && <span>• {rx.implantSystem}</span>}
                      <span>• {rx.units.length} unit{rx.units.length > 1 ? 's' : ''}</span>
                      {rx.surfaces && Object.keys(rx.surfaces).length > 0 && (
                        <span>• Surfaces: {Object.entries(rx.surfaces).map(([tooth, surfs]) => 
                          `#${tooth}(${surfs.join('')})`
                        ).join(', ')}</span>
                      )}
                      {rx.rpdComponents && rx.rpdComponents.length > 0 && (
                        <span>• Components: {rx.rpdComponents.join(', ')}</span>
                      )}
                    </div>
                    {rx.instructions && (
                      <div className={styles.rxInstructions}>{rx.instructions}</div>
                    )}
                  </>
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
