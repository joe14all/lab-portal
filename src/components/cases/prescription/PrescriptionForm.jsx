import React, { useState, useEffect } from 'react';
import Odontogram from './Odontogram';
import styles from './PrescriptionForm.module.css';
import crownIcon from '../../../assets/icons/crown.svg';
import bridgeIcon from '../../../assets/icons/bridge.svg';
import implantCrownIcon from '../../../assets/icons/implantCrown.svg';
import implantBridgeIcon from '../../../assets/icons/implantBridge.svg';
import veneerIcon from '../../../assets/icons/veneer.svg';
import onlayIcon from '../../../assets/icons/onlay.svg';
import fullDentureIcon from '../../../assets/icons/fullDenture.svg';
import partialDentureIcon from '../../../assets/icons/partialDenture.svg';

/**
 * Smart Prescription Form with Clinical Intelligence
 * Handles bridges, implants, dentures with automatic unit creation
 * Uses Universal Numbering System (1-32)
 */

// FDI to Universal Numbering conversion map
const FDI_TO_UNIVERSAL = {
  // Upper Right (FDI 11-18 -> Universal 8-1)
  11: 8, 12: 7, 13: 6, 14: 5, 15: 4, 16: 3, 17: 2, 18: 1,
  // Upper Left (FDI 21-28 -> Universal 9-16)
  21: 9, 22: 10, 23: 11, 24: 12, 25: 13, 26: 14, 27: 15, 28: 16,
  // Lower Left (FDI 31-38 -> Universal 24-17)
  31: 24, 32: 23, 33: 22, 34: 21, 35: 20, 36: 19, 37: 18, 38: 17,
  // Lower Right (FDI 41-48 -> Universal 25-32)
  41: 25, 42: 26, 43: 27, 44: 28, 45: 29, 46: 30, 47: 31, 48: 32
};

// Convert FDI tooth number to Universal (if needed)
const toUniversal = (tooth) => {
  if (!tooth) return null;
  // If already in Universal range (1-32), return as is
  if (tooth >= 1 && tooth <= 32) return tooth;
  // Otherwise convert from FDI
  return FDI_TO_UNIVERSAL[tooth] || tooth;
};

