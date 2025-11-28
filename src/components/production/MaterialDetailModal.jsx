import React from 'react';
import Modal from '../common/Modal';
import { IconLayers, IconAlert, IconTruck } from '../../layouts/components/LabIcons';
import styles from './MaterialDetailModal.module.css';

const MaterialDetailModal = ({ material, isOpen, onClose }) => {
  if (!material) return null;

  const isLowStock = material.stockLevel <= material.reorderThreshold;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={material.name}
      icon={<IconLayers width="20" />}
      width="550px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <button className="button secondary">Adjust Stock</button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {material.supplierInfo?.reorderUrl && (
              <button 
                className="button primary" 
                onClick={() => window.open(material.supplierInfo.reorderUrl, '_blank')}
              >
                Order from Supplier
              </button>
            )}
            <button className="button text" onClick={onClose}>Close</button>
          </div>
        </div>
      }
    >
      <div className={styles.container}>
        
        {/* Stock Level Hero */}
        <div className={styles.stockRow}>
          <div style={{ flex: 1 }}>
            <span className={styles.label}>Current Inventory</span>
            <div className={styles.stockLarge} style={{ color: isLowStock ? 'var(--error-500)' : 'inherit' }}>
              {material.stockLevel}
            </div>
            <span className={styles.unit}>{material.unit || 'Units'} (Min: {material.reorderThreshold})</span>
          </div>
          <div style={{ flex: 1, borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
             <div className={styles.field}>
                <span className={styles.label}>Location</span>
                <span className={styles.val}>
                  Zone {material.location?.zone || '-'} • Shelf {material.location?.shelf || '-'}
                </span>
             </div>
             <div className={styles.field} style={{ marginTop: '0.5rem' }}>
                <span className={styles.label}>Lot #</span>
                <span className={styles.val}>{material.lotNumber}</span>
             </div>
          </div>
        </div>

        {/* Hazmat Warning */}
        {material.hazmat?.isHazmat && (
          <div className={styles.hazmatBox}>
            <IconAlert width="24" color="#c2410c" />
            <div>
              <span className={styles.hazmatTitle}>Hazardous Material</span>
              <p className={styles.hazmatDesc}>
                Storage: {material.hazmat.storageRequirements}. 
                {material.hazmat.msdsUrl && <a href="#" style={{display:'block', marginTop:'4px'}}>View MSDS</a>}
              </p>
            </div>
          </div>
        )}

        {/* Details Grid */}
        <div className={styles.grid2}>
          <div>
            <div className={styles.sectionTitle}>Product Info</div>
            <div className={styles.field}>
              <span className={styles.label}>SKU</span>
              <span className={styles.val}>{material.sku}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Expiry</span>
              <span className={styles.val}>{new Date(material.expiryDate).toLocaleDateString()}</span>
            </div>
          </div>

          <div>
            <div className={styles.sectionTitle}>Supplier</div>
            <div className={styles.field}>
              <span className={styles.label}>Vendor ID</span>
              <span className={styles.val}>{material.supplierInfo?.supplierId || 'Unknown'}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Contact</span>
              <span className={styles.val} style={{ fontSize: '0.8rem' }}>{material.supplierInfo?.contactEmail || '-'}</span>
            </div>
          </div>
        </div>

        {/* Cost History */}
        <div>
          <div className={styles.sectionTitle}>Cost History</div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Qty</th>
                <th style={{textAlign: 'right'}}>Unit Cost</th>
              </tr>
            </thead>
            <tbody>
              {material.costHistory && material.costHistory.length > 0 ? (
                material.costHistory.map((rec, i) => (
                  <tr key={i}>
                    <td>{rec.date}</td>
                    <td>{rec.qty}</td>
                    <td style={{textAlign: 'right'}}>${rec.unitCost.toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3">Current Cost: ${material.unitCost.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </Modal>
  );
};

export default MaterialDetailModal;