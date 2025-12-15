import React, { useState } from 'react';
import StatusBadge from '../StatusBadge';
import Modal from '../../common/Modal';
import { 
  IconTooth, 
  IconMill, 
  IconLayers, 
  IconAlert,
  IconChevronRight 
} from '../../../layouts/components/LabIcons';
import styles from './PrescriptionUnitsView.module.css';

const getUnitIcon = (type) => {
  const lowerType = (type || '').toLowerCase();
  if (lowerType.includes('implant') || lowerType.includes('abutment')) return <IconMill width="20" height="20" />;
  if (lowerType.includes('denture') || lowerType.includes('partial')) return <IconLayers width="20" height="20" />;
  return <IconTooth width="20" height="20" />;
};

/**
 * Prescription-style Unit Display
 * Groups related units (bridges, dentures) for better clinical view
 */

const PrescriptionUnitsView = ({ units, onUnitClick, onUnitUpdate, stages, caseId, updateUnitStatus }) => {
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdReason, setHoldReason] = useState('');

  // Group units into prescriptions
  const groupedUnits = groupUnitsByPrescription(units);

  const handleViewDetails = (unit) => {
    setSelectedUnit(unit);
    setShowDetailModal(true);
  };

  const handleHoldClick = (unit) => {
    setSelectedUnit(unit);
    setShowHoldModal(true);
  };

  const handleUnhold = async (unit) => {
    if (updateUnitStatus) {
      await updateUnitStatus(unit.id, 'stage-design');
      setSelectedUnit(null);
    }
  };

  const handleConfirmHold = async () => {
    if (selectedUnit && updateUnitStatus && holdReason.trim()) {
      await updateUnitStatus(selectedUnit.id, 'stage-hold', holdReason);
      setShowHoldModal(false);
      setHoldReason('');
      setSelectedUnit(null);
    }
  };

  const getProgressPercent = (status) => {
    if (status === 'stage-shipped' || status === 'stage-delivered') return 100;
    if (!stages) return 0;
    const stage = stages.find(s => s.id === status);
    if (!stage) return 0;
    return Math.min(100, Math.max(5, (stage.order / 11) * 100));
  };

  return (
    <div className="card">
      <h3 className={styles.sectionTitle}>
        Prescription Units ({groupedUnits.length})
      </h3>
      
      <div className={styles.prescriptionView}>
        {groupedUnits.map((group, idx) => (
          <PrescriptionGroup
            key={group.id || idx}
            group={group}
            onViewDetails={handleViewDetails}
            onHoldClick={handleHoldClick}
            onUnhold={handleUnhold}
            getProgressPercent={getProgressPercent}
          />
        ))}
      </div>

      {/* Unit Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Unit Details"
        size="large"
      >
        {selectedUnit && (
          <div className={styles.unitDetailContent}>
            {/* Basic Details */}
            <div className={styles.detailSection}>
              <h4 className={styles.detailSectionTitle}>Basic Information</h4>
              <div className={styles.detailGrid}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Type:</span>
                  <span className={styles.detailValue}>{selectedUnit.type}</span>
                </div>
                {selectedUnit.tooth && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Tooth:</span>
                    <span className={styles.detailValue}>#{selectedUnit.tooth}</span>
                  </div>
                )}
                {selectedUnit.arch && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Arch:</span>
                    <span className={styles.detailValue}>{selectedUnit.arch}</span>
                  </div>
                )}
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Material:</span>
                  <span className={styles.detailValue}>{selectedUnit.material || 'N/A'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Shade:</span>
                  <span className={styles.detailValue}>{selectedUnit.shade || 'N/A'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Status:</span>
                  <StatusBadge status={selectedUnit.status} />
                </div>
              </div>
            </div>

            {/* Removable Partial Denture Details */}
            {selectedUnit.rpdComponentsByTooth && Object.keys(selectedUnit.rpdComponentsByTooth).length > 0 && (
              <div className={styles.detailSection}>
                <h4 className={styles.detailSectionTitle}>RPD Components by Tooth</h4>
                <div className={styles.rpdComponentsDetail}>
                  {Object.entries(selectedUnit.rpdComponentsByTooth)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([tooth, components]) => (
                      <div key={tooth} className={styles.toothComponentGroup}>
                        <div className={styles.toothComponentHeader}>
                          <strong>Tooth #{tooth}</strong>
                          <span className={styles.componentCount}>{components.length} component{components.length > 1 ? 's' : ''}</span>
                        </div>
                        <div className={styles.componentsList}>
                          {components.map((comp, idx) => (
                            <div key={idx} className={styles.componentItem}>
                              <span className={styles.componentType}>{comp.type}</span>
                              <span className={styles.componentName}>{comp.component}</span>
                              {comp.surface && <span className={styles.componentSurface}>{comp.surface}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Major Connector */}
            {selectedUnit.rpdMajorConnector && (
              <div className={styles.detailSection}>
                <h4 className={styles.detailSectionTitle}>Major Connector</h4>
                <div className={styles.majorConnectorDetail}>
                  <div className={styles.connectorItem}>
                    <span className={styles.connectorLabel}>Upper Arch:</span>
                    <span className={styles.connectorValue}>{selectedUnit.rpdMajorConnector}</span>
                  </div>
                  {selectedUnit.rpdMajorConnectorLower && (
                    <div className={styles.connectorItem}>
                      <span className={styles.connectorLabel}>Lower Arch:</span>
                      <span className={styles.connectorValue}>{selectedUnit.rpdMajorConnectorLower}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Missing Teeth */}
            {selectedUnit.missingTeeth && selectedUnit.missingTeeth.length > 0 && (
              <div className={styles.detailSection}>
                <h4 className={styles.detailSectionTitle}>Missing Teeth</h4>
                <div className={styles.missingTeethDetail}>
                  {selectedUnit.missingTeeth.sort((a, b) => a - b).map(tooth => (
                    <span key={tooth} className={styles.toothBadge}>#{tooth}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            {selectedUnit.instructions && (
              <div className={styles.detailSection}>
                <h4 className={styles.detailSectionTitle}>Special Instructions</h4>
                <div className={styles.instructionsDetail}>
                  {selectedUnit.instructions}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Hold Modal */}
      <Modal
        isOpen={showHoldModal}
        onClose={() => {
          setShowHoldModal(false);
          setHoldReason('');
          setSelectedUnit(null);
        }}
        title="Put Unit On Hold"
        icon={<IconAlert width="20" height="20" />}
        size="small"
        variant="danger"
        footer={
          <>
            <button className="button text" onClick={() => {
              setShowHoldModal(false);
              setHoldReason('');
              setSelectedUnit(null);
            }}>
              Cancel
            </button>
            <button 
              className="button primary danger" 
              onClick={handleConfirmHold}
              disabled={!holdReason.trim()}
            >
              Confirm Hold
            </button>
          </>
        }
      >
        <div style={{ padding: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Reason for Hold
          </label>
          <textarea
            className="input"
            style={{ width: '100%', minHeight: '100px', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}
            placeholder="e.g., Unclear margin, Material shortage..."
            value={holdReason}
            onChange={(e) => setHoldReason(e.target.value)}
            autoFocus
          />
        </div>
      </Modal>
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

// Derive next status when unholding
const deriveNextStatus = (currentStatus) => {
  // If on hold, return to new/design stage
  if (currentStatus === 'stage-hold') return 'stage-design';
  return currentStatus;
};

const PrescriptionGroup = ({ group, onViewDetails, onHoldClick, onUnhold, getProgressPercent }) => {
  const isBridge = group.type === 'bridge';
  const isDenture = group.type === 'denture';
  const isOnHold = group.status === 'stage-hold';
  const progress = getProgressPercent(group.status);

  return (
    <div className={`${styles.unitItem} ${isOnHold ? styles.unitHold : ''}`}>
      {/* Header */}
      <div className={styles.unitHeader}>
        <div className={styles.identity}>
          <span className={styles.typeIcon}>{getUnitIcon(group.units[0]?.type)}</span>
          <div className={styles.idText}>
            {isBridge && (
              <span className={styles.toothBadge}>
                Teeth: {group.teeth.map(t => `#${t}`).join(', ')}
              </span>
            )}
            {isDenture && (
              <span className={styles.toothBadge}>
                {group.arch} Arch
              </span>
            )}
            {!isBridge && !isDenture && group.tooth && (
              <span className={styles.toothBadge}>
                Tooth #{group.tooth}
              </span>
            )}
            <strong>{group.label}</strong>
          </div>
        </div>
        <StatusBadge status={group.status} />
      </div>

      {/* Details */}
      <div className={styles.unitDetails}>
        <div className={styles.detailCol}>
          <span className={styles.label}>Material</span>
          <span>{group.material || '-'}</span>
        </div>
        <div className={styles.detailCol}>
          <span className={styles.label}>Shade</span>
          <span>{group.shade || '-'}</span>
        </div>
        {isBridge && (
          <div className={styles.detailCol}>
            <span className={styles.label}>Units</span>
            <span>{group.units.length}</span>
          </div>
        )}
      </div>

      {/* Bridge unit breakdown */}
      {isBridge && group.units.length > 0 && (
        <div className={styles.bridgeUnits}>
          <span className={styles.label}>Bridge Components:</span>
          <div className={styles.unitChips}>
            {group.units.map((unit, idx) => (
              <button
                key={unit.id || idx}
                className={styles.unitChip}
                onClick={() => onViewDetails && onViewDetails(unit)}
                title="Click to view details"
              >
                #{unit.tooth} - {unit.type?.includes('Abutment') || unit.type?.includes('Retainer') ? 'Abutment' : 'Pontic'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Denture details */}
      {isDenture && group.units[0] && (
        <>
          {/* RPD Components Summary */}
          {group.units[0].rpdComponentsByTooth && Object.keys(group.units[0].rpdComponentsByTooth).length > 0 && (
            <div className={styles.dentureDetails}>
              <div className={styles.dentureRow}>
                <span className={styles.label}>Components:</span>
                <span className={styles.dentureValue}>
                  {Object.keys(group.units[0].rpdComponentsByTooth).length} teeth with components
                </span>
              </div>
              <div className={styles.componentSummary}>
                {Object.entries(group.units[0].rpdComponentsByTooth)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .slice(0, 5)
                  .map(([tooth, components]) => (
                    <span key={tooth} className={styles.componentBadge}>
                      #{tooth}: {components.length}
                    </span>
                  ))}
                {Object.keys(group.units[0].rpdComponentsByTooth).length > 5 && (
                  <span className={styles.componentBadge}>
                    +{Object.keys(group.units[0].rpdComponentsByTooth).length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Major Connector */}
          {group.units[0].rpdMajorConnector && (
            <div className={styles.dentureDetails}>
              <div className={styles.dentureRow}>
                <span className={styles.label}>Major Connector:</span>
                <span className={styles.dentureValue}>{group.units[0].rpdMajorConnector}</span>
              </div>
              {group.units[0].rpdMajorConnectorLower && (
                <div className={styles.dentureRow}>
                  <span className={styles.label}>Lower Connector:</span>
                  <span className={styles.dentureValue}>{group.units[0].rpdMajorConnectorLower}</span>
                </div>
              )}
            </div>
          )}

          {/* Missing Teeth */}
          {group.units[0].missingTeeth && group.units[0].missingTeeth.length > 0 && (
            <div className={styles.dentureDetails}>
              <div className={styles.dentureRow}>
                <span className={styles.label}>Missing Teeth:</span>
                <div className={styles.missingTeethList}>
                  {group.units[0].missingTeeth.sort((a, b) => a - b).map(tooth => (
                    <span key={tooth} className={styles.toothBadgeSmall}>#{tooth}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Instructions */}
      {group.units[0]?.instructions && (
        <div className={styles.instructions}>
          <span className={styles.label}>Notes:</span> {group.units[0].instructions}
        </div>
      )}

      {/* Hold reason if on hold */}
      {isOnHold && group.units[0]?.holdReason && (
        <div className={styles.instructions} style={{ marginTop: '0.5rem', borderColor: 'var(--error-500)', color: 'var(--error-500)' }}>
          <strong>Hold Reason:</strong> {group.units[0].holdReason}
        </div>
      )}

      {/* Action Row with Progress Bar */}
      <div className={styles.actionRow}>
        <div className={styles.progressTrack} title={`${progress}% Complete`}>
          <div 
            className={styles.progressBar} 
            style={{ width: `${progress}%`, backgroundColor: isOnHold ? 'var(--error-500)' : 'var(--primary)' }}
          />
        </div>

        <div className={styles.buttons}>
          {!isOnHold && group.status !== 'stage-shipped' && (
            <button 
              className={`icon-button ${styles.actionBtn} ${styles.holdBtn}`}
              onClick={() => onHoldClick && onHoldClick(group.units[0])}
              title="Put on Hold"
            >
              <IconAlert width="16" height="16" />
            </button>
          )}

          {isOnHold && (
            <button 
              className="button primary"
              onClick={() => onUnhold && onUnhold(group.units[0])}
            >
              Resume Production
            </button>
          )}

          <button
            className={`button secondary ${styles.detailsBtn}`}
            onClick={() => onViewDetails && onViewDetails(group.units[0])}
          >
            View Details
            <IconChevronRight width="14" height="14" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionUnitsView;
