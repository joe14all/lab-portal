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
  highlightedTeeth = {} // { toothNumber: { color, label } }
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
        onSelectionChange(range);
        setRangeStart(null);
      }
    }
  };

  const getToothRange = (start, end) => {
    // Find teeth in same arch between start and end
    let quadrant = null;
    for (const [key, teeth] of Object.entries(QUADRANTS)) {
      if (teeth.includes(start) && teeth.includes(end)) {
        quadrant = teeth;
        break;
      }
    }
    
    if (!quadrant) return [start, end]; // Different arches, return both

    const startIdx = quadrant.indexOf(start);
    const endIdx = quadrant.indexOf(end);
    const minIdx = Math.min(startIdx, endIdx);
    const maxIdx = Math.max(startIdx, endIdx);
    
    return quadrant.slice(minIdx, maxIdx + 1);
  };

  const getRangePreview = () => {
    if (!rangeStart || !hoverTooth) return [];
    return getToothRange(rangeStart, hoverTooth);
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
        {mode === 'single' && 'Click a tooth to select'}
        {mode === 'multiple' && 'Click teeth to select/deselect multiple'}
        {mode === 'range' && (rangeStart ? 'Click end tooth to complete range' : 'Click start tooth for bridge/range')}
      </div>

      {/* Upper Arch */}
      <div className={styles.upperArch}>
        <div className={styles.quadrant}>
          <div className={styles.quadrantLabel}>UR</div>
          <div className={styles.teeth}>
            {QUADRANTS.UR.map(renderTooth)}
          </div>
        </div>
        <div className={styles.midline}></div>
        <div className={styles.quadrant}>
          <div className={styles.quadrantLabel}>UL</div>
          <div className={styles.teeth}>
            {QUADRANTS.UL.map(renderTooth)}
          </div>
        </div>
      </div>

      {/* Lower Arch */}
      <div className={styles.lowerArch}>
        <div className={styles.quadrant}>
          <div className={styles.quadrantLabel}>LR</div>
          <div className={styles.teeth}>
            {QUADRANTS.LR.map(renderTooth)}
          </div>
        </div>
        <div className={styles.midline}></div>
        <div className={styles.quadrant}>
          <div className={styles.quadrantLabel}>LL</div>
          <div className={styles.teeth}>
            {QUADRANTS.LL.map(renderTooth)}
          </div>
        </div>
      </div>

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
