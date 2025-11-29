import React from 'react';
import styles from './TelemetryChart.module.css';

// Lightweight SVG Chart
const TelemetryChart = ({ data, dataKey, color, label, unit, domain }) => {
  if (!data || data.length === 0) return null;

  const width = 100;
  const height = 40;
  
  // Get raw values
  const values = data.map(d => d[dataKey]);
  
  // Determine domain (min/max) for scaling
  // Use provided domain or auto-calculate with 10% padding
  let min, max;
  if (domain) {
    min = domain[0];
    max = domain[1];
  } else {
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const padding = (dataMax - dataMin) * 0.1;
    min = dataMin - padding;
    max = dataMax + padding;
  }
  
  // Prevent division by zero if flat line
  const range = max - min || 1;

  // Map values to SVG coordinates
  // Y-axis is inverted in SVG (0 is top), so we do: height - (normalized_val)
  const points = values.map((val, i) => {
    // Clamp value to domain to prevent drawing outside
    const clampedVal = Math.max(min, Math.min(max, val));
    
    const x = (i / (values.length - 1)) * width;
    const y = height - ((clampedVal - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const currentVal = values[values.length - 1];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <strong style={{ color: color }}>{currentVal} {unit}</strong>
      </div>
      
      {/* preserveAspectRatio="none" ensures the chart stretches to fill the container width/height defined in CSS */}
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className={styles.svg} 
        preserveAspectRatio="none"
      >
        {/* Background Grid */}
        <line x1="0" y1="0" x2="100" y2="0" className={styles.gridLine} />
        <line x1="0" y1="20" x2="100" y2="20" className={styles.gridLine} />
        <line x1="0" y1="40" x2="100" y2="40" className={styles.gridLine} />
        
        {/* The Line */}
        <polyline 
          points={points} 
          fill="none" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          vectorEffect="non-scaling-stroke"
        />
        
        {/* Area fill */}
        <polygon 
          points={`0,${height} ${points} ${width},${height}`} 
          fill={color} 
          opacity="0.1" 
        />
        
        {/* Pulsing Dot at end */}
        {values.length > 0 && (
          <circle 
            cx={width} 
            // Re-calculate Y for the last point
            cy={height - ((Math.max(min, Math.min(max, currentVal)) - min) / range) * height} 
            r="3" 
            fill={color}
          >
            <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>
    </div>
  );
};

export default TelemetryChart;