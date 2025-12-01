import React, { useState } from 'react';
import styles from './Odontogram.module.css';

/**
 * Interactive Odontogram (Tooth Chart) Component
 * FDI Notation: 11-18 (Upper Right), 21-28 (Upper Left), 31-38 (Lower Left), 41-48 (Lower Right)
 */

const QUADRANTS = {
  UR: [18, 17, 16, 15, 14, 13, 12, 11], // Upper Right
  UL: [21, 22, 23, 24, 25, 26, 27, 28], // Upper Left
  LL: [38, 37, 36, 35, 34, 33, 32, 31], // Lower Left
  LR: [41, 42, 43, 44, 45, 46, 47, 48]  // Lower Right
};

const TOOTH_NAMES = {
  // Molars
  18: '3rd M', 17: '2nd M', 16: '1st M',
  28: '1st M', 27: '2nd M', 28: '3rd M',
  38: '3rd M', 37: '2nd M', 36: '1st M',
  48: '1st M', 47: '2nd M', 48: '3rd M',
  
  // Premolars
  15: '2nd PM', 14: '1st PM',
  25: '1st PM', 24: '2nd PM',
  35: '1st PM', 34: '2nd PM',
  45: '2nd PM', 44: '1st PM',
  
  // Anteriors
  13: 'C', 12: 'LI', 11: 'CI',
  23: 'CI', 22: 'LI', 21: 'C',
  33: 'C', 32: 'LI', 31: 'CI',
  43: 'CI', 42: 'LI', 41: 'C'
};

