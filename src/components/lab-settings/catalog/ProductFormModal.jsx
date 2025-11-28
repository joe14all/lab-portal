import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import { IconDrill } from '../../../layouts/components/LabIcons';
import styles from "./ProductFormModal.module.css";
import { COUNTRIES } from '../../../constants';

const CATEGORIES = [
  "Crown & Bridge", "Removables", "Implants", "Orthodontics", "Fees", "Services"
];

const ProductFormModal = ({ isOpen, onClose, onSubmit, initialData, isDeleting, defaultCurrency = 'USD' }) => {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Crown & Bridge',
    turnaroundDays: 5,
    defaultPrice: 0,
    currency: defaultCurrency
  });

  useEffect(() => {
    if (isOpen) {
      const nextData = initialData ? {
        name: initialData.name || '',
        sku: initialData.sku || '',
        category: initialData.category || 'Crown & Bridge',
        turnaroundDays: initialData.turnaroundDays || 5,
        defaultPrice: initialData.defaultPrice || 0,
        currency: initialData.currency || defaultCurrency
      } : {
        name: '',
        sku: '',
        category: 'Crown & Bridge',
        turnaroundDays: 5,
        defaultPrice: 0,
        currency: defaultCurrency
      };

      // Defer state update to avoid render-cycle conflicts
      const t = setTimeout(() => {
        setFormData(prev => {
          if (JSON.stringify(prev) === JSON.stringify(nextData)) return prev;
          return nextData;
        });
      }, 0);

      return () => clearTimeout(t);
    }
  }, [initialData, isOpen, defaultCurrency]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const currentSymbol = COUNTRIES.find(c => c.currency === formData.currency)?.symbol || '$';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Product" : "Add New Product"}
      icon={<IconDrill width="20" />}
      footer={
        <div className={styles.footer}>
          {initialData ? (
            <button 
              type="button" 
              className="button secondary danger" 
              onClick={isDeleting}
            >
              Delete Product
            </button>
          ) : <div />}
          
          <div className={styles.actions}>
            <button type="button" className="button text" onClick={onClose}>Cancel</button>
            <button type="submit" form="prodForm" className="button primary">Save</button>
          </div>
        </div>
      }
    >
      <form id="prodForm" onSubmit={handleSubmit} className={styles.form}>
        
        {/* Row 1: Identity */}
        <div className={styles.row}>
          <div className="form-group" style={{ flex: 1.5 }}>
            <label>Product Name *</label>
            <input 
              required
              type="text" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., Zirconia Crown"
              autoFocus
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Category</label>
            <select 
              value={formData.category} 
              onChange={e => setFormData({...formData, category: e.target.value})}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Row 2: Operations */}
        <div className={styles.row}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>SKU / Code</label>
            <input 
              type="text" 
              value={formData.sku} 
              onChange={e => setFormData({...formData, sku: e.target.value})}
              placeholder="e.g., ZIRC-01"
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Turnaround (Days)</label>
            <input 
              type="number" 
              min="0"
              value={formData.turnaroundDays} 
              onChange={e => setFormData({...formData, turnaroundDays: parseInt(e.target.value)})}
            />
          </div>
        </div>

        {/* Row 3: Financials */}
        <div className={styles.priceGroup}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Default Price ({currentSymbol})</label>
            <input 
              type="number" 
              min="0"
              step="0.01"
              value={formData.defaultPrice} 
              onChange={e => setFormData({...formData, defaultPrice: parseFloat(e.target.value)})}
            />
          </div>
          <div className="form-group" style={{ width: '100px' }}>
            <label>Currency</label>
            <select
              value={formData.currency}
              onChange={e => setFormData({...formData, currency: e.target.value})}
            >
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.currency}>{c.currency}</option>
              ))}
            </select>
          </div>
        </div>

      </form>
    </Modal>
  );
};

export default ProductFormModal;