import React, { useMemo } from 'react';
import { 
  IconCheck, 
  IconDrill, 
  IconMicroscope, 
  IconAlert,
  IconBox,
  IconFile,
  IconTooth,
  IconTruck,
  IconFire, // Ensure this is exported from LabIcons or use fallback
  IconLayers // Ensure this is exported from LabIcons or use fallback
} from '../../../layouts/components/LabIcons';
import styles from './CaseDetailStepper.module.css';

// --- ICON MAPPING ---
const getStageIcon = (stageId) => {
  if (stageId.includes('received')) return <IconBox width="16" height="16" />;
  if (stageId.includes('model')) return <IconTooth width="16" height="16" />;
  if (stageId.includes('design')) return <IconFile width="16" height="16" />;
  if (stageId.includes('waxup')) return <IconDrill width="16" height="16" />; 
  if (stageId.includes('milling')) return <IconDrill width="16" height="16" />;
  if (stageId.includes('casting')) return <IconFire width="16" height="16" />; // Fire for Casting
  if (stageId.includes('processing')) return <IconLayers width="16" height="16" />; // Layers for Acrylic/Ortho
  if (stageId.includes('finishing')) return <IconMicroscope width="16" height="16" />;
  if (stageId.includes('qc')) return <IconCheck width="16" height="16" />;
  if (stageId.includes('shipped')) return <IconTruck width="16" height="16" />;
  if (stageId.includes('hold')) return <IconAlert width="16" height="16" />;
  return null;
};

// --- WORKFLOW DEFINITIONS ---
const WORKFLOWS = {
  // 1. DENTURES / REMOVABLES (Analog/Hybrid)
  // Path: Model -> Wax-up -> Processing (Acrylic) -> Finish
  REMOVABLE: [
    'stage-new', 'stage-received', 'stage-model', 'stage-waxup', 
    'stage-processing', 'stage-finishing', 'stage-qc', 'stage-shipped'
  ],

  // 2. CAST METAL / PFM (Analog)
  // Path: Model -> Wax-up -> Casting -> Finish (Ceramics)
  CASTING: [
    'stage-new', 'stage-received', 'stage-model', 'stage-waxup', 
    'stage-casting', 'stage-finishing', 'stage-qc', 'stage-shipped'
  ],

  // 3. ORTHO / SPLINTS (Thermoforming/Printing)
  // Path: Model -> Processing (Thermoform) or Milling (Print) -> Finish
  ORTHO: [
    'stage-new', 'stage-received', 'stage-model', 'stage-processing', 
    'stage-finishing', 'stage-qc', 'stage-shipped'
  ],

  // 4. IMPLANTS (Complex Digital)
  // Path: Model (Soft Tissue) -> Design -> Milling -> Finish
  IMPLANT: [
    'stage-new', 'stage-received', 'stage-model', 'stage-design', 
    'stage-milling', 'stage-finishing', 'stage-qc', 'stage-shipped'
  ],

  // 5. STANDARD DIGITAL (Crowns, Bridges)
  // Path: Design -> Milling -> Finish
  FIXED_DIGITAL: [
    'stage-new', 'stage-received', 'stage-design', 'stage-milling', 
    'stage-finishing', 'stage-qc', 'stage-shipped'
  ]
};

const detectWorkflow = (activeCase) => {
  if (!activeCase) return 'FIXED_DIGITAL';

  const tags = (activeCase.tags || []).map(t => t.toLowerCase());
  const itemTypes = (activeCase.units || []).map(u => u.type.toLowerCase()).join(' ');

  // 1. Orthodontics (Nightguards, Splints, Retainers)
  if (tags.includes('ortho') || tags.includes('splint') || itemTypes.includes('nightguard') || itemTypes.includes('retainer')) {
    return 'ORTHO';
  }

  // 2. Implants (Abutments, Screw-Retained)
  if (tags.includes('implant') || itemTypes.includes('implant') || itemTypes.includes('abutment')) {
    return 'IMPLANT';
  }

  // 3. Removables (Dentures) - Exclude "Partial" if it's metal (handled by Casting)
  if (itemTypes.includes('denture') && !itemTypes.includes('partial')) {
    return 'REMOVABLE';
  }

  // 4. Casting (Gold, PFM, Metal Partials)
  if (tags.includes('metal') || tags.includes('gold') || itemTypes.includes('cast') || itemTypes.includes('pfm')) {
    return 'CASTING';
  }

  // 5. Removable Partials (Acrylic) - Fallback if not metal
  if (tags.includes('removable') || itemTypes.includes('partial')) {
    return 'REMOVABLE';
  }

  // Default
  return 'FIXED_DIGITAL';
};

const CaseDetailStepper = ({ activeCase, stages }) => {
  const currentStatus = activeCase?.status;

  // 1. Determine Workflow
  const workflowKey = useMemo(() => detectWorkflow(activeCase), [activeCase]);
  const relevantStageIds = WORKFLOWS[workflowKey];

  // 2. Filter & Order Stages
  const displayStages = useMemo(() => {
    // Get stage objects that match the workflow IDs
    const filtered = stages.filter(s => relevantStageIds.includes(s.id));
    
    // Sort them based on the order defined in the WORKFLOW array (Source of Truth)
    return filtered.sort((a, b) => {
      return relevantStageIds.indexOf(a.id) - relevantStageIds.indexOf(b.id);
    });
  }, [stages, relevantStageIds]);

  const currentStageIndex = displayStages.findIndex(s => s.id === currentStatus);

  // Helper to determine visual state
  const getStepStateClass = (stageId, index) => {
    if (currentStatus === stageId) return `${styles.step} ${styles.active}`;
    
    // Logic for "Completed":
    // 1. If the current status is IN the list, any index before it is complete.
    if (currentStageIndex !== -1) {
      if (index < currentStageIndex) return `${styles.step} ${styles.completed}`;
    } else {
      // 2. If current status (e.g., Hold) is NOT in the list, we check global order
      const stageObj = stages.find(s => s.id === stageId);
      const currentStageObj = stages.find(s => s.id === currentStatus);
      if (currentStageObj && stageObj && stageObj.order < currentStageObj.order) {
        return `${styles.step} ${styles.completed}`;
      }
    }
    
    return styles.step;
  };

  return (
    <section className={styles.stepperCard}>
      <div className={styles.stepper}>
        {displayStages.map((stage, index) => {
          const isCompleted = getStepStateClass(stage.id, index).includes('completed');

          return (
            <div key={stage.id} className={getStepStateClass(stage.id, index)}>
              <div className={styles.stepCircle}>
                {isCompleted ? (
                  <IconCheck width="16" height="16" />
                ) : (
                  getStageIcon(stage.id) || <span style={{fontSize: '0.75rem'}}>{index + 1}</span>
                )}
              </div>
              <span className={styles.stepLabel}>{stage.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default CaseDetailStepper;