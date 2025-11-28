import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import { IconLayers, IconSearch } from '../../../layouts/components/LabIcons';
import styles from "./AddonFormModal.module.css";
import { COUNTRIES } from '../../../constants';

const AddonFormModal = ({ isOpen, onClose, onSubmit, initialData, isDeleting, allProducts, defaultCurrency = 'USD' }) => {
  const [formData, setFormData] = useState({
    name: '',
    defaultPrice: 0,
    currency: defaultCurrency,
    applicableProducts: []
  });

  const [searchTerm, setSearchTerm] = useState('');

  // Hydrate form data
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

      // Defer state update to avoid render-cycle conflicts
      const t = setTimeout(() => {
        setFormData(prev => {
          if (JSON.stringify(prev) === JSON.stringify(nextData)) return prev;
          return nextData;
        });
        setSearchTerm('');
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

  const handleSelectAll = () => {
    // Select only visible products if searching, or all if not
    const visibleIds = filteredProducts.map(p => p.id);
    const allSelected = visibleIds.every(id => formData.applicableProducts.includes(id));
    
    if (allSelected) {
      // Deselect visible
      setFormData({
        ...formData,
        applicableProducts: formData.applicableProducts.filter(id => !visibleIds.includes(id))
      });
    } else {
      // Select visible (merge unique)
      const newIds = [...new Set([...formData.applicableProducts, ...visibleIds])];
      setFormData({ ...formData, applicableProducts: newIds });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const currentSymbol = COUNTRIES.find(c => c.currency === formData.currency)?.symbol || '$';

  // Filter products for the checklist
  const filteredProducts = allProducts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Add-on" : "Create Add-on"}
      icon={<IconLayers width="20" />}
      width="600px"
      footer={
        <div className={styles.footer}>
          {initialData ? (
            <button 
              type="button" 
              className="button secondary danger" 
              onClick={isDeleting}
            >
              Delete Add-on
            </button>
          ) : <div />}
          <div className={styles.actions}>
            <button type="button" className="button text" onClick={onClose}>Cancel</button>
            <button type="submit" form="addonForm" className="button primary">Save</button>
          </div>
        </div>
      }
    >
      <form id="addonForm" onSubmit={handleSubmit} className={styles.form}>
        
        {/* Top Section: Basic Info */}
        <div className={styles.topRow}>
          <div className="form-group" style={{ flex: 1.5 }}>
            <label>Add-on Name *</label>
            <input 
              required
              type="text" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., Porcelain Margin"
            />
          </div>
          
          <div className={styles.priceGroup}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Price ({currentSymbol})</label>
              <input 
                type="number" 
                step="0.01"
                min="0"
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

        {/* Bottom Section: Product Association */}
        <div className={styles.associationSection}>
          <div className={styles.listHeader}>
            <label>Applicable Products</label>
            <div className={styles.listTools}>
              <div className={styles.searchBox}>
                <IconSearch width="12" className={styles.searchIcon} />
                <input 
                  type="text" 
                  placeholder="Filter products..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <button type="button" className={styles.linkBtn} onClick={handleSelectAll}>
                Toggle All
              </button>
            </div>
          </div>

          <div className={styles.productsList}>
            {filteredProducts.length > 0 ? (
              filteredProducts.map(p => (
                <label key={p.id} className={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={formData.applicableProducts.includes(p.id)}
                    onChange={() => toggleProduct(p.id)}
                  />
                  <span className={styles.prodName}>{p.name}</span>
                  <span className={styles.prodCat}>{p.category}</span>
                </label>
              ))
            ) : (
              <div className={styles.emptyState}>No products found.</div>
            )}
          </div>
          <div className={styles.summaryText}>
            Selected: {formData.applicableProducts.length} items
          </div>
        </div>

      </form>
    </Modal>
  );
};

export default AddonFormModal;