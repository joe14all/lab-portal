import React from 'react';

// Lightweight SVG Chart
const TelemetryChart = ({ data, dataKey, color, label, unit, domain }) => {
  if (!data || data.length === 0) return null;

  const width = 100;
  const height = 40;
  
  // Normalize data to 0-100 range for SVG
  const values = data.map(d => d[dataKey]);
  const min = domain ? domain[0] : Math.min(...values) * 0.9;
  const max = domain ? domain[1] : Math.max(...values) * 1.1;
  const range = max - min || 1;

  const points = values.map((val, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const currentVal = values[values.length - 1];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <strong style={{ color: color }}>{currentVal} {unit}</strong>
      </div>
      
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '60px', overflow: 'visible' }}>
        {/* Background Grid */}
        <line x1="0" y1="0" x2="100" y2="0" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="2" />
        <line x1="0" y1="20" x2="100" y2="20" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="2" />
        <line x1="0" y1="40" x2="100" y2="40" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="2" />
        
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
        
        {/* Area fill (optional, simplified) */}
        <polygon 
          points={`0,${height} ${points} ${width},${height}`} 
          fill={color} 
          opacity="0.1" 
        />
        
        {/* Pulsing Dot at end */}
        {values.length > 0 && (
          <circle 
            cx={width} 
            cy={height - ((currentVal - min) / range) * height} 
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