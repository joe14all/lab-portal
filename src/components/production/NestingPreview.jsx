import React from 'react';

const NestingPreview = ({ layout }) => {
  if (!layout) return null;

  const { placedItems, efficiency, materialType } = layout;
  const isDisc = materialType === 'Disc';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '1rem',
      border: '1px solid var(--border-color)',
      borderRadius: '0.5rem',
      backgroundColor: 'var(--bg-body)'
    }}>
      <div style={{
        position: 'relative',
        width: '200px',
        height: '200px',
        backgroundColor: '#e2e8f0', // Neutral 200
        borderRadius: isDisc ? '50%' : '4px',
        overflow: 'hidden',
        border: '2px solid #cbd5e1'
      }}>
        {/* Render "Units" as dots/shapes */}
        {placedItems.map((item) => (
          <div
            key={item.id}
            title={item.type}
            style={{
              position: 'absolute',
              left: `${item.x}%`,
              top: `${item.y}%`,
              width: '12px',
              height: '12px',
              backgroundColor: item.color,
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
            }}
          />
        ))}
      </div>
      
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Material Utilized:</span>
        <strong style={{ color: efficiency > 85 ? 'var(--success-500)' : 'var(--text-primary)' }}>
          {efficiency}%
        </strong>
      </div>
      
      {efficiency > 90 && (
        <span style={{ fontSize: '0.75rem', color: 'var(--warning-500)' }}>
          Warning: Low margin for error.
        </span>
      )}
    </div>
  );
};

export default NestingPreview;