const Odontogram = ({ 
  selectedTeeth = [], 
  onSelectionChange, 
  mode = 'single', // 'single' | 'multiple' | 'range'
  disabledTeeth = [],
  highlightedTeeth = {}, // { toothNumber: { color, label } }
  allowCrossQuadrant = false, // Allow bridge selection across midline
  archSelectionMode = false, // For complete dentures - select arch instead of teeth
  onArchSelect = null, // Callback for arch selection
  selectedArch = null // 'upper' | 'lower' | 'both'
}) => {
  const [rangeStart, setRangeStart] = useState(null);
  const [hoverTooth, setHoverTooth] = useState(null);

  const isSelected = (tooth) => selectedTeeth.includes(tooth);
  const isDisabled = (tooth) => disabledTeeth.includes(tooth);
  const isHighlighted = (tooth) => highlightedTeeth[tooth];

  const handleToothClick = (tooth) => {
    if (isDisabled(tooth)) return;

    if (mode === 'single') {
      onSelectionChange([tooth]);
    } else if (mode === 'multiple') {
      if (isSelected(tooth)) {
        onSelectionChange(selectedTeeth.filter(t => t !== tooth));
      } else {
        onSelectionChange([...selectedTeeth, tooth]);
      }
    } else if (mode === 'range') {
      if (!rangeStart) {
        setRangeStart(tooth);
        onSelectionChange([tooth]);
      } else {
        // Get range between rangeStart and current tooth
        const range = getToothRange(rangeStart, tooth);
        if (range.length === 0) {
          // Invalid range (crosses upper/lower arch)
          alert('Bridge cannot cross between upper and lower arches. Please select teeth within the same arch.');
          setRangeStart(null);
          onSelectionChange([]);
        } else {
          onSelectionChange(range);
          setRangeStart(null);
        }
      }
    }
  };

  const getToothRange = (start, end) => {
    // Find teeth in same quadrant
    let quadrant = null;
    for (const [key, teeth] of Object.entries(QUADRANTS)) {
      if (teeth.includes(start) && teeth.includes(end)) {
        quadrant = teeth;
        break;
      }
    }
    
    // If different quadrants but cross-quadrant allowed, handle midline crossing
    if (!quadrant && allowCrossQuadrant) {
      // Check if both in upper arch (UR + UL) - CAN cross midline
      const upperTeeth = [...QUADRANTS.UR, ...QUADRANTS.UL];
      if (upperTeeth.includes(start) && upperTeeth.includes(end)) {
        const startIdx = upperTeeth.indexOf(start);
        const endIdx = upperTeeth.indexOf(end);
        const minIdx = Math.min(startIdx, endIdx);
        const maxIdx = Math.max(startIdx, endIdx);
        return upperTeeth.slice(minIdx, maxIdx + 1);
      }
      
      // Check if both in lower arch (LL + LR) - CAN cross midline
      const lowerTeeth = [...QUADRANTS.LL, ...QUADRANTS.LR];
      if (lowerTeeth.includes(start) && lowerTeeth.includes(end)) {
        const startIdx = lowerTeeth.indexOf(start);
        const endIdx = lowerTeeth.indexOf(end);
        const minIdx = Math.min(startIdx, endIdx);
        const maxIdx = Math.max(startIdx, endIdx);
        return lowerTeeth.slice(minIdx, maxIdx + 1);
      }
      
      // One in upper, one in lower - CANNOT cross arches
      // Return empty to prevent selection
      return [];
    }
    
    if (!quadrant) return [start, end]; // Different quadrants, no cross-quadrant allowed

    const startIdx = quadrant.indexOf(start);
    const endIdx = quadrant.indexOf(end);
    const minIdx = Math.min(startIdx, endIdx);
    const maxIdx = Math.max(startIdx, endIdx);
    
    return quadrant.slice(minIdx, maxIdx + 1);
  };

  const getRangePreview = () => {
    if (!rangeStart || !hoverTooth) return [];
    const range = getToothRange(rangeStart, hoverTooth);
    // Don't show preview if range is invalid (empty array = crosses arches)
    return range.length > 0 ? range : [];
  };
  
  const handleArchClick = (arch) => {
    if (archSelectionMode && onArchSelect) {
      if (selectedArch === arch) {
        onArchSelect(null); // Deselect
      } else {
        onArchSelect(arch);
      }
    }
  };

  const rangePreview = mode === 'range' && rangeStart ? getRangePreview() : [];

  const renderTooth = (toothNum) => {
    const selected = isSelected(toothNum);
    const disabled = isDisabled(toothNum);
    const highlighted = isHighlighted(toothNum);
    const inPreview = rangePreview.includes(toothNum);

    let className = styles.tooth;
    if (selected) className += ` ${styles.selected}`;
    if (disabled) className += ` ${styles.disabled}`;
    if (inPreview && !selected) className += ` ${styles.preview}`;
    if (highlighted) className += ` ${styles.highlighted}`;

    return (
      <button
        key={toothNum}
        type="button"
        className={className}
        onClick={() => handleToothClick(toothNum)}
        onMouseEnter={() => setHoverTooth(toothNum)}
        onMouseLeave={() => setHoverTooth(null)}
        disabled={disabled}
        title={`Tooth #${toothNum} - ${TOOTH_NAMES[toothNum] || ''}`}
        style={highlighted ? { borderColor: highlighted.color } : {}}
      >
        <span className={styles.toothNumber}>{toothNum}</span>
        <span className={styles.toothName}>{TOOTH_NAMES[toothNum]}</span>
        {highlighted && (
          <span className={styles.highlightLabel} style={{ backgroundColor: highlighted.color }}>
            {highlighted.label}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className={styles.odontogram}>
      <div className={styles.instructions}>
        {archSelectionMode && 'Click arch areas (Upper/Lower) to select for complete denture'}
        {!archSelectionMode && mode === 'single' && 'Click a tooth to select'}
        {!archSelectionMode && mode === 'multiple' && 'Click teeth to select/deselect (select all teeth for each restoration item)'}
        {!archSelectionMode && mode === 'range' && (rangeStart ? 'Click end tooth to complete range (must be in same arch)' : 'Click start tooth for bridge range')}
        {!archSelectionMode && mode === 'range' && allowCrossQuadrant && ' - can cross midline'}
      </div>

      {/* Upper Arch */}
      <div className={styles.upperArch}>
        <div 
          className={`${styles.quadrant} ${archSelectionMode && (selectedArch === 'upper' || selectedArch === 'both') ? styles.archSelected : ''}`}
          onClick={() => archSelectionMode && handleArchClick('upper')}
          style={archSelectionMode ? {cursor: 'pointer'} : {}}
        >
          <div className={styles.quadrantLabel}>UR</div>
          <div className={styles.teeth}>
            {QUADRANTS.UR.map(renderTooth)}
          </div>
        </div>
        <div className={styles.midline}></div>
        <div 
          className={`${styles.quadrant} ${archSelectionMode && (selectedArch === 'upper' || selectedArch === 'both') ? styles.archSelected : ''}`}
          onClick={() => archSelectionMode && handleArchClick('upper')}
          style={archSelectionMode ? {cursor: 'pointer'} : {}}
        >
          <div className={styles.quadrantLabel}>UL</div>
          <div className={styles.teeth}>
            {QUADRANTS.UL.map(renderTooth)}
          </div>
        </div>
      </div>

      {/* Lower Arch */}
      <div className={styles.lowerArch}>
        <div 
          className={`${styles.quadrant} ${archSelectionMode && (selectedArch === 'lower' || selectedArch === 'both') ? styles.archSelected : ''}`}
          onClick={() => archSelectionMode && handleArchClick('lower')}
          style={archSelectionMode ? {cursor: 'pointer'} : {}}
        >
          <div className={styles.quadrantLabel}>LR</div>
          <div className={styles.teeth}>
            {QUADRANTS.LR.map(renderTooth)}
          </div>
        </div>
        <div className={styles.midline}></div>
        <div 
          className={`${styles.quadrant} ${archSelectionMode && (selectedArch === 'lower' || selectedArch === 'both') ? styles.archSelected : ''}`}
          onClick={() => archSelectionMode && handleArchClick('lower')}
          style={archSelectionMode ? {cursor: 'pointer'} : {}}
        >
          <div className={styles.quadrantLabel}>LL</div>
          <div className={styles.teeth}>
            {QUADRANTS.LL.map(renderTooth)}
          </div>
        </div>
      </div>
      
      {/* Arch Selection for Complete Dentures */}
      {archSelectionMode && (
        <div className={styles.archSelection}>
          <button
            type="button"
            className={`${styles.archSelectBtn} ${selectedArch === 'both' ? styles.active : ''}`}
            onClick={() => handleArchClick('both')}
          >
            Both Arches
          </button>
          {selectedArch && (
            <span className={styles.archLabel}>
              Selected: {selectedArch.charAt(0).toUpperCase() + selectedArch.slice(1)}
            </span>
          )}
        </div>
      )}

      {/* Selection Summary */}
      {selectedTeeth.length > 0 && (
        <div className={styles.selectionSummary}>
          <strong>Selected:</strong> {selectedTeeth.sort((a, b) => a - b).join(', ')}
          {selectedTeeth.length > 1 && (
            <span className={styles.count}>({selectedTeeth.length} teeth)</span>
          )}
        </div>
      )}
    </div>
  );
};

export default Odontogram;
