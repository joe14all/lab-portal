import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import { IconLayers } from '../../../layouts/components/LabIcons';
import styles from "./AddonFormModal.module.css";
import { COUNTRIES } from '../../../constants';

const AddonFormModal = ({ isOpen, onClose, onSubmit, initialData, isDeleting, allProducts, defaultCurrency = 'USD' }) => {
  const [formData, setFormData] = useState({
    name: '',
    defaultPrice: 0,
    currency: defaultCurrency,
    applicableProducts: []
  });

  useEffect(() => {
    if (isOpen) {
      const nextData = initialData ? {
        name: initialData.name || '',
        defaultPrice: initialData.defaultPrice || 0,
        currency: initialData.currency || defaultCurrency,
        applicableProducts: initialData.applicableProducts || []
      } : {
        name: '',
        defaultPrice: 0,
        currency: defaultCurrency,
        applicableProducts: []
      }; 

      // avoid calling setState synchronously inside the effect by scheduling it
      const t = setTimeout(() => {
        setFormData(prev => {
          if (JSON.stringify(prev) === JSON.stringify(nextData)) return prev;
          return nextData;
        });
      }, 0);

      return () => clearTimeout(t);
    }
  }, [initialData, isOpen, defaultCurrency]);

  const toggleProduct = (prodId) => {
    const current = formData.applicableProducts;
    if (current.includes(prodId)) {
      setFormData({ ...formData, applicableProducts: current.filter(id => id !== prodId) });
    } else {
      setFormData({ ...formData, applicableProducts: [...current, prodId] });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const currentSymbol = COUNTRIES.find(c => c.currency === formData.currency)?.symbol || '$';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Add-on" : "Create Add-on"}
      icon={<IconLayers />}
      width="600px"
      footer={
        <div className={styles.footer}>
          {initialData ? (
            <button className="button secondary danger" onClick={isDeleting}>Delete Add-on</button>
          ) : <div />}
          <div className={styles.actions}>
            <button type="button" className="button text" onClick={onClose}>Cancel</button>
            <button type="submit" form="addonForm" className="button primary">Save</button>
          </div>
        </div>
      }
    >
      <form id="addonForm" onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.topRow}>
          <div className="form-group">
            <label>Add-on Name *</label>
            <input 
              required
              type="text" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., Porcelain Margin"
            />
          </div>
          
          {/* Price & Currency Group */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Price ({currentSymbol})</label>
              <input 
                type="number" 
                step="0.01"
                value={formData.defaultPrice} 
                onChange={e => setFormData({...formData, defaultPrice: parseFloat(e.target.value)})}
              />
            </div>
            <div className="form-group" style={{ width: '80px' }}>
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
        </div>

        <div className="form-group">
          <label className={styles.labelBlock}>Applicable Products</label>
          <div className={styles.productsList}>
            {allProducts.map(p => (
              <label key={p.id} className={styles.checkboxLabel}>
                <input 
                  type="checkbox" 
                  checked={formData.applicableProducts.includes(p.id)}
                  onChange={() => toggleProduct(p.id)}
                />
                {p.name}
              </label>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default AddonFormModal;