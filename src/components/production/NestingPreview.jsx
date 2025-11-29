import React from 'react';
import styles from './NestingPreview.module.css';

const NestingPreview = ({ layout }) => {
  if (!layout) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyText}>No units selected for preview.</div>
      </div>
    );
  }

  const { placedItems, efficiency, materialType, wastePercentage } = layout;
  const isDisc = materialType === 'Disc';

  // Dynamic styles based on efficiency
  const efficiencyColor = efficiency > 85 ? 'var(--success-500)' : efficiency > 60 ? 'var(--warning-500)' : 'var(--error-500)';
  
  // Calculate SVG viewBox based on material type (mock dimensions)
  const viewBoxSize = 100; 

  // Helper to estimate visual size (width/height or radius) based on unit type area relative to material
  // Assuming 100x100 coordinate space for simplicity
  const getSize = (type) => {
    const t = (type || '').toLowerCase();
    // Returns { width, height } for rects or { r } for circles if we mix, 
    // but for a "highlight" look on a grid, rects often pack visually better.
    // Let's approximate area coverage.
    
    if (t.includes('denture') || t.includes('partial')) return { width: 60, height: 50 }; // Large block
    if (t.includes('nightguard') || t.includes('guard') || t.includes('splint')) return { width: 55, height: 45 };
    if (t.includes('bridge')) return { width: 25, height: 15 }; // Medium block
    if (t.includes('implant')) return { width: 12, height: 12 }; // Small block
    return { width: 10, height: 10 }; // Standard Crown / Default
  };
  
  return (
    <div className={styles.container}>
      
      {/* 1. VISUALIZATION AREA */}
      <div className={styles.previewArea}>
        <div 
          className={styles.materialShape}
          style={{
            borderRadius: isDisc ? '50%' : '4px',
            border: `2px solid ${isDisc ? 'var(--neutral-300)' : 'var(--neutral-400)'}`
          }}
        >
          {/* Material Texture/Grid Background */}
          <div className={styles.gridPattern} />

          {/* Render Units as semi-transparent highlights/blocks */}
          <svg viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} className={styles.svgOverlay}>
            {placedItems.map((item) => {
                const size = getSize(item.type);
                // Center the rect on the point (x,y)
                const x = item.x - (size.width / 2);
                const y = item.y - (size.height / 2);

                return (
                  <rect 
                    key={item.id}
                    x={x}
                    y={y}
                    width={size.width}
                    height={size.height}
                    rx={2} // Rounded corners for a softer look
                    ry={2}
                    fill={item.color}
                    stroke="white"
                    strokeWidth="0.5"
                    fillOpacity="0.6" // Highlight effect
                    className={styles.unitBlock}
                  >
                    <title>{item.type} (ID: {item.id.split('-').pop()})</title>
                  </rect>
                );
            })}
          </svg>
        </div>
      </div>

      {/* 2. METRICS DASHBOARD */}
      <div className={styles.metricsPanel}>
        <div className={styles.metricRow}>
          <div className={styles.metricItem}>
            <span className={styles.metricLabel}>Efficiency</span>
            <div className={styles.metricValue} style={{ color: efficiencyColor }}>
              {efficiency}%
            </div>
          </div>
          <div className={styles.metricDivider} />
          <div className={styles.metricItem}>
            <span className={styles.metricLabel}>Waste</span>
            <div className={styles.metricValue} style={{ color: 'var(--text-secondary)' }}>
              {wastePercentage}%
            </div>
          </div>
          <div className={styles.metricDivider} />
          <div className={styles.metricItem}>
            <span className={styles.metricLabel}>Units</span>
            <div className={styles.metricValue}>
              {placedItems.length}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className={styles.progressTrack}>
          <div 
            className={styles.progressBar} 
            style={{ width: `${efficiency}%`, backgroundColor: efficiencyColor }} 
          />
        </div>
        
        {/* Contextual Warning */} 
        {efficiency > 90 && (
          <div className={styles.warningBox}>
            <span className={styles.warningIcon}>⚠️</span>
            <span>High density. Ensure adequate sprue spacing.</span>
          </div>
        )}
      </div>

    </div>
  );
};

export default NestingPreview;