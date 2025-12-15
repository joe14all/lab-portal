import React, { useState } from 'react';
import styles from './Odontogram.module.css';

/**
 * Interactive Odontogram (Tooth Chart) Component
 * Universal Numbering System: 1-32
 * Upper Right: 1-8, Upper Left: 9-16, Lower Left: 17-24, Lower Right: 25-32
 */

const QUADRANTS = {
  UR: [1, 2, 3, 4, 5, 6, 7, 8], // Upper Right (left to right on screen)
  UL: [9, 10, 11, 12, 13, 14, 15, 16], // Upper Left (left to right on screen)
  LL: [24, 23, 22, 21, 20, 19, 18, 17], // Lower Left (left to right on screen: 24->17)
  LR: [32, 31, 30, 29, 28, 27, 26, 25]  // Lower Right (left to right on screen: 32->25)
};

const TOOTH_NAMES = {
  // Upper Right (1-8)
  1: '3rd M', 2: '2nd M', 3: '1st M',
  4: '2nd PM', 5: '1st PM',
  6: 'C', 7: 'LI', 8: 'CI',
  
  // Upper Left (9-16)
  9: 'CI', 10: 'LI', 11: 'C',
  12: '1st PM', 13: '2nd PM',
  14: '1st M', 15: '2nd M', 16: '3rd M',
  
  // Lower Left (17-24)
  17: '3rd M', 18: '2nd M', 19: '1st M',
  20: '2nd PM', 21: '1st PM',
  22: 'C', 23: 'LI', 24: 'CI',
  
  // Lower Right (25-32)
  25: 'CI', 26: 'LI', 27: 'C',
  28: '1st PM', 29: '2nd PM',
  30: '1st M', 31: '2nd M', 32: '3rd M'
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
    for (const [, teeth] of Object.entries(QUADRANTS)) {
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

  // Check if two consecutive teeth are part of the same restoration (bridge)
  const areTeethConnected = (tooth1, tooth2) => {
    const high1 = highlightedTeeth[tooth1];
    const high2 = highlightedTeeth[tooth2];
    
    // Both must be highlighted and have same color (part of same restoration)
    if (!high1 || !high2) return false;
    if (high1.color !== high2.color) return false;
    
    // Check if it's a bridge (has R or P role)
    const isBridge = ['R', 'P', 'A'].includes(high1.label) && ['R', 'P', 'A'].includes(high2.label);
    return isBridge;
  };

  const renderConnector = (tooth1, tooth2) => {
    const connected = areTeethConnected(tooth1, tooth2);
    if (!connected) return null;
    
    const color = highlightedTeeth[tooth1]?.color || '#6b7280';
    
    return (
      <div 
        className={styles.bridgeConnector}
        style={{
          background: `linear-gradient(90deg, ${color} 0%, ${color}CC 50%, ${color} 100%)`,
          boxShadow: `0 2px 6px ${color}60`
        }}
      />
    );
  };

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

    // Determine which quadrant this tooth belongs to for proper M/D orientation
    let quadrant = '';
    let isRightSide = false;
    let isUpper = false;
    if (toothNum >= 1 && toothNum <= 8) { quadrant = 'UR'; isRightSide = true; isUpper = true; }
    else if (toothNum >= 9 && toothNum <= 16) { quadrant = 'UL'; isRightSide = false; isUpper = true; }
    else if (toothNum >= 17 && toothNum <= 24) { quadrant = 'LL'; isRightSide = false; isUpper = false; }
    else if (toothNum >= 25 && toothNum <= 32) { quadrant = 'LR'; isRightSide = true; isUpper = false; }

    // Determine restoration style with enhanced visual markers
    const toothStyle = {};
    let borderColor = '#d1d5db';
    let borderWidth = 2;
    let showComponentShapes = false;
    
    if (highlighted) {
      borderColor = highlighted.borderColor || highlighted.color;
      borderWidth = highlighted.borderWidth || 4;
      
      toothStyle.borderColor = borderColor;
      toothStyle.borderWidth = `${borderWidth}px`;
      toothStyle.borderStyle = 'solid';
      toothStyle.boxShadow = `0 0 0 1px ${borderColor}40, 0 4px 12px ${borderColor}60, inset 0 0 20px ${borderColor}08`;
      
      // Add background gradient for better visibility
      const lightColor = highlighted.color + '15';
      const mediumColor = highlighted.color + '25';
      toothStyle.background = `linear-gradient(135deg, ${lightColor} 0%, ${mediumColor} 100%)`;
      
      // Add opacity if specified
      if (highlighted.opacity) {
        toothStyle.opacity = highlighted.opacity;
      }
      
      showComponentShapes = true;
    }

    // Parse label to extract component types
    const label = highlighted?.label || '';
    const hasOcclusalRest = label.includes('RM') || label.includes('RD') || label.includes('RMD') || label.includes('RO');
    const hasCingulumRest = label.includes('RC');
    const hasIncisal = label.includes('RI');
    
    // Differentiate clasp types
    const hasAkersClasp = label.includes('CB');
    const hasCClasp = label.includes('CC');
    const hasBackActionClasp = label.includes('CH');
    const hasIBarClasp = label.includes('CI');
    const hasRPIClasp = label.includes('CR');
    const hasRingClasp = label.includes('CG');
    const hasCircumferentialClasp = label.includes('CF');
    
    const hasReciprocation = label.includes('Rp');
    const hasMinorConnector = label.includes('Mn');
    const hasIndirectRetention = label.includes('IR');
    const hasMajorConnector = highlighted?.hasMajorConnector || false;

    // Surface indicators
    const hasMesialSurface = label.includes('M');
    const hasDistalSurface = label.includes('D');
    const hasBuccalSurface = label.includes('B');
    const hasLingualSurface = label.includes('L');

    return (
      <button
        key={toothNum}
        type="button"
        className={className}
        onClick={() => !archSelectionMode && handleToothClick(toothNum)}
        onMouseEnter={() => setHoverTooth(toothNum)}
        onMouseLeave={() => setHoverTooth(null)}
        disabled={disabled || archSelectionMode}
        title={`Tooth #${toothNum} - ${TOOTH_NAMES[toothNum] || ''}`}
        style={toothStyle}
      >
        {/* Component Shape Indicators */}
        {showComponentShapes && (
          <>
            {/* Occlusal Rest - Triangle pointing toward occlusal surface */}
            {hasOcclusalRest && (
              <svg className={styles.componentShape} style={{ 
                position: 'absolute', 
                top: isUpper ? '6px' : 'auto',
                bottom: isUpper ? 'auto' : '6px',
                left: label.includes('RM') ? (isRightSide ? '6px' : 'auto') : label.includes('RD') ? (isRightSide ? 'auto' : '6px') : '50%',
                right: label.includes('RM') ? (isRightSide ? 'auto' : '6px') : label.includes('RD') ? (isRightSide ? '6px' : 'auto') : 'auto',
                transform: label.includes('RMD') ? 'translateX(-50%)' : 'none',
                width: '12px', 
                height: '10px',
                pointerEvents: 'none',
                zIndex: 3
              }} viewBox="0 0 12 10">
                <polygon 
                  points={isUpper ? "6,0 0,10 12,10" : "6,10 0,0 12,0"} 
                  fill={borderColor}
                  stroke="white"
                  strokeWidth="1"
                />
              </svg>
            )}

            {/* Cingulum Rest - Small circle */}
            {hasCingulumRest && (
              <svg className={styles.componentShape} style={{
                position: 'absolute',
                top: isUpper ? '6px' : 'auto',
                bottom: isUpper ? 'auto' : '6px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '8px',
                height: '8px',
                pointerEvents: 'none',
                zIndex: 3
              }} viewBox="0 0 8 8">
                <circle cx="4" cy="4" r="3" fill={borderColor} stroke="white" strokeWidth="1"/>
              </svg>
            )}

            {/* Incisal Rest - Horizontal bar at incisal edge */}
            {hasIncisal && (
              <div className={styles.componentShape} style={{
                position: 'absolute',
                top: isUpper ? '4px' : 'auto',
                bottom: isUpper ? 'auto' : '4px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '70%',
                height: '3px',
                background: borderColor,
                borderRadius: '1px',
                pointerEvents: 'none',
                zIndex: 3
              }}></div>
            )}

            {/* Akers/Circumferential Clasp - Bold C shape */}
            {hasAkersClasp && (
              <svg className={styles.componentShape} style={{
                position: 'absolute',
                [hasBuccalSurface ? (isUpper ? 'top' : 'bottom') : (isUpper ? 'bottom' : 'top')]: '-18px',
                [hasMesialSurface ? (isRightSide ? 'right' : 'left') : (isRightSide ? 'left' : 'right')]: '4px',
                width: '16px',
                height: '16px',
                pointerEvents: 'none',
                zIndex: 3,
                transform: `
                  ${hasBuccalSurface ? (isUpper ? '' : 'scaleY(-1)') : (isUpper ? 'scaleY(-1)' : '')} 
                  ${hasMesialSurface ? (isRightSide ? 'scaleX(-1)' : '') : (isRightSide ? '' : 'scaleX(-1)')}
                `
              }} viewBox="0 0 16 16">
                <path 
                  d="M 2,14 Q 2,2 14,2" 
                  fill="none" 
                  stroke={borderColor} 
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            )}

            {/* C-Clasp - Standard C shape with ball terminal */}
            {hasCClasp && (
              <svg className={styles.componentShape} style={{
                position: 'absolute',
                [hasBuccalSurface ? (isUpper ? 'top' : 'bottom') : (isUpper ? 'bottom' : 'top')]: '-18px',
                [hasMesialSurface ? (isRightSide ? 'right' : 'left') : (isRightSide ? 'left' : 'right')]: '4px',
                width: '16px',
                height: '16px',
                pointerEvents: 'none',
                zIndex: 3,
                transform: `
                  ${hasBuccalSurface ? (isUpper ? '' : 'scaleY(-1)') : (isUpper ? 'scaleY(-1)' : '')} 
                  ${hasMesialSurface ? (isRightSide ? 'scaleX(-1)' : '') : (isRightSide ? '' : 'scaleX(-1)')}
                `
              }} viewBox="0 0 16 16">
                <path 
                  d="M 2,14 Q 2,2 14,2" 
                  fill="none" 
                  stroke={borderColor} 
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="14" cy="2" r="2" fill={borderColor} />
              </svg>
            )}

            {/* Back Action Clasp - Angular hook from gingival with sharp turn */}
            {hasBackActionClasp && (
              <svg className={styles.componentShape} style={{
                position: 'absolute',
                [hasBuccalSurface ? (isUpper ? 'top' : 'bottom') : (isUpper ? 'bottom' : 'top')]: '-20px',
                [hasMesialSurface ? (isRightSide ? 'left' : 'right') : (isRightSide ? 'right' : 'left')]: '2px',
                width: '20px',
                height: '18px',
                pointerEvents: 'none',
                zIndex: 3,
                transform: `
                  ${hasBuccalSurface ? (isUpper ? '' : 'scaleY(-1)') : (isUpper ? 'scaleY(-1)' : '')} 
                  ${hasMesialSurface ? (isRightSide ? '' : 'scaleX(-1)') : (isRightSide ? 'scaleX(-1)' : '')}
                `
              }} viewBox="0 0 20 18">
                <path 
                  d="M 16,2 L 16,8 L 4,8 L 4,16 M 2,13 L 4,16 L 6,13" 
                  fill="none" 
                  stroke={borderColor} 
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="miter"
                />
              </svg>
            )}

            {/* I-Bar Clasp - Vertical bar with arrow pointing to undercut */}
            {hasIBarClasp && (
              <svg className={styles.componentShape} style={{
                position: 'absolute',
                [hasBuccalSurface ? (isUpper ? 'top' : 'bottom') : (isUpper ? 'bottom' : 'top')]: '-22px',
                left: '50%',
                transform: `translateX(-50%) ${hasBuccalSurface ? (isUpper ? '' : 'scaleY(-1)') : (isUpper ? 'scaleY(-1)' : '')}`,
                width: '14px',
                height: '20px',
                pointerEvents: 'none',
                zIndex: 3
              }} viewBox="0 0 14 20">
                <path 
                  d="M 7,2 L 7,16 M 3,12 L 7,16 L 11,12" 
                  fill="none" 
                  stroke={borderColor} 
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}

            {/* RPI/RPA Bar Clasp - T-shaped bar */}
            {hasRPIClasp && (
              <svg className={styles.componentShape} style={{
                position: 'absolute',
                [hasBuccalSurface ? (isUpper ? 'top' : 'bottom') : (isUpper ? 'bottom' : 'top')]: '-16px',
                [hasMesialSurface ? (isRightSide ? 'right' : 'left') : (isRightSide ? 'left' : 'right')]: '4px',
                width: '14px',
                height: '12px',
                pointerEvents: 'none',
                zIndex: 3,
                transform: `${hasBuccalSurface ? (isUpper ? '' : 'scaleY(-1)') : (isUpper ? 'scaleY(-1)' : '')}`
              }} viewBox="0 0 14 12">
                <path 
                  d="M 2,2 L 12,2 M 7,2 L 7,10" 
                  fill="none" 
                  stroke={borderColor} 
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            )}

            {/* Ring Clasp - Complete circle around tooth */}
            {hasRingClasp && (
              <svg className={styles.componentShape} style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '32px',
                height: '32px',
                pointerEvents: 'none',
                zIndex: 3
              }} viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="13" fill="none" stroke={borderColor} strokeWidth="2"/>
              </svg>
            )}

            {/* Circumferential Clasp - Nearly complete circle, thinner than C-clasp */}
            {hasCircumferentialClasp && (
              <svg className={styles.componentShape} style={{
                position: 'absolute',
                [hasBuccalSurface ? (isUpper ? 'top' : 'bottom') : (isUpper ? 'bottom' : 'top')]: '-20px',
                [hasMesialSurface ? (isRightSide ? 'right' : 'left') : (isRightSide ? 'left' : 'right')]: '-2px',
                width: '24px',
                height: '20px',
                pointerEvents: 'none',
                zIndex: 3,
                transform: `
                  ${hasBuccalSurface ? (isUpper ? '' : 'scaleY(-1)') : (isUpper ? 'scaleY(-1)' : '')} 
                  ${hasMesialSurface ? (isRightSide ? 'scaleX(-1)' : '') : (isRightSide ? '' : 'scaleX(-1)')}
                `
              }} viewBox="0 0 24 20">
                <path 
                  d="M 4,16 Q 2,10 2,8 Q 2,3 12,2 Q 22,3 22,8 Q 22,10 20,16" 
                  fill="none" 
                  stroke={borderColor} 
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}

            {/* Reciprocation - Diagonal stripe or plate */}
            {hasReciprocation && (
              <div className={styles.componentShape} style={{
                position: 'absolute',
                [hasBuccalSurface ? (isUpper ? 'top' : 'bottom') : (isUpper ? 'bottom' : 'top')]: '-20px',
                [hasMesialSurface ? (isRightSide ? 'right' : 'left') : (isRightSide ? 'left' : 'right')]: '8px',
                width: '4px',
                height: '16px',
                background: borderColor,
                borderRadius: '1px',
                opacity: 0.85,
                pointerEvents: 'none',
                zIndex: 3
              }}></div>
            )}

            {/* Minor Connector - Horizontal bar connecting to major connector (gingival side) */}
            {hasMinorConnector && (
              <div className={styles.componentShape} style={{
                position: 'absolute',
                [isUpper ? 'top' : 'bottom']: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '70%',
                height: '3px',
                background: borderColor,
                borderRadius: '1px',
                opacity: 0.9,
                pointerEvents: 'none',
                zIndex: 2
              }}></div>
            )}

            {/* Indirect Retention - Small square */}
            {hasIndirectRetention && (
              <svg className={styles.componentShape} style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '8px',
                height: '8px',
                pointerEvents: 'none',
                zIndex: 3
              }} viewBox="0 0 8 8">
                <rect x="1" y="1" width="6" height="6" fill={borderColor} stroke="white" strokeWidth="1"/>
              </svg>
            )}

            {/* Major Connector - Thick bar on gingival/palatal side */}
            {hasMajorConnector && (
              <div className={styles.componentShape} style={{
                position: 'absolute',
                [isUpper ? 'top' : 'bottom']: '-8px',
                left: '0',
                width: '100%',
                height: '5px',
                background: borderColor,
                opacity: 0.8,
                pointerEvents: 'none',
                zIndex: 1,
                borderRadius: '2px'
              }}></div>
            )}

            {/* Surface position markers (simple dots/lines) - Properly mirrored M/D */}
            {hasMesialSurface && (
              <div className={styles.surfaceMarker} style={{
                position: 'absolute',
                [isRightSide ? 'right' : 'left']: '1px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '2px',
                height: '40%',
                background: borderColor,
                opacity: 0.5,
                pointerEvents: 'none',
                zIndex: 1
              }}></div>
            )}

            {hasDistalSurface && (
              <div className={styles.surfaceMarker} style={{
                position: 'absolute',
                [isRightSide ? 'left' : 'right']: '1px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '2px',
                height: '40%',
                background: borderColor,
                opacity: 0.5,
                pointerEvents: 'none',
                zIndex: 1
              }}></div>
            )}
          </>
        )}
        
        <span className={styles.toothNumber}>{toothNum}</span>
        <span className={styles.toothName}>{TOOTH_NAMES[toothNum]}</span>
        
        {/* Primary label (main restoration/component) - Hidden to show components clearly */}
        {/* {highlighted && highlighted.label && (
          <span className={styles.highlightLabel} style={{ 
            backgroundColor: highlighted.color,
            borderColor: borderColor,
            borderWidth: '2px',
            borderStyle: 'solid',
            boxShadow: `0 2px 8px ${highlighted.color}80`,
            color: 'white',
            fontWeight: '700',
            fontSize: '0.7rem',
            padding: '0.15rem 0.35rem'
          }}>
            {highlighted.label}
          </span>
        )} */}
        
        {/* Secondary label (additional components) - Hidden to show components clearly */}
        {/* {highlighted && highlighted.secondaryLabel && (
          <span className={styles.secondaryLabel} style={{
            backgroundColor: '#f59e0b',
            borderColor: borderColor,
            borderWidth: '1px',
            borderStyle: 'solid',
            boxShadow: '0 1px 4px rgba(245, 158, 11, 0.5)',
            color: 'white',
            fontWeight: '600',
            fontSize: '0.65rem',
            padding: '0.1rem 0.3rem'
          }}>
            {highlighted.secondaryLabel}
          </span>
        )} */}
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
          <div className={styles.teethRow}>
            {QUADRANTS.UR.map((tooth, idx) => (
              <React.Fragment key={tooth}>
                {renderTooth(tooth)}
                {idx < QUADRANTS.UR.length - 1 && renderConnector(tooth, QUADRANTS.UR[idx + 1])}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className={styles.midline}></div>
        <div 
          className={`${styles.quadrant} ${archSelectionMode && (selectedArch === 'upper' || selectedArch === 'both') ? styles.archSelected : ''}`}
          onClick={() => archSelectionMode && handleArchClick('upper')}
          style={archSelectionMode ? {cursor: 'pointer'} : {}}
        >
          <div className={styles.quadrantLabel}>UL</div>
          <div className={styles.teethRow}>
            {QUADRANTS.UL.map((tooth, idx) => (
              <React.Fragment key={tooth}>
                {renderTooth(tooth)}
                {idx < QUADRANTS.UL.length - 1 && renderConnector(tooth, QUADRANTS.UL[idx + 1])}
              </React.Fragment>
            ))}
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
          <div className={styles.teethRow}>
            {QUADRANTS.LR.map((tooth, idx) => (
              <React.Fragment key={tooth}>
                {renderTooth(tooth)}
                {idx < QUADRANTS.LR.length - 1 && renderConnector(tooth, QUADRANTS.LR[idx + 1])}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className={styles.midline}></div>
        <div 
          className={`${styles.quadrant} ${archSelectionMode && (selectedArch === 'lower' || selectedArch === 'both') ? styles.archSelected : ''}`}
          onClick={() => archSelectionMode && handleArchClick('lower')}
          style={archSelectionMode ? {cursor: 'pointer'} : {}}
        >
          <div className={styles.quadrantLabel}>LL</div>
          <div className={styles.teethRow}>
            {QUADRANTS.LL.map((tooth, idx) => (
              <React.Fragment key={tooth}>
                {renderTooth(tooth)}
                {idx < QUADRANTS.LL.length - 1 && renderConnector(tooth, QUADRANTS.LL[idx + 1])}
              </React.Fragment>
            ))}
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
