import React from 'react';
import StatusBadge from '../StatusBadge';
import styles from './PrescriptionUnitsView.module.css';

/**
 * Prescription-style Unit Display
 * Groups related units (bridges, dentures) for better clinical view
 */

const PrescriptionUnitsView = ({ units, onUnitClick }) => {
  // Group units into prescriptions
  const groupedUnits = groupUnitsByPrescription(units);

  return (
    <div className={styles.prescriptionView}>
      {groupedUnits.map((group, idx) => (
        <PrescriptionGroup
          key={group.id || idx}
          group={group}
          onUnitClick={onUnitClick}
        />
      ))}
    </div>
  );
};

// Group units by prescription logic
const groupUnitsByPrescription = (units) => {
  const groups = [];
  const processed = new Set();

  units.forEach((unit, idx) => {
    if (processed.has(idx)) return;

    // Check if it's part of a bridge
    if (unit.type?.includes('Bridge')) {
      const bridgeUnits = findBridgeUnits(units, idx);
      bridgeUnits.forEach(i => processed.add(i));
      
      const bridgeTeeth = bridgeUnits.map(i => units[i].tooth).sort((a, b) => a - b);
      groups.push({
        id: `bridge-${bridgeTeeth.join('-')}`,
        type: 'bridge',
        label: `${units[idx].material || ''} Bridge`,
        teeth: bridgeTeeth,
        units: bridgeUnits.map(i => units[i]),
        material: units[idx].material,
        shade: units[idx].shade,
        status: deriveGroupStatus(bridgeUnits.map(i => units[i]))
      });
    } 
    // Check if it is a denture (arch-based)
    else if (unit.arch) {
      processed.add(idx);
      groups.push({
        id: `denture-${unit.arch}-${idx}`,
        type: 'denture',
        label: `${unit.type || 'Denture'} - ${unit.arch}`,
        arch: unit.arch,
        units: [unit],
        material: unit.material,
        shade: unit.shade,
        status: unit.status
      });
    }
    // Individual restoration
    else {
      processed.add(idx);
      groups.push({
        id: `single-${unit.tooth}-${idx}`,
        type: 'single',
        label: unit.type || 'Crown',
        tooth: unit.tooth,
        units: [unit],
        material: unit.material,
        shade: unit.shade,
        status: unit.status
      });
    }
  });

  return groups;
};

// Find all units that are part of the same bridge
const findBridgeUnits = (units, startIdx) => {
  const indices = [startIdx];
  const startUnit = units[startIdx];
  
  // Simple logic: consecutive teeth with "Bridge" in type
  for (let i = 0; i < units.length; i++) {
    if (i !== startIdx && 
        units[i].type?.includes('Bridge') &&
        units[i].material === startUnit.material &&
        units[i].shade === startUnit.shade) {
      indices.push(i);
    }
  }
  
  return indices;
};

// Derive overall status for grouped units
const deriveGroupStatus = (units) => {
  if (units.some(u => u.status === 'stage-hold')) return 'stage-hold';
  if (units.every(u => u.status === 'stage-shipped')) return 'stage-shipped';
  if (units.every(u => u.status === 'stage-delivered')) return 'stage-delivered';
  
  // Return earliest stage
  const stages = ['stage-new', 'stage-design', 'stage-milling', 'stage-finishing', 'stage-qc', 'stage-ready-to-ship'];
  for (const stage of stages) {
    if (units.some(u => u.status === stage)) return stage;
  }
  
  return units[0]?.status || 'stage-new';
};

const PrescriptionGroup = ({ group, onUnitClick }) => {
  const isBridge = group.type === 'bridge';
  const isDenture = group.type === 'denture';

  return (
    <div className={`${styles.prescriptionGroup} ${styles[group.type]}`}>
      <div className={styles.groupHeader}>
        <div className={styles.groupInfo}>
          <h4 className={styles.groupLabel}>{group.label}</h4>
          <div className={styles.groupMeta}>
            {isBridge && (
              <span className={styles.teeth}>
                Teeth: {group.teeth.map(t => `#${t}`).join(', ')}
              </span>
            )}
            {isDenture && (
              <span className={styles.arch}>
                {group.arch} Arch
              </span>
            )}
            {!isBridge && !isDenture && group.tooth && (
              <span className={styles.tooth}>
                Tooth #{group.tooth}
              </span>
            )}
            {group.material && (
              <span className={styles.material}>• {group.material}</span>
            )}
            {group.shade && (
              <span className={styles.shade}>• Shade {group.shade}</span>
            )}
          </div>
        </div>
        <StatusBadge status={group.status} />
      </div>

      {/* Bridge unit breakdown */}
      {isBridge && (
        <div className={styles.bridgeUnits}>
          {group.units.map((unit, idx) => (
            <button
              key={unit.id || idx}
              className={styles.unitChip}
              onClick={() => onUnitClick && onUnitClick(unit)}
            >
              <span className={styles.unitTooth}>#{unit.tooth}</span>
              <span className={styles.unitType}>
                {unit.type?.includes('Abutment') ? 'Abutment' : 'Pontic'}
              </span>
              <StatusBadge status={unit.status} small />
            </button>
          ))}
        </div>
      )}

      {/* Individual unit actions */}
      {!isBridge && group.units[0] && (
        <div className={styles.unitActions}>
          <button
            className={styles.detailBtn}
            onClick={() => onUnitClick && onUnitClick(group.units[0])}
          >
            View Details
          </button>
        </div>
      )}

      {/* Instructions if present */}
      {group.units[0]?.instructions && (
        <div className={styles.instructions}>
          <strong>Instructions:</strong> {group.units[0].instructions}
        </div>
      )}
    </div>
  );
};

export default PrescriptionUnitsView;