const RESTORATION_TYPES = {
  CROWN: {
    label: 'Crown',
    category: 'Fixed',
    requiresRange: false,
    defaultMaterial: 'Zirconia',
    materials: ['Zirconia', 'E.max', 'PFM', 'Gold', 'Acrylic Temp'],
    unitCount: 1,
    color: '#2563eb', // Strong Blue
    icon: crownIcon
  },
  BRIDGE: {
    label: 'Bridge',
    category: 'Fixed',
    requiresRange: true,
    defaultMaterial: 'Zirconia',
    materials: ['Zirconia', 'E.max', 'PFM', 'Gold'],
    unitCount: 'dynamic',
    color: '#7c3aed', // Strong Purple
    icon: bridgeIcon
  },
  IMPLANT_CROWN: {
    label: 'Implant Crown',
    category: 'Implant',
    requiresRange: false,
    defaultMaterial: 'Zirconia',
    materials: ['Zirconia', 'E.max', 'PFM'],
    unitCount: 1,
    extraFields: ['implantSystem', 'abutmentType'],
    color: '#0891b2', // Strong Cyan
    icon: implantCrownIcon
  },
  IMPLANT_BRIDGE: {
    label: 'Implant Bridge',
    category: 'Implant',
    requiresRange: true,
    defaultMaterial: 'Zirconia',
    materials: ['Zirconia', 'E.max', 'PFM'],
    unitCount: 'dynamic',
    extraFields: ['implantSystem', 'abutmentType'],
    color: '#0e7490', // Dark Cyan
    icon: implantBridgeIcon
  },
  VENEER: {
    label: 'Veneer',
    category: 'Cosmetic',
    requiresRange: false,
    defaultMaterial: 'E.max',
    materials: ['E.max', 'Feldspathic Porcelain', 'Composite'],
    unitCount: 1,
    color: '#db2777', // Strong Pink
    icon: veneerIcon
  },
  INLAY_ONLAY: {
    label: 'Inlay / Onlay',
    category: 'Fixed',
    requiresRange: false,
    defaultMaterial: 'E.max',
    materials: ['E.max', 'Zirconia', 'Gold'],
    unitCount: 1,
    extraFields: ['surfaces'],
    color: '#ea580c', // Strong Orange
    icon: onlayIcon
  },
  DENTURE_FULL: {
    label: 'Full Denture',
    category: 'Removable',
    requiresRange: false,
    arch: true,
    materials: ['Acrylic', 'Valplast', 'TCS (Tooth Colored Base)'],
    unitCount: 1,
    color: '#dc2626', // Strong Red
    icon: fullDentureIcon
  },
  DENTURE_PARTIAL: {
    label: 'Partial Denture',
    category: 'Removable',
    requiresRange: true,
    arch: true,
    materials: ['Cast Metal Frame', 'Valplast', 'Acrylic'],
    unitCount: 1,
    extraFields: ['rpdComponents'],
    color: '#c2410c', // Dark Orange
    icon: partialDentureIcon
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

// Helper function to detect shade system from shade value
const detectShadeSystem = (shade) => {
  if (!shade) return 'VITA_CLASSICAL';
  if (SHADE_SYSTEMS.VITA_3D.includes(shade)) return 'VITA_3D';
  if (SHADE_SYSTEMS.VITA_CLASSICAL.includes(shade)) return 'VITA_CLASSICAL';
  return 'VITA_CLASSICAL'; // default
};

// Kennedy Classification Calculator
const calculateKennedyClass = (missingTeeth, arch) => {
  // Filter teeth by arch
  const archTeeth = arch === 'upper' ? 
    missingTeeth.filter(t => t >= 1 && t <= 16) : 
    missingTeeth.filter(t => t >= 17 && t <= 32);
  
  if (archTeeth.length === 0) return null;
  
  // Define arch boundaries
  const archStart = arch === 'upper' ? 1 : 17;
  const archEnd = arch === 'upper' ? 16 : 32;
  const thirdMolars = arch === 'upper' ? [1, 16] : [17, 32];
  
  // Check if third molars are present (not missing)
  const rightThirdMolarPresent = !archTeeth.includes(thirdMolars[0]);
  const leftThirdMolarPresent = !archTeeth.includes(thirdMolars[1]);
  
  // Determine the actual posterior boundaries for classification
  const rightBoundary = rightThirdMolarPresent ? thirdMolars[0] : (arch === 'upper' ? 2 : 18);
  const leftBoundary = leftThirdMolarPresent ? thirdMolars[1] : (arch === 'upper' ? 15 : 31);
  
  // Get all teeth in arch (including third molars if present)
  const allTeeth = [];
  for (let i = archStart; i <= archEnd; i++) {
    if (i === thirdMolars[0] && !rightThirdMolarPresent) continue; // Skip right 3rd molar if missing
    if (i === thirdMolars[1] && !leftThirdMolarPresent) continue; // Skip left 3rd molar if missing
    allTeeth.push(i);
  }
  
  // Filter missing teeth to exclude third molars if they're not in the arch
  const teethForClassification = archTeeth.filter(t => allTeeth.includes(t));
  
  if (teethForClassification.length === 0) return null;
  
  // Find edentulous spaces (groups of consecutive missing teeth)
  const spaces = [];
  let currentSpace = [];
  
  for (let tooth of allTeeth) {
    if (teethForClassification.includes(tooth)) {
      currentSpace.push(tooth);
    } else {
      if (currentSpace.length > 0) {
        spaces.push([...currentSpace]);
        currentSpace = [];
      }
    }
  }
  if (currentSpace.length > 0) spaces.push(currentSpace);
  
  if (spaces.length === 0) return null;
  
  // Classify each space
  const distalExtensions = [];
  const boundedSpaces = [];
  const anteriorSpaces = [];
  
  spaces.forEach(space => {
    const firstTooth = Math.min(...space);
    const lastTooth = Math.max(...space);
    
    // Check if space extends to distal end of arch
    const isRightDistalExtension = firstTooth <= rightBoundary && space.includes(rightBoundary);
    const isLeftDistalExtension = lastTooth >= leftBoundary && space.includes(leftBoundary);
    
    // Check if space is anterior (canine to canine: teeth 6-11 upper, 22-27 lower)
    const anteriorRange = arch === 'upper' ? [6, 11] : [22, 27];
    const isAnterior = space.some(t => t >= anteriorRange[0] && t <= anteriorRange[1]);
    const crossesMidline = isAnterior && space.some(t => {
      const midpoint = arch === 'upper' ? 8.5 : 24.5;
      return (space.some(x => x < midpoint) && space.some(x => x > midpoint));
    });
    
    if (isRightDistalExtension || isLeftDistalExtension) {
      distalExtensions.push({ space, side: isRightDistalExtension ? 'right' : 'left' });
    } else if (crossesMidline) {
      anteriorSpaces.push({ space, type: 'crossingMidline' });
    } else if (isAnterior) {
      anteriorSpaces.push({ space, type: 'anterior' });
    } else {
      // Bounded posterior space
      const side = (firstTooth < (arch === 'upper' ? 8.5 : 24.5)) ? 'right' : 'left';
      boundedSpaces.push({ space, side });
    }
  });
  
  // Apply Kennedy Classification Rules
  let kennedyClass = '';
  let modifications = 0;
  
  const rightDistal = distalExtensions.filter(s => s.side === 'right').length;
  const leftDistal = distalExtensions.filter(s => s.side === 'left').length;
  const hasBilateralDistal = rightDistal > 0 && leftDistal > 0;
  
  const rightBounded = boundedSpaces.filter(s => s.side === 'right').length;
  const leftBounded = boundedSpaces.filter(s => s.side === 'left').length;
  const hasBilateralBounded = rightBounded > 0 && leftBounded > 0;
  
  const crossingMidlineSpaces = anteriorSpaces.filter(s => s.type === 'crossingMidline').length;
  
  if (hasBilateralDistal) {
    // Class I: Bilateral distal extension
    kennedyClass = 'Class I';
    modifications = boundedSpaces.length + anteriorSpaces.length;
  } else if (distalExtensions.length === 1) {
    // Class II: Unilateral distal extension
    kennedyClass = 'Class II';
    modifications = boundedSpaces.length + anteriorSpaces.length;
  } else if (crossingMidlineSpaces > 0) {
    // Class IV: Anterior space crossing midline (only if no distal extensions)
    kennedyClass = 'Class IV';
    modifications = 0; // Class IV cannot have modifications
  } else if (hasBilateralBounded || boundedSpaces.length > 0) {
    // Class III: Bilateral bounded OR any bounded space without distal extension
    kennedyClass = 'Class III';
    // Modifications = all spaces except the primary space
    modifications = Math.max(0, spaces.length - 1);
  } else {
    // Default to Class III
    kennedyClass = 'Class III';
    modifications = Math.max(0, spaces.length - 1);
  }
  
  return {
    classification: kennedyClass,
    modifications: modifications,
    display: modifications > 0 ? `${kennedyClass}, Mod ${modifications}` : kennedyClass
  };
};

const TOOTH_SURFACES = ['M', 'O', 'D', 'I', 'B', 'L', 'F'];

// Detailed RPD Components with Clinical Specificity
const RPD_COMPONENTS = {
  // Step 1: Direct Retainers (Clasps)
  CLASPS: [
    { id: 'circumferential', name: 'Circumferential Clasp', requiresSurface: true, icon: '⌒' },
    { id: 'akers', name: 'Akers Clasp (Suprabulge)', requiresSurface: true, icon: 'C' },
    { id: 'c-clasp', name: 'C-Clasp (Circumferential)', requiresSurface: true, icon: 'C' },
    { id: 'i-bar', name: 'I-Bar (Infrabulge)', requiresSurface: true, icon: '↓' },
    { id: 'rpi-clasp', name: 'RPI/RPA Clasp System', requiresSurface: true, icon: '⊤' },
    { id: 'ring-clasp', name: 'Ring Clasp', requiresSurface: false, icon: '○' },
    { id: 'back-action', name: 'Back Action Clasp', requiresSurface: true, icon: '↶' }
  ],
  // Step 2: Rests (Support)
  RESTS: [
    { id: 'occlusal-mesial', name: 'Occlusal Rest - Mesial', surface: 'M', icon: '▼' },
    { id: 'occlusal-distal', name: 'Occlusal Rest - Distal', surface: 'D', icon: '▼' },
    { id: 'occlusal-both', name: 'Occlusal Rest - Both (M&D)', surface: 'MD', icon: '▼▼' },
    { id: 'cingulum', name: 'Cingulum Rest (Anterior)', surface: 'L', icon: '●' },
    { id: 'incisal', name: 'Incisal Rest (Anterior)', surface: 'I', icon: '━' }
  ],
  // Step 3: Reciprocation
  RECIPROCATION: [
    { id: 'reciprocal-plate', name: 'Reciprocal Plate (RPI System)', requiresSurface: true, icon: '▬' },
    { id: 'reciprocal-clasp-arm', name: 'Reciprocal Clasp Arm', requiresSurface: true, icon: '⟋' },
    { id: 'guide-plane', name: 'Guide Plane', requiresSurface: true, icon: '║' }
  ],
  // Step 4: Major Connectors
  MAJOR_CONNECTORS: [
    { id: 'palatal-strap', name: 'Palatal Strap (Anterior-Posterior)', arch: 'upper', icon: '═' },
    { id: 'palatal-plate-full', name: 'Full Palatal Plate', arch: 'upper', icon: '▭' },
    { id: 'palatal-plate-partial', name: 'Partial Palatal Plate', arch: 'upper', icon: '▬' },
    { id: 'horseshoe', name: 'Horseshoe (U-Shaped)', arch: 'upper', icon: '⊃' },
    { id: 'lingual-bar', name: 'Lingual Bar', arch: 'lower', icon: '━' },
    { id: 'lingual-plate', name: 'Lingual Plate', arch: 'lower', icon: '▬' },
    { id: 'kennedy-bar', name: 'Kennedy Bar (Labial Bar)', arch: 'lower', icon: '≡' },
    { id: 'double-lingual-bar', name: 'Double Lingual Bar', arch: 'lower', icon: '≡' }
  ],
  // Step 5: Minor Connectors
  MINOR_CONNECTORS: [
    { id: 'minor-connector-standard', name: 'Minor Connector', requiresTooth: true, icon: '┤' },
    { id: 'approach-arm', name: 'Approach Arm', requiresTooth: true, icon: '╱' },
    { id: 'finishing-line', name: 'Finishing Line', requiresTooth: true, icon: '┐' }
  ],
  // Step 6: Indirect Retention
  INDIRECT_RETENTION: [
    { id: 'indirect-retainer-rest', name: 'Indirect Retainer (Rest)', requiresTooth: true, icon: '□' },
    { id: 'rugae-coverage', name: 'Rugae Area Coverage', arch: 'upper', icon: '▦' },
    { id: 'anterior-extension', name: 'Anterior Extension', requiresTooth: false, icon: '▷' }
  ]
};

const ADD_ONS = {
  SERVICES: [
    { 
      id: 'wax-try-in', 
      name: 'Wax Try-In', 
      category: 'Services',
      applicableTypes: ['DENTURE_FULL', 'DENTURE_PARTIAL'] // Only for dentures
    },
    { 
      id: 'reline-hard', 
      name: 'Denture Reline (Hard)', 
      category: 'Services',
      applicableTypes: ['DENTURE_FULL', 'DENTURE_PARTIAL'] // Only for dentures
    },
    { 
      id: 'reline-soft', 
      name: 'Denture Reline (Soft)', 
      category: 'Services',
      applicableTypes: ['DENTURE_FULL', 'DENTURE_PARTIAL'] // Only for dentures
    },
    { 
      id: 'repair-denture', 
      name: 'Denture Repair', 
      category: 'Services',
      applicableTypes: ['DENTURE_FULL', 'DENTURE_PARTIAL'] // Only for dentures
    },
    { 
      id: 'add-tooth', 
      name: 'Add Tooth to Denture', 
      category: 'Services',
      applicableTypes: ['DENTURE_FULL', 'DENTURE_PARTIAL'] // Only for dentures
    }
  ],
  FEES: [
    { 
      id: 'rush-fee', 
      name: 'Rush Fee', 
      category: 'Fees',
      applicableTypes: ['CROWN', 'BRIDGE', 'IMPLANT_CROWN', 'IMPLANT_BRIDGE', 'VENEER', 'INLAY_ONLAY', 'DENTURE_FULL', 'DENTURE_PARTIAL'] // All types
    },
    { 
      id: 'pickup-fee', 
      name: 'Pickup Fee', 
      category: 'Fees',
      applicableTypes: ['CROWN', 'BRIDGE', 'IMPLANT_CROWN', 'IMPLANT_BRIDGE', 'VENEER', 'INLAY_ONLAY', 'DENTURE_FULL', 'DENTURE_PARTIAL'] // All types
    },
    { 
      id: 'custom-shade', 
      name: 'Custom Shade Match', 
      category: 'Fees',
      applicableTypes: ['CROWN', 'BRIDGE', 'IMPLANT_CROWN', 'IMPLANT_BRIDGE', 'VENEER', 'INLAY_ONLAY'] // Only for restorations with shade
    }
  ]
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
  
  // RPD Wizard State
  const [rpdWizardStep, setRpdWizardStep] = useState(1); // 1: Arch, 2: Missing Teeth, 3: Clasps, 4: Rests, 5: Reciprocation, 6: Major Connector, 7: Minor Connectors, 8: Indirect Retention, 9: Review/Edit
  const [rpdSelectedArch, setRpdSelectedArch] = useState(null); // 'upper' | 'lower' | 'both'
  const [rpdMissingTeeth, setRpdMissingTeeth] = useState([]); // Array of tooth numbers (will be grayed out)
  const [rpdComponentsByTooth, setRpdComponentsByTooth] = useState({}); // { toothNum: [{ type: 'clasp', component: 'akers', surface: 'B' }] }
  const [rpdMajorConnector, setRpdMajorConnector] = useState(null); // Selected major connector for single arch or upper arch when both
  const [rpdMajorConnectorLower, setRpdMajorConnectorLower] = useState(null); // Selected major connector for lower arch when both arches selected
  const [rpdMajorConnectorTeeth, setRpdMajorConnectorTeeth] = useState([]); // Teeth where major connector is visualized (upper arch)
  const [rpdMajorConnectorTeethLower, setRpdMajorConnectorTeethLower] = useState([]); // Teeth where major connector is visualized (lower arch)
  const [currentRpdComponent, setCurrentRpdComponent] = useState(null); // Current component being added
  const [currentComponentSurface, setCurrentComponentSurface] = useState(null); // Surface for current component
 
  const [rpdReviewComplete, setRpdReviewComplete] = useState(false); // Track if user has reviewed the design
  
  // Add-ons (Services and Fees)
  const [selectedAddOns, setSelectedAddOns] = useState([]); // Array of add-on IDs
  
  // Completed prescriptions list (will be loaded from existingUnits)
  const [prescriptions, setPrescriptions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const restorationConfig = currentRestoration ? RESTORATION_TYPES[currentRestoration] : null;
  // Use range selection for bridges, multiple for everything else
  const selectionMode = (currentRestoration === 'BRIDGE' || currentRestoration === 'IMPLANT_BRIDGE') ? 'range' : 'multiple';
  
  // Arch quadrant mapping for dentures
  const ARCH_QUADRANTS = {
    upper: ['UR', 'UL'],
    lower: ['LR', 'LL'],
    both: ['UR', 'UL', 'LR', 'LL']
  };

  // Get already used teeth from current prescriptions only (existingUnits are converted to prescriptions)
  const usedTeeth = prescriptions.flatMap(p => p.units.map(u => u.tooth).filter(Boolean));
  
  const highlightedTeeth = {};
  
  // Show missing teeth in step 2 of RPD wizard (grayed out with red border)
  if (currentRestoration === 'DENTURE_PARTIAL' && rpdWizardStep === 2) {
    rpdMissingTeeth.forEach(tooth => {
      highlightedTeeth[tooth] = {
        color: '#6b7280', // Gray for missing teeth
        label: 'X',
        opacity: 0.4,
        borderColor: '#dc2626',
        borderWidth: 3
      };
    });
  }
  
  // Gray out missing teeth in steps 3-9 (with lighter opacity)
  if (currentRestoration === 'DENTURE_PARTIAL' && rpdWizardStep >= 3) {
    rpdMissingTeeth.forEach(tooth => {
      highlightedTeeth[tooth] = {
        color: '#9ca3af', // Light gray
        label: '',
        opacity: 0.3,
        borderColor: '#9ca3af',
        borderWidth: 2
      };
    });
  }
  
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
  
  // Add RPD component annotations in steps 3-9 with colored borders
  if (currentRestoration === 'DENTURE_PARTIAL' && rpdWizardStep >= 3) {
    // Add major connector visual indicator to selected teeth
    if (rpdWizardStep >= 6) {
      // Show major connector on selected teeth or all teeth if in selection mode
      const upperTeeth = rpdWizardStep === 6 && rpdSelectedArch !== 'lower' ? 
        (rpdMajorConnectorTeeth.length > 0 ? rpdMajorConnectorTeeth : Array.from({length: 16}, (_, i) => i + 1).filter(t => !rpdMissingTeeth.includes(t))) : 
        rpdMajorConnectorTeeth;
      const lowerTeeth = rpdWizardStep === 6 && rpdSelectedArch !== 'upper' ? 
        (rpdMajorConnectorTeethLower.length > 0 ? rpdMajorConnectorTeethLower : Array.from({length: 16}, (_, i) => i + 17).filter(t => !rpdMissingTeeth.includes(t))) : 
        rpdMajorConnectorTeethLower;
      
      [...upperTeeth, ...lowerTeeth].forEach(tooth => {
        if (highlightedTeeth[tooth]) {
          highlightedTeeth[tooth].hasMajorConnector = true;
        } else {
          highlightedTeeth[tooth] = {
            color: rpdWizardStep === 6 ? '#64748b' : 'transparent',
            label: '',
            hasMajorConnector: true,
            borderColor: '#475569',
            borderWidth: rpdWizardStep === 6 ? 2 : 1
          };
        }
      });
    }
    
    Object.entries(rpdComponentsByTooth).forEach(([tooth, components]) => {
      if (components && components.length > 0) {
        // Build annotation from components with specific codes
        const labels = components.map(comp => {
          // Clasp type abbreviations
          if (comp.type === 'clasps' || comp.type === 'clasp') {
            if (comp.component === 'akers') return `CB${comp.surface || ''}`;
            if (comp.component === 'c-clasp') return `CC${comp.surface || ''}`;
            if (comp.component === 'back-action') return `CH${comp.surface || ''}`;
            if (comp.component === 'i-bar') return `CI${comp.surface || ''}`;
            if (comp.component === 'rpi-clasp') return `CR${comp.surface || ''}`;
            if (comp.component === 'ring-clasp') return 'CG';
            if (comp.component === 'circumferential') return `CF${comp.surface || ''}`;
            return `C${comp.surface || ''}`;
          }
          // Rest type abbreviations
          if (comp.type === 'rests' || comp.type === 'rest') {
            if (comp.component === 'occlusal-mesial') return 'RM';
            if (comp.component === 'occlusal-distal') return 'RD';
            if (comp.component === 'occlusal-both') return 'RMD';
            if (comp.component === 'cingulum') return 'RC';
            if (comp.component === 'incisal') return 'RI';
            return 'R';
          }
          // Reciprocation abbreviations
          if (comp.type === 'reciprocation') return `Rp${comp.surface || ''}`;
          // Minor connector abbreviations
          if (comp.type === 'minorconnectors' || comp.type === 'minor') return 'Mn';
          // Indirect retention abbreviations
          if (comp.type === 'indirectretention' || comp.type === 'indirect') return 'IR';
          return 'C';
        });
        
        // Determine border color based on component types
        let borderColor = '#f59e0b'; // Amber default
        const hasClassp = components.some(c => c.type === 'clasps' || c.type === 'clasp');
        const hasRest = components.some(c => c.type === 'rests' || c.type === 'rest');
        const hasReciprocation = components.some(c => c.type === 'reciprocation');
        
        if (hasClassp && hasRest && hasReciprocation) {
          borderColor = '#16a34a'; // Green for complete retention
        } else if (hasClassp && hasRest) {
          borderColor = '#2563eb'; // Blue for clasp + rest
        } else if (hasClassp) {
          borderColor = '#dc2626'; // Red for clasp only
        } else if (hasRest) {
          borderColor = '#7c3aed'; // Purple for rest only
        }
        
        // If tooth already has a restoration, show RPD as secondary annotation
        if (highlightedTeeth[tooth] && highlightedTeeth[tooth].label) {
          highlightedTeeth[tooth].secondaryLabel = labels.join('+');
          highlightedTeeth[tooth].borderColor = borderColor;
          highlightedTeeth[tooth].borderWidth = 4;
        } else if (!rpdMissingTeeth.includes(parseInt(tooth))) {
          // No existing restoration and not missing, show RPD directly
          highlightedTeeth[tooth] = {
            color: '#f59e0b', // Amber for RPD components
            label: labels.join(' '),
            borderColor: borderColor,
            borderWidth: 4
          };
        }
      }
    });
  }

  // Convert existing units to prescriptions on initial load
  useEffect(() => {
    if (initialLoadDone || !existingUnits || existingUnits.length === 0) {
      return;
    }

    const convertedPrescriptions = [];
    const processedUnits = new Set();
    
    existingUnits.forEach((unit, index) => {
      if (processedUnits.has(index)) return;
      
      const tooth = toUniversal(unit.tooth); // Convert to Universal numbering
      const type = unit.type;
      const material = unit.material;
      const shade = unit.shade;
      
      // Check if this is a bridge unit
      if (type?.includes('Bridge')) {
        // Find all connected bridge units with same material/shade
        const bridgeUnits = existingUnits.filter((u, i) => 
          !processedUnits.has(i) && 
          u.type?.includes('Bridge') && 
          u.material === material &&
          u.shade === shade
        );
        
        // Sort by tooth number
        bridgeUnits.sort((a, b) => a.tooth - b.tooth);
        
        // Mark as processed
        existingUnits.forEach((u, i) => {
          if (bridgeUnits.includes(u)) processedUnits.add(i);
        });
        
        // Determine restoration type (regular bridge vs implant bridge)
        const isImplantBridge = type?.toLowerCase().includes('implant');
        const restorationType = isImplantBridge ? 'IMPLANT_BRIDGE' : 'BRIDGE';
        
        // Build tooth roles
        const toothRoles = {};
        const units = bridgeUnits.map(u => {
          const universalTooth = toUniversal(u.tooth);
          const role = u.type?.includes('Pontic') ? 'pontic' : 'retainer';
          toothRoles[universalTooth] = role;
          return {
            tooth: universalTooth,
            type: u.type,
            role: role,
            material: u.material,
            shade: u.shade,
            instructions: u.instructions || ''
          };
        });
        
        const teeth = bridgeUnits.map(u => toUniversal(u.tooth));
        
        convertedPrescriptions.push({
          id: `rx-existing-${Date.now()}-${index}`,
          type: restorationType,
          label: `${RESTORATION_TYPES[restorationType].label} #${teeth.join(', ')}`,
          teeth: teeth,
          toothRoles: toothRoles,
          material: material,
          shade: shade,
          implantSystem: unit.implantSystem || '',
          abutmentType: unit.abutmentType || '',
          instructions: bridgeUnits[0]?.instructions || '',
          units: units
        });
      } 
      // Check for denture units
      else if (type?.toLowerCase().includes('denture')) {
        processedUnits.add(index);
        
        const isPartial = type?.toLowerCase().includes('partial');
        const isFull = type?.toLowerCase().includes('full') || type?.toLowerCase().includes('complete');
        const arch = unit.arch || (tooth > 20 ? 'Lower' : 'Upper');
        
        if (isPartial) {
          convertedPrescriptions.push({
            id: `rx-existing-${Date.now()}-${index}`,
            type: 'DENTURE_PARTIAL',
            label: `Partial Denture - ${arch}`,
            arch: arch,
            material: material,
            shade: shade,
            teeth: tooth ? [tooth] : [],
            toothRoles: {},
            rpdComponents: unit.rpdComponents || [],
            rpdDetails: unit.rpdDetails || {},
            instructions: unit.instructions || '',
            units: [{
              type: type,
              arch: arch,
              material: material,
              shade: shade,
              instructions: unit.instructions || '',
              teeth: tooth ? [tooth] : [],
              toothRoles: {}
            }]
          });
        } else if (isFull) {
          convertedPrescriptions.push({
            id: `rx-existing-${Date.now()}-${index}`,
            type: 'DENTURE_FULL',
            label: `Full Denture - ${arch}`,
            arch: arch,
            material: material,
            shade: shade,
            instructions: unit.instructions || '',
            units: [{
              type: type,
              arch: arch,
              material: material,
              shade: shade,
              instructions: unit.instructions || ''
            }]
          });
        }
      }
      // Regular single-tooth restorations
      else if (tooth) {
        processedUnits.add(index);
        
        // Determine restoration type from unit type
        let restorationType = 'CROWN'; // default
        const lowerType = type?.toLowerCase() || '';
        
        if (lowerType.includes('veneer')) restorationType = 'VENEER';
        else if (lowerType.includes('inlay') || lowerType.includes('onlay')) restorationType = 'INLAY_ONLAY';
        else if (lowerType.includes('implant') && lowerType.includes('crown')) restorationType = 'IMPLANT_CROWN';
        else if (lowerType.includes('crown')) restorationType = 'CROWN';
        
        convertedPrescriptions.push({
          id: `rx-existing-${Date.now()}-${index}`,
          type: restorationType,
          label: `${RESTORATION_TYPES[restorationType].label} #${tooth}`,
          teeth: [tooth],
          toothRoles: {},
          material: material,
          shade: shade,
          implantSystem: unit.implantSystem || '',
          abutmentType: unit.abutmentType || '',
          surfaces: unit.surfaces || null,
          instructions: unit.instructions || '',
          units: [{
            tooth: tooth,
            type: type,
            material: material,
            shade: shade,
            instructions: unit.instructions || ''
          }]
        });
      }
    });
    
    if (convertedPrescriptions.length > 0) {
      setPrescriptions(convertedPrescriptions);
    }
    
    setInitialLoadDone(true);
  }, [existingUnits, initialLoadDone]);

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
      
      // Reset RPD wizard state
      if (type === 'DENTURE_PARTIAL') {
        setRpdWizardStep(1);
        setRpdSelectedArch(null);
        setRpdMissingTeeth([]);
        setCurrentRpdComponent(null);
        setCurrentComponentSurface(null);
        setRpdComponentsByTooth({});
        setRpdMajorConnector(null);
        setRpdMajorConnectorLower(null);
        setRpdMajorConnectorTeeth([]);
        setRpdMajorConnectorTeethLower([]);
        setRpdReviewComplete(false);
      }
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
      
      // For RPD, validate that we have the required design elements
      if (currentRestoration === 'DENTURE_PARTIAL') {
        if (!rpdSelectedArch) {
          alert('Please select arch for RPD');
          return;
        }
        if (rpdMissingTeeth.length === 0) {
          alert('Please mark missing teeth');
          return;
        }
      }
      
      const archLabel = currentRestoration === 'DENTURE_PARTIAL' 
        ? (rpdSelectedArch === 'upper' ? 'Upper' : rpdSelectedArch === 'lower' ? 'Lower' : 'Both')
        : (selectedArchForDenture ? selectedArchForDenture.charAt(0).toUpperCase() + selectedArchForDenture.slice(1) : currentArch);
      
      const newPrescription = {
        id: `rx-${Date.now()}`,
        type: currentRestoration,
        label: `${RESTORATION_TYPES[currentRestoration].label} - ${archLabel}`,
        arch: archLabel,
        material: currentMaterial,
        shade: restorationConfig.category === 'Removable' ? currentShade : null,
        instructions: currentInstructions,
        teeth: currentRestoration === 'DENTURE_PARTIAL' ? rpdMissingTeeth : [],
        rpdComponentsByTooth: currentRestoration === 'DENTURE_PARTIAL' ? rpdComponentsByTooth : null,
        rpdMajorConnector: currentRestoration === 'DENTURE_PARTIAL' ? rpdMajorConnector?.name : null,
        rpdMajorConnectorLower: currentRestoration === 'DENTURE_PARTIAL' && rpdSelectedArch === 'both' ? rpdMajorConnectorLower?.name : null,
        addOns: selectedAddOns.length > 0 ? selectedAddOns : null,
        units: [{
          type: RESTORATION_TYPES[currentRestoration].label,
          arch: archLabel,
          material: currentMaterial,
          shade: currentShade,
          instructions: currentInstructions,
          missingTeeth: currentRestoration === 'DENTURE_PARTIAL' ? rpdMissingTeeth : [],
          rpdComponentsByTooth: currentRestoration === 'DENTURE_PARTIAL' ? rpdComponentsByTooth : null,
          rpdMajorConnector: currentRestoration === 'DENTURE_PARTIAL' ? rpdMajorConnector?.name : null,
          rpdMajorConnectorLower: currentRestoration === 'DENTURE_PARTIAL' && rpdSelectedArch === 'both' ? rpdMajorConnectorLower?.name : null
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
        addOns: selectedAddOns.length > 0 ? selectedAddOns : null,
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
    
    // Reset RPD wizard state
    if (currentRestoration === 'DENTURE_PARTIAL') {
      setRpdWizardStep(1);
      setRpdSelectedArch(null);
      setRpdMissingTeeth([]);
      setRpdComponentsByTooth({});
      setRpdMajorConnector(null);
      setRpdMajorConnectorLower(null);
      setRpdMajorConnectorTeeth([]);
      setRpdMajorConnectorTeethLower([]);
      setCurrentRpdComponent(null);
      setCurrentComponentSurface(null);
      setRpdReviewComplete(false);
    }
    // Don't reset currentRestoration - allows adding multiple of same type
  };


  const handleRemovePrescription = (id) => {
    setPrescriptions(prescriptions.filter(p => p.id !== id));
  };
  
  const handleEditPrescription = (rx) => {
    setEditingId(rx.id);
    // Detect shade system from the shade value
    const detectedShadeSystem = rx.shadeSystem || detectShadeSystem(rx.shade);
    setEditForm({
      material: rx.material,
      shade: rx.shade || '',
      shadeSystem: detectedShadeSystem,
      implantSystem: rx.implantSystem || '',
      abutmentType: rx.abutmentType || 'Custom Abutment',
      instructions: rx.instructions || '',
      teeth: rx.teeth || [],
      toothRoles: rx.toothRoles || {},
      arch: rx.arch || 'Upper',
      surfaces: rx.surfaces || {},
      rpdComponentsByTooth: rx.rpdComponentsByTooth || {},
      rpdMajorConnector: rx.rpdMajorConnector || null,
      addOns: rx.addOns || []
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
          rpdComponentsByTooth: editForm.rpdComponentsByTooth,
          rpdMajorConnector: editForm.rpdMajorConnector,
          rpdMajorConnectorLower: editForm.rpdMajorConnectorLower,
          addOns: editForm.addOns
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

      {/* Modern Restoration Type Selector */}
      <div className={styles.restorationSelector}>
        <h3 className={styles.selectorTitle}>Select Restoration Type</h3>
        <div className={styles.restorationGrid}>
          {Object.entries(RESTORATION_TYPES).map(([key, resto]) => (
            <button
              key={key}
              type="button"
              className={`${styles.restorationCard} ${currentRestoration === key ? styles.active : ''}`}
              onClick={() => handleRestorationTypeSelect(key)}
              style={{
                '--resto-color': resto.color,
                borderColor: currentRestoration === key ? resto.color : 'var(--border-color)'
              }}
            >
              <div className={styles.cardIcon} style={{ backgroundColor: resto.color }}>
                <img src={resto.icon} alt={resto.label} />
              </div>
              <div className={styles.cardContent}>
                <div className={styles.cardLabel}>{resto.label}</div>
                <div className={styles.cardCategory}>{resto.category}</div>
              </div>
              {currentRestoration === key && (
                <div className={styles.activeIndicator}>✓</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Compact Configuration Toolbar - Only shown when type selected */}
      {currentRestoration && (
      <div className={styles.compactToolbar}>
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
        </div>
      )}
      
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

      {/* Add-Ons Section (Services & Fees) */}
      {currentRestoration && (
        <div className={styles.addOnsSection}>
          <h4 className={styles.sectionTitle}>Add-Ons (Optional)</h4>
          
          {/* Services - Only show applicable ones */}
          {ADD_ONS.SERVICES.filter(addOn => addOn.applicableTypes.includes(currentRestoration)).length > 0 && (
            <div className={styles.addOnCategory}>
              <label className={styles.categoryLabel}>Services:</label>
              <div className={styles.addOnButtons}>
                {ADD_ONS.SERVICES
                  .filter(addOn => addOn.applicableTypes.includes(currentRestoration))
                  .map(addOn => (
                    <button
                      key={addOn.id}
                      type="button"
                      className={`${styles.addOnBtn} ${selectedAddOns.includes(addOn.id) ? styles.active : ''}`}
                      onClick={() => {
                        if (selectedAddOns.includes(addOn.id)) {
                          setSelectedAddOns(selectedAddOns.filter(id => id !== addOn.id));
                        } else {
                          setSelectedAddOns([...selectedAddOns, addOn.id]);
                        }
                      }}
                    >
                      {addOn.name}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Fees - Only show applicable ones */}
          {ADD_ONS.FEES.filter(addOn => addOn.applicableTypes.includes(currentRestoration)).length > 0 && (
            <div className={styles.addOnCategory}>
              <label className={styles.categoryLabel}>Fees:</label>
              <div className={styles.addOnButtons}>
                {ADD_ONS.FEES
                  .filter(addOn => addOn.applicableTypes.includes(currentRestoration))
                  .map(addOn => (
                    <button
                      key={addOn.id}
                      type="button"
                      className={`${styles.addOnBtn} ${selectedAddOns.includes(addOn.id) ? styles.active : ''}`}
                      onClick={() => {
                        if (selectedAddOns.includes(addOn.id)) {
                          setSelectedAddOns(selectedAddOns.filter(id => id !== addOn.id));
                        } else {
                          setSelectedAddOns([...selectedAddOns, addOn.id]);
                        }
                      }}
                    >
                      {addOn.name}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {selectedAddOns.length > 0 && (
            <div className={styles.selectedAddOns}>
              <strong>Selected Add-Ons:</strong>{' '}
              {selectedAddOns.map(id => {
                const addOn = [...ADD_ONS.SERVICES, ...ADD_ONS.FEES].find(a => a.id === id);
                return addOn?.name;
              }).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Odontogram - Always visible */}
      {currentRestoration && (
        <div className={styles.odontogramSection}>
          
          {/* RPD Wizard (for Partial Denture only) */}
          {currentRestoration === 'DENTURE_PARTIAL' && (
            <div className={styles.rpdWizard}>
              {/* Progress Steps */}
              <div className={styles.wizardSteps}>
                <div className={`${styles.wizardStep} ${rpdWizardStep >= 1 ? styles.active : ''} ${rpdWizardStep > 1 ? styles.completed : ''}`}>
                  <div className={styles.stepNumber}>1</div>
                  <div className={styles.stepLabel}>Arch</div>
                </div>
                <div className={styles.stepConnector}></div>
                <div className={`${styles.wizardStep} ${rpdWizardStep >= 2 ? styles.active : ''} ${rpdWizardStep > 2 ? styles.completed : ''}`}>
                  <div className={styles.stepNumber}>2</div>
                  <div className={styles.stepLabel}>Missing</div>
                </div>
                <div className={styles.stepConnector}></div>
                <div className={`${styles.wizardStep} ${rpdWizardStep >= 3 ? styles.active : ''} ${rpdWizardStep > 3 ? styles.completed : ''}`}>
                  <div className={styles.stepNumber}>3</div>
                  <div className={styles.stepLabel}>Clasps</div>
                </div>
                <div className={styles.stepConnector}></div>
                <div className={`${styles.wizardStep} ${rpdWizardStep >= 4 ? styles.active : ''} ${rpdWizardStep > 4 ? styles.completed : ''}`}>
                  <div className={styles.stepNumber}>4</div>
                  <div className={styles.stepLabel}>Rests</div>
                </div>
                <div className={styles.stepConnector}></div>
                <div className={`${styles.wizardStep} ${rpdWizardStep >= 5 ? styles.active : ''} ${rpdWizardStep > 5 ? styles.completed : ''}`}>
                  <div className={styles.stepNumber}>5</div>
                  <div className={styles.stepLabel}>Reciprocation</div>
                </div>
                <div className={styles.stepConnector}></div>
                <div className={`${styles.wizardStep} ${rpdWizardStep >= 6 ? styles.active : ''} ${rpdWizardStep > 6 ? styles.completed : ''}`}>
                  <div className={styles.stepNumber}>6</div>
                  <div className={styles.stepLabel}>Major Connector</div>
                </div>
                <div className={styles.stepConnector}></div>
                <div className={`${styles.wizardStep} ${rpdWizardStep >= 7 ? styles.active : ''} ${rpdWizardStep > 7 ? styles.completed : ''}`}>
                  <div className={styles.stepNumber}>7</div>
                  <div className={styles.stepLabel}>Minor Connectors</div>
                </div>
                <div className={styles.stepConnector}></div>
                <div className={`${styles.wizardStep} ${rpdWizardStep >= 8 ? styles.active : ''} ${rpdWizardStep > 8 ? styles.completed : ''}`}>
                  <div className={styles.stepNumber}>8</div>
                  <div className={styles.stepLabel}>Indirect Retention</div>
                </div>
                <div className={styles.stepConnector}></div>
                <div className={`${styles.wizardStep} ${rpdWizardStep >= 9 ? styles.active : ''}`}>
                  <div className={styles.stepNumber}>9</div>
                  <div className={styles.stepLabel}>Review</div>
                </div>
              </div>

              {/* Step 1: Arch Selection */}
              {rpdWizardStep === 1 && (
                <div className={styles.wizardContent}>
                  <h3 className={styles.wizardTitle}>Step 1: Select Arch for Partial Denture</h3>
                  <div className={styles.archButtons} style={{flexDirection: 'column', alignItems: 'center', gap: '1rem'}}>
                    <button
                      type="button"
                      className={`${styles.archBtn} ${(rpdSelectedArch === 'upper' || rpdSelectedArch === 'both') ? styles.selected : ''}`}
                      onClick={() => {
                        if (rpdSelectedArch === 'upper') {
                          setRpdSelectedArch(null);
                        } else if (rpdSelectedArch === 'both') {
                          setRpdSelectedArch('lower');
                        } else if (rpdSelectedArch === 'lower') {
                          setRpdSelectedArch('both');
                        } else {
                          setRpdSelectedArch('upper');
                        }
                      }}
                      style={{width: '280px'}}
                    >
                      <span className={styles.archIcon}>⬆</span>
                      <span className={styles.archLabel}>Upper Arch</span>
                      {(rpdSelectedArch === 'upper' || rpdSelectedArch === 'both') && <span className={styles.checkmark}>✓</span>}
                    </button>
                    <button
                      type="button"
                      className={`${styles.archBtn} ${(rpdSelectedArch === 'lower' || rpdSelectedArch === 'both') ? styles.selected : ''}`}
                      onClick={() => {
                        if (rpdSelectedArch === 'lower') {
                          setRpdSelectedArch(null);
                        } else if (rpdSelectedArch === 'both') {
                          setRpdSelectedArch('upper');
                        } else if (rpdSelectedArch === 'upper') {
                          setRpdSelectedArch('both');
                        } else {
                          setRpdSelectedArch('lower');
                        }
                      }}
                      style={{width: '280px'}}
                    >
                      <span className={styles.archIcon}>⬇</span>
                      <span className={styles.archLabel}>Lower Arch</span>
                      {(rpdSelectedArch === 'lower' || rpdSelectedArch === 'both') && <span className={styles.checkmark}>✓</span>}
                    </button>
                  </div>
                  {rpdSelectedArch && rpdSelectedArch !== 'both' && (
                    <div className={styles.archNote}>
                      <p style={{margin: 0, fontSize: '0.875rem', color: '#78350f'}}>
                        💡 Click the other arch button to add opposing arch
                      </p>
                    </div>
                  )}
                  <div className={styles.wizardActions}>
                    <button
                      type="button"
                      className={styles.wizardNextBtn}
                      disabled={!rpdSelectedArch}
                      onClick={() => {
                        setRpdWizardStep(2);
                        setSelectedTeeth([]);
                        setRpdMissingTeeth([]);
                      }}
                    >
                      Next: Identify Missing Teeth →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Missing Teeth Selection */}
              {rpdWizardStep === 2 && (
                <div className={styles.wizardContent}>
                  <h3 className={styles.wizardTitle}>
                    Step 2: Identify Missing Teeth - {
                      rpdSelectedArch === 'upper' ? 'Upper Arch' : 
                      rpdSelectedArch === 'lower' ? 'Lower Arch' : 
                      'Both Arches'
                    }
                  </h3>
                  <p className={styles.wizardHint}>
                    ⚠️ Click on MISSING tooth positions (teeth will be grayed out). These are where artificial teeth will be placed.
                  </p>
                  {rpdMissingTeeth.length > 0 && (
                    <div>
                      <div className={styles.selectedTeethDisplay}>
                        <strong>Missing Teeth:</strong> {rpdMissingTeeth.sort((a, b) => a - b).map(t => `#${t}`).join(', ')}
                      </div>
                      {/* Kennedy Classification */}
                      {(rpdSelectedArch === 'upper' || rpdSelectedArch === 'both') && (() => {
                        const upperClass = calculateKennedyClass(rpdMissingTeeth, 'upper');
                        return upperClass ? (
                          <div style={{ 
                            marginTop: '0.75rem', 
                            padding: '0.75rem', 
                            background: '#dbeafe', 
                            border: '2px solid #3b82f6',
                            borderRadius: '6px',
                            fontWeight: '600',
                            color: '#1e40af'
                          }}>
                            <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Upper Arch:</span>{' '}
                            <span style={{ fontSize: '1rem' }}>Kennedy {upperClass.display}</span>
                          </div>
                        ) : null;
                      })()}
                      {(rpdSelectedArch === 'lower' || rpdSelectedArch === 'both') && (() => {
                        const lowerClass = calculateKennedyClass(rpdMissingTeeth, 'lower');
                        return lowerClass ? (
                          <div style={{ 
                            marginTop: '0.5rem', 
                            padding: '0.75rem', 
                            background: '#fee2e2', 
                            border: '2px solid #ef4444',
                            borderRadius: '6px',
                            fontWeight: '600',
                            color: '#b91c1c'
                          }}>
                            <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Lower Arch:</span>{' '}
                            <span style={{ fontSize: '1rem' }}>Kennedy {lowerClass.display}</span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                  <div className={styles.wizardActions}>
                    <button
                      type="button"
                      className={styles.wizardBackBtn}
                      onClick={() => setRpdWizardStep(1)}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      className={styles.wizardNextBtn}
                      disabled={rpdMissingTeeth.length === 0}
                      onClick={() => {
                        setRpdWizardStep(3);
                        setSelectedTeeth([]);
                        setCurrentRpdComponent(null);
                        setCurrentComponentSurface('B'); // Default to Buccal surface
                      }}
                    >
                      Next: Add Direct Retainers (Clasps) →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Clasps (Direct Retainers) */}
              {rpdWizardStep === 3 && (
                <div className={styles.wizardContent}>
                  <h3 className={styles.wizardTitle}>Step 3: Direct Retainers (Clasps)</h3>
                  <p className={styles.wizardHint}>
                    Select a clasp type and surface, then click on abutment teeth to add it
                  </p>
                  
                  <div className={styles.componentSelectionArea}>
                    <div className={styles.componentButtons}>
                      {RPD_COMPONENTS.CLASPS.map(comp => (
                        <button
                          key={comp.id}
                          type="button"
                          className={`${styles.componentBtn} ${currentRpdComponent?.id === comp.id ? styles.active : ''}`}
                          onClick={() => {
                            setCurrentRpdComponent(comp);
                            if (comp.requiresSurface && !currentComponentSurface) {
                              setCurrentComponentSurface('B'); // Default to Buccal
                            }
                          }}
                        >
                          <span className={styles.componentIcon}>{comp.icon}</span>
                          {comp.name}
                        </button>
                      ))}
                    </div>
                    
                    {currentRpdComponent && currentRpdComponent.requiresSurface && (
                      <div className={styles.surfaceSelector}>
                        <label>Surface:</label>
                        {['B', 'L', 'M', 'D'].map(surface => (
                          <button
                            key={surface}
                            type="button"
                            className={`${styles.surfaceBtn} ${currentComponentSurface === surface ? styles.active : ''}`}
                            onClick={() => setCurrentComponentSurface(surface)}
                          >
                            {surface}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {currentRpdComponent && (
                      <div className={styles.componentHint}>
                      Click abutment teeth on the odontogram to add <strong>{currentRpdComponent.name}</strong>
                        {currentRpdComponent.requiresSurface && currentComponentSurface && ` (${currentComponentSurface} surface)`}
                        {currentRpdComponent.id === 'rpi-clasp' && (
                          <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fef3c7', borderRadius: '4px', fontSize: '0.85rem', color: '#92400e' }}>
                            <strong>⚠️ RPI System:</strong> You must add a Rest (R) in Step 4 and Reciprocal Plate (P) in Step 5 for complete RPI system.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.wizardActions}>
                    <button
                      type="button"
                      className={styles.wizardBackBtn}
                      onClick={() => setRpdWizardStep(2)}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      className={styles.wizardNextBtn}
                      onClick={() => {
                        setRpdWizardStep(4);
                        setCurrentRpdComponent(null);
                        setCurrentComponentSurface(null);
                      }}
                    >
                      Next: Add Rests (Support) →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Rests */}
              {rpdWizardStep === 4 && (
                <div className={styles.wizardContent}>
                  <h3 className={styles.wizardTitle}>Step 4: Rests (Support Elements)</h3>
                  <p className={styles.wizardHint}>
                    Add rests on abutment teeth for vertical support
                  </p>
                  
                  <div className={styles.componentSelectionArea}>
                    <div className={styles.componentButtons}>
                      {RPD_COMPONENTS.RESTS.map(comp => (
                        <button
                          key={comp.id}
                          type="button"
                          className={`${styles.componentBtn} ${currentRpdComponent?.id === comp.id ? styles.active : ''}`}
                          onClick={() => setCurrentRpdComponent(comp)}
                        >
                          <span className={styles.componentIcon}>{comp.icon}</span>
                          {comp.name}
                        </button>
                      ))}
                    </div>
                    
                    {currentRpdComponent && (
                      <div className={styles.componentHint}>
                        👆 Click abutment teeth to add <strong>{currentRpdComponent.name}</strong>
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.wizardActions}>
                    <button
                      type="button"
                      className={styles.wizardBackBtn}
                      onClick={() => setRpdWizardStep(3)}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      className={styles.wizardNextBtn}
                      onClick={() => {
                        setRpdWizardStep(5);
                        setCurrentRpdComponent(null);
                      }}
                    >
                      Next: Add Reciprocation →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 5: Reciprocation */}
              {rpdWizardStep === 5 && (
                <div className={styles.wizardContent}>
                  <h3 className={styles.wizardTitle}>Step 5: Reciprocation Elements</h3>
                  <p className={styles.wizardHint}>
                    Add reciprocal elements to counteract horizontal forces from clasps
                  </p>
                  
                  <div className={styles.componentSelectionArea}>
                    <div className={styles.componentButtons}>
                      {RPD_COMPONENTS.RECIPROCATION.map(comp => (
                        <button
                          key={comp.id}
                          type="button"
                          className={`${styles.componentBtn} ${currentRpdComponent?.id === comp.id ? styles.active : ''}`}
                          onClick={() => {
                            setCurrentRpdComponent(comp);
                            if (comp.requiresSurface && !currentComponentSurface) {
                              setCurrentComponentSurface('B'); // Default to Buccal
                            }
                          }}
                        >
                          <span className={styles.componentIcon}>{comp.icon}</span>
                          {comp.name}
                        </button>
                      ))}
                    </div>
                    
                    {currentRpdComponent && currentRpdComponent.requiresSurface && (
                      <div className={styles.surfaceSelector}>
                        <label>Surface:</label>
                        {['B', 'L', 'M', 'D'].map(surface => (
                          <button
                            key={surface}
                            type="button"
                            className={`${styles.surfaceBtn} ${currentComponentSurface === surface ? styles.active : ''}`}
                            onClick={() => setCurrentComponentSurface(surface)}
                          >
                            {surface}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {currentRpdComponent && (
                      <div className={styles.componentHint}>
                        👆 Click abutment teeth to add <strong>{currentRpdComponent.name}</strong>
                        {currentRpdComponent.requiresSurface && currentComponentSurface && ` (${currentComponentSurface} surface)`}
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.wizardActions}>
                    <button
                      type="button"
                      className={styles.wizardBackBtn}
                      onClick={() => setRpdWizardStep(4)}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      className={styles.wizardNextBtn}
                      onClick={() => {
                        setRpdWizardStep(6);
                        setCurrentRpdComponent(null);
                        setCurrentComponentSurface(null);
                      }}
                    >
                      Next: Select Major Connector →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 6: Major Connector */}
              {rpdWizardStep === 6 && (
                <div className={styles.wizardContent}>
                  <h3 className={styles.wizardTitle}>Step 6: Major Connector</h3>
                  <p className={styles.wizardHint}>
                    {rpdSelectedArch === 'both' 
                      ? 'Select the major connector type for each arch, then click teeth on the odontogram to mark where the connector extends' 
                      : 'Select the type of major connector for this RPD, then click teeth on the odontogram to mark where it extends'}
                  </p>
                  
                  {rpdSelectedArch === 'both' ? (
                    // Both arches: Show two separate sections
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                      {/* Upper Arch Section */}
                      <div>
                        <h4 style={{ 
                          fontSize: '0.95rem', 
                          fontWeight: '600', 
                          color: '#1e40af',
                          marginBottom: '0.75rem',
                          paddingBottom: '0.5rem',
                          borderBottom: '2px solid #3b82f6'
                        }}>
                          Upper Arch Major Connector
                        </h4>
                        <div className={styles.majorConnectorGrid}>
                          {RPD_COMPONENTS.MAJOR_CONNECTORS
                            .filter(conn => conn.arch === 'upper')
                            .map(conn => (
                              <button
                                key={conn.id}
                                type="button"
                                className={`${styles.majorConnectorBtn} ${rpdMajorConnector?.id === conn.id ? styles.selected : ''}`}
                                onClick={() => {
                                  setRpdMajorConnector(conn);
                                  // Auto-select all upper teeth if not already selected
                                  if (rpdMajorConnectorTeeth.length === 0) {
                                    const upperTeeth = Array.from({length: 16}, (_, i) => i + 1).filter(t => !rpdMissingTeeth.includes(t));
                                    setRpdMajorConnectorTeeth(upperTeeth);
                                  }
                                }}
                              >
                                <span className={styles.connectorLabel}>{conn.name}</span>
                                {rpdMajorConnector?.id === conn.id && <span className={styles.checkmark}>✓</span>}
                              </button>
                            ))}
                        </div>
                      </div>
                      
                      {/* Lower Arch Section */}
                      <div>
                        <h4 style={{ 
                          fontSize: '0.95rem', 
                          fontWeight: '600', 
                          color: '#b91c1c',
                          marginBottom: '0.75rem',
                          paddingBottom: '0.5rem',
                          borderBottom: '2px solid #ef4444'
                        }}>
                          Lower Arch Major Connector
                        </h4>
                        <div className={styles.majorConnectorGrid}>
                          {RPD_COMPONENTS.MAJOR_CONNECTORS
                            .filter(conn => conn.arch === 'lower')
                            .map(conn => (
                              <button
                                key={conn.id}
                                type="button"
                                className={`${styles.majorConnectorBtn} ${rpdMajorConnectorLower?.id === conn.id ? styles.selected : ''}`}
                                onClick={() => {
                                  setRpdMajorConnectorLower(conn);
                                  // Auto-select all lower teeth if not already selected
                                  if (rpdMajorConnectorTeethLower.length === 0) {
                                    const lowerTeeth = Array.from({length: 16}, (_, i) => i + 17).filter(t => !rpdMissingTeeth.includes(t));
                                    setRpdMajorConnectorTeethLower(lowerTeeth);
                                  }
                                }}
                              >
                                <span className={styles.connectorLabel}>{conn.name}</span>
                                {rpdMajorConnectorLower?.id === conn.id && <span className={styles.checkmark}>✓</span>}
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Single arch: Show original layout
                    <div className={styles.majorConnectorGrid}>
                      {RPD_COMPONENTS.MAJOR_CONNECTORS
                        .filter(conn => conn.arch === rpdSelectedArch)
                        .map(conn => (
                          <button
                            key={conn.id}
                            type="button"
                            className={`${styles.majorConnectorBtn} ${rpdMajorConnector?.id === conn.id ? styles.selected : ''}`}
                            onClick={() => {
                              setRpdMajorConnector(conn);
                              // Auto-select all arch teeth if not already selected
                              const teethList = rpdSelectedArch === 'upper' ? 
                                Array.from({length: 16}, (_, i) => i + 1).filter(t => !rpdMissingTeeth.includes(t)) :
                                Array.from({length: 16}, (_, i) => i + 17).filter(t => !rpdMissingTeeth.includes(t));
                              if (rpdSelectedArch === 'upper' && rpdMajorConnectorTeeth.length === 0) {
                                setRpdMajorConnectorTeeth(teethList);
                              } else if (rpdSelectedArch === 'lower' && rpdMajorConnectorTeethLower.length === 0) {
                                setRpdMajorConnectorTeethLower(teethList);
                              }
                            }}
                          >
                            <span className={styles.connectorLabel}>{conn.name}</span>
                            {rpdMajorConnector?.id === conn.id && <span className={styles.checkmark}>✓</span>}
                          </button>
                        ))}
                    </div>
                  )}
                  
                  {(rpdMajorConnector || rpdMajorConnectorLower) && (
                    <div className={styles.componentHint} style={{ marginTop: '1rem', background: '#f1f5f9', padding: '0.75rem', borderRadius: '6px' }}>
                      👆 Click teeth on the odontogram to customize where the major connector extends. The connector is shown as a bar on the palatal/lingual side.
                    </div>
                  )}
                  
                  <div className={styles.wizardActions}>
                    <button
                      type="button"
                      className={styles.wizardBackBtn}
                      onClick={() => setRpdWizardStep(5)}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      className={styles.wizardNextBtn}
                      disabled={rpdSelectedArch === 'both' ? (!rpdMajorConnector || !rpdMajorConnectorLower) : !rpdMajorConnector}
                      onClick={() => setRpdWizardStep(7)}
                    >
                      Next: Add Minor Connectors →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 7: Minor Connectors */}
              {rpdWizardStep === 7 && (
                <div className={styles.wizardContent}>
                  <h3 className={styles.wizardTitle}>Step 7: Minor Connectors</h3>
                  <p className={styles.wizardHint}>
                    Add minor connectors to connect components to major connector
                  </p>
                  
                  <div className={styles.componentSelectionArea}>
                    <div className={styles.componentButtons}>
                      {RPD_COMPONENTS.MINOR_CONNECTORS.map(comp => (
                        <button
                          key={comp.id}
                          type="button"
                          className={`${styles.componentBtn} ${currentRpdComponent?.id === comp.id ? styles.active : ''}`}
                          onClick={() => setCurrentRpdComponent(comp)}
                        >
                          <span className={styles.componentIcon}>{comp.icon}</span>
                          {comp.name}
                        </button>
                      ))}
                    </div>
                    
                    {currentRpdComponent && (
                      <div className={styles.componentHint}>
                        👆 Click teeth to add <strong>{currentRpdComponent.name}</strong>
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.wizardActions}>
                    <button
                      type="button"
                      className={styles.wizardBackBtn}
                      onClick={() => setRpdWizardStep(6)}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      className={styles.wizardNextBtn}
                      onClick={() => {
                        setRpdWizardStep(8);
                        setCurrentRpdComponent(null);
                      }}
                    >
                      Next: Add Indirect Retention →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 8: Indirect Retention */}
              {rpdWizardStep === 8 && (
                <div className={styles.wizardContent}>
                  <h3 className={styles.wizardTitle}>Step 8: Indirect Retention</h3>
                  <p className={styles.wizardHint}>
                    Add indirect retainers to resist rotational movement (optional)
                  </p>
                  
                  <div className={styles.componentSelectionArea}>
                    <div className={styles.componentButtons}>
                      {RPD_COMPONENTS.INDIRECT_RETENTION.map(comp => (
                        <button
                          key={comp.id}
                          type="button"
                          className={`${styles.componentBtn} ${currentRpdComponent?.id === comp.id ? styles.active : ''}`}
                          onClick={() => setCurrentRpdComponent(comp)}
                        >
                          <span className={styles.componentIcon}>{comp.icon}</span>
                          {comp.name}
                        </button>
                      ))}
                    </div>
                    
                    {currentRpdComponent && currentRpdComponent.requiresTooth && (
                      <div className={styles.componentHint}>
                        👆 Click teeth to add <strong>{currentRpdComponent.name}</strong>
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.wizardActions}>
                    <button
                      type="button"
                      className={styles.wizardBackBtn}
                      onClick={() => setRpdWizardStep(7)}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      className={styles.wizardNextBtn}
                      onClick={() => {
                        setRpdWizardStep(9);
                        setCurrentRpdComponent(null);
                      }}
                    >
                      Next: Review & Edit →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 9: Review & Edit */}
              {rpdWizardStep === 9 && (
                <div className={styles.wizardContent}>
                  <h3 className={styles.wizardTitle}>Step 9: Review & Final Adjustments</h3>
                  <p className={styles.wizardHint}>
                    Review your RPD design. Click any component type below to add/remove additional components.
                  </p>
                  
                  <div className={styles.reviewSummary}>
                    <div className={styles.summaryItem}>
                      <strong>Arch:</strong> {
                        rpdSelectedArch === 'upper' ? 'Upper' :
                        rpdSelectedArch === 'lower' ? 'Lower' : 'Both'
                      }
                    </div>
                    <div className={styles.summaryItem}>
                      <strong>Missing Teeth:</strong> {rpdMissingTeeth.sort((a, b) => a - b).map(t => `#${t}`).join(', ')}
                    </div>
                    <div className={styles.summaryItem}>
                      <strong>Major Connector:</strong> {
                        rpdSelectedArch === 'both' 
                          ? `Upper: ${rpdMajorConnector?.name || 'None'} | Lower: ${rpdMajorConnectorLower?.name || 'None'}`
                          : rpdMajorConnector?.name || 'None'
                      }
                    </div>
                    <div className={styles.summaryItem}>
                      <strong>Components:</strong> {Object.keys(rpdComponentsByTooth).length} teeth with components
                    </div>
                  </div>
                  
                  <div className={styles.editComponentsArea}>
                    <h4>Add/Remove Components:</h4>
                    <div className={styles.componentCategories}>
                      {Object.entries(RPD_COMPONENTS).map(([category, components]) => {
                        if (category === 'MAJOR_CONNECTORS') return null;
                        return (
                          <div key={category} className={styles.componentCategory}>
                            <h5>{category.replace(/_/g, ' ')}</h5>
                            <div className={styles.componentButtons}>
                              {components.map(comp => (
                                <button
                                  key={comp.id}
                                  type="button"
                                  className={`${styles.componentBtn} ${styles.small} ${currentRpdComponent?.id === comp.id ? styles.active : ''}`}
                                  onClick={() => {
                                    setCurrentRpdComponent(currentRpdComponent?.id === comp.id ? null : comp);
                                    setCurrentComponentSurface(null);
                                  }}
                                >
                                  {comp.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {currentRpdComponent && currentRpdComponent.requiresSurface && (
                      <div className={styles.surfaceSelector}>
                        <label>Surface:</label>
                        {['B', 'L', 'M', 'D'].map(surface => (
                          <button
                            key={surface}
                            type="button"
                            className={`${styles.surfaceBtn} ${currentComponentSurface === surface ? styles.active : ''}`}
                            onClick={() => setCurrentComponentSurface(surface)}
                          >
                            {surface}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {currentRpdComponent && (
                      <div className={styles.componentHint}>
                        👆 Click teeth on the odontogram to add/remove <strong>{currentRpdComponent.name}</strong>
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.wizardActions}>
                    <button
                      type="button"
                      className={styles.wizardBackBtn}
                      onClick={() => setRpdWizardStep(8)}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      className={`${styles.wizardNextBtn} ${rpdReviewComplete ? styles.completed : ''}`}
                      onClick={() => setRpdReviewComplete(true)}
                    >
                      {rpdReviewComplete ? '✓ Reviewed' : 'Review Design →'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
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
            selectedTeeth={rpdWizardStep === 2 ? rpdMissingTeeth : rpdWizardStep === 6 ? [...rpdMajorConnectorTeeth, ...rpdMajorConnectorTeethLower] : selectedTeeth}
            onSelectionChange={(teeth) => {
              // Step 2: Selecting missing teeth (will be grayed out)
              if (currentRestoration === 'DENTURE_PARTIAL' && rpdWizardStep === 2) {
                setRpdMissingTeeth(teeth);
                return;
              }
              
              // Step 6: Selecting teeth for major connector visualization
              if (currentRestoration === 'DENTURE_PARTIAL' && rpdWizardStep === 6) {
                const upperTeeth = teeth.filter(t => t <= 16);
                const lowerTeeth = teeth.filter(t => t > 16);
                if (rpdSelectedArch === 'upper' || rpdSelectedArch === 'both') {
                  setRpdMajorConnectorTeeth(upperTeeth);
                }
                if (rpdSelectedArch === 'lower' || rpdSelectedArch === 'both') {
                  setRpdMajorConnectorTeethLower(lowerTeeth);
                }
                return;
              }
              
              // Steps 3-9: If RPD component mode is active, add component to tooth
              if (currentRestoration === 'DENTURE_PARTIAL' && rpdWizardStep >= 3 && currentRpdComponent) {
                // Don't allow components on missing teeth
                let validTeeth = teeth.filter(t => !rpdMissingTeeth.includes(t));
                
                // Tooth type validation for specific components
                const isAnterior = (tooth) => {
                  const num = Number(tooth);
                  return (num >= 6 && num <= 11) || (num >= 22 && num <= 27);
                };
                const isPosterior = (tooth) => !isAnterior(tooth);
                
                // Filter teeth based on component restrictions
                if (currentRpdComponent.id === 'occlusal-mesial' || currentRpdComponent.id === 'occlusal-distal' || currentRpdComponent.id === 'occlusal-both') {
                  validTeeth = validTeeth.filter(isPosterior);
                  if (validTeeth.length === 0) {
                    alert('Occlusal rests can only be placed on posterior teeth (premolars and molars)');
                    return;
                  }
                } else if (currentRpdComponent.id === 'cingulum') {
                  validTeeth = validTeeth.filter(isAnterior);
                  if (validTeeth.length === 0) {
                    alert('Cingulum rests can only be placed on anterior teeth (incisors and canines)');
                    return;
                  }
                } else if (currentRpdComponent.id === 'incisal') {
                  validTeeth = validTeeth.filter(isAnterior);
                  if (validTeeth.length === 0) {
                    alert('Incisal rests can only be placed on anterior teeth');
                    return;
                  }
                }
                
                const newComponents = { ...rpdComponentsByTooth };
                validTeeth.forEach(tooth => {
                  if (!newComponents[tooth]) {
                    newComponents[tooth] = [];
                  }
                  
                  // Determine component type based on current step
                  let componentType = 'other';
                  if (rpdWizardStep === 3) componentType = 'clasps';
                  else if (rpdWizardStep === 4) componentType = 'rests';
                  else if (rpdWizardStep === 5) componentType = 'reciprocation';
                  else if (rpdWizardStep === 7) componentType = 'minorconnectors';
                  else if (rpdWizardStep === 8) componentType = 'indirectretention';
                  else if (rpdWizardStep === 9) {
                    // In review mode, determine from component
                    if (RPD_COMPONENTS.CLASPS.some(c => c.id === currentRpdComponent.id)) componentType = 'clasps';
                    else if (RPD_COMPONENTS.RESTS.some(c => c.id === currentRpdComponent.id)) componentType = 'rests';
                    else if (RPD_COMPONENTS.RECIPROCATION.some(c => c.id === currentRpdComponent.id)) componentType = 'reciprocation';
                    else if (RPD_COMPONENTS.MINOR_CONNECTORS.some(c => c.id === currentRpdComponent.id)) componentType = 'minorconnectors';
                    else if (RPD_COMPONENTS.INDIRECT_RETENTION.some(c => c.id === currentRpdComponent.id)) componentType = 'indirectretention';
                  }
                  
                  const componentData = {
                    type: componentType,
                    component: currentRpdComponent.id,
                    name: currentRpdComponent.name,
                    surface: currentComponentSurface
                  };
                  
                  // Check if component already exists (by id and surface)
                  const existingIndex = newComponents[tooth].findIndex(c => c.component === componentData.component && c.surface === componentData.surface);
                  if (existingIndex >= 0) {
                    // Remove if clicking again (toggle off)
                    newComponents[tooth].splice(existingIndex, 1);
                  } else {
                    // Validation: prevent multiple clasps of same type on same tooth
                    if (componentType === 'clasps') {
                      const existingClaspIndex = newComponents[tooth].findIndex(c => c.type === 'clasps');
                      if (existingClaspIndex >= 0) {
                        // Replace existing clasp with new one
                        const existingName = newComponents[tooth][existingClaspIndex].name;
                        if (window.confirm(`This tooth already has ${existingName}. Replace it with ${componentData.name}?`)) {
                          newComponents[tooth].splice(existingClaspIndex, 1);
                        } else {
                          return; // User cancelled, don't add new clasp
                        }
                      }
                    }
                    
                    // RPI System: If adding RPI clasp, warn if missing rest or reciprocation
                    if (currentRpdComponent.id === 'rpi-clasp') {
                      const hasRest = newComponents[tooth].some(c => c.type === 'rests');
                      const hasReciprocation = newComponents[tooth].some(c => c.type === 'reciprocation');
                      if (!hasRest) {
                        alert('⚠️ RPI system incomplete: Add a Rest in Step 4 for this tooth.');
                      }
                      if (!hasReciprocation) {
                        alert('⚠️ RPI system incomplete: Add Reciprocal Plate in Step 5 for this tooth.');
                      }
                    }
                    
                    newComponents[tooth].push(componentData);
                  }
                  
                  // Clean up empty arrays
                  if (newComponents[tooth].length === 0) {
                    delete newComponents[tooth];
                  }
                });
                setRpdComponentsByTooth(newComponents);
                // Don't actually select the tooth for RPD mode
              } else {
                // Normal selection mode
                setSelectedTeeth(teeth);
              }
            }}
            mode={
              (currentRestoration === 'DENTURE_PARTIAL' && (rpdWizardStep === 2 || (rpdWizardStep === 6 && (rpdMajorConnector || rpdMajorConnectorLower)) || (rpdWizardStep >= 3 && currentRpdComponent))) 
                ? 'multiple' 
                : selectionMode
            }
            disabledTeeth={
              currentRestoration === 'DENTURE_PARTIAL' && rpdWizardStep >= 2
                ? (() => {
                    // Disable non-selected arches
                    const disabledByArch = [];
                    if (rpdSelectedArch === 'upper') {
                      // Disable lower arch teeth (17-32)
                      for (let i = 17; i <= 32; i++) disabledByArch.push(i);
                    } else if (rpdSelectedArch === 'lower') {
                      // Disable upper arch teeth (1-16)
                      for (let i = 1; i <= 16; i++) disabledByArch.push(i);
                    }
                    // Both arches: no arch restriction
                    
                    // In step 2, only disable by arch
                    if (rpdWizardStep === 2) {
                      return disabledByArch;
                    }
                    
                    // In steps 3+, also allow clicking on all available teeth for components
                    return rpdWizardStep >= 3 && currentRpdComponent ? disabledByArch : [...usedTeeth, ...disabledByArch];
                  })()
                : usedTeeth
            }
            highlightedTeeth={highlightedTeeth}
            allowCrossQuadrant={currentRestoration === 'BRIDGE' || currentRestoration === 'IMPLANT_BRIDGE'}
            archSelectionMode={currentRestoration === 'DENTURE_FULL'}
            onArchSelect={setSelectedArchForDenture}
            selectedArch={selectedArchForDenture}
          />
          
          {/* Show RPD Components by Tooth */}
          {currentRestoration === 'DENTURE_PARTIAL' && rpdWizardStep >= 3 && Object.keys(rpdComponentsByTooth).length > 0 && (
            <>
              <div className={styles.rpdComponentsLegend}>
                <strong>Component Markings:</strong>
                <div className={styles.legendItems}>
                  <div className={styles.legendItem}>
                    <span className={styles.legendBorder} style={{borderColor: '#dc2626'}}></span>
                    <span>Clasp Only</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendBorder} style={{borderColor: '#7c3aed'}}></span>
                    <span>Rest Only</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendBorder} style={{borderColor: '#2563eb'}}></span>
                    <span>Clasp + Rest</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendBorder} style={{borderColor: '#16a34a'}}></span>
                    <span>Complete (Clasp + Rest + Reciprocation)</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendBorder} style={{borderColor: '#f59e0b'}}></span>
                    <span>Other Components</span>
                  </div>
                </div>
              </div>
              <div className={styles.rpdComponentsList}>
                <strong>Components Added:</strong>
              {Object.entries(rpdComponentsByTooth)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([tooth, components]) => (
                  components.length > 0 && (
                    <div key={tooth} className={styles.toothComponentItem}>
                      <span className={styles.toothNumber}>#{tooth}:</span>
                      <span className={styles.componentList}>
                        {components.map(c => `${c.name}${c.surface ? ` (${c.surface})` : ''}`).join(', ')}
                      </span>
                      <button
                        type="button"
                        className={styles.removeComponentBtn}
                        onClick={() => {
                          const newComponents = { ...rpdComponentsByTooth };
                          delete newComponents[tooth];
                          setRpdComponentsByTooth(newComponents);
                        }}
                        title="Remove all components from this tooth"
                      >
                        ✕
                      </button>
                    </div>
                  )
                ))}
              </div>
            </>
          )}
          
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

          {(!currentRestoration || currentRestoration !== 'DENTURE_PARTIAL' || rpdReviewComplete) && (
            <button
              type="button"
              onClick={handleAddToPrescription}
              className="button primary"
              style={{width: '100%', marginTop: '0.75rem'}}
            >
              + Add to Prescription {currentRestoration && `(${RESTORATION_TYPES[currentRestoration].label})`}
            </button>
          )}
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
                            {[...Array(32)].map((_, i) => {
                              const toothNum = i + 1; // Universal numbering 1-32
                              
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
                          <label>RPD Components by Tooth:</label>
                          
                          {/* Major Connector(s) */}
                          {rx.arch === 'Both' ? (
                            <div>
                              <div className={styles.editRow}>
                                <label style={{ color: '#1e40af' }}>Major Connector (Upper):</label>
                                <select
                                  value={editForm.rpdMajorConnector?.id || ''}
                                  onChange={(e) => {
                                    const selected = RPD_COMPONENTS.MAJOR_CONNECTORS.find(c => c.id === e.target.value);
                                    setEditForm({
                                      ...editForm,
                                      rpdMajorConnector: selected || null
                                    });
                                  }}
                                  className={styles.editSelect}
                                >
                                  <option value="">Select...</option>
                                  {RPD_COMPONENTS.MAJOR_CONNECTORS
                                    .filter(conn => conn.arch === 'upper')
                                    .map(conn => (
                                      <option key={conn.id} value={conn.id}>{conn.name}</option>
                                    ))}
                                </select>
                              </div>
                              <div className={styles.editRow}>
                                <label style={{ color: '#b91c1c' }}>Major Connector (Lower):</label>
                                <select
                                  value={editForm.rpdMajorConnectorLower?.id || ''}
                                  onChange={(e) => {
                                    const selected = RPD_COMPONENTS.MAJOR_CONNECTORS.find(c => c.id === e.target.value);
                                    setEditForm({
                                      ...editForm,
                                      rpdMajorConnectorLower: selected || null
                                    });
                                  }}
                                  className={styles.editSelect}
                                >
                                  <option value="">Select...</option>
                                  {RPD_COMPONENTS.MAJOR_CONNECTORS
                                    .filter(conn => conn.arch === 'lower')
                                    .map(conn => (
                                      <option key={conn.id} value={conn.id}>{conn.name}</option>
                                    ))}
                                </select>
                              </div>
                            </div>
                          ) : (
                            <div className={styles.editRow}>
                              <label>Major Connector:</label>
                              <select
                                value={editForm.rpdMajorConnector?.id || ''}
                                onChange={(e) => {
                                  const selected = RPD_COMPONENTS.MAJOR_CONNECTORS.find(c => c.id === e.target.value);
                                  setEditForm({
                                    ...editForm,
                                    rpdMajorConnector: selected || null
                                  });
                                }}
                                className={styles.editSelect}
                              >
                                <option value="">Select...</option>
                                {RPD_COMPONENTS.MAJOR_CONNECTORS.map(conn => (
                                  <option key={conn.id} value={conn.id}>{conn.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          
                          {/* Components by Tooth */}
                          <div className={styles.rpdTeethList}>
                            {Object.keys(editForm.rpdComponentsByTooth || {})
                              .sort((a, b) => Number(a) - Number(b))
                              .map(toothNum => {
                                const components = editForm.rpdComponentsByTooth[toothNum];
                                return (
                                  <div key={toothNum} className={styles.rpdToothItem}>
                                    <div className={styles.rpdToothHeader}>
                                      <strong>Tooth #{toothNum}</strong>
                                      <button
                                        type="button"
                                        className={styles.removeToothBtn}
                                        onClick={() => {
                                          const updated = { ...editForm.rpdComponentsByTooth };
                                          delete updated[toothNum];
                                          setEditForm({
                                            ...editForm,
                                            rpdComponentsByTooth: updated
                                          });
                                        }}
                                        title="Remove all components from this tooth"
                                      >
                                        × Remove All
                                      </button>
                                    </div>
                                    <div className={styles.rpdComponentsList}>
                                      {components.map((comp, idx) => (
                                        <div key={idx} className={styles.rpdComponentTag}>
                                          <span>{comp.name}</span>
                                          {comp.surface && <span className={styles.surface}>({comp.surface})</span>}
                                          <button
                                            type="button"
                                            className={styles.removeCompBtn}
                                            onClick={() => {
                                              const updated = { ...editForm.rpdComponentsByTooth };
                                              updated[toothNum] = updated[toothNum].filter((_, i) => i !== idx);
                                              if (updated[toothNum].length === 0) {
                                                delete updated[toothNum];
                                              }
                                              setEditForm({
                                                ...editForm,
                                                rpdComponentsByTooth: updated
                                              });
                                            }}
                                            title="Remove this component"
                                          >
                                            ×
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            
                            {(!editForm.rpdComponentsByTooth || Object.keys(editForm.rpdComponentsByTooth).length === 0) && (
                              <div className={styles.noComponents}>No components added</div>
                            )}
                          </div>
                          
                          {/* Add Component Interface */}
                          <div className={styles.addComponentInterface}>
                            <label>Add New Component:</label>
                            <div className={styles.addComponentForm}>
                              <select
                                className={styles.editSelect}
                                onChange={(e) => {
                                  const toothNum = e.target.value;
                                  if (toothNum) {
                                    setEditForm({
                                      ...editForm,
                                      _selectedTooth: toothNum,
                                      _selectedComponent: null,
                                      _selectedSurface: null
                                    });
                                  }
                                }}
                                value={editForm._selectedTooth || ''}
                              >
                                <option value="">1. Select Tooth...</option>
                                {[...Array(32)].map((_, i) => (
                                  <option key={i + 1} value={i + 1}>Tooth #{i + 1}</option>
                                ))}
                              </select>
                              
                              {editForm._selectedTooth && (
                                <select
                                  className={styles.editSelect}
                                  onChange={(e) => {
                                    const [category, componentId] = e.target.value.split('|');
                                    if (componentId) {
                                      const component = RPD_COMPONENTS[category]?.find(c => c.id === componentId);
                                      setEditForm({
                                        ...editForm,
                                        _selectedComponent: component,
                                        _selectedComponentCategory: category,
                                        _selectedSurface: null
                                      });
                                    }
                                  }}
                                  value={editForm._selectedComponent ? `${editForm._selectedComponentCategory}|${editForm._selectedComponent.id}` : ''}
                                >
                                  <option value="">2. Select Component...</option>
                                  {Object.entries(RPD_COMPONENTS).map(([category, components]) => {
                                    if (category === 'MAJOR_CONNECTORS') return null;
                                    return (
                                      <optgroup key={category} label={category.replace(/_/g, ' ')}>
                                        {components.map(comp => (
                                          <option key={comp.id} value={`${category}|${comp.id}`}>
                                            {comp.name}
                                          </option>
                                        ))}
                                      </optgroup>
                                    );
                                  })}
                                </select>
                              )}
                              
                              {editForm._selectedComponent?.requiresSurface && (
                                <select
                                  className={styles.editSelect}
                                  onChange={(e) => {
                                    setEditForm({
                                      ...editForm,
                                      _selectedSurface: e.target.value
                                    });
                                  }}
                                  value={editForm._selectedSurface || ''}
                                >
                                  <option value="">3. Select Surface...</option>
                                  <option value="B">Buccal (B)</option>
                                  <option value="L">Lingual (L)</option>
                                  <option value="M">Mesial (M)</option>
                                  <option value="D">Distal (D)</option>
                                </select>
                              )}
                              
                              <button
                                type="button"
                                className="button primary"
                                disabled={!editForm._selectedTooth || !editForm._selectedComponent || (editForm._selectedComponent?.requiresSurface && !editForm._selectedSurface)}
                                onClick={() => {
                                  const toothNum = editForm._selectedTooth;
                                  const component = editForm._selectedComponent;
                                  const surface = editForm._selectedSurface;
                                  
                                  const updated = { ...editForm.rpdComponentsByTooth };
                                  if (!updated[toothNum]) {
                                    updated[toothNum] = [];
                                  }
                                  
                                  updated[toothNum].push({
                                    type: editForm._selectedComponentCategory.toLowerCase().replace(/_/g, ''),
                                    component: component.id,
                                    name: component.name,
                                    surface: surface || null
                                  });
                                  
                                  setEditForm({
                                    ...editForm,
                                    rpdComponentsByTooth: updated,
                                    _selectedTooth: null,
                                    _selectedComponent: null,
                                    _selectedSurface: null,
                                    _selectedComponentCategory: null
                                  });
                                }}
                              >
                                + Add Component
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Add-Ons in Edit Mode */}
                      <div className={styles.editAddOns}>
                        <label>Add-Ons (Optional):</label>
                        
                        {/* Services - Only show applicable ones */}
                        {ADD_ONS.SERVICES.filter(addOn => addOn.applicableTypes.includes(rx.type)).length > 0 && (
                          <div className={styles.addOnCategory}>
                            <span className={styles.categoryLabel}>Services:</span>
                            <div className={styles.addOnButtons}>
                              {ADD_ONS.SERVICES
                                .filter(addOn => addOn.applicableTypes.includes(rx.type))
                                .map(addOn => (
                                  <button
                                    key={addOn.id}
                                    type="button"
                                    className={`${styles.addOnBtn} ${editForm.addOns?.includes(addOn.id) ? styles.active : ''}`}
                                    onClick={() => {
                                      const current = editForm.addOns || [];
                                      const updated = current.includes(addOn.id)
                                        ? current.filter(id => id !== addOn.id)
                                        : [...current, addOn.id];
                                      setEditForm({
                                        ...editForm,
                                        addOns: updated
                                      });
                                    }}
                                  >
                                    {addOn.name}
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Fees - Only show applicable ones */}
                        {ADD_ONS.FEES.filter(addOn => addOn.applicableTypes.includes(rx.type)).length > 0 && (
                          <div className={styles.addOnCategory}>
                            <span className={styles.categoryLabel}>Fees:</span>
                            <div className={styles.addOnButtons}>
                              {ADD_ONS.FEES
                                .filter(addOn => addOn.applicableTypes.includes(rx.type))
                                .map(addOn => (
                                  <button
                                    key={addOn.id}
                                    type="button"
                                    className={`${styles.addOnBtn} ${editForm.addOns?.includes(addOn.id) ? styles.active : ''}`}
                                    onClick={() => {
                                      const current = editForm.addOns || [];
                                      const updated = current.includes(addOn.id)
                                        ? current.filter(id => id !== addOn.id)
                                        : [...current, addOn.id];
                                      setEditForm({
                                        ...editForm,
                                        addOns: updated
                                      });
                                    }}
                                  >
                                    {addOn.name}
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
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
                      {rx.rpdComponentsByTooth && Object.keys(rx.rpdComponentsByTooth).length > 0 && (
                        <span>• RPD Components: {Object.keys(rx.rpdComponentsByTooth).length} teeth</span>
                      )}
                      {rx.rpdMajorConnector && (
                        <span>• Major Connector: {
                          rx.arch === 'Both' && rx.rpdMajorConnectorLower
                            ? `Upper: ${rx.rpdMajorConnector.name}, Lower: ${rx.rpdMajorConnectorLower.name}`
                            : rx.rpdMajorConnector.name
                        }</span>
                      )}
                      {rx.addOns && rx.addOns.length > 0 && (
                        <span className={styles.addOnsTag}>
                          + {rx.addOns.length} Add-on{rx.addOns.length > 1 ? 's' : ''}
                        </span>
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
